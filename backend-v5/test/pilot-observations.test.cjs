// Adapter tests for observation format v2: node --test, no dist, provider or database.
const { test } = require('node:test'); const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process'); const { writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os'); const { join, resolve } = require('node:path');
const corpus = require('./pilot-corpus.cjs');
const { parseObservations } = require('./pilot-observations.cjs');

let hashes;
const ready = Promise.all(corpus.cases.map(c => corpus.materialize(c))).then(list => { hashes = new Map(list.map(x => [x.id, x.sha256])); });
const cite = (id, page, excerpt) => ({ documentId: '00000000-0000-4000-8000-000000000001', documentVersion: 1, sha256: hashes.get(id), page, excerpt });
const field = (id, value, excerpt) => ({ value, sources: [cite(id, 1, excerpt)] });
// Hand-built mirror of the validated EconomicOutput produced by EconomicFixtureProvider for P07 (not an invocation).
const p07Economic = () => ({
  documentKind: 'simple_invoice', amountSelectionRequired: false,
  proposedFields: { title: field('P07', 'Fattura riparazione rubinetto', 'Fattura riparazione rubinetto'), supplier: field('P07', 'Idraulico Demo', 'Fornitore: Idraulico Demo'), category: field('P07', 'repairs_works', 'Fattura riparazione rubinetto'), documentNumber: field('P07', '42', 'Numero: 42'), documentDate: field('P07', '2026-09-30', 'Data documento: 2026-09-30') },
  amountCandidates: [['gross', 12200, 'current_document_total', 'Totale documento: 122,00 EUR'], ['taxable', 10000, 'taxable', 'Imponibile: 100,00 EUR'], ['tax', 2200, 'tax', 'IVA: 22,00 EUR']].map(([id, amountCents, role, excerpt]) => ({ id, amountCents, role, label: excerpt.split(':')[0], sources: [cite('P07', 1, excerpt)] })),
});
const doc = (observations, provenance = { kind: 'hand_built', providerCalled: false, stage: 'economic.validateOutput (copia manuale)' }) => ({ format: 'dimora-v5-pilot-observations', formatVersion: 2, corpusFormat: 'dimora-v5-pilot-corpus', corpusVersion: 2, provenance, observations });
const obs = (caseId, extra = {}) => ({ caseId, pipeline: corpus.cases.find(c => c.id === caseId).pipeline, documentSha256: hashes.get(caseId), ...extra });
const code = (fn) => { try { fn(); return 'ok'; } catch (e) { return e.code ?? e.message; } };
const parse = (d) => parseObservations(d, corpus, hashes);

test('Formato v2 valido: normalizza l’output economico validato e segnala i casi mancanti', async () => {
  await ready;
  const { byCase, missing, provenance } = parse(doc([obs('P07', { outcome: 'proposal', economic: p07Economic() }), obs('P17', { outcome: 'pdf_text_unavailable' })]));
  assert.equal(provenance.providerCalled, false); assert.equal(missing.length, 22);
  const p07 = byCase.get('P07'); assert.equal(p07.facts.length, 8); assert.ok(p07.facts.every(f => !('id' in f)), 'gli id del provider non sono identità');
});

test('Dati v1, versioni, hash, pipeline e chiavi incompatibili sono rifiutati esplicitamente', async () => {
  await ready;
  assert.equal(code(() => parse([{ caseId: 'P07', outcome: 'proposal', facts: [] }])), 'unsupported_format');
  assert.equal(code(() => parse({ ...doc([]), formatVersion: 1 })), 'unsupported_format');
  assert.equal(code(() => parse({ ...doc([]), corpusVersion: 1 })), 'corpus_version_mismatch');
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'proposal', economic: p07Economic(), documentSha256: 'a'.repeat(64) })]))), 'document_hash_mismatch');
  assert.equal(code(() => parse(doc([{ ...obs('P13'), pipeline: 'economic', outcome: 'proposal', economic: p07Economic() }]))), 'pipeline_mismatch');
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'proposal', economic: p07Economic(), evidenceVerified: true })]))), 'unknown_key');
  const future = p07Economic(); future.proposedFields.warrantyEndsOn = field('P07', '2028-09-30', 'Data documento: 2026-09-30');
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'proposal', economic: future })]))), 'unknown_key');
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'pdf_invalid' }), obs('P07', { outcome: 'pdf_invalid' })]))), 'duplicate_case');
  assert.equal(code(() => parse(doc([obs('P20', { outcome: 'no_relevant_data' })]))), 'unknown_outcome');
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'proposal' })]))), 'missing_payload');
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'evidence_unverified', economic: p07Economic() })]))), 'payload_without_proposal');
  assert.equal(code(() => parse(doc([obs('P17', { outcome: 'pdf_text_unavailable', economic: p07Economic() })]))), 'payload_pipeline_mismatch');
});

test('Provenienza: providerCalled dichiarato, mai dedotto, coerente con il tipo', async () => {
  await ready;
  assert.equal(code(() => parse(doc([], { kind: 'hand_built', stage: 'x' }))), 'invalid_provenance');
  assert.equal(code(() => parse(doc([], { kind: 'provider_campaign', providerCalled: false, stage: 'x' }))), 'invalid_provenance');
  assert.equal(code(() => parse(doc([], { kind: 'deterministic_fixture', providerCalled: true, stage: 'x' }))), 'invalid_provenance');
});

test('Coerenza con i validatori: flag di selezione, codice della potenza e binding delle citazioni', async () => {
  await ready;
  const flag = p07Economic(); flag.amountSelectionRequired = true;
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'proposal', economic: flag })]))), 'inconsistent_with_validator');
  const foreign = p07Economic(); foreign.amountCandidates[0].sources[0].sha256 = 'b'.repeat(64);
  assert.equal(code(() => parse(doc([obs('P07', { outcome: 'proposal', economic: foreign })]))), 'source_hash_mismatch');
  const power = (quantityCode, quantityLabel) => ({ power: [{ id: 'c1', value: '28', sources: [{ documentSha256: hashes.get('P14'), documentVersion: 1, page: 1, excerpt: 'Potenza nominale riportata: 28 kW' }], measurement: { value: '28', unit: 'kW', quantityCode, quantityLabel } }] });
  assert.equal(code(() => parse(doc([obs('P14', { outcome: 'proposal', technical: power('reported_nominal', 'Potenza nominale riportata') })]))), 'ok');
  assert.equal(code(() => parse(doc([obs('P14', { outcome: 'proposal', technical: power('reported_nominal', 'Potenza nominale') })]))), 'inconsistent_with_validator');
});

test('Report: osservazioni mancanti danno exit 1; formato errato non produce metriche', async () => {
  await ready;
  const dir = mkdtempSync(join(tmpdir(), 'pilot-v2-')); const tool = resolve(__dirname, '../tools/pilot-corpus-report.cjs');
  try {
    const good = join(dir, 'good.json'); writeFileSync(good, JSON.stringify(doc([obs('P07', { outcome: 'proposal', economic: p07Economic() })])));
    let status = 0, out = '';
    try { out = execFileSync(process.execPath, [tool, '--observations', good], { encoding: 'utf8' }); } catch (e) { status = e.status; out = e.stdout; }
    assert.equal(status, 1); const report = JSON.parse(out);
    assert.equal(report.observations.provenance.providerCalled, false); assert.equal(report.observations.providerAccuracy, null);
    assert.equal(report.observations.summary.sample.missing.length, 23);
    const p07 = report.observations.perCase.find(r => r.caseId === 'P07');
    assert.deepEqual([p07.counts.requiredMatched, p07.counts.allowedMatched, p07.counts.wrong, p07.counts.unexpected], [7, 1, 0, 0]);
    const v1 = join(dir, 'v1.json'); writeFileSync(v1, JSON.stringify([{ caseId: 'P07', outcome: 'proposal', facts: [] }]));
    let err = '';
    try { execFileSync(process.execPath, [tool, '--observations', v1], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { status = e.status; out = e.stdout; err = e.stderr; }
    assert.equal(status, 1); assert.equal(out, ''); assert.match(err, /unsupported_format/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
