import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { isApiError, isUnauthorized, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../api/queryKeys';
import { Banner, ErrorState, ui } from '../components/ui';
import { useAccount, useApi } from '../session/session';
import { handleUnauthorized } from '../session/queryClient';
import { useCurrentHome } from '../routes/HomePages';
import { ReceiptClient, type ComparisonWire } from './client';
import pages from '../routes/pages.module.css';

const absent = (error: unknown) => isApiError(error) && error.status === 404;
function useReceiptClient() {
  const home = useCurrentHome(), account = useAccount(), api = useApi();
  return useMemo(() => new ReceiptClient(api, account.id, home.id), [api, account.id, home.id]);
}
export function ReceiptEntry({ documentId }: { documentId: string }) {
  const home = useCurrentHome(), client = useReceiptClient();
  const capability = useQuery({ queryKey: ['account', client.accountId, 'home', home.id, 'receipt', documentId, 'capabilities'], queryFn: ({ signal }) => client.capabilities(signal, documentId), retry: false });
  if (!home.permissions.includes('edit') || capability.isError || !capability.data || !capability.data.manualEnabled && !capability.data.enabled) return null;
  return <p className={pages.spaced}><Link className={ui.btn} to={`/home/${encodeURIComponent(home.id)}/documenti/${encodeURIComponent(documentId)}/ricevuta`}>Oggetto e spesa da questa ricevuta</Link></p>;
}
export function ReceiptObjectFields({ objectId }: { objectId: string }) {
  const client = useReceiptClient();
  const query = useQuery({ queryKey: ['account', client.accountId, 'home', client.homeId, 'receipt', 'fields', objectId], queryFn: ({ signal }) => client.fields(objectId, signal), retry: false });
  if (query.isError) return absent(query.error) ? null : <ErrorState title="Dati della ricevuta non disponibili" error={query.error} onRetry={() => void query.refetch()} />;
  const fields = query.data?.fields;
  if (!fields || !fields.brand && !fields.model) return null;
  return <section className={ui.card} aria-labelledby="dati-ricevuta"><h2 id="dati-ricevuta">Marca e modello</h2><dl className={pages.detailList}>
    {(['brand', 'model'] as const).map(key => {
      const field = fields[key]; if (!field) return null;
      return <div key={key}><dt>{key === 'brand' ? 'Marca' : 'Modello'}</dt><dd>{field.state === 'confirmed' ? <><strong>{field.value}</strong><p className={pages.small}>{field.origin === 'user_declared' ? 'Inserito da te' : 'Dalla ricevuta, confermato da te'}</p>{field.sources.map((source, index) => <details key={index}><summary>Fonte · pagina {source.page}</summary><p>{source.excerpt}</p>{source.documentId && <Link to={`/home/${encodeURIComponent(client.homeId)}/documenti/${encodeURIComponent(source.documentId)}`}>Vedi originale</Link>}</details>)}</> : 'Fonte non più disponibile'}</dd></div>;
    })}
  </dl></section>;
}
export function ReceiptComparisons({ objectId }: { objectId?: string }) {
  const home = useCurrentHome(), client = useReceiptClient();
  const query = useInfiniteQuery({
    queryKey: ['account', client.accountId, 'home', home.id, 'receipt', 'comparisons', objectId ?? 'all'],
    queryFn: ({ pageParam, signal }) => client.comparisons({ ...(objectId ? { objectId } : {}), ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    initialPageParam: null as string | null, getNextPageParam: page => page.nextCursor, retry: false,
  });
  if (query.isError) return absent(query.error) ? null : <ErrorState title="Confronti ricevuta non disponibili" error={query.error} onRetry={() => void query.refetch()} />;
  const items = query.data?.pages.flatMap(page => page.items).filter(item => item.state === 'open') ?? [];
  if (!items.length && !query.hasNextPage) return null;
  return <section id="confronti-ricevuta" className={ui.card} aria-labelledby="confronti-title">
    <h2 id="confronti-title">Confronti delle ricevute da rivedere</h2>
    <p>Il dato già confermato resta nella scheda. Puoi mantenerlo oppure lasciare il confronto da decidere.</p>
    <div className={pages.stack}>{items.map(item => <ComparisonCard key={`${item.id}:${item.version}`} item={item} canEdit={home.permissions.includes('edit')} client={client} refresh={() => query.refetch()} />)}</div>
    {query.hasNextPage && <button className={ui.btn} type="button" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>Altri confronti</button>}
  </section>;
}
function ComparisonCard({ item, client, canEdit, refresh }: { item: ComparisonWire; client: ReceiptClient; canEdit: boolean; refresh: () => Promise<unknown> }) {
  const cache = useQueryClient();
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const [keys] = useState(() => ({ keep_existing: newIdempotencyKey(), defer: newIdempotencyKey() }));
  const act = async (action: 'keep_existing' | 'defer') => {
    if (pending) return; setPending(true); setError(null);
    try { await client.resolve(item.id, item.version, action, keys[action]); await refresh(); }
    catch (error) { if (isUnauthorized(error)) await handleUnauthorized(cache); setError(userMessage(error)); }
    finally { setPending(false); }
  };
  return <article className={ui.card}>
    <h3><Link to={`/home/${encodeURIComponent(client.homeId)}/oggetti/object/${encodeURIComponent(item.object!.id)}`}>{item.object!.name}</Link> · {item.fieldKey === 'brand' ? 'Marca' : 'Modello'}</h3>
    <p>Già confermato: <strong>{item.existing}</strong></p><p>Nella ricevuta: <strong>{item.proposed!.value}</strong></p>
    {item.proposed!.sources.map((source, i) => <p className={pages.small} key={i}>Pagina {source.page}: {source.excerpt}</p>)}
    {item.documentLink?.document && item.draftId && <p><Link to={`/home/${encodeURIComponent(client.homeId)}/documenti/${encodeURIComponent(item.documentLink.document.id)}/ricevuta?bozza=${encodeURIComponent(item.draftId)}`}>Apri ricevuta e proposte</Link></p>}
    {canEdit && item.permissions.includes('edit') && <div className={pages.formActions}><button type="button" className={ui.btn} disabled={pending} onClick={() => void act('keep_existing')}>Mantieni il dato confermato</button><button type="button" className={ui.btn} disabled={pending} onClick={() => void act('defer')}>Decidi più avanti</button></div>}
    {error && <Banner tone="error" role="alert"><p>{error}</p></Banner>}
  </article>;
}
