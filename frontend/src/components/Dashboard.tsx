import { useEffect, useState } from 'react';
import { DoorOpen, Building2, FileText, AlertTriangle, CalendarClock, Sparkles, ArrowRight, Clock, type LucideIcon } from 'lucide-react';
import { iconForAsset } from '../theme';
import { SectionLabel } from './Shared';
import type { Asset, GenesisResults, House, HouseTimelineEventRecord, MaintenanceReminder, Room } from '../types';
import { api, formatDateForDisplay } from '../api';

// ANTEPRIMA nuova palette (blu/verde acqua, più moderna) — vive solo qui in
// Dashboard.tsx per ora, non ancora promossa a theme.ts. Se approvata,
// questi valori sostituiranno i token attuali (T.pine/T.ochre/T.rust...) e
// verranno propagati al resto dell'app — vedi decisions.md quando succede.
const PT = {
  card: '#FFFFFF',
  ink: '#0F172A',
  ink70: '#0F172Aa8',
  slate: '#64748B',
  line: '#E1E7F0',
  primary: '#2563EB',
  teal: '#0D9488',
  danger: '#DC2626',
  warning: '#D97706',
};

// Un colore distinto per categoria di Asset — badge tondi nelle liste,
// invece dei quattro toni ripetuti della palette precedente. Vive qui
// insieme al resto dell'anteprima; se promossa, questa mappa sostituirà i
// campi "color" di ASSET_TYPES in theme.ts.
const CATEGORY_COLORS: Record<string, string> = {
  CALDAIA: '#DC2626',
  ELETTRICO: '#D97706',
  IDRAULICO: '#2563EB',
  FOTOVOLTAICO: '#CA8A04',
  CLIMA: '#0891B2',
  TETTO: '#78716C',
  FINESTRE: '#64748B',
  ELETTRODOMESTICO: '#7C3AED',
};

function categoryColor(type: string): string {
  return CATEGORY_COLORS[type] ?? PT.slate;
}

function CategoryBadge({
  type,
  name,
  size = 34,
}: {
  type: string;
  name: string;
  size?: number;
}) {
  const Icon = iconForAsset({ type, name });
  const color = categoryColor(type);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${color}1A`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.52)} color={color} />
    </div>
  );
}

function StatBadge({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: `${color}1A`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
      }}
    >
      <Icon size={26} color={color} />
    </div>
  );
}

export function Dashboard({
  house,
  rooms,
  assets,
  openAsset,
  onOpenGenesis,
}: {
  house: House;
  rooms: Room[];
  assets: Asset[];
  openAsset: (id: string) => void;
  onOpenGenesis: () => void;
}) {
  const dueSoon = assets.filter((a) => a.status === 'DUE' || a.status === 'ATTENTION').length;
  const [maintenance, setMaintenance] = useState<MaintenanceReminder[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [genesisResults, setGenesisResults] = useState<GenesisResults | null>(null);
  const [timeline, setTimeline] = useState<HouseTimelineEventRecord[]>([]);

  useEffect(() => {
    api.maintenance.remindersForHouse(house.id).then(setMaintenance);
    api.documents.listForHouse(house.id).then((docs) => setDocumentsCount(docs.length));
  }, [house.id]);

  useEffect(() => {
    if (house.genesisStatus !== 'COMPLETED') {
      setGenesisResults(null);
      setTimeline([]);
      return;
    }
    api.genesis.getResults(house.id).then(setGenesisResults);
    api.genesis.getTimeline(house.id).then(setTimeline);
  }, [house.id, house.genesisStatus]);

  return (
    <div style={{ padding: '36px 44px', maxWidth: 980 }}>
      <SectionLabel>{house.code} — Panoramica</SectionLabel>
      <h1
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: 30,
          color: PT.ink,
          margin: '0 0 6px 0',
          letterSpacing: '-0.01em',
        }}
      >
        {house.name}, {house.city}
      </h1>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: PT.ink70,
          margin: '0 0 30px 0',
        }}
      >
        {house.surfaceSqm ?? '—'} m² · {house.roomsCount ?? rooms.length} locali · costruita nel {house.buildYear ?? '—'}
      </p>

      {house.genesisStatus !== 'COMPLETED' && (
        <div
          onClick={onOpenGenesis}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: `${PT.primary}0D`,
            border: `1px solid ${PT.primary}33`,
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 26,
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${PT.primary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={20} color={PT.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: PT.ink }}>
              {house.genesisStatus === 'NOT_STARTED' ? 'Costruisci il gemello digitale della tua casa' : 'Riprendi il percorso Genesis'}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: PT.slate, marginTop: 2 }}>
              {house.genesisStatus === 'NOT_STARTED'
                ? 'In pochi minuti: informazioni casa, documenti, scansione guidata e primo Home Score.'
                : 'Hai già iniziato: continua da dove eri rimasto.'}
            </div>
          </div>
          <ArrowRight size={18} color={PT.primary} />
        </div>
      )}

      {genesisResults?.score && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24, marginBottom: 26, padding: '18px 20px', background: PT.card, border: `1px solid ${PT.line}`, borderRadius: 12, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 40, color: PT.primary, lineHeight: 1 }}>{genesisResults.score.overallScore}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: PT.slate, marginTop: 4 }}>Home Score /100</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: PT.slate, marginTop: 10 }}>
              {genesisResults.confirmedRoomsCount} ambienti · {genesisResults.confirmedAssetsCount} asset
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'Documentazione', value: genesisResults.score.documentationScore },
              { label: 'Manutenzione', value: genesisResults.score.maintenanceScore },
              { label: 'Sicurezza', value: genesisResults.score.safetyScore },
              { label: 'Efficienza', value: genesisResults.score.efficiencyScore },
              { label: 'Completezza (Digital Twin)', value: genesisResults.score.completenessScore },
            ].map((d) => (
              <div key={d.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Inter', sans-serif", fontSize: 11, color: PT.slate, marginBottom: 2 }}>
                  <span>{d.label}</span>
                  <span>{d.value}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: PT.line }}>
                  <div style={{ height: 5, borderRadius: 3, width: `${d.value}%`, background: PT.primary }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {genesisResults && genesisResults.issues.length > 0 && (
        <>
          <SectionLabel>Da tenere d'occhio</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
            {genesisResults.issues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => issue.assetId && openAsset(issue.assetId)}
                style={{
                  padding: '10px 14px',
                  background: PT.card,
                  border: `1px solid ${PT.line}`,
                  borderLeft: `3px solid ${issue.severity === 'HIGH' ? PT.danger : issue.severity === 'MEDIUM' ? PT.warning : PT.slate}`,
                  borderRadius: 9,
                  cursor: issue.assetId ? 'pointer' : 'default',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: PT.ink }}>{issue.title}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: PT.slate, marginTop: 2 }}>{issue.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {genesisResults && genesisResults.recommendations.length > 0 && (
        <>
          <SectionLabel>Consigliato</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
            {genesisResults.recommendations.map((rec) => {
              // Stessa Issue a cui la Recommendation è collegata (1:1 oggi,
              // vedi genesis-architecture.md §6) — riusata solo per sapere se
              // punta a un asset su cui navigare, coerente con le card "Da
              // tenere d'occhio" sopra invece di restare non cliccabili.
              const linkedAssetId = genesisResults.issues.find((i) => i.id === rec.issueId)?.assetId;
              return (
                <div
                  key={rec.id}
                  onClick={() => linkedAssetId && openAsset(linkedAssetId)}
                  style={{
                    padding: '10px 14px',
                    background: PT.card,
                    border: `1px solid ${PT.line}`,
                    borderRadius: 9,
                    cursor: linkedAssetId ? 'pointer' : 'default',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: PT.ink }}>{rec.title}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: PT.slate, marginTop: 2 }}>{rec.description}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div
        className="grid-responsive-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 34,
        }}
      >
        {[
          { label: 'Ambienti', value: rooms.length, icon: DoorOpen, color: PT.primary },
          { label: 'Asset censiti', value: assets.length, icon: Building2, color: PT.teal },
          { label: 'Documenti collegati', value: documentsCount, icon: FileText, color: '#7C3AED' },
          {
            label: 'Da verificare',
            value: dueSoon + maintenance.length,
            icon: AlertTriangle,
            color: PT.warning,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: PT.card,
              border: `1px solid ${PT.line}`,
              borderRadius: 12,
              padding: '20px 18px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 10,
              }}
            >
              <StatBadge icon={s.icon} color={s.color} />
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 30,
                  fontWeight: 600,
                  color: PT.ink,
                }}
              >
                {s.value}
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: PT.ink,
                lineHeight: 1.15,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Promemoria</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dueSoon === 0 && maintenance.length === 0 && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: PT.slate,
            }}
          >
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
                background: PT.card,
                border: `1px solid ${PT.line}`,
                borderLeft: `3px solid ${a.status === 'DUE' ? PT.danger : PT.warning}`,
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <CategoryBadge type={a.type} name={a.name} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: PT.ink,
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: PT.slate,
                  }}
                >
                  {a.status === 'DUE' ? 'Garanzia scaduta' : 'Nessun documento collegato'}
                </div>
              </div>
              <AlertTriangle size={15} color={a.status === 'DUE' ? PT.danger : PT.warning} />
            </div>
          ))}
        {maintenance.map((plan) => (
          <div
            key={plan.id}
            onClick={() => openAsset(plan.asset.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: PT.card,
              border: `1px solid ${PT.line}`,
              borderLeft: `3px solid ${plan.status === 'OVERDUE' ? PT.danger : PT.warning}`,
              borderRadius: 10,
              padding: '12px 16px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <CategoryBadge type={plan.asset.type} name={plan.asset.name} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: PT.ink,
                }}
              >
                {plan.title} · {plan.asset.name}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: PT.slate,
                }}
              >
                {plan.status === 'OVERDUE' ? 'Manutenzione scaduta' : 'Manutenzione imminente'} · {formatDateForDisplay(plan.nextDueAt)}
                {plan.asset.room ? ` · ${plan.asset.room.name}` : ''}
              </div>
            </div>
            <CalendarClock size={15} color={plan.status === 'OVERDUE' ? PT.danger : PT.warning} />
          </div>
        ))}
      </div>

      {timeline.length > 0 && (
        <>
          <SectionLabel>Cronologia casa</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {timeline.slice(0, 8).map((event) => (
              <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: PT.slate }}>
                <Clock size={13} color={PT.slate} />
                <span style={{ color: PT.ink }}>{event.title}</span>
                <span>· {formatDateForDisplay(event.eventDate)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
