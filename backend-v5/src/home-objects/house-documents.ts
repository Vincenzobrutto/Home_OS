import {ForbiddenException} from '@nestjs/common';
import {Prisma} from '../../generated/client';
import {canReadDocument} from '../documents/access';
import {currentOrganization} from '../document-intake/organization';
import {readableReceiptObjectIds} from '../receipt-assistance/access';
import {digest} from '../security';
import {conflict,invalid,object,uuid} from '../review/domain';

type Tx=Prisma.TransactionClient;
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
/** Caller holds the home G1 lock and has authorized the generic object's name sources. */
export async function houseDocumentPlan(tx:Tx,a:string,h:string,id:string){
 await tx.$queryRaw`SELECT id FROM "HomeObject" WHERE id=${id} FOR UPDATE`;
 const subject=await tx.homeObject.findFirst({where:{id,accountId:a,homeId:h}});
 if(!subject)throw new ForbiddenException();
 const proofs=await tx.receiptObjectField.findMany({where:{objectId:id,fieldKey:'name',origin:'extraction_confirmed'}});
 for(const proof of proofs){await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${proof.documentId} FOR SHARE`;await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${proof.documentId} FOR SHARE`;}
 if(!(await readableReceiptObjectIds(tx,a,h,[id])).has(id))throw new ForbiddenException();
 const links=await tx.objectResourceLink.findMany({where:{accountId:a,homeId:h,objectId:id,state:'active'},orderBy:{id:'asc'}});
 const expenses=await tx.homeExpense.findMany({where:{accountId:a,homeId:h,id:{in:links.flatMap(l=>l.expenseId?[l.expenseId]:[])}},orderBy:{id:'asc'}});
 const ids=[...new Set([...links.flatMap(l=>l.documentId?[l.documentId]:[]),...expenses.flatMap(e=>e.documentId?[e.documentId]:[])])].sort();
 if(ids.length>50)throw conflict('too_many_documents','Questa scheda ha più di 50 documenti: gestisci prima i singoli collegamenti.');
 if(ids.length){await tx.$queryRaw(Prisma.sql`SELECT id FROM "Document" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`);await tx.$queryRaw(Prisma.sql`SELECT id FROM "DocumentVersion" WHERE "documentId" IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`);}
 const docs=await tx.document.findMany({where:{id:{in:ids},homeId:h},include:{original:true},orderBy:{id:'asc'}});
 const position=await tx.objectPosition.findFirst({where:{accountId:a,homeId:h,objectId:id}});
 const automatic=await tx.objectOnboardingRequest.findMany({where:{accountId:a,homeId:h,operation:'automatic-intake-v1',response:{path:['finished'],equals:false}},select:{response:true}});
 const rows=[];
 for(const doc of docs){
  if(!canReadDocument(doc,a)||!doc.original)continue;
  const org=await currentOrganization(tx,a,h,doc);
  const costs=await tx.homeExpense.findMany({where:{accountId:a,homeId:h,documentId:doc.id,OR:[{state:'active'},{id:{in:expenses.map(e=>e.id)}}]},orderBy:{id:'asc'}});
  const relatedLinks=await tx.objectResourceLink.findMany({where:{accountId:a,homeId:h,state:'active',OR:[{documentId:doc.id,resourceType:'document'},{expenseId:{in:costs.map(e=>e.id)},resourceType:'expense'}]},orderBy:{id:'asc'}});
  const otherIds=[...new Set(relatedLinks.flatMap(l=>l.objectId&&l.objectId!==id?[l.objectId]:[]))].sort();
  if(otherIds.length)await tx.$queryRaw(Prisma.sql`SELECT id FROM "HomeObject" WHERE id IN (${Prisma.join(otherIds)}) ORDER BY id FOR UPDATE`);
  const nameProofs=await tx.receiptObjectField.findMany({where:{accountId:a,homeId:h,objectId:{in:otherIds},fieldKey:'name',origin:'extraction_confirmed'},orderBy:{documentId:'asc'}});
  for(const proof of nameProofs){await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${proof.documentId} FOR SHARE`;await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${proof.documentId} FOR SHARE`;}
  const readable=await readableReceiptObjectIds(tx,a,h,otherIds);
  const relatedObjects=await tx.homeObject.findMany({where:{accountId:a,homeId:h,id:{in:otherIds.filter(x=>readable.has(x))}},select:{id:true,name:true,version:true},orderBy:{id:'asc'}});
  const native=await tx.analysisJob.count({where:{accountId:a,homeId:h,state:'succeeded',documents:{array_contains:[{documentId:doc.id,documentVersion:doc.original.version,documentSha256:doc.original.sha256}]}}});
  const running=await tx.objectOnboardingJob.count({where:{accountId:a,homeId:h,documentId:doc.id,documentVersion:doc.original.version,documentSha256:doc.original.sha256,state:{in:['queued','running','uncertain']}}});
  const intake=await tx.documentIntakeAnalysis.count({where:{item:{documentId:doc.id,batch:{accountId:a,homeId:h}},state:{in:['queued','running']}}});
  const pendingAutomatic=automatic.some(run=>(run.response as {entries?:Array<{documentId:string;state:string}>}).entries?.some(e=>e.documentId===doc.id&&!['completed','attention'].includes(e.state)));
  const reason=subject.state!=='active'?'Ripristina prima la scheda dell’oggetto.':relatedObjects.length!==otherIds.length?'Un collegamento non è consultabile: gestiscilo prima dalla relativa scheda.':native||costs.some(e=>e.assetId)||relatedLinks.some(l=>l.boilerId)?'Il documento ha un collegamento tecnico a una caldaia. Gestiscilo prima dalla relativa scheda.':running||intake||pendingAutomatic?'C’è un’elaborazione in corso o da verificare. Attendi il suo esito prima di continuare.':null;
  rows.push({id:doc.id,title:org?.title??doc.name,originalFilename:doc.original.originalFilename,documentVersion:doc.original.version,sha256:doc.original.sha256,organizationVersion:org?.version??0,
   reason,willOrganize:!org,expenses:costs,relatedLinks,relatedObjects});
 }
 const token=digest(JSON.stringify({subject,position,links,expenses,rows}));
 return {subject,position,links,expenses,rows,token,unavailable:rows.length!==ids.length};
}
export function publicHouseDocumentPlan(plan:Awaited<ReturnType<typeof houseDocumentPlan>>){
 return {token:plan.token,objectName:plan.subject.name,documents:plan.rows.map(({id,title,originalFilename,reason,willOrganize,expenses,relatedObjects})=>({id,title,originalFilename,reason,willOrganize,relatedObjects:reason?[]:relatedObjects.map(({id,name})=>({id,name})),expenses:reason?[]:expenses.map(({id,title,amountCents})=>({id,title,amountCents}))})),
  unavailable:plan.unavailable,archiveBlocked:plan.links.some(l=>l.resourceType==='activity'||l.resourceType==='expense'&&!plan.expenses.some(e=>e.id===l.expenseId&&e.documentId))};
}
export async function keepHouseDocuments(tx:Tx,a:string,h:string,id:string,input:unknown,key?:string){
 const raw=object(input,['expectedToken','documentIds','archiveObject','detachRelatedObjects']);
 if(typeof raw.expectedToken!=='string'||!/^[a-f0-9]{64}$/.test(raw.expectedToken)||!Array.isArray(raw.documentIds)||!raw.documentIds.length||raw.documentIds.length>50||typeof raw.archiveObject!=='boolean'||!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid();
 const documentIds=[...new Set(raw.documentIds.map(uuid))].sort();if(documentIds.length!==raw.documentIds.length)throw invalid();
 if(raw.detachRelatedObjects!==undefined&&typeof raw.detachRelatedObjects!=='boolean')throw invalid();
 const body={expectedToken:raw.expectedToken,documentIds,archiveObject:raw.archiveObject,...(raw.detachRelatedObjects!==undefined?{detachRelatedObjects:raw.detachRelatedObjects}:{})},hash=digest(JSON.stringify(body));
 const lookup={accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation:'keep-house-documents-v1',target:id,key}};
 const prior=await tx.objectRequest.findUnique({where:lookup});
 const plan=await houseDocumentPlan(tx,a,h,id);
 if(prior){
  if(prior.digest!==hash)throw conflict('idempotency_conflict','Chiave già usata per scelte diverse.');
  const reply=prior.response as unknown as {documentIds:string[];proofs:Array<{id:string;version:number;sha256:string}>;archivedObject:boolean};
  for(const proof of reply.proofs){await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${proof.id} FOR SHARE`;await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${proof.id} FOR SHARE`;const doc=await tx.document.findUnique({where:{id:proof.id},include:{original:true}});if(!doc||doc.homeId!==h||!canReadDocument(doc,a)||doc.original?.version!==proof.version||doc.original.sha256!==proof.sha256)throw new ForbiddenException();}
  return {documentIds:reply.documentIds,archivedObject:reply.archivedObject};
 }
 if(plan.token!==body.expectedToken)throw conflict('house_documents_changed','Documenti o collegamenti sono cambiati. Riapri il riepilogo prima di confermare.');
 if(!body.archiveObject)throw invalid('Lo spostamento conserva i documenti e archivia la scheda oggetto.');
 if(body.detachRelatedObjects===true)throw invalid('I collegamenti alle altre schede devono essere conservati. Aggiorna il riepilogo.');
 const selected=plan.rows.filter(d=>documentIds.includes(d.id));
 if(selected.length!==documentIds.length)throw new ForbiddenException();
 if(selected.some(d=>d.reason))throw conflict('house_documents_unavailable','Controlla i documenti non disponibili nel riepilogo.');
 const removing=plan.links.filter(l=>l.resourceType==='document'&&documentIds.includes(l.documentId??'')||l.resourceType==='expense'&&selected.some(d=>d.expenses.some(e=>e.id===l.expenseId)));
 const expenseIds=removing.flatMap(l=>l.expenseId?[l.expenseId]:[]);
 if(plan.unavailable||selected.length!==plan.rows.length||plan.links.some(l=>!removing.some(r=>r.id===l.id)))throw conflict('object_has_other_resources','Per spostare la scheda includi tutti i documenti e gestisci prima le altre risorse collegate.');
 for(const row of removing){
  const after=await tx.objectResourceLink.update({where:{id:row.id},data:{state:'removed',version:{increment:1}}});
  await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'object',targetId:row.objectId!,kind:'unlinked',before:json({kind:'link',row,subjectKind:'object',subjectId:row.objectId}),after:json({kind:'link',row:after,subjectKind:'object',subjectId:row.objectId})}});
 }
 for(const doc of selected){
  const where={accountId_homeId_documentId:{accountId:a,homeId:h,documentId:doc.id}};
  if(doc.willOrganize){const data={documentVersion:doc.documentVersion,documentSha256:doc.sha256,title:doc.title,parts:[{kind:'other',pageFrom:null,pageTo:null}],collections:['unclassified'],houseDocument:true,houseFamily:null};await tx.documentOrganization.upsert({where,create:{accountId:a,homeId:h,documentId:doc.id,...data},update:{...data,version:{increment:1}}});}
  else{const organization=await tx.documentOrganization.findUniqueOrThrow({where});if(!organization.houseDocument)await tx.documentOrganization.update({where,data:{houseDocument:true,version:{increment:1},updatedAt:new Date()}});}
 }
 for(const before of [...new Map(selected.flatMap(d=>d.expenses).filter(e=>expenseIds.includes(e.id)).map(e=>[e.id,e])).values()]){
  const after=await tx.homeExpense.update({where:{id:before.id},data:{version:{increment:1},updatedAt:new Date()}});
  const from=removing.find(l=>l.expenseId===before.id)!;
  await tx.expenseHistory.create({data:{expenseId:before.id,accountId:a,kind:'updated',note:'Documento conservato nella casa: rimosso il riferimento all’oggetto.',before:json({...before,economicObjectRef:{kind:'object',id:from.objectId}}),after:json({...after,economicObjectRef:null})}});
 }
 if(body.archiveObject){
  if(plan.position){const after=await tx.objectPosition.update({where:{id:plan.position.id},data:{roomIds:[],version:{increment:1}}});await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'object',targetId:id,kind:'position_updated',before:json({kind:'object',row:plan.subject,position:plan.position}),after:json({kind:'object',row:plan.subject,position:after})}});}
  const after=await tx.homeObject.update({where:{id},data:{state:'archived',version:{increment:1},updatedAt:new Date()}});
  await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'object',targetId:id,kind:'archived',before:json({kind:'object',row:plan.subject,position:plan.position}),after:json({kind:'object',row:after,position:plan.position?{...plan.position,roomIds:[],version:plan.position.version+1}:null})}});
 }
 const response={documentIds,archivedObject:body.archiveObject,proofs:selected.map(d=>({id:d.id,version:d.documentVersion,sha256:d.sha256}))};
 await tx.objectRequest.create({data:{...lookup.accountId_homeId_operation_target_key,digest:hash,response:json(response)}});
 return {documentIds,archivedObject:body.archiveObject};
}
