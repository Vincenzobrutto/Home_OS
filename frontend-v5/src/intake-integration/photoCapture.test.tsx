// BL-04 — scatta una foto: acquisizione e archiviazione, nessuna analisi sulle immagini.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FetchLike } from '../api/client';
import { photoFile, unsupportedFileProblem } from '../lib/files';
import { renderApp, createFakeFetch, seededBackend, PASSWORD_A } from '../test/harness';
import { localAnalysisCandidates } from './organization';

const AT = new Date(2026, 9, 22, 18, 5);

describe('BL-04 · regole dei file foto', () => {
  it('nomi generici della fotocamera diventano «Foto data ora»; nomi scelti restano', () => {
    expect(photoFile(new File(['x'], 'image.jpg', { type: 'image/jpeg' }), AT).name).toBe('Foto 22-10-2026 18.05.jpg');
    expect(photoFile(new File(['x'], 'IMG_20261022_180501.jpg', { type: 'image/jpeg' }), AT).name).toBe('Foto 22-10-2026 18.05.jpg');
    expect(photoFile(new File(['x'], 'PXL_20261022.png', { type: 'image/png' }), AT).name).toBe('Foto 22-10-2026 18.05.png');
    const named = new File(['x'], 'Targhetta caldaia.jpg', { type: 'image/jpeg' });
    expect(photoFile(named, AT)).toBe(named);
    expect(photoFile(new File(['x'], 'image.jpg', { type: 'image/jpeg' }), AT).type).toBe('image/jpeg');
  });
  it('HEIC rifiutato con istruzioni; PDF/JPEG/PNG accettati', () => {
    expect(unsupportedFileProblem(new File(['x'], 'IMG_1.HEIC', { type: 'image/heic' }))).toMatch(/HEIC.*«Più compatibile».*JPEG/);
    expect(unsupportedFileProblem(new File(['x'], 'scan.tiff', { type: 'image/tiff' }))).toMatch(/non è un PDF, JPEG o PNG/);
    for (const [name, type] of [['a.pdf', 'application/pdf'], ['b.jpg', 'image/jpeg'], ['c.png', 'image/png']]) expect(unsupportedFileProblem(new File(['x'], name!, { type }))).toBeUndefined();
  });
  it('la lettura locale automatica riguarda solo i PDF: nessuna analisi avviata per le foto', () => {
    const cap = { enabled: true, analysis: { provider: 'local_text_v1', enabled: true, externalTransmission: false } } as Parameters<typeof localAnalysisCandidates>[0];
    const item = (id: string, mimeType: string) => ({ id, version: 1, mimeType, permissions: ['read', 'edit'], uploadState: 'stored', documentLink: { state: 'linked' }, analysisState: 'not_started', reviewState: 'unreviewed' });
    const batch = { id: 'b', permissions: ['read', 'edit'], items: [item('pdf', 'application/pdf'), item('foto', 'image/jpeg'), item('png', 'image/png')] } as unknown as Parameters<typeof localAnalysisCandidates>[1];
    expect(localAnalysisCandidates(cap, batch, new Set())).toEqual([{ id: 'pdf', expectedVersion: 1 }]);
  });
});

describe('[mock] BL-04 · Scatta una foto nel caricamento documenti', () => {
  it('pulsante con fotocamera posteriore, foto in elenco con nome leggibile, HEIC spiegato, niente inviato prima della conferma', async () => {
    const { backend, homeA1, a } = seededBackend(), control = createFakeFetch(backend), posts: string[] = [];
    const limits = { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] };
    const fetch: FetchLike = async (url, init) => {
      if (!url.includes('/document-intake')) return control.fetch(url, init);
      if (init.method === 'POST') posts.push(url);
      const value = url.endsWith('/capabilities')
        ? { apiVersion: 'document-intake-v1', enabled: true, limits, analysis: { provider: 'local_text_v1', enabled: true, label: 'Locale', costUsd: '0.000000', externalTransmission: false } }
        : { items: [], nextCursor: null };
      return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
    };
    const app = renderApp({ path: '/accedi', backend, fetch });
    await screen.findByRole('heading', { name: 'Accedi' });
    await app.user.type(screen.getByLabelText('Email'), a.email);
    await app.user.type(screen.getByLabelText('Password'), PASSWORD_A);
    await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/case'));
    await app.router.navigate(`/home/${homeA1.id}/documenti/organizza`);

    const camera = await screen.findByLabelText('Foto da scattare');
    expect(camera).toHaveAttribute('capture', 'environment');
    expect(camera).toHaveAttribute('accept', 'image/jpeg,image/png');
    expect(camera).not.toHaveAttribute('multiple');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Scatta una foto' })).toBeEnabled());
    expect(screen.getByText(/Le foto si salvano come immagini visibili solo a te/)).toBeInTheDocument();

    await app.user.upload(camera, new File(['jpeg'], 'image.jpg', { type: 'image/jpeg' }));
    const list = await screen.findByRole('list', { name: 'File scelti' });
    expect(within(list).getByText(/^Foto \d{2}-\d{2}-\d{4} \d{2}\.\d{2}\.jpg$/)).toBeInTheDocument();

    const files = screen.getByLabelText('Documenti da caricare');
    // Il filtro accept del browser non basta (trascinamento, sistemi che lo ignorano): la selezione arriva com'è.
    fireEvent.change(files, { target: { files: [new File(['heic'], 'IMG_0001.HEIC', { type: 'image/heic' }), new File(['pdf'], 'Bolletta.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText(/IMG_0001\.HEIC» è in formato HEIC/)).toBeInTheDocument();
    expect(within(list).getByText('Bolletta.pdf')).toBeInTheDocument();
    expect(within(list).queryByText('IMG_0001.HEIC')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'File scelti · 2' })).toBeInTheDocument();
    expect(posts).toEqual([]);
    app.unmount();
  });
});
