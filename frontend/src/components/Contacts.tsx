import { ChevronLeft, ChevronRight, Mail, Phone, Trash2, UserRound } from 'lucide-react';
import { T, ASSET_TYPES } from '../theme';
import { SectionLabel, Stamp } from './Shared';
import { formatDateForDisplay } from '../api';
import type { Contact, ContactDetail as ContactDetailType, House } from '../types';

export function ContactsView({
  house,
  contacts,
  openContact,
  onAddContact,
}: {
  house: House;
  contacts: Contact[];
  openContact: (id: string) => void;
  onAddContact: () => void;
}) {
  return (
    <div style={{ padding: '36px 44px', maxWidth: 980 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: 0 }}>
          Rubrica
        </h1>
        <button
          onClick={onAddContact}
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
          + Nuovo contatto
        </button>
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: '0 0 24px 0' }}>
        Tecnici e aziende che sono intervenuti in casa — collegali agli interventi in cronologia di ogni asset.
      </p>

      {contacts.length === 0 && (
        <div
          style={{
            border: `1px dashed ${T.line}`,
            borderRadius: 10,
            padding: '40px 20px',
            textAlign: 'center',
            color: T.slate,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13.5,
          }}
        >
          Nessun contatto censito ancora.
        </div>
      )}

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {contacts.map((c) => (
          <div
            key={c.id}
            onClick={() => openContact(c.id)}
            style={{
              background: T.card,
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              padding: '16px 16px',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, background: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <UserRound size={17} color={T.slate} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
              {c.name}
            </div>
            {c.role && (
              <div style={{ marginBottom: 10 }}>
                <Stamp tone="slate">{c.role}</Stamp>
              </div>
            )}
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate }}>
              {c.interventionsCount ?? 0} intervent{(c.interventionsCount ?? 0) === 1 ? 'o' : 'i'} collegat{(c.interventionsCount ?? 0) === 1 ? 'o' : 'i'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactDetailView({
  contact,
  back,
  openAsset,
  onEdit,
  onDelete,
}: {
  contact: ContactDetailType;
  back: () => void;
  openAsset: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
        <ChevronLeft size={14} /> Rubrica
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserRound size={21} color={T.slate} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: T.ink, margin: 0 }}>
              {contact.name}
            </h1>
            {contact.role && (
              <div style={{ marginTop: 5 }}>
                <Stamp tone="slate">{contact.role}</Stamp>
              </div>
            )}
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
          <button
            onClick={onDelete}
            title="Elimina contatto"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              color: T.rust,
              border: `1px solid ${T.line}`,
              borderRadius: 7,
              padding: '9px 12px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {(contact.phone || contact.email) && (
        <div style={{ display: 'flex', gap: 18, margin: '18px 0 4px 0' }}>
          {contact.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink }}>
              <Phone size={13} color={T.slate} /> {contact.phone}
            </div>
          )}
          {contact.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink }}>
              <Mail size={13} color={T.slate} /> {contact.email}
            </div>
          )}
        </div>
      )}

      {contact.notes && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: '14px 0 0 0', whiteSpace: 'pre-wrap' }}>
          {contact.notes}
        </div>
      )}

      <div style={{ margin: '30px 0 0 0' }}>
        <SectionLabel>Interventi collegati ({contact.timelineEvents.length})</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contact.timelineEvents.length === 0 && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>
              Nessun intervento collegato ancora.
            </div>
          )}
          {contact.timelineEvents.map((ev) => {
            const assetMeta = ASSET_TYPES[ev.asset.type];
            const AssetIcon = assetMeta?.icon;
            return (
              <div
                key={ev.id}
                onClick={() => openAsset(ev.asset.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: T.card,
                  border: `1px solid ${T.line}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
              >
                {AssetIcon && <AssetIcon size={16} color={assetMeta.color} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>
                    {ev.eventType} — {ev.asset.name}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.slate }}>
                    {formatDateForDisplay(ev.eventDate)}
                  </div>
                  {ev.detail && (
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.ink70, marginTop: 2 }}>{ev.detail}</div>
                  )}
                </div>
                <ChevronRight size={15} color={T.slate} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
