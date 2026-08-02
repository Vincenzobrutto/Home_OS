import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, Globe, Sparkles, Upload, XCircle } from 'lucide-react';
import { T, ASSET_TYPES, ROOM_TYPES } from '../theme';
import { SectionLabel, Stamp } from './Shared';
import { api } from '../api';
import type { Asset, DocumentRecord, FloorPlanRoomProposal, Room } from '../types';

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

export function InboxView({
  houseId,
  assets,
  rooms,
  onAssetLinked,
  onRoomsChanged,
  hideHeader,
}: {
  houseId: string;
  assets: Asset[];
  rooms: Room[];
  onAssetLinked: () => void;
  onRoomsChanged: () => void;
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
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [busyDocIds, setBusyDocIds] = useState<Set<string>>(new Set());
  const [pickingAssetFor, setPickingAssetFor] = useState<string | null>(null);
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
    setAnalyzingId(docId);
    setError(null);
    try {
      await api.documents.analyze(docId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setAnalyzingId(null);
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
                    disabled={analyzingId === doc.id}
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
                    <Sparkles size={13} /> {analyzingId === doc.id ? 'Analisi in corso…' : 'Analizza con AI'}
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

              {doc.status === 'ANALYZED' && fields?.kind === 'floor_plan' && (
                <FloorPlanProposal
                  proposals={fields.rooms}
                  rooms={rooms}
                  busy={busy}
                  onApply={(decisions) => confirmFloorPlan(doc.id, decisions)}
                />
              )}

              {doc.status === 'ANALYZED' && fields?.kind === 'asset_document' && (
                <AssetDocumentProposal
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

function AssetDocumentProposal({
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
}: {
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
              onChange={(e) => setNewRoomId(e.target.value)}
              title="Ambiente in cui si trova questo elettrodomestico/impianto"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.card }}
            >
              <option value="">Nessuno — impianto di casa</option>
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
    </div>
  );
}
