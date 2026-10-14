import { Link } from 'react-router';
import type { Home } from '../api/types';
import { ErrorState, Loading, cx, ui } from '../components/ui';
import { objectStyles as styles } from '../objects/components';
import { useObjectCapabilities, useRooms } from '../objects/hooks';
import { UNPLACED_LABEL, isNotActive, objectPath, objectsErrorMessage, roomMeta, roomPath } from '../lib/objects';
import pages from './pages.module.css';

const PREVIEW = 6;

/**
 * Casa: ingresso a Ambienti e Oggetti. Mostra solo ambienti condivisi della casa
 * (prima pagina, senza totali) e il link a «Da collocare» per i propri oggetti:
 * nessun conteggio di risorse private di altri.
 */
export function ObjectsSummary({ home }: { home: Home }) {
  const caps = useObjectCapabilities(home.id);
  const rooms = useRooms(home.id, { state: 'active' }, caps.isSuccess);
  const items = rooms.data?.pages[0]?.items ?? [];
  return (
    <section className={cx(ui.card, pages.wide)} aria-labelledby="casa-ambienti">
      <h2 id="casa-ambienti" className={pages.cardTitle}>
        Ambienti e oggetti
      </h2>
      {caps.isPending ? (
        <Loading label="Verifica del servizio…" />
      ) : caps.isError ? (
        isNotActive(caps.error) ? (
          <p className={pages.muted}>Ambienti e oggetti non sono ancora attivi su questo servizio.</p>
        ) : (
          <ErrorState title="Ambienti e oggetti non disponibili" error={caps.error} message={objectsErrorMessage(caps.error)} onRetry={() => void caps.refetch()} retrying={caps.isFetching} />
        )
      ) : (
        <>
          <p className={cx(pages.small, pages.muted)}>Gli ambienti sono condivisi nella casa; i tuoi oggetti restano visibili solo a te.</p>
          {rooms.isPending ? (
            <Loading label="Caricamento degli ambienti…" />
          ) : rooms.isError ? (
            <ErrorState title="Ambienti non disponibili" error={rooms.error} message={objectsErrorMessage(rooms.error)} onRetry={() => void rooms.refetch()} retrying={rooms.isFetching} />
          ) : items.length === 0 ? (
            <p className={pages.muted}>Non ci sono ancora ambienti in questa casa.</p>
          ) : (
            <ul className={styles.list} aria-label="Ambienti della casa">
              {items.slice(0, PREVIEW).map((r) => (
                <li key={r.id} className={styles.item}>
                  <Link to={roomPath(home.id, r.id)} className={styles.title}>
                    {r.name}
                  </Link>
                  {roomMeta(r) && <span className={styles.meta}>{roomMeta(r)}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className={cx(pages.spaced, styles.actions)}>
            <Link to={roomPath(home.id)} className={ui.btn}>
              Ambienti
            </Link>
            <Link to={objectPath(home.id)} className={ui.btn}>
              Oggetti e impianti
            </Link>
            <Link to={`${objectPath(home.id)}?collocazione=da-collocare`} className={ui.btn}>
              {UNPLACED_LABEL}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
