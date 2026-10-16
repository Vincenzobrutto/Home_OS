import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { DocumentSearchFilters, Home } from '../api/types';
import { cx, ui } from '../components/ui';
import {
  EMPTY_FILTERS,
  FORMAT_OPTIONS,
  SEARCH_SCOPE_NOTE,
  VISIBILITY_FILTER_OPTIONS,
  filtersKey,
  isFiltered,
  normalizeQuery,
  validateQuery,
} from '../lib/documentSearch';
import docs from '../routes/documents.module.css';
import { DocumentCollectionFilters } from '../document-intake/DocumentCollectionFilters';

/**
 * Ricerca H2 nei documenti della casa.
 * - La bozza (testo e filtri scelti) è distinta dai filtri applicati: nessuna
 *   richiesta a ogni tasto; «Cerca» o Invio applicano tutto insieme.
 * - Quando i filtri applicati cambiano da fuori (Azzera, indietro/avanti) la
 *   bozza si riallinea. Tutto solo in memoria: il componente è smontato al
 *   cambio di casa o account.
 */
export function SearchForm(props: {
  home: Home;
  applied: DocumentSearchFilters;
  maxQuery: number;
  collectionsEnabled?: boolean;
  /** Solo dall'ingresso esplicito «Cerca documenti» (?ricerca=1). */
  autoFocus: boolean;
  onApply: (filters: DocumentSearchFilters) => void;
}) {
  const { applied } = props;
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const appliedKey = filtersKey(applied);
  const [basis, setBasis] = useState(appliedKey);
  const [draft, setDraft] = useState(applied);
  const [error, setError] = useState<string>();
  if (basis !== appliedKey) {
    setBasis(appliedKey);
    setDraft(applied);
    setError(undefined);
  }

  const wantFocus = useRef(props.autoFocus);
  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    inputRef.current?.focus();
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = normalizeQuery(draft.q);
    const problem = validateQuery(q, props.maxQuery);
    setError(problem);
    if (problem) {
      inputRef.current?.focus();
      return;
    }
    props.onApply({ ...draft, q });
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setError(undefined);
    props.onApply(EMPTY_FILTERS);
    inputRef.current?.focus();
  };

  const canReset = isFiltered(applied) || isFiltered({ ...draft, q: draft.q.trim() });
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <>
      {props.collectionsEnabled && <section aria-label="Sezioni documenti" className={docs.collectionSections}>
        <h2 className={docs.collectionTitle}>Esplora i documenti</h2>
        <DocumentCollectionFilters current={applied.collection ?? 'all'} onChange={collection => props.onApply({ ...applied, collection })} label="Tipologie di documenti" />
        <p className={ui.hint}>Tutti insieme oppure per raccolta. Ogni documento mantiene la sua visibilità.</p>
      </section>}
    <form role="search" aria-label={`Cerca nei documenti di ${props.home.name}`} className={cx(ui.card, docs.search)} onSubmit={onSubmit} noValidate>
      <p className={docs.searchScope}>
        Ricerca in: <strong>{props.home.name}</strong>
      </p>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-q`}>
          Cerca nei documenti
        </label>
        <span id={hintId} className={ui.hint}>
          {SEARCH_SCOPE_NOTE}
        </span>
        <input
          ref={inputRef}
          id={`${id}-q`}
          className={ui.input}
          type="search"
          name="q"
          autoComplete="off"
          spellCheck={false}
          placeholder="Titolo o nome del file"
          value={draft.q}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
        />
        {error && (
          <span id={errorId} className={ui.fieldError}>
            {error}
          </span>
        )}
      </div>
      <div className={docs.searchFilters}>
        <label className={docs.filter}>
          Formato
          <select
            className={docs.select}
            name="format"
            value={draft.format}
            onChange={(e) => setDraft({ ...draft, format: e.target.value as DocumentSearchFilters['format'] })}
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={docs.filter}>
          Visibilità
          <select
            className={docs.select}
            name="visibility"
            value={draft.visibility}
            onChange={(e) => setDraft({ ...draft, visibility: e.target.value as DocumentSearchFilters['visibility'] })}
          >
            {VISIBILITY_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className={docs.searchActions}>
          <button type="submit" className={cx(ui.btn, ui.primary)}>
            Cerca
          </button>
          <button type="button" className={ui.btn} onClick={reset} disabled={!canReset}>
            Azzera filtri
          </button>
        </div>
      </div>
    </form>
    </>
  );
}
