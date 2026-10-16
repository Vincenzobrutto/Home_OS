// Corpus v2 tests. The pure part runs without dist; the parser/fixture part needs a compiled backend (npm run build)
// and is skipped otherwise. Nothing here calls a remote provider, the database or the network.
const { test } = require('node:test'); const assert = require('node:assert/strict');
const { existsSync } = require('node:fs'); const { resolve } = require('node:path'); const { randomUUID, createHash } = require('node:crypto');
const corpus = require('./pilot-corpus.cjs');
const { proofProblem, printedCents, printedDates, normalized, scoreCase, ECONOMIC_FIELDS, TECHNICAL_FIELDS } = require('./pilot-score.cjs');
const { parseObservations } = require('./pilot-observations.cjs');
const { cases } = corpus;
const DIST = resolve(__dirname, '../dist');
const needsDist = { skip: existsSync(resolve(DIST, 'review/pdf-text.js')) ? false : 'dist assente: eseguire npm run build nel master per parser e fixture reali' };

test('Corpus v2: 24 casi P01…P24 con gruppi e pipeline esplicite', () => {
  assert.equal(corpus.CORPUS_VERSION, 2); assert.equal(cases.length, 24);
  assert.deepEqual(cases.map(c => c.id), Array.from({ length: 24 }, (_, i) => 'P' + String(i + 1).padStart(2, '0')));
  assert.deepEqual(['utility', 'invoice', 'technical', 'negative', 'ambiguous'].map(g => cases.filter(c => c.group === g).length), [6, 6, 4, 4, 4]);
  assert.deepEqual(['economic', 'technical', 'parser'].map(p => cases.filter(c => c.pipeline === p).length), [17, 4, 3]);
});

test('Gold coerente con le regole dei validatori: ogni fatto richiesto/ammesso è dimostrato dalla sua pagina', () => {
  for (const item of cases) {
    const pages = corpus.pages(item);
    for (const fact of [...item.required, ...item.allowed]) {
      const problem = proofProblem({ ...fact, sources: [{ page: fact.page, excerpt: fact.excerpt }] }, pages, item.pipeline);
      assert.equal(problem, null, `${item.id} ${fact.field} ${fact.role ?? ''}: ${problem}`);
    }
  }
});

test('Assenze misurabili dentro il contratto, campi futuri fuori contratto e mai conteggiati', () => {
  for (const item of cases) {
    const contract = item.pipeline === 'economic' ? [...ECONOMIC_FIELDS, 'amount'] : item.pipeline === 'technical' ? TECHNICAL_FIELDS : [];
    for (const key of item.absent) assert.ok(contract.includes(key), `${item.id}: ${key} deve essere nel contratto`);
    for (const key of item.future) assert.ok(!contract.includes(key), `${item.id}: ${key} non deve essere nel contratto`);
  }
});

test('Errata puntuali: P10 preventivo solo other, P14 etichetta canonica, P16 due model, P20 codice reale', () => {
  const byId = (id) => cases.find(c => c.id === id);
  assert.deepEqual(byId('P10').required.map(f => [f.role, f.value]), [['current_document_total', 50000]]);
  assert.deepEqual(byId('P10').allowed.filter(f => f.field === 'amount').map(f => [f.role, f.value]), [['other', 200000]]);
  assert.ok(byId('P14').source.lines.includes('Potenza nominale riportata: 28 kW'));
  assert.deepEqual(byId('P14').required.map(f => f.quantityCode), ['useful_heating', 'reported_nominal']);
  assert.deepEqual(byId('P16').required.map(f => [f.field, f.value]), [['model', 'TD-24'], ['model', 'TD-28']]);
  assert.equal(byId('P16').expected.proposalKinds.model, 'value_conflict');
  assert.equal(byId('P20').pipeline, 'economic'); assert.equal(byId('P20').expected.outcome, 'no_supported_economic_data');
});

test('Hash rigenerati: P14 v2 ha byte diversi dalla v1; materializzazione deterministica senza dist', async () => {
  const first = await Promise.all(cases.map(c => corpus.materialize(c))), second = await Promise.all(cases.map(c => corpus.materialize(c)));
  assert.deepEqual(first.map(f => f.sha256), second.map(f => f.sha256));
  const v1 = createHash('sha256').update(corpus.textPdf(['Scheda caldaia', 'Potenza utile al riscaldamento: 24 kW', 'Potenza nominale: 28 kW'])).digest('hex');
  assert.notEqual(first.find(f => f.id === 'P14').sha256, v1);
});

test('Reale (dist): byte dei fixture identici a economicFixturePdf', needsDist, () => {
  const { economicFixturePdf } = require('../dist/economy/document-fixture');
  assert.ok(corpus.textPdf(corpus.GAS_LINES).equals(economicFixturePdf('gas')));
  assert.ok(corpus.textPdf(corpus.INVOICE_LINES).equals(economicFixturePdf('invoice')));
});

test('Reale (dist): printedCents/printedDates del misuratore coincidono con quelli compilati', needsDist, () => {
  const compiled = require('../dist/economy/document-evidence');
  const samples = [...cases.flatMap(c => [...c.required, ...c.allowed].map(f => f.excerpt)), 'Totale: 80,00 USD', 'Storno totale: -50,00 EUR', '1,234.56', '3 aprile 2026', '31/02/2026'];
  for (const s of samples) { assert.deepEqual(printedCents(s), compiled.printedCents(s), s); assert.deepEqual(printedDates(s).sort(), compiled.printedDates(s).sort(), s); }
});

test('Reale (dist): parser su tutti i 24 input; pagine coerenti con il corpus ed esiti del parser', needsDist, async () => {
  const { PdfTextExtractor } = require('../dist/review/pdf-text'); const extractor = new PdfTextExtractor();
  for (const item of cases) {
    const fixture = await corpus.materialize(item); const snapshot = { documentId: randomUUID(), documentVersion: 1, documentSha256: fixture.sha256 };
    if (item.pipeline === 'parser') { await assert.rejects(extractor.extract([{ snapshot, bytes: fixture.bytes }]), e => e.code === item.expected.outcome, item.id); continue; }
    const [{ pages }] = await extractor.extract([{ snapshot, bytes: fixture.bytes }]);
    assert.deepEqual(pages.map(normalized), corpus.pages(item).map(normalized), item.id);
  }
});

test('Reale (dist): output deterministico di EconomicFixtureProvider su P01/P07 non penalizzato', needsDist, async () => {
  const { EconomicFixtureProvider } = require('../dist/economy/document-fixture'); const provider = new EconomicFixtureProvider();
  const fixtures = await Promise.all(cases.map(c => corpus.materialize(c))); const hashes = new Map(fixtures.map(f => [f.id, f.sha256]));
  const observations = [];
  for (const id of ['P01', 'P07']) {
    const fixture = fixtures.find(f => f.id === id);
    const output = await provider.analyze({ documentId: randomUUID(), documentVersion: 1, documentSha256: fixture.sha256 }, fixture.bytes);
    observations.push({ caseId: id, pipeline: 'economic', documentSha256: fixture.sha256, outcome: 'proposal', economic: output });
  }
  const { byCase } = parseObservations({ format: 'dimora-v5-pilot-observations', formatVersion: 2, corpusFormat: corpus.CORPUS_FORMAT, corpusVersion: 2, provenance: { kind: 'deterministic_fixture', providerCalled: false, stage: 'EconomicFixtureProvider.analyze -> validateOutput' }, observations }, corpus, hashes);
  for (const id of ['P01', 'P07']) {
    const item = cases.find(c => c.id === id); const r = scoreCase(item, corpus.pages(item), byCase.get(id));
    assert.deepEqual([r.counts.wrong, r.counts.unexpected, r.counts.unsupported, r.counts.omitted, r.criticals.length], [0, 0, 0, 0, 0], id);
    assert.equal(r.counts.requiredMatched, item.required.length, id);
  }
});
