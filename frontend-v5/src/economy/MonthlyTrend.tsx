import { useEffect, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { EconomySummary, Period } from '../api/economyTypes';
import { queryKeys } from '../api/queryKeys';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { economyErrorMessage, economyQuery, filtersKey, formatCentsString, isForbiddenError, parseCentsString, svgFraction, type EconomyFilters } from '../lib/economy';
import { useAccount, useApi } from '../session/session';
import { useForgetEconomy } from './hooks';
import { monthName, monthlyPeriods, monthlyComparisonNote } from './monthlyPeriods';
import css from './monthlyTrend.module.css';

export type MonthlyView = { expanded: boolean; page: number };
export function MonthlyTrend({ homeId, filters, period, onPick, view, onViewChange, selectedPeriod }: {
  homeId:string; filters:EconomyFilters; period:Period; view:MonthlyView; onViewChange:(view:MonthlyView)=>void;
  selectedPeriod?:Period; onPick:(period:Period,month:string)=>void;
}) {
  const {expanded,page}=view;
  const scroll=useRef<HTMLDivElement>(null);
  const { items, pages } = monthlyPeriods(period, expanded, page);
  const completeWindow = monthlyPeriods(period, true);
  const canExpand = completeWindow.pages > 1 || completeWindow.items.length > 3;
  const api = useApi(), account = useAccount(), forget = useForgetEconomy(homeId);
  const results = useQueries({ queries: items.map(item => {
    const scope: EconomyFilters = { ...filters, period: { kind: 'range', ...item.period } };
    return {
      queryKey: queryKeys.economySummary(account.id, homeId, filtersKey(scope)),
      queryFn: ({ signal }: { signal: AbortSignal }) => api.getEconomySummary(homeId, economyQuery(scope, { list: false }), signal, account.id),
      staleTime: 0, retry: false,
    };
  }) });
  const error = results.find(r => r.isError), forbidden = results.some(r => r.isError && isForbiddenError(r.error));
  useEffect(() => { if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stessa pulizia scoped del riepilogo principale
  }, [forbidden]);
  const data = results.map(r => r.data), pending = results.some(r => r.isPending);
  const failed=!!error;
  useEffect(()=>{
    if(pending||failed||!scroll.current)return;
    scroll.current.scrollLeft=expanded?scroll.current.scrollWidth-scroll.current.clientWidth:0;
  },[expanded,page,pending,failed,period.from,period.to]);
  let max = 1n;
  for (const d of data) if (d) {
    const now = parseCentsString(d.totalCents) ?? 0n;
    const old = d.comparison.status === 'comparable' ? parseCentsString(d.comparison.totalCents) ?? 0n : 0n;
    if (now > max) max = now; if (old > max) max = old;
  }
  const multipleYears = items[0]?.month.slice(0, 4) !== items.at(-1)?.month.slice(0, 4);
  const year = items.at(-1)?.month.slice(0, 4) ?? '';
  return <section className={cx(ui.card, css.card)} aria-labelledby="andamento-mensile">
    <div className={css.heading}><h2 id="andamento-mensile">Andamento per mese</h2>
    {canExpand && <button type="button" className={cx(ui.btn, ui.small)} aria-label={expanded ? 'Mostra ultimi 3 mesi' : 'Mostra mesi del periodo'} aria-expanded={expanded} aria-controls="barre-mensili" onClick={() => onViewChange({expanded:!expanded,page:0})}>{expanded ? 'Ultimi 3' : 'Altri mesi'}</button>}</div>
    {expanded && pages > 1 && <div className={css.pager}><button type="button" className={ui.btn} disabled={page >= pages - 1} onClick={() => onViewChange({...view,page:page+1})}>Mesi precedenti</button><span>{page + 1} / {pages}</span><button type="button" className={ui.btn} disabled={!page} onClick={() => onViewChange({...view,page:page-1})}>Mesi successivi</button></div>}
    <p className={css.key}><span><i />{multipleYears ? 'Periodo selezionato' : year}</span><span><i />{multipleYears ? 'Anno precedente' : Number(year) > 1 ? String(Number(year) - 1).padStart(4, '0') : 'Anno precedente non disponibile'}</span></p>
    <p className={css.hint}>Tocca un mese per il dettaglio.</p>
    <div id="barre-mensili">{error ? <ErrorState title="Andamento non disponibile" error={error.error} message={economyErrorMessage(error.error)} onRetry={forbidden ? undefined : () => { for (const r of results) if (r.isError) void r.refetch(); }} /> : pending ? <Loading label="Calcolo dei mesi…" /> : <div ref={scroll} className={css.scroll} tabIndex={expanded ? 0 : undefined} aria-label={expanded ? 'Mesi del periodo, scorri orizzontalmente' : undefined}>
      <div className={cx(css.chart, expanded && css.expanded)}>{items.map((item, i) => {
        const d = data[i]; if (!d) return null;
        const prior = d.comparison, before = prior.status === 'comparable' ? prior.totalCents : null;
        const beforeLabel = prior.status === 'unavailable' ? 'Confronto non disponibile' : before === null ? 'Nessuna registrazione precedente' : formatCentsString(before);
        return <button type="button" className={css.month} key={item.month} data-expense-month={item.month} aria-pressed={selectedPeriod?.from===item.period.from&&selectedPeriod?.to===item.period.to} aria-label={`${monthName(item.month)}${item.partial ? ', periodo parziale' : ''}: ${d.count ? formatCentsString(d.totalCents) : 'nessuna registrazione'}; anno precedente: ${beforeLabel}. Apri dettaglio del mese`} onClick={() => onPick(item.period, item.month)}>
          <span className={css.plots} aria-hidden="true"><Bar value={d.count ? d.totalCents : null} max={max}/><Bar value={before} max={max} previous/></span>
          <span className={css.monthName}>{monthName(item.month)}</span>
          {item.partial && <span className={css.hint}>Parziale</span>}
          {!d.count && <span className={css.hint}>{before===null&&prior.status==='no_previous_records'?'Registrazioni assenti':'Nessuna registrazione'}</span>}
          {before === null && (d.count>0||prior.status==='unavailable') && <span className={css.hint}>{prior.status==='unavailable'?beforeLabel:'Storico assente'}</span>}
        </button>;
      })}</div>
    </div>}</div>
    {!pending&&!error&&items.map((item,i)=>{const d=data[i],note=d?monthlyComparisonNote(item.period,d.comparison):null;return note?<p key={item.month} className={css.hint}>{monthName(item.month)}: {note}</p>:null;})}
    <details className={css.explanation}><summary>Come leggere il confronto</summary><p className={css.hint}>{expanded ? 'Mesi del grafico di contesto' : 'Fino a tre mesi, i più recenti del grafico di contesto'}, con gli stessi filtri dell’elenco. Selezionando il mese, elenco e totale si aggiornano e si apre Acquisti e interventi; il grafico conserva il periodo da cui sei partito. Importi registrati, non pagamenti. Assenza di registrazioni non significa spesa zero. Il confronto usa gli stessi giorni dell’anno precedente, con l’eventuale adattamento del 29 febbraio indicato sopra.</p></details>
  </section>;
}

function Bar({ value, max, previous }: { value: EconomySummary['totalCents'] | null; max: bigint; previous?: boolean }) {
  return <span className={css.column}><span className={css.value}>{value === null ? 'n.d.' : formatCentsString(value)}</span><span className={cx(css.bar, previous && css.previous)} style={{ height: value === null ? 0 : `max(2px, calc(var(--monthly-bar-height, 140px) * ${svgFraction(parseCentsString(value) ?? 0n, max)}))` }} /></span>;
}
