import {discoverUnassignedAreas} from './coverage';
import { createHash } from 'node:crypto';
import {annexCensus,recoverAnnexInventory} from './recognition-rules';
import {recoverOpenings,type OpeningHint} from './opening-recovery';
import {createSurfaceProposal,surfaceProposalDigest,roomGeometryDigest,type SurfaceProposal} from './surface-proposal';
import {proposeInkThreshold} from './contrast';
import {previewVirtualThresholds,proposeThresholds} from './recognition-rules';
import { evidenceCurrent, requirePractice, type Actor, type Evidence, type Practice } from '../agency-practices/domain';
import { assert, filled, overlaps, PlanError, type Point } from './geometry';
import { assertRaster, segmentPlan, type Raster, type RasterConfig, type SeedSpace, type Segmentation, type SymbolRequest } from './raster';
export type SeedProposal={spaces:SeedSpace[];symbols:SymbolRequest[];warnings:string[];openings?:OpeningHint[]};
export type PlanProof=Pick<Evidence,'sourceId'|'version'|'sha256'|'page'>;
export type PlanContext={actor:Actor;practice:Practice;now:string};
export type PlanPorts={
 /** Must read fresh memberships/grants/source version on every invocation, including worker resumption. */
 context:()=>Promise<PlanContext>;
 /** Decode actual authorized immutable source bytes, not an HTTP client's claim about a SHA. */
 loadRaster:(proof:PlanProof)=>Promise<Raster>;
 /** Persist unique run+phase reservation before dispatch. A duplicate/uncertain dispatch must throw, never resend. */
 reserve:(runId:string,phase:'inventory'|'review',fingerprint:string,maxUSD:number)=>Promise<void>;
 settle:(runId:string,phase:'inventory'|'review',usage:{input:number;output:number;costUSD:number;requestId:string})=>Promise<void>;
 markUncertain:(runId:string,phase:'inventory'|'review')=>Promise<void>;
 /** Provider adapter owns encoded image/overlay generation and exact token-based cost ceiling. No tools or embedded PDF instructions. */
 ai:(request:{phase:'inventory'|'review';raster:Raster;previous:SeedProposal|null;segmentation:Segmentation|null;maxUSD:number})=>Promise<{proposal:unknown;inputTokens:number;outputTokens:number;costUSD:number;requestId:string}>;
};
function point(v:unknown):Point{assert(Array.isArray(v)&&v.length===2&&v.every(x=>typeof x==='number'&&Number.isFinite(x)));return [v[0],v[1]];}
function object(v:unknown){assert(v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype);return v as Record<string,unknown>;}
function text(v:unknown,max=200){assert(typeof v==='string'&&v.trim()&&v.length<=max);return v.trim();}
export function parseSeedProposal(input:unknown):SeedProposal{const v=object(input);assert(Array.isArray(v.spaces)&&v.spaces.length>0&&v.spaces.length<=100&&Array.isArray(v.symbols)&&v.symbols.length<=100&&Array.isArray(v.warnings)&&v.warnings.length<=100);
 const spaces=v.spaces.map(x=>{const s=object(x);assert(['room','bathroom','kitchen','corridor','balcony','excluded'].includes(String(s.kind))&&Array.isArray(s.seeds)&&s.seeds.length>=1&&s.seeds.length<=3);return {id:text(s.id,100),label:text(s.label),kind:s.kind as SeedSpace['kind'],seeds:s.seeds.map(point)};});
 const symbols=v.symbols.map(x=>{const s=object(x);assert(['include','exclude','unresolved'].includes(String(s.decision))&&Array.isArray(s.seeds)&&s.seeds.length<=8);return {id:text(s.id,100),parentId:text(s.parentId,100),decision:s.decision as SymbolRequest['decision'],reason:text(s.reason,1000),seeds:s.seeds.map(point)};});
 let openings:OpeningHint[]|undefined;if(v.openings!==undefined){assert(Array.isArray(v.openings)&&v.openings.length<=12);openings=v.openings.map(x=>{const h=object(x);assert(['arrow','door_arc','door_leaf'].includes(String(h.signal))&&['inside_to_common','between_rooms'].includes(String(h.context)));return {id:text(h.id,100),spaceId:text(h.spaceId,100),nearStart:point(h.nearStart),nearEnd:point(h.nearEnd),inside:point(h.inside),outside:point(h.outside),signal:h.signal as OpeningHint['signal'],context:h.context as OpeningHint['context']};});assert(new Set(openings.map(h=>h.id)).size===openings.length&&openings.every(h=>spaces.some(s=>s.id===h.spaceId)));}
 assert(new Set(spaces.map(s=>s.id)).size===spaces.length&&new Set(symbols.map(s=>s.id)).size===symbols.length&&symbols.every(s=>spaces.some(p=>p.id===s.parentId)));return {spaces,symbols,warnings:v.warnings.map(w=>text(w,1000)),...(openings?{openings}:{})};
}
async function authorized(ports:PlanPorts,proof:PlanProof,scope?:{accountId:string;agencyId:string;practiceId:string}){const ctx=await ports.context();requirePractice(ctx.actor,ctx.practice,'edit',ctx.now);if(scope)assert(scope.accountId===ctx.actor.accountId&&scope.agencyId===ctx.practice.agencyId&&scope.practiceId===ctx.practice.id,'plan_scope_changed');assert(evidenceCurrent(ctx.actor,ctx.practice,{...proof,excerpt:'Plan analysis source'},ctx.now),'plan_source_unavailable');const source=ctx.practice.sources.find(s=>s.id===proof.sourceId)!;assert(source.kind==='floor_plan','source_not_floor_plan');return ctx;}
export async function analyzePlan(ports:PlanPorts,input:{runId:string;proof:PlanProof;config:RasterConfig;maxUSDPerCall:number}){
 assert(typeof input.runId==='string'&&input.runId.trim()&&input.runId.length<=120&&Number.isFinite(input.maxUSDPerCall)&&input.maxUSDPerCall>0&&input.maxUSDPerCall<=1);
 const ctx=await authorized(ports,input.proof),scope={accountId:ctx.actor.accountId,agencyId:ctx.practice.agencyId,practiceId:ctx.practice.id};
 const raster=await ports.loadRaster(input.proof);assertRaster(raster);await authorized(ports,input.proof,scope);
 const rasterSHA256=createHash('sha256').update(raster.gray).digest('hex'),rasterSize={width:raster.width,height:raster.height};
 const rendering=raster.rendering?structuredClone(raster.rendering):null;
 const fingerprint=createHash('sha256').update(JSON.stringify({scope,proof:input.proof,config:input.config,rasterSize,rasterSHA256,rendering,pipeline:'raster-seeds-v9-coverage'})).digest('hex');
 const calls:Array<{phase:string;requestId:string;input:number;output:number;costUSD:number}>=[];
 async function call(phase:'inventory'|'review',previous:SeedProposal|null,segmentation:Segmentation|null){
  await authorized(ports,input.proof,scope);await ports.reserve(input.runId,phase,fingerprint,input.maxUSDPerCall);await authorized(ports,input.proof,scope);
  let result:Awaited<ReturnType<PlanPorts['ai']>>;
  try{result=await ports.ai({phase,raster,previous,segmentation,maxUSD:input.maxUSDPerCall});}catch(error){await ports.markUncertain(input.runId,phase);throw error;}
  assert(Number.isSafeInteger(result.inputTokens)&&result.inputTokens>=0&&Number.isSafeInteger(result.outputTokens)&&result.outputTokens>=0&&Number.isFinite(result.costUSD)&&result.costUSD>=0&&typeof result.requestId==='string'&&result.requestId.length>0,'provider_usage_invalid');
  // Settle even if semantic output is invalid, authorization expires or reported spend exceeds reservation.
  const usage={requestId:result.requestId,input:result.inputTokens,output:result.outputTokens,costUSD:result.costUSD};await ports.settle(input.runId,phase,usage);calls.push({phase,...usage});await authorized(ports,input.proof,scope);assert(result.costUSD<=input.maxUSDPerCall,'provider_cost_exceeded');return parseSeedProposal(result.proposal);
 }
 const first=await call('inventory',null,null),initial=segmentPlan(raster,recoverAnnexInventory(first.spaces),first.symbols,input.config);initial.coverage=discoverUnassignedAreas(raster,first.spaces,first.symbols,input.config,initial.regions);const review=await call('review',first,initial);
 let final=segmentPlan(raster,recoverAnnexInventory(review.spaces),review.symbols,input.config);const retainedSymbols:string[]=[];
 // Prevent observed regression: retain a valid, same-id/same-parent symbol proposal if review fails it.
 const merged=structuredClone(review);
 for(const symbol of first.symbols){const current=review.symbols.find(s=>s.id===symbol.id&&s.parentId===symbol.parentId);const prior=initial.regions.find(r=>r.id===symbol.parentId)?.symbols.find(s=>s.id===symbol.id);const after=final.regions.find(r=>r.id===symbol.parentId)?.symbols.find(s=>s.id===symbol.id);
  if(current&&prior?.status==='included'&&current.decision==='include'&&after?.status==='unresolved'&&merged.spaces.some(s=>s.id===symbol.parentId)){merged.symbols[merged.symbols.findIndex(s=>s.id===symbol.id)]=structuredClone(symbol);retainedSymbols.push(symbol.id);}
 }
 if(retainedSymbols.length)final=segmentPlan(raster,recoverAnnexInventory(merged.spaces),merged.symbols,input.config);
 const openingRecovery=recoverOpenings(raster,recoverAnnexInventory(merged.spaces),merged.symbols,input.config,merged.openings||[]);final=openingRecovery.segmentation;
 for(const opening of openingRecovery.reviews)final.issues.push({id:opening.id,code:opening.state==='proposed_recovery'?'opening_recovery_requires_review':'opening_requires_review'});
 await authorized(ports,input.proof,scope);
 final.coverage=discoverUnassignedAreas(raster,merged.spaces,merged.symbols,input.config,final.regions);
 if(final.coverage.candidates.length)final.issues.push({id:'coverage',code:'coverage_candidate_pending'});
 if(final.coverage.truncated)final.issues.push({id:'coverage',code:'coverage_search_limited'});
 const annexInventory=annexCensus(merged.spaces,final.regions.map(r=>r.id));
 const warnings=[...annexInventory.filter(a=>a.reviewExclusion).map(a=>'annex_exclusion_requires_review:'+a.id),...first.warnings,...review.warnings,...retainedSymbols.map(id=>'retained_previous_symbol:'+id)];
 let surfaceProposal:SurfaceProposal|null=null;const cuts=openingRecovery.reviews.filter(v=>v.state==='proposed_recovery'&&v.threshold).map(v=>v.threshold!);
 try{const copy=previewVirtualThresholds(raster,proposeThresholds(raster,cuts,input.config.threshold),cuts.map(v=>v.id),input.config.threshold).raster;surfaceProposal=createSurfaceProposal(copy,recoverAnnexInventory(merged.spaces),merged.symbols,input.config,final,fingerprint);}catch(error){if(!(error instanceof PlanError))throw error;warnings.push('surface_proposal_unresolved:'+error.code);final.issues.push({id:'surface-proposal',code:'surface_proposal_unresolved'});}
 // Pale scan fallback remains a separate adoptable proposal, not a silent profile change.
 if(!final.regions.length){const contrast=proposeInkThreshold(raster,merged.spaces,input.config);if(contrast){
  const config={...input.config,threshold:contrast.proposedThreshold},adapted=segmentPlan(raster,recoverAnnexInventory(merged.spaces),merged.symbols,config),excluded=merged.spaces.filter(s=>s.kind==='excluded');
  const safe=adapted.regions.length>0&&!adapted.issues.some(i=>i.code==='region_overlap')&&!adapted.regions.some(region=>excluded.some(s=>s.seeds.some(seed=>filled(seed,region))));
  if(safe){surfaceProposal={digest:'',state:'pending',sourceFingerprint:fingerprint,baseGeometryRevision:1,baseGeometryDigest:roomGeometryDigest(final.regions),baseIssues:structuredClone(final.issues),rooms:adapted.regions,issues:[...adapted.issues,...final.issues.filter(issue=>issue.code.startsWith('opening_')),{id:'contrast',code:'contrast_requires_review'}],summary:{doorArcs:0,serviceCells:0,exteriorStrips:0},contrast};surfaceProposal.digest=surfaceProposalDigest(surfaceProposal);}else warnings.push('contrast_proposal_unresolved');
 }}
 if(final.coverage.candidates.length){
  const current=surfaceProposal?.rooms||final.regions,additions=final.coverage.candidates.filter(c=>!current.some(v=>overlaps(v,c.region))).slice(0,Math.max(0,100-current.length));
  if(additions.length){const rooms=[...structuredClone(current),...additions.map(c=>structuredClone(c.region))],issues=(surfaceProposal?.issues||final.issues).filter(v=>v.code!=='coverage_candidate_pending');
   for(const c of final.coverage.candidates)issues.push({id:c.region.id,code:additions.some(v=>v.region.id===c.region.id)?'coverage_area_requires_review':'coverage_area_conflict'});
   const coverage={candidateIds:additions.map(v=>v.region.id),truncated:final.coverage.truncated};surfaceProposal={...(surfaceProposal||{}),digest:'',state:'pending',sourceFingerprint:fingerprint,baseGeometryRevision:1,baseGeometryDigest:roomGeometryDigest(final.regions),baseIssues:structuredClone(final.issues),rooms,issues,summary:{...(surfaceProposal?.summary||{doorArcs:0,serviceCells:0,exteriorStrips:0}),unassignedAreas:additions.length},coverage};surfaceProposal.digest=surfaceProposalDigest(surfaceProposal);
  }
 }
 await authorized(ports,input.proof,scope);
 // AI review never certifies coverage: agent confirms scope/scale/symbols and computation separately.
 return {runId:input.runId,fingerprint,rasterSize,rasterSHA256,rendering,proof:structuredClone(input.proof),scope,initial,final,surfaceProposal,proposal:merged,annexInventory,openingReviews:openingRecovery.reviews,retainedSymbols,warnings,calls,totalCostUSD:calls.reduce((s,c)=>s+c.costUSD,0),status:surfaceProposal||final.issues.length||annexInventory.some(a=>a.reviewExclusion)?'needs_review' as const:'draft' as const,confirmed:false as const,coverageConfirmed:false as const};
}
