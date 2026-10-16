import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { initialFormState, type ConfirmOutcome, type ConfirmationPayload, type ReceiptDraft } from './model';
import { scenarios } from './testing/fixtures';
import { assistantProps, renderAssistant } from './testing/renderAssistant';

type User = ReturnType<typeof userEvent.setup>;
const next = (user: User) => user.click(screen.getByRole('button', { name: /Controlla il riepilogo/ }));
const summaryCounts = () => screen.getByText(/nuov[oi] oggett[oi] · \d nuov[ae] spes[ae]/);
const radio = (name: RegExp) => screen.getByRole('radio', { name });
const sent = (fn: unknown) => vi.mocked(fn as (p: ConfirmationPayload) => Promise<ConfirmOutcome>).mock.calls[0]![0];
const confirmed = (over: Partial<Extract<ConfirmOutcome, { status: 'confirmed' }>['result']> = {}) =>
  vi.fn(async (): Promise<ConfirmOutcome> => ({ status: 'confirmed', result: { newObjects: 0, newExpenses: 0, object: null, expense: null, openComparisons: 0, ...over } }));

describe('cinque scenari del mockup', () => {
  it('oggetto e spesa già collegati: riuso, solo campi vuoti completati, 0 nuovi', async () => {
    const user = userEvent.setup();
    const props = assistantProps('existing', { onConfirm: confirmed() });
    renderAssistant(props);
    expect(radio(/Macchina del caffè · Cucina/)).toBeChecked();
    expect(radio(/Mantieni la spesa già registrata/)).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Crea un nuovo oggetto/ })).not.toBeInTheDocument();
    await next(user);
    expect(summaryCounts()).toHaveTextContent('0 nuovi oggetti · 0 nuove spese');
    expect(screen.getByText(/nessun collegamento duplicato/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Conferma' }));
    expect(sent(props.onConfirm)).toMatchObject({ object: { action: 'reuse', targetId: 'obj-kitchen', fields: [{ field: 'brand', action: 'accept' }, { field: 'model', action: 'accept' }] }, expense: { action: 'reuse', targetId: 'exp-purchase' } });
  });

  it('primo acquisto: scelte indipendenti 0/1 e 1/0; i campi esclusi non bloccano', async () => {
    const user = userEvent.setup();
    renderAssistant(assistantProps('fresh'));
    await user.click(radio(/Non associare un oggetto adesso/));
    await next(user);
    expect(summaryCounts()).toHaveTextContent('0 nuovi oggetti · 1 nuova spesa');
    await user.click(screen.getByRole('button', { name: /Modifica le scelte/ }));
    await user.click(radio(/Crea un nuovo oggetto/));
    await user.click(radio(/Non registrare il costo adesso/));
    await next(user);
    expect(summaryCounts()).toHaveTextContent('1 nuovo oggetto · 0 nuove spese');
  });

  it('due oggetti compatibili: nessuna preselezione, errore comprensibile, scelta esplicita', async () => {
    const user = userEvent.setup();
    renderAssistant(assistantProps('ambiguous'));
    expect(screen.getByText('Serve una scelta')).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: /Macchina del caffè/ }).every(r => !(r as HTMLInputElement).checked)).toBe(true);
    await next(user);
    expect(screen.getByText(/Scegli l’oggetto corretto/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Abbiamo trovato/ })).toBeInTheDocument();
    await user.click(radio(/Macchina del caffè · Studio/));
    await next(user);
    expect(screen.getByRole('heading', { level: 3, name: 'Macchina del caffè · Studio' })).toBeInTheDocument();
    expect(screen.getByText('Verrà collegata la ricevuta a questa scheda.')).toBeInTheDocument();
  });

  it('valori diversi da quelli confermati: keep/defer obbligatori e indipendenti, nessuna sovrascrittura', async () => {
    const user = userEvent.setup();
    const props = assistantProps('conflict', { onConfirm: confirmed({ openComparisons: 1 }) });
    renderAssistant(props);
    expect(screen.getByText('Aurora')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Sostituisci|Usa il valore della ricevuta/ })).not.toBeInTheDocument();
    await next(user);
    expect(screen.getByText(/Per ogni differenza scegli/)).toBeInTheDocument();
    const brand = screen.getByRole('group', { name: 'Marca' }), model = screen.getByRole('group', { name: 'Modello' });
    await user.click(within(brand).getByRole('radio', { name: /Mantieni «Aurora»/ }));
    await user.click(within(model).getByRole('radio', { name: /Decidi più avanti/ }));
    await next(user);
    expect(screen.getByText('Valori confermati mantenuti: marca.')).toBeInTheDocument();
    expect(screen.getByText(/Confronto da rivedere più avanti: modello/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Conferma' }));
    expect(sent(props.onConfirm).object).toMatchObject({ fields: [{ field: 'brand', action: 'keep_existing' }, { field: 'model', action: 'defer' }] });
    expect(await screen.findByText(/1 confronto resta aperto/)).toBeInTheDocument();
  });

  it('documento non leggibile → compilazione manuale: campi vuoti, nessuna fonte, valori «Inserito da te»', async () => {
    const user = userEvent.setup();
    const props = assistantProps('manual', { onConfirm: confirmed({ newObjects: 1, newExpenses: 1 }) });
    renderAssistant(props);
    expect(screen.getByRole('heading', { level: 1, name: 'Inserisci quello che conosci.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Vedi fonte/ })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Nome dell’oggetto' }), 'Forno');
    expect(screen.getAllByText('Inserito da te').length).toBeGreaterThan(0);
    await user.type(screen.getByRole('textbox', { name: 'Descrizione' }), 'Acquisto forno');
    await user.type(screen.getByRole('textbox', { name: 'Importo in euro' }), '99,9');
    await user.type(screen.getByLabelText('Data di riferimento'), '2026-10-01');
    await next(user);
    await user.click(screen.getByRole('button', { name: 'Conferma' }));
    expect(sent(props.onConfirm)).toMatchObject({ object: { origins: { name: 'manual', brand: null } }, expense: { values: { amountCents: 9990 }, origins: { amount: 'manual' } } });
  });
});

describe('form, campi e validazione', () => {
  it('tornare dal riepilogo conserva le correzioni e l’origine «Modificato da te»', async () => {
    const user = userEvent.setup();
    renderAssistant(assistantProps('fresh'));
    const amount = screen.getByRole('textbox', { name: 'Importo in euro' });
    await user.clear(amount); await user.type(amount, '180,00');
    await next(user);
    expect(screen.getByRole('heading', { level: 3, name: /180,00/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Modifica le scelte/ }));
    expect(screen.getByRole('textbox', { name: 'Importo in euro' })).toHaveValue('180,00');
    expect(screen.getByText('Modificato da te')).toBeInTheDocument();
  });

  it('campi assenti nella ricevuta restano «Da completare» senza fonte; importo e date non validi bloccano', async () => {
    const user = userEvent.setup();
    const base = scenarios.fresh().draft;
    const draft: ReceiptDraft = { ...base, proposals: { name: base.proposals.name, title: base.proposals.title } };
    renderAssistant(assistantProps('fresh', { draft }));
    expect(screen.getByRole('textbox', { name: 'Marca' })).toHaveValue('');
    expect(screen.getAllByText('Da completare').length).toBeGreaterThanOrEqual(3);
    await user.type(screen.getByRole('textbox', { name: 'Importo in euro' }), '-5');
    await user.type(screen.getByLabelText('Data di riferimento'), '2026-10-17');
    await next(user);
    expect(screen.getByText(/Importo non valido/)).toBeInTheDocument();
    expect(screen.getByText('La data non può essere futura.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Abbiamo trovato/ })).toBeInTheDocument();
  });

  it('la data massima viene da today delle props', async () => {
    const user = userEvent.setup();
    const draft = { ...scenarios.fresh().draft, proposals: { ...scenarios.fresh().draft.proposals, documentDate: { value: '2026-12-01', sources: [] } } };
    renderAssistant(assistantProps('fresh', { draft, today: '2026-12-05' }));
    await next(user);
    expect(screen.getByRole('heading', { level: 1, name: /Solo quello che hai scelto/ })).toBeInTheDocument();
  });
});

describe('ruoli, errori e rete', () => {
  it('sola lettura: nessuna azione di scrittura, campi disattivati', () => {
    renderAssistant(assistantProps('fresh', { canEdit: false }));
    expect(screen.getByText(/puoi consultare le proposte, ma non salvarle/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome dell’oggetto' })).toBeDisabled();
    expect(screen.getAllByRole('radio').every(r => (r as HTMLInputElement).disabled)).toBe(true);
  });

  it('documento: nessuna chiamata all’apertura; consenso esplicito; analisi non attiva dichiarata', async () => {
    const user = userEvent.setup();
    const props = assistantProps('fresh', { draft: null });
    const view = renderAssistant(props);
    expect(props.onStartAnalysis).not.toHaveBeenCalled();
    const start = screen.getByRole('button', { name: 'Avvia l’analisi' });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Autorizzo l’invio/ }));
    await user.click(start);
    expect(props.onStartAnalysis).toHaveBeenCalledWith({ providerId: 'prov-test', consentToProviderTransfer: true });
    view.rerenderWith({ ...props, capabilities: { enabled: false, manualEnabled: true, providers: [] } });
    expect(screen.getByText(/non è attiva su questo servizio/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avvia l’analisi' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compila a mano' })).toBeEnabled();
  });

  it('errore del provider o esito incerto del job: nessuna seconda analisi automatica, manuale disponibile', () => {
    renderAssistant(assistantProps('fresh', { draft: null, job: { status: 'uncertain', message: 'La richiesta potrebbe essere partita.' } }));
    expect(screen.getByText(/Non viene avviata una seconda analisi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compila a mano' })).toBeEnabled();
  });

  it('conferma rifiutata: messaggio certo, form conservato e modificabile', async () => {
    const user = userEvent.setup();
    renderAssistant(assistantProps('fresh', { onConfirm: vi.fn(async (): Promise<ConfirmOutcome> => ({ status: 'rejected', code: 'conflict', message: 'La bozza è cambiata.' })) }));
    await next(user);
    await user.click(screen.getByRole('button', { name: 'Conferma' }));
    expect(await screen.findByText(/La bozza è cambiata\. Le tue scelte sono ancora qui/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Tutto al suo posto/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Modifica le scelte/ }));
    expect(screen.getByRole('textbox', { name: 'Nome dell’oggetto' })).toHaveValue('Macchina del caffè');
  });

  it('promessa rifiutata = esito non noto; conferma non trovata → reinvio solo esplicito con lo stesso payload', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn<(p: ConfirmationPayload) => Promise<ConfirmOutcome>>().mockRejectedValueOnce(new Error('rete')).mockResolvedValueOnce({ status: 'confirmed', result: { newObjects: 1, newExpenses: 1, object: null, expense: null, openComparisons: 0 } });
    renderAssistant(assistantProps('fresh', { onConfirm }));
    await next(user);
    await user.click(screen.getByRole('button', { name: 'Conferma' }));
    await user.click(await screen.findByRole('button', { name: 'Verifica l’esito' }));
    await user.click(await screen.findByRole('button', { name: 'Invia di nuovo la stessa conferma' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onConfirm.mock.calls[1]![0]).toEqual(onConfirm.mock.calls[0]![0]);
    expect(await screen.findByRole('heading', { level: 1, name: 'Tutto al suo posto.' })).toBeInTheDocument();
  });

  it('rinvio: «rimandata» solo con esito positivo; errore e promessa rifiutata detti onestamente', async () => {
    const user = userEvent.setup();
    const onPark = vi.fn<() => Promise<{ status: 'parked' } | { status: 'rejected'; message: string }>>()
      .mockResolvedValueOnce({ status: 'rejected', message: 'Bozza cambiata nel frattempo.' }).mockRejectedValueOnce(new Error('rete'));
    renderAssistant(assistantProps('fresh', { onPark }));
    await next(user);
    await user.click(screen.getByRole('button', { name: 'Rimanda' }));
    expect(await screen.findByText('Bozza cambiata nel frattempo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rimanda' }));
    expect(await screen.findByText(/Non sappiamo se la bozza è stata rimandata/)).toBeInTheDocument();
    expect(screen.queryByText(/Bozza rimandata:/)).not.toBeInTheDocument();
  });
  it('rimandare invia le scelte effettive del riepilogo, inclusi valori modificati a mano', async () => {
    const user = userEvent.setup(), onPark = vi.fn(async () => ({ status: 'parked' as const })), onReview = vi.fn();
    renderAssistant(assistantProps('fresh', { onPark, onReview }));
    const input = screen.getByRole('textbox', { name: 'Nome dell’oggetto' });
    await user.clear(input); await user.type(input, 'Caffe salvato'); await next(user);
    await user.click(screen.getByRole('button', { name: 'Rimanda' }));
    expect(await screen.findByText(/Bozza rimandata:/)).toBeInTheDocument();
    expect(onPark).toHaveBeenCalledWith(onReview.mock.calls[0]![0]);
    expect(onReview.mock.calls[0]![0].object.values.name).toBe('Caffe salvato');
    expect(screen.getByRole('button', { name: 'Conferma' })).toBeDisabled();
  });
  it('bozza in pausa: valori conservati e modifiche disabilitate fino a ripresa esplicita', async () => {
    const user = userEvent.setup(), s = scenarios.fresh(), form = initialFormState(s.draft);
    form.values.name = 'Oggetto ripreso'; form.values.amount = '215,00';
    const draft: ReceiptDraft = { ...s.draft, state: 'parked', review: { form, staleTargets: [], targetVersions: { object: null, expense: null } } };
    const onResumeDraft = vi.fn(async () => ({ status: 'resumed' as const })), props = assistantProps('fresh', { draft, onResumeDraft });
    const view = renderAssistant(props);
    expect(screen.getByRole('textbox', { name: 'Nome dell’oggetto' })).toHaveValue('Oggetto ripreso');
    expect(screen.getByRole('textbox', { name: 'Nome dell’oggetto' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Riprendi le scelte salvate' })); expect(onResumeDraft).toHaveBeenCalledTimes(1);
    view.rerenderWith({ ...props, draft: { ...draft, state: 'open', version: 3 } });
    expect(screen.getByRole('textbox', { name: 'Nome dell’oggetto' })).toBeEnabled();
    await next(user); expect(screen.getByText('215,00 €')).toBeInTheDocument();
  });

  it('confronti già rinviati mostrati dalle props e riapribili; altri candidati caricati su richiesta', async () => {
    const user = userEvent.setup();
    const s = scenarios.conflict();
    const draft: ReceiptDraft = { ...s.draft, openComparisons: [{ id: 'cmp-1', version: 1, objectId: 'obj-kitchen', objectName: 'Macchina del caffè', field: 'brand', existing: 'Aurora', proposed: s.draft.proposals.brand! }] };
    const props = assistantProps('conflict', { draft, onReopenComparison: vi.fn(), objectCandidates: { items: [], hasMore: true, status: 'idle' } });
    renderAssistant(props);
    await user.click(screen.getByRole('button', { name: 'Riapri il confronto' }));
    expect(props.onReopenComparison).toHaveBeenCalledWith(draft.openComparisons[0]);
    expect(screen.queryByRole('group', { name: 'Marca' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostra altri oggetti' }));
    expect(props.loadMoreCandidates).toHaveBeenCalledWith('object');
  });
});
