import { ConflictException, ForbiddenException, GoneException } from '@nestjs/common';
import { Prisma } from '../../generated/client';

/** Cestino della casa, documenti (lotto 1). Progetto: docs/v5/fase0-deletion-design-20261022.md. */
type Tx = Prisma.TransactionClient;
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;
const BUSY = ['queued', 'running'];
/** Tombstone written over idempotent responses that could echo a purged document's content. */
export const SOURCE_DELETED = { sourceDeleted: true } as const;
export function rejectDeletedReplay(response: unknown) {
  if (response && typeof response === 'object' && (response as Record<string, unknown>).sourceDeleted === true) throw new GoneException({ code: 'source_deleted', message: 'La fonte di questa richiesta è stata eliminata definitivamente.' });
}
export type PurgeReason = 'expired' | 'user_now' | 'user_empty';

const conflict = (code: string, message: string) => new ConflictException({ code, message });
const inManifest = (documentId: string) => ({ path: ['items'], array_contains: [{ documentId }] });

/**
 * Lock order matches SharingService, which locks ShareRecord before reading the Document:
 * share rows are always locked before the Document row, never after.
 */
export async function lockDocumentShares(tx: Tx, h: string, documentIds: string[]) {
  const rows = documentIds.length ? await tx.shareRecord.findMany({ where: { homeId: h, OR: documentIds.map(id => ({ manifest: inManifest(id) })) }, select: { id: true }, orderBy: { id: 'asc' } }) : [];
  if (rows.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM "ShareRecord" WHERE id IN (${Prisma.join(rows.map(r => r.id))}) ORDER BY id FOR UPDATE`);
  return rows.map(r => r.id);
}
/** Revokes every share still open on the document; revoked shares never come back with a restore. */
export async function revokeDocumentShares(tx: Tx, h: string, id: string, actorId: string, now: Date) {
  const locked = await lockDocumentShares(tx, h, [id]);
  const open = locked.length ? await tx.shareRecord.findMany({ where: { id: { in: locked }, state: { notIn: ['revoked', 'declined'] } }, orderBy: { id: 'asc' } }) : [];
  for (const share of open) {
    const updated = await tx.shareRecord.update({ where: { id: share.id }, data: { state: 'revoked', revokedAt: now, codeHash: null, comparisonCode: null, version: { increment: 1 } } });
    await tx.shareEvent.create({ data: { shareId: share.id, actorId, kind: 'revoke', version: updated.version } });
  }
  await tx.sharePreview.updateMany({ where: { homeId: h, consumedBy: null, validUntil: { gt: now }, manifest: inManifest(id) }, data: { validUntil: now } });
  return open.length;
}

/** Only the uploader may move, restore or delete a document; owning the home is not enough. */
export async function lockedOwnDocument(tx: Tx, a: string, h: string, id: string) {
  await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR UPDATE`;
  const doc = await tx.document.findUnique({ where: { id }, include: { original: { include: { file: true } } } });
  if (!doc || doc.homeId !== h || doc.uploaderId !== a) throw new ForbiddenException('Accesso non consentito.');
  return doc;
}

/** §4.4: an analysis still queued or running could write after the move; boiler review sources are not covered yet. */
export async function busyReason(tx: Tx, h: string, id: string): Promise<string | null> {
  const running = { documentId: id, state: { in: BUSY } };
  const counts = await Promise.all([
    tx.objectOnboardingJob.count({ where: running }), tx.receiptAnalysisJob.count({ where: running }), tx.economicAnalysisJob.count({ where: running }),
    tx.documentIntakeItem.count({ where: { documentId: id, OR: [{ uploadState: 'uploading' }, { analysisState: { in: BUSY } }] } }),
    tx.documentIntakeAnalysis.count({ where: { item: { documentId: id }, state: { in: BUSY } } }),
  ]);
  if (counts.some(n => n > 0)) return 'Il documento è in analisi. Attendi che l’analisi finisca, poi riprova.';
  if (await tx.analysisJob.count({ where: { homeId: h, documents: { array_contains: [{ documentId: id }] } } })) return 'Il documento è fonte della scheda caldaia: per ora non può andare nel cestino.';
  return null;
}

/** What the document is a source of, counted on the caller's own rows only. */
export async function trashImpact(tx: Tx, a: string, h: string, id: string, now: Date) {
  const own = { accountId: a, homeId: h };
  const [expenses, links, fields, contacts, historyEvents, activeShares] = await Promise.all([
    tx.homeExpense.count({ where: { ...own, documentId: id, state: 'active' } }),
    tx.objectResourceLink.findMany({ where: { ...own, documentId: id, state: 'active' }, select: { objectId: true, boilerId: true } }),
    tx.receiptObjectField.findMany({ where: { ...own, documentId: id }, select: { objectId: true } }),
    tx.contactResourceLink.count({ where: { resourceKind: 'document', resourceId: id, state: 'active', contact: own } }),
    tx.homeHistoryEvent.count({ where: { ...own, state: 'active', documentIds: { array_contains: [id] } } }),
    tx.shareRecord.count({ where: { senderId: a, homeId: h, state: { notIn: ['revoked', 'declined'] }, expiresAt: { gt: now }, manifest: inManifest(id) } }),
  ]);
  const objects = new Set([...links.map(l => l.objectId ?? l.boilerId), ...fields.map(f => f.objectId)].filter(Boolean)).size;
  return { expenses, objects, contacts, historyEvents, activeShares };
}

export function trashEntry(doc: { id: string; name: string; trashedAt: Date | null; purgeAfter: Date | null; lifecycleVersion: number }) {
  return { kind: 'document' as const, id: doc.id, name: doc.name, trashedAt: doc.trashedAt!.toISOString(), purgeAfter: doc.purgeAfter!.toISOString(), version: doc.lifecycleVersion };
}

export async function moveToTrash(tx: Tx, a: string, h: string, id: string, expectedVersion: number, now: Date) {
  const doc = await lockedOwnDocument(tx, a, h, id);
  if (doc.trashedAt) throw conflict('document_in_trash', 'Il documento è già nel cestino.');
  if (!doc.original) throw conflict('document_unavailable', 'Originale non disponibile.');
  if (doc.original.version !== expectedVersion) throw conflict('document_version_conflict', 'Il documento è cambiato. Riapri la sua scheda.');
  const busy = await busyReason(tx, h, id);
  if (busy) throw conflict('document_busy', busy);
  // Shares stop working in this transaction (a trashed document is not an available original) and are
  // marked revoked right after commit: updating share rows after the Document lock could deadlock with a download.
  const shares = await tx.shareRecord.count({ where: { homeId: h, state: { notIn: ['revoked', 'declined'] }, manifest: inManifest(id) } });
  const moved = await tx.document.update({ where: { id }, data: { trashedAt: now, purgeAfter: new Date(+now + TRASH_RETENTION_DAYS * DAY_MS), lifecycleVersion: { increment: 1 } } });
  return { entry: trashEntry(moved), revokedShares: shares };
}

export async function restoreFromTrash(tx: Tx, a: string, h: string, id: string, expectedVersion: number, now: Date) {
  // Covers a revocation interrupted after the move: restoring never revives a share.
  await revokeDocumentShares(tx, h, id, a, now);
  const doc = await lockedOwnDocument(tx, a, h, id);
  if (!doc.trashedAt || doc.purgedAt) throw conflict('document_not_in_trash', 'Il documento non è nel cestino.');
  if (doc.lifecycleVersion !== expectedVersion) throw conflict('trash_version_conflict', 'Il cestino è cambiato. Ricarica la pagina.');
  if (doc.purgeAfter! <= now) throw conflict('trash_expired', 'Il documento è scaduto e sta per essere eliminato definitivamente.');
  await tx.document.update({ where: { id }, data: { trashedAt: null, purgeAfter: null, lifecycleVersion: { increment: 1 } } });
  return { restored: true, document: { id } };
}

/**
 * Definitive deletion of a trashed document's content. The Document row stays as a contentless
 * placeholder so confirmed expenses, objects and fields keep their source as "documento eliminato".
 * Returns the storage key to remove after commit (DeletionRecord.fileRemovedAt tracks retries).
 */
export async function purgeDocument(tx: Tx, h: string, id: string, reason: PurgeReason, now: Date) {
  const shareIds = await lockDocumentShares(tx, h, [id]);
  await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR UPDATE`;
  const doc = await tx.document.findUnique({ where: { id }, include: { original: { include: { file: true } } } });
  if (!doc || doc.homeId !== h || !doc.trashedAt || doc.purgedAt) return null;
  await revokeDocumentShares(tx, h, id, doc.uploaderId, now);
  const source = { documentId: id };
  const [onboardingDrafts, onboardingJobs, receiptDrafts, receiptJobs, economicDrafts, economicJobs, items] = await Promise.all([
    tx.objectOnboardingDraft.findMany({ where: source, select: { id: true } }), tx.objectOnboardingJob.findMany({ where: source, select: { id: true } }),
    tx.receiptDraft.findMany({ where: source, select: { id: true } }), tx.receiptAnalysisJob.findMany({ where: source, select: { id: true } }),
    tx.economicDraft.findMany({ where: source, select: { id: true } }), tx.economicAnalysisJob.findMany({ where: source, select: { id: true } }),
    tx.documentIntakeItem.findMany({ where: source, select: { id: true, batchId: true, clientItemId: true } }),
  ]);
  const ids = (rows: Array<{ id: string }>) => rows.map(r => r.id);
  // Analysis outputs, AI responses and proposals: rows stay for ledgers and foreign keys, content goes.
  await tx.objectOnboardingDraft.updateMany({ where: source, data: { output: {}, review: Prisma.DbNull, decisions: {} } });
  await tx.objectOnboardingComparison.updateMany({ where: source, data: { proposed: {} } });
  await tx.objectOnboardingAttempt.updateMany({ where: { jobId: { in: ids(onboardingJobs) } }, data: { output: Prisma.DbNull } });
  await tx.receiptDraft.updateMany({ where: source, data: { fields: {}, total: Prisma.DbNull, review: Prisma.DbNull, confirmation: Prisma.DbNull } });
  await tx.receiptComparison.updateMany({ where: { draftId: { in: ids(receiptDrafts) } }, data: { proposed: {} } });
  await tx.receiptAiAttempt.updateMany({ where: { jobId: { in: ids(receiptJobs) } }, data: { output: Prisma.DbNull } });
  await tx.economicDraft.updateMany({ where: source, data: { proposedFields: {}, amountCandidates: [] } });
  await tx.economicAiAttempt.updateMany({ where: { jobId: { in: ids(economicJobs) } }, data: { response: Prisma.DbNull } });
  await tx.documentIntakeAnalysis.deleteMany({ where: { itemId: { in: ids(items) } } });
  await tx.documentIntakeItem.updateMany({ where: source, data: { filename: 'documento-eliminato', proposal: Prisma.DbNull, selection: Prisma.DbNull, uploadError: null } });
  await tx.documentOrganization.deleteMany({ where: source });
  await tx.uploadRequest.deleteMany({ where: source });
  await tx.contactResourceLink.deleteMany({ where: { resourceKind: 'document', resourceId: id } });
  // Replayed responses could echo extracted content.
  const targets = [id, ...ids(onboardingDrafts), ...ids(onboardingJobs), ...ids(receiptDrafts), ...ids(receiptJobs), ...ids(economicDrafts), ...ids(economicJobs), ...ids(items)];
  // Replays of these keys answer 410 source_deleted (rejectDeletedReplay); digests stay for idempotency.
  const replayed = { where: { homeId: h, target: { in: targets } }, data: { response: SOURCE_DELETED } };
  await tx.objectOnboardingRequest.updateMany(replayed);
  await tx.economicRequest.updateMany(replayed);
  await tx.objectRequest.updateMany(replayed);
  await tx.trashRequest.updateMany({ where: { homeId: h, target: id }, data: { response: SOURCE_DELETED } });
  // Intake ledgers: only this document's entries lose file name and review bodies; other files of the batch stay.
  const clientIds = new Set(items.map(i => i.clientItemId)), itemOps = new Set(items.flatMap(i => ['review:' + i.id, 'duplicate:' + i.id]));
  const intake = items.length ? await tx.documentIntakeRequest.findMany({ where: { batchId: { in: [...new Set(items.map(i => i.batchId))] } }, select: { id: true, operation: true, body: true } }) : [];
  for (const row of intake) {
    if (itemOps.has(row.operation)) { await tx.documentIntakeRequest.update({ where: { id: row.id }, data: { body: SOURCE_DELETED } }); continue; }
    const body = row.body as { items?: Array<Record<string, unknown>> } | null;
    if (!Array.isArray(body?.items) || !body.items.some(item => clientIds.has(item.clientItemId as string))) continue;
    const next = { ...body, items: body.items.map(item => clientIds.has(item.clientItemId as string) ? { ...item, filename: 'documento-eliminato' } : item) };
    await tx.documentIntakeRequest.update({ where: { id: row.id }, data: { body: next as Prisma.InputJsonValue } });
  }
  // Share manifests keep ids and hashes for audit, not the name. Share rows were locked before the Document.
  for (const table of ['shareRecord', 'sharePreview'] as const) {
    const rows: Array<{ id: string; manifest: Prisma.JsonValue }> = table === 'shareRecord'
      ? await tx.shareRecord.findMany({ where: { id: { in: shareIds } }, select: { id: true, manifest: true } })
      : await tx.sharePreview.findMany({ where: { homeId: h, manifest: inManifest(id) }, select: { id: true, manifest: true } });
    for (const row of rows) {
      const manifest = row.manifest as { items: Array<Record<string, unknown>> };
      const next = { ...manifest, items: manifest.items.map(item => item.documentId === id ? { ...item, name: '' } : item) } as Prisma.InputJsonValue;
      if (table === 'shareRecord') await tx.shareRecord.update({ where: { id: row.id }, data: { manifest: next } });
      else await tx.sharePreview.update({ where: { id: row.id }, data: { manifest: next } });
    }
  }
  const storageKey = doc.original?.file.storageKey ?? null;
  if (doc.original) { await tx.documentVersion.delete({ where: { documentId: id } }); await tx.storedFile.delete({ where: { id: doc.original.fileId } }); }
  await tx.document.update({ where: { id }, data: { name: '', purgedAt: now, lifecycleVersion: { increment: 1 } } });
  await tx.deletionRecord.create({ data: { homeId: h, resourceKind: 'document', resourceId: id, reason, storageKey, deletedAt: now, fileRemovedAt: storageKey ? null : now } });
  return { storageKey };
}
