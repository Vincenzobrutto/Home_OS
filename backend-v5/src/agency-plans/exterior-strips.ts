import {filled,overlaps,type Point,type Polygon} from './geometry';
import {assertRaster,segmentPlan,type Raster,type RasterConfig,type SeedSpace} from './raster';

const distanceToEdge=(p:Point,a:Point,b:Point)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
/** Geometry-only exterior candidates, not proof of use, title or commercial coefficient.
 * Closed elongated components must lie beside multiple rooms, all on the same facade side. */
export function detectExteriorStrips(r:Raster,rooms:Array<Polygon&{id:string}>,config:RasterConfig){
 assertRaster(r);const {width:w,height:h,gray}=r,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),out:Array<{region:ReturnType<typeof segmentPlan>['regions'][number];source:'pixel_component';association:'unverified';classification:'exterior_strip_candidate';neighbors:string[];requiresReview:true}>=[];
 for(let k=0;k<gray.length;k++){
  if(seen[k]||gray[k]<=config.threshold)continue;let head=0,tail=1,border=false,sx=0,sy=0,sxx=0,syy=0,sxy=0;queue[0]=k;seen[k]=1;
  while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;if(x===0||y===0||x===w-1||y===h-1)border=true;for(const n of[x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(n>=0&&!seen[n]&&gray[n]>config.threshold){seen[n]=1;queue[tail++]=n;}}
  if(border||tail<config.minRegionPixels)continue;const center:Point=[sx/tail,sy/tail];if(rooms.some(v=>filled(center,v)))continue;
  const angle=Math.atan2(2*(sxy/tail-center[0]*center[1]),sxx/tail-center[0]*center[0]-(syy/tail-center[1]*center[1]))/2,c=Math.cos(angle),s=Math.sin(angle);let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
  for(let j=0;j<tail;j++){const x=queue[j]%w-center[0],y=Math.floor(queue[j]/w)-center[1],u=x*c+y*s,v=-x*s+y*c;minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);}
  const length=maxU-minU+1,width=maxV-minV+1;if(length/width<3||tail/(length*width)<.55)continue;
  const space:SeedSpace={id:'exterior-strip-'+(out.length+1),label:'Fascia esterna candidata · uso da verificare',kind:'balcony',seeds:[[k%w,Math.floor(k/w)]]};
  const region=segmentPlan(r,[space],[],{...config,closingRadius:0,simplifyPixels:.5}).regions[0];if(!region||rooms.some(v=>overlaps(v,region)))continue;
  const neighbors:Array<{id:string;side:number}>=[],near=Math.max(6,Math.min(30,width*.75)),samples=region.points.filter((_,i)=>i%Math.max(1,Math.floor(region.points.length/32))===0);
  for(const room of rooms){if(!samples.some(p=>room.points.some((a,i)=>distanceToEdge(p,a,room.points[(i+1)%room.points.length])<=near)))continue;const centroid=room.points.reduce<Point>((a,p)=>[a[0]+p[0]/room.points.length,a[1]+p[1]/room.points.length],[0,0]);neighbors.push({id:room.id,side:Math.sign(-(centroid[0]-center[0])*s+(centroid[1]-center[1])*c)});}
  if(neighbors.length<2||neighbors.some(v=>!v.side||v.side!==neighbors[0].side))continue;
  out.push({region,source:'pixel_component',association:'unverified',classification:'exterior_strip_candidate',neighbors:neighbors.map(v=>v.id),requiresReview:true});if(out.length===8)break;
 }
 return out;
}
