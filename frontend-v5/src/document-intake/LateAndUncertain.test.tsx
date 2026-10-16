import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ReviewPayload, WriteOutcome } from './model';
import { CONTEXT, batchOf, copyOfOrganized, multiPartScan } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

type User = ReturnType<typeof userEvent.setup>;
const dlg = () => screen.getByRole('dialog');
const openCopy = async (user: User) => {
  await user.click(screen.getByRole('button', { name: 'Rivedi le proposte →' }));
  await user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa_copia\.pdf/ }));
  await user.click(within(dlg()).getByRole('radio', { name: /Usa solo il riferimento/ }));
};

describe('B4-3 · esiti incerti e risposte tardive sui percorsi nuovi', () => {
  it('riuso della copia con esito incerto: nessuna verifica finta, nessun reinvio, sblocco solo con lo stato reale', async () => {
    const user = userEvent.setup();
    const onResolveDuplicate = vi.fn(async (): Promise<WriteOutcome> => ({ status: 'uncertain' }));
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]), onResolveDuplicate });
    const view = renderIntake(props);
    await openCopy(user);
    await user.dblClick(within(dlg()).getByRole('button', { name: 'Usa l’originale esistente' }));
    expect(within(dlg()).getByText('Esito non confermato')).toBeInTheDocument();
    expect(within(dlg()).getByText(/Ricarica il lotto/)).toBeInTheDocument();
    expect(within(dlg()).queryByRole('button', { name: 'Verifica l’esito' })).not.toBeInTheDocument();
    expect(within(dlg()).getByRole('button', { name: 'Usa l’originale esistente' })).toBeDisabled();
    expect(onResolveDuplicate).toHaveBeenCalledTimes(1);
    expect(props.onSaveReview).not.toHaveBeenCalled();
    expect(props.onRetryUpload).not.toHaveBeenCalled();
    // Il container ricarica il lotto: l'elemento arriva con una versione nuova e il blocco cade.
    view.rerenderWith({ ...props, onResolveDuplicate, batch: batchOf([{ ...copyOfOrganized(), version: 2 }]) });
    expect(within(dlg()).queryByText('Esito non confermato')).not.toBeInTheDocument();
    expect(within(dlg()).getByRole('button', { name: 'Usa l’originale esistente' })).toBeEnabled();
  });

  it('risposta tardiva della copia dopo il cambio di account: nessun esito o dato del contesto precedente', async () => {
    const user = userEvent.setup();
    let late!: (o: WriteOutcome) => void;
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]), onResolveDuplicate: vi.fn(() => new Promise<WriteOutcome>(r => { late = r; })) });
    const view = renderIntake(props);
    await openCopy(user);
    await user.click(within(dlg()).getByRole('button', { name: 'Usa l’originale esistente' }));
    view.rerenderWith({ ...props, contextKey: { ...CONTEXT, accountId: 'acc-B' }, batch: batchOf([]) });
    await act(async () => late({ status: 'rejected', code: 'conflict', message: 'Rifiuto tardivo per A' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Rifiuto tardivo per A|APE appartamento|APE_Casa_copia/);
  });

  it('organizzazione della copia con risposta tardiva dopo una nuova versione: il consenso letto non viene riusato', async () => {
    const user = userEvent.setup();
    let late!: (o: WriteOutcome) => void;
    const onSaveReview = vi.fn<(p: ReviewPayload) => Promise<WriteOutcome>>(() => new Promise(r => { late = r; }));
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]), onSaveReview });
    const view = renderIntake(props);
    await user.click(screen.getByRole('button', { name: 'Rivedi le proposte →' }));
    await user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa_copia\.pdf/ }));
    await user.click(within(dlg()).getByRole('radio', { name: /Organizza il documento esistente/ }));
    await user.type(within(dlg()).getByRole('textbox', { name: 'Nome da mostrare' }), ' bis');
    await user.click(within(dlg()).getByRole('radio', { name: /Solo alla casa/ }));
    await user.click(within(dlg()).getByRole('checkbox', { name: /Sostituisci/ }));
    await user.click(within(dlg()).getByRole('button', { name: 'Usa questa organizzazione' }));
    view.rerenderWith({ ...props, batch: batchOf([{ ...copyOfOrganized(), organizationVersion: 3 }]) });
    await act(async () => late({ status: 'rejected', code: 'stale', message: 'Organizzazione cambiata nel frattempo.' }));
    expect(within(dlg()).getByText(/Organizzazione cambiata nel frattempo/)).toBeInTheDocument();
    expect(within(dlg()).getByRole('checkbox', { name: /Sostituisci/ })).not.toBeChecked();
    await user.click(within(dlg()).getByRole('button', { name: 'Usa questa organizzazione' }));
    expect(onSaveReview).toHaveBeenCalledTimes(1);
  });
});

describe('B4-3 · editor dei contenuti solo da tastiera', () => {
  it('aggiunge, compila e rimuove un contenuto senza mouse; il salvataggio porta gli intervalli scelti', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([{ ...multiPartScan(), selection: null, reviewState: 'unreviewed' }]) });
    renderIntake(props);
    await user.click(screen.getByRole('button', { name: 'Rivedi le proposte →' }));
    screen.getByRole('button', { name: /^Rivedi Scansione_documento\.pdf/ }).focus();
    await user.keyboard('{Enter}');
    const add = within(dlg()).getByRole('button', { name: 'Aggiungi un contenuto' });
    add.focus(); await user.keyboard('{Enter}');
    expect(within(dlg()).getByRole('combobox', { name: 'Tipo del contenuto 1' })).toHaveFocus();
    await user.selectOptions(within(dlg()).getByRole('combobox', { name: 'Tipo del contenuto 1' }), 'warranty');
    await user.tab(); await user.keyboard('1'); await user.tab(); await user.keyboard('12');
    within(dlg()).getByRole('button', { name: 'Aggiungi un contenuto' }).focus(); await user.keyboard('{Enter}');
    expect(within(dlg()).getByRole('combobox', { name: 'Tipo del contenuto 2' })).toHaveFocus();
    within(dlg()).getByRole('button', { name: 'Rimuovi il contenuto 2' }).focus();
    await user.keyboard('{Enter}');
    expect(within(dlg()).getByRole('combobox', { name: 'Tipo del contenuto 1' })).toHaveFocus();
    expect(within(dlg()).queryByRole('combobox', { name: 'Tipo del contenuto 2' })).not.toBeInTheDocument();
    await user.type(within(dlg()).getByRole('textbox', { name: 'Nome da mostrare' }), 'Garanzia');
    await user.click(within(dlg()).getByRole('radio', { name: /Solo alla casa/ }));
    within(dlg()).getByRole('button', { name: 'Usa questa organizzazione' }).focus();
    await user.keyboard('{Enter}');
    expect(vi.mocked(props.onSaveReview).mock.calls[0]![0].selection).toMatchObject({ action: 'organize', parts: [{ kind: 'warranty', pageFrom: 1, pageTo: 12 }] });
  });
});
