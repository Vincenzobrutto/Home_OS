import { useRef } from 'react';
import { photoFile } from '../lib/files';
import { ui } from './ui';

export function FilePicker({onFiles,disabled,accept='application/pdf,image/jpeg,image/png',secondary=false}:{onFiles:(files:File[])=>void;disabled?:boolean;accept?:string;secondary?:boolean}) {
  const input=useRef<HTMLInputElement>(null);
  return <><button type="button" className={secondary?ui.btn:`${ui.btn} ${ui.primary}`} disabled={disabled} onClick={()=>input.current?.click()}>Scegli file</button><input ref={input} hidden type="file" multiple aria-label="Documenti da caricare" accept={accept} disabled={disabled} onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';if(files.length)onFiles(files);}}/></>;
}

/**
 * BL-04: scatto con la fotocamera posteriore dove il browser lo supporta (capture); sul computer si apre la scelta
 * di un'immagine. Solo JPEG/PNG; la foto segue lo stesso caricamento dei documenti, senza analisi automatica.
 */
export function PhotoPicker({onFiles,disabled}:{onFiles:(files:File[])=>void;disabled?:boolean}) {
  const input=useRef<HTMLInputElement>(null);
  return <><button type="button" className={ui.btn} disabled={disabled} onClick={()=>input.current?.click()}>Scatta una foto</button><input ref={input} hidden type="file" accept="image/jpeg,image/png" capture="environment" aria-label="Foto da scattare" disabled={disabled} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)onFiles([photoFile(file)]);}}/></>;
}
