import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import type { Home } from '../api/types';
import type { Share, SharePerson, SharePreview, ShareRecipient, SharingCapabilities, SharingDocument } from '../api/sharingTypes';
import { sharingApi, sharingKeys } from '../api/sharingClient';
import act from '../activities/activities.module.css';
import { Dialog } from '../activities/components';
import { Banner, ErrorState, Loading, Tag, cx, ui, useDocumentTitle } from '../components/ui';
import { formatBytes } from '../lib/files';
import { isNotActiveError } from '../lib/economy';
import {
  SHARE_STATE_LABEL,
  VISIBILITY_LABEL,
  formatDateTime,
  formatTime,
  groupCode,
  isPreviewExpired,
  isShareUnavailableError,
  shareTone,
  sharingErrorMessage,
} from '../lib/sharing';
import { ItemMeta, NeverIncluded, OperationFeedback } from '../sharing/components';
import {
  useDropOnForbidden,
  useShare,
  useShares,
  useSharingCapabilities,
  useSharingDocuments,
  useSharingOperation,
  useSharingRecipients,
  useStoreShare,
} from '../sharing/hooks';
import { useAccount, useApi } from '../session/session';
import { useCurrentHome } from './HomePages';
import pages from './pages.module.css';

// C1a lato mittente: elenco, preparazione in quattro passaggi con manifesto del server, dettaglio con
// codice, abbinamento e revoca. Il codice di abbinamento vive solo nello stato di questo componente.

const sharesPath = (homeId: string, shareId?: string) => `/home/${encodeURIComponent(homeId)}/condivisioni${shareId ? `/${encodeURIComponent(shareId)}` : ''}`;
const recipientTitle = (share: Share) => share.recipient?.name ?? (share.state === 'unavailable' ? 'Condivisione non più disponibile' : 'Persona esterna');

function CapsGate(props: { home: Home; title: string; children: (caps: SharingCapabilities) => ReactNode }) {
  const caps = useSharingCapabilities(props.home.id);
  useDocumentTitle(`${props.title} · ${props.home.name}`);
  const back = <Link to={`/home/${encodeURIComponent(props.home.id)}/casa`} className={pages.spaced}>← Casa</Link>;
  if (caps.isPending) return <>{back}<Loading label="Verifica del servizio…" /></>;
  if (caps.isError || !caps.data.enabled) {
    return (
      <>
        {back}
        <h1 tabIndex={-1}>{props.title}</h1>
        {caps.isError && !isNotActiveError(caps.error) ? (
          <ErrorState error={caps.error} message={sharingErrorMessage(caps.error)} onRetry={() => void caps.refetch()} retrying={caps.isFetching} />
        ) : (
          <p className={pages.muted}>La condivisione selettiva non è ancora attiva su questo servizio.</p>
        )}
      </>
    );
  }
  return <>{props.children(caps.data)}</>;
}

// ---------------------------------------------------------------------------------
// Elenco
// ---------------------------------------------------------------------------------

export function SharesPage() {
  const home = useCurrentHome();
  return <CapsGate home={home} title="Condivisioni">{(caps) => <SharesList home={home} caps={caps} />}</CapsGate>;
}

function SharesList({ home, caps }: { home: Home; caps: SharingCapabilities }) {
  const list = useShares(home.id, true);
  const account = useAccount();
  useDropOnForbidden(sharingKeys.shares(account.id, home.id), list);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <Link to={`/home/${encodeURIComponent(home.id)}/casa`} className={pages.spaced}>← Casa</Link>
      <div className={pages.heading}>
        <div>
          <span className={pages.eyebrow} style={{ display: 'block' }}>{home.name}</span>
          <h1 tabIndex={-1}>Condivisioni</h1>
          <p className={pages.lead}>Originali scelti da te, consegnati a una persona precisa per un periodo limitato. Non danno accesso alla casa, alle spese o alle attività.</p>
        </div>
        {caps.permissions.includes('prepare') && (
          <Link to={`${sharesPath(home.id)}/nuova`} className={cx(ui.btn, ui.primary)}>Prepara una condivisione</Link>
        )}
      </div>
      <section className={ui.card} aria-label="Condivisioni preparate">
        {list.isPending ? (
          <Loading label="Caricamento delle condivisioni…" />
        ) : list.isError && (!list.data || isShareUnavailableError(list.error)) ? (
          <ErrorState error={list.error} message={sharingErrorMessage(list.error)} onRetry={() => void list.refetch()} retrying={list.isFetching} />
        ) : items.length === 0 ? (
          <p className={pages.muted}>{caps.permissions.includes('prepare') ? 'Nessuna condivisione preparata.' : 'Nessuna condivisione. Con il tuo ruolo puoi consultare la casa ma non preparare condivisioni.'}</p>
        ) : (
          <ul className={act.list} aria-label="Condivisioni">
            {items.map((s) => (
              <li key={s.id} className={act.item}>
                <div className={act.itemHead}>
                  <Link to={sharesPath(home.id, s.id)} className={act.title}>{recipientTitle(s)}</Link>
                  <Tag tone={shareTone(s.state)}>{SHARE_STATE_LABEL[s.state]}</Tag>
                </div>
                <span className={act.meta}>
                  {s.state === 'unavailable' ? 'Contenuto non più disponibile' : `${s.items.length === 1 ? '1 file' : `${s.items.length} file`} · fino a ${formatDateTime(s.expiresAt)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {list.hasNextPage && (
          <p className={pages.spaced}>
            <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage ? 'Caricamento…' : 'Carica altre'}
            </button>
          </p>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------------
// Preparazione: contenuti → destinatario → durata → controllo (manifesto del server) → conferma
// ---------------------------------------------------------------------------------

export function NewSharePage() {
  const home = useCurrentHome();
  const account = useAccount();
  return (
    <CapsGate home={home} title="Nuova condivisione">
      {(caps) =>
        caps.permissions.includes('prepare') ? (
          <ShareWizard key={`${account.id}:${home.id}`} home={home} caps={caps} />
        ) : (
          <>
            <Link to={sharesPath(home.id)} className={pages.spaced}>← Condivisioni</Link>
            <h1 tabIndex={-1}>Nuova condivisione</h1>
            <p className={pages.muted}>Con il tuo ruolo non puoi preparare condivisioni in questa casa.</p>
          </>
        )
      }
    </CapsGate>
  );
}

const STEPS = ['Contenuti', 'Destinatario', 'Durata', 'Controllo'];

function ShareWizard({ home, caps }: { home: Home; caps: SharingCapabilities }) {
  const api = useApi();
  const account = useAccount();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = useId();
  const origin = params.get('documento');
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<SharingDocument[]>([]);
  const [recipientTab, setRecipientTab] = useState<'member' | 'external'>('member');
  const [recipient, setRecipient] = useState<ShareRecipient | null>(null);
  const days = caps.limits.durationDays;
  const [duration, setDuration] = useState<number>(days.includes(7) ? 7 : days[0]!);
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [acks, setAcks] = useState<string[]>([]);
  const [expired, setExpired] = useState(false);
  const [created, setCreated] = useState<{ share: Share; code: string | null } | null>(null);
  const previewOp = useSharingOperation<SharePreview>();
  const createOp = useSharingOperation<Share>();
  const storeShare = useStoreShare(home.id);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const leaving = useRef(false);
  const docs = useSharingDocuments(home.id, true);
  const recipients = useSharingRecipients(home.id, step === 1 && recipientTab === 'member');
  // Esito ignoto della creazione: la consegna resta quella già inviata, nessuna modifica fino al recupero.
  const locked = createOp.ambiguous || createOp.pending;

  // Lasciare la preparazione scarta la selezione: lo chiediamo prima, mai in silenzio.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !leaving.current && !created && (selected.length > 0 || locked) && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (step > 0 || created) stepHeading.current?.focus();
  }, [step, created]);

  // Il controllo del server vale fino a validUntil: dopo serve un controllo nuovo, non la vecchia conferma.
  useEffect(() => {
    if (!preview) return;
    const check = () => setExpired(Date.now() >= Date.parse(preview.validUntil));
    check();
    const t = window.setInterval(check, 5000);
    return () => window.clearInterval(t);
  }, [preview]);

  /** Ogni modifica a contenuto, destinatario o durata invalida controllo e conferme. */
  const invalidate = () => {
    setPreview(null);
    setAcks([]);
    setExpired(false);
    previewOp.reset();
  };
  const toggle = (d: SharingDocument, on: boolean) => {
    invalidate();
    setSelected((cur) => (on ? [...cur, d] : cur.filter((x) => x.documentId !== d.documentId)));
  };
  const totalBytes = selected.reduce((n, d) => n + d.byteSize, 0);
  const tooMany = selected.length > caps.limits.maxDocuments;
  const tooBig = totalBytes > caps.limits.maxBytes;
  const homeVisibleToMember = recipient?.kind === 'member' && selected.some((d) => d.visibility === 'home');

  const requestPreview = () => {
    if (!recipient || !selected.length) return;
    invalidate();
    const body = { documentIds: selected.map((d) => d.documentId), recipient, durationDays: duration };
    previewOp.run((key) => sharingApi(api).createPreview(home.id, body, key, account.id), (p) => {
      setPreview(p);
      setStep(3);
    });
  };
  const create = () => {
    if (!preview || expired || acks.length !== preview.items.length) return;
    const body = { previewId: preview.id, expectedPreviewVersion: 1 as const, manifestFingerprint: preview.manifestFingerprint, acknowledgedDocumentIds: preview.items.map((i) => i.documentId) };
    createOp.run(
      (key) => sharingApi(api).create(home.id, body, key, account.id),
      (share) => {
        storeShare(share);
        leaving.current = true;
        if (share.pairing) setCreated({ share, code: share.pairing.code });
        else navigate(sharesPath(home.id, share.id), { replace: true });
      },
      (err) => {
        if (isPreviewExpired(err)) setExpired(true);
      },
    );
  };

  if (created) {
    return (
      <>
        <Link to={sharesPath(home.id)} className={pages.spaced}>← Condivisioni</Link>
        <span className={pages.eyebrow} style={{ display: 'block' }}>{home.name} · Nuova condivisione</span>
        <h1 tabIndex={-1}>Invito creato</h1>
        <section className={ui.card} aria-labelledby={`${id}-code`}>
          <h2 id={`${id}-code`} ref={stepHeading} tabIndex={-1} className={pages.cardTitle}>Codice da comunicare tu</h2>
          <PairingCode code={created.code} expiresAt={created.share.pairing?.codeExpiresAt ?? null} />
          <p className={pages.spaced}>
            <Link to={sharesPath(home.id, created.share.id)} className={ui.btn}>Vai alla condivisione</Link>
          </p>
        </section>
      </>
    );
  }

  const stepper = (
    <ol className={act.counts} aria-label="Passaggi" style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {STEPS.map((label, k) => (
        <li key={label} aria-current={k === step ? 'step' : undefined}>
          <Tag tone={k === step ? 'blue' : 'neutral'}>{k < step ? '✓ ' : `${k + 1}. `}{label}</Tag>
        </li>
      ))}
    </ol>
  );
  const nav = (next: ReactNode) => (
    <p className={act.actions}>
      {step > 0 && <button type="button" className={ui.btn} onClick={() => setStep(step - 1)} disabled={locked}>Indietro</button>}
      {next}
      <button type="button" className={cx(ui.btn, ui.ghost)} onClick={() => navigate(sharesPath(home.id))}>Annulla</button>
    </p>
  );

  return (
    <>
      <Link to={sharesPath(home.id)} className={pages.spaced}>← Condivisioni</Link>
      <span className={pages.eyebrow} style={{ display: 'block' }}>{home.name} · Nuova condivisione</span>
      <h1 tabIndex={-1}>Nuova condivisione</h1>
      {stepper}
      <div className={pages.stack}>
        {step === 0 && (
          <section className={ui.card} aria-labelledby={`${id}-s0`}>
            <h2 id={`${id}-s0`} className={pages.cardTitle}>Quali originali vuoi condividere?</h2>
            <p className={act.meta}>Nessun file è selezionato: scegli tu. Puoi condividere solo originali caricati da te.</p>
            <DocumentPicker docs={docs} origin={origin} selected={selected} onToggle={toggle} maxReached={selected.length >= caps.limits.maxDocuments} />
            <p className={act.count} aria-live="polite" id={`${id}-count`}>
              {selected.length === 0 ? 'Nessun file selezionato' : `${selected.length === 1 ? '1 file selezionato' : `${selected.length} file selezionati`} · ${formatBytes(totalBytes)}`}
            </p>
            {(tooMany || tooBig) && (
              <Banner tone="warning"><p>{tooMany ? `Al massimo ${caps.limits.maxDocuments} file per condivisione.` : `Al massimo ${formatBytes(caps.limits.maxBytes)} in tutto.`} Togli qualche file.</p></Banner>
            )}
            <h3 className={pages.spaced} style={{ fontSize: 14 }}>Mai inclusi in una condivisione</h3>
            <NeverIncluded />
            {nav(<button type="button" className={cx(ui.btn, ui.primary)} disabled={!selected.length || tooMany || tooBig} onClick={() => setStep(1)}>Continua</button>)}
          </section>
        )}

        {step === 1 && (
          <section className={ui.card} aria-labelledby={`${id}-s1`}>
            <h2 id={`${id}-s1`} ref={stepHeading} tabIndex={-1} className={pages.cardTitle}>Con chi?</h2>
            {caps.externalPairing && (
              <div role="group" aria-label="Tipo di destinatario" className={act.actions}>
                <button type="button" className={cx(ui.btn, ui.small)} aria-pressed={recipientTab === 'member'} onClick={() => setRecipientTab('member')}>Persona della casa</button>
                <button type="button" className={cx(ui.btn, ui.small)} aria-pressed={recipientTab === 'external'} onClick={() => setRecipientTab('external')}>Persona esterna</button>
              </div>
            )}
            {recipientTab === 'member' ? (
              <MemberPicker
                query={recipients}
                value={recipient?.kind === 'member' ? recipient.accountId : null}
                name={`${id}-member`}
                onPick={(p) => { invalidate(); setRecipient({ kind: 'member', accountId: p.id }); }}
              />
            ) : (
              <>
                <p>Dimora non si fida di un indirizzo email digitato. Per una persona esterna:</p>
                <ol className={act.meta}>
                  <li>crei l’invito e ricevi un codice di 10 caratteri, valido {caps.limits.codeMinutes} minuti, mostrato una sola volta;</li>
                  <li>lo comunichi tu alla persona: Dimora non invia email o SMS;</li>
                  <li>la persona accede con il suo account e inserisce il codice, senza vedere ancora nulla;</li>
                  <li>vedi nome ed email dichiarati da quell’account (non verificati) e un codice di confronto: lo confronti con la persona tramite un recapito che conosci già, poi confermi;</li>
                  <li>la persona accetta l’invito e solo allora vede i file.</li>
                </ol>
                <label className={act.item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name={`${id}-member`} checked={recipient?.kind === 'external'} onChange={() => { invalidate(); setRecipient({ kind: 'external' }); }} />
                  <span><strong>Persona esterna con codice di abbinamento</strong></span>
                </label>
              </>
            )}
            {homeVisibleToMember && (
              <Banner><p>Alcuni file scelti sono già visibili a «Persone della casa». Questa condivisione non cambia quella visibilità e revocarla non la toglie.</p></Banner>
            )}
            {nav(<button type="button" className={cx(ui.btn, ui.primary)} disabled={!recipient} onClick={() => setStep(2)}>Continua</button>)}
          </section>
        )}

        {step === 2 && (
          <section className={ui.card} aria-labelledby={`${id}-s2`}>
            <h2 id={`${id}-s2`} ref={stepHeading} tabIndex={-1} className={pages.cardTitle}>Per quanto tempo?</h2>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="visually-hidden">Durata</legend>
              {days.map((n) => (
                <label key={n} className={act.item} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name={`${id}-days`} checked={duration === n} onChange={() => { invalidate(); setDuration(n); }} />
                  <span>{n === 1 ? '1 giorno' : `${n} giorni`}{n === 7 ? ' · proposta' : ''}</span>
                </label>
              ))}
            </fieldset>
            <p className={act.meta}>L’istante esatto di fine lo calcola il servizio e lo vedrai nel controllo. Puoi revocare prima; le copie già scaricate restano alla persona.</p>
            <OperationFeedback op={previewOp} title="Controllo non preparato" onReread={() => { void docs.refetch(); setStep(0); }} />
            {nav(
              !previewOp.ambiguous && (
                <button type="button" className={cx(ui.btn, ui.primary)} onClick={requestPreview} disabled={previewOp.pending}>
                  {previewOp.pending ? 'Preparazione…' : 'Prepara il controllo'}
                </button>
              ),
            )}
          </section>
        )}

        {step === 3 && preview && (
          <section className={ui.card} aria-labelledby={`${id}-s3`}>
            <h2 id={`${id}-s3`} ref={stepHeading} tabIndex={-1} className={pages.cardTitle}>Controlla prima di creare l’invito</h2>
            <p className={act.meta}>Questo è il manifesto preparato dal servizio: esattamente ciò che la persona potrà vedere. Nuovi caricamenti o versioni non vengono aggiunti.</p>
            <dl className={pages.detailList}>
              <dt>Destinatario</dt>
              <dd>
                {preview.recipientPerson ? (
                  <>{preview.recipientPerson.name} · {preview.recipientPerson.email} <span className={act.meta}>(profilo dell’account)</span></>
                ) : (
                  <>Persona esterna: codice di abbinamento valido {caps.limits.codeMinutes} minuti, poi tua conferma e accettazione della persona</>
                )}
              </dd>
              <dt>Accessibile fino a</dt>
              <dd>{formatDateTime(preview.expiresAt)}</dd>
              <dt>Permessi</dt>
              <dd>Consultare e scaricare. Non può modificare, caricare né ricondividere dentro Dimora.</dd>
            </dl>
            <Banner tone="warning" title="File completi">
              <p>La persona vedrà i file completi, anche eventuali importi, IBAN e dati personali al loro interno. Dimora non li oscura e non li riconosce: controlla ogni file.</p>
            </Banner>
            <fieldset className={pages.spaced} style={{ border: 0, padding: 0, margin: 0 }} disabled={locked || expired}>
              <legend className={act.meta}>Conferma ogni file ({acks.length} di {preview.items.length})</legend>
              {preview.items.map((it) => (
                <label key={it.documentId} className={act.item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acks.includes(it.documentId)}
                    onChange={(e) => setAcks((cur) => (e.target.checked ? [...cur, it.documentId] : cur.filter((x) => x !== it.documentId)))}
                  />
                  <span>
                    <strong>{it.name}</strong>
                    <span style={{ display: 'block' }}><ItemMeta item={it} /></span>
                    <span className={act.meta} style={{ display: 'block' }}>Ho controllato: verrà consegnato completo.</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {expired ? (
              <Banner tone="warning" role="alert" title="Controllo scaduto" actions={<button type="button" className={cx(ui.btn, ui.small)} onClick={requestPreview} disabled={previewOp.pending}>Prepara un nuovo controllo</button>}>
                <p>Il controllo valeva fino alle {formatTime(preview.validUntil)}. Le conferme precedenti non valgono più: ripeti il controllo.</p>
              </Banner>
            ) : (
              <p className={act.meta}>Controllo valido fino alle {formatTime(preview.validUntil)}.</p>
            )}
            <OperationFeedback op={previewOp} title="Controllo non preparato" />
            <OperationFeedback op={createOp} title="Invito non creato" />
            {nav(
              !createOp.ambiguous && (
                <button type="button" className={cx(ui.btn, ui.primary)} onClick={create} disabled={createOp.pending || expired || acks.length !== preview.items.length}>
                  {createOp.pending ? 'Creazione…' : 'Crea l’invito'}
                </button>
              ),
            )}
            <p className={act.meta}>
              {preview.recipientPerson ? `Nessuna email: l’invito comparirà fra le consegne di ${preview.recipientPerson.name}, che dovrà accettarlo.` : 'Nessuna email: vedrai il codice da comunicare tu.'}
            </p>
          </section>
        )}
      </div>
      {blocker.state === 'blocked' && (
        <Dialog title="Lasciare la preparazione?" onClose={() => blocker.reset()}>
          <p>{locked ? 'L’esito dell’invito non è confermato: controlla l’elenco Condivisioni prima di prepararne un altro.' : 'La selezione non viene salvata. Nessun invito è stato creato.'}</p>
          <p className={act.actions}>
            <button type="button" className={ui.btn} onClick={() => blocker.reset()}>Resta</button>
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => blocker.proceed()}>Esci senza salvare</button>
          </p>
        </Dialog>
      )}
    </>
  );
}

function DocumentPicker(props: {
  docs: ReturnType<typeof useSharingDocuments>;
  origin: string | null;
  selected: SharingDocument[];
  onToggle: (d: SharingDocument, on: boolean) => void;
  maxReached: boolean;
}) {
  const { docs } = props;
  if (docs.isPending) return <Loading label="Caricamento dei documenti…" />;
  if (docs.isError && (!docs.data || isShareUnavailableError(docs.error))) return <ErrorState error={docs.error} message={sharingErrorMessage(docs.error)} onRetry={() => void docs.refetch()} retrying={docs.isFetching} />;
  const items = docs.data.pages.flatMap((p) => p.items);
  const originDoc = props.origin ? items.find((d) => d.documentId === props.origin) : undefined;
  return (
    <>
      {originDoc && <p className={act.meta}>Sei partito da «{originDoc.name}»: è evidenziato nell’elenco, non selezionato.</p>}
      {props.origin && !originDoc && docs.hasNextPage && (
        <p className={act.meta}>Il documento da cui sei partito non è fra quelli già caricati: usa «Carica altri» per trovarlo. Non viene selezionato.</p>
      )}
      {items.length === 0 && <p className={pages.muted}>Nessun documento leggibile in questa casa.</p>}
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="visually-hidden">Originali da includere</legend>
        <ul className={act.list} aria-label="Originali">
          {items.map((d) => {
            const isOn = props.selected.some((x) => x.documentId === d.documentId);
            const isOrigin = d.documentId === props.origin;
            return (
              <li key={d.documentId} className={act.item} style={isOrigin ? { borderLeft: '3px solid var(--color-cyan)', paddingLeft: 10 } : undefined}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: d.eligible ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" checked={isOn} disabled={!d.eligible || (!isOn && props.maxReached)} onChange={(e) => props.onToggle(d, e.target.checked)} />
                  <span>
                    <strong>{d.name}</strong>{isOrigin && <> <Tag>Documento di partenza</Tag></>}
                    <span className={act.meta} style={{ display: 'block' }}>{formatBytes(d.byteSize)} · versione {d.documentVersion} · {VISIBILITY_LABEL[d.visibility]}</span>
                    {!d.eligible && (
                      <span className={act.meta} style={{ display: 'block' }}>
                        {d.ineligibleReason === 'not_uploader' ? 'Caricato da un’altra persona: puoi leggerlo, ma solo chi l’ha caricato può condividerlo.' : 'Non condivisibile da te.'}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      {docs.hasNextPage && (
        <p className={pages.spaced}>
          <button type="button" className={cx(ui.btn, ui.small)} onClick={() => void docs.fetchNextPage()} disabled={docs.isFetchingNextPage}>
            {docs.isFetchingNextPage ? 'Caricamento…' : 'Carica altri'}
          </button>
        </p>
      )}
      {docs.isFetchNextPageError && <ErrorState error={docs.error} message={sharingErrorMessage(docs.error)} onRetry={() => void docs.fetchNextPage()} />}
    </>
  );
}

function MemberPicker(props: { query: ReturnType<typeof useSharingRecipients>; value: string | null; name: string; onPick: (p: SharePerson) => void }) {
  const { query } = props;
  if (query.isPending) return <Loading label="Caricamento delle persone della casa…" />;
  if (query.isError) {
    const tooMany = query.error instanceof Error && 'status' in query.error && (query.error as { status: number }).status === 422;
    return tooMany ? (
      <Banner tone="warning"><p>Questa casa ha più di 100 persone: l’elenco non può essere mostrato per intero e non lo tronchiamo. Serve un’estensione del servizio.</p></Banner>
    ) : (
      <ErrorState error={query.error} message={sharingErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
    );
  }
  if (query.data.length === 0) return <p className={pages.muted}>Nessun’altra persona fa parte di questa casa.</p>;
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={act.meta}>Scegli dall’elenco delle persone di questa casa. Nome ed email sono quelli del loro account.</legend>
      {query.data.map((p) => (
        <label key={p.id} className={act.item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="radio" name={props.name} checked={props.value === p.id} onChange={() => props.onPick(p)} />
          <span><strong>{p.name}</strong><span className={act.meta} style={{ display: 'block' }}>{p.email}</span></span>
        </label>
      ))}
      <p className={act.meta}>Rende leggibili solo i file scelti, per il periodo scelto. Non cambia «Solo io / Persone della casa» e non dà altri diritti.</p>
    </fieldset>
  );
}

/** Codice iniziale: solo da create/rotate, nello stato del componente. Lasciata la pagina, non si recupera. */
function PairingCode({ code, expiresAt }: { code: string | null; expiresAt: string | null }) {
  if (!code) {
    return <p>Codice non recuperabile: viene mostrato una sola volta. Se serve, genera un nuovo codice dal dettaglio della condivisione.</p>;
  }
  return (
    <>
      <p style={{ font: '700 26px/1.3 ui-monospace, Consolas, monospace', letterSpacing: 3, margin: '8px 0', overflowWrap: 'anywhere' }} aria-label={`Codice: ${code.split('').join(' ')}`}>
        {groupCode(code)}
      </p>
      <p className={act.meta}>
        Valido fino alle {formatTime(expiresAt)}, una sola volta. Comunicalo tu, a voce o di persona: Dimora non lo invia. Se lasci questa pagina non potrai rivederlo e dovrai generarne uno nuovo.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------------
// Dettaglio mittente
// ---------------------------------------------------------------------------------

export function ShareDetailPage() {
  const home = useCurrentHome();
  const account = useAccount();
  const { shareId = '' } = useParams();
  return <ShareDetail key={`${account.id}:${home.id}:${shareId}`} home={home} shareId={shareId} />;
}

function ShareDetail({ home, shareId }: { home: Home; shareId: string }) {
  const api = useApi();
  const account = useAccount();
  const query = useShare(home.id, shareId);
  useDropOnForbidden(sharingKeys.share(account.id, home.id, shareId), query);
  const storeShare = useStoreShare(home.id);
  const op = useSharingOperation<Share>();
  const [code, setCode] = useState<{ value: string | null; expiresAt: string | null } | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  useDocumentTitle(`Condivisione · ${home.name}`);
  const back = <Link to={sharesPath(home.id)} className={pages.spaced}>← Condivisioni</Link>;
  const forbidden = query.isError && isShareUnavailableError(query.error);
  if (query.isPending) return <>{back}<Loading label="Lettura della condivisione…" /></>;
  if (forbidden || !query.data) {
    return (
      <>
        {back}
        <h1 tabIndex={-1}>{forbidden ? 'Condivisione non disponibile' : 'Condivisione'}</h1>
        {forbidden ? (
          <p className={pages.muted}>Questa condivisione non esiste o non è accessibile dal tuo account.</p>
        ) : (
          <ErrorState error={query.error} message={sharingErrorMessage(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        )}
      </>
    );
  }
  const s = query.data;
  const can = (p: Share['permissions'][number]) => s.permissions.includes(p);
  const after = (share: Share) => storeShare(share);
  const rotate = () => {
    setConfirmRotate(false);
    op.run((key) => sharingApi(api).action(home.id, s.id, 'rotate-code', { expectedVersion: s.version }, key, account.id), (share) => {
      setCode({ value: share.pairing?.code ?? null, expiresAt: share.pairing?.codeExpiresAt ?? null });
      after(share);
    });
  };
  const revoke = () => {
    setConfirmRevoke(false);
    op.run((key) => sharingApi(api).action(home.id, s.id, 'revoke', { expectedVersion: s.version }, key, account.id), (share) => { setCode(null); after(share); });
  };
  const claim = s.pairing?.claim ?? null;
  return (
    <>
      {back}
      <span className={pages.eyebrow} style={{ display: 'block' }}>{home.name} · Condivisione</span>
      <h1 tabIndex={-1}>{recipientTitle(s)}</h1>
      <p><Tag tone={shareTone(s.state)}>{SHARE_STATE_LABEL[s.state]}</Tag></p>
      {query.isError && (
        <Banner tone="warning" role="status" actions={<button type="button" className={cx(ui.btn, ui.small)} onClick={() => void query.refetch()}>Aggiorna</button>}>
          <p>Ultimo aggiornamento non riuscito: lo stato mostrato potrebbe non essere attuale.</p>
        </Banner>
      )}
      <div className={pages.stack}>
        {s.state === 'awaiting_pairing' && (
          <section className={ui.card} aria-labelledby="share-code">
            <h2 id="share-code" className={pages.cardTitle}>Codice di abbinamento</h2>
            {code ? <PairingCode code={code.value} expiresAt={code.expiresAt} /> : <p>Il codice viene mostrato una sola volta, quando lo generi. Se non lo hai più o è scaduto, generane uno nuovo: il precedente smetterà di funzionare.</p>}
            {s.pairing?.codeExpiresAt && !code && <p className={act.meta}>Il codice attuale scade alle {formatTime(s.pairing.codeExpiresAt)}.</p>}
            {can('rotate_code') && <p className={act.actions}><button type="button" className={ui.btn} onClick={() => setConfirmRotate(true)} disabled={op.pending || op.ambiguous}>Genera un nuovo codice</button></p>}
          </section>
        )}
        {s.state === 'awaiting_confirmation' && claim && (
          <PairingConfirm
            key={`${claim.id}:${s.version}`}
            share={s}
            busy={op.pending || op.ambiguous}
            onConfirm={() =>
              op.run((key) => sharingApi(api).action(home.id, s.id, 'confirm-pairing', { expectedVersion: s.version, claimId: claim.id, comparisonCode: claim.comparisonCode, confirmRecipient: true }, key, account.id), after)
            }
            onWrongPerson={can('rotate_code') ? () => setConfirmRotate(true) : undefined}
          />
        )}
        {s.state === 'pending' && <Banner><p>In attesa che {s.recipient?.name ?? 'la persona'} accetti l’invito. Nessuna email viene inviata e accettare non significa aver letto i file.</p></Banner>}
        {s.state === 'accepted' && <Banner><p>Accettata: la persona può consultare e scaricare questi file fino a {formatDateTime(s.expiresAt)}. Dimora non mostra se li ha aperti.</p></Banner>}
        {s.state === 'declined' && <Banner><p>La persona ha rifiutato l’invito: non vede i file.</p></Banner>}
        {s.state === 'revoked' && <Banner><p>Revocata: questa consegna non è più consultabile. Le copie già scaricate restano alla persona; eventuali accessi in Documenti come persona della casa non cambiano.</p></Banner>}
        {s.state === 'expired' && <Banner><p>Scaduta il {formatDateTime(s.expiresAt)}. Per un nuovo accesso prepara una nuova condivisione.</p></Banner>}
        {s.state === 'unavailable' && <Banner tone="warning"><p>Non più disponibile: i tuoi diritti sulla casa o sugli originali sono cambiati. La condivisione non trasferisce nulla.</p></Banner>}

        <OperationFeedback op={op} title="Operazione non eseguita" onReread={() => void query.refetch()} />

        {s.state !== 'unavailable' && (
          <section className={ui.card} aria-labelledby="share-manifest">
            <h2 id="share-manifest" className={pages.cardTitle}>Manifesto</h2>
            <dl className={pages.detailList}>
              <dt>Destinatario</dt>
              <dd>{s.recipient ? `${s.recipient.name} · ${s.recipient.email}` : 'Persona esterna, non ancora abbinata'}</dd>
              <dt>Accessibile fino a</dt>
              <dd>{formatDateTime(s.expiresAt)}</dd>
            </dl>
            <ul className={act.list} aria-label="File della consegna">
              {s.items.map((it) => (
                <li key={it.documentId} className={act.item}><strong>{it.name}</strong><ItemMeta item={it} /></li>
              ))}
            </ul>
          </section>
        )}
        {can('revoke') && (
          <p className={act.actions}><button type="button" className={ui.btn} style={{ color: 'var(--color-error)' }} onClick={() => setConfirmRevoke(true)} disabled={op.pending || op.ambiguous}>Revoca</button></p>
        )}
      </div>
      {confirmRotate && (
        <Dialog title="Generare un nuovo codice?" onClose={() => setConfirmRotate(false)}>
          <p>Il codice precedente e l’eventuale abbinamento in corso smettono di funzionare. Il nuovo codice sarà mostrato una sola volta.</p>
          <p className={act.actions}>
            <button type="button" className={ui.btn} onClick={() => setConfirmRotate(false)}>Annulla</button>
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={rotate}>Genera il codice</button>
          </p>
        </Dialog>
      )}
      {confirmRevoke && (
        <Dialog title="Revocare la condivisione?" onClose={() => setConfirmRevoke(false)}>
          <p>La persona non potrà più aprire né scaricare questi file tramite questa consegna. Le copie già scaricate non si possono ritirare.</p>
          <p>La revoca riguarda solo questa consegna: se un file è visibile a «Persone della casa», chi è membro continua a vederlo in Documenti.</p>
          <p className={act.actions}>
            <button type="button" className={ui.btn} onClick={() => setConfirmRevoke(false)}>Non revocare</button>
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={revoke}>Revoca</button>
          </p>
        </Dialog>
      )}
    </>
  );
}

/** Confronto: casella mai preselezionata, legata a claim e versione (il componente si rimonta se cambiano). */
function PairingConfirm(props: { share: Share; busy: boolean; onConfirm: () => void; onWrongPerson?: () => void }) {
  const claim = props.share.pairing!.claim!;
  const [compared, setCompared] = useState(false);
  const id = useId();
  return (
    <section className={ui.card} aria-labelledby={`${id}-t`} style={{ borderColor: 'var(--color-warning-border)' }}>
      <h2 id={`${id}-t`} className={pages.cardTitle}>Chi ha inserito il codice?</h2>
      <p>
        <strong>{claim.account.name}</strong> · {claim.account.email}
        <span className={act.meta} style={{ display: 'block' }}>Nome ed email dichiarati dall’account, non verificati: possono imitare quelli che ti aspetti.</span>
      </p>
      <p>Codice di confronto:</p>
      <p style={{ font: '700 24px/1.3 ui-monospace, Consolas, monospace', letterSpacing: 3, margin: '4px 0' }} aria-label={`Codice di confronto: ${claim.comparisonCode.split('').join(' ')}`}>{claim.comparisonCode}</p>
      <p className={act.meta}>Valido fino alle {formatTime(claim.expiresAt)}. Contatta la persona tramite un recapito che conosci già (non quello appena mostrato) e chiedile di leggerti il codice che vede sul suo schermo.</p>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginTop: 8 }}>
        <input type="checkbox" checked={compared} onChange={(e) => setCompared(e.target.checked)} disabled={props.busy} />
        <span>Ho confrontato il codice con la persona tramite un recapito che conoscevo già: coincide.</span>
      </label>
      <p className={act.actions}>
        <button type="button" className={cx(ui.btn, ui.primary)} disabled={!compared || props.busy} onClick={props.onConfirm}>Conferma la persona</button>
        {props.onWrongPerson && <button type="button" className={ui.btn} onClick={props.onWrongPerson} disabled={props.busy}>Non è la persona giusta: nuovo codice</button>}
      </p>
      <p className={act.meta}>Dopo la conferma la persona deve ancora accettare l’invito: fino ad allora non vede i file.</p>
    </section>
  );
}
