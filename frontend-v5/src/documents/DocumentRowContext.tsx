import {Link} from 'react-router';
import type {DocumentSummary} from '../api/types';
import styles from '../routes/documents.module.css';

/** Saved facts only: no title rewriting, inferred instalments or fallback issue date. */
export function DocumentRowContext({doc,homeId}:{doc:DocumentSummary;homeId:string}){
 const invoices=doc.organization?.parts.some(part=>part.kind==='invoice')?doc.savedExpenses??[]:[];
 return <>
  {!!doc.linkedObjects?.length&&<div className={styles.rowContext}><span>Collegato a: </span>{doc.linkedObjects.map((ref,index)=><span key={ref.kind+ref.id}>{index>0?' · ':''}<Link to={`/home/${encodeURIComponent(homeId)}/oggetti/${ref.kind}/${encodeURIComponent(ref.id)}`}>{ref.name}</Link></span>)}</div>}
  {invoices.map(expense=><div className={styles.rowContext} key={expense.id}>
   <span className={styles.expenseDescription}>{expense.title}</span>
   <span>{[expense.supplier,expense.documentNumber?`N. ${expense.documentNumber}`:null,expense.documentDate?`Emissione ${expense.documentDate.split('-').reverse().join('/')}`:null,new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(expense.amountCents/100)].filter(Boolean).join(' · ')}</span>
  </div>)}
 </>;
}
