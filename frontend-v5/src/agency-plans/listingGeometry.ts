import type {PlanShape, Point} from './PlanMeasurementView';
import type {ListingAlignment, ListingDetails, ListingOpening, ListingWallRef} from './api';
import {insideShape,isAppurtenance} from './scaleDetection';

type Segment = [Point, Point];

const EPSILON = 1e-7;
const samePoint = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) < EPSILON;
const cross = (a: Point, b: Point, c: Point) =>
 (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const edges = (ring: Point[]): Segment[] => ring.map((point, i) => [point, ring[(i + 1) % ring.length]!]);

function segmentsConflict([a,b]: Segment, [c,d]: Segment) {
 if ([0,1].some(axis => Math.max(a[axis]!, b[axis]!) + EPSILON < Math.min(c[axis]!, d[axis]!)
  || Math.max(c[axis]!, d[axis]!) + EPSILON < Math.min(a[axis]!, b[axis]!))) return false;
 const abC = cross(a,b,c), abD = cross(a,b,d), cdA = cross(c,d,a), cdB = cross(c,d,b);
 if (Math.abs(abC) < EPSILON && Math.abs(abD) < EPSILON &&
     Math.abs(cdA) < EPSILON && Math.abs(cdB) < EPSILON) {
  const axis = Math.abs(a[0]-b[0]) >= Math.abs(a[1]-b[1]) ? 0 : 1;
  return Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis])) -
   Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis])) > EPSILON;
 }
 if (samePoint(a,c)||samePoint(a,d)||samePoint(b,c)||samePoint(b,d)) return false;
 const sign = (value: number) => Math.abs(value) < EPSILON ? 0 : Math.sign(value);
 return sign(abC)*sign(abD) <= 0 && sign(cdA)*sign(cdB) <= 0;
}

function withinTolerance(start: Point, end: Point, samples: Point[], tolerance: number) {
 const dx = end[0]-start[0], dy = end[1]-start[1], length = Math.hypot(dx,dy);
 if (length < EPSILON) return false;
 // A short offset at the end of a long straight run should not tilt that wall.
 const path = [start,...samples,end];
 for (let i=1;i<path.length;i++) {
  const a=path[i-1]!, b=path[i]!;
  const horizontal = Math.abs(b[0]-a[0]), vertical = Math.abs(b[1]-a[1]);
  const nearlyAxial = vertical<horizontal*.005 || horizontal<vertical*.005;
  const perpendicularDrift = Math.abs(cross(start,end,b)-cross(start,end,a))/length;
  if (nearlyAxial && Math.hypot(horizontal,vertical)>length*.55 && perpendicularDrift>tolerance*.2) return false;
 }
 let previous = 0;
 return samples.every(point => {
  const distanceAlong = ((point[0]-start[0])*dx+(point[1]-start[1])*dy)/length;
  if (distanceAlong < -EPSILON || distanceAlong+tolerance < previous || distanceAlong > length+EPSILON ||
      Math.abs(cross(start,end,point))/length > tolerance) return false;
  previous = Math.max(previous,distanceAlong);
  return true;
 });
}

function isShortStep(start: Point, end: Point, samples: Point[], tolerance: number) {
 const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy);
 if (length<5*tolerance) return false;
 const raised=samples.filter(point=>Math.abs(cross(start,end,point))/length>tolerance*.3);
 if (!raised.length || raised.length===samples.length) return false;
 const along=raised.map(point=>((point[0]-start[0])*dx+(point[1]-start[1])*dy)/length);
 return Math.max(...along)-Math.min(...along)<=3.2*tolerance &&
  withinTolerance(start,end,samples,tolerance*1.8);
}

export function simplifyListingRooms(rooms: PlanShape[], tolerance: number): PlanShape[] {
 const originals = rooms.flatMap(room => [room.points,...room.holes]);
 const holes = new Set(rooms.flatMap(room => room.holes));
 // Bound the cost of the geometric checks for unusually detailed surveys.
 if (originals.reduce((total, ring) => total + ring.length, 0) > 2000) return rooms;
 const current = originals.map(ring => [...ring]);
 originals.forEach((original, ringIndex) => {
  const ring = current[ringIndex]!;
  if (ring.length < 4) return;
  const xs = ring.map(([x]) => x), ys = ring.map(([,y]) => y);
  const shortSpan = Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  const ringTolerance = Math.min(tolerance,shortSpan*(holes.has(original) ? .03 : .07));
  let signedArea = edges(ring).reduce((total,[a,b]) => total+cross([0,0],a,b),0);
  if (Math.abs(signedArea)<EPSILON) return;
  const retained = original.map((_,index) => index);
  const otherEdges = current.flatMap((other,i) => i === ringIndex ? [] : edges(other));
  let changed = true;
  while (changed && ring.length > 3) {
   changed = false;
   for (let startIndex = ring.length-1; startIndex >= 0 && ring.length > 3; startIndex--) {
    // Work on several consecutive segments at once so a stair-step can become one wall.
    const maxSpan = Math.min(24,ring.length-2);
    for (let span=maxSpan; span>=2; span--) {
     const endIndex = (startIndex+span)%ring.length;
     const start = ring[startIndex]!, end = ring[endIndex]!;
     const samples: Point[] = [];
     for (let j=(retained[startIndex]!+1)%original.length;j!==retained[endIndex];j=(j+1)%original.length) {
      samples.push(original[j]!);
     }
     const localTolerance = Math.min(ringTolerance,Math.hypot(end[0]-start[0],end[1]-start[1])/8);
     if (!withinTolerance(start,end,samples,localTolerance) &&
         (holes.has(original)||!isShortStep(start,end,samples,ringTolerance))) continue;

     const removed = new Set(Array.from({length:span-1},(_,i)=>(startIndex+i+1)%ring.length));
     const swept = Array.from({length:span+1},(_,i)=>ring[(startIndex+i)%ring.length]!);
     const sweptArea = edges(swept).reduce((total,[a,b])=>total+cross([0,0],a,b),0);
     const nextArea = signedArea-sweptArea;
     if (Math.abs(nextArea)<EPSILON || Math.sign(nextArea)!==Math.sign(signedArea)) continue;
     const replacement: Segment = [start,end];
     const insideSweep = (point: Point) => !samePoint(point,start) && !samePoint(point,end) &&
      insideShape(point,{points:swept,holes:[]});
     if (edges(ring).some((edge,i)=>i!==startIndex&&!removed.has(i)&&segmentsConflict(replacement,edge))) continue;
     if (ring.some((point,i)=>!removed.has(i)&&insideSweep(point))) continue;
     const oldPath = [start,...samples,end];
     const oldEdges = oldPath.slice(1).map((point,i): Segment=>[oldPath[i]!,point]);
     if (otherEdges.some(edge =>
      segmentsConflict(replacement,edge) ||
      oldEdges.some(originalEdge=>segmentsConflict(originalEdge,edge)) ||
      edge.some(point=>samples.some(sample=>samePoint(point,sample))||insideSweep(point))
     )) continue;

     for (const index of [...removed].sort((a,b)=>b-a)) {
      ring.splice(index,1);
      retained.splice(index,1);
     }
     signedArea = nextArea;
     changed = true;
     startIndex = Math.min(startIndex,ring.length);
     break;
    }
   }
  }
 });
 let index = 0;
 const drawing = rooms.map(room => ({...room,points:current[index++]!,holes:room.holes.map(() => current[index++]!)}));
 return alignFacingWalls(drawing,tolerance);
}

type Wall = {room: number; index: number; start: Point; end: Point; length: number; winding: number};
const signedArea = (ring: Point[]) => edges(ring).reduce((total,[a,b])=>total+cross([0,0],a,b),0);

function alignFacingWalls(rooms: PlanShape[], tolerance: number) {
 const walls: Wall[] = rooms.flatMap((room,index) => {
  if (room.kind==='excluded'||room.kind==='balcony'||/balcon|terraz/i.test(room.label)) return [];
  const winding=Math.sign(signedArea(room.points));
  return edges(room.points).map(([start,end],i)=>({
   room:index,index:i,start,end,length:Math.hypot(end[0]-start[0],end[1]-start[1]),winding,
  })).filter(wall=>wall.length>=3*tolerance && winding!==0);
 }).sort((a,b)=>b.length-a.length);
 const moved=new Set<Point>();
 const dot=([x,y]:Point,[dx,dy]:Point)=>x*dx+y*dy;
 const pair=(wall:Wall,reference:Wall): Point[] | undefined=>{
  if (wall.room===reference.room) return;
  const direction: Point = [(reference.end[0]-reference.start[0])/reference.length,
   (reference.end[1]-reference.start[1])/reference.length];
  const normal: Point = [-direction[1],direction[0]];
  const delta: Point = [wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]];
  const projection = dot(delta,direction);
  // Only opposite interior sides can be the faces of one wall.
  if (projection*wall.winding*reference.winding>=0 || Math.abs(projection)<wall.length*.98) return;
  const base=dot(reference.start,direction), a=dot(wall.start,direction)-base,b=dot(wall.end,direction)-base;
  if (Math.min(reference.length,Math.max(a,b))-Math.max(0,Math.min(a,b))<wall.length*.45) return;
  const referenceOffset=dot(reference.start,normal);
  const offsetA=dot(wall.start,normal)-referenceOffset,offsetB=dot(wall.end,normal)-referenceOffset;
  const gap=(offsetA+offsetB)/2, shift=(offsetB-offsetA)/2;
  if (gap*reference.winding>=0 || Math.abs(gap)<tolerance*.2 ||
      Math.abs(gap)>tolerance*2.5 || Math.abs(shift)<tolerance*.09 || Math.abs(shift)>tolerance*.9) return;
  return [[wall.start[0]+normal[0]*shift,wall.start[1]+normal[1]*shift],
   [wall.end[0]-normal[0]*shift,wall.end[1]-normal[1]*shift]];
 };

 for (let i=1;i<walls.length;i++) {
  const wall=walls[i]!, room=rooms[wall.room]!;
  if (moved.has(wall.start)||moved.has(wall.end)) continue;
  const endIndex=(wall.index+1)%room.points.length;
  const changedEdges=new Set([(wall.index+room.points.length-1)%room.points.length,wall.index,endIndex]);
  const originalEdges=edges(room.points);
  for (const reference of walls.slice(0,i)) {
   if (moved.has(reference.start)||moved.has(reference.end)) continue;
   const aligned=pair(wall,reference);
   if (!aligned) continue;
   const candidate=room.points.map((point,j)=>j===wall.index?aligned[0]!:j===endIndex?aligned[1]!:point);
   if (Math.sign(signedArea(candidate))!==wall.winding) continue;
   const candidateEdges=edges(candidate);
   const changed=[...changedEdges].map(j=>candidateEdges[j]!);
   if (changed.some(edge=>candidateEdges.some(other=>other!==edge&&segmentsConflict(edge,other)))) continue;
   const foreign=rooms.flatMap((other,j)=>[...(j===wall.room?[]:edges(other.points)),...other.holes.flatMap(edges)]);
   // Never open a wall already shared along a segment or create a new crossing.
   if (foreign.some(edge=>[...changedEdges].some(j=>{
    const prior=originalEdges[j]!;
    const shared=segmentsConflict(prior,edge)&&edge.every(point=>Math.abs(cross(...prior,point))<EPSILON);
    return shared||segmentsConflict(candidateEdges[j]!,edge);
   }))) continue;
   const sweep=[wall.start,wall.end,aligned[1]!,aligned[0]!];
   if (foreign.some(edge=>edge.some(point=>insideShape(point,{points:sweep,holes:[]})))) continue;
   room.points=candidate;
   moved.add(wall.start);moved.add(wall.end);
   break;
  }
 }
 return rooms;
}

/** Align the chosen edge to the direction of a reference while holding its midpoint. */
export function alignListingWall(rooms: PlanShape[], alignment: ListingAlignment): PlanShape[] | null {
 const locate=(wall:ListingWallRef)=>{
  const room=rooms.find(item=>item.id===wall.roomId);
  const index=room?.points.findIndex((point,i)=>samePoint(point,wall.start)&&samePoint(room.points[(i+1)%room.points.length]!,wall.end))??-1;
  return room&&index>=0?{room,index}:null;
 };
 const target=locate(alignment.target),reference=locate(alignment.reference);
 if(!target||!reference||(target.room===reference.room&&target.index===reference.index))return null;
 const {start,end}=alignment.target, guide=alignment.reference;
 const length=Math.hypot(guide.end[0]-guide.start[0],guide.end[1]-guide.start[1]);
 if(length<EPSILON)return null;
 const normal:Point=[(guide.start[1]-guide.end[1])/length,(guide.end[0]-guide.start[0])/length];
 const shift=((end[0]-start[0])*normal[0]+(end[1]-start[1])*normal[1])/2;
 const targetLength=Math.hypot(end[0]-start[0],end[1]-start[1]);
 if(Math.abs(shift)>targetLength*.23)return null;
 const next=(target.index+1)%target.room.points.length;
 const candidate=target.room.points.map((point,i):Point=>{
  const amount=i===target.index?shift:i===next?-shift:0;
  return amount?[point[0]+normal[0]*amount,point[1]+normal[1]*amount]:point;
 });
 const area=signedArea(candidate);
 if(Math.abs(area)<EPSILON||Math.sign(area)!==Math.sign(signedArea(target.room.points)))return null;
 const beforeEdges=edges(target.room.points),afterEdges=edges(candidate);
 const changedIndices=[(target.index+candidate.length-1)%candidate.length,target.index,next];
 const foreign=rooms.flatMap(room=>[...(room===target.room?[]:edges(room.points)),...room.holes.flatMap(edges)]);
 for(const i of changedIndices){
  const before=beforeEdges[i]!,after=afterEdges[i]!;
  if(samePoint(...after)||afterEdges.some((other,j)=>j!==i&&segmentsConflict(after,other)))return null;
  if(foreign.some(other=>segmentsConflict(after,other)||
   (segmentsConflict(before,other)&&other.every(point=>Math.abs(cross(...before,point))<EPSILON))))return null;
  const swept=[before[0],before[1],after[1],after[0]];
  if(foreign.some(edge=>edge.some(point=>!swept.some(corner=>samePoint(point,corner))&&insideShape(point,{points:swept,holes:[]}))))return null;
 }
 return rooms.map(room=>room===target.room?{...room,points:candidate}:room);
}

/** Rank nearby walls which overlap in projection and can safely guide the chosen side. */
export function suggestListingAlignments(rooms: PlanShape[], target: ListingWallRef) {
 const [a,b]=[target.start,target.end], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 if(length<EPSILON)return [];
 const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length;
 const along=([x,y]:Point)=>(x-a[0])*dx+(y-a[1])*dy;
 const across=([x,y]:Point)=>(y-a[1])*dx-(x-a[0])*dy;
 const choices=rooms.flatMap(room=>edges(room.points).flatMap(([start,end])=>{
  if(room.id===target.roomId || room.kind==='excluded'||room.kind==='balcony'||/balcon|terraz|giardin/i.test(room.label))return [];
  const span=Math.hypot(end[0]-start[0],end[1]-start[1]);
  if(span<length*.2)return [];
  const angle=Math.abs(across(end)-across(start))/span;
  if(angle<.008||angle>.22)return [];
  const u=along(start),v=along(end);
  const overlap=Math.min(length,Math.max(u,v))-Math.max(0,Math.min(u,v));
  const gap=Math.abs((across(start)+across(end))/2);
  if(overlap<Math.min(length,span)*.35||gap>Math.max(length,span)*.28)return [];
  const alignment={target,reference:{roomId:room.id,start,end}};
  const direction:Point=[(end[0]-start[0])/span,(end[1]-start[1])/span];
  return [{alignment,direction,score:gap/Math.min(length,span)+angle+(1-overlap/Math.min(length,span))*.15}];
 }));
 const alternatives:typeof choices=[];
 for(const item of choices.sort((a,b)=>a.score-b.score)){
  const [x,y]=item.direction;
  if(alternatives.some(({direction:[u,v]})=>Math.abs(x*v-y*u)<.006))continue;
  if(!alignListingWall(rooms,item.alignment))continue;
  alternatives.push(item);
  if(alternatives.length===3)break;
 }
 return alternatives.map(item=>item.alignment);
}

export function listingDrawing(rooms: PlanShape[], alignments: ListingAlignment[] = []) {
 const points=rooms.flatMap(room=>room.points);
 const xs=points.map(([x])=>x),ys=points.map(([,y])=>y);
 const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 return alignments.reduce((drawing,alignment)=>alignListingWall(drawing,alignment)??drawing,
  simplifyListingRooms(rooms,9*span/1440));
}

export function listingWalls(rooms: PlanShape[]) {
 const lines = new Map<string, {origin: Point; direction: Point; intervals: Array<[number,number]>}>();
 for (const room of rooms) {
  for (const ring of [room.points,...room.holes]) {
   for (const [a,b] of edges(ring)) {
    const length = Math.hypot(b[0]-a[0],b[1]-a[1]);
    if (length < EPSILON) continue;
    const [start,end] = a[0]<b[0] || (a[0]===b[0] && a[1]<b[1]) ? [a,b] : [b,a];
    const direction: Point = [(end[0]-start[0])/length,(end[1]-start[1])/length];
    const [dx,dy] = direction;
    const offset = dx*start[1]-dy*start[0];
    const key = [dx,dy,offset].map(n => Math.round(n*1e8)).join(':');
    const line = lines.get(key) ?? {origin:[-dy*offset,dx*offset],direction,intervals:[]};
    line.intervals.push([dx*start[0]+dy*start[1],dx*end[0]+dy*end[1]]);
    lines.set(key,line);
   }
  }
 }
 return [...lines.values()].flatMap(({origin,direction,intervals}) => {
  const merged: Array<[number,number]> = [];
  for (const interval of intervals.sort((a,b) => a[0]-b[0])) {
   const last = merged.at(-1);
   if (last && interval[0] <= last[1]+EPSILON) last[1] = Math.max(last[1],interval[1]);
   else merged.push(interval);
  }
  const pointAt = (position: number): Point => [origin[0]+direction[0]*position,origin[1]+direction[1]*position];
  return merged.map(([start,end]): Segment => [pointAt(start),pointAt(end)]);
 });
}

export function listingIllustration(rooms:PlanShape[],details?:Pick<ListingDetails,'alignments'|'contours'|'openings'>){
 const overrides=new Map(details?.contours?.map(entry=>[entry.id,entry.geometry]));
 const drawing=listingDrawing(rooms,details?.alignments).map(room=>{
  const geometry=overrides.get(room.id);
  return geometry?{...room,...geometry}:room;
 });
 const points=drawing.flatMap(room=>room.points);
 if(!points.length||points.length>4096)return drawing;
 const span=Math.max(...([0,1] as const).map(axis=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]))));
 const protectedRooms=new Set(overrides.keys());
 for(const alignment of details?.alignments??[]){
  protectedRooms.add(alignment.target.roomId);
  protectedRooms.add(alignment.reference.roomId);
 }
 for(const room of drawing){
  if(details?.openings?.some(({start,end})=>edges(room.points).some(edge=>{
   if(distance(...edge)<EPSILON)return false;
   return [start,end].every(point=>distance(point,at(edge,unit(fraction(point,edge))))<span*.015);
  })))protectedRooms.add(room.id);
 }
 const squared=orthogonalListingRooms(drawing,span,protectedRooms);
 return suggestInternalWallThickness(squared,protectedRooms)?.drawing??squared;
}

function orthogonalListingRooms(drawing:PlanShape[],span:number,protectedRooms:Set<string>){
 let result=drawing;
 for(const original of drawing){
  if(original.kind==='excluded'||protectedRooms.has(original.id))continue;
  let room=original;
  const axes=edges(room.points).map(([a,b])=>{
   const axis=Math.abs(a[0]-b[0])<Math.abs(a[1]-b[1])?0:1;
   return distance(a,b)>=span*.015&&Math.abs(a[axis]-b[axis])<=Math.min(span*.0075,distance(a,b)*.035)?axis:null;
  });
  for(let i=0;i<axes.length;i++){
   const axis=axes[i],next=(i+1)%axes.length,previous=(i+axes.length-1)%axes.length;
   if(axis==null||axes[next]===axis||axes[previous]===axis)continue;
   const a:Point=[...room.points[i]!],b:Point=[...room.points[next]!];
   if(Math.abs(a[axis]-b[axis])<EPSILON)continue;
   a[axis]=b[axis]=(a[axis]+b[axis])/2;
   const corrected=changeListingPoints(result,room,new Map([[i,a],[next,b]]),true);
   if(!corrected)continue;
   room=corrected;
   result=result.map(item=>item.id===room.id?room:item);
  }
 }
 return result;
}

const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const at=([a,b]:Segment,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const fraction=(p:Point,[a,b]:Segment)=>((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/distance(a,b)**2;
const unit=(t:number)=>Math.min(1,Math.max(0,t));

/** Place a resized or moved opening on one wall, without independently snapping its ends. */
export function placeListingOpening(opening:ListingOpening,walls:Segment[],limit:number,near?:Point):ListingOpening|null{
 const {start,end}=opening,length=distance(start,end);
 if(length<EPSILON)return null;
 let best=limit, result:ListingOpening|null=null;
 for(const wall of walls){
  const span=distance(...wall);
  if(span<EPSILON)continue;
  if(near){
   if(length>span+EPSILON)continue;
   const half=length/span/2;
   const t=Math.max(half,Math.min(1-half,fraction(near,wall)));
   const offset=distance(near,at(wall,t));
   if(offset>best)continue;
   best=offset;
   result={...opening,start:at(wall,t-half),end:at(wall,t+half),fixed:true};
  }else{
   const parallel=Math.abs((end[0]-start[0])*(wall[1][0]-wall[0][0])+(end[1]-start[1])*(wall[1][1]-wall[0][1]))/(length*span);
   if(parallel<.95)continue;
   const u=unit(fraction(start,wall)),v=unit(fraction(end,wall));
   if(Math.abs(u-v)*span<length*.55)continue;
   const a=at(wall,u),b=at(wall,v);
   const offset=Math.max(distance(a,start),distance(b,end));
   if(offset>best)continue;
   best=offset;
   result={...opening,start:a,end:b,fixed:true};
  }
 }
 return result;
}

export const DEFAULT_LISTING_DOOR_METRES=.8;

export function placeScaledListingDoor(point:Point,walls:Segment[],limit:number,metresPerPixel:Point,
 drawing:PlanShape[]=[],maxGap=0):ListingOpening|null{
 let best=limit,opening:ListingOpening|null=null;
 let placement:{wall:Segment;centre:number;halfWidth:number}|null=null;
 for(const wall of walls){
  const [a,b]=wall;
  const metres=Math.hypot((b[0]-a[0])*metresPerPixel[0],(b[1]-a[1])*metresPerPixel[1]);
  if(metres<DEFAULT_LISTING_DOOR_METRES)continue;
  const projected=unit(fraction(point,wall));
  const gap=distance(point,at(wall,projected));
  if(gap>best)continue;
  const halfWidth=DEFAULT_LISTING_DOOR_METRES/(2*metres);
  const centre=Math.max(halfWidth,Math.min(1-halfWidth,projected));
  opening=doorAt(wall,centre,halfWidth);
  placement={wall,centre,halfWidth};
  best=gap;
 }
 if(!opening||!placement||!drawing.length||listingDoorOpposite(opening,drawing,maxGap))return opening;

 // Near a junction, fit the whole opening inside the section shared by both walls.
 const {wall,centre,halfWidth}=placement;
 let closest=halfWidth;
 for(const room of drawing)for(const point of room.points){
  const end=fraction(point,wall);
  for(const candidate of [end-halfWidth,end+halfWidth]){
   const shift=Math.abs(centre-candidate);
   if(shift>=closest||candidate<halfWidth||candidate>1-halfWidth)continue;
   const fitted=doorAt(wall,candidate,halfWidth);
   if(!listingDoorOpposite(fitted,drawing,maxGap))continue;
   opening=fitted;
   closest=shift;
  }
 }
 return opening;
}

function doorAt(wall:Segment,centre:number,halfWidth:number):ListingOpening{
 return {kind:'door',start:at(wall,centre-halfWidth),end:at(wall,centre+halfWidth),fixed:true};
}

/** Find the facing room contour so both faces share one opening. */
export function listingDoorOpposite(opening:ListingOpening,drawing:PlanShape[],maxGap:number):Segment|null{
 if(opening.kind!=='door')return null;
 const {start,end}=opening;
 const width=distance(start,end);
 if(width<EPSILON)return null;
 const direction:Point=[(end[0]-start[0])/width,(end[1]-start[1])/width];
 const faces=drawing.filter(room=>room.kind!=='excluded').flatMap(room=>{
  const winding=Math.sign(signedArea(room.points));
  return edges(room.points).flatMap(wall=>{
   const [a,b]=wall,length=distance(a,b);
   if(length<EPSILON)return [];
   const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length;
   if(Math.abs(dx*direction[0]+dy*direction[1])<.985)return [];
   const u=fraction(start,wall),v=fraction(end,wall);
   if(Math.min(u,v)<-EPSILON||Math.max(u,v)>1+EPSILON)return [];
   const segment:Segment=[at(wall,unit(u)),at(wall,unit(v))];
   return [{id:room.id,segment,inward:[-dy*winding,dx*winding] as Point,
    gap:Math.max(distance(start,segment[0]),distance(end,segment[1]))}];
  });
 });
 const anchor=faces.find(face=>face.gap<EPSILON);
 if(!anchor)return null;
 let nearest=Math.min(maxGap,width*.7),opposite:Segment|null=null;
 for(const face of faces){
  if(face.id===anchor.id||face.gap>nearest)continue;
  if(face.inward[0]*anchor.inward[0]+face.inward[1]*anchor.inward[1]>-.985)continue;
  const shift:Point=[face.segment[0][0]-start[0],face.segment[0][1]-start[1]];
  if(shift[0]*anchor.inward[0]+shift[1]*anchor.inward[1]>EPSILON)continue;
  nearest=face.gap;
  opposite=face.segment;
 }
 return opposite;
}

export function changeListingVertex(drawing:PlanShape[],id:string,index:number,point:Point,snapDistance=0){
 const room=drawing.find(item=>item.id===id);
 if(!room?.points[index])return null;
 const previous=room.points[(index+room.points.length-1)%room.points.length]!;
 const next=room.points[(index+1)%room.points.length]!;
 const x=Math.abs(previous[0]-point[0])<=Math.abs(next[0]-point[0])?previous:next;
 const y=Math.abs(previous[1]-point[1])<=Math.abs(next[1]-point[1])?previous:next;
 const dx=Math.abs(x[0]-point[0]),dy=Math.abs(y[1]-point[1]);
 const snapped:Point=[
  dx<=snapDistance&&(x!==y||dy>snapDistance||dx<=dy)?x[0]:point[0],
  dy<=snapDistance&&(x!==y||dx>snapDistance||dy<dx)?y[1]:point[1],
 ];
 return changeListingPoints(drawing,room,new Map([[index,snapped]]));
}

type GuideAxis=0|1;

export function listingAlignmentGuides(drawing:PlanShape[],before:PlanShape,after:PlanShape,
 subject:{vertex:number}|{edge:number},tolerance:number){
 const size=after.points.length;
 const moving='edge' in subject?[after.points[subject.edge]!,after.points[(subject.edge+1)%size]!]:[after.points[subject.vertex]!];
 const references=drawing.flatMap(room=>edges(room.points).filter(([a,b],i)=>
  room.id!==before.id||(samePoint(a,after.points[i]!)&&samePoint(b,after.points[(i+1)%size]!))));
 const guides:Segment[]=[];
 for(const axis of [0,1] as const){
  const along:GuideAxis=axis===0?1:0;
  const movingFrom=Math.min(...moving.map(point=>point[along]));
  const movingTo=Math.max(...moving.map(point=>point[along]));
  let best:Segment|undefined,bestOffset=Infinity,bestGap=Infinity;
  for(const [a,b] of references){
   if(Math.abs(a[axis]-b[axis])>EPSILON||Math.abs(a[along]-b[along])<EPSILON)continue;
   const offset=Math.max(...moving.map(point=>Math.abs(point[axis]-a[axis])));
   if(offset>tolerance||offset>bestOffset)continue;
   const refFrom=Math.min(a[along],b[along]),refTo=Math.max(a[along],b[along]);
   const gap=Math.max(0,refFrom-movingTo,movingFrom-refTo);
   if(offset===bestOffset&&gap>=bestGap)continue;
   const start=Math.min(refFrom,movingFrom),end=Math.max(refTo,movingTo);
   best=axis===0?[[a[0],start],[a[0],end]]:[[start,a[1]],[end,a[1]]];
   bestOffset=offset;
   bestGap=gap;
  }
  if(best)guides.push(best);
 }
 return guides;
}

/** Move both endpoints by the same perpendicular offset, preserving the wall's direction. */
export function moveListingWall(drawing:PlanShape[],id:string,index:number,delta:Point){
 const room=drawing.find(item=>item.id===id);
 if(!room?.points[index])return null;
 const next=(index+1)%room.points.length;
 const a=room.points[index]!,b=room.points[next]!;
 const length=distance(a,b);
 if(length<EPSILON)return null;
 const normal:Point=[(a[1]-b[1])/length,(b[0]-a[0])/length];
 const offset=delta[0]*normal[0]+delta[1]*normal[1];
 if(Math.abs(offset)<EPSILON)return null;
 const shift=([x,y]:Point):Point=>[x+offset*normal[0],y+offset*normal[1]];
 return changeListingPoints(drawing,room,new Map([[index,shift(a)],[next,shift(b)]]));
}

/** Propose one common thickness for comparable, facing interior walls.
 * Only unambiguous straight pairs are moved; the centre of each wall stays put. */
export function suggestInternalWallThickness(drawing:PlanShape[],protectedRooms?:ReadonlySet<string>){
 const points=drawing.flatMap(room=>room.points);
 if(!points.length||points.length>4096)return null;
 const span=Math.max(...([0,1] as const).map(axis=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]))));
 const faces=drawing.filter(room=>!room.holes.length&&!room.symbols?.length&&room.kind!=='excluded'&&!isAppurtenance(room)).flatMap(room=>{
  const winding=Math.sign(signedArea(room.points));
  return edges(room.points).flatMap(([a,b],index)=>{
   const axis=Math.abs(a[0]-b[0])<Math.abs(a[1]-b[1])?0:1;
   const along=axis===0?1:0,spread=Math.abs(a[axis]-b[axis]);
   if(distance(a,b)<span*.06||spread>Math.abs(a[along]-b[along])*.025)return [];
   const inward=(axis===0?-1:1)*Math.sign(b[along]-a[along])*winding;
   return [{id:room.id,index,axis,offset:(a[axis]+b[axis])/2,spread,inward,from:Math.min(a[along],b[along]),to:Math.max(a[along],b[along])}];
  });
 });
 if(faces.length>300)return null;
 const pairs=faces.flatMap((a,i)=>faces.slice(i+1).flatMap(b=>{
  if(a.id===b.id||a.axis!==b.axis||a.inward===b.inward||(b.offset-a.offset)*a.inward>=0)return [];
  const gap=Math.abs(b.offset-a.offset),start=Math.max(a.from,b.from),end=Math.min(a.to,b.to);
  const lengths=[a.to-a.from,b.to-b.from];
  const minimumOverlap=protectedRooms?Math.max(span*.035,.65*Math.min(...lengths)):.85*Math.max(...lengths);
  if(gap<EPSILON||gap>span*.035||end-start<minimumOverlap)return [];
  const middle=(a.offset+b.offset)/2;
  const blocked=[.2,.5,.8].some(t=>{
   const along=start+(end-start)*t;
   const point:Point=a.axis===0?[middle,along]:[along,middle];
   return drawing.some(room=>room.id!==a.id&&room.id!==b.id&&insideShape(point,room));
  });
  return blocked?[]:[{a,b,gap}];
 }));
 const clear=pairs.filter(({a,b})=>pairs.filter(pair=>pair.a===a||pair.b===a||pair.a===b||pair.b===b).length===1);
 if(clear.length<2)return null;
 const ordered=clear.map(pair=>pair.gap).sort((a,b)=>a-b);
 const nominal=(ordered[Math.floor((ordered.length-1)/2)]!+ordered[Math.floor(ordered.length/2)]!)/2;
 if(!(nominal>0))return null;
 let result=drawing,adjusted=0;
 const used=new Set<string>();
 const keys=(face:typeof faces[number])=>[face.id+':'+face.index,face.id+':'+(face.index+1)%drawing.find(room=>room.id===face.id)!.points.length];
 for(const {a,b,gap} of clear){
  if(protectedRooms?.has(a.id)||protectedRooms?.has(b.id)||gap<EPSILON)continue;
  if((Math.abs(gap-nominal)<(protectedRooms?EPSILON:.2)&&a.spread+b.spread<.2)||Math.abs(gap-nominal)+(a.spread+b.spread)/2>nominal*(protectedRooms ? .4 : .25)||
     [...keys(a),...keys(b)].some(key=>used.has(key)))continue;
  const delta=(b.offset-a.offset-nominal*Math.sign(b.offset-a.offset))/2;
  const move=(rooms:PlanShape[],face:typeof a,offset:number)=>{
   const room=rooms.find(r=>r.id===face.id)!;
   return changeListingPoints(rooms,room,new Map([face.index,(face.index+1)%room.points.length].map(i=>{
    const point:Point=[...room.points[i]!];point[face.axis]=offset;return [i,point];
   })),!!protectedRooms);
  };
  const first=move(result,a,a.offset+delta);if(!first)continue;
  const step=result.map(room=>room.id===first.id?first:room);
  const second=move(step,b,b.offset-delta);if(!second)continue;
  result=step.map(room=>room.id===second.id?second:room);
  for(const key of [...keys(a),...keys(b)])used.add(key);
  adjusted++;
 }
 return adjusted?{drawing:result,adjusted,nominal}:null;
}

function changeListingPoints(drawing:PlanShape[],room:PlanShape,changes:Map<number,Point>,preserveShared=false){
 const points=room.points.map((current,i)=>changes.get(i)??current);
 const before=edges(room.points),after=edges(points);
 const affected=new Set([...changes.keys()].flatMap(i=>[(i+points.length-1)%points.length,i]));
 const neighbours=drawing.filter(other=>other!==room);
 if(Math.sign(signedArea(points))!==Math.sign(signedArea(room.points)))return null;
 if([...affected].some(i=>{
  const edge=after[i]!;
  return samePoint(...edge)||after.some((other,j)=>i!==j&&segmentsConflict(edge,other))||
   room.holes.some(hole=>edges(hole).some(other=>segmentsConflict(edge,other)))||
   neighbours.some(other=>edges(other.points).some(side=>{
    const prior=before[i]!,overlapped=segmentsConflict(prior,side);
    const shared=overlapped&&side.every(point=>Math.abs(cross(...prior,point))<EPSILON);
    return (preserveShared&&shared&&(!samePoint(edge[0],prior[0])||!samePoint(edge[1],prior[1])))||segmentsConflict(edge,side)&&!overlapped;
   }));
 }))return null;
 if(room.holes.some(hole=>hole.some(p=>!insideShape(p,{points,holes:[]}))))return null;
 if(neighbours.some(other=>other.kind!=='excluded'&&(
  [...changes].some(([index,point])=>insideShape(point,other)&&!edges(other.points).some(side=>distance(point,at(side,unit(fraction(point,side))))<EPSILON)&&!insideShape(room.points[index]!,other))||
  other.points.some(p=>insideShape(p,{points,holes:room.holes})&&!after.some(side=>distance(p,at(side,unit(fraction(p,side))))<EPSILON)&&!insideShape(p,room))
 )))return null;
 return {...room,points};
}

/** Keep a manually placed opening on its wall when an endpoint of that wall moves. */
export function carryListingOpening(opening:ListingOpening,before:PlanShape,after:PlanShape){
 if(!opening.fixed)return opening;
 for(const [i,wall] of edges(before.points).entries()){
  if(distance(...wall)<EPSILON)continue;
  const u=fraction(opening.start,wall),v=fraction(opening.end,wall);
  if([u,v].some(t=>t< -EPSILON||t>1+EPSILON)||distance(opening.start,at(wall,u))>EPSILON||distance(opening.end,at(wall,v))>EPSILON)continue;
  const changed:Segment=[after.points[i]!,after.points[(i+1)%after.points.length]!];
  if(samePoint(wall[0],changed[0])&&samePoint(wall[1],changed[1]))continue;
  return {...opening,start:at(changed,unit(u)),end:at(changed,unit(v))};
 }
 return opening;
}

export function listingOpeningOnDrawing(opening:ListingOpening,walls:Segment[],drawingSpan:number){
 return opening.fixed?opening:placeListingOpening(opening,walls,18*drawingSpan/1440)??opening;
}
