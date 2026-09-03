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
    interventions: [],
    warranties: [],
    contacts: [],
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

  it('flags an intervention without a linked document, keeping the asset for click-through', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        interventions: [
          { id: 'i1', assetId: 'a1', contactId: 'c1', hasDocument: false },
        ],
      }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        ruleCode: 'INTERVENTION_WITHOUT_DOCUMENT',
        assetId: 'a1',
        interventionId: 'i1',
        contactId: null,
      }),
    ]);
  });

  it('flags an intervention without a linked contact', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        interventions: [
          { id: 'i1', assetId: 'a1', contactId: null, hasDocument: true },
        ],
      }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        ruleCode: 'INTERVENTION_WITHOUT_CONTACT',
        assetId: 'a1',
        interventionId: 'i1',
      }),
    ]);
  });

  it('produces two distinct drafts (different interventionId) for two problematic interventions on the same asset', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        interventions: [
          { id: 'i1', assetId: 'a1', contactId: 'c1', hasDocument: false },
          { id: 'i2', assetId: 'a1', contactId: 'c1', hasDocument: false },
        ],
      }),
    );
    const withRule = drafts.filter(
      (d) => d.ruleCode === 'INTERVENTION_WITHOUT_DOCUMENT',
    );
    expect(withRule).toHaveLength(2);
    expect(withRule.map((d) => d.interventionId).sort()).toEqual(['i1', 'i2']);
  });

  it('flags a warranty without proof', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        warranties: [{ id: 'w1', assetId: 'a1', hasProof: false }],
      }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        ruleCode: 'WARRANTY_WITHOUT_PROOF',
        assetId: 'a1',
        warrantyId: 'w1',
        severity: 'MEDIUM',
      }),
    ]);
  });

  it('does not flag a warranty that already has proof', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        warranties: [{ id: 'w1', assetId: 'a1', hasProof: true }],
      }),
    );
    expect(drafts).toEqual([]);
  });

  it('flags a used contact without phone or email', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        contacts: [{ id: 'c1', phone: null, email: null, isUsed: true }],
      }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        ruleCode: 'CONTACT_TO_VERIFY',
        contactId: 'c1',
        assetId: null,
      }),
    ]);
  });

  it('does not flag an unused contact, even without phone or email', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        contacts: [{ id: 'c1', phone: null, email: null, isUsed: false }],
      }),
    );
    expect(drafts).toEqual([]);
  });

  it('does not flag a used contact that has at least a phone or email', () => {
    const drafts = evaluateHomeDetectiveRules(
      baseInput({
        contacts: [{ id: 'c1', phone: '333123456', email: null, isUsed: true }],
      }),
    );
    expect(drafts).toEqual([]);
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
