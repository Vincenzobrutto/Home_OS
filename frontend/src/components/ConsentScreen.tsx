import { useState } from 'react';
import { T } from '../theme';
import { SectionLabel } from './Shared';
import { api } from '../api';
import type { User } from '../types';

// Schermo bloccante mostrato una sola volta, prima di qualunque altra vista,
// finché consentedAt è null (B55, mvp-v1.md §8) — non un banner dismissibile
// senza azione: la conferma deve essere una scelta esplicita e registrata,
// non un default silenzioso.
export function ConsentScreen({ onConsented }: { onConsented: (user: User) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      const user = await api.auth.recordConsent();
      onConsented(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.appBg, padding: 20 }}>
      <div style={{ width: 480, maxWidth: '100%', background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: '30px 32px' }}>
        <SectionLabel>Prima di iniziare</SectionLabel>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: T.ink, margin: '0 0 16px 0' }}>
          Come Dimora usa i tuoi documenti
        </h1>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, lineHeight: 1.6, marginBottom: 14 }}>
          Quando carichi un documento (fattura, certificato, manuale, foto di una targhetta), il file viene inviato a
          Claude (Anthropic) per leggerlo e proporti i dati da salvare — tipo di documento, asset a cui si riferisce,
          scadenze, garanzie. La proposta compare sempre prima di essere salvata: nulla viene scritto sulla tua casa
          senza una tua conferma esplicita.
        </div>
        <ul style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, lineHeight: 1.7, margin: '0 0 18px 0', paddingLeft: 18 }}>
          <li>I file restano archiviati sul server di Dimora, non su servizi di terze parti.</li>
          <li>Solo il contenuto del singolo documento caricato viene inviato all'AI, mai l'intera casa o la cronologia.</li>
          <li>Puoi esportare tutti i tuoi dati o eliminare l'account in qualsiasi momento dal menu laterale.</li>
        </ul>
        {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <button
          onClick={accept}
          disabled={submitting}
          style={{
            width: '100%',
            background: T.pine,
            color: '#F7F7F2',
            border: 'none',
            borderRadius: 7,
            padding: '11px 18px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          {submitting ? 'Un attimo…' : 'Ho capito, continua'}
        </button>
      </div>
    </div>
  );
}
