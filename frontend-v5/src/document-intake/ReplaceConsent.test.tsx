import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildReviewPayload, initialReviewDraft, replacesConfirmed, sameParts, type IntakeItem, type ReviewPayload, type WriteOutcome } from './model';
import { batchOf, corpus } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

type User = ReturnType<typeof userEvent.setup>;
const open = async (user: User, filename: string) => {
  await user.click(screen.getByRole('button', { name: 'Rivedi le proposte →' }));
  await user.click(screen.getByRole('button', { name: new RegExp(`^Rivedi ${filename.replace('.', '\\.')}`) }));
  return screen.getByRole('dialog');
};
const consent = () => within(screen.getByRole('dialog')).queryByRole('checkbox', { name: /Sostituisci l’organizzazione confermata/ });
const save = (user: User) => user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Usa questa organizzazione' }));
const sent = (fn: unknown) => vi.mocked(fn as (p: ReviewPayload) => Promise<WriteOutcome>).mock.calls.map(c => c[0]);

/** APE già organizzato dall'account con un titolo diverso dalla proposta corrente. */
const apeConfirmed = (over: Partial<IntakeItem> = {}): IntakeItem => ({
  ...corpus.ape(), organizationVersion: 3,
  confirmedOrganization: { title: 'APE appartamento', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }] }, ...over,
});

describe('B4-1 · consenso alla sostituzione di dati confermati', () => {
  it('confronto visibile, casella non preselezionata, salvataggio bloccato finché non si sceglie', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed()]) });
    renderIntake(props);
    const d = await open(user, 'APE_Casa.pdf');
    expect(within(d).getByText('Organizzazione già confermata')).toBeInTheDocument();
    expect(within(d).getByText(/APE appartamento · APE · pagine 1–8/)).toBeInTheDocument();
    expect(consent()).not.toBeChecked();
    await save(user);
    expect(within(d).getByRole('alert')).toHaveTextContent(/conferma la sostituzione oppure mantieni/);
    expect(props.onSaveReview).not.toHaveBeenCalled();
    await user.click(consent()!);
    await save(user);
    expect(sent(props.onSaveReview)[0]).toMatchObject({ expectedOrganizationVersion: 3, replaceOrganization: true, selection: { title: 'Attestato di prestazione energetica' } });
  });

  it('«Mantieni l’organizzazione confermata»: nessuna sostituzione, flag false con la versione letta', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed()]) });
    renderIntake(props);
    const d = await open(user, 'APE_Casa.pdf');
    await user.click(within(d).getByRole('button', { name: 'Mantieni l’organizzazione confermata' }));
    expect(consent()).toBeNull();
    expect(within(d).getByText(/coincide: nessuna sostituzione/)).toBeInTheDocument();
    await save(user);
    expect(sent(props.onSaveReview)[0]).toMatchObject({ expectedOrganizationVersion: 3, replaceOrganization: false, selection: { title: 'APE appartamento', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }] } });
  });

  it('il consenso decade se cambia il contenuto o se arriva una nuova versione dell’organizzazione', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed()]) });
    const view = renderIntake(props);
    const d = await open(user, 'APE_Casa.pdf');
    await user.click(consent()!);
    await user.type(within(d).getByRole('textbox', { name: 'Nome da mostrare' }), ' 2026');
    expect(consent()).not.toBeChecked();
    await user.click(consent()!);
    expect(consent()).toBeChecked();
    // Risposta tardiva / altro dispositivo: l'organizzazione confermata passa alla versione 4.
    view.rerenderWith({ ...props, batch: batchOf([apeConfirmed({ organizationVersion: 4 })]) });
    expect(consent()).not.toBeChecked();
    await save(user);
    expect(props.onSaveReview).not.toHaveBeenCalled();
  });

  it('rimandare non sostituisce nulla: replace false con la versione letta', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([apeConfirmed()]) });
    renderIntake(props);
    const d = await open(user, 'APE_Casa.pdf');
    await user.click(within(d).getByRole('button', { name: 'Decidi più avanti' }));
    expect(sent(props.onSaveReview)[0]).toEqual({ itemId: 'ape', expectedVersion: 1, expectedOrganizationVersion: 3, replaceOrganization: false, selection: { action: 'defer' } });
  });

  it('esito incerto dopo il consenso: payload congelato con replace true, solo verifica esplicita', async () => {
    const user = userEvent.setup();
    const onSaveReview = vi.fn(async (): Promise<WriteOutcome> => ({ status: 'uncertain' }));
    const onRecoverReview = vi.fn(async () => ({ status: 'confirmed' as const }));
    renderIntake(intakeProps({ batch: batchOf([apeConfirmed()]), onSaveReview, onRecoverReview }));
    const d = await open(user, 'APE_Casa.pdf');
    await user.click(consent()!);
    await save(user);
    expect(consent()).toBeDisabled();
    await act(async () => { await user.click(within(d).getByRole('button', { name: 'Verifica l’esito' })); });
    expect(onRecoverReview).toHaveBeenCalledWith(expect.objectContaining({ replaceOrganization: true, expectedOrganizationVersion: 3 }));
    expect(onSaveReview).toHaveBeenCalledTimes(1);
  });
});

describe('B4-1 · confronto delle parti per tipo e intervallo', () => {
  it('una copia riusa la proposta, ma conserva titolo e contenuti già confermati', () => {
    const item: IntakeItem = { ...corpus.ape(), uploadState: 'duplicate', confirmedOrganization: null };
    const draft = initialReviewDraft(item);
    expect(draft.title).toBe(item.proposal!.title);
    expect(draft.partIndexes).toEqual([0]);
    expect(draft.duplicateMode).toBeNull();
    const existing: IntakeItem = { ...item, confirmedOrganization: { title: 'Nome già scelto da me', parts: [{ kind: 'other', pageFrom: null, pageTo: null }] } };
    expect(initialReviewDraft(existing)).toMatchObject({ title: 'Nome già scelto da me', manualParts: existing.confirmedOrganization!.parts, replaceConsent: null, duplicateMode: null });
  });
  it('ordine diverso delle stesse parti: nessuna sostituzione richiesta', () => {
    expect(sameParts([{ kind: 'cila', pageFrom: 1, pageTo: 10 }, { kind: 'agibility', pageFrom: 11, pageTo: 14 }], [{ kind: 'agibility', pageFrom: 11, pageTo: 14 }, { kind: 'cila', pageFrom: 1, pageTo: 10 }])).toBe(true);
    expect(sameParts([{ kind: 'cila', pageFrom: 1, pageTo: 10 }], [{ kind: 'cila', pageFrom: 1, pageTo: 9 }])).toBe(false);
    const item: IntakeItem = { ...corpus.building(), organizationVersion: 2, confirmedOrganization: { title: 'Pratica edilizia con più contenuti', parts: [{ kind: 'agibility', pageFrom: 11, pageTo: 14 }, { kind: 'cila', pageFrom: 1, pageTo: 10 }] } };
    const draft = { ...initialReviewDraft(item), partIndexes: [0, 1] };
    expect(replacesConfirmed(draft, item)).toBe(false);
    expect(buildReviewPayload(draft, item, [])).toMatchObject({ replaceOrganization: false, expectedOrganizationVersion: 2 });
  });
});
