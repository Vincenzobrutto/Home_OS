import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { localBill,type LocalBill } from './localBill';
import {LocalOcr,billOcrPages,OCR_LIMITS} from './localOcr';
import {binarizeOcrPixels} from './ocrPixels';
import {billLayoutHints,type BillPageLayout} from './localBillLayout';
import {BILL_TRACE_FIELDS,emptyBillTrace,type BillTrace,type BillTraceField} from './localBillTrace';

/** Authorized bytes only; bounded text/OCR in memory, no remote model or persistence. */
export async function localBillPdf(blob: Blob, sha256: string, signal: AbortSignal,progress:(message:string)=>void=()=>{},onTrace?:(trace:BillTrace)=>void) {
  const early=(outcome:BillTrace['outcome'],verified=false)=>{if(!signal.aborted)onTrace?.({...emptyBillTrace(outcome),source:{sha256,pagesRead:[],verified,ocr:'unused'}});return null;};
  if (blob.size > 10*1024*1024 || signal.aborted) return early('limits');
  const buffer = await blob.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if (hash !== sha256 || signal.aborted) return early('source_mismatch');
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = lib.getDocument({data:new Uint8Array(buffer),cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/'});
  let ocr:LocalOcr|undefined;
  let nativeFallback:LocalBill|null=null;
  let nativeTrace=emptyBillTrace('unrecognized');
  const fieldValue=(bill:LocalBill|null,field:BillTraceField)=>field==='period'?(bill?.competenceFrom&&bill.competenceTo?bill.competenceFrom+'/'+bill.competenceTo:undefined):bill?.[field];
  const publish=(bill:LocalBill|null,trace:BillTrace,ocr:NonNullable<BillTrace['source']>['ocr'])=>{
    const fields={...trace.fields};
    for(const field of BILL_TRACE_FIELDS)fields[field]={...fields[field],method:ocr==='completed'&&(!fieldValue(bill,field)||fieldValue(bill,field)!==fieldValue(nativeFallback,field))?'pdf_ocr':'pdf'};
    if(!signal.aborted)onTrace?.({...trace,fields,source:{sha256,pagesRead:[1],verified:true,ocr}});
  };
  let rejectPending:(reason:Error)=>void=()=>{};
  const cancelled=new Promise<never>((_,reject)=>{rejectPending=reject;});void cancelled.catch(()=>{});
  const bounded=<T,>(work:Promise<T>)=>Promise.race([work,cancelled]);
  const stop = () => { rejectPending(new Error('local_ocr_cancelled'));ocr?.dispose('local_ocr_cancelled');void task.destroy().catch(()=>{}); };
  let timer = setTimeout(stop,10000);
  signal.addEventListener('abort',stop,{once:true});
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 20 || signal.aborted) return early('limits',true);
    const pages: string[] = [];
    const layouts:BillPageLayout[]=[];
    let count = 0;
    // Bills are proposed from the first-page summary only. Later pages may
    // contain historical totals or other services and are not read or OCRed.
    for (let page = 1; page <= 1; page++) {
      if (signal.aborted) return null;
      const source = await pdf.getPage(page), content = await source.getTextContent();
      // Keep the PDF's line boundaries: money/date labels must not consume unrelated columns.
      const text = content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');
      count += text.length;
      if (count > 100000) return early('limits',true);
      pages.push(text);
      const viewport=source.getViewport({scale:1});
      layouts.push({height:viewport.height,tokens:source.rotate%360===0?content.items.flatMap(item=>{
        if(!('str'in item)||!item.str.trim()||!item.height||!item.width)return [];
        const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
        if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y))return [];
        return [{text:item.str,x,y:y-Math.abs(item.height),width:item.width,height:Math.abs(item.height)}];
      }):[]});
      source.cleanup();
    }
    const native=localBill(pages),hints=billLayoutHints(layouts,native?.documentDate);
    nativeFallback=localBill(pages,hints,value=>{nativeTrace=value;});
    const scanned=billOcrPages(pages,native);
    if(scanned.length){
      clearTimeout(timer);
      if(scanned.length>OCR_LIMITS.pages)throw new Error('local_ocr_limits');
      timer=setTimeout(()=>{rejectPending(new Error('local_ocr_timeout'));ocr?.dispose('local_ocr_timeout');void task.destroy().catch(()=>{});},OCR_LIMITS.totalMs);
      ocr=new LocalOcr(signal);progress('Preparazione OCR locale…');await bounded(ocr.initialize());
      let pixels=0;
      for(const index of scanned){
        if(signal.aborted)throw new DOMException('Aborted','AbortError');
        progress(`OCR locale · pagina ${index+1} di ${pdf.numPages}`);
        const source=await bounded(pdf.getPage(index+1)),base=source.getViewport({scale:1});
        const scale=Math.min(2.5,Math.sqrt(OCR_LIMITS.pagePixels/(base.width*base.height)),8192/Math.max(base.width,base.height));
        const viewport=source.getViewport({scale}),canvas=document.createElement('canvas');
        canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);
        pixels+=canvas.width*canvas.height;
        if(!canvas.width||!canvas.height||pixels>OCR_LIMITS.totalPixels)throw new Error('local_ocr_limits');
        try{
          const context=canvas.getContext('2d');if(!context)throw new Error('local_ocr_unavailable');
          await bounded(source.render({canvas,canvasContext:context,viewport}).promise);
          const raster=context.getImageData(0,0,canvas.width,canvas.height);
          binarizeOcrPixels(raster.data);context.putImageData(raster,0,0);
          const image=await bounded(new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('local_ocr_unavailable')),'image/png')));
          const nativeDates=layouts[index]!.tokens.map(t=>({text:t.text,bbox:{x0:t.x*scale,y0:t.y*scale,x1:(t.x+t.width)*scale,y1:(t.y+t.height)*scale}}));
          const text=await bounded(ocr.recognize(image,nativeDates));
          count+=text.length;if(count>OCR_LIMITS.text)throw new Error('local_ocr_limits');
          // Native evidence is retained: contradictions cannot be erased by OCR.
          pages[index]=pages[index]+'\n'+text;
        }finally{canvas.width=0;canvas.height=0;source.cleanup();}
      }
    }
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    let finalTrace=nativeTrace;
    const proposal=localBill(pages,hints,value=>{finalTrace=value;});
    if(scanned.length&&!proposal)throw new Error('local_ocr_unreliable');
    publish(proposal,finalTrace,scanned.length?'completed':'unused');
    return proposal&&scanned.length?{...proposal,method:'ocr' as const}:proposal;
  } catch(error) {
    // Optional OCR enrichment must not erase already readable proposals. A
    // cancelled request never returns stale data, and image-only scans still
    // surface their error for the manual fallback.
    if(!signal.aborted&&nativeFallback&&(nativeFallback.amount||nativeFallback.supplier)){publish(nativeFallback,nativeTrace,'failed');return nativeFallback;}
    throw error;
  } finally { clearTimeout(timer);signal.removeEventListener('abort',stop);ocr?.dispose();await task.destroy(); }
}
