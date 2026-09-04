import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, Globe, Sparkles, Upload, XCircle } from 'lucide-react';
import { T, ASSET_TYPES, ROOM_TYPES } from '../theme';
import { SectionLabel, Stamp } from './Shared';
import { AddRoomModal } from './Modals';
import { api } from '../api';
import type { Asset, DocumentMaintenanceProposal, DocumentRecord, FloorPlanRoomProposal, House, PropertyProfileFields, Room, UtilityBillFields } from '../types';

interface RoomDecision {
  action: 'create' | 'update' | 'skip';
  roomId: string;
  type: string;
}

function FloorPlanProposal({
  proposals,
  rooms,
  onApply,
  busy,
}: {
  proposals: FloorPlanRoomProposal[];
  rooms: Room[];
  onApply: (
    decisions: Array<{ action: 'create' | 'update' | 'skip'; roomId?: string; type?: string; name?: string; x: number; y: number; width: number; height: number }>,
  ) => void;
  busy: boolean;
}) {
  const [decisions, setDecisions] = useState<RoomDecision[]>(() => {
    // Ogni ambiente esistente può essere il default di una sola proposta:
    // se la planimetria mostra due bagni ma la casa ne ha uno solo censito,
    // solo il primo si aggancia di default, il secondo propone "crea nuovo"
    // invece di puntare silenziosamente allo stesso ambiente.
    const claimed = new Set<string>();
    return proposals.map((p) => {
      const suggestedType = p.suggestedType?.toUpperCase();
      const match = suggestedType
        ? rooms.find((r) => r.type === suggestedType && !claimed.has(r.id))
        : undefined;
      if (match) {
        claimed.add(match.id);
        return { action: 'update' as const, roomId: match.id, type: match.type };
      }
      return { action: 'create' as const, roomId: '', type: suggestedType ?? 'CUCINA' };
    });
  });

  function update(idx: number, patch: Partial<RoomDecision>) {
    setDecisions((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 12 }}>
        {proposals.length} ambient{proposals.length === 1 ? 'e riconosciuto' : 'i riconosciuti'} nella planimetria. Per ciascuno scegli se aggiornare un ambiente esistente, crearne uno nuovo, o ignorarlo.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {proposals.map((p, idx) => {
          const d = decisions[idx];
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.paper, borderRadius: 7, padding: '9px 12px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500, color: T.ink, minWidth: 110 }}>{p.name}</span>
              <select
                value={d.action}
                onChange={(e) => update(idx, { action: e.target.value as RoomDecision['action'] })}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, padding: '5px 8px', borderRadius: 5, border: `1px solid ${T.line}` }}
              >
                <option value="create">Crea nuovo ambiente</option>
                <option value="update">Aggiorna ambiente esistente</option>
                <option value="skip">Ignora</option>
              </select>
              {d.action === 'update' && (
                <select
                  value={d.roomId}
                  onChange={(e) => update(idx, { roomId: e.target.value })}
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, padding: '5px 8px', borderRadius: 5, border: `1px solid ${T.line}` }}
                >
                  <option value="">— seleziona —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              {d.action === 'create' && (
                <select
                  value={d.type}
                  onChange={(e) => update(idx, { type: e.target.value })}
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, padding: '5px 8px', borderRadius: 5, border: `1px solid ${T.line}` }}
                >
                  {Object.entries(ROOM_TYPES).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={() =>
          onApply(
            decisions.map((d, idx) => ({
              action: d.action,
              roomId: d.action === 'update' ? d.roomId : undefined,
              type: d.action === 'create' ? d.type : undefined,
              name: d.action === 'create' ? proposals[idx].name : undefined,
              x: proposals[idx].x,
              y: proposals[idx].y,
              width: proposals[idx].width,
              height: proposals[idx].height,
            })),
          )
        }
        disabled={busy || decisions.some((d) => d.action === 'update' && !d.roomId)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}
      >
        <CheckCircle2 size={13} /> {busy ? 'Applico…' : 'Applica planimetria'}
      </button>
    </div>
  );
}

function UtilityBillProposal({
  doc,
  fields,
  busy,
  onConfirm,
}: {
  doc: DocumentRecord;
  fields: UtilityBillFields;
  busy: boolean;
  onConfirm: (data: Parameters<typeof api.documents.confirmUtilityBill>[1]) => void;
}) {
  const [supplier, setSupplier] = useState(fields.supplier ?? '');
  const [periods, setPeriods] = useState(() => fields.periods.map((period) => ({ ...period })));
  const invalid = periods.length === 0 || periods.some((period) => !period.periodStart || !period.periodEnd || period.periodEnd < period.periodStart || !(period.consumptionKwh > 0));
  const spansMonths = (start: string, end: string) => start.slice(0, 7) !== end.slice(0, 7);

  function updatePeriod(index: number, patch: Partial<(typeof periods)[number]>) {
    setPeriods((current) => current.map((period, i) => i === index ? { ...period, ...patch } : period));
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <Stamp tone={doc.aiConfidence && Number(doc.aiConfidence) > 90 ? 'pine' : doc.aiConfidence && Number(doc.aiConfidence) > 80 ? 'ochre' : 'rust'}>confidenza {doc.aiConfidence}%</Stamp>
        <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink }}>Bolletta elettrica riconosciuta</strong>
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.ink70, lineHeight: 1.5, margin: '0 0 12px' }}>Controlla periodo, kWh e importo. I consumi entrano nel monitoraggio solo dopo la tua conferma.</p>
      <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, marginBottom: 12 }}>
        Fornitore
        <input value={supplier} onChange={(event) => setSupplier(event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, padding: '7px 9px', border: `1px solid ${T.line}`, borderRadius: 6, fontFamily: "'Inter', sans-serif" }} />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {periods.map((period, index) => (
          <div key={index} style={{ padding: 10, border: `1px solid ${T.line}`, borderRadius: 7, background: T.paper }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 8 }}>
              <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.slate }}>Dal<input type="date" value={period.periodStart} onChange={(event) => updatePeriod(index, { periodStart: event.target.value })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 3, padding: 6, border: `1px solid ${T.line}`, borderRadius: 5 }} /></label>
              <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.slate }}>Al<input type="date" value={period.periodEnd} onChange={(event) => updatePeriod(index, { periodEnd: event.target.value })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 3, padding: 6, border: `1px solid ${T.line}`, borderRadius: 5 }} /></label>
              <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.slate }}>Consumo (kWh)<input type="number" min="0.001" step="0.001" value={period.consumptionKwh} onChange={(event) => updatePeriod(index, { consumptionKwh: Number(event.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 3, padding: 6, border: `1px solid ${T.line}`, borderRadius: 5 }} /></label>
              <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.slate }}>Importo (€)<input type="number" min="0" step="0.01" value={period.amount ?? ''} onChange={(event) => updatePeriod(index, { amount: event.target.value === '' ? null : Number(event.target.value) })} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 3, padding: 6, border: `1px solid ${T.line}`, borderRadius: 5 }} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 7 }}>
              {spansMonths(period.periodStart, period.periodEnd) ? <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: T.ochreDeep }}>Il grafico ripartirà questo totale per giorni e lo indicherà con ~.</span> : <span />}
              {periods.length > 1 && <button onClick={() => setPeriods((current) => current.filter((_, i) => i !== index))} style={{ border: 'none', background: 'none', color: T.rust, cursor: 'pointer', fontSize: 11 }}>Rimuovi</button>}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setPeriods((current) => [...current, { periodStart: '', periodEnd: '', consumptionKwh: 0, amount: null }])} style={{ marginTop: 9, border: 'none', background: 'none', color: T.pine, cursor: 'pointer', padding: 0, fontFamily: "'Inter', sans-serif", fontSize: 11.5 }}>+ Aggiungi periodo mensile</button>
      <div style={{ marginTop: 12 }}>
        <button disabled={busy || invalid} onClick={() => onConfirm({ supplier: supplier.trim() || null, periods })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: invalid ? 'default' : 'pointer', opacity: invalid ? 0.55 : 1, fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}><CheckCircle2 size={13} /> {busy ? 'Salvataggio…' : 'Conferma consumi elettrici'}</button>
      </div>
    </div>
  );
}

const PROPERTY_LABELS: Record<string, string> = {
  address: 'Indirizzo', postalCode: 'CAP', city: 'Comune', province: 'Provincia', country: 'Paese', propertyType: 'Tipologia abitazione',
  surfaceSqm: 'Superficie dichiarata', buildYear: 'Anno di costruzione', renovationYear: 'Anno ristrutturazione', floorsCount: 'Numero livelli',
  usableSurfaceSqm: 'Superficie calpestabile', heatedSurfaceSqm: 'Superficie utile riscaldata', cadastralMunicipality: 'Comune catastale',
  cadastralMunicipalityCode: 'Codice catastale', cadastralSection: 'Sezione', cadastralSheet: 'Foglio', cadastralParcel: 'Particella',
  cadastralSubaltern: 'Subalterno', cadastralCategory: 'Categoria catastale', cadastralClass: 'Classe catastale', cadastralConsistency: 'Consistenza',
  cadastralSurfaceSqm: 'Superficie catastale', cadastralIncome: 'Rendita catastale', apeCode: 'Codice APE', apeIssuedAt: 'Emissione APE',
  apeExpiresAt: 'Scadenza APE', energyClass: 'Classe energetica', epglNren: 'EPgl,nren', epglRen: 'EPgl,ren', co2Emissions: 'Emissioni CO₂',
  climateZone: 'Zona climatica', energyUseCategory: 'Destinazione energetica', habitabilityStatus: 'Stato agibilità', habitabilityDate: 'Data agibilità', habitabilityProtocol: 'Protocollo agibilità',
};
const PROPERTY_NUMBER_FIELDS = new Set(['surfaceSqm', 'buildYear', 'renovationYear', 'floorsCount', 'usableSurfaceSqm', 'heatedSurfaceSqm', 'cadastralSurfaceSqm', 'cadastralIncome', 'epglNren', 'epglRen', 'co2Emissions']);
const PROPERTY_DATE_FIELDS = new Set(['apeIssuedAt', 'apeExpiresAt', 'habitabilityDate']);

function PropertyProfileProposal({ house, fields, busy, onConfirm }: { house: House; fields: PropertyProfileFields; busy: boolean; onConfirm: (fields: Record<string, string | number | null>) => void }) {
  const entries = Object.entries(fields.fields).filter(([, value]) => value !== null && value !== '');
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(entries.map(([key, value]) => [key, String(value)])));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(entries.filter(([key]) => house[key as keyof House] == null || house[key as keyof House] === '').map(([key]) => key)));
  function toggle(key: string) { setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }
  const payload = Object.fromEntries([...selected].map((key) => [key, PROPERTY_NUMBER_FIELDS.has(key) ? Number(values[key]) : values[key]]));

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
      <strong style={{ fontSize: 13, color: T.ink }}>Dati dell’immobile riconosciuti</strong>
      <p style={{ fontSize: 12, color: T.ink70, lineHeight: 1.5 }}>Controlla i valori: sono applicati solo ai campi vuoti. I dati già presenti sono evidenziati e non vengono sovrascritti.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {entries.map(([key]) => {
          const existing = house[key as keyof House];
          const conflict = existing !== null && existing !== undefined && existing !== '';
          return (
            <label key={key} className="property-proposal-row" style={{ display: 'grid', gridTemplateColumns: '22px minmax(130px, .8fr) minmax(160px, 1.2fr)', gap: 8, alignItems: 'center', padding: 8, borderRadius: 6, background: conflict ? '#FFF7E6' : T.paper }}>
              <input type="checkbox" checked={selected.has(key)} disabled={conflict} onChange={() => toggle(key)} />
              <span style={{ fontSize: 11.5, color: T.slate }}>{PROPERTY_LABELS[key] ?? key}</span>
              <input type={PROPERTY_DATE_FIELDS.has(key) ? 'date' : PROPERTY_NUMBER_FIELDS.has(key) ? 'number' : 'text'} step={PROPERTY_NUMBER_FIELDS.has(key) ? 'any' : undefined} value={values[key] ?? ''} disabled={conflict} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} style={{ border: `1px solid ${T.line}`, borderRadius: 5, padding: '6px 8px', minWidth: 0 }} />
              {conflict && <span style={{ gridColumn: '2 / -1', fontSize: 10.5, color: T.ochreDeep }}>Già presente: {String(existing)}. Modificabile solo dal Profilo casa.</span>}
            </label>
          );
        })}
      </div>
      <button disabled={busy} onClick={() => onConfirm(payload)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, background: T.pine, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontSize: 12.5, fontWeight: 500 }}><CheckCircle2 size={13} /> {busy ? 'Salvataggio…' : selected.size ? `Conferma ${selected.size} dati` : 'Archivia senza modificare il profilo'}</button>
    </div>
  );
}

export function InboxView({
  houseId,
  house,
  assets,
  rooms,
  onAssetLinked,
  onRoomsChanged,
  onPropertyProfileChanged,
  hideHeader,
}: {
  houseId: string;
  house: House;
  assets: Asset[];
  rooms: Room[];
  onAssetLinked: () => void;
  onRoomsChanged: () => void;
  onPropertyProfileChanged: () => void;
  // Quando la vista è annidata dentro InboxHub (vedi InboxHub.tsx), l'intestazione
  // "Acquisizione documenti / Inbox" e il padding di pagina li fornisce l'hub —
  // qui resta solo il pulsante di upload, spostato sulla riga dei tab.
  hideHeader?: boolean;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [busyDocIds, setBusyDocIds] = useState<Set<string>>(new Set());
  const [pickingAssetFor, setPickingAssetFor] = useState<string | null>(null);
  // Percorso alternativo quando l'AI non riesce a leggere un documento
  // (B57): mai un vicolo cieco, l'utente può sempre collegarlo a mano.
  const [manualClassifyFor, setManualClassifyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Input separato con `capture`: su mobile apre direttamente la fotocamera
  // invece del selettore file/galleria del primo input — stesso upload,
  // stessa pipeline di analisi, solo un punto d'ingresso più rapido per
  // scattare sul momento la foto di un oggetto o della sua etichetta.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  async function refresh() {
    setDocuments(await api.documents.listForHouse(houseId));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [houseId]);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ done: i, total: files.length });
        await api.documents.upload(houseId, files[i]);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await uploadFiles(files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current += 1;
      setDragActive(true);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    await uploadFiles(files);
  }

  async function analyze(docId: string) {
    setAnalyzingIds((current) => new Set(current).add(docId));
    setError(null);
    try {
      await api.documents.analyze(docId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setAnalyzingIds((current) => {
        const next = new Set(current);
        next.delete(docId);
        return next;
      });
    }
  }

  async function searchOnline(docId: string) {
    setBusyDocIds(new Set([docId]));
    setError(null);
    try {
      await api.documents.searchOnline(docId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setBusyDocIds(new Set());
    }
  }

  async function discardDocument(docId: string) {
    if (!window.confirm('Scartare questo documento? Se non riguarda nessun asset della casa, sparirà dall\'Inbox — resta comunque in archivio, non viene eliminato.')) {
      return;
    }
    setBusyDocIds(new Set([docId]));
    setError(null);
    try {
      await api.documents.ignoreDocument(docId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setBusyDocIds(new Set());
    }
  }

  async function confirm(docId: string, data: { assetId?: string; createAssetType?: string; assetName?: string; quantity?: number; roomId?: string; linkToHouse?: boolean; applyFields: boolean }) {
    setBusyDocIds(new Set([docId]));
    setError(null);
    try {
      await api.documents.confirm(docId, data);
      setPickingAssetFor(null);
      await refresh();
      onAssetLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setBusyDocIds(new Set());
    }
  }

  async function confirmFloorPlan(docId: string, decisions: Parameters<typeof api.documents.confirmFloorPlan>[1]) {
    setBusyDocIds(new Set([docId]));
    setError(null);
    try {
      await api.documents.confirmFloorPlan(docId, decisions);
      await refresh();
      onRoomsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setBusyDocIds(new Set());
    }
  }

  async function confirmUtilityBill(docId: string, data: Parameters<typeof api.documents.confirmUtilityBill>[1]) {
    setBusyDocIds(new Set([docId]));
    setError(null);
    try {
      await api.documents.confirmUtilityBill(docId, data);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setBusyDocIds(new Set());
    }
  }

  async function confirmPropertyProfile(docId: string, fields: Record<string, string | number | null>) {
    setBusyDocIds(new Set([docId])); setError(null);
    try { await api.documents.confirmPropertyProfile(docId, fields); await refresh(); onPropertyProfileChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Errore imprevisto'); }
    finally { setBusyDocIds(new Set()); }
  }

  const visibleDocs = documents.filter((d) => d.status !== 'CONFIRMED');

  return (
    <div style={hideHeader ? undefined : { padding: '36px 44px', maxWidth: 820 }}>
      {!hideHeader && <SectionLabel>Acquisizione documenti</SectionLabel>}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: hideHeader ? 'flex-end' : 'space-between', marginBottom: 26 }}>
        {!hideHeader && (
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: 0 }}>
            Inbox
          </h1>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            title="Scatta una foto dell'oggetto o della sua etichetta — utile soprattutto dal cellulare"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: T.pine,
              border: `1px solid ${T.pine}`,
              borderRadius: 7,
              padding: '9px 15px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Camera size={15} /> Scatta foto
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: T.pine,
              color: '#F7F7F2',
              border: 'none',
              borderRadius: 7,
              padding: '9px 15px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Upload size={15} />{' '}
            {uploadProgress ? `Caricamento ${uploadProgress.done + 1}/${uploadProgress.total}…` : uploading ? 'Caricamento…' : 'Carica documento'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
      </div>

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          borderRadius: 10,
          transition: 'background-color 0.15s, box-shadow 0.15s',
          background: dragActive ? '#EEF2EC' : 'transparent',
          boxShadow: dragActive ? `0 0 0 2px ${T.pine} inset` : 'none',
        }}
      >
        {!loading && visibleDocs.length === 0 && (
          <div
            style={{
              border: `1px dashed ${dragActive ? T.pine : T.line}`,
              borderRadius: 10,
              padding: '50px 20px',
              textAlign: 'center',
              color: dragActive ? T.pine : T.slate,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13.5,
            }}
          >
            {dragActive
              ? 'Rilascia i file per caricarli'
              : "Inbox vuota. Carica un documento (PDF, PNG, JPG o WEBP) — fatture, certificati, manuali, o anche una planimetria — per vedere l'AI proporre la classificazione, oppure trascinalo qui."}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleDocs.map((doc) => {
            const fields = doc.extractedFields;
            const busy = busyDocIds.has(doc.id);
            const relatedDocs = (doc.relatedDocumentIds ?? [])
              .map((id) => documents.find((d) => d.id === id))
              .filter((d): d is DocumentRecord => !!d && d.status === 'ANALYZED');

            return (
            <div key={doc.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={17} color={T.slate} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>{doc.originalFilename}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                    Caricato {new Date(doc.uploadedAt).toLocaleString('it-IT')}
                  </div>
                </div>
                {doc.status === 'PENDING' && (
                  <button
                    onClick={() => analyze(doc.id)}
                    disabled={analyzingIds.has(doc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'transparent',
                      border: `1px solid ${T.pine}`,
                      color: T.pine,
                      borderRadius: 6,
                      padding: '7px 12px',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    <Sparkles size={13} /> {analyzingIds.has(doc.id) ? 'Analisi in corso…' : 'Analizza con AI'}
                  </button>
                )}
                {doc.status === 'PENDING' && (
                  <button
                    onClick={() => setManualClassifyFor((current) => (current === doc.id ? null : doc.id))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: T.slate,
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      textDecoration: 'underline',
                    }}
                  >
                    Classifica manualmente
                  </button>
                )}
                <button
                  onClick={() => discardDocument(doc.id)}
                  disabled={busy}
                  title="Scarta questo documento — non riguarda nessun asset della casa"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: `1px solid ${T.line}`,
                    color: T.slate,
                    borderRadius: 6,
                    padding: '7px 12px',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5,
                  }}
                >
                  <XCircle size={13} /> Scarta
                </button>
              </div>

              {doc.status === 'PENDING' && manualClassifyFor === doc.id && (
                <ManualClassifyProposal
                  houseId={houseId}
                  assets={assets}
                  rooms={rooms}
                  busy={busy}
                  onConfirm={(data) => confirm(doc.id, data)}
                  onCancel={() => setManualClassifyFor(null)}
                  onRoomsChanged={onRoomsChanged}
                />
              )}

              {doc.status === 'ANALYZED' && fields?.kind === 'floor_plan' && (
                <FloorPlanProposal
                  proposals={fields.rooms}
                  rooms={rooms}
                  busy={busy}
                  onApply={(decisions) => confirmFloorPlan(doc.id, decisions)}
                />
              )}

              {doc.status === 'ANALYZED' && fields?.kind === 'utility_bill' && (
                <UtilityBillProposal
                  doc={doc}
                  fields={fields}
                  busy={busy}
                  onConfirm={(data) => confirmUtilityBill(doc.id, data)}
                />
              )}

              {doc.status === 'ANALYZED' && fields?.kind === 'property_profile' && (
                <PropertyProfileProposal house={house} fields={fields} busy={busy} onConfirm={(data) => confirmPropertyProfile(doc.id, data)} />
              )}

              {doc.status === 'ANALYZED' && fields?.kind === 'asset_document' && (
                <AssetDocumentProposal
                  houseId={houseId}
                  doc={doc}
                  fields={fields}
                  assets={assets}
                  rooms={rooms}
                  busy={busy}
                  relatedDocs={relatedDocs}
                  pickingAsset={pickingAssetFor === doc.id}
                  onStartPickAsset={() => setPickingAssetFor(doc.id)}
                  onCancelPickAsset={() => setPickingAssetFor(null)}
                  onConfirm={(data) => confirm(doc.id, data)}
                  onSearchOnline={() => searchOnline(doc.id)}
                  onRoomsChanged={onRoomsChanged}
                />
              )}
              {doc.status === 'ANALYZED' && fields?.kind === 'asset_document' && (fields.maintenanceInterventions?.length ?? 0) > 0 && (
                <MaintenanceFromDocument
                  documentId={doc.id}
                  busy={busy}
                  onCompleted={async () => { await refresh(); onAssetLinked(); }}
                />
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MaintenanceFromDocument({ documentId, busy, onCompleted }: { documentId: string; busy: boolean; onCompleted: () => Promise<void> }) {
  const [proposals, setProposals] = useState<DocumentMaintenanceProposal[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dates, setDates] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [costAmount, setCostAmount] = useState('');

  useEffect(() => {
    api.documents.maintenanceProposals(documentId).then((items) => {
      setProposals(items);
      setSelected(new Set(items.flatMap((item) => item.candidates.filter((candidate) => candidate.recommended && !candidate.alreadyCompleted).map((candidate) => candidate.maintenancePlanId))));
      setDates(Object.fromEntries(items.map((item) => [item.interventionIndex, item.completedAt ?? ''])));
    }).catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Impossibile calcolare le proposte'));
  }, [documentId]);

  if (!proposals.length && !message) return null;
  const selectedItems = proposals.flatMap((proposal) => proposal.candidates.filter((candidate) => selected.has(candidate.maintenancePlanId)).map((candidate) => ({ maintenancePlanId: candidate.maintenancePlanId, completedAt: dates[proposal.interventionIndex], notes: proposal.notes ?? undefined })));

  async function complete() {
    if (!selectedItems.length || selectedItems.some((item) => !item.completedAt)) {
      setMessage('Seleziona almeno un piano e indica la data dell’intervento.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.documents.completeMaintenance(documentId, selectedItems, costAmount === '' ? null : Number(costAmount));
      setMessage(`${result.completed} manutenzioni completate e collegate al documento.`);
      setSelected(new Set());
      await onCompleted();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore durante la conferma');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 14, padding: 14, border: `1px solid ${T.ochre}`, borderRadius: 8, background: '#FFF9E9' }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 650, color: T.ink, marginBottom: 8 }}>Questo documento sembra attestare una manutenzione già eseguita</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.ink70, marginBottom: 12 }}>Controlla Asset, piano e data. Nessun aggiornamento avviene senza il tuo clic.</div>
      {proposals.map((proposal) => (
        <div key={proposal.interventionIndex} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}>{proposal.title}</strong>
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>Data <input type="date" value={dates[proposal.interventionIndex] ?? ''} onChange={(e) => setDates((current) => ({ ...current, [proposal.interventionIndex]: e.target.value }))} style={{ marginLeft: 5, border: `1px solid ${T.line}`, borderRadius: 5, padding: '4px 6px' }} /></label>
          </div>
          {proposal.candidates.length === 0 ? <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate }}>Nessun piano compatibile trovato.</div> : proposal.candidates.map((candidate) => (
            <label key={candidate.maintenancePlanId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', fontFamily: "'Inter', sans-serif", fontSize: 12, color: candidate.alreadyCompleted ? T.slate : T.ink }}>
              <input type="checkbox" disabled={candidate.alreadyCompleted} checked={selected.has(candidate.maintenancePlanId)} onChange={(e) => setSelected((current) => { const next = new Set(current); if (e.target.checked) next.add(candidate.maintenancePlanId); else next.delete(candidate.maintenancePlanId); return next; })} />
              <span><strong>{candidate.asset.name}</strong>{candidate.asset.room ? ` · ${candidate.asset.room.name}` : ''} — {candidate.title} <span style={{ color: T.slate }}>({candidate.alreadyCompleted ? 'già collegata' : candidate.reason})</span></span>
            </label>
          ))}
        </div>
      ))}
      <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.ink, margin: '4px 0 10px' }}>
        Costo totale del documento (€)
        <input type="number" min="0" step="0.01" value={costAmount} onChange={(event) => setCostAmount(event.target.value)} style={{ display: 'block', width: 180, marginTop: 4, border: `1px solid ${T.line}`, borderRadius: 5, padding: '5px 7px' }} />
      </label>
      {message && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.rust, marginBottom: 8 }}>{message}</div>}
      <button onClick={complete} disabled={busy || saving || !selectedItems.length} style={{ background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}>
        {saving ? 'Conferma in corso…' : `Completa ${selectedItems.length} manutenzion${selectedItems.length === 1 ? 'e' : 'i'}`}
      </button>
    </div>
  );
}

// Percorso alternativo per un documento che l'AI non è riuscita a leggere
// (B57): stessa API di conferma (POST /documents/:id/confirm) usata dal
// percorso guidato, ma senza campi estratti da mostrare — l'utente sceglie
// direttamente asset esistente, nuovo asset, o "documento casa".
function ManualClassifyProposal({
  houseId,
  assets,
  rooms,
  busy,
  onConfirm,
  onCancel,
  onRoomsChanged,
}: {
  houseId: string;
  assets: Asset[];
  rooms: Room[];
  busy: boolean;
  onConfirm: (data: { assetId?: string; createAssetType?: string; assetName?: string; roomId?: string; linkToHouse?: boolean; applyFields: boolean }) => void;
  onCancel: () => void;
  onRoomsChanged: () => void;
}) {
  const [mode, setMode] = useState<'existing' | 'new' | 'house'>('existing');
  const [assetId, setAssetId] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  // "+ Nuovo ambiente" inline (stesso principio del "+ Nuovo contatto" B58):
  // se la stanza giusta non esiste ancora, l'utente non deve abbandonare la
  // creazione dell'asset per andare altrove — la crea qui e la ritrova già
  // selezionata, e da quel momento compare anche in Ambienti.
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const activeAssets = assets.filter((a) => !a.dismissedAt);

  const fieldStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12.5,
    padding: '7px 10px',
    borderRadius: 6,
    border: `1px solid ${T.line}`,
    background: T.card,
  };
  const modeButtonStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${active ? T.pine : T.line}`,
    background: active ? T.pine : 'transparent',
    color: active ? '#F7F7F2' : T.ink,
    cursor: 'pointer',
  });
  const confirmButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: T.pine,
    color: '#F7F7F2',
    border: 'none',
    borderRadius: 6,
    padding: '8px 13px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    fontSize: 12.5,
    fontWeight: 500,
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70, marginBottom: 10 }}>
        Collega questo documento a mano, senza aspettare l'AI:
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={() => setMode('existing')} style={modeButtonStyle(mode === 'existing')}>Asset esistente</button>
        <button onClick={() => setMode('new')} style={modeButtonStyle(mode === 'new')}>Nuovo asset</button>
        <button onClick={() => setMode('house')} style={modeButtonStyle(mode === 'house')}>Documento casa</button>
      </div>

      {mode === 'existing' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} style={fieldStyle}>
            <option value="">— scegli asset —</option>
            {activeAssets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button disabled={busy || !assetId} onClick={() => onConfirm({ assetId, applyFields: false })} style={confirmButtonStyle}>
            <CheckCircle2 size={13} /> Collega documento
          </button>
        </div>
      )}

      {mode === 'new' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} placeholder="Nome asset, es. Caldaia" style={{ ...fieldStyle, minWidth: 180 }} />
          <select value={newAssetType} onChange={(e) => setNewAssetType(e.target.value)} style={fieldStyle}>
            <option value="">— tipo —</option>
            {Object.entries(ASSET_TYPES).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
          <select
            value={newRoomId}
            onChange={(e) => {
              if (e.target.value === '__new__') { setAddRoomOpen(true); return; }
              setNewRoomId(e.target.value);
            }}
            style={fieldStyle}
          >
            <option value="">Nessuno — impianto di casa</option>
            <option value="__new__">+ Nuovo ambiente…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            disabled={busy || !newAssetType || !newAssetName.trim()}
            onClick={() => onConfirm({ createAssetType: newAssetType, assetName: newAssetName.trim(), roomId: newRoomId || undefined, applyFields: false })}
            style={confirmButtonStyle}
          >
            <CheckCircle2 size={13} /> Crea e collega
          </button>
        </div>
      )}

      {mode === 'house' && (
        <button disabled={busy} onClick={() => onConfirm({ linkToHouse: true, applyFields: false })} style={confirmButtonStyle}>
          <CheckCircle2 size={13} /> Collega alla casa, non a un asset specifico
        </button>
      )}

      <button onClick={onCancel} style={{ display: 'block', marginTop: 10, border: 'none', background: 'none', cursor: 'pointer', color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
        Annulla
      </button>

      {addRoomOpen && (
        <AddRoomModal
          houseId={houseId}
          rooms={rooms}
          onCreated={(room) => {
            setNewRoomId(room.id);
            setAddRoomOpen(false);
            onRoomsChanged();
          }}
          onClose={() => setAddRoomOpen(false)}
        />
      )}
    </div>
  );
}

function AssetDocumentProposal({
  houseId,
  doc,
  fields,
  assets,
  rooms,
  busy,
  relatedDocs,
  pickingAsset,
  onStartPickAsset,
  onCancelPickAsset,
  onConfirm,
  onSearchOnline,
  onRoomsChanged,
}: {
  houseId: string;
  doc: DocumentRecord;
  fields: Extract<NonNullable<DocumentRecord['extractedFields']>, { kind: 'asset_document' }>;
  assets: Asset[];
  rooms: Room[];
  busy: boolean;
  relatedDocs: DocumentRecord[];
  pickingAsset: boolean;
  onStartPickAsset: () => void;
  onCancelPickAsset: () => void;
  onConfirm: (data: { assetId?: string; createAssetType?: string; assetName?: string; quantity?: number; roomId?: string; linkToHouse?: boolean; applyFields: boolean }) => void;
  onSearchOnline: () => void;
  onRoomsChanged: () => void;
}) {
  const suggestedAsset = fields.suggestedAssetId ? assets.find((a) => a.id === fields.suggestedAssetId) : null;
  const suggestedTypeMeta = fields.suggestedAssetType ? ASSET_TYPES[fields.suggestedAssetType] : null;
  // Nessun asset creato con un click: anche quando l'AI propone tipo+nome,
  // l'utente li conferma (o li corregge) in questo mini-form prima della
  // creazione — "elettrodomestico"/"clima" ecc. comprendono più oggetti
  // distinti in una casa, quindi un nome specifico è essenziale, non solo
  // un dettaglio opzionale.
  const [creatingAsset, setCreatingAsset] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState('');
  // >1 quando il documento descrive più unità identiche (es. 3
  // climatizzatori): crea altrettanti asset separati invece di uno
  // aggregato, perché ogni unità può finire in una stanza diversa e avere
  // dati propri (seriale, ecc.) da correggere poi individualmente.
  const [newQuantity, setNewQuantity] = useState(1);
  // Facoltativo: senza, l'asset nasce senza ambiente ("impianto di casa",
  // vedi Documenti casa) e va assegnato a mano dopo — poterlo scegliere già
  // qui evita quel giro in più per il caso comune di un elettrodomestico
  // che va chiaramente in una stanza precisa.
  const [newRoomId, setNewRoomId] = useState('');
  // "+ Nuovo ambiente" inline, stesso principio del "+ Nuovo contatto" B58
  // (vedi ManualClassifyProposal sopra): non serve abbandonare la creazione
  // dell'asset per andare a censire prima l'ambiente altrove.
  const [addRoomOpen, setAddRoomOpen] = useState(false);

  function startCreatingAsset() {
    setNewAssetName(fields.suggestedAssetName || suggestedTypeMeta?.label || '');
    setNewAssetType(fields.suggestedAssetType?.toUpperCase() ?? '');
    setNewQuantity(fields.quantity && fields.quantity > 1 ? fields.quantity : 1);
    setNewRoomId('');
    setCreatingAsset(true);
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <Stamp tone={doc.aiConfidence && Number(doc.aiConfidence) > 90 ? 'pine' : doc.aiConfidence && Number(doc.aiConfidence) > 80 ? 'ochre' : 'rust'}>
          confidenza {doc.aiConfidence}%
        </Stamp>
        {suggestedAsset ? (
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70 }}>
            Asset suggerito:&nbsp;<strong>{suggestedAsset.name}</strong>
          </span>
        ) : suggestedTypeMeta ? (
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ochreDeep }}>
            Nessun asset "{suggestedTypeMeta.label}" trovato in questa casa
          </span>
        ) : (
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ochreDeep }}>Nessun tipo di asset riconosciuto</span>
        )}
      </div>

      {relatedDocs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#EEF2EC', border: `1px solid ${T.pine}`, borderRadius: 7, padding: '9px 12px', marginBottom: 12 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.ink }}>
            Sembra collegato allo stesso intervento di <strong>{relatedDocs.map((d) => d.originalFilename).join(', ')}</strong> — conferma ciascuno singolarmente (dopo il primo, usa "Cambia asset" sugli altri per collegarli allo stesso).
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', background: T.paper, borderRadius: 7, padding: '10px 14px', marginBottom: 10 }}>
        {fields.fields.map(([k, v]) => (
          <div key={k} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
            <span style={{ color: T.slate }}>{k}: </span>
            <span style={{ color: T.ink, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onSearchOnline}
        disabled={busy}
        title="Cerca informazioni aggiuntive online su questo prodotto (marca/modello) — completa i campi già noti, non li sovrascrive mai"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          color: T.pine,
          cursor: 'pointer',
          padding: '0 0 14px 0',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <Globe size={13} /> {busy ? 'Ricerca in corso…' : 'Cerca online per completare i dati'}
      </button>

      {pickingAsset ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => onConfirm({ assetId: a.id, applyFields: true })}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.card, cursor: 'pointer' }}
            >
              {a.name}
            </button>
          ))}
          <button onClick={onCancelPickAsset} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.slate }}>
            Annulla
          </button>
        </div>
      ) : creatingAsset ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              placeholder="Nome asset, es. Macchina del caffè"
              style={{ flex: 1, minWidth: 180, fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.line}` }}
            />
            <select
              value={newAssetType}
              onChange={(e) => setNewAssetType(e.target.value)}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.card }}
            >
              <option value="">— tipo —</option>
              {Object.entries(ASSET_TYPES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              value={newRoomId}
              onChange={(e) => {
                if (e.target.value === '__new__') { setAddRoomOpen(true); return; }
                setNewRoomId(e.target.value);
              }}
              title="Ambiente in cui si trova questo elettrodomestico/impianto"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.card }}
            >
              <option value="">Nessuno — impianto di casa</option>
              <option value="__new__">+ Nuovo ambiente…</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.ink70 }}>
              Quantità
              <input
                type="number"
                min={1}
                max={20}
                value={newQuantity}
                onChange={(e) => setNewQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                style={{ width: 52, fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: '7px 8px', borderRadius: 6, border: `1px solid ${T.line}` }}
              />
            </label>
          </div>
          {newQuantity > 1 && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.ochreDeep }}>
              Verranno creati {newQuantity} asset separati ("{newAssetName || '…'} 1", "{newAssetName || '…'} 2", …) — utile per assegnarli a stanze diverse o correggerne i dati singolarmente.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => onConfirm({ createAssetType: newAssetType, assetName: newAssetName.trim(), quantity: newQuantity, roomId: newRoomId || undefined, applyFields: true })}
              disabled={busy || !newAssetType || !newAssetName.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}
            >
              <CheckCircle2 size={13} /> {newQuantity > 1 ? `Crea ${newQuantity} asset e applica dati` : 'Crea asset e applica dati'}
            </button>
            <button
              onClick={() => onConfirm({ createAssetType: newAssetType, assetName: newAssetName.trim(), quantity: newQuantity, roomId: newRoomId || undefined, applyFields: false })}
              disabled={busy || !newAssetType || !newAssetName.trim()}
              style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
            >
              Crea e collega solo il documento
            </button>
            <button onClick={() => setCreatingAsset(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.slate }}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {suggestedAsset ? (
            <>
              <button
                onClick={() => onConfirm({ assetId: suggestedAsset.id, applyFields: true })}
                disabled={busy}
                title="Completa solo i dati dell'asset ancora vuoti — non sovrascrive mai un valore già presente"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}
              >
                <CheckCircle2 size={13} /> Conferma e completa dati mancanti
              </button>
              <button
                onClick={() => onConfirm({ assetId: suggestedAsset.id, applyFields: false })}
                disabled={busy}
                style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
              >
                Solo collega documento
              </button>
            </>
          ) : (
            <button
              onClick={startCreatingAsset}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500 }}
            >
              <Sparkles size={13} />{' '}
              {fields.quantity > 1
                ? `Crea ${fields.quantity} asset nuovi${fields.suggestedAssetName ? ` "${fields.suggestedAssetName}"` : ''}`
                : `Crea nuovo asset${fields.suggestedAssetName ? ` "${fields.suggestedAssetName}"` : ''}`}
            </button>
          )}
          <button
            onClick={onStartPickAsset}
            disabled={busy}
            style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
          >
            Cambia asset
          </button>
          {suggestedAsset && (
            <button
              onClick={startCreatingAsset}
              disabled={busy}
              style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
            >
              Non è questo, crea asset nuovo
            </button>
          )}
          <button
            onClick={() => onConfirm({ linkToHouse: true, applyFields: false })}
            disabled={busy}
            title="Per documenti che riguardano la casa nel suo insieme e non un impianto specifico, es. APE o certificazione energetica"
            style={{ background: 'transparent', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 6, padding: '8px 13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}
          >
            Collega alla casa, non a un asset
          </button>
        </div>
      )}

      {addRoomOpen && (
        <AddRoomModal
          houseId={houseId}
          rooms={rooms}
          onCreated={(room) => {
            setNewRoomId(room.id);
            setAddRoomOpen(false);
            onRoomsChanged();
          }}
          onClose={() => setAddRoomOpen(false)}
        />
      )}
    </div>
  );
}
