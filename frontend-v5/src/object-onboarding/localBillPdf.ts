import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { localBill } from './localBill';
import {LocalOcr,billOcrPages,OCR_LIMITS} from './localOcr';
import {binarizeOcrPixels} from './ocrPixels';
import {billLayoutHints,type BillPageLayout} from './localBillLayout';

/** Authorized bytes only; bounded text/OCR in memory, no remote model or persistence. */
export async function localBillPdf(blob: Blob, sha256: string, signal: AbortSignal,progress:(message:string)=>void=()=>{}) {
  if (blob.size > 10*1024*1024 || signal.aborted) return null;
  const buffer = await blob.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if (hash !== sha256 || signal.aborted) return null;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = lib.getDocument({data:new Uint8Array(buffer),cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/'});
  let ocr:LocalOcr|undefined;
  let rejectPending:(reason:Error)=>void=()=>{};
  const cancelled=new Promise<never>((_,reject)=>{rejectPending=reject;});void cancelled.catch(()=>{});
  const bounded=<T,>(work:Promise<T>)=>Promise.race([work,cancelled]);
  const stop = () => { rejectPending(new Error('local_ocr_cancelled'));ocr?.dispose('local_ocr_cancelled');void task.destroy().catch(()=>{}); };
  let timer = setTimeout(stop,10000);
  signal.addEventListener('abort',stop,{once:true});
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 20 || signal.aborted) return null;
    const pages: string[] = [];
    const layouts:BillPageLayout[]=[];
    let count = 0;
    for (let page = 1; page <= pdf.numPages; page++) {
      if (signal.aborted) return null;
      const source = await pdf.getPage(page), content = await source.getTextContent();
      // Keep the PDF's line boundaries: money/date labels must not consume unrelated columns.
      const text = content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');
      count += text.length;
      if (count > 100000) return null;
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
    const proposal=localBill(pages,hints);
    if(scanned.length&&!proposal)throw new Error('local_ocr_unreliable');
    return proposal&&scanned.length?{...proposal,method:'ocr' as const}:proposal;
  } finally { clearTimeout(timer);signal.removeEventListener('abort',stop);ocr?.dispose();await task.destroy(); }
}
