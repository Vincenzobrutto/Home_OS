import {
  evaluateHomeDetectiveRules,
  HomeDetectiveInput,
} from './home-detective';

function baseInput(
  overrides: Partial<HomeDetectiveInput> = {},
): HomeDetectiveInput {
  return {
    houseHasAnyDocument: true,
    genesisCompleted: true,
    assets: [],
    unconfirmedObservationsCount: 0,
    ...overrides,
  };
}

describe('home detective rule engine', () => {
  it('returns no issues for a fully documented, complete house', () => {
    expect(evaluateHomeDetectiveRules(baseInput())).toEqual([]);
  });

  it('flags a boiler without documentation', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'CALDAIA',
            confirmed: true,
            dismissed: false,
            hasDocument: false,
            roomId: null,
          },
        ],
      }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        ruleCode: 'HEATING_SYSTEM_WITHOUT_DOCUMENTATION',
        assetId: 'a1',
        severity: 'MEDIUM',
      }),
    ]);
  });

  it('does not flag a boiler that already has a document', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'CALDAIA',
            confirmed: true,
            dismissed: false,
            hasDocument: true,
            roomId: null,
          },
        ],
      }),
    );
    expect(drafts).toEqual([]);
  });

  it('flags a room-bound asset type without a room, but not a house-level type', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        assets: [
          {
            id: 'fridge',
            type: 'ELETTRODOMESTICO',
            confirmed: true,
            dismissed: false,
            hasDocument: true,
            roomId: null,
          },
          {
            id: 'wiring',
            type: 'ELETTRICO',
            confirmed: true,
            dismissed: false,
            hasDocument: true,
            roomId: null,
          },
        ],
      }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        ruleCode: 'ASSET_WITHOUT_ROOM',
        assetId: 'fridge',
      }),
    ]);
  });

  it('ignores unconfirmed and dismissed assets for every rule', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        assets: [
          {
            id: 'a1',
            type: 'CALDAIA',
            confirmed: false,
            dismissed: false,
            hasDocument: false,
            roomId: null,
          },
          {
            id: 'a2',
            type: 'CALDAIA',
            confirmed: true,
            dismissed: true,
            hasDocument: false,
            roomId: null,
          },
        ],
      }),
    );
    expect(drafts).toEqual([]);
  });

  it('flags unconfirmed scan observations at the house level', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({ unconfirmedObservationsCount: 3 }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        ruleCode: 'UNCONFIRMED_SCAN_RESULTS',
        assetId: null,
      }),
    ]);
  });

  it('flags a house without documents and an incomplete Genesis independently', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({ houseHasAnyDocument: false, genesisCompleted: false }),
    );
    expect(drafts.map((d) => d.ruleCode).sort()).toEqual([
      'GENESIS_INCOMPLETE',
      'HOUSE_WITHOUT_DOCUMENTS',
    ]);
  });

  it('is idempotent: the same input always produces the same drafts', () => {
    const input = baseInput({
      houseHasAnyDocument: false,
      unconfirmedObservationsCount: 1,
      assets: [
        {
          id: 'a1',
          type: 'CALDAIA',
          confirmed: true,
          dismissed: false,
          hasDocument: false,
          roomId: null,
        },
      ],
    });
    expect(evaluateHomeDetectiveRules(input)).toEqual(
      evaluateHomeDetectiveRules(input),
    );
  });
});
