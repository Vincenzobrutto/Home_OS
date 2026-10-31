import {createHash} from 'node:crypto';
import {assert,overlaps,type Polygon} from './geometry';
import {detectInwardDoorArcs} from './door-arcs';
import {detectRectangularWallEnvelopes,inferWallOrientation,previewRoomSurfaces,type PreviewSurfaceRegion} from './room-surfaces';
import {selectServiceSurfaces} from './service-surfaces';
import {detectExteriorStrips} from './exterior-strips';
import type {Raster,RasterConfig,SeedSpace,SymbolRequest,Segmentation} from './raster';
import type {proposeInkThreshold} from './contrast';

export type SurfaceProposal={digest:string;state:'pending'|'applied'|'stale';sourceFingerprint:string;baseGeometryRevision:number;baseGeometryDigest:string;baseIssues:Segmentation['issues'];rooms:PreviewSurfaceRegion[];issues:Segmentation['issues'];summary:{doorArcs:number;serviceCells:number;exteriorStrips:number;unassignedAreas?:number};coverage?:{candidateIds:string[];truncated:boolean};contrast?:NonNullable<ReturnType<typeof proposeInkThreshold>>;acceptedAt?:string;acceptedBy?:string};
export function roomGeometryDigest(rooms:Array<Polygon&{id:string;label:string;kind:string}>){return createHash('sha256').update(JSON.stringify(rooms.map(v=>({id:v.id,label:v.label,kind:v.kind,points:v.points,holes:v.holes})))).digest('hex');}
export function surfaceProposalDigest(p:Omit<SurfaceProposal,'digest'>|SurfaceProposal){return createHash('sha256').update(JSON.stringify({version:'surface-proposal-v1',sourceFingerprint:p.sourceFingerprint,baseGeometryRevision:p.baseGeometryRevision,baseGeometryDigest:p.baseGeometryDigest,baseIssues:p.baseIssues,rooms:p.rooms,issues:p.issues,summary:p.summary,contrast:p.contrast,coverage:p.coverage},(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value)).digest('hex');}

/** Server-only local proposal: never adopts or confirms geometry during analysis. */
export function createSurfaceProposal(r:Raster,spaces:SeedSpace[],symbols:SymbolRequest[],config:RasterConfig,baseline:Segmentation,sourceFingerprint:string):SurfaceProposal|null{
 if(!baseline.regions.length)return null;
 const angle=inferWallOrientation(baseline.regions),arcs=baseline.regions.flatMap(room=>{const candidates=detectInwardDoorArcs(room,angle);return candidates.length===1?candidates:[];}),envelopes=[...arcs];let serviceCells=0;
 for(const service of spaces.filter(v=>v.kind==='bathroom')){const center=service.seeds.reduce<[number,number]>((a,p)=>[a[0]+p[0]/service.seeds.length,a[1]+p[1]/service.seeds.length],[0,0]);if(center[0]<0||center[1]<0||center[0]>=r.width||center[1]>=r.height)continue;const candidates=detectRectangularWallEnvelopes(r,{center,angleDegrees:angle,halfWidth:100,halfHeight:100,minimumDividerBandPixels:3,limit:30}),selected=selectServiceSurfaces(candidates,spaces,service.id);envelopes.push(...selected);serviceCells+=selected.length;}
 assert(envelopes.length<=8,'surface_proposal_review_limit');
 const preview=envelopes.length?previewRoomSurfaces(r,spaces,symbols,config,envelopes,envelopes.map(v=>v.id)).segmentation:structuredClone(baseline);
 const rooms:PreviewSurfaceRegion[]=structuredClone(preview.regions),issues=structuredClone(preview.issues);
 for(const issue of baseline.issues.filter(v=>v.code.startsWith('opening_')))if(!issues.some(v=>v.id===issue.id&&v.code===issue.code))issues.push(issue);
 const exterior=detectExteriorStrips(r,rooms,config);for(const candidate of exterior){rooms.push(candidate.region);issues.push({id:candidate.region.id,code:'exterior_use_and_association_require_review'});}
 if(!envelopes.length&&!exterior.length)return null;assert(rooms.length<=100&&new Set(rooms.map(v=>v.id)).size===rooms.length&&issues.length<=200,'surface_proposal_review_limit');
 for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++)assert(!overlaps(rooms[i],rooms[j]),'region_overlap');
 const proposal:SurfaceProposal={digest:'',state:'pending',sourceFingerprint,baseGeometryRevision:1,baseGeometryDigest:roomGeometryDigest(baseline.regions),baseIssues:structuredClone(baseline.issues),rooms,issues,summary:{doorArcs:arcs.length,serviceCells,exteriorStrips:exterior.length}};proposal.digest=surfaceProposalDigest(proposal);return proposal;
}
