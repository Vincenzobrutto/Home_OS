// Pure measurer tests: node --test, no dist, provider or database. They test the measurer, not provider accuracy.
const { test } = require('node:test'); const assert = require('node:assert/strict');
const corpus = require('./pilot-corpus.cjs');
const { scoreCase, aggregate } = require('./pilot-score.cjs');

const item = (id) => corpus.cases.find(c => c.id === id);
const src = (excerpt, page = 1) => [{ page, excerpt }];
const f = (field, value, excerpt, page) => ({ field, value, sources: src(excerpt, page) });
const a = (role, value, excerpt, page) => ({ field: 'amount', role, value, sources: src(excerpt, page) });
const score = (id, observation, custom) => { const c = custom ?? item(id); return scoreCase(c, corpus.pages(c), observation); };
const proposal = (facts, extra = {}) => ({ outcome: 'proposal', facts, ...extra });

// Hand-built mirrors of EconomicFixtureProvider output (src/economy/document-fixture.ts), not an invocation of it.
// The real provider is exercised in pilot-corpus.test.cjs when dist is available.
const P01_FIXTURE = proposal([
  f('title', 'Bolletta gas settembre', 'Bolletta gas settembre'), f('supplier', 'Gas Demo', 'Fornitore: Gas Demo'), f('category', 'gas', 'Bolletta gas settembre'),
  f('documentNumber', 'G-2026-09', 'Numero: G-2026-09'), f('documentDate', '2026-09-30', 'Data documento: 2026-09-30'), f('competenceFrom', '2026-09-01', 'Competenza dal: 2026-09-01'),
  f('competenceTo', '2026-09-30', 'Competenza al: 2026-09-30'), f('dueOn', '2026-10-20', 'Scadenza: 2026-10-20'),
  a('current_document_total', 8000, 'Totale corrente bolletta: 80,00 EUR'), a('arrears_balance', 2000, 'Saldo precedenti bollette: 20,00 EUR'), a('amount_due', 10000, 'Importo da pagare: 100,00 EUR'),
], { documentKind: 'utility_bill', amountSelectionRequired: true });
const P07_FIXTURE = proposal([
  f('title', 'Fattura riparazione rubinetto', 'Fattura riparazione rubinetto'), f('supplier', 'Idraulico Demo', 'Fornitore: Idraulico Demo'), f('category', 'repairs_works', 'Fattura riparazione rubinetto'),
  f('documentNumber', '42', 'Numero: 42'), f('documentDate', '2026-09-30', 'Data documento: 2026-09-30'),
  a('current_document_total', 12200, 'Totale documento: 122,00 EUR'), a('taxable', 10000, 'Imponibile: 100,00 EUR'), a('tax', 2200, 'IVA: 22,00 EUR'),
], { documentKind: 'simple_invoice', amountSelectionRequired: false });

const clean = (r) => ({ wrong: r.counts.wrong, unexpected: r.counts.unexpected, unsupported: r.counts.unsupported, forbidden: r.counts.forbidden, omitted: r.counts.omitted, criticals: r.criticals.length });
const ZERO = { wrong: 0, unexpected: 0, unsupported: 0, forbidden: 0, omitted: 0, criticals: 0 };

test('E1: output fedele al fixture P01/P07 non è penalizzato per i campi assenti nel vecchio gold', () => {
  const p01 = score('P01', P01_FIXTURE), p07 = score('P07', P07_FIXTURE);
  assert.deepEqual(clean(p01), ZERO); assert.equal(p01.counts.requiredMatched, 10); assert.equal(p01.counts.allowedMatched, 1);
  assert.deepEqual(clean(p07), ZERO); assert.equal(p07.counts.requiredMatched, 7); assert.equal(p07.counts.allowedMatched, 1);
  assert.equal(aggregate([p01, p07], { kind: 'hand_built' }).agreementWithAnnotations, 1);
});

test('E5: due line_total, duplicato identico senza punti, stesso importo con fonti distinte non fuso', () => {
  const lines = [a('current_document_total', 80000, 'Totale documento: 800,00 EUR'), a('line_total', 30000, 'Forno: 300,00 EUR'), a('line_total', 50000, 'Lavatrice: 500,00 EUR')];
  const r = score('P12', proposal([...lines, a('line_total', 30000, 'Forno: 300,00 EUR')], { documentKind: 'simple_invoice', amountSelectionRequired: false }));
  assert.deepEqual(clean(r), ZERO); assert.equal(r.counts.allowedMatched, 2); assert.equal(r.counts.duplicate, 1);
  // Synthetic case only for this test (not part of corpus 24): two rows with the same amount.
  const custom = { id: 'T-SAME', pipeline: 'economic', source: { lines: ['Fattura prova', 'Riga A: 10,00 EUR', 'Riga B: 10,00 EUR', 'Totale documento: 20,00 EUR'] }, expected: { outcome: 'proposal' }, future: [], absent: [],
    required: [{ field: 'amount', role: 'current_document_total', value: 2000 }],
    allowed: [{ field: 'amount', role: 'line_total', value: 1000, anchor: 'Riga A' }, { field: 'amount', role: 'line_total', value: 1000, anchor: 'Riga B' }] };
  const both = score(null, proposal([a('current_document_total', 2000, 'Totale documento: 20,00 EUR'), a('line_total', 1000, 'Riga A: 10,00 EUR'), a('line_total', 1000, 'Riga B: 10,00 EUR')]), custom);
  assert.equal(both.counts.allowedMatched, 2); assert.equal(both.counts.duplicate, 0);
  const oneGold = { ...custom, allowed: [{ field: 'amount', role: 'line_total', value: 1000 }] };
  const twice = score(null, proposal([a('line_total', 1000, 'Riga A: 10,00 EUR'), a('line_total', 1000, 'Riga B: 10,00 EUR')]), oneGold);
  assert.equal(twice.counts.allowedMatched, 1); assert.equal(twice.counts.duplicate, 1);
});

test('E5/P16: due model distinti restano in conflitto; uno solo non risolve arbitrariamente', () => {
  const both = score('P16', proposal([f('model', 'TD-24', 'Modello riportato nel libretto: TD-24'), f('model', 'TD-28', 'Scheda allegata - modello: TD-28')]));
  assert.deepEqual(clean(both), ZERO); assert.equal(both.counts.requiredMatched, 2);
  const one = score('P16', proposal([f('model', 'TD-28', 'Scheda allegata - modello: TD-28')]));
  assert.equal(one.counts.omitted, 1); assert.deepEqual(one.criticals.map(c => c.kind), ['conflict_not_preserved']);
});

test('E4/P14: due potenze con quantityCode distinti; fuse o con codice errato non passano', () => {
  const pw = (code, label, value, excerpt) => ({ field: 'power', quantityCode: code, quantityLabel: label, value, sources: src(excerpt) });
  const ok = score('P14', proposal([pw('useful_heating', 'Potenza utile al riscaldamento', '24', 'Potenza utile al riscaldamento: 24 kW'), pw('reported_nominal', 'Potenza nominale riportata', '28', 'Potenza nominale riportata: 28 kW')]));
  assert.deepEqual(clean(ok), ZERO);
  const merged = score('P14', proposal([pw('useful_heating', 'Potenza utile al riscaldamento', '24', 'Potenza utile al riscaldamento: 24 kW')]));
  assert.deepEqual(merged.criticals.map(c => c.kind), ['quantities_not_distinct']); assert.equal(merged.counts.omitted, 1);
  const wrongCode = score('P14', proposal([pw('other', 'Potenza nominale', '28', 'Potenza nominale riportata: 28 kW')]));
  assert.equal(wrongCode.counts.unexpected + wrongCode.counts.wrong, 1); assert.equal(wrongCode.counts.requiredMatched, 0);
  const wrongValue = score('P14', proposal([pw('reported_nominal', 'Potenza nominale riportata', '24', 'Potenza nominale riportata: 28 kW')]));
  assert.equal(wrongValue.counts.wrong, 1);
});

test('Citazioni come i validatori: estratto più corto valido; pagina errata, fonte inventata e maiuscole diverse no', () => {
  const ok = score('P03', proposal([a('current_document_total', 3520, 'Totale documento: 35,20'), f('category', 'water', 'acqua')], { documentKind: 'utility_bill', amountSelectionRequired: false }));
  assert.equal(ok.counts.requiredMatched, 2); assert.equal(ok.counts.unsupported, 0);
  const reasons = (obs) => score('P03', proposal([obs], { documentKind: 'utility_bill', amountSelectionRequired: false })).details.map(d => d.reason);
  assert.deepEqual(reasons(a('current_document_total', 3520, 'Totale documento: 35,20 EUR', 2)), ['page_out_of_range']);
  assert.deepEqual(reasons(a('current_document_total', 3520, 'Totale fattura: 35,20 EUR')), ['excerpt_not_on_page']);
  assert.deepEqual(reasons(a('current_document_total', 3520, 'totale documento: 35,20 EUR')), ['excerpt_not_on_page']);
  assert.deepEqual(reasons(a('current_document_total', 3520, 'Totale documento:')), ['value_not_proven']);
});

test('Valore o ruolo errato, opzionale inventato, campo inatteso e assenza richiesta violata', () => {
  const bill = { documentKind: 'utility_bill', amountSelectionRequired: false };
  assert.equal(score('P03', proposal([a('current_document_total', 3500, 'Totale documento: 35,20 EUR')], bill)).counts.wrong, 1);
  const swap = score('P06', proposal([a('current_document_total', 12000, 'Totale corrente: 120,00 EUR'), a('current_document_total', 9000, 'Da pagare: 90,00 EUR')], bill));
  assert.equal(swap.counts.wrong, 1); assert.deepEqual(swap.criticals.map(c => c.kind), ['amount_role_swap']);
  const invented = score('P02', proposal([a('current_document_total', 6450, 'Totale documento: 64,50 EUR'), f('title', 'Bolletta gas', 'Bolletta')], bill));
  assert.equal(invented.counts.wrong, 1, 'una chiave allowed non accetta qualsiasi valore');
  assert.equal(score('P03', proposal([f('documentNumber', '35', 'Totale documento: 35,20 EUR')], bill)).counts.unexpected, 1);
  const forbidden = score('P03', proposal([f('dueOn', '2026-09-30', 'Bolletta acqua')], bill));
  assert.equal(forbidden.counts.forbidden, 1); assert.deepEqual(forbidden.criticals.map(c => c.kind), ['forbidden_field']);
});

test('E3/P10: il preventivo non diventa costo corrente', () => {
  const inv = { documentKind: 'simple_invoice', amountSelectionRequired: false };
  const ok = score('P10', proposal([a('current_document_total', 50000, 'Acconto fatturato: 500,00 EUR'), a('other', 200000, 'Valore preventivo: 2000,00 EUR')], inv));
  assert.deepEqual(clean(ok), ZERO); assert.equal(ok.counts.allowedMatched, 1);
  const bad = score('P10', proposal([a('current_document_total', 200000, 'Valore preventivo: 2000,00 EUR')], { ...inv, amountSelectionRequired: false }));
  assert.ok(bad.criticals.some(c => c.kind === 'amount_role_swap')); assert.equal(bad.counts.requiredMatched, 0);
});

test('E6: esito effettivo distinto dalla sicurezza del blocco; un rifiuto su positivo non è estrazione corretta', () => {
  for (const id of ['P11', 'P20', 'P22']) {
    const right = score(id, { outcome: 'no_supported_economic_data', facts: [] });
    assert.equal(right.outcomeMatch, true); assert.equal(right.systemSafe, true);
    const blocked = score(id, { outcome: 'evidence_unverified', facts: [] });
    assert.equal(blocked.outcomeMatch, false); assert.equal(blocked.systemSafe, true); assert.equal(blocked.blockedBySystem, true);
  }
  const published = score('P22', proposal([a('current_document_total', 8000, 'Totale: 80,00 USD')], { documentKind: 'simple_invoice', amountSelectionRequired: false }));
  assert.equal(published.systemSafe, false); assert.deepEqual(published.criticals.map(c => c.kind).sort(), ['forbidden_field', 'negative_published']);
  const rejected = score('P02', { outcome: 'evidence_unverified', facts: [] });
  assert.equal(rejected.positiveRejected, true); assert.equal(rejected.systemSafe, true); assert.equal(rejected.outcomeMatch, false);
  assert.equal(score('P01', P01_FIXTURE).systemSafe, null, 'su un positivo pubblicato la sicurezza non si applica: valgono i critici'); assert.equal(rejected.counts.requiredMatched, 0); assert.equal(rejected.counts.omitted, 3);
  const infra = score('P02', { outcome: 'provider_unavailable', facts: [] });
  assert.equal(infra.notEvaluable, true);
});

test('Proprietà di sistema: amountSelectionRequired errato è critico per P01', () => {
  const r = score('P01', { ...P01_FIXTURE, amountSelectionRequired: false });
  assert.deepEqual(r.criticals.map(c => c.kind), ['amount_selection_flag']);
});

test('Aggregato: astensione totale non produce conclusioni; mancanti espliciti; misuratore non è accuratezza', () => {
  const results = corpus.cases.map(c => scoreCase(c, corpus.pages(c), c.id === 'P02' ? { outcome: 'evidence_unverified', facts: [] } : undefined));
  const summary = aggregate(results, { kind: 'hand_built' });
  assert.equal(summary.measurerOnly, true); assert.equal(summary.sample.missing.length, 23); assert.equal(summary.agreementWithAnnotations, null);
  assert.equal(summary.requiredCoverage, 0); assert.match(summary.warnings[0], /Nessun fatto proposto/);
  assert.ok(summary.warnings.some(w => /non accuratezza del provider/.test(w)));
});
