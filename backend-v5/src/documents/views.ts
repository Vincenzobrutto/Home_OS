import {ARCHIVE_FAMILIES,archiveFamilySql} from './families';
import {Prisma} from '../../generated/client';
import {catalogBase} from '../home-objects/catalog';
import {objectsQuery} from '../home-objects/domain';
import {literalPattern,type Filters} from './search';
export const DOCUMENT_GROUPS=['plans','building','energy','contracts','other'] as const;
/** Catalog source policy also applies to document references, before filtering or counting. */
export function documentViewBase(a:string,h:string,f:Filters,w:{state:Prisma.Sql;completed:Prisma.Sql;analysisSucceeded:Prisma.Sql}){
 const linked=Prisma.sql`(EXISTS(SELECT 1 FROM "ObjectResourceLink" l JOIN authorized subject ON
   (subject.kind='object' AND subject.id=l."objectId") OR (subject.kind='boiler' AND subject.id=l."boilerId")
   WHERE l."accountId"=${a} AND l."homeId"=${h} AND l.state='active' AND
    ((l."resourceType"='document' AND l."documentId"=d.id) OR (l."resourceType"='expense' AND EXISTS(
      SELECT 1 FROM "HomeExpense" e WHERE e.id=l."expenseId" AND e."documentId"=d.id AND e."accountId"=${a} AND e."homeId"=${h} AND e.state='active'))))
   OR EXISTS(SELECT 1 FROM "HomeExpense" e JOIN authorized subject ON subject.kind='boiler' AND subject.id=e."assetId"
     WHERE e."documentId"=d.id AND e."accountId"=${a} AND e."homeId"=${h} AND e.state='active')
   OR EXISTS(SELECT 1 FROM "AnalysisJob" j JOIN authorized subject ON subject.kind='boiler' AND subject.id=j."assetId"
     CROSS JOIN LATERAL jsonb_array_elements(j.documents) proof WHERE j.state='succeeded' AND proof->>'documentId'=d.id
       AND proof->>'documentVersion'=v.version::text AND proof->>'documentSha256'=v.sha256))`;
 const group=Prisma.sql`COALESCE(CASE WHEN o."houseFamily" IN ('plans','building','energy','contracts','other') THEN o."houseFamily" ELSE NULL END,CASE WHEN o.parts @> '[{"kind":"floor_plan"}]'::jsonb THEN 'plans'
   WHEN 'building'=ANY(o.collections) THEN 'building' WHEN 'energy'=ANY(o.collections) THEN 'energy'
   WHEN 'contracts'=ANY(o.collections) THEN 'contracts' ELSE 'other' END)`;
 const mime={pdf:'application/pdf',jpeg:'image/jpeg',png:'image/png'};
 return Prisma.sql`${catalogBase(a,h,objectsQuery({state:'all'}))}, searched_documents AS (
   SELECT d.id,d."createdAt",${w.state} AS "workflowState",${w.analysisSucceeded} AS "aiAnalysisSucceeded",
     o.id IS NOT NULL AS organized,COALESCE(o."houseDocument",false) AS "houseDocument",${linked} AS linked,${f.view==='archive'?archiveFamilySql():group} AS "groupKey"
   FROM "Document" d LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
   LEFT JOIN "DocumentOrganization" o ON o."documentId"=d.id AND o."accountId"=${a} AND o."homeId"=${h} AND o."documentVersion"=v.version AND o."documentSha256"=v.sha256
   WHERE d."homeId"=${h} AND (d.visibility='home' OR d."uploaderId"=${a})
   ${f.workflow==='all'?Prisma.empty:['pending','completed'].includes(f.workflow)?Prisma.sql`AND ${w.completed}=${f.workflow==='completed'}`:Prisma.sql`AND ${w.state}=${f.workflow}`}
   ${f.visibility==='all'?Prisma.empty:Prisma.sql`AND d.visibility::text=${f.visibility}`}
   ${f.format==='all'?Prisma.empty:Prisma.sql`AND v."mimeType"=${mime[f.format as keyof typeof mime]}`}
   ${f.collection==='all'?Prisma.empty:f.collection==='house'?Prisma.sql`AND o.collections && ARRAY['building','energy','technical','contracts']::text[]`:f.collection==='floor_plans'?Prisma.sql`AND o.parts @> '[{"kind":"floor_plan"}]'::jsonb`:f.collection==='unclassified'?Prisma.sql`AND (o.id IS NULL OR ${f.collection}=ANY(o.collections))`:Prisma.sql`AND ${f.collection}=ANY(o.collections)`}
   ${!f.q?Prisma.empty:Prisma.sql`AND (normalize(COALESCE(o.title,d.name),NFC) COLLATE "und-x-icu" ILIKE ${literalPattern(f.q)} ESCAPE '\\' OR normalize(v."originalFilename",NFC) COLLATE "und-x-icu" ILIKE ${literalPattern(f.q)} ESCAPE '\\')`}
 ${f.related==='house'?Prisma.sql`AND o.id IS NOT NULL AND (COALESCE(o."houseDocument",false) OR NOT ${linked})`:f.related==='objects'?Prisma.sql`AND ${linked}`:Prisma.empty}
 )`;
}
export function documentViewWhere(f:Filters){return Prisma.sql`${f.view==='house'?Prisma.sql`s.organized AND (s."houseDocument" OR NOT s.linked)`:f.view==='objects'?Prisma.sql`s.linked`:Prisma.sql`TRUE`}
 ${f.group?Prisma.sql`AND s."groupKey"=${f.group}`:f.view==='house'?Prisma.sql`AND FALSE`:Prisma.empty}`;}
export async function documentViewSummary(tx:Prisma.TransactionClient,base:Prisma.Sql,archive=false){
 const groups=archive?ARCHIVE_FAMILIES:DOCUMENT_GROUPS;
 const [row]=await tx.$queryRaw<Array<Record<string,bigint>>>(Prisma.sql`${base} SELECT COUNT(*) AS "all",
 COUNT(*) FILTER(WHERE organized AND ("houseDocument" OR NOT linked)) AS house,COUNT(*) FILTER(WHERE linked) AS objects,
 ${Prisma.join(groups.map(group=>Prisma.sql`COUNT(*) FILTER(WHERE ${archive?Prisma.sql`TRUE`:Prisma.sql`organized AND ("houseDocument" OR NOT linked)`} AND "groupKey"=${group}) AS ${Prisma.raw('"'+group+'"')}`))}
 FROM searched_documents`);
 return {views:{all:Number(row.all),house:Number(row.house),objects:Number(row.objects)},groups:Object.fromEntries(groups.map(group=>[group,Number(row[group])]))};
}
