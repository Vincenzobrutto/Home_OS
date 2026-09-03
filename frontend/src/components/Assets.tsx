import { useEffect, useState } from 'react';
import { ChevronLeft, Download, ExternalLink, FileStack, FileText } from 'lucide-react';
import { T, ASSET_TYPES, iconForAsset } from '../theme';
import { SectionLabel, StatusDot, Stamp, ProvenanceBadge } from './Shared';
import { api, formatDateForDisplay, parseDateInput } from '../api';
import type { Asset, Contact, CustomField, DocumentRecord, EvidenceStatus, House, InterventionKind, Room, TimelineEvent, Warranty, WarrantyKind } from '../types';
import { MaintenanceSection } from './Maintenance';

const WARRANTY_KIND_LABELS: Record<WarrantyKind, string> = {
  PURCHASE: 'Acquisto',
  REPAIR: 'Riparazione',
  EXTENDED: 'Estensione',
  OTHER: 'Altro',
};

function warrantyEvidenceLabel(status: EvidenceStatus): { label: string; color: string } {
  switch (status) {
    case 'VERIFIED_PRESENT':
      return { label: 'Prova verificata', color: T.pine };
    case 'DECLARED_PRESENT':
      return { label: 'Dichiarata, da caricare', color: T.ochre };
    case 'DECLARED_ABSENT':
      return { label: 'Dichiarata assente', color: T.rust };
    case 'NOT_APPLICABLE':
      return { label: 'Non applicabile', color: T.slate };
    default:
      return { label: 'Non verificata', color: T.slate };
  }
}

// Colore per tipo di intervento sui pallini della Cronologia — leggibilità
// "installazione → manutenzione → guasto → riparazione" richiesta da B50.
function interventionKindColor(kind: InterventionKind | null | undefined): string {
  switch (kind) {
    case 'BREAKDOWN':
      return T.rust;
    case 'REPAIR':
    case 'REPLACEMENT':
      return T.ochre;
    case 'INSTALLATION':
    case 'MAINTENANCE':
      return T.pine;
    default:
      return T.slate;
  }
}

const eventInputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  border: `1px solid ${T.line}`,
  background: T.card,
  fontFamily: "'Inter', sans-serif",
  fontSize: 12.5,
  color: T.ink,
  boxSizing: 'border-box',
  outline: 'none',
};

export function AssetsView({ house, assets, rooms, openAsset, onAddAsset, onReactivate }: { house: House; assets: Asset[]; rooms: Room[]; openAsset: (id: string) => void; onAddAsset: () => void; onReactivate: (asset: Asset) => void }) {
  const activeAssets = assets.filter((a) => !a.dismissedAt);
  const dismissedAssets = assets.filter((a) => a.dismissedAt);

  return (
    <div style={{ padding: '36px 44px', maxWidth: 980 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 26,
            color: T.ink,
            margin: 0,
          }}
        >
          Asset della casa
        </h1>
        <button
          onClick={onAddAsset}
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
          + Aggiungi asset
        </button>
      </div>
      <div
        className="grid-responsive"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
        }}
      >
        {activeAssets.map((a) => {
          const meta = ASSET_TYPES[a.type];
          const Icon = iconForAsset(a);
          const room = rooms.find((r) => r.id === a.roomId);
          return (
            <div
              key={a.id}
              onClick={() => openAsset(a.id)}
              style={{
                background: T.card,
                border: `1px solid ${T.line}`,
                borderRadius: 10,
                padding: '16px 16px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: T.slate,
                  letterSpacing: '0.04em',
                }}
              >
                {a.code}
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: T.paper,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Icon size={17} color={meta.color} />
              </div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: T.ink,
                  marginBottom: 4,
                }}
              >
                {a.name}
              </div>
              <div style={{ marginBottom: 10 }}>
                <StatusDot status={a.status} />
              </div>
              {room && (
                <div style={{ marginBottom: 10 }}>
                  <Stamp tone="slate">{room.name}</Stamp>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11.5,
                  color: T.slate,
                }}
              >
                <span>{a.customFields?.length ?? 0} dati aggiuntivi</span>
              </div>
            </div>
          );
        })}
      </div>

      {dismissedAssets.length > 0 && (
        <>
          <div style={{ marginTop: 34, marginBottom: 10 }}>
            <SectionLabel>Asset dismessi ({dismissedAssets.length})</SectionLabel>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dismissedAssets.map((a) => {
              const meta = ASSET_TYPES[a.type];
              const Icon = iconForAsset(a);
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: T.card,
                    border: `1px solid ${T.line}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    opacity: 0.75,
                  }}
                >
                  <div
                    onClick={() => openAsset(a.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={15} color={meta.color} />
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        color: T.ink,
                      }}
                    >
                      {a.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: T.slate,
                      }}
                    >
                      {a.code}
                    </span>
                  </div>
                  <button
                    onClick={() => onReactivate(a)}
                    style={{
                      background: 'none',
                      border: `1px solid ${T.line}`,
                      color: T.ink,
                      borderRadius: 6,
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Riattiva
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Badge di provenienza per uno dei 7 campi strutturati, o null se il campo
// non ha (ancora) un record di provenienza — scritto prima di B38, vedi
// decisions.md. Non per i campi liberi: quelli portano la provenienza
// direttamente su se stessi (CustomField.source/sourceDocument/...).
function StructuredFieldProvenance({ asset, fieldName }: { asset: Asset; fieldName: string }) {
  const entry = asset.fieldProvenance?.find((p) => p.fieldName === fieldName);
  if (!entry) return null;
  return (
    <ProvenanceBadge
      origin={entry.origin}
      sourceDocument={entry.sourceDocument}
      confirmedByUser={entry.confirmedByUser}
      confirmedAt={entry.confirmedAt}
    />
  );
}

export function AssetDetail({
  asset,
  assets,
  room,
  rooms,
  contacts,
  back,
  openRoom,
  onChangeRoom,
  onEdit,
  onDelete,
  onDismiss,
  onReactivate,
  onContactsChanged,
}: {
  asset: Asset & { customFields?: CustomField[] };
  assets: Asset[];
  room?: Room;
  rooms: Room[];
  contacts: Contact[];
  back: () => void;
  openRoom: (id: string) => void;
  onChangeRoom: (assetId: string, roomId: string | null) => void;
  onEdit: () => void;
  onDelete: (asset: Asset) => void;
  onDismiss: (asset: Asset) => void;
  onReactivate: (asset: Asset) => void;
  // L'assegnazione di un contatto qui cambia il conteggio "N interventi"
  // mostrato in Rubrica: va rinfrescata lì, non solo nella timeline locale.
  onContactsChanged: () => void;
}) {
  const meta = ASSET_TYPES[asset.type];
  const Icon = iconForAsset(asset);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [availableInterventionDocuments, setAvailableInterventionDocuments] = useState<DocumentRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState('');
  const [newEventKind, setNewEventKind] = useState<InterventionKind>('MAINTENANCE');
  const [newEventDetail, setNewEventDetail] = useState('');
  const [newEventContactId, setNewEventContactId] = useState('');
  const [newEventCost, setNewEventCost] = useState('');
  const [newEventEvidenceStatus, setNewEventEvidenceStatus] = useState<EvidenceStatus>('UNKNOWN');
  const [newEventAdditionalAssetIds, setNewEventAdditionalAssetIds] = useState<string[]>([]);
  const [newEventDocumentIds, setNewEventDocumentIds] = useState<string[]>([]);
  const [savingEvent, setSavingEvent] = useState(false);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [addingWarranty, setAddingWarranty] = useState(false);
  const [newWarrantyKind, setNewWarrantyKind] = useState<WarrantyKind>('PURCHASE');
  const [newWarrantyStartsAt, setNewWarrantyStartsAt] = useState('');
  const [newWarrantyExpiresAt, setNewWarrantyExpiresAt] = useState('');
  const [newWarrantyContactId, setNewWarrantyContactId] = useState('');
  const [newWarrantyDocumentId, setNewWarrantyDocumentId] = useState('');
  const [newWarrantyNotes, setNewWarrantyNotes] = useState('');
  const [savingWarranty, setSavingWarranty] = useState(false);

  function refreshTimeline() {
    return api.assets.timeline(asset.id).then(setTimeline);
  }

  useEffect(() => {
    refreshTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id]);

  function refreshWarranties() {
    return api.warranties.listForAsset(asset.id).then(setWarranties);
  }

  useEffect(() => {
    refreshWarranties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id]);

  function refreshDocuments() {
    return api.documents.listForHouse(asset.houseId).then((docs) => {
      const confirmed = docs.filter((d) => d.status === 'CONFIRMED');
      setAvailableInterventionDocuments(confirmed);
      setDocuments(confirmed.filter((d) => d.assetId === asset.id));
    });
  }

  useEffect(() => {
    refreshDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, asset.houseId]);

  async function moveDocumentToHouse(docId: string) {
    await api.documents.moveToHouse(docId);
    await refreshDocuments();
  }

  async function assignContact(eventId: string, contactId: string) {
    const updated = await api.assets.updateTimelineEventContact(eventId, contactId || null);
    setTimeline((prev) => prev.map((t) => (t.id === eventId ? updated : t)));
    onContactsChanged();
  }

  async function submitNewEvent() {
    const eventDate = parseDateInput(newEventDate);
    if (!eventDate || !newEventType.trim()) return;
    setSavingEvent(true);
    try {
      await api.assets.addTimelineEvent(asset.id, {
        eventDate,
        eventType: newEventType.trim(),
        kind: newEventKind,
        detail: newEventDetail.trim() || undefined,
        contactId: newEventContactId || null,
        costAmount: newEventCost === '' ? null : Number(newEventCost),
        currency: newEventCost === '' ? null : 'EUR',
        evidenceStatus: newEventDocumentIds.length ? 'VERIFIED_PRESENT' : newEventEvidenceStatus,
        additionalAssetIds: newEventAdditionalAssetIds,
        documentIds: newEventDocumentIds,
      });
      setAddingEvent(false);
      setNewEventDate('');
      setNewEventType('');
      setNewEventKind('MAINTENANCE');
      setNewEventDetail('');
      setNewEventContactId('');
      setNewEventCost('');
      setNewEventEvidenceStatus('UNKNOWN');
      setNewEventAdditionalAssetIds([]);
      setNewEventDocumentIds([]);
      await refreshTimeline();
      if (newEventContactId) onContactsChanged();
    } finally {
      setSavingEvent(false);
    }
  }

  async function submitNewWarranty() {
    const expiresAt = parseDateInput(newWarrantyExpiresAt);
    if (!expiresAt) return;
    setSavingWarranty(true);
    try {
      await api.warranties.create(asset.id, {
        expiresAt,
        startsAt: parseDateInput(newWarrantyStartsAt) || undefined,
        kind: newWarrantyKind,
        providerContactId: newWarrantyContactId || null,
        proofDocumentId: newWarrantyDocumentId || null,
        notes: newWarrantyNotes.trim() || null,
      });
      setAddingWarranty(false);
      setNewWarrantyKind('PURCHASE');
      setNewWarrantyStartsAt('');
      setNewWarrantyExpiresAt('');
      setNewWarrantyContactId('');
      setNewWarrantyDocumentId('');
      setNewWarrantyNotes('');
      await refreshWarranties();
    } finally {
      setSavingWarranty(false);
    }
  }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 820 }}>
      <button
        onClick={back}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: T.slate,
          fontFamily: "'Inter', sans-serif",
          fontSize: 12.5,
          marginBottom: 20,
          padding: 0,
        }}
      >
        <ChevronLeft size={14} /> Tutti gli asset
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: T.paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={21} color={meta.color} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: 24,
                color: T.ink,
                margin: 0,
              }}
            >
              {asset.name}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                marginTop: 3,
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: T.slate,
                }}
              >
                {asset.code}
              </span>
              <StatusDot status={asset.status} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onEdit}
            style={{
              background: 'none',
              border: `1px solid ${T.line}`,
              color: T.ink,
              borderRadius: 7,
              padding: '8px 14px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            Modifica
          </button>
          {asset.dismissedAt ? (
            <button
              onClick={() => onReactivate(asset)}
              style={{
                background: 'none',
                border: `1px solid ${T.line}`,
                color: T.ink,
                borderRadius: 7,
                padding: '8px 14px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12.5,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Riattiva
            </button>
          ) : (
            <button
              onClick={() => onDismiss(asset)}
              style={{
                background: 'none',
                border: `1px solid ${T.line}`,
                color: T.ink,
                borderRadius: 7,
                padding: '8px 14px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12.5,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Dismetti
            </button>
          )}
          <button
            onClick={() => onDelete(asset)}
            style={{
              background: 'none',
              border: `1px solid ${T.rust}`,
              color: T.rust,
              borderRadius: 7,
              padding: '8px 14px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            Elimina
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '18px 0 30px 0' }}>
        <Stamp tone={asset.status === 'OK' ? 'pine' : asset.status === 'DUE' ? 'rust' : 'ochre'}>{asset.status === 'OK' ? 'Passaporto in regola' : asset.status === 'DUE' ? 'Azione richiesta' : 'Da completare'}</Stamp>
        {asset.warrantyUntil && (
          <Stamp tone="slate">garanzia fino al {formatDateForDisplay(asset.warrantyUntil)}</Stamp>
        )}
        {asset.dismissedAt && <Stamp tone="slate">dismesso il {formatDateForDisplay(asset.dismissedAt)}</Stamp>}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 24px',
          marginBottom: 34,
        }}
      >
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Installato il: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{formatDateForDisplay(asset.installedAt)}</span>
          <StructuredFieldProvenance asset={asset} fieldName="installedAt" />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Categoria: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{meta.label}</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Acquistato il: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{formatDateForDisplay(asset.purchasedAt)}</span>
          <StructuredFieldProvenance asset={asset} fieldName="purchasedAt" />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Fornitore: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{asset.supplier || '—'}</span>
          <StructuredFieldProvenance asset={asset} fieldName="supplier" />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Marca: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{asset.manufacturer || '—'}</span>
          <StructuredFieldProvenance asset={asset} fieldName="manufacturer" />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Modello: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{asset.model || '—'}</span>
          <StructuredFieldProvenance asset={asset} fieldName="model" />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate }}>Numero seriale: </span>
          <span style={{ color: T.ink, fontWeight: 500 }}>{asset.serialNumber || '—'}</span>
          <StructuredFieldProvenance asset={asset} fieldName="serialNumber" />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          <span style={{ color: T.slate, display: 'block', marginBottom: 5 }}>Ambiente</span>
          <select
            value={asset.roomId || ''}
            onChange={(e) => onChangeRoom(asset.id, e.target.value || null)}
            style={{
              width: '100%',
              maxWidth: 240,
              padding: '7px 9px',
              borderRadius: 6,
              border: `1px solid ${T.line}`,
              background: T.card,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              color: T.ink,
              cursor: 'pointer',
            }}
          >
            <option value="">Nessuno — impianto di casa</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {room && (
            <span
              onClick={() => openRoom(room.id)}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11.5,
                color: T.pine,
                cursor: 'pointer',
                textDecoration: 'underline',
                marginTop: 5,
                display: 'inline-block',
              }}
            >
              Apri scheda ambiente →
            </span>
          )}
        </div>
      </div>

      {!!asset.customFields?.length && (
        <>
          <SectionLabel>Dati aggiuntivi</SectionLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 20px',
              background: T.card,
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 30,
            }}
          >
            {asset.customFields.map((f) => (
              <div key={f.id} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}>
                <span style={{ color: T.slate }}>{f.label}: </span>
                <span style={{ color: T.ink, fontWeight: 500 }}>{f.value}</span>
                <ProvenanceBadge
                  origin={f.source}
                  sourceDocument={f.sourceDocument}
                  confirmedByUser={f.confirmedByUser}
                  confirmedAt={f.confirmedAt}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <MaintenanceSection
        asset={asset}
        contacts={contacts}
        documents={documents}
        onChanged={async () => {
          await refreshTimeline();
          onContactsChanged();
        }}
      />

      <SectionLabel>Documenti</SectionLabel>
      {documents.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${T.line}`,
            borderRadius: 9,
            padding: '14px 16px',
            marginBottom: 30,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            color: T.slate,
          }}
        >
          Nessun documento collegato. Caricalo dall'Inbox (o da Gmail/Drive) e confermalo su questo asset.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 30,
          }}
        >
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: T.card,
                border: `1px solid ${T.line}`,
                borderRadius: 8,
                padding: '11px 14px',
              }}
            >
              <FileText size={16} color={T.slate} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.ink,
                  }}
                >
                  {doc.docType ?? doc.originalFilename}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11.5,
                    color: T.slate,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {doc.originalFilename} · confermato {doc.confirmedAt ? formatDateForDisplay(doc.confirmedAt) : ''}
                </div>
              </div>
              <a href={api.documents.fileUrl(doc.id)} target="_blank" rel="noreferrer" title="Visualizza" style={{ display: 'flex', color: T.slate, padding: 6 }}>
                <ExternalLink size={15} />
              </a>
              <a href={api.documents.downloadUrl(doc.id)} title="Scarica" style={{ display: 'flex', color: T.slate, padding: 6 }}>
                <Download size={15} />
              </a>
              <button
                onClick={() => moveDocumentToHouse(doc.id)}
                title="Sposta in Documenti casa: scollega questo documento da questo asset, per documenti che in realtà riguardano la casa nel suo insieme (es. impianti senza un ambiente specifico)"
                style={{
                  display: 'flex',
                  color: T.slate,
                  padding: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <FileStack size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <SectionLabel>Garanzie</SectionLabel>
        {!addingWarranty && (
          <button
            onClick={() => setAddingWarranty(true)}
            style={{
              background: 'none',
              border: 'none',
              color: T.pine,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
              marginBottom: 10,
            }}
          >
            + Aggiungi garanzia
          </button>
        )}
      </div>

      {addingWarranty && (
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.line}`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select style={eventInputStyle} value={newWarrantyKind} onChange={(e) => setNewWarrantyKind(e.target.value as WarrantyKind)}>
              <option value="PURCHASE">Acquisto</option>
              <option value="REPAIR">Riparazione</option>
              <option value="EXTENDED">Estensione</option>
              <option value="OTHER">Altro</option>
            </select>
            <input style={eventInputStyle} placeholder="Inizio gg/mm/aaaa" value={newWarrantyStartsAt} onChange={(e) => setNewWarrantyStartsAt(e.target.value)} />
            <input style={eventInputStyle} placeholder="Scadenza gg/mm/aaaa" value={newWarrantyExpiresAt} onChange={(e) => setNewWarrantyExpiresAt(e.target.value)} />
          </div>
          <input style={{ ...eventInputStyle, width: '100%', marginBottom: 8 }} placeholder="Note (facoltativo)" value={newWarrantyNotes} onChange={(e) => setNewWarrantyNotes(e.target.value)} />
          <select
            style={{ ...eventInputStyle, width: '100%', marginBottom: 8, cursor: 'pointer' }}
            value={newWarrantyContactId}
            onChange={(e) => setNewWarrantyContactId(e.target.value)}
          >
            <option value="">Nessun fornitore/tecnico</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            style={{ ...eventInputStyle, width: '100%', marginBottom: 10, cursor: 'pointer' }}
            value={newWarrantyDocumentId}
            onChange={(e) => setNewWarrantyDocumentId(e.target.value)}
          >
            <option value="">Nessun documento di prova</option>
            {availableInterventionDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.originalFilename}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setAddingWarranty(false)}
              style={{
                background: 'none',
                border: `1px solid ${T.line}`,
                color: T.ink,
                borderRadius: 6,
                padding: '7px 12px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
              }}
            >
              Annulla
            </button>
            <button
              onClick={submitNewWarranty}
              disabled={!newWarrantyExpiresAt.trim() || savingWarranty}
              style={{
                background: T.pine,
                color: '#F7F7F2',
                border: 'none',
                borderRadius: 6,
                padding: '7px 14px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {savingWarranty ? 'Salvataggio…' : 'Aggiungi'}
            </button>
          </div>
        </div>
      )}

      {warranties.length === 0 && !addingWarranty && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate, marginBottom: 30 }}>
          Nessuna garanzia registrata.
        </div>
      )}
      {warranties.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30 }}>
          {warranties.map((w) => {
            const expired = new Date(w.expiresAt).getTime() < Date.now();
            const evidence = warrantyEvidenceLabel(w.evidenceStatus);
            return (
              <div
                key={w.id}
                style={{
                  background: T.card,
                  border: `1px solid ${T.line}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: T.ink }}>
                    {WARRANTY_KIND_LABELS[w.kind]}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: expired ? T.rust : T.pine }}>
                    fino al {formatDateForDisplay(w.expiresAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4, fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
                  <span style={{ color: evidence.color }}>{evidence.label}</span>
                  {w.contact && <span>Fornitore: {w.contact.name}</span>}
                  {w.document && <span>Prova: {w.document.originalFilename}</span>}
                </div>
                {w.notes && (
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.ink70, marginTop: 4 }}>{w.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <SectionLabel>Cronologia</SectionLabel>
        {!addingEvent && (
          <button
            onClick={() => setAddingEvent(true)}
            style={{
              background: 'none',
              border: 'none',
              color: T.pine,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
              marginBottom: 10,
            }}
          >
            + Nuovo intervento
          </button>
        )}
      </div>

      {addingEvent && (
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.line}`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.4fr',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input style={eventInputStyle} placeholder="gg/mm/aaaa" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
            <select style={eventInputStyle} value={newEventKind} onChange={(e) => setNewEventKind(e.target.value as InterventionKind)}>
              <option value="INSTALLATION">Installazione</option>
              <option value="MAINTENANCE">Manutenzione</option>
              <option value="INSPECTION">Controllo</option>
              <option value="BREAKDOWN">Guasto</option>
              <option value="REPAIR">Riparazione</option>
              <option value="REPLACEMENT">Sostituzione</option>
              <option value="OTHER">Altro</option>
            </select>
          </div>
          <input style={{ ...eventInputStyle, width: '100%', marginBottom: 8 }} placeholder="Titolo intervento" value={newEventType} onChange={(e) => setNewEventType(e.target.value)} />
          <input style={{ ...eventInputStyle, width: '100%', marginBottom: 8 }} placeholder="Dettaglio (facoltativo)" value={newEventDetail} onChange={(e) => setNewEventDetail(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
              Costo totale (€)
              <input style={{ ...eventInputStyle, width: '100%', marginTop: 3 }} type="number" min="0" step="0.01" value={newEventCost} onChange={(e) => setNewEventCost(e.target.value)} />
            </label>
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
              Prova documentale
              <select disabled={newEventDocumentIds.length > 0} style={{ ...eventInputStyle, width: '100%', marginTop: 3 }} value={newEventDocumentIds.length ? 'VERIFIED_PRESENT' : newEventEvidenceStatus} onChange={(e) => setNewEventEvidenceStatus(e.target.value as EvidenceStatus)}>
                {newEventDocumentIds.length > 0 && <option value="VERIFIED_PRESENT">Documento collegato</option>}
                <option value="UNKNOWN">Non indicato</option>
                <option value="DECLARED_PRESENT">Esiste, da caricare</option>
                <option value="DECLARED_ABSENT">Non rilasciata</option>
                <option value="NOT_APPLICABLE">Non applicabile</option>
              </select>
            </label>
          </div>
          <select
            style={{
              ...eventInputStyle,
              width: '100%',
              marginBottom: 10,
              cursor: 'pointer',
            }}
            value={newEventContactId}
            onChange={(e) => setNewEventContactId(e.target.value)}
          >
            <option value="">Nessun contatto</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {assets.filter((item) => item.id !== asset.id && !item.dismissedAt).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, marginBottom: 4 }}>Altri Asset coinvolti</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {assets.filter((item) => item.id !== asset.id && !item.dismissedAt).map((item) => (
                  <label key={item.id} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.ink }}>
                    <input type="checkbox" checked={newEventAdditionalAssetIds.includes(item.id)} onChange={(e) => setNewEventAdditionalAssetIds((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /> {item.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {availableInterventionDocuments.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, marginBottom: 4 }}>Documenti di prova</div>
              <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {availableInterventionDocuments.map((doc) => (
                  <label key={doc.id} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.ink }}>
                    <input type="checkbox" checked={newEventDocumentIds.includes(doc.id)} onChange={(e) => setNewEventDocumentIds((current) => e.target.checked ? [...current, doc.id] : current.filter((id) => id !== doc.id))} /> {doc.originalFilename}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setAddingEvent(false)}
              style={{
                background: 'none',
                border: `1px solid ${T.line}`,
                color: T.ink,
                borderRadius: 6,
                padding: '7px 12px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
              }}
            >
              Annulla
            </button>
            <button
              onClick={submitNewEvent}
              disabled={!newEventDate.trim() || !newEventType.trim() || savingEvent}
              style={{
                background: T.pine,
                color: '#F7F7F2',
                border: 'none',
                borderRadius: 6,
                padding: '7px 14px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {savingEvent ? 'Salvataggio…' : 'Aggiungi'}
            </button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', paddingLeft: 18 }}>
        <div
          style={{
            position: 'absolute',
            left: 4,
            top: 4,
            bottom: 4,
            width: 1,
            background: T.line,
          }}
        />
        {timeline.length === 0 && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: T.slate,
            }}
          >
            Nessun evento ancora.
          </div>
        )}
        {timeline.map((t) => (
          <div key={t.id} style={{ position: 'relative', marginBottom: 16 }}>
            <div
              style={{
                position: 'absolute',
                left: -18,
                top: 3,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: interventionKindColor(t.kind),
                border: `2px solid ${T.paper}`,
              }}
            />
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                color: T.slate,
                marginBottom: 2,
              }}
            >
              {formatDateForDisplay(t.eventDate)}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13.5,
                fontWeight: 500,
                color: T.ink,
              }}
            >
              {t.eventType}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12.5,
                color: T.ink70,
                marginBottom: 6,
              }}
            >
              {t.detail}
            </div>
            {t.assets && t.assets.length > 1 && (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, marginBottom: 4 }}>
                Asset: {t.assets.map((item) => item.name).join(', ')}
              </div>
            )}
            {t.costAmount !== null && t.costAmount !== undefined && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, marginBottom: 4 }}>
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: t.currency ?? 'EUR' }).format(t.costAmount)}
              </div>
            )}
            {t.documents && t.documents.length > 0 && (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.pine, marginBottom: 5 }}>
                {t.documents.length} {t.documents.length === 1 ? 'documento collegato' : 'documenti collegati'}
              </div>
            )}
            <select
              value={t.contactId ?? ''}
              onChange={(e) => assignContact(t.id, e.target.value)}
              style={{
                ...eventInputStyle,
                padding: '5px 8px',
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              <option value="">Nessun contatto collegato</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 30,
          paddingTop: 14,
          borderTop: `1px solid ${T.line}`,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11.5,
          color: T.slate,
        }}
      >
        Creato il {formatDateForDisplay(asset.createdAt)} · ultima modifica il {formatDateForDisplay(asset.updatedAt)}
      </div>
    </div>
  );
}
