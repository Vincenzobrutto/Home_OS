import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Pencil, Loader2, Sparkles, X } from 'lucide-react';
import { T, ASSET_TYPES, ROOM_TYPES, iconForAsset } from '../theme';
import { SectionLabel } from './Shared';
import { api } from '../api';
import type {
  ConfirmObservationItem,
  DocumentRecord,
  GenesisResults,
  House,
  ObservationRecord,
  ScanSessionRecord,
} from '../types';

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
const primaryButtonStyle: React.CSSProperties = {
  background: T.pine,
  color: '#F7F7F2',
  border: 'none',
  borderRadius: 7,
  padding: '11px 20px',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13.5,
  fontWeight: 500,
};
const secondaryButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: T.slate,
  border: `1px solid ${T.line}`,
  borderRadius: 7,
  padding: '11px 20px',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13.5,
  fontWeight: 500,
};

type GenesisStep = 'welcome' | 'house-info' | 'documents' | 'scan' | 'review' | 'results';

const STEPS: { id: GenesisStep; label: string }[] = [
  { id: 'welcome', label: 'Benvenuto' },
  { id: 'house-info', label: 'La tua casa' },
  { id: 'documents', label: 'Documenti' },
  { id: 'scan', label: 'Scansione' },
  { id: 'review', label: 'Digital Twin' },
  { id: 'results', label: 'Risultato' },
];

// Percorso guidato Genesis (vedi docs/genesis-architecture.md): stato
// "grezzo" per step (scanSession, observations, decisioni di review) vive
// solo qui, non persistito — riprendere a metà ricomincia dallo step
// coerente con house.genesisStatus (4 valori grezzi, non uno per step),
// una scelta MVP dichiarata nelle limitazioni note, non un bug.
export function GenesisWizard({
  house,
  onHouseChanged,
  onGenesisCompleted,
  onExit,
}: {
  house: House;
  onHouseChanged: (house: House) => void;
  onGenesisCompleted: () => Promise<void>;
  onExit: () => void;
}) {
  const [step, setStep] = useState<GenesisStep>(() => {
    if (house.genesisStatus === 'COMPLETED') return 'results';
    if (house.genesisStatus === 'PROCESSING') return 'scan';
    if (house.genesisStatus === 'IN_PROGRESS') return 'house-info';
    return 'welcome';
  });
  const [scanSession, setScanSession] = useState<ScanSessionRecord | null>(null);
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [results, setResults] = useState<GenesisResults | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div style={{ padding: '36px 44px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <SectionLabel>{house.code} — Percorso Genesis</SectionLabel>
        <button onClick={onExit} aria-label="Esci dal percorso Genesis" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.slate }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 30, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {i < stepIndex ? (
                <CheckCircle2 size={14} color={T.pine} />
              ) : (
                <Circle size={14} color={i === stepIndex ? T.pine : T.line} fill={i === stepIndex ? T.pine : 'none'} />
              )}
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: i <= stepIndex ? T.ink : T.slate, fontWeight: i === stepIndex ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 16, height: 1, background: T.line }} />}
          </div>
        ))}
      </div>

      {step === 'welcome' && (
        <WelcomeStep
          onStart={async () => {
            const updated = await api.genesis.start(house.id);
            onHouseChanged(updated);
            setStep('house-info');
          }}
        />
      )}
      {step === 'house-info' && (
        <HouseInfoStep
          house={house}
          onSaved={(updated) => {
            onHouseChanged(updated);
            setStep('documents');
          }}
        />
      )}
      {step === 'documents' && <DocumentsStep house={house} onContinue={() => setStep('scan')} />}
      {step === 'scan' && (
        <ScanStep
          house={house}
          onScanned={(session, obs) => {
            setScanSession(session);
            setObservations(obs);
            setStep('review');
          }}
        />
      )}
      {step === 'review' && scanSession && (
        <ReviewStep
          house={house}
          scanSession={scanSession}
          observations={observations}
          onCompleted={async (genesisResults) => {
            setResults(genesisResults);
            await onGenesisCompleted();
            setStep('results');
          }}
        />
      )}
      {step === 'review' && !scanSession && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.slate }}>
          Nessuna scansione attiva in questa sessione.{' '}
          <button onClick={() => setStep('scan')} style={{ color: T.pine, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Torna alla scansione
          </button>
        </div>
      )}
      {step === 'results' && <ResultsStep house={house} initialResults={results} onDone={onExit} />}
    </div>
  );
}

function WelcomeStep({ onStart }: { onStart: () => Promise<void> }) {
  const [starting, setStarting] = useState(false);
  return (
    <div>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${T.pine}1A`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Sparkles size={24} color={T.pine} />
      </div>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: T.ink, margin: '0 0 10px 0' }}>
        Costruiamo il gemello digitale della tua casa
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.ink70, lineHeight: 1.6, margin: '0 0 20px 0' }}>
        In pochi minuti HomeOS raccoglie le informazioni essenziali sulla tua casa, i documenti che hai già
        e — con una scansione guidata dimostrativa — ambienti e impianti principali. Alla fine avrai una
        prima rappresentazione digitale della casa e un primo Home Score, spiegato voce per voce.
      </p>
      <ul style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink70, lineHeight: 1.9, margin: '0 0 26px 0', paddingLeft: 20 }}>
        <li>Informazioni essenziali sulla casa</li>
        <li>Documenti che hai già (facoltativo, puoi saltare)</li>
        <li>Scansione guidata dimostrativa — dati di esempio, non una vera analisi video/foto</li>
        <li>Conferma di ciò che la scansione propone</li>
        <li>Home Score e prime osservazioni</li>
      </ul>
      <button
        style={{ ...primaryButtonStyle, opacity: starting ? 0.7 : 1 }}
        disabled={starting}
        onClick={async () => {
          setStarting(true);
          try {
            await onStart();
          } finally {
            setStarting(false);
          }
        }}
      >
        {starting ? 'Avvio…' : 'Inizia'}
      </button>
    </div>
  );
}

function HouseInfoStep({ house, onSaved }: { house: House; onSaved: (house: House) => void }) {
  const [address, setAddress] = useState(house.address ?? '');
  const [city, setCity] = useState(house.city ?? '');
  const [postalCode, setPostalCode] = useState(house.postalCode ?? '');
  const [propertyType, setPropertyType] = useState(house.propertyType ?? '');
  const [country, setCountry] = useState(house.country ?? 'Italia');
  const [surfaceSqm, setSurfaceSqm] = useState(house.surfaceSqm ?? '');
  const [buildYear, setBuildYear] = useState(house.buildYear?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.genesis.saveHouseInfo(house.id, {
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        propertyType: propertyType || undefined,
        country: country.trim() || undefined,
        surfaceSqm: surfaceSqm ? Number(surfaceSqm) : undefined,
        buildYear: buildYear ? Number(buildYear) : undefined,
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: T.ink, margin: '0 0 6px 0' }}>
        La tua casa
      </h2>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.slate, margin: '0 0 22px 0' }}>
        Informazioni essenziali, tutte facoltative — puoi completarle anche in seguito.
      </p>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Indirizzo</label>
        <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Es. Via dei Glicini 14" autoFocus />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Città</label>
          <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>CAP</label>
          <input style={inputStyle} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Tipo di immobile</label>
          <select style={{ ...inputStyle, appearance: 'auto' }} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="">—</option>
            <option value="Appartamento">Appartamento</option>
            <option value="Villa">Villa</option>
            <option value="Villetta a schiera">Villetta a schiera</option>
            <option value="Attico">Attico</option>
            <option value="Altro">Altro</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Paese</label>
          <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Superficie (m²)</label>
          <input style={inputStyle} type="number" min={1} value={surfaceSqm} onChange={(e) => setSurfaceSqm(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Anno di costruzione</label>
          <input style={inputStyle} type="number" min={1800} max={2100} value={buildYear} onChange={(e) => setBuildYear(e.target.value)} />
        </div>
      </div>

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 14 }}>{error}</div>}

      <button style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={submit}>
        {saving ? 'Salvataggio…' : 'Continua'}
      </button>
    </div>
  );
}

function DocumentsStep({ house, onContinue }: { house: House; onContinue: () => void }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.documents
      .listForHouse(house.id)
      .then(setDocuments)
      .finally(() => setLoading(false));
  }, [house.id]);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const doc = await api.documents.upload(house.id, file);
      setDocuments((prev) => [doc, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: T.ink, margin: '0 0 6px 0' }}>
        Documenti
      </h2>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.slate, margin: '0 0 20px 0' }}>
        Carica ciò che hai già a portata di mano (APE, planimetria, rogito, libretti, fatture...) — facoltativo,
        puoi anche saltare e caricarli in seguito dall'Inbox.
      </p>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1.5px dashed ${T.line}`,
          borderRadius: 10,
          padding: '22px',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13.5,
          color: T.slate,
          marginBottom: 18,
        }}
      >
        {uploading ? 'Caricamento…' : 'Clicca per caricare un documento'}
        <input
          type="file"
          style={{ display: 'none' }}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </label>

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 14 }}>{error}</div>}

      {!loading && documents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
          {documents.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 12px',
                background: T.card,
                border: `1px solid ${T.line}`,
                borderRadius: 7,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: T.ink,
              }}
            >
              <span>{d.originalFilename}</span>
              <span style={{ color: T.slate, fontSize: 12 }}>{d.status}</span>
            </div>
          ))}
        </div>
      )}

      <button style={primaryButtonStyle} onClick={onContinue}>
        {documents.length > 0 ? 'Continua' : 'Continua senza documenti'}
      </button>
    </div>
  );
}

function ScanStep({
  house,
  onScanned,
}: {
  house: House;
  onScanned: (session: ScanSessionRecord, observations: ObservationRecord[]) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startScan() {
    setScanning(true);
    setError(null);
    try {
      const session = await api.genesis.startScan(house.id);
      const observations = await api.genesis.getScanResults(house.id, session.id);
      onScanned(session, observations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: T.ink, margin: '0 0 6px 0' }}>
        Scansione guidata
      </h2>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.slate, margin: '0 0 8px 0', lineHeight: 1.6 }}>
        Questa è una scansione <strong>dimostrativa</strong>: propone ambienti e impianti tipici di una casa a
        titolo di esempio, non è una vera analisi di foto o video. Nella prossima schermata potrai rivedere,
        modificare, confermare o scartare ogni elemento proposto prima che entri nel gemello digitale.
      </p>
      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, margin: '12px 0' }}>{error}</div>}
      <button style={{ ...primaryButtonStyle, marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: scanning ? 0.7 : 1 }} disabled={scanning} onClick={startScan}>
        {scanning && <Loader2 size={15} className="spin" />}
        {scanning ? 'Scansione in corso…' : 'Avvia scansione guidata (demo)'}
      </button>
    </div>
  );
}

function ReviewStep({
  house,
  scanSession,
  observations,
  onCompleted,
}: {
  house: House;
  scanSession: ScanSessionRecord;
  observations: ObservationRecord[];
  onCompleted: (results: GenesisResults) => Promise<void>;
}) {
  // Un elemento che assomiglia a qualcosa già in casa parte scartato per
  // default (l'utente può comunque confermarlo se è davvero un elemento
  // diverso) — evita di duplicare ambienti/asset già censiti senza dover
  // notare ogni volta l'avviso, vedi genesis-architecture.md.
  const [decisions, setDecisions] = useState<Record<string, ConfirmObservationItem>>(() =>
    Object.fromEntries(
      observations.map((o) => [
        o.id,
        { observationId: o.id, action: o.possibleDuplicate ? ('reject' as const) : ('confirm' as const) },
      ]),
    ),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomObservations = observations.filter((o) => o.entityType === 'ROOM');
  const assetObservations = observations.filter((o) => o.entityType === 'ASSET');

  function setAction(id: string, action: ConfirmObservationItem['action']) {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], observationId: id, action } }));
  }
  function setEdit(id: string, name: string) {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], observationId: id, action: 'edit', name } }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.genesis.confirmObservations(house.id, scanSession.id, Object.values(decisions));
      const results = await api.genesis.complete(house.id);
      await onCompleted(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: T.ink, margin: '0 0 6px 0' }}>
        Rivedi il Digital Twin
      </h2>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.slate, margin: '0 0 20px 0' }}>
        Conferma, modifica il nome o scarta ogni elemento proposto dalla scansione demo. Solo gli elementi
        confermati entreranno nel gemello digitale della casa.
      </p>

      {roomObservations.length > 0 && (
        <>
          <SectionLabel>Ambienti proposti</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {roomObservations.map((o) => (
              <ObservationRow
                key={o.id}
                observation={o}
                icon={ROOM_TYPES[o.proposedCategory ?? '']?.icon}
                decision={decisions[o.id]}
                editing={editingId === o.id}
                onEditToggle={() => setEditingId(editingId === o.id ? null : o.id)}
                onAction={(a) => setAction(o.id, a)}
                onEditName={(name) => setEdit(o.id, name)}
                possibleDuplicate={o.possibleDuplicate}
              />
            ))}
          </div>
        </>
      )}

      {assetObservations.length > 0 && (
        <>
          <SectionLabel>Impianti e asset proposti</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {assetObservations.map((o) => (
              <ObservationRow
                key={o.id}
                observation={o}
                icon={ASSET_TYPES[o.proposedCategory ?? '']?.icon ?? iconForAsset({ type: o.proposedCategory ?? '', name: o.proposedName })}
                decision={decisions[o.id]}
                editing={editingId === o.id}
                onEditToggle={() => setEditingId(editingId === o.id ? null : o.id)}
                onAction={(a) => setAction(o.id, a)}
                onEditName={(name) => setEdit(o.id, name)}
                roomHint={o.payload.roomName ?? null}
                possibleDuplicate={o.possibleDuplicate}
              />
            ))}
          </div>
        </>
      )}

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 14 }}>{error}</div>}

      <button style={{ ...primaryButtonStyle, opacity: submitting ? 0.7 : 1 }} disabled={submitting} onClick={submit}>
        {submitting ? 'Completamento…' : 'Conferma e completa Genesis'}
      </button>
    </div>
  );
}

function ObservationRow({
  observation,
  icon: Icon,
  decision,
  editing,
  onEditToggle,
  onAction,
  onEditName,
  roomHint,
  possibleDuplicate,
}: {
  observation: ObservationRecord;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  decision: ConfirmObservationItem;
  editing: boolean;
  onEditToggle: () => void;
  onAction: (action: ConfirmObservationItem['action']) => void;
  onEditName: (name: string) => void;
  roomHint?: string | null;
  possibleDuplicate?: { id: string; name: string } | null;
}) {
  const rejected = decision?.action === 'reject';
  const displayName = decision?.action === 'edit' ? decision.name ?? observation.proposedName : observation.proposedName;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 9,
        opacity: rejected ? 0.5 : 1,
      }}
    >
      {Icon && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${T.pine}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={T.pine} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            style={{ ...inputStyle, padding: '6px 8px', fontSize: 13 }}
            value={displayName}
            autoFocus
            onChange={(e) => onEditName(e.target.value)}
            onBlur={onEditToggle}
          />
        ) : (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>{displayName}</div>
        )}
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.slate }}>
          confidenza {Math.round(observation.confidence * 100)}%{roomHint ? ` · ${roomHint}` : roomHint === null ? ' · impianto di casa' : ''}
        </div>
        {possibleDuplicate && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.ochreDeep, marginTop: 2 }}>
            Sembra già esistere: "{possibleDuplicate.name}" — lasciato su Scarta, conferma solo se è un elemento diverso.
          </div>
        )}
      </div>
      <button
        onClick={onEditToggle}
        aria-label="Modifica nome"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: decision?.action === 'edit' ? T.pine : T.slate }}
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => onAction(rejected ? 'confirm' : 'reject')}
        style={{
          ...secondaryButtonStyle,
          padding: '6px 12px',
          fontSize: 12,
          color: rejected ? T.pine : T.rust,
          borderColor: rejected ? T.pine : T.line,
        }}
      >
        {rejected ? 'Ripristina' : 'Scarta'}
      </button>
    </div>
  );
}

function ResultsStep({
  house,
  initialResults,
  onDone,
}: {
  house: House;
  initialResults: GenesisResults | null;
  onDone: () => void;
}) {
  const [results, setResults] = useState<GenesisResults | null>(initialResults);
  const [loading, setLoading] = useState(!initialResults);

  useEffect(() => {
    if (!initialResults) {
      api.genesis
        .getResults(house.id)
        .then(setResults)
        .finally(() => setLoading(false));
    }
  }, [house.id, initialResults]);

  if (loading || !results) {
    return <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.slate }}>Caricamento…</div>;
  }

  const score = results.score;
  const dimensions = score
    ? [
        { label: 'Documentazione', value: score.documentationScore },
        { label: 'Manutenzione', value: score.maintenanceScore },
        { label: 'Sicurezza', value: score.safetyScore },
        { label: 'Efficienza', value: score.efficiencyScore },
        { label: 'Completezza', value: score.completenessScore },
      ]
    : [];

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: T.ink, margin: '0 0 6px 0' }}>
        Il tuo gemello digitale è pronto
      </h2>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.slate, margin: '0 0 22px 0' }}>
        {results.confirmedRoomsCount} ambienti e {results.confirmedAssetsCount} asset confermati.
      </p>

      {score && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 26, padding: '18px 20px', background: T.card, border: `1px solid ${T.line}`, borderRadius: 12 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 44, color: T.pine, lineHeight: 1 }}>{score.overallScore}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.slate, marginTop: 4 }}>Home Score /100</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dimensions.map((d) => (
              <div key={d.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, marginBottom: 2 }}>
                  <span>{d.label}</span>
                  <span>{d.value}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: T.line }}>
                  <div style={{ height: 5, borderRadius: 3, width: `${d.value}%`, background: T.pine }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.issues.length > 0 && (
        <>
          <SectionLabel>Da tenere d'occhio</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
            {results.issues.map((issue) => (
              <div key={issue.id} style={{ padding: '10px 14px', background: T.card, border: `1px solid ${T.line}`, borderLeft: `3px solid ${issue.severity === 'HIGH' ? T.rust : T.ochreDeep}`, borderRadius: 8 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.ink }}>{issue.title}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate, marginTop: 2 }}>{issue.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {results.recommendations.length > 0 && (
        <>
          <SectionLabel>Consigliato</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 26 }}>
            {results.recommendations.map((rec) => (
              <div key={rec.id} style={{ padding: '10px 14px', background: T.card, border: `1px solid ${T.line}`, borderRadius: 8 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.ink }}>{rec.title}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate, marginTop: 2 }}>{rec.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <button style={primaryButtonStyle} onClick={onDone}>
        Vai alla Dashboard
      </button>
    </div>
  );
}
