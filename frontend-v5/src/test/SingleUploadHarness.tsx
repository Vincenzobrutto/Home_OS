// Solo test del form ancora riusato da Spese; non è una route del prodotto.
import { useEffect, useRef, useState } from 'react';
import type { DocumentDetail } from '../api/types';
import { DocumentsPage, UploadForm } from '../routes/DocumentsPages';
import { useCurrentHome } from '../routes/HomePages';

export function SingleUploadHarness() {
  const home = useCurrentHome();
  const [open, setOpen] = useState(false);
  const [uploaded, setUploaded] = useState<DocumentDetail | null>(null);
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => { if (uploaded && document.activeElement === document.body) result.current?.focus(); }, [uploaded]);
  return <>
    <DocumentsPage />
    {!open && <button type="button" onClick={() => setOpen(true)}>Apri uploader singolo di prova</button>}
    {uploaded && <div role="status" tabIndex={-1} ref={result}>Documento caricato</div>}
    {open && home.permissions.includes('edit') && <UploadForm home={home} titleId="single-test-upload"
      onCancel={() => setOpen(false)} onUploaded={doc => { setOpen(false); setUploaded(doc); }} />}
  </>;
}
