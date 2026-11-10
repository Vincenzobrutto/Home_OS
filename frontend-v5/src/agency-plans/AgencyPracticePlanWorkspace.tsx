import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ListingPlanDraft,QuickEstimateInput} from './api';
import {ApiError} from '../api/errors';
import type {AgencyPlanPort,AgencyPractice,PlanEditBody,PlansResponse} from './api';
import {PlanMeasurementView,type PlanShape} from './PlanMeasurementView';
import {MeasurementForm} from './MeasurementForm';
import {QuickSurfaceEstimate,doubleCountIds,type GrossOutline,type ScaleSelection} from './QuickSurfaceEstimate';
import {isAppurtenance} from './scaleDetection';
import type {Point} from './PlanMeasurementView';
import {ManualRoomCreator} from './ManualRoomCreator';
import {ListingPlanExport,listingScale} from './ListingPlanExport';
import {ListingPlanReview} from './ListingPlanReview';
import {PlanIssueReview,type Resolution} from './PlanIssueReview';
import {PolygonBuilder} from './PolygonBuilder';
import styles from './practice-plan.module.css';
type Change={view:'rooms'|'perimeter';shape:PlanShape};
type Builder={initial:PlanShape|null;mode:'polygon'|'segment'|'point';pointLabel?:string;done:(shape:PlanShape)=>void};
type Pending={key:string;id:string;body:PlanEditBody;afterSave?:()=>void};
function carryIssueNumbers(next:PlansResponse,previous?:PlansResponse):PlansResponse{
 return {...next,plans:next.plans.map(plan=>{
  if(!plan.issues?.some(issue=>issue.number===undefined))return plan;
  const old=previous?.plans.find(item=>item.id===plan.id&&item.proof.sha256===plan.proof.sha256);
  const key=(issue:{id:string;code:string})=>JSON.stringify([issue.id,issue.code]);
  const numbers=new Map((old?.issues??[]).filter(issue=>issue.number!==undefined).map(issue=>[key(issue),issue.number!]));
  let last=Math.max(0,...numbers.values(),...plan.issues.map(issue=>issue.number??0));
  return {...plan,issues:plan.issues.map(issue=>{
   const id=key(issue),number=issue.number??numbers.get(id)??++last;
   numbers.set(id,number);
   return {...issue,number};
  })};
 })};
}
const kinds:Record<string,string>={floor_plan:"Planimetria",deed:"Atto",cadastral:"Visura",succession:"Successione",ape:"APE",other:"Altro",unclassified:"Da classificare"};
const issueLabels:Record<string,string>={coverage_candidate_pending:'Sono presenti aree plausibili non ancora assegnate: confronta la proposta prima di confermare la completezza.',coverage_search_limited:'Ricerca delle aree limitata: verifica manualmente la completezza.',coverage_area_requires_review:'Area individuata dai pixel: verifica destinazione, appartenenza e contorno; non è ancora un vano confermato.',coverage_area_conflict:'Un’area non assegnata interferisce con una correzione proposta: verifica manualmente.',contrast_requires_review:'Controlla che i contorni recuperati dai tratti chiari seguano i muri.',surface_proposal_unresolved:'Le correzioni automatiche richiedono una verifica manuale.',surface_interior_review_required:'Controlla gli elementi interni al perimetro proposto.',exterior_use_and_association_require_review:'Verifica destinazione e appartenenza della fascia esterna.',opening_recovery_requires_review:'Una porta è stata chiusa virtualmente per recuperare il vano: controlla soglia e contorno sull’originale.',opening_requires_review:'Una possibile porta non ha superato i controlli automatici: verifica apertura e stipiti.',semantic_regions_merged:'Due vani proposti risultano uniti: verifica se separarli manualmente.',region_overlap:"Due contorni si sovrappongono: correggili prima del computo.",seed_region_unresolved:"Un vano non è delimitato: verifica il suo contorno.",symbol_unresolved:"Un simbolo interno richiede una decisione di inclusione o esclusione.",symbol_extent_unresolved:"Verifica la porzione occupata dal simbolo.",duplicate_classification_conflict:"Una zona è assegnata a più categorie: verifica la destinazione.",polygon_unresolved:"Il bordo non è leggibile: ricalca il contorno.",raster_topology_unresolved:"Il bordo non è chiuso: verifica il contorno."};
/** Opt-in practice surface. The caller supplies the authenticated, scoped API port. */
type WorkspaceProps={api:AgencyPlanPort;scopeKey:string;readOnly?:boolean;onSaved?:()=>void;embedded?:boolean};
export function AgencyPracticePlanWorkspace(p:WorkspaceProps){return <Workspace key={p.scopeKey} {...p}/>;}
function Workspace(p:WorkspaceProps){
 const [quickScale,setQuickScale]=useState<{key:string;selection:ScaleSelection}|null>(null);
 const [manualMode,setManualOpen]=useState<boolean|'balcony'>(false);
 const manualOpen=!!manualMode;
 const [task,setTask]=useState<'draw'|'measure'|'listing'>(p.embedded?'draw':'measure');
 const [taskChosen,setTaskChosen]=useState(false);
 const [graphics,setGraphics]=useState(false);
 const [toolbarHost,setToolbarHost]=useState<HTMLDivElement|null>(null);
 useLayoutEffect(()=>{
  const commands=toolbarHost?.parentElement;
  const editor=commands?.parentElement;
  if(!commands||!editor)return;
  const updateHeight=()=>editor.style.setProperty('--plan-command-height',commands.offsetHeight+'px');
  updateHeight();
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(updateHeight);
  observer?.observe(commands);
  return ()=>{observer?.disconnect();editor.style.removeProperty('--plan-command-height');};
 },[toolbarHost]);
 const [focus,setFocus]=useState<{id:string;point?:Point;preferSingleHole?:boolean;key:number;issueKey?:string;number?:number;wholePage?:boolean}|null>(null);
 const [candidateChoices,setCandidateChoices]=useState<{key:string;excluded:string[]}>({key:'',excluded:[]});
 const [previewKey,setPreviewKey]=useState(''),[reviewedKey,setReviewedKey]=useState('');
 const [data,setData]=useState<{practice:AgencyPractice;plans:PlansResponse}|null>(null),[loading,setLoading]=useState(true),[reload,setReload]=useState(0),[selected,setSelected]=useState(''),[image,setImage]=useState<{key:string;url:string}|null>(null),[error,setError]=useState(''),[draft,setDraft]=useState<Change|null>(null),[configDirty,setConfigDirty]=useState(false),[builder,setBuilder]=useState<Builder|null>(null),[reason,setReason]=useState(''),[pending,setPending]=useState<Pending|null>(null),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[notice,setNotice]=useState('');
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const failure=useCallback((e:unknown)=>{if(!alive.current)return;if(e instanceof ApiError&&[401,403].includes(e.status)){setData(null);setError('Accesso non disponibile. Ricarica la pratica con la sessione corretta.');}else if(e instanceof ApiError&&e.status===409){setConflict(true);if(e.code==='source_changed')setData(null);setError('La pratica o il documento sono cambiati. Ricarica prima di continuare.');}else setError('Operazione non conclusa. Puoi riprovare o ricaricare la pratica.');},[]);
 useEffect(()=>{let active=true;const c=new AbortController();Promise.all([p.api.practice(c.signal),p.api.plans(c.signal)]).then(([practice,plans])=>{if(active){setData(previous=>({practice,plans:carryIssueNumbers(plans,previous?.plans)}));setLoading(false);}}).catch(e=>{if(active){failure(e);setLoading(false);}});return()=>{active=false;c.abort();};},[p.api,reload,failure]);
 const plan=data?.plans.plans.find(s=>s.id===selected)||data?.plans.plans[0];
 const imageKey=plan?.rooms&&plan.rasterSize?`${plan.id}:${plan.proof.version}:${plan.proof.sha256}:${reload}`:'';
 const planId=plan?.id;
 const rasterSize=plan?.rasterSize;
 useEffect(()=>{if(!imageKey||!planId)return;let active=true,url:string|undefined;const c=new AbortController();p.api.image(planId,c.signal).then(blob=>{if(active){url=URL.createObjectURL(blob);setImage({key:imageKey,url});}}).catch(e=>{if(active)failure(e);});return()=>{active=false;c.abort();if(url)URL.revokeObjectURL(url);};},[p.api,imageKey,reload,planId,failure]);
 const scaleKey=plan?plan.id+':'+plan.proof.version+':'+plan.proof.sha256+':'+JSON.stringify([plan.measurementConfiguration?.calibration,plan.quickEstimate?.scale]):'';
 const savedQuickScale=plan?.quickEstimate?.scale;
 const scaleSelection:ScaleSelection=quickScale?.key===scaleKey?quickScale.selection:savedQuickScale?.mode==='manual'?{mode:'manual',segment:[savedQuickScale.start,savedQuickScale.end]}:savedQuickScale?.mode==='paper'?{mode:'paper',segment:null}:{mode:'auto',segment:null};
 const sourceUrl=image?.key===imageKey?image.url:'';
 const proposal=plan?.surfaceProposal,proposalKey=plan&&proposal?plan.id+':'+proposal.digest:'',proposalAvailable=proposal?.state==='pending'&&proposal.baseGeometryRevision===(plan?.geometryRevision||1),showProposal=proposalAvailable&&previewKey===proposalKey;
 const excludedIds=candidateChoices.key===proposalKey?candidateChoices.excluded:[];
 const locked=!!p.readOnly||busy||!!pending||conflict;
 function refresh(){setFocus(null);setQuickScale(null);setCandidateChoices({key:'',excluded:[]});setPreviewKey('');setReviewedKey('');setDraft(null);setConfigDirty(false);setBuilder(null);setPending(null);setConflict(false);setError('');setNotice('');setLoading(true);setReload(v=>v+1);}
 async function send(request:Pending){setBusy(true);setError('');try{const r=await p.api.edit(request.id,request.body,request.key);if(!alive.current)return;setData(v=>v?{...v,plans:carryIssueNumbers(r.plans,v.plans)}:v);setPending(null);setCandidateChoices({key:'',excluded:[]});setPreviewKey('');setReviewedKey('');setDraft(null);setConfigDirty(false);setReason('');request.afterSave?.();setNotice(r.replay?'Salvataggio già ricevuto dal server.':request.body.command.operation==='save_quick_estimate'?'Stima salvata nella pratica.':'Modifiche salvate nella pratica.');if(request.body.command.operation==='save_plan_graphics')setGraphics(false);p.onSaved?.();}catch(e){if(e instanceof ApiError&&e.status===422){setPending(null);setError('Controlla scala, contorni e conferme: nessuna modifica è stata salvata.');}else failure(e);}finally{if(alive.current)setBusy(false);}}
 function save(command:Record<string,unknown>,reviewReason?:string,afterSave?:()=>void){if(!data||!plan||locked||(showProposal&&command.operation!=='apply_surface_proposal'))return;const editReason=reviewReason||reason.trim()||(command.operation==='measure'?'Calcolo della superficie commerciale':command.operation==='geometry'?'Correzione del contorno sul documento originale':command.operation==='remove_room'?'Vano rimosso durante la revisione grafica':'');if(!editReason){setError('Indica il motivo della modifica.');return;}const request={key:crypto.randomUUID(),id:plan.id,afterSave,body:{expectedRevision:data.plans.revision,expectedPlanVersion:plan.version,reason:editReason,command}};setPending(request);void send(request);}
 function change(view:Change['view'],shape:PlanShape){if(locked||showProposal)return;if(draft&&(draft.view!==view||draft.shape.id!==shape.id)){setError('Salva il contorno corrente prima di modificare un altro vano.');return;}setDraft({view,shape});setNotice('');}
 function polygon(initial:PlanShape|null,done:(s:PlanShape)=>void,mode:'polygon'|'segment'='polygon'){if(locked||draft||showProposal)return;setBuilder({initial,mode,done:s=>{setConfigDirty(true);done(s);}});}
 const rooms=plan?.rooms?.map(r=>draft?.view==='rooms'&&draft.shape.id===r.id?draft.shape:r)||[],perimeter=draft?.view==='perimeter'?draft.shape:plan?.mainPerimeter?{...plan.mainPerimeter,id:'gross',label:'Perimetro lordo'}:null;
 const describeIssue=(issue:{id:string;code:string})=>{const label=(showProposal?proposal!.rooms:rooms).find(r=>r.id===issue.id)?.label;return(label?label+' · ':'')+(issueLabels[issue.code]||'Una zona richiede controllo manuale.');};
 function saveGeometry(){if(draft)save({operation:'geometry',view:draft.view,id:draft.shape.id,geometry:{points:draft.shape.points,holes:draft.shape.holes}});}
 function removeRoom(shape:PlanShape){if(!draft)save({operation:'remove_room',id:shape.id});}
 function createPerimeter(){if(!locked&&!showProposal&&!draft&&!configDirty)setBuilder({initial:null,mode:'polygon',done:s=>change('perimeter',{...s,id:'gross',label:'Perimetro lordo'})});}
 const scaleBusy=locked||showProposal||!!draft||!!builder||configDirty||manualOpen;
 function selectScale(selection:ScaleSelection){setQuickScale({key:scaleKey,selection});}
 const suggestedPerimeter:PlanShape|null=plan?.perimeterProposal?{...plan.perimeterProposal,id:'gross',label:'Perimetro lordo proposto'}:null;
 function planView(drawing:boolean,reviewPerimeter=false){if(!plan?.rasterSize)return null;return <PlanMeasurementView hideRoomSummary={p.embedded} initialView={reviewPerimeter?'perimeter':undefined} simple={!!p.embedded&&drawing} onAddRoom={p.embedded&&drawing&&p.api.preview?()=>setManualOpen(true):undefined} hasUnsavedChanges={!!draft} onSaveGeometry={p.embedded&&drawing?saveGeometry:undefined} drawingOnly={drawing} onRemoveRoom={drawing?removeRoom:undefined} scopeKey={`${p.scopeKey}:${plan.id}:${plan.version}:${showProposal?"proposal":"saved"}`} sourceUrl={sourceUrl} width={plan.rasterSize.width} height={plan.rasterSize.height} rooms={showProposal?proposal!.rooms:rooms} perimeter={perimeter??(reviewPerimeter?suggestedPerimeter:null)} candidateIds={showProposal?proposal!.coverage?.candidateIds:undefined} excludedCandidateIds={showProposal?excludedIds:undefined} configuration={showProposal?null:plan.measurementConfiguration} measurement={!showProposal&&!draft&&!configDirty&&Number.isSafeInteger(plan.geometryRevision)&&plan.measurement?.geometryRevision===plan.geometryRevision?plan.measurement:null} measurementsOutdated={!!draft||configDirty||showProposal||(!!plan.measurementConfiguration&&!plan.measurement)} issues={!showProposal?[]:(showProposal?proposal!.issues.filter(i=>!(excludedIds.includes(i.id)&&i.code==='coverage_area_requires_review')):plan.issues||[]).map(describeIssue)} readOnly={locked||showProposal||configDirty||!!builder} onChange={change} onCreatePerimeter={createPerimeter}/>;}
 // ---- Embedded agency page: one working map, three tasks, contextual side panel. ----
 const dirtyLocal=!!draft||configDirty;
 useEffect(()=>{
  if(!p.embedded||!dirtyLocal)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[p.embedded,dirtyLocal]);
 // First data for this scope: open the calculation directly when the plan has nothing left to correct.
 if(p.embedded&&!taskChosen&&plan?.rooms){
  setTaskChosen(true);
  if(!plan.issues?.length&&plan.rooms.length&&plan.mainPerimeter&&!proposalAvailable)setTask('measure');
 }
 const gross:GrossOutline|null=draft?.view==='perimeter'?{shape:draft.shape,status:'draft'}:plan?.mainPerimeter?{shape:{...plan.mainPerimeter,id:'gross',label:'Perimetro lordo'},status:'saved'}:suggestedPerimeter?{shape:{...suggestedPerimeter,label:'Perimetro lordo proposto'},status:'proposed'}:null;
 function saveEstimate(payload:QuickEstimateInput){
  const editedOutline=draft??(gross?.status==='proposed'?{view:'perimeter',shape:gross.shape}:null);
  const outline=editedOutline?{view:editedOutline.view,id:editedOutline.shape.id,geometry:{points:editedOutline.shape.points,holes:editedOutline.shape.holes}}:undefined;
  save({operation:'save_quick_estimate',...payload,...(outline?{outline}:{})},'Stima rapida delle superfici');
 }
 function resolveIssue(issue:{id:string;code:string},resolution:Resolution,reviewReason:string){setFocus(null);save({operation:'resolve_issue',issueId:issue.id,code:issue.code,resolution},reviewReason);}
 function adoptProposal(){if(proposal)save({operation:'apply_surface_proposal',proposalDigest:proposal.digest,...(excludedIds.length?{excludedCandidateIds:excludedIds}:{})});}
 function show(id:string,point?:Point,preferSingleHole=false,review?:{issueKey:string;number:number;wholePage?:boolean}){
  setFocus(current=>({id,point,preferSingleHole,key:(current?.key??0)+1,...review}));
 }
 function locateIssue(issue:{id:string;code:string},issueKey:string,number:number){
  setBuilder({
   initial:null,mode:'point',pointLabel:'Posiziona verifica '+number,
   done:shape=>{
    const picked=shape.points[0];
    if(picked)save({operation:'locate_issue',issueId:issue.id,code:issue.code,point:picked},'Posizione della verifica sulla tavola',
     ()=>show(issue.id,picked,false,{issueKey,number}));
   },
  });
 }
 function saveListing(details:ListingPlanDraft){
  save({operation:'save_listing_details',...details},'Revisione dettagli della planimetria per annuncio');
 }
 function saveGraphics(details:ListingPlanDraft){
  save({operation:'save_plan_graphics',...details},'Revisione grafica della planimetria');
 }
 function embeddedPage(){
  if(!data||!plan||!rasterSize||!plan.rooms)return null;
  const issues=plan.issues??[];
  const entries=[...new Map(issues.map(issue=>[JSON.stringify([issue.id,issue.code]),issue])).values()].map((issue,index)=>{
   const opening=plan.openingReviews?.find(item=>item.id===issue.id);
   const matches=(item:PlanShape)=>item.id===issue.id||item.id===opening?.spaceId||item.symbols?.some(symbol=>symbol.id===issue.id);
   const savedRoom=rooms.find(matches);
   const proposedRoom=proposal?.rooms.find(matches);
   const room=savedRoom??proposedRoom;
   const symbol=room?.symbols?.find(item=>item.id===issue.id);
   const location=plan.reviewLocations?.find(item=>item.id===issue.id);
   const candidate=plan.coverage?.candidates.find(item=>item.region.id===issue.id);
   const threshold=opening?.threshold;
   const precisePoint=symbol?.point??(threshold?[(threshold.start[0]+threshold.end[0])/2,(threshold.start[1]+threshold.end[1])/2] as Point:undefined);
   const candidatePoint=candidate?.region.seed??undefined;
   const point=issue.manualPoint??precisePoint??candidatePoint??location?.point;
   const canEdit=!!savedRoom&&!p.readOnly;
   const visibleRoom=showProposal&&!canEdit?proposedRoom:savedRoom;
   const issueKey=JSON.stringify([plan.id,issue.id,issue.code]);
   return {issue,issueKey,roomLabel:room?.label??location?.label,symbol,visibleRoom,point,approximate:!issue.manualPoint&&!precisePoint&&!candidatePoint&&!!location,canEdit,number:issue.number??index+1};
  });
  const switchBlocked=manualOpen||!!builder||!!draft||configDirty||!!pending||busy;
  const accessories=rooms.filter(isAppurtenance),principals=rooms.filter(room=>!isAppurtenance(room));
  const drawStep=!rooms.length?'Aggiungi il primo vano sulla mappa.':entries.length?`Controlla ${entries.length===1?'la verifica aperta':`le ${entries.length} verifiche aperte`}: seleziona una scheda per vedere il punto o il contorno sulla mappa.`:'Nessuna verifica aperta: passa a Calcola superfici.';
  const measureStep=!gross?'Nessun perimetro proposto: disegnalo sulla mappa, oppure usa la stima dai vani.':gross.status==='proposed'?'Controlla il perimetro proposto sulla mappa, scegli la copertura dei balconi e premi Salva stima.':gross.status==='draft'?'Perimetro modificato: premi Salva stima per confermarlo.':plan.quickEstimate?'Stima salvata. Selezionando un contorno puoi correggerlo: la stima si aggiorna da sola.':'Scegli la copertura dei balconi e premi Salva stima.';
  const nextStep=task==='draw'?drawStep:task==='measure'?measureStep:'Controlla l’anteprima, conferma che la pianta è completa e scarica l’immagine.';
  const tasks=[['draw','Modifica pianta'],['measure','Calcola superfici'],['listing','Pianta per annuncio']] as const;
  const measuring=task==='measure';
  const listingDetails=plan.listingDetails?.geometryRevision===plan.geometryRevision?plan.listingDetails:undefined;
  const scaleInputs={width:rasterSize.width,height:rasterSize.height,scale:plan.quickEstimate?.scale,calibration:plan.measurementConfiguration?.calibration};
  const openingHints=plan.openingReviews?.flatMap(({threshold})=>threshold?[{kind:'door' as const,start:threshold.start,end:threshold.end}]:[]);
  const listingReview=sourceUrl?{
   sourceUrl,...scaleInputs,hints:openingHints,
  }:undefined;
  const map=sourceUrl?<PlanMeasurementView
   key={measuring?'commercial':'rooms'}
   simple drawingOnly={!measuring}
   scopeKey={`${p.scopeKey}:${plan.id}:${plan.version}:${showProposal?'proposal':'saved'}:${task}`}
   sourceUrl={sourceUrl} width={rasterSize.width} height={rasterSize.height}
   rooms={showProposal?proposal!.rooms:measuring?accessories:rooms}
   perimeter={measuring?gross?.shape??null:null}
   contextShapes={measuring?principals:undefined}
   warnIds={measuring?doubleCountIds(rooms,gross?.shape??null):undefined}
   mapLabel={measuring?'Perimetro lordo e pertinenze':undefined}
   candidateIds={showProposal?proposal!.coverage?.candidateIds:undefined} excludedCandidateIds={showProposal?excludedIds:undefined}
   issues={[]} focus={focus}
   readOnly={locked||showProposal||configDirty||!!builder}
   hasUnsavedChanges={!!draft}
   onChange={change} onCreatePerimeter={createPerimeter}
   onRemoveRoom={removeRoom}
   onDiscard={()=>{setDraft(null);setError('');}}
   onAddRoom={!measuring&&p.api.preview?()=>setManualOpen(true):undefined}
   onSaveGeometry={measuring?undefined:saveGeometry}
   toolbarHost={toolbarHost}
   toolbarActions={measuring?<>
    {p.api.preview&&<button type="button" disabled={scaleBusy} onClick={()=>setManualOpen('balcony')}>Aggiungi balcone</button>}
    {!gross&&<button type="button" disabled={scaleBusy} onClick={createPerimeter}>Disegna perimetro</button>}
   </>:rooms.length>0?<button type="button" disabled={locked||switchBlocked||showProposal} onClick={()=>{setError('');setGraphics(true);}}>Apri editor grafico</button>:undefined}
  />:<p>Anteprima allineata non disponibile. Nessun contorno viene sovrapposto a un’immagine non verificata.</p>;
  return <>
   <p className={styles.planStatus}>{rooms.length} {rooms.length===1?'vano':'vani'} · {entries.length} {entries.length===1?'verifica aperta':'verifiche aperte'}{plan.quickEstimate?' · stima salvata':''}{data.plans.plans.length>1?` · pagina ${plan.proof.page}`:''}</p>
   {data.plans.plans.length>1&&<label>Planimetria<select value={plan.id} disabled={switchBlocked||showProposal} onChange={e=>{setSelected(e.target.value);setFocus(null);setError('');}}>{data.plans.plans.map((s,i)=><option key={s.id} value={s.id}>Planimetria {i+1} · pagina {s.proof.page}</option>)}</select></label>}
   <div className={styles.planCommands}>
   <div className={styles.planModes} role="group" aria-label="Attività sulla planimetria">
    {tasks.map(([id,label])=><button key={id} type="button" aria-pressed={task===id} disabled={task!==id&&(switchBlocked||showProposal&&id!=='draw')} onClick={()=>{setTask(id);setFocus(null);}}>{label}</button>)}
   </div>
   <div className={styles.planToolbarHost} ref={setToolbarHost}/>
   </div>
   <p className={styles.nextStep} aria-live="polite">{draft&&task==='draw'?'Modifiche da salvare: salva o scarta prima di cambiare attività.':nextStep}</p>
   <div className={styles.planLayout}>
    <div className={styles.planMapColumn}>
    {task==='draw'&&graphics&&sourceUrl&&<ListingPlanReview key={plan.id} sourceUrl={sourceUrl} width={rasterSize.width} height={rasterSize.height} hints={openingHints} editPlan saveError={error} rooms={plan.rooms} saved={listingDetails} metresPerPixel={listingScale(scaleInputs)} scaleLabel={scaleInputs.scale?'Scala salvata in Calcola superfici':'Scala del computo'} disabled={locked} onClose={()=>setGraphics(false)} onApply={saveGraphics}/>}
    {task==='listing'?<ListingPlanExport key={plan.id+':'+plan.version} rooms={plan.rooms} details={listingDetails} review={listingReview} onSave={saveListing} disabled={locked||!!draft} autoPreview/>:map}
    </div>
    <aside className={styles.planSide} aria-label={task==='draw'?'Verifiche e correzioni':task==='measure'?'Superfici':'Annuncio'}>
     {task==='draw'&&<>
      {proposalAvailable&&<section className={styles.panelSection} aria-label="Correzioni proposte"><h4>Contorni proposti da controllare</h4>
       <p>Dimora propone contorni corretti{proposal!.summary.unassignedAreas?` e ${proposal!.summary.unassignedAreas} aree non censite`:''}. Confrontali con l’originale prima di adottarli.</p>
       <button type="button" disabled={busy||!!pending||conflict||!!draft||configDirty||!!builder||manualOpen} onClick={()=>{setPreviewKey(showProposal?'':proposalKey);setReviewedKey('');}}>{showProposal?'Torna ai contorni salvati':'Confronta i contorni proposti'}</button>
       {showProposal&&<>
        <p>Per modificare un vano, torna ai contorni salvati.</p>
        {!!proposal!.coverage?.candidateIds.length&&<fieldset disabled={locked}><legend>Aree da scartare</legend>{proposal!.coverage!.candidateIds.map(id=>{const area=proposal!.rooms.find(r=>r.id===id);return area?<label key={id}><input type="checkbox" checked={excludedIds.includes(id)} onChange={e=>{setCandidateChoices({key:proposalKey,excluded:e.target.checked?[...new Set([...excludedIds,id])]:excludedIds.filter(v=>v!==id)});setReviewedKey('');}}/> Scarta {area.label}</label>:null;})}</fieldset>}
        <label><input type="checkbox" checked={reviewedKey===proposalKey} disabled={locked} onChange={e=>setReviewedKey(e.target.checked?proposalKey:'')}/> Ho confrontato i contorni con l’originale</label>
        <label>Motivo<input value={reason} disabled={locked} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>
        <button type="button" className={styles.primaryButton} disabled={locked||reviewedKey!==proposalKey||!reason.trim()} onClick={adoptProposal}>Adotta i contorni proposti</button>
       </>}
      </section>}
      <section className={styles.panelSection} aria-labelledby="issues-heading"><h4 id="issues-heading">Verifiche aperte · {entries.length}</h4>
       {!entries.length?<p>Nessuna verifica aperta.</p>:<>
        {draft&&<p className={styles.muted}>Salva il contorno in modifica per chiudere le verifiche.</p>}
        <ul className={styles.issueList}>{entries.map(({issue,issueKey,roomLabel,symbol,visibleRoom,point,approximate,canEdit,number})=>{
         const lacksLocation=!visibleRoom&&!point;
         const canLocate=lacksLocation&&!locked&&!showProposal;
         function openCheck(){
          if(canLocate){locateIssue(issue,issueKey,number);return;}
          if(canEdit&&showProposal){setPreviewKey('');setReviewedKey('');}
          show(visibleRoom?.id??issue.id,point,!!symbol,{issueKey,number,wholePage:lacksLocation});
         }
         const showLabel=canEdit?'Modifica contorno':canLocate?'Posiziona verifica '+number:lacksLocation?'Apri la tavola originale':undefined;
         return <PlanIssueReview key={issueKey} index={number}
          roomLabel={roomLabel} symbolReason={symbol?.reason} approximate={approximate} active={focus?.issueKey===issueKey}
          description={issueLabels[issue.code]||'Una zona richiede controllo manuale.'}
          wholePage={lacksLocation} onShow={sourceUrl?openCheck:undefined} showLabel={showLabel} showDisabled={switchBlocked||conflict}
          disabled={locked||!!draft||configDirty||showProposal||!!builder||manualOpen}
          geometryEdited={(plan.geometryRevision||1)>1}
          issue={issue} onResolve={resolveIssue}/>;
        })}</ul>
       </>}
      </section>
      {proposal?.state==='applied'&&<p role="status">Correzioni adottate. Verifica gli elementi interni prima del computo.</p>}
     </>}
     {sourceUrl&&<div hidden={task!=='measure'}><QuickSurfaceEstimate key={scaleKey} selection={scaleSelection} onSelection={selectScale} active={task==='measure'}
      sourceUrl={sourceUrl} width={rasterSize.width} height={rasterSize.height} rooms={rooms} gross={gross}
      balconyCovers={plan.balconyCovers} saved={plan.quickEstimate} configuration={plan.measurementConfiguration}
      busy={locked||showProposal||!!builder||manualOpen}
      requestSegment={done=>{if(locked||showProposal)return;setBuilder({initial:null,mode:'segment',done:s=>{if(s.points[0]&&s.points[1])done(s.points[0],s.points[1]);}});}}
      onSave={saveEstimate} onFocus={id=>show(id)}
      onAddBalcony={p.api.preview?()=>setManualOpen('balcony'):undefined}
      onDrawPerimeter={createPerimeter}
      advanced={<MeasurementForm key={`${plan.id}:${plan.geometryRevision}:${plan.measurementConfiguration?'configured':'empty'}`} rooms={rooms} rasterSize={rasterSize} hasPerimeter={!!plan.mainPerimeter} configuration={plan.measurementConfiguration} needsRecalculation={!!plan.measurementConfiguration&&!plan.measurement} busy={locked||showProposal||!!draft||!!builder} onDirty={()=>setConfigDirty(true)} requestPolygon={(initial,done)=>polygon(initial,done)} requestSegment={done=>polygon(null,s=>{if(s.points[0]&&s.points[1])done(s.points[0],s.points[1]);},'segment')} onSave={configuration=>save({operation:'measure',configuration})}/>}
     /></div>}
     {task==='listing'&&<section className={styles.panelSection}><h4>Pianta per l’annuncio</h4>
      <p>L’immagine usa solo i contorni e i nomi dei vani salvati: niente intestazione, dati catastali o personali del PDF.</p>
      {draft&&<p className={styles.muted}>Salva il contorno in modifica per aggiornare l’immagine.</p>}
      {!!entries.length&&<p className={styles.muted}>Restano {entries.length} verifiche aperte: controlla che la pianta sia completa prima di pubblicarla.</p>}
     </section>}
    </aside>
   </div>
   {manualOpen&&sourceUrl&&<ManualRoomCreator initialKind={manualMode==='balcony'?'balcony':undefined} api={p.api} plan={plan} revision={data.plans.revision} sourceUrl={sourceUrl} onClose={()=>setManualOpen(false)} onReload={()=>{setManualOpen(false);refresh();}} onDenied={failure} onSaved={(plans,id)=>{setData(v=>v?{...v,plans:carryIssueNumbers(plans,v.plans)}:v);setManualOpen(false);setNotice(manualMode==='balcony'?'Balcone aggiunto: scegli Coperto o Scoperto.':'Nuovo vano salvato nella pratica.');show(id);p.onSaved?.();}}/>}
   {builder&&sourceUrl&&<PolygonBuilder key={builder.initial?.id||builder.mode} sourceUrl={sourceUrl} width={rasterSize.width} height={rasterSize.height} initial={builder.initial} mode={builder.mode} pointLabel={builder.pointLabel} referenceShapes={builder.mode==='segment'?undefined:rooms} onCancel={()=>setBuilder(null)} onDone={s=>{builder.done(s);setBuilder(null);}}/>}
  </>;
 }
 if(p.embedded)return <section aria-label="Planimetria" className={styles.planEditor}>
  <header><h2>Planimetria</h2></header>
  {(conflict||pending&&!busy)&&<div className={styles.row}><button type="button" onClick={refresh} disabled={busy}>Ricarica e scarta le modifiche locali</button>{pending&&!busy&&!conflict&&<button type="button" onClick={()=>void send(pending)}>Riprova lo stesso salvataggio</button>}</div>}
  {error&&<p role="alert" className={styles.warning}>{error}</p>}
  {notice&&<p role="status" className={styles.toast}>{notice}</p>}
  {loading&&<p role="status">Caricamento pratica…</p>}
  {data&&!loading&&(!data.plans.plans.length?<p>Apri l’analisi del documento per iniziare la planimetria.</p>:plan?.rooms===null?<p role="status">Il documento è cambiato: l’analisi precedente non è più utilizzabile.</p>:embeddedPage())}
 </section>;
 return <section aria-label="Planimetrie e computo" className={p.embedded?styles.planEditor:styles.workspace}><header><h2>{p.embedded?'Planimetria':data?.practice.label||'Fascicolo immobile'}</h2></header><div hidden={!!p.embedded&&!conflict&&!pending} className={styles.row}><button type="button" onClick={refresh} disabled={busy}>{draft||configDirty||pending||excludedIds.length?'Ricarica e scarta le modifiche locali':'Ricarica pratica'}</button>{pending&&!busy&&!conflict&&<button type="button" onClick={()=>void send(pending)}>Riprova lo stesso salvataggio</button>}</div>{error&&<p role="alert" className={styles.warning}>{error}</p>}{notice&&<p role="status" className={styles.toast}>{notice}</p>}{loading&&<p role="status">Caricamento pratica…</p>}{data&&!loading&&<>{!p.embedded&&<section className={styles.panel}><h2>Documenti ricevuti</h2>{data.practice.documents.length?<ul>{data.practice.documents.map(d=><li key={d.id}>{d.filename} · versione {d.version} · {kinds[d.kind]||'Documento'}</li>)}</ul>:<p>Nessun documento visibile nella pratica.</p>}</section>}{!data.plans.plans.length?<p>Apri l’analisi del documento per iniziare la planimetria.</p>:<><details className={styles.documentTools} open={!p.embedded||undefined}><summary>Documento originale · pagina {plan?.proof.page}</summary><label>Planimetria da verificare<select value={plan?.id||''} disabled={locked||showProposal||!!draft||configDirty||!!builder} onChange={e=>{setSelected(e.target.value);setFocus(null);setError('');}}>{data.plans.plans.map((s,i)=><option key={s.id} value={s.id}>Planimetria {i+1} · pagina {s.proof.page} · versione documento {s.proof.version}</option>)}</select></label></details>{plan?.rooms===null?<p role="status">Il documento è cambiato: l’analisi precedente non è più utilizzabile.</p>:plan&&rasterSize&&<>


 {plan.issues?.length&&task!=='listing'?<details className={styles.documentTools}>
  <summary>Controlla le verifiche aperte · {plan.issues.length}</summary>
  {draft&&<p>Salva il contorno in modifica per poter registrare le verifiche.</p>}
  {(()=>{
  const entries=[...new Map(plan.issues.map(issue=>[JSON.stringify([issue.id,issue.code]),issue])).values()].map(issue=>{
   const savedRoom=rooms.find(room=>room.id===issue.id||room.symbols?.some(symbol=>symbol.id===issue.id));
   const room=savedRoom??proposal?.rooms.find(candidate=>candidate.id===issue.id);
   return {issue,room};
  });
  return <ul className={styles.issueList}>{entries.map(({issue,room},index)=>{
   const symbol=room?.symbols?.find(item=>item.id===issue.id);
   return <PlanIssueReview key={JSON.stringify([plan.id,issue.id,issue.code])} index={issue.number??index+1}
    description={issueLabels[issue.code]||'Una zona richiede controllo manuale.'}
    roomLabel={room?.label} symbolReason={symbol?.reason}
    disabled={locked||!!draft||configDirty||showProposal||!!builder||manualOpen}
    geometryEdited={(plan.geometryRevision||1)>1}
    issue={issue} onResolve={resolveIssue}/>;
  })}</ul>;})()}
 </details>:null}

 <div hidden={task==='listing'}>
 {!p.embedded&&sourceUrl&&p.api.preview&&<button type='button' disabled={locked||showProposal||!!draft||configDirty||!!builder} onClick={()=>setManualOpen(true)} >{rooms.length?'Disegna / aggiungi vano':'Disegna il primo vano'}</button>}{manualOpen&&sourceUrl&&<ManualRoomCreator initialKind={manualMode==='balcony'?'balcony':undefined} api={p.api} plan={plan} revision={data.plans.revision} sourceUrl={sourceUrl} onClose={()=>setManualOpen(false)} onReload={()=>{setManualOpen(false);refresh();}} onDenied={failure} onSaved={(plans)=>{setData(v=>v?{...v,plans:carryIssueNumbers(plans,v.plans)}:v);setManualOpen(false);setNotice('Nuovo vano salvato nella pratica. Computo da verificare nuovamente.');p.onSaved?.();}}/>}{!sourceUrl?<p>Anteprima allineata non disponibile. Nessun contorno viene sovrapposto a un’immagine non verificata.</p>:<>{proposalAvailable&&<details className={styles.documentTools} open={showProposal||undefined} aria-label="Correzioni proposte"><summary>Contorni proposti da controllare</summary>{proposal!.contrast&&<p>Scansione con tratti chiari. Contorni recuperati: {proposal!.rooms.length}. Verifica i bordi sull’originale.</p>}{proposal!.summary.unassignedAreas!==undefined&&<p>Aree non censite da verificare: {proposal!.summary.unassignedAreas}. Sono proposte geometriche, non stanze confermate.</p>}<p>Archi porte: {proposal!.summary.doorArcs} · celle di servizio: {proposal!.summary.serviceCells} · fasce esterne: {proposal!.summary.exteriorStrips}. Controlla i confini sull’originale; destinazione e completezza restano da verificare.</p><button type="button" disabled={busy||!!pending||conflict||!!draft||configDirty||!!builder||manualOpen} onClick={()=>{setPreviewKey(showProposal?'':proposalKey);setReviewedKey('');}}>{showProposal?'Torna ai contorni salvati':'Confronta i contorni proposti'}</button>{showProposal&&<><p>Anteprima: nessuna modifica salvata. Entrambe le viste restano disponibili.</p>{!!proposal!.coverage?.candidateIds.length&&<fieldset disabled={locked}><legend>Scegli le aree da scartare</legend><p>Le aree scartate restano visibili tratteggiate per il confronto e non entrano nei vani adottati.</p>{proposal!.coverage!.candidateIds.map(id=>{const area=proposal!.rooms.find(r=>r.id===id);return area?<div key={id}><label><input type="checkbox" checked={excludedIds.includes(id)} onChange={e=>{setCandidateChoices({key:proposalKey,excluded:e.target.checked?[...new Set([...excludedIds,id])]:excludedIds.filter(v=>v!==id)});setReviewedKey('');}}/> Scarta {area.label}</label>{proposal!.coverage!.possibleWallIds?.includes(id)&&<p>Possibile fascia muraria: molto sottile rispetto agli ambienti vicini. Controlla prima di includerla; potrebbe anche essere un passaggio stretto.</p>}</div>:null;})}</fieldset>}<label><input type="checkbox" checked={reviewedKey===proposalKey} disabled={locked} onChange={e=>setReviewedKey(e.target.checked?proposalKey:'')}/> Ho confrontato i contorni con l’originale</label><p>Indica il motivo nel campo sotto prima di adottare la proposta. Il computo dovrà essere ricalcolato.</p><button type="button" disabled={locked||reviewedKey!==proposalKey||!reason.trim()} onClick={()=>save({operation:'apply_surface_proposal',proposalDigest:proposal!.digest,...(excludedIds.length?{excludedCandidateIds:excludedIds}:{})})}>Adotta i contorni proposti</button></>}</details>}{proposal?.state==='applied'&&<p role="status">Correzioni adottate.{!!proposal.acceptedExcludedCandidateIds?.length&&<> Aree scartate: {proposal.acceptedExcludedCandidateIds.length}.</>} Verifica gli elementi interni prima del computo.</p>}{proposal?.state==='stale'&&<p>La proposta precedente non è più applicabile dopo la modifica dei contorni.</p>}{!(p.embedded&&task==='measure')&&planView(task==='draw')}{builder&&<PolygonBuilder key={builder.initial?.id||builder.mode} sourceUrl={sourceUrl} width={rasterSize.width} height={rasterSize.height} initial={builder.initial} mode={builder.mode} onCancel={()=>setBuilder(null)} onDone={s=>{builder.done(s);setBuilder(null);}}/>}</>}
 </div>
 <div hidden={p.embedded&&task!=='listing'}>
 {plan.rooms?.length?<ListingPlanExport key={plan.id+':'+plan.geometryRevision} rooms={plan.rooms} disabled={locked||!!draft||!!builder||manualOpen}/>:<p>Salva almeno un vano per preparare l’immagine dell’annuncio.</p>}
 {draft&&<p>Salva il contorno in Disegna e correggi per aggiornare l’anteprima.</p>}
 </div>
 <details className={styles.documentTools} open={showProposal||undefined} hidden={task==='listing'}><summary>Note e modifiche</summary>
 {p.embedded&&<button type="button" onClick={refresh} disabled={busy}>Ricarica e scarta modifiche locali</button>}

 <details className={styles.panel} open={showProposal||undefined}><summary>Nota di modifica</summary><label>Motivo della modifica o del computo<textarea value={reason} disabled={locked} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label></details>{draft&&!p.embedded&&<div className={styles.panel}><p>Contorno modificato, non ancora salvato.</p><button type="button" disabled={locked||!sourceUrl} onClick={()=>save({operation:'geometry',view:draft.view,id:draft.shape.id,geometry:{points:draft.shape.points,holes:draft.shape.holes}})}>Salva correzione contorno</button></div>}
 </details>
 <div hidden={task!=='measure'}>
 {!p.embedded&&sourceUrl&&plan.measurementConfiguration&&!plan.measurement&&<p role="status">Computo da aggiornare. Scala e criterio sono disponibili. Verifica le impostazioni interessate e premi Ricalcola.</p>}
 {sourceUrl&&<MeasurementForm key={`${plan.id}:${plan.geometryRevision}:${plan.measurementConfiguration?"configured":"empty"}`} rooms={rooms} rasterSize={rasterSize} hasPerimeter={!!perimeter} configuration={plan.measurementConfiguration} needsRecalculation={!!plan.measurementConfiguration&&!plan.measurement} busy={locked||showProposal||!!draft||!!builder} onDirty={()=>setConfigDirty(true)} requestPolygon={(initial,done)=>polygon(initial,done)} requestSegment={done=>polygon(null,s=>{if(s.points[0]&&s.points[1])done(s.points[0],s.points[1]);},'segment')} onSave={configuration=>save({operation:'measure',configuration})}/>}
</div>

</> }</>}</>}</section>;
}
