import { useContext } from 'react';
import { DocumentEditorContext } from '../documents/DocumentEditorContext';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ApiClient } from '../api/client';
import { ui } from '../components/ui';
import { ItemEditor } from './ItemEditor';
import type { Draft, Form } from './model';
import { reviewIssues, reviewProblem, reviewTotals } from './reviewSummary';
import styles from './onboarding.module.css';

type Props = {
  documentOnly?:boolean; changeDocumentOnly?:(value:boolean)=>void; documentProblem?:string;
  draft: Draft; forms: Record<string, Form>; api: ApiClient; accountId: string; base: string; root: string;
  disabled: boolean; documentFields?: ReactNode; copyChoice?: { checked: boolean; change: (checked: boolean) => void };
  change: (id: string, form: Form) => void; save: () => void; defer: () => void; add: () => void;
  enrich: (id: string, body: { brand: string; reference: string; productUrl?: string }) => Promise<void>;
  contactFields?:ReactNode;houseFields?:ReactNode;houseProblem?:string;houseTotals?:{newExpenses:number;amountCents:number};
  manualTotal?: string; changeManualTotal?: (value: string) => void;
};
export function UnifiedReview({ documentOnly=false,changeDocumentOnly,documentProblem,draft, forms, api, accountId, base, root, disabled, documentFields, copyChoice, change, save, defer, add, enrich, manualTotal, changeManualTotal,contactFields,houseFields,houseProblem,houseTotals }: Props) {
  const editor=useContext(DocumentEditorContext);
  const metadataRef=useRef<HTMLDivElement>(null);
  const issues=documentOnly?[]:reviewIssues(draft,forms);
  const items = (documentOnly?[]:draft.items).filter(item => (!item.decision || item.decision.state === 'deferred')&&!(draft.documentInfo?.kind==='conformity_declaration'&&forms[item.id]?.action==='document_only'));
  const manualCents = /^\d+(?:[.,]\d{1,2})?$/.test(manualTotal ?? '') ? Math.round(Number(manualTotal!.replace(',', '.')) * 100) : 0;
  const effectiveDraft = !draft.purchaseTotal && manualCents > 0 ? { ...draft, purchaseTotal: { amountCents: manualCents } } : draft;
  const totals = reviewTotals(documentOnly?{...draft,items:[]}:draft, forms), problem = documentProblem ?? (documentOnly?null:houseProblem ?? reviewProblem(effectiveDraft, forms)) ?? (!documentOnly&&draft.mode==='manual'&&draft.items.length>1&&totals.newExpenses>0&&!manualCents ? 'Indica il totale della fattura per controllare le quote degli articoli.' : null);
  if(!documentOnly&&houseTotals){totals.newExpenses+=houseTotals.newExpenses;totals.amountCents+=houseTotals.amountCents;}
  const euro = (cents: number) => (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  return <section className={styles.stack} aria-label="Revisione unica del documento">
    <header><h2>{editor?"Cosa vuoi salvare?":"Rivedi e organizza"}</h2>{!editor&&<Link to={root + '/documenti/' + encodeURIComponent(draft.snapshot!.documentId) + '#doc-anteprima'} target="_blank" rel="noopener noreferrer">Vedi documento originale ↗</Link>}</header>
    {changeDocumentOnly&&!editor&&<fieldset className={styles.stack} disabled={disabled}><legend>Cosa vuoi conservare?</legend><label className={styles.check}><input type="radio" name={"document-mode-"+draft.id} checked={documentOnly} onChange={()=>changeDocumentOnly(true)}/>Conserva solo il documento</label><label className={styles.check}><input type="radio" name={"document-mode-"+draft.id} checked={!documentOnly} onChange={()=>changeDocumentOnly(false)}/>Rivedi oggetti, spese e contatti</label><p>{documentOnly?'Salvi titolo e tipo. Non creiamo nuovi oggetti, spese o contatti; quelli già collegati restano conservati.':'Controlla le proposte e scegli cosa salvare.'}</p></fieldset>}
    {editor&&changeDocumentOnly&&<label className={styles.check}><input type="checkbox" disabled={disabled} checked={documentOnly} onChange={e=>changeDocumentOnly(e.target.checked)}/>Conserva solo il documento</label>}
    <section className={editor?styles.resource:undefined} aria-label="Documento"><h3>Documento</h3><div ref={metadataRef} className={styles.grid}>{documentFields}</div></section>
    {!documentOnly&&draft.mode==='manual'&&draft.items.length>1&&!draft.houseExpenses?.length&&!draft.purchaseTotal&&<label className={styles.field}>Totale della fattura (€), inserito da te<input className={ui.input} inputMode="decimal" value={manualTotal??''} disabled={disabled} onChange={e=>changeManualTotal?.(e.target.value)}/></label>}
    {copyChoice && <label className={styles.check}><input type="checkbox" checked={copyChoice.checked} disabled={disabled} onChange={e => copyChoice.change(e.target.checked)} />Usa il documento già presente senza modificarlo</label>}
    {editor? <>
      {!documentOnly&&<details className={styles.resource} open><summary>Spese · controlla i costi da registrare</summary><div className={styles.stack}>{houseFields}{!draft.houseExpenses?.length&&items.map((item,index)=><section key={item.id} id={'review-cost-'+draft.id+'-'+item.id}><h3>{forms[item.id]?.name||'Articolo '+(index+1)}</h3><ItemEditor part="expense" api={api} accountId={accountId} base={base} draft={draft} item={item} form={forms[item.id]!} disabled={disabled} change={value=>change(item.id,value)} enrich={body=>enrich(item.id,body)}/></section>)}</div></details>}
      {!documentOnly&&draft.documentKind!=='utility_bill'&&<details className={styles.resource}><summary>Oggetti · {totals.newObjects} da creare, {totals.linkedObjects} da collegare</summary><div className={styles.stack}>    {items.map((item, index) => <section className={`${ui.card} ${styles.unifiedItem}`} key={item.id} id={'review-item-'+draft.id+'-'+item.id} tabIndex={-1} aria-label={'Articolo ' + (index + 1)}>
      <h3>Articolo {index + 1} · {forms[item.id]!.name || 'Da identificare'}</h3>
      <ItemEditor part={editor?'object':'all'} api={api} accountId={accountId} base={base} draft={draft} item={item} form={forms[item.id]!} disabled={disabled} change={value => change(item.id, value)} enrich={body => enrich(item.id, body)} />
    </section>)}
    {!documentOnly&&!['utility_bill','house_document','conformity_declaration'].includes(draft.documentKind)&&<button type="button" className={ui.btn} disabled={disabled || draft.items.length >= 20} onClick={add}>{draft.items.length?'Aggiungi un altro articolo':'Aggiungi o collega un oggetto (facoltativo)'}</button>}
</div></details>}
      {!documentOnly&&!!draft.contacts?.length&&<details className={styles.resource}><summary>Contatti · scegli cosa conservare in rubrica</summary>{contactFields}</details>}
    </>:<>    {items.map((item, index) => <section className={`${ui.card} ${styles.unifiedItem}`} key={item.id} id={'review-item-'+draft.id+'-'+item.id} tabIndex={-1} aria-label={'Articolo ' + (index + 1)}>
      <h3>Articolo {index + 1} · {forms[item.id]!.name || 'Da identificare'}</h3>
      <ItemEditor api={api} accountId={accountId} base={base} draft={draft} item={item} form={forms[item.id]!} disabled={disabled} change={value => change(item.id, value)} enrich={body => enrich(item.id, body)} />
    </section>)}
    {!documentOnly&&!['utility_bill','house_document','conformity_declaration'].includes(draft.documentKind)&&<button type="button" className={ui.btn} disabled={disabled || draft.items.length >= 20} onClick={add}>{draft.items.length?'Aggiungi un altro articolo':'Aggiungi o collega un oggetto (facoltativo)'}</button>}
    {!documentOnly&&houseFields}
    {!documentOnly&&contactFields}
</>}
    <section className={ui.card} aria-label="Riepilogo prima di salvare" aria-live="polite">
      {!documentOnly&&draft.purchaseTotal && <p>Totale fattura: <strong>{euro(draft.purchaseTotal.amountCents)}</strong></p>}
      {(!items.length||items.some(item=>forms[item.id]?.action==='document_only'))&&<p>Il documento sarà conservato nella casa.</p>}
      {!documentOnly&&!(draft.documentInfo?.kind==='conformity_declaration'&&!items.length)&&<><p>{totals.newObjects} nuovi oggetti · {totals.linkedObjects} collegamenti · {totals.newExpenses} nuove spese</p>
      <p>Nuove spese della casa: <strong>{euro(totals.amountCents)}</strong></p></>}
      {!!totals.excludedCents && <p>Importi esclusi: {euro(totals.excludedCents)}</p>}
      {!!totals.excludedUnknown && <p>{totals.excludedUnknown} articoli esclusi con importo non disponibile.</p>}
      {problem && !issues.length && !documentProblem && <p role="status">{problem}</p>}
      {(issues.length>0||documentProblem)&&<div aria-label="Dati da completare"><p>Prima di salvare:</p><ul>
        {documentProblem&&<li><button type="button" className={ui.btn} onClick={()=>{const selector=documentProblem.includes('sostituzione')?'input[type="checkbox"]':documentProblem.includes('tipo')?'select':'input';metadataRef.current?.scrollIntoView?.({block:'center'});metadataRef.current?.querySelector<HTMLElement>(selector)?.focus();}}>{documentProblem}</button></li>}
        {issues.map((issue,index)=><li key={index}><button type="button" className={ui.btn} onClick={()=>{const region=document.getElementById((editor&&['Cosa fare con il costo','Prezzo','Data'].includes(issue.field)?'review-cost-':'review-item-')+draft.id+'-'+issue.itemId);for(let parent=region?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')(parent as HTMLDetailsElement).open=true;region?.scrollIntoView?.({block:'center'});const label=Array.from(region?.querySelectorAll('label')??[]).find(label=>label.textContent?.includes(issue.field));const details=label?.closest('details');if(details)details.open=true;(label?.querySelector<HTMLElement>('input,select,button')??region)?.focus();}}>{issue.message}</button></li>)}
      </ul></div>}
    </section>
    <div data-editor-save={editor?"true":undefined} className={editor?styles.saveBar:styles.row}>{editor&&problem&&<span className={styles.saveProblem} role="status">{documentProblem??issues[0]?.message??problem}</span>}{editor&&<button type="button" className={ui.btn} disabled={disabled} onClick={editor.pause}>Riprendi più tardi</button>}{!editor&&!!items.length&&<button type="button" className={ui.btn} disabled={disabled} onClick={defer}>Decidi più avanti</button>}<button type="button" className={`${ui.btn} ${ui.primary}`} disabled={disabled || !!problem || (!documentOnly&&!items.length&&!draft.documentInfo&&!draft.houseExpenses?.length)} onClick={save}>{editor?'Salva e passa al successivo':documentOnly?'Salva documento':'Salva e organizza'}</button></div>
  </section>;
}
