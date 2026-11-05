import {createHash} from 'node:crypto';
import {PracticeError,requirePractice,sourceReadable,type Actor,type Practice} from './domain';

export const stages=['preparation','marketing','negotiation','closing','completed'] as const;
export type JourneyStage=typeof stages[number];
export type JourneyProfile={
 seller:string;email:string;phone:string;address:string;cadastral:string;accessories:string;
 askingPrice:string;mandateStart:string;mandateEnd:string;commission:string;exclusive:string;
};
export type JourneyChecklist={
 answers:Record<string,'yes'|'no'|'check'>;
 custom:Array<{id:string;label:string;when:string}>;
 assignments:Record<string,string>;
 waiting:string[];
 purchaseRequests?:Array<'floor_plan'|'cadastral'>;
};
export type JourneyTransaction={buyer:string;offerPrice:string;outcome:string;mortgage:string;notary:string;closingDate:string;tasks:string};
export type JourneyState={
 profile:JourneyProfile;mandateSourceId:string|null;mandateVersion:number|null;
 checklist:JourneyChecklist;stage:JourneyStage;listing:{title:string;description:string};transaction:JourneyTransaction;
};
type Stored=Practice&{journey?:JourneyState;journeyReceipts?:Array<{accountId:string;key:string;digest:string}>};
export const emptyJourney=():JourneyState=>({
 profile:{seller:'',email:'',phone:'',address:'',cadastral:'',accessories:'',askingPrice:'',mandateStart:'',mandateEnd:'',commission:'',exclusive:''},
 mandateSourceId:null,mandateVersion:null,
 checklist:{answers:{},custom:[],assignments:{},waiting:[]},stage:'preparation',
 listing:{title:'',description:''},
 transaction:{buyer:'',offerPrice:'',outcome:'',mortgage:'',notary:'',closingDate:'',tasks:''},
});
function object(value:unknown,keys:string[]){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new PracticeError('invalid_input');
 return value as Record<string,unknown>;
}
function text(value:unknown,max=200):string{
 if(typeof value!=='string'||value.length>max||Array.from(value).some(char=>{const code=char.charCodeAt(0);return code<32&&![9,10,13].includes(code);}))throw new PracticeError('invalid_input');
 return value.trim();
}
function strings(value:unknown,max:number){
 if(!Array.isArray(value)||value.length>max)throw new PracticeError('invalid_input');
 const result=value.map(v=>text(v));
 if(new Set(result).size!==result.length)throw new PracticeError('invalid_input');
 return result;
}
function readable(actor:Actor,practice:Practice,id:string,now:string){
 const source=practice.sources.find(s=>s.id===id);
 if(!source||!sourceReadable(actor,practice,source,now))throw new PracticeError('access_denied');
 return source;
}
function record(value:unknown,validate:(v:unknown)=>string){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>100)throw new PracticeError('invalid_input');
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[text(k,100),validate(v)]));
}
export function journeyView(actor:Actor,practice:Practice,now:string){
 requirePractice(actor,practice,'read',now);
 const state=structuredClone((practice as Stored).journey??emptyJourney());
 const source=practice.sources.find(s=>s.id===state.mandateSourceId);
 const profileStale=!!state.mandateSourceId&&(!source||!sourceReadable(actor,practice,source,now)||source.versions.at(-1)?.version!==state.mandateVersion);
 if(profileStale){state.profile=emptyJourney().profile;state.mandateSourceId=null;state.mandateVersion=null;}
 const visible=new Set(practice.sources.filter(s=>sourceReadable(actor,practice,s,now)).map(s=>s.id));
 state.checklist.assignments=Object.fromEntries(Object.entries(state.checklist.assignments).filter(([id])=>visible.has(id)));
 return {revision:practice.revision,state,profileStale};
}
export function updateJourney(actor:Actor,original:Practice,value:unknown,now:string){
 requirePractice(actor,original,'edit',now);
 const input=object(value,['key','expectedRevision','command']),key=text(input.key,120);
 if(!key||!Number.isSafeInteger(input.expectedRevision))throw new PracticeError('invalid_input');
 const command=object(input.command,['operation','profile','sourceId','version','checklist','stage','listing','transaction']);
 const operation=text(command.operation,30),stored=original as Stored;
 const digest=createHash('sha256').update(JSON.stringify({expectedRevision:input.expectedRevision,command})).digest('hex');
 const prior=stored.journeyReceipts?.find(r=>r.accountId===actor.accountId&&r.key===key);
 if(prior){
  if(prior.digest!==digest)throw new PracticeError('idempotency_conflict');
  return {practice:original,replay:true};
 }
 if(original.revision!==input.expectedRevision)throw new PracticeError('revision_conflict');
 const next=structuredClone(original) as Stored,state=next.journey??emptyJourney();
 if(operation==='profile'){
  object(command,['operation','profile','sourceId','version']);
  const fields=Object.keys(emptyJourney().profile),profile=object(command.profile,fields);
  state.profile=Object.fromEntries(fields.map(field=>[field,text(profile[field]??'',500)])) as JourneyProfile;
  if(!state.profile.seller||!state.profile.address)throw new PracticeError('invalid_input');
  if(command.sourceId!==null){
   const source=readable(actor,original,text(command.sourceId,100),now);
   // Profile data are practice-wide. A private document cannot disclose its contents to other agents.
   if(source.visibility!=='practice')throw new PracticeError('access_denied');
   if(source.versions.at(-1)?.version!==command.version)throw new PracticeError('source_changed');
   state.mandateSourceId=source.id;state.mandateVersion=Number(command.version);state.checklist.assignments[source.id]='mandate';
  }else{state.mandateSourceId=null;state.mandateVersion=null;}
 }else if(operation==='checklist'){
  object(command,['operation','checklist']);
  const c=object(command.checklist,['answers','custom','assignments','waiting','purchaseRequests']);
  const answers=record(c.answers,v=>{if(!['yes','no','check'].includes(String(v)))throw new PracticeError('invalid_input');return v as string;});
  if(Object.keys(answers).some(id=>!['condo','mortgage','tenancy','succession'].includes(id)))throw new PracticeError('invalid_input');
  if(!Array.isArray(c.custom)||c.custom.length>50)throw new PracticeError('invalid_input');
  const baseIds=['mandate','identity','deed','cadastral','floor_plan','ape','building','condo','condo_statement','mortgage','tenancy','succession'];
  const custom=c.custom.map(v=>{const item=object(v,['id','label','when']);return {id:text(item.id,100),label:text(item.label,120),when:text(item.when,200)};});
  if(custom.some(v=>!v.id||!v.label||baseIds.includes(v.id))||new Set(custom.map(v=>v.id)).size!==custom.length)throw new PracticeError('invalid_input');
  const assignments=record(c.assignments,v=>text(v,100));
  const allowed=new Set([...baseIds,...custom.map(v=>v.id)]),waiting=strings(c.waiting,100);
  if(Object.values(assignments).some(id=>!allowed.has(id))||waiting.some(id=>!allowed.has(id)))throw new PracticeError('invalid_input');
  for(const id of Object.keys(assignments))readable(actor,original,id,now);
  // Preserve assignments the current actor is not entitled to inspect.
  const visible=new Set(original.sources.filter(s=>sourceReadable(actor,original,s,now)).map(s=>s.id));
  const hidden=Object.fromEntries(Object.entries(state.checklist.assignments).filter(([id])=>!visible.has(id)));
  const purchaseRequests=c.purchaseRequests===undefined?[]:strings(c.purchaseRequests,2);
  if(purchaseRequests.some(id=>!['floor_plan','cadastral'].includes(id)))throw new PracticeError('invalid_input');
  state.checklist={...(purchaseRequests.length?{purchaseRequests:purchaseRequests as Array<'floor_plan'|'cadastral'>}:{}),answers:answers as JourneyChecklist['answers'],custom,assignments:{...hidden,...assignments},waiting};
 }else if(operation==='stage'){
  object(command,['operation','stage']);
  if(!stages.includes(command.stage as JourneyStage))throw new PracticeError('invalid_input');
  state.stage=command.stage as JourneyStage;
 }else if(operation==='listing'){
  object(command,['operation','listing']);const listing=object(command.listing,['title','description']);
  state.listing={title:text(listing.title,200),description:text(listing.description,10000)};
 }else if(operation==='transaction'){
  object(command,['operation','transaction']);const fields=Object.keys(emptyJourney().transaction),transaction=object(command.transaction,fields);
  state.transaction=Object.fromEntries(fields.map(field=>[field,text(transaction[field]??'',field==='tasks'?4000:500)])) as JourneyTransaction;
 }else throw new PracticeError('invalid_input');
 next.journey=state;next.journeyReceipts??=[];
 if(next.journeyReceipts.length>=2000)throw new PracticeError('invalid_input');
 next.journeyReceipts.push({accountId:actor.accountId,key,digest});
 next.revision++;
 next.events.push({id:next.events.length+1,actorId:actor.accountId,at:now,operation:'journey:'+operation,sourceId:state.mandateSourceId??'',revision:next.revision});
 return {practice:next,replay:false};
}
