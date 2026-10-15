import { useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { safeFilename } from '../api/client';
import { isApiError, userMessage } from '../api/errors';
import type { DocumentDetail, Home } from '../api/types';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { useDocument, useDocumentFile, useFetchDocumentFile, useObjectUrl } from '../documents/hooks';
import {
  SOURCE_LABEL,
  STATUS_LABEL,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
  formatBytes,
  formatDate,
  formatLabel,
  isImage,
  saveBlob,
} from '../lib/files';
import { filtersFromParams, filtersToParams } from '../lib/documentSearch';
import { LinkedExpenses } from '../expenses/LinkedExpenses';
import { documentsErrorMessage } from './DocumentsPages';
import { useCurrentHome } from './HomePages';
import { useAccount } from '../session/session';
import styles from './pages.module.css';
import docs from './documents.module.css';

export function DocumentDetailPage() {
  const home = useCurrentHome();
  const { documentId = '' } = useParams();
  const document = useDocument(home.id, documentId);
  const account = useAccount();
  const archive = `/home/${encodeURIComponent(home.id)}/documenti${backSearch(useLocation().state, account.id)}`;

  const back = (
    <Link to={archive} className={docs.backLink}>
      ← Documenti di {home.name}
    </Link>
  );

  if (document.isPending) {
    return (
      <>
        {back}
        <h1 className="visually-hidden" data-pending="">
          Documento
        </h1>
        <Loading label="Caricamento del documento…" />
      </>
    );
  }

  if (document.isError) {
    const status = isApiError(document.error) && document.error.kind === 'http' ? document.error.status : 0;
    // 403: nessun dettaglio sul documento richiesto. 422: identificativo non valido.
    if (status === 403 || status === 422) {
      return (
        <DocumentUnavailable back={back} title={status === 403 ? 'Documento non disponibile' : 'Indirizzo non valido'}>
          {status === 403
            ? 'Questo account non ha accesso al documento richiesto.'
            : 'L’indirizzo non corrisponde a un documento valido.'}
        </DocumentUnavailable>
      );
    }
    return (
      <>
        {back}
        <h1 tabIndex={-1}>Documento</h1>
        <div className={styles.spaced}>
          <ErrorState
            error={document.error}
            message={documentsErrorMessage(document.error)}
            onRetry={() => void document.refetch()}
            retrying={document.isFetching}
          />
        </div>
      </>
    );
  }

  const analyzeHref =
    home.permissions.includes('edit') && document.data.mimeType === 'application/pdf'
      ? `/home/${encodeURIComponent(home.id)}/attivita?analizza=${encodeURIComponent(document.data.id)}`
      : null;
  return <DocumentView doc={document.data} home={home} back={back} analyzeHref={analyzeHref} />;
}

function DocumentUnavailable(props: { back: ReactNode; title: string; children: string }) {
  useDocumentTitle(props.title);
  return (
    <div className={styles.stack}>
      <div>
        {props.back}
        <h1 tabIndex={-1}>{props.title}</h1>
      </div>
      <Banner tone="warning" role="alert">
        <p>{props.children}</p>
      </Banner>
    </div>
  );
}

function DocumentView(props: { doc: DocumentDetail; home: Home; back: ReactNode; analyzeHref: string | null }) {
  const homeName = props.home.name;
  const { doc } = props;
  useDocumentTitle(`${doc.name} · ${homeName}`);
  const canRead = doc.permissions.includes('read');

  return (
    <>
      {props.back}
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{homeName}</span>
          <h1 tabIndex={-1}>{doc.name}</h1>
          <div className={docs.tags}>
            <Tag tone="blue">{STATUS_LABEL}</Tag>
            <Tag>{VISIBILITY_LABEL[doc.visibility] ?? doc.visibility}</Tag>
            <Tag>Versione {doc.version}</Tag>
          </div>
          {props.home.permissions.includes('edit') && (
            <p className={styles.spaced}>
              {/* Scorciatoia: il documento è solo evidenziato nella scelta, mai selezionato; l'idoneità la decide il server. */}
              <Link to={`/home/${encodeURIComponent(props.home.id)}/condivisioni/nuova?documento=${encodeURIComponent(doc.id)}`} className={ui.btn}>
                Condividi…
              </Link>
            </p>
          )}
          {props.analyzeHref && (
            <p className={styles.spaced}>
              {/* Avvio esplicito: aprire o leggere il PDF non avvia mai un'analisi. */}
              <Link to={props.analyzeHref} className={ui.btn}>
                Analizza questo documento
              </Link>
            </p>
          )}
        </div>
      </div>
      <div className={docs.detailGrid}>
        <section className={cx(ui.card, docs.preview)} aria-labelledby="doc-anteprima">
          <h2 id="doc-anteprima" className={styles.cardTitle}>
            Originale
          </h2>
          {canRead ? (
            <Preview doc={doc} />
          ) : (
            <p className={styles.muted}>Il tuo accesso non consente di aprire il file originale.</p>
          )}
        </section>
        <section className={ui.card} aria-labelledby="doc-dati">
          <h2 id="doc-dati" className={styles.cardTitle}>
            Dati del file
          </h2>
          <dl className={styles.detailList}>
            <dt>Nome del file</dt>
            <dd>{doc.originalFilename}</dd>
            <dt>Formato</dt>
            <dd>{formatLabel(doc.mimeType)}</dd>
            <dt>Dimensione</dt>
            <dd>{formatBytes(doc.byteSize)}</dd>
            <dt>Caricato il</dt>
            <dd>{formatDate(doc.createdAt)}</dd>
            <dt>Versione</dt>
            <dd>{doc.version}</dd>
            <dt>Fonte</dt>
            <dd>{SOURCE_LABEL}</dd>
            <dt>Chi può vederlo</dt>
            <dd>
              {VISIBILITY_LABEL[doc.visibility] ?? doc.visibility}
              <br />
              <span className={docs.note}>{VISIBILITY_HINT[doc.visibility]}</span>
            </dd>
            <dt>Stato</dt>
            <dd>{STATUS_LABEL}</dd>
            <dt>Impronta SHA-256</dt>
            <dd className={docs.hash}>{doc.sha256}</dd>
          </dl>
          <p className={cx(docs.note, styles.spaced)}>
            L’originale è conservato byte per byte. Caricarlo o scaricarlo non conferma i dati e non certifica
            contenuto, proprietà o validità tecnica.
          </p>
        </section>
      </div>
      {canRead && (
        <div className={styles.spaced}>
          <LinkedExpenses home={props.home} by={{ documentId: doc.id }} title="Spese collegate" addLabel="Registra una spesa da questo documento" />
        </div>
      )}
    </>
  );
}

/** Anteprima dai soli byte autorizzati ricevuti con fetch; download dallo stesso Blob. */
function Preview({ doc }: { doc: DocumentDetail }) {
  const file = useDocumentFile(doc.homeId, doc.id, true);
  const fetchFile = useFetchDocumentFile(doc.homeId, doc.id);
  const url = useObjectUrl(file.data?.blob);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const type = file.data?.contentType || doc.mimeType;

  const download = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const payload = await fetchFile();
      saveBlob(payload.blob, payload.filename ?? safeFilename(doc.originalFilename));
    } catch (error) {
      setDownloadError(error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadButton = (
    <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => void download()} disabled={downloading}>
      {downloading ? 'Download in corso…' : 'Scarica originale'}
    </button>
  );

  return (
    <>
      {file.isPending ? (
        <div className={docs.previewFrame}>
          <Loading label="Caricamento dell’anteprima…" />
        </div>
      ) : file.isError ? (
        <ErrorState
          title="Anteprima non disponibile"
          error={file.error}
          message={documentsErrorMessage(file.error)}
          onRetry={() => void file.refetch()}
          retrying={file.isFetching}
        />
      ) : url ? (
        <div className={docs.previewFrame}>
          {isImage(type) ? (
            <img className={docs.previewImage} src={url} alt={`Anteprima di ${doc.name}`} />
          ) : (
            <object className={docs.previewPdf} data={url} type="application/pdf" aria-label={`Anteprima di ${doc.name}`}>
              <div className={docs.pdfFallback}>
                <p>Questo browser non mostra l’anteprima del PDF. Puoi scaricare l’originale.</p>
              </div>
            </object>
          )}
        </div>
      ) : null}
      <div className={styles.formActions}>{downloadButton}</div>
      {downloadError !== null && (
        <Banner tone="error" role="alert" title="Download non riuscito">
          <p>{isApiError(downloadError) ? documentsErrorMessage(downloadError) : userMessage(downloadError)}</p>
        </Banner>
      )}
    </>
  );
}

/**
 * Filtri H2 con cui si è arrivati dai risultati (stato della navigazione, non
 * l'URL): riletti e riscritti, così passano soltanto q/format/visibility.
 */
function backSearch(state: unknown, accountId: string) {
  const saved = state as { documentsSearch?: unknown; documentsAccountId?: unknown } | null;
  if (saved?.documentsAccountId !== accountId) return '';
  const raw = saved.documentsSearch;
  if (typeof raw !== 'string') return '';
  const params = filtersToParams(filtersFromParams(new URLSearchParams(raw))).toString();
  return params ? `?${params}` : '';
}
