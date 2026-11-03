import type {MapRoom,MapView,Point} from './api';
type Shape=Pick<MapRoom,'points'|'holes'>;
const edge=(p:Point,a:Point,b:Point)=>Math.abs((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))<1e-8&&p[0]>=Math.min(a[0],b[0])-1e-8&&p[0]<=Math.max(a[0],b[0])+1e-8&&p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8;
function inside(p:Point,ring:Point[]){if(ring.some((a,i)=>edge(p,a,ring[(i+1)%ring.length]!)))return false;let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i]!,b=ring[j]!;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function contains(shape:Shape,p:Point){return inside(p,shape.points)&&!shape.holes.some(r=>inside(p,r)||r.some((a,i)=>edge(p,a,r[(i+1)%r.length]!)));}
export function roomAt(rooms:MapRoom[],p:Point){const hits=rooms.filter(r=>r.state==='active'&&contains(r,p));return hits.length===1?hits[0]:null;}
export function fromClient(x:number,y:number,bounds:Pick<DOMRect,'left'|'top'|'width'|'height'>,frame:{width:number;height:number}):Point|null{if(!Number.isFinite(x)||!Number.isFinite(y)||bounds.width<=0||bounds.height<=0)return null;return [(x-bounds.left)/bounds.width*frame.width,(y-bounds.top)/bounds.height*frame.height];}
export const polygonPath=(r:Shape)=>[r.points,...r.holes].map(p=>'M '+p.map(v=>v.join(',')).join(' L ')+' Z').join(' ');
function boundaryDistance(r:Shape,p:Point){let distance=Infinity;for(const ring of [r.points,...r.holes])for(let i=0;i<ring.length;i++){const a=ring[i]!,b=ring[(i+1)%ring.length]!,dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));}return distance;}
function bounds(r:Shape){return {left:Math.min(...r.points.map(v=>v[0])),right:Math.max(...r.points.map(v=>v[0])),top:Math.min(...r.points.map(v=>v[1])),bottom:Math.max(...r.points.map(v=>v[1]))};}
/** Display-only anchors, never inferred physical coordinates or a database write. */
export function interiorCandidates(r:Shape,minimum=0):Point[]{
 const b=bounds(r),result:Point[]=[];
 for(let yi=1;yi<=9;yi++)for(let xi=1;xi<=9;xi++){const p:Point=[b.left+(b.right-b.left)*xi/10,b.top+(b.bottom-b.top)*yi/10];if(contains(r,p))result.push(p);}
 // Scanline fallback also handles very thin or concave regions and holes.
 const ys=[...new Set([r.points,...r.holes].flatMap(ring=>ring.map(p=>p[1])))].sort((a,b)=>a-b);
 const gaps=ys.slice(1).map((y,i)=>({y:(y+ys[i]!)/2,gap:y-ys[i]!})).sort((a,b)=>b.gap-a.gap).slice(0,32);
 const segments:{left:number;right:number;y:number}[]=[];
 for(const {y}of gaps){const xs:number[]=[];for(const ring of [r.points,...r.holes])for(let i=0;i<ring.length;i++){const a=ring[i]!,b=ring[(i+1)%ring.length]!;if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=1;i<xs.length;i++){const p:Point=[(xs[i-1]!+xs[i]!)/2,y];if(contains(r,p)){result.push(p);segments.push({left:xs[i-1]!,right:xs[i]!,y});}}}
 const seen=new Set<string>(),unique=result.filter(p=>{const key=p.join(',');if(seen.has(key))return false;seen.add(key);return true;});
 // If a room has more objects than grid slots, subdivide proven interior intervals.
 // Only display anchors change; saved owner coordinates are never resampled.
 if(unique.length<minimum&&segments.length){
  const divisions=minimum+1;
  for(let i=1;i<divisions&&unique.length<minimum;i++)for(const segment of segments){
   const p:Point=[segment.left+(segment.right-segment.left)*i/divisions,segment.y],key=p.join(',');
   if(!seen.has(key)&&contains(r,p)){seen.add(key);unique.push(p);}if(unique.length>=minimum)break;
  }
 }
 return unique;
}
export type DeviceMarker={key:string;objectId:string;name:string;regionId:string;roomName:string;point:Point;positionVersion:number;indicative:boolean;needsReview:boolean;multipleRooms:boolean};
export function deviceScene(data:MapView){
 const markers:DeviceMarker[]=[],unplaced:MapView['objects']=[];
 const active=data.rooms.filter(r=>r.state==='active'),occupied:Point[]=[];
 for(const obj of data.objects){const pin=data.pins.find(p=>p.objectId===obj.id),region=active.find(r=>r.id===pin?.regionId);
  // Old responses can still show their explicit stored pin, never fabricate an association.
  const ids=obj.roomIds??(region&&pin?[region.roomId]:[]);
  if(pin&&region&&ids.includes(region.roomId)&&contains(region,[pin.x,pin.y])){
   markers.push({key:obj.id+':'+region.id,objectId:obj.id,name:obj.name,regionId:region.id,roomName:region.name,point:[pin.x,pin.y],positionVersion:obj.positionVersion,indicative:false,needsReview:pin.needsReview,multipleRooms:ids.length>1});occupied.push([pin.x,pin.y]);
  }
 }
 for(const room of active){
  const objects=data.objects.filter(o=>(o.roomIds??[]).includes(room.roomId)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const candidates=interiorCandidates(room,objects.length),b=bounds(room),center:Point=[(b.left+b.right)/2,(b.top+b.bottom)/2];
  const anchors=candidates.map(point=>({point,used:occupied.some(q=>q[0]===point[0]&&q[1]===point[1]),clearance:boundaryDistance(room,point)*2,penalty:Math.hypot(point[0]-center[0],point[1]-center[1])*.01,distance:occupied.length?Math.min(...occupied.map(q=>Math.hypot(point[0]-q[0],point[1]-q[1]))):Math.hypot(b.right-b.left,b.bottom-b.top)}));
  for(const obj of objects){if(markers.some(p=>p.objectId===obj.id&&p.regionId===room.id))continue;
   let selected:typeof anchors[number]|undefined,score=-Infinity;
   for(const anchor of anchors){if(anchor.used)continue;const s=Math.min(anchor.distance/2,anchor.clearance)-anchor.penalty;if(s>score){selected=anchor;score=s;}}
   const best=selected?.point;
   if(!best)continue;
   selected!.used=true;for(const anchor of anchors)anchor.distance=Math.min(anchor.distance,Math.hypot(anchor.point[0]-best[0],anchor.point[1]-best[1]));
   markers.push({key:obj.id+':'+room.id,objectId:obj.id,name:obj.name,regionId:room.id,roomName:room.name,point:best,positionVersion:obj.positionVersion,indicative:true,needsReview:!!data.pins.find(p=>p.objectId===obj.id)?.needsReview,multipleRooms:(obj.roomIds?.length??0)>1});occupied.push(best);
  }
 }
 for(const obj of data.objects)if(!markers.some(p=>p.objectId===obj.id))unplaced.push(obj);
 return {markers,unplaced};
}
export function sceneFence(data:MapView){return JSON.stringify([data.id,data.version,data.geometryRevision,data.rooms.map(r=>[r.id,r.roomId,r.state]),data.objects.map(o=>[o.id,o.positionVersion,o.roomIds??null])]);}
