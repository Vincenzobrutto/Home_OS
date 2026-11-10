export type PropertyViewport={x:number;y:number;width:number;height:number};
type FullFrame={width:number;height:number};
type OuterContour={points:readonly (readonly [number,number])[]};

/** Display framing only: all rendered outer contours, never a changed document or geometry. */
export function propertyViewport(frame:FullFrame,contours:readonly OuterContour[]):PropertyViewport{
 const full={x:0,y:0,width:frame.width,height:frame.height};
 if(!Number.isFinite(frame.width)||!Number.isFinite(frame.height)||frame.width<=0||frame.height<=0)return full;
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,hasArea=false;
 for(const {points}of contours){
  let twiceArea=0;
  for(let i=0;i<points.length;i++){
   const [x,y]=points[i]!;
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>frame.width||y>frame.height)return full;
   left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
   const next=points[(i+1)%points.length]!;twiceArea+=x*next[1]-next[0]*y;
  }
  if(!Number.isFinite(twiceArea))return full;
  if(twiceArea!==0)hasArea=true;
 }
 if(!hasArea||!Number.isFinite(left)||right<=left||bottom<=top)return full;
 const margin=Math.max(24,Math.max(right-left,bottom-top)*.06);
 const x=Math.max(0,left-margin),y=Math.max(0,top-margin);
 return {x,y,width:Math.min(frame.width,right+margin)-x,height:Math.min(frame.height,bottom+margin)-y};
}
