import type { Draft, Form, HouseForm, ContactInput } from './model';
import { formatCalendarDate } from '../lib/activities';
import { billPeriodLabel } from '../lib/billPeriod';
import styles from './onboarding.module.css';

const euro=(value:string)=>/^\d+(?:[.,]\d{1,2})?$/.test(value)?Number(value.replace(',','.')).toLocaleString('it-IT',{style:'currency',currency:'EUR'}):'Da completare';
const date=(value:string)=>value?formatCalendarDate(value):'Non indicata';
export function SaveSummary({draft,forms,houseForms={},documentOnly,title,contacts=[]}:{draft:Draft;forms:Record<string,Form>;houseForms?:Record<string,HouseForm>;documentOnly:boolean;title?:string;contacts?:ContactInput[]}){
 const items=draft.items.filter(i=>!i.decision||i.decision.state==='deferred');
 const houses=(draft.houseExpenses??[]).filter(i=>!i.decision||i.decision.state==='deferred');
 const objectForms=items.flatMap(item=>{const form=forms[item.id];return form&&!['skip','document_only'].includes(form.action)?[{item,form}]:[];});
 const selectedContacts=contacts.filter(c=>c.action==='save');
 return <div className={styles.saveSummary}>
  <h3>Al salvataggio</h3>
  <p><strong>Documento</strong> · {title||draft.documentInfo?.title.value||draft.document?.name||'Titolo da completare'}</p>
  {documentOnly?<p>Conservi solo il documento. Nessuna nuova spesa, oggetto o contatto; i collegamenti già presenti restano.</p>:<>
   {houses.map(item=>{const f=houseForms[item.id];if(!f)return <p key={item.id}>Spesa · controlla i dati nel modulo.</p>;
    return <section key={item.id} className={styles.summaryExpense} aria-label="Spesa da salvare">
     <h4>{f.mode==='link_existing'?'Collega una spesa esistente':f.mode==='create'?'Nuova spesa':f.mode==='defer'?'Spesa da decidere più avanti':'Spesa esclusa'}</h4>
     {f.mode==='create'&&<><p><strong>{euro(f.amount)}</strong> · {f.supplier||'Fornitore non indicato'}</p><dl>
      <div><dt>Titolo</dt><dd>{f.title||'Da completare'}</dd></div><div><dt>Categoria</dt><dd>{({electricity:'Energia elettrica',gas:'Gas',water:'Acqua',internet_services:'Internet e servizi',maintenance:'Manutenzione',repairs_works:'Lavori e riparazioni',purchase_replacement:'Acquisti e sostituzioni'} as Record<string,string>)[f.category]||'Da completare'}</dd></div>
      {item.documentKind!=='simple_invoice'?<><div><dt>Periodo di riferimento</dt><dd>{f.periodFrom&&f.periodTo&&f.periodFrom<=f.periodTo?billPeriodLabel({category:'electricity',spentOn:f.date,competenceFrom:f.periodFrom,competenceTo:f.periodTo}):'Da completare'}</dd></div><div><dt>Emissione</dt><dd>{date(f.date)}</dd></div><div><dt>Scadenza</dt><dd>{date(f.dueOn)}</dd></div></>:<div><dt>Data della spesa</dt><dd>{date(f.date)}</dd></div>}
     </dl>{item.documentKind==='simple_invoice'&&<p>{f.objectChoice?'Spesa e documento collegati a '+(f.objectLabel||'oggetto o impianto scelto nel modulo')+'. Nessun nuovo oggetto.':'Senza oggetto o impianto collegato.'}</p>}</>}
     {f.mode==='link_existing'&&<p>{f.expenseId?'Viene collegata quella scelta nel modulo. Non crei una nuova spesa.':'Scegli la spesa da collegare nel modulo.'}</p>}
     {['skip','defer'].includes(f.mode)&&<p>Nessuna spesa verrà registrata.</p>}
    </section>;
   })}
   {objectForms.map(({item,form:f})=><section key={item.id} className={styles.summaryExpense}>
    <h4>{f.action==='link'?'Collega oggetto esistente':(item.quantity?.value??1)>1?'Crea '+item.quantity!.value+' oggetti':'Crea oggetto'} · {(f.action==='link'?f.targets.map(t=>t.name).join(', '):f.name)||'Nome da completare'}</h4>
    {f.action==='link'&&<p>{f.targets.length?f.targets.map(t=>t.name).join(', '):'Scegli l’oggetto nel modulo.'}</p>}
    {!houses.length&&f.expense==='create'&&<p>Nuova spesa: <strong>{euro(f.amount)}</strong> · {f.supplier||'Fornitore non indicato'} · {date(f.spentOn)}</p>}
    {!houses.length&&f.expense==='link'&&<p>Collega la spesa esistente scelta nel modulo. Non crei una nuova spesa.</p>}
   </section>)}
   {!objectForms.length&&!houses.some(i=>houseForms[i.id]?.mode==='create'&&houseForms[i.id]?.objectChoice)&&<p>Nessun nuovo oggetto o collegamento a oggetti.</p>}
   {!houses.length&&!objectForms.some(x=>x.form.expense!=='skip')&&<p>Nessuna nuova spesa.</p>}
   {selectedContacts.length>0&&<p>Contatti da salvare in Rubrica: {selectedContacts.length}. Solo quelli che hai scelto.</p>}
  </>}
 </div>;
}
