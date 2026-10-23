import type { RefObject } from 'react';
import { ui } from '../components/ui';

type Issue = { message: string; field: string };

/** Checklist presentation and focus only; editable data and requests stay in the parent. */
export function HouseExpenseIssues({ issues, region, onEdit }: {
  issues: Issue[];
  region: RefObject<HTMLElement | null>;
  onEdit: () => void;
}) {
  if (!issues.length) return null;
  function focusField(issue: Issue) {
    onEdit();
    const label = Array.from(region.current?.querySelectorAll('label') ?? [])
      .find(label => label.textContent?.includes(issue.field));
    const control = issue.field === 'Periodo di riferimento'
      ? region.current?.querySelector<HTMLElement>('[data-bill-period] input[type=month], [data-bill-period] input[type=date]')
      : label?.querySelector<HTMLElement>('input,select,button');
    for (let parent = control?.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') (parent as HTMLDetailsElement).open = true;
    }
    control?.scrollIntoView?.({ block: 'center' });
    control?.focus();
  }
  return <div aria-label="Dati della spesa da completare">
    <p>Per questa spesa:</p>
    <ul>{issues.map(issue => <li key={issue.field}>
      <button type="button" className={ui.btn} onClick={() => focusField(issue)}>{issue.message}</button>
    </li>)}</ul>
  </div>;
}
