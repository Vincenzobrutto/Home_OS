import type { ReactNode } from 'react';
import { UserCheck, Sparkles, ShieldCheck } from 'lucide-react';
import { T } from '../theme';
import { formatDateForDisplay } from '../api';
import type { FieldOrigin } from '../types';

export function Stamp({
  children,
  tone = 'pine',
}: {
  children: ReactNode;
  tone?: 'pine' | 'ochre' | 'rust' | 'slate';
}) {
  const colors = { pine: T.pine, ochre: T.ochreDeep, rust: T.rust, slate: T.slate };
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10.5,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: colors[tone],
        border: `1px solid ${colors[tone]}`,
        borderRadius: 3,
        padding: '3px 7px',
        transform: 'rotate(-1.5deg)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function StatusDot({ status }: { status: 'OK' | 'ATTENTION' | 'DUE' }) {
  const map = {
    OK: { c: T.pine, l: 'In regola' },
    ATTENTION: { c: T.ochreDeep, l: 'Da verificare' },
    DUE: { c: T.rust, l: 'In scadenza' },
  };
  const s = map[status] || map.OK;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.ink70 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.c, display: 'inline-block' }} />
      {s.l}
    </span>
  );
}

// Da chi/dove viene un campo — icona + tooltip nativo (title), stesso
// pattern già usato altrove nel repo per i tooltip, nessuna libreria nuova.
// Assente quando la provenienza non è nota (campo scritto prima di questo
// tracciamento, vedi decisions.md B38): niente badge, non un errore.
export function ProvenanceBadge({
  origin,
  sourceDocument,
  confirmedByUser,
  confirmedAt,
}: {
  origin: FieldOrigin;
  sourceDocument?: { originalFilename: string } | null;
  confirmedByUser?: { name: string | null; email: string } | null;
  confirmedAt?: string | null;
}) {
  const who = confirmedByUser?.name || confirmedByUser?.email || null;
  const when = confirmedAt ? formatDateForDisplay(confirmedAt) : null;
  const icon =
    origin === 'EXTRACTED' ? (
      <Sparkles size={12} color={T.ochreDeep} />
    ) : origin === 'ATTESTED' ? (
      <ShieldCheck size={12} color={T.pine} />
    ) : (
      <UserCheck size={12} color={T.slate} />
    );
  const title =
    origin === 'EXTRACTED'
      ? `Estratto da ${sourceDocument?.originalFilename ?? 'un documento'}${who ? `, confermato da ${who}` : ''}${when ? ` il ${when}` : ''}`
      : origin === 'ATTESTED'
        ? 'Attestato da una verifica esterna'
        : `Dichiarato${who ? ` da ${who}` : ''}${when ? ` il ${when}` : ''}`;
  return (
    <span title={title} style={{ display: 'inline-flex', marginLeft: 5, verticalAlign: 'middle', cursor: 'help' }}>
      {icon}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: T.slate,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}
