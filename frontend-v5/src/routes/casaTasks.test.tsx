import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CasaReviewSummary } from './CasaTasksSummary';
import { CasaSharingSummary } from './CasaSharingSummary';

const hooks = vi.hoisted(() => ({ review: vi.fn(), caps: vi.fn(), shares: vi.fn() }));
vi.mock('../review/hooks', () => ({ useReview: hooks.review }));
vi.mock('../sharing/hooks', () => ({ useSharingCapabilities: hooks.caps, useShares: hooks.shares }));

function show(node: React.ReactNode) { return render(<MemoryRouter>{node}</MemoryRouter>); }
const ready = (data: unknown, extra = {}) => ({ isPending: false, isError: false, isSuccess: true, data, refetch: vi.fn(), ...extra });

beforeEach(() => {
  hooks.caps.mockReturnValue(ready({ enabled: true }));
  hooks.shares.mockReturnValue(ready({ pages: [{ items: [], nextCursor: null }] }, { hasNextPage: false }));
});

describe('[mock] attenzione Casa, senza deduzioni dalle pagine parziali', () => {
  it('usa openCount del server anche se la prima pagina contiene un solo elemento', () => {
    hooks.review.mockReturnValue(ready({ pages: [{ openCount: 23, items: [{}] }] }));
    show(<CasaReviewSummary homeId="casa-a" />);
    expect(screen.getByText('23 verifiche da rivedere')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri le verifiche' })).toHaveAttribute('href', '/home/casa-a/review');
  });

  it('un errore review con cache precedente non mostra zero o conteggi vecchi', () => {
    hooks.review.mockReturnValue(ready({ pages: [{ openCount: 12 }] }, { isError: true, isSuccess: false, error: new Error('rete') }));
    show(<CasaReviewSummary homeId="casa-a" />);
    expect(screen.queryByText(/12 verifiche|Nessuna verifica aperta/)).toBeNull();
    expect(screen.getByRole('button', { name: /Riprova/ })).toBeInTheDocument();
  });

  it('segnala la conferma autorizzata senza esporre nomi o codici', () => {
    hooks.shares.mockReturnValue(ready({ pages: [{ items: [{ permissions: ['confirm_pairing'], recipient: { name: 'Nome privato' }, pairing: { code: 'SEGRETO' } }] }] }));
    show(<CasaSharingSummary homeId="casa-a" />);
    expect(screen.getByText('Hai condivisioni da confermare')).toBeInTheDocument();
    expect(screen.queryByText(/Nome privato|SEGRETO/)).toBeNull();
  });

  it('una prima pagina senza conferme non dichiara assenza sulle altre pagine', () => {
    hooks.shares.mockReturnValue(ready({ pages: [{ items: [{ permissions: ['revoke'] }] }] }, { hasNextPage: true }));
    show(<CasaSharingSummary homeId="casa-a" />);
    expect(screen.getByText(/Apri l’elenco completo/)).toBeInTheDocument();
    expect(screen.queryByText('Hai condivisioni da confermare')).toBeNull();
  });

  it('errore dopo una conferma in cache non mantiene un avviso obsoleto', () => {
    hooks.shares.mockReturnValue(ready({ pages: [{ items: [{ permissions: ['confirm_pairing'] }] }] }, { isError: true, error: new Error('rete') }));
    show(<CasaSharingSummary homeId="casa-a" />);
    expect(screen.queryByText('Hai condivisioni da confermare')).toBeNull();
    expect(screen.getByRole('button', { name: /Riprova/ })).toBeInTheDocument();
  });

  it('servizio disabilitato non interroga le consegne e conserva ingresso', () => {
    hooks.caps.mockReturnValue(ready({ enabled: false }));
    hooks.shares.mockClear();
    show(<CasaSharingSummary homeId="casa-a" />);
    expect(hooks.shares).not.toHaveBeenCalled();
    expect(within(screen.getByRole('region', { name: 'Condivisioni' })).getByRole('link', { name: 'Apri le condivisioni' })).toHaveAttribute('href', '/home/casa-a/condivisioni');
  });
});
