import { Tag, ui } from '../components/ui';
import { FIELD_LABEL } from './ReceiptFields';
import { formatCents, formatDate, type ReceiptSummary } from './model';
import styles from './receipt.module.css';

const list = (fields: string[]) => fields.map(f => FIELD_LABEL[f as 'brand'].toLowerCase()).join(' e ');

/** Riepilogo esatto delle sole scelte fatte: conteggi 0/1 per oggetto e spesa, nessuna sovrascrittura. */
export function ReceiptSummaryView({ summary }: { summary: ReceiptSummary }) {
  const { object, expense, counts } = summary;
  return (
    <section className={ui.card} aria-label="Riepilogo delle scelte">
      <div className={styles.summaryItem}>
        <Tag tone={object.kind === 'reuse' ? 'blue' : 'neutral'}>
          Oggetto · {object.kind === 'create' ? 'Nuovo' : object.kind === 'reuse' ? 'Esistente' : 'Nessuna modifica'}
        </Tag>
        {object.kind === 'create' && (
          <>
            <h3>{object.name}</h3>
            <p>Verrà creata una scheda personale e collegata la ricevuta. Marca: {object.brand ?? 'non indicata'} · Modello: {object.model ?? 'non indicato'}.</p>
          </>
        )}
        {object.kind === 'reuse' && (
          <>
            <h3>{object.target.name}{object.target.roomName ? ` · ${object.target.roomName}` : ''}</h3>
            <p>{object.newLink ? 'Verrà collegata la ricevuta a questa scheda.' : 'La ricevuta è già collegata: nessun collegamento duplicato.'}</p>
            {object.filled.length > 0 && <p>Campi vuoti completati: {object.filled.map(f => `${FIELD_LABEL[f.field]} «${f.value}»`).join(', ')}.</p>}
            {object.kept.length > 0 && <p>Valori confermati mantenuti: {list(object.kept)}.</p>}
            {object.deferred.length > 0 && <p>Confronto da rivedere più avanti: {list(object.deferred)}. Il valore attuale resta.</p>}
          </>
        )}
        {(object.kind === 'skip' || object.kind === 'unset') && (
          <><h3>La scheda resta com’è</h3><p>Nessun nuovo oggetto e nessun collegamento. Niente viene scollegato o eliminato.</p></>
        )}
      </div>

      <div className={styles.summaryItem}>
        <Tag tone={expense.kind === 'reuse' ? 'blue' : 'neutral'}>
          Spesa · {expense.kind === 'create' ? 'Nuova' : expense.kind === 'reuse' ? 'Già presente' : 'Nessuna modifica'}
        </Tag>
        {expense.kind === 'create' && (
          <>
            <h3>{expense.amountCents === null ? '—' : formatCents(expense.amountCents)}</h3>
            <p>{expense.title} · {formatDate(expense.spentOn)}{expense.supplier ? ` · ${expense.supplier}` : ''}. Una sola registrazione in Spese, collegata alla ricevuta{object.kind === 'create' || object.kind === 'reuse' ? ' e all’oggetto scelto' : ''}.</p>
          </>
        )}
        {expense.kind === 'reuse' && (
          <>
            <h3>{formatCents(expense.target.amountCents)}</h3>
            <p>{expense.target.title} · {formatDate(expense.target.spentOn)}. {expense.newLink ? 'Verrà collegata alla ricevuta.' : 'Manteniamo la registrazione già collegata.'} Non viene creata una seconda spesa.</p>
            {expense.differs.length > 0 && (
              <p>La ricevuta riporta {expense.differs.map(d => d === 'amount' ? 'un importo' : d === 'date' ? 'una data' : 'una descrizione').join(' e ')} diversi: i valori registrati restano invariati.</p>
            )}
          </>
        )}
        {(expense.kind === 'skip' || expense.kind === 'unset') && (
          <><h3>Nessun intervento sulla spesa</h3><p>I costi già registrati non vengono eliminati né scollegati.</p></>
        )}
      </div>

      <div className={styles.summaryItem}>
        <strong>Documento originale</strong>
        <p>Resta in Documenti con la sua visibilità. Le scelte non ne fanno copie.</p>
      </div>

      <p className={styles.note} role="status">
        {counts.newObjects} {counts.newObjects === 1 ? 'nuovo oggetto' : 'nuovi oggetti'} · {counts.newExpenses} {counts.newExpenses === 1 ? 'nuova spesa' : 'nuove spese'}.
        Le proposte escluse non diventano dati confermati.
      </p>
    </section>
  );
}
