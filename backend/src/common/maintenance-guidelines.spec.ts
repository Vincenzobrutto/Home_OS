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
    // Pulizia filtri: ogni 2 mesi (indicazione produttori, vedi
    // decisions.md #21).
    expect(filters?.suggestedNextDueAt).toEqual(
      new Date('2026-03-10T00:00:00Z'),
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
    // Caldaia: ogni 2 anni (DPR 74/2013, cadenza tipica per potenze
    // domestiche basse — vedi decisions.md #20).
    expect(byPurchase[0].suggestedNextDueAt).toEqual(
      new Date('2028-02-01T00:00:00Z'),
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
      new Date('2028-03-01T00:00:00Z'),
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

  it('omits a guideline whose code was dismissed, independently of the title check', () => {
    const suggestions = computeMaintenanceSuggestions({
      assetType: 'CLIMA',
      installedAt: new Date('2026-01-10T00:00:00Z'),
      purchasedAt: null,
      createdAt: new Date('2026-01-10T00:00:00Z'),
      existingPlanTitles: [],
      dismissedGuidelineCodes: ['clima-tecnica'],
    });
    expect(suggestions.map((s) => s.code)).toEqual(['clima-filtri']);
  });

  it('resolves the boiler control interval from region + power when both are known (Lazio, 4 years)', () => {
    const suggestions = computeMaintenanceSuggestions({
      assetType: 'CALDAIA',
      installedAt: new Date('2026-01-01T00:00:00Z'),
      purchasedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      existingPlanTitles: [],
      region: 'Lazio',
      powerKw: 24,
    });
    const boiler = suggestions.find((s) => s.code === 'caldaia-controllo');
    expect(boiler?.recurrenceInterval).toBe(4);
    expect(boiler?.regionalLookupAvailable).toBe(true);
    expect(boiler?.resolvedIntervalSource?.title).toContain('Lazio');
    expect(boiler?.suggestedNextDueAt).toEqual(
      new Date('2030-01-01T00:00:00Z'),
    );
  });

  it('resolves a different boiler control interval for the same power in Lombardia (2 years)', () => {
    const suggestions = computeMaintenanceSuggestions({
      assetType: 'CALDAIA',
      installedAt: new Date('2026-01-01T00:00:00Z'),
      purchasedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      existingPlanTitles: [],
      region: 'Lombardia',
      powerKw: 24,
    });
    const boiler = suggestions.find((s) => s.code === 'caldaia-controllo');
    expect(boiler?.recurrenceInterval).toBe(2);
    expect(boiler?.resolvedIntervalSource?.title).toContain('Lombardia');
  });

  it('falls back to the generic default when region or power is unknown, without breaking other guidelines', () => {
    const noPower = computeMaintenanceSuggestions({
      assetType: 'CALDAIA',
      installedAt: new Date('2026-01-01T00:00:00Z'),
      purchasedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      existingPlanTitles: [],
      region: 'Lazio',
      powerKw: null,
    });
    const boilerNoPower = noPower.find((s) => s.code === 'caldaia-controllo');
    expect(boilerNoPower?.recurrenceInterval).toBe(2);
    expect(boilerNoPower?.regionalLookupAvailable).toBe(true);
    expect(boilerNoPower?.resolvedIntervalSource).toBeNull();

    const unknownRegion = computeMaintenanceSuggestions({
      assetType: 'CALDAIA',
      installedAt: new Date('2026-01-01T00:00:00Z'),
      purchasedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      existingPlanTitles: [],
      region: 'Toscana',
      powerKw: 24,
    });
    const boilerUnknownRegion = unknownRegion.find(
      (s) => s.code === 'caldaia-controllo',
    );
    expect(boilerUnknownRegion?.recurrenceInterval).toBe(2);
    expect(boilerUnknownRegion?.resolvedIntervalSource).toBeNull();
  });
});
