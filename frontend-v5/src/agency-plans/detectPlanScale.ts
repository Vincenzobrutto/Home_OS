import {LocalOcr} from '../object-onboarding/localOcr';
import {detectScale,type ScaleWord,type ScaleDetection} from './scaleDetection';

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
  canvas.width=Math.floor(image.naturalWidth*factor);canvas.height=Math.floor(image.naturalHeight*factor);
  if(!canvas.width||!canvas.height)throw Error('scale_image_unavailable');
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('scale_image_unavailable');
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),gray=new Uint8Array(canvas.width*canvas.height);
  for(let i=0;i<gray.length;i++)gray[i]=Math.round(pixels.data[i*4]!*.299+pixels.data[i*4+1]!*.587+pixels.data[i*4+2]!*.114);
  const blob=await bounded(new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('scale_image_unavailable')),'image/png')));
  ocr=new LocalOcr(controller.signal);await bounded(ocr.initialize());
  const layout=await bounded(ocr.recognizeLayout(blob));
  const words:ScaleWord[]=(layout.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(line=>line.words.flatMap(w=>w.bbox?[{text:w.text,confidence:w.confidence,box:w.bbox}]:[])))).slice(0,3000);
  const result=detectScale(words,gray,canvas.width,canvas.height);
  if(controller.signal.aborted)throw Error('scale_read_cancelled');
  return {...result,bar:result.bar?{...result.bar,start:[result.bar.start[0]/factor,result.bar.start[1]/factor],end:[result.bar.end[0]/factor,result.bar.end[1]/factor]}:null};
 }finally{clearTimeout(timer);signal.removeEventListener('abort',stop);controller.signal.removeEventListener('abort',abort);ocr?.dispose();image.src='';canvas.width=0;canvas.height=0;}
}
