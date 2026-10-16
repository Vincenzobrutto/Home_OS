import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MiB } from '../lib/files';
import { blobUrls, downloads } from '../test/browserStubs';
import { FakeBackend, PNG_SIGNATURE, samplePdf } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import type { renderApp as RenderApp } from '../test/harness';

type App = ReturnType<typeof RenderApp>;

const PW = { owner: 'password-owner-001', member: 'password-member-01', viewer: 'password-viewer-01', other: 'password-other-001' };

/** Casa con owner, member e viewer; seconda casa dell'owner; account esterno con la sua casa. */
function documentsWorld() {
  const backend = new FakeBackend();
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW.owner);
  const member = backend.seedAccount('Mario Member', 'member@example.test', PW.member);
  const viewer = backend.seedAccount('Vera Viewer', 'viewer@example.test', PW.viewer);
  const other = backend.seedAccount('Ugo Esterno', 'other@example.test', PW.other);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  const second = backend.seedHome(owner.id, 'Casa Lago', 'Via Lago 2');
  backend.addMember(member.id, home.id, 'member');
  backend.addMember(viewer.id, home.id, 'viewer');
  const otherHome = backend.seedHome(other.id, 'Casa di Ugo', 'Via Ugo 3');
  return { backend, owner, member, viewer, other, home, second, otherHome };
}

async function login(app: App, email: string, password: string) {
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
}

async function openDocuments(backend: FakeBackend, email: string, password: string, homeId: string) {
  const app = renderApp({ path: '/accedi', backend });
  await login(app, email, password);
  await app.router.navigate(`/home/${homeId}/documenti`);
  await screen.findByRole('heading', { level: 1, name: 'Documenti' });
  return app;
}

const pdfFile = (name = 'rogito.pdf') => new File([samplePdf(name) as BlobPart], name, { type: 'application/pdf' });
const posts = (backend: FakeBackend) => backend.log.filter((r) => r.method === 'POST' && /\/documents$/.test(r.path));

async function openUpload(app: App) {
  await app.user.click(screen.getByRole('button', { name: 'Carica documento' }));
  return screen.findByRole('heading', { name: 'Carica documento' });
}

describe('[mock] Documenti — archivio', () => {
  it('Documenti è attiva nella navigazione; archivio vuoto con invito a caricare', async () => {
    const { backend, home } = documentsWorld();
    await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    expect(await screen.findByRole('heading', { name: 'Nessun documento in questa casa' })).toBeInTheDocument();
    const exportButton = screen.getByRole('button', { name: 'Esporta ZIP' });
    expect(exportButton).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Documenti', level: 1 }).parentElement).toContainElement(exportButton);
    const nav = screen.getAllByRole('navigation', { name: 'Sezioni di Casa Roma' })[0]!;
    expect(within(nav).getByRole('link', { name: /Documenti/ })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: /Documenti/ })).not.toHaveTextContent('non ancora disponibile');
  });

  it('elenco: formato, dimensione, Originale caricato, visibilità e fonte; paginazione con «Mostra altri»', async () => {
    const { backend, owner, home } = documentsWorld();
    for (let i = 1; i <= 25; i++) {
      await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: `Documento ${i}`, visibility: i === 25 ? 'home' : 'private' });
    }
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    const list = await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    const first = within(list).getAllByRole('listitem')[0]!;
    expect(first).toHaveTextContent('Documento 25');
    expect(first).toHaveTextContent(/PDF · \d+ B/);
    expect(first).toHaveTextContent('Originale caricato');
    expect(first).toHaveTextContent('Persone della casa');
    expect(first).toHaveTextContent('Caricamento manuale');
    expect(within(list).getAllByRole('listitem')[1]).toHaveTextContent('Solo io');
    await app.user.click(screen.getByRole('button', { name: 'Mostra altri documenti' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(25));
    expect(screen.queryByRole('button', { name: 'Mostra altri documenti' })).not.toBeInTheDocument();
    expect(backend.log.filter((r) => r.path.includes('/documents?')).map((r) => r.path.split('?')[1])).toEqual(['limit=20', 'limit=20&cursor=c20']);
  });

  it('backend senza endpoint documentali: errore comprensibile + Riprova, nessun archivio finto', async () => {
    const { backend, home } = documentsWorld();
    backend.documentsEnabled = false;
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    expect(await screen.findByRole('alert')).toHaveTextContent('L’archivio documenti non è ancora attivo su questo servizio.');
    expect(screen.queryByText('Nessun documento in questa casa')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Documenti di/ })).not.toBeInTheDocument();
    backend.documentsEnabled = true;
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByText('Nessun documento in questa casa')).toBeInTheDocument();
  });

  it('servizio spento o storage non disponibile: errore, mai elenco vuoto', async () => {
    const { backend, home } = documentsWorld();
    backend.storageDown = true;
    await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    expect(await screen.findByRole('alert')).toHaveTextContent('L’archivio dei documenti non è disponibile');
    expect(screen.queryByText('Nessun documento in questa casa')).not.toBeInTheDocument();
  });

  it('privato di un altro account non compare nemmeno all’owner; viewer vede solo i documenti della casa', async () => {
    const { backend, owner, member, home } = documentsWorld();
    await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Busta paga Mario', visibility: 'private' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Regolamento', visibility: 'home' });
    await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    const list = await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Busta paga Mario')).not.toBeInTheDocument();
  });
});

describe('[mock] Documenti — caricamento', () => {
  it('la risposta di upload non sottrae il focus a un altro controllo già attivo', async () => {
    const { backend, home } = documentsWorld();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const original = backend.handle.bind(backend);
    backend.handle = async req => {
      if (req.method === 'POST' && req.path.endsWith('/documents')) await gate;
      return original(req);
    };
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), pdfFile());
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    const otherControl = screen.getByRole('link', { name: 'Consegne ricevute' });
    otherControl.focus();
    release();
    await screen.findByText('Documento caricato');
    expect(otherControl).toHaveFocus();
  });

  it('default «Solo io», destinazione con nome casa, titolo dal file; multipart con CSRF, contesto e chiave', async () => {
    const { backend, owner, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    const title = await openUpload(app);
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText('Destinazione:').closest('p')).toHaveTextContent('Destinazione: Casa Roma');
    expect(screen.getByRole('radio', { name: /Solo io/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Persone della casa/ })).not.toBeChecked();
    expect(screen.getByText('Visibile alle persone che hanno accesso a questa casa.')).toBeInTheDocument();
    await app.user.upload(screen.getByLabelText('File'), pdfFile('Rogito 2019.pdf'));
    expect(screen.getByLabelText(/^Titolo/)).toHaveValue('Rogito 2019.pdf');
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    expect(await screen.findByText('Documento caricato')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Documento caricato').closest('[role="status"]')).toHaveFocus());
    const [req] = posts(backend);
    expect(req!.headers['x-account-context']).toBe(owner.id);
    expect(req!.headers['x-csrf-token']).toBeTruthy();
    expect(req!.headers['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
    const form = req!.body as FormData;
    expect(form.get('visibility')).toBe('private');
    expect(form.get('name')).toBe('Rogito 2019.pdf');
    const list = await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(within(list).getByText('Rogito 2019.pdf', { selector: 'a' })).toBeInTheDocument();
    expect([...backend.documents.values()][0]!.visibility).toBe('private');
  });

  it('«Persone della casa» solo come scelta esplicita', async () => {
    const { backend, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), pdfFile());
    await app.user.clear(screen.getByLabelText(/^Titolo/));
    await app.user.type(screen.getByLabelText(/^Titolo/), '  Regolamento  ');
    await app.user.click(screen.getByRole('radio', { name: /Persone della casa/ }));
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    await screen.findByText('Documento caricato');
    const form = posts(backend)[0]!.body as FormData;
    expect(form.get('visibility')).toBe('home');
    expect(form.get('name')).toBe('Regolamento');
  });

  it('file mancante, vuoto, troppo grande o di formato non ammesso: errore locale, nessuna richiesta', async () => {
    const { backend, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    expect(screen.getByLabelText('File')).toHaveAccessibleDescription(/Scegli un file da caricare/);
    expect(screen.getByLabelText('File')).toHaveFocus();

    await app.user.upload(screen.getByLabelText('File'), new File([], 'vuoto.pdf', { type: 'application/pdf' }));
    expect(screen.getByLabelText('File')).toHaveAccessibleDescription(/Il file è vuoto/);

    const big = pdfFile('grande.pdf');
    Object.defineProperty(big, 'size', { value: 20 * MiB + 1 });
    await app.user.upload(screen.getByLabelText('File'), big);
    expect(screen.getByLabelText('File')).toHaveAccessibleDescription(/limite per file è 20 MiB/);

    const input = screen.getByLabelText('File') as HTMLInputElement;
    // Un browser può ignorare accept (es. «Tutti i file»): l'input riceve comunque un .txt.
    fireEvent.change(input, { target: { files: [new File(['ciao'], 'note.txt', { type: 'text/plain' })] } });
    expect(input).toHaveAccessibleDescription(/Formato non supportato/);
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    expect(posts(backend)).toHaveLength(0);
  });

  it('byte non coerenti con il formato: 415 del server mostrato sul campo file', async () => {
    const { backend, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), new File(['non sono un pdf'], 'finto.pdf', { type: 'application/pdf' }));
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    await waitFor(() => expect(screen.getByLabelText('File')).toHaveAccessibleDescription(/Formato non supportato: carica PDF, JPEG o PNG/));
    expect(backend.documents.size).toBe(0);
  });

  it('doppio clic: un solo invio', async () => {
    const { backend, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), pdfFile());
    await app.user.dblClick(screen.getByRole('button', { name: 'Carica' }));
    await screen.findByText('Documento caricato');
    expect(posts(backend)).toHaveLength(1);
    expect(backend.documents.size).toBe(1);
  });

  for (const code of ['file_check_unavailable', 'storage_capacity_low']) it(`rifiuto certo ${code}: nessun successo, campi editabili e retry con la stessa chiave`, async () => {
    const { backend, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    const original = backend.handle.bind(backend); let first = true;
    backend.handle = async req => {
      if (first && req.method === 'POST' && /\/documents$/.test(req.path)) {
        first = false; backend.log.push(req);
        return { status: 503, body: { error: { code, message: 'Nessun documento salvato.' } } };
      }
      return original(req);
    };
    await openUpload(app); await app.user.upload(screen.getByLabelText('File'), pdfFile());
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    expect(await screen.findByText('Documento non salvato')).toBeInTheDocument();
    expect(screen.queryByText('Esito non confermato')).not.toBeInTheDocument();
    expect(screen.queryByText('Documento caricato')).not.toBeInTheDocument();
    expect(backend.documents.size).toBe(0);
    expect(screen.getByLabelText('File')).toBeEnabled(); expect(screen.getByLabelText(/^Titolo/)).toBeEnabled();
    expect(screen.getByLabelText(/^Titolo/)).toHaveValue('rogito.pdf');
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }));
    await screen.findByText('Documento caricato');
    const [a, b] = posts(backend); expect(a!.headers['idempotency-key']).toBe(b!.headers['idempotency-key']);
    expect((a!.body as FormData).get('file')).toEqual((b!.body as FormData).get('file')); expect(backend.documents.size).toBe(1);
  });

  it('esito ambiguo: campi bloccati, «Riprova invio» con stessa chiave e stesso file, nessun doppione', async () => {
    const { backend, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), pdfFile());
    app.control.dropNextResponse();
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.queryByText('Documento non salvato')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('Nessun file è stato modificato');
    expect(screen.getByLabelText(/^Titolo/)).toBeDisabled();
    expect(screen.getByLabelText('File')).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Solo io/ })).toBeDisabled();
    await app.user.click(screen.getByRole('button', { name: 'Riprova invio' }));
    await screen.findByText('Documento caricato');
    const [a, b] = posts(backend);
    expect(a!.headers['idempotency-key']).toBe(b!.headers['idempotency-key']);
    const fa = (a!.body as FormData).get('file') as File;
    const fb = (b!.body as FormData).get('file') as File;
    expect([fb.name, fb.size]).toEqual([fa.name, fa.size]);
    expect(backend.documents.size).toBe(1);
  });

  it('conflitto di idempotenza: messaggio esplicito, nuova richiesta con nuova chiave', async () => {
    const { backend, home } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    const original = backend.handle.bind(backend);
    let first = true;
    backend.handle = async (req) => {
      if (first && req.method === 'POST' && /\/documents$/.test(req.path)) {
        first = false;
        backend.log.push(req);
        return { status: 409, body: { error: { code: 'idempotency_conflict', message: 'Chiave già usata con dati diversi.' } } };
      }
      return original(req);
    };
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), pdfFile());
    await app.user.click(screen.getByRole('button', { name: 'Carica' }));
    expect(await screen.findByText('Richiesta in conflitto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carica' })).toBeDisabled();
    await app.user.click(screen.getByRole('button', { name: 'Invia come nuova richiesta' }));
    await screen.findByText('Documento caricato');
    const keys = posts(backend).map((r) => r.headers['idempotency-key']);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('member può caricare ma non esportare; viewer non vede né caricamento né selezione ZIP', async () => {
    const { backend, owner, home } = documentsWorld();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Regolamento', visibility: 'home' });
    const memberApp = await openDocuments(backend, 'member@example.test', PW.member, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(screen.getByRole('button', { name: 'Carica documento' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Esporta ZIP' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    memberApp.unmount();

    await openDocuments(backend, 'viewer@example.test', PW.viewer, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(screen.queryByRole('button', { name: 'Carica documento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Esporta ZIP' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(/puoi consultare e scaricare i documenti visibili, non caricarne/)).toBeInTheDocument();
  });
});

describe('[mock] Documenti — dettaglio, download ed export', () => {
  it('dettaglio: metadati, versione 1, SHA-256, anteprima dai byte autorizzati e download con nome sicuro', async () => {
    const { backend, owner, home } = documentsWorld();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito', originalFilename: 'rogito.pdf', visibility: 'home' });
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await app.user.click(await screen.findByRole('link', { name: 'Rogito' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Rogito' })).toBeInTheDocument();
    expect(app.router.state.location.pathname).toBe(`/home/${home.id}/documenti/${doc.id}`);
    const data = screen.getByRole('region', { name: 'Dati del file' });
    expect(data).toHaveTextContent('rogito.pdf');
    expect(data).toHaveTextContent('Caricamento manuale');
    expect(data).toHaveTextContent('Originale caricato');
    expect(data).toHaveTextContent(doc.sha256);
    expect(data).toHaveTextContent(/Versione\s*1/);
    expect(data).not.toHaveTextContent(/Validato|Confermato|Certificato/);
    const preview = await screen.findByLabelText('Anteprima di Rogito');
    expect(preview.tagName).toBe('OBJECT');
    expect(preview.getAttribute('data')).toMatch(/^blob:/);
    expect(backend.log.filter((r) => r.path.endsWith('/file'))).toHaveLength(1);
    expect(backend.log.find((r) => r.path.endsWith('/file'))!.headers['x-account-context']).toBe(owner.id);

    await app.user.click(screen.getByRole('button', { name: 'Scarica originale' }));
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]!.filename).toBe('rogito.pdf');
    // Il download riusa i byte dell'anteprima: nessuna seconda richiesta.
    expect(backend.log.filter((r) => r.path.endsWith('/file'))).toHaveLength(1);
  });

  it('immagine: anteprima <img> dai byte; URL Blob revocato lasciando la pagina', async () => {
    const { backend, owner, home } = documentsWorld();
    const png = new Uint8Array([...PNG_SIGNATURE, 0, 0, 0, 0]);
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Planimetria', mimeType: 'image/png', bytes: png });
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await app.router.navigate(`/home/${home.id}/documenti/${doc.id}`);
    const img = await screen.findByRole('img', { name: 'Anteprima di Planimetria' });
    const url = img.getAttribute('src')!;
    expect(url).toMatch(/^blob:/);
    expect(blobUrls.active).toContain(url);
    await app.user.click(screen.getByRole('link', { name: /Documenti di Casa Roma/ }));
    await screen.findByRole('heading', { level: 1, name: 'Documenti' });
    expect(blobUrls.revoked.has(url)).toBe(true);
    expect(blobUrls.active).toHaveLength(0);
  });

  it('documento privato altrui o di un’altra casa: 403 generico senza metadati; id non valido: 422', async () => {
    const { backend, member, home, other, otherHome } = documentsWorld();
    const secret = await backend.seedDocument({ homeId: home.id, uploaderId: member.id, name: 'Busta paga Mario', visibility: 'private' });
    const foreign = await backend.seedDocument({ homeId: otherHome.id, uploaderId: other.id, name: 'Contratto di Ugo', visibility: 'home' });
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await app.router.navigate(`/home/${home.id}/documenti/${secret.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Documento non disponibile' })).toBeInTheDocument();
    expect(screen.queryByText(/Busta paga/)).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/documenti/${foreign.id}`);
    await waitFor(() => expect(backend.log.some((r) => r.path.endsWith(foreign.id))).toBe(true));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(await screen.findByRole('heading', { level: 1, name: 'Documento non disponibile' })).toBeInTheDocument();
    expect(screen.queryByText(/Contratto di Ugo/)).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/documenti/non-un-uuid`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Indirizzo non valido' })).toBeInTheDocument();
    expect(backend.log.some((r) => r.path.endsWith('/file'))).toBe(false);
  });

  it('viewer: consulta e scarica un documento della casa', async () => {
    const { backend, owner, home } = documentsWorld();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Regolamento', originalFilename: 'regolamento.pdf', visibility: 'home' });
    const app = await openDocuments(backend, 'viewer@example.test', PW.viewer, home.id);
    await app.router.navigate(`/home/${home.id}/documenti/${doc.id}`);
    await screen.findByLabelText('Anteprima di Regolamento');
    await app.user.click(screen.getByRole('button', { name: 'Scarica originale' }));
    await waitFor(() => expect(downloads.map((d) => d.filename)).toEqual(['regolamento.pdf']));
  });

  it('export ZIP solo su richiesta esplicita: selezione, POST con gli id, file .zip salvato', async () => {
    const { backend, owner, home } = documentsWorld();
    const d1 = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Uno' });
    const d2 = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Due' });
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Tre' });
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(backend.log.some((r) => r.path.endsWith('/export'))).toBe(false);
    expect(screen.getByRole('button', { name: 'Esporta ZIP' })).toBeDisabled();
    expect(screen.getByText(/limite tecnico di questa versione/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('checkbox', { name: /Seleziona «Uno»/ }));
    await app.user.click(screen.getByRole('checkbox', { name: /Seleziona «Due»/ }));
    expect(screen.getByText(/2 selezionati/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Esporta ZIP' }));
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]!.filename).toBe('documenti.zip');
    const req = backend.log.find((r) => r.path.endsWith('/export'))!;
    expect(new Set((req.body as { documentIds: string[] }).documentIds)).toEqual(new Set([d1.id, d2.id]));
    expect(await screen.findByText('ZIP pronto')).toBeInTheDocument();
  });

  it('export rifiutato (403): nessun file salvato, nessun export parziale', async () => {
    const { backend, owner, home } = documentsWorld();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Uno' });
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    const original = backend.handle.bind(backend);
    backend.handle = async (req) =>
      req.path.endsWith('/export') ? { status: 403, body: { error: { code: 'forbidden', message: 'Accesso non consentito.' } } } : original(req);
    await app.user.click(await screen.findByRole('checkbox', { name: /Seleziona «Uno»/ }));
    await app.user.click(screen.getByRole('button', { name: 'Esporta ZIP' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nessun file è stato esportato.');
    expect(downloads).toHaveLength(0);
  });
});

describe('[mock] Documenti — sessione e contesto', () => {
  it('401 durante il caricamento dei documenti: login e cache documenti rimossa', async () => {
    const { backend, owner, home } = documentsWorld();
    await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Uno' });
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    backend.sessions.clear();
    await app.router.navigate(`/home/${home.id}/documenti/${[...backend.documents.keys()][0]}`);
    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument();
    const keys = app.queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys.filter((k) => k.includes('documents'))).toEqual([]);
  });

  it('logout dal dettaglio: URL Blob revocati; bozza di caricamento non passa all’account successivo', async () => {
    const { backend, owner, home } = documentsWorld();
    const doc = await backend.seedDocument({ homeId: home.id, uploaderId: owner.id, name: 'Rogito', visibility: 'home' });
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), pdfFile('bozza-privata.pdf'));
    await app.router.navigate(`/home/${home.id}/documenti/${doc.id}`);
    await screen.findByLabelText('Anteprima di Rogito');
    expect(blobUrls.active).toHaveLength(1);
    await app.user.click(screen.getByRole('button', { name: /Esci/ }));
    await screen.findByRole('heading', { name: 'Accedi' });
    expect(blobUrls.active).toHaveLength(0);
    await login(app, 'member@example.test', PW.member);
    await app.router.navigate(`/home/${home.id}/documenti`);
    await screen.findByRole('list', { name: 'Documenti di Casa Roma' });
    expect(screen.queryByRole('heading', { name: 'Carica documento' })).not.toBeInTheDocument();
    expect(screen.queryByText(/bozza-privata/)).not.toBeInTheDocument();
  });

  it('cambio casa: la bozza di caricamento non segue l’utente nell’altra casa', async () => {
    const { backend, home, second } = documentsWorld();
    const app = await openDocuments(backend, 'owner@example.test', PW.owner, home.id);
    await openUpload(app);
    await app.user.upload(screen.getByLabelText('File'), pdfFile('per-casa-roma.pdf'));
    await app.router.navigate(`/home/${second.id}/documenti`);
    await waitFor(() => expect(screen.getAllByRole('navigation', { name: 'Sezioni di Casa Lago' }).length).toBeGreaterThan(0), { timeout: 3000 });
    await screen.findByText('Nessun documento in questa casa');
    expect(screen.queryByText(/per-casa-roma/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Carica documento' })).not.toBeInTheDocument();
  });
});
