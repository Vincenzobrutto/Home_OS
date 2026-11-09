import {MAX_PLAN_ZOOM,usePlanZoom} from '../components/usePlanZoom';
import {useEffect,useState} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {ui} from '../components/ui';
import styles from './editor.module.css';

/** Local renderer: only authorized bytes, bundled worker, no external viewer or PDF actions. */
type Props={blob:Blob;url:string;filename?:string;showDownload?:boolean;initialPage?:number};
export function PdfPreview(p:Props){return <Preview key={p.url+':'+(p.initialPage??1)} {...p}/>;}
function Preview({blob,url,filename='documento-originale.pdf',showDownload=true,initialPage=1}:Props){
 const [loaded,setLoaded]=useState<{blob:Blob;pdf:PDFDocumentProxy}|null>(null),[page,setPage]=useState(initialPage),[rotation,setRotation]=useState(0),[error,setError]=useState(false);
 const pdf=loaded?.blob===blob?loaded.pdf:null,invalidPage=!Number.isSafeInteger(initialPage)||initialPage<1||!!pdf&&initialPage>pdf.numPages;
 const {zoom,setZoom,scrollRef,mapRef:canvas}=usePlanZoom<HTMLCanvasElement>({disabled:!pdf||invalidPage||error,min:.75});
 useEffect(()=>{let live=true;let destroy:(()=>void)|undefined;
  if(!Number.isSafeInteger(initialPage)||initialPage<1)return;
  void(async()=>{try{const lib=await import('pdfjs-dist');if(!live)return;const bytes=new Uint8Array(await blob.arrayBuffer());if(!live)return;lib.GlobalWorkerOptions.workerSrc=workerUrl;const task=lib.getDocument({data:bytes,cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',iccUrl:'/pdfjs/iccs/'});destroy=()=>{void task.destroy();};const document=await task.promise;if(live){setPage(initialPage);setError(false);setLoaded({blob,pdf:document});}}catch{if(live)setError(true);}})();
  return()=>{live=false;destroy?.();};
 },[blob,initialPage]);
 useEffect(()=>{if(!pdf||invalidPage||!canvas.current)return;let live=true;let task:RenderTask|undefined;
  void(async()=>{try{const source=await pdf.getPage(page);if(!live||!canvas.current)return;const viewport=source.getViewport({scale:1.5*Math.min(zoom,2),rotation:((source.rotate??0)+rotation)%360});const target=canvas.current;target.width=viewport.width;target.height=viewport.height;task=source.render({canvas:target,viewport});await task.promise;}catch(e){if(live&&(e as Error).name!=='RenderingCancelledException')setError(true);}})();
  return()=>{live=false;task?.cancel();};
 },[pdf,invalidPage,page,zoom,rotation]);
 return <div className={styles.pdf}><div className={styles.pdfToolbar} aria-label="Controlli anteprima PDF"><button type="button" className={ui.btn} aria-label="Pagina precedente" disabled={!pdf||invalidPage||error||page<=1} onClick={()=>setPage(n=>n-1)}>Indietro</button><span aria-live="polite">{invalidPage?'Pagina non disponibile':page+' / '+(pdf?.numPages??'…')}</span><button type="button" className={ui.btn} aria-label="Pagina successiva" disabled={!pdf||invalidPage||error||page>=pdf.numPages} onClick={()=>setPage(n=>n+1)}>Avanti</button><label>Zoom<select aria-label="Zoom PDF" disabled={invalidPage||error} value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{Array.from({length:1+(MAX_PLAN_ZOOM-.75)*4},(_,i)=>.75+i*.25).map(value=><option key={value} value={value}>{value*100}%</option>)}</select></label></div>
  <div className={styles.pdfToolbar}><button type="button" className={ui.btn} disabled={!pdf||invalidPage||error} aria-label="Ruota anteprima di 90 gradi" onClick={()=>setRotation(n=>(n+90)%360)}>Ruota ↻</button><span className={ui.hint}>Solo l’anteprima: l’originale resta invariato.</span></div>
  {invalidPage?<p role="status">La pagina richiesta non è disponibile in questo originale. Controlla il riferimento della fonte o scarica il documento.</p>:error?<p role="status">Anteprima non disponibile per questo PDF. Puoi aprire o scaricare l’originale.</p>:<div ref={scrollRef} className={styles.pdfPage}>{!pdf?<p role="status">Preparazione anteprima…</p>:<canvas ref={canvas} style={{width:`${zoom*100}%`}} aria-label={'Pagina '+page+' del documento originale'}/>}</div>}
  {showDownload&&<a href={url} download={filename}>Scarica originale</a>}
 </div>;
}
