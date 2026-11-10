import type {ListingOpening} from './api';
import type {PlanShape,Point} from './PlanMeasurementView';
import {insideShape} from './scaleDetection';

const distance=(a:Point,b:Point)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const middle=(opening:ListingOpening):Point=>[(opening.start[0]+opening.end[0])/2,(opening.start[1]+opening.end[1])/2];

export function distinctOpenings(items:ListingOpening[]) {
 const result:ListingOpening[]=[];
 for(const item of items){
  if(!item.start.every(Number.isFinite)||!item.end.every(Number.isFinite)||distance(item.start,item.end)<2)continue;
  if(!result.some(other=>distance(middle(item),middle(other))<Math.max(distance(item.start,item.end),distance(other.start,other.end))*.68))result.push(item);
 }
 return result;
}

export async function readListingRaster(url:string){
 const image=new Image();
 image.src=url;
 await image.decode();
 const canvas=document.createElement('canvas');
 canvas.width=image.naturalWidth;
 canvas.height=image.naturalHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx||canvas.width*canvas.height>4_000_000)throw Error('raster_unavailable');
 ctx.drawImage(image,0,0);
 const {data,width,height}=ctx.getImageData(0,0,canvas.width,canvas.height);
 const ink=(x:number,y:number,r=1)=>{
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
   const col=Math.round(x)+dx,row=Math.round(y)+dy;
   if(col<0||row<0||col>=width||row>=height)continue;
   const i=(row*width+col)*4;
   if(data[i+3]!>100 && .299*data[i]!+.587*data[i+1]!+.114*data[i+2]!<155)return true;
  }
  return false;
 };
 return {width,height,ink};
}

/** Local symbol proposals, sampled from the original aligned raster around the room edges. */
export async function detectListingOpenings(url:string,rooms:PlanShape[],known:ListingOpening[]) {
 const {ink}=await readListingRaster(url);
 const bounds=rooms.flatMap(room=>room.points);
 const xs=bounds.map(([x])=>x),ys=bounds.map(([,y])=>y);
 const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 if(!Number.isFinite(span)||span<30)return distinctOpenings(known);
 const matches:Array<{opening:ListingOpening;score:number}>=[];
 const interior=rooms.filter(room=>room.kind!=='excluded'&&room.kind!=='balcony'&&!/balcon|terraz|giardin/i.test(room.label));
 for(const room of interior){
  const winding=Math.sign(room.points.reduce((sum,[x,y],i)=>{
   const [nx,ny]=room.points[(i+1)%room.points.length]!;
   return sum+x*ny-y*nx;
  },0));
  for(let i=0;i<room.points.length;i++){
   const a=room.points[i]!,b=room.points[(i+1)%room.points.length]!,length=distance(a,b);
   if(length<span*.025)continue;
   const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length;
   const at=(u:number,v:number):Point=>[a[0]+u*dx-v*dy*winding,a[1]+u*dy+v*dx*winding];
   const score=(u:number,v:number,extent:number,radius=0)=>[.1,.24,.38,.5,.62,.76,.9]
    .filter(f=>ink(...at(u+extent*f,v),radius)).length/7;
   const step=Math.max(3,span*.005);
   for(const ratio of [.025,.035,.05,.07]){
    const extent=span*ratio;
    for(let u=step;u+extent<length-step;u+=step){
     const across=[.013,.024,.04].some(ratio=>{
      const point=at(u+extent/2,-span*ratio);
      return interior.some(other=>other!==room&&insideShape(point,other));
     });
     for(const sign of [1,-1]){
      const hinge=sign===1?u:u+extent;
      let arc=0,leaf=0,background=0;
      for(const f of [.17,.28,.39,.5,.61,.72,.83]){
       const angle=f*Math.PI/2;
       if(ink(...at(hinge+sign*extent*Math.cos(angle),extent*Math.sin(angle))))arc++;
       if(ink(...at(hinge,extent*f)))leaf++;
       if(ink(...at(hinge+sign*extent*f*.55,extent*f*.62),0))background++;
      }
      if(arc>=5&&leaf>=5&&background<=2)matches.push({
       opening:{kind:'door',start:at(u,0),end:at(u+extent,0)},score:(arc+leaf)/14,
      });
     }
     // A break flanked by ink on a partition can mark a door even without a swing arc.
     for(const offset of [0,-span*.004,-span*.008]){
      const before=score(u-extent*.38,offset,extent*.32,1);
      const after=score(u+extent*1.06,offset,extent*.32,1);
      if(u<extent*.38||u+extent*1.38>length||before<.7||after<.7)continue;
      if(score(u,offset,extent,1)<=.28&&score(u,offset+span*.004,extent)<=.43)matches.push({
       opening:{kind:'door',start:at(u,0),end:at(u+extent,0)},score:.5+Math.min(before,after)*.2+(across ? .07 : 0),
      });
     }
     // A window is a pair of ink lines separated by a clear strip, ending along the wall.
     for(const depth of [-span*.003,0,span*.003,span*.006,span*.009,span*.012]){
      const outer=score(u,-depth,extent,1);
      if(outer<.7)continue;
      for(const spacing of [4,6,8]){
       const inner=score(u,-depth-spacing,extent,1);
       const gap=score(u,-depth-spacing/2,extent);
       const flank=(score(u-extent*.45,-depth-spacing,extent*.35,1)+score(u+extent*1.1,-depth-spacing,extent*.35,1))/2;
       if(inner>=.7&&gap<=.28&&flank<=.62)matches.push({
        opening:{kind:across?'door':'window',start:at(u,0),end:at(u+extent,0)},score:(outer+inner)/2-gap*.3-flank*.25-(across ? .25 : 0),
       });
      }
     }
    }
   }
  }
 }
 const ordered=matches.sort((a,b)=>b.score-a.score).map(item=>item.opening);
 const doors=distinctOpenings([...known,...ordered.filter(item=>item.kind==='door')]).slice(0,8);
 const windows=distinctOpenings(ordered.filter(item=>item.kind==='window')).slice(0,12);
 return distinctOpenings([...doors,...windows]);
}
