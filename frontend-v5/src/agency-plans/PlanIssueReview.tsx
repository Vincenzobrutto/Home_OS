import {useState} from 'react';
import type {PlanShape,Point} from './PlanMeasurementView';
import styles from './practice-plan.module.css';

type Resolution='included_in_geometry'|'excluded_from_computation'|'not_applicable';

function IssueLocation({sourceUrl,width,height,room,point}:{sourceUrl:string;width:number;height:number;room:PlanShape;point?:Point}){
 const locations=point?[point]:room.points;
 if(!locations.length)return null;
 const xs=locations.map(p=>p[0]),ys=locations.map(p=>p[1]);
 const padding=Math.max(16,Math.max(width,height)*(point ? 0.07 : 0.025));
 const left=Math.max(0,Math.min(...xs)-padding),top=Math.max(0,Math.min(...ys)-padding);
 const right=Math.min(width,Math.max(...xs)+padding),bottom=Math.min(height,Math.max(...ys)+padding);
 const outline=[room.points,...room.holes].map(ring=>'M'+ring.map(p=>p.join(',')).join('L')+'Z').join('');
 return <svg className={styles.issueLocation} role="img" aria-label={'Posizione della verifica · '+room.label} viewBox={[left,top,right-left,bottom-top].join(' ')}>
  <image href={sourceUrl} width={width} height={height}/>
  <path d={outline} fill="none" stroke="#9f4d00" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
  {point&&<circle cx={point[0]} cy={point[1]} r={padding/6} fill="none" stroke="#9f4d00" strokeWidth="2" vectorEffect="non-scaling-stroke"/>}
 </svg>;
}

export function PlanIssueReview(p:{
 index:number;description:string;room?:PlanShape;symbol?:{reason:string;point?:Point};
 sourceUrl:string;width:number;height:number;disabled:boolean;geometryEdited:boolean;
 onResolve:(resolution:Resolution,reason:string)=>void;
}){
 const [resolution,setResolution]=useState<Resolution|''>(''),[reason,setReason]=useState('');
 return <details className={styles.panel}>
  <summary>Verifica {p.index}{p.room?' · '+p.room.label:''}</summary>
  <p>{p.description}</p>
  {p.symbol?.reason&&<p>{p.symbol.reason}</p>}
  {p.sourceUrl&&p.room?<><IssueLocation sourceUrl={p.sourceUrl} width={p.width} height={p.height} room={p.room} point={p.symbol?.point}/>
   {p.symbol&&!p.symbol.point&&<p>Il riquadro mostra il vano. Per questa segnalazione è disponibile solo la posizione del vano.</p>}</>:<p>Posizione sulla mappa non disponibile. Confronta il documento originale prima di registrare un esito.</p>}
  <p>Se serve cambiare il contorno, correggilo sulla mappa e salvalo prima di registrare l’esito.</p>
  <label>Esito verifica {p.index}<select value={resolution} disabled={p.disabled} onChange={e=>setResolution(e.target.value as Resolution|'')}>
   <option value="">Scegli esito</option>
   <option value="included_in_geometry" disabled={!p.geometryEdited}>Ho incluso l’elemento nel contorno</option>
   <option value="excluded_from_computation">Ho verificato che resta fuori dal computo</option>
   <option value="not_applicable">La segnalazione non è pertinente</option>
  </select></label>
  <label>Motivo verifica {p.index}<textarea value={reason} disabled={p.disabled} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>
  <button type="button" disabled={p.disabled||!resolution||!reason.trim()} onClick={()=>{if(resolution)p.onResolve(resolution,reason.trim());}}>Registra verifica {p.index}</button>
 </details>;
}
