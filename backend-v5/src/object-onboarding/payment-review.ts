import { orderDateSource, purchaseDateSource } from './invoice-evidence';
import type { ProductEvidenceContext, ProductExtraction } from './domain';
import type { Snapshot } from '../review/provider';

export const PAYMENT_REVIEW_POLICY = 'payment-review-v1' as const;
export type PaymentReview = Snapshot & { policy: typeof PAYMENT_REVIEW_POLICY; reason: 'split_payment' | null };

/** Scan the entire locally verified text, including pages omitted from a model prefix.
 * Store only the decision and snapshot: never extra source text or inferred amounts. */
export function paymentReview(context: ProductEvidenceContext): PaymentReview | undefined {
  if (context.kind !== 'text') return undefined;
  const text = context.pages.join('\n').normalize('NFKC').replace(/\u00ad/gu, '');
  const split = /\bsplit[\s\p{Pd}]*payment\b|\bscissione\s+dei\s+pagamenti\b|\biva\s+versata\s+dal\s+committente\b/iu.test(text);
  return { ...context.snapshot, policy: PAYMENT_REVIEW_POLICY, reason: split ? 'split_payment' : null };
}

/** Old drafts lack this source check and cannot authorize financial automation. */
export function requiresPaymentReview(output: ProductExtraction, snapshot?: Snapshot): boolean {
  const check = output.paymentReview;
  if (output.documentKind === 'order_confirmation' || output.items.some(item => !!item.fields.orderDate || !!item.fields.purchaseDate && !!orderDateSource(item.fields.purchaseDate.source.excerpt, item.fields.purchaseDate.value))) return true;
  if (output.items.some(item => item.fields.purchaseDate && !purchaseDateSource(item.fields.purchaseDate.source?.excerpt ?? '', item.fields.purchaseDate.value))) return true;
  if (check?.reason === 'split_payment') return true;
  const financial = ['purchase_document', 'order_confirmation', 'utility_bill'].includes(output.documentKind) || !!output.houseExpenses?.length || !!output.purchaseTotal || output.items.some(item => !!item.purchaseAmount);
  if (!financial) return false;
  if (output.reviewWarnings?.some(w => /(?:^|:)purchaseAmount$/u.test(w.field))) return true;
  return !check || check.policy !== PAYMENT_REVIEW_POLICY || check.reason !== null || output.evidenceMode !== 'text' ||
    !!snapshot && (check.documentId !== snapshot.documentId || check.documentVersion !== snapshot.documentVersion || check.documentSha256 !== snapshot.documentSha256);
}
