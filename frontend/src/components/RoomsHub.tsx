import { useState } from 'react';
import { LayoutGrid, Map } from 'lucide-react';
import { T } from '../theme';
import { SectionLabel } from './Shared';
import { RoomsView } from './Rooms';
import { FloorPlanView } from './FloorPlan';
import type { Asset, House, Room } from '../types';
import { ALPHA_MODE } from '../config';

type RoomsMode = 'blocks' | 'map';

// Punto d'ingresso unico per gli ambienti: prima "Planimetria" era una voce
// separata in sidebar, ora è una rappresentazione alternativa della stessa
// sezione — i dati (rooms, planGeometry) sono già condivisi tra le due
// viste, cambia solo come vengono disegnati.
export function RoomsHub({
  house,
  rooms,
  assets,
  openRoom,
  onRoomsChanged,
  onAssetsChanged,
  onHouseChanged,
}: {
  house: House;
  rooms: Room[];
  assets: Asset[];
  openRoom: (id: string) => void;
  onRoomsChanged: () => Promise<void>;
  onAssetsChanged: () => Promise<void>;
  onHouseChanged: (house: House) => void;
}) {
  const [mode, setMode] = useState<RoomsMode>('blocks');

  return (
    <div style={{ padding: '36px 44px', maxWidth: 980 }}>
      <SectionLabel>{house.code}</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 10 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: 0 }}>
          Ambienti della casa
        </h1>
        {!ALPHA_MODE && (
        <div style={{ display: 'flex', border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden' }}>
          <button
            onClick={() => setMode('blocks')}
            title="Vista a blocchi"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: mode === 'blocks' ? T.pine : T.card,
              color: mode === 'blocks' ? '#F7F7F2' : T.ink70,
              border: 'none',
              padding: '8px 13px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <LayoutGrid size={14} /> Blocchi
          </button>
          <button
            onClick={() => setMode('map')}
            title="Vista mappa"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: mode === 'map' ? T.pine : T.card,
              color: mode === 'map' ? '#F7F7F2' : T.ink70,
              border: 'none',
              borderLeft: `1px solid ${T.line}`,
              padding: '8px 13px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <Map size={14} /> Mappa
          </button>
        </div>
        )}
      </div>

      {ALPHA_MODE || mode === 'blocks' ? (
        <RoomsView house={house} rooms={rooms} assets={assets} openRoom={openRoom} hideHeader />
      ) : (
        <FloorPlanView
          house={house}
          rooms={rooms}
          assets={assets}
          onRoomsChanged={onRoomsChanged}
          onAssetsChanged={onAssetsChanged}
          onHouseChanged={onHouseChanged}
          hideHeader
        />
      )}
    </div>
  );
}
