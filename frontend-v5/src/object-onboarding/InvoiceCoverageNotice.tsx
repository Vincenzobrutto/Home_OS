import { useContext } from 'react';
import { Link } from 'react-router';
import { DocumentEditorContext } from '../documents/DocumentEditorContext';
import { Banner } from '../components/ui';
import type { Draft } from './model';

/** Coverage comes from the authorized server projection, never from local form state. */
export function InvoiceCoverageNotice({ draft, root }: { draft: Draft; root: string }) {
  const editor = useContext(DocumentEditorContext);
  const coverage = draft.snapshot && draft.state !== 'unavailable' ? draft.invoiceCoverage : null;
  if (!coverage) return null;
  const pending = coverage.pendingPages.length > 0;
  return <Banner tone={pending ? 'warning' : 'info'}>
    <section aria-label="Copertura delle fatture">
      <strong>{pending ? 'Questo file è ancora da verificare' : 'Tutte le pagine hanno una proposta di fattura'}</strong>
      <p>Pagine con una proposta completa: {coverage.coveredPages.join(', ') || 'nessuna'} su {coverage.totalPages}.</p>
      {pending ? <>
        <p>Pagine ancora da controllare: {coverage.pendingPages.join(', ')}.</p>
        <p>Puoi salvare separatamente le fatture già verificate. La revisione del file resta aperta: conservare solo il documento non chiude le pagine pendenti.</p>
      </> : <p>Controlla sull’originale importo, data e fornitore di ciascuna fattura prima di confermarla. La copertura non certifica la correttezza della lettura visiva.</p>}
      {editor ? <button type="button" onClick={() => editor.showOriginal()}>Controlla le pagine nell’originale</button> : <Link to={root + '/documenti/' + encodeURIComponent(draft.snapshot!.documentId) + '#doc-anteprima'} target="_blank" rel="noopener noreferrer">Controlla le pagine nell’originale ↗</Link>}
    </section>
  </Banner>;
}
