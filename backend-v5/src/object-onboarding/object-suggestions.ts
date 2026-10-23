import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { confirmedSourceVisible } from '../documents/access';
import { EconomyPolicy } from '../economy/policy';
import type { ObjectRef } from '../economy/domain';
import { readableReceiptName } from '../receipt-assistance/access';
import { invalid, object, text } from '../review/domain';
import type { ReviewService } from '../review/review.service';
import { onboardingDenied, type ObjectOnboardingAccess, type OnboardingTx } from './access';
import type { ProductExtraction, HouseExpense } from './domain';
import { proposedProfile } from './profile';

const ignored=new Set('acconto saldo fattura ricevuta pagamento pagamenti totale euro documento fornitore lavori lavoro intervento impianto fornitura installazione manutenzione sostituzione acquisto della dello delle degli dalla dalle del dei con per una uno alla alle altro'.split(' '));
export const suggestionText=(value:string)=>value.normalize('NFC').toLocaleLowerCase('it').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/gu,' ');
export function suggestionContext(output:ProductExtraction,item:HouseExpense){
 const value=[item.proposedFields.title?.value,output.documentInfo?.title.value,...output.items.map(i=>i.fields.name?.value),...(item.proposedFields.title?.sources??[]).map(s=>s.excerpt)].filter(Boolean).join(' ').slice(0,12000);
 const title=suggestionText(value),tokens=[...new Set(title.split(' ').filter(t=>t.length>=4&&!/^\d+$/u.test(t)&&!ignored.has(t)))].slice(0,80);
 return {title,tokens,supplier:suggestionText(item.proposedFields.supplier?.value??'')};
}
export function relatedExpense(current:{tokens:string[];supplier:string},prior:{title:string;supplier:string|null}){
 if(!current.supplier||current.supplier!==suggestionText(prior.supplier??''))return false;
 const words=new Set(suggestionText(prior.title).split(' '));return current.tokens.filter(t=>words.has(t)).length>=2;
}
export type ObjectSuggestion={ref:ObjectRef;name:string;reason:'document_name'|'product_identity'|'supplier_and_description';category?:string};
/** Read-only suggestions. A shared supplier, an amount or a date alone is never an identity. */
export async function invoiceObjectSuggestions(tx:OnboardingTx,a:string,h:string,output:ProductExtraction,item:HouseExpense,review:ReviewService){
 if(item.documentKind!=='simple_invoice')return {items:[] as ObjectSuggestion[]};
 const context=suggestionContext(output,item);if(!context.title)return {items:[] as ObjectSuggestion[]};
 const clean=(value:Prisma.Sql)=>Prisma.sql`trim(regexp_replace(lower(normalize(${value},NFC)),'[^[:alnum:]]+',' ','g'))`;
 const named=Prisma.sql`length(${clean(Prisma.sql`o.name`)})>=4 AND position(' '||${clean(Prisma.sql`o.name`)}||' ' IN ${' '+context.title+' '})>0`;
 const identities=output.items.flatMap(i=>{const p=proposedProfile(i),model=p.model?.value??p.reference?.value;return p.brand&&model?[{brand:suggestionText(p.brand.value),model:suggestionText(model)}]:[];});
 const identity=identities.length?Prisma.sql`(${Prisma.join(identities.map(p=>Prisma.sql`(position(${' '+p.brand+' '} IN ' '||${clean(Prisma.sql`o.name`)}||' ')>0 AND position(${' '+p.model+' '} IN ' '||${clean(Prisma.sql`o.name`)}||' ')>0)`),' OR ')})`:Prisma.sql`FALSE`;
 const direct=await tx.$queryRaw<Array<{id:string;reason:ObjectSuggestion['reason']}>>(Prisma.sql`SELECT o.id,CASE WHEN ${named} THEN 'document_name' ELSE 'product_identity' END AS reason FROM "HomeObject" o WHERE o."accountId"=${a} AND o."homeId"=${h} AND o.state='active' AND ${readableReceiptName(a,h)}
   AND ((${named}) OR ${identity}) ORDER BY o.id LIMIT 50`);
 const previous=context.supplier&&context.tokens.length>=2?await tx.$queryRaw<Array<{id:string;objectId:string|null;assetId:string|null;title:string;supplier:string|null;category:string|null}>>(Prisma.sql`
   SELECT e.id,l."objectId",e."assetId",e.title,e.supplier,e.category FROM "HomeExpense" e
   LEFT JOIN "ObjectResourceLink" l ON l."expenseId"=e.id AND l."accountId"=${a} AND l."homeId"=${h} AND l.state='active'
   LEFT JOIN "Document" d ON d.id=e."documentId"
   WHERE e."accountId"=${a} AND e."homeId"=${h} AND e.state='active' AND (l."objectId" IS NOT NULL OR e."assetId" IS NOT NULL)
   AND (e."documentId" IS NULL OR (d."homeId"=${h} AND ${confirmedSourceVisible(a)}))
   AND ${clean(Prisma.sql`e.supplier`)}=${context.supplier}
   AND (SELECT count(DISTINCT t) FROM unnest(${context.tokens}::text[]) t WHERE position(' '||t||' ' IN ' '||${clean(Prisma.sql`e.title`)}||' ')>0)>=2
   ORDER BY e.id LIMIT 50`):[];
 const refs:Array<{ref:ObjectRef;reason:ObjectSuggestion['reason']}>=[];
 for(const row of previous)if(relatedExpense(context,row))refs.push({ref:{kind:row.objectId?'object':'boiler',id:(row.objectId??row.assetId)!},reason:'supplier_and_description'});
 // The confirmed economic reference precedes components merely mentioned by the invoice.
 refs.push(...direct.map(r=>({ref:{kind:'object' as const,id:r.id},reason:r.reason??'document_name' as const})));
 const policy=new EconomyPolicy(review),items:ObjectSuggestion[]=[],seen=new Set<string>();
 for(const candidate of refs){const key=candidate.ref.kind+':'+candidate.ref.id;if(seen.has(key))continue;seen.add(key);
  try{const subject=await policy.subject(tx,a,h,candidate.ref);if(!subject||subject.state!=='active'||candidate.reason==='document_name'&&!suggestionText(subject.name).split(' ').some(t=>t.length>=4&&!ignored.has(t)))continue;
   const matches=previous.filter(row=>(candidate.ref.kind==='object'?row.objectId:row.assetId)===candidate.ref.id&&relatedExpense(context,row));
   const categories=new Set(matches.map(row=>row.category));const category=previous.length<50&&categories.size===1?[...categories][0]:null;
   items.push({ref:candidate.ref,name:subject.name,reason:candidate.reason,...(category&&['electricity','gas','water','internet_services','maintenance','repairs_works','purchase_replacement'].includes(category)?{category}:{})});}catch(e){if(e instanceof ForbiddenException)continue;throw e;}
  if(items.length===5)break;
 }
 return {items};
}
export function onboardingObjectSuggestions(access:ObjectOnboardingAccess,review:ReviewService,a:string,h:string,id:string,query:unknown){
 const q=object(query,['itemId']),itemId=text(q.itemId,80);
 return access.run(a,h,false,async tx=>{const draft=await access.draft(tx,a,h,id);if(!await access.source(tx,a,h,draft.documentId,draft))throw onboardingDenied();
  const output=draft.output as unknown as ProductExtraction,item=output.houseExpenses?.find(i=>i.id===itemId);if(!item)throw invalid();return invoiceObjectSuggestions(tx,a,h,output,item,review);
 });
}
