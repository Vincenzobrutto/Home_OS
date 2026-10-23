import { object, invalid } from '../review/domain';
import { printedCents } from '../economy/document-evidence';
import { labelledProductAmount, purchaseGrandTotal } from './role-evidence';
import { tableQuantity, tablePurchaseAmount } from './invoice-evidence';
import { ProductEvidenceFailure } from './field-validation';
import type { verifiedInvoiceLine } from './invoice-lines';
import type { ProductItem, ProductValue, ProductSource, ProductExtraction, ProductEvidenceContext } from './domain';

type VerifiedLine = ReturnType<typeof verifiedInvoiceLine>;
type ReadEvidence = (input: unknown) => ProductSource;
const normalize = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();

/** Only explicit values enter these validators. The caller retains fallbacks,
 * warning order, source locations, identity and cross-item total checks.
 */
export function validateProductQuantity(
  input: unknown,
  context: ProductEvidenceContext,
  fields: ProductItem['fields'],
  primary: ProductValue,
  line: VerifiedLine,
  limits: { readonly maxUnits: number },
  readEvidence: ReadEvidence,
): NonNullable<ProductItem['quantity']> {
  const q = object(input, ['value', 'evidence']);
  if (!Number.isSafeInteger(q.value) || Number(q.value) < 1 || Number(q.value) > limits.maxUnits) throw invalid();
  const source = readEvidence(q.evidence);
  const printed = [...source.excerpt.matchAll(/(?:quantit[aà]|quantity|qty|qt[aà])\s*[:x×]?\s*(\d+)\b/giu)].map(match => Number(match[1]));
  const table=context.kind==='text'&&fields.name?tableQuantity(source.excerpt,fields.name.value):null;
  if (source.page !== primary.source.page || !(printed.length===1&&printed[0]===q.value || printed.length===0&&table===q.value || line&&line.quantity===q.value&&normalize(source.excerpt).includes(normalize(line.rowText)))) throw new ProductEvidenceFailure('quantity','quantity');
  if(line&&(q.value!==line.quantity||!normalize(source.excerpt).includes(normalize(line.rowText))))throw new ProductEvidenceFailure('quantity','quantity');
  return { value: Number(q.value), source:line?line.source:source };
}

export function validateProductAmount(
  input: unknown,
  documentKind: unknown,
  fields: ProductItem['fields'],
  line: VerifiedLine,
  readEvidence: ReadEvidence,
): NonNullable<ProductItem['purchaseAmount']> {
  const price = object(input, ['amountCents', 'evidence']), source = readEvidence(price.evidence);
  if (!['purchase_document','order_confirmation'].includes(String(documentKind))
    || !fields.name
    || source.page !== fields.name.source.page
    || !normalize(source.excerpt).includes(fields.name.value)
    || !Number.isSafeInteger(price.amountCents)
    || Number(price.amountCents) <= 0
    || Number(price.amountCents) > 999999999
    || !/(?:€|\bEUR\b|\bEURO\b)/iu.test(source.excerpt)
    || !(labelledProductAmount(source.excerpt,fields.name.value,Number(price.amountCents))||tablePurchaseAmount(source.excerpt,fields.name.value)===price.amountCents||line&&line.amountCents===price.amountCents&&normalize(source.excerpt).includes(normalize(line.rowText)))
    || !(line&&line.amountCents===price.amountCents&&normalize(source.excerpt).includes(normalize(line.rowText))||printedCents(source.excerpt).includes(Number(price.amountCents)))) throw new ProductEvidenceFailure('purchaseTotal', 'total');
  if(line && price.amountCents!==line.amountCents)throw new ProductEvidenceFailure('purchaseTotal','total');
  return { amountCents: Number(price.amountCents), source:line?line.source:source };
}

export function validatePurchaseTotal(
  input: unknown,
  documentKind: unknown,
  readEvidence: ReadEvidence,
): NonNullable<ProductExtraction['purchaseTotal']> {
  const total = object(input, ['amountCents', 'evidence']);
  const source = readEvidence(total.evidence);
  if (!['purchase_document','order_confirmation'].includes(String(documentKind))
    || !Number.isSafeInteger(total.amountCents)
    || Number(total.amountCents) <= 0
    || Number(total.amountCents) > 999999999
    || !/(?:€|\bEUR\b|\bEURO\b)/iu.test(source.excerpt)
    || !purchaseGrandTotal(source.excerpt, Number(total.amountCents))) throw new ProductEvidenceFailure('purchaseTotal','total');
  return { amountCents: Number(total.amountCents), source };
}
