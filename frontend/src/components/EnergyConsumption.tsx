import { useEffect, useState } from 'react';
import { FileText, Zap } from 'lucide-react';
import { api } from '../api';
import { iconForAsset, T } from '../theme';
import type { EnergyConsumptionResponse, House } from '../types';
import { SectionLabel } from './Shared';

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function deltaColor(delta: number | null) {
  if (delta === null || Math.abs(delta) < 3) return T.slate;
  if (delta < 0) return '#0D9488';
  if (delta < 10) return T.ochreDeep;
  return T.rust;
}

export function EnergyConsumption({
  house,
  openAsset,
  openInbox,
}: {
  house: House;
  openAsset: (id: string) => void;
  openInbox: () => void;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<EnergyConsumptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.energy.consumption(house.id, year)
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Impossibile caricare i consumi'))
      .finally(() => setLoading(false));
  }, [house.id, year]);

  const hasData = data?.months.some((month) => month.currentKwh !== null || month.previousKwh !== null) ?? false;
  const maxKwh = Math.max(1, ...(data?.months.flatMap((month) => [month.currentKwh ?? 0, month.previousKwh ?? 0]) ?? [1]));

  return (
    <div style={{ padding: '36px 44px', maxWidth: 1080 }}>
      <SectionLabel>{house.code} — Energia</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, color: T.ink, margin: '0 0 6px' }}>Consumi elettrici</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate, margin: 0, lineHeight: 1.5 }}>Confronto mese su stesso mese dell’anno precedente. Le installazioni sono evidenze temporali, non una stima automatica del loro impatto.</p>
        </div>
        <select value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Anno da analizzare" style={{ border: `1px solid ${T.line}`, borderRadius: 7, background: T.card, color: T.ink, padding: '8px 10px', fontFamily: "'Inter', sans-serif" }}>
          {(data?.availableYears.length ? data.availableYears : [year]).map((availableYear) => <option key={availableYear} value={availableYear}>{availableYear}</option>)}
        </select>
      </div>

      {loading && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slate }}>Caricamento consumi…</div>}
      {error && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.rust }}>{error}</div>}
      {!loading && !error && !hasData && (
        <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: '44px 20px', textAlign: 'center', background: T.card }}>
          <Zap size={25} color={T.ochreDeep} />
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 600, color: T.ink, marginTop: 10 }}>Nessun consumo elettrico confermato</div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.slate, lineHeight: 1.5 }}>Carica una bolletta in Inbox: Dimora estrae periodo e kWh, ma li salva solo dopo il tuo controllo.</p>
          <button onClick={openInbox} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none', borderRadius: 7, background: T.pine, color: '#fff', padding: '9px 14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}><FileText size={14} /> Apri Inbox</button>
        </div>
      )}

      {!loading && !error && data && hasData && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, marginBottom: 12 }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: T.pine, marginRight: 5 }} />{data.year}</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#CBD5E1', marginRight: 5 }} />{data.previousYear}</span>
            <span>~ valore ripartito da un periodo plurimensile</span>
          </div>
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ minWidth: 820, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(58px, 1fr))', gap: 7, height: 350, alignItems: 'end', padding: '16px 12px 0', border: `1px solid ${T.line}`, borderRadius: 10, background: T.card }}>
              {data.months.map((month) => {
                const currentHeight = ((month.currentKwh ?? 0) / maxKwh) * 190;
                const previousHeight = ((month.previousKwh ?? 0) / maxKwh) * 190;
                return (
                  <div key={month.month} style={{ minWidth: 0, textAlign: 'center' }}>
                    <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {month.deltaPercent !== null && <span title={`Variazione rispetto a ${MONTHS[month.month - 1]} ${data.previousYear}`} style={{ borderRadius: 10, padding: '2px 5px', background: `${deltaColor(month.deltaPercent)}18`, color: deltaColor(month.deltaPercent), fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 600 }}>{month.deltaPercent > 0 ? '+' : ''}{month.deltaPercent}%</span>}
                    </div>
                    <div style={{ height: 205, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, borderBottom: `1px solid ${T.line}` }}>
                      <div title={month.previousKwh === null ? `Nessun dato ${data.previousYear}` : `${month.estimatedPrevious ? '~' : ''}${month.previousKwh} kWh — ${MONTHS[month.month - 1]} ${data.previousYear}`} style={{ width: 17, height: previousHeight, minHeight: month.previousKwh === null ? 0 : 2, background: '#CBD5E1', borderRadius: '3px 3px 0 0' }} />
                      <div title={month.currentKwh === null ? `Nessun dato ${data.year}` : `${month.estimatedCurrent ? '~' : ''}${month.currentKwh} kWh — ${MONTHS[month.month - 1]} ${data.year}`} style={{ width: 17, height: currentHeight, minHeight: month.currentKwh === null ? 0 : 2, background: T.pine, borderRadius: '3px 3px 0 0' }} />
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.ink, marginTop: 5 }}>{String(data.year).slice(-2)}: {month.estimatedCurrent ? '~' : ''}{month.currentKwh ?? '—'}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: T.slate, marginTop: 1 }}>{String(data.previousYear).slice(-2)}: {month.estimatedPrevious ? '~' : ''}{month.previousKwh ?? '—'}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, color: T.slate, marginTop: 2 }}>{MONTHS[month.month - 1]}</div>
                    <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 3 }}>
                      {month.installations.map((asset) => {
                        const Icon = iconForAsset(asset);
                        return <button key={asset.id} onClick={() => openAsset(asset.id)} title={`Installato: ${asset.name}`} aria-label={`Apri ${asset.name}, installato a ${MONTHS[month.month - 1]} ${data.year}`} style={{ width: 25, height: 25, borderRadius: '50%', border: `1px solid ${T.line}`, background: '#EEF2EC', color: T.pine, padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={13} /></button>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: T.slate, lineHeight: 1.5, marginTop: 8 }}>Le barre mostrano kWh. Un badge sotto il mese indica un Asset con data di installazione in quel periodo; serve a contestualizzare il trend, non attribuisce automaticamente consumi o risparmi.</div>
        </>
      )}
    </div>
  );
}
