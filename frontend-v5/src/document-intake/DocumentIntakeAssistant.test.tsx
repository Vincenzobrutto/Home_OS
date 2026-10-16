import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentCollectionFilters, type CollectionFilter } from './DocumentCollectionFilters';
import type { ConfirmBatchOutcome, ConfirmBatchPayload, IntakeBatch, ItemConfirmResult, ReviewPayload, WriteOutcome } from './model';
import { CONTEXT, batchOf, corpus, diagramCandidates, mixedBatch } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

type User = ReturnType<typeof userEvent.setup>;
const toProposals = (user: User) => user.click(screen.getByRole('button', { name: 'Rivedi le proposte →' }));
const reviewButton = (filename: string) => screen.getByRole('button', { name: new RegExp(`(Rivedi|Modifica scelta) ${filename.replace('.', '\\.')}`) });
const dialog = () => screen.getByRole('dialog');
const saveIn = (user: User) => user.click(within(dialog()).getByRole('button', { name: 'Usa questa organizzazione' }));
const reviewCalls = (fn: unknown) => vi.mocked(fn as (p: ReviewPayload) => Promise<WriteOutcome>).mock.calls.map(c => c[0]);
/** Container finto: applica il salvataggio della decisione al lotto (come farebbe il server), nient'altro. */
function withSaving(initial: IntakeBatch) {
  let batch = initial;
  const props = intakeProps({ batch });
  const view = renderIntake(props);
  props.onSaveReview = vi.fn(async (p: ReviewPayload): Promise<WriteOutcome> => {
    batch = { ...batch, items: batch.items.map(i => i.id === p.itemId ? { ...i, version: Number(i.version) + 1, selection: p.selection, reviewState: p.selection.action === 'defer' ? 'deferred' : 'saved' } : i) };
    view.rerenderWith({ ...props, batch });
    return { status: 'confirmed' };
  });
  view.rerenderWith({ ...props });
  return { props, view, get batch() { return batch; } };
}

describe('casi del mockup approvato', () => {
  it('APE: organizzazione a livello casa senza oggetto né spesa; la revisione salva solo la decisione', async () => {
    const user = userEvent.setup();
    const { props } = withSaving(batchOf([corpus.ape()]));
    await toProposals(user);
    await user.click(reviewButton('APE_Casa.pdf'));
    expect(within(dialog()).getByRole('radio', { name: /Solo alla casa/ })).toBeChecked();
    await saveIn(user);
    expect(reviewCalls(props.onSaveReview)[0]).toEqual({ itemId: 'ape', expectedVersion: 1, expectedOrganizationVersion: 0, replaceOrganization: false, selection: { action: 'organize', title: 'Attestato di prestazione energetica', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }], target: { kind: 'home' } } });
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Scelta pronta')).toBeInTheDocument();
  });

  it('CILA e agibilità: contenuti proposti preselezionati, correggibili prima della conferma', async () => {
    const user = userEvent.setup();
    const { props } = withSaving(batchOf([corpus.building()]));
    await toProposals(user);
    await user.click(reviewButton('Pratica_CILA_e_agibilita.pdf'));
    const boxes = within(dialog()).getAllByRole('checkbox');
    expect(boxes.map(b => (b as HTMLInputElement).checked)).toEqual([true, true]);
    await user.click(within(dialog()).getByRole('checkbox', { name: /CILA · pagine 1–10/ }));
    await saveIn(user);
    expect(reviewCalls(props.onSaveReview)[0]!.selection).toMatchObject({ parts: [{ kind: 'agibility', pageFrom: 11, pageTo: 14 }] });
  });

  it('schema ambiguo: nessuna scheda preselezionata; la scelta porta id e versione attesa', async () => {
    const user = userEvent.setup();
    const { props, view } = withSaving(batchOf([corpus.diagram()]));
    await toProposals(user);
    await user.click(reviewButton('Schema_impianto.pdf'));
    expect(within(dialog()).getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
    await saveIn(user);
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(/Scegli una scheda esistente/);
    await user.click(within(dialog()).getByRole('button', { name: 'Mostra le schede esistenti' }));
    expect(props.loadCandidates).toHaveBeenCalledWith('schema', false);
    view.rerenderWith({ ...props, candidates: { schema: diagramCandidates } });
    await user.click(within(dialog()).getByRole('radio', { name: /Caldaia · Locale tecnico/ }));
    await saveIn(user);
    expect(reviewCalls(props.onSaveReview)[0]!.selection).toMatchObject({ target: { kind: 'boiler', id: 'boiler-1', expectedVersion: 5 } });
  });

  it('regolamento condominiale: resta Solo io; ricevuta già collegata: nessun doppione, percorso ricevuta solo su richiesta', async () => {
    const user = userEvent.setup();
    const onOpenReceiptFlow = vi.fn();
    renderIntake(intakeProps({ batch: batchOf([corpus.rules(), corpus.receipt()]), onOpenReceiptFlow }));
    await toProposals(user);
    expect(screen.getAllByText(/Solo io/).length).toBe(2);
    await user.click(reviewButton('Ricevuta_macchina_caffe.pdf'));
    expect(within(dialog()).getByText(/Già collegata a Macchina del caffè · Cucina e alla spesa 179,90/)).toBeInTheDocument();
    expect(within(dialog()).getByText(/non crea oggetti né spese/)).toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Apri nella ricevuta assistita' }));
    expect(onOpenReceiptFlow).toHaveBeenCalledWith('ricevuta');
  });

  it('copia identica: si riusa l’originale, nessuna analisi e nessuna eliminazione', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([corpus.ape(), corpus.copy()]) });
    renderIntake(props);
    expect(screen.getByText(/Stesso contenuto di «APE_Casa.pdf»\. Nessun originale viene eliminato/)).toBeInTheDocument();
    await toProposals(user);
    await user.click(reviewButton('APE_Casa_copia.pdf'));
    await user.click(within(dialog()).getByRole('button', { name: 'Usa questa organizzazione' }));
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(/Scegli se usare solo il riferimento/);
    await user.click(within(dialog()).getByRole('radio', { name: /Usa solo il riferimento/ }));
    expect(within(dialog()).getByText(/nessuna eliminazione/)).toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Usa l’originale esistente' }));
    expect(props.onResolveDuplicate).toHaveBeenCalledWith('copia', 1);
    expect(props.onSaveReview).not.toHaveBeenCalled();
  });

  it('scansione non leggibile: classificazione manuale dell’intero documento, senza citazioni', async () => {
    const user = userEvent.setup();
    const { props } = withSaving(batchOf([corpus.scan()]));
    await toProposals(user);
    await user.click(reviewButton('Scansione_documento.pdf'));
    expect(within(dialog()).getByText(/nessun testo estratto e nessun dato ricostruito/)).toBeInTheDocument();
    expect(within(dialog()).queryByText(/Fonte · pagina/)).not.toBeInTheDocument();
    await user.type(within(dialog()).getByRole('textbox', { name: 'Nome da mostrare' }), 'Vecchio contratto caldaia');
    await user.click(within(dialog()).getByRole('button', { name: 'Aggiungi un contenuto' }));
    await user.selectOptions(within(dialog()).getByRole('combobox', { name: 'Tipo del contenuto 1' }), 'conformity_declaration');
    await user.click(within(dialog()).getByRole('radio', { name: /Solo alla casa/ }));
    await saveIn(user);
    expect(reviewCalls(props.onSaveReview)[0]!.selection).toEqual({ action: 'organize', title: 'Vecchio contratto caldaia', parts: [{ kind: 'conformity_declaration', pageFrom: null, pageTo: null }], target: { kind: 'home' } });
  });
});

describe('scelte, riepilogo e conferma parziale', () => {
  it('chiudere e riaprire conserva la bozza; rimandare non entra nel riepilogo', async () => {
    const user = userEvent.setup();
    const { props } = withSaving(batchOf([corpus.ape(), corpus.rules()]));
    await toProposals(user);
    await user.click(reviewButton('APE_Casa.pdf'));
    const title = within(dialog()).getByRole('textbox', { name: 'Nome da mostrare' });
    await user.clear(title); await user.type(title, 'APE 2026');
    await user.click(within(dialog()).getByRole('button', { name: 'Chiudi senza modificare' }));
    await user.click(reviewButton('APE_Casa.pdf'));
    expect(within(dialog()).getByRole('textbox', { name: 'Nome da mostrare' })).toHaveValue('APE 2026');
    await saveIn(user);
    await user.click(reviewButton('Regolamento_condominio.pdf'));
    await user.click(within(dialog()).getByRole('button', { name: 'Decidi più avanti' }));
    expect(reviewCalls(props.onSaveReview)[1]).toMatchObject({ itemId: 'condominio', selection: { action: 'defer' } });
    await user.click(screen.getByRole('button', { name: 'Controlla il riepilogo →' }));
    expect(screen.getByRole('heading', { level: 2, name: '1 decisione pronta' })).toBeInTheDocument();
    expect(screen.queryByText('Regolamento del condominio')).not.toBeInTheDocument();
  });

  it('conferma parziale: solo le decisioni incluse; esito per file e resto da rivedere', async () => {
    const user = userEvent.setup();
    const saved = (f: () => ReturnType<typeof corpus.ape>, title: string) => ({ ...f(), reviewState: 'saved' as const, selection: { action: 'organize' as const, title, parts: f().proposal!.parts, target: { kind: 'home' as const } } });
    const onConfirm = vi.fn(async (p: ConfirmBatchPayload): Promise<ConfirmBatchOutcome> => ({ status: 'done', results: ([{ itemId: p.items[0]!.id, status: 'confirmed' }, { itemId: 'condominio', status: 'rejected', message: 'scelta cambiata' }] satisfies ItemConfirmResult[]).slice(0, p.items.length) }));
    renderIntake(intakeProps({ batch: batchOf([saved(corpus.ape, 'APE'), saved(corpus.rules, 'Regolamento'), corpus.scan()]), onConfirm }));
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: 'Controlla il riepilogo →' }));
    await user.click(screen.getByRole('checkbox', { name: /Regolamento/ }));
    const confirm = screen.getByRole('button', { name: 'Conferma le scelte' });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Ho controllato/ }));
    await user.click(confirm);
    expect(onConfirm.mock.calls[0]![0]).toEqual({ batchId: 'batch-demo', expectedVersion: 1, items: [{ id: 'ape', expectedVersion: 1 }] });
    expect(await screen.findByRole('heading', { level: 1, name: /Più ordine/ })).toBeInTheDocument();
    expect(screen.getByText(/2 file restano da rivedere/)).toBeInTheDocument();
  });

  it('esito incerto: nessuna doppia conferma, scelte bloccate, recupero esplicito con lo stesso payload', async () => {
    const user = userEvent.setup();
    let resolve!: (o: ConfirmBatchOutcome) => void;
    const onConfirm = vi.fn<(p: ConfirmBatchPayload) => Promise<ConfirmBatchOutcome>>(() => new Promise(r => { resolve = r; }));
    const onRecoverConfirmation = vi.fn(async (p: ConfirmBatchPayload) => ({ status: 'done' as const, results: p.items.map(i => ({ itemId: i.id, status: 'confirmed' as const })) }));
    const item = { ...corpus.ape(), reviewState: 'saved' as const, selection: { action: 'organize' as const, title: 'APE', parts: corpus.ape().proposal!.parts, target: { kind: 'home' as const } } };
    renderIntake(intakeProps({ batch: batchOf([item]), onConfirm, onRecoverConfirmation }));
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: 'Controlla il riepilogo →' }));
    await user.click(screen.getByRole('checkbox', { name: /Ho controllato/ }));
    await user.dblClick(screen.getByRole('button', { name: 'Conferma le scelte' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ status: 'uncertain' }));
    expect(screen.getByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Modifica le scelte' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /APE/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Verifica l’esito' }));
    expect(onRecoverConfirmation).toHaveBeenCalledWith(onConfirm.mock.calls[0]![0]);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { level: 1, name: /Più ordine/ })).toBeInTheDocument();
  });

  it('salvataggio di una scelta con esito incerto: scelta bloccata e verificata, mai reinviata da sola', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([corpus.ape()]), onSaveReview: vi.fn(async (): Promise<WriteOutcome> => ({ status: 'uncertain' })) });
    renderIntake(props);
    await toProposals(user);
    await user.click(reviewButton('APE_Casa.pdf'));
    await saveIn(user);
    expect(within(dialog()).getByText('Esito non confermato')).toBeInTheDocument();
    expect(within(dialog()).getByRole('textbox', { name: 'Nome da mostrare' })).toBeDisabled();
    await user.click(within(dialog()).getByRole('button', { name: 'Verifica l’esito' }));
    expect(props.onRecoverReview).toHaveBeenCalledWith(vi.mocked(props.onSaveReview).mock.calls[0]![0]);
    expect(await within(dialog()).findByText(/non risulta salvata/)).toBeInTheDocument();
    expect(props.onSaveReview).toHaveBeenCalledTimes(1);
  });
});

describe('errori, contesto e privacy', () => {
  it('upload fallito: si riprova solo quel file; l’errore degli altri non blocca nulla', async () => {
    const user = userEvent.setup();
    const failed = { ...corpus.rules(), uploadState: 'failed' as const, analysisState: 'not_started' as const, error: { code: 'storage_unavailable', message: 'Caricamento interrotto.' } };
    const props = intakeProps({ batch: batchOf([corpus.ape(), failed]), onRetryUpload: vi.fn(async (): Promise<WriteOutcome> => ({ status: 'uncertain' })) });
    renderIntake(props);
    expect(screen.getAllByRole('button', { name: 'Riprova questo file' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Riprova questo file' }));
    expect(props.onRetryUpload).toHaveBeenCalledWith('condominio');
    expect(await screen.findByText(/Esito non noto: ricarica il lotto/)).toBeInTheDocument();
    await toProposals(user);
    expect(reviewButton('APE_Casa.pdf')).toBeEnabled();
  });

  it('cambio di contesto e risposta tardiva: nessuna bozza o esito passa al nuovo account', async () => {
    const user = userEvent.setup();
    let late!: (o: WriteOutcome) => void;
    const props = intakeProps({ batch: batchOf([corpus.ape()]), onSaveReview: vi.fn(() => new Promise<WriteOutcome>(r => { late = r; })) });
    const view = renderIntake(props);
    await toProposals(user);
    await user.click(reviewButton('APE_Casa.pdf'));
    const title = within(dialog()).getByRole('textbox', { name: 'Nome da mostrare' });
    await user.clear(title); await user.type(title, 'Titolo privato A');
    await saveIn(user);
    view.rerenderWith({ ...props, contextKey: { ...CONTEXT, accountId: 'acc-B' }, batch: batchOf([corpus.ape()]) });
    await act(async () => late({ status: 'rejected', code: 'conflict', message: 'Risposta tardiva per A' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Titolo privato A|Risposta tardiva per A/);
    expect(screen.getByRole('heading', { level: 1, name: 'Il lotto è pronto da organizzare.' })).toBeInTheDocument();
  });

  it('fonte revocata: titolo, estratti e scelta in cache spariscono; l’elemento esce dal riepilogo', async () => {
    const user = userEvent.setup();
    const saved = { ...corpus.ape(), reviewState: 'saved' as const, selection: { action: 'organize' as const, title: 'APE segreto', parts: corpus.ape().proposal!.parts, target: { kind: 'home' as const } } };
    const props = intakeProps({ batch: batchOf([saved, corpus.rules()]) });
    const view = renderIntake(props);
    await toProposals(user);
    expect(screen.getByText(/Attestato di prestazione energetica/)).toBeInTheDocument();
    const revoked = { ...saved, documentLink: { state: 'unavailable' as const, document: { id: 'doc-ape', name: 'APE_Casa.pdf' } } };
    view.rerenderWith({ ...props, batch: batchOf([revoked, corpus.rules()]) });
    expect(document.body).not.toHaveTextContent(/Attestato di prestazione energetica|APE segreto|CLASSE ENERGETICA/i);
    expect(screen.getByText('Non più disponibile')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rivedi APE_Casa/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Controlla il riepilogo →' })).toBeDisabled();
  });

  it('tastiera: il dialogo prende il focus, confina Tab, Esc chiude e restituisce il focus', async () => {
    const user = userEvent.setup();
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]) }));
    await toProposals(user);
    const trigger = reviewButton('APE_Casa.pdf');
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(within(dialog()).getByRole('button', { name: 'Chiudi' })).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(within(dialog()).getByRole('button', { name: 'Usa questa organizzazione' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(within(dialog()).getByRole('button', { name: 'Chiudi' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('sola lettura e capacità disattivata: stati espliciti, nessun fallback', () => {
    const { unmount } = renderIntake(intakeProps({ batch: null, capabilities: { enabled: false, limits: mixedBatch().limits } }));
    expect(screen.getByText(/non è disponibile su questo servizio/)).toBeInTheDocument();
    expect(screen.queryByLabelText('File')).not.toBeInTheDocument();
    unmount();
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()], { permissions: { upload: false, review: false, confirm: false } }) }));
    expect(screen.queryByRole('button', { name: /Avvia/ })).not.toBeInTheDocument();
  });
});

describe('DocumentCollectionFilters', () => {
  it('controllato a props; Tutti e Da organizzare presenti; conteggi solo se dichiarati esatti', async () => {
    const user = userEvent.setup();
    function Host(p: { exact: boolean }) {
      const [current, setCurrent] = useState<CollectionFilter>('all');
      return <><DocumentCollectionFilters current={current} onChange={setCurrent} counts={{ all: 9, energy: 2 }} countsExact={p.exact} /><output>{current}</output></>;
    }
    const { rerender } = render(<Host exact={false} />);
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Da organizzare' }));
    expect(screen.getByRole('status')).toHaveTextContent('unclassified');
    expect(screen.queryByText(/· 2/)).not.toBeInTheDocument();
    rerender(<Host exact />);
    expect(screen.getByRole('button', { name: 'Energia · 2' })).toBeInTheDocument();
  });
});
