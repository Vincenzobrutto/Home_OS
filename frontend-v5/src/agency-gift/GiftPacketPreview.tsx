import styles from './gift-preview.module.css';

/** Read-only projection of the internal packet, not an HTTP DTO or delivery authority. */
export type GiftPreviewPacket = {
  schemaVersion:'agency-gift-preparation-v1';purpose:'internal_preview';
  agencyId:string;practiceId:string;practiceRevision:number;preparedBy:string;
  requestedHomeId:string;recipients:{subjectRef:string}[];
  canDeliver:false;createsHome:false;grantsAccess:false;certification:false;
  homeDestinationAuthorized:false;recipientIdentityVerified:false;
  documents:{sourceId:string;version:number;sha256:string;metadataVersion:number;title:string;author:string;
    origin:'received'|'agency_generated';lifecycle:'final'|'signed';signatureVerification:'not_assessed';
    surface?:{kind:'net'|'cadastral'|'commercial';qualification:'estimated'|'reviewed'|'unverified';method:string;geometryRevision:number;caveats:string[]}}[];
};
type Scope={agencyId:string;practiceId:string;revision:number;accountId:string};
type Source={sourceId:string;version:number;sha256:string};
type Props={scope:Scope;access:'allowed'|'loading'|'denied';packet:GiftPreviewPacket|null;onOpenSource?:(source:Source)=>void};
const surfaceLabels={net:'Superficie netta',cadastral:'Superficie catastale',commercial:'Superficie commerciale'};
const qualifications={estimated:'Stima',reviewed:'Rivista dall’agente',unverified:'Da verificare'};

/** Parent must clear packet on denial/change of session or source. No network or Home mutation. */
export function GiftPacketPreview({scope,access,packet,onOpenSource}:Props){
  if(access==='denied')return <section className={styles.panel} role="alert">Anteprima non disponibile: accesso negato.</section>;
  if(access==='loading')return <section className={styles.panel} role="status">Caricamento anteprima Gift…</section>;
  const matches=packet&&packet.agencyId===scope.agencyId&&packet.practiceId===scope.practiceId&&
    packet.practiceRevision===scope.revision&&packet.preparedBy===scope.accountId;
  if(!matches)return <section className={styles.panel} role="status">Prepara nuovamente il pacchetto dalla pratica corrente.</section>;
  // Defense against accidentally rendering another operation's result as a deliverable Gift.
  if(packet.schemaVersion!=='agency-gift-preparation-v1'||packet.purpose!=='internal_preview'||
    packet.canDeliver!==false||packet.createsHome!==false||packet.grantsAccess!==false||
    packet.certification!==false||packet.homeDestinationAuthorized!==false||packet.recipientIdentityVerified!==false||
    !packet.documents.length||packet.documents.some(d=>!['final','signed'].includes(d.lifecycle)||d.signatureVerification!=='not_assessed'))
    return <section className={styles.panel} role="alert">Pacchetto non compatibile con questa anteprima interna.</section>;
  return <section className={styles.panel} aria-label="Anteprima interna Gift">
    <header><p className={styles.eyebrow}>Dalla pratica alla casa</p><h2>Documenti per la futura Gift</h2>
      <p className={styles.notice}>Anteprima interna. Consegna e presa in carico non sono ancora attive; nessuna casa o autorizzazione viene creata.</p></header>
    <div className={styles.target}><div><h3>Una sola casa di destinazione</h3><p className={styles.reference}>{packet.requestedHomeId}</p><p>Destinazione selezionata, accesso alla casa ancora da autorizzare.</p></div>
      <div><h3>Riferimenti destinatari da verificare</h3><ul>{packet.recipients.map(r=><li key={r.subjectRef} className={styles.reference}>{r.subjectRef}</li>)}</ul><p>Questi riferimenti non attestano identità o intestazione attuale.</p></div></div>
    <h3>Documenti selezionati · {packet.documents.length}</h3>
    <ul className={styles.documents}>{packet.documents.map(d=><li key={d.sourceId} className={styles.document}>
      <div className={styles.documentHeader}><h4>{d.title}</h4><span className={styles.badge}>{d.origin==='agency_generated'?'Prodotto dall’agenzia':'Ricevuto dall’agenzia'}</span></div>
      <p>Autore dichiarato: {d.author}</p><p>{d.lifecycle==='signed'?'Sottoscritto dichiarato · firma non verificata':'Finale dichiarato'}</p>
      <dl className={styles.provenance}><div><dt>Fonte</dt><dd>{d.sourceId}</dd></div><div><dt>Versione documento</dt><dd>{d.version}</dd></div><div><dt>Versione metadati</dt><dd>{d.metadataVersion}</dd></div><div><dt>SHA-256</dt><dd>{d.sha256}</dd></div></dl>
      {d.surface&&<div className={styles.surface}><h5>{surfaceLabels[d.surface.kind]} · {qualifications[d.surface.qualification]}</h5><p>Metodo: {d.surface.method} · revisione geometria {d.surface.geometryRevision}</p>
        {!!d.surface.caveats.length&&<ul aria-label="Limiti della superficie">{d.surface.caveats.map((c,i)=><li key={i}>{c}</li>)}</ul>}
        <p>La qualifica della superficie resta associata al documento; non è una certificazione.</p></div>}
      {onOpenSource&&<button type="button" onClick={()=>onOpenSource({sourceId:d.sourceId,version:d.version,sha256:d.sha256})}>Rivedi originale · {d.title}</button>}
    </li>)}</ul>
    <p className={styles.notice}>Il pacchetto non dichiara il fascicolo completo o conforme. Bozze e note interne non vengono aggiunte automaticamente.</p>
    <p className={styles.future}>Dopo una futura accettazione, i documenti selezionati dovranno diventare la base indipendente della casa. Le aggiunte del proprietario resteranno separate dagli accessi dell’agenzia. Questo trasferimento è ancora da collegare.</p>
  </section>;
}
