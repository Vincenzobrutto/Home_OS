import { EvidenceStatus } from '@prisma/client';

export type ApeState = 'VALID' | 'AT_RISK' | 'EXPIRED' | 'UNKNOWN';

export interface ApeStateInput {
  issuedAt: Date | null;
  explicitExpiresAt: Date | null;
  asOf: Date;
  maxValidityYears: number | null;
  bookletStatus: EvidenceStatus | null;
  firstMissedEfficiencyDueAt: Date | null;
  interventionImpactKnown: boolean | null;
  hasThermalSystem: boolean;
}

export function evaluateApeState(input: ApeStateInput): ApeState {
  if (!input.issuedAt && !input.explicitExpiresAt) return 'UNKNOWN';

  const expiry = input.explicitExpiresAt
    ? input.explicitExpiresAt
    : input.issuedAt && input.maxValidityYears !== null
      ? new Date(
          Date.UTC(
            input.issuedAt.getUTCFullYear() + input.maxValidityYears,
            input.issuedAt.getUTCMonth(),
            input.issuedAt.getUTCDate(),
          ),
        )
      : null;

  if (!expiry) return 'UNKNOWN';
  if (expiry < input.asOf) return 'EXPIRED';
  if (input.interventionImpactKnown === false) return 'AT_RISK';

  if (input.hasThermalSystem) {
    if (
      input.bookletStatus === null ||
      input.bookletStatus === EvidenceStatus.UNKNOWN
    ) {
      return 'UNKNOWN';
    }
    if (
      input.firstMissedEfficiencyDueAt &&
      input.firstMissedEfficiencyDueAt < input.asOf
    ) {
      return 'AT_RISK';
    }
  }

  return 'VALID';
}
