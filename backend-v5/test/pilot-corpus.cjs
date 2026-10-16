// Synthetic ground truth, corpus v2. Annotations, not provider results: nothing here measures provider accuracy.
// Pure data module: loading it never touches dist, the database or a provider. Byte materialization is lazy.
const CORPUS_FORMAT = 'dimora-v5-pilot-corpus';
const CORPUS_VERSION = 2;

// Fact constructors. `excerpt` is a gold example of a valid citation, not the only accepted one.
// `anchor` (optional) is a substring the observed citation must contain to identify this fact,
// needed when two facts share field/role/value but come from different printed lines.
const field = (name, value, excerpt) => ({ field: name, value, page: 1, excerpt });
const amount = (role, cents, excerpt, anchor) => ({ field: 'amount', role, value: cents, page: 1, excerpt, ...(anchor ? { anchor } : {}) });
const text = (name, value, excerpt) => ({ field: name, value, page: 1, excerpt });
const power = (quantityCode, quantityLabel, value, excerpt) => ({ field: 'power', quantityCode, quantityLabel, value, page: 1, excerpt });

// Lines of the two deterministic fixtures, identical to economicFixturePdf() in src/economy/document-fixture.ts.
// pilot-corpus.test.cjs checks byte equality against the compiled fixture when dist is available.
const GAS_LINES = ['Bolletta gas settembre', 'Fornitore: Gas Demo', 'Numero: G-2026-09', 'Data documento: 2026-09-30', 'Competenza dal: 2026-09-01', 'Competenza al: 2026-09-30', 'Scadenza: 2026-10-20', 'Totale corrente bolletta: 80,00 EUR', 'Saldo precedenti bollette: 20,00 EUR', 'Importo da pagare: 100,00 EUR'];
const INVOICE_LINES = ['Fattura riparazione rubinetto', 'Fornitore: Idraulico Demo', 'Numero: 42', 'Data documento: 2026-09-30', 'Imponibile: 100,00 EUR', 'IVA: 22,00 EUR', 'Totale documento: 122,00 EUR'];

/**
 * required: facts the pipeline must propose (omission is counted).
 * allowed: correct optional facts, neither rewarded as required nor penalized; a different value is still an error.
 * absent: fields of the current contract that must not appear (measurable).
 * future: fields outside the current contract; they cannot appear today and are never counted as successes.
 */
const row = (id, group, pipeline, source, expected, gold = {}) => ({ id, group, pipeline, source, expected, required: gold.required ?? [], allowed: gold.allowed ?? [], absent: gold.absent ?? [], future: gold.future ?? [] });
const lines = (...l) => ({ kind: 'text', lines: l });
const bill = (selection = false) => ({ outcome: 'proposal', documentKind: 'utility_bill', amountSelectionRequired: selection });
const invoice = () => ({ outcome: 'proposal', documentKind: 'simple_invoice', amountSelectionRequired: false });
const title = (value) => field('title', value, value);

const cases = [
  row('P01', 'utility', 'economic', { kind: 'fixture', name: 'gas', lines: GAS_LINES }, bill(true), {
    required: [amount('current_document_total', 8000, 'Totale corrente bolletta: 80,00 EUR'), amount('arrears_balance', 2000, 'Saldo precedenti bollette: 20,00 EUR'), amount('amount_due', 10000, 'Importo da pagare: 100,00 EUR'),
      field('category', 'gas', 'Bolletta gas settembre'), field('supplier', 'Gas Demo', 'Fornitore: Gas Demo'), field('documentNumber', 'G-2026-09', 'Numero: G-2026-09'), field('documentDate', '2026-09-30', 'Data documento: 2026-09-30'),
      field('competenceFrom', '2026-09-01', 'Competenza dal: 2026-09-01'), field('competenceTo', '2026-09-30', 'Competenza al: 2026-09-30'), field('dueOn', '2026-10-20', 'Scadenza: 2026-10-20')],
    allowed: [title('Bolletta gas settembre')] }),
  row('P02', 'utility', 'economic', lines('Bolletta energia elettrica', 'Totale documento: 64,50 EUR', 'Data documento: 2026-09-30'), bill(), {
    required: [amount('current_document_total', 6450, 'Totale documento: 64,50 EUR'), field('category', 'electricity', 'Bolletta energia elettrica'), field('documentDate', '2026-09-30', 'Data documento: 2026-09-30')],
    allowed: [title('Bolletta energia elettrica')] }),
  row('P03', 'utility', 'economic', lines('Bolletta acqua', 'Totale documento: 35,20 EUR'), bill(), {
    required: [amount('current_document_total', 3520, 'Totale documento: 35,20 EUR'), field('category', 'water', 'Bolletta acqua')],
    allowed: [title('Bolletta acqua')], absent: ['dueOn'] }),
  row('P04', 'utility', 'economic', lines('Bolletta gas con conguaglio', 'Consumi: 60,00 EUR', 'Conguaglio: 20,00 EUR', 'Totale corrente: 80,00 EUR'), bill(), {
    required: [amount('current_document_total', 8000, 'Totale corrente: 80,00 EUR')],
    allowed: [field('category', 'gas', 'Bolletta gas con conguaglio'), title('Bolletta gas con conguaglio'), amount('other', 6000, 'Consumi: 60,00 EUR', 'Consumi'), amount('other', 2000, 'Conguaglio: 20,00 EUR', 'Conguaglio')] }),
  row('P05', 'utility', 'economic', lines('Bolletta gas', 'Riferimento periodo: primavera', 'Totale documento: 45,00 EUR'), bill(), {
    required: [amount('current_document_total', 4500, 'Totale documento: 45,00 EUR')],
    allowed: [field('category', 'gas', 'Bolletta gas'), title('Bolletta gas')], absent: ['competenceFrom', 'competenceTo'] }),
  row('P06', 'utility', 'economic', lines('Bolletta energia elettrica', 'Totale corrente: 120,00 EUR', 'Credito precedente: 30,00 EUR', 'Da pagare: 90,00 EUR'), bill(), {
    required: [amount('current_document_total', 12000, 'Totale corrente: 120,00 EUR'), amount('amount_due', 9000, 'Da pagare: 90,00 EUR')],
    allowed: [field('category', 'electricity', 'Bolletta energia elettrica'), title('Bolletta energia elettrica'), amount('other', 3000, 'Credito precedente: 30,00 EUR', 'Credito precedente')] }),
  row('P07', 'invoice', 'economic', { kind: 'fixture', name: 'invoice', lines: INVOICE_LINES }, invoice(), {
    required: [amount('current_document_total', 12200, 'Totale documento: 122,00 EUR'), amount('taxable', 10000, 'Imponibile: 100,00 EUR'), amount('tax', 2200, 'IVA: 22,00 EUR'),
      field('supplier', 'Idraulico Demo', 'Fornitore: Idraulico Demo'), field('category', 'repairs_works', 'Fattura riparazione rubinetto'), field('documentNumber', '42', 'Numero: 42'), field('documentDate', '2026-09-30', 'Data documento: 2026-09-30')],
    allowed: [title('Fattura riparazione rubinetto')] }),
  row('P08', 'invoice', 'economic', lines('Fattura lavori bagno', 'Fornitore: Impresa Demo', 'Totale fattura: 3500,00 EUR'), invoice(), {
    required: [amount('current_document_total', 350000, 'Totale fattura: 3500,00 EUR'), field('supplier', 'Impresa Demo', 'Fornitore: Impresa Demo')],
    allowed: [title('Fattura lavori bagno')] }),
  row('P09', 'invoice', 'economic', lines('Fattura acquisto lavatrice', 'Modello: LD-7', 'Totale documento: 499,99 EUR'), invoice(), {
    required: [amount('current_document_total', 49999, 'Totale documento: 499,99 EUR')],
    allowed: [field('category', 'purchase_replacement', 'Fattura acquisto lavatrice'), title('Fattura acquisto lavatrice')], future: ['warrantyEndsOn'] }),
  // E3: the advance is the current total; the quote is only an optional `other`, never a current cost.
  row('P10', 'invoice', 'economic', lines('Fattura acconto lavori', 'Acconto fatturato: 500,00 EUR', 'Valore preventivo: 2000,00 EUR'), invoice(), {
    required: [amount('current_document_total', 50000, 'Acconto fatturato: 500,00 EUR')],
    allowed: [amount('other', 200000, 'Valore preventivo: 2000,00 EUR', 'Valore preventivo'), title('Fattura acconto lavori')] }),
  row('P11', 'invoice', 'economic', lines('Nota di credito', 'Storno totale: -50,00 EUR'), { outcome: 'no_supported_economic_data' }, { absent: ['amount'] }),
  row('P12', 'invoice', 'economic', lines('Fattura acquisto forno e lavatrice', 'Forno: 300,00 EUR', 'Lavatrice: 500,00 EUR', 'Totale documento: 800,00 EUR'), invoice(), {
    required: [amount('current_document_total', 80000, 'Totale documento: 800,00 EUR')],
    allowed: [amount('line_total', 30000, 'Forno: 300,00 EUR', 'Forno'), amount('line_total', 50000, 'Lavatrice: 500,00 EUR', 'Lavatrice'), field('category', 'purchase_replacement', 'Fattura acquisto forno e lavatrice'), title('Fattura acquisto forno e lavatrice')],
    future: ['singleObjectId'] }),
  row('P13', 'technical', 'technical', lines('Scheda caldaia', 'Marca: Termica Demo', 'Modello: TD-24'), { outcome: 'proposal', proposalKinds: { brand: 'single_value', model: 'single_value' } }, {
    required: [text('brand', 'Termica Demo', 'Marca: Termica Demo'), text('model', 'TD-24', 'Modello: TD-24')], absent: ['power'] }),
  // E4: canonical label, two distinct quantities kept apart.
  row('P14', 'technical', 'technical', lines('Scheda caldaia', 'Potenza utile al riscaldamento: 24 kW', 'Potenza nominale riportata: 28 kW'), { outcome: 'proposal', proposalKinds: { power: 'quantity_interpretation' } }, {
    required: [power('useful_heating', 'Potenza utile al riscaldamento', '24', 'Potenza utile al riscaldamento: 24 kW'), power('reported_nominal', 'Potenza nominale riportata', '28', 'Potenza nominale riportata: 28 kW')] }),
  row('P15', 'technical', 'technical', lines('Libretto caldaia', 'Marca: Termica Demo', 'Potenza: non riportata'), { outcome: 'proposal', proposalKinds: { brand: 'single_value' } }, {
    required: [text('brand', 'Termica Demo', 'Marca: Termica Demo')], absent: ['power', 'model'] }),
  // E5: two distinct models, conflict must stay unresolved (value_conflict).
  row('P16', 'technical', 'technical', lines('Libretto caldaia - dato dichiarato', 'Modello riportato nel libretto: TD-24', 'Scheda allegata - modello: TD-28'), { outcome: 'proposal', proposalKinds: { model: 'value_conflict' } }, {
    required: [text('model', 'TD-24', 'Modello riportato nel libretto: TD-24'), text('model', 'TD-28', 'Scheda allegata - modello: TD-28')] }),
  row('P17', 'negative', 'parser', { kind: 'file', path: 'caldaia-solo-immagine.pdf' }, { outcome: 'pdf_text_unavailable' }),
  row('P18', 'negative', 'parser', { kind: 'jpeg' }, { outcome: 'pdf_invalid' }),
  row('P19', 'negative', 'parser', { kind: 'file', path: 'caldaia-protetta.pdf' }, { outcome: 'pdf_encrypted' }),
  // E7: economic pipeline with the real contract code.
  row('P20', 'negative', 'economic', lines('Manuale uso telecomando', 'Premere il tasto per accendere la luce'), { outcome: 'no_supported_economic_data' }, { absent: ['amount'] }),
  row('P21', 'ambiguous', 'economic', lines('Fattura manutenzione', 'Data documento: 03/04/2026', 'Scadenza: 30/04/2026', 'Totale documento: 80,00 EUR'), invoice(), {
    required: [field('documentDate', '2026-04-03', 'Data documento: 03/04/2026'), field('dueOn', '2026-04-30', 'Scadenza: 30/04/2026'), amount('current_document_total', 8000, 'Totale documento: 80,00 EUR')],
    allowed: [field('category', 'maintenance', 'Fattura manutenzione'), title('Fattura manutenzione')], future: ['paidOn'] }),
  row('P22', 'ambiguous', 'economic', lines('Fattura riparazione', 'Totale: 80,00 USD'), { outcome: 'no_supported_economic_data' }, { absent: ['amount'] }),
  row('P23', 'ambiguous', 'economic', lines('Fattura lavori', 'Imponibile: 1.000,00 EUR', 'IVA: 220,00 EUR', 'Totale documento: 1.220,00 EUR'), invoice(), {
    required: [amount('current_document_total', 122000, 'Totale documento: 1.220,00 EUR'), amount('taxable', 100000, 'Imponibile: 1.000,00 EUR'), amount('tax', 22000, 'IVA: 220,00 EUR')],
    allowed: [title('Fattura lavori')] }),
  row('P24', 'ambiguous', 'economic', lines('Fattura acquisto filtro', 'Venditore: Negozio Demo', 'Totale documento: 15,00 EUR'), invoice(), {
    required: [amount('current_document_total', 1500, 'Totale documento: 15,00 EUR'), field('supplier', 'Negozio Demo', 'Venditore: Negozio Demo')],
    allowed: [field('category', 'purchase_replacement', 'Fattura acquisto filtro'), title('Fattura acquisto filtro')], future: ['professionalId', 'professionalPhone'] }),
];

/** Expected page text for text-bearing cases (one page). Whitespace is normalized by every validator. */
function pages(item) {
  return item.source.lines ? [item.source.lines.join('\n')] : null;
}

/** Same generator as economicFixturePdf (src/economy/document-fixture.ts); ASCII only. */
function textPdf(lines) {
  if (lines.some(line => /[^\x20-\x7e]/.test(line))) throw Error('Fixture generator uses ASCII only');
  const stream = 'BT /F1 12 Tf 40 790 Td ' + lines.map((line, i) => (i ? '0 -24 Td ' : '') + '(' + line.replace(/[()\\]/g, c => '\\' + c) + ') Tj').join('\n') + ' ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream'];
  let source = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(source)); source += (i + 1) + ' 0 obj\n' + object + '\nendobj\n'; });
  const xref = Buffer.byteLength(source);
  source += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(source + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
}

/** Bytes, hash and format. Needs only node:fs and the static fixtures; no dist, provider or database. */
async function materialize(item) {
  const { readFile } = require('node:fs/promises'); const { resolve } = require('node:path'); const { createHash } = require('node:crypto');
  const bytes = item.source.kind === 'jpeg' ? require('./document-fixtures.cjs').jpeg
    : item.source.kind === 'file' ? await readFile(resolve(__dirname, '../../docs/v5/fixtures/m4', item.source.path))
      : textPdf(item.source.lines);
  return { ...item, bytes, sha256: createHash('sha256').update(bytes).digest('hex'), format: item.source.kind === 'jpeg' ? 'jpeg' : 'pdf' };
}

module.exports = { CORPUS_FORMAT, CORPUS_VERSION, cases, pages, textPdf, materialize, GAS_LINES, INVOICE_LINES };
