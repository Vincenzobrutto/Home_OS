import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {ApiClient} from '../api/client';
import {queryKeys} from '../api/queryKeys';
import {ui} from '../components/ui';
import type {Draft,HouseForm} from './model';
import type {LocalBill} from './localBill';
import {localBillPdf} from './localBillPdf';
import {billDifferences,billRereadPatch,type RereadField} from './billReread';

const categories:Record<string,string>={electricity:'Energia elettrica',gas:'Gas',water:'Acqua',internet_services:'Internet e servizi'};
type Props={api:ApiClient;accountId:string;homeId:string;snapshot:NonNullable<Draft['snapshot']>;form:HouseForm;disabled:boolean;apply:(patch:Partial<HouseForm>)=>void};
/** Mount with a key scoped to account/home/document/SHA/draft version/item. No writes. */
export function LocalBillReread(props:Props){
 const cache=useQueryClient(),live=useRef(props);
 useLayoutEffect(()=>{live.current=props;});
 const mounted=useRef(true),request=useRef<AbortController|null>(null);
 const [reading,setReading]=useState(false),[message,setMessage]=useState('');
 const [preview,setPreview]=useState<{bill:LocalBill;baseline:string}|null>(null),[selected,setSelected]=useState<RereadField[]>([]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
 const baseline=()=>JSON.stringify(live.current.form);
 const active=(controller:AbortController)=>mounted.current&&!controller.signal.aborted&&!live.current.disabled&&cache.getQueryData<{account:{id:string}|null}>(queryKeys.session)?.account?.id===props.accountId;
 async function source(controller:AbortController){
  if(!active(controller))throw Error('unavailable');
  const value=await props.api.getDocument(props.homeId,props.snapshot.documentId,controller.signal,props.accountId);
  if(!active(controller)||value.id!==props.snapshot.documentId||value.version!==props.snapshot.documentVersion||value.sha256!==props.snapshot.sha256||value.mimeType!=='application/pdf')throw Error('source_changed');
 }
 async function read(){
  request.current?.abort();const controller=new AbortController();request.current=controller;
  const original=baseline();setReading(true);setPreview(null);setSelected([]);setMessage('Lettura locale della prima pagina, senza AI…');
  try{
   await source(controller);
   const file=await props.api.downloadDocumentFile(props.homeId,props.snapshot.documentId,controller.signal,props.accountId);
   const bill=await localBillPdf(file.blob,props.snapshot.sha256,controller.signal);
   await source(controller);
   if(original!==baseline())throw Error('form_changed');
   if(!bill){setMessage('Nessuna proposta utilizzabile dalla lettura locale. I tuoi dati restano invariati.');return;}
   setPreview({bill,baseline:original});setMessage('');
  }catch{if(mounted.current&&!controller.signal.aborted){setPreview(null);setMessage('Rilettura non applicabile: accesso, originale o compilazione potrebbero essere cambiati. I tuoi dati restano invariati.');}}
  finally{if(mounted.current&&!controller.signal.aborted)setReading(false);}
 }
 async function apply(){
  if(!preview||!selected.length)return;
  const controller=new AbortController();request.current=controller;setReading(true);
  try{
   await source(controller);
   if(preview.baseline!==baseline())throw Error('form_changed');
   props.apply(billRereadPatch(live.current.form,preview.bill,selected));
   setPreview(null);setSelected([]);setMessage('Proposte applicate soltanto ai campi della schermata. La bozza salvata e le spese non sono state modificate.');
  }catch{if(mounted.current&&!controller.signal.aborted){setPreview(null);setSelected([]);setMessage('Confronto scaduto o fonte non disponibile. Rileggi prima di applicare; nessun dato è stato sostituito.');}}
  finally{if(mounted.current&&!controller.signal.aborted)setReading(false);}
 }
 const display=(field:RereadField,value:string)=>!value?'Vuoto':field==='category'?(categories[value]??value):value;
 const differences=preview?billDifferences(props.form,preview.bill):[];
 const stale=!!preview&&preview.baseline!==JSON.stringify(props.form);
 return <section aria-label="Rilettura locale della bolletta" className={ui.card}>
  <button type="button" className={ui.btn} disabled={props.disabled||reading} onClick={()=>void read()}>Rileggi localmente</button>
  <p>Solo prima pagina del PDF, senza AI. Nessun nuovo documento o spesa. Nessun salvataggio della bozza.</p>
  {message&&<p role="status">{message}</p>}
  {preview&&<fieldset disabled={props.disabled||reading||stale} style={{minWidth:0}}><legend>Confronta le proposte con i dati attuali</legend>
   <p>I campi non riconosciuti restano invariati. Seleziona esplicitamente le differenze da applicare alla schermata.</p>
   {differences.map(d=><label key={d.field} style={{display:'block',marginBlock:12}}><input type="checkbox" checked={selected.includes(d.field)} onChange={e=>setSelected(prior=>e.target.checked?[...prior,d.field]:prior.filter(f=>f!==d.field))}/> {d.label}: attuale «{display(d.field,d.before)}» → proposta «{display(d.field,d.after)}»</label>)}
   {!differences.length&&<p>Nessuna differenza utilizzabile.</p>}
   <button type="button" className={ui.btn} disabled={!selected.length} onClick={()=>void apply()}>Applica i campi selezionati alla schermata</button>
  </fieldset>}
  {stale&&<p role="alert">Hai modificato i dati dopo la rilettura. Rileggi per confrontare i valori aggiornati.</p>}
  {(preview||reading)&&<button type="button" className={ui.btn} onClick={()=>{request.current?.abort();setReading(false);setPreview(null);setSelected([]);setMessage('Rilettura annullata. Dati invariati.');}}>Annulla rilettura</button>}
 </section>;
}
