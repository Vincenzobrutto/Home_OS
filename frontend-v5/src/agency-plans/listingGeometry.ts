import type {PlanShape, Point} from './PlanMeasurementView';
import type {ListingAlignment, ListingWallRef} from './api';
import {insideShape} from './scaleDetection';

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
