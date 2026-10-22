import type {DocumentTarget} from '../object-onboarding/DocumentReference';
import {documentExamplesEnabled} from '../documents/exampleEnvironment';
import { DocumentEditorWorkspace } from '../documents/DocumentEditorWorkspace';
import { FilePicker, PhotoPicker } from '../components/FilePicker';
import { DocumentCompilationActions } from '../object-onboarding/DocumentCompilationActions';
import { AutomaticIntake } from './AutomaticIntake';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { useCurrentHome } from '../routes/HomePages';
import { DocumentIntakeAssistant } from '../document-intake/DocumentIntakeAssistant';
import { bulkItem, canonical, KINDS, type DocumentKind, type CandidatePage, type ConfirmBatchOutcome, type ConfirmBatchPayload, type ReviewPayload, type WriteOutcome } from '../document-intake/model';
import { DocumentObjectProposals } from '../object-onboarding/OnboardingPage';
import { IntakeClient, toUiBatch, type BatchWire } from './client';
import { localAnalysisCandidates, organizationFromObjectKind, organizeDocuments, type OrganizationPayload } from './organization';
import { ApiError, isApiError, userMessage } from '../api/errors';
import { newIdempotencyKey, queryKeys } from '../api/queryKeys';
import { Banner, ErrorState, Loading, ui, useDocumentTitle } from '../components/ui';
import { useDocumentFile, useObjectUrl } from '../documents/hooks';
import { formatBytes, saveBlob, unsupportedFileProblem } from '../lib/files';
import { handleUnauthorized } from '../session/queryClient';
import pages from '../routes/pages.module.css';
import styles from './integration.module.css';

const denied = (e: unknown) => isApiError(e) && [401, 403].includes(e.status);
const rejected = (e: unknown): WriteOutcome => isApiError(e) && [400, 401, 403, 409, 413, 422, 429].includes(e.status) ? { status: 'rejected', code: e.status === 409 ? 'conflict' : e.status === 403 ? 'forbidden' : 'validation', message: userMessage(e) } : { status: 'uncertain', message: userMessage(e) };
export function IntakePage({workspace=false,onUploaded}:{workspace?:boolean;onUploaded?:(documentId?:string,batchId?:string,documentIds?:string[])=>void}={}) {
  const home = useCurrentHome(), account = useAccount(), [routeParams]=useSearchParams();
  if(!workspace&&routeParams.has('oggetti-documento'))return <DocumentEditorWorkspace key={account.id+":"+home.id}/>;
  return <IntakeContainer key={account.id + ':' + home.id} workspace={workspace} onUploaded={onUploaded} />;
}
function IntakeContainer({workspace,onUploaded}:{workspace:boolean;onUploaded?:(documentId?:string,batchId?:string,documentIds?:string[])=>void}) {
  const home = useCurrentHome(), account = useAccount(), api = useApi(), cache = useQueryClient(), [params, setParams] = useSearchParams();
  useDocumentTitle((workspace?'Documenti':'Carica documenti')+' · ' + home.name);
  const id = params.get('lotto'), client = useMemo(() => new IntakeClient(api, account.id, home.id), [api, account.id, home.id]);
  const prefix = ['account', account.id, 'home', home.id, 'intake'] as const, key = [...prefix, 'batch', id];
  const cap = useQuery({ queryKey: [...prefix, 'capabilities'], queryFn: ({ signal }) => client.capability(signal), retry: false });
  const batch = useQuery({ queryKey: key, queryFn: ({ signal }) => client.batch(id!, signal), enabled: !!id, retry: false, refetchInterval: query => query.state.data?.items.some(i => ['queued', 'running'].includes(i.analysisState) || i.uploadState === 'uploading') ? 1500 : false });
  const history = useInfiniteQuery({ queryKey: [...prefix, 'list'], queryFn: ({ pageParam, signal }) => client.list(pageParam ?? undefined, signal), initialPageParam: null as string | null, getNextPageParam: p => p.nextCursor, retry: false, enabled: !workspace });
  const files = useRef(new Map<string, File>()), keys = useRef(new Map<string, string>()), controls = useRef(new Set<AbortController>()), alive = useRef(true), active = useRef(id);
  useEffect(() => { active.current = id; }, [id]);
  const creation = useRef<{ files: File[]; ids: string[]; key: string; batchId: string | null } | null>(null), creating = useRef(false);
  const [problem, setProblem] = useState<string | null>(null), [waiting, setWaiting] = useState(false), [recoverCreation, setRecoverCreation] = useState(false), [candidates, setCandidates] = useState<Record<string, CandidatePage>>({});
  const [stagedFiles,setStagedFiles]=useState<Array<{id:string;file:File}>>([]);
  function stage(chosen:File[]){if(creating.current||creation.current||recoverCreation)return;const refused=chosen.map(unsupportedFileProblem).filter(Boolean),selected=chosen.filter(f=>!unsupportedFileProblem(f));if(refused.length){setProblem(refused.join(' '));if(!selected.length)return;}const next=[...stagedFiles,...selected.map(file=>({id:newIdempotencyKey(),file}))];if(next.length>20||next.some(x=>x.file.size<1||x.file.size>20*1024*1024)||next.reduce((n,x)=>n+x.file.size,0)>200*1024*1024){setProblem('Scegli fino a 20 file, circa 21 MB per file e circa 210 MB complessivi.');return;}if(!refused.length)setProblem(null);setStagedFiles(next);}
  const [automaticConsent,setAutomaticConsent]=useState(false),[automaticActive,setAutomaticActive]=useState(false);
  async function startAutomatic(batchId:string,key:string){
    const latest=await client.batch(batchId);
    await api.callJson(`/homes/${home.id}/object-onboarding/automatic-runs`,{method:'POST',body:{batchId,documentIds:[...new Set(latest.items.map(i=>i.documentLink.document?.id).filter(Boolean))],consentToProviderTransfer:true,automaticProcessing:true,automaticContacts:true},idempotencyKey:key,accountId:account.id});
    await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id,'automatic-intake',batchId]});
  }
  const cursors = useRef(new Map<string, string | null>()), retryItem = useRef<string | null>(null), picker = useRef<HTMLInputElement>(null);
  useEffect(() => { const pending = controls.current; alive.current = true; return () => { alive.current = false; for (const ctl of pending) ctl.abort(); }; }, []);
  const wire = denied(batch.error) ? undefined : batch.data;
  const current = useRef(wire); useEffect(() => { current.current = wire; }, [wire]);
  const stableKey = (op: string, body: unknown) => { const k = op + ':' + canonical(body); if (!keys.current.has(k)) keys.current.set(k, newIdempotencyKey()); return keys.current.get(k)!; };
  const adopt = (value: BatchWire) => { const target = [...prefix, 'batch', value.id]; if (alive.current && active.current === value.id && !denied(cache.getQueryState(target)?.error)) { cache.setQueryData<BatchWire>(target, prior => prior && Number(prior.version) > Number(value.version) ? prior : value); void cache.invalidateQueries({ queryKey: [...prefix, 'list'] }); } };
  const analysisAttempts = useRef(new Set<string>());
  useEffect(() => {
    const items = localAnalysisCandidates(cap.isError ? undefined : cap.data, wire, analysisAttempts.current);
    if (!wire || active.current !== wire.id || !items.length) return;
    const batchId = wire.id, target = ['account', account.id, 'home', home.id, 'intake', 'batch', batchId];
    for (const item of items) analysisAttempts.current.add(batchId + ':' + item.id);
    const body = { provider: 'local_text_v1', items }, keyId = 'analysis:' + batchId + ':' + canonical(body);
    if (!keys.current.has(keyId)) keys.current.set(keyId, newIdempotencyKey());
    void client.post(batchId, '/analyses', body, keys.current.get(keyId)!).then(response => {
      if (!alive.current || active.current !== batchId || denied(cache.getQueryState(target)?.error)) return;
      cache.setQueryData<BatchWire>(target, prior => prior && Number(prior.version) > Number(response.wire.version) ? prior : response.wire);
    }).catch(async error => {
      if (!alive.current || active.current !== batchId) return;
      if (isApiError(error) && error.status === 401) { await handleUnauthorized(cache); return; }
      setProblem('La lettura locale non è stata confermata. I file restano caricati: rileggi il caricamento prima di riprovare.');
      void cache.invalidateQueries({ queryKey: target });
    });
  }, [cap.data, cap.isError, wire, account.id, home.id, client, cache]);
  async function upload(value: BatchWire, itemId: string): Promise<WriteOutcome> {
    const file = files.current.get(itemId);
    if (!file) { retryItem.current = itemId; picker.current?.click(); return { status: 'rejected', code: 'validation', message: 'Seleziona di nuovo l’originale per questo file. I file già caricati restano disponibili.' }; }
    const ctl = new AbortController(); controls.current.add(ctl);
    try { adopt(await client.upload(value.id, itemId, file, ctl.signal)); if(workspace)void cache.invalidateQueries({queryKey:queryKeys.documentsAll(account.id,home.id)}); return { status: 'confirmed' }; }
    catch (e) { if (alive.current && active.current === value.id) { void cache.invalidateQueries({ queryKey: [...prefix, 'batch', value.id] }); setProblem(userMessage(e)); } return rejected(e); }
    finally { controls.current.delete(ctl); }
  }
  async function pool(value: BatchWire, clientIds: string[]) {
    const queue = value.items.filter(i => clientIds.includes(i.clientItemId) && ['pending', 'failed'].includes(i.uploadState) && files.current.has(i.id)); let next = 0;
    await Promise.all([0, 1].map(async () => { while (next < queue.length && alive.current && active.current === value.id) { const item = queue[next++]; if (item) await upload(value, item.id); } }));
  }
  async function create(selected?: File[]) {
    if (creating.current) return;
    if (selected && creation.current) { setProblem('Recupera prima l’esito del caricamento precedente oppure riapri un caricamento salvato.'); return; }
    if (selected) {
      if (!selected.length || selected.length > 20 || selected.some(f => f.size < 1 || f.size > 20 * 1024 * 1024) || selected.reduce((n, f) => n + f.size, 0) > 200 * 1024 * 1024) { setProblem('Scegli fino a 20 file, circa 21 MB per file e circa 210 MB complessivi.'); return; }
      creation.current = { files: selected, ids: selected.map(() => newIdempotencyKey()), key: newIdempotencyKey(), batchId: active.current };
    }
    const pending = creation.current; if (!pending) return; creating.current = true; setWaiting(true); setProblem(null);
    try {
      const value = pending.batchId ? await client.append(pending.batchId, pending.files, pending.ids, pending.key) : await client.create(pending.files, pending.ids, pending.key); if (!alive.current || !workspace&&active.current !== pending.batchId) return;
      for (let i = 0; i < pending.ids.length; i++) { const item = value.items.find(r => r.clientItemId === pending.ids[i]), file = pending.files[i]; if (item && file) files.current.set(item.id, file); }
      if(!workspace){creation.current = null; setStagedFiles([]);} setRecoverCreation(false); active.current = value.id; adopt(value); if(!workspace)setParams({ lotto: value.id }); await pool(value, pending.ids);
      if(workspace){const verified=await client.batch(value.id);if(verified.items.some(i=>pending.ids.includes(i.clientItemId)&&!['stored','duplicate'].includes(i.uploadState)))throw Error('Alcuni file non sono stati acquisiti. Recupera il caricamento per riprovare solo quelli mancanti.');creation.current=null;setStagedFiles([]);await cache.invalidateQueries({queryKey:['account',account.id,'home',home.id]});const orderedIds=pending.ids.flatMap(id=>{const doc=verified.items.find(i=>i.clientItemId===id)?.documentLink.document;return doc?[doc.id]:[];});onUploaded?.(orderedIds[0],value.id,orderedIds);}
      if(automaticConsent)await startAutomatic(value.id,pending.key);
    } catch (e) { if (alive.current) { setProblem(userMessage(e)); if (rejected(e).status === 'rejected') creation.current = null; else setRecoverCreation(true); } }
    finally { creating.current = false; if (alive.current) setWaiting(false); }
  }
  const post = async (suffix: string, body: unknown, op: string): Promise<WriteOutcome> => {
    const value = current.current; if (!value) return { status: 'rejected', code: 'unavailable', message: 'Rileggi il caricamento.' };
    try { adopt((await client.post(value.id, suffix, body, stableKey(op, body))).wire); return { status: 'confirmed' }; } catch (e) { if (isApiError(e) && e.status === 401) await handleUnauthorized(cache); const result = rejected(e); if (result.status === 'uncertain' && alive.current) setProblem('Esito non noto: verifica o riapri il caricamento dal server prima di cambiare le scelte.'); return result; }
  };
  const reviewBody = (p: ReviewPayload & { expectedOrganizationVersion?: number; replaceOrganization?: boolean }) => ({ expectedVersion: p.expectedVersion, expectedOrganizationVersion: p.expectedOrganizationVersion ?? current.current?.items.find(i => i.id === p.itemId)?.organizationVersion ?? 0, replaceOrganization: p.replaceOrganization === true, selection: p.selection });
  const saveReview = (p: ReviewPayload) => post(`/items/${encodeURIComponent(p.itemId)}/review`, reviewBody(p), 'review:' + p.itemId);
  async function reorganize(itemId: string) {
    const value = current.current, item = value?.items.find(i => i.id === itemId), doc = item?.documentLink.document;
    if (!value || !item || !doc || creating.current) return;
    creating.current = true; setWaiting(true); setProblem(null);
    try {
      const next = await client.prepareExisting([doc.id], stableKey('reorganize:' + item.id + ':' + item.version, [doc.id]));
      if (!alive.current || active.current !== value.id) return;
      active.current = next.id; adopt(next); setParams({ lotto: next.id });
    } catch (e) { if (alive.current && active.current === value.id) setProblem(userMessage(e)); }
    finally { creating.current = false; if (alive.current) setWaiting(false); }
  }
  async function recoverReview(p: ReviewPayload): Promise<WriteOutcome | { status: 'not_found' }> {
    const value = current.current; if (!value) return { status: 'not_found' };
    const body = reviewBody(p), key = stableKey('review:' + p.itemId, body);
    try { const response = await client.recovery(value.id, `/items/${encodeURIComponent(p.itemId)}/reviews/${encodeURIComponent(key)}`); adopt(response.wire); return response.raw.recorded === true ? { status: 'confirmed' } : { status: 'not_found' }; } catch (e) { return rejected(e); }
  }
  async function confirm(p: ConfirmBatchPayload, recover = false): Promise<ConfirmBatchOutcome | { status: 'not_found' }> {
    const body = { expectedVersion: p.expectedVersion, items: p.items }, key = stableKey('confirm:' + p.batchId, body);
    try {
      let response = recover ? await client.recovery(p.batchId, '/confirmations/' + encodeURIComponent(key)) : await client.post(p.batchId, '/confirmations', body, key);
      let result = response.raw.results;
      if (recover && result && typeof result === 'object' && Object.keys(result).length < p.items.length) { response = await client.post(p.batchId, '/confirmations', body, key); result = response.raw.results; }
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error('Risposta della conferma non valida.');
      adopt(response.wire); void cache.invalidateQueries({ queryKey: queryKeys.documentsAll(account.id, home.id) });
      const results = result as Record<string, { state: string; code?: string }>;
      if (p.items.some(i => !results[i.id])) return { status: 'uncertain', message: 'Una parte è registrata. Verifica l’esito per riprendere gli elementi restanti.' };
      return { status: 'done', results: p.items.map(i => ({ itemId: i.id, status: results[i.id]?.state === 'confirmed' ? 'confirmed' : 'rejected', ...(results[i.id]?.state !== 'confirmed' ? { message: 'Rileggi questo file: dati o permessi sono cambiati.' } : {}) })) };
    } catch (e) { if (recover && isApiError(e) && e.status === 404) return { status: 'not_found' }; const r = rejected(e); return r.status === 'confirmed' ? { status: 'done', results: [] } : r.status === 'rejected' ? { ...r, code: r.code === 'stale' ? 'conflict' : r.code } : r; }
  }
  async function organize(p: OrganizationPayload, recover = false): Promise<ConfirmBatchOutcome | { status: 'not_found' }> {
    if (!alive.current || active.current !== p.batchId || current.current?.id !== p.batchId) return { status: 'rejected', code: 'unavailable', message: 'Rileggi il caricamento corrente.' };
    const key = stableKey('organize:' + p.batchId, p);
    try {
      const response = await organizeDocuments(client, p, key, recover);
      adopt(response.wire);
      if (alive.current && active.current === p.batchId) void cache.invalidateQueries({ queryKey: queryKeys.documentsAll(account.id, home.id) });
      return response.outcome;
    } catch (e) {
      if (recover && isApiError(e) && e.status === 404 && e.code === 'intake_request_not_found') return { status: 'not_found' };
      if (isApiError(e) && e.status === 401 && alive.current && active.current === p.batchId) await handleUnauthorized(cache);
      if (alive.current && active.current === p.batchId) void cache.invalidateQueries({ queryKey: [...prefix, 'batch', p.batchId] });
      const r = rejected(e); return r.status === 'rejected' ? { ...r, code: r.code === 'stale' ? 'conflict' : r.code } : { status: 'uncertain', message: userMessage(e) };
    }
  }
  const directOrganizationActions = {
    onOrganize: async (p: OrganizationPayload): Promise<ConfirmBatchOutcome> => { const result = await organize(p); return result.status === 'not_found' ? { status: 'uncertain' } : result; },
    onRecoverOrganization: (p: OrganizationPayload) => organize(p, true),
  };
  async function loadCandidates(itemId: string, more: boolean) {
    const batchId = active.current, previous = candidates[itemId]; setCandidates(p => ({ ...p, [itemId]: { items: more ? p[itemId]?.items ?? [] : [], hasMore: false, status: 'loading' } }));
    try {
      const result = await api.listObjects(home.id, { state: 'active', q: '', type: null, roomId: null, placement: 'all' }, { limit: 50, ...(more && cursors.current.get(itemId) ? { cursor: cursors.current.get(itemId)! } : {}) }, undefined, account.id);
      if (!alive.current || active.current !== batchId) return;
      cursors.current.set(itemId, result.nextCursor);
      const items = result.items.flatMap(o => typeof o.version === 'number' ? [{ kind: o.ref.kind, id: o.ref.id, version: o.version, name: o.name, roomName: o.position.rooms.map(r => r.name).join(', ') || null }] : []);
      setCandidates(p => ({ ...p, [itemId]: { items: [...(more ? previous?.items ?? [] : []), ...items], hasMore: !!result.nextCursor, status: 'idle' } }));
    } catch { if (alive.current && active.current === batchId) setCandidates(p => ({ ...p, [itemId]: { items: [], hasMore: false, status: 'error' } })); }
  }
  const productItems=wire?toUiBatch(wire).items.filter(i=>i.documentLink.state==='linked'&&i.permissions.review):[];
  const requestedDocument=params.get('oggetti-documento');
  const productItem=requestedDocument?productItems.find(i=>i.documentLink.document?.id===requestedDocument):undefined;
  const preparationError=(message:string)=>new ApiError({kind:'http',status:422,code:'intake_preparation_required',message});
  async function prepareDocumentForObject(itemId:string,kind?:string,reuseCopy=false,title?:string,replaceOrganization=false,target?:DocumentTarget|null){
    const value=current.current;if(!value||active.current!==value.id)throw preparationError('Rileggi il caricamento corrente.');
    const item=toUiBatch(value).items.find(i=>i.id===itemId);if(!item)throw preparationError('Documento non disponibile.');
    if(!target&&item.reviewState==='confirmed'&&(!workspace||(!kind||item.confirmedOrganization?.parts.every(p=>p.kind===kind))&&(!title||title.trim()===item.confirmedOrganization?.title)))return;
    if(item.uploadState==='duplicate'){
      if(!reuseCopy)throw preparationError('Il file è già presente: seleziona «Usa il documento già presente senza modificarlo» nella scheda, oppure scegli «Rivedi documento» per cambiarne titolo o tipo.');
      const result=await post(`/items/${encodeURIComponent(item.id)}/duplicate-resolution`,{expectedVersion:item.version,action:'reuse_reference'},'duplicate:'+item.id);
      if(result.status!=='confirmed')throw preparationError(result.status==='rejected'?result.message:'L’esito del riuso del documento è da verificare. Rileggi il caricamento prima di confermare l’articolo.');
      return;
    }
    let proposal=bulkItem(item)??organizationFromObjectKind(item,kind);
    if(workspace&&item.confirmedOrganization&&!replaceOrganization&&(title?.trim()!==item.confirmedOrganization.title||kind&&item.confirmedOrganization.parts.some(p=>p.kind!==kind)))throw preparationError('Conferma qui sopra l’aggiornamento del titolo o del tipo già salvati, oppure mantieni i valori attuali.');
    if(workspace&&kind&&KINDS.includes(kind as DocumentKind)&&item.uploadState==='stored'&&!item.duplicate&&!item.selectionStale)proposal={itemId:item.id,expectedVersion:item.version,expectedOrganizationVersion:item.organizationVersion??0,replaceOrganization,selection:{action:'organize',title:title?.trim()||item.filename||'Documento',parts:[{kind:kind as DocumentKind,pageFrom:null,pageTo:null}],target:{kind:'home'}}};
    if(proposal&&['utility_bill','purchase_document','invoice','receipt','conformity_declaration','system_diagram','system_booklet','floor_plan','ape','product_label','purchase_order'].includes(kind??'')&&item.reviewState==='unreviewed'&&!item.organizationVersion&&!item.duplicate)proposal={...proposal,selection:{...proposal.selection,parts:[{kind:kind as 'utility_bill'|'purchase_document'|'invoice'|'receipt'|'conformity_declaration'|'system_diagram'|'system_booklet'|'floor_plan'|'ape'|'product_label'|'purchase_order',pageFrom:null,pageTo:null}]}};if(!proposal)throw preparationError(workspace?'Scegli il tipo del documento qui sopra e controlla eventuali indicazioni sulla copia. I dati inseriti restano in questa revisione.':'Prima completa la classificazione del documento: scegli il tipo o risolvi la copia o il conflitto. Usa «Rivedi documento» qui sotto; i dati dell’articolo restano conservati.');
    if(proposal.selection.action==='organize'&&title!==undefined)proposal={...proposal,selection:{...proposal.selection,title:title.trim()}};
    if(target&&proposal.selection.action==='organize')proposal={...proposal,selection:{...proposal.selection,target:{kind:target.kind,id:target.id,expectedVersion:target.expectedVersion}}};
    const outcome=await organize({batchId:value.id,expectedVersion:value.version,mode:'single',items:[proposal]});
    if(outcome.status!=='done'||outcome.results.some(r=>r.status!=='confirmed'))throw preparationError('Archiviazione del documento da verificare. Nessun oggetto o costo è stato creato: controlla il documento e riprendi qui.');
  }
  const error = cap.error ?? batch.error, unavailable = denied(error), busyAnalysis = wire?.items.some(i => ['queued', 'running'].includes(i.analysisState));
  const automaticControl=<><label><input type="checkbox" checked={automaticConsent} disabled={waiting} onChange={e=>setAutomaticConsent(e.target.checked)}/> Autorizzo l’invio dei documenti di questo caricamento ad Anthropic, inclusi dati personali, e la creazione automatica di oggetti, spese e contatti verificati.</label><p>Entro il budget residuo · massimo 0,25 USD per documento. Ti chiederemo aiuto solo nei casi dubbi.</p></>;
  const newUpload=!id&&home.permissions.includes('edit');
  return <>
    {!workspace&&<p><Link to={`/home/${home.id}/documenti`}>← Documenti</Link></p>}
    {problem && <Banner tone="warning" title="Controlla l’esito"><p>{problem}</p>{recoverCreation && <button className={ui.btn} disabled={waiting} onClick={() => void create()}>Recupera il caricamento</button>}</Banner>}
    {problem && id && <p><button className={ui.btn} onClick={() => window.location.reload()}>Riapri il caricamento dal server</button> <span>Solo per i file non ancora acquisiti potrà essere necessario scegliere di nuovo l’originale.</span></p>}
    {waiting && <p role="status">Caricamento dei file, al massimo due alla volta…</p>}
    {newUpload&&cap.isError&&<ErrorState error={cap.error} onRetry={()=>void cap.refetch()}/>}
    {!workspace&&!stagedFiles.length&&!automaticActive&&wire&&!params.get('oggetti-documento')&&home.permissions.includes('edit')&&<section className={ui.card} aria-label="Come organizzare i documenti"><h2>Organizza questo caricamento</h2>{automaticControl}<button className={`${ui.btn} ${ui.primary}`} disabled={!automaticConsent||waiting} onClick={()=>{setWaiting(true);void startAutomatic(wire.id,stableKey('automatic:'+wire.id,wire.items.map(i=>i.id))).catch(e=>setProblem(userMessage(e))).finally(()=>setWaiting(false));}}>Organizza automaticamente questo caricamento</button></section>}
    {!workspace&&id&&<AutomaticIntake homeId={home.id} batchId={id} onChange={setAutomaticActive}/>}
    {(newUpload||stagedFiles.length>0)&&<section className={ui.card} aria-label="Caricamento documenti">
      <h2>Aggiungi documenti</h2>
      <div className={styles.dropZone} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!waiting&&cap.data&&home.permissions.includes('edit'))stage(Array.from(e.dataTransfer.files));}}>
        <p>Fatture, bollette, documenti e foto della casa.</p>
        <div className={styles.pickers}><FilePicker disabled={waiting||!cap.data||recoverCreation||!home.permissions.includes('edit')} secondary={stagedFiles.length>0} onFiles={stage}/><PhotoPicker disabled={waiting||!cap.data||recoverCreation||!home.permissions.includes('edit')} onFiles={stage}/></div>
        <p className={pages.muted}>Oppure trascinali qui · PDF, JPEG o PNG · fino a 20 file, circa 21 MB ciascuno.</p>
        <p className={pages.muted}>Le foto si salvano come immagini visibili solo a te. Dimora non ne legge il testo e non le invia all’esterno senza il tuo consenso.</p>
      </div>
      {stagedFiles.length>0&&<><h2 className={styles.selectionHeading}>File scelti · {stagedFiles.length}</h2><ul className={styles.selectedFiles} aria-label="File scelti">{stagedFiles.map(x=><li key={x.id}><div className={styles.selectedName}><strong>{x.file.name}</strong><span>{formatBytes(x.file.size)}</span></div><button type="button" className={ui.btn} aria-label={'Rimuovi '+x.file.name} disabled={waiting||recoverCreation} onClick={()=>setStagedFiles(old=>old.filter(f=>f.id!==x.id))}>Rimuovi</button></li>)}</ul><p className={pages.muted}>Puoi rimuovere i file sbagliati prima di caricarli.</p></>}
      {!workspace&&<div className={styles.uploadConsent}>{automaticControl}</div>}
      {stagedFiles.length>0&&<button type="button" className={`${ui.btn} ${ui.primary}`} disabled={waiting||recoverCreation||!cap.data||!home.permissions.includes('edit')} onClick={()=>void create(stagedFiles.map(x=>x.file))}>{automaticConsent?'Carica e organizza':'Carica documenti'}</button>}
    </section>}
    {!workspace&&wire?.items.some(i => i.documentLink.state === 'linked' && i.analysisState === 'ready' && !i.proposal && i.reviewState === 'unreviewed') && <Banner><p>Per alcuni file il testo non identifica un tipo con sufficiente chiarezza. Puoi consultare l’originale, scegliere il tipo manualmente o decidere più avanti.</p></Banner>}

    {!newUpload&&!stagedFiles.length&&!automaticActive&&!(automaticConsent&&waiting)&&<DocumentIntakeAssistant focused={workspace} focusedAi={params.get('compila')==='ai'} {...directOrganizationActions} key={id ? (wire ? 'ready:' : 'loading:') + id : 'new'} contextKey={{ accountId: account.id, homeId: home.id, batchId: id }} homeName={home.name} canEdit={home.permissions.includes('edit')} capabilities={cap.data ?? null} batch={wire ? toUiBatch(wire) : null}
      load={unavailable ? { status: 'unavailable' } : cap.isPending || !!id && batch.isPending ? { status: 'loading' } : error ? { status: 'error', message: userMessage(error), retryable: true } : { status: 'ready' }}
      candidates={candidates} loadCandidates={(itemId, more) => void loadCandidates(itemId, more)} onSelectFiles={stage} addingFiles={waiting}
      onReorganizeDocument={reorganize}
      onRetryUpload={async itemId => current.current ? upload(current.current, itemId) : { status: 'rejected', code: 'unavailable', message: 'Rileggi il caricamento.' }}
      onRemoveItem={async itemId=>{const result=await post('/items/'+encodeURIComponent(itemId)+'/removal',{expectedVersion:current.current?.items.find(i=>i.id===itemId)?.version},'remove:'+itemId);if(result.status==='confirmed'){files.current.delete(itemId);void cache.invalidateQueries({queryKey:['account',account.id,'home',home.id]});}return result;}}
      onCancelUpload={itemId => post(`/items/${itemId}/upload-cancellation`, { expectedVersion: current.current?.items.find(i => i.id === itemId)?.version }, 'cancel:' + itemId)}
      onSaveReview={saveReview} onRecoverReview={recoverReview} onResolveDuplicate={(itemId, expectedVersion) => post(`/items/${itemId}/duplicate-resolution`, { expectedVersion, action: 'reuse_reference' }, 'duplicate:' + itemId)}
      onConfirm={async p => { const r = await confirm(p); return r.status === 'not_found' ? { status: 'uncertain' } : r; }} onRecoverConfirmation={p => confirm(p, true)}
      analysis={cap.data?.analysis.enabled ? { consentText: 'Classificazione locale: cerca possibili tipi nel testo del PDF e mostra le pagine da controllare. Non usa Anthropic e non invia file all’esterno. Tu confermi le proposte.', costText: 'Nessun costo API.', limitsText: 'PDF con testo: massimo circa 10,5 MB e 20 pagine. Scansioni e immagini si organizzano manualmente.', state: busyAnalysis ? { status: 'running' } : { status: 'idle' } } : undefined}
      onStartAnalysis={ids => { const items = current.current?.items.filter(i => ids.includes(i.id)).map(i => ({ id: i.id, expectedVersion: i.version })) ?? []; void post('/analyses', { provider: 'local_text_v1', items }, 'analysis').then(r => { if (r.status !== 'confirmed') setProblem(r.status === 'rejected' ? r.message : 'Esito incerto: rileggi il caricamento prima di riprovare.'); }); }}
      openOriginal={async itemId => { const source = current.current?.items.find(i => i.id === itemId)?.documentLink.document; if (!source) throw Error('Originale non disponibile.'); const file = await api.downloadDocumentFile(home.id, source.id, undefined, account.id); saveBlob(file.blob, file.filename ?? 'originale.pdf'); }}
      renderPreview={(itemId, page) => { const source = wire?.items.find(i => i.id === itemId)?.documentLink.document; return source ? <OriginalPreview homeId={home.id} id={source.id} page={page} /> : <p>Originale non disponibile.</p>; }}
      onOpenReceiptFlow={itemId => { const doc = current.current?.items.find(i => i.id === itemId)?.documentLink.document; if(doc)setParams(previous=>{const next=new URLSearchParams(previous);next.set('oggetti-documento',doc.id);next.delete('oggetti-bozza');next.delete('oggetti-analisi');return next;}); }}
      objectProposalItemId={productItem?.id}
      renderCompilationActions={itemId=>{const source=wire?.items.find(i=>i.id===itemId)?.documentLink.document;const value=wire?.items.find(i=>i.id===itemId),parts=value?.proposal?.parts??value?.organization?.parts??[];const documentKind=parts.length&&parts.every(p=>p.kind==='utility_bill')?'utility_bill':parts.some(p=>['invoice','receipt','purchase_document'].includes(p.kind))?'purchase_document':undefined;return source?<DocumentCompilationActions documentKind={documentKind} homeId={home.id} documentId={source.id} onOpen={(mode,draftId)=>setParams(previous=>{const next=new URLSearchParams(previous);next.set('oggetti-documento',source.id);next.set('compila',mode);next.delete('oggetti-bozza');next.delete('oggetti-analisi');if(draftId)next.set('oggetti-bozza',draftId);return next;})}/>:null;}}
      renderObjectProposals={(itemId,reviewDocument)=>{const source=wire?.items.find(i=>i.id===itemId)?.documentLink.document;return source?<DocumentObjectProposals singleScreen={workspace} documentId={source.id} documentCopy={wire?.items.find(i=>i.id===itemId)?.uploadState==='duplicate'} onReviewDocument={reviewDocument} beforeConfirm={!workspace&&wire?.items.find(i=>i.id===itemId)?.reviewState==='confirmed'?undefined:(kind,reuseCopy,title,replaceOrganization,target)=>prepareDocumentForObject(itemId,kind,reuseCopy,title,replaceOrganization,target)} confirmLabel={wire?.items.find(i=>i.id===itemId)?.reviewState==='confirmed'?'Conferma questo articolo':'Conferma documento e articolo'}/>:null;}}
      renderOutcomeLinks={() => <Link className={ui.btn} to={`/home/${home.id}/documenti`}>Vai ai Documenti</Link>}
      onRetryLoad={() => { void cap.refetch(); if (id) void batch.refetch(); }} />}
    <input ref={picker} hidden type="file" accept="application/pdf,image/jpeg,image/png" aria-label="Originale da ricaricare" onChange={e => { const file = e.target.files?.[0], itemId = retryItem.current; if (file && itemId && current.current) { files.current.set(itemId, file); void upload(current.current, itemId); } e.target.value = ''; }} />
    {documentExamplesEnabled()&&!workspace&&!id && <details><summary>PDF sintetici per provare il percorso</summary><p>Documenti di esempio, senza dati personali. Scaricali e selezionali nel caricamento.</p><ul>{['ape-sintetico.pdf', 'pratica-mista-sintetica.pdf', 'regolamento-sintetico.pdf', 'ricevuta-sintetica.pdf', 'senza-testo-sintetico.pdf'].map(name => <li key={name}><a href={'/intake-examples/' + name} download>{name}</a></li>)}</ul></details>}
    {!workspace&&<section className={`${ui.card} ${styles.history}`} aria-label="Caricamenti precedenti"><h2>Caricamenti precedenti</h2>
      {history.isPending ? <Loading label="Caricamento della cronologia…" /> : history.isError ? <ErrorState error={history.error} onRetry={() => void history.refetch()} /> : <ul>{history.data?.pages.flatMap(p => p.items).map(b => <li key={b.id}><Link to={`?lotto=${b.id}`}>{new Date(b.createdAt).toLocaleString('it-IT')} · {b.itemCount} file · {b.state === 'completed' ? 'Completato' : 'Da completare'}</Link></li>)}</ul>}
      {history.hasNextPage && <button className={ui.btn} disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>Altri caricamenti</button>}
      {id && <Link className={ui.btn} to="?">Nuovo caricamento</Link>}
    </section>}
  </>;
}
function OriginalPreview({ homeId, id, page }: { homeId: string; id: string; page: number | null }) {
  const file = useDocumentFile(homeId, id, true), url = useObjectUrl(file.data?.blob);
  if (file.isPending) return <Loading label="Apertura originale…" />;
  if (file.isError) return <ErrorState error={file.error} onRetry={() => void file.refetch()} />;
  return url ? file.data.contentType?.startsWith('image/') ? <img src={url} alt="Documento originale" className={styles.image} /> : <object data={url + (page ? '#page=' + page : '')} type="application/pdf" aria-label="Documento originale" className={styles.pdf}><p className={pages.muted}>Per consultare il PDF usa Apri l’originale.</p></object> : null;
}
