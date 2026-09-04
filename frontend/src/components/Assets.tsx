import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Download, ExternalLink, FileStack, FileText, BookOpen, Receipt, ShieldCheck, Trash2, Wrench, UserCheck } from 'lucide-react';
import { T, ASSET_TYPES, iconForAsset, evidenceStatusLabel } from '../theme';
import { SectionLabel, StatusDot, Stamp, ProvenanceBadge } from './Shared';
import { api, formatDateForDisplay, parseDateInput } from '../api';
import type { Asset, Contact, CustomField, DocumentRecord, EvidenceStatus, House, InterventionKind, Room, TimelineEvent, Warranty, WarrantyKind } from '../types';
import { MaintenanceSection } from './Maintenance';
import { AddContactModal } from './Modals';

const WARRANTY_KIND_LABELS: Record<WarrantyKind, string> = {
  PURCHASE: 'Acquisto',
  REPAIR: 'Riparazione',
  EXTENDED: 'Estensione',
  OTHER: 'Altro',
};

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

const quickActionButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 6,
  border: `1px solid ${T.line}`,
  background: T.card,
  color: T.ink,
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
};

// Azioni rapide (B49): un solo click verso manuale/ricevuta/garanzia/ultimo
// intervento/tecnico, usando dati già caricati da AssetDetail — mai un
// bottone per un dato che non esiste (nascosto, non disabilitato/rotto).
function QuickActions({
  documents,
  warranties,
  timeline,
  onScrollToWarranties,
  onScrollToTimeline,
  openContact,
}: {
  documents: DocumentRecord[];
  warranties: Warranty[];
  timeline: TimelineEvent[];
  onScrollToWarranties: () => void;
  onScrollToTimeline: () => void;
  openContact: (id: string) => void;
}) {
  const manual = documents.find((d) => d.docType && /manuale/i.test(d.docType));
  const receipt = documents.find((d) => d.docType && /fattura|ricevuta/i.test(d.docType));
  const lastContact = timeline[0]?.contact;

  if (!manual && !receipt && warranties.length === 0 && timeline.length === 0 && !lastContact) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
      {manual && (
        <a href={api.documents.fileUrl(manual.id)} target="_blank" rel="noreferrer" style={quickActionButtonStyle}>
          <BookOpen size={13} /> Manuale
        </a>
      )}
      {receipt && (
        <a href={api.documents.fileUrl(receipt.id)} target="_blank" rel="noreferrer" style={quickActionButtonStyle}>
          <Receipt size={13} /> Ricevuta
        </a>
      )}
      {warranties.length > 0 && (
        <button onClick={onScrollToWarranties} style={quickActionButtonStyle}>
          <ShieldCheck size={13} /> Garanzia
        </button>
      )}
      {timeline.length > 0 && (
        <button onClick={onScrollToTimeline} style={quickActionButtonStyle}>
          <Wrench size={13} /> Ultimo intervento
        </button>
      )}
      {lastContact && (
        <button onClick={() => openContact(lastContact.id)} style={quickActionButtonStyle}>
          <UserCheck size={13} /> {lastContact.name}
        </button>
      )}
    </div>
  );
}

// Stessa mappa di StatusDot (Shared.tsx), qui esposta anche come colore
// pieno per la card: lo stato deve leggersi a colpo d'occhio nella griglia,
// non solo da un puntino piccolo accanto a un'etichetta grigia.
const ASSET_STATUS_META: Record<Asset['status'], { color: string; label: string }> = {
  OK: { color: T.pine, label: 'In regola' },
  ATTENTION: { color: T.ochreDeep, label: 'Da verificare' },
  DUE: { color: T.rust, label: 'In scadenza' },
};

export function AssetsView({ house, assets, rooms, openAsset, onAddAsset, onReactivate }: { house: House; assets: Asset[]; rooms: Room[]; openAsset: (id: string) => void; onAddAsset: () => void; onReactivate: (asset: Asset) => void }) {
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const activeAssets = assets.filter((a) => !a.dismissedAt);
  const dismissedAssets = assets.filter((a) => a.dismissedAt);
  const visibleAssets = roomFilter === 'all' ? activeAssets : activeAssets.filter((a) => a.roomId === roomFilter);
  // Solo gli ambienti che hanno davvero almeno un asset attivo: un filtro per
  // una stanza sempre vuota non aiuterebbe a filtrare nulla.
  const roomsWithAssets = rooms.filter((r) => activeAssets.some((a) => a.roomId === r.id));

  return (
    <div style={{ padding: '36px 44px', maxWidth: 980 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 20,
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

      {roomsWithAssets.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 18 }}>
          {[{ id: 'all', name: 'Tutti gli asset' }, ...roomsWithAssets].map((r) => {
            const active = roomFilter === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRoomFilter(r.id)}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: `1px solid ${active ? T.pine : T.line}`,
                  background: active ? T.pine : T.card,
                  color: active ? '#F7F7F2' : T.ink70,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12.5,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {r.name}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="grid-responsive"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
        }}
      >
        {visibleAssets.map((a) => {
          const meta = ASSET_TYPES[a.type];
          const Icon = iconForAsset(a);
          const room = rooms.find((r) => r.id === a.roomId);
          const status = ASSET_STATUS_META[a.status] ?? ASSET_STATUS_META.OK;
          return (
            <div
              key={a.id}
              onClick={() => openAsset(a.id)}
              style={{
                background: T.card,
                border: `1px solid ${T.line}`,
                borderRadius: 14,
                padding: '18px',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: '0 1px 2px rgba(20,26,22,0.04)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
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
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${meta.color}1A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Icon size={22} color={meta.color} />
              </div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 15.5,
                  fontWeight: 600,
                  color: T.ink,
                  marginBottom: 4,
                }}
              >
                {a.name}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: status.color,
                  marginBottom: room ? 10 : 0,
                }}
              >
                {status.label}
              </div>
              {room && <Stamp tone="slate">{room.name}</Stamp>}
            </div>
          );
        })}
      </div>

      {visibleAssets.length === 0 && (
        <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: T.slate, fontFamily: "'Inter', sans-serif", fontSize: 13.5 }}>
          Nessun asset in questo ambiente.
        </div>
      )}

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
  house,
  room,
  rooms,
  contacts,
  back,
  openRoom,
  openContact,
  onChangeRoom,
  onEdit,
  onDelete,
  onDismiss,
  onReactivate,
  onContactsChanged,
  onAssetUpdated,
  onHouseChanged,
}: {
  asset: Asset & { customFields?: CustomField[] };
  assets: Asset[];
  house: House;
  room?: Room;
  rooms: Room[];
  contacts: Contact[];
  back: () => void;
  openRoom: (id: string) => void;
  openContact: (id: string) => void;
  onChangeRoom: (assetId: string, roomId: string | null) => void;
  onEdit: () => void;
  onDelete: (asset: Asset) => void;
  onDismiss: (asset: Asset) => void;
  onReactivate: (asset: Asset) => void;
  // L'assegnazione di un contatto qui cambia il conteggio "N interventi"
  // mostrato in Rubrica: va rinfrescata lì, non solo nella timeline locale.
  onContactsChanged: () => void;
  // Calcolo automatico dell'intervallo di controllo caldaia (regione+potenza)
  // scrive su Asset/House: entrambe le callback aggiornano lo stato in App.tsx.
  onAssetUpdated: (asset: Asset) => void;
  onHouseChanged: (house: House) => void;
}) {
  const meta = ASSET_TYPES[asset.type];
  const Icon = iconForAsset(asset);
  const warrantiesSectionRef = useRef<HTMLDivElement>(null);
  const timelineSectionRef = useRef<HTMLDivElement>(null);
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
  // Ingresso per registrare un tecnico mai visto prima senza passare dalla
  // voce Rubrica in nav (nascosta in alpha, vedi config.ts ALPHA_MODE): B58.
  // 'event'/'warranty' per i due form di creazione, `assign:<eventId>` per
  // l'assegnazione diretta su un evento di cronologia già esistente.
  const [contactModalFor, setContactModalFor] = useState<string | null>(null);

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

  async function deleteDocument(document: DocumentRecord) {
    if (
      !window.confirm(
        `Eliminare definitivamente "${document.originalFilename}"? Il file originale verrà cancellato e non sarà recuperabile.`,
      )
    ) {
      return;
    }
    await api.documents.remove(document.id);
    await Promise.all([refreshDocuments(), refreshTimeline(), refreshWarranties()]);
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

      <QuickActions
        documents={documents}
        warranties={warranties}
        timeline={timeline}
        onScrollToWarranties={() => warrantiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onScrollToTimeline={() => timelineSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        openContact={openContact}
      />

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
        house={house}
        contacts={contacts}
        documents={documents}
        onChanged={async () => {
          await refreshTimeline();
          onContactsChanged();
        }}
        onAssetUpdated={onAssetUpdated}
        onHouseChanged={onHouseChanged}
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
              <button
                onClick={() => void deleteDocument(doc)}
                title="Elimina definitivamente documento e file originale"
                style={{
                  display: 'flex',
                  color: T.rust,
                  padding: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        ref={warrantiesSectionRef}
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
            onChange={(e) => {
              if (e.target.value === '__new__') { setContactModalFor('warranty'); return; }
              setNewWarrantyContactId(e.target.value);
            }}
          >
            <option value="">Nessun fornitore/tecnico</option>
            <option value="__new__">+ Nuovo contatto…</option>
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
            const evidence = evidenceStatusLabel(w.evidenceStatus);
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
        ref={timelineSectionRef}
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
            onChange={(e) => {
              if (e.target.value === '__new__') { setContactModalFor('event'); return; }
              setNewEventContactId(e.target.value);
            }}
          >
            <option value="">Nessun contatto</option>
            <option value="__new__">+ Nuovo contatto…</option>
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
            {t.contact && (
              <button
                type="button"
                onClick={() => openContact(t.contact!.id)}
                style={{
                  display: 'block',
                  border: 'none',
                  background: 'none',
                  color: T.pine,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '0 0 5px 0',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                Apri scheda tecnico · {t.contact.name}
              </button>
            )}
            <select
              value={t.contactId ?? ''}
              onChange={(e) => {
                if (e.target.value === '__new__') { setContactModalFor(`assign:${t.id}`); return; }
                assignContact(t.id, e.target.value);
              }}
              style={{
                ...eventInputStyle,
                padding: '5px 8px',
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              <option value="">Nessun contatto collegato</option>
              <option value="__new__">+ Nuovo contatto…</option>
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

      {contactModalFor && (
        <AddContactModal
          houseId={asset.houseId}
          onCreated={(contact) => {
            if (contactModalFor === 'event') setNewEventContactId(contact.id);
            else if (contactModalFor === 'warranty') setNewWarrantyContactId(contact.id);
            else if (contactModalFor.startsWith('assign:')) {
              assignContact(contactModalFor.slice('assign:'.length), contact.id);
            }
            setContactModalFor(null);
            onContactsChanged();
          }}
          onClose={() => setContactModalFor(null)}
        />
      )}
    </div>
  );
}
