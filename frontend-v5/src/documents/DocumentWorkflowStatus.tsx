import type { DocumentWorkflowState } from '../api/types';
import { Icon } from '../components/Icon';
import styles from '../routes/documents.module.css';

const states = {
  to_compile: ['Da compilare', 'Completa la scheda, a mano o con AI.', 'neutral', 'document'],
  analyzing: ['In analisi', 'Stiamo preparando la proposta. Puoi tornare più tardi.', 'progress', 'info'],
  review: ['Da rivedere', 'Proposta pronta: controlla e conferma i dati.', 'warning', 'alert'],
  completed: ['Completato', 'Dati salvati. Originale disponibile.', 'success', 'document'],
  attention: ['Analisi da verificare', 'Apri il documento: nessun nuovo invio automatico.', 'error', 'alert'],
} as const;

export function DocumentWorkflowStatus({ state }: { state?: DocumentWorkflowState }) {
  if (!state) return <div className={styles.workflowStatus}><span className={styles.statusBadge}>Stato non disponibile</span><small>Apri la scheda per verificare.</small></div>;
  const [label, hint, tone, icon] = states[state];
  return <div className={styles.workflowStatus} aria-label={`Stato: ${label}`}>
    <span className={`${styles.statusBadge} ${styles[tone]}`}><Icon name={icon}/>{label}</span>
    <small>{hint}</small>
  </div>;
}
