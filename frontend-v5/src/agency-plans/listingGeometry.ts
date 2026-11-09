import type {PlanShape, Point} from './PlanMeasurementView';

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
 let previous = 0;
 return samples.every(point => {
  const distanceAlong = ((point[0]-start[0])*dx+(point[1]-start[1])*dy)/length;
  if (distanceAlong+EPSILON < previous || distanceAlong > length+EPSILON ||
      Math.abs(cross(start,end,point))/length > tolerance) return false;
  previous = distanceAlong;
  return true;
 });
}

function insideTriangle(point: Point, a: Point, b: Point, c: Point) {
 const signs = [cross(a,b,point),cross(b,c,point),cross(c,a,point)];
 return signs.every(n => n > EPSILON) || signs.every(n => n < -EPSILON);
}

export function simplifyListingRooms(rooms: PlanShape[], tolerance: number): PlanShape[] {
 const originals = rooms.flatMap(room => [room.points,...room.holes]);
 // Bound the cost of the geometric checks for unusually detailed surveys.
 if (originals.reduce((total, ring) => total + ring.length, 0) > 2000) return rooms;
 const current = originals.map(ring => [...ring]);
 originals.forEach((original, ringIndex) => {
  const ring = current[ringIndex]!;
  if (ring.length < 4) return;
  const xs = ring.map(([x]) => x), ys = ring.map(([,y]) => y);
  const shortSpan = Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  const ringTolerance = Math.min(tolerance,shortSpan*.03);
  let signedArea = edges(ring).reduce((total,[a,b]) => total+cross([0,0],a,b),0);
  if (Math.abs(signedArea)<EPSILON) return;
  const retained = original.map((_,index) => index);
  const otherEdges = current.flatMap((other,i) => i === ringIndex ? [] : edges(other));
  let changed = true;
  while (changed && ring.length > 3) {
   changed = false;
   for (let i = ring.length-1; i >= 0 && ring.length > 3; i--) {
    const before = (i+ring.length-1)%ring.length, after = (i+1)%ring.length;
    const start = ring[before]!, vertex = ring[i]!, end = ring[after]!;
    const samples: Point[] = [];
    for (let j = (retained[before]!+1)%original.length; j !== retained[after]; j = (j+1)%original.length) {
     samples.push(original[j]!);
    }
    const nextArea = signedArea-cross(start,vertex,end);
    if (Math.abs(nextArea)<EPSILON || Math.sign(nextArea)!==Math.sign(signedArea) ||
        !withinTolerance(start,end,samples,ringTolerance)) continue;
    const replacement: Segment = [start,end];
    const oldPath = [start,...samples,end];
    const ownEdges = edges(ring).filter((_,edge) => edge !== before && edge !== i);
    if (ownEdges.some(edge => segmentsConflict(replacement,edge))) continue;
    const oldEdges = oldPath.slice(1).map((point,j): Segment => [oldPath[j]!,point]);
    if (otherEdges.some(edge =>
     segmentsConflict(replacement,edge) ||
     oldEdges.some(originalEdge => segmentsConflict(originalEdge,edge)) ||
     edge.some(point => samePoint(point,vertex) || insideTriangle(point,start,vertex,end))
    )) continue;
    if (ring.some(point => insideTriangle(point,start,vertex,end))) continue;
    ring.splice(i,1);
    retained.splice(i,1);
    signedArea = nextArea;
    changed = true;
   }
  }
 });
 let index = 0;
 return rooms.map(room => ({...room,points:current[index++]!,holes:room.holes.map(() => current[index++]!)}));
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
