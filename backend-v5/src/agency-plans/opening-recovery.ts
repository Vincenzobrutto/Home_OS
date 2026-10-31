import {assert,filled,overlaps,type Point} from './geometry';
import {assertRaster,segmentPlan,type Raster,type RasterConfig,type SeedSpace,type SymbolRequest,type Segmentation} from './raster';
import {detectOpeningGaps,proposeThresholds,previewVirtualThresholds,type OpeningObservation} from './recognition-rules';

/** Untrusted visual observations, not geometry or a human confirmation. */
export type OpeningHint={id:string;spaceId:string;nearStart:Point;nearEnd:Point;inside:Point;outside:Point;signal:'arrow'|'door_arc'|'door_leaf';context:'inside_to_common'|'between_rooms'};
export type OpeningRecovery={id:string;spaceId:string;state:'needs_review'|'proposed_recovery';reasons:string[];threshold:OpeningObservation|null;hintSource:'ai'|'human';endpointSource:'pixel_refinement'|'pixel_neighborhood_search'|null;search?:{tested:number;candidateCount:number;initialReasons:string[]}};
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function validPoint(r:Raster,p:Point){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[1]>=0&&p[0]<r.width&&p[1]<r.height;}
function dark(r:Raster,p:Point,threshold:number,radius=0){for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){const xx=Math.round(p[0])+x,yy=Math.round(p[1])+y;if(xx>=0&&yy>=0&&xx<r.width&&yy<r.height&&r.gray[yy*r.width+xx]<=threshold)return true;}return false;}
const sameGeometry=(a:Segmentation['regions'][number],b:Segmentation['regions'][number])=>JSON.stringify([a.points,a.holes])===JSON.stringify([b.points,b.holes]);

/** Refine approximate AI endpoints on original ink; no room count or expected layout. */
export function refineOpening(r:Raster,h:OpeningHint,threshold=180,hintSource:'ai'|'human'='ai'):OpeningRecovery{
 assertRaster(r);assert(h&&typeof h.id==='string'&&h.id.trim()&&h.id.length<=100&&typeof h.spaceId==='string'&&h.spaceId.trim()&&h.spaceId.length<=100&&['arrow','door_arc','door_leaf'].includes(h.signal)&&['inside_to_common','between_rooms'].includes(h.context)&&Number.isInteger(threshold)&&threshold>=1&&threshold<=254);
 assert(['ai','human'].includes(hintSource));
 const fail=(reason:string):OpeningRecovery=>({id:h.id,spaceId:h.spaceId,state:'needs_review',reasons:[reason],threshold:null,hintSource,endpointSource:null});
 if(![h.nearStart,h.nearEnd,h.inside,h.outside].every(p=>validPoint(r,p)))return fail('opening_outside_image');
 const span=distance(h.nearStart,h.nearEnd);if(span<6||span>Math.min(160,Math.hypot(r.width,r.height)*.15))return fail('opening_span_unsupported');
 if(dark(r,h.inside,threshold)||dark(r,h.outside,threshold))return fail('opening_side_on_ink');
 const radius=Math.min(8,Math.max(2,Math.round(span*.2))),points=(p:Point)=>{const out:Point[]=[];for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){const q:Point=[Math.round(p[0])+x,Math.round(p[1])+y];if(distance(q,p)<=radius&&validPoint(r,q)&&dark(r,q,threshold))out.push(q);}return out.sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,40);};
 const options:Array<{a:Point;b:Point;score:number}>=[];
 for(const a of points(h.nearStart))for(const b of points(h.nearEnd)){
  const length=distance(a,b);if(length<6||Math.abs(length-span)>radius*1.5)continue;
  const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,alignment=(dx*(h.nearEnd[0]-h.nearStart[0])+dy*(h.nearEnd[1]-h.nearStart[1]))/span;if(alignment<.97)continue;
  const side=(p:Point)=>dx*(p[1]-a[1])-dy*(p[0]-a[0]);if(side(h.inside)*side(h.outside)>=0||Math.min(Math.abs(side(h.inside)),Math.abs(side(h.outside)))<2)continue;
  let supported=true;for(const [end,sign]of [[a,-1],[b,1]] as const){let flank=0;for(let d=2;d<=9;d++)if(dark(r,[end[0]+dx*d*sign,end[1]+dy*d*sign],threshold,1))flank++;let jamb=0;for(const direction of[-1,1]){let count=0;for(let d=2;d<=7;d++)if(dark(r,[end[0]-dy*d*direction,end[1]+dx*d*direction],threshold))count++;jamb=Math.max(jamb,count);}if(flank<6||jamb<4)supported=false;}if(!supported)continue;
  const observation:OpeningObservation={id:h.id,start:a,end:b,signals:[h.signal,'wall_ends'],context:h.context,source:hintSource};
  if(!proposeThresholds(r,[observation],threshold)[0].canPreview)continue;
  options.push({a,b,score:distance(a,h.nearStart)+distance(b,h.nearEnd)});
 }
 options.sort((a,b)=>a.score-b.score);const best=options[0];if(!best)return fail('opening_jambs_not_supported');
 if(options.some(o=>o.score<=best.score+1&&Math.max(distance(o.a,best.a),distance(o.b,best.b))>4))return fail('opening_jambs_ambiguous');
 return {id:h.id,spaceId:h.spaceId,state:'proposed_recovery',reasons:['visual_hint_requires_review'],hintSource,endpointSource:'pixel_refinement',threshold:{id:h.id,start:best.a,end:best.b,signals:[h.signal,'wall_ends'],context:h.context,source:hintSource}};
}

/** Bounded automatic draft recovery. Every accepted cut remains an explicit review item. */
function recoverOpeningHints(r:Raster,spaces:SeedSpace[],symbols:SymbolRequest[],config:RasterConfig,hints:OpeningHint[],hintSource:'ai'|'human'='ai',baseline?:Segmentation){
 assertRaster(r);assert(Array.isArray(hints)&&hints.length<=12&&new Set(hints.map(h=>h.id)).size===hints.length);
 let raster=r,segmentation=baseline?structuredClone(baseline):segmentPlan(r,spaces,symbols,config);const reviews:OpeningRecovery[]=[];
 for(const hint of hints){
  const target=spaces.find(s=>s.id===hint.spaceId&&s.kind!=='excluded');
  if(!target){reviews.push({id:hint.id,spaceId:hint.spaceId,state:'needs_review',reasons:['opening_target_unavailable'],threshold:null,hintSource,endpointSource:null});continue;}
  const proposal=refineOpening(r,hint,config.threshold,hintSource);reviews.push(proposal);if(!proposal.threshold)continue;
  const reject=(reason:string)=>{proposal.state='needs_review';proposal.reasons=[reason];};
  if(segmentation.regions.some(region=>region.id===hint.spaceId)){reject('opening_target_already_resolved');continue;}
  const cut=previewVirtualThresholds(raster,proposeThresholds(raster,[proposal.threshold],config.threshold),[hint.id],config.threshold);
  const next=segmentPlan(cut.raster,spaces,symbols,config),duplicate=next.duplicates.find(d=>d.id===hint.spaceId),region=next.regions.find(v=>v.id===(duplicate?.sameAs||hint.spaceId));
  if(!region||!filled(hint.inside,region)||filled(hint.outside,region)){reject('opening_does_not_isolate_target');continue;}
  if(spaces.filter(s=>s.kind==='excluded').some(s=>s.seeds.some(p=>filled(p,region)))){reject('opening_includes_excluded_space');continue;}
  if(segmentation.regions.some(old=>{const current=next.regions.find(v=>v.id===old.id);return !current||!sameGeometry(old,current);})){reject('opening_changes_existing_region');continue;}
  if(next.regions.some((a,i)=>next.regions.slice(i+1).some(b=>overlaps(a,b)))){reject('opening_overlap');continue;}
  // Recover continuous floor without pretending that separate census entries are one room.
  if(next.duplicates.some(d=>d.sameAs===region.id||d.id===region.id))proposal.reasons.push('opening_semantic_partition_required');
  raster=cut.raster;segmentation=next;
 }
 for(const review of reviews.filter(v=>v.state==='proposed_recovery'&&v.threshold)){const hint=hints.find(h=>h.id===review.id)!;const region=segmentation.regions.find(v=>filled(hint.inside,v));if(region?.boundary){region.boundary.virtualThresholdIds??=[];region.boundary.virtualThresholdIds.push(review.id);}}
 return {segmentation,reviews,applied:reviews.filter(v=>v.state==='proposed_recovery'&&v.threshold).map(v=>v.id),confirmed:false as const,originalUnchanged:true as const};
}

/** Alternative endpoints require majority wall-axis evidence AND a unique isolated opening.
 * Thin arrow strokes may interrupt a scan line; they are never erased from the source. */
export function recoverOpenings(r:Raster,spaces:SeedSpace[],symbols:SymbolRequest[],config:RasterConfig,hints:OpeningHint[],hintSource:'ai'|'human'='ai'){
 const out=recoverOpeningHints(r,spaces,symbols,config,hints,hintSource);let tested=0;
 for(const review of out.reviews){
  if(review.state==='proposed_recovery'||!review.reasons.some(v=>['opening_does_not_isolate_target','opening_jambs_not_supported','opening_jambs_ambiguous'].includes(v)))continue;
  const hint=hints.find(h=>h.id===review.id)!;if(![hint.nearStart,hint.nearEnd,hint.inside,hint.outside].every(p=>validPoint(r,p)))continue;
  let a=0,b=0,total=0;for(const room of out.segmentation.regions)for(let i=0;i<room.points.length;i++){const p=room.points[i],q=room.points[(i+1)%room.points.length],length=distance(p,q);if(length<12)continue;const angle=Math.atan2(q[1]-p[1],q[0]-p[0]);a+=length*Math.cos(angle*4);b+=length*Math.sin(angle*4);total+=length;}
  if(!total||Math.hypot(a,b)/total<.5)continue;const axis=Math.atan2(b,a)/4;
  const span=distance(hint.nearStart,hint.nearEnd),center:Point=[(hint.nearStart[0]+hint.nearEnd[0])/2,(hint.nearStart[1]+hint.nearEnd[1])/2],radius=Math.min(140,Math.max(60,Math.ceil(span*3))),x=Math.max(0,Math.floor(center[0]-radius)),y=Math.max(0,Math.floor(center[1]-radius));
  const active=out.reviews.filter(v=>v.state==='proposed_recovery'&&v.threshold).map(v=>v.threshold!);const current=previewVirtualThresholds(r,proposeThresholds(r,active,config.threshold),active.map(v=>v.id),config.threshold).raster;
  const gaps=detectOpeningGaps(r,{x,y,width:Math.min(r.width-x,radius*2),height:Math.min(r.height-y,radius*2)},{threshold:config.threshold,minimumFlankPixels:8,limit:100,bridgeAnnotations:true});
  const alternatives:Array<{hint:OpeningHint;refined:OpeningRecovery}>=[];
  for(const g of gaps){const length=distance(g.start,g.end),angle=Math.atan2(g.end[1]-g.start[1],g.end[0]-g.start[0]);if(length<6||length>span*2||Math.cos(4*(angle-axis))<Math.cos(48*Math.PI/180))continue;const h={...hint,nearStart:g.start,nearEnd:g.end},refined=refineOpening(r,h,config.threshold,hintSource);if(!refined.threshold)continue;
   if(alternatives.some(v=>Math.min(distance(v.refined.threshold!.start,refined.threshold!.start)+distance(v.refined.threshold!.end,refined.threshold!.end),distance(v.refined.threshold!.start,refined.threshold!.end)+distance(v.refined.threshold!.end,refined.threshold!.start))<4))continue;alternatives.push({hint:h,refined});
  }
  review.search={tested:0,candidateCount:alternatives.length,initialReasons:[...review.reasons]};const matches:Array<ReturnType<typeof recoverOpeningHints>>=[];
  let incomplete=false;for(const alternative of alternatives){if(tested>=8){incomplete=true;break;}tested++;review.search.tested++;const trial=recoverOpeningHints(current,spaces,symbols,config,[alternative.hint],hintSource,out.segmentation);if(trial.applied.length)matches.push(trial);}
  // Multiple different wall cuts or an incomplete search remain uncertain, regardless of room count.
  if(incomplete||matches.length!==1){if(incomplete||matches.length>1)review.reasons=['opening_alternatives_ambiguous'];continue;}
  const chosen=matches[0];out.segmentation=chosen.segmentation;const search=review.search;Object.assign(review,chosen.reviews[0],{endpointSource:'pixel_neighborhood_search',search});review.reasons.push('alternative_jambs_require_review');out.applied.push(review.id);
 }
 return out;
}
