import {Prisma} from '../../generated/client';
import {catalogBase} from '../home-objects/catalog';
import {objectsQuery} from '../home-objects/domain';

/** Read-only, personal context for this page. Reuses the catalogue's source policy. */
export async function documentRowContexts(tx:Prisma.TransactionClient,a:string,h:string,ids:string[]){
 const result=new Map(ids.map(id=>[id,{linkedObjects:[] as Array<{id:string;kind:string;name:string}>,savedExpenses:[] as Array<{id:string;title:string;amountCents:number;supplier:string|null;documentNumber:string|null;documentDate:string|null}>}]));
 if(!ids.length)return result;
 const refs=await tx.$queryRaw<Array<{documentId:string;id:string;kind:string;name:string}>>(Prisma.sql`${catalogBase(a,h,objectsQuery({state:'all'}))}, refs AS (
  SELECT l."documentId",s.id,s.kind,s.name FROM "ObjectResourceLink" l JOIN authorized s ON (s.kind='object' AND s.id=l."objectId") OR (s.kind='boiler' AND s.id=l."boilerId")
   WHERE l."accountId"=${a} AND l."homeId"=${h} AND l.state='active' AND l."resourceType"='document'
  UNION
  SELECT e."documentId",s.id,s.kind,s.name FROM "HomeExpense" e JOIN "ObjectResourceLink" l ON l."expenseId"=e.id AND l."resourceType"='expense' AND l.state='active' AND l."accountId"=${a} AND l."homeId"=${h}
   JOIN authorized s ON (s.kind='object' AND s.id=l."objectId") OR (s.kind='boiler' AND s.id=l."boilerId") WHERE e."accountId"=${a} AND e."homeId"=${h} AND e.state='active'
  UNION
  SELECT e."documentId",s.id,s.kind,s.name FROM "HomeExpense" e JOIN authorized s ON s.kind='boiler' AND s.id=e."assetId" WHERE e."accountId"=${a} AND e."homeId"=${h} AND e.state='active'
  UNION
  SELECT d.id,s.id,s.kind,s.name FROM "AnalysisJob" j JOIN authorized s ON s.kind='boiler' AND s.id=j."assetId"
   CROSS JOIN LATERAL jsonb_array_elements(j.documents) p JOIN "Document" d ON d.id=p->>'documentId' JOIN "DocumentVersion" v ON v."documentId"=d.id
   WHERE j.state='succeeded' AND p->>'documentVersion'=v.version::text AND p->>'documentSha256'=v.sha256
 ) SELECT DISTINCT * FROM refs WHERE "documentId" IN (${Prisma.join(ids)}) ORDER BY name,kind,id`);
 for(const {documentId,...ref} of refs)result.get(documentId)!.linkedObjects.push(ref);
 const expenses=await tx.homeExpense.findMany({where:{accountId:a,homeId:h,state:'active',documentId:{in:ids}},orderBy:[{spentOn:'desc'},{id:'asc'}],select:{id:true,documentId:true,title:true,amountCents:true,supplier:true,documentNumber:true,documentDate:true}});
 for(const {documentId,...expense} of expenses)result.get(documentId!)!.savedExpenses.push(expense);
 return result;
}
