import { useId, useState } from 'react';
import { ui } from './ui';

export function monthPeriod(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith('0000')) return { from: '', to: '' };
  const end = new Date(month + '-01T12:00:00Z');
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return { from: month + '-01', to: end.toISOString().slice(0, 10) };
}
function fullMonth(from: string, to: string) {
  const period = monthPeriod(from.slice(0, 7));
  return !!from && period.from === from && period.to === to;
}

import type {BillPeriodDraft} from '../lib/billPeriod';
/** Both drafts stay local when switching. Only the visible mode feeds the saved dates. */
export function BillPeriodFields({ servicePeriod=false, from, to, onChange, draftValue,onDraftChange,disabled = false, inputId, error }: {
  servicePeriod?:boolean;draftValue?:BillPeriodDraft;onDraftChange?:(value:BillPeriodDraft)=>void;from: string; to: string; onChange: (period: { from: string; to: string }) => void; disabled?: boolean; inputId?:string; error?:string;
}) {
  const id = useId();
  const monthly = fullMonth(from, to);
  const [mode, setMode] = useState<'month' | 'range'>(() => draftValue?.mode??(!from && !to || monthly ? 'month' : 'range'));
  const [month, setMonth] = useState(draftValue?.month??(monthly ? from.slice(0, 7) : ''));
  const [range, setRange] = useState(draftValue?.range??{ from, to });
  function switchMode(next: 'month' | 'range') {
    if (next === mode) return;
    const nextMonth=mode==='month'&&fullMonth(from,to)?from.slice(0,7):month;
    const nextRange=mode==='range'?{from,to}:range.from||range.to?range:{from,to};
    setMonth(nextMonth);setRange(nextRange);setMode(next);
    onDraftChange?.({mode:next,month:nextMonth,range:nextRange});
    onChange(next==='month'?monthPeriod(nextMonth):nextRange);
  }
  return <fieldset className={ui.field} disabled={disabled} data-bill-period="" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <legend className={ui.label}>{servicePeriod?'Periodo dei servizi':'Periodo di riferimento'}</legend>
    <div role="radiogroup" aria-label="A quale periodo si riferisce?" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <label style={{display:"inline-flex",alignItems:"center",gap:6,minHeight:44}}><input type="radio" name={id} checked={mode === 'month'} onChange={() => switchMode('month')} /> Un mese</label>
      <label style={{display:"inline-flex",alignItems:"center",gap:6,minHeight:44}}><input type="radio" name={id} checked={mode === 'range'} onChange={() => switchMode('range')} /> Un intervallo</label>
    </div>
    {mode === 'month' ? <label className={ui.label}>{servicePeriod?'Mese dei servizi':'Mese di riferimento'}<input type="month" id={inputId} aria-invalid={error?true:undefined} aria-describedby={error?id+"-error":undefined} className={ui.input} value={fullMonth(from, to) ? from.slice(0, 7) : ''} onChange={e => { setMonth(e.target.value); onDraftChange?.({mode,month:e.target.value,range}); onChange(monthPeriod(e.target.value)); }} /></label>
      : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <label className={ui.label} style={{ flex: '1 1 140px' }}>Dal<input type="date" id={inputId} aria-invalid={error?true:undefined} aria-describedby={error?id+"-error":undefined} className={ui.input} value={from} onChange={e => { const next = { from: e.target.value, to }; setRange(next); onDraftChange?.({mode,month,range:next}); onChange(next); }} /></label>
        <label className={ui.label} style={{ flex: '1 1 140px' }}>Al<input type="date" aria-invalid={error?true:undefined} aria-describedby={error?id+"-error":undefined} className={ui.input} value={to} onChange={e => { const next = { from, to: e.target.value }; setRange(next); onDraftChange?.({mode,month,range:next}); onChange(next); }} /></label>
      </div>}
    {error&&<p id={id+"-error"} role="alert">{error}</p>}
    <p className={ui.hint}>{servicePeriod?'Periodo dei servizi: distinto dal mese della fattura. Se non indicato, non viene inventato.':'Questo periodo determina dove trovi la bolletta nei riepiloghi delle spese.'}{mode === 'range' && ' Un intervallo su più mesi viene conteggiato una sola volta, nel mese iniziale.'}</p>
  </fieldset>;
}
