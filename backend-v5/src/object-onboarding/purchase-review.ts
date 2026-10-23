import { Prisma } from '../../generated/client';
import type { ObjectOnboardingAccess, OnboardingTx } from './access';
import { onboardingDenied } from './access';
import { conflict } from '../review/domain';
import { readableReceiptName } from '../receipt-assistance/access';
import { suggestionText } from './object-suggestions';

export async function denyRepeatedInvoiceObject(tx:OnboardingTx,a:string,h:string,name:string){
 const normalized=suggestionText(name);
 const found=await tx.$queryRaw<Array<{id:string;name:string}>>(Prisma.sql`SELECT o.id,o.name FROM "HomeObject" o WHERE o."accountId"=${a} AND o."homeId"=${h} AND o.state='active' AND ${readableReceiptName(a,h)}`);
 // Normalize both sides identically, including Italian accents, independent of the DB locale.
 if(found.some(row=>suggestionText(row.name)===normalized))throw conflict('onboarding_invoice_object_review','Esiste già una scheda con questo nome: collegala alla fattura. Per un apparato distinto usa un nome che lo identifichi.');
}
export async function purchaseObjects(tx:OnboardingTx,a:string,h:string,documentId:string){
 const links=await tx.objectResourceLink.findMany({where:{accountId:a,homeId:h,documentId,resourceType:'document',state:'active',objectId:{not:null}},select:{objectId:true}});
 return [...new Set(links.map(l=>l.objectId!))].sort();
}
export async function relatedPurchaseCost(tx:OnboardingTx,access:ObjectOnboardingAccess,a:string,h:string,documentId:string,sha:string,objectId?:string){
 const ids=await purchaseObjects(tx,a,h,documentId);if(objectId)ids.push(objectId);if(!ids.length)return false;
 const links=await tx.objectResourceLink.findMany({where:{accountId:a,homeId:h,objectId:{in:ids},resourceType:'document',state:'active',documentId:{not:null}},select:{documentId:true}});
 for(const id of new Set(links.map(l=>l.documentId!))){
  if(id===documentId)continue;
  const source=await access.source(tx,a,h,id);if(!source||source.original!.sha256===sha)continue;
  if(await tx.homeExpense.findFirst({where:{accountId:a,homeId:h,documentId:id,state:'active'},select:{id:true}}))return true;
 }
 return false;
}
export type PurchaseSource={documentId:string;documentVersion:number;documentSha256:string};
export async function checkPurchaseSources(tx:OnboardingTx,access:ObjectOnboardingAccess,a:string,h:string,expenseId:string){
 const row=await tx.homeExpense.findFirst({where:{id:expenseId,accountId:a,homeId:h}});if(!row?.documentId)throw onboardingDenied();
 if(!await access.source(tx,a,h,row.documentId))throw onboardingDenied();
 const saved=(row.economicProvenance as {_purchaseReview?:{sources?:PurchaseSource[]}}|null)?._purchaseReview;
 for(const source of saved?.sources??[])if(!await access.source(tx,a,h,source.documentId,source))throw onboardingDenied();
 return row;
}
export async function samePurchaseSources(tx:OnboardingTx,access:ObjectOnboardingAccess,a:string,h:string,documentId:string,expenseId:string){
 const row=await checkPurchaseSources(tx,access,a,h,expenseId);
 if(!(row.economicProvenance as {_purchaseReview?:{sources?:PurchaseSource[]}}|null)?._purchaseReview?.sources?.length)throw conflict('onboarding_purchase_source_review','La spesa precedente non ha riferimenti di fonte verificabili per questa riconciliazione.');
 const ids=await purchaseObjects(tx,a,h,documentId),previous=await purchaseObjects(tx,a,h,row.documentId!);
 if(!ids.length||JSON.stringify(ids)!==JSON.stringify(previous))throw conflict('onboarding_purchase_objects_review','Collega prima entrambe le fatture alle stesse schede.');
 for(const id of ids){const target=await access.target(tx,a,h,id);if(target.state!=='active')throw conflict('onboarding_target_changed','Rileggi le schede collegate.');}
 const sources:PurchaseSource[]=[];
 const prior=(row.economicProvenance as {_purchaseReview?:{sources?:PurchaseSource[]}}|null)?._purchaseReview?.sources??[];
 const documentIds=new Set([row.documentId!,...prior.map(s=>s.documentId),documentId]);if(documentIds.size>20)throw conflict('onboarding_purchase_review','Troppi documenti da riconciliare insieme.');
 for(const id of documentIds){
  const d=await access.source(tx,a,h,id);if(!d)throw onboardingDenied();
  sources.push({documentId:id,documentVersion:d.original!.version,documentSha256:d.original!.sha256});
 }
 return {row,sources};
}
