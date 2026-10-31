import {filled,inside,overlaps,type Point,type Polygon} from './geometry';
import {rasterComponents,segmentPlan,type Raster,type RasterConfig,type SeedSpace,type SymbolRequest,type Region} from './raster';
export type CoverageCandidate={region:Region;neighbors:string[];clearancePixels:number;source:'unassigned_component';requiresReview:true};
export type CoverageReport={candidates:CoverageCandidate[];truncated:boolean;scope:'closed_components_between_known_interiors';complete:false};
const bounds=(p:Polygon)=>({x:Math.min(...p.points.map(v=>v[0])),y:Math.min(...p.points.map(v=>v[1])),xx:Math.max(...p.points.map(v=>v[0])),yy:Math.max(...p.points.map(v=>v[1]))});
function hull(points:Point[]):Point[]{const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),chain=(list:Point[])=>{const out:Point[]=[];for(const q of list){while(out.length>1&&cross(out[out.length-2],out[out.length-1],q)<=0)out.pop();out.push(q);}return out;};return [...chain(p).slice(0,-1),...chain([...p].reverse()).slice(0,-1)];}
const distance=(p:Point,a:Point,b:Point)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function nearestBoundary(p:Point,shape:Polygon):Point{let best:Point=shape.points[0],minimum=Infinity;for(const [i,a]of shape.points.entries()){const b=shape.points[(i+1)%shape.points.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q:Point=[a[0]+t*dx,a[1]+t*dy],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<minimum){minimum=d;best=q;}}return best;}
function closeTo(a:Polygon,b:Polygon,gap:number){return a.points.some(p=>b.points.some((q,i)=>distance(p,q,b.points[(i+1)%b.points.length])<=gap))||b.points.some(p=>a.points.some((q,i)=>distance(p,q,a.points[(i+1)%a.points.length])<=gap));}

/** Independent local census of CLOSED, unclaimed white components. Never asserts ownership/use or complete coverage. */
export function discoverUnassignedAreas(r:Raster,spaces:SeedSpace[],symbols:SymbolRequest[],config:RasterConfig,known:Region[]):CoverageReport{
 const empty:CoverageReport={candidates:[],truncated:false,scope:'closed_components_between_known_interiors',complete:false};
 const interior=known.filter(v=>v.kind!=='balcony'&&v.kind!=='excluded');if(interior.length<2)return empty;
 const {width:w,height:h}=r,{labels,components}=rasterComponents(r,config.threshold),claimed=new Set<number>();
 const at=(p:Point)=>Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.round(p[0])>=0&&Math.round(p[0])<w&&Math.round(p[1])>=0&&Math.round(p[1])<h?labels[Math.round(p[1])*w+Math.round(p[0])]:0;
 for(const room of known)claimed.add(at(room.seed));
 for(const s of spaces.filter(v=>v.kind==='excluded'))for(const seed of s.seeds)claimed.add(at(seed)); // alternative seeds of accepted spaces do not prove geometric coverage
 for(const s of symbols)for(const seed of s.seeds)claimed.add(at(seed));
 const possible=new Set(components.flatMap((c,i)=>i&&!claimed.has(i)&&!c.border&&c.size>=config.minRegionPixels&&c.size<=w*h*Math.min(config.maxRegionFraction,.15)?[i]:[]));if(!possible.size)return empty;
 const envelope=hull(interior.flatMap(v=>v.points));if(envelope.length<3)return empty;
 // Maximum clearance chooses a seed from pixels, independent of reference geometry or room names.
 const d=new Uint16Array(labels.length);for(let i=0;i<d.length;i++)d[i]=labels[i]&&i%w&&i%w<w-1&&i>=w&&i<w*(h-1)?60000:0;
 for(let y=1;y<h;y++)for(let x=1;x<w;x++){const i=y*w+x;if(d[i])d[i]=Math.min(d[i],d[i-1]+1,d[i-w]+1);}
 for(let y=h-2;y>=0;y--)for(let x=w-2;x>=0;x--){const i=y*w+x;if(d[i])d[i]=Math.min(d[i],d[i+1]+1,d[i+w]+1);}
 const seeds=new Map<number,{point:Point;clearance:number}>();for(let i=0;i<labels.length;i++){const id=labels[i];if(!possible.has(id))continue;const old=seeds.get(id);if(!old||d[i]>old.clearance)seeds.set(id,{point:[i%w,Math.floor(i/w)],clearance:d[i]});}
 const candidates=[...seeds].filter(([,s])=>s.clearance>=2&&inside(s.point,envelope)&&!known.some(v=>filled(s.point,v))).sort((a,b)=>a[1].point[1]-b[1].point[1]||a[1].point[0]-b[1].point[0]);
 const limit=24,selected=candidates.slice(0,limit),prefix='unassigned-',spaceIds=new Set([...spaces,...known].map(v=>v.id));const seedSpaces=selected.map(([id,s],index)=>{let name=prefix+id;while(spaceIds.has(name))name='_'+name;spaceIds.add(name);return{id:name,label:'Area non censita '+(index+1)+' da verificare',kind:'room' as const,seeds:[s.point]};});
 if(!seedSpaces.length)return empty;
 const segmented=segmentPlan(r,seedSpaces,[],config),gap=Math.max(3,Math.hypot(w,h)*.012),boxes=new Map(interior.map(v=>[v.id,bounds(v)]));
 const result:CoverageCandidate[]=[];for(const region of segmented.regions){if(known.some(v=>overlaps(region,v)))continue;const a=bounds(region),neighbors=interior.filter(v=>{const b=boxes.get(v.id)!;return Math.hypot(Math.max(0,a.x-b.xx,b.x-a.xx),Math.max(0,a.y-b.yy,b.y-a.yy))<=gap&&closeTo(region,v,gap);}).map(v=>v.id);if(neighbors.length<2)continue;const center:Point=[(a.x+a.xx)/2,(a.y+a.yy)/2],vectors=neighbors.map(id=>{const q=nearestBoundary(center,interior.find(v=>v.id===id)!);return[q[0]-center[0],q[1]-center[1]];});const opposed=vectors.some((v,i)=>vectors.slice(i+1).some(q=>(v[0]*q[0]+v[1]*q[1])/(Math.hypot(...v)*Math.hypot(...q)||1)<=-.5));if(neighbors.length<3&&!opposed)continue;const seed=seeds.get(region.component)!;result.push({region,neighbors,clearancePixels:seed.clearance,source:'unassigned_component',requiresReview:true});}
 return{...empty,candidates:result.slice(0,12),truncated:candidates.length>limit||result.length>12||segmented.regions.length<seedSpaces.length};
}
