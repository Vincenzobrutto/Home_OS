import { orderDateSource } from './invoice-evidence';
import type { ProductExtraction } from './domain';

/** Business proposal after evidence validation. Never relabel an extracted fact,
 * certify payment/delivery, or authorize automatic financial confirmation. */
export function proposeOrderPurchase(output: ProductExtraction): ProductExtraction {
  if (output.documentKind !== 'order_confirmation' || output.documentInfo?.kind !== 'purchase_order') return output;
  if (/\b(?:preventivo|quotazione|quotation|quote|carrello|cart|annullat\w*|cancellat\w*|cancelled|canceled|reso|rimborso|refund|return)\b|pro[ -]?forma/iu.test(output.documentInfo.title.value)) return output;
  return { ...output, items: output.items.map(item => {
    const date = item.fields.orderDate;
    if (!date || item.fields.purchaseDate || !orderDateSource(date.source.excerpt, date.value)) return item;
    return { ...item, purchaseDateFromOrder: date };
  }) };
}
