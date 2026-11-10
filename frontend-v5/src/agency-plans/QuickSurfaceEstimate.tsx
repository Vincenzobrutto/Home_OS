import {useEffect,useState,type ReactNode} from 'react';
import type {BalconyCover,QuickEstimate,QuickEstimateInput,QuickEstimateScale} from './api';
import type {Point,PlanShape} from './PlanMeasurementView';
import type {MeasurementConfiguration} from './measurement-types';
import {isAppurtenance,isBalcony,netArea,overlapArea,paperMetresPerPixel,suggestedCoefficient,type ScaleDetection,type ScaleReference} from './scaleDetection';
import styles from './practice-plan.module.css';

export type ScaleSelection={mode:'auto'|'paper'|'manual';segment:[Point,Point]|null};
export type GrossOutline={shape:PlanShape;status:'saved'|'draft'|'proposed'};
type Cover='covered'|'uncovered'|'';
type Props={
 active:boolean;sourceUrl:string;width:number;height:number;
 /** Every room currently on the map (unsaved corrections included). */
 rooms:PlanShape[];gross:GrossOutline|null;
 balconyCovers?:BalconyCover[];saved?:QuickEstimate|null;configuration?:MeasurementConfiguration|null;
 busy:boolean;selection:ScaleSelection;onSelection:(selection:ScaleSelection)=>void;
 requestSegment:(done:(a:Point,b:Point)=>void)=>void;
 onSave:(payload:QuickEstimateInput)=>void;
 onFocus:(id:string)=>void;onReviewOverlap?:(id:string)=>void;onAddBalcony?:()=>void;onDrawPerimeter?:()=>void;
 advanced:ReactNode;
};
const number=(n:number)=>n.toLocaleString('it-IT',{maximumFractionDigits:1,minimumFractionDigits:1});
const COVER_COEFFICIENT={covered:.35,uncovered:.25};
function scaleSignature(scale:QuickEstimateScale|undefined){
 if(!scale)return '';
 return scale.mode==='paper'
  ?JSON.stringify([scale.mode,scale.format,scale.denominator])
  :JSON.stringify([scale.mode,scale.start,scale.end,scale.metres]);
}
/** Rooms valued below 100% whose outline overlaps the gross outline by more than 5% risk being counted twice. */
export function doubleCountIds(rooms:PlanShape[],gross:PlanShape|null){
 if(!gross)return [];
 return rooms.filter(room=>isAppurtenance(room)&&overlapArea(room,gross)>netArea(room)*.05).map(room=>room.id);
}
export function QuickSurfaceEstimate(p:Props){
 const savedScale=p.saved?.scale;
 const savedQuickBar:ScaleReference|null=savedScale?.mode==='bar'?{start:savedScale.start,end:savedScale.end,metres:savedScale.metres,method:'detected_bar'}:null;
 const savedBar:ScaleReference|null=p.configuration?.calibration&&!p.configuration.calibration.paper&&p.configuration.calibration.metres>0?{...p.configuration.calibration,method:'saved'}:null;
 const [reading,setReading]=useState(false),[detection,setDetection]=useState<ScaleDetection|null>(null),[failed,setFailed]=useState(false);
 const {mode,segment}=p.selection;
 const setMode=(next:ScaleSelection['mode'])=>p.onSelection({mode:next,segment});
 const [format,setFormat]=useState<string>(savedScale?.mode==='paper'?savedScale.format:p.configuration?.calibration.paper?.format??'');
 const [ratio,setRatio]=useState<string|null>(savedScale?.mode==='paper'?String(savedScale.denominator):p.configuration?.calibration.paper?String(p.configuration.calibration.paper.denominator):null);
 const [metres,setMetres]=useState(savedScale?.mode==='manual'?String(savedScale.metres):'');
 const [covers,setCovers]=useState<Record<string,Cover>>({});
 const savedParameters=p.saved?.parameters;
 const [wallPercent,setWallPercent]=useState(savedParameters?.wallPercent??10);
 const [coefficients,setCoefficients]=useState<Record<string,number>>(()=>Object.fromEntries((savedParameters?.coefficients??[]).map(({id,coefficient})=>[id,coefficient])));
 const [advancedOpened,setAdvancedOpened]=useState(false);
 const [editingTable,setEditingTable]=useState(false);
 const knownScale=!!savedScale||!!savedBar;
 useEffect(()=>{
  if(!p.active||detection||failed||knownScale)return;
  const c=new AbortController();let live=true;
  void (async()=>{setReading(true);try{const {detectPlanScale}=await import('./detectPlanScale');const value=await detectPlanScale(p.sourceUrl,c.signal);if(live&&!c.signal.aborted)setDetection(value);}catch{if(live&&!c.signal.aborted)setFailed(true);}finally{if(live)setReading(false);}})();
  return()=>{live=false;c.abort();};
 },[p.active,p.sourceUrl,detection,failed,knownScale]);

 // Scale: two points on the map, then the metric bar, then printed scale with sheet format.
 const manual=mode==='manual'&&segment?{start:segment[0],end:segment[1],metres:Number(metres),method:'manual' as const}:null;
 const bar=manual&&manual.metres>0?manual:mode==='auto'?(savedQuickBar??savedBar??detection?.bar??null):null;
 const denominator=ratio??(detection?.denominator?String(detection.denominator):'');
 const usePaper=mode==='paper'||mode==='auto'&&!bar;
 const unconfirmedRatio=usePaper&&ratio===null&&!!detection?.denominator;
 let scaleX=0,scaleY=0,scaleError='',basis='';
 if(bar){
  const distance=Math.hypot(bar.end[0]-bar.start[0],bar.end[1]-bar.start[1]);
  if(distance>0&&Number.isFinite(bar.metres)){scaleX=scaleY=bar.metres/distance;basis=bar.method==='detected_bar'?`Barra metrica del documento · ${bar.metres} m`:bar.method==='saved'?'Riferimento del computo dettagliato':`Misura su due punti · ${bar.metres} m`;}
  else scaleError='I due punti devono essere distinti e la lunghezza valida.';
 }else if(usePaper&&!unconfirmedRatio&&format&&Number(denominator)>=1){
  const scale=paperMetresPerPixel(format,Number(denominator),p.width,p.height);
  if(!scale)scaleError='Il foglio non corrisponde al formato scelto: potrebbe essere ritagliato. Usa due punti di una misura nota.';
  else{[scaleX,scaleY]=scale;basis=`Scala 1:${denominator} su foglio ${format} intero`;}
 }
 const toM2=(shape:PlanShape)=>netArea(shape)*scaleX*scaleY;
 const hasScale=scaleX>0&&scaleY>0;

 // Apartment gross area: saved/proposed outline (walls included) or rooms plus a wall allowance.
 const appurtenances=p.rooms.filter(isAppurtenance),principals=p.rooms.filter(room=>!isAppurtenance(room));
 const coefficientOf=(room:PlanShape)=>coefficients[room.id]??suggestedCoefficient(room);
 const principalNet=principals.reduce((sum,room)=>sum+toM2(room)*coefficientOf(room),0);
 const gross=p.gross?toM2(p.gross.shape):principalNet*(1+wallPercent/100);
 const overlapIds=doubleCountIds(p.rooms,p.gross?.shape??null);
 const rows=appurtenances.map(room=>{
  const savedCover=p.balconyCovers?.find(entry=>entry.id===room.id)?.cover;
  const assignment=p.configuration?.assignments.find(entry=>entry.id===room.id);
  const savedType:Cover=savedCover?savedCover==='unset'?'':savedCover:assignment?.kind==='covered_balcony'?'covered':assignment?.kind==='uncovered_balcony'?'uncovered':'';
  const balcony=isBalcony(room),type=balcony?covers[room.id]??savedType:'';
  const coefficient=balcony?(type?COVER_COEFFICIENT[type]:0):coefficientOf(room);
  const area=hasScale?toM2(room):null;
  return {room,balcony,type,savedType,coefficient,area,contribution:area===null?null:area*coefficient,overlap:overlapIds.includes(room.id)};
 });
 const appurtenanceTotal=rows.reduce((sum,row)=>sum+(row.contribution??0),0);
 const missingCover=rows.filter(row=>row.balcony&&!row.type);
 const overlappingRows=rows.filter(row=>row.overlap);

 // What Salva will persist.
 const scalePayload:QuickEstimateScale|undefined=manual&&manual.metres>0?{mode:'manual',start:manual.start,end:manual.end,metres:manual.metres}:bar&&(bar.method==='detected_bar'||bar.method==='saved')?{mode:'bar',start:bar.start,end:bar.end,metres:bar.metres}:usePaper&&!bar&&hasScale?{mode:'paper',format:format as 'A4',denominator:Number(denominator)}:undefined;
 const coverPayload:BalconyCover[]=rows.filter(row=>row.balcony).map(row=>({id:row.room.id,cover:row.type||'unset'}));
 const parameters={
  wallPercent,
  coefficients:p.rooms.flatMap(room=>coefficients[room.id]===undefined?[]:[{id:room.id,coefficient:coefficients[room.id]!}]),
 };
 const savedCoefficients=new Map(savedParameters?.coefficients.map(({id,coefficient})=>[id,coefficient]));
 const parametersChanged=parameters.wallPercent!==(savedParameters?.wallPercent??10)
  ||parameters.coefficients.length!==savedCoefficients.size
  ||parameters.coefficients.some(({id,coefficient})=>savedCoefficients.get(id)!==coefficient);
 const pending=[
  ...(parametersChanged?['parametri di calcolo']:[]),
  ...(p.gross&&p.gross.status!=='saved'?[p.gross.status==='proposed'?'conferma del perimetro':'perimetro corretto']:[]),
  ...(rows.some(row=>row.balcony&&row.type!==row.savedType)?['copertura dei balconi']:[]),
  ...(scaleSignature(scalePayload)!==scaleSignature(savedScale)&&(scalePayload||p.saved)?['scala']:[]),
 ];
 const dirty=pending.length>0||!p.saved;
 const savedAt=p.saved?new Date(p.saved.savedAt).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'';

 return <section className={styles.surfacePanel} aria-label="Calcola superfici">
  <div className={styles.estimateCard} aria-label="Stima della superficie commerciale" role="group">
   <dl className={styles.estimateRows}>
    <div><dt>Appartamento<small>{p.gross?p.gross.status==='proposed'?'Perimetro lordo proposto':p.gross.status==='draft'?'Perimetro lordo in modifica':'Perimetro lordo':`Somma dei vani + ${wallPercent}% per i muri`}</small></dt><dd>{hasScale?number(gross)+' m²':'—'}</dd></div>
    <div><dt>Pertinenze ponderate</dt><dd>{hasScale?number(appurtenanceTotal)+' m²':'—'}</dd></div>
    <div className={styles.estimateTotal}><dt>Totale stimato</dt><dd>{hasScale?number(gross+appurtenanceTotal)+' m²':'—'}</dd></div>
   </dl>
   <p className={styles.muted}>Scala usata · {hasScale?basis:reading?'Lettura del documento…':'Da indicare'}</p>
   {missingCover.length>0&&hasScale&&<p className={styles.muted}>Scegli Coperto o Scoperto per {missingCover.map(row=>row.room.label).join(', ')}: finché manca, il balcone non entra nel totale.</p>}
   {overlappingRows.length>0&&<div className={styles.inlineWarning}>
    <p role="alert">Rischio di doppio conteggio: {overlappingRows.map(row=>row.room.label).join(', ')}. Confronta il bordo blu dell’appartamento con la pertinenza in arancione. Se il bordo entra nella pertinenza, sposta i punti per seguire il filo esterno dei muri.</p>
    {overlappingRows.map(({room})=><div key={room.id} className={styles.row}>
     <button type="button" onClick={()=>p.onFocus(room.id)}>Mostra sulla mappa · {room.label}</button>
     {p.onReviewOverlap&&<button type="button" disabled={p.busy} onClick={()=>p.onReviewOverlap?.(room.id)}>Correggi perimetro · {room.label}</button>}
    </div>)}
   </div>}
   <div className={styles.saveRow}>
    <button type="button" className={styles.primaryButton} disabled={p.busy||!dirty||unconfirmedRatio||!!scaleError} onClick={()=>p.onSave({covers:coverPayload,parameters,...(scalePayload?{scale:scalePayload}:{})})}>{p.saved&&!dirty?'Stima salvata':'Salva stima'}</button>
    <p className={styles.muted}>{dirty?(pending.length?'Da salvare: '+pending.join(', ')+'.':'Stima non ancora salvata nella pratica.'):`Stima salvata il ${savedAt}. Si ricalcola dai contorni attuali.`} Stima sul documento, non computo dettagliato né misura certificata.</p>
   </div>
  </div>

  <details className={styles.panelSection} open={!hasScale||undefined}>
   <summary>Modifica scala</summary>
   {reading&&!bar&&<p role="status">Cerco barra metrica e scala sul documento, senza invii esterni…</p>}
   {bar&&<p><strong>{basis}</strong></p>}
   {bar&&bar.method!=='manual'&&<svg className={styles.scaleReference} role="img" aria-label="Riferimento usato per la scala" viewBox={`${Math.max(0,Math.min(bar.start[0],bar.end[0])-40)} ${Math.max(0,Math.min(bar.start[1],bar.end[1])-50)} ${Math.abs(bar.end[0]-bar.start[0])+80} ${Math.abs(bar.end[1]-bar.start[1])+100}`}><image href={p.sourceUrl} width={p.width} height={p.height}/><line x1={bar.start[0]} y1={bar.start[1]} x2={bar.end[0]} y2={bar.end[1]} stroke="#006476" strokeWidth="3"/></svg>}
   {mode==='manual'&&segment&&<label>Lunghezza reale tra i due punti (m)<input type="number" min="0.01" step="any" value={metres} onChange={e=>setMetres(e.target.value)}/></label>}
   {usePaper&&!bar&&<>
    <p>{reading?'Puoi indicare il foglio mentre leggo il documento.':failed?'Lettura automatica non disponibile.':detection?.ambiguous?'Riferimenti non concordi sul documento.':unconfirmedRatio?`Lettura OCR da verificare · 1:${denominator}. Confrontala con la planimetria, poi confermala o correggila.`:denominator?'Indica il formato del foglio scansionato.':'Scala non trovata sul documento. Indica scala e formato del foglio, oppure misura due punti noti sulla mappa.'}</p>
    <div className={styles.fieldGrid}>
     <label>Scala dichiarata · 1:<input type="number" min="1" max="10000" value={denominator} onChange={e=>setRatio(e.target.value)} placeholder="Es. 100"/></label>
     {unconfirmedRatio&&<button type="button" disabled={p.busy} onClick={()=>setRatio(denominator)}>Conferma scala 1:{denominator}</button>}
     <label>Formato del foglio<select value={format} onChange={e=>{setFormat(e.target.value);setMode('paper');}}><option value="">Scegli formato</option><option value="A4">A4 · 21 × 29,7 cm</option><option value="A3">A3 · 29,7 × 42 cm</option><option value="A2">A2 · 42 × 59,4 cm</option><option value="A1">A1 · 59,4 × 84,1 cm</option></select></label>
    </div>
   </>}
   {scaleError&&<p role="alert" className={styles.inlineWarning}>{scaleError}</p>}
   <div className={styles.row}>
    <button type="button" disabled={p.busy} onClick={()=>p.requestSegment((start,end)=>{p.onSelection({mode:'manual',segment:[start,end]});})}>{hasScale?'Correggi con due punti sulla mappa':'Misura due punti sulla mappa'}</button>
    {!usePaper&&<button type="button" disabled={p.busy} onClick={()=>setMode('paper')}>Usa scala e formato del foglio</button>}
    {mode!=='auto'&&<button type="button" disabled={p.busy} onClick={()=>setMode('auto')}>Torna alla scala del documento</button>}
   </div>
  </details>

  <section aria-labelledby="gross-heading" className={styles.panelSection}>
   <h4 id="gross-heading">Perimetro lordo dell’appartamento</h4>
   {p.gross?.status==='saved'&&<p>Salvato. Seleziona il contorno sulla mappa per correggerne i vertici.</p>}
   {p.gross?.status==='draft'&&<p><strong>Perimetro modificato.</strong> Con Salva stima lo confermi.</p>}
   {p.gross?.status==='proposed'&&<p><strong>Proposto da Dimora.</strong> Controlla il filo esterno dei muri sulla mappa e sposta i vertici se serve. Con Salva stima lo confermi.</p>}
   {!p.gross&&<><p><strong>Nessun perimetro proposto.</strong> Disegnalo sulla mappa seguendo il filo esterno dei muri. Intanto la stima usa la somma dei vani con maggiorazione muri del {wallPercent}%.</p>
    {p.onDrawPerimeter&&<button type="button" className={styles.primaryButton} disabled={p.busy} onClick={p.onDrawPerimeter}>Disegna perimetro lordo</button>}</>}
   {p.gross&&<p className={styles.muted}>Il perimetro lordo comprende già i muri: nessuna maggiorazione aggiunta, i singoli vani non vengono sommati di nuovo.</p>}
  </section>

  <section aria-labelledby="appurtenances-heading" className={styles.panelSection}>
   <h4 id="appurtenances-heading">Balconi e pertinenze</h4>
   {!rows.length&&<p>Nessun balcone tra i vani. Se la pianta ne mostra uno, aggiungilo.</p>}
   <ul className={styles.appurtenanceList}>{rows.map(row=><li key={row.room.id} className={row.overlap?styles.overlapRow:undefined}>
    <button type="button" className={styles.linkButton} onClick={()=>p.onFocus(row.room.id)}>{row.room.label}</button>
    {row.balcony?<fieldset className={styles.coverChoice} disabled={p.busy}><legend>Copertura {row.room.label}</legend>
     {(['covered','uncovered'] as const).map(value=><label key={value}><input type="radio" name={'cover-'+row.room.id} value={value} checked={row.type===value} onChange={()=>setCovers(current=>({...current,[row.room.id]:value}))}/>{value==='covered'?'Coperto':'Scoperto'}</label>)}
    </fieldset>:<span className={styles.muted}>Coefficiente proposto dal tipo</span>}
    <p>{row.area===null?'Superficie dopo la scala':`${number(row.area)} m² × ${Math.round(row.coefficient*100)}% = `}{row.area!==null&&<strong>{number(row.contribution!)} m²</strong>}{row.balcony&&!row.type&&row.area!==null&&' · copertura da scegliere'}</p>
    {row.overlap&&<p className={styles.inlineWarning}>Si sovrappone al perimetro lordo: rischio di contarlo due volte.</p>}
   </li>)}</ul>
   {p.onAddBalcony&&<button type="button" disabled={p.busy} onClick={p.onAddBalcony}>Aggiungi balcone</button>}
  </section>

  {hasScale&&p.rooms.length>0&&<section className={styles.panelSection} aria-label="Superfici e correzioni della stima">
   {(!p.gross||rows.some(row=>!row.balcony))&&<button type="button" aria-expanded={editingTable} onClick={()=>setEditingTable(current=>!current)}>
    {editingTable?'Nascondi correzioni':'Correggi parametri · facoltativo'}
   </button>}
   <div className={styles.checklistScroll} tabIndex={0}>
    <table className={styles.checklistTable}>
     <caption>Superfici dei vani</caption>
     <thead><tr><th scope="col">Vano</th><th scope="col">Netta</th><th scope="col">Nel totale</th></tr></thead>
     <tbody>{p.rooms.map(room=>{
      const row=rows.find(item=>item.room.id===room.id);
      const canEdit=room.kind!=='excluded'&&!isBalcony(room)&&(!p.gross||!!row);
      const contribution=room.kind==='excluded'?'Escluso':row
       ?row.balcony&&!row.type?'Copertura da scegliere':`Pertinenza ${Math.round(row.coefficient*100)}%`
       :p.gross?'Compreso nel lordo':`${Math.round(coefficientOf(room)*100)}% + muri`;
      return <tr key={room.id}>
       <th scope="row">{room.label}</th>
       <td>{number(toM2(room))} m²</td>
       <td>{editingTable&&canEdit?<label className={styles.tableEstimateField}>Coefficiente (%)
        <input aria-label={`Coefficiente di ${room.label} (%)`} type="number" min="0" max="100" step="any"
         disabled={p.busy} value={Math.round(coefficientOf(room)*10000)/100}
         onChange={event=>{
          const coefficient=Math.max(0,Math.min(100,Number(event.target.value)))/100;
          setCoefficients(current=>({...current,[room.id]:coefficient}));
         }}/>
       </label>:contribution}</td>
      </tr>;
     })}</tbody>
     {editingTable&&!p.gross&&<tfoot><tr>
      <th scope="row" colSpan={2}>Maggiorazione muri</th>
      <td><label className={styles.tableEstimateField}>Aggiunta (%)
       <input aria-label="Maggiorazione muri senza perimetro lordo (%)" type="number" min="0" max="30" step="any"
        disabled={p.busy} value={wallPercent} onChange={event=>setWallPercent(Math.max(0,Math.min(30,Number(event.target.value))))}/>
      </label></td>
     </tr></tfoot>}
    </table>
   </div>
   {editingTable&&<p className={styles.muted}>Le correzioni aggiornano il totale stimato. Premi Salva stima per conservarle.</p>}
  </section>}
  {!p.rooms.length&&<p>Aggiungi almeno un vano alla mappa per ottenere le superfici.</p>}

  <details className={styles.documentTools} onToggle={e=>{if(e.currentTarget.open)setAdvancedOpened(true);}}><summary>Computo dettagliato · facoltativo</summary>
   <p className={styles.muted}>Separato dalla stima: richiede criterio, muri e conferme e produce un prospetto verificabile.</p>
   {advancedOpened&&p.advanced}
  </details>
 </section>;
}
