import {validPolygon,type Point,type Polygon} from './geometry';
import {repairInwardDoorBoundary,type SurfaceEnvelope} from './room-surfaces';

const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function simplify(p:Point[],eps:number):Point[]{if(p.length<3)return p;const a=p[0],b=p.at(-1)!,dx=b[0]-a[0],dy=b[1]-a[1],length=dist(a,b);let max=0,k=0;for(let i=1;i<p.length-1;i++){const d=length?Math.abs(dx*(p[i][1]-a[1])-dy*(p[i][0]-a[0]))/length:dist(a,p[i]);if(d>max){max=d;k=i;}}return max>eps?[...simplify(p.slice(0,k+1),eps).slice(0,-1),...simplify(p.slice(k),eps)]:[a,b];}
function circle(a:Point,b:Point,c:Point){const d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));if(Math.abs(d)<1e-6)return null;const n=(p:Point)=>p[0]*p[0]+p[1]*p[1],center:Point=[(n(a)*(b[1]-c[1])+n(b)*(c[1]-a[1])+n(c)*(a[1]-b[1]))/d,(n(a)*(c[0]-b[0])+n(b)*(a[0]-c[0])+n(c)*(b[0]-a[0]))/d];return {center,radius:dist(a,center)};}
/** Quarter-circle evidence + nearby hinge + collinear wall continuations.
 * Returns reviewable candidates only; retains all unrelated original vertices and holes. */
export function detectInwardDoorArcs(room:{id:string;label:string}&Polygon,angleDegrees:number){
 if(!validPolygon(room)||!Number.isFinite(angleDegrees))return [];
 const middle=Math.floor(room.points.length/2),p=[...simplify(room.points.slice(0,middle+1),1.3).slice(0,-1),...simplify([...room.points.slice(middle),room.points[0]],1.3).slice(0,-1)],n=p.length,proposals:Array<{envelope:SurfaceEnvelope;score:number;center:Point}>=[];
 for(const forward of[true,false]){const q=forward?p:[...p].reverse();for(let i=0;i<n;i++)for(let count=3;count<=8;count++){
  const arc=Array.from({length:count+1},(_,k)=>q[(i+k)%n]),fit=circle(arc[0],arc[Math.floor(count/2)],arc.at(-1)!);if(!fit||fit.radius<8||fit.radius>80)continue;
  const error=Math.max(...arc.map(v=>Math.abs(dist(v,fit.center)-fit.radius)));if(error>Math.max(1.5,fit.radius*.08))continue;
  let path=0;for(let k=1;k<arc.length;k++)path+=dist(arc[k-1],arc[k]);if(path/fit.radius<1.1||path/fit.radius>2.1)continue;
  for(let next=1;next<=5;next++){const hinge=q[(i+count+next)%n];if(dist(hinge,fit.center)>fit.radius*.25+1)continue;
   const start=arc[0],chord=dist(start,hinge),angle=Math.atan2(hinge[1]-start[1],hinge[0]-start[0]);if(chord<fit.radius*.7||chord>fit.radius*1.4||Math.cos(4*(angle-angleDegrees*Math.PI/180))<.9)continue;
   const before=q[(i+n-1)%n],after=q[(i+count+next+1)%n],alignment=(a:Point,b:Point)=>Math.abs(((b[0]-a[0])*(hinge[0]-start[0])+(b[1]-a[1])*(hinge[1]-start[1]))/(dist(a,b)*chord));if(alignment(before,start)<.9||alignment(hinge,after)<.9)continue;
   try{const envelope=repairInwardDoorBoundary(room,{roomId:room.id,opensIntoRoomId:room.id,hinge:fit.center,jambStart:start,jambEnd:hinge,radiusPixels:fit.radius,inkTolerancePixels:3});envelope.source='wall_detector';proposals.push({envelope,score:error/fit.radius+dist(hinge,fit.center)/fit.radius,center:fit.center});}catch{ /* Not a safe local annotation replacement. */ }
  }
 }}
 const result:typeof proposals=[];for(const candidate of proposals.sort((a,b)=>a.score-b.score)){if(!result.some(v=>dist(v.center,candidate.center)<12))result.push(candidate);}return result.slice(0,4).map(v=>v.envelope);
}
