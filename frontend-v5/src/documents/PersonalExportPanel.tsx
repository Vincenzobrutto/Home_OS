import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, isApiError, userMessage } from '../api/errors';
import { exportPersonalHome } from '../api/personalExportClient';
import { useAccount, useApi, refreshSession } from '../session/session';
import { saveBlob } from '../lib/files';
import { Banner, cx, ui } from '../components/ui';
import { useForgetHomeDocuments } from './hooks';
import docs from '../routes/documents.module.css';

export function PersonalExportPanel({ homeId }: { homeId: string }) {
  const api = useApi(), account = useAccount(), cache = useQueryClient(), forget = useForgetHomeDocuments(homeId);
  const generation = useRef<symbol | null>(null), busy = useRef(false), result = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const token = Symbol(); generation.current = token;
    return () => { if (generation.current === token) generation.current = null; };
  }, [account.id, homeId]);
  const mutation = useMutation({
    gcTime: 0, retry: false,
    mutationFn: async (token: symbol) => {
      const payload = await exportPersonalHome(api, homeId, account.id);
      if (generation.current !== token) return;
      const session = await refreshSession(cache, api);
      if (generation.current !== token || session.account?.id !== account.id) return;
      const currentHome = await api.getHome(homeId, undefined, account.id);
      if (generation.current !== token) return;
      if (!currentHome.permissions.includes('export')) throw new ApiError({ kind: 'http', status: 403, code: 'FORBIDDEN', message: 'Non hai più il permesso di esportare questa casa.' });
      saveBlob(payload.blob, payload.filename ?? 'dimora-dati-casa.json');
      setSaved(true);
    },
    onError: error => { if (isApiError(error) && error.status === 403) forget(); },
    onSettled: () => { busy.current = false; },
  });
  useEffect(() => {
    if ((saved || mutation.isError) && document.activeElement === document.body) result.current?.focus();
  }, [saved, mutation.isError]);
  const error = mutation.error;
  const problem = isApiError(error) && error.code === 'personal_export_too_large' ? 'I dati superano il limite di esportazione. Nessun file è stato scaricato.'
    : isApiError(error) && error.code === 'personal_export_busy' ? 'Sono già in corso altre esportazioni. Riprova tra poco.'
    : isApiError(error) && error.status === 403 ? 'Non hai più accesso all’esportazione di questa casa.'
    : isApiError(error) && error.status === 404 ? 'L’esportazione dei dati personali non è ancora attiva su questo servizio.'
    : userMessage(error);
  return (
    <details className={cx(ui.card, docs.panel)}>
      <summary>Esporta i miei dati di questa casa</summary>
      <p>Scarica un file JSON con i tuoi dati: oggetti, attività, spese, lavori, dati confermati, cronologia e riferimenti autorizzati. Include anche i tuoi elementi archiviati.</p>
      <p>Gli originali dei documenti si scaricano separatamente in ZIP dall’archivio. Questo export non include dati privati altrui, condivisioni o bozze AI e non cancella i dati da Dimora.</p>
      <button type="button" className={ui.btn} disabled={mutation.isPending} onClick={() => {
        if (busy.current || !generation.current) return;
        busy.current = true; setSaved(false); mutation.mutate(generation.current);
      }}>{mutation.isPending ? 'Preparazione dei dati…' : 'Scarica i miei dati (JSON)'}</button>
      {(saved || mutation.isError) && <div ref={result} tabIndex={-1} role={mutation.isError ? 'alert' : 'status'}>
        <Banner title={mutation.isError ? 'Esportazione non completata' : 'File pronto per il download'} tone={mutation.isError ? 'warning' : undefined}>
          <p>{mutation.isError ? problem : 'Il download è stato avviato. Conserva questo file in un luogo privato: contiene dati personali.'}</p>
        </Banner>
      </div>}
    </details>
  );
}
