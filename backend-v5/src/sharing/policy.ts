import { ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ids, invalid, object, uuid } from '../review/domain';

// Manifest helpers shared by C1 runtime; the same-Home wrapper remains an offline regression contract.
export const sharingLimits = { documents: 20, bytes: 100 * 1024 * 1024, durationDays: [1, 7, 30] } as const;
export type MembershipFact = {
  accountId: string; homeId: string; role: 'owner' | 'member' | 'viewer';
  validFrom: Date; validUntil: Date | null; revokedAt: Date | null;
};
export type DocumentFact = {
  id: string; homeId: string; uploaderId: string; name: string;
  original: { version: number; sha256: string; byteSize: number; mimeType: string; available: boolean } | null;
};
export type ManifestItem = {
  documentId: string; documentVersion: number; sha256: string; name: string; byteSize: number; mimeType: string;
};
export type Manifest = {
  senderAccountId: string; recipientAccountId: string | null; homeId: string;
  expiresAt: string; items: ManifestItem[]; totalBytes: number;
};
export type Selection = { documentIds: string[]; recipientAccountId: string; durationDays: number };

const deny = () => new ForbiddenException({ code: 'share_unavailable', message: 'Condivisione non disponibile.' });
function active(member: MembershipFact | null, accountId: string, homeId: string, now: Date): member is MembershipFact {
  return !!member && member.accountId === accountId && member.homeId === homeId &&
    !member.revokedAt && member.validFrom <= now && (!member.validUntil || member.validUntil > now);
}
function instant(now: Date) {
  if (!Number.isFinite(now.getTime())) throw invalid();
}
export function shareSelection(input: unknown): Selection {
  const row = object(input, ['documentIds', 'recipientAccountId', 'durationDays']);
  if (typeof row.durationDays !== 'number' || !sharingLimits.durationDays.some(day => day === row.durationDays)) throw invalid();
  return { documentIds: ids(row.documentIds, sharingLimits.documents), recipientAccountId: uuid(row.recipientAccountId), durationDays: row.durationDays };
}

/** Facts must be resolved by the server in the eventual transaction, never read from the request body. */
export function previewShare(selection: Selection, context: {
  senderAccountId: string; homeId: string; sender: MembershipFact | null; recipient: MembershipFact | null;
  documents: DocumentFact[]; now: Date;
}): Manifest {
  const value = shareSelection(selection);
  const { senderAccountId, homeId, sender, recipient, documents, now } = context;
  instant(now);
  if (!active(sender, senderAccountId, homeId, now) || sender.role === 'viewer' ||
      value.recipientAccountId === senderAccountId || !active(recipient, value.recipientAccountId, homeId, now)) throw deny();
  const {items:selected,totalBytes} = selectedOriginals(value.documentIds, documents, senderAccountId, homeId);
  return { senderAccountId, recipientAccountId: value.recipientAccountId, homeId,
    expiresAt: new Date(now.getTime() + value.durationDays * 86400_000).toISOString(), items: selected, totalBytes };
}
export function selectedOriginals(documentIds: string[], documents: DocumentFact[], senderAccountId:string,homeId:string) {
  const selected = ids(documentIds,sharingLimits.documents).map(id => {
    const doc = documents.find(item => item.id === id);
    if (!doc || doc.homeId !== homeId || doc.uploaderId !== senderAccountId || !doc.original?.available) throw deny();
    const original = doc.original;
    if (!Number.isSafeInteger(original.version) || original.version < 1 || !/^[a-f0-9]{64}$/.test(original.sha256) ||
        !Number.isSafeInteger(original.byteSize) || original.byteSize < 1) throw deny();
    return { documentId: doc.id, documentVersion: original.version, sha256: original.sha256,
      name: doc.name, byteSize: original.byteSize, mimeType: original.mimeType };
  });
  const totalBytes = selected.reduce((sum, doc) => sum + doc.byteSize, 0);
  if (!Number.isSafeInteger(totalBytes) || totalBytes > sharingLimits.bytes) throw invalid('La selezione supera il limite di dimensione consentito.');
  return {items:selected,totalBytes};
}

/** Every original is acknowledged; no inferred financial/sensitive classifier can silently exempt a file. */
export function manifestFingerprint(manifest: Manifest) {
  return createHash('sha256').update(JSON.stringify({ senderAccountId: manifest.senderAccountId,
    recipientAccountId: manifest.recipientAccountId, homeId: manifest.homeId, expiresAt: manifest.expiresAt,
    items: [...manifest.items].sort((a, b) => a.documentId.localeCompare(b.documentId)).map(item =>
      [item.documentId, item.documentVersion, item.sha256, item.name, item.byteSize, item.mimeType]), totalBytes: manifest.totalBytes })).digest('hex');
}
export function acknowledgeManifest(manifest: Manifest, input: unknown) {
  const confirmation = object(input, ['documentIds', 'manifestFingerprint']);
  const selected = ids(confirmation.documentIds, sharingLimits.documents);
  const expected = new Set(manifest.items.map(item => item.documentId));
  if (confirmation.manifestFingerprint !== manifestFingerprint(manifest) || selected.length !== expected.size || selected.some(id => !expected.has(id))) {
    throw invalid('Conferma i file completi della selezione corrente.', 'share_acknowledgement_required');
  }
}

export function assertShareReadable(manifest: Manifest, context: {
  accountId: string; state: 'pending' | 'accepted' | 'declined' | 'revoked';
  sender: MembershipFact | null; recipient: MembershipFact | null; documents: DocumentFact[]; now: Date;
}) {
  const { accountId, state, sender, recipient, documents, now } = context;
  instant(now);
  const expiresAt = Date.parse(manifest.expiresAt);
  if (accountId !== manifest.recipientAccountId || state !== 'accepted' || !Number.isFinite(expiresAt) || expiresAt <= now.getTime() ||
      !active(sender, manifest.senderAccountId, manifest.homeId, now) || sender.role === 'viewer' ||
      !active(recipient, manifest.recipientAccountId, manifest.homeId, now) || !manifest.items.length) throw deny();
  for (const selected of manifest.items) {
    const doc = documents.find(item => item.id === selected.documentId);
    if (!doc || doc.homeId !== manifest.homeId || doc.uploaderId !== manifest.senderAccountId || !doc.original?.available ||
        doc.original.version !== selected.documentVersion || doc.original.sha256 !== selected.sha256 ||
        doc.original.byteSize !== selected.byteSize || doc.original.mimeType !== selected.mimeType) throw deny();
  }
}
