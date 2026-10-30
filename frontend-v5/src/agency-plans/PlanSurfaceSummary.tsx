import type {PlanMeasurementReport} from './api';
import type {PlanShape} from './PlanMeasurementView';
import {CATEGORIES,type MeasurementConfiguration} from './measurement-types';
import styles from './plan-measurement.module.css';

const number=(value:number)=>value.toLocaleString('it-IT',{maximumFractionDigits:2});
const area=(value:number|null|undefined)=>value==null?'Da calcolare':`${number(value)} m²`;
const wallNames:Record<string,string>={internal:'interno',exclusive:'esclusivo',shared:'in comunione',unknown:'da classificare'};
type Props={view:'rooms'|'perimeter';rooms:PlanShape[];configuration?:MeasurementConfiguration|null;measurement?:PlanMeasurementReport|null;measurementsOutdated?:boolean;onSelect:(id:string)=>void};

/** Values come from the authorized, saved server report. No pixel-to-metre shortcut. */
export function PlanSurfaceSummary(p:Props){
 const report=p.measurement;
 const assignment=(id:string)=>p.configuration?.assignments.find(a=>a.id===id);
 const category=(id:string)=>{const a=assignment(id);return a?CATEGORIES[a.kind][0]:'Da classificare';};
 const label=(id:string)=>p.rooms.find(r=>r.id===id)?.label||'Superficie';
 const select=(id:string,text:string)=><button type="button" className={styles.selectShape} onClick={()=>p.onSelect(id)}>{text}</button>;
 if(p.view==='rooms')return <section aria-label="Superfici dei singoli vani" className={styles.summary}>
  <h3>Ambienti e superfici nette</h3>
  <p>Nome e destinazione di ogni vano. La superficie netta esclude i muri e non coincide con quella commerciale.</p>
  <div className={styles.tableScroll}><table><caption>Dettaglio dei vani</caption><thead><tr><th scope="col">Ambiente</th><th scope="col">Destinazione</th><th scope="col">Superficie netta</th></tr></thead><tbody>
   {p.rooms.map(room=>{const net=report?.roomBreakdown?.find(r=>r.id===room.id)?.netM2??report?.surfaces?.find(s=>s.id===room.id)?.measuredM2;return <tr key={room.id}><th scope="row">{select(room.id,room.label)}</th><td>{category(room.id)}</td><td>{area(net)}</td></tr>;})}
  </tbody></table></div>
  {!report&&<p>{p.measurementsOutdated?'Geometrie o impostazioni in modifica: ricalcola prima di usare le metrature.':'Verifica la barra metrica e salva il computo per ottenere le metrature. Nessun valore è dedotto dalla sola scala stampata.'}</p>}
 </section>;

 const gross=report?.base==='gross_perimeter';
 const surfaces=report?.surfaces||[];
 const principals=surfaces.filter(s=>(s.kind??assignment(s.id)?.kind)==='principal');
 const accessories=surfaces.filter(s=>(s.kind??assignment(s.id)?.kind)!=='principal'&&s.id!=='__gross_main');
 const pendingAccessories=p.configuration?.base==='gross_perimeter'?p.rooms.filter(r=>!p.configuration!.mainRegionIds.includes(r.id)):[];
 return <section aria-label="Prospetto della superficie commerciale" className={styles.summary}>
  <h3>Appartamento e pertinenze</h3>
  <p>{gross?'Base: perimetro lordo dell’appartamento, muri interni inclusi. I singoli vani non vengono sommati di nuovo.':report?'Base: superfici nette dei vani principali raggruppate, più fasce dei muri. Il perimetro disegnato non viene aggiunto al totale.':'Definisci il perimetro dell’appartamento e separa le pertinenze nelle impostazioni del computo.'}</p>
  <div className={styles.tableScroll}><table><caption>Prospetto commerciale{report?.policyVersion?` · ${report.policyVersion}`:''}</caption><thead><tr><th scope="col">Componente</th><th scope="col">Superficie</th><th scope="col">Quota</th><th scope="col">Contributo</th></tr></thead><tbody>
   {gross?surfaces.filter(s=>s.id==='__gross_main').map(s=><tr key={s.id}><th scope="row">{select('gross','Appartamento · perimetro lordo')}</th><td>{area(s.measuredM2)}</td><td>100%</td><td>{area(s.weightedM2)}</td></tr>):report?<tr><th scope="row">Appartamento · vani principali</th><td>{area(principals.reduce((n,s)=>n+s.measuredM2,0))}</td><td>{principals.every(s=>s.coefficient===1)?'100%':'Quote applicate'}</td><td>{area(principals.some(s=>s.weightedM2===null)?null:principals.reduce((n,s)=>n+(s.weightedM2??0),0))}</td></tr>:<tr><th scope="row">Appartamento</th><td>Da calcolare</td><td>100%</td><td>Da calcolare</td></tr>}
   {accessories.map(s=><tr key={s.id}><th scope="row">{select(s.id,label(s.id))}<small>{category(s.id)}</small></th><td>{area(s.measuredM2)}</td><td>{s.coefficient==null?'Da scegliere':`${number(s.coefficient*100)}%`}</td><td>{area(s.weightedM2)}</td></tr>)}
   {!report&&pendingAccessories.map(r=><tr key={r.id}><th scope="row">{select(r.id,r.label)}<small>{category(r.id)}</small></th><td>Da calcolare</td><td>Da verificare</td><td>Da calcolare</td></tr>)}
   {(gross?report?.wallAdjustments:report?.walls)?.map((w,i)=><tr key={w.id}><th scope="row">{gross?'Rettifica':'Quota'} muro {i+1} · {wallNames[w.kind]||'da verificare'}</th><td>{area(w.measuredM2)}</td><td>Regola sui muri</td><td>{area('deductionM2' in w?-w.deductionM2:w.weightedM2)}</td></tr>)}
  </tbody></table></div>
  {report?<><p><strong>{report.totalM2===null?`Parziale: ${area(report.partialM2)}`:`Totale commerciale: ${area(report.totalM2)}`}</strong></p>{report.totalM2===null&&<p>Computo incompleto: {report.issues.length} verifiche aperte. Il parziale non è il totale commerciale.</p>}</>:<p>{p.measurementsOutdated?'Misure precedenti sospese: salva le modifiche e ricalcola.':'Metrature e coefficienti compaiono dopo il salvataggio del computo.'}</p>}
  <p className={styles.note}>Muri esclusivi e interni al 100%, comuni al 50%, entro i limiti del criterio adottato. Nel perimetro lordo i muri sono già inclusi: si sottraggono solo le quote non computabili.</p>
 </section>;
}
