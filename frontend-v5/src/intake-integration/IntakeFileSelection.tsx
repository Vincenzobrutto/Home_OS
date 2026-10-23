import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { FilePicker, PhotoPicker } from '../components/FilePicker';
import { ui } from '../components/ui';
import { formatBytes } from '../lib/files';
import pages from '../routes/pages.module.css';
import styles from './integration.module.css';

type StagedFile={id:string;file:File};
type Props={waiting:boolean;available:boolean;recoverCreation:boolean;canEdit:boolean;workspace:boolean;
 stagedFiles:StagedFile[];setStagedFiles:Dispatch<SetStateAction<StagedFile[]>>;
 stage:(chosen:File[])=>void;create:(selected?:File[])=>Promise<void>;automaticControl:ReactNode;automaticConsent:boolean;};

/** Chosen-file presentation only; upload, consent and stable keys remain in IntakeContent. */
export function IntakeFileSelection({waiting,available,recoverCreation,canEdit,workspace,stagedFiles,setStagedFiles,stage,create,automaticControl,automaticConsent}:Props){
 return <section className={ui.card} aria-label="Caricamento documenti">
      <h2>Aggiungi documenti</h2>
      <div className={styles.dropZone} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!waiting&&available&&canEdit)stage(Array.from(e.dataTransfer.files));}}>
        <p>Fatture, bollette, documenti e foto della casa.</p>
        <div className={styles.pickers}><FilePicker disabled={waiting||!available||recoverCreation||!canEdit} secondary={stagedFiles.length>0} onFiles={stage}/><PhotoPicker disabled={waiting||!available||recoverCreation||!canEdit} onFiles={stage}/></div>
        <p className={pages.muted}>Oppure trascinali qui · PDF, JPEG o PNG · fino a 20 file, circa 21 MB ciascuno.</p>
        <p className={pages.muted}>Le foto si salvano come immagini visibili solo a te. Dimora non ne legge il testo e non le invia all’esterno senza il tuo consenso.</p>
      </div>
      {stagedFiles.length>0&&<><h2 className={styles.selectionHeading}>File scelti · {stagedFiles.length}</h2><ul className={styles.selectedFiles} aria-label="File scelti">{stagedFiles.map(x=><li key={x.id}><div className={styles.selectedName}><strong>{x.file.name}</strong><span>{formatBytes(x.file.size)}</span></div><button type="button" className={ui.btn} aria-label={'Rimuovi '+x.file.name} disabled={waiting||recoverCreation} onClick={()=>setStagedFiles(old=>old.filter(f=>f.id!==x.id))}>Rimuovi</button></li>)}</ul><p className={pages.muted}>Puoi rimuovere i file sbagliati prima di caricarli.</p></>}
      {!workspace&&<div className={styles.uploadConsent}>{automaticControl}</div>}
      {stagedFiles.length>0&&<button type="button" className={`${ui.btn} ${ui.primary}`} disabled={waiting||recoverCreation||!available||!canEdit} onClick={()=>void create(stagedFiles.map(x=>x.file))}>{automaticConsent?'Carica e organizza':'Carica documenti'}</button>}
    </section>;
}
