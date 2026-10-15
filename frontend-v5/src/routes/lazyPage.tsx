import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react';
import { Banner, Loading, cx, ui } from '../components/ui';

// Sezioni scaricate al primo accesso: l'entry contiene solo shell, guard, accesso e Casa.
// Il componente restituito è definito una volta, a livello di modulo (routes.tsx), mai nel rendering.

/** Il codice della sezione non è arrivato (rete assente, Dimora aggiornata nel frattempo). */
export class SectionLoadError extends Error {
  constructor(cause: unknown) {
    super('Caricamento della sezione non riuscito', { cause });
    this.name = 'SectionLoadError';
  }
}

export function lazyPage(load: () => Promise<ComponentType>) {
  const Page = lazy(() =>
    load().then(
      (Component) => ({ default: Component }),
      (cause: unknown) => {
        throw new SectionLoadError(cause);
      },
    ),
  );
  return function LazySection() {
    return (
      <SectionBoundary>
        <Suspense fallback={<Loading label="Caricamento della sezione…" />}>
          <Page />
        </Suspense>
      </SectionBoundary>
    );
  };
}

/**
 * Gestisce solo SectionLoadError: ogni altro errore prosegue verso il boundary superiore, come prima.
 * Il browser ricorda un import fallito per lo stesso indirizzo, quindi un nuovo tentativo in pagina
 * non scaricherebbe nulla: l'unica azione utile è ricaricare la pagina, a richiesta, allo stesso URL
 * (la sezione non era ancora montata, nessun modulo in corso va perso). Nessun tentativo automatico.
 */
class SectionBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    if (!(error instanceof SectionLoadError)) throw error;
    return (
      <>
        <h1 tabIndex={-1}>Sezione non disponibile</h1>
        <Banner
          tone="error"
          role="alert"
          title="Caricamento non riuscito"
          actions={
            <button type="button" className={cx(ui.btn, ui.small)} onClick={() => window.location.reload()}>
              Ricarica la pagina
            </button>
          }
        >
          <p>
            Non è stato possibile scaricare questa parte di Dimora (connessione assente o applicazione aggiornata nel frattempo).
            Nessun dato è stato modificato e resti connesso: ricaricando si riapre questo stesso indirizzo.
          </p>
        </Banner>
      </>
    );
  }
}
