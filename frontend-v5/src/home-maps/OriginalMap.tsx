import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import styles from './map.module.css';
export function OriginalMap({blob,mime,page,width,height,children,onPoint,overlay}:{blob:Blob;mime:string;page:number;width:number;height:number;children:ReactNode;overlay?:ReactNode;onPoint:(x:number,y:number)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),[ready,setReady]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{let live=true,doc:PDFDocumentProxy|undefined,render:RenderTask|undefined,cleanup=()=>{};
 void(async()=>{try{
  const target=canvas.current!;let source:HTMLImageElement|HTMLCanvasElement;
  if(mime==='application/pdf'){const lib=await import('pdfjs-dist');lib.GlobalWorkerOptions.workerSrc=workerUrl;const loading=lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',iccUrl:'/pdfjs/iccs/'});cleanup=()=>{void loading.destroy();};doc=await loading.promise;const p=await doc.getPage(page);if(!live)return;const viewport=p.getViewport({scale:1.5}),off=document.createElement('canvas');off.width=Math.ceil(viewport.width);off.height=Math.ceil(viewport.height);render=p.render({canvas:off,viewport});await render.promise;source=off;
  }else{const url=URL.createObjectURL(blob),img=new Image();cleanup=()=>URL.revokeObjectURL(url);img.src=url;await img.decode();source=img;}
  if(!live)return;const sw=source instanceof HTMLImageElement?source.naturalWidth:source.width,sh=source instanceof HTMLImageElement?source.naturalHeight:source.height;if(Math.abs((sw/sh)/(width/height)-1)>.01)throw new Error("page_frame_mismatch");target.width=width;target.height=height;target.getContext('2d')!.drawImage(source,0,0,width,height);setReady(true);
 }catch(e){if(live&&(e as Error).name!=='RenderingCancelledException')setError(true);}})();
 return()=>{live=false;render?.cancel();cleanup();};
 },[blob,mime,page,width,height]);
 return <>{error?<p role="alert">Originale non visualizzabile. Nessuna posizione può essere salvata dal disegno.</p>:<>{!ready&&<p role="status">Preparazione originale…</p>}<div className={styles.map} style={{aspectRatio:width+'/'+height}}><canvas ref={canvas} aria-label="Planimetria originale"/>{ready&&<svg viewBox={'0 0 '+width+' '+height} aria-label="Vani e posizioni sulla mappa" onClick={e=>{const b=e.currentTarget.getBoundingClientRect();onPoint((e.clientX-b.left)/b.width*width,(e.clientY-b.top)/b.height*height);}}>{children}</svg>}{ready&&overlay}</div></>}</>;
}
