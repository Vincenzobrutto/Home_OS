import { useState } from 'react';
import { X } from 'lucide-react';
import { T, ASSET_TYPES, ROOM_TYPES } from '../theme';
import { SectionLabel } from './Shared';
import { api, formatDateForDisplay, parseDateInput } from '../api';
import type { Asset, Contact, CustomField, Room } from '../types';

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

export function ModalShell({ children, onClose, width = 480 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(27,36,32,0.55)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width,
          // Senza questo, i 480-500px fissi escono dai bordi su un
          // telefono (~375px) invece di restringersi — l'overlay ha già
          // padding: 20 su ogni lato, da qui il calc.
          maxWidth: 'calc(100vw - 40px)',
          boxSizing: 'border-box',
          maxHeight: '88vh',
          overflow: 'auto',
          background: T.paper,
          borderRadius: 14,
          padding: '28px 30px',
          position: 'relative',
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: T.slate, padding: 4 }}>
          <X size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function AddAssetModal({
  houseId,
  rooms,
  defaultRoomId,
  onCreated,
  onRoomsChanged,
  onClose,
}: {
  houseId: string;
  rooms: Room[];
  defaultRoomId: string | null;
  onCreated: (asset: Asset) => void;
  onRoomsChanged: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('ELETTRODOMESTICO');
  const [roomId, setRoomId] = useState(defaultRoomId || '');
  // "+ Nuovo ambiente" inline, stesso principio di "+ Nuovo contatto" (B58) e
  // di ManualClassifyProposal/AssetDocumentProposal in Inbox.tsx: non serve
  // abbandonare la creazione dell'asset per censire prima l'ambiente altrove.
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [installedAt, setInstalledAt] = useState('');
  const [warrantyUntil, setWarrantyUntil] = useState('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [supplier, setSupplier] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.assets.create(houseId, {
        name: name.trim(),
        type,
        roomId: roomId || null,
        installedAt: parseDateInput(installedAt),
        warrantyUntil: parseDateInput(warrantyUntil),
        purchasedAt: parseDateInput(purchasedAt),
        serialNumber: serialNumber.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        supplier: supplier.trim() || undefined,
      });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <SectionLabel>Nuovo asset</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: '0 0 20px 0' }}>
        Aggiungi un asset
      </h1>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nome</label>
        <input style={inputStyle} placeholder="Es. Lavastoviglie Bosch" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Categoria</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(ASSET_TYPES).map(([key, meta]) => {
            const Icon = meta.icon;
            const active = type === key;
            return (
              <div
                key={key}
                onClick={() => setType(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 11px',
                  borderRadius: 8,
                  border: `1.5px solid ${active ? T.pine : T.line}`,
                  background: active ? '#E4EEE9' : T.card,
                  cursor: 'pointer',
                }}
              >
                <Icon size={14} color={meta.color} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: T.ink }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Ambiente (facoltativo)</label>
        <select
          value={roomId}
          onChange={(e) => {
            if (e.target.value === '__new__') { setAddRoomOpen(true); return; }
            setRoomId(e.target.value);
          }}
          style={{ ...inputStyle, appearance: 'auto' }}
        >
          <option value="">Nessuno — impianto di casa</option>
          <option value="__new__">+ Nuovo ambiente…</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Data installazione</label>
          <input style={inputStyle} placeholder="gg/mm/aaaa" value={installedAt} onChange={(e) => setInstalledAt(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Garanzia fino al</label>
          <input style={inputStyle} placeholder="gg/mm/aaaa" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Data acquisto</label>
          <input style={inputStyle} placeholder="gg/mm/aaaa" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Fornitore (facoltativo)</label>
          <input style={inputStyle} placeholder="Es. Amazon.it" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Marca (facoltativo)</label>
          <input style={inputStyle} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Modello (facoltativo)</label>
          <input style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Numero seriale (facoltativo)</label>
          <input style={inputStyle} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </div>
      </div>

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
        <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 7, padding: '10px 16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          Annulla
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          style={{
            background: name.trim() ? T.pine : T.line,
            color: name.trim() ? '#F7F7F2' : T.slate,
            border: 'none',
            borderRadius: 7,
            padding: '10px 18px',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {saving ? 'Creazione…' : 'Crea asset'}
        </button>
      </div>

      {addRoomOpen && (
        <AddRoomModal
          houseId={houseId}
          onCreated={(room) => {
            setRoomId(room.id);
            setAddRoomOpen(false);
            onRoomsChanged();
          }}
          onClose={() => setAddRoomOpen(false)}
        />
      )}
    </ModalShell>
  );
}

// Nessun equivalente esisteva finché la creazione di un ambiente viveva solo
// dentro la vista Mappa (FloorPlanView, che richiede di posizionarlo su una
// planimetria): la vista a Blocchi (Rooms.tsx), unica raggiungibile in
// ALPHA_MODE (RoomsHub.tsx nasconde la Mappa), non aveva alcun modo di
// crearne uno. planGeometry resta facoltativo nello schema — un ambiente
// senza posizione sulla mappa è già uno stato valido (es. le stanze create
// dal wizard Genesis prima che l'utente disegni la planimetria).
export function AddRoomModal({
  houseId,
  onCreated,
  onClose,
}: {
  houseId: string;
  onCreated: (room: Room) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('SOGGIORNO');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.rooms.create(houseId, { type, name: name.trim() });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <SectionLabel>Nuovo ambiente</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: '0 0 20px 0' }}>
        Aggiungi un ambiente
      </h1>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nome</label>
        <input style={inputStyle} placeholder="Es. Cucina" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        {/* Suggerimenti, non una categorizzazione obbligatoria separata: un
            clic compila il nome (e imposta il tipo corrispondente in
            automatico) — l'utente può comunque scrivere un nome libero senza
            passare da qui, il tipo resta quello dell'ultimo suggerimento
            scelto (o il default) anche in quel caso. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {Object.entries(ROOM_TYPES).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setType(key); setName(meta.label); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 20,
                  border: `1px solid ${T.line}`,
                  background: T.card,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11.5,
                  color: T.ink70,
                }}
              >
                <Icon size={12} color={meta.color} /> {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
        <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 7, padding: '10px 16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          Annulla
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          style={{
            background: name.trim() ? T.pine : T.line,
            color: name.trim() ? '#F7F7F2' : T.slate,
            border: 'none',
            borderRadius: 7,
            padding: '10px 18px',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {saving ? 'Creazione…' : 'Crea ambiente'}
        </button>
      </div>
    </ModalShell>
  );
}

interface FieldRow {
  id: string | null; // null = nuovo campo, non ancora salvato
  label: string;
  value: string;
}

export function EditAssetModal({
  asset,
  onSaved,
  onClose,
}: {
  asset: Asset & { customFields?: CustomField[] };
  onSaved: (asset: Asset) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(asset.name);
  const [installedAt, setInstalledAt] = useState(formatDateForDisplay(asset.installedAt) === '—' ? '' : formatDateForDisplay(asset.installedAt));
  const [warrantyUntil, setWarrantyUntil] = useState(formatDateForDisplay(asset.warrantyUntil) === '—' ? '' : formatDateForDisplay(asset.warrantyUntil));
  const [purchasedAt, setPurchasedAt] = useState(formatDateForDisplay(asset.purchasedAt) === '—' ? '' : formatDateForDisplay(asset.purchasedAt));
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber ?? '');
  const [manufacturer, setManufacturer] = useState(asset.manufacturer ?? '');
  const [model, setModel] = useState(asset.model ?? '');
  const [supplier, setSupplier] = useState(asset.supplier ?? '');
  const [fields, setFields] = useState<FieldRow[]>((asset.customFields ?? []).map((f) => ({ id: f.id, label: f.label, value: f.value })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(idx: number, key: 'label' | 'value', value: string) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  }
  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }
  function addField() {
    setFields((prev) => [...prev, { id: null, label: '', value: '' }]);
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.assets.update(asset.id, {
        name: name.trim() || asset.name,
        installedAt: parseDateInput(installedAt),
        warrantyUntil: parseDateInput(warrantyUntil),
        purchasedAt: parseDateInput(purchasedAt),
        serialNumber: serialNumber.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        supplier: supplier.trim() || undefined,
      });

      const original = asset.customFields ?? [];
      const currentIds = new Set(fields.filter((f) => f.id).map((f) => f.id));
      const removed = original.filter((f) => !currentIds.has(f.id));
      const validRows = fields.filter((f) => f.label.trim());

      await Promise.all([
        ...removed.map((f) => api.assets.removeCustomField(f.id)),
        ...validRows.map((f) => {
          if (!f.id) {
            return api.assets.addCustomField(asset.id, { label: f.label.trim(), value: f.value.trim() });
          }
          const orig = original.find((o) => o.id === f.id);
          if (orig && (orig.label !== f.label.trim() || orig.value !== f.value.trim())) {
            return api.assets.updateCustomField(f.id, { label: f.label.trim(), value: f.value.trim() });
          }
          return Promise.resolve();
        }),
      ]);

      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} width={500}>
      <SectionLabel>{asset.code}</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: '0 0 20px 0' }}>
        Modifica asset
      </h1>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nome</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Data installazione</label>
          <input style={inputStyle} placeholder="gg/mm/aaaa" value={installedAt} onChange={(e) => setInstalledAt(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Garanzia fino al</label>
          <input style={inputStyle} placeholder="gg/mm/aaaa" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} />
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: T.slate, marginTop: 4 }}>
            Puoi registrare più garanzie (acquisto, riparazione) nella sezione Garanzie della scheda Asset.
          </div>
        </div>
        <div>
          <label style={labelStyle}>Data acquisto</label>
          <input style={inputStyle} placeholder="gg/mm/aaaa" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Fornitore</label>
          <input style={inputStyle} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Marca</label>
          <input style={inputStyle} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Modello</label>
          <input style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Numero seriale</label>
          <input style={inputStyle} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </div>
      </div>

      <label style={labelStyle}>Dati aggiuntivi</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {fields.map((f, idx) => (
          <div key={f.id ?? `new-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Etichetta (es. Fornitore)" value={f.label} onChange={(e) => updateField(idx, 'label', e.target.value)} />
            <input style={{ ...inputStyle, flex: 1.4 }} placeholder="Valore" value={f.value} onChange={(e) => updateField(idx, 'value', e.target.value)} />
            <button onClick={() => removeField(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.slate, padding: 4, flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>
        ))}
        {fields.length === 0 && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate }}>Nessun dato aggiuntivo ancora.</div>}
      </div>
      <button onClick={addField} style={{ background: 'none', border: `1px dashed ${T.line}`, color: T.pine, borderRadius: 7, padding: '8px 12px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500, marginBottom: 20, width: '100%' }}>
        + Aggiungi campo
      </button>

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 7, padding: '10px 16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          Annulla
        </button>
        <button onClick={submit} disabled={saving} style={{ background: T.pine, color: '#F7F7F2', border: 'none', borderRadius: 7, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500 }}>
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </div>
    </ModalShell>
  );
}

function ContactForm({
  initial,
  submitLabel,
  savingLabel,
  onSubmit,
  onClose,
}: {
  initial?: Partial<Pick<Contact, 'name' | 'role' | 'phone' | 'email' | 'notes'>>;
  submitLabel: string;
  savingLabel: string;
  onSubmit: (data: { name: string; role?: string; phone?: string; email?: string; notes?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        role: role.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nome</label>
        <input style={inputStyle} placeholder="Es. Idrotermica Bianchi" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Ruolo / specialità (facoltativo)</label>
        <input style={inputStyle} placeholder="Es. Idraulico, Assistenza caldaia" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Telefono</label>
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Note</label>
        <textarea
          style={{ ...inputStyle, minHeight: 64, resize: 'vertical', fontFamily: "'Inter', sans-serif" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <div style={{ color: T.rust, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
        <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.line}`, color: T.ink, borderRadius: 7, padding: '10px 16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
          Annulla
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          style={{
            background: name.trim() ? T.pine : T.line,
            color: name.trim() ? '#F7F7F2' : T.slate,
            border: 'none',
            borderRadius: 7,
            padding: '10px 18px',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </>
  );
}

export function AddContactModal({
  houseId,
  onCreated,
  onClose,
}: {
  houseId: string;
  onCreated: (contact: Contact) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <SectionLabel>Nuovo contatto</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: '0 0 20px 0' }}>
        Aggiungi alla rubrica
      </h1>
      <ContactForm
        submitLabel="Crea contatto"
        savingLabel="Creazione…"
        onClose={onClose}
        onSubmit={async (data) => {
          const created = await api.contacts.create(houseId, data);
          onCreated(created);
        }}
      />
    </ModalShell>
  );
}

export function EditContactModal({
  contact,
  onSaved,
  onClose,
}: {
  contact: Contact;
  onSaved: (contact: Contact) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <SectionLabel>Contatto</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 21, color: T.ink, margin: '0 0 20px 0' }}>
        Modifica contatto
      </h1>
      <ContactForm
        initial={contact}
        submitLabel="Salva modifiche"
        savingLabel="Salvataggio…"
        onClose={onClose}
        onSubmit={async (data) => {
          const updated = await api.contacts.update(contact.id, data);
          onSaved(updated);
        }}
      />
    </ModalShell>
  );
}
