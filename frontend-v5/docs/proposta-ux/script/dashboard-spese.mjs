// Genera la variante «Dashboard Spese» dal mockup ufficiale (sola lettura) applicando sostituzioni esatte.
// Uso: node dashboard-spese.mjs [sorgente] [destinazione]
import fs from 'node:fs';
const SRC=process.argv[2]||'C:/Users/07704017/Documents/Codex/2026-10-13/referenced-chatgpt-conversation-this-is-an/Home_OS/frontend-v5/public/mockup-proprietario-v5.html';
const OUT=process.argv[3]||'C:/Users/07704017/Documents/Codex/Dimora-V5-Claude/frontend-v5/docs/proposta-ux/dimora-dashboard-spese.html';
let s=fs.readFileSync(SRC,'utf8');
const rep=(a,b,label)=>{const n=s.split(a).length-1;if(n!==1){console.error('ATTESO 1, TROVATI '+n+': '+label);process.exit(1)}s=s.replace(a,()=>b)};

// 1. storage e barra prova propri
rep("const key='dimora-owner-ux-mock-v1'","const key='dimora-owner-dashboard-v1'",'chiave');
rep('<strong>MOCKUP HOME</strong> · dati sintetici','<strong>Variante dashboard Spese</strong> · dati sintetici','demobar');

// 2. funzione panoramica (inserita prima di history)
const OVERVIEW=`const ovFamilyColors={utilities:'#0b6177',condominium:'#3d8fa8',taxes_insurance:'#8cc9d8',maintenance_repairs:'#132e3e',works_purchases:'#5f8496',financing:'#b8a271',unclassified:'#c3d2da'};
const ovCatColors=['#0b6177','#3d8fa8','#8cc9d8','#132e3e','#5f8496','#b8a271','#c3d2da','#2a6f5f','#7a9fb0','#d8c7a0','#47627a','#a0d8c8','#6b5b3e','#9aa9b4'];
function overview(es,sums,family,f){const total=es.reduce((s,e)=>s+e.amount,0);if(!total)return '<section class="card ov-card"><h2 tabindex="-1" id="ov-heading">Distribuzione</h2><p class="muted">Nessun costo registrato nel periodo e con questi filtri.</p></section>';
const mode=family?'cat':(f.ovMode||'family');let items;
if(mode==='family')items=Object.entries(familyLabels).map(([k,l],i)=>({k,l,v:sums[k],kind:'family',c:ovFamilyColors[k]}));
else{const m={};es.forEach(e=>{const k=e.cat||'null';m[k]=(m[k]||0)+e.amount});const order=['null',...Object.keys(cats)];items=Object.keys(m).sort((a,b)=>order.indexOf(a)-order.indexOf(b)).map(k=>({k,l:k==='null'?'Non classificata':cats[k]||k,v:m[k],kind:'cat',c:ovCatColors[order.indexOf(k)%ovCatColors.length]}))}
const pos=items.filter(i=>i.v>0).sort((a,b)=>b.v-a.v),zero=items.filter(i=>i.v===0);
pos.forEach(i=>i.t=Math.round(i.v*1000/total));const sumT=pos.reduce((s,i)=>s+i.t,0);
const pct=t=>(t/10).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const r=76,C=2*Math.PI*r,gap=pos.length>1?1.5:0;let acc=0;
const segs=pos.map(i=>{const len=C*i.v/total;const seg='<circle class="ov-seg" data-ov-kind="'+i.kind+'" data-ov-k="'+esc(i.k)+'" cx="100" cy="100" r="'+r+'" fill="none" stroke="'+i.c+'" stroke-width="30" stroke-dasharray="'+Math.max(len-gap,0.5).toFixed(2)+' '+(C-Math.max(len-gap,0.5)).toFixed(2)+'" stroke-dashoffset="'+(-acc).toFixed(2)+'" transform="rotate(-90 100 100)"><title>'+esc(i.l)+': '+money(i.v)+' ('+pct(i.t)+')</title></circle>';acc+=len;return seg}).join('');
const svg='<svg class="ov-chart" viewBox="0 0 200 200" role="img" aria-label="Grafico ad anello: stessi dati della legenda accanto"><circle cx="100" cy="100" r="'+r+'" fill="none" stroke="#edf2f5" stroke-width="30"/>'+segs+'<text x="100" y="96" text-anchor="middle" class="ov-center">'+money(total)+'</text><text x="100" y="116" text-anchor="middle" class="ov-center-sub">registrati</text></svg>';
const legend='<ul class="ov-legend">'+pos.map(i=>'<li><button type="button" class="ov-leg" data-ov-kind="'+i.kind+'" data-ov-k="'+esc(i.k)+'" aria-label="'+esc(i.l)+': '+money(i.v)+', '+pct(i.t)+'. Apri l’elenco"><span class="sw" style="background:'+i.c+'"></span><span class="lab">'+esc(i.l)+'</span><span class="amt">'+money(i.v)+'</span><span class="pct">'+pct(i.t)+'</span></button></li>').join('')+'</ul>';
const head=family?'<div class="ov-head"><h2 tabindex="-1" id="ov-heading">Categorie in '+esc(familyLabels[family])+'</h2><button type="button" class="btn link" id="ov-all">Tutte le famiglie</button></div>':'<div class="ov-head"><h2 tabindex="-1" id="ov-heading">Distribuzione</h2><div class="ov-mode" role="group" aria-label="Suddividi per"><button type="button" data-ov-mode="family" aria-pressed="'+(mode==='family')+'">Famiglie</button><button type="button" data-ov-mode="cat" aria-pressed="'+(mode==='cat')+'">Categorie</button></div></div>';
const note=(mode==='family'&&zero.length?'<p class="help">Senza registrazioni nel periodo: '+zero.map(i=>esc(i.l)).join(', ')+'.</p>':'')+(sumT!==1000?'<p class="help">Percentuali arrotondate a un decimale: la somma è '+pct(sumT)+'.</p>':'')+'<p class="help">'+(mode==='family'?'Le famiglie raggruppano le categorie. ':'Le categorie sono le voci che scegli quando registri. ')+'Tocca una voce per vedere le registrazioni.</p>';
const recent=rows(es.slice().sort((a,b)=>b.day.localeCompare(a.day)).slice(0,4));
return '<section class="card ov-card">'+head+'<div class="ov-grid">'+svg+legend+'</div>'+note+'</section><section class="card sp-compare"><h2>Confronto con lo stesso periodo</h2>'+comparison()+'</section><section class="card sp-list"><div class="ov-head"><h2>Ultime registrazioni</h2></div>'+recent+'<button type="button" class="btn link" id="ov-list">Vedi tutte le '+es.length+' registrazioni</button></section>'}
function history(){`;
rep('function history(){',OVERVIEW,'overview');

// 3. history: vista predefinita Panoramica, confronto nel totale, ritorno dalla lista
rep("view=f.view||'elenco'","view=f.view||'panoramica'",'vista-predefinita');
rep("let body='';if(view==='riepilogo')","if(view==='panoramica')delete f.back;let body='';if(view==='panoramica')body=overview(es,sums,family,f);else if(view==='riepilogo')",'ramo-panoramica');
rep("[['elenco','Elenco'],['oggetti','Per oggetto']","[['panoramica','Panoramica'],['elenco','Elenco'],['oggetti','Per oggetto']",'opzione-visualizza');
rep("'<section class=\"card sp-list\">'+body+'</section>'}","(view==='panoramica'?body:'<section class=\"card sp-list\">'+(f.back?'<button type=\"button\" class=\"btn link\" id=\"ov-back\">← Torna alla panoramica</button>':'')+body+'</section>')}",'corpo');

// 3b. Spese: Visualizza/Periodo prima del totale (nel markup, quindi anche in tabulazione), in tutte le viste
{const iT=s.indexOf('<section class="card sp-total">'),iB=s.indexOf('<div class="sp-toolbar">'),iD=s.indexOf('<details class="card" ',iB);
 if(iT<0||iB<iT||iD<iB){console.error('ordine totale/toolbar non trovato');process.exit(1)}
 s=s.slice(0,iT)+s.slice(iB,iD)+s.slice(iT,iB)+s.slice(iD);}

// 4. comportamenti della panoramica
rep('function bind(){',`function bind(){const ovOpen=(kind,k)=>{const f=state.filter;f.back={family:f.family||'',cat:f.cat||''};if(kind==='family')f.family=k;else if(kind==='cat')f.cat=k;f.view='elenco';save();render();document.getElementById('ov-back')?.focus()};
document.querySelectorAll('[data-ov-kind]').forEach(b=>b.addEventListener('click',()=>ovOpen(b.dataset.ovKind,b.dataset.ovK)));
document.querySelectorAll('[data-ov-mode]').forEach(b=>b.onclick=()=>{state.filter.ovMode=b.dataset.ovMode;save();render();document.querySelector('[data-ov-mode="'+b.dataset.ovMode+'"]')?.focus()});
document.getElementById('ov-all')?.addEventListener('click',()=>{state.filter.family='';save();render();document.getElementById('ov-heading')?.focus()});
document.getElementById('ov-list')?.addEventListener('click',()=>ovOpen('list'));
document.getElementById('ov-back')?.addEventListener('click',()=>{const f=state.filter,b=f.back||{};f.family=b.family||'';f.cat=b.cat||'';f.view='panoramica';delete f.back;save();render();document.getElementById('ov-heading')?.focus()});
`,'bind');

// 5. CSS della panoramica
const CSS=`
/* === Dashboard Spese (proposta Claude, 14 ottobre 2026) === */
.ov-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}.ov-head h2{margin:0}.ov-head h2:focus{outline:none}
.ov-grid{display:grid;grid-template-columns:200px minmax(0,1fr);gap:28px;align-items:center}
.ov-chart{width:200px;height:200px;display:block}.ov-seg{cursor:pointer}.ov-seg:hover{stroke-width:34}
.ov-center{font-size:17px;font-weight:750;fill:var(--ink);font-variant-numeric:tabular-nums}.ov-center-sub{font-size:11px;fill:var(--muted)}
.ov-legend{list-style:none;margin:0;padding:0;min-width:0}
.ov-leg{display:grid;grid-template-columns:14px minmax(0,1fr) auto 50px;gap:10px;align-items:center;width:100%;border:0;border-bottom:1px solid var(--border);border-radius:0;background:none;padding:9px 2px;min-height:44px;text-align:left;font-weight:500;color:var(--ink)}
.ov-legend li:last-child .ov-leg{border-bottom:0}.ov-leg:hover .lab{color:var(--accent);text-decoration:underline}
.ov-leg .sw{width:14px;height:14px;border-radius:4px}.ov-leg .lab{min-width:0;overflow-wrap:anywhere}.ov-leg .amt{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}.ov-leg .pct{color:var(--muted);text-align:right;font-variant-numeric:tabular-nums;font-size:13px}
.ov-mode{display:inline-flex;gap:3px;background:var(--bg);border-radius:10px;padding:3px}.ov-mode button{min-height:36px;padding:5px 12px;border:0;background:none;color:var(--muted);font-size:13px;border-radius:8px}.ov-mode button[aria-pressed="true"]{background:white;color:var(--accent);box-shadow:0 1px 3px rgba(19,46,62,.15)}
.ov-card .help{margin-top:10px}
.sp-compare h2{font-size:15px;margin:0 0 4px}.sp-compare .summary-row{padding:4px 0;font-size:14px}.sp-compare .help{margin-top:4px}#ov-back{margin:0 0 4px}button.btn.link{border:0;background:none;padding:8px 2px;min-height:40px;color:var(--accent);font-weight:600}button.btn.link:hover{text-decoration:underline;filter:none}
@media(max-width:650px){.ov-grid{grid-template-columns:1fr;justify-items:center;gap:14px}.ov-chart{width:180px;height:180px}.ov-legend{width:100%}}
@media(max-width:350px){.ov-leg{grid-template-columns:12px minmax(0,1fr) auto;row-gap:0}.ov-leg .pct{grid-column:2/4;text-align:left;margin-top:-6px}}
`;
rep('</style>',CSS+'</style>','css');

fs.writeFileSync(OUT,s);
const js=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);js.forEach(c=>new Function(c));
console.log('ok',s.length);
