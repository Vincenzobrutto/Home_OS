import {useId} from 'react';
import type {GiftDocumentProvenance} from '../api/types';
import styles from './GiftDocumentOrigin.module.css';

export function GiftDocumentBadge({source}:{source:'manual_upload'|'agency_gift'|undefined}){
  return source==='agency_gift'?<span className={styles.badge}>Ricevuto con Gift</span>:null;
}
const KIND_LABEL={net:'Superficie netta',cadastral:'Superficie catastale',commercial:'Superficie commerciale'} as const;
const QUALIFICATION_LABEL={estimated:'Stima',reviewed:'Revisionata',unverified:'Da verificare'} as const;

/** Read-only delivery provenance. Opening this panel never queries or grants Agency access. */
export function GiftDocumentOrigin({provenance}:{provenance?:GiftDocumentProvenance}){
  const titleId=useId(),surfaceId=useId(),surface=provenance?.surface;
  return <section className={styles.panel} aria-labelledby={titleId}>
    <h2 id={titleId}>Provenienza della Gift</h2>
    {!provenance?<p>Documento ricevuto con Gift. I dettagli della provenienza non sono disponibili.</p>:<>
      <p>Questi dati descrivono la consegna ricevuta dall’agenzia. Il titolo alla consegna resta distinto dalle tue modifiche.</p>
      <dl className={styles.details}>
        <dt>Titolo alla consegna</dt><dd>{provenance.title}</dd>
        <dt>Origine dichiarata</dt><dd>{provenance.origin==='received'?'Documento ricevuto dall’agenzia':'Produzione dell’agenzia dichiarata dall’agente'}</dd>
        <dt>Autore dichiarato</dt><dd>{provenance.author}</dd>
        <dt>Fonte nella pratica</dt><dd>{provenance.sourceId}</dd>
        <dt>Versione della fonte</dt><dd>{provenance.sourceVersion}</dd>
        <dt>Versione dei metadati</dt><dd>{provenance.metadataVersion}</dd>
        <dt>Impronta SHA-256 alla consegna</dt><dd className={styles.hash}>{provenance.sourceSha256}</dd>
      </dl>
      {surface&&<section className={styles.surface} aria-labelledby={surfaceId}>
        <h3 id={surfaceId}>{KIND_LABEL[surface.kind]} · {QUALIFICATION_LABEL[surface.qualification]}</h3>
        <dl className={styles.details}>
          <dt>Metodo riportato</dt><dd>{surface.method}</dd>
          <dt>Revisione della geometria</dt><dd>{surface.geometryRevision}</dd>
        </dl>
        {!!surface.caveats.length&&<ul className={styles.caveats} aria-label="Limiti della superficie ricevuta">{surface.caveats.map(caveat=><li key={caveat}>{caveat}</li>)}</ul>}
        <p>La qualifica e i limiti restano quelli del documento ricevuto: non certificano la misura.</p>
      </section>}
      <p className={styles.note}>La provenienza non certifica contenuto, firma, proprietà o validità tecnica. L’originale resta consultabile dai normali strumenti di questa casa.</p>
    </>}
  </section>;
}
