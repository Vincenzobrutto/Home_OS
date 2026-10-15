// Prove [mock] del caricamento differito delle sezioni: nessun backend, solo il caricatore.
import { Component, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { lazyPage } from './lazyPage';

function Page() {
  return <h1>Sezione caricata</h1>;
}

class Outer extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? <p>Errore gestito più in alto: {String((this.state.error as Error).message)}</p> : this.props.children;
  }
}

describe('[mock] sezioni a caricamento differito', () => {
  it('stato di caricamento coerente, poi la pagina', async () => {
    let resolve!: (c: typeof Page) => void;
    const Section = lazyPage(() => new Promise((r) => { resolve = r; }));
    render(<Section />);
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento della sezione…');
    resolve(Page);
    expect(await screen.findByRole('heading', { name: 'Sezione caricata' })).toBeInTheDocument();
  });

  it('caricamento fallito: messaggio e «Ricarica la pagina» a richiesta, nessun nuovo tentativo automatico', async () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    try {
      const load = vi.fn(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
      const Section = lazyPage(load);
      render(<Section />);
      expect(await screen.findByRole('heading', { name: 'Sezione non disponibile' })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/Nessun dato è stato modificato e resti connesso/);
      await new Promise((r) => setTimeout(r, 200));
      expect(load).toHaveBeenCalledTimes(1);
      expect(reload).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Ricarica la pagina' }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it('una sezione già scaricata non viene richiesta di nuovo', async () => {
    const load = vi.fn(() => Promise.resolve(Page));
    const Section = lazyPage(load);
    const first = render(<Section />);
    await screen.findByRole('heading', { name: 'Sezione caricata' });
    first.unmount();
    render(<Section />);
    expect(screen.getByRole('heading', { name: 'Sezione caricata' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('un errore di rendering della pagina non è trattato come caricamento fallito', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): ReactNode {
      throw new Error('guasto della pagina');
    }
    const Section = lazyPage(() => Promise.resolve(Broken));
    render(<Outer><Section /></Outer>);
    expect(await screen.findByText('Errore gestito più in alto: guasto della pagina')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sezione non disponibile' })).toBeNull();
    spy.mockRestore();
  });
});
