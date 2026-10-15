// Prove [mock] sharing-v1 (C1a): backend SIMULATO (src/test/fakeSharing.ts) aderente al contratto
// docs/v5/sharing-api-contract.md. Non è il backend reale: nessuna prova di DB, identità o sicurezza.
import { configure, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import { sharingApi } from '../api/sharingClient';
import { downloads } from '../test/browserStubs';

configure({ asyncUtilTimeout: 5000 });

const PW = 'password-di-prova-001';

async function world(opts: { docs?: number } = {}) {
  const backend = new FakeBackend();
  backend.sharing.enabled = true;
  const giulia = backend.seedAccount('Giulia Leone', 'giulia@example.test', PW);
  const marco = backend.seedAccount('Marco Leone', 'marco@example.test', PW);
  const luca = backend.seedAccount('Luca Bassi', 'luca@example.test', PW); // nessuna casa
  const paolo = backend.seedAccount('Paolo Neri', 'paolo@example.test', PW); // nessuna casa
  const home = backend.seedHome(giulia.id, 'Casa Roma', 'Via Roma 1');
  const lake = backend.seedHome(giulia.id, 'Casa Lago', 'Via Lago 2');
  backend.memberships.push({ accountId: marco.id, homeId: home.id, role: 'member' });
  const manuale = await backend.seedDocument({ homeId: home.id, uploaderId: giulia.id, name: 'Manuale caldaia', visibility: 'home' });
  const libretto = await backend.seedDocument({ homeId: home.id, uploaderId: giulia.id, name: 'Libretto impianto', visibility: 'private' });
  await backend.seedDocument({ homeId: home.id, uploaderId: marco.id, name: 'Rapporto fumi', visibility: 'home' });
  await backend.seedDocument({ homeId: home.id, uploaderId: marco.id, name: 'Privato di Marco', visibility: 'private' });
  await backend.seedDocument({ homeId: lake.id, uploaderId: giulia.id, name: 'Planimetria lago', visibility: 'private' });
  for (let i = 0; i < (opts.docs ?? 0); i++) await backend.seedDocument({ homeId: home.id, uploaderId: giulia.id, name: `Extra ${String(i).padStart(2, '0')}` });
  return { backend, giulia, marco, luca, paolo, home, lake, manuale, libretto };
}

type App = ReturnType<typeof renderApp>;

async function login(app: App, email: string) {
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), PW);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  // Wait for HomeEntry's redirect too; navigating during the transient '/' can be overwritten by it.
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case(?:\/nuova)?|home\/[^/]+\/casa)$/));
}

async function open(backend: FakeBackend, email: string, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await login(app, email);
  await app.router.navigate(path);
  return app;
}

async function switchTo(app: App, email: string, path: string) {
  await app.user.click(screen.getAllByRole('button', { name: /Esci/ })[0]!);
  await login(app, email);
  await app.router.navigate(path);
}

const posts = (b: FakeBackend, re: RegExp) => b.log.filter((r) => r.method === 'POST' && re.test(r.path));

async function acceptedMemberDelivery() {
  const w = await world();
  const app = await open(w.backend, 'giulia@example.test', `/home/${w.home.id}/casa`);
  await app.user.click(await prepare(app, w.home.id, { docs: ['Manuale caldaia'], to: /Marco Leone/ }));
  await screen.findByText('Invito da accettare');
  const s = [...w.backend.sharing.shares.values()][0]!;
  await switchTo(app, 'marco@example.test', `/consegne/${s.id}`);
  await app.user.click(await screen.findByRole('button', { name: 'Accetta' }));
  await screen.findByRole('button', { name: /Scarica Manuale caldaia/ });
  return { ...w, app, share: s };
}

describe('[mock] C1a — download e cambio contesto', () => {
  it('un download terminato dopo logout e nuovo account non salva il file privato', async () => {
    const { backend, app } = await acceptedMemberDelivery();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const handle = backend.handle.bind(backend);
    let delivered = false;
    backend.handle = async (req) => {
      const result = await handle(req);
      if (req.method === 'GET' && /\/received-shares\/.*\/file$/.test(req.path)) { await gate; delivered = true; }
      return result;
    };
    await app.user.click(screen.getByRole('button', { name: /Scarica Manuale caldaia/ }));
    await waitFor(() => expect(backend.log.some(r => /\/received-shares\/.*\/file$/.test(r.path))).toBe(true));
    await switchTo(app, 'luca@example.test', '/consegne');
    await screen.findByRole('heading', { name: 'Consegne ricevute' });
    release();
    await waitFor(() => expect(delivered).toBe(true));
    await new Promise(r => setTimeout(r, 0));
    expect(downloads).toHaveLength(0);
    expect(screen.queryByText(/Manuale caldaia/)).toBeNull();
  });

  it('403 al file azzera il dettaglio e non lascia nomi nella cache o nella pagina', async () => {
    const { backend, app, share, marco } = await acceptedMemberDelivery();
    backend.sharing.shares.get(share.id)!.state = 'revoked'; // other account's server-side revocation
    await app.user.click(screen.getByRole('button', { name: /Scarica Manuale caldaia/ }));
    await screen.findByRole('heading', { level: 1, name: 'Non più disponibile' });
    expect(screen.queryByText(/Manuale caldaia/)).toBeNull();
    expect(downloads).toHaveLength(0);
    const cached = app.queryClient.getQueryCache().getAll().filter(q => q.queryKey[1] === marco.id && q.queryKey.includes('received-shares'));
    expect(JSON.stringify(cached.map(q => q.state.data))).not.toContain('Manuale caldaia');
  });
});

/** Percorso completo fino alla conferma; restituisce il pulsante «Crea l’invito» senza premerlo. */
async function prepare(app: App, homeId: string, opts: { docs: string[]; to: 'external' | RegExp; days?: string | RegExp }) {
  await app.router.navigate(`/home/${homeId}/condivisioni/nuova`);
  // Primo accesso alla sezione differita: in test il modulo può arrivare lentamente a freddo.
  await screen.findByRole('heading', { level: 1, name: 'Nuova condivisione' }, { timeout: 15000 });
  for (const d of opts.docs) await app.user.click(await screen.findByRole('checkbox', { name: new RegExp(d) }, { timeout: 10000 }));
  await app.user.click(screen.getByRole('button', { name: 'Continua' }));
  if (opts.to === 'external') {
    await app.user.click(await screen.findByRole('button', { name: 'Persona esterna' }));
    await app.user.click(screen.getByRole('radio', { name: /Persona esterna con codice/ }));
  } else {
    await app.user.click(await screen.findByRole('radio', { name: opts.to }));
  }
  await app.user.click(screen.getByRole('button', { name: 'Continua' }));
  if (opts.days) await app.user.click(await screen.findByRole('radio', { name: opts.days }));
  await app.user.click(await screen.findByRole('button', { name: 'Prepara il controllo' }));
  await screen.findByRole('heading', { name: 'Controlla prima di creare l’invito' });
  for (const d of opts.docs) await app.user.click(screen.getByRole('checkbox', { name: new RegExp(`${d}.*Ho controllato`) }));
  return screen.getByRole('button', { name: 'Crea l’invito' });
}

describe('[mock] C1a — preparazione e manifesto', () => {
  it('picker: nessuna selezione implicita, origine evidenziata, file altrui disattivati con motivo, privati altrui assenti, paging reale', async () => {
    const { backend, home, manuale } = await world({ docs: 22 });
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/documenti/${manuale.id}`);
    await app.user.click(await screen.findByRole('link', { name: 'Condividi…' }));
    // Il documento di partenza è nella seconda pagina: lo diciamo, non lo cerchiamo in silenzio.
    expect(await screen.findByText(/non è fra quelli già caricati/)).toBeInTheDocument();
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((b) => expect(b).not.toBeChecked());
    expect(screen.getByRole('button', { name: 'Continua' })).toBeDisabled();
    expect(screen.queryByText(/Planimetria lago/)).toBeNull(); // altra casa
    expect(screen.queryByText(/Extra 00/)).toBeNull(); // pagina successiva
    await app.user.click(screen.getByRole('button', { name: 'Carica altri' }));
    expect(await screen.findByRole('checkbox', { name: /Extra 00/ })).not.toBeChecked();
    expect(screen.getByText(/Sei partito da «Manuale caldaia»/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Manuale caldaia/ })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Carica altri' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: /Rapporto fumi/ })).toBeDisabled();
    expect(screen.getByText(/solo chi l’ha caricato può condividerlo/)).toBeInTheDocument();
    expect(screen.queryByText('Privato di Marco')).toBeNull();
    expect(backend.log.filter((r) => r.path.includes('sharing-documents')).map((r) => r.path)).toEqual([
      expect.stringMatching(/sharing-documents\?limit=20$/),
      expect.stringMatching(/sharing-documents\?.*cursor=/),
    ]);
    expect(posts(backend, /share-previews|shares/)).toHaveLength(0);
  });

  it('manifesto del server: conferma di ogni file, modifica che invalida controllo e conferme, body esatti, nessuna email', async () => {
    const { backend, home, manuale, libretto, marco } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    const create = await prepare(app, home.id, { docs: ['Manuale caldaia', 'Libretto impianto'], to: /Marco Leone/ });
    expect(screen.getByText(/vedrà i file completi, anche eventuali importi, IBAN e dati personali/)).toBeInTheDocument();
    expect(screen.getByText(/Marco Leone · marco@example.test/)).toBeInTheDocument();
    expect(posts(backend, /share-previews$/)[0]!.body).toEqual({ documentIds: [manuale.id, libretto.id], recipient: { kind: 'member', accountId: marco.id }, durationDays: 7 });
    expect(create).toBeEnabled();
    await app.user.click(screen.getByRole('checkbox', { name: /Libretto impianto.*Ho controllato/ }));
    expect(create).toBeDisabled(); // un file non confermato
    // Indietro e modifica della durata: controllo e conferme non valgono più.
    await app.user.click(screen.getByRole('button', { name: 'Indietro' }));
    await app.user.click(await screen.findByRole('radio', { name: /30 giorni/ }));
    await app.user.click(screen.getByRole('button', { name: 'Prepara il controllo' }));
    await screen.findByRole('heading', { name: 'Controlla prima di creare l’invito' });
    screen.getAllByRole('checkbox').forEach((b) => expect(b).not.toBeChecked());
    expect(posts(backend, /share-previews$/)).toHaveLength(2);
    expect(posts(backend, /share-previews$/)[1]!.body).toMatchObject({ durationDays: 30 });
    for (const d of ['Manuale caldaia', 'Libretto impianto']) await app.user.click(screen.getByRole('checkbox', { name: new RegExp(`${d}.*Ho controllato`) }));
    await app.user.click(screen.getByRole('button', { name: 'Crea l’invito' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Marco Leone' })).toBeInTheDocument();
    expect(screen.getByText('Invito da accettare')).toBeInTheDocument();
    expect(screen.getByText(/accettare non significa aver letto/)).toBeInTheDocument();
    const sent = posts(backend, /\/shares$/)[0]!;
    const preview = [...backend.sharing.previews.values()][1]!;
    expect(sent.body).toEqual({ previewId: preview.id, expectedPreviewVersion: 1, manifestFingerprint: preview.fingerprint, acknowledgedDocumentIds: [manuale.id, libretto.id] });
    // Nessun ID tecnico o impronta in pagina.
    expect(document.body.textContent).not.toContain(preview.fingerprint);
    expect(document.body.textContent).not.toContain(manuale.id);
  });

  it('controllo scaduto: niente conferma con il vecchio consenso, nuovo controllo con conferme da rifare', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    const create = await prepare(app, home.id, { docs: ['Manuale caldaia'], to: /Marco Leone/ });
    expect(create).toBeEnabled();
    backend.sharing.offsetMs = 11 * 60_000; // il server considera scaduta l'anteprima
    await app.user.click(create);
    expect(await screen.findByText('Controllo scaduto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crea l’invito' })).toBeDisabled();
    await app.user.click(screen.getByRole('button', { name: 'Prepara un nuovo controllo' }));
    await waitFor(() => expect(posts(backend, /share-previews$/)).toHaveLength(2));
    await waitFor(() => expect(screen.queryByText('Controllo scaduto')).toBeNull());
    expect(screen.getByRole('checkbox', { name: /Manuale caldaia.*Ho controllato/ })).not.toBeChecked();
    expect(backend.sharing.shares.size).toBe(0);
  });

  it('lasciare la preparazione chiede conferma e non salva nulla', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/condivisioni/nuova`);
    await app.user.click(await screen.findByRole('checkbox', { name: /Manuale caldaia/ }));
    await app.user.click(screen.getByRole('button', { name: 'Annulla' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lasciare la preparazione?' });
    await app.user.click(within(dialog).getByRole('button', { name: 'Resta' }));
    expect(screen.getByRole('checkbox', { name: /Manuale caldaia/ })).toBeChecked();
    await app.user.click(screen.getByRole('button', { name: 'Annulla' }));
    await app.user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Esci senza salvare' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Condivisioni' })).toBeInTheDocument();
    expect(posts(backend, /share/)).toHaveLength(0);
  });
});

describe('[mock] C1a — persona esterna, codice e abbinamento', () => {
  it('risposta persa alla creazione: stessa chiave e body, un solo invito, code null e rotazione solo esplicita', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    const create = await prepare(app, home.id, { docs: ['Manuale caldaia'], to: 'external' });
    app.control.dropNextResponse();
    await app.user.click(create);
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crea l’invito' })).toBeNull();
    await app.user.click(screen.getByRole('button', { name: 'Riprova invio' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Invito creato' })).toBeInTheDocument();
    const sent = posts(backend, /\/shares$/);
    expect(sent).toHaveLength(2);
    expect(sent[1]!.headers['idempotency-key']).toBe(sent[0]!.headers['idempotency-key']);
    expect(sent[1]!.body).toEqual(sent[0]!.body);
    expect(backend.sharing.shares.size).toBe(1);
    // Il replay restituisce code:null: niente codice inventato, niente rotazione automatica.
    expect(screen.getByText(/Codice non recuperabile/)).toBeInTheDocument();
    expect(posts(backend, /rotate-code$/)).toHaveLength(0);
    await app.user.click(screen.getByRole('link', { name: 'Vai alla condivisione' }));
    await app.user.click(await screen.findByRole('button', { name: 'Genera un nuovo codice' }));
    const dialog = await screen.findByRole('dialog', { name: 'Generare un nuovo codice?' });
    await app.user.click(within(dialog).getByRole('button', { name: 'Genera il codice' }));
    const code = backend.sharing.issuedCodes.at(-1)!;
    expect(await screen.findByText(code.replace(/(.{5})(?=.)/, '$1 '))).toBeInTheDocument();
    expect(posts(backend, /rotate-code$/)[0]!.body).toEqual({ expectedVersion: 1 });
    // Il codice non è in URL, storage o cache.
    expect((app.router.state.location.pathname + app.router.state.location.search)).not.toContain(code);
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(code);
    expect(JSON.stringify(app.queryClient.getQueryCache().getAll().map((q) => q.state.data))).not.toContain(code);
    // Lasciata la pagina, il codice non si rivede.
    await app.router.navigate(`/home/${home.id}/condivisioni`);
    await app.user.click(await screen.findByRole('link', { name: 'Persona esterna' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Persona esterna' })).toBeInTheDocument();
    expect(screen.queryByText(code.replace(/(.{5})(?=.)/, '$1 '))).toBeNull();
  });

  it('esterno senza case: codice con consenso, nessun documento dopo il claim, confronto non preselezionato, accettazione e download', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    await app.user.click(await prepare(app, home.id, { docs: ['Manuale caldaia'], to: 'external' }));
    await screen.findByRole('heading', { level: 1, name: 'Invito creato' });
    const code = backend.sharing.issuedCodes.at(-1)!;
    const shareId = [...backend.sharing.shares.keys()][0]!;
    await switchTo(app, 'luca@example.test', '/consegne');
    expect(await screen.findByText('Nessuna consegna per questo account.')).toBeInTheDocument();
    await app.user.click(screen.getByRole('link', { name: 'Ho ricevuto un codice' }));
    await app.user.type(await screen.findByLabelText('Codice'), code.slice(0, 5) + '-' + code.slice(5).toLowerCase());
    expect(screen.getByRole('button', { name: 'Invia il codice' })).toBeDisabled(); // consenso discloseAccount esplicito
    await app.user.click(screen.getByRole('checkbox', { name: /vedrà il nome e l’email del mio account/ }));
    await app.user.click(screen.getByRole('button', { name: 'Invia il codice' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'In attesa del mittente' })).toBeInTheDocument();
    expect(posts(backend, /code-claims$/)[0]!.body).toEqual({ code, discloseAccount: true });
    expect((app.router.state.location.pathname + app.router.state.location.search)).not.toContain(code);
    const comparison = [...backend.sharing.shares.values()][0]!.claim!.comparisonCode;
    expect(screen.getByText(comparison)).toBeInTheDocument();
    expect(screen.queryByText(/Manuale caldaia/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Scarica/ })).toBeNull();
    // Il claim non autorizza il file, neppure chiamando direttamente l'API.
    const direct = await sharingApi(app.api).file(shareId, [...backend.sharing.shares.values()][0]!.items[0]!.documentId, undefined, backend.accounts.get([...backend.accounts.keys()][2]!)!.id).catch((e: unknown) => e);
    expect(direct).toMatchObject({ status: 403, code: 'share_unavailable' });

    await switchTo(app, 'giulia@example.test', `/home/${home.id}/condivisioni/${shareId}`);
    expect(await screen.findByText(/Nome ed email dichiarati dall’account, non verificati/)).toBeInTheDocument();
    expect(screen.getByText(/Luca Bassi/)).toBeInTheDocument();
    expect(screen.getByText(comparison)).toBeInTheDocument();
    const compared = screen.getByRole('checkbox', { name: /Ho confrontato il codice/ });
    expect(compared).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Conferma la persona' })).toBeDisabled();
    await app.user.click(compared);
    await app.user.click(screen.getByRole('button', { name: 'Conferma la persona' }));
    expect(await screen.findByText('Invito da accettare')).toBeInTheDocument();
    const claimId = [...backend.sharing.shares.values()][0]!.claim!.id;
    expect(posts(backend, /confirm-pairing$/)[0]!.body).toEqual({ expectedVersion: 2, claimId, comparisonCode: comparison, confirmRecipient: true });

    await switchTo(app, 'luca@example.test', `/consegne/${shareId}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Giulia Leone vuole darti dei documenti' })).toBeInTheDocument();
    expect(screen.queryByText(/Manuale caldaia|Via Roma|Casa Roma/)).toBeNull();
    await app.user.click(screen.getByRole('button', { name: 'Accetta' }));
    expect(await screen.findByRole('button', { name: 'Scarica Manuale caldaia' })).toBeInTheDocument();
    expect(screen.queryByText(/Via Roma|Casa Roma|Spese|Attività/)).toBeNull();
    await app.user.click(screen.getByRole('button', { name: 'Scarica Manuale caldaia' }));
    await waitFor(() => expect(backend.log.some((r) => r.method === 'GET' && /\/received-shares\/.+\/documents\/.+\/file$/.test(r.path))).toBe(true));
    expect(screen.queryByText('Download non riuscito')).toBeNull();
  });

  it('nuovo claim dopo un nuovo codice: la casella del confronto torna vuota', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    await app.user.click(await prepare(app, home.id, { docs: ['Manuale caldaia'], to: 'external' }));
    await screen.findByRole('heading', { level: 1, name: 'Invito creato' });
    const shareId = [...backend.sharing.shares.keys()][0]!;
    const claimAs = async (email: string, code: string) => {
      await switchTo(app, email, '/consegne/codice');
      await app.user.type(await screen.findByLabelText('Codice'), code);
      await app.user.click(screen.getByRole('checkbox', { name: /vedrà il nome/ }));
      await app.user.click(screen.getByRole('button', { name: 'Invia il codice' }));
      await screen.findByRole('heading', { level: 1, name: 'In attesa del mittente' });
    };
    await claimAs('paolo@example.test', backend.sharing.issuedCodes.at(-1)!);
    await switchTo(app, 'giulia@example.test', `/home/${home.id}/condivisioni/${shareId}`);
    expect(await screen.findByText(/Paolo Neri/)).toBeInTheDocument();
    await app.user.click(screen.getByRole('checkbox', { name: /Ho confrontato il codice/ }));
    // Non è la persona attesa: nuovo codice, il claim di Paolo decade.
    await app.user.click(screen.getByRole('button', { name: 'Non è la persona giusta: nuovo codice' }));
    await app.user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Genera il codice' }));
    await screen.findByText('In attesa del codice');
    await claimAs('luca@example.test', backend.sharing.issuedCodes.at(-1)!);
    await switchTo(app, 'giulia@example.test', `/home/${home.id}/condivisioni/${shareId}`);
    expect(await screen.findByText(/Luca Bassi/)).toBeInTheDocument();
    expect(screen.queryByText(/Paolo Neri/)).toBeNull();
    expect(screen.getByRole('checkbox', { name: /Ho confrontato il codice/ })).not.toBeChecked();
    // Paolo non vede più nulla della consegna.
    await switchTo(app, 'paolo@example.test', `/consegne/${shareId}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Consegna non disponibile' })).toBeInTheDocument();
  });

  it('codice errato o troppi tentativi: messaggi generici, nessuna ripetizione automatica', async () => {
    const { backend } = await world();
    const app = await open(backend, 'luca@example.test', '/consegne/codice');
    await app.user.type(await screen.findByLabelText('Codice'), 'ABC');
    await app.user.click(screen.getByRole('checkbox', { name: /vedrà il nome/ }));
    await app.user.click(screen.getByRole('button', { name: 'Invia il codice' }));
    expect(screen.getByText(/Il codice ha 10 caratteri/)).toBeInTheDocument();
    expect(posts(backend, /code-claims$/)).toHaveLength(0);
    await app.user.clear(screen.getByLabelText('Codice'));
    await app.user.type(screen.getByLabelText('Codice'), 'ZZZZZ ZZZZZ');
    await app.user.click(screen.getByRole('button', { name: 'Invia il codice' }));
    expect(await screen.findByText(/non sono validi per il tuo account/)).toBeInTheDocument();
    for (let i = 0; i < 10; i++) {
      await app.user.click(screen.getByRole('button', { name: 'Invia il codice' }));
      await waitFor(() => expect(posts(backend, /code-claims$/)).toHaveLength(2 + i));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Invia il codice' })).toBeEnabled());
    }
    expect(await screen.findByText(/Troppi tentativi in poco tempo/)).toBeInTheDocument();
    expect(posts(backend, /code-claims$/)).toHaveLength(11); // ogni invio è un clic esplicito
  });
});

describe('[mock] C1a — stati finali, privacy e contesti', () => {
  it('membro: rifiuto distinto da revoca; revoca con testo su copie e accessi M2; destinatario senza dati residui', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    await app.user.click(await prepare(app, home.id, { docs: ['Manuale caldaia'], to: /Marco Leone/ }));
    await screen.findByText('Invito da accettare');
    await app.user.click(await prepare(app, home.id, { docs: ['Libretto impianto'], to: /Marco Leone/ }));
    await screen.findByText('Invito da accettare');
    const [first, second] = [...backend.sharing.shares.keys()];
    await switchTo(app, 'marco@example.test', `/consegne/${first}`);
    await app.user.click(await screen.findByRole('button', { name: 'Rifiuta' }));
    await app.user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rifiuta' }));
    expect(await screen.findByText(/Hai rifiutato questo invito/)).toBeInTheDocument();
    await app.router.navigate(`/consegne/${second}`);
    await app.user.click(await screen.findByRole('button', { name: 'Accetta' }));
    await screen.findByRole('button', { name: 'Scarica Libretto impianto' });

    await switchTo(app, 'giulia@example.test', `/home/${home.id}/condivisioni`);
    expect(await screen.findByText('Rifiutata')).toBeInTheDocument();
    expect(screen.getByText('Accettata')).toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/condivisioni/${second}`);
    await app.user.click(await screen.findByRole('button', { name: 'Revoca' }));
    const dialog = await screen.findByRole('dialog', { name: 'Revocare la condivisione?' });
    expect(dialog).toHaveTextContent(/copie già scaricate non si possono ritirare/);
    expect(dialog).toHaveTextContent(/chi è membro continua a vederlo in Documenti/);
    await app.user.click(within(dialog).getByRole('button', { name: 'Revoca' }));
    expect(await screen.findByText('Revocata')).toBeInTheDocument();

    await switchTo(app, 'marco@example.test', `/consegne/${second}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Non più disponibile' })).toBeInTheDocument();
    expect(screen.queryByText(/Libretto impianto/)).toBeNull();
  });

  it('scadenza calcolata alla lettura e fonte non più disponibile: niente consegna vuota «riuscita»', async () => {
    const { backend, home, manuale } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    await app.user.click(await prepare(app, home.id, { docs: ['Manuale caldaia'], to: /Marco Leone/, days: /^1 giorno/ }));
    await screen.findByText('Invito da accettare');
    await app.user.click(await prepare(app, home.id, { docs: ['Libretto impianto'], to: /Marco Leone/ }));
    await screen.findByText('Invito da accettare');
    const [first, second] = [...backend.sharing.shares.keys()];
    backend.sharing.offsetMs = 2 * 86_400_000;
    await app.router.navigate(`/home/${home.id}/condivisioni/${first}`);
    expect(await screen.findByText(/^Scaduta il/)).toBeInTheDocument();
    backend.documents.delete(manuale.id);
    backend.sharing.offsetMs = 0;
    void second;
    await app.router.navigate(`/home/${home.id}/condivisioni`);
    await screen.findByRole('heading', { level: 1, name: 'Condivisioni' });
    await app.router.navigate(`/home/${home.id}/condivisioni/${first}`);
    expect(await screen.findByText(/Non più disponibile: i tuoi diritti/)).toBeInTheDocument();
    expect(screen.queryByText(/Manuale caldaia/)).toBeNull();
    await switchTo(app, 'marco@example.test', `/consegne/${first}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Non più disponibile' })).toBeInTheDocument();
    expect(screen.queryByText(/Manuale caldaia|Giulia/)).toBeNull();
  });

  it('due case: le condivisioni restano nella loro casa; nessun dato economico nei payload', async () => {
    const { backend, home, lake } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    await app.user.click(await prepare(app, home.id, { docs: ['Manuale caldaia'], to: /Marco Leone/ }));
    await screen.findByText('Invito da accettare');
    await app.router.navigate(`/home/${lake.id}/condivisioni`);
    expect(await screen.findByText('Nessuna condivisione preparata.')).toBeInTheDocument();
    await app.router.navigate(`/home/${lake.id}/condivisioni/nuova`);
    expect(await screen.findByRole('checkbox', { name: /Planimetria lago/ })).toBeInTheDocument();
    expect(screen.queryByText(/Manuale caldaia/)).toBeNull();
    const sharingCalls = backend.log.filter((r) => /share|sharing|received/.test(r.path));
    expect(JSON.stringify(sharingCalls.map((r) => r.body))).not.toMatch(/amount|expense|economy|activity|draft/i);
    expect(backend.log.some((r) => /economy|expenses|activities/.test(r.path) && r.method === 'POST')).toBe(false);
  });

  it('risposta tardiva della creazione dopo il logout: nessun codice né navigazione per l’account successivo', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    const create = await prepare(app, home.id, { docs: ['Manuale caldaia'], to: 'external' });
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const handle = backend.handle.bind(backend);
    backend.handle = async (req) => {
      const res = await handle(req);
      if (req.method === 'POST' && /\/shares$/.test(req.path)) await gate;
      return res;
    };
    await app.user.click(create);
    await waitFor(() => expect(posts(backend, /\/shares$/)).toHaveLength(1));
    await app.user.click(screen.getAllByRole('button', { name: /Esci/ })[0]!);
    await screen.findByRole('heading', { name: 'Accedi' });
    release();
    await login(app, 'luca@example.test');
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByText('Invito creato')).toBeNull();
    const code = backend.sharing.issuedCodes.at(-1)!;
    expect(document.body.textContent).not.toContain(code.slice(0, 5));
    expect(app.queryClient.getQueryCache().getAll().some((q) => q.queryKey[1] !== undefined && JSON.stringify(q.queryKey).includes('sharing'))).toBe(false);
  });

  it('errori di lettura reali: elenco in errore non diventa vuoto; servizio senza C1 dichiarato', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/condivisioni`);
    await screen.findByRole('heading', { level: 1, name: 'Condivisioni' });
    backend.outage = 503;
    await app.router.navigate('/consegne');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Nessuna consegna per questo account.')).toBeNull();
    backend.outage = null;
    backend.sharing.enabled = false;
    await app.router.navigate(`/home/${home.id}/condivisioni`);
    expect(await screen.findByText(/non è ancora attiva su questo servizio/)).toBeInTheDocument();
  });
});

describe('[mock] C1a — istruzioni prima del codice di abbinamento (HOME-CONS-010)', () => {
  it('l’aiuto compare prima di generare il codice (esterno e rigenerazione), non per la persona della casa; protocollo invariato', async () => {
    const { backend, home } = await world();
    const app = await open(backend, 'giulia@example.test', `/home/${home.id}/casa`);
    // Persona esterna: aiuto subito prima di «Crea l’invito», con la durata del servizio.
    const create = await prepare(app, home.id, { docs: ['Manuale caldaia'], to: 'external' });
    const help = screen.getByText('Prima di generare il codice').closest('[class]')!.parentElement!;
    expect(help).toHaveTextContent(/vale 15 minuti da quando premi «Crea l’invito»/);
    expect(help).toHaveTextContent(/non deve creare una casa/);
    expect(help.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(posts(backend, /\/shares$/)).toHaveLength(0); // l’aiuto non avvia nulla
    await app.user.click(create);
    await screen.findByRole('heading', { level: 1, name: 'Invito creato' });
    // Rigenerazione: stesso aiuto nel dialogo, prima della conferma.
    const shareId = [...backend.sharing.shares.keys()][0]!;
    await app.router.navigate(`/home/${home.id}/condivisioni/${shareId}`);
    await app.user.click(await screen.findByRole('button', { name: 'Genera un nuovo codice' }));
    const dialog = await screen.findByRole('dialog', { name: 'Generare un nuovo codice?' });
    await waitFor(() => expect(dialog).toHaveTextContent(/vale 15 minuti da quando premi «Genera il codice»/));
    expect(posts(backend, /rotate-code$/)).toHaveLength(0);
    await app.user.click(within(dialog).getByRole('button', { name: 'Annulla' }));
    expect(posts(backend, /rotate-code$/)).toHaveLength(0);
    // Persona della casa: nessun codice, quindi nessun aiuto sul codice.
    await prepare(app, home.id, { docs: ['Manuale caldaia'], to: /Marco Leone/ });
    expect(screen.queryByText('Prima di generare il codice')).toBeNull();
  });
});
