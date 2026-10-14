import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ExpenseFilters, ExpenseSummary, Home } from '../api/types';
import { Icon } from '../components/Icon';
import { ErrorState, Loading, cx, ui, useDocumentTitle } from '../components/ui';
import { ExpenseForm, ExpenseRow, expenseOwn as own, expensePath, expenseStyles as styles } from '../expenses/components';
import { useExpenseCapabilities, useExpenseSummary, useExpenses, useForgetExpenses } from '../expenses/hooks';
import { formatCalendarDate } from '../lib/activities';
import { expenseErrorMessage, formatCents, isForbidden } from '../lib/expenses';
import { isApiError } from '../api/errors';
import { useAccount } from '../session/session';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

const STATE_OPTIONS: Array<{ value: ExpenseFilters['state']; label: string }> = [
  { value: 'active', label: 'Attive' },
  { value: 'archived', label: 'Archiviate' },
  { value: 'all', label: 'Tutte' },
];

const SOURCE_OPTIONS: Array<{ value: ExpenseFilters['source']; label: string }> = [
  { value: 'all', label: 'Tutte le origini' },
  { value: 'manual', label: 'Inserite da te' },
  { value: 'document', label: 'Collegate a un documento' },
];

/**
 * Filtri dall'indirizzo: solo anno, stato e origine, validati (valori sconosciuti →
 * default). Mai importi, note o chiavi nell'URL.
 */
export function filtersFromParams(params: URLSearchParams): ExpenseFilters {
  const year = params.get('anno');
  const state = params.get('stato');
  const source = params.get('origine');
  return {
    year: year && /^\d{4}$/.test(year) && year !== '0000' ? year : null,
    state: STATE_OPTIONS.some((o) => o.value === state) ? (state as ExpenseFilters['state']) : 'active',
    source: SOURCE_OPTIONS.some((o) => o.value === source) ? (source as ExpenseFilters['source']) : 'all',
  };
}

function filtersToParams(f: ExpenseFilters) {
  const p = new URLSearchParams();
  if (f.year) p.set('anno', f.year);
  if (f.state !== 'active') p.set('stato', f.state);
  if (f.source !== 'all') p.set('origine', f.source);
  return p;
}

const isDefault = (f: ExpenseFilters) => !f.year && f.state === 'active' && f.source === 'all';

export function ExpensesPage() {
  const home = useCurrentHome();
  useDocumentTitle(`Spese · ${home.name}`);
  const capabilities = useExpenseCapabilities(home.id);
  const forget = useForgetExpenses(home.id);
  const forbidden = capabilities.isError && isForbidden(capabilities.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);

  const heading = (
    <div className={pages.heading}>
      <div>
        <span className={pages.eyebrow}>{home.name}</span>
        <h1 tabIndex={-1}>Le tue spese della casa</h1>
        <p className={pages.lead}>
          Costi registrati da te, manuali o collegati a un documento. Visibili solo a te: non sono pagamenti, incassi o
          stime, e non sono la contabilità della casa.
        </p>
      </div>
    </div>
  );

  if (capabilities.isPending) {
    return (
      <>
        {heading}
        <Loading label="Verifica del servizio spese…" />
      </>
    );
  }
  if (capabilities.isError) {
    const notActive = isApiError(capabilities.error) && capabilities.error.kind === 'http' && capabilities.error.status === 404;
    return (
      <>
        {heading}
        {notActive ? (
          <div className={cx(ui.card, pages.unavailable)}>
            <h2 className={pages.cardTitle}>Spese non ancora attive</h2>
            <p className={pages.muted}>
              Le spese non sono ancora attive su questo servizio: qui non viene mostrato né salvato alcun dato, e nessun
              totale è calcolato.
            </p>
          </div>
        ) : (
          <ErrorState
            title="Spese non disponibili"
            error={capabilities.error}
            message={expenseErrorMessage(capabilities.error)}
            onRetry={() => void capabilities.refetch()}
            retrying={capabilities.isFetching}
          />
        )}
      </>
    );
  }
  return (
    <>
      {heading}
      <ExpensesContent home={home} today={capabilities.data.today} capabilities={capabilities.data} />
    </>
  );
}

function ExpensesContent(props: { home: Home; today: string; capabilities: NonNullable<ReturnType<typeof useExpenseCapabilities>['data']> }) {
  const { home, today } = props;
  const account = useAccount();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const creating = params.get('nuova-spesa') === '1';
  const presetDocumentId = params.get('documentId');
  const presetAssetId = params.get('assetId');
  const canEdit = home.permissions.includes('edit');
  const summaryYear = filters.year ?? today.slice(0, 4);
  const currentYear = Number(today.slice(0, 4));
  const [choosingYear, setChoosingYear] = useState(false);
  const [yearDraft, setYearDraft] = useState('');
  const [yearError, setYearError] = useState<string>();
  const yearSelect = useRef<HTMLSelectElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (choosingYear) yearInput.current?.focus(); }, [choosingYear]);
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i).padStart(4, '0'));
  if (filters.year && !years.includes(filters.year)) years.push(filters.year);

  const setFilters = (next: ExpenseFilters) => setParams(filtersToParams(next));
  const closeForm = () => {
    const next = new URLSearchParams(params);
    next.delete('nuova-spesa');
    next.delete('documentId');
    next.delete('assetId');
    setParams(next, { replace: true });
  };
  const returnState = { expensesSearch: filtersToParams(filters).toString(), expensesAccountId: account.id };

  return (
    <div className={pages.stack}>
      <YearSummary home={home} year={summaryYear} />

      {canEdit && !creating && (
        <p className={styles.actions}>
          <button
            type="button"
            className={cx(ui.btn, ui.primary)}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('nuova-spesa', '1');
              setParams(next);
            }}
          >
            <Icon name="plus" />
            Aggiungi spesa
          </button>
        </p>
      )}
      {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare le tue spese già registrate, non aggiungerne o modificarle.</p>}

      {canEdit && creating && (
        <ExpenseForm
          key={`${presetDocumentId ?? '-'}:${presetAssetId ?? '-'}`}
          home={home}
          capabilities={props.capabilities}
          presetDocumentId={presetDocumentId}
          presetAssetId={presetAssetId}
          onCancel={closeForm}
          onDone={(res) => navigate(expensePath(home.id, res.expense.id), { state: returnState })}
        />
      )}

      <section className={ui.card} aria-labelledby="spese-elenco">
        <h2 id="spese-elenco" className={pages.cardTitle}>
          Elenco
        </h2>
        <div className={styles.filters} role="group" aria-label="Filtri delle spese">
          <label className={styles.filter}>
            Anno
            <select ref={yearSelect} className={styles.select} value={filters.year ?? ''} onChange={(e) => setFilters({ ...filters, year: e.target.value || null })}>
              <option value="">Tutti gli anni</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filter}>
            Stato
            <select className={styles.select} value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value as ExpenseFilters['state'] })}>
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filter}>
            Origine
            <select className={styles.select} value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value as ExpenseFilters['source'] })}>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className={cx(ui.btn, ui.small)} onClick={() => { setChoosingYear(true); setYearError(undefined); }}>
          Scegli un altro anno
        </button>
        {choosingYear && (
          <form aria-label="Scegli un anno specifico" onSubmit={event => {
            event.preventDefault();
            const year = yearDraft.trim();
            if (!/^\d{4}$/.test(year) || year === '0000') { setYearError('Inserisci un anno a quattro cifre, da 0001 a 9999.'); return; }
            setYearError(undefined); setFilters({ ...filters, year }); setChoosingYear(false); yearSelect.current?.focus();
          }}>
            <label className={styles.filter}>
              Anno specifico
              <input ref={yearInput} className={ui.input} inputMode="numeric" maxLength={4} value={yearDraft} aria-invalid={!!yearError} aria-describedby={yearError ? 'anno-specifico-errore' : undefined} onChange={event => setYearDraft(event.target.value)} />
            </label>
            {yearError && <p id="anno-specifico-errore" role="alert">{yearError}</p>}
            <button type="submit" className={cx(ui.btn, ui.small)}>Mostra anno</button>
          </form>
        )}
        <ExpenseList home={home} filters={filters} returnState={returnState} onReset={() => setFilters({ year: null, state: 'active', source: 'all' })} />
      </section>
      <p className={cx(pages.small, pages.muted)}>
        Oggi è {formatCalendarDate(today)} (Europe/Rome). Rate condominiali, pagamenti, ricorrenze e stime non fanno parte di
        questa versione.
      </p>
    </div>
  );
}

function ExpenseList(props: { home: Home; filters: ExpenseFilters; returnState: unknown; onReset: () => void }) {
  const { home, filters } = props;
  const list = useExpenses(home.id, filters);
  const forget = useForgetExpenses(home.id);
  const forbidden = list.isError && isForbidden(list.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  if (list.isPending) return <Loading label="Caricamento delle spese…" />;
  if (forbidden || (list.isError && !list.data)) {
    return (
      <ErrorState
        title="Spese non disponibili"
        error={list.error}
        message={expenseErrorMessage(list.error)}
        onRetry={forbidden ? undefined : () => void list.refetch()}
        retrying={list.isFetching}
      />
    );
  }
  if (items.length === 0) {
    if (isDefault(filters)) {
      return <p className={pages.muted}>Non hai ancora registrato spese attive in questa casa.</p>;
    }
    return (
      <div role="status">
        <p className={pages.muted}>
          {filters.year ? `Nessuna spesa nel ${filters.year} con questi filtri.` : 'Nessuna spesa con questi filtri.'}
        </p>
        <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onReset}>
          Mostra le spese attive di tutti gli anni
        </button>
      </div>
    );
  }
  return (
    <>
      <ul className={styles.list} aria-label="Spese">
        {items.map((e) => (
          <ExpenseRow key={e.id} expense={e} homeId={home.id} state={props.returnState} />
        ))}
      </ul>
      {list.isFetchNextPageError && (
        <ErrorState title="Altre spese non caricate" error={list.error} message={expenseErrorMessage(list.error)} />
      )}
      {list.hasNextPage && (
        <p className={pages.spaced}>
          <button type="button" className={ui.btn} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? 'Caricamento…' : 'Mostra altre spese'}
          </button>
        </p>
      )}
    </>
  );
}

export function SummaryTotals({ data }: { data: ExpenseSummary }) {
  return (
    <div className={own.totals} aria-label={`Totali del ${data.year}`}>
      <span className={own.total}>
        <span className={own.totalLabel}>Inserite da te ({data.counts.manual})</span>
        <span className={own.totalValue}>{formatCents(data.totalsCents.manual)}</span>
      </span>
      <span className={own.total}>
        <span className={own.totalLabel}>Collegate a un documento ({data.counts.document})</span>
        <span className={own.totalValue}>{formatCents(data.totalsCents.document)}</span>
      </span>
      <span className={cx(own.total, own.combined)}>
        <span className={own.totalLabel}>Totale registrato</span>
        <span className={own.totalValue}>{formatCents(data.totalCents)}</span>
      </span>
    </div>
  );
}

/** Riepilogo annuo dal server: sole spese attive; un errore non diventa mai un totale zero. */
function YearSummary({ home, year }: { home: Home; year: string }) {
  const summary = useExpenseSummary(home.id, year);
  return (
    <section className={ui.card} aria-labelledby="spese-riepilogo">
      <h2 id="spese-riepilogo" className={pages.cardTitle}>
        Costi registrati da te nel {year}
      </h2>
      {summary.isPending ? (
        <Loading label="Calcolo del riepilogo…" />
      ) : summary.isError ? (
        <ErrorState
          title="Riepilogo non disponibile"
          error={summary.error}
          message={expenseErrorMessage(summary.error)}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : (
        <>
          <SummaryTotals data={summary.data} />
          <p className={cx(pages.small, pages.muted)}>
            Calcolato dal servizio sulle sole spese attive. Non è un estratto conto, un debito o il valore della casa.
          </p>
        </>
      )}
    </section>
  );
}

/** Link «Tutte le spese» con i filtri salvati nello stato, solo se dello stesso account. */
export function backToExpenses(homeId: string, state: unknown, accountId: string) {
  const saved = state as { expensesSearch?: unknown; expensesAccountId?: unknown } | null;
  if (saved?.expensesAccountId !== accountId || typeof saved.expensesSearch !== 'string') return expensePath(homeId);
  const query = filtersToParams(filtersFromParams(new URLSearchParams(saved.expensesSearch))).toString();
  return `${expensePath(homeId)}${query ? `?${query}` : ''}`;
}
