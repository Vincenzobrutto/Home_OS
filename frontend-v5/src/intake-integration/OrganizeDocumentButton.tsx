import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAccount, useApi } from '../session/session';
import { newIdempotencyKey } from '../api/queryKeys';
import { userMessage } from '../api/errors';
import { ui } from '../components/ui';
import { IntakeClient } from './client';

export function OrganizeDocumentButton({ homeId, documentId }: { homeId: string; documentId: string }) {
  const account = useAccount();
  return <StartOrganization key={account.id + ':' + homeId + ':' + documentId} homeId={homeId} documentId={documentId} />;
}
function StartOrganization({ homeId, documentId }: { homeId: string; documentId: string }) {
  const account = useAccount(), api = useApi(), navigate = useNavigate();
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const busy = useRef(false), alive = useRef(true), key = useRef(newIdempotencyKey());
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function start() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const batch = await new IntakeClient(api, account.id, homeId).prepareExisting([documentId], key.current);
      if (alive.current) await navigate(`/home/${encodeURIComponent(homeId)}/documenti/organizza?lotto=${encodeURIComponent(batch.id)}`);
    } catch (e) { if (alive.current) setError(userMessage(e)); }
    finally { busy.current = false; if (alive.current) setPending(false); }
  }
  return <><button type="button" className={ui.btn} disabled={pending} onClick={() => void start()}>{pending ? 'Apertura della modifica…' : 'Modifica titolo e tipo'}</button>{error && <span role="alert">{error} Riprova: il file non viene ricaricato.</span>}</>;
}
