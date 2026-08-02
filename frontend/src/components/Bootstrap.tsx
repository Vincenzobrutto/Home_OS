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

// Nessuna casa trovata per nessun utente: prima esecuzione senza seed, o DB
// appena resettato. Non c'è ancora autenticazione (vedi architettura §2),
// quindi qui creiamo davvero utente + casa invece di simulare un onboarding.
export function BootstrapScreen({
  existingUser,
  onReady,
}: {
  existingUser: User | null;
  onReady: (house: House) => void;
}) {
  const [email, setEmail] = useState(existingUser?.email ?? '');
  const [name, setName] = useState(existingUser?.name ?? '');
  const [houseName, setHouseName] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!houseName.trim() || (!existingUser && !email.trim())) return;
    setSaving(true);
    setError(null);
    try {
      const user = existingUser ?? (await api.users.create({ email: email.trim(), name: name.trim() || undefined }));
      const house = await api.houses.create({
        ownerId: user.id,
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
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: T.ink, margin: '0 0 20px 0' }}>
          Crea la tua casa
        </h1>

        {!existingUser && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nome (facoltativo)</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nome/indirizzo casa</label>
          <input style={inputStyle} placeholder="Es. Via dei Glicini 14" value={houseName} onChange={(e) => setHouseName(e.target.value)} />
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
