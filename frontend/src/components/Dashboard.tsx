import { DoorOpen, Building2, FileText, AlertTriangle } from 'lucide-react';
import { T } from '../theme';
import { SectionLabel } from './Shared';
import type { Asset, House, Room } from '../types';

export function Dashboard({
  house,
  rooms,
  assets,
  openAsset,
}: {
  house: House;
  rooms: Room[];
  assets: Asset[];
  openAsset: (id: string) => void;
}) {
  const dueSoon = assets.filter((a) => a.status === 'DUE' || a.status === 'ATTENTION').length;
  const totalDocs = 0; // Documents API non ancora costruita (vedi architettura §5)

  return (
    <div style={{ padding: '36px 44px', maxWidth: 980 }}>
      <SectionLabel>{house.code} — Panoramica</SectionLabel>
      <h1
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: 30,
          color: T.ink,
          margin: '0 0 6px 0',
          letterSpacing: '-0.01em',
        }}
      >
        {house.name}, {house.city}
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.ink70, margin: '0 0 30px 0' }}>
        {house.surfaceSqm ?? '—'} m² · {house.roomsCount ?? rooms.length} locali · costruita nel{' '}
        {house.buildYear ?? '—'}
      </p>

      <div className="grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 34 }}>
        {[
          { label: 'Ambienti', value: rooms.length, icon: DoorOpen },
          { label: 'Asset censiti', value: assets.length, icon: Building2 },
          { label: 'Documenti collegati', value: totalDocs, icon: FileText },
          { label: 'Da verificare', value: dueSoon, icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: '16px 16px' }}>
            <s.icon size={16} color={T.pine} style={{ marginBottom: 10 }} />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, color: T.ink }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate }}>{s.label}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Promemoria</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dueSoon === 0 && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>
            Nessun asset da verificare per ora.
          </div>
        )}
        {assets
          .filter((a) => a.status === 'DUE' || a.status === 'ATTENTION')
          .map((a) => (
            <div
              key={a.id}
              onClick={() => openAsset(a.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: T.card,
                border: `1px solid ${T.line}`,
                borderLeft: `3px solid ${a.status === 'DUE' ? T.rust : T.ochreDeep}`,
                borderRadius: 8,
                padding: '13px 16px',
                cursor: 'pointer',
              }}
            >
              <AlertTriangle size={15} color={a.status === 'DUE' ? T.rust : T.ochreDeep} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: T.ink }}>
                  {a.name}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate }}>
                  {a.status === 'DUE' ? 'Garanzia scaduta' : 'Nessun documento collegato'}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
