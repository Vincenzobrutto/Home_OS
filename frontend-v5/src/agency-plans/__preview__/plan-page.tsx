import {createRoot} from 'react-dom/client';
import {AgencyPracticePlanWorkspace} from '../AgencyPracticePlanWorkspace';
import type {AgencyPlan,AgencyPlanPort,PlansResponse} from '../api';
import type {PlanShape,Point} from '../PlanMeasurementView';
import {ApiError} from '../../api/errors';
import styles from '../practice-plan.module.css';

/*
 Synthetic planimetria page for local UI trials only.
 In-memory API persisted in sessionStorage so a reload simulates closing and reopening the practice.
 No network, no AI, no real document. Cases: ?case=fresh|ready|declared|noscale|noproposal
*/
type Case='fresh'|'ready'|'declared'|'noscale'|'noproposal';
const params=new URLSearchParams(location.search);
const scenario=(['fresh','ready','declared','noscale','noproposal'].includes(params.get('case')||'')?params.get('case'):'fresh') as Case;
const storageKey='dimora-synthetic-plan-page:'+scenario;
const W=1200,H=850;
const rect=(x0:number,y0:number,x1:number,y1:number):Point[]=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const room=(id:string,label:string,kind:string,points:Point[],symbols?:PlanShape['symbols']):PlanShape=>({id,label,kind,points,holes:[],...(symbols?{symbols}:{})});
function initialState():PlansResponse{
 const rooms=[
  room('soggiorno','Soggiorno','room',rect(114,134,500,626)),
  room('camera','Camera','room',rect(508,134,886,360)),
  room('disimpegno','Disimpegno','corridor',rect(508,368,886,440)),
  room('cucina','Cucina','kitchen',rect(508,448,700,626)),
  room('bagno','Bagno','bathroom',rect(708,448,886,626),[{id:'bagno-simbolo',reason:'Rettangolo con X vicino alla parete: possibile cavedio o doccia.',point:[797,537]}]),
  room('balcone','Balcone','balcony',rect(900,204,1056,516)),
 ];
 const proposal={points:[[100,120],[900,120],[932,662],[100,640]] as Point[],holes:[]};
 const plan:AgencyPlan={id:'synthetic-plan',version:1,status:'needs_review',proof:{sourceId:'synthetic-source',version:1,sha256:'b'.repeat(64),page:1},rasterSize:{width:W,height:H},geometryRevision:1,rooms,mainPerimeter:null,
  ...(scenario==='noproposal'?{}:{perimeterProposal:proposal}),
  issues:[{id:'bagno-simbolo',code:'symbol_unresolved',number:1},{id:'disimpegno',code:'opening_recovery_requires_review',number:2}],balconyCovers:[],measurementConfiguration:null,measurement:null};
 if(scenario==='ready'){plan.mainPerimeter={points:rect(100,120,900,640),holes:[]};plan.issues=[];plan.balconyCovers=[{id:'balcone',cover:'covered'}];plan.version=4;plan.geometryRevision=2;}
 return {revision:plan.version,plans:[plan]};
}
function load():PlansResponse{try{const raw=sessionStorage.getItem(storageKey);if(raw)return JSON.parse(raw) as PlansResponse;}catch{/* fresh state */}return initialState();}
let state=load();
function persist(){try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{/* memory only */}}
const receipts=new Map<string,string>();
function drawImage(){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d')!;
 c.fillStyle='#fff';c.fillRect(0,0,W,H);c.fillStyle='#222';
 const wall=(x0:number,y0:number,x1:number,y1:number)=>c.fillRect(x0,y0,x1-x0,y1-y0);
 wall(100,120,900,134);wall(100,626,900,640);wall(100,120,114,640);wall(886,120,900,640);
 wall(500,134,508,626);wall(508,360,886,368);wall(508,440,886,448);wall(700,448,708,626);
 c.clearRect(560,360,60,8);c.fillStyle='#fff';c.fillRect(560,360,60,8);c.fillRect(500,250,8,60);c.fillRect(600,440,60,8);c.fillRect(760,440,60,8);c.fillRect(886,260,14,70);
 c.strokeStyle='#222';c.lineWidth=3;c.strokeRect(900,200,160,320);
 c.lineWidth=2;c.strokeRect(760,500,70,70);c.beginPath();c.moveTo(760,500);c.lineTo(830,570);c.moveTo(830,500);c.lineTo(760,570);c.stroke();
 c.fillStyle='#222';c.font='24px sans-serif';
 c.fillText('Soggiorno',250,380);c.fillText('Camera',650,250);c.fillText('Disimpegno',630,412);c.fillText('Cucina',560,540);c.fillText('Bagno',720,610);c.fillText('Balcone',935,360);
 if(scenario==='declared'||scenario==='fresh'||scenario==='ready'||scenario==='noproposal')c.fillText('Scala 1:50',950,800);
 if(scenario!=='declared'&&scenario!=='noscale'){
  // 0..4 m bar at 1:50 on an A4 landscape sheet: 4 m = 323.2 px.
  const x0=100,y=740,step=80.8;
  c.fillRect(x0,y,step*4,6);
  c.font='34px Arial';
  for(let i=0;i<=4;i++){c.fillRect(x0+i*step-2,y-14,4,26);c.fillText(String(i),x0+i*step-8,y+54);}
  c.fillText('m',x0+step*4+30,y+54);
 }
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('fixture image')),'image/png'));
}
function apply(plan:AgencyPlan,command:Record<string,unknown>){
 if(command.operation==='geometry'){
  const geometry=structuredClone(command.geometry) as {points:Point[];holes:Point[][]};
  if(command.view==='perimeter')plan.mainPerimeter=geometry;else plan.rooms=plan.rooms!.map(r=>r.id===command.id?{...r,...geometry}:r);
  plan.geometryRevision=(plan.geometryRevision||1)+1;plan.measurement=null;
 }else if(command.operation==='add_room'){
  const geometry=command.geometry as {points:Point[];holes:Point[][]};
  plan.rooms=[...plan.rooms!,{id:String(command.id),label:String(command.label),kind:String(command.kind),points:geometry.points,holes:geometry.holes}];plan.geometryRevision=(plan.geometryRevision||1)+1;plan.measurement=null;
 }else if(command.operation==='remove_room'){
  plan.rooms=plan.rooms!.filter(r=>r.id!==command.id);plan.balconyCovers=plan.balconyCovers?.filter(c=>c.id!==command.id);plan.geometryRevision=(plan.geometryRevision||1)+1;plan.measurement=null;
 }else if(command.operation==='resolve_issue'){
  plan.issues=plan.issues?.filter(i=>!(i.id===command.issueId&&i.code===command.code));
 }else if(command.operation==='save_quick_estimate'){
  const outline=command.outline as {view:'rooms'|'perimeter';id:string;geometry:{points:Point[];holes:Point[][]}}|undefined;
  if(outline){
   if(outline.view==='perimeter')plan.mainPerimeter=outline.geometry;
   else plan.rooms=plan.rooms!.map(room=>room.id===outline.id?{...room,...outline.geometry}:room);
   plan.geometryRevision=(plan.geometryRevision||1)+1;
   plan.measurement=null;
  }
  const saved=new Map((plan.balconyCovers??[]).map(c=>[c.id,c]));
  for(const entry of command.covers as NonNullable<AgencyPlan['balconyCovers']>)saved.set(entry.id,entry);
  plan.balconyCovers=[...saved.values()];
  plan.quickEstimate={...(command.scale?{scale:structuredClone(command.scale) as NonNullable<AgencyPlan['quickEstimate']>['scale']}:{}),...(command.parameters?{parameters:structuredClone(command.parameters) as NonNullable<AgencyPlan['quickEstimate']>['parameters']}:{}),savedAt:new Date().toISOString(),geometryRevision:plan.geometryRevision||1};
 }else if(command.operation==='measure'){
  plan.measurementConfiguration=structuredClone(command.configuration) as AgencyPlan['measurementConfiguration'];
  plan.measurement={totalM2:null,partialM2:0,issues:['synthetic_preview_always_incomplete'],status:'incomplete',certification:false};
 }else throw new ApiError({kind:'http',status:422,code:'unsupported',message:'Fixture'});
}
const api:AgencyPlanPort={
 practice:async()=>({id:'synthetic-practice',label:'Pratica sintetica · collaudo planimetria',revision:state.revision,documents:[{id:'synthetic-source',filename:'planimetria-sintetica.png',kind:'floor_plan',visibility:'private',version:1}]}),
 plans:async()=>structuredClone(state),
 image:async()=>drawImage(),
 preview:async(id,body)=>{const copy=structuredClone(state),plan=copy.plans.find(p=>p.id===id)!;apply(plan,body.command);return {plans:copy};},
 edit:async(id,body,key)=>{
  const digest=JSON.stringify(body),prior=receipts.get(key);
  if(prior){if(prior!==digest)throw new ApiError({kind:'http',status:409,code:'idempotency_conflict',message:'Fixture'});return {replay:true,plans:structuredClone(state)};}
  const plan=state.plans.find(p=>p.id===id)!;
  if(body.expectedRevision!==state.revision||body.expectedPlanVersion!==plan.version)throw new ApiError({kind:'http',status:409,code:'revision_conflict',message:'Fixture'});
  apply(plan,body.command);plan.version++;state={...state,revision:state.revision+1};receipts.set(key,digest);persist();
  return {replay:false,plans:structuredClone(state)};
 },
};
function reset(){try{sessionStorage.removeItem(storageKey);}catch{/* ignore */}location.reload();}
createRoot(document.getElementById('root')!).render(<>
 <aside style={{padding:'10px 16px',background:'#fff1d6',fontFamily:'system-ui',fontSize:14}}>Collaudo locale con dati sintetici ({scenario}). API in memoria, ricarica = riapertura della pratica. Nessuna AI. <button type="button" onClick={reset}>Ripristina caso</button></aside>
 <div className={styles.workspace}><AgencyPracticePlanWorkspace embedded api={api} scopeKey={'synthetic-page:'+scenario}/></div>
</>);
