import { EvidenceStatus } from '@prisma/client';

export function evidenceOrUnknown(
  status: EvidenceStatus | null | undefined,
): EvidenceStatus {
  return status ?? EvidenceStatus.UNKNOWN;
}

export function canAssertMissing(status: EvidenceStatus | null | undefined) {
  return status === EvidenceStatus.DECLARED_ABSENT;
}
