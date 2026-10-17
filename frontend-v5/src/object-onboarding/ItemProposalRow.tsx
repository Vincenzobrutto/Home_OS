import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { ApiClient } from '../api/client';
import { ui } from '../components/ui';
import { expenseNeedsReview, type CandidatePage, type Draft, type Form, type Item } from './model';
import { useExpenseCandidates } from './useExpenseCandidates';
import styles from './onboarding.module.css';

type Props={api:ApiClient;accountId:string;base:string;root:string;draft:Draft;item:Item;form:Form;disabled:boolean;selected:boolean;change:(form:Form)=>void;select:(value:boolean)=>void;review:()=>void};
export function ItemProposalRow({api,accountId,base,root,draft,item,form,disabled,selected,change,select,review}:Props){
 const finished=!!item.decision&&['confirmed','skipped'].includes(item.decision.state),deferred=item.decision?.state==='deferred';
 const candidates=useQuery({queryKey:['account',accountId,'onboarding',draft.id,'candidates',item.id,'',draft.version],queryFn:({signal})=>api.callJson<CandidatePage>(base+'/drafts/'+encodeURIComponent(draft.id)+'/candidates?itemId='+encodeURIComponent(item.id),{accountId,signal}),enabled:!finished,retry:false,gcTime:0});
 useExpenseCandidates(api,accountId,base,draft,item,form,change,!finished);
 const name=form.name||item.fields.name?.value||'Articolo da identificare',quantity=item.quantity?.value??1;
 const fieldValue=(key:'brand'|'model')=>form.fields[key]?.action==='manual'?form.fields[key]?.value:form.fields[key]?.action==='skip'?null:item.profile[key]?.value;
 const plausible=candidates.data?.items.some(c=>c.reason!=='manual_selection');
 const amount=form.amount.replace(',','.');
 const ready=form.action==='skip'||!expenseNeedsReview(form)&&candidates.isSuccess&&(form.action==='create'?!!name.trim()&&(item.disposition==='household_object'||form.confirmHouseholdObject)&&(!plausible||form.acknowledgeExistingSource):form.targets.length===quantity&&form.targets.every(t=>!t.profile.unavailable))&&(form.expense==='skip'||form.expense==='link'&&!!form.expenseId||form.expense==='create'&&/^\d+(\.\d{1,2})?$/.test(amount)&&Number(amount)>0&&!!form.spentOn);
 useEffect(()=>{if(!ready||deferred||finished)select(false);},[ready,deferred,finished,select]);
 const status=finished?item.decision?.state==='skipped'?'Escluso dalla casa':'Confermato':deferred?'Da riprendere':candidates.isPending||form.expenseAutoState==='pending'?'Controllo in corso':ready?'Proposta pronta':'Da rivedere';
 return <article className={styles.proposalRow} aria-label={name}>
  <div>{!finished&&draft.items.length>1&&<label className={styles.check}><input type="checkbox" aria-label={'Seleziona '+name} checked={selected&&ready} disabled={disabled||!ready||deferred} onChange={e=>select(e.target.checked)}/></label>}</div>
  <div className={styles.proposalMain}><h3>{name}</h3><p className={styles.source}>{[fieldValue('brand'),fieldValue('model')].filter(Boolean).join(' · ')}</p><span className={styles.status}>{status}</span>
   {finished?<><p className={styles.source}>{item.decision?.state==='skipped'?'Escluso dalla casa: nessuna scheda o spesa creata':'Organizzato: originale collegato, senza duplicarlo.'}</p>{item.decision?.objects.map((target,index)=>target.id?<Link key={target.id} className={styles.objectLink} to={root+'/oggetti/object/'+target.id}>Apri {target.name}</Link>:<p key={index}>Scheda non più disponibile.</p>)}</>:<p className={styles.source}>{expenseNeedsReview(form)?'Verifica i possibili doppioni prima di confermare.':form.action==='skip'?'Nessun oggetto o costo sarà aggiunto.':form.expense==='create'?'Nuova spesa proposta: '+form.amount+' € · '+form.spentOn:form.expense==='link'?'Mantieni la spesa già registrata.':draft.purchaseTotal?'Nessuna nuova spesa selezionata.':'Nessuna spesa proposta: prezzo non disponibile.'}</p>}
  </div>
  {!finished&&<button type="button" className={ui.btn} aria-label={(deferred?'Riprendi ':'Rivedi ')+name} disabled={disabled} onClick={review}>{deferred?'Riprendi':'Rivedi'}</button>}
 </article>;
}
