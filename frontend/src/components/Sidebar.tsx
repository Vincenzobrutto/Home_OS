import {
  Home,
  LayoutGrid,
  Inbox as InboxIcon,
  DoorOpen,
  Building2,
  ClipboardList,
  FileStack,
  Users,
  Sparkles,
  Zap,
  X,
  LogOut,
  Search,
} from 'lucide-react';
import { T } from '../theme';
import type { House } from '../types';

export type View =
  | 'dashboard'
  | 'inbox'
  | 'rooms'
  | 'room-detail'
  | 'assets'
  | 'asset-detail'
  | 'house-documents'
  | 'contacts'
  | 'contact-detail'
  | 'genesis'
  | 'energy'
  | 'property-profile';

export function Sidebar({
  view,
  setView,
  house,
  gmailCandidateCount = 0,
  driveCandidateCount = 0,
  // Da dove è stato aperto l'asset-detail corrente (vedi App.tsx
  // assetDetailOrigin): un asset senza ambiente si apre anche da "Documenti
  // casa", quindi lì la voce evidenziata deve seguire l'origine e non essere
  // sempre "Asset".
  assetDetailOrigin = 'assets',
  // Sotto la soglia mobile (vedi MOBILE_CSS in theme.ts) la sidebar è un
  // pannello a scomparsa invece che fissa — "open" ne controlla la classe
  // CSS, "onNavigate" la richiude dopo la scelta di una voce (su desktop
  // questi restano semplicemente inutilizzati).
  open = false,
  onNavigate,
  onLogout,
  onOpenSearch,
}: {
  view: View;
  setView: (v: View) => void;
  house: House;
  gmailCandidateCount?: number;
  driveCandidateCount?: number;
  assetDetailOrigin?: View;
  open?: boolean;
  onNavigate?: () => void;
  onLogout?: () => void;
  onOpenSearch: () => void;
}) {
  // Gmail e Drive non hanno più voci proprie: sono tab dentro Inbox (vedi
  // InboxHub.tsx). Il badge qui somma i candidati in attesa da entrambe le
  // fonti, così l'utente sa che c'è qualcosa da rivedere senza dover
  // ricordare quale integrazione l'ha trovato.
  const items: { id: View; label: string; icon: typeof Home; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'property-profile', label: 'Profilo casa', icon: ClipboardList },
    { id: 'inbox', label: 'Inbox', icon: InboxIcon, badge: (gmailCandidateCount + driveCandidateCount) || undefined },
    { id: 'rooms', label: 'Ambienti', icon: DoorOpen },
    { id: 'assets', label: 'Asset', icon: Building2 },
    { id: 'house-documents', label: 'Documenti casa', icon: FileStack },
    { id: 'energy', label: 'Energia', icon: Zap },
    { id: 'contacts', label: 'Rubrica', icon: Users },
  ];
  // Voce visibile solo mentre un percorso Genesis è a metà — non NOT_STARTED
  // (si avvia dalla Dashboard) né COMPLETED (i risultati vivono in Dashboard,
  // non serve più una voce di menu dedicata a ripetere il wizard).
  if (house.genesisStatus === 'IN_PROGRESS' || house.genesisStatus === 'PROCESSING') {
    items.splice(1, 0, { id: 'genesis', label: 'Genesis', icon: Sparkles });
  }
  return (
    <div
      className={`app-sidebar${open ? ' open' : ''}`}
      style={{
        width: 220,
        minWidth: 220,
        background: T.ink,
        color: '#EEEFE8',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 34 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: T.pine,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Home size={15} color="#F1F1EC" />
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em', flex: 1 }}>
          Dimora
        </span>
        <button
          onClick={onNavigate}
          className="app-sidebar-close"
          aria-label="Chiudi menu"
          style={{ background: 'transparent', border: 'none', color: '#EEEFE8' }}
        >
          <X size={18} />
        </button>
      </div>

      <button
        onClick={() => {
          onOpenSearch();
          onNavigate?.();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 10px',
          borderRadius: 7,
          border: `1px solid rgba(255,255,255,0.14)`,
          cursor: 'pointer',
          textAlign: 'left',
          background: 'rgba(255,255,255,0.05)',
          color: '#B9BFB6',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          marginBottom: 14,
        }}
      >
        <Search size={15} />
        <span style={{ flex: 1 }}>Cerca…</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#7C8479' }}>Ctrl K</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const Icon = it.icon;
          const active =
            view === it.id ||
            (view === 'asset-detail' && it.id === assetDetailOrigin) ||
            (view === 'room-detail' && it.id === 'rooms') ||
            (view === 'contact-detail' && it.id === 'contacts');
          return (
            <button
              key={it.id}
              onClick={() => {
                setView(it.id);
                onNavigate?.();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                color: active ? '#FAFAF6' : '#B9BFB6',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {!!it.badge && (
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
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#8A9089', letterSpacing: '0.05em' }}>
              {house.code}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: '#D5D8CE', marginTop: 2 }}>
              {house.name}, {house.city}
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Esci"
              aria-label="Esci"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                background: 'transparent',
                border: 'none',
                color: '#8A9089',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
