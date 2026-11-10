import type {Point,PlanShape} from './PlanMeasurementView';

export type ScaleWord={text:string;confidence:number;box:{x0:number;y0:number;x1:number;y1:number}};
export type ScaleReference={start:Point;end:Point;metres:number;method:'detected_bar'|'saved'|'manual'};
export type ScaleDetection={bar:ScaleReference|null;denominator:number|null;ambiguous:boolean};
/** Text anchors alone are not a ruler: a metric caption, linear labels and actual dark bar/ticks must agree. */
export function detectScale(words:ScaleWord[],gray:Uint8Array,width:number,height:number):ScaleDetection&{barConflict?:true}{
 const safe=words.filter(w=>w.confidence>=80&&Object.values(w.box).every(Number.isFinite));
 const ratios=new Set<number>();
 for(const w of safe)for(const match of w.text.matchAll(/\b1\s*[:/]\s*(\d{2,5})\b/gu)){const n=Number(match[1]);if(n<=10000)ratios.add(n);}
 // OCR may split "1 : 100" into separate words. Only join a single spatial text row.
 for(const w of safe){
  const h=w.box.y1-w.box.y0;if(h<=0)continue;
  const line=safe.filter(v=>Math.abs(v.box.y0-w.box.y0)<h*.5&&v.box.x0>=w.box.x0&&v.box.x1-w.box.x0<12*h).sort((a,b)=>a.box.x0-b.box.x0).map(v=>v.text).join(' ');
  for(const match of line.matchAll(/\b1\s*[:/]\s*(\d{2,5})\b/gu)){const n=Number(match[1]);if(n<=10000)ratios.add(n);}
 }
 const numbers=safe.flatMap(w=>{const m=/^(\d{1,3}(?:[,.]\d{1,2})?)\s*(m|mt)?$/iu.exec(w.text.trim());// "4m" read as one word: centre on the digits, not on digits plus unit, so the end tick is searched at the right place.
 const text=w.text.trim(),digits=m?.[1]?.length??0,x=m?.[2]?w.box.x0+(w.box.x1-w.box.x0)*digits/text.length/2:(w.box.x0+w.box.x1)/2;
 return m&&w.confidence>=85?[{...w,value:Number(m[1]!.replace(',','.')),unit:!!m[2],x,y:(w.box.y0+w.box.y1)/2}]:[];}).slice(0,200);
 const candidates:ScaleReference[]=[];
 const dark=(x:number,y:number)=>x>=0&&y>=0&&x<width&&y<height&&(gray[Math.round(y)*width+Math.round(x)]??255)<170;
 for(const zero of numbers.filter(w=>w.value===0)){
  const h=zero.box.y1-zero.box.y0;if(h<3)continue;
  const row=numbers.filter(w=>Math.abs(w.y-zero.y)<h&&w.x>=zero.x-1&&w.x-zero.x<width*.8).sort((a,b)=>a.x-b.x);
  for(const end of row.filter(w=>w.value>0)){
   const span=end.x-zero.x;if(span<40)continue;
   const labels=row.filter(w=>w.x<=end.x+1),unit=labels.some(w=>w.unit)||safe.some(w=>/^(?:m|mt|metri)$/iu.test(w.text.trim())&&Math.abs(w.box.y0-zero.box.y0)<h*4&&w.box.x0>=zero.x-h*2&&w.box.x0<end.x+h*5);
   if(!unit||labels.length<2||labels.some(w=>Math.abs((w.x-zero.x)/span-w.value/end.value)>.08))continue;
   for(let y=Math.max(0,Math.floor(zero.y-h*5));y<Math.min(height,zero.y+h*5);y++){
    let count=0;for(let x=Math.ceil(zero.x);x<=Math.floor(end.x);x++)if(dark(x,y))count++;
    if(count/span<.85)continue;
    function tick(anchor:number){let best:number|null=null,score=0;for(let x=Math.max(0,Math.round(anchor-h*.6));x<=Math.min(width-1,anchor+h*.6);x++){let n=0;for(let yy=Math.max(0,y-Math.ceil(h));yy<Math.min(height,y+Math.ceil(h));yy++)if(dark(x,yy))n++;if(n>score){best=x;score=n;}}return score>=Math.max(4,h*.5)?best:null;}
    const a=tick(zero.x),b=tick(end.x);if(a===null||b===null||b-a<40)continue;
    candidates.push({start:[a,y],end:[b,y],metres:end.value,method:'detected_bar'});break;
   }
  }
 }
 const scales=candidates.map(c=>c.metres/Math.hypot(c.end[0]-c.start[0],c.end[1]-c.start[1]));
 const ambiguous=scales.length>1&&Math.max(...scales)/Math.min(...scales)>1.08;
 return {bar:ambiguous?null:candidates.sort((a,b)=>b.metres-a.metres)[0]??null,denominator:ratios.size===1?[...ratios][0]!:null,ambiguous:ambiguous||ratios.size>1,...(ambiguous?{barConflict:true as const}:{})};
}

const SHEETS={A4:[.210,.297],A3:[.297,.420],A2:[.420,.594],A1:[.594,.841]} as const;

export function paperMetresPerPixel(format:string,denominator:number,width:number,height:number):Point|null{
 const sheet=Object.hasOwn(SHEETS,format)?SHEETS[format as keyof typeof SHEETS]:null;
 if(!sheet||!(denominator>=1&&denominator<=10000)||!(width>0&&height>0))return null;
 const [w,h]=width>height?[sheet[1],sheet[0]]:sheet;
 if(Math.abs((width/height)/(w/h)-1)>.03)return null;
 return [w*denominator/width,h*denominator/height];
}

export function netArea(shape:PlanShape){const ring=(points:Point[])=>Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length]!;return sum+a[0]*b[1]-b[0]*a[1];},0)/2);return ring(shape.points)-shape.holes.reduce((sum,h)=>sum+ring(h),0);}
export function isBalcony(room:PlanShape){
 return room.kind!=='excluded'&&(room.kind==='balcony'||/balcon/i.test(room.label));
}
export function suggestedCoefficient(room:PlanShape){
 const label=room.label.toLocaleLowerCase('it');
 if(room.kind==='excluded')return 0;
 if(room.kind==='balcony'||/balcon|terrazz/.test(label))return .25;
 if(/garage|autorimessa|\bbox\b/.test(label))return .5;
 if(/cantina|soffitta/.test(label))return .25;
 return 1;
}
export function quickSurfaces(rooms:PlanShape[],xMetresPerPixel:number,yMetresPerPixel:number,wallPercent=10,coefficients:Record<string,number>={}){
 if(![xMetresPerPixel,yMetresPerPixel].every(n=>Number.isFinite(n)&&n>0)||!Number.isFinite(wallPercent)||wallPercent<0||wallPercent>30)throw Error('Scala o maggiorazione muri non valida.');
 const rows=rooms.map(room=>{const coefficient=coefficients[room.id]??suggestedCoefficient(room),area=netArea(room)*xMetresPerPixel*yMetresPerPixel;if(!Number.isFinite(area)||area<=0||!Number.isFinite(coefficient)||coefficient<0||coefficient>1)throw Error('Controlla i contorni e i coefficienti.');return {id:room.id,label:room.label,area,coefficient,weighted:area*coefficient};});
 const principal=rows.filter(r=>r.coefficient===1).reduce((n,r)=>n+r.area,0),wallAllowance=principal*wallPercent/100;
 return {rows,net:rows.reduce((n,r)=>n+r.area,0),wallAllowance,commercial:rows.reduce((n,r)=>n+r.weighted,0)+wallAllowance};
}

export function originalPoint(point:Point,rotation:0|90|270,width:number,height:number,xFactor:number,yFactor:number):Point{
 const [x,y]=point;return rotation===90?[y/xFactor,(height-x)/yFactor]:rotation===270?[(width-y)/xFactor,x/yFactor]:[x/xFactor,y/yFactor];
}

function insideRing([x,y]:Point,ring:Point[]){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i]!,[xj,yj]=ring[j]!;
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
export function insideShape(point:Point,shape:Pick<PlanShape,'points'|'holes'>){
 return insideRing(point,shape.points)&&!shape.holes.some(hole=>insideRing(point,hole));
}
/** Approximate shared area in raster units², sampled on a grid over `a`. Enough to flag a double count, never used as a measurement. */
export function overlapArea(a:Pick<PlanShape,'points'|'holes'>,b:Pick<PlanShape,'points'|'holes'>,samples=60){
 const xs=a.points.map(p=>p[0]),ys=a.points.map(p=>p[1]);
 const left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
 if(!(w>0&&h>0))return 0;
 let hits=0;
 for(let i=0;i<samples;i++)for(let j=0;j<samples;j++){
  const point:Point=[left+(i+.5)*w/samples,top+(j+.5)*h/samples];
  if(insideShape(point,a)&&insideShape(point,b))hits++;
 }
 return hits*w*h/(samples*samples);
}
/** Rooms valued below 100% (balconies, terraces, cellars, garages) are counted as appurtenances next to the apartment. */
export function isAppurtenance(room:PlanShape){return room.kind!=='excluded'&&(isBalcony(room)||suggestedCoefficient(room)<1);}
