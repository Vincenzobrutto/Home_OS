import {LocalOcr} from '../object-onboarding/localOcr';
import {detectScale,originalPoint,type ScaleReference,type ScaleWord,type ScaleDetection} from './scaleDetection';

/** Authorized raster only, in memory. Worker/assets are pinned to this origin; no remote AI. */
export async function detectPlanScale(sourceUrl:string,signal:AbortSignal):Promise<ScaleDetection>{
 const controller=new AbortController(),stop=()=>controller.abort();signal.addEventListener('abort',stop,{once:true});
 if(signal.aborted)controller.abort();
 const timer=setTimeout(stop,45000),image=new Image(),canvas=document.createElement('canvas');let ocr:LocalOcr|undefined;
 let rejectCancelled:(e:Error)=>void=()=>{};
 const cancelled=new Promise<never>((_,reject)=>{rejectCancelled=reject;});void cancelled.catch(()=>{});
 const abort=()=>{rejectCancelled(new Error('scale_read_cancelled'));ocr?.dispose();};controller.signal.addEventListener('abort',abort,{once:true});
 const bounded=<T,>(work:Promise<T>)=>Promise.race([work,cancelled]);
 try{
  if(controller.signal.aborted)throw Error('scale_read_cancelled');
  image.src=sourceUrl;await bounded(image.decode());
  const factor=Math.min(1,Math.sqrt(3000000/(image.naturalWidth*image.naturalHeight)));
  const baseWidth=Math.floor(image.naturalWidth*factor),baseHeight=Math.floor(image.naturalHeight*factor);
  if(!baseWidth||!baseHeight)throw Error('scale_image_unavailable');
  const xFactor=baseWidth/image.naturalWidth,yFactor=baseHeight/image.naturalHeight;
  ocr=new LocalOcr(controller.signal);await bounded(ocr.initialize());
  const bars:ScaleReference[]=[],ratios=new Set<number>();let ambiguous=false;
  for(const rotation of [0,90,270] as const){
   if(controller.signal.aborted)throw Error('scale_read_cancelled');
   canvas.width=rotation?baseHeight:baseWidth;canvas.height=rotation?baseWidth:baseHeight;
   const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('scale_image_unavailable');
   context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.save();
   if(rotation===90){context.translate(baseHeight,0);context.rotate(Math.PI/2);}else if(rotation===270){context.translate(0,baseWidth);context.rotate(-Math.PI/2);}
   context.drawImage(image,0,0,baseWidth,baseHeight);context.restore();
   const pixels=context.getImageData(0,0,canvas.width,canvas.height),gray=new Uint8Array(canvas.width*canvas.height);
   for(let i=0;i<gray.length;i++)gray[i]=Math.round(pixels.data[i*4]!*.299+pixels.data[i*4+1]!*.587+pixels.data[i*4+2]!*.114);
   const blob=await bounded(new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('scale_image_unavailable')),'image/png')));
   const layout=await bounded(ocr.recognizeLayout(blob));
   const words:ScaleWord[]=(layout.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(line=>line.words.flatMap(w=>w.bbox?[{text:w.text,confidence:w.confidence,box:w.bbox}]:[])))).slice(0,3000);
   const result=detectScale(words,gray,canvas.width,canvas.height);ambiguous ||= result.ambiguous;
   if(result.denominator)ratios.add(result.denominator);
   if(result.bar)bars.push({...result.bar,start:originalPoint(result.bar.start,rotation,baseWidth,baseHeight,xFactor,yFactor),end:originalPoint(result.bar.end,rotation,baseWidth,baseHeight,xFactor,yFactor)});
  }
  if(controller.signal.aborted)throw Error('scale_read_cancelled');
  const scales=bars.map(b=>b.metres/Math.hypot(b.end[0]-b.start[0],b.end[1]-b.start[1]));
  const conflict=scales.length>1&&Math.max(...scales)/Math.min(...scales)>1.08;
  return {bar:conflict?null:bars[0]??null,denominator:ratios.size===1?[...ratios][0]!:null,ambiguous:ambiguous||conflict||ratios.size>1};

 }finally{clearTimeout(timer);signal.removeEventListener('abort',stop);controller.signal.removeEventListener('abort',abort);ocr?.dispose();image.src='';canvas.width=0;canvas.height=0;}
}
