import {Path2D,PathOp,FillType} from '@napi-rs/canvas';
import {assert,validPolygon,polygonArea,inside,overlaps,type Polygon,type Point} from './geometry';

function path(s:Polygon){const p=new Path2D([s.points,...s.holes].map(r=>'M'+r.map(v=>v.join(' ')).join('L')+'Z').join(''));p.setFillType(FillType.EvenOdd);return p;}
/** Polygon-only result, never rasterize/round to a pixel grid. Reject disconnected islands. */
function polygon(p:Path2D):Polygon{
 const svg=p.toSVGString();assert(svg.length>0&&svg.length<=200000,'manual_room_empty');
 const tokens=svg.match(/[MLZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
 assert(svg.replace(/[MLZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[\s,]/g,'')==='','manual_room_topology');
 const rings:Point[][]=[];let ring:Point[]=[];let count=0;
 for(let i=0;i<tokens.length;){const command=tokens[i++];if(command==='Z'){if(ring.length>1&&ring[0][0]===ring.at(-1)![0]&&ring[0][1]===ring.at(-1)![1])ring.pop();assert(ring.length>=3,'manual_room_topology');rings.push(ring);ring=[];continue;}assert(command==='M'||command==='L','manual_room_topology');if(command==='M')assert(!ring.length,'manual_room_topology');const a=Number(tokens[i++]),b=Number(tokens[i++]);assert(Number.isFinite(a)&&Number.isFinite(b)&&++count<=4096,'manual_room_topology');ring.push([a,b]);}
 assert(!ring.length&&rings.length>0&&rings.length<=101,'manual_room_topology');
 rings.sort((a,b)=>polygonArea({points:b,holes:[]})-polygonArea({points:a,holes:[]}));
 const result={points:rings[0],holes:rings.slice(1)};assert(result.holes.every(h=>h.every(v=>inside(v,result.points)))&&validPolygon(result),'manual_room_multiple_components');return result;
}
export function carveManualRoom(parent:Polygon,selection:Polygon){
 assert(validPolygon(parent)&&validPolygon(selection),'invalid_plan_input');
 const added=polygon(path(parent).op(path(selection),PathOp.Intersect));
 const remaining=polygon(path(parent).op(path(selection),PathOp.Difference));
 assert(!overlaps(added,remaining),'region_overlap');
 const area=polygonArea(parent);assert(Math.abs(area-polygonArea(added)-polygonArea(remaining))<=Math.max(.01,area*1e-6),'manual_room_area_changed');
 return {added,remaining};
}
