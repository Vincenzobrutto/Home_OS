import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { SlidersHorizontal } from '@phosphor-icons/react/dist/csr/SlidersHorizontal';
import { X } from '@phosphor-icons/react/dist/csr/X';
import type { DocumentSearchFilters, Home } from '../api/types';
import { cx, ui } from '../components/ui';
import { lockModalScroll } from '../components/modalScroll';
import { COLLECTION_OPTIONS, FORMAT_OPTIONS, SEARCH_SCOPE_NOTE, VISIBILITY_FILTER_OPTIONS, filtersKey, normalizeQuery, validateQuery } from '../lib/documentSearch';
import docs from '../routes/documents.module.css';

/** Server search across the authorized archive. Only secondary filters are staged. */
export function SearchForm(props: {
  home: Home; applied: DocumentSearchFilters; maxQuery: number; collectionsEnabled?: boolean;
  autoFocus: boolean; onApply: (filters: DocumentSearchFilters, replace?: boolean) => void;
}) {
  const { applied } = props, id = useId(), input = useRef<HTMLInputElement>(null);
  const key = filtersKey(applied), [basis, setBasis] = useState({key,q:applied.q});
  const [query, setQuery] = useState(applied.q), [global, setGlobal] = useState(false);
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState(applied);
  const latest = useRef(props); useEffect(() => { latest.current = props; });
  if (basis.key !== key) { setBasis({key,q:applied.q}); if (basis.q !== applied.q) setQuery(applied.q); setGlobal(false); }
  const q = normalizeQuery(query), error = validateQuery(q, props.maxQuery);
  useEffect(() => { if (props.autoFocus) input.current?.focus(); }, [props.autoFocus]);
  useEffect(() => {
    if (q === applied.q || error) return;
    const timer = setTimeout(() => latest.current.onApply(global
      ? { q, workflow: 'all', format: 'all', visibility: 'all' }
      : { ...latest.current.applied, q }, true), 300);
    return () => clearTimeout(timer);
  }, [q, applied.q, error, global]);
  function current(): DocumentSearchFilters {
    return global ? { q, workflow:'all', format:'all', visibility:'all' } : { ...applied, q };
  }
  function apply(next: DocumentSearchFilters) { if (!error) props.onApply(next); }
  const active = global ? 'all' : ['to_compile','review'].includes(applied.workflow ?? '') ? 'pending' : applied.workflow ?? 'all';
  const chips = global ? [] : [
    ...(applied.collection && applied.collection !== 'all' ? [{ field:'collection' as const, label:COLLECTION_OPTIONS.find(o => o.value === applied.collection)!.label }] : []),
    ...(applied.format !== 'all' ? [{ field:'format' as const, label:FORMAT_OPTIONS.find(o => o.value === applied.format)!.label }] : []),
    ...(applied.visibility !== 'all' ? [{ field:'visibility' as const, label:VISIBILITY_FILTER_OPTIONS.find(o => o.value === applied.visibility)!.label }] : []),
  ];
  return <form role="search" aria-label={`Cerca nei documenti di ${props.home.name}`} className={docs.unifiedSearch} onSubmit={e => { e.preventDefault(); apply(current()); }} noValidate>
    <p className="visually-hidden">Ricerca in: {props.home.name}. {SEARCH_SCOPE_NOTE}</p>
    <div className={docs.queryRow}>
      <div className={docs.queryBox}>
        <MagnifyingGlass size={21} aria-hidden="true"/>
        <input ref={input} aria-label="Cerca nei documenti" type="search" placeholder="Titolo o nome del file" autoComplete="off" spellCheck={false}
          value={query} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ' '+id+'-error' : ''}`}
          onChange={e => { setQuery(e.target.value); if (!applied.q && !query.trim() && e.target.value.trim()) setGlobal(true); }}/>
        {query && <button type="button" aria-label="Azzera ricerca" onClick={() => { setQuery(''); setGlobal(false); props.onApply({...applied,q:''}); input.current?.focus(); }}><X size={20} aria-hidden="true"/></button>}
      </div>
      <button type="button" className={cx(ui.btn,docs.filtersTrigger)} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setStaged(current()); setOpen(true); }}><SlidersHorizontal size={20} aria-hidden="true"/>Filtri{chips.length ? ` (${chips.length})` : ''}</button>
    </div>
    <p id={`${id}-hint`} className={ui.hint}>Cerca per titolo o nome del file.</p>
    {error && <p id={`${id}-error`} role="alert" className={ui.fieldError}>{error}</p>}
    <div className={docs.statusSegments} role="group" aria-label="Stato dei documenti">
      {([['all','Tutti'],['pending','Da fare'],['completed','Completati']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={active === value} onClick={() => apply({...current(),workflow:value})}>{label}</button>)}
    </div>
    <p className={docs.scopeNote}>{active === 'all' ? 'Ricerca in tutti i documenti di questa casa.' : active === 'pending' ? 'Mostra i documenti da fare.' : 'Mostra i documenti completati.'}</p>
    {active === 'pending' && <label className={docs.pendingFilter}>Mostra<select className={docs.select} value={applied.workflow} onChange={e => apply({...current(),workflow:e.target.value as DocumentSearchFilters['workflow']})}><option value="pending">Tutti i documenti da fare</option><option value="to_compile">Documenti da compilare</option><option value="review">Documenti da controllare</option></select></label>}
    {!global && !!chips.length && <div className={docs.filterChips} aria-label="Filtri applicati">{chips.map(chip => <button type="button" className={ui.btn} key={chip.field} aria-label={'Rimuovi filtro '+chip.label} onClick={() => apply({...current(),[chip.field]:'all'})}>{chip.label}<X size={16} aria-hidden="true"/></button>)}<button type="button" className={ui.btn} onClick={() => apply({...current(),format:'all',visibility:'all',collection:'all'})}>Rimuovi filtri</button></div>}
    {open && <FilterDialog titleId={`${id}-filters`} onClose={() => setOpen(false)}>
      <div className={docs.filterHeading}><h2 id={`${id}-filters`}>Filtri</h2><button type="button" className={ui.btn} aria-label="Chiudi filtri" data-autofocus onClick={() => setOpen(false)}><X size={22} aria-hidden="true"/></button></div>
      <p className={ui.hint}>Cerca nei documenti di questa casa.</p>
      <div className={docs.filterFields}>
        {props.collectionsEnabled && <label className={docs.filter}>Gruppo di documenti<select className={docs.select} value={staged.collection ?? 'all'} onChange={e => setStaged({...staged,collection:e.target.value as DocumentSearchFilters['collection']})}>{COLLECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
        <label className={docs.filter}>Formato<select className={docs.select} value={staged.format} onChange={e => setStaged({...staged,format:e.target.value as DocumentSearchFilters['format']})}>{FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label className={docs.filter}>Chi può vederli<select className={docs.select} value={staged.visibility} onChange={e => setStaged({...staged,visibility:e.target.value as DocumentSearchFilters['visibility']})}>{VISIBILITY_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      </div>
      <div className={docs.filterFooter}><button type="button" className={ui.btn} onClick={() => setOpen(false)}>Annulla</button><button type="button" className={cx(ui.btn,ui.primary)} disabled={!!error} onClick={() => { apply({...current(),format:staged.format,visibility:staged.visibility,collection:staged.collection}); setOpen(false); }}>Mostra risultati</button></div>
    </FilterDialog>}
  </form>;
}

function FilterDialog({children,titleId,onClose}: {children:React.ReactNode;titleId:string;onClose:()=>void}) {
  const panel=useRef<HTMLDivElement>(null),close=useRef(onClose); useEffect(() => { close.current=onClose; });
  useEffect(() => {
    const trigger=document.activeElement as HTMLElement|null,root=document.getElementById('root'),previous=root?.inert,unlock=lockModalScroll();
    if(root) root.inert=true;
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    function key(e:KeyboardEvent) {
      if(e.key==='Escape'){e.preventDefault();close.current();}
      if(e.key!=='Tab')return;
      const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button,select')??[]).filter(item=>!item.hasAttribute('disabled')),first=items[0],last=items.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);unlock();if(root)root.inert=previous??false;trigger?.focus({preventScroll:true});};
  },[]);
  return createPortal(<div className={docs.filterBackdrop} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className={docs.filterPanel}>{children}</div></div>,document.body);
}
