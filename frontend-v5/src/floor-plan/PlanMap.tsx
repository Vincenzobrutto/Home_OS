import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {Plan} from './model';
import styles from './floor-plan.module.css';
import {ui} from '../components/ui';
export function PlanMap({blob,mime,plan,selected,onSelect,onAdd,canEdit}:{blob:Blob;mime:string;plan:Plan;selected:number|null;onSelect:(n:number)=>void;onAdd:(x:number,y:number)=>void;canEdit:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),[pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[image,setImage]=useState<HTMLImageElement|null>(null),[error,setError]=useState(false),[rendered,setRendered]=useState(''),[zoom,setZoom]=useState(1),[adding,setAdding]=useState(false);
 useEffect(()=>{let live=true;let cleanup=()=>{};
  void(async()=>{try{if(mime==='application/pdf'){const lib=await import('pdfjs-dist');lib.GlobalWorkerOptions.workerSrc=workerUrl;const task=lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',iccUrl:'/pdfjs/iccs/'});cleanup=()=>{void task.destroy();};const doc=await task.promise;if(live)setPdf(doc);}else{const url=URL.createObjectURL(blob),img=new Image();cleanup=()=>URL.revokeObjectURL(url);img.src=url;await img.decode();if(live)setImage(img);}}catch{if(live)setError(true);}})();return()=>{live=false;cleanup();};
 },[blob,mime]);
 useEffect(()=>{let live=true,task:RenderTask|undefined;
  void(async()=>{try{const v=plan.view;let source:HTMLImageElement|HTMLCanvasElement|null=image;
   if(pdf){const page=await pdf.getPage(v.page);if(!live)return;const viewport=page.getViewport({scale:2});const off=document.createElement('canvas');off.width=viewport.width;off.height=viewport.height;task=page.render({canvas:off,viewport});await task.promise;source=off;}
   if(!live||!source||!canvas.current)return;const w=source instanceof HTMLImageElement?source.naturalWidth:source.width,h=source instanceof HTMLImageElement?source.naturalHeight:source.height;
   const target=canvas.current;target.width=Math.round(w*v.width);target.height=Math.round(h*v.height);target.getContext('2d')!.drawImage(source,w*v.x,h*v.y,w*v.width,h*v.height,0,0,target.width,target.height);setRendered(JSON.stringify(plan.view));
  }catch(e){if(live&&(e as Error).name!=='RenderingCancelledException')setError(true);}})();return()=>{live=false;task?.cancel();};
 },[pdf,image,plan.view]);
 const ready=rendered===JSON.stringify(plan.view);
 return <><div className={styles.toolbar}><span>{adding?'Tocca la posizione del nuovo ambiente':'Tocca un punto'}</span><button className={ui.btn} aria-label="Riduci planimetria" onClick={()=>setZoom(z=>Math.max(1,z-.25))} disabled={zoom===1}>−</button><span>{Math.round(zoom*100)}%</span><button className={ui.btn} aria-label="Ingrandisci planimetria" onClick={()=>setZoom(z=>Math.min(3,z+.25))} disabled={zoom===3}>+</button>{canEdit&&<button className={ui.btn} aria-pressed={adding} onClick={()=>setAdding(v=>!v)}>{adding?'Annulla punto':'Aggiungi punto'}</button>}</div>
 {error?<p role="alert">Non riesco a mostrare questo originale. Riapri la pagina o consulta il documento nell’archivio.</p>:<div className={styles.mapScroll}>{!ready&&<p role="status">Preparazione planimetria…</p>}<div className={styles.map} style={{width:`${zoom*100}%`}} onClick={e=>{if(!adding||!ready)return;const box=e.currentTarget.getBoundingClientRect(),v=plan.view;onAdd(v.x+(e.clientX-box.left)/box.width*v.width,v.y+(e.clientY-box.top)/box.height*v.height);setAdding(false);}}>
 <canvas ref={canvas} aria-label="Planimetria originale con punti numerati"/>
 {ready&&plan.points.map(p=><button type="button" key={p.number} className={`${styles.pin} ${selected===p.number?styles.selected:''} ${!p.included?styles.excluded:''}`} style={{left:`${(p.x-plan.view.x)/plan.view.width*100}%`,top:`${(p.y-plan.view.y)/plan.view.height*100}%`}} aria-label={`Punto ${p.number}: ${p.name}`} aria-pressed={selected===p.number} onClick={e=>{e.stopPropagation();onSelect(p.number);}}>{p.number}</button>)}
 </div></div>}
 <p className={styles.hint}>{adding?'Per usare la tastiera aggiungi un punto dall’elenco e regola la posizione.':'I numeri collegano il disegno all’elenco. Nessuna misura o superficie viene calcolata.'}</p></>;
}
