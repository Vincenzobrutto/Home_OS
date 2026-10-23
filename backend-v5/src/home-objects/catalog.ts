import { Prisma } from '../../generated/client';
import { readableReceiptName } from '../receipt-assistance/access';
import { objectsQuery } from './domain';

/** Search must use the same source authorization as objectProfileView, before LIMIT. */
function profileText(a:string,h:string,key:'brand'|'model'):Prisma.Sql {
 const field=Prisma.sql`o.profile->${key}`;
 const sources=Prisma.sql`CASE WHEN jsonb_typeof(${field}->'sources')='array' THEN ${field}->'sources' ELSE '[]'::jsonb END`;
 return Prisma.sql`CASE WHEN o.profile ? ${key} THEN CASE WHEN ${field}->>'origin'='user_declared' OR
   (jsonb_array_length(${sources})>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(${sources}) s
    LEFT JOIN "Document" d ON d.id=s->>'documentId' LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
    WHERE d.id IS NULL OR d."homeId"<>${h} OR (d."trashedAt" IS NOT NULL OR (d.visibility::text<>'home' AND d."uploaderId"<>${a}))
     OR v.id IS NULL OR NOT COALESCE(v.version::text=s->>'documentVersion',FALSE) OR NOT COALESCE(v.sha256=s->>'sha256',FALSE)))
   THEN ${field}->>'value' ELSE NULL END
  ELSE (SELECT f.value FROM "ReceiptObjectField" f WHERE f."objectId"=o.id AND f."accountId"=${a} AND f."homeId"=${h} AND f."fieldKey"=${key}
   AND (f.origin='user_declared' OR EXISTS(SELECT 1 FROM "Document" d JOIN "DocumentVersion" v ON v."documentId"=d.id
    WHERE d.id=f."documentId" AND d."homeId"=${h} AND (d."trashedAt" IS NULL AND (d.visibility::text='home' OR d."uploaderId"=${a})) AND v.version=f."documentVersion" AND v.sha256=f."documentSha256"))) END`;
}
export function catalogBase(a:string,h:string,q:ReturnType<typeof objectsQuery>):Prisma.Sql {
 const escaped=q.q?.replace(/[\\%_]/g,'\\$&');
 return Prisma.sql`WITH authorized AS (
  SELECT o.id,'object'::text AS kind,o.name,o.type,o.state,o."createdAt",${profileText(a,h,'brand')} AS brand,${profileText(a,h,'model')} AS model
   FROM "HomeObject" o WHERE o."accountId"=${a} AND o."homeId"=${h} AND ${readableReceiptName(a,h)}
  UNION ALL
  SELECT o.id,'boiler'::text,o.name,'boiler'::text,'active'::text,o."createdAt",o.confirmed->'brand'->>'value',o.confirmed->'model'->>'value'
   FROM "BoilerAsset" o WHERE o."accountId"=${a} AND o."homeId"=${h}
   AND NOT EXISTS(SELECT 1 FROM "AnalysisJob" j CROSS JOIN LATERAL jsonb_array_elements(j.documents) s
    LEFT JOIN "Document" d ON d.id=s->>'documentId' LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
    WHERE j."assetId"=o.id AND j.state='succeeded' AND (d.id IS NULL OR d."homeId"<>${h} OR (d."trashedAt" IS NOT NULL OR (d.visibility::text<>'home' AND d."uploaderId"<>${a}))
     OR v.id IS NULL OR NOT COALESCE(v.version::text=s->>'documentVersion',FALSE) OR NOT COALESCE(v.sha256=s->>'documentSha256',FALSE)))
 ), filtered AS (
  SELECT x.*,lower(normalize(x.name,NFC) COLLATE "und-x-icu") AS "sortName",COALESCE(p."roomIds",'[]'::jsonb) AS "roomIds"
  FROM authorized x LEFT JOIN "ObjectPosition" p ON p."accountId"=${a} AND p."homeId"=${h}
   AND ((x.kind='object' AND p."objectId"=x.id) OR (x.kind='boiler' AND p."boilerId"=x.id))
  WHERE ${q.state==='all'?Prisma.sql`TRUE`:Prisma.sql`x.state=${q.state}`}
   AND ${q.type?Prisma.sql`x.type=${q.type}`:Prisma.sql`TRUE`}
   AND ${escaped?Prisma.sql`(normalize(x.name,NFC) COLLATE "und-x-icu" ILIKE ${'%'+escaped+'%'} OR normalize(x.brand,NFC) COLLATE "und-x-icu" ILIKE ${'%'+escaped+'%'} OR normalize(x.model,NFC) COLLATE "und-x-icu" ILIKE ${'%'+escaped+'%'})`:Prisma.sql`TRUE`}
 )`;
}
export function catalogPlacement(q:ReturnType<typeof objectsQuery>):Prisma.Sql {
 return Prisma.sql`${q.roomId?Prisma.sql`x."roomIds" @> ${JSON.stringify([q.roomId])}::jsonb`:Prisma.sql`TRUE`}
  AND ${q.placement==='unplaced'?Prisma.sql`jsonb_array_length(x."roomIds")=0`:Prisma.sql`TRUE`}`;
}
