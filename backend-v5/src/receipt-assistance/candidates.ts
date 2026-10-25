import { Prisma, type ReceiptDraft } from '../../generated/client';
import { confirmedSourceVisible } from '../documents/access';
import { digest } from '../security';
import { invalid, object, uuid } from '../review/domain';
import { readableReceiptName } from './access';

export type CandidateKind = 'object' | 'expense';
export type CandidateAnchor = { id: string; rank: number };
export const equivalentReceiptDocuments = (a: string, h: string, draft: Pick<ReceiptDraft, 'documentSha256'>) => Prisma.sql`
  SELECT d.id FROM "Document" d JOIN "DocumentVersion" v ON v."documentId"=d.id
  WHERE d."homeId"=${h} AND (d."trashedAt" IS NULL AND (d.visibility::text='home' OR d."uploaderId"=${a})) AND v.sha256=${draft.documentSha256}`;

export function candidateQuery(input: unknown) {
  const q = object(input, ['limit', 'cursor']);
  if (q.limit !== undefined && (typeof q.limit !== 'string' || !/^(?:[1-9]|[1-4][0-9]|50)$/.test(q.limit))) throw invalid();
  if (q.cursor !== undefined && (typeof q.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(q.cursor))) throw invalid();
  return { limit: Number(q.limit ?? 20), cursor: q.cursor as string | undefined };
}
export function candidatePagination(a: string, h: string, kind: CandidateKind, draft: ReceiptDraft, cursor?: string) {
  const binding = digest(JSON.stringify([a, h, kind, draft.id, draft.version, draft.documentVersion, draft.documentSha256]));
  let anchor: CandidateAnchor | null = null;
  if (cursor) {
    try {
      const row = object(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')), ['b', 'id', 'rank']);
      if (row.b !== binding || !Number.isInteger(row.rank) || Number(row.rank) < 0 || Number(row.rank) > 3) throw invalid();
      anchor = { id: uuid(row.id), rank: Number(row.rank) };
    } catch { throw invalid('Pagina non valida.'); }
  }
  return { anchor, encode: (row: CandidateAnchor) => Buffer.from(JSON.stringify({ b: binding, ...row })).toString('base64url') };
}
const readableField = (a: string, h: string) => Prisma.sql`(f.origin='user_declared' OR EXISTS (
  SELECT 1 FROM "Document" d LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
  WHERE f.origin='extraction_confirmed' AND d.id=f."documentId" AND d."homeId"=${h}
    AND ${confirmedSourceVisible(a)} AND (d."trashedAt" IS NOT NULL OR (v.version=f."documentVersion" AND v.sha256=f."documentSha256"))))`;
const normalize = (value: unknown) => typeof value === 'string' ? value.normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('it') : null;
export function objectCandidatesSql(a: string, h: string, draft: ReceiptDraft, limit: number, anchor: CandidateAnchor | null, countOnly = false) {
  const fields = draft.fields as Record<string, { value?: string }>;
  const brand = normalize(fields.brand?.value), model = normalize(fields.model?.value);
  return Prisma.sql`WITH fields AS (
    SELECT f.* FROM "ReceiptObjectField" f WHERE f."accountId"=${a} AND f."homeId"=${h} AND ${readableField(a, h)}
  ), linked AS (
    SELECT l."objectId",l."documentId" FROM "ObjectResourceLink" l WHERE l."accountId"=${a} AND l."homeId"=${h} AND l.state='active' AND l."resourceType"='document'
    UNION ALL
    SELECT l."objectId",e."documentId" FROM "ObjectResourceLink" l JOIN "HomeExpense" e ON e.id=l."expenseId"
      WHERE l."accountId"=${a} AND l."homeId"=${h} AND l.state='active' AND e."accountId"=${a} AND e."homeId"=${h}
  ), candidates AS (
    SELECT o.id,CASE
      WHEN EXISTS(SELECT 1 FROM linked l WHERE l."objectId"=o.id AND l."documentId"=${draft.documentId}) THEN 3
      WHEN EXISTS(SELECT 1 FROM linked l WHERE l."objectId"=o.id AND l."documentId" IN (${equivalentReceiptDocuments(a, h, draft)})) THEN 2
      WHEN ${brand}::text IS NOT NULL AND ${model}::text IS NOT NULL
        AND lower(normalize(btrim(regexp_replace(b.value,'[[:space:]]+',' ','g')),NFC))=${brand}
        AND lower(normalize(btrim(regexp_replace(m.value,'[[:space:]]+',' ','g')),NFC))=${model} THEN 1 ELSE 0 END AS rank
    FROM "HomeObject" o LEFT JOIN fields b ON b."objectId"=o.id AND b."fieldKey"='brand'
      LEFT JOIN fields m ON m."objectId"=o.id AND m."fieldKey"='model'
    WHERE o."accountId"=${a} AND o."homeId"=${h} AND o.state='active' AND ${readableReceiptName(a, h)}
  ) ${countOnly ? Prisma.sql`SELECT COUNT(*)::text AS "linkedCount" FROM candidates WHERE rank>=2` : Prisma.sql`SELECT id,rank FROM candidates WHERE ${anchor ? Prisma.sql`(rank<${anchor.rank} OR (rank=${anchor.rank} AND id>${anchor.id}))` : Prisma.sql`TRUE`}
    ORDER BY rank DESC,id ASC LIMIT ${limit + 1}`}`;
}
export function expenseCandidatesSql(a: string, h: string, draft: ReceiptDraft, limit: number, anchor: CandidateAnchor | null, countOnly = false) {
  return Prisma.sql`WITH candidates AS (
    SELECT e.id,CASE WHEN e."documentId"=${draft.documentId} THEN 3 WHEN e."documentId" IS NOT NULL THEN 2 ELSE 0 END AS rank
    FROM "HomeExpense" e WHERE e."accountId"=${a} AND e."homeId"=${h} AND e.state='active'
      AND (e."documentId" IS NULL OR e."documentId" IN (${equivalentReceiptDocuments(a, h, draft)}))
  ) ${countOnly ? Prisma.sql`SELECT COUNT(*)::text AS "linkedCount" FROM candidates WHERE rank>=2` : Prisma.sql`SELECT id,rank FROM candidates WHERE ${anchor ? Prisma.sql`(rank<${anchor.rank} OR (rank=${anchor.rank} AND id>${anchor.id}))` : Prisma.sql`TRUE`}
    ORDER BY rank DESC,id ASC LIMIT ${limit + 1}`}`;
}
