import { RegulatoryRuleStatus } from '@prisma/client';

export interface RuleCandidate {
  stableCode: string;
  version: number;
  family: string;
  scope: unknown;
  conditions: unknown;
  effect: unknown;
  sourceTitle: string;
  sourceUrl: string;
  verifiedAt: Date | null;
  validFrom: Date | null;
  validTo?: Date | null;
  status: RegulatoryRuleStatus;
}

function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

export function validateRule(candidate: RuleCandidate): string[] {
  const errors: string[] = [];
  if (!candidate.stableCode.trim()) errors.push('stableCode is required');
  if (!candidate.family.trim()) errors.push('family is required');
  if (candidate.version < 1) errors.push('version must be positive');
  if (!candidate.sourceTitle.trim()) errors.push('sourceTitle is required');
  if (!candidate.sourceUrl.trim()) errors.push('sourceUrl is required');
  else {
    try {
      new URL(candidate.sourceUrl);
    } catch {
      errors.push('sourceUrl must be a valid URL');
    }
  }
  if (!candidate.verifiedAt) errors.push('verifiedAt is required');
  if (!candidate.validFrom) errors.push('validFrom is required');
  if (
    candidate.validFrom &&
    candidate.validTo &&
    candidate.validTo < candidate.validFrom
  ) {
    errors.push('validTo cannot precede validFrom');
  }
  if (!isNonEmptyObject(candidate.scope)) errors.push('scope is required');
  if (!isNonEmptyObject(candidate.conditions))
    errors.push('conditions are required');
  if (!isNonEmptyObject(candidate.effect)) errors.push('effect is required');
  return errors;
}

export function canExecuteRule(candidate: RuleCandidate, asOf: Date) {
  return (
    candidate.status === RegulatoryRuleStatus.ACTIVE &&
    validateRule(candidate).length === 0 &&
    candidate.validFrom !== null &&
    candidate.validFrom <= asOf &&
    (!candidate.validTo || candidate.validTo >= asOf)
  );
}
