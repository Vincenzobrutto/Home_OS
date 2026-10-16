import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { safeFilename } from '../api/client';
import { isApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import type { DocumentDetail, DocumentSearchFilters, DocumentSummary, DocumentVisibility, Home } from '../api/types';
import { Icon } from '../components/Icon';
import { Banner, ErrorState, Field, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import {
  useDocumentSearch,
  useDocumentSearchCapabilities,
  useExportDocuments,
  useForgetHomeDocuments,
  useUploadDocument,
} from '../documents/hooks';
import { SearchForm } from '../documents/SearchForm';
import { PersonalExportPanel } from '../documents/PersonalExportPanel';
import { useAccount, useSession } from '../session/session';
import {
  EMPTY_FILTERS,
  QUERY_MAX_CODE_POINTS,
  SEARCH_SCOPE_NOTE,
  describeFilters,
  filtersFromParams,
  filtersKey,
  filtersToParams,
  isFiltered,
  isForbidden,
  searchUnavailableMessage,
  validateQuery,
} from '../lib/documentSearch';
import {
  ACCEPT_ATTRIBUTE,
  MAX_EXPORT_DOCUMENTS,
  SOURCE_LABEL,
  STATUS_LABEL,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
  exportProblem,
  formatBytes,
  formatDate,
  formatLabel,
  saveBlob,
  validateDocumentName,
  validateUploadFile,
} from '../lib/files';
import { useCurrentHome } from './HomePages';
import { ExamplePdfs } from './ActivityPage';
import styles from './pages.module.css';
import docs from './documents.module.css';

/** Messaggio per gli errori di lettura dell'archivio. */
export function documentsErrorMessage(error: unknown) {
  if (isApiError(error) && error.kind === 'http') {
    // Backend senza endpoint documentali (o percorso inesistente): mai un archivio vuoto.
    if (error.status === 404) return 'L’archivio documenti non è ancora attivo su questo servizio.';
    if (error.status === 403) return 'Non hai accesso ai documenti di questa casa.';
  }
  return userMessage(error);
}

export function DocumentsPage() {
  const home = useCurrentHome();
  useDocumentTitle(`Documenti · ${home.name}`);
  const canUpload = home.permissions.includes('edit');
  const canExport = home.permissions.includes('export');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploaded, setUploaded] = useState<DocumentDetail | null>(null);
  const uploadResult = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (uploaded && document.activeElement === document.body) uploadResult.current?.focus();
  }, [uploaded]);
  const panelId = useId();
  const [params, setParams] = useSearchParams();
  const applied = useMemo(() => filtersFromParams(params), [params]);
  const appliedKey = filtersKey(applied);
  const capabilities = useDocumentSearchCapabilities(home.id);
  const maxQuery = capabilities.data?.limits.queryMaxCodePoints ?? QUERY_MAX_CODE_POINTS;
  // Solo q/format/visibility nell'indirizzo; ?ricerca=1 (ingresso da Casa) non va all'API e cade al primo Cerca.
  const apply = (filters: DocumentSearchFilters) => setParams(filtersToParams(filters));

  return (
    <>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{home.name}</span>
          <h1 tabIndex={-1}>Documenti</h1>
          <p className={styles.lead}>
            Gli originali dei documenti della casa. Un originale caricato è conservato così com’è: non è verificato né
            certificato.
          </p>
        </div>
        {canUpload && (
          <div className={docs.toolbarActions}>
            <Link
              to={`/home/${encodeURIComponent(home.id)}/attivita?analizza=1`}
              className={ui.btn}
            >
              Analizza documenti
            </Link>
            {!uploadOpen && (
          <button
            type="button"
            className={cx(ui.btn, ui.primary)}
            aria-expanded={false}
            aria-controls={panelId}
            onClick={() => {
              setUploaded(null);
              setUploadOpen(true);
            }}
          >
            <Icon name="plus" />
            Carica documento
          </button>
            )}
          </div>
        )}
      </div>

      {uploaded && (
        <div className={docs.panel} role="status" tabIndex={-1} ref={uploadResult}>
          <Banner title="Documento caricato">
            <p>
              «{uploaded.name}» è stato salvato in {home.name}.{' '}
              <Link to={`/home/${encodeURIComponent(home.id)}/documenti/${encodeURIComponent(uploaded.id)}`}>
                Apri il documento
              </Link>
            </p>
          </Banner>
        </div>
      )}

      {uploadOpen && (
        <section id={panelId} className={cx(ui.card, docs.panel)} aria-labelledby={`${panelId}-title`}>
          <UploadForm
            home={home}
            titleId={`${panelId}-title`}
            onCancel={() => setUploadOpen(false)}
            onUploaded={(doc) => {
              setUploadOpen(false);
              setUploaded(doc);
            }}
          />
        </section>
      )}

      {!canUpload && (
        <p className={cx(docs.note, docs.panel)}>
          Con il tuo ruolo puoi consultare e scaricare i documenti visibili, non caricarne di nuovi.
        </p>
      )}

      {capabilities.isSuccess ? (
        <SearchForm
          home={home}
          applied={applied}
          maxQuery={maxQuery}
          autoFocus={params.get('ricerca') === '1'}
          onApply={apply}
        />
      ) : capabilities.isError && !isForbidden(capabilities.error) ? (
        <div className={docs.panel}>
          <Banner
            tone="warning"
            title="Ricerca non attiva"
            actions={
              <button
                type="button"
                className={cx(ui.btn, ui.small)}
                onClick={() => void capabilities.refetch()}
                disabled={capabilities.isFetching}
              >
                {capabilities.isFetching ? 'Nuovo tentativo…' : 'Riprova'}
              </button>
            }
          >
            <p>{searchUnavailableMessage(capabilities.error)}</p>
          </Banner>
        </div>
      ) : null}

      {/* Archivio rimontato a ogni cambio dei filtri applicati: prima pagina e selezione ZIP vuota. */}
      <DocumentsArchive
        key={appliedKey}
        home={home}
        filters={applied}
        searchState={capabilities.isSuccess ? 'ready' : capabilities.isError ? 'unavailable' : 'pending'}
        maxQuery={maxQuery}
        onReset={() => apply(EMPTY_FILTERS)}
        canExport={canExport}
        canUpload={canUpload && !uploadOpen}
        onUpload={() => setUploadOpen(true)}
      />
      {canExport && <PersonalExportPanel key={`${home.id}-personal-export`} homeId={home.id} />}
      {canUpload && (
        <div className={styles.spaced}>
          <ExamplePdfs homeId={home.id} />
        </div>
      )}
    </>
  );
}

function DocumentsArchive(props: {
  home: Home;
  filters: DocumentSearchFilters;
  /** Stato delle capabilities H2: i filtri si applicano solo con la ricerca attiva. */
  searchState: 'ready' | 'pending' | 'unavailable';
  maxQuery: number;
  onReset: () => void;
  canExport: boolean;
  canUpload: boolean;
  onUpload: () => void;
}) {
  const { home, canExport, filters } = props;
  const filtered = isFiltered(filters);
  const queryProblem = filtered ? validateQuery(filters.q, props.maxQuery) : undefined;
  // Senza filtri: lista M2, consultabile anche se la ricerca non è attiva.
  // Con filtri: solo a ricerca attiva e query valida, mai una ricerca locale sulle pagine già caricate.
  const runnable = !filtered || (props.searchState === 'ready' && !queryProblem);
  const documents = useDocumentSearch(home.id, filters, runnable);
  const exporter = useExportDocuments(home.id);
  const forget = useForgetHomeDocuments(home.id);
  const forbidden = documents.isError && isForbidden(documents.error);
  useEffect(() => {
    if (forbidden) forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola pulizia per ogni 403
  }, [forbidden]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [exported, setExported] = useState<number | null>(null);

  const items = useMemo(() => documents.data?.pages.flatMap((p) => p.items) ?? [], [documents.data]);
  const selectedDocs = items.filter((d) => selected.has(d.id));
  const problem = exportProblem(selectedDocs);
  const totalBytes = selectedDocs.reduce((sum, d) => sum + d.byteSize, 0);

  if (filtered && props.searchState === 'unavailable') {
    return (
      <div className={cx(ui.card, styles.unavailable)}>
        <h2 className={styles.cardTitle}>Filtri non applicati</h2>
        <p className={styles.muted}>
          La ricerca non è attiva, quindi i filtri indicati nell’indirizzo ({describeFilters(filters)}) non sono stati
          applicati. Nessun risultato è stato calcolato.
        </p>
        <button type="button" className={ui.btn} onClick={props.onReset}>
          Mostra tutti i documenti
        </button>
      </div>
    );
  }
  if (queryProblem) {
    return (
      <Banner
        tone="error"
        role="alert"
        title="Ricerca non valida"
        actions={
          <button type="button" className={cx(ui.btn, ui.small)} onClick={props.onReset}>
            Azzera filtri
          </button>
        }
      >
        <p>{queryProblem} Correggi il testo e premi «Cerca».</p>
      </Banner>
    );
  }
  if (documents.isPending) {
    return <Loading label={filtered ? 'Ricerca in corso…' : 'Caricamento dei documenti…'} />;
  }
  // 403 (accesso revocato): nessun risultato resta visibile, nemmeno quelli già ottenuti.
  if (forbidden) {
    return <ErrorState title="Accesso non consentito" error={documents.error} message={documentsErrorMessage(documents.error)} />;
  }
  // Errore senza pagine già caricate: niente elenco. Errore su "Mostra altri": elenco conservato.
  if (documents.isError && !documents.data) {
    return (
      <ErrorState
        title={filtered ? 'Ricerca non riuscita' : 'Archivio non disponibile'}
        error={documents.error}
        message={documentsErrorMessage(documents.error)}
        onRetry={() => void documents.refetch()}
        retrying={documents.isFetching}
      />
    );
  }

  if (items.length === 0 && filtered) {
    return (
      <div className={cx(ui.card, styles.unavailable)}>
        <h2 className={styles.cardTitle}>Nessun documento corrisponde ai filtri</h2>
        <p className={styles.muted} role="status">
          Filtri applicati: {describeFilters(filters)}. {SEARCH_SCOPE_NOTE} Modifica la ricerca o azzera i filtri.
        </p>
        <button type="button" className={ui.btn} onClick={props.onReset}>
          Azzera filtri
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cx(ui.card, styles.unavailable)}>
        <h2 className={styles.cardTitle}>Nessun documento in questa casa</h2>
        <p className={styles.muted}>
          {props.canUpload
            ? 'Carica il primo originale: PDF, JPEG o PNG fino a 20 MiB.'
            : 'Non ci sono documenti visibili per il tuo account.'}
        </p>
        {props.canUpload && (
          <button type="button" className={cx(ui.btn, ui.primary)} onClick={props.onUpload}>
            <Icon name="plus" />
            Carica documento
          </button>
        )}
      </div>
    );
  }

  const toggle = (id: string) => {
    setExported(null);
    exporter.reset();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runExport = () => {
    if (problem || exporter.isPending) return;
    const chosen = selectedDocs;
    exporter.mutate(chosen, {
      onSuccess: (zip) => {
        saveBlob(zip.blob, zip.filename ?? safeFilename(`Documenti ${home.name}.zip`));
        setExported(chosen.length);
      },
    });
  };

  return (
    <section aria-labelledby="archivio-title">
      <h2 id="archivio-title" className="visually-hidden">
        Archivio
      </h2>
      {canExport && (
        <div className={docs.toolbar}>
          <div className={docs.toolbarInfo} aria-live="polite">
            <strong>
              {selected.size === 0
                ? 'Seleziona i documenti da esportare'
                : `${selectedDocs.length} selezionat${selectedDocs.length === 1 ? 'o' : 'i'} · ${formatBytes(totalBytes)}`}
            </strong>
            <span className={docs.limits}>
              ZIP con al massimo {MAX_EXPORT_DOCUMENTS} documenti e 100 MiB complessivi: limite tecnico di questa
              versione.
            </span>
            {selected.size > 0 && problem && <span className={docs.problem}>{problem}</span>}
          </div>
          <div className={docs.toolbarActions}>
            {selected.size > 0 && (
              <button
                type="button"
                className={cx(ui.btn, ui.small)}
                onClick={() => {
                  setSelected(new Set());
                  setExported(null);
                  exporter.reset();
                }}
              >
                Deseleziona
              </button>
            )}
            <button
              type="button"
              className={cx(ui.btn, ui.small, ui.dark)}
              onClick={runExport}
              disabled={!!problem || exporter.isPending}
            >
              {exporter.isPending ? 'Preparazione ZIP…' : 'Esporta ZIP'}
            </button>
          </div>
        </div>
      )}

      {exporter.isError && (
        <div className={docs.panel}>
          <Banner tone="error" role="alert" title="Esportazione non eseguita">
            <p>{exportErrorMessage(exporter.error)}</p>
          </Banner>
        </div>
      )}
      {exported !== null && (
        <div className={docs.panel} role="status">
          <Banner title="ZIP pronto">
            <p>
              Lo ZIP con {exported} document{exported === 1 ? 'o' : 'i'} è stato scaricato. I documenti in Dimora non sono
              stati modificati.
            </p>
          </Banner>
        </div>
      )}

      {filtered && (
        <p className={docs.resultsInfo} role="status">
          Risultati per {describeFilters(filters)}
          {documents.hasNextPage ? ' — ce ne sono altri' : ''}
        </p>
      )}
      <ul
        className={docs.list}
        aria-label={filtered ? `Risultati della ricerca in ${home.name}` : `Documenti di ${home.name}`}
      >
        {items.map((doc) => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            homeId={home.id}
            backSearch={filtered ? filtersToParams(filters).toString() : ''}
            selectable={canExport}
            selected={selected.has(doc.id)}
            onToggle={() => toggle(doc.id)}
          />
        ))}
      </ul>

      {documents.isFetchNextPageError && (
        <div className={docs.panel}>
          <ErrorState
            title="Altri documenti non caricati"
            error={documents.error}
            message={documentsErrorMessage(documents.error)}
          />
        </div>
      )}
      {documents.hasNextPage && (
        <div className={docs.more}>
          <button
            type="button"
            className={ui.btn}
            onClick={() => void documents.fetchNextPage()}
            disabled={documents.isFetchingNextPage}
          >
            {documents.isFetchingNextPage ? 'Caricamento…' : 'Mostra altri documenti'}
          </button>
        </div>
      )}
    </section>
  );
}

function exportErrorMessage(error: unknown) {
  if (isApiError(error) && error.kind === 'http') {
    if (error.status === 403) {
      return 'Almeno un documento selezionato non è esportabile con i tuoi permessi. Nessun file è stato esportato.';
    }
    if (error.code === 'export_too_large') return 'La selezione supera 100 MiB complessivi. Nessun file è stato esportato.';
    if (error.status === 404) return 'L’esportazione non è ancora attiva su questo servizio.';
  }
  return `${userMessage(error)} Nessun file è stato esportato.`;
}

function DocumentRow(props: {
  doc: DocumentSummary;
  homeId: string;
  /** Filtri applicati, per tornare dal dettaglio agli stessi risultati. */
  backSearch: string;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const { doc } = props;
  const account = useAccount();
  const exportable = doc.permissions.includes('export');
  return (
    <li className={cx(docs.item, props.selected && docs.itemSelected)}>
      {props.selectable && (
        <label className={docs.check} title={exportable ? undefined : 'Non esportabile con i tuoi permessi'}>
          <input
            type="checkbox"
            checked={props.selected}
            onChange={props.onToggle}
            disabled={!exportable}
            aria-label={`Seleziona «${doc.name}» per lo ZIP${exportable ? '' : ' (non esportabile)'}`}
          />
        </label>
      )}
      <span className={docs.symbol} aria-hidden="true">
        <Icon name="document" />
      </span>
      <div className={docs.body}>
        <Link
          className={docs.title}
          to={`/home/${encodeURIComponent(props.homeId)}/documenti/${encodeURIComponent(doc.id)}`}
          state={props.backSearch ? { documentsSearch: props.backSearch, documentsAccountId: account.id } : undefined}
        >
          {doc.name}
        </Link>
        <span className={docs.meta}>
          {doc.originalFilename} · {formatLabel(doc.mimeType)} · {formatBytes(doc.byteSize)} · {formatDate(doc.createdAt)}
        </span>
        <span className={docs.tags}>
          <Tag tone="blue">{STATUS_LABEL}</Tag>
          <Tag>{VISIBILITY_LABEL[doc.visibility] ?? doc.visibility}</Tag>
          <Tag>{SOURCE_LABEL}</Tag>
        </span>
      </div>
    </li>
  );
}

const UPLOAD_FIELDS = ['file', 'name', 'visibility'] as const;
type UploadField = (typeof UPLOAD_FIELDS)[number];

/**
 * Caricamento di un originale.
 * - File e bozza solo in memoria; il componente è smontato al cambio di casa/account.
 * - Idempotency-Key per operazione: un esito ambiguo (rete/servizio) blocca i campi
 *   e consente di riprovare con la stessa chiave e lo stesso file, senza doppioni.
 *   Cambiare i dati dopo un esito ambiguo richiede una nuova operazione esplicita.
 * - Un rifiuto definitivo (422/413/415) permette di correggere: nuova chiave al prossimo invio.
 */
/** Esportato anche per «Da documento» in Spese: stesso caricamento M2, nessun secondo archivio. */
export function UploadForm(props: {
  home: Home;
  titleId: string;
  onCancel: () => void;
  onUploaded: (doc: DocumentDetail) => void;
}) {
  const { home } = props;
  const uploadAccount = useAccount();
  const verificationEnabled = useSession().data?.authRecovery?.enabled === true;
  const upload = useUploadDocument(home.id);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [visibility, setVisibility] = useState<DocumentVisibility>('private');
  const [errors, setErrors] = useState<Partial<Record<UploadField, string>>>({});
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [locked, setLocked] = useState(false);
  const fileInputId = useId();

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const error = upload.error;
  const isService = isApiError(error) && error.kind === 'service';
  const isConflict = isApiError(error) && error.status === 409 && error.code === 'idempotency_conflict';

  const focusField = (field: UploadField) => {
    const selector = field === 'visibility' ? 'input[name="visibility"]:checked' : `[name="${field}"]`;
    formRef.current?.querySelector<HTMLInputElement>(selector)?.focus();
  };

  const send = (key: string) => {
    const clientErrors: Partial<Record<UploadField, string>> = {
      file: validateUploadFile(file),
      name: validateDocumentName(name),
    };
    setErrors(clientErrors);
    const first = UPLOAD_FIELDS.find((f) => clientErrors[f]);
    if (first || !file) {
      if (first) focusField(first);
      return;
    }
    upload.mutate(
      { input: { file, name: name.trim(), visibility }, idempotencyKey: key },
      {
        onSuccess: (doc) => props.onUploaded(doc),
        onError: (err) => {
          if (!isApiError(err)) return;
          if (err.kind === 'service') {
            // Esito sconosciuto: il documento potrebbe essere stato salvato.
            setLocked(true);
            return;
          }
          const fieldErrors: Partial<Record<UploadField, string>> = {};
          for (const f of UPLOAD_FIELDS) if (err.fieldErrors[f]) fieldErrors[f] = err.fieldErrors[f];
          if (err.code === 'file_too_large' || err.code === 'unsupported_file_type') {
            fieldErrors.file = fieldErrors.file ?? err.message;
          }
          setErrors(fieldErrors);
          if ([413, 415, 422].includes(err.status)) {
            // Rifiuto definitivo: il prossimo invio, con dati corretti, è una nuova operazione.
            setIdempotencyKey(newIdempotencyKey());
          }
          const first = UPLOAD_FIELDS.find((f) => fieldErrors[f]);
          if (first) focusField(first);
        },
      },
    );
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (upload.isPending) return;
    send(idempotencyKey);
  };

  const startNewOperation = () => {
    setIdempotencyKey(newIdempotencyKey());
    setLocked(false);
    upload.reset();
  };

  const onFileChange = (chosen: File | null) => {
    setFile(chosen);
    setErrors((e) => ({ ...e, file: chosen ? validateUploadFile(chosen) : undefined }));
    if (chosen && !nameEdited) setName(chosen.name);
  };

  const disabled = locked || upload.isPending;
  const formError =
    upload.isError && !isService && !isConflict && !Object.values(errors).some(Boolean) ? userMessage(error) : null;

  if (uploadAccount.requiresEmailVerification && !uploadAccount.emailVerifiedAt) return <Banner tone="warning" title="Conferma la tua email prima di caricare"><p>{verificationEnabled?'Richiedi il link di conferma dal riquadro «Conferma la tua email» in questa pagina. Casa, Attività e Spese restano disponibili.':'La verifica email non è disponibile in questo momento. Nessun file è stato caricato. Riprova più tardi.'}</p><button className={ui.btn} onClick={props.onCancel}>Chiudi</button></Banner>;
  return (
    <form ref={formRef} className={cx(styles.form, docs.formFlush)} onSubmit={onSubmit} noValidate aria-labelledby={props.titleId}>
      <div>
        <h2 id={props.titleId} ref={titleRef} tabIndex={-1}>
          Carica documento
        </h2>
        <p className={docs.note}>Un file per volta: PDF, JPEG o PNG fino a 20 MiB (limite tecnico di questa versione).</p>
      </div>
      <p className={docs.destination}>
        Destinazione: <strong>{home.name}</strong>
      </p>

      {isService && (
        <Banner
          tone="error"
          role="alert"
          title="Esito non confermato"
          actions={
            <>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={() => send(idempotencyKey)} disabled={upload.isPending}>
                Riprova invio
              </button>
              <button type="button" className={cx(ui.btn, ui.small)} onClick={startNewOperation} disabled={upload.isPending}>
                Modifica e invia come nuovo
              </button>
            </>
          }
        >
          <p>
            {userMessage(error)} Il documento potrebbe essere già stato salvato. «Riprova invio» ripete la stessa
            richiesta senza creare doppioni; per cambiare file o dati controlla prima l’archivio.
          </p>
        </Banner>
      )}
      {isConflict && (
        <Banner
          tone="warning"
          role="alert"
          title="Richiesta in conflitto"
          actions={
            <button
              type="button"
              className={cx(ui.btn, ui.small)}
              onClick={() => {
                const key = newIdempotencyKey();
                setIdempotencyKey(key);
                upload.reset();
                send(key);
              }}
            >
              Invia come nuova richiesta
            </button>
          }
        >
          <p>
            Una richiesta precedente con dati diversi risulta già registrata. Controlla l’archivio prima di inviare una
            nuova richiesta, per non creare un doppione.
          </p>
        </Banner>
      )}
      {formError && (
        <Banner tone="error" role="alert" title="Documento non caricato">
          <p>{formError}</p>
        </Banner>
      )}

      <div className={ui.field}>
        <label className={ui.label} htmlFor={fileInputId}>
          File
        </label>
        <span id={`${fileInputId}-hint`} className={ui.hint}>
          PDF, JPEG o PNG, massimo 20 MiB.
        </span>
        <input
          id={fileInputId}
          className={docs.fileInput}
          type="file"
          name="file"
          accept={ACCEPT_ATTRIBUTE}
          disabled={disabled}
          aria-invalid={errors.file ? true : undefined}
          aria-describedby={`${fileInputId}-hint${errors.file ? ` ${fileInputId}-error` : ''}`}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        {file && !errors.file && (
          <span className={docs.fileChosen}>
            Selezionato: {file.name} · {formatBytes(file.size)}
          </span>
        )}
        {errors.file && (
          <span id={`${fileInputId}-error`} className={ui.fieldError}>
            {errors.file}
          </span>
        )}
      </div>

      <Field
        label="Titolo"
        hint="Proposto dal nome del file, puoi cambiarlo. Massimo 160 caratteri."
        name="name"
        autoComplete="off"
        value={name}
        disabled={disabled}
        onChange={(e) => {
          setName(e.target.value);
          setNameEdited(true);
        }}
        error={errors.name}
      />

      <fieldset className={docs.fieldset} disabled={disabled}>
        <legend>Chi può vederlo</legend>
        {(['private', 'home'] as const).map((v) => (
          <label key={v} className={docs.radio}>
            <input
              type="radio"
              name="visibility"
              value={v}
              checked={visibility === v}
              onChange={() => setVisibility(v)}
            />
            <span>
              <strong>{VISIBILITY_LABEL[v]}</strong>
              <small>{VISIBILITY_HINT[v]}</small>
            </span>
          </label>
        ))}
        {errors.visibility && <span className={ui.fieldError}>{errors.visibility}</span>}
      </fieldset>

      <div className={styles.formActions}>
        {!locked && (
          <button type="submit" className={cx(ui.btn, ui.primary)} disabled={upload.isPending || isConflict}>
            {upload.isPending ? 'Caricamento in corso…' : 'Carica'}
          </button>
        )}
        <button type="button" className={cx(ui.btn, ui.ghost)} onClick={props.onCancel} disabled={upload.isPending}>
          Annulla
        </button>
      </div>
    </form>
  );
}
