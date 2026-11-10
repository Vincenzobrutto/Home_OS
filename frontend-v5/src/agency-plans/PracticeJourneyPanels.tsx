import {useState} from 'react';
import {Link} from 'react-router';
import {profileLabels,stageLabels,type Journey,type JourneyCommand} from './journey';
import styles from './practice-plan.module.css';

type Save=(command:JourneyCommand)=>Promise<boolean>;
const transactionLabels:Record<keyof Journey['transaction'],string>={buyer:'Acquirente',offerPrice:'Prezzo proposto',outcome:'Esito della proposta',mortgage:'Stato mutuo acquirente',notary:'Notaio',closingDate:'Data e ora stipula',tasks:'Attività e scadenze da seguire'};

export function PracticeProfile({state,save,disabled,stale}:{state:Journey;save:Save;disabled:boolean;stale:boolean}){
 const [profile,setProfile]=useState(state.profile),[notice,setNotice]=useState('');
 return <details className={styles.panel}><summary>Dati della pratica</summary>
  {stale&&<p role="alert">L’incarico di origine è cambiato o non è più disponibile. Inserisci nuovamente i dati: saranno salvati come dichiarazioni manuali.</p>}
  <fieldset disabled={disabled}><div className={styles.fieldGrid}>{(Object.keys(profileLabels) as Array<keyof Journey['profile']>).map(field=><label key={field}>{profileLabels[field]}<input value={profile[field]} maxLength={500} onChange={e=>setProfile({...profile,[field]:e.target.value})}/></label>)}</div>
  <button type="button" disabled={!profile.seller.trim()||!profile.address.trim()} onClick={async()=>{
   if(await save({operation:'profile',profile,sourceId:state.mandateSourceId,version:state.mandateVersion}))setNotice('Dati della pratica salvati.');
  }}>Salva dati della pratica</button></fieldset>
  {notice&&<p role="status">{notice}</p>}
 </details>;
}
export function PracticeListing({state,save,disabled}:{state:Journey;save:Save;disabled:boolean}){
 const [listing,setListing]=useState(state.listing),[notice,setNotice]=useState('');
 return <section className={styles.panel} aria-label="Bozza annuncio"><h2>Prepara annuncio</h2>
  <p>Usa i dati confermati e completa la descrizione prima di copiarla.</p>
  <dl><dt>Indirizzo</dt><dd>{state.profile.address||'Da completare'}</dd><dt>Prezzo richiesto</dt><dd>{state.profile.askingPrice||'Da completare'}</dd></dl>
  <fieldset disabled={disabled}>
   <label>Titolo annuncio<input maxLength={200} value={listing.title} onChange={e=>setListing({...listing,title:e.target.value})}/></label>
   <label>Descrizione annuncio<textarea maxLength={10000} value={listing.description} onChange={e=>setListing({...listing,description:e.target.value})}/></label>
   <button type="button" onClick={async()=>{if(await save({operation:'listing',listing}))setNotice('Bozza annuncio salvata.');}}>Salva bozza annuncio</button>
   <button type="button" disabled={!listing.title&&!listing.description} onClick={async()=>{try{await navigator.clipboard.writeText([listing.title,listing.description].filter(Boolean).join('\n\n'));setNotice('Testo annuncio copiato.');}catch{setNotice('Seleziona il testo per copiarlo.');}}}>Copia testo annuncio</button>
  </fieldset>
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
export function PracticeTransaction({state,save,disabled,delivery,closing=false}:{state:Journey;save:Save;disabled:boolean;delivery:string;closing?:boolean}){
 const [transaction,setTransaction]=useState(state.transaction),[stage,setStage]=useState(state.stage),[notice,setNotice]=useState('');
 return <section className={styles.panel} aria-label={closing?"Stipula":"Trattativa"}><h2>{closing?"Prepara la stipula":"Gestisci la trattativa"}</h2>
  <p>Registra gli accordi e le attività ancora da completare.</p>
  <fieldset disabled={disabled}>
   <label>Fase della vendita<select value={stage} onChange={e=>setStage(e.target.value as Journey['stage'])}>{Object.entries(stageLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <button type="button" onClick={async()=>{if(await save({operation:'stage',stage}))setNotice('Fase della pratica aggiornata.');}}>Salva fase</button>
   <div className={styles.fieldGrid}>{(Object.keys(transactionLabels) as Array<keyof Journey['transaction']>).filter(field=>closing?['notary','closingDate','tasks'].includes(field):!['notary','closingDate'].includes(field)).map(field=><label key={field}>{transactionLabels[field]}{field==='tasks'?<textarea value={transaction[field]} maxLength={4000} onChange={e=>setTransaction({...transaction,[field]:e.target.value})}/>:<input value={transaction[field]} maxLength={500} onChange={e=>setTransaction({...transaction,[field]:e.target.value})}/>}</label>)}</div>
   <button type="button" onClick={async()=>{if(await save({operation:'transaction',transaction}))setNotice('Trattativa e attività salvate.');}}>Salva trattativa e stipula</button>
  </fieldset>
  {notice&&<p role="status">{notice}</p>}
  {closing&&state.stage==='completed'&&<div className={styles.nextAction}><h3>Consegna la casa al nuovo proprietario</h3><p>Seleziona i documenti e la mappa digitale da includere nella Gift.</p><Link to={delivery} className={styles.primaryAction}>Prepara Gift</Link></div>}
 </section>;
}
