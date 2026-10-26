import { ContactsPanel } from '../contacts/components';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { isApiError } from '../api/errors';
import type { EconomyCapabilities, EconomyWork, WorkHistoryEvent } from '../api/economyTypes';
import type { Home } from '../api/types';
import act from '../activities/activities.module.css';
import { Dialog, NoteField } from '../activities/components';
import { Banner, ErrorState, Field, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { EconomyExpenseRow, EconomyFeedback, economyExpensePath, workPath } from '../economy/components';
import { type EconomyResult, useEconomyCapabilities, useEconomyExpenses, useEconomyOperation, useEconomySummary, useWork, useWorkHistory, useWorks } from '../economy/hooks';
import { formatTimestamp } from '../lib/activities';
import { DEFAULT_FILTERS, economyErrorMessage, formatCentsString, isNotActiveError, type EconomyFilters } from '../lib/economy';
import { HISTORY_KIND_LABEL, normalizeNote, normalizeText, validateNote, validateTitle } from '../lib/expenses';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

function useWorksCaps(home: Home) {
  const caps = useEconomyCapabilities(home.id);
  const off = (caps.isError && isNotActiveError(caps.error)) || (caps.isSuccess && (!caps.data.enabled || !caps.data.features.works));
  return { caps, off };
}

function Off({ home }: { home: Home }) {
  return (
    <div className={pages.stack}>
      <Link to={economyExpensePath(home.id)}>← Spese</Link>
      <h1 tabIndex={-1}>Lavori</h1>
      <p className={pages.muted}>I lavori non sono ancora attivi su questo servizio: nessun dato viene mostrato o simulato.</p>
    </div>
  );
}

export function WorksPage() {
  const home = useCurrentHome();
  useDocumentTitle(`Lavori · ${home.name}`);
  const { caps, off } = useWorksCaps(home);
  const [state, setState] = useState<'active' | 'archived' | 'all'>('active');
  const [q, setQ] = useState('');
  const [draftQ, setDraftQ] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const works = useWorks(home.id, { state, q }, !off && caps.isSuccess);
  if (caps.isPending) return <Loading label="Verifica del servizio…" />;
  if (off) return <Off home={home} />;
  if (caps.isError) return <ErrorState error={caps.error} message={economyErrorMessage(caps.error)} onRetry={() => void caps.refetch()} />;
  const items = works.data?.pages.flatMap((p) => p.items) ?? [];
  const canEdit = home.permissions.includes('edit');
  return (
    <>
      <Link to={economyExpensePath(home.id)} className={pages.spaced}>
        ← Spese
      </Link>
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name}</span>
          <h1 tabIndex={-1}>Lavori</h1>
          <p className={pages.lead}>Un lavoro raggruppa più costi (per esempio un rifacimento). Personale, senza preventivi, scadenze o ripartizioni.</p>
        </div>
      </div>
      <div className={pages.stack}>
        {canEdit && !creating && (
          <p className={act.actions}>
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setCreating(true)}>
              Nuovo lavoro
            </button>
          </p>
        )}
        {creating && <WorkForm home={home} caps={caps.data} onCancel={() => setCreating(false)} onDone={(w) => navigate(workPath(home.id, w.id))} />}
        <section className={ui.card} aria-labelledby="lavori-elenco">
          <h2 id="lavori-elenco" className={pages.cardTitle}>
            Elenco
          </h2>
          <form
            className={act.filters}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(draftQ);
            }}
          >
            <label className={act.filter}>
              Stato
              <select className={act.select} value={state} onChange={(e) => setState(e.target.value as typeof state)}>
                <option value="active">Attivi</option>
                <option value="archived">Archiviati</option>
                <option value="all">Tutti</option>
              </select>
            </label>
            <label className={act.filter}>
              Cerca per nome
              <input className={ui.input} type="search" maxLength={120} value={draftQ} onChange={(e) => setDraftQ(e.target.value)} />
            </label>
            <button type="submit" className={cx(ui.btn, ui.small)}>
              Cerca
            </button>
          </form>
          {works.isPending ? (
            <Loading label="Caricamento dei lavori…" />
          ) : works.isError && !works.data ? (
            <ErrorState error={works.error} message={economyErrorMessage(works.error)} onRetry={() => void works.refetch()} />
          ) : items.length === 0 ? (
            <p className={pages.muted}>Nessun lavoro in questo elenco.</p>
          ) : (
            <ul className={act.list} aria-label="Lavori">
              {items.map((w) => (
                <li key={w.id} className={act.item}>
                  <Link to={workPath(home.id, w.id)} className={act.title}>
                    {w.name}
                  </Link>
                  <span className={act.meta}>{w.state === 'archived' ? 'Archiviato: conserva i suoi costi' : 'Attivo'}</span>
                </li>
              ))}
            </ul>
          )}
          {works.hasNextPage && (
            <p className={pages.spaced}>
              <button type="button" className={ui.btn} onClick={() => void works.fetchNextPage()} disabled={works.isFetchingNextPage}>
                Mostra altri lavori
              </button>
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function WorkForm(props: { home: Home; caps: EconomyCapabilities; work?: EconomyWork; onDone: (w: EconomyWork) => void; onCancel: () => void }) {
  const { home, work } = props;
  const id = useId();
  const op = useEconomyOperation(home.id);
  const [name, setName] = useState(work?.name ?? '');
  const [note, setNote] = useState(work?.note ?? '');
  const [errors, setErrors] = useState<{ name?: string; note?: string }>({});
  const [nothing, setNothing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const disabled = op.mutation.isPending || op.locked;
  const done = (res: EconomyResult) => {
    if ('work' in res) props.onDone(res.work);
  };
  return (
    <form
      className={act.panel}
      noValidate
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        const errs = { name: validateTitle(name, 120), note: validateNote(note, props.caps.limits.noteMaxCodePoints) };
        setErrors(errs);
        setNothing(false);
        if (errs.name || errs.note) return;
        const n = normalizeText(name);
        const nn = normalizeNote(note);
        if (!work) {
          op.run({ kind: 'workCreate', body: { name: n, ...(nn ? { note: nn } : {}) } }, done);
          return;
        }
        const body: { expectedVersion: number; name?: string; note?: string | null } = { expectedVersion: work.version };
        if (n !== work.name) body.name = n;
        if (nn !== work.note) body.note = nn;
        if (Object.keys(body).length === 1) return setNothing(true);
        op.run({ kind: 'workUpdates', workId: work.id, body }, done);
      }}
    >
      <h2 id={`${id}-t`} ref={heading} tabIndex={-1}>
        {work ? 'Modifica lavoro' : 'Nuovo lavoro'}
      </h2>
      <Field label="Nome" value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" />
      <NoteField id={`${id}-note`} value={note} onChange={setNote} error={errors.note} disabled={disabled} label="Nota (facoltativa)" />
      {nothing && (
        <Banner role="status">
          <p>Nessuna modifica da salvare.</p>
        </Banner>
      )}
      <EconomyFeedback op={op} homeId={home.id} title={work ? 'Modifica non salvata' : 'Lavoro non creato'} onRetry={() => op.retry(done)} />
      <div className={act.actions}>
        {!op.locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={op.mutation.isPending}>
            {op.mutation.isPending ? 'Salvataggio…' : work ? 'Salva modifiche' : 'Crea lavoro'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={disabled}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export function WorkDetailPage() {
  const home = useCurrentHome();
  const { workId = '' } = useParams();
  const { caps, off } = useWorksCaps(home);
  const work = useWork(home.id, off ? null : workId);
  const [firstVersion, setFirstVersion] = useState<number | null>(null);
  if (work.data && firstVersion === null) setFirstVersion(work.data.version);
  if (caps.isPending) return <Loading label="Verifica del servizio…" />;
  if (off) return <Off home={home} />;
  const back = (
    <Link to={workPath(home.id)} className={pages.spaced}>
      ← Lavori
    </Link>
  );
  if (work.isPending) return <>{back}<Loading label="Caricamento del lavoro…" /></>;
  if (work.isError) {
    const forbidden = isApiError(work.error) && work.error.kind === 'http' && (work.error.status === 403 || work.error.status === 422);
    return (
      <>
        {back}
        <h1 tabIndex={-1}>{forbidden ? 'Lavoro non disponibile' : 'Lavoro'}</h1>
        {forbidden ? <Banner tone="warning" role="alert"><p>Questo account non ha accesso al lavoro richiesto.</p></Banner> : <ErrorState error={work.error} message={economyErrorMessage(work.error)} onRetry={() => void work.refetch()} />}
      </>
    );
  }
  return <WorkView key={work.data.version} home={home} caps={caps.data} work={work.data} back={back} focus={firstVersion !== null && firstVersion !== work.data.version} />;
}

function WorkView(props: { home: Home; caps?: EconomyCapabilities; work: EconomyWork; back: React.ReactNode; focus: boolean }) {
  const { home, work, caps } = props;
  useDocumentTitle(`${work.name} · ${home.name}`);
  const [panel, setPanel] = useState<'none' | 'edit' | 'archive' | 'restore'>('none');
  const actions = useRef<HTMLDivElement>(null);
  const focus = useRef(props.focus);
  useEffect(() => {
    if (focus.current) actions.current?.querySelector('button')?.focus();
  }, []);
  // Costi del lavoro dall'inizio a oggi: totale dal riepilogo server, righe paginate.
  const filters: EconomyFilters = { ...DEFAULT_FILTERS, workId: work.id, period: { kind: 'range', from: '0001-01-01', to: caps?.today ?? '9999-12-31' } };
  const summary = useEconomySummary(home.id, filters, !!caps);
  const list = useEconomyExpenses(home.id, filters, { enabled: !!caps });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const canEdit = home.permissions.includes('edit') && work.permissions.includes('edit') && !!caps;
  const active = work.state === 'active';
  return (
    <>
      {props.back}

      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow}>{home.name} · Lavoro</span>
          <h1 tabIndex={-1}>{work.name}</h1>
          <div className={act.actions}>
            <Tag>{active ? 'Attivo' : 'Archiviato'}</Tag>
          </div>
        </div>
      </div>
      <div className={pages.stack}>
        <section className={ui.card} aria-labelledby="lavoro-totale">
          <h2 id="lavoro-totale" className={pages.cardTitle}>
            Costi del lavoro
          </h2>
          {summary.isPending ? (
            <Loading label="Calcolo del totale…" />
          ) : summary.isError ? (
            <ErrorState error={summary.error} message={economyErrorMessage(summary.error)} onRetry={() => void summary.refetch()} />
          ) : (
            <p>
              <strong style={{ fontSize: 24 }}>{formatCentsString(summary.data.totalCents)}</strong> · {summary.data.count} {summary.data.count === 1 ? 'registrazione' : 'registrazioni'} attive. Il totale non
              viene ripartito fra oggetti o ambienti.
            </p>
          )}
          {work.note && <p className={act.description}>{work.note}</p>}
          {list.isPending ? null : items.length === 0 ? (
            <p className={pages.muted}>Ancora nessun costo collegato a questo lavoro.</p>
          ) : (
            <ul className={act.list} aria-label="Costi del lavoro">
              {items.map((e) => (
                <EconomyExpenseRow key={e.id} expense={e} homeId={home.id} caps={caps} />
              ))}
            </ul>
          )}
          {list.hasNextPage && (
            <button type="button" className={ui.btn} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              Mostra altri costi
            </button>
          )}
          {canEdit && active && (
            <p className={pages.spaced}>
              <Link to={`${economyExpensePath(home.id)}?nuova-spesa=1&perLavoro=${encodeURIComponent(work.id)}`} className={ui.btn}>
                Registra una spesa per questo lavoro
              </Link>
            </p>
          )}
          {!active && <p className={pages.muted}>Lavoro archiviato: conserva i suoi costi, ma non accetta nuove assegnazioni finché non lo ripristini.</p>}
        </section>
        {canEdit && panel !== 'edit' && (
          <div ref={actions} className={act.actions}>
            {active ? (
              <>
                <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => setPanel('edit')}>
                  Modifica
                </button>
                <button type="button" className={ui.btn} onClick={() => setPanel('archive')}>
                  Archivia
                </button>
              </>
            ) : (
              <button type="button" className={ui.btn} onClick={() => setPanel('restore')}>
                Ripristina
              </button>
            )}
          </div>
        )}
        {panel === 'edit' && caps && <WorkForm home={home} caps={caps} work={work} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />}
        {(panel === 'archive' || panel === 'restore') && <WorkStateDialog home={home} work={work} kind={panel} onClose={() => setPanel('none')} />}
        <ContactsPanel homeId={home.id} resource={{kind:"work",id:work.id}} canEdit={canEdit} />
        <WorkHistory homeId={home.id} workId={work.id} />
      </div>
    </>
  );
}

function WorkStateDialog(props: { home: Home; work: EconomyWork; kind: 'archive' | 'restore'; onClose: () => void }) {
  const op = useEconomyOperation(props.home.id);
  const disabled = op.mutation.isPending || op.locked;
  const label = props.kind === 'archive' ? 'Archivia lavoro' : 'Ripristina lavoro';
  return (
    <Dialog title={label} onClose={props.onClose} dismissDisabled={disabled}>
      <p className={act.meta}>
        {props.kind === 'archive'
          ? 'I costi già collegati restano nel lavoro e nel loro gruppo di spesa. Un lavoro archiviato non accetta nuove assegnazioni.'
          : 'Il lavoro torna attivo e accetta di nuovo costi.'}
      </p>
      <EconomyFeedback op={op} homeId={props.home.id} title="Operazione non eseguita" onRetry={() => op.retry(props.onClose)} />
      <div className={act.actions}>
        {!op.locked && (
          <button
            type="button"
            className={cx(ui.btn, ui.primary)}
            disabled={op.mutation.isPending}
            onClick={() => op.run({ kind: props.kind === 'archive' ? 'workArchive' : 'workRestore', workId: props.work.id, body: { expectedVersion: props.work.version } }, props.onClose)}
          >
            {op.mutation.isPending ? 'Invio…' : label}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onClose} disabled={disabled}>
          Torna indietro
        </button>
      </div>
    </Dialog>
  );
}

function workChanges(e: WorkHistoryEvent) {
  if (!e.before) return [`Creato: ${e.after.name}`];
  const out: string[] = [];
  if (e.before.name !== e.after.name) out.push(`Nome: ${e.before.name} → ${e.after.name}`);
  if (e.before.note !== e.after.note) out.push(`Nota: ${e.before.note ?? '—'} → ${e.after.note ?? '—'}`);
  if (e.before.state !== e.after.state) out.push(`Stato: ${e.before.state === 'archived' ? 'archiviato' : 'attivo'} → ${e.after.state === 'archived' ? 'archiviato' : 'attivo'}`);
  return out;
}

function WorkHistory({ homeId, workId }: { homeId: string; workId: string }) {
  const history = useWorkHistory(homeId, workId);
  const events = history.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className={ui.card} aria-labelledby="lavoro-storia">
      <h2 id="lavoro-storia" className={pages.cardTitle}>
        Storia del lavoro
      </h2>
      {history.isPending ? (
        <Loading label="Caricamento della storia…" />
      ) : history.isError && !history.data ? (
        <ErrorState error={history.error} message={economyErrorMessage(history.error)} onRetry={() => void history.refetch()} />
      ) : events.length === 0 ? (
        <p className={pages.muted}>Ancora nessun evento.</p>
      ) : (
        <ol className={act.history}>
          {events.map((e) => (
            <li key={e.id} className={act.event}>
              <strong>{e.kind === 'created' ? 'Creato' : HISTORY_KIND_LABEL[e.kind].replace(/a$/, 'o')}</strong>
              <span className={act.meta}>{formatTimestamp(e.at)}</span>
              {workChanges(e).map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </li>
          ))}
        </ol>
      )}
      {history.hasNextPage && (
        <button type="button" className={ui.btn} onClick={() => void history.fetchNextPage()} disabled={history.isFetchingNextPage}>
          Mostra eventi precedenti
        </button>
      )}
    </section>
  );
}
