import { useState, type ReactNode, type CSSProperties } from 'react';
import { Building2, House, Briefcase, FileText, CheckCircle2, AlertTriangle, ArrowRight, Send, Search } from 'lucide-react';

// Isolated demonstration. Never calls the real application API.
const V = { bg:'#F7F8F6', ink:'#18242A', muted:'#66737A', primary:'#11665E', pale:'#DCECE6', line:'#DDE5E1', white:'#FFFFFF', warning:'#996416' };
type Area = 'home' | 'agency' | 'admin';
type Page = 'overview' | 'documents' | 'review' | 'condo' | 'fascicolo' | 'checklist' | 'gift' | 'edifici' | 'segnalazioni' | 'pubblicazioni';
type IncidentState = 'new' | 'taken' | 'closed';
const box:CSSProperties = {background:V.white,border:'1px solid '+V.line,borderRadius:16,padding:20,marginBottom:14};
const muted:CSSProperties={color:V.muted,fontSize:13};
const baseBtn:CSSProperties={border:'1px solid '+V.primary,borderRadius:10,padding:'10px 14px',cursor:'pointer',background:V.primary,color:V.white,fontWeight:650};
function Button({children,onClick,secondary=false,disabled=false}:{children:ReactNode;onClick:()=>void;secondary?:boolean;disabled?:boolean}){return <button type="button" onClick={onClick} disabled={disabled} style={{...baseBtn,...(secondary?{background:V.white,color:V.primary}:{}),...(disabled?{opacity:0.5,cursor:'not-allowed'}:{})}}>{children}</button>}
function Section({title,children}:{title:string;children:ReactNode}){return <section style={box}><h2 style={{fontSize:19,margin:'0 0 12px'}}>{title}</h2>{children}</section>}
function Label({children}:{children:ReactNode}){return <div style={{...muted,margin:'9px 0'}}>{children}</div>}

export function DimoraV5Preview(){
  const [area,setArea]=useState<Area>('home');
  const [page,setPage]=useState<Page>('overview');
  const [incident,setIncident]=useState<IncidentState>('new');
  // Snapshot the audience at publication time; changing the draft selector must not rewrite a published notice.
  const [publishedAudience,setPublishedAudience]=useState<'scala'|'all'|null>(null);
  const published=publishedAudience!==null;
  const [sent,setSent]=useState(false);
  const [reviewed,setReviewed]=useState(false);
  const [recipient,setRecipient]=useState<'scala'|'all'>('scala');
  const [invited,setInvited]=useState(false);
  const [duplicate,setDuplicate]=useState(false);
  const open=(a:Area,p:Page)=>{setArea(a);setPage(p)};
  const menu:Record<Area,{label:string;page:Page}[]> = {
    home:[{label:'Casa',page:'overview'},{label:'Attività',page:'review'},{label:'Documenti',page:'documents'},{label:'Condominio',page:'condo'}],
    agency:[{label:'Panoramica',page:'overview'},{label:'Fascicolo',page:'fascicolo'},{label:'Checklist',page:'checklist'},{label:'Home Gift',page:'gift'}],
    admin:[{label:'Panoramica',page:'overview'},{label:'Edifici',page:'edifici'},{label:'Segnalazioni',page:'segnalazioni'},{label:'Pubblicazioni',page:'pubblicazioni'}],
  };
  const navButton=(label:string,a:Area)=><button type="button" key={a} aria-pressed={area===a} onClick={()=>open(a,'overview')} style={{...baseBtn,background:area===a?V.primary:V.white,color:area===a?V.white:V.primary,display:'inline-flex',gap:8,alignItems:'center'}}>{a==='home'?<House size={16}/>:a==='agency'?<Briefcase size={16}/>:<Building2 size={16}/>} {label}</button>;
  return <div style={{background:V.bg,color:V.ink,minHeight:'100vh',fontFamily:'Inter, system-ui, sans-serif',padding:'18px clamp(12px, 4vw, 36px)'}}>
    <div style={{maxWidth:1120,margin:'auto'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap',paddingBottom:22}}>
        <div><div style={{fontWeight:800,fontSize:29,letterSpacing:-1}}>dimora<span style={{color:V.primary}}>.</span></div><div style={muted}>V5 · React preview · direzione premium B</div></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{navButton('Home','home')}{navButton('Agenzie','agency')}{navButton('Amministratori','admin')}</div>
      </header>
      <div style={{display:'flex',gap:18,alignItems:'flex-start',flexWrap:'wrap'}}>
        <nav aria-label="Sezioni Dimora" style={{...box,width:'min(100%, 220px)',display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
          {menu[area].map(x=><button key={x.label} onClick={()=>setPage(x.page)} aria-current={page===x.page?'page':undefined} type="button" style={{border:0,textAlign:'left',padding:12,borderRadius:9,cursor:'pointer',background:page===x.page?V.pale:V.white,color:page===x.page?V.primary:V.ink,fontWeight:page===x.page?700:400}}>{x.label}</button>)}
        </nav>
        <main style={{flex:'1 1 310px',minWidth:0}}><h1 aria-live="polite" style={{fontSize:26,letterSpacing:-0.6,margin:'0 0 16px'}}>{menu[area].find(x=>x.page===page)?.label ?? 'Dimora'}</h1>
          {area==='home'&&page==='overview'&&<><Section title="Casa · Via Roma 12"><Label>La memoria della tua abitazione</Label><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><span>12 documenti</span><span>·</span><span>{reviewed?0:1} proposte da rivedere</span></div></Section><Section title="I tuoi impianti"><Label>Caldaia · dati da confermare</Label><Button onClick={()=>setPage('review')}>Esamina dati <ArrowRight size={14}/></Button></Section><Section title="Condominio"><Label>Memoria comune pubblicata dall'amministratore e documenti privati distinti</Label><Button onClick={()=>setPage('condo')}>Apri condominio</Button></Section></>}
          {area==='home'&&page==='documents'&&<Section title="Documenti"><p><FileText size={16}/> Manuale caldaia · personale</p><p><FileText size={16}/> Rapporto ascensore v3 · pubblicato dall'amministratore</p><Label>Nessuna estrazione AI o modifica reale in questa demo.</Label></Section>}
          {area==='home'&&page==='review'&&<Section title="Attività e Da rivedere">{reviewed?<p>Non ci sono proposte aperte nella simulazione.</p>:<><p style={{color:V.warning}}><AlertTriangle size={16}/> Potenza caldaia: due valori discordanti con semantica da verificare.</p><Label>Non vengono generate scadenze da questo dato finché non è confermato.</Label><Button onClick={()=>setReviewed(true)}>Segna esaminata (demo)</Button></>}</Section>}
          {area==='home'&&page==='condo'&&<><Section title="Condominio · Via Roma 12"><p>Ascensore Scala A: {published?'l’amministratore ha pubblicato un aggiornamento.':'comunicazione di guasto presente (fixture).'} </p><Label>Informazione dimostrativa, non stato operativo verificato.</Label></Section><Section title="Segnala un problema">{sent?<p style={{color:V.primary}}><CheckCircle2 size={16}/> Segnalazione creata nella simulazione e visibile all'amministratore demo. Stato: {incident==='new'?'ricevuta':incident==='taken'?'presa in carico':'chiusa'}.</p>:<><p>«L'ascensore della Scala A non funziona.»</p>{duplicate?<div style={{background:V.pale,padding:12,borderRadius:12,marginBottom:10}}>È già disponibile una comunicazione relativa all'ascensore. Puoi procedere comunque.</div>:null}<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Button secondary onClick={()=>setDuplicate(true)}><Search size={14}/> Verifica casi noti</Button><Button onClick={()=>{setSent(true);setDuplicate(false)}}><Send size={14}/> Invia comunque (demo)</Button></div></>}</Section>{published&&<Section title="Aggiornamento pubblicato"><p>Guasto ascensore Scala A preso in carico · {publishedAudience==='scala'?'destinatari Scala A':'intero condominio'}.</p><Label>Messaggio inserito solo nello stato simulato della preview.</Label></Section>}</>}
          {area==='agency'&&page==='overview'&&<Section title="Partner Agenzie · Panoramica"><Label>Fascicoli documentali attivi</Label><Button onClick={()=>setPage('fascicolo')}>Apri pratica Via Roma 12</Button></Section>}
          {area==='agency'&&page==='fascicolo'&&<Section title="Fascicolo vendita · Via Roma 12"><p>8 documenti ricevuti · 2 da verificare.</p><Label>Ricevuto non significa verificato o pubblicabile.</Label><Button onClick={()=>setPage('checklist')}>Apri checklist</Button></Section>}
          {area==='agency'&&page==='checklist'&&<Section title="Checklist C+"><p>APE — ricevuto · da verificare</p><p>Documentazione impianti — richiesta al proprietario</p><p>Planimetria — ricevuta</p><Button onClick={()=>setPage('gift')}>Prepara Home Gift</Button></Section>}
          {area==='agency'&&page==='gift'&&<Section title="Home Gift"><p>Pacchetto selettivo: documenti autorizzati, asset e storico pertinente.</p><Label>Nessun account viene creato automaticamente.</Label><Button onClick={()=>setInvited(true)}>Simula invito</Button>{invited&&<div style={{marginTop:12,color:V.primary}}>Invito predisposto nella simulazione; nessuna email inviata.</div>}</Section>}
          {area==='admin'&&page==='overview'&&<Section title="Partner Amministratori · Panoramica"><p>Portafoglio edifici, attentions e pubblicazioni.</p><Button onClick={()=>setPage('edifici')}>Apri condominio</Button></Section>}
          {area==='admin'&&page==='edifici'&&<Section title="Condominio Via Roma 12"><p>Ascensore Scala A · rapporto v3</p><p>Centrale termica · documenti in revisione</p><Button onClick={()=>setPage('segnalazioni')}>Gestisci segnalazioni</Button></Section>}
          {area==='admin'&&page==='segnalazioni'&&<Section title="Segnalazioni intelligenti">{sent?<><p>Nuova segnalazione: ascensore Scala A.</p><Label>Stato: {incident==='new'?'ricevuta':incident==='taken'?'presa in carico':'chiusa'}</Label><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Button disabled={incident!=='new'} onClick={()=>setIncident('taken')}>Prendi in carico</Button><Button secondary disabled={incident!=='taken'} onClick={()=>setPage('pubblicazioni')}>Comunica aggiornamento</Button><Button secondary disabled={incident!=='taken'} onClick={()=>setIncident('closed')}>Chiudi segnalazione</Button></div></>:<><p>Nessuna segnalazione inviata in questa sessione demo.</p><Button onClick={()=>open('home','condo')}>Vai alla Home per inviarne una</Button></>}</Section>}
          {area==='admin'&&page==='pubblicazioni'&&<Section title="Comunicazione ai proprietari"><label htmlFor="v5-audience" style={{...muted,display:'block',marginBottom:8}}>Seleziona destinatari (simulazione)</label><select id="v5-audience" value={recipient} onChange={e=>setRecipient(e.target.value as 'scala'|'all')} style={{display:'block',padding:10,borderRadius:9,border:'1px solid '+V.line,marginBottom:12}}><option value="scala">Utenti autorizzati · Scala A</option><option value="all">Utenti autorizzati · intero edificio</option></select><p>«Il guasto ascensore Scala A è stato preso in carico.»</p><Button disabled={!sent||incident!=='taken'} onClick={()=>setPublishedAudience(recipient)}>Simula pubblicazione</Button>{(!sent||incident!=='taken')&&<Label>Per pubblicare questo aggiornamento dimostrativo occorre prima ricevere e prendere in carico una segnalazione.</Label>}{published&&<p style={{color:V.primary}}>Aggiornamento simulato per: {publishedAudience==='scala'?'Scala A':'intero edificio'}. Nessuna autorizzazione reale è verificata.</p>}</Section>}
        </main>
      </div><footer style={{...muted,paddingTop:18}}>Ambiente dimostrativo isolato · nessun dato salvato su server, nessuna notifica o verifica di autorizzazioni reale.</footer>
    </div>
  </div>
}
