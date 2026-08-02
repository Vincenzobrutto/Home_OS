import { T } from '../theme';
import { SectionLabel } from './Shared';

export function Placeholder({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ padding: '36px 44px', maxWidth: 820 }}>
      <SectionLabel>In arrivo</SectionLabel>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: '0 0 12px 0' }}>
        {title}
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink70, maxWidth: 480 }}>{detail}</p>
    </div>
  );
}
