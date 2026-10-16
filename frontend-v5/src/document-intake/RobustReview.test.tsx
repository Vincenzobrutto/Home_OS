import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildSummary, itemStatus, type ReviewPayload, type WriteOutcome } from './model';
import { batchOf, copyOfOrganized, corpus, lostCopyRedacted, lostCopyStaleCache, multiPartScan, pendingManifest } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

type User = ReturnType<typeof userEvent.setup>;
const toProposals = (user: User) => user.click(screen.getByRole('button', { name: 'Rivedi le proposte →' }));
const dlg = () => screen.getByRole('dialog');
const saveIn = (user: User) => user.click(within(dlg()).getByRole('button', { name: 'Usa questa organizzazione' }));
const sent = (fn: unknown) => vi.mocked(fn as (p: ReviewPayload) => Promise<WriteOutcome>).mock.calls.map(c => c[0]);

describe('B4-2 · parti manuali multiple conservate', () => {
  it('riaprendo una scelta manuale con tre contenuti e intervalli, senza proposta, si ritrovano tutti', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([multiPartScan()]) });
    renderIntake(props);
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: /^Modifica scelta Scansione_documento\.pdf/ }));
    const kinds = ['Tipo del contenuto 1', 'Tipo del contenuto 2', 'Tipo del contenuto 3'].map(n => (within(dlg()).getByRole('combobox', { name: n }) as HTMLSelectElement).value);
    expect(kinds).toEqual(['cila', 'conformity_declaration', 'warranty']);
    expect(within(dlg()).getByRole('spinbutton', { name: 'Contenuto 2: da pagina' })).toHaveValue(5);
    expect(within(dlg()).getByRole('spinbutton', { name: 'Contenuto 3: a pagina' })).toHaveValue(12);
    await saveIn(user);
    expect(sent(props.onSaveReview)[0]!.selection).toEqual(multiPartScan().selection);
  });

  it('una scelta salvata non coperta dalla proposta corrente non viene ridotta a un solo tipo', async () => {
    const user = userEvent.setup();
    const building = corpus.building();
    const saved = { ...building, reviewState: 'saved' as const, selection: { action: 'organize' as const, title: 'Pratica', target: { kind: 'home' as const }, parts: [{ kind: 'cila' as const, pageFrom: 1, pageTo: 10 }, { kind: 'other' as const, pageFrom: 11, pageTo: 12 }] } };
    const props = intakeProps({ batch: batchOf([saved]) });
    renderIntake(props);
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: /^Modifica scelta Pratica_CILA/ }));
    expect(within(dlg()).getAllByRole('combobox', { name: /Tipo del contenuto/ })).toHaveLength(2);
    await saveIn(user);
    expect(sent(props.onSaveReview)[0]!.selection).toMatchObject({ parts: saved.selection.parts });
  });

  it('pagine e contenuti manuali non validi bloccano il salvataggio con un messaggio chiaro', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([multiPartScan()]) });
    renderIntake(props);
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: /^Modifica scelta Scansione/ }));
    const to3 = within(dlg()).getByRole('spinbutton', { name: 'Contenuto 3: a pagina' });
    await user.clear(to3); await user.type(to3, '13');
    await saveIn(user);
    expect(within(dlg()).getByRole('alert')).toHaveTextContent('Le pagine vanno da 1 a 12');
    await user.clear(to3);
    await saveIn(user);
    expect(within(dlg()).getByRole('alert')).toHaveTextContent(/entrambe le pagine/);
    await user.type(to3, '12');
    await user.selectOptions(within(dlg()).getByRole('combobox', { name: 'Tipo del contenuto 2' }), 'cila');
    const from2 = within(dlg()).getByRole('spinbutton', { name: 'Contenuto 2: da pagina' }), to2 = within(dlg()).getByRole('spinbutton', { name: 'Contenuto 2: a pagina' });
    await user.clear(from2); await user.type(from2, '1'); await user.clear(to2); await user.type(to2, '4');
    await saveIn(user);
    expect(within(dlg()).getByRole('alert')).toHaveTextContent(/indicato due volte/);
    expect(props.onSaveReview).not.toHaveBeenCalled();
  });
});

describe('B4-2 · originale non disponibile e manifest in attesa', () => {
  it('copia con fonte persa: «Non più disponibile», nessun nome, dimensione, MIME o nome del duplicato, anche con cache vecchia', () => {
    for (const lost of [lostCopyRedacted(), lostCopyStaleCache()]) {
      expect(itemStatus(lost)).toBe('unavailable');
      const { unmount } = renderIntake(intakeProps({ batch: batchOf([corpus.ape(), lost]) }));
      expect(screen.getByText('Non più disponibile')).toBeInTheDocument();
      expect(screen.getByText('Documento non disponibile')).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(/APE_Casa_copia|Stesso contenuto di/);
      expect(screen.getAllByText(/KiB|MiB/)).toHaveLength(1);
      unmount();
    }
  });

  it('elemento in attesa: il manifest dell’utente resta visibile e annullabile', () => {
    renderIntake(intakeProps({ batch: batchOf([pendingManifest()]) }));
    expect(screen.getByText('Verbale_assemblea.pdf')).toBeInTheDocument();
    expect(screen.getByText('In attesa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeInTheDocument();
  });

  it('fonte revocata a dialogo aperto: il dialogo sparisce con la bozza e non entra nel riepilogo', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([corpus.ape()]) });
    const view = renderIntake(props);
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa\.pdf/ }));
    const title = within(dlg()).getByRole('textbox', { name: 'Nome da mostrare' });
    await user.clear(title); await user.type(title, 'Titolo scritto prima della revoca');
    const revoked = { ...corpus.ape(), documentLink: { state: 'unavailable' as const, document: null } };
    view.rerenderWith({ ...props, batch: batchOf([revoked]) });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Titolo scritto prima della revoca|Attestato di prestazione/);
    expect(buildSummary(batchOf([{ ...revoked, reviewState: 'saved', selection: { action: 'defer' } }]), new Set()).included).toHaveLength(0);
  });
});

describe('B4-2 · copia identica: riferimento oppure organizzazione esplicita del documento esistente', () => {
  it('organizzare il documento esistente parte dai dati confermati e chiede il consenso per cambiarli', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]) });
    renderIntake(props);
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa_copia\.pdf/ }));
    await user.click(within(dlg()).getByRole('radio', { name: /Organizza il documento esistente/ }));
    expect(within(dlg()).getByRole('textbox', { name: 'Nome da mostrare' })).toHaveValue('APE appartamento');
    expect((within(dlg()).getByRole('combobox', { name: 'Tipo del contenuto 1' }) as HTMLSelectElement).value).toBe('ape');
    expect(within(dlg()).getByText(/coincide: nessuna sostituzione/)).toBeInTheDocument();
    await user.type(within(dlg()).getByRole('textbox', { name: 'Nome da mostrare' }), ' 2026');
    await user.click(within(dlg()).getByRole('radio', { name: /Solo alla casa/ }));
    await saveIn(user);
    expect(props.onSaveReview).not.toHaveBeenCalled();
    await user.click(within(dlg()).getByRole('checkbox', { name: /Sostituisci/ }));
    await saveIn(user);
    expect(sent(props.onSaveReview)[0]).toMatchObject({ itemId: 'copia', expectedOrganizationVersion: 2, replaceOrganization: true, selection: { action: 'organize', title: 'APE appartamento 2026', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }] } });
    expect(props.onResolveDuplicate).not.toHaveBeenCalled();
  });

  it('riusare il riferimento non tocca l’organizzazione e non usa il salvataggio della revisione', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]) });
    renderIntake(props);
    await toProposals(user);
    await user.click(screen.getByRole('button', { name: /^Rivedi APE_Casa_copia\.pdf/ }));
    await user.click(within(dlg()).getByRole('radio', { name: /Usa solo il riferimento/ }));
    await user.click(within(dlg()).getByRole('button', { name: 'Usa l’originale esistente' }));
    expect(props.onResolveDuplicate).toHaveBeenCalledWith('copia', 1);
    expect(props.onSaveReview).not.toHaveBeenCalled();
  });
});
