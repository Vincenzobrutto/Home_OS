import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ApiClient } from '../api/client';
import { ui } from '../components/ui';
import { ItemEditor } from './ItemEditor';
import type { Draft, Form } from './model';
import { reviewProblem, reviewTotals } from './reviewSummary';
import styles from './onboarding.module.css';

type Props = {
  draft: Draft; forms: Record<string, Form>; api: ApiClient; accountId: string; base: string; root: string;
  disabled: boolean; documentFields?: ReactNode; copyChoice?: { checked: boolean; change: (checked: boolean) => void };
  change: (id: string, form: Form) => void; save: () => void; defer: () => void; add: () => void;
  enrich: (id: string, body: { brand: string; reference: string; productUrl?: string }) => Promise<void>;
  manualTotal?: string; changeManualTotal?: (value: string) => void;
};
export function UnifiedReview({ draft, forms, api, accountId, base, root, disabled, documentFields, copyChoice, change, save, defer, add, enrich, manualTotal, changeManualTotal }: Props) {
  const items = draft.items.filter(item => !item.decision || item.decision.state === 'deferred');
  const manualCents = /^\d+(?:[.,]\d{1,2})?$/.test(manualTotal ?? '') ? Math.round(Number(manualTotal!.replace(',', '.')) * 100) : 0;
  const effectiveDraft = !draft.purchaseTotal && manualCents > 0 ? { ...draft, purchaseTotal: { amountCents: manualCents } } : draft;
  const totals = reviewTotals(draft, forms), problem = reviewProblem(effectiveDraft, forms) ?? (draft.mode==='manual'&&draft.items.length>1&&totals.newExpenses>0&&!manualCents ? 'Indica il totale della fattura per controllare le quote degli articoli.' : null);
  const euro = (cents: number) => (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  return <section className={styles.stack} aria-label="Revisione unica del documento">
    <header><h2>Rivedi e organizza</h2><Link to={root + '/documenti/' + encodeURIComponent(draft.snapshot!.documentId) + '#doc-anteprima'} target="_blank" rel="noopener noreferrer">Vedi documento originale ↗</Link></header>
    {documentFields}
    {draft.mode==='manual'&&draft.items.length>1&&!draft.purchaseTotal&&<label className={styles.field}>Totale della fattura (€), inserito da te<input className={ui.input} inputMode="decimal" value={manualTotal??''} disabled={disabled} onChange={e=>changeManualTotal?.(e.target.value)}/></label>}
    {copyChoice && <label className={styles.check}><input type="checkbox" checked={copyChoice.checked} disabled={disabled} onChange={e => copyChoice.change(e.target.checked)} />Usa il documento già presente senza modificarlo</label>}
    {items.map((item, index) => <section className={`${ui.card} ${styles.unifiedItem}`} key={item.id} aria-label={'Articolo ' + (index + 1)}>
      <h3>Articolo {index + 1} · {forms[item.id]!.name || 'Da identificare'}</h3>
      <ItemEditor api={api} accountId={accountId} base={base} draft={draft} item={item} form={forms[item.id]!} disabled={disabled} change={value => change(item.id, value)} enrich={body => enrich(item.id, body)} />
    </section>)}
    <button type="button" className={ui.btn} disabled={disabled || draft.items.length >= 20} onClick={add}>Aggiungi un altro articolo</button>
    <section className={ui.card} aria-label="Riepilogo prima di salvare" aria-live="polite">
      {draft.purchaseTotal && <p>Totale fattura: <strong>{euro(draft.purchaseTotal.amountCents)}</strong></p>}
      <p>{totals.newObjects} nuovi oggetti · {totals.linkedObjects} collegamenti · {totals.newExpenses} nuove spese</p>
      <p>Nuove spese della casa: <strong>{euro(totals.amountCents)}</strong></p>
      {!!totals.excludedCents && <p>Importi esclusi: {euro(totals.excludedCents)}</p>}
      {!!totals.excludedUnknown && <p>{totals.excludedUnknown} articoli esclusi con importo non disponibile.</p>}
      {problem && <p role="status">{problem}</p>}
    </section>
    <div className={styles.row}><button type="button" className={ui.btn} disabled={disabled} onClick={defer}>Decidi più avanti</button><button type="button" className={`${ui.btn} ${ui.primary}`} disabled={disabled || !!problem || !items.length} onClick={save}>Salva e organizza</button></div>
  </section>;
}
