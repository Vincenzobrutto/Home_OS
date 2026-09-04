import { useState } from 'react';
import { T } from '../theme';
import { SectionLabel } from './Shared';
import { api } from '../api';
import type { User } from '../types';

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

type Step = 'email' | 'password' | 'set-password' | 'register';

// Un solo campo email all'ingresso, poi il passo successivo dipende da cosa
// risulta per quell'indirizzo (api.auth.accountStatus): account esistente
// con password → login; account esistente senza password (creato prima
// dell'introduzione dell'autenticazione) → imposta password una tantum,
// nessuna verifica email perché oggi l'accesso a quell'account non richiede
// già nessuna credenziale; nessun account → registrazione.
export function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail() {
    if (!email.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const status = await api.auth.accountStatus(email.trim());
      if (!status.exists) setStep('register');
      else if (!status.hasPassword) setStep('set-password');
      else setStep('password');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setChecking(false);
    }
  }

  async function submitPassword() {
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await api.auth.login({ email: email.trim(), password });
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSetPassword() {
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const user = await api.auth.setPassword({ email: email.trim(), password });
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRegister() {
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const user = await api.auth.register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  }

  function backToEmail() {
    setStep('email');
    setPassword('');
    setError(null);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.appBg }}>
      <div style={{ width: 420, background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: '30px 32px' }}>
        <SectionLabel>Dimora</SectionLabel>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: T.ink, margin: '0 0 20px 0' }}>
          Accedi
        </h1>

        {step === 'email' && (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitEmail()}
                autoFocus
              />
            </div>
            {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button onClick={submitEmail} disabled={checking || !email.trim()} style={buttonStyle}>
              {checking ? 'Verifica…' : 'Continua'}
            </button>
          </>
        )}

        {step === 'password' && (
          <>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 14 }}>{email}</div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                autoFocus
              />
            </div>
            {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button onClick={submitPassword} disabled={submitting || !password} style={buttonStyle}>
              {submitting ? 'Accesso…' : 'Accedi'}
            </button>
            <button onClick={backToEmail} style={linkButtonStyle}>Non è la tua email?</button>
          </>
        )}

        {step === 'set-password' && (
          <>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 14, lineHeight: 1.5 }}>
              Questo account (<strong>{email}</strong>) esiste già ma non ha ancora una password. Impostane una per accedere d'ora in poi.
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Nuova password (almeno 8 caratteri)</label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitSetPassword()}
                autoFocus
              />
            </div>
            {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button onClick={submitSetPassword} disabled={submitting || password.length < 8} style={buttonStyle}>
              {submitting ? 'Salvataggio…' : 'Imposta password e accedi'}
            </button>
            <button onClick={backToEmail} style={linkButtonStyle}>Non è la tua email?</button>
          </>
        )}

        {step === 'register' && (
          <>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 14 }}>
              Nessun account con <strong>{email}</strong>: crealo ora.
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nome (facoltativo)</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Password (almeno 8 caratteri)</label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
              />
            </div>
            {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button onClick={submitRegister} disabled={submitting || password.length < 8} style={buttonStyle}>
              {submitting ? 'Creazione…' : 'Crea account'}
            </button>
            <button onClick={backToEmail} style={linkButtonStyle}>Non è la tua email?</button>
          </>
        )}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
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
};

const linkButtonStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  color: T.slate,
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  marginTop: 10,
  padding: 0,
};
