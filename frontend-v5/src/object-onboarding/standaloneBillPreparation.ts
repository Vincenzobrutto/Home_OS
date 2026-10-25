import type {ApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import {newIdempotencyKey} from '../api/queryKeys';
import {IntakeClient,toUiBatch,type BatchWire} from '../intake-integration/client';
import {organizeDocuments,type OrganizationPayload} from '../intake-integration/organization';
import type {Draft} from './model';

type Options={api:ApiClient;accountId:string;homeId:string;documentId:string;isCurrent:()=>boolean};
const unavailable=(message:string)=>new ApiError({kind:'http',status:409,code:'intake_preparation_required',message});

/** Called only by the explicit final confirmation, never while opening or saving a draft. */
export function createStandaloneBillPreparation({api,accountId,homeId,documentId,isCurrent}:Options){
 const client=new IntakeClient(api,accountId,homeId),prepareKey=newIdempotencyKey();
 let batch:BatchWire|null=null,attempt:{payload:OrganizationPayload;key:string;title:string}|null=null;
 const current=()=>{if(!isCurrent())throw unavailable('Il contesto è cambiato. Riapri il documento.');};
 return async(snapshot:Draft['snapshot'],title:string)=>{
  current();
  if(!snapshot||snapshot.documentId!==documentId||!Number.isSafeInteger(snapshot.documentVersion)||snapshot.documentVersion<1||!/^[a-f\d]{64}$/i.test(snapshot.sha256))throw unavailable('La fonte della proposta non è disponibile. Riapri il documento.');
  const read=async()=>{
   current();const source=await api.getDocument(homeId,documentId,undefined,accountId);current();
   if(source.id!==documentId||source.version!==snapshot.documentVersion||source.sha256!==snapshot.sha256)throw unavailable('L’originale è cambiato. Rileggi il documento prima di confermare.');
   if(source.organization&&(!source.organization.parts.length||!source.organization.parts.every(p=>p.kind==='utility_bill')))throw unavailable('Il documento ha già un tipo diverso. Controlla titolo e tipo nell’archivio prima di confermare la bolletta.');
   return source;
  };
  if((await read()).organization)return;
  const value=title.trim();if(!value||value.length>120)throw unavailable('Controlla il titolo del documento nell’archivio: deve contenere da 1 a 120 caratteri.');
  if(attempt&&attempt.title!==value)throw unavailable('La precedente classificazione è da verificare. Mantieni il titolo precedente prima di riprovare.');
  if(!batch){batch=await client.prepareExisting([documentId],prepareKey);current();}
  // Check again after preparing the batch: it may refer to a newer original.
  if((await read()).organization)return;
  if(!attempt){
   const item=toUiBatch(batch).items.find(i=>i.documentLink.state==='linked'&&i.documentLink.document?.id===documentId);
   if(!batch.permissions.includes('edit')||!item?.permissions.review||item.uploadState!=='stored'||item.reviewState!=='unreviewed'||item.proposal||item.duplicate||item.selectionStale||item.selection||item.confirmedOrganization||item.organizationVersion||['queued','running','uncertain'].includes(item.analysisState))throw unavailable('Il documento o le scelte salvate sono cambiati. Rivedi la compilazione dall’archivio.');
   attempt={key:newIdempotencyKey(),title:value,payload:{batchId:batch.id,expectedVersion:batch.version,mode:'single',items:[{itemId:item.id,expectedVersion:item.version,expectedOrganizationVersion:0,replaceOrganization:false,selection:{action:'organize',title:value,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],target:{kind:'home'}}}]}};
  }
  // A failed response retains this exact body/key; only another explicit click retries it.
  current();const response=await organizeDocuments(client,attempt.payload,attempt.key);current();
  if(response.outcome.status!=='done'||response.outcome.results.some(r=>r.status!=='confirmed'))throw unavailable('La classificazione del documento è da verificare. Nessuna spesa è stata confermata.');
  if(!(await read()).organization)throw unavailable('La classificazione della bolletta non risulta disponibile. Rivedi il documento nell’archivio.');
 };
}
