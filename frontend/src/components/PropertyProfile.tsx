import { useMemo, useState } from 'react';
import { Check, Edit3, FileCheck2, Save, X } from 'lucide-react';
import { api } from '../api';
import { T } from '../theme';
import type { FieldProvenance, House } from '../types';
import { ProvenanceBadge, SectionLabel, Stamp } from './Shared';

type ProfileValue = string | number | null;
type FieldDef = {
  key: keyof House;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  suffix?: string;
  options?: string[];
  hint?: string;
};

const SECTIONS: Array<{ title: string; source: string; fields: FieldDef[] }> = [
  {
    title: 'Identificazione',
    source: 'Utente, atto o visura catastale',
    fields: [
      { key: 'address', label: 'Indirizzo' },
      { key: 'postalCode', label: 'CAP' },
      { key: 'city', label: 'Comune' },
      { key: 'province', label: 'Provincia' },
      { key: 'country', label: 'Paese' },
      { key: 'propertyType', label: 'Tipologia abitazione', type: 'select', options: ['Appartamento', 'Casa indipendente', 'Villa', 'Villetta a schiera', 'Rustico', 'Altro'] },
    ],
  },
  {
    title: 'Caratteristiche fisiche',
    source: 'Elaborato tecnico, planimetria, APE o dichiarazione',
    fields: [
      { key: 'surfaceSqm', label: 'Superficie dichiarata', type: 'number', suffix: 'm²', hint: 'Non confonderla con la superficie catastale o riscaldata.' },
      { key: 'usableSurfaceSqm', label: 'Superficie calpestabile', type: 'number', suffix: 'm²' },
      { key: 'heatedSurfaceSqm', label: 'Superficie utile riscaldata', type: 'number', suffix: 'm²' },
      { key: 'floorsCount', label: 'Numero livelli', type: 'number' },
      { key: 'buildYear', label: 'Anno di costruzione', type: 'number' },
      { key: 'renovationYear', label: 'Ultima ristrutturazione importante', type: 'number' },
    ],
  },
  {
    title: 'Dati catastali',
    source: 'Visura catastale aggiornata',
    fields: [
      { key: 'cadastralMunicipality', label: 'Comune catastale' },
      { key: 'cadastralMunicipalityCode', label: 'Codice catastale' },
      { key: 'cadastralSection', label: 'Sezione' },
      { key: 'cadastralSheet', label: 'Foglio' },
      { key: 'cadastralParcel', label: 'Particella' },
      { key: 'cadastralSubaltern', label: 'Subalterno' },
      { key: 'cadastralCategory', label: 'Categoria' },
      { key: 'cadastralClass', label: 'Classe' },
      { key: 'cadastralConsistency', label: 'Consistenza' },
      { key: 'cadastralSurfaceSqm', label: 'Superficie catastale', type: 'number', suffix: 'm²' },
      { key: 'cadastralIncome', label: 'Rendita catastale', type: 'number', suffix: '€' },
    ],
  },
  {
    title: 'Prestazione energetica',
    source: 'Attestato di Prestazione Energetica (APE)',
    fields: [
      { key: 'apeCode', label: 'Codice APE' },
      { key: 'apeIssuedAt', label: 'Data emissione', type: 'date' },
      { key: 'apeExpiresAt', label: 'Data scadenza', type: 'date' },
      { key: 'energyClass', label: 'Classe energetica', type: 'select', options: ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] },
      { key: 'epglNren', label: 'EPgl,nren', type: 'number', suffix: 'kWh/m² anno' },
      { key: 'epglRen', label: 'EPgl,ren', type: 'number', suffix: 'kWh/m² anno' },
      { key: 'co2Emissions', label: 'Emissioni CO₂', type: 'number', suffix: 'kg/m² anno' },
      { key: 'climateZone', label: 'Zona climatica', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F'] },
      { key: 'energyUseCategory', label: 'Destinazione d’uso energetica' },
    ],
  },
  {
    title: 'Agibilità',
    source: 'Certificato o Segnalazione certificata di agibilità',
    fields: [
      { key: 'habitabilityStatus', label: 'Stato', type: 'select', options: ['Presente', 'Assente', 'Non reperito', 'Da verificare'] },
      { key: 'habitabilityDate', label: 'Data', type: 'date' },
      { key: 'habitabilityProtocol', label: 'Protocollo' },
    ],
  },
];

function rawValue(house: House, key: keyof House): string {
  const value = house[key];
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return String(value);
}

function shownValue(value: unknown, field: FieldDef): string {
  if (value === null || value === undefined || value === '') return 'Non disponibile';
  if (field.type === 'date') return new Date(String(value)).toLocaleDateString('it-IT', { timeZone: 'UTC' });
  return `${value}${field.suffix ? ` ${field.suffix}` : ''}`;
}

export function PropertyProfile({ house, onHouseChanged }: { house: House; onHouseChanged: (house: House) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provenance = useMemo(() => new Map((house.fieldProvenance ?? []).map((item) => [item.fieldName, item])), [house.fieldProvenance]);
  const completeness = house.propertyProfileCompleteness ?? 0;

  function startEdit() {
    setForm(Object.fromEntries(SECTIONS.flatMap((section) => section.fields.map((field) => [field.key, rawValue(house, field.key)]))));
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, ProfileValue> = {};
      for (const field of SECTIONS.flatMap((section) => section.fields)) {
        const raw = (form[field.key] ?? '').trim();
        payload[field.key] = field.type === 'number' ? (raw ? Number(raw) : null) : (raw || null);
      }
      const updated = await api.houses.updatePropertyProfile(house.id, payload);
      onHouseChanged(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossibile salvare il profilo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 980 }}>
      <SectionLabel>Property Digital Record</SectionLabel>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, color: T.ink, margin: '0 0 7px' }}>Profilo casa</h1>
          <div style={{ color: T.slate, fontSize: 13, maxWidth: 620 }}>Una scheda strutturata dell’immobile. Ogni valore conserva la propria provenienza; planimetria, visura e APE restano documenti distinti.</div>
        </div>
        {!editing ? (
          <button onClick={startEdit} style={primaryButton}><Edit3 size={14} /> Modifica profilo</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} disabled={saving} style={secondaryButton}><X size={14} /> Annulla</button>
            <button onClick={save} disabled={saving} style={primaryButton}><Save size={14} /> {saving ? 'Salvataggio…' : 'Salva'}</button>
          </div>
        )}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
          <div style={{ fontWeight: 600, color: T.ink }}>Completezza del profilo</div><Stamp tone={completeness >= 75 ? 'pine' : completeness >= 40 ? 'ochre' : 'rust'}>{completeness}%</Stamp>
        </div>
        <div style={{ height: 8, background: T.paper, borderRadius: 8, overflow: 'hidden' }}><div style={{ width: `${completeness}%`, height: '100%', background: completeness >= 75 ? T.pine : T.ochreDeep, transition: 'width .2s' }} /></div>
        <div style={{ fontSize: 11.5, color: T.slate, marginTop: 8 }}>Misura i dati identificativi, catastali ed energetici essenziali; i dettagli avanzati non abbassano il punteggio.</div>
      </div>

      {error && <div style={{ color: T.rust, border: `1px solid ${T.rust}`, borderRadius: 7, padding: 10, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {SECTIONS.map((section) => (
          <section key={section.title} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, color: T.ink, margin: 0 }}>{section.title}</h2>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: T.slate }}><FileCheck2 size={13} /> Fonte tipica: {section.source}</span>
            </div>
            <div className="property-profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px 22px' }}>
              {section.fields.map((field) => {
                const fieldProvenance = provenance.get(field.key as string) as FieldProvenance | undefined;
                return (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: 11.5, color: T.slate, marginBottom: 5 }}>{field.label}</label>
                    {editing ? (
                      field.type === 'select' ? (
                        <select value={form[field.key] ?? ''} onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))} style={inputStyle}>
                          <option value="">— non disponibile —</option>{field.options?.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><input type={field.type ?? 'text'} step={field.type === 'number' ? 'any' : undefined} min={field.type === 'number' ? 0 : undefined} value={form[field.key] ?? ''} onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))} style={inputStyle} />{field.suffix && <span style={{ fontSize: 11, color: T.slate }}>{field.suffix}</span>}</div>
                      )
                    ) : (
                      <div style={{ minHeight: 24, color: house[field.key] == null || house[field.key] === '' ? T.slate : T.ink, fontWeight: house[field.key] == null || house[field.key] === '' ? 400 : 500, fontSize: 13.5 }}>
                        {shownValue(house[field.key], field)}
                        {fieldProvenance && <ProvenanceBadge {...fieldProvenance} />}
                      </div>
                    )}
                    {field.hint && <div style={{ color: T.slate, fontSize: 10.5, marginTop: 4 }}>{field.hint}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {!editing && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.slate, fontSize: 11.5, marginTop: 14 }}><Check size={13} color={T.pine} /> I valori salvati manualmente sono marcati come dichiarati dall’utente; nessun dato viene certificato automaticamente.</div>}
    </div>
  );
}

const primaryButton = { display: 'flex', alignItems: 'center', gap: 7, border: 'none', borderRadius: 7, padding: '9px 14px', background: T.pine, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12.5 } as const;
const secondaryButton = { ...primaryButton, background: 'transparent', color: T.slate, border: `1px solid ${T.line}` } as const;
const inputStyle = { width: '100%', boxSizing: 'border-box', border: `1px solid ${T.line}`, borderRadius: 6, padding: '8px 9px', background: '#fff', color: T.ink, fontFamily: "'Inter', sans-serif", fontSize: 12.5 } as const;
