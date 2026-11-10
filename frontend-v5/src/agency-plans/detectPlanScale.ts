import {LocalOcr} from '../object-onboarding/localOcr';
import {detectScale,originalPoint,type ScaleReference,type ScaleWord,type ScaleDetection} from './scaleDetection';
import {edgeBarCaption,edgeBars,labeledEdgeBar} from './edgeScaleBar';
import type {OcrPage} from '../object-onboarding/localOcr';

const lines=(page:OcrPage)=>(page.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines));

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
  const factor=Math.min(1,Math.sqrt(3300000/(image.naturalWidth*image.naturalHeight)));
  const baseWidth=Math.floor(image.naturalWidth*factor),baseHeight=Math.floor(image.naturalHeight*factor);
  if(!baseWidth||!baseHeight)throw Error('scale_image_unavailable');
  const xFactor=baseWidth/image.naturalWidth,yFactor=baseHeight/image.naturalHeight;
  ocr=new LocalOcr(controller.signal);await bounded(ocr.initialize());
  const bars:ScaleReference[]=[],ratios=new Set<number>();let ambiguous=false;
  const cropCanvas=document.createElement('canvas');
  for(const rotation of [0,90,270] as const){
   if(controller.signal.aborted)throw Error('scale_read_cancelled');
   canvas.width=rotation?baseHeight:baseWidth;canvas.height=rotation?baseWidth:baseHeight;
   const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('scale_image_unavailable');
   context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.save();
   if(rotation===90){context.translate(baseHeight,0);context.rotate(Math.PI/2);}else if(rotation===270){context.translate(0,baseWidth);context.rotate(-Math.PI/2);}
   context.drawImage(image,0,0,baseWidth,baseHeight);context.restore();
   const pixels=context.getImageData(0,0,canvas.width,canvas.height),gray=new Uint8Array(canvas.width*canvas.height);
   for(let i=0;i<gray.length;i++)gray[i]=Math.round(pixels.data[i*4]!*.299+pixels.data[i*4+1]!*.587+pixels.data[i*4+2]!*.114);
   const blobOf=(target:HTMLCanvasElement)=>bounded(new Promise<Blob>((resolve,reject)=>target.toBlob(b=>b?resolve(b):reject(Error('scale_image_unavailable')),'image/png')));
   const addBar=(bar:ScaleReference)=>bars.push({...bar,start:originalPoint(bar.start,rotation,baseWidth,baseHeight,xFactor,yFactor),end:originalPoint(bar.end,rotation,baseWidth,baseHeight,xFactor,yFactor)});
   const blob=await blobOf(canvas);
   const layout=await bounded(ocr.recognizeLayout(blob));
   const words:ScaleWord[]=lines(layout).flatMap(line=>line.words.flatMap(w=>w.bbox?[{text:w.text,confidence:w.confidence,box:w.bbox}]:[])).slice(0,3000);
   const result=detectScale(words,gray,canvas.width,canvas.height);ambiguous ||= !!result.barConflict;
   if(result.denominator)ratios.add(result.denominator);
   if(result.bar)addBar(result.bar);
   const edgeCandidates=edgeBars(gray,canvas.width,canvas.height);
   if(!edgeCandidates.length)continue;
   await bounded(ocr.setPageSegmentation('7'));
   for(const candidate of edgeCandidates){
    for(const side of [-1,1] as const){
     for(const bridge of [true,false]){
      const crop=edgeBarCaption(gray,canvas.width,canvas.height,candidate,side,bridge);if(!crop)break;
      const enlargement=3;
      cropCanvas.width=crop.width*enlargement;cropCanvas.height=crop.height*enlargement;
      const ctx=cropCanvas.getContext('2d');if(!ctx)throw Error('scale_image_unavailable');
      const data=ctx.createImageData(cropCanvas.width,cropCanvas.height);
      for(let j=0;j<cropCanvas.height;j++)for(let i=0;i<cropCanvas.width;i++){
       const shade=crop.pixels[Math.floor(j/enlargement)*crop.width+Math.floor(i/enlargement)]!,offset=(j*cropCanvas.width+i)*4;
       data.data[offset]=data.data[offset+1]=data.data[offset+2]=shade;data.data[offset+3]=255;
      }
      ctx.putImageData(data,0,0);
      const caption=lines(await bounded(ocr.recognizeLayout(await blobOf(cropCanvas))));
      const tokens=caption.flatMap(line=>line.words);
      const bar=caption.length===1&&tokens.length>0&&tokens.every(word=>word.confidence>=85)?labeledEdgeBar(candidate,tokens.map(word=>word.text).join(' ')):null;
      if(bar){addBar(bar);break;}
     }
    }
   }
   await bounded(ocr.setPageSegmentation('11'));
  }
  if(controller.signal.aborted)throw Error('scale_read_cancelled');
  const scales=bars.map(b=>b.metres/Math.hypot(b.end[0]-b.start[0],b.end[1]-b.start[1]));
  const conflict=scales.length>1&&Math.max(...scales)/Math.min(...scales)>1.08;
  // Printed ratios need paper dimensions and are separate from the observed ruler.
  return {bar:ambiguous||conflict?null:bars[0]??null,denominator:ratios.size===1?[...ratios][0]!:null,ambiguous:ambiguous||conflict||!bars.length&&ratios.size>1};

 }finally{clearTimeout(timer);signal.removeEventListener('abort',stop);controller.signal.removeEventListener('abort',abort);ocr?.dispose();image.src='';canvas.width=0;canvas.height=0;}
}
