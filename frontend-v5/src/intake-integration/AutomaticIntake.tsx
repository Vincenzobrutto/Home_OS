import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { ui } from '../components/ui';

export type AutomaticRun = {id:string;state:'running'|'finished';entries:Array<{documentId:string|null;name:string|null;state:string;reason:string|null;draftId:string|null;newObjects:number;newExpenses:number;newContacts?:number;linkedContacts?:number}>};
export function AutomaticIntake({homeId,batchId,onChange}:{homeId:string;batchId:string;onChange:(active:boolean)=>void}) {
  const api=useApi(),account=useAccount(),cache=useQueryClient();
  const result=useQuery({queryKey:['account',account.id,'home',homeId,'automatic-intake',batchId],queryFn:({signal})=>api.callJson<{run:AutomaticRun|null}>(`/homes/${homeId}/object-onboarding/automatic-runs/batches/${batchId}`,{accountId:account.id,signal}),retry:false,refetchInterval:q=>q.state.data?.run?.state==='running'?1500:false});
  const run=result.data?.run;
  const runId=run?.id,runState=run?.state;
  useEffect(()=>{onChange(!!runId);if(runState==='finished')void cache.invalidateQueries({queryKey:['account',account.id,'home',homeId]});return()=>onChange(false);},[runId,runState,onChange,cache,account.id,homeId]);
  if(!run)return null;
  const completed=run.entries.filter(e=>e.state==='completed').length,attention=run.entries.filter(e=>e.state==='attention'||e.state==='unavailable');
  return <section className={ui.card} aria-label="Organizzazione automatica">
    <h1>{run.state==='running'?'Stiamo organizzando i tuoi documenti':'Caricamento elaborato'}</h1>
    <p role="status">{completed} documenti organizzati · {run.entries.reduce((s,e)=>s+e.newObjects,0)} nuovi oggetti · {run.entries.reduce((s,e)=>s+e.newExpenses,0)} nuove spese{run.entries.some(e=>e.newContacts||e.linkedContacts)&&<> · {run.entries.reduce((s,e)=>s+(e.newContacts??0),0)} nuovi contatti · {run.entries.reduce((s,e)=>s+(e.linkedContacts??0),0)} contatti collegati</>}</p>
    {run.state==='running'&&<p>Puoi chiudere questa pagina: il lavoro continua e ritroverai qui l’esito.</p>}
    {attention.length>0&&<><h2>Serve solo questo controllo</h2><ul>{attention.map((e,i)=><li key={e.documentId??i}><strong>{e.name??'Documento non disponibile'}</strong><p>{e.reason??'Il documento non è più accessibile.'}</p>{e.documentId&&<Link className={ui.btn} to={`/home/${homeId}/documenti/${e.documentId}/oggetti${e.draftId?'?bozza='+e.draftId:''}`}>Completa i dati</Link>}</li>)}</ul></>}
    <p><Link className={ui.btn} to={`/home/${homeId}/rubrica`}>Vedi rubrica</Link> <Link className={ui.btn} to={`/home/${homeId}/oggetti`}>Vedi oggetti e impianti</Link> <Link className={ui.btn} to={`/home/${homeId}/spese`}>Vedi spese</Link> <Link className={ui.btn} to={`/home/${homeId}/documenti`}>Vedi documenti</Link></p>
  </section>;
}
