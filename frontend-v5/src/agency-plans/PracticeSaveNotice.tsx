import styles from './practice-plan.module.css';

export function PracticeSaveNotice({message,onDismiss}:{message:string;onDismiss:()=>void}){
 if(!message)return null;
 return <div className={styles.toast}>
  <span role="status">{message}</span>
  <button type="button" aria-label="Chiudi conferma di salvataggio" onClick={onDismiss}>×</button>
 </div>;
}
