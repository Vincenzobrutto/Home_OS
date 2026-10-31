import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {GiftPacketPreview,type GiftPreviewPacket} from '../GiftPacketPreview';
const scope={agencyId:'agency-demo',practiceId:'practice-demo',revision:4,accountId:'agent-demo'};
const packet:GiftPreviewPacket={schemaVersion:'agency-gift-preparation-v1',purpose:'internal_preview',agencyId:scope.agencyId,practiceId:scope.practiceId,practiceRevision:scope.revision,preparedBy:scope.accountId,requestedHomeId:'CASA-DEMO-001',recipients:[{subjectRef:'INT-DEMO-A'},{subjectRef:'INT-DEMO-B'}],canDeliver:false,createsHome:false,grantsAccess:false,certification:false,homeDestinationAuthorized:false,recipientIdentityVerified:false,documents:[{sourceId:'SUC-DEMO-DOC-01',version:1,sha256:'a'.repeat(64),metadataVersion:1,title:'Atto di provenienza · facsimile sintetico',author:'Autore dichiarato DEMO',origin:'received',lifecycle:'signed',signatureVerification:'not_assessed'},{sourceId:'SUC-DEMO-DOC-02',version:2,sha256:'b'.repeat(64),metadataVersion:1,title:'Prospetto superfici · documento prodotto DEMO',author:'Agenzia DEMO',origin:'agency_generated',lifecycle:'final',signatureVerification:'not_assessed',surface:{kind:'commercial',qualification:'estimated',method:'Foglio A4 presunto e scala dichiarata',geometryRevision:3,caveats:['Formato della pagina non verificato.','Coefficienti e perimetro da rivedere con l’agente.']}}]};
function Harness(){
 const [access,setAccess]=useState<'allowed'|'loading'|'denied'>('allowed'),[stale,setStale]=useState(false),[source,setSource]=useState('');
 return <main style={{maxWidth:940,margin:'0 auto',padding:16}}><h1>Collaudo sintetico · anteprima Gift</h1><p>Nessuna API o consegna. I documenti sono esempi fittizi, senza originali scaricabili.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}><label>Stato simulato <select value={access} onChange={e=>{setAccess(e.target.value as typeof access);setSource('');}}><option value="allowed">Autorizzato</option><option value="loading">Caricamento</option><option value="denied">Accesso negato</option></select></label><label><input type="checkbox" checked={stale} onChange={e=>{setStale(e.target.checked);setSource('');}}/> Revisione superata</label></div>
  <GiftPacketPreview scope={{...scope,revision:stale?5:4}} access={access} packet={packet} onOpenSource={s=>setSource(`Fonte sintetica selezionata: ${s.sourceId} · versione ${s.version}. Nessun file reale aperto.`)}/>
  {source&&access==='allowed'&&!stale&&<p role="status">{source}</p>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
