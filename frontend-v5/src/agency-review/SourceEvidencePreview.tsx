import {PdfPreview} from '../documents/PdfPreview';
import styles from './source-evidence.module.css';

type Props={blob:Blob;url:string;filename:string;page:number;excerpt:string;onClose:()=>void};

/** Displays only bytes already authorized by the caller; the caller owns the Blob URL. */
export function SourceEvidencePreview({blob,url,filename,page,excerpt,onClose}:Props){
 const pdf=(blob.type.split(';')[0]??'').trim().toLowerCase()==='application/pdf';
 return <section className={styles.preview} aria-label="Fonte originale della citazione">
  <header className={styles.header}><div><h3>Fonte originale · pagina {page}</h3><p>{filename}</p></div><button type="button" onClick={onClose}>Chiudi anteprima fonte</button></header>
  <div className={styles.content}>
   <div className={styles.evidence}><h4>Passaggio citato</h4><blockquote>{excerpt}</blockquote><p>Confronta la citazione con la pagina originale. L’anteprima non certifica significato, proprietà o conformità.</p></div>
   <div className={styles.document}>{pdf?<PdfPreview key={url+':'+page} blob={blob} url={url} filename={filename} initialPage={page} showDownload={false}/>:<p role="status">Anteprima non disponibile per questo formato. Scarica l’originale per controllare la fonte.</p>}</div>
  </div>
  <a href={url} download={filename}>Scarica originale</a>
 </section>;
}
