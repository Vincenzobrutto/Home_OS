import {useState} from 'react';
import type {AgencyPractice} from './api';
import styles from './practice-plan.module.css';

type Document = AgencyPractice['documents'][number];
type Entry = {id:string; label:string; when:string};
const base: Entry[] = [
 {id:'mandate',label:'Incarico di vendita',when:'Apertura pratica'},
 {id:'identity',label:'Identità e codice fiscale dei venditori',when:'Apertura pratica'},
 {id:'deed',label:'Titolo di provenienza',when:'Prima dell’accordo'},
 {id:'cadastral',label:'Visura catastale',when:'Preparazione della vendita'},
 {id:'floor_plan',label:'Planimetria catastale',when:'Preparazione della vendita'},
 {id:'ape',label:'APE',when:'Prima della pubblicazione'},
 {id:'building',label:'Documentazione edilizia e agibilità',when:'Da avviare in preparazione'},
];
const kinds = new Map([['deed','deed'],['cadastral','cadastral'],['floor_plan','floor_plan'],['ape','ape'],['succession','succession']]);
const hints: Array<[string,RegExp]> = [
 ['mandate',/\bincarico\b/], ['identity',/\b(carta identita|documento identita|codice fiscale)\b/],
 ['deed',/\b(atto di acquisto|rogito|titolo di provenienza)\b/], ['cadastral',/\bvisura catastale\b/],
 ['floor_plan',/\bplanimetria\b/], ['ape',/\b(ape|attestato di prestazione energetica)\b/],
 ['building',/\b(agibilita|pratica edilizia|permesso di costruire|cila|scia)\b/],
 ['condo',/\b(regolamento condominiale|rendiconto condominiale)\b/],
 ['tenancy',/\bcontratto di locazione\b/], ['succession',/\bdichiarazione di successione\b/],
];
function normalized(value:string) {
 return value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function recognized(doc:Document) {
 if(doc.kind!=='unclassified')return kinds.get(doc.kind);
 const name=normalized(doc.filename);
 const matches=hints.filter(([,pattern])=>pattern.test(name));
 return matches.length===1?matches[0]?.[0]:undefined;
}
const situations=[
 {id:'condo',question:'L’immobile è in condominio?',hint:/\b(condominio|condominiale)\b/,entries:[
  {id:'condo',label:'Regolamento e informazioni sulle spese condominiali',when:'Preparazione della vendita'},
  {id:'condo_statement',label:'Dichiarazione dell’amministratore',when:'Verso il rogito'},
 ]},
 {id:'mortgage',question:'C’è un mutuo del venditore da estinguere con la vendita?',hint:/\b(mutuo|estintivo)\b/,entries:[
  {id:'mortgage',label:'Conteggio estintivo della banca',when:'Verso il rogito'},
 ]},
 {id:'tenancy',question:'L’immobile è locato?',hint:/\blocazione\b/,entries:[
  {id:'tenancy',label:'Contratto di locazione',when:'Preparazione della vendita'},
 ]},
 {id:'succession',question:'L’immobile proviene da una successione?',hint:/\bsuccessione\b/,entries:[
  {id:'succession',label:'Documenti di successione',when:'Da verificare con il notaio'},
 ]},
];
type Answer='yes'|'no'|'check';
export function FascicoloChecklist({documents,canEdit,simulation=false}:{documents:Document[];canEdit:boolean;simulation?:boolean}) {
 const [answers,setAnswers]=useState<Record<string,Answer>>({});
 const [custom,setCustom]=useState<Entry[]>([]);
 const [newLabel,setNewLabel]=useState('');
 const [assignments,setAssignments]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState<string[]>([]);
 const [waiting,setWaiting]=useState<string[]>([]);
 const [draft,setDraft]=useState('');
 const [notice,setNotice]=useState('');
 const [showAll,setShowAll]=useState(false);
 const [acquisition,setAcquisition]=useState<'idle'|'confirm'|'pending'|'received'>('idle');
 const entries=[...base,...situations.filter(s=>answers[s.id]==='yes').flatMap(s=>s.entries),...custom];
 const entryIds=new Set(entries.map(e=>e.id));
 const received=new Map<string,Document[]>();
 const unclassified:Document[]=[];
 for(const doc of documents){
  const id=assignments[doc.id]||recognized(doc);
  if(id&&entryIds.has(id))received.set(id,[...(received.get(id)||[]),doc]);
  else unclassified.push(doc);
 }
 const simulatedPlan=acquisition==='received';
 const hasPlan=received.has('floor_plan')||simulatedPlan;
 const receivedCount=received.size+Number(simulatedPlan&&!received.has('floor_plan'));
 const request=entries.filter(e=>selected.includes(e.id)&&!received.has(e.id)&&!(e.id==='floor_plan'&&hasPlan));
 const questions=situations.map(s=>({...s,evidence:documents.find(d=>s.hint.test(normalized(d.filename))||(s.id==='succession'&&d.kind==='succession'))}));
 const reviewCount=questions.filter(s=>s.evidence&&(!answers[s.id]||answers[s.id]==='check')).length;
 return <section className={styles.panel} aria-label="Checklist del fascicolo">
  <h2>Checklist del fascicolo</h2>
  <p>{receivedCount} di {entries.length} voci ricevute · {reviewCount} {reviewCount===1?'situazione da confermare':'situazioni da confermare'}</p>
  <div className={styles.checklistScroll}><table className={styles.checklistTable}>
   <thead><tr><th>Documento</th><th>Quando serve</th><th>Stato e azioni</th></tr></thead>
   <tbody>{entries.map(entry=>{
    const files=received.get(entry.id)||[];
    const isPlan=entry.id==='floor_plan';
    const delivered=isPlan&&simulatedPlan;
    const pending=isPlan&&acquisition==='pending';
    return <tr key={entry.id}><th scope="row">{entry.label}</th><td>{entry.when}</td><td>
     {files.length||delivered?<><strong>✓ Ricevuto</strong>{files.map(file=><div key={file.id}>{file.filename}</div>)}
      {delivered&&<div><a href="/planimetria-fascicolo-simulata.svg" target="_blank" rel="noreferrer">Apri planimetria dimostrativa</a> · Da verificare</div>}
     </>:pending?<strong>In acquisizione simulata</strong>:<>
      <span>{waiting.includes(entry.id)?'In attesa':'Da acquisire'}</span>
      {canEdit&&entry.id!=='mandate'&&<label><input type="checkbox" checked={selected.includes(entry.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,entry.id]:current.filter(id=>id!==entry.id))}/> Includi nella richiesta per {entry.label.toLowerCase()}</label>}
      {simulation&&canEdit&&isPlan&&<button type="button" onClick={()=>setAcquisition('confirm')}>Acquista tramite Dimora · simulazione</button>}
     </>}
    </td></tr>;
   })}</tbody>
  </table></div>
  {acquisition==='confirm'&&!hasPlan&&<section aria-label="Conferma acquisto simulato">
   <h3>Planimetria catastale · Appartamento demo</h3>
   <p>Foglio 12, particella 345, subalterno 6. Acquisto simulato, senza addebito.</p>
   {waiting.includes('floor_plan')&&<p>Il documento è già stato chiesto al proprietario.</p>}
   <button type="button" onClick={()=>setAcquisition('pending')}>Conferma acquisto simulato</button>
   <button type="button" onClick={()=>setAcquisition('idle')}>Annulla simulazione</button>
  </section>}
  {acquisition==='pending'&&<button type="button" onClick={()=>setAcquisition('received')}>Simula consegna della planimetria</button>}
  {unclassified.length>0&&<section><h3>Documenti da associare</h3>{unclassified.map(file=><label key={file.id}>{file.filename}<select disabled={!canEdit} value="" onChange={e=>setAssignments({...assignments,[file.id]:e.target.value})}><option value="">Scegli una voce del fascicolo</option>{entries.map(entry=><option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>)}</section>}
  {canEdit&&<>
   <form onSubmit={e=>{e.preventDefault();const label=newLabel.trim();if(!label)return;setCustom([...custom,{id:crypto.randomUUID(),label,when:'Secondo la pratica'}]);setNewLabel('');}}>
    <label>Documento aggiuntivo<input value={newLabel} maxLength={120} onChange={e=>setNewLabel(e.target.value)}/></label>
    <button type="submit" disabled={!newLabel.trim()}>Aggiungi voce</button>
   </form>
   <button type="button" disabled={!request.length} onClick={()=>{setDraft('Buongiorno, per il fascicolo della vendita può inviarci questi documenti?\n\n'+request.map(e=>'• '+e.label).join('\n')+'\n\nGrazie.');setNotice('');}}>Prepara richiesta</button>
   {draft&&<section aria-label="Richiesta al proprietario">
    <label>Messaggio al proprietario<textarea value={draft} onChange={e=>setDraft(e.target.value)}/></label>
    <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(draft);setNotice('Richiesta copiata.');}catch{setNotice('Seleziona il testo del messaggio per copiarlo.');}}}>Copia richiesta</button>
    <button type="button" disabled={!request.length} onClick={()=>{setWaiting(current=>[...new Set([...current,...request.map(e=>e.id)])]);setSelected([]);setDraft('');setNotice('Documenti segnati in attesa.');}}>Segna come richiesti</button>
   </section>}
  </>}
  {notice&&<p role="status">{notice}</p>}
  <section><h3>Situazioni da confermare</h3>
   {questions.filter(s=>showAll||s.evidence||answers[s.id]).map(s=><fieldset key={s.id} disabled={!canEdit}>
    <legend>{s.question}</legend>
    {s.evidence&&<p>Indizio nel file {s.evidence.filename}.</p>}
    {([['yes','Sì'],['no','No'],['check','Da verificare']] as const).map(([value,label])=><label key={value}><input type="radio" name={s.id} checked={answers[s.id]===value} onChange={()=>setAnswers({...answers,[s.id]:value})}/> {label}</label>)}
   </fieldset>)}
   <button type="button" onClick={()=>setShowAll(v=>!v)}>{showAll?'Mostra solo le situazioni rilevate':'Vedi tutte le situazioni'}</button>
  </section>
  <p>Dimora propone le associazioni dai tipi già classificati e dai nomi dei file. Le scelte della checklist valgono per questa sessione.</p>
 </section>;
}
