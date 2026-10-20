import {useState,useEffect,useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import type {ApiClient} from '../api/client';
import {userMessage} from '../api/errors';
import {ui} from '../components/ui';
import {BillPeriodFields} from '../components/BillPeriodFields';
import type {Draft,HouseExpense,ExpenseCandidate} from './model';
import {houseExpenseTitle} from './model';
import styles from './onboarding.module.css';
const categories={electricity:'Energia elettrica',gas:'Gas',water:'Acqua',internet_services:'Internet e servizi',maintenance:'Manutenzione',repairs_works:'Lavori e riparazioni',purchase_replacement:'Acquisti e sostituzioni'};
export type HouseReview={choice:unknown|null;newExpenses:number;amountCents:number;manual:boolean;action:string};
export function HouseExpenseProposal({item,draft,api,accountId,base,root,disabled,confirm,unified=false,onReview}:{item:HouseExpense;draft:Draft;api:ApiClient;accountId:string;base:string;root:string;disabled:boolean;beforeDocument:boolean;confirm:(choice:unknown)=>Promise<void>;unified?:boolean;onReview?:(review:HouseReview)=>void}){
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'}),isBill=item.documentKind!=='simple_invoice';
 const fields=item.proposedFields,eligible=item.amountCandidates.filter(a=>['current_document_total','amount_due'].includes(a.role)),initial=!item.amountSelectionRequired?eligible.find(a=>a.role==='current_document_total'):undefined;
 const manualBill=draft.mode==='manual'&&!eligible.length;
 const [candidateId,setCandidate]=useState(initial?.id??''),[amount,setAmount]=useState(initial?String(initial.amountCents/100):''),[manual,setManual]=useState(manualBill),[title,setTitle]=useState(houseExpenseTitle(item,draft)??(isBill?'Bolletta ':'Spesa della casa ')+(categories[fields.category?.value as keyof typeof categories]??'')),[supplier,setSupplier]=useState(fields.supplier?.value??''),[date,setDate]=useState(fields.documentDate?.value&&fields.documentDate.value<=today?fields.documentDate.value:''),[category,setCategory]=useState(fields.category?.value??''),[mode,setMode]=useState('create'),[expenseId,setExpense]=useState(''),[ack,setAck]=useState(false),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [periodFrom,setPeriodFrom]=useState(fields.competenceFrom?.value??''),[periodTo,setPeriodTo]=useState(fields.competenceTo?.value??''),[dueOn,setDueOn]=useState(fields.dueOn?.value??'');
 const periodValid=!isBill||!!periodFrom&&!!periodTo&&periodFrom<=periodTo;
 const [editing,setEditing]=useState(unified);
 const done=['confirmed','skipped'].includes(item.decision?.state??'');
 const candidates=useQuery({queryKey:['account',accountId,'home',root,'bill-expenses',draft.id,item.id,draft.version],queryFn:({signal})=>api.callJson<{items:ExpenseCandidate[];nextCursor:string|null}>(base+'/drafts/'+draft.id+'/expense-candidates?itemId='+encodeURIComponent(item.id),{accountId,signal}),enabled:!done,retry:false,gcTime:0});
 const duplicates=candidates.data?.items.filter(x=>x.rank>0)??[],row=candidates.data?.items.find(x=>x.id===expenseId);
 const valid=mode==='skip'||mode==='defer'?true:mode==='link_existing'?!!row:periodValid&&!!title.trim()&&!!category&&!!date&&date<=today&&/^\d+(?:[.,]\d{1,2})?$/.test(amount)&&Number(amount.replace(',','.'))>0&&(manual||!!candidateId)&&(!duplicates.length||ack);
 function selection(action:string){const values={title,category,supplier:supplier||null,amountCents:Math.round(Number(amount.replace(',','.'))*100),spentOn:date,objectRef:null,...Object.fromEntries(['documentNumber','documentDate','competenceFrom','competenceTo','dueOn'].filter(k=>fields[k]).map(k=>[k,fields[k]!.value])),...(isBill?{documentDate:date,competenceFrom:periodFrom,competenceTo:periodTo,dueOn:dueOn||null}:{})};return {itemId:item.id,action,...(action==='create'?{values,amountSelection:manual?{mode:'manual'}:{mode:'candidate',candidateId},acknowledgePossibleDuplicate:ack}:action==='link_existing'?{expenseId,expectedExpenseVersion:row?.version}:{})};}
 const review={choice:valid&&(['skip','defer'].includes(mode)||candidates.isSuccess)?selection(mode):null,newExpenses:mode==='create'?1:0,amountCents:mode==='create'?Math.round(Number(amount.replace(',','.'))*100)||0:0,manual,action:mode};
 const region=useRef<HTMLElement>(null);
 const missing:Array<{message:string;field:string}>=[];
 if(!done&&!['skip','defer'].includes(mode)){
  const add=(message:string,field:string)=>missing.push({message,field});
  if(mode==='link_existing'&&!row)add('Scegli la spesa esistente da collegare.','Spesa da collegare');
  if(mode==='create'){
   if(!periodValid)add('Indica inizio e fine del periodo di riferimento della bolletta.','Periodo di riferimento');
   if(!title.trim())add('Indica il titolo della spesa.','Titolo della spesa');
   if(!category)add('Scegli la categoria della spesa.',isBill?'Categoria della bolletta':'Categoria della spesa');
   if(!date||date>today)add(isBill?'Indica una data di emissione valida, non futura.':'Indica una data della spesa valida, non futura.',isBill?'Data di emissione':'Data della spesa');
   if(!manual&&!candidateId)add('Scegli il totale da usare o inserisci un importo corretto.',isBill?'Totale della bolletta':'Totale della fattura');
   else if(!/^\d+(?:[.,]\d{1,2})?$/.test(amount)||Number(amount.replace(',','.'))<=0)add('Inserisci un importo positivo.',isBill?'Importo della bolletta':'Importo della spesa');
   if(duplicates.length&&!ack)add('Conferma che la spesa è distinta dai possibili doppioni.','Ho verificato');
  }
  if(!candidates.isSuccess)add(candidates.isError?'Riprova il controllo dei doppioni.':'Attendi il controllo dei doppioni.','Riprova');
 }
 const serialized=JSON.stringify(review),notified=useRef('');
 useEffect(()=>{if(onReview&&serialized!==notified.current){notified.current=serialized;onReview(JSON.parse(serialized) as HouseReview);}},[serialized,onReview]);
 async function apply(action:string){setError('');setWorking(true);try{await confirm(selection(action));}catch(e){setError(userMessage(e));}finally{setWorking(false);}}

 return <section ref={region} className={ui.card} aria-label={'Spesa della casa: '+title}><h3>{title}</h3><p>Spesa della casa · costo non attribuito a un oggetto</p>{!!item.reviewWarnings?.length&&<p role="status">Alcuni dettagli non verificabili sono stati esclusi. Controlla i dati proposti.</p>}{done?<><p>{item.decision?.state==='skipped'?'Spesa esclusa.':'Spesa registrata.'}</p><Link to={root+'/spese'}>Apri le spese</Link></>:<fieldset disabled={disabled||working} className={styles.stack} style={{border:0,padding:0,margin:0,minWidth:0}}>
  {!editing&&<><p><strong>{amount?Number(amount.replace(',','.')).toLocaleString('it-IT',{style:'currency',currency:'EUR'}):'Importo da verificare'}</strong> · {categories[category as keyof typeof categories]??'Categoria da verificare'}{supplier?' · '+supplier:''}</p>
  {date&&<p>{isBill?'Emissione':'Data della spesa'}: {date.split('-').reverse().join('/')}{dueOn?' · Scadenza: '+dueOn.split('-').reverse().join('/'):''}</p>}
  {isBill&&<p>Periodo di riferimento: {periodFrom&&periodTo?periodFrom.split('-').reverse().join('/')+' – '+periodTo.split('-').reverse().join('/'):'Da indicare prima del salvataggio'}</p>}</>}
  {!editing&&valid&&!duplicates.length&&<button type="button" className={ui.btn} onClick={()=>setEditing(true)}>Modifica dati</button>}
  {(editing||!valid||duplicates.length>0)&&<>
  {candidates.isPending?<p role="status">Controllo delle spese già presenti…</p>:candidates.isError?<p role="alert">Controllo doppioni non disponibile. <button onClick={()=>void candidates.refetch()}>Riprova</button></p>:null}
  {duplicates.length>0&&<p>Ci sono spese simili: controllale prima di confermare.</p>}
  {['skip','defer'].includes(mode)?<p>{mode==='skip'?'Nessuna spesa verrà registrata.':'Spesa lasciata da riprendere.'}</p>:mode==='link_existing'?<label className={styles.field}>Spesa da collegare<select className={ui.input} value={expenseId} onChange={e=>setExpense(e.target.value)}><option value="">Scegli una spesa</option>{candidates.data?.items.map(x=><option key={x.id} value={x.id}>{x.title} · {(x.amountCents/100).toFixed(2)} € · {x.spentOn}</option>)}</select></label>:<>
   {!manualBill&&<label className={styles.field}>{isBill?'Totale della bolletta':'Totale della fattura'}<select className={ui.input} value={manual?'manual':candidateId} onChange={e=>{const found=eligible.find(a=>a.id===e.target.value);setManual(e.target.value==='manual');setCandidate(found?.id??'');setAmount(found?String(found.amountCents/100):'');}}><option value="">Controlla il totale</option>{eligible.map(a=><option key={a.id} value={a.id}>{a.label} · {(a.amountCents/100).toFixed(2)} €</option>)}<option value="manual">Inserisci o correggi l’importo</option></select></label>}
  <label className={styles.field}>Fornitore<input className={ui.input} value={supplier} onChange={e=>setSupplier(e.target.value)} maxLength={120}/></label>
   <label className={styles.field}>{isBill?'Importo della bolletta (€)':'Importo della spesa (€)'}<input className={ui.input} inputMode="decimal" readOnly={!manual} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
  <label className={styles.field}>{isBill?'Categoria della bolletta':'Categoria della spesa'}<select className={ui.input} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Scegli la categoria</option>{Object.entries(categories).filter(([key])=>!isBill||['electricity','gas','water','internet_services'].includes(key)).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   {!isBill&&<label className={styles.field}>Data della spesa<input type="date" max={today} className={ui.input} value={date} onChange={e=>setDate(e.target.value)}/></label>}
   {isBill&&<><BillPeriodFields from={periodFrom} to={periodTo} onChange={({from,to})=>{setPeriodFrom(from);setPeriodTo(to);}}/><fieldset className={styles.stack}><legend>Emissione e scadenza</legend><label className={styles.field}>Data di emissione<input type="date" max={today} className={ui.input} value={date} onChange={e=>setDate(e.target.value)}/></label><label className={styles.field}>Scadenza indicata<input type="date" className={ui.input} value={dueOn} onChange={e=>setDueOn(e.target.value)}/></label><p>La scadenza non indica che la bolletta sia stata pagata e non crea un promemoria.</p></fieldset></>}
   {duplicates.length>0&&<label className={styles.check}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>Ho verificato che è una spesa distinta da quelle già registrate.</label>}
  </>}
  <details className={styles.stack} open={duplicates.length>0||mode!=='create'||!title.trim()}><summary>Altri dati e collegamenti</summary>
  <label className={styles.field}>Titolo della spesa<input className={ui.input} value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label>
  <label className={styles.field}>{isBill?'Come registrare la bolletta':'Come registrare la spesa'}<select className={ui.input} value={mode} onChange={e=>setMode(e.target.value)}><option value="create">Registra una nuova spesa</option><option value="link_existing">Collega una spesa già presente</option>{onReview&&<><option value="skip">Non registrare la spesa</option><option value="defer">Decidi più avanti</option></>}</select></label>
  <p>Gli eventuali oggetti collegati al documento non ricevono automaticamente questo costo.</p></details>
  </>}
  {!!missing.length&&<div aria-label="Dati della spesa da completare"><p>Per questa spesa:</p><ul>{missing.map(issue=><li key={issue.field}><button type="button" className={ui.btn} onClick={()=>{setEditing(true);const label=Array.from(region.current?.querySelectorAll('label')??[]).find(label=>label.textContent?.includes(issue.field));const control=issue.field==='Periodo di riferimento'?region.current?.querySelector<HTMLElement>('[data-bill-period] input[type=month], [data-bill-period] input[type=date]'):label?.querySelector<HTMLElement>('input,select,button');for(let parent=control?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')(parent as HTMLDetailsElement).open=true;control?.scrollIntoView?.({block:'center'});control?.focus();}}>{issue.message}</button></li>)}</ul></div>}
  {error&&<p role="alert">{error}</p>}
  {!onReview&&<div className={styles.row}><button className={ui.btn} disabled={disabled||working} onClick={()=>void apply('defer')}>Decidi più avanti</button><button className={ui.btn} disabled={disabled||working} onClick={()=>void apply('skip')}>Non registrare la spesa</button><button className={`${ui.btn} ${ui.primary}`} disabled={disabled||working||!valid||!candidates.isSuccess} onClick={()=>void apply(mode)}>{mode==='link_existing'?'Collega spesa':'Registra spesa'}</button></div>}
 </fieldset>}</section>;
}
