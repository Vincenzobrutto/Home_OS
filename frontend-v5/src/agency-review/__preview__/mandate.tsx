import {createRoot} from 'react-dom/client';
import {MandateSelectionWorkspace} from '../MandateSelectionWorkspace';
import type {ReviewFact} from '../api';
import type {AgencyMandateSelectionPort,MandateSelectionView} from '../mandate-selection-api';
const fact=(id:string,extra:Partial<ReviewFact>={}):ReviewFact=>({id,unitId:'u',subjectKey:'historical',field:'party.name',version:2,status:'confirmed',proposedValue:'Elena Verdi',confirmedValue:'Elena Verdi',origin:'extracted',confirmedOrigin:'extracted',confirmedBy:'a',confirmedAt:'2026-10-30',evidence:[{sourceId:'deed',version:1,sha256:'a'.repeat(64),page:1,excerpt:'Elena Verdi vende a Marco Rossi.'}],...extra});
const state=():MandateSelectionView=>({review:{revision:4,units:[{id:'u',label:'Appartamento'}],facts:[fact('f')]},findings:{revision:4,comparisons:[],observations:[{id:'wall',unitId:'u',kind:'internal_layout',description:'Parete interna da verificare.',evidence:[],current:true,fingerprint:'b'.repeat(64),state:'open',resolutions:[]}],certification:false}});

const api:AgencyMandateSelectionPort={read:async()=>structuredClone(state())};
createRoot(document.getElementById('root')!).render(<main><div style={{padding:16,background:'#fff3cf'}}>Harness sintetico locale · selezione non salvata, nessun modello approvato o incarico generato.</div><MandateSelectionWorkspace scopeKey="synthetic-mandate" api={api}/></main>);
