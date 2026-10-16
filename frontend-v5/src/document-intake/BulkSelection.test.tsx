import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConfirmBatchOutcome, IntakeItem, OrganizeBatchPayload, RecoverBatchOutcome } from './model';
import { CONTEXT, batchOf, copyOfOrganized, corpus, lostCopyStaleCache, mixedBatch, multiPartScan } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';
import { withServer } from './testing/server';

type User = ReturnType<typeof userEvent.setup>;
const boxes = () => screen.queryAllByRole('checkbox', { name: /^Seleziona / });
const bar = () => screen.getByRole('region', { name: 'Documenti selezionati' });
const organizeButton = () => within(bar()).getByRole('button', { name: /^Organizza/ });
const pick = (user: User, title: string) => user.click(screen.getByRole('checkbox', { name: `Seleziona ${title}` }));
const confirmed = (p: OrganizeBatchPayload): ConfirmBatchOutcome => ({ status: 'done', results: p.items.map(i => ({ itemId: i.itemId, status: 'confirmed' as const })) });

describe('V2 · selezione multipla diretta', () => {
  it('caselle vuote solo sulle proposte chiare; «Seleziona le N disponibili» è esplicito; Organizza applica senza altro dialogo', async () => {
    const user = userEvent.setup();
    const s = withServer(mixedBatch());
    expect(boxes().map(b => b.getAttribute('aria-label'))).toEqual([
      'Seleziona Attestato di prestazione energetica', 'Seleziona Pratica edilizia con più contenuti',
      'Seleziona Regolamento del condominio', 'Seleziona Ricevuta macchina del caffè',
    ]);
    for (const b of boxes()) expect(b).not.toBeChecked();
    expect(within(bar()).getByText('0 documenti selezionati')).toBeInTheDocument();
    expect(organizeButton()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Seleziona le 4 proposte disponibili' }));
    expect(organizeButton()).toHaveTextContent('Organizza 4 documenti selezionati');
    await user.click(organizeButton());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const sent = vi.mocked(s.props.onOrganize!).mock.calls[0]![0];
    expect(sent.mode).toBe('multiple');
    expect(sent.items.map(i => i.itemId)).toEqual(['ape', 'edilizia', 'condominio', 'ricevuta']);
    expect(sent.items[1]).toEqual({ itemId: 'edilizia', expectedVersion: 1, expectedOrganizationVersion: 0, replaceOrganization: false,
      selection: { action: 'organize', title: 'Pratica edilizia con più contenuti', parts: corpus.building().proposal!.parts, target: { kind: 'home' } } });
    expect(screen.getByText('4 documenti organizzati.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completati · 4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Da rivedere · 3' })).toBeInTheDocument();
    expect(boxes()).toHaveLength(0);
    for (const fn of [s.props.onSaveReview, s.props.onConfirm, s.props.onResolveDuplicate]) expect(fn).not.toHaveBeenCalled();
  });

  it('esclusi dalla selezione: copie, dati già confermati, manuali, ambigui, rinviati, legacy, fonti perse e letture in corso', () => {
    const excluded: IntakeItem[] = [
      copyOfOrganized(),
      { ...corpus.rules(), id: 'org', confirmedOrganization: { title: 'Regolamento', parts: [{ kind: 'condominium_rules', pageFrom: null, pageTo: null }] }, organizationVersion: 1 },
      corpus.scan(), multiPartScan(), corpus.diagram(),
      { ...corpus.receipt(), reviewState: 'deferred' },
      { ...corpus.building(), reviewState: 'saved', selection: { action: 'organize', title: 'X', parts: corpus.building().proposal!.parts, target: { kind: 'home' } } },
      { ...lostCopyStaleCache(), id: 'persa', uploadState: 'stored' },
      { ...corpus.ape(), id: 'lettura', analysisState: 'running', proposal: null },
      { ...corpus.ape(), id: 'fatto', reviewState: 'confirmed' },
    ];
    renderIntake(intakeProps({ batch: batchOf([...excluded, corpus.ape()]) }));
    expect(boxes().map(b => b.getAttribute('aria-label'))).toEqual(['Seleziona Attestato di prestazione energetica']);
    expect(screen.getByText('Copie, dati diversi e tipi da indicare si rivedono singolarmente.')).toBeInTheDocument();
  });

  it('la selezione non sopravvive a filtri che la nascondono, a una nuova versione o al cambio di contesto', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([corpus.ape(), corpus.rules(), corpus.receipt()]) });
    const view = renderIntake(props);
    await pick(user, 'Attestato di prestazione energetica');
    await pick(user, 'Regolamento del condominio');
    expect(within(bar()).getByText('2 documenti selezionati')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Più tardi · 0' }));
    await user.click(screen.getByRole('button', { name: 'Tutti · 3' }));
    expect(within(bar()).getByText('0 documenti selezionati')).toBeInTheDocument();
    await pick(user, 'Attestato di prestazione energetica');
    await pick(user, 'Regolamento del condominio');
    // Un altro dispositivo modifica il regolamento: la sua selezione cade, l'APE resta.
    view.rerenderWith({ ...props, batch: batchOf([corpus.ape(), { ...corpus.rules(), version: 2 }, corpus.receipt()]) });
    expect(within(bar()).getByText('1 documento selezionato')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Seleziona Regolamento del condominio' })).not.toBeChecked();
    view.rerenderWith({ ...props, contextKey: { ...CONTEXT, homeId: 'home-B' }, batch: batchOf([corpus.ape(), corpus.rules()]) });
    expect(within(bar()).getByText('0 documenti selezionati')).toBeInTheDocument();
  });

  it('errore di un elemento: gli altri sono applicati, esito per file, il non applicato resta recuperabile', async () => {
    const user = userEvent.setup();
    const onOrganize = vi.fn(async (p: OrganizeBatchPayload): Promise<ConfirmBatchOutcome> => ({ status: 'done', results: p.items.map(i => (i.itemId === 'condominio'
      ? { itemId: i.itemId, status: 'rejected' as const, message: 'Il documento è cambiato: rileggilo.' } : { itemId: i.itemId, status: 'confirmed' as const })) }));
    const s = withServer(batchOf([corpus.ape(), corpus.rules()]), {
      onOrganize: vi.fn(async (p: OrganizeBatchPayload) => {
        const out = await onOrganize(p);
        s.batch = { ...s.batch, items: s.batch.items.map(i => (i.id === 'ape' ? { ...i, version: 2, reviewState: 'confirmed', selection: p.items[0]!.selection } : i)) };
        s.refresh();
        return out;
      }),
    });
    await user.click(screen.getByRole('button', { name: 'Seleziona le 2 proposte disponibili' }));
    await user.click(organizeButton());
    expect(screen.getByText('1 documento organizzato. 1 non applicato: resta da rivedere.')).toBeInTheDocument();
    expect(within(screen.getByRole('status')).getByText('Regolamento del condominio')).toBeInTheDocument();
    expect(screen.getByText('Non applicato: Il documento è cambiato: rileggilo.')).toBeInTheDocument();
    expect(screen.getByText('In Energia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rivedi Regolamento_condominio\.pdf/ })).toBeEnabled();
  });

  it('esito incerto: documenti bloccati, nessun reinvio; la verifica usa lo stesso payload; una parte mancante resta da chiarire', async () => {
    const user = userEvent.setup();
    const onOrganize = vi.fn<(p: OrganizeBatchPayload) => Promise<ConfirmBatchOutcome>>(async () => ({ status: 'uncertain' }));
    const onRecoverOrganization = vi.fn<(p: OrganizeBatchPayload) => Promise<RecoverBatchOutcome>>()
      .mockImplementationOnce(async p => ({ status: 'done', results: [{ itemId: p.items[0]!.itemId, status: 'confirmed' }] }))
      .mockImplementation(async p => confirmed(p));
    renderIntake(intakeProps({ batch: batchOf([corpus.ape(), corpus.rules(), corpus.receipt()]), onOrganize, onRecoverOrganization }));
    await pick(user, 'Attestato di prestazione energetica');
    await pick(user, 'Regolamento del condominio');
    await user.dblClick(organizeButton());
    expect(onOrganize).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.getAllByText('Esito non noto')).toHaveLength(2);
    expect(screen.queryByRole('checkbox', { name: 'Seleziona Attestato di prestazione energetica' })).not.toBeInTheDocument();
    expect(organizeButton()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Verifica l’esito' }));
    expect(onRecoverOrganization.mock.calls[0]![0]).toEqual(onOrganize.mock.calls[0]![0]);
    expect(screen.getByText(/Una parte è registrata/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verifica l’esito' }));
    expect(onRecoverOrganization.mock.calls[1]![0]).toEqual(onOrganize.mock.calls[0]![0]);
    expect(onOrganize).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2 documenti organizzati.')).toBeInTheDocument();
  });

  it('richiesta non registrata: reinvio soltanto esplicito e identico', async () => {
    const user = userEvent.setup();
    const onOrganize = vi.fn<(p: OrganizeBatchPayload) => Promise<ConfirmBatchOutcome>>().mockResolvedValueOnce({ status: 'uncertain' }).mockImplementation(async p => confirmed(p));
    const onRecoverOrganization = vi.fn(async (): Promise<RecoverBatchOutcome> => ({ status: 'not_found' }));
    renderIntake(intakeProps({ batch: batchOf([corpus.ape(), corpus.rules()]), onOrganize, onRecoverOrganization }));
    await user.click(screen.getByRole('button', { name: 'Seleziona le 2 proposte disponibili' }));
    await user.click(organizeButton());
    await user.click(screen.getByRole('button', { name: 'Verifica l’esito' }));
    expect(screen.getByText('Richiesta non registrata')).toBeInTheDocument();
    expect(onOrganize).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Invia di nuovo la stessa richiesta' }));
    expect(onOrganize).toHaveBeenCalledTimes(2);
    expect(onOrganize.mock.calls[1]![0]).toEqual(onOrganize.mock.calls[0]![0]);
  });

  it('rifiuto dell’intera richiesta: nessun documento organizzato, scelte non applicate e ancora selezionabili', async () => {
    const user = userEvent.setup();
    const onOrganize = vi.fn(async (): Promise<ConfirmBatchOutcome> => ({ status: 'rejected', code: 'conflict', message: 'Il caricamento è cambiato: ricarica.' }));
    renderIntake(intakeProps({ batch: batchOf([corpus.ape(), corpus.rules()]), onOrganize }));
    await user.click(screen.getByRole('button', { name: 'Seleziona le 2 proposte disponibili' }));
    await user.click(organizeButton());
    expect(screen.getByText('Nessun documento organizzato: Il caricamento è cambiato: ricarica.')).toBeInTheDocument();
    expect(screen.getAllByText(/^Non applicato:/)).toHaveLength(2);
    expect(boxes()).toHaveLength(2);
  });

  it('un solo documento: nessuna casella né barra, si conferma dalla revisione individuale', () => {
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]) }));
    expect(boxes()).toHaveLength(0);
    expect(screen.queryByRole('region', { name: 'Documenti selezionati' })).not.toBeInTheDocument();
  });
});
