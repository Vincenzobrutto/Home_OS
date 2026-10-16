import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { isApiError, isUnauthorized, userMessage } from '../api/errors';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import type { DocumentDetail } from '../api/types';
import { Banner, ErrorState, Loading, ui, useDocumentTitle } from '../components/ui';
import { useDocumentFile, useFetchDocumentFile, useObjectUrl } from '../documents/hooks';
import { saveBlob } from '../lib/files';
import { ReceiptAssistant } from '../receipt-assistance/ReceiptAssistant';
import { canonicalPayload, type CandidatePage, type ConfirmationPayload, type ConfirmOutcome, type ExpenseRef, type ObjectRef, type ReceiptJobState } from '../receipt-assistance/model';
import { handleUnauthorized } from '../session/queryClient';
import { useAccount, useApi } from '../session/session';
import { useCurrentHome } from '../routes/HomePages';
import { ReceiptClient, toReceiptDraft, type CandidateWire, type ComparisonWire, type DraftWire, type ReceiptCapabilityWire } from './client';
import pages from '../routes/pages.module.css';
import docs from '../routes/documents.module.css';

type Snapshot = { doc: DocumentDetail; capabilities: ReceiptCapabilityWire; wire: DraftWire | null; objects: CandidateWire<ObjectRef>; expenses: CandidateWire<ExpenseRef>; comparisons: ComparisonWire[] };
const empty = <T,>(): CandidateWire<T> => ({ items: [], linkedCount: 0, nextCursor: null });
const denied = (error: unknown) => isApiError(error) && [401, 403].includes(error.status);

/** A saved selection may be beyond page one; load it before restoring the form. */
export async function selectedCandidatePage<T extends { id: string }>(first: CandidateWire<T>, targetId: string | null, next: (cursor: string) => Promise<CandidateWire<T>>): Promise<CandidateWire<T>> {
  let result = first; const seen = new Set<string>();
  while (targetId && !result.items.some(item => item.id === targetId) && result.nextCursor) {
    if (seen.has(result.nextCursor)) throw new Error('Pagina candidati ripetuta.');
    seen.add(result.nextCursor); const page = await next(result.nextCursor);
    result = { ...page, items: [...result.items, ...page.items.filter(item => !result.items.some(existing => existing.id === item.id))] };
  }
  return result;
}
export function ReceiptPage() {
  const home = useCurrentHome(), account = useAccount();
  const { documentId = '' } = useParams();
  // Context is a remount boundary for transient keys, preview bytes and mutation outcomes.
  return <ReceiptPageContext key={[account.id, home.id, documentId].join(':')} documentId={documentId} />;
}
function ReceiptPageContext({ documentId }: { documentId: string }) {
  const home = useCurrentHome(), account = useAccount(), api = useApi(), cache = useQueryClient(), navigate = useNavigate();
  const [params, setParams] = useSearchParams(); const draftId = params.get('bozza'), jobId = params.get('analisi');
  const client = useMemo(() => new ReceiptClient(api, account.id, home.id), [api, account.id, home.id]);
  const base = `/home/${encodeURIComponent(home.id)}`, documentPath = `${base}/documenti/${encodeURIComponent(documentId)}`;
  const key = ['account', account.id, 'home', home.id, 'receipt', documentId, 'draft', draftId] as const;
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [actionError, setActionError] = useState<string | null>(null);
  const [startState, setStartState] = useState<ReceiptJobState>({ status: 'none' });
  const [candidateStatus, setCandidateStatus] = useState<Record<'object' | 'expense', 'idle' | 'loading' | 'error'>>({ object: 'idle', expense: 'idle' });
  const current = useRef(true), starting = useRef(false);
  useEffect(() => { current.current = true; return () => { current.current = false; }; }, []);
  const isCurrent = () => current.current && cache.getQueryData<{ account: { id: string } | null }>(queryKeys.session)?.account?.id === account.id;
  const manualKey = useRef(newIdempotencyKey());
  const analysisRequest = useRef<{ key: string; provider: string; consent: boolean } | null>(null);
  const mutationKeys = useRef(new Map<string, string>());
  const stableKey = (operation: string, payload: ConfirmationPayload | string) => {
    const signature = `${operation}:${typeof payload === 'string' ? payload : canonicalPayload(payload)}`;
    let saved = mutationKeys.current.get(signature); if (!saved) { saved = newIdempotencyKey(); mutationKeys.current.set(signature, saved); } return saved;
  };
  const onError = async (error: unknown) => {
    if (isUnauthorized(error)) await handleUnauthorized(cache);
    if (isCurrent() && denied(error)) setBlocked(true);
  };
  const query = useQuery({
    queryKey: key, gcTime: 0, retry: false, staleTime: 0,
    queryFn: async ({ signal }): Promise<Snapshot> => {
      const [doc, capabilities] = await Promise.all([api.getDocument(home.id, documentId, signal, account.id), client.capabilities(signal, documentId)]);
      const wire = draftId ? await client.draft(draftId, signal) : null;
      if (wire?.documentLink.state === 'linked' && wire.documentLink.document?.id !== documentId) throw new Error('La bozza appartiene a un altro documento.');
      if (!wire || wire.documentLink.state === 'unavailable') return { doc, capabilities, wire, objects: empty(), expenses: empty(), comparisons: [] };
      const selected = wire.review?.form;
      const [objects, expenses] = await Promise.all([
        client.objects(wire.id, null, signal).then(first => selectedCandidatePage(first, selected?.object.kind === 'reuse' ? selected.object.id : null, cursor => client.objects(wire.id, cursor, signal))),
        client.expenses(wire.id, null, signal).then(first => selectedCandidatePage(first, selected?.expense.kind === 'reuse' ? selected.expense.id : null, cursor => client.expenses(wire.id, cursor, signal))),
      ]);
      const comparisons: ComparisonWire[] = []; let cursor: string | undefined; const seen = new Set<string>();
      do {
        const page = await client.comparisons({ draftId: wire.id, ...(cursor ? { cursor } : {}) }, signal); comparisons.push(...page.items);
        cursor = page.nextCursor ?? undefined;
        if (cursor && seen.has(cursor)) throw new Error('Pagina confronti ripetuta.');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return { doc, capabilities, wire, objects, expenses, comparisons };
    },
  });
  const job = useQuery({
    queryKey: ['account', account.id, 'home', home.id, 'receipt', documentId, 'job', jobId], enabled: !!jobId && !draftId,
    queryFn: ({ signal }) => client.job(jobId!, signal), gcTime: 0, retry: false,
    refetchInterval: q => ['queued', 'running'].includes(q.state.data?.state ?? '') ? 700 : false,
  });
  const completedDraft = job.data?.state === 'succeeded' ? job.data.draftId : null;
  useEffect(() => { if (completedDraft) setParams({ bozza: completedDraft }, { replace: true }); }, [completedDraft, setParams]);
  const resume = query.data?.capabilities.resume;
  useEffect(() => {
    if (draftId || jobId) return;
    if (resume?.draftId) setParams({ bozza: resume.draftId }, { replace: true });
    else if (resume?.jobId) setParams({ analisi: resume.jobId }, { replace: true });
  }, [draftId, jobId, resume?.draftId, resume?.jobId, setParams]);
  useDocumentTitle(`Ricevuta assistita · ${home.name}`);
  const snapshot = query.data;
  const sourceUnavailable = blocked || (snapshot?.wire?.documentLink.state === 'unavailable') || job.data?.state === 'unavailable' || denied(query.error) || denied(job.error);
  const error = query.error ?? job.error;
  const load = sourceUnavailable ? { status: 'unavailable' as const } : query.isPending ? { status: 'loading' as const } : error ? { status: 'error' as const, message: userMessage(error), retryable: true } : { status: 'ready' as const };
  const effectiveJob: ReceiptJobState = job.isError ? { status: 'uncertain', message: 'Impossibile leggere lo stato. Usa Riprova: nessuna nuova analisi verrà avviata.' } : job.data?.state === 'uncertain' ? { status: 'uncertain', message: 'Il servizio potrebbe avere ricevuto la richiesta. Un altro invio a pagamento è bloccato; puoi compilare a mano.' } : job.data?.state === 'failed' ? { status: 'failed', reason: job.data.errorCode === 'receipt_multiple_items_unsupported' ? 'multiple_items' : 'read_failed', message: job.data.errorCode === 'receipt_multiple_items_unsupported' ? 'Le ricevute con più articoli non sono ancora supportate.' : 'Il documento non contiene dati supportati o non è stato possibile leggerlo. Puoi continuare manualmente.' } : job.data?.state === 'queued' || job.data?.state === 'running' ? { status: job.data.state } : startState;
  const startManual = async () => {
    if (starting.current || !snapshot?.capabilities.manualEnabled) return;
    starting.current = true; setBusy(true); setActionError(null);
    try { const wire = await client.manual(documentId, manualKey.current); if (isCurrent()) setParams({ bozza: wire.id }); }
    catch (error) { await onError(error); if (isCurrent()) setActionError('Impossibile aprire la bozza. Riprova con lo stesso pulsante per recuperarla senza crearne una seconda.'); }
    finally { starting.current = false; if (isCurrent()) setBusy(false); }
  };
  const startAnalysis = async (input: { providerId: string; consentToProviderTransfer: boolean }) => {
    if (starting.current || job.data?.state === 'queued' || job.data?.state === 'running' || job.data?.state === 'uncertain' || !snapshot?.capabilities.enabled) return;
    starting.current = true; setStartState({ status: 'starting' }); setActionError(null);
    const prior = analysisRequest.current;
    const request = prior && prior.provider === input.providerId && prior.consent === input.consentToProviderTransfer ? prior : { key: newIdempotencyKey(), provider: input.providerId, consent: input.consentToProviderTransfer };
    analysisRequest.current = request;
    try {
      const result = await client.start(documentId, request.provider, request.consent, request.key);
      if (isCurrent()) { setParams({ analisi: result.id }); setStartState({ status: 'none' }); analysisRequest.current = null; }
    } catch (error) {
      await onError(error);
      if (isCurrent()) setStartState(isApiError(error) && error.kind === 'http' ? { status: 'failed', reason: 'service', message: userMessage(error) } : { status: 'uncertain', retryStart: true, message: 'Riprova lo stesso avvio per recuperare la richiesta con la stessa chiave.' });
    } finally { starting.current = false; }
  };
  const confirmError = async (error: unknown): Promise<ConfirmOutcome> => {
    await onError(error);
    if (isApiError(error) && error.kind === 'http') return { status: 'rejected', code: denied(error) ? 'forbidden' : error.status === 409 ? 'conflict' : 'validation', message: userMessage(error) };
    return { status: 'unknown', message: 'La risposta non è arrivata. Recupera l’esito prima di un nuovo invio.' };
  };
  const invalidate = () => { void cache.invalidateQueries({ queryKey: ['account', account.id, 'home', home.id], predicate: q => !q.queryKey.includes('receipt') || q.queryKey.includes('capabilities') }); };
  const confirm = async (payload: ConfirmationPayload): Promise<ConfirmOutcome> => {
    try { const wire = await client.confirm(payload, stableKey('confirm', payload)); if (!isCurrent() || !wire.confirmation) return { status: 'unknown' }; invalidate(); return { status: 'confirmed', result: wire.confirmation }; }
    catch (error) { return confirmError(error); }
  };
  const recover = async (payload: ConfirmationPayload) => {
    try { const wire = await client.recover(payload.draftId, stableKey('confirm', payload)); if (!isCurrent()) return { status: 'unknown' as const }; if (!wire) return { status: 'not_found' as const }; if (!wire.confirmation) return { status: 'unknown' as const }; invalidate(); return { status: 'confirmed' as const, result: wire.confirmation }; }
    catch (error) { return confirmError(error); }
  };
  const park = async (payload: ConfirmationPayload) => {
    try { await client.park(payload, stableKey('park', payload)); if (isCurrent()) await query.refetch(); return { status: 'parked' as const }; }
    catch (error) { await onError(error); return { status: 'rejected' as const, message: 'Non è stato possibile verificare il salvataggio. Riprova: le stesse scelte usano la stessa richiesta.' }; }
  };
  const more = async (kind: 'object' | 'expense') => {
    const page = kind === 'object' ? snapshot?.objects : snapshot?.expenses;
    if (!snapshot?.wire || !page?.nextCursor || candidateStatus[kind] === 'loading') return;
    setCandidateStatus(prev => ({ ...prev, [kind]: 'loading' }));
    try {
      const extra = kind === 'object' ? await client.objects(snapshot.wire.id, page.nextCursor) : await client.expenses(snapshot.wire.id, page.nextCursor);
      if (!isCurrent()) return;
      cache.setQueryData<Snapshot>(key, prev => !prev ? prev : kind === 'object' ? { ...prev, objects: { ...extra, items: [...prev.objects.items, ...extra.items] } as CandidateWire<ObjectRef> } : { ...prev, expenses: { ...extra, items: [...prev.expenses.items, ...extra.items] } as CandidateWire<ExpenseRef> });
      setCandidateStatus(prev => ({ ...prev, [kind]: 'idle' }));
    } catch (error) { await onError(error); if (isCurrent()) setCandidateStatus(prev => ({ ...prev, [kind]: 'error' })); }
  };
  const fetchOriginal = useFetchDocumentFile(home.id, documentId);
  const candidates = <T,>(page: CandidateWire<T> | undefined, kind: 'object' | 'expense'): CandidatePage<T> => ({ items: page?.items ?? [], hasMore: !!page?.nextCursor, status: candidateStatus[kind] });
  const receipt = snapshot?.wire ? toReceiptDraft(snapshot.wire, snapshot.objects, snapshot.expenses, snapshot.comparisons) : null;
  const billing = sourceUnavailable ? null : (snapshot?.wire?.analysis?.billing ?? job.data?.billing);
  return <div className={pages.stack}>
    <Link to={documentPath}>← Torna al documento</Link>
    {actionError && <Banner tone="error" role="alert"><p>{actionError}</p></Banner>}
    {billing && <Banner><p>{billing.actualUsd !== null ? `Costo dell’analisi: ${billing.actualUsd} USD.` : billing.state === 'uncertain' ? `Costo non ancora verificabile. Restano riservati al massimo ${billing.maxReservedUsd} USD; nessun reinvio automatico.` : `Analisi: riservati al massimo ${billing.maxReservedUsd} USD del budget autorizzato.`}</p></Banner>}
    {snapshot && !snapshot.capabilities.enabled && !snapshot.capabilities.manualEnabled && <Banner><p>La ricevuta assistita è ancora in collaudo e non è attiva. Il documento originale resta disponibile.</p></Banner>}
    <ReceiptAssistant contextKey={{ accountId: account.id, homeId: home.id, documentId, draftId }} load={load} capabilities={snapshot?.capabilities ?? null}
      original={{ status: sourceUnavailable || !snapshot ? 'unavailable' : 'available', name: sourceUnavailable ? '' : snapshot?.doc.name ?? '', pageCount: null }}
      draft={receipt} job={effectiveJob} objectCandidates={candidates(snapshot?.objects, 'object')} expenseCandidates={candidates(snapshot?.expenses, 'expense')}
      today={snapshot?.capabilities.today ?? ''} canEdit={home.permissions.includes('edit') && !busy && (snapshot?.wire ? snapshot.wire.permissions.includes('edit') : true)}
      onStartAnalysis={input => void startAnalysis(input)} onStartManual={() => void startManual()} openOriginal={async () => { await fetchOriginal(); }}
      renderOriginalPreview={() => !sourceUnavailable && snapshot ? <ReceiptOriginal homeId={home.id} doc={snapshot.doc} /> : null}
      loadMoreCandidates={kind => void more(kind)} onConfirm={confirm} onRecoverOutcome={recover} onPark={park}
      onResumeDraft={async () => { try { if (!snapshot?.wire) throw new Error('Bozza non disponibile'); await client.reopen(snapshot.wire.id, Number(snapshot.wire.version), stableKey('reopen', String(snapshot.wire.version))); if (isCurrent()) await query.refetch(); return { status: 'resumed' }; } catch (error) { await onError(error); return { status: 'rejected', message: userMessage(error) }; } }}
      onRetryLoad={() => { void query.refetch(); if (jobId) void job.refetch(); }}
      onReopenComparison={comparison => navigate(`${base}/oggetti/object/${encodeURIComponent(comparison.objectId)}#confronti-ricevuta`)}
      renderOutcomeLinks={result => <div className={pages.formActions}>{result.object && <Link className={ui.btn} to={`${base}/oggetti/object/${encodeURIComponent(result.object.id)}`}>Apri oggetto</Link>}{result.expense && <Link className={ui.btn} to={`${base}/spese/${encodeURIComponent(result.expense.id)}`}>Apri spesa</Link>}<Link className={ui.btn} to={`${base}/review`}>Da rivedere</Link></div>} />
  </div>;
}
function ReceiptOriginal({ homeId, doc }: { homeId: string; doc: DocumentDetail }) {
  const file = useDocumentFile(homeId, doc.id, true), url = useObjectUrl(file.isError ? undefined : file.data?.blob);
  if (file.isPending) return <Loading label="Caricamento originale…" />;
  if (file.isError) return <ErrorState error={file.error} onRetry={() => void file.refetch()} />;
  if (!url || !file.data) return null;
  return <div className={pages.stack}>
    {doc.mimeType === 'application/pdf' ? <object data={url} type="application/pdf" className={docs.previewPdf} aria-label={`Originale ${doc.name}`}><p>Scarica l’originale per leggerlo su questo dispositivo.</p></object> : <img src={url} className={docs.previewImage} alt={`Originale ${doc.name}`} />}
    <button type="button" className={ui.btn} onClick={() => file.data && saveBlob(file.data.blob, file.data.filename ?? doc.originalFilename)}>Scarica originale</button>
  </div>;
}
