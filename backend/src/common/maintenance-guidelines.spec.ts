import { computeMaintenanceSuggestions } from './maintenance-guidelines';

describe('maintenance suggestion guidelines', () => {
  it('anchors the first suggested due date to installedAt when known', () => {
    const suggestions = computeMaintenanceSuggestions({
      assetType: 'CLIMA',
      installedAt: new Date('2026-01-10T00:00:00Z'),
      purchasedAt: new Date('2025-12-01T00:00:00Z'),
      createdAt: new Date('2026-01-15T00:00:00Z'),
      existingPlanTitles: [],
    });
    const filters = suggestions.find((s) => s.code === 'clima-filtri');
    expect(filters?.basedOn).toBe('installedAt');
    expect(filters?.suggestedNextDueAt).toEqual(
      new Date('2026-07-10T00:00:00Z'),
    );
  });

  it('falls back to purchasedAt, then createdAt, when installedAt is unknown', () => {
    const byPurchase = computeMaintenanceSuggestions({
      assetType: 'CALDAIA',
      installedAt: null,
      purchasedAt: new Date('2026-02-01T00:00:00Z'),
      createdAt: new Date('2026-03-01T00:00:00Z'),
      existingPlanTitles: [],
    });
    expect(byPurchase[0].basedOn).toBe('purchasedAt');
    expect(byPurchase[0].suggestedNextDueAt).toEqual(
      new Date('2027-02-01T00:00:00Z'),
    );

    const byCreation = computeMaintenanceSuggestions({
      assetType: 'CALDAIA',
      installedAt: null,
      purchasedAt: null,
      createdAt: new Date('2026-03-01T00:00:00Z'),
      existingPlanTitles: [],
    });
    expect(byCreation[0].basedOn).toBe('createdAt');
    expect(byCreation[0].suggestedNextDueAt).toEqual(
      new Date('2027-03-01T00:00:00Z'),
    );
  });

  it('returns no suggestions for asset types without a known guideline', () => {
    expect(
      computeMaintenanceSuggestions({
        assetType: 'ELETTRODOMESTICO',
        installedAt: new Date('2026-01-01T00:00:00Z'),
        purchasedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        existingPlanTitles: [],
      }),
    ).toEqual([]);
  });

  it('omits a guideline once a plan with the same title already exists (case/space insensitive)', () => {
    const suggestions = computeMaintenanceSuggestions({
      assetType: 'CLIMA',
      installedAt: new Date('2026-01-10T00:00:00Z'),
      purchasedAt: null,
      createdAt: new Date('2026-01-10T00:00:00Z'),
      existingPlanTitles: ['  pulizia FILTRI  '],
    });
    expect(suggestions.map((s) => s.code)).toEqual(['clima-tecnica']);
  });
});
