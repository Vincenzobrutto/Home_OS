import {useEffect,useState,type ReactNode} from 'react';
import type {Point,PlanShape} from './PlanMeasurementView';
import type {MeasurementConfiguration} from './measurement-types';
import {quickSurfaces,suggestedCoefficient,type ScaleDetection,type ScaleReference} from './scaleDetection';
import styles from './practice-plan.module.css';

type Props={active:boolean;sourceUrl:string;width:number;height:number;rooms:PlanShape[];configuration?:MeasurementConfiguration|null;busy:boolean;advanced:ReactNode;requestSegment:(done:(a:Point,b:Point)=>void)=>void};
const number=(n:number)=>n.toLocaleString('it-IT',{maximumFractionDigits:1,minimumFractionDigits:1});
export function QuickSurfaceEstimate(p:Props){
 const [advancedVisited,setAdvancedVisited]=useState(false);
 const saved=p.configuration?.calibration;
 const savedBar:ScaleReference|null=saved&&!saved.paper&&saved.metres>0?{start:saved.start,end:saved.end,metres:saved.metres,method:'saved'}:null;
 const [reading,setReading]=useState(false),[detection,setDetection]=useState<ScaleDetection|null>(null),[failed,setFailed]=useState(false);
 const [mode,setMode]=useState<'auto'|'paper'|'manual'>('auto'),[format,setFormat]=useState<string>(saved?.paper?.format??''),[ratio,setRatio]=useState<string|null>(saved?.paper?String(saved.paper.denominator):null);
 const [segment,setSegment]=useState<[Point,Point]|null>(null),[metres,setMetres]=useState('');
 const [wallPercent,setWallPercent]=useState(10),[coefficients,setCoefficients]=useState<Record<string,number>>({});
 useEffect(()=>{
  if(!p.active||detection||failed||saved)return;
  const c=new AbortController();let live=true;
  void (async()=>{setReading(true);try{const {detectPlanScale}=await import('./detectPlanScale');const value=await detectPlanScale(p.sourceUrl,c.signal);if(live&&!c.signal.aborted)setDetection(value);}catch{if(live&&!c.signal.aborted)setFailed(true);}finally{if(live)setReading(false);}})();
  return()=>{live=false;c.abort();};
 },[p.active,p.sourceUrl,detection,failed,saved]);
 const bar=mode==='manual'&&segment&&Number(metres)>0?{start:segment[0],end:segment[1],metres:Number(metres),method:'manual' as const}:mode==='auto'?(savedBar??detection?.bar):null;
 const denominator=ratio??(detection?.denominator?String(detection.denominator):'');
 const usePaper=mode==='paper'||mode==='auto'&&!bar;
 let scaleX=0,scaleY=0,error='',basis='';
 if(bar){const distance=Math.hypot(bar.end[0]-bar.start[0],bar.end[1]-bar.start[1]);if(distance>0&&Number.isFinite(bar.metres)){scaleX=scaleY=bar.metres/distance;basis=bar.method==='detected_bar'?`Barra riconosciuta · ${bar.metres} m`:bar.method==='saved'?'Riferimento già salvato':'Misura indicata sul documento';}else error='Gli estremi della misura devono essere distinti e la lunghezza deve essere valida.';}
 else if(usePaper&&format&&Number(denominator)>0){
  const landscape=p.width>p.height;let [w,h]=format==='A4'?[.210,.297]:format==='A3'?[.297,.420]:format==='A2'?[.420,.594]:[.594,.841];if(landscape)[w,h]=[h,w];
  if(Number(denominator)>10000||Math.abs((p.width/p.height)/(w/h)-1)>.03)error='Il foglio non corrisponde al formato scelto: potrebbe essere ritagliato. Usa una misura nota o controlla il formato.';
  else{scaleX=w*Number(denominator)/p.width;scaleY=h*Number(denominator)/p.height;basis=`Foglio ${format} intero · scala 1:${denominator}`;}
 }
 let report:ReturnType<typeof quickSurfaces>|null=null;
 if(scaleX&&scaleY&&p.rooms.length)try{report=quickSurfaces(p.rooms,scaleX,scaleY,wallPercent,coefficients);}catch(e){error=e instanceof Error?e.message:'Controlla il riferimento.';}
 return <section className={styles.panel} aria-label="Stima immediata delle superfici">
  <h3>Superfici dei vani</h3>
  {reading&&<p role="status">Cerco la barra metrica e la scala sul documento, senza invii esterni…</p>}
  {bar&&<p><strong>{basis}</strong> · stima da verificare</p>}
  {usePaper&&!bar&&<div className={styles.fieldGrid}>
   <p>{reading?'Puoi indicare il foglio anche mentre controllo il documento.':failed?'Lettura automatica non disponibile in questa sessione. Usa scala e formato del foglio.':detection?.ambiguous?'Riferimenti non concordi: indica la scala corretta.':'Barra non riconosciuta con sicurezza. Usa scala e formato del foglio.'}</p>
   <label>Scala sul documento · 1:<input type="number" min="1" max="10000" value={denominator} onChange={e=>setRatio(e.target.value)} placeholder="Es. 100"/></label>
   <label>Formato del foglio scansionato<select value={format} onChange={e=>{setFormat(e.target.value);setMode('paper');}}><option value="">Scegli formato</option><option value="A4">A4 · 21 × 29,7 cm</option><option value="A3">A3 · 29,7 × 42 cm</option><option value="A2">A2 · 42 × 59,4 cm</option><option value="A1">A1 · 59,4 × 84,1 cm</option></select></label>
  </div>}
  <div className={styles.row}>
   <button type="button" disabled={p.busy} onClick={()=>p.requestSegment((start,end)=>{
    setSegment([start,end]);
    setMode('manual');
   })}>{bar||report?'Ricalibra sulla mappa':'Definisci scala sulla mappa'}</button>
   {mode==='manual'&&<button type="button" disabled={p.busy} onClick={()=>setMode('auto')}>Torna alla scala automatica</button>}
  </div>
  {mode==='manual'&&<label>Lunghezza reale in metri<input type="number" min="0.01" step="any" value={metres} onChange={e=>setMetres(e.target.value)}/></label>}
  {error&&<p role="alert">{error}</p>}
  {report&&<>
   <p>{basis}</p>
   <div className={styles.surfaceTotal}><span>Commerciale stimata · vani disegnati</span><strong>{number(report.commercial)} m²</strong><small>Netto {number(report.net)} m² · maggiorazione muri {number(report.wallAllowance)} m²</small><small>Stima provvisoria: non modifica il computo salvato.</small></div>
   <div className={styles.checklistScroll}><table className={styles.checklistTable}><caption>Superficie netta per ambiente</caption><thead><tr><th>Ambiente</th><th>Netta</th><th>Coefficiente proposto</th><th>Contributo commerciale</th></tr></thead><tbody>{report.rows.map(r=><tr key={r.id}><th scope="row">{r.label}</th><td>{number(r.area)} m²</td><td>{Math.round(r.coefficient*100)}%</td><td>{number(r.weighted)} m²</td></tr>)}</tbody></table></div>
   <p>Somma dei soli vani presenti: se ne mancano, aggiungili alla mappa. I muri sono stimati con una maggiorazione del {wallPercent}% dei vani al 100%, senza misurare il perimetro lordo. Non è una superficie certificata.</p>
  </>}
  {!p.rooms.length&&<p>Aggiungi almeno un vano alla mappa per ottenere le superfici.</p>}
  <details className={styles.documentTools}><summary>Dettagli e correzioni facoltative</summary>
   <label>Riferimento per la stima<select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="auto">Riconoscimento automatico</option><option value="paper">Scala e formato foglio</option><option value="manual">Misura nota sulla pianta</option></select></label>
   {bar&&<svg className={styles.scaleReference} role="img" aria-label="Barra usata per la stima" viewBox={`${Math.max(0,Math.min(bar.start[0],bar.end[0])-40)} ${Math.max(0,Math.min(bar.start[1],bar.end[1])-50)} ${Math.abs(bar.end[0]-bar.start[0])+80} ${Math.abs(bar.end[1]-bar.start[1])+100}`}><image href={p.sourceUrl} width={p.width} height={p.height}/><line x1={bar.start[0]} y1={bar.start[1]} x2={bar.end[0]} y2={bar.end[1]} stroke="#006476" strokeWidth="2"/></svg>}
   <label>Maggiorazione muri proposta (%)<input type="number" min="0" max="30" value={wallPercent} onChange={e=>setWallPercent(Number(e.target.value))}/></label>
   <p>Valore iniziale del 10%: ipotesi di lavoro modificabile, non una regola normativa. Interni 100%, balconi/terrazzi e cantine 25%, garage 50%: proposte dal tipo o nome del vano, da controllare.</p>
   {p.rooms.map(room=><label key={room.id}>Coefficiente di {room.label} (%)<input type="number" min="0" max="100" value={(coefficients[room.id]??suggestedCoefficient(room))*100} onChange={e=>setCoefficients({...coefficients,[room.id]:Number(e.target.value)/100})}/></label>)}
   <p>Questa stima si ricalcola nella schermata e non sostituisce il computo salvato. Per conservare e controllare una configurazione completa usa il calcolo dettagliato sotto.</p>
  </details>
  <details className={styles.documentTools} onToggle={e=>{if(e.currentTarget.open)setAdvancedVisited(true);}}><summary>Calcolo dettagliato e salvataggio · facoltativo</summary>{advancedVisited&&p.advanced}</details>
 </section>;
}
