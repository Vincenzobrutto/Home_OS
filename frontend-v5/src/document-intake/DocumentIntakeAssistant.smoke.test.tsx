import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { batchOf, corpus } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

describe('archivio assistito: navigazione di base (C1)', () => {
  it('una copia già riusata è distinta da organizzata e permette una nuova revisione senza upload', async () => {
    const user = userEvent.setup(), onReorganizeDocument = vi.fn(async () => undefined);
    const props = intakeProps({ batch: batchOf([{ ...corpus.copy(), reviewState: 'confirmed' }]), onReorganizeDocument });
    renderIntake(props);
    expect(screen.getByText('Originale riusato · organizzazione invariata')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Riorganizza senza ricaricare' }));
    expect(onReorganizeDocument).toHaveBeenCalledWith('copia');
    expect(props.onSelectFiles).not.toHaveBeenCalled(); expect(props.onSaveReview).not.toHaveBeenCalled();
  });
  it('dal lotto alle proposte e ritorno, senza scritture all’apertura', async () => {
    const user = userEvent.setup();
    const props = intakeProps();
    renderIntake(props);
    expect(screen.getByRole('heading', { level: 1, name: 'Il lotto è pronto da organizzare.' })).toBeInTheDocument();
    expect(screen.getByText('7 file nel lotto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rivedi le proposte →' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Una casa, documenti diversi.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Controlla il riepilogo →' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '← Vedi il lotto' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Il lotto è pronto da organizzare.' })).toBeInTheDocument();
    for (const fn of [props.onSaveReview, props.onConfirm, props.onRetryUpload, props.onSelectFiles]) expect(fn).not.toHaveBeenCalled();
  });

  it('ingresso: seleziona più file e passa solo i File al container', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: null });
    renderIntake(props);
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' }), new File(['b'], 'b.png', { type: 'image/png' })];
    await user.upload(screen.getByLabelText('File'), files);
    expect(props.onSelectFiles).toHaveBeenCalledWith(files);
  });

  it('lo stesso ingresso accetta un file singolo o più file trascinati', () => {
    const props = intakeProps({ batch: null });
    renderIntake(props);
    const region = screen.getByRole('region', { name: 'Carica documenti' });
    const one = new File(['a'], 'ape.pdf', { type: 'application/pdf' });
    const two = new File(['b'], 'ricevuta.pdf', { type: 'application/pdf' });
    fireEvent.drop(region, { dataTransfer: { files: [one] } });
    expect(props.onSelectFiles).toHaveBeenLastCalledWith([one]);
    fireEvent.drop(region, { dataTransfer: { files: [one, two] } });
    expect(props.onSelectFiles).toHaveBeenLastCalledWith([one, two]);
  });
  it('aggiunge altri documenti dal lotto senza nascondere o sostituire i precedenti', async () => {
    const user = userEvent.setup(), props = intakeProps();
    renderIntake(props);
    await user.click(screen.getByRole('button', { name: '+ Aggiungi documenti' }));
    const next = new File(['a'], 'aggiunto.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('File'), next);
    expect(props.onSelectFiles).toHaveBeenCalledWith([next]);
    expect(screen.getByRole('heading', { name: 'Il lotto è pronto da organizzare.' })).toBeInTheDocument();
    expect(screen.getByText('7 file nel lotto')).toBeInTheDocument();
  });
});
