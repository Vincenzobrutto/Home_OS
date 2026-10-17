import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { ui } from '../components/ui';
import type { Capabilities } from './model';

/** Read-only entry: rendering or opening this link never starts an analysis. */
export function DocumentBillEntry({ homeId, documentId, compact = false }: { homeId: string; documentId: string; compact?: boolean }) {
  const account = useAccount(), api = useApi();
  const caps = useQuery({
    queryKey: ['account', account.id, 'home', homeId, 'onboarding', 'capabilities', documentId],
    queryFn: ({ signal }) => api.callJson<Capabilities>(`/homes/${encodeURIComponent(homeId)}/object-onboarding/capabilities?documentId=${encodeURIComponent(documentId)}`, { accountId: account.id, signal }),
    retry: false, gcTime: 0,
  });
  const root = `/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(documentId)}/oggetti`;
  const draft = caps.data?.drafts.find(d => d.state === 'open');
  const running = ['queued', 'running'].includes(caps.data?.job?.state ?? '');
  const previous = caps.data?.drafts[0];
  const label = caps.isPending ? 'Controllo proposta…' : caps.isError ? 'Controlla la proposta di spesa' : draft ? 'Rivedi e conferma la spesa' : running ? 'Vedi analisi in corso' : previous?.state === 'confirmed' ? 'Proposta accettata · Vedi dettaglio' : previous ? 'Vedi esito della proposta' : 'Prepara la proposta di spesa';
  const href = draft ? `${root}?bozza=${encodeURIComponent(draft.id)}` : previous && !running ? `${root}?bozza=${encodeURIComponent(previous.id)}` : root;
  return <div>
    {!compact && <><h2>Spesa della bolletta</h2><p>{caps.isPending ? 'Controllo dello stato della proposta…' : caps.isError ? 'Non è stato possibile verificare lo stato. Apri il percorso per riprovare.' : draft ? 'La proposta è pronta da controllare. La spesa sarà registrata solo alla conferma.' : running ? 'L’analisi è in corso: puoi riaprire il suo stato.' : previous ? 'Apri la proposta per controllare il suo esito.' : 'La spesa non ha ancora una proposta pronta da confermare.'}</p></>}
    {compact && draft && <p><strong>Proposta di spesa pronta</strong></p>}
    {compact && !draft && !caps.isPending && !caps.isError && !previous && !running && <p>Spesa da preparare</p>}
    <Link className={draft ? ui.btnPrimary : ui.btn} to={href}>{label}</Link>
  </div>;
}
