import type {ScaleReference} from './scaleDetection';

export type EdgeBar={start:[number,number];end:[number,number]};
/** A bold segment on a thin page rule, with a crossing tick at either end.
 * Inspect only the two margins after rotating the page into reading orientation. */
export function edgeBars(gray:Uint8Array,width:number,height:number):EdgeBar[]{
 const dark=(x:number,y:number)=>x>=0&&x<width&&y>=0&&y<height&&gray[y*width+x]!<170;
 const margin=Math.floor(height*.15),minLength=Math.max(40,Math.floor(width*.03));
 const found:EdgeBar[]=[];
 function tick(x:number,y:number){
  // A tick may be straight or slanted. Check both sides outside the shaft.
  const traces=[-1,1].flatMap(sign=>[3,4,5].map(offset=>{
   const ink:number[]=[];
   for(let dx=-7;dx<=7;dx++)if(dark(x+dx,y+sign*offset))ink.push(x+dx);
   return ink.length&&ink.length<=6?ink.reduce((n,v)=>n+v,0)/ink.length:null;
  }));
  return traces.every((v):v is number=>v!==null)?Math.round(traces.reduce((n,v)=>n+v,0)/traces.length):null;
 }
 for(let y=6;y<height-6;y++){
  if(y>=margin&&y<height-margin)continue;
  const bold=(x:number)=>dark(x,y)&&(dark(x,y-1)||dark(x,y+1));
  for(let left=0;left<width;){
   if(!bold(left)){left++;continue;}
   let right=left+1;
   while(right<width&&(bold(right)||bold(right+1)&&bold(right-1)))right++;
   const length=right-left;
   if(length>=minLength&&length<=width*.65&&left>=8&&right<width-8&&
      !bold(left-8)&&!bold(right+8)){
    // Find the centre of the shaft rather than returning its upper stroke.
    const middle=Math.floor((left+right)/2);let low=y,high=y;
    while(low>y-4&&dark(middle,low-1))low--;
    while(high<y+4&&dark(middle,high+1))high++;
    const row=Math.round((low+high)/2);
    const a=tick(left,row),b=tick(right-1,row);
    if(a!==null&&b!==null&&b-a>=minLength&&!found.some(bar=>Math.abs(bar.start[1]-row)<=4&&Math.abs(bar.start[0]-a)<=7&&Math.abs(bar.end[0]-b)<=7))
     found.push({start:[a,row],end:[b,row]});
    if(found.length>=6)return found;
   }
   left=right+1;
  }
 }
 return found;
}

export function edgeBarCaption(gray:Uint8Array,width:number,height:number,bar:EdgeBar,side:-1|1){
 const span=bar.end[0]-bar.start[0],center=(bar.start[0]+bar.end[0])/2,row=bar.start[1];
 const half=Math.round(Math.max(22,Math.min(100,span*.22))),depth=Math.round(Math.max(18,Math.min(34,span*.079)));
 const x0=Math.max(0,Math.round(center-half)),x1=Math.min(width,Math.round(center+half));
 const y0=Math.max(0,side<0?row-depth:row+5),y1=Math.min(height,side<0?row-4:row+depth+1);
 const w=x1-x0,h=y1-y0;if(w<12||h<10)return null;
 const pixels=new Uint8Array(w*h);
 for(let j=0;j<h;j++){
  const source=(y0+j)*width+x0;pixels.set(gray.subarray(source,source+w),j*w);
 }
 // Remove a page rule crossing the text while bridging remaining glyph strokes.
 const rule=(j:number)=>pixels.subarray(j*w,(j+1)*w).filter(v=>v<170).length>=w*.85;
 for(let y=0;y<h;y++){
  if(!rule(y))continue;let end=y+1;while(end<h&&rule(end))end++;
  for(let j=y;j<end;j++)for(let x=0;x<w;x++)
   pixels[j*w+x]=y>0&&end<h?Math.min(pixels[(y-1)*w+x]!,pixels[end*w+x]!):255;
  y=end-1;
 }
 return {width:w,height:h,pixels};
}

/** A full metric caption, not a bare number, denominator, address or cadastral label. */
export function labeledEdgeBar(bar:EdgeBar,caption:string):ScaleReference|null{
 const match=/^\s*(\d{1,3}(?:[,.]\d{1,2})?)\s*(?:metri|metro|mt\.?|m\.?)\s*$/iu.exec(caption);
 const metres=Number(match?.[1]?.replace(',','.'));
 return metres>0?{...bar,metres,method:'detected_bar'}:null;
}