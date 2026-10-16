import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { itemStatus, type OrganizeBatchPayload } from './model';
import { batchOf, corpus, lostCopyRedacted, lostCopyStaleCache, multiPartScan, pendingManifest } from './testing/fixtures';
import { intakeProps, renderIntake } from './testing/renderIntake';

type User = ReturnType<typeof userEvent.setup>;
const dlg = () => screen.getByRole('dialog');
const confirmIn = (user: User) => user.click(within(dlg()).getByRole('button', { name: 'Conferma e organizza' }));
const organized = (fn: unknown) => vi.mocked(fn as (p: OrganizeBatchPayload) => Promise<unknown>).mock.calls.map(c => c[0]);

describe('V2 · parti manuali multiple conservate', () => {
  it('una scelta manuale con tre contenuti e intervalli, senza proposta, si ritrova intera e si applica invariata', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([multiPartScan()]) });
    renderIntake(props);
    await user.click(screen.getByRole('button', { name: /^Rivedi Scansione_documento\.pdf/ }));
    const kinds = ['Tipo del contenuto 1', 'Tipo del contenuto 2', 'Tipo del contenuto 3'].map(n => (within(dlg()).getByRole('combobox', { name: n }) as HTMLSelectElement).value);
    expect(kinds).toEqual(['cila', 'conformity_declaration', 'warranty']);
    expect(within(dlg()).getByRole('spinbutton', { name: 'Contenuto 2: da pagina' })).toHaveValue(5);
    await confirmIn(user);
    expect(organized(props.onOrganize)[0]!.items[0]!.selection).toEqual(multiPartScan().selection);
  });

  it('pagine e contenuti non validi bloccano la conferma con un messaggio chiaro', async () => {
    const user = userEvent.setup();
    const props = intakeProps({ batch: batchOf([multiPartScan()]) });
    renderIntake(props);
    await user.click(screen.getByRole('button', { name: /^Rivedi Scansione/ }));
    const to3 = within(dlg()).getByRole('spinbutton', { name: 'Contenuto 3: a pagina' });
    await user.clear(to3); await user.type(to3, '13');
    await confirmIn(user);
    expect(within(dlg()).getByRole('alert')).toHaveTextContent('Le pagine vanno da 1 a 12');
    await user.clear(to3);
    await confirmIn(user);
    expect(within(dlg()).getByRole('alert')).toHaveTextContent(/entrambe le pagine/);
    expect(props.onOrganize).not.toHaveBeenCalled();
  });
});

describe('V2 · originale non disponibile e manifest in attesa', () => {
  it('copia con fonte persa: «Non più disponibile», nessun nome, dimensione o duplicato, anche con cache vecchia', () => {
    for (const lost of [lostCopyRedacted(), lostCopyStaleCache()]) {
      expect(itemStatus(lost)).toBe('unavailable');
      const { unmount } = renderIntake(intakeProps({ batch: batchOf([corpus.ape(), lost]) }));
      expect(screen.getByText('Non più disponibile')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Documento non disponibile' })).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(/APE_Casa_copia|Stesso contenuto di/);
      expect(screen.getAllByText(/KiB|MiB/)).toHaveLength(1);
      expect(screen.queryByRole('button', { name: /Documento non disponibile/ })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('elemento in attesa: il manifest dell’utente resta visibile e annullabile, non selezionabile', () => {
    renderIntake(intakeProps({ batch: batchOf([pendingManifest(), corpus.ape()]) }));
    expect(screen.getByText('Verbale_assemblea.pdf')).toBeInTheDocument();
    expect(screen.getByText('In attesa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annulla' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Verbale/ })).not.toBeInTheDocument();
  });
});
