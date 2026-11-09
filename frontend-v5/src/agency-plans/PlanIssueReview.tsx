import {useState} from 'react';
import styles from './practice-plan.module.css';

export type Resolution='included_in_geometry'|'excluded_from_computation'|'not_applicable';
const outcomes:Record<Resolution,string>={
 included_in_geometry:'Ho incluso l’elemento nel contorno',
 excluded_from_computation:'Ho verificato che resta fuori dal computo',
 not_applicable:'La segnalazione non è pertinente',
};

/** One open check, linked to its room name and map point. Registering an outcome removes it from the open list server-side. */
export function PlanIssueReview(p:{
 issue:{id:string;code:string};index:number;roomLabel?:string;description:string;symbolReason?:string;
 onShow?:()=>void;showLabel?:string;showDisabled?:boolean;disabled:boolean;geometryEdited:boolean;
 onResolve:(issue:{id:string;code:string},resolution:Resolution,reason:string)=>void;
}){
 const [resolution,setResolution]=useState<Resolution|''>(''),[reason,setReason]=useState('');
 const label=(p.roomLabel?p.roomLabel+' · ':'')+'verifica '+p.index;
 return <li className={styles.issueItem}>
  <p className={styles.issueTitle}><strong>{p.roomLabel??'Zona senza vano'}</strong> <span>n. {p.index}</span></p>
  <p>{p.description}</p>
  {p.symbolReason&&<p className={styles.muted}>{p.symbolReason}</p>}
  <div className={styles.issueActions}>
   {p.onShow?<button type="button" disabled={p.showDisabled} onClick={p.onShow}>{p.showLabel??'Mostra sulla mappa'}</button>:<span className={styles.muted}>Posizione non disponibile: confronta l’originale.</span>}
   <label>Esito {label}<select value={resolution} disabled={p.disabled} onChange={e=>setResolution(e.target.value as Resolution|'')}>
    <option value="">Scegli esito</option>
    {(Object.keys(outcomes) as Resolution[]).map(id=><option key={id} value={id} disabled={id==='included_in_geometry'&&!p.geometryEdited}>{outcomes[id]}</option>)}
   </select></label>
  </div>
  {resolution&&<>
   <label>Nota facoltativa {label}<input value={reason} disabled={p.disabled} maxLength={1000} onChange={e=>setReason(e.target.value)} placeholder="Es. controllato sull’originale"/></label>
   <button type="button" className={styles.primaryButton} disabled={p.disabled} onClick={()=>p.onResolve(p.issue,resolution,reason.trim()||outcomes[resolution])}>Chiudi verifica {p.index}</button>
  </>}
 </li>;
}
