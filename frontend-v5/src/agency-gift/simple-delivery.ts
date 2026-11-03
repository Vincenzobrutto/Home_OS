import type {GiftAgencyScope,GiftCreateInput,GiftReleaseInput} from './gift-api';
import type {AgencyGiftPanelProps} from './AgencyGiftPanel';
import type {GiftDocuments,GiftDocumentRow,GiftInvitationCreated,GiftReissued} from './gift-wire';

export type DeliveryChoice={sourceId:string;version:number;sha256:string;metadataVersion?:number;mapId?:string;mapVersion?:number};
type ReleaseStep={kind:'release';sourceId:string;body:GiftReleaseInput;key:string};
type CreateStep={kind:'create';body:GiftCreateInput;key:string};
type ReissueStep={kind:'reissue';id:string;body:{expectedRevision:number;expectedVersion:number};key:string};
export type DeliveryJournal={scope:GiftAgencyScope;documents:GiftDocuments;choices:DeliveryChoice[];email:string;annual:boolean;cursor:number;pending:ReleaseStep|CreateStep|ReissueStep|null;result:GiftInvitationCreated|GiftReissued|null};
export class DeliveryProblem extends Error{readonly sourceId?:string;constructor(message:string,sourceId?:string){super(message);this.sourceId=sourceId;}}
export const giftTitle=(row:GiftDocumentRow)=>row.state==='current'?row.descriptor.title:row.filename;
export const unavailableReason=(row:GiftDocumentRow)=>row.state==='stale'?'Documento aggiornato: ricontrollalo nella pratica.':row.state==='current'&&row.descriptor.lifecycle==='draft'?'Bozza: completa il documento nella pratica.':null;
function rowFor(documents:GiftDocuments,choice:DeliveryChoice){
 const row=documents.documents.find(r=>r.sourceId===choice.sourceId);
 if(!row||row.sourceVersion!==choice.version||row.sha256!==choice.sha256)throw new DeliveryProblem('Il documento è cambiato. Aggiorna l’elenco e selezionalo di nuovo.',choice.sourceId);
 if(choice.metadataVersion!==(row.state==='current'?row.metadataVersion:undefined))throw new DeliveryProblem('Il documento è cambiato. Selezionalo di nuovo dopo il controllo.',choice.sourceId);
 const reason=unavailableReason(row);if(reason)throw new DeliveryProblem(reason,choice.sourceId);
 if(choice.mapId){const plan=row.digitalPlans?.find(p=>p.id===choice.mapId&&p.version===choice.mapVersion);if(!plan||plan.pending||!plan.roomCount)throw new DeliveryProblem('La mappa digitale deve essere verificata nella pratica.',choice.sourceId);}
 return row;
}
export function deliveryJournal(scope:GiftAgencyScope,documents:GiftDocuments,choices:DeliveryChoice[],email:string,annual:boolean,confirmed:boolean):DeliveryJournal{
 if(!confirmed)throw new DeliveryProblem('Conferma la consegna dopo la stipula.');
 if(documents.practiceId!==scope.practiceId||choices.length<1||choices.length>50||new Set(choices.map(c=>c.sourceId)).size!==choices.length)throw new DeliveryProblem('Seleziona da 1 a 50 documenti della pratica.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim()))throw new DeliveryProblem('Inserisci l’email del destinatario.');
 choices.forEach(c=>rowFor(documents,c));
 return {scope:{...scope},documents:structuredClone(documents),choices:structuredClone(choices),email:email.trim().toLowerCase(),annual,cursor:0,pending:null,result:null};
}
export function reissueJournal(scope:GiftAgencyScope,documents:GiftDocuments,id:string,version:number):DeliveryJournal{
 return {scope:{...scope},documents:structuredClone(documents),choices:[],email:'',annual:false,cursor:0,pending:{kind:'reissue',id,body:{expectedRevision:documents.revision,expectedVersion:version},key:crypto.randomUUID()},result:null};
}
/** A journal is memory-only. A lost reply leaves the exact step/key available for a manual retry. */
export async function advanceDelivery(api:AgencyGiftPanelProps['api'],scope:GiftAgencyScope,journal:DeliveryJournal,signal:AbortSignal,onPrepared:(documents:GiftDocuments)=>void){
 const check=()=>{if(signal.aborted)throw new DOMException('Aborted','AbortError');if(scope.accountId!==journal.scope.accountId||scope.agencyId!==journal.scope.agencyId||scope.practiceId!==journal.scope.practiceId)throw new DeliveryProblem('La pratica è cambiata.');};
 check();
 while(!journal.result){
  check();
  if(!journal.pending){
   while(journal.cursor<journal.choices.length){
    const choice=journal.choices[journal.cursor]!,row=rowFor(journal.documents,choice);
    if(row.state==='current'&&(!choice.mapId||row.descriptor.digitalPlan?.planId===choice.mapId)){journal.cursor++;continue;}
    journal.pending={kind:'release',sourceId:row.sourceId,key:crypto.randomUUID(),body:{expectedRevision:journal.documents.revision,expectedSourceVersion:row.sourceVersion,expectedSha256:row.sha256,title:giftTitle(row),origin:row.state==='current'?row.descriptor.origin:'received',finalDocumentConfirmed:true,releaseApproved:true,...(choice.mapId?{digitalPlan:{planId:choice.mapId,expectedPlanVersion:choice.mapVersion!,reviewed:true as const}}:{})}};
    break;
   }
   if(!journal.pending)journal.pending={kind:'create',key:crypto.randomUUID(),body:{expectedRevision:journal.documents.revision,documents:journal.choices.map(c=>({sourceId:c.sourceId,version:c.version,sha256:c.sha256})),recipientEmail:journal.email,annualBenefit:journal.annual,stipulationCompleted:true,releaseApproved:true}};
  }
  const request=journal.pending;
  if(request.kind==='release'){
   const response=await api.releaseDocument(scope,request.sourceId,request.body,request.key,signal);check();
   const row=response.metadata.documents.find(r=>r.sourceId===request.sourceId);
   if(response.metadata.practiceId!==scope.practiceId||row?.state!=='current'||row.sourceVersion!==request.body.expectedSourceVersion||row.sha256!==request.body.expectedSha256)throw new Error('Invalid release response');
   journal.documents=response.metadata;journal.choices[journal.cursor]!.metadataVersion=row.metadataVersion;journal.cursor++;journal.pending=null;onPrepared(response.metadata);
  }else{
   const result=request.kind==='create'?await api.createInvitation(scope,request.body,request.key,signal):await api.reissueInvitation(scope,request.id,request.body,request.key,signal);check();
   journal.result=result;journal.pending=null;
  }
 }
 return journal.result;
}
