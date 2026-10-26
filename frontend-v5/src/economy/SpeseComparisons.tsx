import { useEffect } from 'react';
import type { EconomyCapabilities, Family } from '../api/economyTypes';
import { ErrorState, Loading, ui } from '../components/ui';
import { categoryFitsFamily, comparisonText, familyLabel, formatCentsString, isForbiddenError, economyErrorMessage, parseCentsString, svgFraction, type EconomyFilters } from '../lib/economy';
import { useEconomySummary, useForgetEconomy } from './hooks';
import layout from './speseLayout.module.css';

/** Due riepiloghi server filtrati, non somme della prima pagina né confronti con un ambito nascosto. */
export function SpeseComparisons({homeId, caps, filters, onPick}: {homeId:string;caps:EconomyCapabilities;filters:EconomyFilters;onPick:(family:Family)=>void}) {
  const groups: Family[] = ['works_purchases','maintenance_repairs'];
  const visible=groups.filter(f=>(!filters.family||filters.family===f)&&(!filters.category||categoryFitsFamily(filters.category,f,caps)));
  return <section className={ui.card} aria-labelledby="spese-gruppi-confronto">
    <h2 id="spese-gruppi-confronto">Acquisti e interventi</h2>
    <p className={layout.hint}>Stesso periodo dell’anno precedente · stessi filtri dell’elenco.</p>
    {visible.map(f=><GroupComparison key={f} homeId={homeId} caps={caps} filters={filters} family={f} onPick={onPick}/>)}
    {!visible.length&&<p className={layout.hint}>Nessun gruppo Acquisti o Interventi compatibile con questi filtri.</p>}
    <p className={layout.hint}>Un oggetto nuovo è un acquisto anche se collegato a un lavoro. I componenti sostituiti durante un intervento sono riparazioni e lavori. Lo storico può essere incompleto: le differenze non indicano risparmi.</p>
  </section>;
}

function GroupComparison({homeId,caps,filters,family,onPick}: {homeId:string;caps:EconomyCapabilities;filters:EconomyFilters;family:Family;onPick:(family:Family)=>void}) {
  const result=useEconomySummary(homeId,{...filters,family});
  const forget=useForgetEconomy(homeId),forbidden=result.isError&&isForbiddenError(result.error);
  useEffect(()=>{if(forbidden)forget();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una pulizia per ogni 403, come nel riepilogo principale
  },[forbidden]);
  const title=familyLabel(family,caps);
  if(result.isPending)return <Loading label={`Confronto ${title}…`}/>;
  if(result.isError)return <ErrorState title={`Confronto ${title} non disponibile`} error={result.error} message={economyErrorMessage(result.error)} onRetry={forbidden?undefined:()=>void result.refetch()}/>;
  const data=result.data,text=comparisonText(data.comparison);
  const current=parseCentsString(data.totalCents)??0n;
  const previous=data.comparison.status==='comparable'?parseCentsString(data.comparison.totalCents):null;
  const max=previous!==null&&previous>current?previous:current;
  const color=family==='works_purchases'?'#c67b25':'#132e3e';
  return <div className={layout.groupComparison}>
    <button type="button" className={layout.groupButton} onClick={()=>onPick(family)} aria-label={filters.family===family?`Rimuovi filtro ${title}`:`Filtra ${title}`} aria-pressed={filters.family===family}>
      <span>{title}</span><strong>{formatCentsString(data.totalCents)}</strong>
    </button>
    <div className={layout.comparisonBars} aria-hidden="true">
      <span><span style={{width:`${svgFraction(current,max)*100}%`,background:color}}/></span>
      {previous!==null&&<span><span style={{width:`${svgFraction(previous,max)*100}%`,background:color,opacity:.5}}/></span>}
    </div>
    <p className={layout.hint}>{text.title}</p>
    {text.lines.map(line=><p className={layout.hint} key={line}>{line}</p>)}
  </div>;
}
