import { Prisma, type HomeContact } from '../../generated/client';
import { conflict, invalid, object, text, uuid, version } from '../review/domain';
import { ForbiddenException } from '@nestjs/common';
import { EconomyPolicy } from '../economy/policy';
import type { ReviewService } from '../review/review.service';
import { normalize, values, type Resource } from './domain';
import type { ContactProposal } from './extraction';
export type ContactChoice={proposalId:string;action:'save'|'skip';contactId?:string;expectedVersion?:number;values?:ReturnType<typeof values>;createDistinct?:boolean};
export function contactChoices(input:unknown):ContactChoice[]{if(input===undefined)return [];if(!Array.isArray(input)||input.length>3)throw invalid();const result=input.map(v=>{const r=object(v,['proposalId','action','contactId','expectedVersion','values','createDistinct']),proposalId=text(r.proposalId,80);if(r.action==='skip'){object(r,['proposalId','action']);return {proposalId,action:'skip' as const};}if(r.action!=='save'||r.createDistinct!==undefined&&typeof r.createDistinct!=='boolean')throw invalid();if(r.contactId===undefined&&r.expectedVersion!==undefined||r.contactId!==undefined&&r.createDistinct)throw invalid();return {proposalId,action:'save' as const,...(r.contactId!==undefined?{contactId:uuid(r.contactId),expectedVersion:version(r.expectedVersion)}:{}),...(r.values!==undefined?{values:values(r.values)}:{}),...(r.createDistinct?{createDistinct:true}: {})};});if(new Set(result.map(x=>x.proposalId)).size!==result.length)throw invalid();return result;}
const equal=(a:string|null,b:string|null)=>!!normalize(a)&&normalize(a)===normalize(b);
export async function resolveContact(tx:Prisma.TransactionClient,a:string,h:string,p:ContactProposal){const rows=await tx.homeContact.findMany({where:{accountId:a,homeId:h}}),v=p.values;const strong=rows.filter(r=>['fiscalId','email','phone'].some(k=>equal(v[k as 'phone'],r[k as 'phone']))),weak=rows.filter(r=>equal(v.name,r.name)),matches=[...new Map([...strong,...weak].map(x=>[x.id,x])).values()];const selected=strong.length===1?strong[0]:null,conflicts=selected?(['phone','email','fiscalId'] as const).filter(k=>v[k]&&selected[k]&&!equal(v[k],selected[k])):[];const ambiguous=strong.length>1||!selected&&weak.length>0||!!selected&&selected.state!=='active'||conflicts.length>0||!!selected&&!equal(v.fiscalId,selected.fiscalId)&&!equal(v.name,selected.name)||p.warnings.length>0||!selected&&!v.fiscalId&&!v.email&&!v.phone;return {state:ambiguous?'review':selected?'use_existing':'create',contact:selected,candidates:matches.map(r=>({id:r.id,name:r.name,version:r.version,state:r.state})),conflicts};}
/** Called inside the canonical onboarding transaction and its home lock; never overwrites populated fields. */
export async function saveContactProposal(tx:Prisma.TransactionClient,a:string,h:string,documentId:string,p:ContactProposal,c:ContactChoice,automatic:boolean){if(c.action==='skip')return {contactId:null,newContacts:0,linkedContacts:0};if(automatic&&(c.values||c.contactId||c.createDistinct))throw invalid();const resolution=await resolveContact(tx,a,h,p);if(automatic&&resolution.state==='review')throw conflict('contact_review_needed','Controlla i dati del professionista prima di completare il documento.');let existing:HomeContact|null=resolution.contact;
 if(c.contactId){existing=await tx.homeContact.findFirst({where:{id:c.contactId,accountId:a,homeId:h}});if(!existing||existing.version!==c.expectedVersion)throw conflict('contact_version_conflict','Il contatto è cambiato. Rileggilo prima di confermare.');}
 else if(!automatic&&resolution.state==='review'&&!existing&&!c.createDistinct)throw conflict('contact_review_needed','Scegli il contatto esistente oppure conferma che è una nuova persona.');
 if(existing?.state==='archived')throw conflict('contact_review_needed','Ripristina il contatto archiviato prima di collegarlo.');const v=c.values??p.values;
 if(c.values){const duplicate=await tx.homeContact.findMany({where:{accountId:a,homeId:h,...(existing?{id:{not:existing.id}}:{})}});if(duplicate.some(r=>(['fiscalId','email','phone'] as const).some(k=>equal(v[k],r[k]))))throw conflict('contact_duplicate','Questi recapiti appartengono già a un altro contatto.');}
 const patch=existing?Object.fromEntries((['phone','email','fiscalId','profession'] as const).filter(k=>!existing![k]&&v[k]).map(k=>[k,v[k]])):null;
 const others=await tx.homeContact.findMany({where:{accountId:a,homeId:h,...(existing?{id:{not:existing.id}}:{})}});const next=existing?patch!:v;if(others.some(r=>(['phone','email','fiscalId'] as const).some(k=>typeof next[k]==='string'&&equal(next[k] as string,r[k]))))throw conflict('contact_duplicate','Questi recapiti appartengono già a un altro contatto.');
 const row=existing?Object.keys(patch!).length?await tx.homeContact.update({where:{id:existing.id},data:{...patch,version:{increment:1}}}):existing:await tx.homeContact.create({data:{...v,accountId:a,homeId:h}});
 const link={contactId:row.id,resourceKind:'document',resourceId:documentId};const prior=await tx.contactResourceLink.findUnique({where:{contactId_resourceKind_resourceId:link}});await tx.contactResourceLink.upsert({where:{contactId_resourceKind_resourceId:link},create:link,update:{state:'active'}});if(prior?.state!=='active')await tx.homeContact.update({where:{id:row.id},data:{version:{increment:1}}});return {contactId:row.id,newContacts:existing?0:1,linkedContacts:existing&&prior?.state!=='active'?1:0};}
type ConfirmedDecision={state:string;objectIds?:string[];expenseId?:string|null;contactId?:string|null};
/**
 * BL-10b: nella stessa transazione della conferma, il professionista confermato si collega anche a spese e oggetti
 * confermati dallo stesso documento (anche in conferme precedenti della stessa bozza), compresi gli oggetti già
 * collegati alla spesa. Solo risorse ancora leggibili e attive; contatti archiviati esclusi; mai duplicati.
 */
export async function linkConfirmedContacts(tx:Prisma.TransactionClient,a:string,h:string,decisions:Record<string,ConfirmedDecision>,review:ReviewService){
 const entries=Object.entries(decisions).filter(([,d])=>d.state==='confirmed');
 const contactIds=[...new Set(entries.filter(([k,d])=>k.startsWith('contact:')&&d.contactId).map(([,d])=>d.contactId!))];
 if(!contactIds.length)return 0;
 const policy=new EconomyPolicy(review),candidates:Resource[]=[];
 for(const [key,d] of entries){if(key.startsWith('contact:'))continue;
  for(const id of d.objectIds??[])candidates.push({kind:'object',id});
  if(!d.expenseId)continue;
  const expense=await tx.homeExpense.findFirst({where:{id:d.expenseId,accountId:a,homeId:h,state:'active'}});if(!expense)continue;
  candidates.push({kind:'expense',id:expense.id});if(expense.assetId)candidates.push({kind:'boiler',id:expense.assetId});
  for(const l of await tx.objectResourceLink.findMany({where:{expenseId:expense.id,accountId:a,homeId:h,state:'active'}})){if(l.objectId)candidates.push({kind:'object',id:l.objectId});if(l.boilerId)candidates.push({kind:'boiler',id:l.boilerId});}
 }
 const resources:Resource[]=[],seen=new Set<string>();
 for(const r of candidates){const k=r.kind+':'+r.id;if(seen.has(k))continue;seen.add(k);
  if(r.kind==='expense'){resources.push(r);continue;}
  try{const subject=await policy.subject(tx,a,h,{kind:r.kind as 'object'|'boiler',id:r.id});if(subject?.state==='active')resources.push(r);}catch(e){if(!(e instanceof ForbiddenException))throw e;}
 }
 let added=0;
 for(const contactId of contactIds){const contact=await tx.homeContact.findFirst({where:{id:contactId,accountId:a,homeId:h,state:'active'}});if(!contact)continue;let changed=false;
  for(const r of resources){const link={contactId,resourceKind:r.kind,resourceId:r.id},prior=await tx.contactResourceLink.findUnique({where:{contactId_resourceKind_resourceId:link}});if(prior?.state==='active')continue;
   await tx.contactResourceLink.upsert({where:{contactId_resourceKind_resourceId:link},create:link,update:{state:'active'}});changed=true;added++;}
  if(changed)await tx.homeContact.update({where:{id:contactId},data:{version:{increment:1}}});
 }
 return added;
}
