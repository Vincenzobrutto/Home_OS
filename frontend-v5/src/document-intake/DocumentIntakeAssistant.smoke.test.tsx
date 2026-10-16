import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { batchOf, corpus } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

describe('archivio assistito V2: area di lavoro unica', () => {
  it('una sola area con Tutti, Da rivedere, Più tardi e Completati; nessuna scrittura all’apertura', async () => {
    const user = userEvent.setup();
    const props = intakeProps();
    renderIntake(props);
    expect(screen.getByRole('heading', { level: 1, name: 'Controlla e organizza.' })).toBeInTheDocument();
    for (const name of ['Tutti · 7', 'Da rivedere · 7', 'Più tardi · 0', 'Completati · 0']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Completati · 0' }));
    expect(screen.getByText('Nessun documento in questo filtro.')).toBeInTheDocument();
    for (const name of ['Rivedi le proposte →', 'Controlla il riepilogo →', 'Avvia l’analisi']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    for (const fn of [props.onSaveReview, props.onConfirm, props.onOrganize, props.onRetryUpload, props.onSelectFiles, props.onStartAnalysis]) expect(fn ?? vi.fn()).not.toHaveBeenCalled();
  });

  it('ogni riga mostra titolo, tipo e destinazione proposti prima di qualsiasi scelta', () => {
    renderIntake(intakeProps({ batch: batchOf([corpus.ape(), corpus.building()]) }));
    expect(screen.getByRole('heading', { level: 3, name: 'Attestato di prestazione energetica' })).toBeInTheDocument();
    expect(screen.getByText('APE · pagine 1–8')).toBeInTheDocument();
    expect(screen.getByText('CILA · pagine 1–10 + Agibilità · pagine 11–14')).toBeInTheDocument();
    expect(screen.getAllByText(/· Solo alla casa/)).toHaveLength(2);
  });

  it('lettura locale in corso: titolo esplicito, nessun pulsante Analizza', () => {
    renderIntake(intakeProps({ batch: batchOf([{ ...corpus.ape(), analysisState: 'running', proposal: null }, corpus.rules()]) }));
    expect(screen.getByRole('heading', { level: 1, name: 'Stiamo preparando le proposte…' })).toBeInTheDocument();
    expect(screen.getByText('Lettura in corso')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Analizz|Avvia/ })).not.toBeInTheDocument();
  });

  it('una copia mantenuta è distinta da organizzata e si modifica senza ricaricare il file', async () => {
    const user = userEvent.setup(), onReorganizeDocument = vi.fn(async () => undefined);
    const props = intakeProps({ batch: batchOf([{ ...corpus.copy(), reviewState: 'confirmed' }]), onReorganizeDocument });
    renderIntake(props);
    expect(screen.getByText('Mantenuto invariato')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifica APE_Casa_copia.pdf' }));
    expect(onReorganizeDocument).toHaveBeenCalledWith('copia');
    expect(props.onSelectFiles).not.toHaveBeenCalled(); expect(props.onSaveReview).not.toHaveBeenCalled();
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

  it('+ Aggiungi documenti sotto l’elenco: torna all’area di lavoro con i risultati precedenti', async () => {
    const user = userEvent.setup(), props = intakeProps();
    renderIntake(props);
    await user.click(screen.getByRole('button', { name: '+ Aggiungi documenti' }));
    const next = new File(['a'], 'aggiunto.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('File'), next);
    expect(props.onSelectFiles).toHaveBeenCalledWith([next]);
    expect(screen.getByRole('heading', { level: 1, name: 'Controlla e organizza.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tutti · 7' })).toBeInTheDocument();
  });
});
