import { ForbiddenException } from '@nestjs/common';
import { Prisma, type DocumentOrganization } from '../../generated/client';
import { canReadDocument } from '../documents/access';
import { readableReceiptObjectIds } from '../receipt-assistance/access';
import { conflict } from '../review/domain';
import type { OrganizationSelection } from './domain';
type Tx = Prisma.TransactionClient;
export const sameParts = (left: unknown, right: unknown) => {
  const canonical = (parts: unknown) => JSON.stringify(Array.isArray(parts) ? parts.map(p => { const row = p as Record<string, unknown>; return [row.kind, row.pageFrom, row.pageTo]; }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : null);
  return canonical(left) === canonical(right);
};
export const organizationView = (row: DocumentOrganization) => ({ version: row.version, title: row.title, parts: row.parts, collections: row.collections, houseFamily:row.houseFamily, documentVersion:row.documentVersion, documentSha256:row.documentSha256, origin: 'user_declared' as const, updatedAt: row.updatedAt.toISOString() });
export async function currentOrganization(tx: Tx, a: string, h: string, doc: { id: string; original: { version: number; sha256: string } | null }) {
  const row = await tx.documentOrganization.findUnique({ where: { accountId_homeId_documentId: { accountId: a, homeId: h, documentId: doc.id } } });
  return row && row.documentVersion === doc.original?.version && row.documentSha256 === doc.original.sha256 ? row : null;
}
export async function intakeTarget(tx: Tx, a: string, h: string, selection: OrganizationSelection, checkVersion = true) {
  if (selection.action === 'defer' || selection.target.kind === 'home') return;
  const target = selection.target;
  if (target.kind === 'object') {
    await tx.$queryRaw`SELECT id FROM "HomeObject" WHERE id=${target.id} FOR SHARE`;
    const row = await tx.homeObject.findFirst({ where: { id: target.id, accountId: a, homeId: h, state: 'active' } });
    if (!row || !(await readableReceiptObjectIds(tx, a, h, [target.id])).has(target.id)) throw new ForbiddenException();
    // Lock name source proofs too, so a source visibility change cannot race publication.
    const fields = await tx.receiptObjectField.findMany({ where: { objectId: target.id, fieldKey: 'name', origin: 'extraction_confirmed' } });
    for (const field of fields) {
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${field.documentId} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${field.documentId} FOR SHARE`;
    }
    if (!(await readableReceiptObjectIds(tx, a, h, [target.id])).has(target.id)) throw new ForbiddenException();
    if (checkVersion && row.version !== target.expectedVersion) throw conflict('target_version_conflict', 'La scheda è cambiata. Rileggi prima di confermare.');
  } else {
    await tx.$queryRaw`SELECT id FROM "BoilerAsset" WHERE id=${target.id} FOR SHARE`;
    const row = await tx.boilerAsset.findFirst({ where: { id: target.id, accountId: a, homeId: h } });
    if (!row) throw new ForbiddenException();
    const jobs = await tx.analysisJob.findMany({ where: { assetId: target.id, state: 'succeeded' } });
    for (const job of jobs) {
      if (!Array.isArray(job.documents)) throw new ForbiddenException();
      for (const raw of job.documents) {
        const proof = raw as { documentId: string; documentVersion: number; documentSha256: string };
        await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${proof.documentId} FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${proof.documentId} FOR SHARE`;
        const doc = await tx.document.findUnique({ where: { id: proof.documentId }, include: { original: true } });
        if (!doc || doc.homeId !== h || !canReadDocument(doc, a) || doc.original?.version !== proof.documentVersion || doc.original?.sha256 !== proof.documentSha256) throw new ForbiddenException();
      }
    }
    if (checkVersion && row.version !== target.expectedVersion) throw conflict('target_version_conflict', 'La scheda è cambiata. Rileggi prima di confermare.');
  }
}
