import { useRef } from 'react';
import { ui } from './ui';

export function FilePicker({onFiles,disabled,accept='application/pdf,image/jpeg,image/png',secondary=false}:{onFiles:(files:File[])=>void;disabled?:boolean;accept?:string;secondary?:boolean}) {
  const input=useRef<HTMLInputElement>(null);
  return <><button type="button" className={secondary?ui.btn:`${ui.btn} ${ui.primary}`} disabled={disabled} onClick={()=>input.current?.click()}>Scegli file</button><input ref={input} hidden type="file" multiple aria-label="Documenti da caricare" accept={accept} disabled={disabled} onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';if(files.length)onFiles(files);}}/></>;
}
