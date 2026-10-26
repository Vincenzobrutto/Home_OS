import {LocalBillReread} from './LocalBillReread';
import { HouseExpenseIssues } from './HouseExpenseIssues';
import { houseExpenseReview, type HouseReview } from './houseExpenseReview';
import {useState,useEffect,useRef} from 'react';
import {useQuery,useInfiniteQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import type {ApiClient} from '../api/client';
import {userMessage} from '../api/errors';
import {ui} from '../components/ui';
import {BillPeriodFields} from '../components/BillPeriodFields';
import {ExpenseInstallmentFields} from '../components/ExpenseInstallmentFields';
import type {ObjectRef} from '../api/types';
import type {Draft,HouseExpense,ExpenseCandidate,HouseForm} from './model';
import {houseExpenseTitle} from './model';
import styles from './onboarding.module.css';
import {localBillForm,type LocalBill} from './localBill';
const categories={electricity:'Energia elettrica',gas:'Gas',water:'Acqua',internet_services:'Internet e servizi',maintenance:'Manutenzione',repairs_works:'Riparazioni e lavori',purchase_replacement:'Acquisti'};
export type { HouseReview } from './houseExpenseReview';
export function HouseExpenseProposal({item,draft,api,accountId,base,root,disabled,confirm,unified=false,onReview,onUseExisting,savedForm,localProposal}:{localProposal?:LocalBill;item:HouseExpense;draft:Draft;api:ApiClient;accountId:string;base:string;root:string;disabled:boolean;beforeDocument:boolean;confirm:(choice:unknown)=>Promise<void>;unified?:boolean;onReview?:(review:HouseReview)=>void;onUseExisting?:()=>void;savedForm?:HouseForm}){
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'}),isBill=item.documentKind!=='simple_invoice';
 const fields=item.proposedFields,eligible=item.amountCandidates.filter(a=>['current_document_total','amount_due'].includes(a.role)),initial=!item.amountSelectionRequired?(eligible.find(a=>a.role==='current_document_total')??(unified&&!isBill&&eligible.length===1?eligible[0]:undefined)):undefined;
 const saved=savedForm??draft.review?.compilation?.houseForms[item.id]??(isBill&&localProposal?localBillForm(localProposal):undefined),compactInvoice=unified&&!isBill;
 const manualBill=draft.mode==='manual'&&!eligible.length;
 const [candidateId,setCandidate]=useState(saved?.candidateId??(initial?.id??'')),[amount,setAmount]=useState(saved?.amount??(initial?String(initial.amountCents/100):'')),[manual,setManual]=useState(saved?.manual??(manualBill)),[title,setTitle]=useState(saved?.title??houseExpenseTitle(item,draft)??(isBill?'Bolletta ':'Spesa della casa ')+(categories[fields.category?.value as keyof typeof categories]??'')),[supplier,setSupplier]=useState(saved?.supplier??(fields.supplier?.value??'')),[date,setDate]=useState(saved?.date??(fields.documentDate?.value&&fields.documentDate.value<=today?fields.documentDate.value:'')),[categoryInput,setCategory]=useState(saved?.category??(fields.category?.value??'')),[mode,setMode]=useState(saved?.mode??('create')),[expenseId,setExpense]=useState(saved?.expenseId??('')),[ack,setAck]=useState(saved?.ack??(false)),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [invoiceMonth,setInvoiceMonth]=useState(saved?.invoiceMonth??'');
 const [periodFrom,setPeriodFrom]=useState(saved?.periodFrom??(fields.competenceFrom?.value??'')),[periodTo,setPeriodTo]=useState(saved?.periodTo??(fields.competenceTo?.value??'')),[dueOn,setDueOn]=useState(saved?.dueOn??(fields.dueOn?.value??''));
 const [purchaseMode,setPurchaseMode]=useState(saved?.purchaseMode??''),[purchaseTotal,setPurchaseTotal]=useState(saved?.purchaseTotal??'');
 const [periodDraft,setPeriodDraft]=useState(saved?.periodDraft);
 const [rereadPeriodVersion,setRereadPeriodVersion]=useState(0);
 const [documentNumber,setDocumentNumber]=useState(saved?.documentNumber??fields.documentNumber?.value??''),[documentDate,setDocumentDate]=useState(saved?.documentDate??fields.documentDate?.value??''),[note,setNote]=useState(saved?.note??'');
 const [categoryEdited,setCategoryEdited]=useState(!!saved||!!fields.category?.value);
 const [editing,setEditing]=useState(unified);
 const done=['confirmed','skipped'].includes(item.decision?.state??'');
 const suggestions=useQuery({queryKey:['account',accountId,'home',root,'invoice-object-suggestions',draft.id,item.id,draft.version],queryFn:({signal})=>api.callJson<{items:Array<{ref:ObjectRef;name:string;reason:string;category?:string}>}>(base+'/drafts/'+draft.id+'/object-suggestions?itemId='+encodeURIComponent(item.id),{accountId,signal}),enabled:!isBill&&!done,retry:false,gcTime:0});
 const [objectSuggestionReviewed,setObjectSuggestionReviewed]=useState(saved?.objectSuggestionReviewed??false);
 const suggestionsResolved=isBill||suggestions.isSuccess&&(!suggestions.data.items.length||objectSuggestionReviewed);
 const homeId=root.split('/').at(-1)!;
 const confirmedObjects=[...new Set((draft.items??[]).flatMap(i=>i.decision?.state==='confirmed'?i.decision.objects.filter(o=>o.state==='active'&&o.id).map(o=>'object:'+o.id):[]))];
 const [objectChoice,setObjectChoice]=useState(saved?.objectChoice??(!isBill&&confirmedObjects.length===1?confirmedObjects[0]! :''));
 useEffect(()=>{
  if(!compactInvoice||objectSuggestionReviewed||objectChoice||!suggestions.isSuccess||suggestions.data.items.length!==1)return;
  const proposed=suggestions.data.items[0]!;
  // Initialize the editable selection once when the asynchronous proposal arrives.
  // The reviewed flag prevents refetches from replacing any subsequent user choice.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setObjectChoice(proposed.ref.kind+':'+proposed.ref.id);setObjectSuggestionReviewed(true);onUseExisting?.();
 },[compactInvoice,objectSuggestionReviewed,objectChoice,suggestions.isSuccess,suggestions.data,onUseExisting]);
 const categorySuggestion=suggestions.data?.items.length===1&&suggestions.data.items[0]!.ref.kind+':'+suggestions.data.items[0]!.ref.id===objectChoice?suggestions.data.items[0]!.category:undefined;
 const proposedCategory=!categoryInput&&!categoryEdited?categorySuggestion:undefined;
 const category=categoryInput??'';
 const effectiveCategory=category||proposedCategory||'';
 const objectRef=objectChoice?{kind:objectChoice.split(':')[0],id:objectChoice.split(':')[1]} as ObjectRef:null;
 const catalog=useInfiniteQuery({queryKey:['account',accountId,'home',homeId,'invoice-expense-objects'],initialPageParam:null as string|null,queryFn:({signal,pageParam})=>api.listObjects(homeId,{state:'active',q:'',type:null,roomId:null,placement:'all',sort:'name'},{limit:20,cursor:pageParam},signal,accountId),getNextPageParam:p=>p.nextCursor??undefined,enabled:!isBill&&!done,retry:false,gcTime:0});
 const selectedObject=useQuery({queryKey:['account',accountId,'home',homeId,'invoice-expense-object',objectChoice],queryFn:({signal})=>api.getObject(homeId,objectRef!,signal,accountId),enabled:!isBill&&!done&&!!objectRef,retry:false,gcTime:0});
 const readableObject=selectedObject.isSuccess&&selectedObject.data.state==='active'?selectedObject.data:null;
 const objectValid=isBill||!objectChoice||!!readableObject;
 const objects=catalog.isSuccess?catalog.data.pages.flatMap(p=>p.items).filter(o=>o.state==='active'):[];
 const objectOptions=readableObject&&!objects.some(o=>o.ref.kind===readableObject.ref.kind&&o.ref.id===readableObject.ref.id)?[readableObject,...objects]:objects;
 const candidates=useQuery({queryKey:['account',accountId,'home',root,'bill-expenses',draft.id,item.id,draft.version],queryFn:({signal})=>api.callJson<{items:ExpenseCandidate[];nextCursor:string|null}>(base+'/drafts/'+draft.id+'/expense-candidates?itemId='+encodeURIComponent(item.id),{accountId,signal}),enabled:!done,retry:false,gcTime:0});
 const form={...(invoiceMonth?{invoiceMonth}:{}),candidateId,amount,manual,title,supplier,date,category:effectiveCategory,mode,expenseId,ack,periodFrom,periodTo,dueOn,periodDraft,documentNumber,documentDate,note,purchaseMode,purchaseTotal,objectChoice,objectLabel:readableObject?.name??'',objectSuggestionReviewed};
 const {duplicates,valid,review,missing,selection}=houseExpenseReview({
  item,form,today,objectRef,objectValid,suggestionsResolved,suggestionsError:suggestions.isError,
  candidates:{items:candidates.data==null?[]:candidates.data.items,isSuccess:candidates.isSuccess,isError:candidates.isError},
 });
 const region=useRef<HTMLElement>(null);
 const serialized=JSON.stringify(review),notified=useRef('');
 useEffect(()=>{if(onReview&&serialized!==notified.current){notified.current=serialized;onReview(JSON.parse(serialized) as HouseReview);}},[serialized,onReview]);
 async function apply(action:string){setError('');setWorking(true);try{await confirm(selection(action));}catch(e){setError(userMessage(e));}finally{setWorking(false);}}

 return <section ref={region} className={compactInvoice?styles.invoiceExpense:ui.card} aria-label={'Spesa della casa: '+title}>{item.invoiceSegment&&<p>Fattura · pagina {item.invoiceSegment.page} dell’originale</p>}{!compactInvoice&&<h3>{title}</h3>}{!done&&!compactInvoice&&<p>{mode==='link_existing'?'Mantieni la spesa esistente e i suoi collegamenti':objectChoice&&!isBill?'Costo riferito a: '+(readableObject?.name??'oggetto o impianto da verificare'):'Spesa della casa · senza oggetto o impianto collegato'}</p>}{!!item.reviewWarnings?.length&&<p role="status">Alcuni dettagli non verificabili sono stati esclusi. Controlla i dati proposti.</p>}{done?<><p>{item.decision?.state==='skipped'?'Spesa esclusa.':'Spesa registrata.'}</p><Link to={root+'/spese'}>Apri le spese</Link></>:<fieldset disabled={disabled||working} className={styles.stack} style={{border:0,padding:0,margin:0,minWidth:0}}>
  {isBill&&draft.mode==='manual'&&draft.state==='open'&&!draft.review?.pending&&draft.snapshot&&<LocalBillReread key={[accountId,homeId,draft.id,draft.version,item.id,draft.snapshot.documentId,draft.snapshot.documentVersion,draft.snapshot.sha256].join(':')} api={api} accountId={accountId} homeId={homeId} snapshot={draft.snapshot} form={form} disabled={disabled||working} apply={patch=>{
   if(patch.supplier!==undefined)setSupplier(patch.supplier);
   if(patch.amount!==undefined){setAmount(patch.amount);setManual(true);setCandidate('');setAck(false);}
   if(patch.category!==undefined){setCategory(patch.category);setCategoryEdited(true);}
   if(patch.date!==undefined)setDate(patch.date);
   if(patch.invoiceMonth!==undefined)setInvoiceMonth(patch.invoiceMonth);
   if(patch.dueOn!==undefined)setDueOn(patch.dueOn);
   if(patch.periodFrom!==undefined&&patch.periodTo!==undefined){setPeriodFrom(patch.periodFrom);setPeriodTo(patch.periodTo);setPeriodDraft(undefined);setRereadPeriodVersion(v=>v+1);}
   setEditing(true);
  }}/>}
  {compactInvoice&&<section className={styles.invoiceReference} aria-label="Oggetto della spesa"><label className={styles.field}>Oggetto o impianto (facoltativo)<select className={ui.input} value={objectChoice} onChange={e=>{setObjectChoice(e.target.value);setObjectSuggestionReviewed(true);if(e.target.value)onUseExisting?.();}}><option value="">Spesa della casa · senza oggetto</option>{[...new Map([...objectOptions.map(o=>[o.ref.kind+':'+o.ref.id,o.name] as const),...(suggestions.data?.items??[]).map(o=>[o.ref.kind+':'+o.ref.id,o.name] as const)]).entries()].map(([value,name])=><option key={value} value={value}>{name}</option>)}{objectChoice&&!objectOptions.some(o=>o.ref.kind+':'+o.ref.id===objectChoice)&&!suggestions.data?.items.some(o=>o.ref.kind+':'+o.ref.id===objectChoice)&&<option value={objectChoice}>Collegamento da verificare</option>}</select></label>{objectChoice?<p className={ui.hint}>La spesa e questa fattura saranno consultabili dalla stessa scheda. Nessun nuovo oggetto.</p>:<p className={ui.hint}>Puoi registrare la spesa anche senza un oggetto.</p>}{suggestions.isSuccess&&suggestions.data.items.length>1&&!objectSuggestionReviewed&&<button type="button" className={ui.btn} onClick={()=>setObjectSuggestionReviewed(true)}>Conferma spesa senza oggetto</button>}{suggestions.isFetching&&<p role="status">Verifica oggetti esistenti…</p>}{suggestions.isError&&<button type="button" className={ui.btn} onClick={()=>void suggestions.refetch()}>Riprova collegamenti proposti</button>}{catalog.hasNextPage&&<button type="button" className={ui.btn} disabled={catalog.isFetchingNextPage} onClick={()=>void catalog.fetchNextPage()}>Carica altri oggetti e impianti</button>}{catalog.isError&&<button type="button" className={ui.btn} onClick={()=>void catalog.refetch()}>Riprova elenco oggetti</button>}<ExpenseInstallmentFields reconcilePurchase title={title} onChange={setTitle}/></section>}
  {!editing&&<><p><strong>{amount?Number(amount.replace(',','.')).toLocaleString('it-IT',{style:'currency',currency:'EUR'}):'Importo da verificare'}</strong> · {categories[effectiveCategory as keyof typeof categories]??'Categoria da verificare'}{supplier?' · '+supplier:''}</p>
  {date&&<p>{isBill?'Emissione':'Data della spesa'}: {date.split('-').reverse().join('/')}{dueOn?' · Scadenza: '+dueOn.split('-').reverse().join('/'):''}</p>}
  {isBill&&invoiceMonth&&<p>Mese di riferimento della fattura: {invoiceMonth}</p>}{isBill&&<p>Periodo dei servizi: {periodFrom&&periodTo?periodFrom.split('-').reverse().join('/')+' – '+periodTo.split('-').reverse().join('/'):invoiceMonth?'Non indicato':'Da indicare prima del salvataggio'}</p>}</>}
  {!editing&&valid&&!duplicates.length&&<button type="button" className={ui.btn} onClick={()=>setEditing(true)}>Modifica dati</button>}
  {(editing||!valid||duplicates.length>0)&&<>
  {candidates.isPending?<p role="status">Controllo delle spese già presenti…</p>:candidates.isError?<p role="alert">Controllo doppioni non disponibile. <button onClick={()=>void candidates.refetch()}>Riprova</button></p>:null}
  {duplicates.length>0&&<p>Ci sono spese simili: controllale prima di confermare.</p>}
  {['skip','defer'].includes(mode)?<p>{mode==='skip'?'Nessuna spesa verrà registrata.':'Spesa lasciata da riprendere.'}</p>:mode==='link_existing'?<label className={styles.field}>Spesa da collegare<select className={ui.input} value={expenseId} onChange={e=>{setExpense(e.target.value);setPurchaseMode('');setPurchaseTotal('');}}><option value="">Scegli una spesa</option>{candidates.data?.items.map(x=><option key={x.id} value={x.id}>{x.title} · {(x.amountCents/100).toFixed(2)} € · {x.spentOn}</option>)}</select></label>:<>
   {!manualBill&&(!compactInvoice||eligible.length!==1||item.amountSelectionRequired)&&<label className={styles.field}>{isBill?'Totale della bolletta':'Totale della fattura'}<select className={ui.input} value={manual?'manual':candidateId} onChange={e=>{const found=eligible.find(a=>a.id===e.target.value);setManual(e.target.value==='manual');setCandidate(found?.id??'');setAmount(found?String(found.amountCents/100):'');}}><option value="">Controlla il totale</option>{eligible.map(a=><option key={a.id} value={a.id}>{a.label} · {(a.amountCents/100).toFixed(2)} €</option>)}<option value="manual">Inserisci o correggi l’importo</option></select></label>}
  <label className={styles.field}>Fornitore<input className={ui.input} value={supplier} onChange={e=>setSupplier(e.target.value)} maxLength={120}/></label>
   <label className={styles.field}>{isBill?'Importo della bolletta (€)':'Importo della spesa (€)'}<input className={ui.input} inputMode="decimal" readOnly={!manual&&!compactInvoice} value={amount} onChange={e=>{setAmount(e.target.value);if(compactInvoice)setManual(true);}}/></label>
  <label className={styles.field}>{isBill?'Categoria della bolletta':'Categoria della spesa'}<select className={ui.input} value={effectiveCategory} onChange={e=>{setCategoryEdited(true);setCategory(e.target.value);}}><option value="">Scegli la categoria</option>{Object.entries(categories).filter(([key])=>!isBill||['electricity','gas','water','internet_services'].includes(key)).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  {!isBill&&<p className={ui.hint}>Per un oggetto nuovo, anche se sostituisce il precedente, scegli Acquisti. Per sostituire un componente durante un intervento scegli Riparazioni e lavori.</p>}
   {proposedCategory&&<p className={ui.hint}>Categoria proposta dalla spesa già collegata allo stesso intervento. Puoi cambiarla.</p>}
   {!isBill&&<label className={styles.field}>Data della spesa<input type="date" max={today} className={ui.input} value={date} onChange={e=>setDate(e.target.value)}/></label>}
   {!isBill&&!compactInvoice&&<div><ExpenseInstallmentFields reconcilePurchase title={title} onChange={setTitle}/><label className={styles.field}>Oggetto o impianto (facoltativo)<select className={ui.input} value={objectChoice} onChange={e=>setObjectChoice(e.target.value)}><option value="">Senza collegamento</option>{objectOptions.map(o=><option key={o.ref.kind+':'+o.ref.id} value={o.ref.kind+':'+o.ref.id}>{o.name}</option>)}{objectChoice&&!objectOptions.some(o=>o.ref.kind+':'+o.ref.id===objectChoice)&&<option value={objectChoice}>Collegamento da verificare</option>}</select></label>
   {!isBill&&suggestions.isFetching&&<p role="status">Cerco oggetti già presenti per questa fattura…</p>}
   {!isBill&&suggestions.isError&&<p role="alert">Non riesco a verificare i collegamenti proposti. <button type="button" onClick={()=>void suggestions.refetch()}>Riprova collegamenti proposti</button></p>}
   {!isBill&&suggestions.isSuccess&&suggestions.data.items.length>0&&<section aria-label="Collegamenti proposti" className={ui.card}><h4>Potrebbe riguardare un oggetto già presente</h4><p>Controlla la proposta. Collegando la fattura qui non creerai nuove schede; la spesa sarà registrata solo al salvataggio finale.</p>{suggestions.data.items.map(s=><div key={s.ref.kind+':'+s.ref.id}><p><strong>{s.name}</strong> · {s.reason==='document_name'?'Nome citato nel documento':s.reason==='product_identity'?'Marca e modello citati nel documento':'Stesso fornitore e descrizione simile a una spesa già collegata'}</p><button type="button" className={ui.btn} onClick={()=>{setObjectChoice(s.ref.kind+':'+s.ref.id);setObjectSuggestionReviewed(true);onUseExisting?.();}}>Collega a {s.name}, senza nuove schede</button></div>)}<button type="button" className={ui.btn} onClick={()=>{setObjectChoice('');setObjectSuggestionReviewed(true);}}>È un altro oggetto o intervento: scelgo io</button>{objectSuggestionReviewed&&<p role="status">Scelta controllata. Verifica il riepilogo prima di salvare.</p>}</section>}
   <p>Per acconto e saldo scegli lo stesso oggetto o impianto esistente. La spesa viene registrata una sola volta, senza attribuirla anche agli altri oggetti del documento.</p>
   {catalog.hasNextPage&&<button type="button" className={ui.btn} disabled={catalog.isFetchingNextPage} onClick={()=>void catalog.fetchNextPage()}>Carica altri oggetti e impianti</button>}
   {catalog.isError&&<p role="alert">Elenco oggetti non disponibile. <button type="button" onClick={()=>void catalog.refetch()}>Riprova elenco oggetti</button></p>}
   {!!objectChoice&&!objectValid&&<p role="status">{selectedObject.isFetching?'Verifica del collegamento…':'Oggetto non disponibile. Scegline un altro o rimuovi il collegamento.'}{selectedObject.isError&&<button type="button" onClick={()=>void selectedObject.refetch()}>Riprova collegamento</button>}</p>}</div>}
   {isBill&&<><label className={styles.field}>Mese di riferimento della fattura<input type="month" className={ui.input} value={invoiceMonth} onChange={e=>setInvoiceMonth(e.target.value)}/></label><p>Il mese scritto sulla fattura è distinto dal periodo dei servizi e dalla data di emissione.</p><BillPeriodFields key={rereadPeriodVersion} servicePeriod draftValue={periodDraft} onDraftChange={setPeriodDraft} from={periodFrom} to={periodTo} onChange={({from,to})=>{setPeriodFrom(from);setPeriodTo(to);}}/><fieldset className={styles.stack}><legend>Emissione e scadenza</legend><label className={styles.field}>Data di emissione<input type="date" max={today} className={ui.input} value={date} onChange={e=>setDate(e.target.value)}/></label><label className={styles.field}>Scadenza indicata<input type="date" className={ui.input} value={dueOn} onChange={e=>setDueOn(e.target.value)}/></label><p>La scadenza non indica che la bolletta sia stata pagata e non crea un promemoria.</p></fieldset></>}
   {duplicates.length>0&&<label className={styles.check}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>Ho verificato che è una spesa distinta da quelle già registrate.</label>}
  </>}
  {!isBill&&['create','link_existing'].includes(mode)&&!item.invoiceSegment&&<fieldset className={styles.stack}><legend>Conferma del costo</legend><label className={styles.check}><input type="checkbox" checked={!!purchaseMode} onChange={e=>{setPurchaseMode(e.target.checked?(mode==='link_existing'?'same_purchase':'confirmed_total'):'');setPurchaseTotal('');}}/>{mode==='link_existing'?'Acconto e saldo dello stesso acquisto: mantieni una sola spesa':'Ho verificato il costo complessivo, distinto dall’importo della rata'}</label>{purchaseMode&&<label className={styles.field}>Costo complessivo confermato (€)<input className={ui.input} inputMode="decimal" value={purchaseTotal} onChange={e=>setPurchaseTotal(e.target.value)}/></label>}<p>Se l’importo è ambiguo, scegli Decidi più avanti. Nessuna somma o differenza viene calcolata automaticamente. Per lo stesso acquisto collega prima le fatture alle stesse schede.</p></fieldset>}
  <details className={styles.stack} open={duplicates.length>0||mode!=='create'||!title.trim()}><summary>Altri dati e collegamenti</summary>
  <label className={styles.field}>Titolo della spesa<input className={ui.input} value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label>
  {!isBill&&<><label className={styles.field}>Numero fattura<input className={ui.input} value={documentNumber} onChange={e=>setDocumentNumber(e.target.value)} maxLength={80}/></label><label className={styles.field}>Data di emissione<input className={ui.input} type="date" max={today} value={documentDate} onChange={e=>setDocumentDate(e.target.value)}/></label><label className={styles.field}>Nota<input className={ui.input} value={note} onChange={e=>setNote(e.target.value)} maxLength={500}/></label></>}
  <label className={styles.field}>{isBill?'Come registrare la bolletta':'Come registrare la spesa'}<select className={ui.input} value={mode} onChange={e=>{setMode(e.target.value);setPurchaseMode('');setPurchaseTotal('');}}><option value="create">Registra una nuova spesa</option><option value="link_existing">Collega una spesa già presente</option>{onReview&&<><option value="skip">Non registrare la spesa</option><option value="defer">Decidi più avanti</option></>}</select></label>
  <p>Il collegamento del documento a un oggetto non attribuisce da solo il costo. Per una fattura puoi scegliere qui l’oggetto o impianto di riferimento.</p></details>
  </>}
  <HouseExpenseIssues issues={missing} region={region} onEdit={()=>setEditing(true)}/>
  {error&&<p role="alert">{error}</p>}
  {!onReview&&<div className={styles.row}><button className={ui.btn} disabled={disabled||working} onClick={()=>void apply('defer')}>Decidi più avanti</button><button className={ui.btn} disabled={disabled||working} onClick={()=>void apply('skip')}>Non registrare la spesa</button><button className={`${ui.btn} ${ui.primary}`} disabled={disabled||working||!valid||!candidates.isSuccess} onClick={()=>void apply(mode)}>{mode==='link_existing'?'Collega spesa':'Registra spesa'}</button></div>}
 </fieldset>}</section>;
}
