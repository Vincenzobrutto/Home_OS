import {useState,useEffect,useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import type {ApiClient} from '../api/client';
import {userMessage} from '../api/errors';
import {ui} from '../components/ui';
import type {Draft,HouseExpense,ExpenseCandidate} from './model';
import {houseExpenseTitle} from './model';
import styles from './onboarding.module.css';
const categories={electricity:'Energia elettrica',gas:'Gas',water:'Acqua',internet_services:'Internet e servizi',maintenance:'Manutenzione',repairs_works:'Lavori e riparazioni',purchase_replacement:'Acquisti e sostituzioni'};
export type HouseReview={choice:unknown|null;newExpenses:number;amountCents:number;manual:boolean;action:string};
export function HouseExpenseProposal({item,draft,api,accountId,base,root,disabled,beforeDocument,confirm,unified=false,onReview}:{item:HouseExpense;draft:Draft;api:ApiClient;accountId:string;base:string;root:string;disabled:boolean;beforeDocument:boolean;confirm:(choice:unknown)=>Promise<void>;unified?:boolean;onReview?:(review:HouseReview)=>void}){
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'}),isBill=item.documentKind!=='simple_invoice';
 const fields=item.proposedFields,eligible=item.amountCandidates.filter(a=>['current_document_total','amount_due'].includes(a.role)),initial=!item.amountSelectionRequired?eligible.find(a=>a.role==='current_document_total'):undefined;
 const [candidateId,setCandidate]=useState(initial?.id??''),[amount,setAmount]=useState(initial?String(initial.amountCents/100):''),[manual,setManual]=useState(false),[title,setTitle]=useState(houseExpenseTitle(item,draft)??(isBill?'Bolletta ':'Spesa della casa ')+(categories[fields.category?.value as keyof typeof categories]??'')),[supplier,setSupplier]=useState(fields.supplier?.value??''),[date,setDate]=useState(fields.documentDate?.value&&fields.documentDate.value<=today?fields.documentDate.value:''),[category,setCategory]=useState(fields.category?.value??''),[mode,setMode]=useState('create'),[expenseId,setExpense]=useState(''),[ack,setAck]=useState(false),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [editing,setEditing]=useState(unified);
 const done=['confirmed','skipped'].includes(item.decision?.state??'');
 const candidates=useQuery({queryKey:['account',accountId,'home',root,'bill-expenses',draft.id,item.id,draft.version],queryFn:({signal})=>api.callJson<{items:ExpenseCandidate[];nextCursor:string|null}>(base+'/drafts/'+draft.id+'/expense-candidates?itemId='+encodeURIComponent(item.id),{accountId,signal}),enabled:!done,retry:false,gcTime:0});
 const duplicates=candidates.data?.items.filter(x=>x.rank>0)??[],row=candidates.data?.items.find(x=>x.id===expenseId);
 const valid=mode==='skip'||mode==='defer'?true:mode==='link_existing'?!!row:!!title.trim()&&!!category&&!!date&&date<=today&&/^\d+(?:[.,]\d{1,2})?$/.test(amount)&&Number(amount.replace(',','.'))>0&&(manual||!!candidateId)&&(!duplicates.length||ack);
 function selection(action:string){const values={title,category,supplier:supplier||null,amountCents:Math.round(Number(amount.replace(',','.'))*100),spentOn:date,objectRef:null,...Object.fromEntries(['documentNumber','documentDate','competenceFrom','competenceTo','dueOn'].filter(k=>fields[k]).map(k=>[k,fields[k]!.value]))};return {itemId:item.id,action,...(action==='create'?{values,amountSelection:manual?{mode:'manual'}:{mode:'candidate',candidateId},acknowledgePossibleDuplicate:ack}:action==='link_existing'?{expenseId,expectedExpenseVersion:row?.version}:{})};}
 const review={choice:valid&&(['skip','defer'].includes(mode)||candidates.isSuccess)?selection(mode):null,newExpenses:mode==='create'?1:0,amountCents:mode==='create'?Math.round(Number(amount.replace(',','.'))*100)||0:0,manual,action:mode};
 const serialized=JSON.stringify(review),notified=useRef('');
 useEffect(()=>{if(onReview&&serialized!==notified.current){notified.current=serialized;onReview(JSON.parse(serialized) as HouseReview);}},[serialized,onReview]);
 async function apply(action:string){setError('');setWorking(true);try{await confirm(selection(action));}catch(e){setError(userMessage(e));}finally{setWorking(false);}}

 return <section className={ui.card} aria-label={'Spesa della casa: '+title}><h3>{title}</h3><p>Spesa della casa · nessun oggetto</p>{!!item.reviewWarnings?.length&&<p role="status">Alcuni dettagli non verificabili sono stati esclusi. Controlla i dati proposti.</p>}{done?<><p>{item.decision?.state==='skipped'?'Spesa esclusa.':'Spesa confermata.'}</p><Link to={root+'/spese'}>Vai alle spese</Link></>:<fieldset disabled={disabled||working} className={styles.stack} style={{border:0,padding:0,margin:0,minWidth:0}}>
  <p><strong>{amount?Number(amount.replace(',','.')).toLocaleString('it-IT',{style:'currency',currency:'EUR'}):'Importo da verificare'}</strong> · {categories[category as keyof typeof categories]??'Categoria da verificare'}{supplier?' · '+supplier:''}</p>
  {date&&<p>Data del documento: {date.split('-').reverse().join('/')}{fields.dueOn?' · Scadenza: '+fields.dueOn.value.split('-').reverse().join('/'):''}</p>}
  {!editing&&valid&&!duplicates.length&&<button type="button" className={ui.btn} onClick={()=>setEditing(true)}>Modifica dati</button>}
  {(editing||!valid||duplicates.length>0)&&<>
  <label className={styles.field}>Titolo della spesa<input className={ui.input} value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label>
  <label className={styles.field}>{isBill?'Fornitura':'Categoria della spesa'}<select className={ui.input} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Scegli la categoria</option>{Object.entries(categories).filter(([key])=>!isBill||['electricity','gas','water','internet_services'].includes(key)).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  <label className={styles.field}>Fornitore<input className={ui.input} value={supplier} onChange={e=>setSupplier(e.target.value)} maxLength={120}/></label>
  {candidates.isPending?<p role="status">Controllo delle spese già presenti…</p>:candidates.isError?<p role="alert">Controllo doppioni non disponibile. <button onClick={()=>void candidates.refetch()}>Riprova</button></p>:null}
  {duplicates.length>0&&<p>Ci sono spese simili: controllale prima di confermare.</p>}
  <label className={styles.field}>{isBill?'Come registrare la bolletta':'Come registrare la spesa'}<select className={ui.input} value={mode} onChange={e=>setMode(e.target.value)}><option value="create">Registra una nuova spesa</option><option value="link_existing">Collega una spesa già presente</option>{onReview&&<><option value="skip">Non registrare la spesa</option><option value="defer">Decidi più avanti</option></>}</select></label>
  {['skip','defer'].includes(mode)?<p>{mode==='skip'?'Nessuna spesa verrà registrata.':'Spesa lasciata da riprendere.'}</p>:mode==='link_existing'?<label className={styles.field}>Spesa da collegare<select className={ui.input} value={expenseId} onChange={e=>setExpense(e.target.value)}><option value="">Scegli una spesa</option>{candidates.data?.items.map(x=><option key={x.id} value={x.id}>{x.title} · {(x.amountCents/100).toFixed(2)} € · {x.spentOn}</option>)}</select></label>:<>
   <label className={styles.field}>{isBill?'Totale della bolletta':'Totale della fattura'}<select className={ui.input} value={manual?'manual':candidateId} onChange={e=>{const found=eligible.find(a=>a.id===e.target.value);setManual(e.target.value==='manual');setCandidate(found?.id??'');setAmount(found?String(found.amountCents/100):'');}}><option value="">Controlla il totale</option>{eligible.map(a=><option key={a.id} value={a.id}>{a.label} · {(a.amountCents/100).toFixed(2)} €</option>)}<option value="manual">Inserisci o correggi l’importo</option></select></label>
   <div className={styles.values}><label className={styles.field}>{isBill?'Importo della bolletta (€)':'Importo della spesa (€)'}<input className={ui.input} inputMode="decimal" readOnly={!manual} value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className={styles.field}>Data della spesa<input type="date" max={today} className={ui.input} value={date} onChange={e=>setDate(e.target.value)}/></label></div>
   {duplicates.length>0&&<label className={styles.check}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>Ho verificato che è una spesa distinta da quelle già registrate.</label>}
  </>}
  </>}
  {error&&<p role="alert">{error}</p>}
  {!onReview&&<div className={styles.row}><button className={ui.btn} disabled={disabled||working} onClick={()=>void apply('defer')}>Decidi più avanti</button><button className={ui.btn} disabled={disabled||working} onClick={()=>void apply('skip')}>Non registrare la spesa</button><button className={`${ui.btn} ${ui.primary}`} disabled={disabled||working||!valid||!candidates.isSuccess} onClick={()=>void apply(mode)}>{unified?'Salva e organizza':beforeDocument?'Conferma documento e spesa':'Conferma spesa'}</button></div>}
 </fieldset>}</section>;
}
