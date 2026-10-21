import type { EconomyExpense } from '../api/economyTypes';
import { formatCalendarDate } from '../lib/activities';
import { billPeriodLabel, isUtility } from '../lib/billPeriod';
import { formatCents } from '../lib/expenses';
import styles from './overview.module.css';

type Values=Pick<EconomyExpense,'amountCents'|'supplier'|'category'|'spentOn'|'documentDate'|'competenceFrom'|'competenceTo'|'dueOn'>;
/** Read-only projection of the saved expense, shared with its linked document. */
export function ExpenseOverview({expense}:{expense:Values}){
 const bill=isUtility(expense.category),hasPeriod=!!(expense.competenceFrom||expense.competenceTo);
 const period=expense.competenceFrom&&expense.competenceTo?billPeriodLabel(expense)??`${formatCalendarDate(expense.competenceFrom)} – ${formatCalendarDate(expense.competenceTo)}`:'Da completare';
 return <div className={styles.overview}>
  <dl className={styles.primary}>
   <div><dt>Importo</dt><dd className={styles.amount}>{formatCents(expense.amountCents)}</dd></div>
   <div><dt>Fornitore</dt><dd>{expense.supplier?.trim()||'Non indicato'}</dd></div>
   {(bill||hasPeriod)&&<div><dt>Periodo di riferimento</dt><dd>{period}</dd></div>}
  </dl>
  <dl className={styles.dates}>
   {!bill&&<div><dt>Data della spesa</dt><dd>{formatCalendarDate(expense.spentOn)}</dd></div>}
   {(bill||expense.documentDate)&&<div><dt>Emissione</dt><dd>{expense.documentDate?formatCalendarDate(expense.documentDate):'Non indicata'}</dd></div>}
   {(bill||expense.dueOn)&&<div><dt>Scadenza</dt><dd>{expense.dueOn?formatCalendarDate(expense.dueOn):'Non indicata'}</dd></div>}
  </dl>
  <p className={styles.note}>Costo registrato · pagamento non verificato.</p>
 </div>;
}
