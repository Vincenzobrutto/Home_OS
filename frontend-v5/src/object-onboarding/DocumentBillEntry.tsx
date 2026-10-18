import { OrganizeDocumentButton } from '../intake-integration/OrganizeDocumentButton';
import { DocumentCompilationActions } from './DocumentCompilationActions';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { ui } from '../components/ui';
import type { Capabilities, Draft } from './model';
import { proposalStatus, proposalIdentity } from './proposalStatus';

/** Read-only entry: rendering or opening this link never starts an analysis. */
export function DocumentBillEntry({ homeId, documentId, documentKind, compact = false, bill = true, allowPrepare = true, houseDocument = false }: { homeId: string; documentId: string; documentKind?:string; compact?: boolean; bill?: boolean; allowPrepare?: boolean; houseDocument?: boolean }) {
  const account = useAccount(), api = useApi();
  const caps = useQuery({
    queryKey: ['account', account.id, 'home', homeId, 'onboarding', 'capabilities', documentId],
    queryFn: ({ signal }) => api.callJson<Capabilities>(`/homes/${encodeURIComponent(homeId)}/object-onboarding/capabilities?documentId=${encodeURIComponent(documentId)}`, { accountId: account.id, signal }),
    retry: false, gcTime: 0,
  });
  const root = `/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(documentId)}/oggetti`;
  const status = proposalStatus(caps.data);
  const draft = status.state === 'review', running = status.state === 'running', completed = status.state === 'confirmed';
  const label = caps.isPending ? 'Controllo proposta…' : caps.isError ? 'Controlla la proposta' : completed ? 'Proposta accettata · Vedi dettaglio' : draft ? (bill ? 'Rivedi e conferma la spesa' : 'Rivedi la proposta') : running ? 'Vedi analisi in corso' : bill ? 'Prepara la proposta di spesa' : 'Prepara oggetti e spese';
  const href = status.draftId ? `${root}?bozza=${encodeURIComponent(status.draftId)}` : root;
  const result = useQuery({
    queryKey: ['account', account.id, 'home', homeId, 'onboarding', 'draft', status.draftId],
    queryFn: async ({ signal }) => {
      const reply = await api.callJson<{draft: Draft}>(`/homes/${encodeURIComponent(homeId)}/object-onboarding/drafts/${encodeURIComponent(status.draftId!)}`, { accountId: account.id, signal });
      if (reply.draft?.snapshot && reply.draft.snapshot.documentId !== documentId) throw new Error('Proposta non disponibile per questo documento.');
      return reply;
    }, enabled: completed && !caps.isError, retry: false, gcTime: 0,
  });
  const objects = caps.isError || result.isError ? [] : result.data?.draft?.items?.flatMap(item => item.decision?.objects ?? []).filter(obj => obj.id && obj.state === 'active') ?? [];
  const identity = caps.isError || result.isError ? '' : proposalIdentity(result.data?.draft,documentKind);
  if(houseDocument)return <div><p>Documento della casa · Nessun oggetto o spesa</p><OrganizeDocumentButton homeId={homeId} documentId={documentId}/></div>;
  if (!allowPrepare && caps.isSuccess && status.state === 'empty' && !caps.data.job) return <p>Documento archiviato.</p>;
  return <div>
    {compact && identity && <p><strong>{identity}</strong></p>}
    {!compact && <><h2>{identity || (bill ? 'Spesa della bolletta' : 'Oggetti e spese')}</h2><p>{caps.isPending ? 'Controllo dello stato della proposta…' : caps.isError ? 'Non è stato possibile verificare lo stato. Apri il percorso per riprovare.' : draft ? 'La proposta è pronta da controllare. La spesa sarà registrata solo alla conferma.' : running ? 'L’analisi è in corso: puoi riaprire il suo stato.' : completed ? 'Le scelte sono già state registrate. Puoi consultare il dettaglio.' : (bill ? 'La spesa non ha ancora una proposta pronta da confermare.' : 'Prepara una proposta per gli oggetti e gli eventuali costi del documento.')}</p></>}
    {compact && draft && <p><strong>{bill ? 'Spesa da confermare' : 'Scheda da confermare · Non ancora in Oggetti'}</strong></p>}
    {compact && !draft && !caps.isPending && !caps.isError && !completed && !running && <p>{bill ? 'Spesa da preparare' : 'Proposta da preparare'}</p>}
    {!!objects.length && <ul aria-label="Oggetti confermati">{objects.filter((obj,index,all)=>all.findIndex(other=>other.id===obj.id)===index).map(obj=><li key={obj.id}><Link to={`/home/${encodeURIComponent(homeId)}/oggetti/object/${encodeURIComponent(obj.id!)}`}>Apri {obj.name ?? 'oggetto'}</Link></li>)}</ul>}
    {result.isError && <p role="alert">Impossibile leggere gli oggetti collegati. Riapri il dettaglio.</p>}
    {(completed||running||caps.isError)&&<Link className={draft ? ui.btnPrimary : ui.btn} to={href}>{label}</Link>}
    {!completed&&!running&&!caps.isPending&&!caps.isError&&<DocumentCompilationActions homeId={homeId} documentId={documentId}/>}
  </div>;
}
