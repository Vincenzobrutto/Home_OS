import type { DocumentWorkflowState } from '../api/types';
import { Icon } from '../components/Icon';
import styles from '../routes/documents.module.css';

const states = {
  to_compile: ['Da compilare', 'Inserisci i dati oppure precompilali con l’AI.', 'neutral', 'document'],
  analyzing: ['In analisi', 'Stiamo preparando la proposta. Puoi tornare più tardi.', 'progress', 'info'],
  review: ['Da rivedere', 'Controlla i dati proposti e salva.', 'warning', 'alert'],
  completed: ['Completato', 'Le tue scelte sono salvate, anche quando conservi solo il documento.', 'success', 'document'],
  attention: ['Analisi da controllare', 'Apri il documento per controllare l’esito dell’analisi.', 'error', 'alert'],
} as const;

export function DocumentWorkflowStatus({ state,compact=false }: { state?: DocumentWorkflowState;compact?:boolean }) {
  if (!state) return <div className={styles.workflowStatus}><span className={styles.statusBadge}>Stato non disponibile</span>{!compact&&<small>Apri la scheda per verificare.</small>}</div>;
  const [label, hint, tone, icon] = states[state];
  return <div className={styles.workflowStatus} aria-label={`Stato: ${label}`}>
    <span className={`${styles.statusBadge} ${styles[tone]}`}><Icon name={icon}/>{label}</span>
    {!compact&&<small>{hint}</small>}
  </div>;
}
