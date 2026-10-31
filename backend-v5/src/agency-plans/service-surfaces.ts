import {assert,filled,within,overlaps,polygonArea,type Point} from './geometry';
import type {SeedSpace} from './raster';
import type {SurfaceEnvelope} from './room-surfaces';

/** Propose a connected block of wall-supported cells near a censused service.
 * A larger enclosure wins only when its four wall supports are no weaker, not by area alone.
 * Nearby cells without AI seeds remain explicitly unclassified service candidates. */
export function selectServiceSurfaces(candidates:SurfaceEnvelope[],spaces:SeedSpace[],serviceId:string){
 const service=spaces.find(v=>v.id===serviceId&&v.kind==='bathroom');assert(service&&candidates.length<=30);
 const eligible=candidates.filter(e=>e.source==='wall_detector'&&e.wallSupport.length===4&&e.wallSupport.every(v=>Number.isFinite(v)&&v>=.5&&v<=1)&&!spaces.filter(s=>s.id!==serviceId).some(s=>s.seeds.some(p=>filled(p,e.geometry))));
 const maximal=eligible.filter(e=>!eligible.some(other=>e!==other&&polygonArea(other.geometry)>polygonArea(e.geometry)+1&&within(e.geometry,other.geometry)&&other.wallSupport.every((v,i)=>v>=e.wallSupport[i]-.015)));
 const ranked=maximal.sort((a,b)=>Math.min(...b.wallSupport)-Math.min(...a.wallSupport)||b.wallSupport.reduce((s,v)=>s+v,0)-a.wallSupport.reduce((s,v)=>s+v,0));
 const seeded=ranked.find(e=>service.seeds.some(p=>filled(p,e.geometry)));if(!seeded)return [];
 const selected=[seeded],near=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 for(const e of ranked){if(e===seeded||selected.some(v=>overlaps(e.geometry,v.geometry)))continue;if(selected.some(v=>v.geometry.points.some(a=>e.geometry.points.some(b=>near(a,b)<=12))))selected.push(e);if(selected.length===4)break;}
 return selected.map((e,i)=>({...e,id:i?serviceId+'-cell-'+(i+1):serviceId,label:i?'Cella di servizio candidata · destinazione da verificare':service.label,requiresInteriorReview:true as const}));
}
