import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FascicoloChecklist} from '../FascicoloChecklist';
import type {AgencyPractice} from '../api';
import styles from '../practice-plan.module.css';

const fixture:AgencyPractice['documents']=[
 {id:'mandate',filename:'Incarico firmato.pdf',kind:'unclassified',visibility:'private',version:1},
 {id:'title',filename:'Atto di acquisto con riferimento al mutuo.pdf',kind:'deed',visibility:'private',version:1},
 {id:'condo',filename:'Regolamento condominiale.pdf',kind:'unclassified',visibility:'private',version:1},
];
function Demo(){
 const [documents,setDocuments]=useState(fixture);
 return <main className={styles.workspace}>
  <h1>Fascicolo · Appartamento demo</h1>
  <p>Pratica sintetica per il collaudo. Acquisto e consegna simulati.</p>
  <button type="button" disabled={documents.some(d=>d.id==='visura')} onClick={()=>setDocuments([...documents,{id:'visura',filename:'Visura catastale.pdf',kind:'unclassified',visibility:'private',version:1}])}>Simula caricamento di una visura</button>
  <FascicoloChecklist documents={documents} canEdit simulation/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
