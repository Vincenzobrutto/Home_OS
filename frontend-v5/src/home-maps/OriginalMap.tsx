import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {displayFrame,orientationMatrix,orientationTransform,type MapTurn,type ViewFrame} from './orientation';
import {fromClient} from './spatial';
import styles from './map.module.css';
export function OriginalMap({blob,mime,page,width,height,children,onPoint,overlay,showOriginal=true,turn=0,viewport}:{blob:Blob;mime:string;page:number;width:number;height:number;children:ReactNode;overlay?:ReactNode;showOriginal?:boolean;turn?:MapTurn;viewport?:ViewFrame;onPoint:(x:number,y:number)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),[ready,setReady]=useState(false),[error,setError]=useState(false);
 const frame=viewport??{width,height},view=displayFrame(frame,turn),matrix=orientationMatrix(frame,turn);
 useEffect(()=>{let live=true,doc:PDFDocumentProxy|undefined,render:RenderTask|undefined,cleanup=()=>{};
 void(async()=>{try{
  const target=canvas.current!;let source:HTMLImageElement|HTMLCanvasElement;
  if(mime==='application/pdf'){const lib=await import('pdfjs-dist');lib.GlobalWorkerOptions.workerSrc=workerUrl;const loading=lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',iccUrl:'/pdfjs/iccs/'});cleanup=()=>{void loading.destroy();};doc=await loading.promise;const p=await doc.getPage(page);if(!live)return;const viewport=p.getViewport({scale:1.5}),off=document.createElement('canvas');off.width=Math.ceil(viewport.width);off.height=Math.ceil(viewport.height);render=p.render({canvas:off,viewport});await render.promise;source=off;
  }else{const url=URL.createObjectURL(blob),img=new Image();cleanup=()=>URL.revokeObjectURL(url);img.src=url;await img.decode();source=img;}
  if(!live)return;const sw=source instanceof HTMLImageElement?source.naturalWidth:source.width,sh=source instanceof HTMLImageElement?source.naturalHeight:source.height;if(Math.abs((sw/sh)/(width/height)-1)>.01)throw new Error("page_frame_mismatch");target.width=width;target.height=height;target.getContext('2d')!.drawImage(source,0,0,width,height);setReady(true);
 }catch(e){if(live&&(e as Error).name!=='RenderingCancelledException')setError(true);}})();
 return()=>{live=false;render?.cancel();cleanup();};
 },[blob,mime,page,width,height]);
 return <>{error?<p role="alert">Originale non visualizzabile. Nessuna posizione può essere salvata dal disegno.</p>:<>{!ready&&<p role="status">Preparazione originale…</p>}<div className={styles.map} style={{aspectRatio:view.width+'/'+view.height}}><div className={styles.originalClip}><canvas ref={canvas} aria-label="Planimetria originale" aria-hidden={!showOriginal} style={{visibility:showOriginal?'visible':'hidden',position:'absolute',left:matrix[4]/view.width*100+'%',top:matrix[5]/view.height*100+'%',width:width/view.width*100+'%',height:height/view.height*100+'%',transformOrigin:'0 0',transform:'rotate('+turn*90+'deg)'}}/></div>{ready&&<svg viewBox={'0 0 '+view.width+' '+view.height} aria-label="Vani e posizioni sulla mappa" onClick={e=>{const p=fromClient(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect(),frame,turn);if(p)onPoint(p[0],p[1]);}}><g transform={orientationTransform(frame,turn)}>{children}</g></svg>}{ready&&overlay}</div></>}</>;
}
