import { computeDefaultWarrantyUntil } from './warranty';

describe('computeDefaultWarrantyUntil', () => {
  it('adds 24 months without mutating the purchase date', () => {
    const purchasedAt = new Date('2024-03-15T00:00:00Z');

    const result = computeDefaultWarrantyUntil(purchasedAt);

    expect(result).toEqual(new Date('2026-03-15T00:00:00Z'));
    expect(purchasedAt).toEqual(new Date('2024-03-15T00:00:00Z'));
  });
});
