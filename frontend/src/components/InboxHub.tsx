import { useEffect, useState } from 'react';
import { Inbox as InboxIcon, Mail, HardDrive } from 'lucide-react';
import { T } from '../theme';
import { SectionLabel } from './Shared';
import { InboxView } from './Inbox';
import { GmailView } from './Gmail';
import { DriveView } from './Drive';
import type { Asset, House, Room } from '../types';
import { ALPHA_MODE } from '../config';

export type InboxTab = 'documents' | 'gmail' | 'drive';

// Punto d'ingresso unico per l'acquisizione documenti: prima erano 3 voci
// separate in sidebar (Inbox, Gmail, Drive), ora sono tab della stessa
// sezione — Gmail e Drive restano fonti aggiuntive di candidati che
// confluiscono nello stesso tab "Documenti" una volta importati.
export function InboxHub({
  houseId,
  house,
  assets,
  rooms,
  onAssetLinked,
  onRoomsChanged,
  onPropertyProfileChanged,
  gmailCandidateCount,
  driveCandidateCount,
  onGmailCandidatesChanged,
  onDriveCandidatesChanged,
  initialTab,
  gmailNotice,
  onGmailNoticeShown,
  driveNotice,
  onDriveNoticeShown,
}: {
  houseId: string;
  house: House;
  assets: Asset[];
  rooms: Room[];
  onAssetLinked: () => void | Promise<void>;
  onRoomsChanged: () => void;
  onPropertyProfileChanged: () => void;
  gmailCandidateCount: number;
  driveCandidateCount: number;
  onGmailCandidatesChanged: () => void;
  onDriveCandidatesChanged: () => void;
  initialTab?: InboxTab;
  gmailNotice?: 'connected' | 'error' | null;
  onGmailNoticeShown: () => void;
  driveNotice?: 'connected' | 'error' | null;
  onDriveNoticeShown: () => void;
}) {
  const [tab, setTab] = useState<InboxTab>(initialTab ?? 'documents');

  // Il redirect di ritorno da un collegamento OAuth (Gmail o Drive) arriva
  // qui con un tab già deciso da App.tsx — va rispettato anche se l'utente
  // era rimasto su un altro tab in una visita precedente.
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  // In alpha Gmail/Drive restano visibili ma disattivate invece di sparire
  // del tutto: un tab oscurato con spiegazione al passaggio del mouse
  // comunica che l'integrazione esiste ed è in arrivo, invece di far
  // sembrare che Dimora funzioni solo con l'upload manuale per sempre.
  const tabs: { id: InboxTab; label: string; icon: typeof InboxIcon; badge?: number; disabled?: boolean; tooltip?: string }[] = [
    { id: 'documents', label: 'Documenti', icon: InboxIcon },
    {
      id: 'gmail',
      label: 'Gmail',
      icon: Mail,
      badge: gmailCandidateCount || undefined,
      disabled: ALPHA_MODE,
      tooltip: ALPHA_MODE
        ? 'Collega la tua casella email: individueremo automaticamente le email con fatture, contratti o certificati della tua casa e te le proporremo da confermare. Disponibile a breve.'
        : undefined,
    },
    {
      id: 'drive',
      label: 'Google Drive',
      icon: HardDrive,
      badge: driveCandidateCount || undefined,
      disabled: ALPHA_MODE,
      tooltip: ALPHA_MODE
        ? 'Collega il tuo archivio Drive: troveremo i documenti della tua casa già salvati lì e te li proporremo da confermare. Disponibile a breve.'
        : undefined,
    },
  ];

  return (
    <div style={{ padding: '36px 44px', maxWidth: 820 }}>
      <SectionLabel>Acquisizione documenti</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: '0 0 20px' }}>
        Documenti
      </h1>

      <div style={{ display: 'flex', gap: 4, marginBottom: 26, borderBottom: `1px solid ${T.line}` }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              disabled={t.disabled}
              title={t.tooltip}
              onClick={() => {
                if (t.disabled) return;
                setTab(t.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${active ? T.pine : 'transparent'}`,
                color: t.disabled ? T.line : active ? T.ink : T.slate,
                opacity: t.disabled ? 0.7 : 1,
                padding: '9px 4px',
                marginRight: 22,
                marginBottom: -1,
                cursor: t.disabled ? 'default' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
              }}
            >
              <Icon size={14} />
              {t.label}
              {!!t.badge && (
                <span
                  style={{
                    background: T.ochreDeep,
                    color: '#221D12',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    fontWeight: 600,
                    borderRadius: 10,
                    padding: '1px 6px',
                    lineHeight: '14px',
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'documents' && (
        <InboxView
          houseId={houseId}
          house={house}
          assets={assets}
          rooms={rooms}
          onAssetLinked={onAssetLinked}
          onRoomsChanged={onRoomsChanged}
          onPropertyProfileChanged={onPropertyProfileChanged}
          hideHeader
        />
      )}
      {tab === 'gmail' && (
        <GmailView
          houseId={houseId}
          onCandidatesChanged={onGmailCandidatesChanged}
          notice={gmailNotice}
          onNoticeShown={onGmailNoticeShown}
          hideHeader
        />
      )}
      {tab === 'drive' && (
        <DriveView
          houseId={houseId}
          onCandidatesChanged={onDriveCandidatesChanged}
          notice={driveNotice}
          onNoticeShown={onDriveNoticeShown}
          hideHeader
        />
      )}
    </div>
  );
}
