import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConfirmOutcome, ConfirmationPayload } from './model';
import { CONTEXT } from './testing/fixtures';
import { assistantProps, renderAssistant } from './testing/renderAssistant';

const toSummary = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Controlla il riepilogo/ }));
  return screen.findByRole('heading', { level: 1, name: /Solo quello che hai scelto/ });
};

describe('ricevuta assistita: shell', () => {
  it('paid outcome unknown blocks a second analysis while keeping manual available; same-key recovery is explicit', async () => {
    const user = userEvent.setup(), props = assistantProps('fresh', { draft: null, job: { status: 'uncertain', message: 'Invio non verificabile' } });
    const view = renderAssistant(props);
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Avvia l’analisi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Compila a mano' })).toBeEnabled();
    view.rerenderWith({ ...props, job: { status: 'uncertain', message: 'Recupera la stessa richiesta', retryStart: true } });
    expect(screen.getByRole('button', { name: 'Recupera l’avvio' })).toBeEnabled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(props.onStartAnalysis).not.toHaveBeenCalled();
  });
  it('primo acquisto: crea oggetto e spesa, conferma con payload UI senza dati di contesto', async () => {
    const user = userEvent.setup();
    const props = assistantProps('fresh', { onConfirm: vi.fn(async (): Promise<ConfirmOutcome> => ({ status: 'confirmed', result: { newObjects: 1, newExpenses: 1, object: { id: 'o', name: 'Macchina del caffè' }, expense: null, openComparisons: 0 } })) });
    renderAssistant(props);
    await toSummary(user);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('1 nuovo oggetto · 1 nuova spesa');
    await user.click(screen.getByRole('button', { name: 'Conferma' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Tutto al suo posto.' })).toBeInTheDocument();
    const payload = vi.mocked(props.onConfirm).mock.calls[0]![0] as ConfirmationPayload;
    expect(payload.object.action).toBe('create');
    expect(JSON.stringify(payload)).not.toMatch(/acc-demo|home-demo|excerpt/);
    expect(props.onReview).toHaveBeenCalledTimes(1);
  });

  it('esito di rete incerto: nessun reinvio automatico, doppio clic bloccato, recupero esplicito', async () => {
    const user = userEvent.setup();
    let resolve!: (o: ConfirmOutcome) => void;
    const onConfirm = vi.fn<(payload: ConfirmationPayload) => Promise<ConfirmOutcome>>(() => new Promise(r => { resolve = r; }));
    const onRecoverOutcome = vi.fn(async () => ({ status: 'confirmed' as const, result: { newObjects: 0 as const, newExpenses: 0 as const, object: null, expense: null, openComparisons: 0 } }));
    renderAssistant(assistantProps('existing', { onConfirm, onRecoverOutcome }));
    await toSummary(user);
    const confirm = screen.getByRole('button', { name: 'Conferma' });
    await user.dblClick(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    resolve({ status: 'unknown' });
    expect(await screen.findByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Modifica le scelte/ })).toBeDisabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Verifica l’esito' }));
    expect(onRecoverOutcome).toHaveBeenCalledWith(onConfirm.mock.calls[0]![0]);
    expect(await screen.findByRole('heading', { level: 1, name: /Nessun doppione/ })).toBeInTheDocument();
  });

  it('403: ricevuta non disponibile senza alcun dato della bozza', () => {
    renderAssistant(assistantProps('existing', { load: { status: 'unavailable' } }));
    expect(screen.getByRole('heading', { name: 'Ricevuta non disponibile' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Macchina del caffè|Lume|179,90/);
  });

  it('cambio di contesto: le correzioni di un altro account non restano nel form', async () => {
    const user = userEvent.setup();
    const props = assistantProps('fresh');
    const view = renderAssistant(props);
    const name = screen.getByRole('textbox', { name: 'Nome dell’oggetto' });
    await user.clear(name); await user.type(name, 'Valore privato A');
    view.rerenderWith({ ...props, contextKey: { ...CONTEXT, accountId: 'acc-B' } });
    expect(screen.getByRole('textbox', { name: 'Nome dell’oggetto' })).toHaveValue('Macchina del caffè');
    expect(document.body).not.toHaveTextContent('Valore privato A');
  });

  it('originale apribile dal dialogo anche dopo un errore di lettura; errore di apertura mostrato', async () => {
    const user = userEvent.setup();
    const openOriginal = vi.fn(async () => { throw new Error('rete'); });
    renderAssistant(assistantProps('fresh', { draft: null, job: { status: 'failed', reason: 'read_failed', message: 'Il PDF non contiene testo leggibile.' }, openOriginal }));
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Vedi documento originale' }));
    const dialog = screen.getByRole('dialog', { name: 'Documento originale' });
    await user.click(within(dialog).getByRole('button', { name: 'Apri l’originale' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Non è stato possibile aprire/);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Compila a mano' })).toBeEnabled();
  });

  it('regressione browser: durante l’apertura il pulsante resta focalizzabile ed Esc chiude anche con il focus fuori dal dialogo', async () => {
    const user = userEvent.setup();
    const openOriginal = vi.fn(() => new Promise<void>(() => {}));
    renderAssistant(assistantProps('fresh', { openOriginal }));
    await user.click(screen.getAllByRole('button', { name: /^Vedi fonte/ })[0]!);
    const dialog = screen.getByRole('dialog', { name: 'Fonte · Nome dell’oggetto' });
    expect(within(dialog).getByText('Macchina del caffè Lume')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Apri l’originale' }));
    const opening = within(dialog).getByRole('button', { name: 'Apertura…' });
    expect(opening).toHaveAttribute('aria-disabled', 'true');
    expect(opening).not.toBeDisabled();
    await user.click(opening);
    expect(openOriginal).toHaveBeenCalledTimes(1);
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Nome dell’oggetto' })).toHaveValue('Macchina del caffè');
  });
});
