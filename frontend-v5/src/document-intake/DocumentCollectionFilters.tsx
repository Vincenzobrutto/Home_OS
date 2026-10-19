import { COLLECTIONS, type Collection } from './model';
import styles from '../economy/economy.module.css';

export type CollectionFilter = 'all' | 'house' | 'floor_plans' | Collection;

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
  const options: Array<{ id: CollectionFilter; label: string }> = [{ id: 'all', label: 'Tutti' },{id:'house',label:'Documenti della casa'},{id:'floor_plans',label:'Planimetrie'}, ...COLLECTIONS];
  return (
    <nav className={styles.families} aria-label={props.label ?? 'Raccolte'}>
      {options.map(o => {
        const count = props.countsExact ? props.counts?.[o.id] : undefined;
        return (
          <button key={o.id} type="button" className={styles.family} aria-pressed={props.current === o.id} onClick={() => props.onChange(o.id)}>
            {o.label}{typeof count === 'number' ? ` · ${count}` : ''}
          </button>
        );
      })}
    </nav>
  );
}
