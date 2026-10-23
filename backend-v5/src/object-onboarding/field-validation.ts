import { object, text } from '../review/domain';
import { ProviderFailure } from '../review/provider';
import { printedDates } from '../economy/document-evidence';
import { calendar } from '../activities/domain';
import { purchaseDateSource, orderDateSource } from './invoice-evidence';
import type { ProductField, ProductValue, ProductSource, ProductEvidenceContext } from './domain';

export class ProductEvidenceFailure extends ProviderFailure {
  constructor(
    readonly field: ProductField | 'quantity' | 'purchaseTotal',
    readonly reason: 'citation' | 'value' | 'date' | 'unit' | 'quantity' | 'total',
  ) { super('evidence_unverified'); }
}
const normalize = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();

/** Validates one field; the caller retains warning policy and decode location.
 * Evidence stays bound to the caller's snapshot, pages and visual region checks.
 */
export function validateProductField(
  key: ProductField,
  rawField: unknown,
  documentKind: unknown,
  context: ProductEvidenceContext,
  readEvidence: (input: unknown) => ProductSource,
): ProductValue {
  const field = object(rawField, ['value', 'evidence']);
  // Source descriptions use the existing citation bound. The output name
  // retains its 120-character limit and is projected only AFTER validation.
  const value = normalize(text(field.value, key === 'name' ? 2000 : key === 'brand' || key === 'serialNumber' ? 80 : 120));
  let source: ProductSource;
  try {
    source = readEvidence(field.evidence);
  } catch (error) {
    if (error instanceof ProviderFailure && error.code === 'evidence_unverified') {
      throw new ProductEvidenceFailure(key, 'citation');
    }
    throw error;
  }
  if (['orderDate', 'purchaseDate', 'deliveredDate', 'warrantyStart', 'warrantyEnd'].includes(key)) {
    calendar(value);
    const dateMeaning = ({
      orderDate: /ordine|order/iu,
      purchaseDate: /(?:data.{0,12}(?:acquisto|fattura)|purchase.{0,8}date|acquistato.{0,5}il)/iu,
      deliveredDate: /(?:consegnato.{0,8}il|consegna.{0,8}effettiva|delivered.{0,8}on)/iu,
      warrantyStart: /(?:inizio.{0,10}garanzia|garanzia.{0,10}(?:dal|decorrenza)|warranty.{0,10}start)/iu,
      warrantyEnd: /(?:scadenza.{0,10}garanzia|garanzia.{0,10}(?:al|fino)|warranty.{0,10}(?:end|expir))/iu,
    } as Record<string, RegExp>)[key];
    if (['orderDate', 'purchaseDate', 'deliveredDate'].includes(key) && value > new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })) {
      throw new ProviderFailure('evidence_unverified');
    }
    const purchaseSource = (key === 'purchaseDate' || key === 'orderDate') && ['purchase_document','order_confirmation'].includes(String(documentKind))
      ? (key === 'orderDate' ? orderDateSource : purchaseDateSource)(source.excerpt, value, context.kind === 'text' ? context.pages[source.page - 1] : undefined) : null;
    const dateVerified = (key === 'purchaseDate' || key === 'orderDate') && ['purchase_document','order_confirmation'].includes(String(documentKind))
      ? purchaseSource !== null
      : dateMeaning.test(source.excerpt) && printedDates(source.excerpt).length === 1 && printedDates(source.excerpt).includes(value);
    if (!dateVerified) throw new ProductEvidenceFailure(key, 'date');
    if (purchaseSource) source = { ...source, excerpt: purchaseSource };
  } else if (!normalize(source.excerpt).includes(value)) throw new ProductEvidenceFailure(key,'value');
  const unit = ({ powerWatts: 'W', voltageVolts: 'V', frequencyHz: 'Hz', capacityLitres: '(?:L|litri|litres?|liters?)' } as Record<string, string>)[key];
  if (unit && (!/^\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?$/u.test(value) || !new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&') + '\\s*' + unit + '\\b', 'iu').test(source.excerpt))) throw new ProductEvidenceFailure(key,'unit');
  return { value, source };
}
