import {confidentOcrDatePairs,type PositionedDateEvidence} from './ocrDatePairs';
import {localBill} from './localBill';
export const OCR_LIMITS={pages:10,pagePixels:3000000,totalPixels:30000000,totalMs:120000,text:100000};
export type OcrLine={text:string;confidence:number;words:Array<{text:string;confidence:number}>;bbox?:{x0:number;y0:number;x1:number;y1:number}};
export type OcrPage={blocks?:Array<{paragraphs:Array<{lines:OcrLine[]}>}>|null};
/** Uncertain tokens become barriers: never repair digits or join around missing text. */
export function confidentOcrText(data:OcrPage,nativeDates:PositionedDateEvidence[]=[]){
 const lines=(data.blocks??[]).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines));
 const reliable=(word:OcrLine['words'][number])=>word.confidence>=(/\d/.test(word.text)?90:80);
 const reliableLines=lines.filter(line=>line.confidence>=85&&line.words.length&&line.words.every(reliable));
 const label=(text:string)=>{
  const value=text.trim().replace(/[:\s]+$/u,'');
  if(/^(?:totale (?:da pagare|bolletta|fattura|documento)|importo da pagare)$/iu.test(value))return 'amount';
  if(/^(?:emess[ao] il|data (?:di )?emissione|data fattura|(?:da )?saldare entro|(?:data (?:di )?)?scadenza|pagare entro)$/iu.test(value))return 'date';
  if(/^periodo (?:di )?(?:riferimento|fatturazione|competenza)$/iu.test(value))return 'period';
  return null;
 };
 // Native glyphs remain a distinct source: no fabricated OCR confidence. Only
 // date labels/values in the same page coordinates can be paired by the helper.
 const pairs=confidentOcrDatePairs([...reliableLines,...nativeDates]);
 for(const header of reliableLines){
  const kind=label(header.text),box=header.bbox;if(!kind||!box||kind==='date')continue;
  const candidates=reliableLines.filter(value=>{
   const text=value.text.trim();return value!==header&&value.bbox&&(kind==='amount'?/^(?:EUR|€)?\s*(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\s*(?:EUR|€)?$/iu.test(text):/^(?:\p{L}+\s+\d{4}|(?:dal\s+)?\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\s+(?:al|-)\s+\d{1,2}[/.-]\d{1,2}[/.-]\d{4})$/iu.test(text));
  });
  const row=candidates.filter(value=>{
   const b=value.bbox!,height=Math.min(box.y1-box.y0,b.y1-b.y0),overlap=Math.min(box.y1,b.y1)-Math.max(box.y0,b.y0);
   return height>0&&overlap/height>=0.35&&b.x0>=box.x1&&b.x0-box.x1<=20*height;
  });
  const below=candidates.filter(value=>{
   const b=value.bbox!,height=box.y1-box.y0,center=(b.x0+b.x1)/2;
   return height>0&&b.y0>=box.y1&&b.y0-box.y1<=3*height&&center>=box.x0-height&&center<=box.x1+height;
  });
  const values=[...new Set([...row,...below].map(value=>value.text.trim()))];
  if(values.length===1)pairs.push(header.text.trim().replace(/[:\s]+$/u,'')+': '+values[0]);
 }
 const text=lines.map(line=>{
  // Standalone labels in columns require a unique spatial pairing, never reading order.
  if(label(line.text))return '[colonne da verificare]';
  if(!line.words.length)return '[lettura incerta]';
  if(line.words.every(reliable))return line.confidence>=85?line.text.trim():'[lettura incerta]';
  const chunks:Array<OcrLine['words']>=[];let chunk:OcrLine['words']=[];
  for(const word of line.words){if(reliable(word))chunk.push(word);else{chunks.push(chunk);chunk=[];}}
  chunks.push(chunk);
  return chunks.map(words=>words.length&&words.reduce((sum,w)=>sum+w.confidence,0)/words.length>=90?words.map(w=>w.text).join(' '):'').join(' [lettura incerta] ');
 }).join('\n');
 return pairs.length?text+'\n'+pairs.join('\n'):text;
}
export function needsOcr(text:string){return text.replace(/[^\p{L}\d]/gu,'').length<80;}
/** Rich native text may still omit a labelled amount or due date drawn as graphics. */
export function billOcrPages(pages:string[],native:{amount?:string;dueOn?:string}|null){
 return pages.flatMap((text,index)=>needsOcr(text)&&!localBill([text])?.amount||!!native&&(!native.dueOn&&/^[ \t]*(?:scadenza|data\s+(?:di\s+)?scadenza|da\s+saldare\s+entro|pagare\s+entro)\b/imu.test(text)||!native.amount&&/^[ \t]*(?:totale\s+da\s+pagare|importo\s+da\s+pagare)\b/imu.test(text))?[index]:[]);
}

type WorkerReply={workerId:string;jobId:string;action:string;status:string;data:OcrPage};
/** Small adapter to the pinned Tesseract 6.0.1 dedicated worker protocol.
 * Owns the worker before initialization, so timeout/abort can terminate startup too. */
export class LocalOcr {
 private worker:Worker; private serial=0;private dead=false;private signal:AbortSignal;
 private pending?:{jobId:string;resolve:(data:OcrPage)=>void;reject:(error:Error)=>void};
 constructor(signal:AbortSignal){
  this.signal=signal;
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  this.worker=new Worker('/ocr/v1/worker.js');
  this.worker.onmessage=({data}:MessageEvent<WorkerReply>)=>{
   if(!this.pending||data.jobId!==this.pending.jobId)return;
   if(data.status==='resolve'){this.pending.resolve(data.data);this.pending=undefined;}
   else if(data.status==='reject')this.dispose('local_ocr_failed');
  };
  this.worker.onerror=()=>this.dispose('local_ocr_failed');
  signal.addEventListener('abort',this.abort,{once:true});
 }
 private abort=()=>this.dispose('local_ocr_cancelled');
 private send(action:string,payload:unknown){
  if(this.dead||this.pending)return Promise.reject(new Error('local_ocr_unavailable'));
  return new Promise<OcrPage>((resolve,reject)=>{const jobId='local-'+(++this.serial);this.pending={jobId,resolve,reject};this.worker.postMessage({workerId:'local-ocr',jobId,action,payload});});
 }
 async initialize(){
  await this.send('load',{options:{lstmOnly:true,corePath:'/ocr/v1/core'}});
  await this.send('loadLanguage',{langs:['ita'],options:{langPath:'/ocr/v1/lang',cacheMethod:'none',gzip:true,lstmOnly:true}});
  await this.send('initialize',{langs:['ita'],oem:1,config:{}});
  await this.send('setParameters',{params:{tessedit_pageseg_mode:'11'}});
 }
 async recognize(image:Blob,nativeDates:PositionedDateEvidence[]=[]){
  const bytes=new Uint8Array(await image.arrayBuffer());
  const data=await this.send('recognize',{image:bytes,options:{},output:{blocks:true,text:false}});
  return confidentOcrText(data,nativeDates);
 }
 dispose(reason='local_ocr_finished'){
  if(this.dead)return;this.dead=true;this.signal.removeEventListener('abort',this.abort);
  this.worker.terminate();this.pending?.reject(new Error(reason));this.pending=undefined;
 }
}
