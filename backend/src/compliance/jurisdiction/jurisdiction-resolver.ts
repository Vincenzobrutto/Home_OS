export type TerritoryKind =
  'REGION' | 'METROPOLITAN_CITY' | 'PROVINCE' | 'MUNICIPALITY';

export interface TerritorialRule {
  id: string;
  family: string;
  territoryKind: TerritoryKind | 'NATIONAL';
}

export type JurisdictionResolution =
  | { status: 'RESOLVED'; rule: TerritorialRule }
  | { status: 'NOT_FOUND' }
  | { status: 'REQUIRES_REVIEW'; conflictingRuleIds: string[] };

const SPECIFICITY: Record<TerritorialRule['territoryKind'], number> = {
  NATIONAL: 0,
  REGION: 1,
  PROVINCE: 2,
  METROPOLITAN_CITY: 2,
  MUNICIPALITY: 3,
};

export function resolveMostSpecificRule(
  family: string,
  rules: readonly TerritorialRule[],
): JurisdictionResolution {
  const familyRules = rules.filter((rule) => rule.family === family);
  if (!familyRules.length) return { status: 'NOT_FOUND' };
  const highest = Math.max(
    ...familyRules.map((rule) => SPECIFICITY[rule.territoryKind]),
  );
  const candidates = familyRules.filter(
    (rule) => SPECIFICITY[rule.territoryKind] === highest,
  );
  if (candidates.length > 1) {
    return {
      status: 'REQUIRES_REVIEW',
      conflictingRuleIds: candidates.map((rule) => rule.id),
    };
  }
  return { status: 'RESOLVED', rule: candidates[0] };
}
