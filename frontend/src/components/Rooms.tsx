import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { T, ROOM_TYPES, ASSET_TYPES } from '../theme';
import { SectionLabel, StatusDot } from './Shared';
import type { Asset, House, Room } from '../types';

export function RoomsView({
  house,
  rooms,
  assets,
  openRoom,
  hideHeader,
}: {
  house: House;
  rooms: Room[];
  assets: Asset[];
  openRoom: (id: string) => void;
  // Quando annidata dentro RoomsHub (vedi RoomsHub.tsx) l'intestazione e il
  // padding di pagina li fornisce l'hub, che possiede anche il toggle
  // blocchi/mappa.
  hideHeader?: boolean;
}) {
  return (
    <div style={hideHeader ? undefined : { padding: '36px 44px', maxWidth: 980 }}>
      {!hideHeader && (
        <>
          <SectionLabel>{house.code}</SectionLabel>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: '0 0 8px 0' }}>
            Ambienti della casa
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.ink70, margin: '0 0 24px 0' }}>
            Le stanze non hanno una loro documentazione: sono il contenitore degli Asset al loro interno.
          </p>
        </>
      )}

      {rooms.length === 0 && (
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
          Nessun ambiente censito ancora.
        </div>
      )}

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {rooms.map((r) => {
          const meta = ROOM_TYPES[r.type];
          const Icon = meta.icon;
          const roomAssets = assets.filter((a) => a.roomId === r.id);
          return (
            <div
              key={r.id}
              onClick={() => openRoom(r.id)}
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
              <div style={{ position: 'absolute', top: 16, right: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.slate, letterSpacing: '0.04em' }}>
                {r.code}
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${meta.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={22} color={meta.color} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                {r.name}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600, color: roomAssets.length > 0 ? T.pine : T.slate }}>
                {roomAssets.length} asset collegat{roomAssets.length === 1 ? 'o' : 'i'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RoomDetail({
  room,
  assets,
  back,
  openAsset,
  onAddAsset,
  onDelete,
}: {
  room: Room;
  assets: Asset[];
  back: () => void;
  openAsset: (id: string) => void;
  onAddAsset: (roomId: string) => void;
  onDelete: (room: Room) => void;
}) {
  const meta = ROOM_TYPES[room.type];
  const Icon = meta.icon;
  const roomAssets = assets.filter((a) => a.roomId === room.id);

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
        <ChevronLeft size={14} /> Tutti gli ambienti
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={21} color={meta.color} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: T.ink, margin: 0 }}>
              {room.name}
            </h1>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.slate }}>{room.code}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onAddAsset(room.id)}
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
              whiteSpace: 'nowrap',
            }}
          >
            + Aggiungi asset
          </button>
          <button
            onClick={() => onDelete(room)}
            title="Elimina ambiente"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
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

      <SectionLabel>Asset in questo ambiente ({roomAssets.length})</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {roomAssets.length === 0 && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>
            Nessun asset collegato a questo ambiente ancora.
          </div>
        )}
        {roomAssets.map((a) => {
          const assetMeta = ASSET_TYPES[a.type];
          const AssetIcon = assetMeta.icon;
          return (
            <div
              key={a.id}
              onClick={() => openAsset(a.id)}
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
              <AssetIcon size={16} color={assetMeta.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>
                  {a.name}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.slate }}>{a.code}</div>
              </div>
              <StatusDot status={a.status} />
              <ChevronRight size={15} color={T.slate} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
