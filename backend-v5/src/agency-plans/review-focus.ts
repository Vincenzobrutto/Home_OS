import {type Point} from './geometry';
import {assertRaster,type Raster,type Segmentation} from './raster';
import type {SeedProposal} from './pipeline';

/** Deterministic view windows from model observations; no case-specific coordinates. */
export function reviewFocus(r:Raster,previous:SeedProposal|null,segmentation:Segmentation|null){
 assertRaster(r);const anchors:Array<{id:string;center:Point;radius:number}>=[];
 for(const c of segmentation?.coverage?.candidates||[]){const p=c.region.points,x=p.map(v=>v[0]),y=p.map(v=>v[1]);anchors.push({id:c.region.id,center:[(Math.min(...x)+Math.max(...x))/2,(Math.min(...y)+Math.max(...y))/2],radius:Math.min(140,Math.max(70,Math.ceil(Math.max(Math.max(...x)-Math.min(...x),Math.max(...y)-Math.min(...y))/2+20)))});}
 for(const h of previous?.openings||[]){const span=Math.hypot(h.nearEnd[0]-h.nearStart[0],h.nearEnd[1]-h.nearStart[1]);anchors.push({id:h.id,center:[(h.nearStart[0]+h.nearEnd[0])/2,(h.nearStart[1]+h.nearEnd[1])/2],radius:Math.min(140,Math.max(70,Math.ceil(span*3)))});}
 for(const space of previous?.spaces||[]){if(space.kind==='bathroom'||segmentation?.issues.some(i=>i.id===space.id)){const p=space.seeds[0];if(p)anchors.push({id:space.id,center:p,radius:90});}}
 const result:Array<{id:string;origin:Point;scale:number;raster:Raster}>=[];
 for(const a of anchors){if(!a.center.every(Number.isFinite)||a.center[0]<0||a.center[1]<0||a.center[0]>=r.width||a.center[1]>=r.height)continue;
  if(result.some(v=>Math.hypot(v.origin[0]+v.raster.width/v.scale/2-a.center[0],v.origin[1]+v.raster.height/v.scale/2-a.center[1])<60))continue;
  const x=Math.max(0,Math.floor(a.center[0]-a.radius)),y=Math.max(0,Math.floor(a.center[1]-a.radius)),w=Math.min(r.width-x,a.radius*2),h=Math.min(r.height-y,a.radius*2),scale=3,gray=new Uint8Array(w*h*scale*scale);
  for(let yy=0;yy<h*scale;yy++)for(let xx=0;xx<w*scale;xx++)gray[yy*w*scale+xx]=r.gray[(y+Math.floor(yy/scale))*r.width+x+Math.floor(xx/scale)];
  result.push({id:a.id,origin:[x,y],scale,raster:{width:w*scale,height:h*scale,gray}});if(result.length===3)break;
 }
 return result;
}

/** Image overlay carries contours; text carries compact facts, not thousands of vertices. */
export function reviewDiagnostics(segmentation:Segmentation|null){
 if(!segmentation)return null;
 return {unassignedAreas:segmentation.coverage?{complete:false,truncated:segmentation.coverage.truncated,candidates:segmentation.coverage.candidates.map(c=>({id:c.region.id,seed:c.region.seed,pixelArea:c.region.pixelArea,neighbors:c.neighbors,requiresReview:true,shapeHint:c.shapeHint,shapeEvidence:c.shapeEvidence}))}:null,regions:segmentation.regions.map(v=>({id:v.id,kind:v.kind,seed:v.seed,pixelArea:v.pixelArea,bounds:[Math.min(...v.points.map(p=>p[0])),Math.min(...v.points.map(p=>p[1])),Math.max(...v.points.map(p=>p[0])),Math.max(...v.points.map(p=>p[1]))],symbols:v.symbols})),issues:segmentation.issues,duplicates:segmentation.duplicates,diagnostics:segmentation.diagnostics||[]};
}
