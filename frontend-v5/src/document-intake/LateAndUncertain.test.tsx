import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConfirmBatchOutcome, OrganizeBatchPayload, RecoverBatchOutcome, WriteOutcome } from './model';
import { CONTEXT, batchOf, copyOfOrganized, corpus, multiPartScan } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

type User = ReturnType<typeof userEvent.setup>;
const dlg = () => screen.getByRole('dialog');
const openApe = (user: User) => user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa\.pdf/ }));
const confirmIn = (user: User) => user.click(within(dlg()).getByRole('button', { name: 'Conferma e organizza' }));

describe('V2 · esiti incerti e risposte tardive della conferma diretta', () => {
  it('singolo incerto: scelta bloccata, verifica con lo stesso payload, nessun reinvio automatico', async () => {
    const user = userEvent.setup();
    const onOrganize = vi.fn<(p: OrganizeBatchPayload) => Promise<ConfirmBatchOutcome>>(async () => ({ status: 'uncertain' }));
    const onRecoverOrganization = vi.fn(async (p: OrganizeBatchPayload): Promise<RecoverBatchOutcome> => ({ status: 'done', results: p.items.map(i => ({ itemId: i.itemId, status: 'confirmed' as const })) }));
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]), onOrganize, onRecoverOrganization }));
    await openApe(user);
    await user.dblClick(within(dlg()).getByRole('button', { name: 'Conferma e organizza' }));
    expect(onOrganize).toHaveBeenCalledTimes(1);
    expect(within(dlg()).getByText('Esito non confermato')).toBeInTheDocument();
    expect(within(dlg()).getByRole('textbox', { name: 'Titolo del documento' })).toBeDisabled();
    expect(within(dlg()).getByRole('button', { name: 'Decidi più avanti' })).toBeDisabled();
    expect(screen.getByText('Esito non noto')).toBeInTheDocument();
    await user.click(within(dlg()).getByRole('button', { name: 'Verifica l’esito' }));
    expect(onRecoverOrganization).toHaveBeenCalledWith(onOrganize.mock.calls[0]![0]);
    expect(onOrganize).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Documento organizzato in Energia.')).toBeInTheDocument();
  });

  it('ricevuta assente dopo un esito incerto: si reinvia soltanto la stessa richiesta, su scelta esplicita', async () => {
    const user = userEvent.setup();
    const onOrganize = vi.fn<(p: OrganizeBatchPayload) => Promise<ConfirmBatchOutcome>>()
      .mockResolvedValueOnce({ status: 'uncertain' })
      .mockImplementation(async p => ({ status: 'done', results: p.items.map(i => ({ itemId: i.itemId, status: 'confirmed' as const })) }));
    const onRecoverOrganization = vi.fn(async (): Promise<RecoverBatchOutcome> => ({ status: 'not_found' }));
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]), onOrganize, onRecoverOrganization }));
    await openApe(user);
    await confirmIn(user);
    await user.click(within(dlg()).getByRole('button', { name: 'Verifica l’esito' }));
    expect(within(dlg()).getByText('Richiesta non registrata')).toBeInTheDocument();
    expect(onOrganize).toHaveBeenCalledTimes(1);
    await user.click(within(dlg()).getByRole('button', { name: 'Invia di nuovo la stessa conferma' }));
    expect(onOrganize).toHaveBeenCalledTimes(2);
    expect(onOrganize.mock.calls[1]![0]).toEqual(onOrganize.mock.calls[0]![0]);
  });

  it('senza recupero disponibile: nessuna verifica finta, solo l’indicazione di ricaricare', async () => {
    const user = userEvent.setup();
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]), onOrganize: vi.fn(async (): Promise<ConfirmBatchOutcome> => ({ status: 'uncertain' })), onRecoverOrganization: undefined }));
    await openApe(user);
    await confirmIn(user);
    expect(within(dlg()).getByText('Esito non confermato')).toBeInTheDocument();
    expect(within(dlg()).queryByRole('button', { name: 'Verifica l’esito' })).not.toBeInTheDocument();
  });

  it('una promessa rifiutata (rete) è trattata come incerta, mai come successo', async () => {
    const user = userEvent.setup();
    renderIntake(intakeProps({ batch: batchOf([corpus.ape()]), onOrganize: vi.fn(async () => { throw new Error('rete'); }) }));
    await openApe(user);
    await confirmIn(user);
    expect(within(dlg()).getByText('Esito non confermato')).toBeInTheDocument();
    expect(screen.queryByText(/Documento organizzato/)).not.toBeInTheDocument();
  });
});

describe('V2 · copia mantenuta con esito incerto e risposte tardive', () => {
  it('Mantieni invariato incerto: nessuna verifica finta, nessun reinvio, sblocco solo con lo stato reale', async () => {
    const user = userEvent.setup();
    const onResolveDuplicate = vi.fn(async (): Promise<WriteOutcome> => ({ status: 'uncertain' }));
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]), onResolveDuplicate });
    const view = renderIntake(props);
    await user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa_copia\.pdf/ }));
    await user.click(within(dlg()).getByRole('radio', { name: /Mantieni invariato/ }));
    await user.dblClick(within(dlg()).getByRole('button', { name: 'Mantieni invariato' }));
    expect(within(dlg()).getByText(/Ricarica la pagina/)).toBeInTheDocument();
    expect(within(dlg()).queryByRole('button', { name: 'Verifica l’esito' })).not.toBeInTheDocument();
    expect(onResolveDuplicate).toHaveBeenCalledTimes(1);
    expect(props.onOrganize).not.toHaveBeenCalled();
    view.rerenderWith({ ...props, onResolveDuplicate, batch: batchOf([{ ...copyOfOrganized(), version: 2 }]) });
    expect(within(dlg()).queryByText('Esito non confermato')).not.toBeInTheDocument();
  });

  it('risposta tardiva del mantenimento dopo il cambio di account: nessun esito o dato precedente', async () => {
    const user = userEvent.setup();
    let late!: (o: WriteOutcome) => void;
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]), onResolveDuplicate: vi.fn(() => new Promise<WriteOutcome>(r => { late = r; })) });
    const view = renderIntake(props);
    await user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa_copia\.pdf/ }));
    await user.click(within(dlg()).getByRole('radio', { name: /Mantieni invariato/ }));
    await user.click(within(dlg()).getByRole('button', { name: 'Mantieni invariato' }));
    view.rerenderWith({ ...props, contextKey: { ...CONTEXT, accountId: 'acc-B' }, batch: batchOf([]) });
    await act(async () => late({ status: 'confirmed' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/mantenuto invariato|APE appartamento|APE_Casa_copia/);
  });
});

describe('V2 · editor dei contenuti solo da tastiera', () => {
  it('aggiunge e rimuove contenuti senza mouse; il focus segue l’azione; la conferma porta gli intervalli scelti', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([{ ...multiPartScan(), selection: null, reviewState: 'unreviewed' }]) });
    renderIntake(props);
    screen.getByRole('button', { name: /^Indica il tipo Scansione_documento\.pdf/ }).focus();
    await user.keyboard('{Enter}');
    within(dlg()).getByRole('combobox', { name: 'Tipo di documento' }).focus();
    await user.selectOptions(within(dlg()).getByRole('combobox', { name: 'Tipo di documento' }), 'warranty');
    within(dlg()).getByRole('button', { name: /Aggiungi un contenuto/ }).focus();
    await user.keyboard('{Enter}');
    expect(within(dlg()).getByRole('combobox', { name: 'Tipo del contenuto 2' })).toHaveFocus();
    within(dlg()).getByRole('button', { name: 'Rimuovi il contenuto 2' }).focus();
    await user.keyboard('{Enter}');
    expect(within(dlg()).getByRole('combobox', { name: 'Tipo di documento' })).toHaveFocus();
    await user.type(within(dlg()).getByRole('textbox', { name: 'Titolo del documento' }), 'Garanzia');
    within(dlg()).getByRole('button', { name: 'Conferma e organizza' }).focus();
    await user.keyboard('{Enter}');
    expect(vi.mocked(props.onOrganize!).mock.calls[0]![0].items[0]!.selection).toMatchObject({ title: 'Garanzia', parts: [{ kind: 'warranty', pageFrom: null, pageTo: null }] });
  });
});
