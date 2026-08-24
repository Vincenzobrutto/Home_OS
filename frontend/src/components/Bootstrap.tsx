import { useState } from 'react';
import { T } from '../theme';
import { SectionLabel } from './Shared';
import { api } from '../api';
import type { House, User } from '../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 7,
  border: `1px solid ${T.line}`,
  background: T.card,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13.5,
  color: T.ink,
  boxSizing: 'border-box',
  outline: 'none',
};
const labelStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  color: T.slate,
  marginBottom: 6,
  display: 'block',
};

// Utente già autenticato (vedi App.tsx/LoginScreen) ma senza ancora
// nessuna casa: prima esecuzione dopo la registrazione, o account esistente
// il cui unico scopo era finora l'accesso. Qui si crea solo la casa.
export function BootstrapScreen({
  existingUser,
  onReady,
}: {
  existingUser: User;
  onReady: (house: House) => void;
}) {
  const [houseName, setHouseName] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!houseName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const house = await api.houses.create({
        name: houseName.trim(),
        city: city.trim() || undefined,
      });
      onReady(house);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper }}>
      <div style={{ width: 420, background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: '30px 32px' }}>
        <SectionLabel>HomeOS</SectionLabel>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: T.ink, margin: '0 0 6px 0' }}>
          Crea la tua casa
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate, margin: '0 0 20px 0' }}>
          Accesso effettuato come {existingUser.email}.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nome/indirizzo casa</label>
          <input style={inputStyle} placeholder="Es. Via dei Glicini 14" value={houseName} onChange={(e) => setHouseName(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Città (facoltativo)</label>
          <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        <button
          onClick={submit}
          disabled={saving || !houseName.trim()}
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
          {saving ? 'Creazione…' : 'Crea casa'}
        </button>
      </div>
    </div>
  );
}
