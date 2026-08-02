// Regola di default: 24 mesi di garanzia dalla data di acquisto, se non se
// ne conosce una esplicita dal documento — modificabile manualmente per
// prodotti con garanzia più lunga o più corta (vedi Modifica asset).
const DEFAULT_WARRANTY_MONTHS = 24;

export function computeDefaultWarrantyUntil(purchasedAt: Date): Date {
  const result = new Date(purchasedAt);
  result.setUTCMonth(result.getUTCMonth() + DEFAULT_WARRANTY_MONTHS);
  return result;
}
