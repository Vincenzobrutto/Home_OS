import type {CoverageReport} from './coverage';
import { createHash } from 'node:crypto';
import { evidenceCurrent, requirePractice, sourceReadable, PracticeError, type Actor, type Practice } from '../agency-practices/domain';
import { assert, overlaps, validPolygon, type Point, type Polygon } from './geometry';
import type { analyzePlan, PlanProof } from './pipeline';
import type { Region, RasterRendering, SegmentationDiagnostic } from './raster';
import {roomGeometryDigest,surfaceProposalDigest,type SurfaceProposal} from './surface-proposal';
import {carveManualRoom} from './manual-room';
import { commercialReport, commercialPerimeterReport, type CommercialInput, type SurfaceLine } from './commercial';
type Analysis=Awaited<ReturnType<typeof analyzePlan>>;
type NumberedIssue=Analysis['final']['issues'][number]&{number?:number;manualPoint?:Point};
export type BalconyCover={id:string;cover:'covered'|'uncovered'|'unset'};
/** Quick estimate inputs only. Areas are recomputed from current geometry on every read; never a certified or detailed computation. */
export type QuickEstimateScale={mode:'paper';format:'A4'|'A3'|'A2'|'A1';denominator:number}|{mode:'manual'|'bar';start:Point;end:Point;metres:number};
export type QuickEstimateParameters={wallPercent:number;coefficients:Array<{id:string;coefficient:number}>};
export type QuickEstimate={scale?:QuickEstimateScale;parameters?:QuickEstimateParameters;savedAt:string;geometryRevision:number};
export type ListingOpening={kind:'door'|'window';start:Point;end:Point;fixed?:boolean};
export type ListingWallRef={roomId:string;start:Point;end:Point};
export type ListingDetails={geometryRevision:number;openings:ListingOpening[];alignments:Array<{target:ListingWallRef;reference:ListingWallRef}>;contours?:Array<{id:string;geometry:Polygon}>};
type StoredRegion=Omit<Region,'seed'|'component'|'pixelArea'>&{seed:Region['seed']|null;component:number|null;pixelArea:number|null;origin?:'manual'|'geometry_proposal';surfaceProposalDigest?:string;surfaceBasis?:'wall_envelope'|'reallocated_to_wall_envelope';derivedFrom?:string};
export type StoredPlan={id:string;creatorId:string;proof:PlanProof;fingerprint:string;rasterSize:{width:number;height:number};rasterSHA256:string;rendering?:RasterRendering|null;resultDigest:string;version:number;createdAt:string;geometryRevision:number;rooms:StoredRegion[];issues:NumberedIssue[];lastIssueNumber?:number;balconyCovers?:BalconyCover[];quickEstimate?:QuickEstimate;listingDetails?:ListingDetails;warnings:string[];retainedSymbols:string[];annexInventory?:Analysis['annexInventory'];openingReviews?:Analysis['openingReviews'];surfaceProposal?:SurfaceProposal|null;analysisDiagnostics?:SegmentationDiagnostic[];reviewLocations?:ReviewLocation[];coverage?:CoverageReport|null;calls:Analysis['calls'];status:'draft'|'needs_review';confirmed:false;mainPerimeter:Polygon|null;perimeterProposal?:Polygon;measurementConfiguration?:MeasurementConfiguration|null;measurement?:ReturnType<typeof commercialReport>|ReturnType<typeof commercialPerimeterReport>|null;edits?:Array<{at:string;actorId:string;reason:string;geometryRevision:number;rooms:StoredRegion[];mainPerimeter:Polygon|null}>};
type ReviewLocation={id:string;point:Point;label:string};
function reviewLocations(analysis:Analysis):ReviewLocation[]{
 const issues=new Set([...analysis.final.issues,...(analysis.surfaceProposal?.issues??[])].map(issue=>issue.id));
 const {width,height}=analysis.rasterSize;
 return (analysis.proposal?.spaces??[]).flatMap(space=>{
  if(space.kind==='excluded'||!issues.has(space.id))return [];
  const point=space.seeds.find(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<width&&y>=0&&y<height);
  return point?[{id:space.id,point:structuredClone(point),label:space.label}]:[];
 });
}
type WithPlans=Practice&{planAnalyses?:StoredPlan[];planReceipts?:Array<{key:string;accountId:string;digest:string;id:string}>};
function numberIssues(plan:StoredPlan,previous:readonly NumberedIssue[]=plan.issues){
 const key=(issue:NumberedIssue)=>JSON.stringify([issue.id,issue.code]);
 const known=new Map(previous.map(issue=>[key(issue),issue]));
 let next=Math.max(plan.lastIssueNumber??0,...previous.map(issue=>issue.number??0));
 plan.issues=plan.issues.map(issue=>{
  const id=key(issue);
  const prior=known.get(id);
  const number=prior?.number??++next;
  const manualPoint=issue.manualPoint??prior?.manualPoint;
  known.set(id,{...issue,number,manualPoint});
  return {...issue,number,...(manualPoint?{manualPoint}:{})};
 });
 plan.lastIssueNumber=next;
 return plan;
}
export function planViews(actor:Actor,practice:Practice,now:string){requirePractice(actor,practice,'read',now);return {revision:practice.revision,plans:((practice as WithPlans).planAnalyses||[]).filter(plan=>{const source=practice.sources.find(s=>s.id===plan.proof.sourceId);return source&&sourceReadable(actor,practice,source,now);}).map(plan=>{const current=evidenceCurrent(actor,practice,{...plan.proof,excerpt:'Plan source'},now);return current?numberIssues(structuredClone({...plan,balconyCovers:plan.balconyCovers??[]})):{id:plan.id,proof:structuredClone(plan.proof),version:plan.version,status:'stale' as const,confirmed:false as const,rooms:null,mainPerimeter:null};})};}
/** Internal pipeline completion only. Never expose this method as a client-submittable AI result. */
export function registerPlan(actor:Actor,original:Practice,analysis:Analysis,expectedRevision:number,now:string){
 requirePractice(actor,original,'edit',now);assert(analysis&&analysis.scope.accountId===actor.accountId&&analysis.scope.agencyId===original.agencyId&&analysis.scope.practiceId===original.id,'plan_scope_changed');
 const readable=original.sources.find(s=>s.id===analysis.proof.sourceId);if(!readable||!sourceReadable(actor,original,readable,now))throw new PracticeError('access_denied');
 if(!evidenceCurrent(actor,original,{...analysis.proof,excerpt:'Plan source'},now))throw new PracticeError('source_changed');
 const source=original.sources.find(s=>s.id===analysis.proof.sourceId)!;assert(source.kind==='floor_plan');assert(typeof analysis.runId==='string'&&analysis.runId.trim()&&analysis.runId.length<=120&&/^[a-f0-9]{64}$/u.test(analysis.fingerprint)&&analysis.confirmed===false);
 assert(analysis.rasterSize&&Number.isInteger(analysis.rasterSize.width)&&Number.isInteger(analysis.rasterSize.height)&&analysis.rasterSize.width>=8&&analysis.rasterSize.height>=8&&analysis.rasterSize.width*analysis.rasterSize.height<=4000000&&/^[a-f0-9]{64}$/u.test(analysis.rasterSHA256));
 if(analysis.rendering)assert(analysis.rendering.renderer==='agency-render-v1'&&Number.isSafeInteger(analysis.rendering.dpi)&&analysis.rendering.dpi>=72&&analysis.rendering.dpi<=300&&Array.isArray(analysis.rendering.transform)&&analysis.rendering.transform.length===6&&analysis.rendering.transform.every(Number.isFinite));
 assert(analysis.final.regions.length<=100&&analysis.final.regions.every(r=>validPolygon(r))&&analysis.final.issues.length<=200&&analysis.warnings.length<=200&&analysis.calls.length===2);
 for(let i=0;i<analysis.final.regions.length;i++)for(let j=i+1;j<analysis.final.regions.length;j++)assert(!overlaps(analysis.final.regions[i],analysis.final.regions[j]),'region_overlap');
 if(analysis.surfaceProposal)assert(analysis.surfaceProposal.state==='pending'&&analysis.surfaceProposal.sourceFingerprint===analysis.fingerprint&&analysis.surfaceProposal.baseGeometryDigest===roomGeometryDigest(analysis.final.regions)&&analysis.surfaceProposal.digest===surfaceProposalDigest(analysis.surfaceProposal),'surface_proposal_invalid');
 const snapshot:Omit<StoredPlan,'createdAt'|'version'>={id:analysis.runId,creatorId:actor.accountId,proof:structuredClone(analysis.proof),fingerprint:analysis.fingerprint,rasterSize:structuredClone(analysis.rasterSize),rasterSHA256:analysis.rasterSHA256,rendering:analysis.rendering?structuredClone(analysis.rendering):null,resultDigest:'',geometryRevision:1,rooms:structuredClone(analysis.final.regions),surfaceProposal:analysis.surfaceProposal?structuredClone(analysis.surfaceProposal):null,openingReviews:structuredClone(analysis.openingReviews||[]),analysisDiagnostics:structuredClone(analysis.final.diagnostics||[]),...(analysis.final.coverage?{coverage:structuredClone(analysis.final.coverage)}:{}),annexInventory:structuredClone(analysis.annexInventory||[]),issues:structuredClone(analysis.final.issues),warnings:structuredClone(analysis.warnings),retainedSymbols:structuredClone(analysis.retainedSymbols),calls:structuredClone(analysis.calls),status:analysis.status,confirmed:false,mainPerimeter:null,...(analysis.perimeterProposal?{perimeterProposal:structuredClone(analysis.perimeterProposal)}:{})};
 const digest=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),prior=(original as WithPlans).planAnalyses?.find(p=>p.id===analysis.runId);
 if(prior){if(prior.creatorId!==actor.accountId||prior.resultDigest!==digest)throw new PracticeError('idempotency_conflict');return {practice:structuredClone(original),id:prior.id,replay:true};}
 if(expectedRevision!==original.revision)throw new PracticeError('revision_conflict');const practice=structuredClone(original) as WithPlans;practice.planAnalyses??=[];assert(practice.planAnalyses.length<100,'plan_limit');snapshot.resultDigest=digest;const locations=reviewLocations(analysis);practice.planAnalyses.push({...snapshot,...(locations.length?{reviewLocations:locations}:{}),createdAt:now,version:1});practice.revision++;practice.dependents.push({id:'plan:'+snapshot.id,state:'current',sources:[{...analysis.proof,excerpt:'Plan source'}]});practice.events.push({id:practice.events.length+1,actorId:actor.accountId,at:now,operation:'plan:register',sourceId:analysis.proof.sourceId,revision:practice.revision});return {practice,id:snapshot.id,replay:false};
}
export type MeasurementConfiguration=Omit<CommercialInput,'surfaces'|'geometryRevision'|'unresolvedSymbols'>&{base:'rooms_and_walls'|'gross_perimeter';mainRegionIds:string[];assignments:Array<Omit<SurfaceLine,'geometry'>&{id:string}>};
type GeometryEdit={view:'rooms'|'perimeter';id:string;geometry:Polygon};
export type PlanEdit={key:string;expectedRevision:number;expectedPlanVersion:number;planId:string;reason:string;command:{operation:'apply_surface_proposal';proposalDigest:string;excludedCandidateIds?:string[]}|{operation:'add_room';id:string;label:string;kind:'room'|'bathroom'|'kitchen'|'corridor'|'balcony';geometry:Polygon;parentId?:string}|{operation:'remove_room';id:string}|({operation:'geometry'}&GeometryEdit)|{operation:'save_quick_estimate';covers:BalconyCover[];scale?:QuickEstimateScale;parameters?:QuickEstimateParameters;outline?:GeometryEdit}|({operation:'save_listing_details'|'save_plan_graphics';scale?:QuickEstimateScale&{mode:'manual'|'bar'}}&Omit<ListingDetails,'geometryRevision'>)|{operation:'measure';configuration:MeasurementConfiguration}|{operation:'locate_issue';issueId:string;code:string;point:Point}|{operation:'resolve_issue';issueId:string;code:string;resolution:'included_in_geometry'|'excluded_from_computation'|'not_applicable'}};
/** Internal typed application command; HTTP layer still needs an exact DTO/parser before being exposed. */
export function editPlan(actor:Actor,original:Practice,input:PlanEdit,now:string){
 requirePractice(actor,original,'edit',now);assert(input&&typeof input.key==='string'&&input.key.trim()&&input.key.length<=120&&typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=1000&&Number.isSafeInteger(input.expectedRevision)&&Number.isSafeInteger(input.expectedPlanVersion));
 const target=(original as WithPlans).planAnalyses?.find(p=>p.id===input.planId);if(!target)throw new PracticeError('access_denied');const readable=original.sources.find(s=>s.id===target.proof.sourceId);if(!readable||!sourceReadable(actor,original,readable,now))throw new PracticeError('access_denied');if(!evidenceCurrent(actor,original,{...target.proof,excerpt:'Plan source'},now))throw new PracticeError('source_changed');
 const digest=createHash('sha256').update(JSON.stringify(input)).digest('hex'),prior=(original as WithPlans).planReceipts?.find(r=>r.key===input.key&&r.accountId===actor.accountId);
 if(prior){if(prior.digest!==digest)throw new PracticeError('idempotency_conflict');return {practice:structuredClone(original),replay:true,id:prior.id};}
 if(original.revision!==input.expectedRevision||target.version!==input.expectedPlanVersion)throw new PracticeError('revision_conflict');
 const practice=structuredClone(original) as WithPlans,plan=practice.planAnalyses!.find(p=>p.id===target.id)!,command=input.command;
 const numberedBefore=numberIssues(plan).issues;
 function applyGeometry(edit:GeometryEdit){
  assert(validPolygon(edit.geometry)&&['rooms','perimeter'].includes(edit.view)&&[edit.geometry.points,...edit.geometry.holes].every(r=>r.every(p=>p[0]>=0&&p[1]>=0&&p[0]<=plan.rasterSize.width&&p[1]<=plan.rasterSize.height)));plan.edits??=[];assert(plan.edits.length<50,'plan_edit_history_limit');plan.edits.push({at:now,actorId:actor.accountId,reason:input.reason,geometryRevision:plan.geometryRevision,rooms:structuredClone(plan.rooms),mainPerimeter:structuredClone(plan.mainPerimeter)});
  if(edit.view==='perimeter')plan.mainPerimeter=structuredClone(edit.geometry);
  else {const region=plan.rooms.find(r=>r.id===edit.id);assert(region);for(const other of plan.rooms)if(other.id!==region.id)assert(!overlaps(edit.geometry,other),'region_overlap');region.points=structuredClone(edit.geometry.points);region.holes=structuredClone(edit.geometry.holes);region.origin='manual';delete region.boundary;delete region.surfaceProposalDigest;delete region.surfaceBasis;region.seed=null;region.component=null;region.pixelArea=null;}
  plan.geometryRevision++;plan.measurement=null;plan.status='needs_review';plan.warnings.push('manual_geometry_change:'+input.reason);
 }
 const geometryChanged=command.operation==='save_plan_graphics'&&!!command.contours?.length||command.operation==='geometry'||command.operation==='add_room'||command.operation==='remove_room'||command.operation==='save_quick_estimate'&&!!command.outline;
 if(command.operation==='apply_surface_proposal'){
  const proposal=plan.surfaceProposal;assert(proposal&&proposal.state==='pending'&&proposal.digest===command.proposalDigest&&proposal.sourceFingerprint===plan.fingerprint,'surface_proposal_unavailable');
  assert(proposal.baseGeometryRevision===plan.geometryRevision&&proposal.baseGeometryDigest===roomGeometryDigest(plan.rooms),'surface_proposal_stale');assert(surfaceProposalDigest(proposal)===proposal.digest,'surface_proposal_invalid');
  const excluded=command.excludedCandidateIds===undefined?[]:command.excludedCandidateIds;assert(Array.isArray(excluded)&&excluded.length<=12&&new Set(excluded).size===excluded.length&&excluded.every(id=>typeof id==='string'&&proposal.coverage?.candidateIds.includes(id)&&proposal.rooms.some(r=>r.id===id)&&!plan.rooms.some(r=>r.id===id)),'coverage_exclusion_invalid');
  assert(proposal.rooms.length>0&&proposal.rooms.length<=100&&new Set(proposal.rooms.map(v=>v.id)).size===proposal.rooms.length&&proposal.rooms.every(v=>validPolygon(v)&&[v.points,...v.holes].every(r=>r.every(p=>p[0]>=0&&p[1]>=0&&p[0]<=plan.rasterSize.width&&p[1]<=plan.rasterSize.height))),'surface_proposal_invalid');
  for(let i=0;i<proposal.rooms.length;i++)for(let j=i+1;j<proposal.rooms.length;j++)assert(!overlaps(proposal.rooms[i],proposal.rooms[j]),'region_overlap');
  plan.edits??=[];assert(plan.edits.length<50,'plan_edit_history_limit');plan.edits.push({at:now,actorId:actor.accountId,reason:input.reason,geometryRevision:plan.geometryRevision,rooms:structuredClone(plan.rooms),mainPerimeter:structuredClone(plan.mainPerimeter)});
  const before=plan.rooms;plan.rooms=proposal.rooms.filter(r=>!excluded.includes(r.id)).map(r=>{const old=before.find(v=>v.id===r.id);if(old&&roomGeometryDigest([old])===roomGeometryDigest([r]))return structuredClone(old);const adopted={...structuredClone(r),origin:'geometry_proposal' as const,surfaceProposalDigest:proposal.digest,seed:null,component:null,pixelArea:null};delete adopted.boundary;return adopted;});
  plan.issues=structuredClone(proposal.issues.filter(issue=>!(excluded.includes(issue.id)&&['coverage_area_requires_review','coverage_area_conflict'].includes(issue.code))).filter(issue=>!proposal.baseIssues.some(b=>b.id===issue.id&&b.code===issue.code)||plan.issues.some(v=>v.id===issue.id&&v.code===issue.code)));
  if(excluded.length){proposal.acceptedExcludedCandidateIds=[...excluded];plan.warnings.push('human_coverage_candidates_excluded:'+excluded.join(',')+':'+input.reason);}
  proposal.state='applied';proposal.acceptedAt=now;proposal.acceptedBy=actor.accountId;plan.geometryRevision++;plan.measurement=null;plan.status='needs_review';plan.warnings.push('human_surface_adoption:'+proposal.digest+':'+input.reason);
 }else if(command.operation==='add_room'){
  assert(plan.rooms.length<100&&typeof command.id==='string'&&command.id.trim()&&command.id.length<=100&&!plan.rooms.some(r=>r.id===command.id),'manual_room_invalid_id');
  assert(typeof command.label==='string'&&command.label.trim()&&command.label.length<=200&&['room','bathroom','kitchen','corridor','balcony'].includes(command.kind));
  const bounded=(g:Polygon)=>validPolygon(g)&&[g.points,...g.holes].every(r=>r.every(v=>v[0]>=0&&v[1]>=0&&v[0]<=plan.rasterSize.width&&v[1]<=plan.rasterSize.height));
  assert(bounded(command.geometry));let geometry=structuredClone(command.geometry);const parent=command.parentId?plan.rooms.find(r=>r.id===command.parentId):undefined;if(command.parentId)assert(parent,'manual_room_parent_missing');
  const partition=parent?carveManualRoom(parent,geometry):null;if(partition)geometry=partition.added;
  for(const other of plan.rooms)if(other.id!==parent?.id)assert(!overlaps(geometry,other),'region_overlap');
  plan.edits??=[];assert(plan.edits.length<50,'plan_edit_history_limit');plan.edits.push({at:now,actorId:actor.accountId,reason:input.reason,geometryRevision:plan.geometryRevision,rooms:structuredClone(plan.rooms),mainPerimeter:structuredClone(plan.mainPerimeter)});
  if(parent&&partition){assert(bounded(partition.remaining));parent.points=partition.remaining.points;parent.holes=partition.remaining.holes;parent.origin='manual';delete parent.boundary;delete parent.surfaceProposalDigest;delete parent.surfaceBasis;parent.seed=null;parent.component=null;parent.pixelArea=null;for(const symbol of parent.symbols)if(!plan.issues.some(i=>i.id===symbol.id&&i.code==='symbol_unresolved'))plan.issues.push({id:symbol.id,code:'symbol_unresolved'});}
  plan.rooms.push({...geometry,id:command.id,label:command.label.trim(),kind:command.kind,seed:null,component:null,pixelArea:null,symbols:[],origin:'manual',...(parent?{derivedFrom:parent.id}:{})});
  plan.geometryRevision++;plan.measurement=null;plan.status='needs_review';plan.warnings.push('manual_room_added:'+command.id+':'+input.reason);
 }else if(command.operation==='remove_room'){
  assert(plan.rooms.some(room=>room.id===command.id),'manual_room_missing');
  plan.edits??=[];assert(plan.edits.length<50,'plan_edit_history_limit');
  plan.edits.push({at:now,actorId:actor.accountId,reason:input.reason,geometryRevision:plan.geometryRevision,rooms:structuredClone(plan.rooms),mainPerimeter:structuredClone(plan.mainPerimeter)});
  plan.rooms=plan.rooms.filter(room=>room.id!==command.id);
  plan.geometryRevision++;plan.measurement=null;plan.status='needs_review';
  plan.warnings.push('manual_room_removed:'+command.id+':'+input.reason);
 }else if(command.operation==='geometry'){
  applyGeometry(command);
 }else if(command.operation==='save_quick_estimate'){
  const {covers,scale,parameters,outline}=command;
  assert(Array.isArray(covers)&&new Set(covers.map(entry=>entry.id)).size===covers.length);
  assert(covers.every(entry=>['covered','uncovered','unset'].includes(entry.cover)&&plan.rooms.some(room=>room.id===entry.id&&room.kind!=='excluded'&&(room.kind==='balcony'||/balcon/i.test(room.label)))));
  if(scale&&scale.mode!=='paper')assert([scale.start,scale.end].every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&y>=0&&x<=plan.rasterSize.width&&y<=plan.rasterSize.height)&&Math.hypot(scale.end[0]-scale.start[0],scale.end[1]-scale.start[1])>0&&scale.metres>0);
  if(scale?.mode==='paper')assert(['A4','A3','A2','A1'].includes(scale.format)&&scale.denominator>=1&&scale.denominator<=10000);
  if(parameters){
   assert(Number.isFinite(parameters.wallPercent)&&parameters.wallPercent>=0&&parameters.wallPercent<=30);
   const {coefficients}=parameters;
   assert(new Set(coefficients.map(entry=>entry.id)).size===coefficients.length);
   assert(coefficients.every(({id,coefficient})=>Number.isFinite(coefficient)&&coefficient>=0&&coefficient<=1&&plan.rooms.some(room=>room.id===id)));
  }
  if(outline)applyGeometry(outline);
  const saved=new Map((plan.balconyCovers??[]).map(entry=>[entry.id,entry]));
  for(const entry of covers)saved.set(entry.id,entry);
  plan.balconyCovers=[...saved.values()];
  plan.quickEstimate={...(scale?{scale:structuredClone(scale)}:{}),...(parameters?{parameters:structuredClone(parameters)}:{}),savedAt:now,geometryRevision:plan.geometryRevision};
 }else if(command.operation==='save_listing_details'||command.operation==='save_plan_graphics'){
  const {openings,alignments,contours,scale}=command;
  const segmentValid=({start,end}:{start:Point;end:Point})=>[start,end].every(([x,y])=>
   Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&y>=0&&x<=plan.rasterSize.width&&y<=plan.rasterSize.height
  )&&Math.hypot(end[0]-start[0],end[1]-start[1])>0;
  assert(openings.length<=100&&openings.every(item=>['door','window'].includes(item.kind)&&segmentValid(item)));
  assert(alignments.length<=60&&alignments.every(({target,reference})=>
   [target,reference].every(wall=>segmentValid(wall)&&plan.rooms.some(room=>room.id===wall.roomId))
  ));
  if(contours){
   assert(contours.length<=100&&new Set(contours.map(c=>c.id)).size===contours.length);
   assert(contours.every(({id,geometry})=>plan.rooms.some(room=>room.id===id)&&validPolygon(geometry)&&[geometry.points,...geometry.holes].flat().every(([x,y])=>x>=0&&y>=0&&x<=plan.rasterSize.width&&y<=plan.rasterSize.height)));
  }
  if(scale){
   assert(['manual','bar'].includes(scale.mode)&&segmentValid(scale)&&Number.isFinite(scale.metres)&&scale.metres>0&&scale.metres<=1e6);
   plan.quickEstimate={...plan.quickEstimate,scale:structuredClone(scale),savedAt:now,geometryRevision:plan.geometryRevision};
  }
  if(command.operation==='save_plan_graphics'){
   assert(!alignments.length);
   if(geometryChanged){
    const edited=new Map(contours!.map(c=>[c.id,c.geometry]));
    const next=plan.rooms.map(room=>({...room,...edited.get(room.id)}));
    for(let i=0;i<next.length;i++)for(let j=i+1;j<next.length;j++){
     const a=next[i]!,b=next[j]!;
     if(edited.has(a.id)||edited.has(b.id))assert(!overlaps(a,b),'region_overlap');
    }
    plan.edits??=[];assert(plan.edits.length<50,'plan_edit_history_limit');
    plan.edits.push({at:now,actorId:actor.accountId,reason:input.reason,geometryRevision:plan.geometryRevision,rooms:structuredClone(plan.rooms),mainPerimeter:structuredClone(plan.mainPerimeter)});
    for(const room of plan.rooms){
     const geometry=edited.get(room.id);if(!geometry)continue;
     Object.assign(room,structuredClone(geometry),{origin:'manual',seed:null,component:null,pixelArea:null});
     delete room.boundary;delete room.surfaceProposalDigest;delete room.surfaceBasis;
    }
    plan.geometryRevision++;plan.measurement=null;plan.status='needs_review';plan.warnings.push('manual_geometry_change:'+input.reason);
    if(plan.quickEstimate)plan.quickEstimate.geometryRevision=plan.geometryRevision;
   }
   const prior=plan.listingDetails?.geometryRevision===plan.geometryRevision?plan.listingDetails:undefined;
   plan.listingDetails={geometryRevision:plan.geometryRevision,openings:structuredClone(openings),alignments:prior?.alignments??[],...(prior?.contours?{contours:prior.contours}:{})};
  }else plan.listingDetails={geometryRevision:plan.geometryRevision,openings:structuredClone(openings),alignments:structuredClone(alignments),...(contours?{contours:structuredClone(contours)}:{})};
 }else if(command.operation==='measure'){
  const c=command.configuration;plan.measurementConfiguration=structuredClone(c);assert(c&&['rooms_and_walls','gross_perimeter'].includes(c.base)&&Array.isArray(c.assignments)&&c.assignments.length===plan.rooms.length&&new Set(c.assignments.map(a=>a.id)).size===c.assignments.length&&Array.isArray(c.mainRegionIds)&&new Set(c.mainRegionIds).size===c.mainRegionIds.length&&c.mainRegionIds.every(id=>plan.rooms.some(r=>r.id===id)));
  if(c.calibration.paper)assert(c.calibration.paper.widthUnits===plan.rasterSize.width&&c.calibration.paper.heightUnits===plan.rasterSize.height,'paper_raster_mismatch');
  const calibrationPoints=[c.calibration.start,c.calibration.end,...(c.calibration.check?[c.calibration.check.start,c.calibration.check.end]:[])];assert(calibrationPoints.every(p=>p[0]>=0&&p[1]>=0&&p[0]<=plan.rasterSize.width&&p[1]<=plan.rasterSize.height));
  const surfaces=c.assignments.map(a=>{const room=plan.rooms.find(r=>r.id===a.id);assert(room);return {...a,geometry:{points:room.points,holes:room.holes}};});
  const common={...c,geometryRevision:plan.geometryRevision,unresolvedSymbols:plan.issues.map(i=>i.id+':'+i.code)};
  if(c.base==='gross_perimeter'){assert(plan.mainPerimeter,'perimeter_required');assert(c.assignments.filter(a=>c.mainRegionIds.includes(a.id)).every(a=>a.kind==='principal'&&(a.coefficient===undefined||a.coefficient===1)),'mixed_main_coefficients_require_rooms_base');plan.measurement=commercialPerimeterReport({...common,mainPerimeter:plan.mainPerimeter,roomBreakdown:plan.rooms.filter(r=>c.mainRegionIds.includes(r.id)).map(r=>({id:r.id,geometry:r})),accessories:surfaces.filter(s=>!c.mainRegionIds.includes(s.id))});}
  else plan.measurement=commercialReport({...common,surfaces});
 }else if(command.operation==='locate_issue'){
  const issue=plan.issues.find(item=>item.id===command.issueId&&item.code===command.code);
  const [x,y]=command.point;
  assert(issue&&Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=plan.rasterSize.width&&y>=0&&y<=plan.rasterSize.height);
  issue.manualPoint=[x,y];
 }else if(command.operation==='resolve_issue'){
  assert(['included_in_geometry','excluded_from_computation','not_applicable'].includes(command.resolution));const index=plan.issues.findIndex(i=>i.id===command.issueId&&i.code===command.code);assert(index>=0);if(command.resolution==='included_in_geometry')assert(plan.geometryRevision>1,'manual_geometry_required');plan.issues=plan.issues.filter(i=>i.id!==command.issueId||i.code!==command.code);plan.measurement=null;plan.warnings.push('human_resolution:'+command.issueId+':'+command.resolution+':'+input.reason);
 }else assert(false);
 if (plan.measurementConfiguration && (geometryChanged||command.operation==='apply_surface_proposal')) {
  const configuration = plan.measurementConfiguration;
  const roomIds = new Set(plan.rooms.map(room => room.id));
  configuration.assignments = configuration.assignments.filter(assignment => roomIds.has(assignment.id));
  configuration.mainRegionIds = configuration.mainRegionIds.filter(id => roomIds.has(id));
  configuration.coverageConfirmed = false;
  configuration.wallCoverageConfirmed = false;
 }
 if(geometryChanged&&plan.surfaceProposal?.state==='pending')plan.surfaceProposal.state='stale';
 numberIssues(plan,numberedBefore);
 if(plan.balconyCovers)plan.balconyCovers=plan.balconyCovers.filter(entry=>plan.rooms.some(room=>room.id===entry.id));
 plan.version++;practice.revision++;practice.planReceipts??=[];assert(practice.planReceipts.length<10000,'plan_receipt_limit');practice.planReceipts.push({accountId:actor.accountId,key:input.key,digest,id:plan.id});practice.events.push({id:practice.events.length+1,actorId:actor.accountId,at:now,operation:'plan:'+command.operation,sourceId:plan.proof.sourceId,revision:practice.revision});return {practice,replay:false,id:plan.id};
}
