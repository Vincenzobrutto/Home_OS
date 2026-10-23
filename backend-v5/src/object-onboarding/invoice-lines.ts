import { dateLabels, dateOnly } from './role-evidence';
import type { ProductEvidenceContext, ProductSource } from './domain';
import { printedCents, printedDates } from '../economy/document-evidence';
import { purchaseDateSource } from './invoice-evidence';
import { digest } from '../security';

export type InvoiceLine = { key: string; page: number; row: number };
const normalize = (s: string) => s.normalize('NFC').replace(/\s+/gu, ' ').trim();

/** Explicit quantity-labelled rows under an Importo column, never unit prices,
 * inferred arithmetic, other pages, or visual observations. */
export function verifiedInvoiceLine(context: ProductEvidenceContext, name: string, page: number) {
  if (context.kind !== 'text' || context.allowedPages && !context.allowedPages.includes(page)) return null;
  const text = context.pages[page - 1]; if (!text) return null;
  const lines = text.split(/\r?\n/u), matches = [];
  const source = (excerpt: string): ProductSource => ({ documentId: context.snapshot.documentId, documentVersion: context.snapshot.documentVersion, sha256: context.snapshot.documentSha256, page, excerpt, basis: 'verified_text', region: null });
  let header = -1, row = 0, ambiguous = false;
  for (const [i, line] of lines.entries()) {
    const clean = normalize(line);
    if (/^Descrizione\s+Quantit[aà]\s*\/\s*periodo\s+Importo$/iu.test(clean)) { header = i; row = 0; continue; }
    if (header < 0) continue;
    if (/^(?:imponibile|iva|totale|subtotale|pagamento|pagina)\b/iu.test(clean)) { header = -1; continue; }
    row++;
    const match = /^(.+?)\s+Quantit[aà]\s*:\s*(\d{1,2})\s+((?:EUR|EURO|€)\s*\d[\d.,]*|\d[\d.,]*\s*(?:EUR|EURO|€))$/iu.exec(clean);
    if(!match){if(clean.includes(normalize(name)))ambiguous=true;continue;}
    if (!normalize(match[1]).includes(normalize(name))) continue;
    const cents = printedCents(match[3]), quantity = Number(match[2]), excerpt = lines.slice(header, i + 1).join('\n');
    if (cents.length !== 1 || cents[0] <= 0 || quantity < 1 || quantity > 20 || excerpt.length > 2000) { ambiguous=true; continue; }
    matches.push({ quantity, amountCents: cents[0], rowText: line.trim(), source: source(excerpt), invoiceLine: { key: digest(JSON.stringify(['invoice-line-v1', context.snapshot.documentSha256, page, header, row])), page, row } });
  }
  if (ambiguous || matches.length !== 1) return null;
  // Only an explicit purchase label; an issue, delivery or payment date cannot fill it.
  const dates = lines.flatMap(line => {
    const label=dateLabels.purchase.exec(normalize(line));
    if(!label||!dateOnly(normalize(line).slice(label[0].length)))return [];
    const values = printedDates(line);
    return values.length === 1 && purchaseDateSource(line, values[0]) ? [{ value: values[0], source: source(line.trim()) }] : [];
  });
  const purchaseDate = dates.length && new Set(dates.map(d => d.value)).size === 1 ? dates[0] : null;
  return { ...matches[0], purchaseDate };
}
