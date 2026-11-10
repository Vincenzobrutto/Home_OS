import packetJson from '../../../tests/fixtures/agency-gift/packet-v1.json?raw';
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {GiftPacketPreview,type GiftPreviewPacket} from '../GiftPacketPreview';
const scope={agencyId:'agency-demo',practiceId:'practice-demo',revision:4,accountId:'agent-demo'};
// Fixture-only cast: backend contract test reproduces this file; no HTTP DTO is accepted here.
const packet=JSON.parse(packetJson) as GiftPreviewPacket;
function Harness(){
 const [access,setAccess]=useState<'allowed'|'loading'|'denied'>('allowed'),[stale,setStale]=useState(false),[source,setSource]=useState('');
 return <main style={{maxWidth:940,margin:'0 auto',padding:16}}><h1>Collaudo sintetico · anteprima Gift</h1><p>Nessuna API o consegna. I documenti sono esempi fittizi, senza originali scaricabili.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}><label>Stato simulato <select value={access} onChange={e=>{setAccess(e.target.value as typeof access);setSource('');}}><option value="allowed">Autorizzato</option><option value="loading">Caricamento</option><option value="denied">Accesso negato</option></select></label><label><input type="checkbox" checked={stale} onChange={e=>{setStale(e.target.checked);setSource('');}}/> Revisione superata</label></div>
  <GiftPacketPreview scope={{...scope,revision:stale?5:4}} access={access} packet={packet} onOpenSource={s=>setSource(`Fonte sintetica selezionata: ${s.sourceId} · versione ${s.version}. Nessun file reale aperto.`)}/>
  {source&&access==='allowed'&&!stale&&<p role="status">{source}</p>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
