import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildReviewPayload, chooseUpdate, initialReviewDraft, needsKeepOrUpdate, replacesConfirmed, rowTitle, sameParts, type IntakeItem, type OrganizeBatchPayload } from './model';
import { batchOf, copyOfOrganized, corpus } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

type User = ReturnType<typeof userEvent.setup>;
const dlg = () => screen.getByRole('dialog');
const open = (user: User, filename: string) => user.click(screen.getByRole('button', { name: new RegExp(`^Rivedi ${filename.replace('.', '\\.')}`) }));
const consent = () => within(dlg()).queryByRole('checkbox', { name: /Sostituisci i dati già confermati/ });
const primary = () => within(dlg()).getByRole('button', { name: /^(Conferma e organizza|Mantieni invariato|Mantieni i dati attuali|Scegli come procedere)$/ });
const organized = (fn: unknown) => vi.mocked(fn as (p: OrganizeBatchPayload) => Promise<unknown>).mock.calls.map(c => c[0]);

/** APE già organizzato dall'account con un titolo diverso dalla proposta corrente: conflitto. */
const apeConfirmed = (over: Partial<IntakeItem> = {}): IntakeItem => ({
  ...corpus.ape(), organizationVersion: 3,
  confirmedOrganization: { title: 'APE appartamento', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }] }, ...over,
});

describe('V2 · conflitto con dati già confermati', () => {
  it('DATI ATTUALI distinti dalla PROPOSTA DAL DOCUMENTO; nessuna scelta preselezionata, conferma bloccata', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed(), corpus.rules()]) });
    renderIntake(props);
    expect(screen.getByText('Dati diversi')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Seleziona APE appartamento|Seleziona Attestato/ })).not.toBeInTheDocument();
    await open(user, 'APE_Casa.pdf');
    expect(within(dlg()).getByRole('heading', { name: 'Controlla i dati diversi' })).toBeInTheDocument();
    expect(within(dlg()).getByText('Dati attuali')).toBeInTheDocument();
    expect(within(dlg()).getByText('Già confermati da te')).toBeInTheDocument();
    expect(within(dlg()).getByText('Proposta dal documento')).toBeInTheDocument();
    expect(within(dlg()).getByText('APE appartamento')).toBeInTheDocument();
    for (const r of within(dlg()).getAllByRole('radio')) expect(r).not.toBeChecked();
    expect(primary()).toHaveTextContent('Scegli come procedere');
    expect(primary()).toBeDisabled();
  });

  it('«Mantieni i dati attuali»: completa senza riscrivere organizzazione o applicare la proposta', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed()]) });
    renderIntake(props);
    await open(user, 'APE_Casa.pdf');
    await user.click(within(dlg()).getByRole('radio', { name: /Mantieni i dati attuali/ }));
    expect(consent()).toBeNull();
    await user.click(primary());
    expect(props.onResolveDuplicate).toHaveBeenCalledWith(props.batch!.items[0]!.id, props.batch!.items[0]!.version);
    expect(props.onOrganize).not.toHaveBeenCalled();
  });

  it('«Usa la proposta»: consenso non preselezionato, necessario, poi replace true con la versione 3', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed()]) });
    renderIntake(props);
    await open(user, 'APE_Casa.pdf');
    await user.click(within(dlg()).getByRole('radio', { name: /Usa la proposta/ }));
    expect(within(dlg()).getByRole('textbox', { name: 'Titolo del documento' })).toHaveValue('Attestato di prestazione energetica');
    expect(consent()).not.toBeChecked();
    await user.click(primary());
    expect(within(dlg()).getByRole('alert')).toHaveTextContent(/conferma la sostituzione/);
    expect(props.onOrganize).not.toHaveBeenCalled();
    await user.click(consent()!);
    await user.click(primary());
    expect(organized(props.onOrganize)[0]!.items[0]).toMatchObject({ expectedOrganizationVersion: 3, replaceOrganization: true, selection: { title: 'Attestato di prestazione energetica' } });
  });

  it('il consenso decade se cambia la proposta scelta o arriva una nuova versione dell’organizzazione', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed()]) });
    const view = renderIntake(props);
    await open(user, 'APE_Casa.pdf');
    await user.click(within(dlg()).getByRole('radio', { name: /Usa la proposta/ }));
    await user.click(consent()!);
    await user.type(within(dlg()).getByRole('textbox', { name: 'Titolo del documento' }), ' 2026');
    expect(consent()).not.toBeChecked();
    await user.click(consent()!);
    expect(consent()).toBeChecked();
    view.rerenderWith({ ...props, batch: batchOf([apeConfirmed({ organizationVersion: 4 })]) });
    expect(consent()).not.toBeChecked();
    await user.click(primary());
    expect(props.onOrganize).not.toHaveBeenCalled();
  });
});

describe('V2 · copia già presente', () => {
  it('Mantieni invariato: onResolveDuplicate, nessuna riclassificazione né secondo originale; esito «Mantenuto invariato»', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([copyOfOrganized(), corpus.rules()]) });
    renderIntake(props);
    expect(screen.getByText('File già presente')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Seleziona APE appartamento/ })).not.toBeInTheDocument();
    await open(user, 'APE_Casa_copia.pdf');
    expect(within(dlg()).getByText(/Questo file è già nei tuoi Documenti/)).toBeInTheDocument();
    expect(within(dlg()).getByText('Dati attuali')).toBeInTheDocument();
    expect(primary()).toBeDisabled();
    await user.click(within(dlg()).getByRole('radio', { name: /Mantieni invariato/ }));
    await user.click(primary());
    expect(props.onResolveDuplicate).toHaveBeenCalledWith('copia', 1);
    expect(props.onOrganize).not.toHaveBeenCalled();
    expect(screen.getByText(/mantenuto invariato\. Non è stato creato un secondo originale/)).toBeInTheDocument();
  });

  it('Aggiorna: un solo originale, organizzazione diretta sulla copia con consenso se cambia dati confermati', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([copyOfOrganized()]) });
    renderIntake(props);
    await open(user, 'APE_Casa_copia.pdf');
    await user.click(within(dlg()).getByRole('radio', { name: /Aggiorna titolo o tipo/ }));
    const title = within(dlg()).getByRole('textbox', { name: 'Titolo del documento' });
    expect(title).toHaveValue('APE appartamento');
    await user.type(title, ' 2026');
    await user.click(within(dlg()).getByRole('radio', { name: /Solo alla casa/ }));
    await user.click(primary());
    expect(props.onOrganize).not.toHaveBeenCalled();
    await user.click(consent()!);
    await user.click(primary());
    expect(organized(props.onOrganize)[0]).toMatchObject({ mode: 'single', items: [{ itemId: 'copia', expectedOrganizationVersion: 2, replaceOrganization: true, selection: { title: 'APE appartamento 2026' } }] });
    expect(props.onResolveDuplicate).not.toHaveBeenCalled();
  });
});

describe('V2 · modello per copie e conflitti', () => {
  it('a kept document displays the confirmed title rather than the rejected proposal, including after reload', () => {
    const kept: IntakeItem = { ...corpus.ape(), reviewState: 'confirmed', selection: null, confirmedOrganization: { title: 'Titolo conservato', parts: [{ kind: 'other', pageFrom: null, pageTo: null }] } };
    expect(rowTitle(kept)).toBe('Titolo conservato');
    expect(rowTitle({ ...kept, confirmedOrganization: null })).toBe(kept.filename);
  });
  it('copie e conflitti richiedono la scelta; Aggiorna riparte dalla proposta; stesse parti in ordine diverso non sono un conflitto', () => {
    const copy: IntakeItem = { ...corpus.ape(), uploadState: 'duplicate', confirmedOrganization: null };
    expect(needsKeepOrUpdate(copy)).toBe(true);
    expect(initialReviewDraft(copy).duplicateMode).toBeNull();
    const unclassified: IntakeItem = { ...copy, confirmedOrganization: { title: 'Nome già scelto da me', parts: [{ kind: 'other', pageFrom: null, pageTo: null }] } };
    expect(initialReviewDraft(unclassified)).toMatchObject({ title: 'Nome già scelto da me', duplicateMode: null });
    expect(chooseUpdate(unclassified)).toMatchObject({ title: copy.proposal!.title, partIndexes: [0], manualParts: null, duplicateMode: 'organize' });
    expect(sameParts([{ kind: 'cila', pageFrom: 1, pageTo: 10 }, { kind: 'agibility', pageFrom: 11, pageTo: 14 }], [{ kind: 'agibility', pageFrom: 11, pageTo: 14 }, { kind: 'cila', pageFrom: 1, pageTo: 10 }])).toBe(true);
    const same: IntakeItem = { ...corpus.building(), organizationVersion: 2, confirmedOrganization: { title: 'Pratica edilizia con più contenuti', parts: [{ kind: 'agibility', pageFrom: 11, pageTo: 14 }, { kind: 'cila', pageFrom: 1, pageTo: 10 }] } };
    expect(needsKeepOrUpdate(same)).toBe(false);
    const draft = initialReviewDraft(same);
    expect(replacesConfirmed(draft, same)).toBe(false);
    expect(buildReviewPayload(draft, same, [])).toMatchObject({ replaceOrganization: false, expectedOrganizationVersion: 2 });
  });
});
