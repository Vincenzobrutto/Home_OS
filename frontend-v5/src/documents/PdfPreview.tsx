import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {ui} from '../components/ui';
import styles from './editor.module.css';

/** Local renderer: only authorized bytes, bundled worker, no external viewer or PDF actions. */
export function PdfPreview({blob,url}:{blob:Blob;url:string}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[zoom,setZoom]=useState(1),[rotation,setRotation]=useState(0),[error,setError]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let live=true;let destroy:(()=>void)|undefined;
  void(async()=>{try{const lib=await import('pdfjs-dist');if(!live)return;const bytes=new Uint8Array(await blob.arrayBuffer());if(!live)return;lib.GlobalWorkerOptions.workerSrc=workerUrl;const task=lib.getDocument({data:bytes,cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',iccUrl:'/pdfjs/iccs/'});destroy=()=>{void task.destroy();};const document=await task.promise;if(live)setPdf(document);}catch{if(live)setError(true);}})();
  return()=>{live=false;destroy?.();};
 },[blob]);
 useEffect(()=>{if(!pdf||!canvas.current)return;let live=true;let task:RenderTask|undefined;
  void(async()=>{try{const source=await pdf.getPage(page);if(!live||!canvas.current)return;const viewport=source.getViewport({scale:1.5*zoom,rotation:((source.rotate??0)+rotation)%360});const target=canvas.current;target.width=viewport.width;target.height=viewport.height;task=source.render({canvas:target,viewport});await task.promise;}catch(e){if(live&&(e as Error).name!=='RenderingCancelledException')setError(true);}})();
  return()=>{live=false;task?.cancel();};
 },[pdf,page,zoom,rotation]);
 return <div className={styles.pdf}><div className={styles.pdfToolbar} aria-label="Controlli anteprima PDF"><button type="button" className={ui.btn} aria-label="Pagina precedente" disabled={!pdf||page<=1} onClick={()=>setPage(n=>n-1)}>Indietro</button><span aria-live="polite">{page} / {pdf?.numPages??'…'}</span><button type="button" className={ui.btn} aria-label="Pagina successiva" disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(n=>n+1)}>Avanti</button><label>Zoom<select aria-label="Zoom PDF" value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[.75,1,1.25,1.5,2].map(value=><option key={value} value={value}>{value*100}%</option>)}</select></label></div>
  <div className={styles.pdfToolbar}><button type="button" className={ui.btn} disabled={!pdf} aria-label="Ruota anteprima di 90 gradi" onClick={()=>setRotation(n=>(n+90)%360)}>Ruota ↻</button><span className={ui.hint}>Solo l’anteprima: l’originale resta invariato.</span></div>
  {error?<p role="status">Anteprima non disponibile per questo PDF. Puoi aprire o scaricare l’originale.</p>:<div className={styles.pdfPage}>{!pdf&&<p role="status">Preparazione anteprima…</p>}<canvas ref={canvas} style={{width:`${zoom*100}%`}} aria-label={'Pagina '+page+' del documento originale'}/></div>}
  <a href={url} download="documento-originale.pdf">Scarica originale</a>
 </div>;
}
