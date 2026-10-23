import { Link } from 'react-router';
import type { HomeExpense } from '../api/types';
import { formatCalendarDate } from '../lib/activities';
import { ORIGIN_LABEL, STATE_LABEL, assetLinkText, formatCents } from '../lib/expenses';
import styles from '../activities/activities.module.css';
import own from './expenses.module.css';

/** Read-only presentation shared with Casa; keeps editing forms outside its eager imports. */
export { styles as expenseStyles, own as expenseOwn };

export function expensePath(homeId: string, expenseId?: string) {
  const base = `/home/${encodeURIComponent(homeId)}/spese`;
  return expenseId ? `${base}/${encodeURIComponent(expenseId)}` : base;
}

export function ExpenseRow(props: { expense: HomeExpense; homeId: string; state?: unknown; referencePeriod?: string | null; issuedOn?: string | null }) {
  const { expense } = props;
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <Link to={expensePath(props.homeId, expense.id)} state={props.state} className={styles.title}>
          {expense.title}
        </Link>
        <span className={own.amount}>{formatCents(expense.amountCents)}</span>
      </div>
      <span className={styles.meta}>
        {props.referencePeriod ?? formatCalendarDate(expense.spentOn)}
        {props.issuedOn ? ` · Emissione ${formatCalendarDate(props.issuedOn)}` : ''} · {ORIGIN_LABEL[expense.origin]}
        {expense.state === 'archived' ? ` · ${STATE_LABEL.archived}` : ''}
        {expense.assetLink.state !== 'none' ? ` · ${assetLinkText(expense.assetLink)}` : ''}
      </span>
    </li>
  );
}
