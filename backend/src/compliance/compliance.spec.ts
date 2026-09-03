import { EvidenceStatus, RegulatoryRuleStatus } from '@prisma/client';
import { evaluateApeState } from './ape/ape-state';
import { evidenceOrUnknown } from './evidence/evidence-state';
import { evaluateFGas } from './fgas/fgas';
import { resolveMostSpecificRule } from './jurisdiction/jurisdiction-resolver';
import { canExecuteRule, validateRule } from './rules/rule-validator';

const TEST_ANNEX_I_POLICY = {
  thresholdMetric: 'T_CO2_EQ' as const,
  bands: [
    { minimum: 500, intervalMonths: 3 },
    { minimum: 50, intervalMonths: 6 },
    { minimum: 5, intervalMonths: 12 },
  ],
  residentialHermeticExemptionMaxKg: 3,
};

describe('compliance foundations', () => {
  it('treats a missing evidence row as UNKNOWN, never absent', () => {
    expect(evidenceOrUnknown(undefined)).toBe(EvidenceStatus.UNKNOWN);
  });

  it('calculates the R32 acceptance example below threshold', () => {
    expect(
      evaluateFGas({
        family: 'ANNEX_I',
        chargeKg: 1.2,
        gwp: 675,
        hermeticallySealed: false,
        sealedLabelPresent: null,
        residentialUse: true,
        leakDetectionSystem: false,
        policy: TEST_ANNEX_I_POLICY,
      }),
    ).toMatchObject({ status: 'NOT_APPLICABLE', tCo2Equivalent: 0.81 });
  });

  it('applies the labelled residential hermetic exemption', () => {
    expect(
      evaluateFGas({
        family: 'ANNEX_I',
        chargeKg: 2.5,
        gwp: 2500,
        hermeticallySealed: true,
        sealedLabelPresent: true,
        residentialUse: true,
        leakDetectionSystem: false,
        policy: TEST_ANNEX_I_POLICY,
      }).status,
    ).toBe('NOT_APPLICABLE');
  });

  it('does not invent an F-gas result when the charge is missing', () => {
    expect(
      evaluateFGas({
        family: 'ANNEX_I',
        chargeKg: null,
        gwp: 675,
        hermeticallySealed: null,
        sealedLabelPresent: null,
        residentialUse: true,
        leakDetectionSystem: null,
        policy: TEST_ANNEX_I_POLICY,
      }).status,
    ).toBe('UNKNOWN');
  });

  it('does not execute F-gas thresholds without an active rule policy', () => {
    expect(
      evaluateFGas({
        family: 'ANNEX_I',
        chargeKg: 100,
        gwp: 675,
        hermeticallySealed: false,
        sealedLabelPresent: false,
        residentialUse: true,
        leakDetectionSystem: false,
        policy: null,
      }).status,
    ).toBe('UNKNOWN');
  });

  it('keeps APE unknown when booklet evidence is unknown', () => {
    expect(
      evaluateApeState({
        issuedAt: new Date('2025-01-01'),
        explicitExpiresAt: new Date('2035-01-01'),
        asOf: new Date('2026-09-03'),
        maxValidityYears: 10,
        bookletStatus: EvidenceStatus.UNKNOWN,
        firstMissedEfficiencyDueAt: null,
        interventionImpactKnown: true,
        hasThermalSystem: true,
      }),
    ).toBe('UNKNOWN');
  });

  it('rejects rules without traceable source and dates', () => {
    const candidate = {
      stableCode: 'TEST',
      version: 1,
      family: 'EFFICIENCY',
      scope: { assetType: 'CALDAIA' },
      conditions: { maxPowerKw: 35 },
      effect: { intervalMonths: 48 },
      sourceTitle: '',
      sourceUrl: '',
      verifiedAt: null,
      validFrom: null,
      status: RegulatoryRuleStatus.ACTIVE,
    };
    expect(validateRule(candidate)).toEqual(
      expect.arrayContaining([
        'sourceTitle is required',
        'sourceUrl is required',
        'verifiedAt is required',
        'validFrom is required',
      ]),
    );
    expect(canExecuteRule(candidate, new Date())).toBe(false);
  });

  it('never executes BLOCKED rules', () => {
    expect(
      canExecuteRule(
        {
          stableCode: 'VENETO-BLOCKED',
          version: 1,
          family: 'EFFICIENCY',
          scope: { assetType: 'CLIMA' },
          conditions: { enabled: true },
          effect: { intervalMonths: 48 },
          sourceTitle: 'Fonte istituzionale',
          sourceUrl: 'https://example.test/source',
          verifiedAt: new Date('2026-09-03'),
          validFrom: new Date('2026-01-01'),
          status: RegulatoryRuleStatus.BLOCKED,
        },
        new Date('2026-09-03'),
      ),
    ).toBe(false);
  });

  it('returns REQUIRES_REVIEW for unresolved same-level conflicts', () => {
    expect(
      resolveMostSpecificRule('EFFICIENCY', [
        { id: 'a', family: 'EFFICIENCY', territoryKind: 'REGION' },
        { id: 'b', family: 'EFFICIENCY', territoryKind: 'REGION' },
      ]),
    ).toEqual({ status: 'REQUIRES_REVIEW', conflictingRuleIds: ['a', 'b'] });
  });
});
