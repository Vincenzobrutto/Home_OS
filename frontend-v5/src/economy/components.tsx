import { expenseDisplayTitle } from './expensePresentation';
import { BillPeriodFields } from '../components/BillPeriodFields';
import { ExpenseInstallmentFields } from '../components/ExpenseInstallmentFields';
import {billPeriodLabel,invoiceMonthLabel,isUtility} from '../lib/billPeriod';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type {
  Category,
  CreateExpense,
  EconomyCapabilities,
  EconomyExpense,
  EconomySummary,
  Family,
  ObjectRef,
} from '../api/economyTypes';
import type { Home } from '../api/types';
import { NoteField } from '../activities/components';
import act from '../activities/activities.module.css';
import { Banner, Field, cx, ui } from '../components/ui';
import { useDocuments } from '../documents/hooks';
import { formatCalendarDate } from '../lib/activities';
import {
  CATEGORY_CODES,
  FAMILY_CODES,
  categoryLabel,
  comparisonText,
  economyErrorMessage,
  familyLabel,
  formatBigCents,
  formatCentsString,
  formatTenths,
  isAmbiguousError,
  isEconomyConflict,
  optionalText,
  parseCentsString,
  periodText,
  previewFamily,
  shareTenths,
  svgFraction,
  validateCompetence,
  validateOptionalDate,
  validateOptionalText,
} from '../lib/economy';
import { centsToInput, formatCents, normalizeNote, normalizeText, parseAmount, validateNote, validateSpentOn, validateTitle } from '../lib/expenses';
import { useCatalog } from '../objects/hooks';
import { useAccount, useApi } from '../session/session';
import { useEconomyOperation, useRefreshEconomy, useWorks, type EconomyResult } from './hooks';
import styles from './economy.module.css';

export { styles as economyStyles };

export function economyExpensePath(homeId: string, expenseId?: string) {
  const base = `/home/${encodeURIComponent(homeId)}/spese`;
  return expenseId ? `${base}/${encodeURIComponent(expenseId)}` : base;
}

export function workPath(homeId: string, workId?: string) {
  const base = `/home/${encodeURIComponent(homeId)}/spese/lavori`;
  return workId ? `${base}/${encodeURIComponent(workId)}` : base;
}

export function objectHref(homeId: string, ref: ObjectRef) {
  return `/home/${encodeURIComponent(homeId)}/oggetti/${encodeURIComponent(ref.kind)}/${encodeURIComponent(ref.id)}`;
}

// ---- totale e confronto ----

export function TotalCard(props: { summary: EconomySummary; caps: EconomyCapabilities; family: Family | null; showWithoutFinancing: boolean }) {
  const { summary } = props;
  const total = parseCentsString(summary.totalCents) ?? 0n;
  return (
    <section className={ui.card} aria-labelledby="spese-totale">
      <div className={styles.total}>
        <h2 id="spese-totale" className={styles.totalLabel}>
          {props.family ? familyLabel(props.family, props.caps) : 'Costi registrati nel periodo'} · {periodText(summary.period, summary.today)}
        </h2>
        <span className={styles.metric}>{formatBigCents(total)}</span>
        {props.showWithoutFinancing && summary.totalCents !== summary.totalWithoutFinancingCents && (
          <span className={styles.second}>
            Senza mutuo e finanziamenti: <strong>{formatCentsString(summary.totalWithoutFinancingCents)}</strong>
          </span>
        )}
        <span className={styles.second}>
          {summary.count} {summary.count === 1 ? 'registrazione' : 'registrazioni'} · costi registrati, non pagamenti.
        </span>
      </div>
    </section>
  );
}

export function ComparisonCard({ summary }: { summary: EconomySummary }) {
  const text = comparisonText(summary.comparison);
  return (
    <section className={ui.card} aria-labelledby="spese-confronto">
      <h2 id="spese-confronto" className={act.title}>
        Confronto con lo stesso periodo
      </h2>
      <p className={styles.note}>Confronto dei dati presenti: lo storico può essere incompleto. La differenza non indica un risparmio o un aumento effettivo delle spese.</p>
      <p>{text.title}</p>
      {text.lines.map((l) => (
        <p key={l} className={styles.compareRow}>
          {l}
        </p>
      ))}
      <p className={styles.note}>
        Confronta solo i costi che hai registrato, per data di riferimento: più o meno registrazioni non indicano un risparmio né
        uno storico completo.
      </p>
    </section>
  );
}

// ---- anello e legenda ----

const FAMILY_COLOR: Record<Family, string> = {
  utilities: '#0b6177',
  condominium: '#3d8fa8',
  taxes_insurance: '#8cc9d8',
  maintenance_repairs: '#132e3e',
  works_purchases: '#5f8496',
  financing: '#b8a271',
  unclassified: '#9aa9b4',
};
const CATEGORY_COLORS = ['#0b6177', '#3d8fa8', '#8cc9d8', '#132e3e', '#5f8496', '#b8a271', '#2a6f5f', '#7a9fb0', '#d0bd8f', '#47627a', '#7fc4b5', '#6b5b3e', '#9aa9b4', '#c3d2da'];

export type Slice = { key: string; kind: 'family' | 'category'; code: Family | Category | null; label: string; cents: bigint; count: number; color: string };

export function slicesOf(summary: EconomySummary, mode: 'family' | 'category', caps: EconomyCapabilities): Slice[] {
  if (mode === 'family') {
    return FAMILY_CODES.map((code) => {
      const r = summary.byFamily.find((x) => x.family === code);
      return { key: code, kind: 'family' as const, code, label: familyLabel(code, caps), cents: parseCentsString(r?.totalCents) ?? 0n, count: r?.count ?? 0, color: FAMILY_COLOR[code] };
    });
  }
  const order: Array<Category | null> = [...CATEGORY_CODES, null];
  return order.map((code, i) => {
    const r = summary.byCategory.find((x) => x.category === code);
    return {
      key: code ?? 'unclassified',
      kind: 'category' as const,
      code,
      label: categoryLabel(code, caps),
      cents: parseCentsString(r?.totalCents) ?? 0n,
      count: r?.count ?? 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]!,
    };
  });
}

/**
 * Distribuzione dal riepilogo server (mai sommando le righe caricate). La legenda testuale è
 * la lettura principale ed è azionabile da tastiera; i settori sono un'alternativa col mouse.
 */
export function Distribution(props: {
  summary: EconomySummary;
  caps: EconomyCapabilities;
  mode: 'family' | 'category';
  family: Family | null;
  onModeChange: (mode: 'family' | 'category') => void;
  onAllFamilies: () => void;
  onPick: (slice: Slice) => void;
}) {
  const { summary, caps, mode } = props;
  const total = parseCentsString(summary.totalCents) ?? 0n;
  const all = slicesOf(summary, mode, caps);
  const positive = all.filter((s) => s.cents > 0n).sort((a, b) => (b.cents > a.cents ? 1 : b.cents < a.cents ? -1 : 0));
  const emptyFamilies = mode === 'family' ? all.filter((s) => s.cents === 0n) : [];
  const shares = positive.map((s) => shareTenths(s.cents, total));
  const sum = shares.reduce((a, b) => a + b, 0);

  const head = (
    <div className={styles.cardHead}>
      <h2 id="spese-distribuzione" tabIndex={-1}>
        {props.family ? `Categorie in ${familyLabel(props.family, caps)}` : 'Distribuzione'}
      </h2>
      {props.family ? (
        <button type="button" className={styles.linkButton} onClick={props.onAllFamilies}>
          Tutti i gruppi di spesa
        </button>
      ) : (
        <div className={styles.split} role="group" aria-label="Suddividi per">
          <button type="button" aria-pressed={mode === 'family'} onClick={() => props.onModeChange('family')}>
            Gruppi di spesa
          </button>
          <button type="button" aria-pressed={mode === 'category'} onClick={() => props.onModeChange('category')}>
            Categorie
          </button>
        </div>
      )}
    </div>
  );

  if (total <= 0n) {
    return (
      <section className={ui.card} aria-labelledby="spese-distribuzione">
        {head}
        <p className={act.meta}>Nessun costo registrato nel periodo con questi filtri.</p>
      </section>
    );
  }

  const r = 76;
  const circumference = 2 * Math.PI * r;
  const gap = positive.length > 1 ? 1.5 : 0;
  // Offset cumulativi calcolati prima del rendering (proporzioni limitate, importi già interi).
  const lengths = positive.map((s) => circumference * svgFraction(s.cents, total));
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <section className={ui.card} aria-labelledby="spese-distribuzione">
      {head}
      <div className={styles.chartGrid}>
        <svg className={styles.chart} viewBox="0 0 200 200" role="img" aria-label="Grafico ad anello: gli stessi valori sono nella legenda">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#edf2f5" strokeWidth="30" />
          {positive.map((s, i) => {
            const dash = Math.max(lengths[i]! - gap, 0.5);
            return (
              <circle
                key={s.key}
                className={styles.segment}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="30"
                strokeDasharray={`${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`}
                strokeDashoffset={(-offsets[i]!).toFixed(2)}
                transform="rotate(-90 100 100)"
                onClick={() => props.onPick(s)}
              >
                <title>{`${s.label}: ${formatBigCents(s.cents)}`}</title>
              </circle>
            );
          })}
          <text x="100" y="97" textAnchor="middle" className={styles.chartCenter}>
            {formatBigCents(total)}
          </text>
          <text x="100" y="116" textAnchor="middle" className={styles.chartSub}>
            registrati
          </text>
        </svg>
        <ul className={styles.legend} aria-label={mode === 'family' ? 'Gruppi di spesa con costi registrati' : 'Categorie con costi registrati'}>
          {positive.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                className={styles.legendItem}
                aria-label={`${s.label}: ${formatBigCents(s.cents)}, ${formatTenths(shares[i]!)}, ${s.count} ${s.count === 1 ? 'registrazione' : 'registrazioni'}. Apri l’elenco`}
                onClick={() => props.onPick(s)}
              >
                <span className={styles.swatch} style={{ background: s.color }} aria-hidden="true" />
                <span className={styles.legendLabel}>{s.label}</span>
                <span className={styles.legendAmount}>{formatBigCents(s.cents)}</span>
                <span className={styles.legendShare}>{formatTenths(shares[i]!)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {emptyFamilies.length > 0 && (
        <p className={styles.note}>Senza costi registrati nel periodo: {emptyFamilies.map((s) => s.label).join(', ')}.</p>
      )}
      {sum !== 1000 && <p className={styles.note}>Percentuali arrotondate a un decimale: la loro somma è {formatTenths(sum)}. Gli importi sono esatti.</p>}
      <p className={styles.note}>
        {mode === 'family'
          ? 'I gruppi di spesa riuniscono le categorie e sono calcolati dal servizio. '
          : props.family === 'unclassified' || positive.some((s) => s.key === 'other' || s.key === 'unclassified')
            ? '«Altro» e «Non classificata» sono categorie diverse dello stesso gruppo di spesa. '
            : 'Le categorie mostrano come si distribuiscono i costi registrati. '}
        Tocca una voce per vedere le registrazioni.
      </p>
    </section>
  );
}

// ---- righe ----

export function EconomyExpenseRow(props: { expense: EconomyExpense; homeId: string; caps?: EconomyCapabilities; state?: unknown }) {
  const e = props.expense;
  const location=useLocation();
  const navigate=useNavigate();
  const bill = isUtility(e.category);
  const month = invoiceMonthLabel(e.invoiceMonth);
  const meta = [
    e.supplier,
    e.objectLink.state === 'linked' ? e.objectLink.value.name : null,
    e.workLink.state === 'linked' ? e.workLink.value.name : null,
    e.documentLink.state === 'linked' ? 'documento collegato' : null,
    e.state === 'archived' ? 'archiviato' : null,
  ].filter(Boolean);
  return (
    <li className={cx(act.item, styles.expenseRow)}>
      <div className={styles.expenseHead}>
        <Link id={'expense-'+e.id} to={economyExpensePath(props.homeId, e.id)} state={props.state} className={act.title}
          onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();const state=props.state as {accountId?:string;expensePages?:number};const restore={id:e.id,y:window.scrollY,pages:state?.expensePages??1};navigate(location.pathname+location.search,{replace:true,state:{...state,expenseRestore:restore}});navigate(economyExpensePath(props.homeId,e.id),{state:{...state,expenseRestore:restore}});}}>
          {expenseDisplayTitle(e)}
        </Link>
        <span className={styles.expenseAmount}>
          {formatCents(e.amountCents)}
        </span>
      </div>
      <span className={styles.expenseCategory}>{categoryLabel(e.category, props.caps)}</span>
      <div className={styles.expenseDates}>
        {bill ? <>
          <span>{month ? 'Mese fattura: '+month : 'Mese fattura non indicato'}</span>
          {!month && <span>Periodo servizi: {e.competenceFrom && e.competenceTo ? billPeriodLabel(e) : 'Non indicato'}</span>}
          <span>Emissione: {e.documentDate ? formatCalendarDate(e.documentDate) : 'Non indicata'}</span>
          <span>Scadenza: {e.dueOn ? formatCalendarDate(e.dueOn) : 'Non indicata'}</span>
        </> : <span>Data della spesa: {formatCalendarDate(e.spentOn)}</span>}
      </div>
      {meta.length > 0 && <span className={styles.expenseContext}>{meta.join(' · ')}</span>}
    </li>
  );
}

// ---- esito operazioni ----

export function EconomyFeedback(props: { op: ReturnType<typeof useEconomyOperation>; homeId: string; title: string; onRetry: () => void }) {
  const refresh = useRefreshEconomy(props.homeId);
  const { mutation } = props.op;
  if (!mutation.isError) return null;
  if (isAmbiguousError(mutation.error)) {
    return (
      <Banner
        tone="error"
        role="alert"
        title="Esito non confermato"
        actions={
          <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onRetry} disabled={mutation.isPending}>
            Riprova invio
          </button>
        }
      >
        <p>
          {economyErrorMessage(mutation.error)} Non sappiamo se l’operazione è stata salvata: «Riprova invio» ripete la stessa
          richiesta senza duplicarla.
        </p>
      </Banner>
    );
  }
  return (
    <Banner
      tone="warning"
      role="alert"
      title={props.title}
      actions={
        isEconomyConflict(mutation.error) && (
          <button
            type="button"
            className={cx(ui.btn, ui.small)}
            onClick={() => {
              props.op.reset();
              void refresh();
            }}
          >
            Rileggi i dati
          </button>
        )
      }
    >
      <p>{economyErrorMessage(mutation.error)}</p>
    </Banner>
  );
}

// ---- modulo manuale ----

/** Riferimento proposto dall'URL: valido solo se la lettura autorizzata riesce. */
function usePresetCheck<T>(key: readonly unknown[], enabled: boolean, fn: (signal: AbortSignal) => Promise<T>) {
  return useQuery({ queryKey: key, queryFn: ({ signal }) => fn(signal), enabled, retry: false });
}

const refKey = (r: ObjectRef | null) => (r ? `${r.kind}:${r.id}` : '');
const parseRef = (v: string): ObjectRef | null => {
  const [kind, id] = v.split(':');
  return (kind === 'object' || kind === 'boiler') && id ? { kind, id } : null;
};

export type ExpensePresets = { documentId?: string | null; object?: ObjectRef | null; workId?: string | null };

/**
 * Costo manuale S1: descrizione, importo e data essenziali; categoria, oggetto, lavoro e
 * documento facoltativi; metadati nei dettagli aggiuntivi. Importo con il parser intero H3a.
 * In modifica si inviano solo i campi cambiati; l'oggetto non si sposta in silenzio.
 */
export function EconomyExpenseForm(props: {
  home: Home;
  caps: EconomyCapabilities;
  expense?: EconomyExpense;
  presets?: ExpensePresets;
  onDone: (expense: EconomyExpense) => void;
  onCancel: () => void;
}) {
  const { home, caps, expense } = props;
  const api = useApi();
  const account = useAccount();
  const id = useId();
  const op = useEconomyOperation(home.id);
  const limits = caps.limits;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const presets = expense ? {} : (props.presets ?? {});
  const presetDoc = usePresetCheck(queryKeys.document(account.id, home.id, presets.documentId ?? '-'), !!presets.documentId, (s) => api.getDocument(home.id, presets.documentId!, s, account.id));
  const presetObj = usePresetCheck(
    queryKeys.object(account.id, home.id, presets.object?.kind ?? '-', presets.object?.id ?? '-'),
    !!presets.object,
    (s) => api.getObject(home.id, presets.object!, s, account.id),
  );
  const presetWork = usePresetCheck(queryKeys.work(account.id, home.id, presets.workId ?? '-'), !!presets.workId, (s) => api.getWork(home.id, presets.workId!, s, account.id));

  const initObject = expense?.objectLink.state === 'linked' ? expense.objectLink.value.ref : null;
  const initWork = expense?.workLink.state === 'linked' ? expense.workLink.value.id : '';
  const initDoc = expense?.documentLink.state === 'linked' ? expense.documentLink.document.id : '';

  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense ? centsToInput(expense.amountCents) : '');
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? '');
  const [category, setCategory] = useState<string>(expense ? (expense.category ?? '') : '');
  const [objectChoice, setObjectChoice] = useState<string | null>(null);
  const [workChoice, setWorkChoice] = useState<string | null>(null);
  const [docChoice, setDocChoice] = useState<string | null>(null);
  const [note, setNote] = useState(expense?.note ?? '');
  const [supplier, setSupplier] = useState(expense?.supplier ?? '');
  const [documentNumber, setDocumentNumber] = useState(expense?.documentNumber ?? '');
  const [documentDate, setDocumentDate] = useState(expense?.documentDate ?? '');
  const [invoiceMonth,setInvoiceMonth]=useState(expense?.invoiceMonth??'');
  const [competenceFrom, setCompetenceFrom] = useState(expense?.competenceFrom ?? '');
  const [competenceTo, setCompetenceTo] = useState(expense?.competenceTo ?? '');
  const [dueOn, setDueOn] = useState(expense?.dueOn ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [nothing, setNothing] = useState(false);
  const disabled = op.mutation.isPending || op.locked;

  const presetObjOk = presetObj.isSuccess && presetObj.data.state === 'active';
  const presetWorkOk = presetWork.isSuccess && presetWork.data.state === 'active';
  const presetDocOk = presetDoc.isSuccess && presetDoc.data.permissions.includes('read');
  const effObject = objectChoice ?? (presetObjOk ? refKey(presets.object!) : refKey(initObject));
  const effWork = workChoice ?? (presetWorkOk ? presets.workId! : initWork);
  const effDoc = docChoice ?? (presetDocOk ? presets.documentId! : initDoc);
  const checkingPresets =
    (!!presets.object && objectChoice === null && presetObj.isFetching) ||
    (!!presets.documentId && docChoice === null && presetDoc.isFetching) ||
    (!!presets.workId && workChoice === null && presetWork.isFetching);

  const catalog = useCatalog(home.id, { state: 'active', q: '', type: null, roomId: null, placement: 'all' });
  const works = useWorks(home.id, { state: 'active', q: '' });
  const documents = useDocuments(home.id);
  const objectOptions = (catalog.data?.pages.flatMap((p) => p.items) ?? []).map((o) => ({ key: refKey(o.ref), name: o.name }));
  const workOptions = (works.data?.pages.flatMap((p) => p.items) ?? []).map((w) => ({ id: w.id, name: w.name }));
  const docOptions = (documents.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => d.permissions.includes('read')).map((d) => ({ id: d.id, name: d.name }));
  // Valori attuali o proposti non presenti nelle pagine caricate restano selezionabili.
  if (presetObjOk && !objectOptions.some((o) => o.key === refKey(presets.object!))) objectOptions.unshift({ key: refKey(presets.object!), name: presetObj.data.name });
  if (initObject && expense?.objectLink.state === 'linked' && !objectOptions.some((o) => o.key === refKey(initObject))) objectOptions.unshift({ key: refKey(initObject), name: expense.objectLink.value.name });
  if (presetWorkOk && !workOptions.some((w) => w.id === presets.workId)) workOptions.unshift({ id: presets.workId!, name: presetWork.data.name });
  const currentWorkArchived = expense?.workLink.state === 'linked' && expense.workLink.value.state === 'archived';
  if (expense?.workLink.state === 'linked' && !workOptions.some((w) => w.id === initWork)) {
    workOptions.unshift({ id: initWork, name: `${expense.workLink.value.name}${currentWorkArchived ? ' (archiviato)' : ''}` });
  }
  if (presetDocOk && !docOptions.some((d) => d.id === presets.documentId)) docOptions.unshift({ id: presets.documentId!, name: presetDoc.data.name });
  if (expense?.documentLink.state === 'linked' && !docOptions.some((d) => d.id === initDoc)) docOptions.unshift({ id: initDoc, name: expense.documentLink.document.name });

  // In modifica un oggetto già collegato si può solo mantenere o scollegare (niente spostamento silenzioso).
  const objectLocked = !!expense && !!initObject;
  const preview = previewFamily(category ? (category as Category) : null, !!effWork);

  const submit = () => {
    // Non perdere il contesto se si compila prima che la lettura autorizzata termini.
    if (checkingPresets) return;
    const parsed = parseAmount(amount, limits.amountMaxCents);
    const errs: Record<string, string | undefined> = {
      title: validateTitle(title, limits.titleMaxCodePoints),
      amount: parsed.error,
      spentOn: validateSpentOn(spentOn, caps.today),
      note: validateNote(note, limits.noteMaxCodePoints),
      supplier: validateOptionalText(supplier, 120),
      documentNumber: validateOptionalText(documentNumber, 80),
      documentDate: validateOptionalDate(documentDate),
      invoiceMonth:invoiceMonth&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(invoiceMonth)||invoiceMonth.startsWith('0000'))?'Mese della fattura non valido.':undefined,
      competence: isUtility(category)&&!invoiceMonth&&(!expense||category!==expense.category)&&(!competenceFrom||!competenceTo)?'Indica inizio e fine del periodo di riferimento della bolletta.':validateCompetence(competenceFrom, competenceTo),
      dueOn: validateOptionalDate(dueOn),
    };
    setErrors(errs);
    setNothing(false);
    const first = Object.keys(errs).find((k) => errs[k]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    const values = {
      title: normalizeText(title),
      amountCents: parsed.cents!,
      spentOn,
      note: normalizeNote(note),
      category: category ? (category as Category) : null,
      supplier: optionalText(supplier),
      documentNumber: optionalText(documentNumber),
      documentDate: documentDate || null,
      ...(invoiceMonth?{invoiceMonth}:expense?.invoiceMonth?{invoiceMonth:null}:{}),competenceFrom: competenceFrom || null,
      competenceTo: competenceTo || null,
      dueOn: dueOn || null,
      objectRef: parseRef(effObject),
      workId: effWork || null,
      documentId: effDoc || null,
    };
    const done = (res: EconomyResult) => {
      if ('expense' in res) props.onDone(res.expense);
    };
    if (!expense) {
      // Creazione: si inviano solo i campi valorizzati.
      const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== '')) as unknown as CreateExpense;
      op.run({ kind: 'create', body }, done);
      return;
    }
    const before = {
      title: expense.title,
      amountCents: expense.amountCents,
      spentOn: expense.spentOn,
      note: expense.note,
      category: expense.category,
      supplier: expense.supplier,
      documentNumber: expense.documentNumber,
      documentDate: expense.documentDate,
      ...(expense.invoiceMonth?{invoiceMonth:expense.invoiceMonth}:{}),competenceFrom: expense.competenceFrom,
      competenceTo: expense.competenceTo,
      dueOn: expense.dueOn,
      objectRef: initObject,
      workId: initWork || null,
      documentId: initDoc || null,
    };
    const body: Record<string, unknown> = { expectedVersion: expense.version };
    for (const k of Object.keys(values) as Array<keyof typeof values>) {
      // Collegamenti «non più disponibili» non toccati restano come sono: si omettono.
      if (k === 'objectRef' && expense.objectLink.state === 'unavailable' && objectChoice === null) continue;
      if (k === 'workId' && expense.workLink.state === 'unavailable' && workChoice === null) continue;
      if (k === 'documentId' && expense.documentLink.state === 'unavailable' && docChoice === null) continue;
      if (JSON.stringify(values[k]) !== JSON.stringify(before[k])) body[k] = values[k];
    }
    if (Object.keys(body).length === 1) {
      setNothing(true);
      return;
    }
    op.run({ kind: 'updates', expenseId: expense.id, body: body as never }, done);
  };

  const err = (name: string) =>
    errors[name] ? (
      <span id={`${id}-${name}-error`} className={ui.fieldError}>
        {errors[name]}
      </span>
    ) : null;
  const select = (name: string, label: string, value: string, onChange: (v: string) => void, children: ReactNode, hint?: string, extra?: ReactNode, lock = false) => (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={`${id}-${name}`}>
        {label}
      </label>
      {hint && (
        <span id={`${id}-${name}-hint`} className={ui.hint}>
          {hint}
        </span>
      )}
      <select id={`${id}-${name}`} className={act.select} value={value} disabled={disabled || lock} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-${name}-hint` : undefined}>
        {children}
      </select>
      {extra}
    </div>
  );
  const dateField = (name: string, label: string, value: string, onChange: (v: string) => void, errorKey = name) => (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={`${id}-${name}`}>
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        className={ui.input}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={errors[errorKey] ? true : undefined}
        aria-describedby={errors[errorKey] ? `${id}-${errorKey}-error` : undefined}
      />
    </div>
  );
  const moreButton = (q: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }, label: string) =>
    q.hasNextPage ? (
      <button type="button" className={cx(ui.btn, ui.small)} disabled={disabled || q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
        {q.isFetchingNextPage ? 'Caricamento…' : label}
      </button>
    ) : null;

  // Categorie raggruppate dal servizio; il collegamento a un lavoro non cambia gruppo.
  const byFamily = caps.families.map((f) => ({
    family: f,
    cats: caps.categories.filter((c) => c.possibleFamilies[0] === f.code),
  }));

  return (
    <form
      className={act.panel}
      noValidate
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 id={`${id}-t`} ref={headingRef} tabIndex={-1}>
        {expense ? 'Modifica costo' : 'Registra una spesa'}
      </h2>
      <p className={act.meta}>Bastano descrizione, importo e data. Il costo è visibile solo a te e non attesta un pagamento.</p>
      {checkingPresets && <p role="status">Verifica dei collegamenti di partenza in corso… Attendi prima di salvare.</p>}
      {presets.object && presetObjOk && objectChoice === null && <p className={act.meta}>Oggetto preselezionato: <strong>{presetObj.data.name}</strong>. Puoi cambiarlo nel campo Oggetto.</p>}
      <Field id={`${id}-title`} label="Descrizione" autoComplete="off" value={title} disabled={disabled} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
      {!isUtility(category)&&<ExpenseInstallmentFields title={title} onChange={setTitle} disabled={disabled}/>}
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-amount`}>
          Importo in euro
        </label>
        <span id={`${id}-amount-hint`} className={ui.hint}>
          Per esempio 1.234,56 oppure 85,5.
        </span>
        <input
          id={`${id}-amount`}
          className={ui.input}
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          disabled={disabled}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={`${id}-amount-hint${errors.amount ? ` ${id}-amount-error` : ''}`}
        />
        {err('amount')}
      </div>
      {select(
        'category',
        'Categoria (facoltativa)',
        category,
        setCategory,
        <>
          <option value="">Non classificata</option>
          {byFamily.map(({ family, cats }) =>
            cats.length ? (
              <optgroup key={family.code} label={family.label}>
                {cats.map((c) => (
                  <option key={c.code} value={c.code}>
                    {categoryLabel(c.code, caps)}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </>,
        isUtility(category)?undefined:'Per un oggetto nuovo, anche se sostituisce il precedente, scegli Acquisti. Per sostituire un componente durante un intervento scegli Riparazioni e lavori. Per una polizza richiesta dal mutuo scegli Finanziamento; per la polizza della casa scegli Assicurazione.',
      )}
      {isUtility(category)&&<><Field id={`${id}-bill-supplier`} label="Fornitore" value={supplier} disabled={disabled} onChange={e=>setSupplier(e.target.value)} error={errors.supplier}/><Field id={`${id}-invoice-month`} label="Mese di riferimento della fattura" type="month" value={invoiceMonth} disabled={disabled} onChange={e=>setInvoiceMonth(e.target.value)} error={errors.invoiceMonth}/><BillPeriodFields servicePeriod inputId={`${id}-competence`} error={errors.competence} from={competenceFrom} to={competenceTo} disabled={disabled} onChange={({from,to})=>{setCompetenceFrom(from);setCompetenceTo(to);}}/></>}
      <div className={ui.field}>
        <details open={!isUtility(category)||!!errors.spentOn}><summary hidden={!isUtility(category)}>Altri dati della spesa</summary>
        <label className={ui.label} htmlFor={`${id}-spentOn`}>
          Data della spesa
        </label>
        <span id={`${id}-spentOn-hint`} className={ui.hint}>
          Per le bollette il periodo di riferimento decide dove compare il costo. Per le altre spese vale questa data. Non indica il pagamento.
        </span>
        <input
          id={`${id}-spentOn`}
          className={ui.input}
          type="date"
          max={caps.today}
          value={spentOn}
          disabled={disabled}
          onChange={(e) => setSpentOn(e.target.value)}
          aria-invalid={errors.spentOn ? true : undefined}
          aria-describedby={`${id}-spentOn-hint${errors.spentOn ? ` ${id}-spentOn-error` : ''}`}
        />
        {err('spentOn')}
        </details>
      </div>

      {!isUtility(category)&&<p className={styles.preview} aria-live="polite">
        Gruppo di spesa previsto: <strong>{familyLabel(preview, caps)}</strong>
        . Il gruppo di spesa
        definitivo lo calcola il servizio.
      </p>}

      <details className={styles.details} open={(!isUtility(category)&&!!expense) || !!presets.object || !!presets.workId || !!presets.documentId || Object.keys(errors).some(k=>['object','work','doc','note','documentNumber'].includes(k))}>
        <summary>Altri dati e collegamenti</summary>
      {select(
        'object',
        'Oggetto (facoltativo)',
        effObject,
        (v) => setObjectChoice(v),
        <>
          <option value="">{objectLocked ? 'Scollega dall’oggetto' : 'Nessun oggetto'}</option>
          {objectOptions
            .filter((o) => !objectLocked || o.key === refKey(initObject))
            .map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
        </>,
        objectLocked ? 'Per spostare il costo su un altro oggetto, scollegalo e salva; poi collegalo al nuovo oggetto.' : undefined,
        !objectLocked ? moreButton(catalog, 'Carica altri oggetti nell’elenco') : null,
      )}
      {expense?.objectLink.state === 'unavailable' && objectChoice === null && <p className={act.meta}>L’oggetto collegato non è più disponibile per il tuo account: resta collegato finché non scegli diversamente.</p>}

      {select(
        'work',
        'Lavoro (facoltativo)',
        effWork,
        (v) => setWorkChoice(v),
        <>
          <option value="">Nessun lavoro</option>
          {workOptions.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </>,
        'Un costo appartiene al massimo a un lavoro. Si propongono solo i lavori attivi.',
        <>
          {moreButton(works, 'Carica altri lavori nell’elenco')}
          <Link to={workPath(home.id)} className={styles.preview}>
            Gestisci i lavori
          </Link>
        </>,
      )}

      {select(
        'doc',
        'Documento (facoltativo)',
        effDoc,
        (v) => setDocChoice(v),
        <>
          <option value="">Nessun documento</option>
          {docOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </>,
        undefined,
        moreButton(documents, 'Carica altri documenti nell’elenco'),
      )}
      {presets.documentId && presetDoc.isError && <Banner tone="warning"><p>Il documento indicato non è leggibile dal tuo account: il costo non verrà collegato a quel documento.</p></Banner>}
      {presets.object && (presetObj.isError || (presetObj.isSuccess && !presetObjOk)) && <Banner tone="warning"><p>L’oggetto indicato non è disponibile o è archiviato: il costo non verrà collegato.</p></Banner>}
      {presets.workId && (presetWork.isError || (presetWork.isSuccess && !presetWorkOk)) && <Banner tone="warning"><p>Il lavoro indicato non è disponibile o è archiviato: nuove assegnazioni richiedono un lavoro attivo.</p></Banner>}

      {isUtility(category)&&<Field id={`${id}-documentNumber`} label="Numero del documento" autoComplete="off" value={documentNumber} disabled={disabled} onChange={(e) => setDocumentNumber(e.target.value)} error={errors.documentNumber} />}
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={errors.note} disabled={disabled} label="Nota (facoltativa)" />

      </details>

      <details className={styles.details} open={isUtility(category) || !!(expense && (expense.supplier || expense.documentNumber || expense.documentDate || expense.competenceFrom || expense.dueOn)) || !!(errors.supplier || errors.documentNumber || errors.documentDate || errors.competence || errors.dueOn)}>
        <summary>{isUtility(category)?'Emissione e scadenza':'Dettagli aggiuntivi (facoltativi)'}</summary>
        {!isUtility(category)&&<Field id={`${id}-supplier`} label="Fornitore" autoComplete="off" value={supplier} disabled={disabled} onChange={(e) => setSupplier(e.target.value)} error={errors.supplier} />}
{!isUtility(category)&&<Field id={`${id}-documentNumber`} label="Numero del documento" autoComplete="off" value={documentNumber} disabled={disabled} onChange={(e) => setDocumentNumber(e.target.value)} error={errors.documentNumber} />}
        {dateField('documentDate', 'Data di emissione', documentDate, setDocumentDate)}
        {err('documentDate')}
        {!isUtility(category)&&<>
        <fieldset className={ui.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={ui.label}>Periodo di riferimento</legend>
          <span className={ui.hint}>Per le bollette questo periodo determina il mese nei riepiloghi. Un intervallo di più mesi è contato una sola volta nel mese iniziale.</span>
          <div className={styles.range}>
            {dateField('competence', 'Dal', competenceFrom, setCompetenceFrom)}
            {dateField('competenceTo', 'Al', competenceTo, setCompetenceTo, 'competence')}
          </div>
          {err('competence')}
        </fieldset></>}
        {dateField('dueOn', 'Scadenza indicata', dueOn, setDueOn)}
        {err('dueOn')}
        <p className={act.meta}>La scadenza non indica che la bolletta sia stata pagata e non crea un promemoria.</p>
      </details>

      {nothing && (
        <Banner role="status">
          <p>Nessuna modifica da salvare.</p>
        </Banner>
      )}
      <EconomyFeedback op={op} homeId={home.id} title={expense ? 'Modifica non salvata' : 'Costo non registrato'} onRetry={() => op.retry((res) => 'expense' in res && props.onDone(res.expense))} />
      <div className={act.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending || checkingPresets}>
            {op.mutation.isPending ? 'Salvataggio…' : expense ? 'Salva modifiche' : 'Registra spesa'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={disabled}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export { formatCents };
