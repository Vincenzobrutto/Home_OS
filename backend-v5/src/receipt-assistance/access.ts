import { Prisma } from '../../generated/client';
import { canSeeConfirmedSource, confirmedSourceVisible } from '../documents/access';

/** Correlated predicate for HomeObject alias o. Apply before search and LIMIT. */
export function readableReceiptName(a: string, h: string): Prisma.Sql {
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM "ReceiptObjectField" f
    LEFT JOIN "Document" d ON d.id=f."documentId"
    LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
    WHERE f."objectId"=o.id AND f."fieldKey"='name' AND f.origin='extraction_confirmed'
      AND (f."accountId"<>${a} OR f."homeId"<>${h} OR d.id IS NULL OR d."homeId"<>${h}
        OR NOT ${confirmedSourceVisible(a)}
        OR (d."trashedAt" IS NULL AND (v.id IS NULL OR NOT COALESCE(v.version=f."documentVersion",FALSE)
        OR NOT COALESCE(v.sha256=f."documentSha256",FALSE)))))`;
}

/** Caller already checks membership; this adds source proof for generic object names. */
export async function readableReceiptObjectIds(tx: Prisma.TransactionClient, a: string, h: string, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT o.id FROM "HomeObject" o WHERE o."accountId"=${a} AND o."homeId"=${h}
      AND o.id IN (${Prisma.join(ids)}) AND ${readableReceiptName(a, h)}`);
  return new Set(rows.map(row => row.id));
}

export type ReceiptSourceProof = { documentId: string | null; documentVersion: number | null; documentSha256: string | null };
export const receiptProofKey = (proof: ReceiptSourceProof) => JSON.stringify([proof.documentId, proof.documentVersion, proof.documentSha256]);
/** Checks captured proofs, rather than current field rows which may have been edited. */
export async function readableReceiptProofKeys(tx: Prisma.TransactionClient, a: string, h: string, proofs: ReceiptSourceProof[], accountRows?: (rows: unknown[]) => void) {
  if (!proofs.length) return new Set<string>();
  const ids = [...new Set(proofs.flatMap(proof => proof.documentId ? [proof.documentId] : []))];
  const rows = await tx.document.findMany({ where: { id: { in: ids }, homeId: h }, select: { id: true, uploaderId: true, visibility: true, trashedAt: true, original: { select: { version: true, sha256: true } } } });
  accountRows?.(rows);
  const docs = new Map(rows.map(row => [row.id, row]));
  return new Set(proofs.flatMap(proof => {
    const doc = proof.documentId ? docs.get(proof.documentId) : undefined;
    return doc && canSeeConfirmedSource(doc, a) && (doc.trashedAt || doc.original && doc.original.version === proof.documentVersion && doc.original.sha256 === proof.documentSha256) ? [receiptProofKey(proof)] : [];
  }));
}
export async function readableReceiptProofs(tx: Prisma.TransactionClient, a: string, h: string, proofs: ReceiptSourceProof[]) {
  const readable = await readableReceiptProofKeys(tx, a, h, proofs);
  return proofs.every(proof => readable.has(receiptProofKey(proof)));
}
