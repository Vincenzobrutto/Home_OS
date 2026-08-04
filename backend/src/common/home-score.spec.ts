import { computeHomeScore, HomeScoreInput } from './home-score';

function baseInput(overrides: Partial<HomeScoreInput> = {}): HomeScoreInput {
  return {
    currentYear: 2026,
    houseHasAnyDocument: true,
    assets: [],
    confirmedRoomsCount: 0,
    genesisCompleted: false,
    ...overrides,
  };
}

describe('home score engine', () => {
  it('gives a perfect score with no assets, at least one document, but zero completeness', () => {
    const result = computeHomeScore(baseInput());
    expect(result.dimensions.documentation).toBe(100);
    expect(result.dimensions.maintenance).toBe(100);
    expect(result.dimensions.safety).toBe(100);
    expect(result.dimensions.efficiency).toBe(100);
    expect(result.dimensions.completeness).toBe(0);
    // 100*0.25 + 100*0.20 + 100*0.25 + 100*0.15 + 0*0.15 = 85
    expect(result.overall).toBe(85);
    expect(result.version).toBe('v1');
  });

  it('penalizes a house with zero documents', () => {
    const result = computeHomeScore(baseInput({ houseHasAnyDocument: false }));
    expect(result.dimensions.documentation).toBe(70);
    expect(result.reasons).toContainEqual(
      expect.objectContaining({ code: 'HOUSE_WITHOUT_DOCUMENTS', impact: -30 }),
    );
  });

  it('penalizes a critical asset without a linked document (documentation + safety)', () => {
    const result = computeHomeScore(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'CALDAIA',
            confirmed: true,
            dismissed: false,
            hasDocument: false,
            hasMaintenancePlan: false,
            estimatedReplacementYear: null,
          },
        ],
      }),
    );
    expect(result.dimensions.documentation).toBe(90);
    expect(result.dimensions.safety).toBe(80);
    expect(
      result.reasons.some((r) => r.code === 'CRITICAL_ASSET_WITHOUT_DOCUMENT'),
    ).toBe(true);
    expect(
      result.reasons.some((r) => r.code === 'CRITICAL_ASSET_NO_EVIDENCE'),
    ).toBe(true);
  });

  it('does not penalize safety when the critical asset has a document even without maintenance', () => {
    const result = computeHomeScore(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'ELETTRICO',
            confirmed: true,
            dismissed: false,
            hasDocument: true,
            hasMaintenancePlan: false,
            estimatedReplacementYear: null,
          },
        ],
      }),
    );
    expect(result.dimensions.safety).toBe(100);
  });

  it('penalizes a boiler without a maintenance plan', () => {
    const result = computeHomeScore(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'CALDAIA',
            confirmed: true,
            dismissed: false,
            hasDocument: true,
            hasMaintenancePlan: false,
            estimatedReplacementYear: null,
          },
        ],
      }),
    );
    expect(result.dimensions.maintenance).toBe(75);
  });

  it('ignores unconfirmed and dismissed assets entirely', () => {
    const result = computeHomeScore(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'CALDAIA',
            confirmed: false,
            dismissed: false,
            hasDocument: false,
            hasMaintenancePlan: false,
            estimatedReplacementYear: null,
          },
          {
            id: 'a2',
            type: 'CALDAIA',
            confirmed: true,
            dismissed: true,
            hasDocument: false,
            hasMaintenancePlan: false,
            estimatedReplacementYear: null,
          },
        ],
      }),
    );
    expect(result.dimensions.maintenance).toBe(100);
    expect(result.dimensions.documentation).toBe(100);
    expect(result.dimensions.completeness).toBe(0);
  });

  it('builds completeness from confirmed rooms, confirmed assets and genesis completion, capped at 100', () => {
    const manyAssets = Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      type: 'ELETTRODOMESTICO',
      confirmed: true,
      dismissed: false,
      hasDocument: true,
      hasMaintenancePlan: true,
      estimatedReplacementYear: null,
    }));
    const result = computeHomeScore(
      baseInput({
        assets: manyAssets,
        confirmedRoomsCount: 10,
        genesisCompleted: true,
      }),
    );
    // rooms: min(10*10,40)=40, assets: min(10*5,30)=30, genesis: 30 -> 100
    expect(result.dimensions.completeness).toBe(100);
  });

  it('clamps overall and every dimension between 0 and 100', () => {
    const manyCriticalAssets = Array.from({ length: 20 }, (_, i) => ({
      id: `a${i}`,
      type: 'CALDAIA',
      confirmed: true,
      dismissed: false,
      hasDocument: false,
      hasMaintenancePlan: false,
      estimatedReplacementYear: 2020,
    }));
    const result = computeHomeScore(
      baseInput({ houseHasAnyDocument: false, assets: manyCriticalAssets }),
    );
    for (const value of Object.values(result.dimensions)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('penalizes efficiency only once the estimated replacement year has passed', () => {
    const future = computeHomeScore(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'ELETTRODOMESTICO',
            confirmed: true,
            dismissed: false,
            hasDocument: true,
            hasMaintenancePlan: true,
            estimatedReplacementYear: 2030,
          },
        ],
      }),
    );
    expect(future.dimensions.efficiency).toBe(100);

    const past = computeHomeScore(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'ELETTRODOMESTICO',
            confirmed: true,
            dismissed: false,
            hasDocument: true,
            hasMaintenancePlan: true,
            estimatedReplacementYear: 2020,
          },
        ],
      }),
    );
    expect(past.dimensions.efficiency).toBe(85);
  });
});
