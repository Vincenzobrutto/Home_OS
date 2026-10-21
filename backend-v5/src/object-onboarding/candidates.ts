import { Prisma } from '../../generated/client';
import { digest } from '../security';
import { object, uuid, text, invalid } from '../review/domain';
import { readableReceiptName } from '../receipt-assistance/access';
import { ObjectOnboardingAccess, objectProfileView, onboardingDenied } from './access';
import { proposedProfile } from './profile';
import type { ProductExtraction } from './domain';

function pageQuery(input: unknown, withItem: boolean, optionalItem=false) {
  const q = object(input, ['limit', 'cursor', 'q', ...(withItem||optionalItem ? ['itemId'] : [])]);
  if (q.limit !== undefined && (typeof q.limit !== 'string' || !/^(?:[1-9]|[1-4][0-9]|50)$/u.test(q.limit))) throw invalid();
  if (q.cursor !== undefined && (typeof q.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/u.test(q.cursor))) throw invalid();
  return { limit: Number(q.limit ?? 10), cursor: q.cursor as string | undefined, q: q.q === undefined ? '' : text(q.q, 80), itemId: withItem||optionalItem&&q.itemId!==undefined ? text(q.itemId, 80) : null };
}
function pagination(binding: string, cursor?: string) {
  let after: { id: string; rank: number } | null = null;
  if (cursor) {
    try {
      const r = object(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')), ['b', 'id', 'rank']);
      if (r.b !== binding || !Number.isInteger(r.rank) || Number(r.rank) < 0 || Number(r.rank) > 4) throw invalid();
      after = { id: uuid(r.id), rank: Number(r.rank) };
    } catch { throw invalid('Pagina non valida.'); }
  }
  return { after, encode: (last: { id: string; rank: number }) => Buffer.from(JSON.stringify({ b: binding, ...last })).toString('base64url') };
}
const norm = (value: string | undefined) => value?.normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('it') ?? null;
function readableProfileReference(a: string, h: string) {
  return Prisma.sql`(o.profile->'reference'->>'origin'='user_declared' OR (
    jsonb_array_length(COALESCE(o.profile->'reference'->'sources','[]'::jsonb))>0 AND NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(o.profile->'reference'->'sources') s
      LEFT JOIN "Document" d ON d.id=s->>'documentId' LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
      WHERE d.id IS NULL OR d."homeId"<>${h} OR (d.visibility::text<>'home' AND d."uploaderId"<>${a})
        OR v.id IS NULL OR NOT COALESCE(v.sha256=s->>'sha256',FALSE) OR NOT COALESCE(v.version::text=s->>'documentVersion',FALSE))))`;
}
export function onboardingCandidates(access: ObjectOnboardingAccess, a: string, h: string, id: string, query: unknown) {
  const q = pageQuery(query, true);
  return access.run(a, h, false, async tx => {
    const draft = await access.draft(tx, a, h, id);
    if (!await access.source(tx, a, h, draft.documentId, draft)) throw onboardingDenied();
    const item = (draft.output as unknown as ProductExtraction).items.find(item => item.id === q.itemId); if (!item) throw invalid();
    const profile=proposedProfile(item);
    const brand = norm(profile.brand?.value), model = norm(profile.model?.value), reference = norm(item.fields.reference?.value), name = item.nameTruncated ? null : norm(item.fields.name?.value);
    const p = pagination(digest(JSON.stringify([a, h, id, draft.version, q.itemId, q.q])), q.cursor), escaped = q.q.replace(/[\\%_]/gu, '\\$&');
    const rows = await tx.$queryRaw<Array<{ id: string; rank: number }>>(Prisma.sql`
      WITH fields AS (SELECT f.* FROM "ReceiptObjectField" f WHERE f."accountId"=${a} AND f."homeId"=${h} AND f."fieldKey" IN ('brand','model') AND
        (f.origin='user_declared' OR EXISTS(SELECT 1 FROM "Document" d JOIN "DocumentVersion" v ON v."documentId"=d.id WHERE d.id=f."documentId" AND d."homeId"=${h} AND (d.visibility::text='home' OR d."uploaderId"=${a}) AND v.version=f."documentVersion" AND v.sha256=f."documentSha256"))),
      candidates AS (SELECT o.id,CASE
        WHEN EXISTS(SELECT 1 FROM "ObjectOnboardingBinding" l WHERE l."accountId"=${a} AND l."homeId"=${h} AND l."objectId"=o.id AND l.fingerprint=${item.fingerprint}) THEN 4
        WHEN ${brand}::text IS NOT NULL AND lower(normalize(b.value,NFC))=${brand} AND ${reference}::text IS NOT NULL AND lower(normalize(o.profile->'reference'->>'value',NFC))=${reference} AND ${readableProfileReference(a, h)} THEN 3
        WHEN ${brand}::text IS NOT NULL AND ${model}::text IS NOT NULL AND lower(normalize(b.value,NFC))=${brand} AND lower(normalize(m.value,NFC))=${model} THEN 2
        WHEN ${name}::text IS NOT NULL AND lower(normalize(o.name,NFC))=${name} AND (${brand}::text IS NULL OR b.value IS NULL OR lower(normalize(b.value,NFC))=${brand}) AND (${model}::text IS NULL OR m.value IS NULL OR lower(normalize(m.value,NFC))=${model}) THEN 1 ELSE 0 END AS rank
      FROM "HomeObject" o LEFT JOIN fields b ON b."objectId"=o.id AND b."fieldKey"='brand' LEFT JOIN fields m ON m."objectId"=o.id AND m."fieldKey"='model'
      WHERE o."accountId"=${a} AND o."homeId"=${h} AND o.state='active' AND ${readableReceiptName(a, h)} AND ${escaped ? Prisma.sql`o.name ILIKE ${'%' + escaped + '%'}` : Prisma.sql`TRUE`})
      SELECT * FROM candidates WHERE ${p.after ? Prisma.sql`(rank<${p.after.rank} OR (rank=${p.after.rank} AND id>${p.after.id}))` : Prisma.sql`TRUE`} ORDER BY rank DESC,id ASC LIMIT ${q.limit + 1}`);
    const page = rows.slice(0, q.limit);
    const items = await Promise.all(page.map(async row => {
      const target = await access.target(tx, a, h, row.id), profile = await objectProfileView(tx, a, h, target.id, target.profile);
      const position = await tx.objectPosition.findUnique({ where: { objectId: target.id } });
      const rooms = position ? await tx.homeRoom.findMany({ where: { homeId: h, id: { in: position.roomIds as string[] } }, select: { name: true } }) : [];
      return { id: target.id, name: target.name, version: target.version, profile, rooms: rooms.map(r => r.name), manual: target.manual, reason: ['manual_selection', 'same_complete_name', 'same_brand_model', 'same_brand_reference', 'confirmed_item'][row.rank] };
    }));
    const expenseLinks = await tx.homeExpense.count({ where: { accountId: a, homeId: h, documentId: draft.documentId } });
    return { items, nextCursor: rows.length > q.limit ? p.encode(page.at(-1)!) : null, hasLinkedExpenses: expenseLinks > 0 };
  });
}
export function onboardingExpenseCandidates(access: ObjectOnboardingAccess, a: string, h: string, id: string, query: unknown) {
  const q = pageQuery(query, false,true);
  return access.run(a, h, false, async tx => {
    const draft = await access.draft(tx, a, h, id); if (!await access.source(tx, a, h, draft.documentId, draft)) throw onboardingDenied();
    const output = draft.output as unknown as ProductExtraction;
    const bill=q.itemId?output.houseExpenses?.find(x=>x.id===q.itemId):null,product=q.itemId?output.items.find(x=>x.id===q.itemId):null;if(q.itemId&&!bill&&!product)throw invalid();
    const purchaseDate = bill?bill.proposedFields.documentDate?.value??null:product?.fields.purchaseDate?.value??(output.items.length === 1 ? output.items[0].fields.purchaseDate?.value ?? null : null);
    const amount = bill?bill.amountCandidates.find(x=>x.role==='current_document_total')?.amountCents??null:product?.purchaseAmount?.amountCents??(output.items.length===1?output.purchaseTotal?.amountCents:null)??null;
    const billNumber=bill?.proposedFields.documentNumber?.value??null,billSupplier=bill?.proposedFields.supplier?.value??null;
    const p = pagination(digest(JSON.stringify([a, h, id, 'expenses', q.itemId,q.q])), q.cursor), escaped = q.q.replace(/[\\%_]/gu, '\\$&');
    const rows = await tx.$queryRaw<Array<{ id: string; rank: number; title: string; amountCents: number; spentOn: string; version: number }>>(Prisma.sql`
      WITH candidates AS (SELECT e.id,e.title,e."amountCents",e."spentOn",e.version,CASE WHEN v.sha256=${draft.documentSha256} THEN 2 WHEN ${billNumber}::text IS NOT NULL AND ${billSupplier}::text IS NOT NULL AND e."documentNumber"=${billNumber} AND lower(e.supplier)=lower(${billSupplier}::text) THEN 1 WHEN ${amount}::int IS NOT NULL AND e."amountCents"=${amount} AND e."spentOn"=${purchaseDate}::text THEN 1 ELSE 0 END AS rank FROM "HomeExpense" e LEFT JOIN "Document" d ON d.id=e."documentId" LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
      WHERE e."accountId"=${a} AND e."homeId"=${h} AND e.state='active' AND ${bill?Prisma.sql`e."workId" IS NULL`:Prisma.sql`TRUE`} AND (e."documentId" IS NULL OR (d."homeId"=${h} AND (d.visibility::text='home' OR d."uploaderId"=${a}))) AND ${escaped ? Prisma.sql`e.title ILIKE ${'%' + escaped + '%'}` : Prisma.sql`TRUE`})
      SELECT * FROM candidates WHERE ${p.after ? Prisma.sql`(rank<${p.after.rank} OR (rank=${p.after.rank} AND id>${p.after.id}))` : Prisma.sql`TRUE`} ORDER BY rank DESC,id ASC LIMIT ${q.limit + 1}`);
    const items = rows.slice(0, q.limit);
    return { items, nextCursor: rows.length > q.limit ? p.encode(items.at(-1)!) : null };
  });
}
