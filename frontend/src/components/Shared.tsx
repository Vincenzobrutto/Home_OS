import type { ReactNode } from 'react';
import { T } from '../theme';

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
