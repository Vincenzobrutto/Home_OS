import {expenseDocumentReturn} from '../lib/expenseDocumentReturn';
import {expenseReferenceDate} from '../lib/billPeriod';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { formatCalendarDate } from '../lib/activities';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import type { EconomyCapabilities, Family } from '../api/economyTypes';
import type { Home } from '../api/types';
import act from '../activities/activities.module.css';
import { Icon } from '../components/Icon';
import { Banner, ErrorState, Loading, cx, ui, useDocumentTitle } from '../components/ui';
import {
  ComparisonCard,
  Distribution,
  EconomyExpenseForm,
  EconomyExpenseRow,
  TotalCard,
  economyExpensePath,
  economyStyles as styles,
  objectHref,
  workPath,
  type ExpensePresets,
  type Slice,
} from '../economy/components';
import { useEconomyCapabilities, useEconomyExpenses, useEconomySummary, useForgetEconomy, useWorks } from '../economy/hooks';
import {
  VIEWS,
  categoryFitsFamily,
  categoryLabel,
  economyErrorMessage,
  familyLabel,
  filtersFromParams,
  filtersToParams,
  formatCentsString,
  hasListFilters,
  isForbiddenError,
  isNotActiveError,
  isUuid,
  periodText,
  type CategoryFilter,
  type EconomyFilters,
  type SpeseView,
} from '../lib/economy';
import { isValidCalendarDate } from '../lib/activities';
import { useCatalog, useRooms } from '../objects/hooks';
import { useAccount } from '../session/session';
import { LegacyExpensesPage } from './ExpensesPage';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

/** Stato di navigazione privato: ricerca e ritorno alla panoramica, legati all'account. */
type NavState = { accountId?: string; economyQ?: string; overview?: string; returnTo?: { path: string; label: string }; expenseRestore?: {id:string;y:number;pages:number} } | null;

const viewKey = (accountId: string, homeId: string) => `dimora.v5.spese.vista:${accountId}:${homeId}`;

function storedView(accountId: string, homeId: string): SpeseView | null {
  try {
    const v = globalThis.sessionStorage?.getItem(viewKey(accountId, homeId));
    return VIEWS.some((x) => x.value === v) ? (v as SpeseView) : null;
  } catch {
    return null;
  }
}

function storeView(accountId: string, homeId: string, view: SpeseView) {
  try {
    globalThis.sessionStorage?.setItem(viewKey(accountId, homeId), view);
  } catch {
    // Archiviazione di sessione non disponibile: la vista resta quella dell'indirizzo.
  }
}

/**
 * Spese: un unico ingresso. Con economy-v1 attivo si usa lo storico S1 (capabilities
 * autoritative); se il servizio non lo espone (404) resta la pagina H3a, senza simulazioni.
 */
export function ExpensesPage() {
  const home = useCurrentHome();
  const caps = useEconomyCapabilities(home.id);
  const forget = useForgetEconomy(home.id);
  const forbidden = caps.isError && isForbiddenError(caps.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403
  }, [forbidden]);

  if (caps.isPending) {
    return (
      <>
        <SpeseHeading home={home} />
        <Loading label="Verifica dello storico spese…" />
      </>
    );
  }
  if (caps.isError) {
    if (isNotActiveError(caps.error)) return <LegacyExpensesPage />;
    return (
      <>
        <SpeseHeading home={home} />
        <ErrorState
          title={forbidden ? 'Spese non accessibili' : 'Spese non disponibili'}
          error={caps.error}
          message={economyErrorMessage(caps.error)}
          onRetry={forbidden ? undefined : () => void caps.refetch()}
          retrying={caps.isFetching}
        />
      </>
    );
  }
  if (!caps.data.enabled || !caps.data.features.history) return <LegacyExpensesPage />;
  return <EconomySpese home={home} caps={caps.data} />;
}

function SpeseHeading({ home,actions }: { home: Home;actions?:ReactNode }) {
  useDocumentTitle(`Spese · ${home.name}`);
  return (
    <div className={cx(pages.heading,styles.header)}>
      <div>
        <Link to={`/home/${encodeURIComponent(home.id)}/casa`}>← Torna alla Casa</Link><p className={pages.eyebrow}>{home.name}</p>
        <h1 tabIndex={-1}>Spese</h1>
        <p className={pages.lead}>I costi registrati da te, visibili solo a te.</p>
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </div>
  );
}

function EconomySpese({ home, caps }: { home: Home; caps: EconomyCapabilities }) {
  const account = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [entryOpen,setEntryOpen] = useState(false);
  const nav = (location.state as NavState) ?? null;
  const sameAccount = nav?.accountId === account.id;
  const q = sameAccount && typeof nav?.economyQ === 'string' ? nav.economyQ : '';
  const filters = useMemo<EconomyFilters>(() => ({ ...filtersFromParams(params), q }), [params, q]);
  const canEdit = home.permissions.includes('edit');

  // Vista: indirizzo → filtri verso l'elenco → scelta conservata per account/casa → Panoramica.
  const viewParam = params.get('vista');
  const view: SpeseView = VIEWS.some((v) => v.value === viewParam)
    ? (viewParam as SpeseView)
    : hasListFilters(filters)
      ? 'elenco'
      : (storedView(account.id, home.id) ?? 'elenco');
  const split = params.get('per') === 'categorie' ? 'category' : 'family';
  const creating = params.get('nuova-spesa') === '1';

  const go = (next: EconomyFilters, opts: { view?: SpeseView; split?: 'family' | 'category'; state?: NavState; replace?: boolean } = {}) => {
    const v = opts.view ?? view;
    const p = filtersToParams(next, { view: v, split: (opts.split ?? split) === 'category' && !next.family ? 'categorie' : null });
    setParams(p, { replace: opts.replace, state: { accountId: account.id, economyQ: next.q, ...(opts.state ?? {}) } });
  };
  const setView = (v: SpeseView) => {
    storeView(account.id, home.id, v);
    go(filters, { view: v });
  };

  const summary = useEconomySummary(home.id, filters);
  const forget = useForgetEconomy(home.id);
  const summaryForbidden = summary.isError && isForbiddenError(summary.error);
  useEffect(() => {
    if (summaryForbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403
  }, [summaryForbidden]);

  const backButton = useRef<HTMLButtonElement>(null);
  const focusTarget = useRef<'distribution' | 'back' | null>(null);
  useEffect(() => {
    if (focusTarget.current === 'distribution') document.getElementById('spese-distribuzione')?.focus();
    if (focusTarget.current === 'back') backButton.current?.focus();
    focusTarget.current = null;
  });

  // Ritorno alla panoramica: periodo e filtri di partenza conservati.
  const overview = sameAccount && typeof nav?.overview === 'string' ? nav.overview : null;
  const pick = (s: Slice) => {
    const next: EconomyFilters =
      s.kind === 'family'
        ? { ...filters, family: s.code as Family, category: filters.category && categoryFitsFamily(filters.category, s.code as Family, caps) ? filters.category : null }
        : { ...filters, category: (s.code ?? 'unclassified') as CategoryFilter };
    focusTarget.current = 'back';
    go(next, { view: 'elenco', state: { overview: params.toString() } });
  };
  const backToOverview = () => {
    focusTarget.current = 'distribution';
    const p = new URLSearchParams(overview ?? '');
    p.set('vista', 'panoramica');
    setParams(p, { state: { accountId: account.id, economyQ: filters.q } });
  };

  const documentOrigin=expenseDocumentReturn(location.state,account.id,home.id);
  const returnTo = sameAccount && nav?.returnTo && nav.returnTo.path.startsWith(`/home/${encodeURIComponent(home.id)}/`) ? nav.returnTo : null;
  const presets: ExpensePresets = {
    documentId: isUuid(params.get('documentId')) ? params.get('documentId') : null,
    object: (() => {
      const assetId = params.get('assetId');
      if (isUuid(assetId)) return { kind: 'boiler' as const, id: assetId };
      const [kind, id] = (params.get('perOggetto') ?? '').split(':');
      return (kind === 'object' || kind === 'boiler') && isUuid(id) ? { kind, id } : null;
    })(),
    workId: isUuid(params.get('perLavoro')) ? params.get('perLavoro') : null,
  };
  const startCreating = (fromDocument = false) => {
    const p = new URLSearchParams(params);
    p.set('nuova-spesa', '1');
    if (fromDocument) p.set('daDocumento', '1');
    setParams(p, { state: location.state });
  };
  const closeForm = () => {
    if(documentOrigin){navigate(documentOrigin.path,{state:documentOrigin.state});return;}
    if (returnTo) {
      navigate(returnTo.path);
      return;
    }
    const p = new URLSearchParams(params);
    for (const k of ['nuova-spesa', 'daDocumento', 'documentId', 'assetId', 'perOggetto', 'perLavoro']) p.delete(k);
    setParams(p, { replace: true, state: location.state });
  };
  const listState = { accountId: account.id, economyQ: filters.q, expensesSearch: filtersToParams(filters, { view, split: split === 'category' && !filters.family ? 'categorie' : null }).toString() };

  const distribution = !summary.isError && summary.data ? (<Distribution
              summary={summary.data}
              caps={caps}
              mode={filters.family ? 'category' : split}
              family={filters.family}
              onModeChange={(m) => {
                go(filters, { split: m, replace: true });
              }}
              onAllFamilies={() => {
                focusTarget.current = 'distribution';
                go({ ...filters, family: null, category: null });
              }}
              onPick={pick}
            />) : null;

  return (
    <>
      <SpeseHeading home={home} actions={<>
        {canEdit && !creating && (
          <p className={act.actions}>
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => startCreating()}>
              <Icon name="plus" />
              Registra una spesa
            </button>
            <button type="button" className={ui.btn} aria-label="Modalità di registrazione" aria-expanded={entryOpen} onClick={()=>setEntryOpen(v=>!v)}>Altre modalità</button>
            {entryOpen && <button type="button" className={ui.btn} onClick={()=>{setEntryOpen(false);startCreating();}}>Inserisci a mano</button>}
            {entryOpen && (caps.features.documentDrafts ? (
              <Link to={`/home/${encodeURIComponent(home.id)}/spese/da-documento`} state={listState} className={ui.btn}>
                Da documento
              </Link>
            ) : (
              <button type="button" className={ui.btn} onClick={() => startCreating(true)}>
                Da documento
              </button>
            ))}
            <Link to={workPath(home.id)} className={ui.btn}>
              Lavori
            </Link>
          </p>
        )}
        {caps.features.documentDrafts && !creating && (
          <p>
            <Link to={`/home/${encodeURIComponent(home.id)}/spese/bozze`} state={listState}>
              Bozze da confermare e accantonate
            </Link>
          </p>
        )}
      </>}/>
      <div className={cx(pages.stack, styles.workspace)}>
        {!canEdit && <p className={pages.muted}>Con il tuo ruolo puoi consultare i tuoi costi già registrati, non aggiungerne o modificarli.</p>}

        {canEdit && creating && (
          <>
            {params.get('daDocumento') === '1' && (
              <Banner role="status" title="Compilazione assistita non ancora disponibile">
                <p>
                  {!caps.features.documentDrafts
                    ? 'Il servizio non propone ancora i dati da un documento.'
                    : caps.analysis.providers.some((p) => p.enabled && !p.isSimulation)
                      ? 'La proposta dei dati da un documento non è ancora collegata a questa pagina.'
                      : 'Il servizio offre per ora solo una simulazione di prova su documenti sintetici, che questa pagina non usa.'}{' '}
                  Puoi registrare il costo a mano e collegare il documento: nessun dato viene letto o inventato.
                </p>
              </Banner>
            )}
            <EconomyExpenseForm
              key={`${presets.documentId ?? '-'}:${presets.object?.id ?? '-'}:${presets.workId ?? '-'}`}
              home={home}
              caps={caps}
              presets={presets}
              onCancel={closeForm}
              onDone={(expense) =>
                returnTo ? navigate(returnTo.path) : navigate(economyExpensePath(home.id, expense.id), { state: documentOrigin?location.state:listState })
              }
            />
            {returnTo && <p className={pages.muted}>Dopo il salvataggio torni a «{returnTo.label}».</p>}
          </>
        )}

        <div className={styles.hero}>
        {summary.isPending ? (
          <Loading label="Calcolo del riepilogo…" />
        ) : summary.isError ? (
          <ErrorState
            title={summaryForbidden ? 'Costi non accessibili' : 'Riepilogo non disponibile'}
            error={summary.error}
            message={economyErrorMessage(summary.error)}
            onRetry={summaryForbidden ? undefined : () => void summary.refetch()}
            retrying={summary.isFetching}
          />
        ) : (
          <TotalCard summary={summary.data} caps={caps} family={filters.family} showWithoutFinancing={!filters.family && !filters.category} />
        )}

        <PeriodSelect filters={filters} caps={caps} summaryPeriod={summary.data ? periodText(summary.data.period, summary.data.today) : null} onChange={(period) => go({ ...filters, period })} />
        </div>
        <details className={styles.dateHelp}><summary>Come vengono conteggiate le date?</summary><p>Bollette per mese fattura, se indicato; altrimenti per periodo dei servizi. Emissione e scadenza restano separate. Gli intervalli di più mesi sono conteggiati una volta nel mese iniziale. Senza periodo vale la data registrata, finché lo completi. I costi registrati non certificano un pagamento.</p></details>
        <div className="expense-tabs" role="group" aria-label="Viste delle spese">
          <button type="button" aria-pressed={['elenco','oggetti','lavori'].includes(view)} onClick={()=>setView('elenco')}>Registrazioni</button>
          <button type="button" aria-pressed={['panoramica','riepilogo'].includes(view)} onClick={()=>setView('panoramica')}>Riepilogo</button>
        </div>
        <ExpenseSearch key={`${account.id}:${home.id}:${q}`} value={q} onSearch={value=>go({...filters,q:value})}/>
        {filters.period.kind === 'range' || params.get('periodo') === 'intervallo' ? (
          <RangeForm filters={filters} onApply={(from, to) => go({ ...filters, period: { kind: 'range', from, to } })} />
        ) : null}

        <FiltersBox home={home} caps={caps} filters={filters} view={view} onApply={(next,nextView) => go(next,{view:nextView})} />

        <div className={styles.board}>
        {(view === 'panoramica' || view === 'elenco') && !summary.isError && summary.data && (
          <>
            {view === 'panoramica' && distribution}
            {view === 'panoramica' && <ComparisonCard summary={summary.data} />}
            {view === 'panoramica' && <RecentCard home={home} caps={caps} filters={filters} count={summary.data.count} state={listState} onAll={() => go(filters, { view: 'elenco', state: { overview: params.toString() } })} />}
          </>
        )}

        {view === 'elenco' && (
          <section className={ui.card} aria-labelledby="spese-elenco">
            {/* La panoramica di partenza può essere l'indirizzo senza parametri (stringa vuota). */}
            {overview !== null && (
              <button ref={backButton} type="button" className={styles.linkButton} onClick={backToOverview}>
                ← Torna alla panoramica
              </button>
            )}
            <h2 id="spese-elenco" tabIndex={-1} className={pages.cardTitle}>
              Elenco{filters.family ? ` · ${familyLabel(filters.family, caps)}` : ''}
              {filters.category ? ` · ${filters.category === 'unclassified' ? 'Non classificata' : categoryLabel(filters.category, caps)}` : ''}
            </h2>
            <ExpenseList home={home} caps={caps} filters={filters} state={listState} restoreReady={!summary.isPending} />
          </section>
        )}

        {view === 'elenco' && distribution}
        {view === 'oggetti' && <ByObject home={home} caps={caps} filters={filters} state={listState} onChoose={(object) => go({ ...filters, object })} />}
        {view === 'lavori' && <ByWork home={home} caps={caps} filters={filters} state={listState} onChoose={(workId) => go({ ...filters, workId })} />}
        {view === 'riepilogo' && summary.data && <Summary summary={summary.data} caps={caps} />}

        </div>
        <p className={cx(pages.small, pages.muted)}>
          Oggi è {formatCalendarDate(caps.today)}. Pagamenti, ricorrenze, budget e previsioni non fanno parte di questa versione.
        </p>
      </div>
    </>
  );
}

function ExpenseSearch({value,onSearch}:{value:string;onSearch:(q:string)=>void}){
  const [text,setText]=useState(value);

  return <form role="search" aria-label="Ricerca spese" className="expense-search" onSubmit={e=>{e.preventDefault();onSearch(text.trim());}}><label>Cerca in descrizione o fornitore<input type="search" className={ui.input} maxLength={120} value={text} onChange={e=>setText(e.target.value)}/></label><button type="submit" className={ui.btn}>Cerca</button>{value && <button type="button" className={ui.btn} onClick={()=>{setText('');onSearch('');}}>Cancella ricerca</button>}</form>;
}

function PeriodSelect(props: { filters: EconomyFilters; caps: EconomyCapabilities; summaryPeriod: string | null; onChange: (p: EconomyFilters['period']) => void }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const current = Number(props.caps.today.slice(0, 4));
  const years = Array.from({ length: 10 }, (_, i) => String(current - i).padStart(4, '0'));
  const p = props.filters.period;
  if (p.kind === 'year' && !years.includes(p.year)) years.push(p.year);
  const value = p.kind === 'default' ? '' : p.kind === 'year' ? p.year : 'range';
  return (
    <label>
      Periodo
      <select
        className={act.select}
        value={params.get('periodo') === 'intervallo' && p.kind !== 'range' ? 'range' : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'range') {
            const next = new URLSearchParams(params);
            next.set('periodo', 'intervallo');
            setParams(next, { state: location.state });
          } else props.onChange(v ? { kind: 'year', year: v } : { kind: 'default' });
        }}
      >
        <option value="">Anno in corso{props.summaryPeriod && p.kind === 'default' ? ` (${props.summaryPeriod})` : ''}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
        <option value="range">Intervallo di date…</option>
      </select>
    </label>
  );
}

function RangeForm(props: { filters: EconomyFilters; onApply: (from: string, to: string) => void }) {
  const p = props.filters.period;
  const [from, setFrom] = useState(p.kind === 'range' ? p.from : '');
  const [to, setTo] = useState(p.kind === 'range' ? p.to : '');
  const [error, setError] = useState<string>();
  return (
    <form
      className={styles.range}
      aria-label="Intervallo di date"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValidCalendarDate(from) || !isValidCalendarDate(to)) return setError('Indica due date valide.');
        if (from > to) return setError('La data iniziale non può essere successiva a quella finale.');
        setError(undefined);
        props.onApply(from, to);
      }}
    >
      <label>
        Dal
        <input className={ui.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label>
        Al
        <input className={ui.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <button type="submit" className={cx(ui.btn, ui.small)}>
        Applica intervallo
      </button>
      {error && (
        <p role="alert" className={ui.fieldError}>
          {error}
        </p>
      )}
    </form>
  );
}

function FiltersBox(props: { home: Home; caps: EconomyCapabilities; filters: EconomyFilters; view: SpeseView; onApply: (f: EconomyFilters, view?:SpeseView) => void }) {
  const { home, caps, filters } = props;
  const panelRef=useRef<HTMLDetailsElement>(null);
  const apply=(next:EconomyFilters,nextView=props.view)=>{props.onApply(next,nextView);if(panelRef.current){panelRef.current.open=false;panelRef.current.querySelector('summary')?.focus();}};
  const [draft, setDraft] = useState(filters);
  const [syncedFrom, setSyncedFrom] = useState(filters);
  if (syncedFrom !== filters) {
    setSyncedFrom(filters);
    setDraft(filters);
  }
  const catalog = useCatalog(home.id, { state: 'all', q: '', type: null, roomId: null, placement: 'all' });
  const rooms = useRooms(home.id, { state: 'all' });
  const works = useWorks(home.id, { state: 'all', q: '' });
  const objects = catalog.data?.pages.flatMap((p) => p.items) ?? [];
  const roomList = rooms.data?.pages.flatMap((p) => p.items) ?? [];
  const workList = works.data?.pages.flatMap((p) => p.items) ?? [];
  const chips:Array<{label:string;clear:Partial<EconomyFilters>}>=[
   ...(filters.family?[{label:familyLabel(filters.family,caps),clear:{family:null}}]:[]),
   ...(filters.category?[{label:filters.category==='unclassified'?'Non classificata':categoryLabel(filters.category,caps),clear:{category:null}}]:[]),
   ...(filters.object?[{label:'Oggetto: '+(objects.find(o=>o.ref.id===filters.object!.id)?.name??'selezionato'),clear:{object:null}}]:[]),
   ...(filters.roomId?[{label:'Ambiente: '+(roomList.find(r=>r.id===filters.roomId)?.name??'selezionato'),clear:{roomId:null}}]:[]),
   ...(filters.workId?[{label:'Lavoro: '+(workList.find(w=>w.id===filters.workId)?.name??'selezionato'),clear:{workId:null}}]:[]),
   ...(filters.documentId?[{label:'Documento collegato',clear:{documentId:null}}]:[]),
   ...(filters.source!=='all'?[{label:filters.source==='manual'?'Inserite da te':'Da documento',clear:{source:'all' as const}}]:[]),
   ...(filters.state!=='active'?[{label:filters.state==='archived'?'Archiviate':'Tutti gli stati',clear:{state:'active' as const}}]:[]),
  ];
  const active = chips.length;
  const cats = caps.categories.filter((c) => !draft.family || c.possibleFamilies.includes(draft.family));
  const objKey = draft.object ? `${draft.object.kind}:${draft.object.id}` : '';
  const more = (q: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }, label: string) =>
    q.hasNextPage ? (
      <button type="button" className={cx(ui.btn, ui.small)} disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
        {label}
      </button>
    ) : null;
  return (
    <div>
    <div className={styles.quickFilters}>
          <label>Tipo di spesa<select className={act.select} value={filters.family??''} onChange={e=>{const family=(e.target.value||null) as Family|null;props.onApply({...filters,family,category:family&&filters.category&&!categoryFitsFamily(filters.category,family,caps)?null:filters.category});}}><option value="">Tutte</option>{caps.families.map(f=><option key={f.code} value={f.code}>{f.label}</option>)}</select></label>
          <label>Raggruppa<select className={act.select} value={props.view} onChange={e=>props.onApply(filters,e.target.value as SpeseView)}>{VIEWS.filter(v=>['panoramica','riepilogo'].includes(props.view)?['panoramica','riepilogo'].includes(v.value):['elenco','oggetti','lavori'].includes(v.value)).map(v=><option key={v.value} value={v.value}>{v.value==='elenco'?'Mese di riferimento':v.value==='panoramica'?'Distribuzione e confronto':v.label}</option>)}</select></label>
    </div>
    <details ref={panelRef} className={cx(ui.card, styles.filtersBox)}>
      <summary>Filtri{active ? ` · ${active} attiv${active === 1 ? 'o' : 'i'}` : ''}</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply(draft);
        }}
      >
        <div className={styles.filterGrid}>

          <label>
            Categoria
            <select className={act.select} value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: (e.target.value || null) as CategoryFilter | null })}>
              <option value="">Tutte le categorie</option>
              {(!draft.family || draft.family === 'unclassified') && <option value="unclassified">Non classificata</option>}
              {cats.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Oggetto
            <select
              className={act.select}
              value={objKey}
              onChange={(e) => {
                const [kind, id] = e.target.value.split(':');
                setDraft({ ...draft, object: (kind === 'object' || kind === 'boiler') && id ? { kind, id } : null });
              }}
            >
              <option value="">Tutti gli oggetti</option>
              {draft.object && !objects.some((o) => o.ref.id === draft.object!.id) && <option value={objKey}>Oggetto scelto</option>}
              {objects.map((o) => (
                <option key={`${o.ref.kind}:${o.ref.id}`} value={`${o.ref.kind}:${o.ref.id}`}>
                  {o.name}
                  {o.state === 'archived' ? ' (archiviato)' : ''}
                </option>
              ))}
            </select>
            {more(catalog, 'Altri oggetti')}
          </label>
          <label>
            Ambiente
            <select className={act.select} value={draft.roomId ?? ''} onChange={(e) => setDraft({ ...draft, roomId: e.target.value || null })}>
              <option value="">Tutti gli ambienti</option>
              {roomList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.note ? ` · ${r.note}` : ''}
                </option>
              ))}
            </select>
            {more(rooms, 'Altri ambienti')}
          </label>
          <label>
            Lavoro
            <select className={act.select} value={draft.workId ?? ''} onChange={(e) => setDraft({ ...draft, workId: e.target.value || null })}>
              <option value="">Tutti i lavori</option>
              {draft.workId && !workList.some((w) => w.id === draft.workId) && <option value={draft.workId}>Lavoro scelto</option>}
              {workList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.state === 'archived' ? ' (archiviato)' : ''}
                </option>
              ))}
            </select>
            {more(works, 'Altri lavori')}
          </label>
          <label>
            Origine
            <select className={act.select} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as EconomyFilters['source'] })}>
              <option value="all">Tutte le origini</option>
              <option value="manual">Inserite da te</option>
              <option value="document">Collegate a un documento</option>
            </select>
          </label>
          {props.view === 'elenco' && (
            <label>
              Stato
              <select className={act.select} value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value as EconomyFilters['state'] })}>
                <option value="active">Attivi</option>
                <option value="archived">Archiviati</option>
                <option value="all">Tutti</option>
              </select>
            </label>
          )}

        </div>
        <p className={act.actions}>
          <button type="submit" className={cx(ui.btn, ui.primary, ui.small)}>
            Applica filtri
          </button>
          <button
            type="button"
            className={cx(ui.btn, ui.small)}
            onClick={() => apply({ ...filters, family:null,category: null, object: null, roomId: null, workId: null, documentId: null, source: 'all', state: 'active' })}
          >
            Azzera filtri
          </button>
        </p>
        <p className={styles.note}>I filtri valgono per totale, grafico, confronto e righe. La ricerca non viene scritta nell’indirizzo.</p>
      </form>
    </details>
    {active>0&&<div className={styles.activeFilters} aria-label="Filtri attivi">{chips.map(chip=><button key={chip.label} type="button" className={ui.btn} aria-label={'Rimuovi filtro '+chip.label} onClick={()=>props.onApply({...filters,...chip.clear})}>{chip.label} ×</button>)}</div>}
    </div>
  );
}

function ExpenseList(props: { home: Home; caps: EconomyCapabilities; filters: EconomyFilters; state: unknown; limit?: number; single?: boolean; restoreReady?:boolean }) {
  const list = useEconomyExpenses(props.home.id, props.filters, { limit: props.limit });
  const forget = useForgetEconomy(props.home.id);
  const forbidden = list.isError && isForbiddenError(list.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403
  }, [forbidden]);
  const account=useAccount();
  const location=useLocation();
  const restored=useRef(false);
  const {data,hasNextPage,isFetchingNextPage,isFetchNextPageError,fetchNextPage}=list;
  useEffect(()=>{
    const state=location.state as NavState;
    const restore=state?.accountId===account.id ? state.expenseRestore : null;
    if(!restore || restored.current || !data || props.restoreReady === false)return;
    if(data.pages.length<restore.pages && hasNextPage && !isFetchNextPageError){if(!isFetchingNextPage)void fetchNextPage();return;}
    const frame=requestAnimationFrame(()=>{restored.current=true;(document.getElementById('expense-'+restore.id)??document.getElementById('spese-elenco'))?.focus({preventScroll:true});window.scrollTo(0,Math.max(0,restore.y));});
    return ()=>cancelAnimationFrame(frame);
  },[location.state,account.id,data,hasNextPage,isFetchingNextPage,isFetchNextPageError,fetchNextPage,props.restoreReady]);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  if (list.isPending) return <Loading label="Caricamento dei costi…" />;
  if (list.isError && !list.data) {
    return <ErrorState title="Costi non disponibili" error={list.error} message={economyErrorMessage(list.error)} onRetry={forbidden ? undefined : () => void list.refetch()} retrying={list.isFetching} />;
  }
  if (items.length === 0) return <p className={pages.muted} role="status">Nessun costo con questi filtri nel periodo scelto.</p>;
  return (
    <>
      <ul className={act.list} aria-label="Costi registrati">
        {items.map((e,i) => [
          (i===0||expenseReferenceDate(e).slice(0,7)!==expenseReferenceDate(items[i-1]!).slice(0,7))?<li role="presentation" key={'month-'+expenseReferenceDate(e).slice(0,7)}><h3>{new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(expenseReferenceDate(e)+'T12:00:00Z'))}</h3></li>:null,
          <EconomyExpenseRow key={e.id} expense={e} homeId={props.home.id} caps={props.caps} state={{...(props.state as object),expensePages:list.data?.pages.length ?? 1}} />
        ])}
      </ul>
      {!props.single && list.isFetchNextPageError && <ErrorState title="Altri costi non caricati" error={list.error} message={economyErrorMessage(list.error)} />}
      {!props.single && list.hasNextPage && (
        <p className={pages.spaced}>
          <button type="button" className={ui.btn} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri costi'}
          </button>
        </p>
      )}
    </>
  );
}

/** Ultime registrazioni: prima pagina della lista filtrata, non un elenco completo. */
function RecentCard(props: { home: Home; caps: EconomyCapabilities; filters: EconomyFilters; count: number; state: unknown; onAll: () => void }) {
  return (
    <section className={ui.card} aria-labelledby="spese-ultime">
      <div className={styles.cardHead}>
        <h2 id="spese-ultime" className={pages.cardTitle}>
          Ultime registrazioni
        </h2>
      </div>
      <ExpenseList home={props.home} caps={props.caps} filters={{ ...props.filters, state: 'active' }} state={props.state} limit={5} single />
      {props.count > 0 && (
        <button type="button" className={styles.linkButton} onClick={props.onAll}>
          {props.count === 1 ? 'Vedi la registrazione' : `Vedi tutte le ${props.count} registrazioni`}
        </button>
      )}
    </section>
  );
}

/**
 * Per oggetto: il servizio non offre un aggregato di tutti gli oggetti. Si sceglie un
 * oggetto e totale/righe arrivano da summary e lista filtrati, mai dalla prima pagina.
 */
function ByObject(props: { home: Home; caps: EconomyCapabilities; filters: EconomyFilters; state: unknown; onChoose: (o: EconomyFilters['object']) => void }) {
  const catalog = useCatalog(props.home.id, { state: 'all', q: '', type: null, roomId: null, placement: 'all' });
  const objects = catalog.data?.pages.flatMap((p) => p.items) ?? [];
  const chosen = props.filters.object;
  return (
    <section className={ui.card} aria-labelledby="spese-oggetti">
      <h2 id="spese-oggetti" className={pages.cardTitle}>
        Per oggetto
      </h2>
      <p className={act.meta}>Scegli un oggetto: totale e righe sopra seguono la scelta, con lo stesso periodo e gli stessi filtri.</p>
      {catalog.isPending ? (
        <Loading label="Caricamento degli oggetti…" />
      ) : catalog.isError ? (
        <ErrorState title="Oggetti non disponibili" error={catalog.error} onRetry={() => void catalog.refetch()} />
      ) : objects.length === 0 ? (
        <p className={pages.muted}>Nessun oggetto nella casa.</p>
      ) : (
        <ul className={act.list} aria-label="Oggetti">
          {objects.map((o) => {
            const selected = chosen?.id === o.ref.id && chosen.kind === o.ref.kind;
            return (
              <li key={`${o.ref.kind}:${o.ref.id}`} className={act.item}>
                <div className={act.itemHead}>
                  <button type="button" className={styles.linkButton} aria-pressed={selected} onClick={() => props.onChoose(selected ? null : o.ref)}>
                    {selected ? `✓ ${o.name}` : o.name}
                  </button>
                  <Link to={objectHref(props.home.id, o.ref)} className={act.meta} style={{ marginLeft: 'auto' }}>
                    Scheda
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {catalog.hasNextPage && (
        <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void catalog.fetchNextPage()} disabled={catalog.isFetchingNextPage}>
          Altri oggetti
        </button>
      )}
      {chosen && (
        <>
          <h3 className={pages.spaced}>Costi dell’oggetto scelto</h3>
          <ExpenseList home={props.home} caps={props.caps} filters={props.filters} state={props.state} />
        </>
      )}
    </section>
  );
}

function ByWork(props: { home: Home; caps: EconomyCapabilities; filters: EconomyFilters; state: unknown; onChoose: (workId: string | null) => void }) {
  const works = useWorks(props.home.id, { state: 'all', q: '' }, props.caps.features.works);
  const items = works.data?.pages.flatMap((p) => p.items) ?? [];
  const chosen = props.filters.workId;
  if (!props.caps.features.works) {
    return (
      <section className={ui.card}>
        <p className={pages.muted}>I lavori non sono attivi su questo servizio.</p>
      </section>
    );
  }
  return (
    <section className={ui.card} aria-labelledby="spese-lavori">
      <h2 id="spese-lavori" className={pages.cardTitle}>
        Per lavoro
      </h2>
      <p className={act.meta}>Un lavoro raggruppa più costi, senza ripartirli fra oggetti. Scegli un lavoro per vederne totale e righe nel periodo.</p>
      {works.isPending ? (
        <Loading label="Caricamento dei lavori…" />
      ) : works.isError ? (
        <ErrorState title="Lavori non disponibili" error={works.error} message={economyErrorMessage(works.error)} onRetry={() => void works.refetch()} />
      ) : items.length === 0 ? (
        <p className={pages.muted}>
          Nessun lavoro. <Link to={workPath(props.home.id)}>Crea un lavoro</Link>
        </p>
      ) : (
        <ul className={act.list} aria-label="Lavori">
          {items.map((w) => {
            const selected = chosen === w.id;
            return (
              <li key={w.id} className={act.item}>
                <div className={act.itemHead}>
                  <button type="button" className={styles.linkButton} aria-pressed={selected} onClick={() => props.onChoose(selected ? null : w.id)}>
                    {selected ? `✓ ${w.name}` : w.name}
                  </button>
                  <Link to={workPath(props.home.id, w.id)} className={act.meta} style={{ marginLeft: 'auto' }}>
                    Apri lavoro
                  </Link>
                </div>
                {w.state === 'archived' && <span className={act.meta}>Archiviato: conserva i suoi costi</span>}
              </li>
            );
          })}
        </ul>
      )}
      {works.hasNextPage && (
        <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void works.fetchNextPage()} disabled={works.isFetchingNextPage}>
          Altri lavori
        </button>
      )}
      {chosen && (
        <>
          <h3 className={pages.spaced}>Costi del lavoro scelto</h3>
          <ExpenseList home={props.home} caps={props.caps} filters={props.filters} state={props.state} />
        </>
      )}
    </section>
  );
}

function Summary({ summary, caps }: { summary: NonNullable<ReturnType<typeof useEconomySummary>['data']>; caps: EconomyCapabilities }) {
  return (
    <>
      <section className={ui.card} aria-labelledby="spese-riepilogo">
        <h2 id="spese-riepilogo" className={pages.cardTitle}>
          Riepilogo per famiglia e categoria
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Voce</th>
                <th scope="col" className={styles.num}>
                  Registrazioni
                </th>
                <th scope="col" className={styles.num}>
                  Totale
                </th>
              </tr>
            </thead>
            <tbody>
              {caps.families.map((f) => {
                const fam = summary.byFamily.find((r) => r.family === f.code);
                const cats = summary.byCategory.filter((r) => r.count > 0 && (r.category === null ? f.code === 'unclassified' : caps.categories.find((c) => c.code === r.category)?.possibleFamilies.includes(f.code)));
                return [
                  <tr key={f.code} className={styles.familyRow}>
                    <th scope="row">{f.label}</th>
                    <td className={styles.num}>{fam?.count ?? 0}</td>
                    <td className={styles.num}>{fam ? formatCentsString(fam.totalCents) : '—'}</td>
                  </tr>,
                  // repairs_works può stare in due famiglie: il dettaglio per categoria resta nel totale per categoria.
                  ...cats
                    .filter((r) => r.category !== 'repairs_works')
                    .map((r) => (
                      <tr key={`${f.code}-${r.category ?? 'null'}`}>
                        <td>{categoryLabel(r.category, caps)}</td>
                        <td className={styles.num}>{r.count}</td>
                        <td className={styles.num}>{formatCentsString(r.totalCents)}</td>
                      </tr>
                    )),
                ];
              })}
            </tbody>
          </table>
        </div>
        {(() => {
          const rw = summary.byCategory.find((r) => r.category === 'repairs_works');
          return rw && rw.count > 0 ? (
            <p className={styles.note}>
              Riparazioni e lavori: {rw.count} {rw.count === 1 ? 'registrazione' : 'registrazioni'}, {formatCentsString(rw.totalCents)}. Vanno in Lavori e acquisti se
              collegate a un lavoro, altrimenti in Manutenzione e riparazioni.
            </p>
          ) : null;
        })()}
        <p className={styles.note}>
          Totale {formatCentsString(summary.totalCents)}, di cui senza mutuo e finanziamenti {formatCentsString(summary.totalWithoutFinancingCents)}. Ogni costo è contato una sola volta.
        </p>
      </section>
      <ComparisonCard summary={summary} />
    </>
  );
}
