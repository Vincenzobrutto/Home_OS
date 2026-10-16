import { COLLECTIONS, type Collection } from './model';
import styles from './intake.module.css';

export type CollectionFilter = 'all' | Collection;

/**
 * Filtri delle raccolte sull'archivio, controllati a props. Le raccolte sono filtri, non copie, e non sono
 * le famiglie di Spese. I conteggi si mostrano solo se il container li dichiara esatti (mai da pagine parziali).
 */
export function DocumentCollectionFilters(props: {
  current: CollectionFilter;
  onChange: (next: CollectionFilter) => void;
  counts?: Partial<Record<CollectionFilter, number>>;
  countsExact?: boolean;
  label?: string;
}) {
  const options: Array<{ id: CollectionFilter; label: string }> = [{ id: 'all', label: 'Tutti' }, ...COLLECTIONS];
  return (
    <div className={styles.toolbar} role="group" aria-label={props.label ?? 'Raccolte'}>
      {options.map(o => {
        const count = props.countsExact ? props.counts?.[o.id] : undefined;
        return (
          <button key={o.id} type="button" className={styles.filter} aria-pressed={props.current === o.id} onClick={() => props.onChange(o.id)}>
            {o.label}{typeof count === 'number' ? ` · ${count}` : ''}
          </button>
        );
      })}
    </div>
  );
}
