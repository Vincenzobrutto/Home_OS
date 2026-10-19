import {queryKeys} from '../api/queryKeys';
// H1 activities-v1 con backend SIMULATO e orologio controllato dal test (fake.today):
// nessun confronto con Date.now, nessuna prova di API/DB reali.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { FakeBackend } from '../test/fakeBackend';
import { renderApp } from '../test/harness';
import type { renderApp as RenderApp } from '../test/harness';

type App = ReturnType<typeof RenderApp>;
const PW = { owner: 'password-owner-001', member: 'password-member-01', viewer: 'password-viewer-01' };

function world(today = '2026-10-13') {
  const backend = new FakeBackend();
  backend.activities.today = today;
  const owner = backend.seedAccount('Olga Owner', 'owner@example.test', PW.owner);
  const member = backend.seedAccount('Mario Member', 'member@example.test', PW.member);
  const viewer = backend.seedAccount('Vera Viewer', 'viewer@example.test', PW.viewer);
  const home = backend.seedHome(owner.id, 'Casa Roma', 'Via Roma 1');
  const second = backend.seedHome(owner.id, 'Casa Lago', 'Via Lago 2');
  backend.addMember(member.id, home.id, 'member');
  backend.addMember(viewer.id, home.id, 'viewer');
  const boiler = backend.review.seedBoiler(owner.id, home.id, 'Caldaia cucina');
  return { backend, owner, member, viewer, home, second, boiler };
}

async function open(backend: FakeBackend, email: string, password: string, path: string) {
  const app = renderApp({ path: '/accedi', backend });
  await screen.findByRole('heading', { name: 'Accedi' });
  await app.user.type(screen.getByLabelText('Email'), email);
  await app.user.type(screen.getByLabelText('Password'), password);
  await app.user.click(screen.getByRole('button', { name: 'Accedi' }));
  await waitFor(() => expect(app.router.state.location.pathname).toMatch(/^\/(case|home\/)/));
  await app.router.navigate(path);
  return app;
}

const posts = (backend: FakeBackend, re: RegExp) => backend.log.filter((r) => r.method === 'POST' && re.test(r.path));
const setDate = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Crea un'attività dal backend simulato, come se esistesse già. */
async function seedActivity(backend: FakeBackend, accountId: string, homeId: string, body: Record<string, unknown>) {
  const res = await backend.activities.handle(
    { method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body },
    accountId,
    homeId,
    'activities',
  );
  return (res.body as { activity: { id: string; version: number } }).activity;
}

async function createViaUi(app: App, homeId: string, title: string, opts: { date?: string } = {}) {
  await app.router.navigate(`/home/${homeId}/attivita?nuova-attivita=1`);
  const form = await screen.findByRole('form', { name: 'Nuova attività' });
  await app.user.type(within(form).getByLabelText('Titolo'), title);
  if (opts.date) setDate(/Data scelta da te/, opts.date);
  await app.user.click(within(form).getByRole('button', { name: 'Crea attività' }));
  await screen.findByRole('heading', { level: 1, name: title });
}

describe('[mock] H1 — Casa e creazione', () => {
  it('Casa senza attività: riepilogo compatto e creazione disponibile', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/casa`);
    const region = await screen.findByRole('region', { name: 'Le tue scadenze' });
    await waitFor(() => expect(region).toHaveTextContent('Nessuna attività aperta.'));
    expect(within(region).queryByRole('link',{name:'Scadute 0'})).not.toBeInTheDocument();
    expect(within(region).getByRole('link',{name:'Tutte le attività'})).toHaveAttribute('href',`/home/${home.id}/attivita`);
    expect(within(region).getByRole('link', { name: 'Nuova attività' })).toHaveAttribute('href', `/home/${home.id}/attivita?nuova-attivita=1`);
    await app.user.click(screen.getByText('Dettagli della casa e del tuo ruolo'));
    const permissions = screen.getByRole('region', { name: 'Permessi del tuo ruolo' });
    expect(permissions).not.toHaveTextContent('Avviare una vendita');
    expect(permissions).not.toHaveTextContent('Gestire le persone con accesso');
    expect(permissions).toHaveTextContent('Aggiungere e aggiornare i tuoi contenuti');
  });

  it('errore o endpoint assente: mai mostrato come zero; M3/M4 in Casa restano attivi', async () => {
    const { backend, home } = world();
    backend.activities.unavailable = true;
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/casa`);
    const region = await screen.findByRole('region', { name: 'Le tue scadenze' });
    await waitFor(() => expect(region).toHaveTextContent('non sono disponibili in questo momento'));
    expect(within(region).queryByText(/0 scadute/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('region',{name:'Esplora la casa'})).getByRole('link',{name:/Oggetti e impianti/})).toHaveAttribute('href',`/home/${home.id}/oggetti`);
    backend.activities.unavailable = false;
    backend.activities.enabled = false;
    await app.router.navigate(`/home/${home.id}/attivita`);
    const daFare = await screen.findByRole('region', { name: 'Le tue attività' });
    await waitFor(() => expect(daFare).toHaveTextContent('Le attività personali non sono ancora attive su questo servizio.'));
    await app.user.click(screen.getByRole('button', {name:'Analisi e verifiche'}));
    expect(screen.getByRole('region', { name: 'Da rivedere' })).toBeInTheDocument();
  });

  it('crea senza data: «Nuova attività» distinta da «Nuova analisi», destinazione visibile, body minimo, storia', async () => {
    const { backend, owner, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita`);
    expect(await screen.findByRole('button', { name: 'Nuova attività' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuova analisi' })).not.toBeInTheDocument();
    await app.user.click(screen.getByRole('button', { name: 'Nuova attività' }));
    const form = await screen.findByRole('form', { name: 'Nuova attività' });
    expect(form).toHaveTextContent('Destinazione: promemoria personale in Casa Roma, senza caldaia collegata.');
    expect(form).not.toHaveTextContent(/categoria|normativ|certificat/i);
    await app.user.click(within(form).getByRole('button', { name: 'Crea attività' }));
    expect(within(form).getByLabelText('Titolo')).toHaveAccessibleDescription('Scrivi un titolo.');
    expect(posts(backend, /\/activities$/)).toHaveLength(0);
    await app.user.type(within(form).getByLabelText('Titolo'), '  Cambiare filtro acqua  ');
    await app.user.click(within(form).getByRole('button', { name: 'Crea attività' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Cambiare filtro acqua' })).toBeInTheDocument();
    const [req] = posts(backend, /\/activities$/);
    expect(req!.body).toEqual({ title: 'Cambiare filtro acqua' });
    expect(req!.headers['x-account-context']).toBe(owner.id);
    expect(req!.headers['idempotency-key']).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
    expect(screen.getByText('Nessuna data scelta', { selector: 'dd' })).toBeInTheDocument();
    const storia = screen.getByRole('region', { name: 'Storia dell’attività' });
    await waitFor(() => expect(storia).toHaveTextContent('Creata'));
  });

  it('data bisestile scelta dall’utente: inviata come YYYY-MM-DD e mostrata senza spostamenti', async () => {
    const { backend, home } = world('2028-02-27');
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita`);
    await createViaUi(app, home.id, 'Controllo bisestile', { date: '2028-02-29' });
    expect(posts(backend, /\/activities$/)[0]!.body).toEqual({ title: 'Controllo bisestile', dueDate: '2028-02-29' });
    expect(screen.getByText(/Data scelta da te: .*29 febbraio 2028/)).toBeInTheDocument();
    expect(screen.getAllByText('In programma').length).toBeGreaterThan(0);
  });

  it('promemoria da una caldaia provvisoria: precompilato e collegato, la scheda non cambia', async () => {
    const { backend, home, boiler } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/impianti/${boiler.id}`);
    await app.user.click(await screen.findByRole('link', { name: 'Crea promemoria per questa caldaia' }));
    const form = await screen.findByRole('form', { name: 'Nuova attività' });
    await waitFor(() => expect(form).toHaveTextContent('collegato a «Caldaia cucina»'));
    await app.user.type(within(form).getByLabelText('Titolo'), 'Chiamare il tecnico');
    await app.user.click(within(form).getByRole('button', { name: 'Crea attività' }));
    await screen.findByRole('heading', { level: 1, name: 'Chiamare il tecnico' });
    expect(posts(backend, /\/activities$/)[0]!.body).toEqual({ title: 'Chiamare il tecnico', assetId: boiler.id });
    expect(screen.getByRole('link', { name: 'Caldaia cucina' })).toHaveAttribute('href', `/home/${home.id}/impianti/${boiler.id}`);
    expect(boiler.version).toBe(1);
    expect(boiler.proposals).toHaveLength(0);
    expect(posts(backend, /analysis-jobs|confirmations/)).toHaveLength(0);
  });

  it('caldaia nell’URL non propria: nessun collegamento implicito', async () => {
    const { backend, home } = world();
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?nuova-attivita=1&assetId=${crypto.randomUUID()}`);
    const form = await screen.findByRole('form', { name: 'Nuova attività' });
    await waitFor(() => expect(form).toHaveTextContent('La caldaia indicata non è tra le tue schede'));
    expect(form).toHaveTextContent('senza caldaia collegata');
  });
});

describe('[mock] H1 — invii, esiti ambigui e conflitti', () => {
  it('doppio clic: un solo invio; risposta persa: «Riprova invio» con stessa chiave e payload, una sola attività', async () => {
    const { backend, home } = world();
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?nuova-attivita=1`);
    const form = await screen.findByRole('form', { name: 'Nuova attività' });
    await app.user.type(within(form).getByLabelText('Titolo'), 'Pulire griglie');
    app.control.dropNextResponse();
    await app.user.dblClick(within(form).getByRole('button', { name: 'Crea attività' }));
    expect(await within(form).findByText('Esito non confermato')).toBeInTheDocument();
    expect(posts(backend, /\/activities$/)).toHaveLength(1);
    expect(within(form).getByLabelText('Titolo')).toBeDisabled();
    expect(within(form).getByRole('button', { name: 'Annulla' })).toBeDisabled();
    expect(within(form).queryByRole('button', { name: 'Crea attività' })).not.toBeInTheDocument();
    await app.user.click(within(form).getByRole('button', { name: 'Riprova invio' }));
    await screen.findByRole('heading', { level: 1, name: 'Pulire griglie' });
    const [a, b] = posts(backend, /\/activities$/);
    expect(b!.headers['idempotency-key']).toBe(a!.headers['idempotency-key']);
    expect(b!.body).toEqual(a!.body);
    expect(backend.activities.items.size).toBe(1);
    expect([...backend.activities.history.values()][0]).toHaveLength(1);
  });

  it('dialogo: Tab resta dentro, Escape non perde un invio incerto e la riprova non duplica la storia', async () => {
    const { backend, owner, home } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Annullamento protetto' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Annullamento protetto' });
    await app.user.click(screen.getByRole('button', { name: 'Annulla attività' }));
    const dialog = screen.getByRole('dialog');
    const note = within(dialog).getByLabelText('Nota (facoltativa)');
    await app.user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(within(dialog).getByRole('button', { name: 'Torna indietro' })).toHaveFocus();
    await app.user.keyboard('{Tab}'); expect(note).toHaveFocus();
    await app.user.type(note, 'Riprova protetta');
    app.control.dropNextResponse();
    await app.user.click(within(dialog).getByRole('button', { name: 'Annulla attività' }));
    await within(dialog).findByText('Esito non confermato');
    expect(within(dialog).getByRole('button', { name: 'Torna indietro' })).toBeDisabled();
    await app.user.keyboard('{Escape}'); expect(screen.getByRole('dialog')).toBeInTheDocument();
    await app.user.click(within(dialog).getByRole('button', { name: 'Riprova invio' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const attempts = posts(backend, /\/activities\/[^/]+\/cancel$/);
    expect(attempts).toHaveLength(2); expect(attempts[1]!.headers['idempotency-key']).toBe(attempts[0]!.headers['idempotency-key']);
    expect(backend.activities.history.get(act.id)).toHaveLength(2);
  });

  it('409 di versione (altra scheda): messaggio, nessun successo finto, «Rileggi i dati»', async () => {
    const { backend, owner, home } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Revisione' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Revisione' });
    // Un'altra scheda modifica l'attività.
    await backend.activities.handle(
      { method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { expectedVersion: 1, title: 'Revisione annuale' } },
      owner.id,
      home.id,
      `activities/${act.id}/updates`,
    );
    await app.user.click(screen.getByRole('button', { name: 'Completa' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));
    expect(await screen.findByText(/modificata nel frattempo/)).toBeInTheDocument();
    expect(backend.activities.items.get(act.id)!.state).toBe('open');
    await app.user.click(screen.getByRole('button', { name: 'Rileggi i dati' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Revisione annuale' })).toBeInTheDocument();
    expect(screen.getAllByText('Aperta').length).toBeGreaterThan(0);
  });

  it('503 durante una mutazione: nessun completamento apparente, riprova esplicita', async () => {
    const { backend, owner, home } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Spurgo radiatori' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Spurgo radiatori' });
    await app.user.click(screen.getByRole('button', { name: 'Completa' }));
    backend.activities.unavailable = true;
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.getAllByText('Aperta').length).toBeGreaterThan(0);
    expect(screen.queryByText('Completata da te', { selector: 'dt' })).not.toBeInTheDocument();
    backend.activities.unavailable = false;
    await app.user.click(screen.getByRole('button', { name: 'Riprova invio' }));
    await waitFor(() => expect(screen.getAllByText('Completata da te').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByRole('status', { name: 'Stato dell’attività' })).toHaveFocus());
  });
});

describe('[mock] H1 — stati, date e riepilogo', () => {
  it('ieri/oggi/+7/+8/senza data: conteggi completi, collegamenti filtrati e ordine', async () => {
    const { backend, owner, home } = world('2026-10-13');
    for (const [title, dueDate] of [
      ['Più otto', '2026-10-21'],
      ['Ieri', '2026-10-12'],
      ['Senza data', null],
      ['Più sette', '2026-10-20'],
      ['Oggi', '2026-10-13'],
    ] as const) {
      await seedActivity(backend, owner.id, home.id, { title, ...(dueDate ? { dueDate } : {}) });
    }
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/casa`);
    const region = await screen.findByRole('region', { name: 'Le tue scadenze' });
    await screen.findByRole('link',{name:'In programma 2'});
    expect(within(region).getByRole('link',{name:'Scadute 1'})).toBeInTheDocument();expect(within(region).getByRole('link',{name:'Oggi 1'})).toBeInTheDocument();expect(within(region).getByRole('link',{name:'Senza data: 1'})).toBeInTheDocument();
    await app.user.click(within(region).getByRole('link',{name:'In programma 2'}));
    const upcoming=await screen.findByRole('list',{name:'Elenco delle attività'});expect(within(upcoming).getAllByRole('link').map(l=>l.textContent)).toEqual(['Più sette','Più otto']);expect(screen.getByRole('button',{name:/In programma 2/})).toHaveAttribute('aria-pressed','true');
    await app.router.navigate(`/home/${home.id}/casa`);await app.user.click(await screen.findByRole('link',{name:'Scadute 1'}));const overdue=await screen.findByRole('list',{name:'Elenco delle attività'});expect(within(overdue).getAllByRole('link').map(l=>l.textContent)).toEqual(['Ieri']);
    await app.router.navigate(`/home/${home.id}/casa`);await app.user.click(await screen.findByRole('link',{name:'Oggi 1'}));const today=await screen.findByRole('list',{name:'Elenco delle attività'});expect(within(today).getAllByRole('link').map(l=>l.textContent)).toEqual(['Oggi']);
    await app.router.navigate(`/home/${home.id}/attivita`);
    await screen.findByRole('list', { name: 'Elenco delle attività' });
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Elenco delle attività' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Ieri', 'Oggi', 'Più sette', 'Più otto', 'Senza data']));
    expect(within(screen.getByRole('list', { name: 'Elenco delle attività' })).getAllByRole('listitem')[0]).toHaveTextContent('Scaduta');
  });

  it('filtri: «Scadute», «Completate» vuote diverse da nessuna attività', async () => {
    const { backend, owner, home } = world('2026-10-13');
    await seedActivity(backend, owner.id, home.id, { title: 'Ieri', dueDate: '2026-10-12' });
    await seedActivity(backend, owner.id, home.id, { title: 'Domani', dueDate: '2026-10-14' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita`);
    await screen.findByRole('list', { name: 'Elenco delle attività' });
    await app.user.click(screen.getByRole('button',{name:/Scadute/}));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Elenco delle attività' })).getAllByRole('listitem')).toHaveLength(1));
    expect(screen.getByRole('list', { name: 'Elenco delle attività' })).toHaveTextContent('Ieri');
    await app.user.selectOptions(screen.getByLabelText('Stato'), 'completed');
    expect(await screen.findByText('Nessuna attività completata.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Scadenza')).not.toBeInTheDocument();
    const q = backend.log.filter((r) => r.path.includes('/activities?')).at(-1)!.path;
    expect(q).toContain('state=completed&due=all');
  });

  it('ritorno dal dettaglio conserva filtro, posizione e pagine dopo la perdita della cache', async () => {
    const {backend,owner,home}=world();
    for(let i=0;i<22;i++) await seedActivity(backend,owner.id,home.id,{title:`Promemoria ${i}`,dueDate:'2026-10-12'});
    const app=await open(backend,'owner@example.test',PW.owner,`/home/${home.id}/attivita?state=open&due=overdue`);
    await app.user.click(await screen.findByRole('button',{name:'Mostra altre attività'}));
    await waitFor(()=>expect(within(screen.getByRole('list',{name:'Elenco delle attività'})).getAllByRole('link')).toHaveLength(22));
    const links=within(screen.getByRole('list',{name:'Elenco delle attività'})).getAllByRole('link');
    const title=links[21]!.textContent!;
    const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
    try {
      await app.user.click(links[21]!);
      await screen.findByRole('heading',{name:title});
      expect(app.router.state.location.state.activityList.pages).toBe(2);
      expect(screen.getByRole('link',{name:'← Attività'})).toHaveAttribute('href', '/home/'+home.id+'/attivita?state=open&due=overdue');
      app.queryClient.removeQueries({queryKey:queryKeys.activities(owner.id,home.id,{state:'open',due:'overdue'})});
      await app.user.click(screen.getByRole('link',{name:'← Attività'}));
      await waitFor(()=>expect(app.router.state.location.search).toBe('?state=open&due=overdue'));
      expect(app.router.state.location.state.activityRestore.pages).toBe(2);
      const returned=await screen.findByRole('link',{name:title});
      await waitFor(()=>expect(returned).toHaveFocus());
      expect(scroll).toHaveBeenCalledWith(0,0);
    } finally {scroll.mockRestore();}
  });

  it('completa con nota, poi riapri: data passata torna scaduta, storia conservata, Casa aggiornata', async () => {
    const { backend, owner, home } = world('2026-10-13');
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Cambio filtro', dueDate: '2026-10-10' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Cambio filtro' });
    await app.user.click(screen.getByRole('button', { name: 'Completa' }));
    await app.user.type(screen.getByLabelText('Nota (facoltativa)'), 'Fatto con il kit nuovo');
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));
    await waitFor(() => expect(screen.getAllByText('Completata da te').length).toBeGreaterThan(0));
    expect(posts(backend, /\/complete$/)[0]!.body).toEqual({ expectedVersion: 1, note: 'Fatto con il kit nuovo' });
    const storia = screen.getByRole('region', { name: 'Storia dell’attività' });
    await waitFor(() => expect(storia).toHaveTextContent('Nota: Fatto con il kit nuovo'));
    expect(storia).toHaveTextContent('Stato: Aperta → Completata da te');
    await app.user.click(screen.getByRole('button', { name: 'Riapri attività' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma riapertura' }));
    await waitFor(() => expect(screen.getAllByText('Scaduta').length).toBeGreaterThan(0));
    expect(backend.activities.items.get(act.id)!.dueDate).toBe('2026-10-10');
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Storia dell’attività' })).getAllByRole('listitem')).toHaveLength(3));
    await app.router.navigate(`/home/${home.id}/casa`);
    const region = await screen.findByRole('region', { name: 'Le tue scadenze' });
    await waitFor(() => expect(within(region).getByRole('link',{name:'Scadute 1'})).toBeInTheDocument());
  });

  it('annulla in dialogo: Escape chiude e restituisce il focus; conferma annulla senza eliminare', async () => {
    const { backend, owner, home } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Verifica pressione' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Verifica pressione' });
    const opener = screen.getByRole('button', { name: 'Annulla attività' });
    await app.user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Annulla attività' });
    expect(dialog).toHaveTextContent('non viene eliminata');
    expect(within(dialog).getByLabelText('Nota (facoltativa)')).toHaveFocus();
    await app.user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Annulla attività' })).toHaveFocus());
    await app.user.click(screen.getByRole('button', { name: 'Annulla attività' }));
    await app.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annulla attività' }));
    await waitFor(() => expect(screen.getAllByText('Annullata').length).toBeGreaterThan(0));
    expect(backend.activities.items.has(act.id)).toBe(true);
    expect(screen.getByRole('button', { name: 'Riapri attività' })).toBeInTheDocument();
  });

  it('al ritorno sulla finestra lo stato temporale si rilegge dal server (nuovo giorno)', async () => {
    const { backend, owner, home } = world('2026-10-13');
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Domani', dueDate: '2026-10-14' });
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Domani' });
    expect(screen.getAllByText('In programma').length).toBeGreaterThan(0);
    backend.activities.today = '2026-10-15';
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() => expect(screen.getAllByText('Scaduta').length).toBeGreaterThan(0));
    focusManager.setFocused(undefined);
  });
});

describe('[mock] H1 — modifica e collegamenti', () => {
  it('modifica del solo titolo: assetId omesso; rimozione esplicita del collegamento: assetId null', async () => {
    const { backend, owner, home, boiler } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Controllo', assetId: boiler.id });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Controllo' });
    await app.user.click(screen.getByRole('button', { name: 'Modifica' }));
    let form = screen.getByRole('form', { name: 'Modifica attività' });
    await app.user.clear(within(form).getByLabelText('Titolo'));
    await app.user.type(within(form).getByLabelText('Titolo'), 'Controllo annuale');
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    await screen.findByRole('heading', { level: 1, name: 'Controllo annuale' });
    expect(posts(backend, /\/updates$/)[0]!.body).toEqual({ expectedVersion: 1, title: 'Controllo annuale' });
    await app.user.click(screen.getByRole('button', { name: 'Modifica' }));
    form = screen.getByRole('form', { name: 'Modifica attività' });
    await app.user.selectOptions(within(form).getByLabelText(/Caldaia collegata/), 'Rimuovi il collegamento');
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(screen.queryByText('Caldaia', { selector: 'dt' })).not.toBeInTheDocument());
    expect(posts(backend, /\/updates$/)[1]!.body).toEqual({ expectedVersion: 2, assetId: null });
  });

  it('collegamento non più leggibile: nessun nome o ID, attività modificabile senza scollegarla in silenzio', async () => {
    const { backend, owner, home, boiler } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Promemoria caldaia', assetId: boiler.id });
    backend.activities.unreadableAssets.add(boiler.id);
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Promemoria caldaia' });
    expect(screen.getByText('Caldaia collegata non più disponibile per il tuo account')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Caldaia cucina');
    expect(document.body.innerHTML).not.toContain(boiler.id);
    await app.user.click(screen.getByRole('button', { name: 'Modifica' }));
    const form = screen.getByRole('form', { name: 'Modifica attività' });
    expect(within(form).getByLabelText(/Caldaia collegata/)).toHaveDisplayValue('Mantieni il collegamento attuale (non più disponibile)');
    setDate(/Data scelta da te/, '2026-11-01');
    await app.user.click(within(form).getByRole('button', { name: 'Salva modifiche' }));
    await waitFor(() => expect(posts(backend, /\/updates$/)).toHaveLength(1));
    expect(posts(backend, /\/updates$/)[0]!.body).toEqual({ expectedVersion: 1, dueDate: '2026-11-01' });
    expect(backend.activities.items.get(act.id)!.assetId).toBe(boiler.id);
  });

  it('titoli e note con HTML restano testo', async () => {
    const { backend, owner, home } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: '<img src=x onerror=alert(1)>Titolo', description: '<b>grassetto</b>' });
    await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    const h1 = await screen.findByRole('heading', { level: 1, name: '<img src=x onerror=alert(1)>Titolo' });
    expect(h1.querySelector('img')).toBeNull();
    expect(screen.getByText('<b>grassetto</b>')).toBeInTheDocument();
    expect(document.querySelector('main b')).toBeNull();
  });
});

describe('[mock] H1 — privacy, ruoli e contesto', () => {
  it('attività di un altro account: 403 senza contenuti; owner non vede le attività del member', async () => {
    const { backend, member, home } = world();
    const theirs = await seedActivity(backend, member.id, home.id, { title: 'Privata di Mario' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita`);
    await waitFor(() => expect(screen.getByRole('region', { name: 'Le tue attività' })).toHaveTextContent('Nessuna attività aperta'));
    await app.router.navigate(`/home/${home.id}/attivita/${theirs.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Attività non disponibile' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Privata di Mario');
    await app.router.navigate(`/home/${home.id}/attivita/non-un-uuid`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Indirizzo non valido' })).toBeInTheDocument();
  });

  it('viewer: consulta le proprie attività, nessuna creazione né azione', async () => {
    const { backend, owner, viewer, home } = world();
    // Il viewer non può scrivere: l'attività esiste da quando aveva diritti di modifica.
    const mine = await seedActivity(backend, owner.id, home.id, { title: 'Del viewer' });
    backend.activities.items.get(mine.id)!.accountId = viewer.id;
    const app = await open(backend, 'viewer@example.test', PW.viewer, `/home/${home.id}/attivita`);
    const daFare = await screen.findByRole('region', { name: 'Le tue attività' });
    await waitFor(() => expect(daFare).toHaveTextContent('Del viewer'));
    expect(screen.queryByRole('button', { name: 'Nuova attività' })).not.toBeInTheDocument();
    await app.router.navigate(`/home/${home.id}/attivita/${mine.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Del viewer' });
    expect(screen.queryByRole('button', { name: /Completa|Modifica|Annulla attività/ })).not.toBeInTheDocument();
    expect(screen.getByText(/puoi consultare questa attività/)).toBeInTheDocument();
  });

  it('cursore e «Mostra altre»: 25 attività senza duplicati', async () => {
    const { backend, owner, home } = world();
    for (let i = 1; i <= 25; i++) await seedActivity(backend, owner.id, home.id, { title: `Attività ${String(i).padStart(2, '0')}` });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita`);
    const list = await screen.findByRole('list', { name: 'Elenco delle attività' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    await app.user.click(screen.getByRole('button', { name: 'Mostra altre attività' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(25));
    const titles = within(list).getAllByRole('link').map((l) => l.textContent);
    expect(new Set(titles).size).toBe(25);
  });

  it('cambio casa: la bozza non segue; cambio account: cache H1 rimossa', async () => {
    const { backend, owner, home, second } = world();
    await seedActivity(backend, owner.id, home.id, { title: 'Solo Roma' });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita?nuova-attivita=1`);
    const form = await screen.findByRole('form', { name: 'Nuova attività' });
    await app.user.type(within(form).getByLabelText('Titolo'), 'Bozza di Roma');
    await app.router.navigate(`/home/${second.id}/attivita?nuova-attivita=1`);
    await waitFor(() => expect(screen.getAllByRole('navigation', { name: 'Sezioni di Casa Lago' }).length).toBeGreaterThan(0));
    const form2 = await screen.findByRole('form', { name: 'Nuova attività' });
    expect(within(form2).getByLabelText('Titolo')).toHaveValue('');
    expect(form2).toHaveTextContent('in Casa Lago');
    await app.user.click(screen.getByRole('button', { name: /Esci/ }));
    await screen.findByRole('heading', { name: 'Accedi' });
    const keys = app.queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys.filter((k) => k.includes('h1'))).toEqual([]);
  });

  it('nessuna mutazione AI: completare un promemoria collegato non tocca caldaia, verifiche o analisi', async () => {
    const { backend, owner, home, boiler } = world();
    const act = await seedActivity(backend, owner.id, home.id, { title: 'Collegata', assetId: boiler.id });
    const app = await open(backend, 'owner@example.test', PW.owner, `/home/${home.id}/attivita/${act.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Collegata' });
    const before = JSON.stringify({ v: boiler.version, p: boiler.proposals, c: boiler.confirmed, h: boiler.history });
    await app.user.click(screen.getByRole('button', { name: 'Completa' }));
    await app.user.click(screen.getByRole('button', { name: 'Conferma completamento' }));
    await waitFor(() => expect(screen.getAllByText('Completata da te').length).toBeGreaterThan(0));
    expect(JSON.stringify({ v: boiler.version, p: boiler.proposals, c: boiler.confirmed, h: boiler.history })).toBe(before);
    expect(posts(backend, /analysis-jobs|confirmations|manual-confirmations/)).toHaveLength(0);
    expect(backend.review.jobs.size).toBe(0);
  });
});
