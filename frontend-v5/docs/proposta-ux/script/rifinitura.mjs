import fs from 'node:fs';
const SRC='C:/Users/07704017/Documents/Codex/2026-10-13/referenced-chatgpt-conversation-this-is-an/Home_OS/frontend-v5/public/mockup-proprietario-v5.html';
const OUT='C:/Users/07704017/Documents/Codex/Dimora-V5-Claude/frontend-v5/docs/proposta-ux/dimora-owner-rifinitura.html';
let s=fs.readFileSync(SRC,'utf8');
const rep=(a,b,label)=>{const n=s.split(a).length-1;if(n!==1){console.error('ATTESO 1, TROVATI '+n+': '+label);process.exit(1)}s=s.replace(a,()=>b)};
const repIn=(fn,a,b,label)=>{const i=s.indexOf(fn);if(i<0){console.error('FUNZIONE ASSENTE '+fn);process.exit(1)}const j=s.indexOf('\n',i);const body=s.slice(i,j);if(!body.includes(a)){console.error('NON TROVATO in '+fn+': '+label);process.exit(1)}s=s.slice(0,i)+body.split(a).join(b)+s.slice(j)};

// 1. storage isolato
rep("const key='dimora-owner-ux-mock-v1'","const key='dimora-owner-rifinitura-v1'",'chiave');
// 2. barra prova e testata compatte
rep('<strong>MOCKUP HOME</strong> · dati dimostrativi · nessuna AI o operazione reale','<strong>Variante rifinitura visiva</strong> · dati sintetici · nessuna operazione reale','demobar');
rep('Casa di Giulia · Milano<br>Giulia Leone · proprietaria<br><small>Home completa · prova UX</small>','Casa di Giulia · Milano<span class="acc-more"><br>Giulia Leone · proprietaria</span>','account');
// 3. h1 senza punto finale
rep('<h1 tabindex="-1">${t}</h1>',"<h1 tabindex=\"-1\">${String(t).replace(/\\.$/,'')}</h1>",'h1');
// 4. righe spesa compatte
rep("map(e=>`<div class=\"row\"><div class=\"iconbox\">${icon(e.work?'work':'doc')}</div><div class=\"row-body\"><a class=\"row-title break\" href=\"#/spesa/${e.id}\">${esc(e.title)}</a><div class=\"muted small\">${date(e.day)} · ${cats[e.cat]||'Non classificata'}</div><div class=\"small muted\">${esc([e.object,e.work].filter(Boolean).join(' · '))}</div></div><span class=\"amount\">${money(e.amount)}</span></div>`)",
    "map(e=>`<div class=\"row exp-row\"><div class=\"row-body\"><a class=\"row-title break\" href=\"#/spesa/${e.id}\">${esc(e.title)}</a><div class=\"muted small\">${[date(e.day),cats[e.cat]||'Non classificata',e.object,e.work].filter(Boolean).map(esc).join(' · ')}</div></div><span class=\"amount\">${money(e.amount)}</span></div>`)",'rows');
// 5. Spese: totale dopo le famiglie, bozze prima dell'elenco
const T="<section class=\"card\"><div class=\"muted\">'+esc(familyLabels[family]||'Tutte le famiglie')+' · '+f.year+'</div><div class=\"metric\">'+money(total)+'</div>'+(!family?'<p class=\"small muted\">Senza mutuo e finanziamenti: <strong>'+money(total-sums.financing)+'</strong></p>':'')+'<p class=\"help\">'+es.length+' '+(es.length===1?'registrazione':'registrazioni')+' · non attesta pagamenti.</p></section>";
rep(T,'','totale-rimosso');
rep("</nav><div class=\"sp-toolbar\">","</nav>"+T.replace('<section class="card">','<section class="card sp-total">')+"<div class=\"sp-toolbar\">",'totale-spostato');
const marker="+(drafts.length?'<section class=\"card tint\"><h2>Bozze";
const iD=s.indexOf(marker);if(iD<0){console.error('bozze non trovate');process.exit(1)}
const jD=s.indexOf('\n',iD);const tail=s.slice(iD,jD);const cut=tail.lastIndexOf('}');
const DR=tail.slice(1,cut);
s=s.slice(0,iD)+tail.slice(cut)+s.slice(jD);
rep("</form></details><section class=\"card\">'+body+'</section>'","</form></details>'+"+DR.replace('class="card tint"','class="card tint sp-drafts"')+"+'<section class=\"card sp-list\">'+body+'</section>'",'bozze');
// 6. navigazione secondaria come link
repIn('function ownerHome(','<a class="btn" href="#/catalogo">','<a class="btn link" href="#/catalogo">','home-catalogo');
repIn('function ownerHome(','<a class="btn" href="#/ambienti">','<a class="btn link" href="#/ambienti">','home-ambienti');
repIn('function ownerHome(','<a class="btn" style="margin-top:15px" href="#/attivita">','<a class="btn link" href="#/attivita">','home-attivita');
repIn('function condoSummary(','<a class="btn" href="#/condominio">','<a class="btn link" href="#/condominio">','condo');
repIn('function ownerObject(',"<a class=\"btn\" href=\"'+base+'?sezione=documenti\">","<a class=\"btn link\" href=\"'+base+'?sezione=documenti\">",'scheda-doc');
repIn('function ownerObject(',"<a class=\"btn\" href=\"'+base+'?sezione=costi\">","<a class=\"btn link\" href=\"'+base+'?sezione=costi\">",'scheda-costi');
// 6b. importi con separatore delle migliaia anche a 4 cifre (it-IT lo omette)
rep("const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100);","const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100).replace(/^(-?)(\\d{4,})/,(m,a,b)=>a+b.replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.'));",'money');
// 7. CSS
const CSS=`
/* === Rifinitura visiva (Claude, 14 ottobre 2026): solo presentazione === */
.demobar{padding:6px 16px;font-size:12px;align-items:center}.demobar button{min-height:30px;padding:3px 10px;font-size:12px}
header{padding:12px 28px}.logo{font-size:23px}header .account{font-size:12.5px;line-height:1.4;text-align:right}
main{padding:28px 36px 80px;max-width:1080px}
h1{font-size:32px;letter-spacing:-1px;margin:4px 0 6px;text-wrap:balance}h2{font-size:18px;letter-spacing:-.3px;margin:0 0 10px}h3{font-size:15px}
.eyebrow{font-size:10.5px;letter-spacing:1.5px}.topline{margin-bottom:18px}@media(min-width:651px){.topline{align-items:flex-end}}.topline p{font-size:14px;margin:0}
.back{margin-bottom:6px;font-weight:600}h1[tabindex="-1"]:focus{outline:none}
.card{padding:20px;border-radius:16px;margin-bottom:14px}
button,a.btn{border-radius:10px;padding:9px 14px}.actions{gap:8px}
a.btn.link{border:0;background:none;padding:8px 2px;min-height:40px;color:var(--accent)}a.btn.link:hover{text-decoration:underline;filter:none}
.row{padding:12px 0;gap:12px}.item-link{padding:12px 0;gap:12px}.iconbox{width:38px;height:38px;border-radius:11px}
.row .amount,.metric{font-variant-numeric:tabular-nums}
.exp-row{position:relative}.exp-row .row-title{font-weight:650;color:var(--ink)}.exp-row .row-title::after{content:"";position:absolute;inset:0}.exp-row:hover .row-title{color:var(--accent)}.exp-row .small{font-size:12.5px;margin-top:1px}
.tile-row{gap:8px}.tile-row a{border-radius:999px;padding:7px 15px;min-height:40px;font-size:14px;border:1px solid #c9e4ea}
.family-nav{gap:6px;border-bottom:0;padding-bottom:2px;margin:16px 0 12px}
.family-nav button{min-height:38px;padding:6px 13px;border-radius:999px;font-size:13.5px;font-weight:600;background:white;border:1px solid var(--border);color:var(--muted)}
.family-nav button.primary,.family-nav button[aria-pressed="true"]{background:var(--soft);color:var(--accent);border-color:#9fd3de}
.sp-total{padding:16px 20px}.sp-total .muted{font-size:13px}.sp-total .metric{font-size:32px;margin:2px 0 4px}.sp-total p{margin:2px 0 0}
.sp-toolbar{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.sp-toolbar label{min-width:0}.sp-toolbar .field{font-size:12px;color:var(--muted)}.sp-toolbar select{min-height:40px;margin-top:4px;padding:8px 10px}
details.card{padding:12px 18px}details.card>summary{padding:4px 0;font-size:14px}details.card[open]{padding:14px 18px 18px}
.sp-drafts{padding:14px 18px}.sp-drafts h2{font-size:15px;margin:0}.sp-drafts .row{padding:10px 0}
.sp-list{padding-top:6px;padding-bottom:6px}
.object-tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;gap:4px}.object-tabs::-webkit-scrollbar{display:none}.object-tabs a{white-space:nowrap;min-height:40px;padding:8px 12px}
@media(max-width:650px){header{padding:10px 16px}header .account .acc-more{display:none}main{padding:18px 16px 96px}h1{font-size:27px}
 .card{padding:16px;border-radius:14px}.mobile-more summary{padding:7px 0}.topline{gap:10px}
 .family-nav{margin:12px -16px 10px;padding:0 16px 4px;max-width:none}.sp-total .metric{font-size:30px}.row .amount{font-size:14.5px}
 .row{gap:10px}.actions a.btn,.actions button{min-height:44px}}
@media(max-width:350px){.sp-toolbar{grid-template-columns:1fr}.exp-row .amount{margin-left:0}.exp-row{flex-wrap:nowrap}}
`;
rep('@media(max-width:650px){.family-nav{scroll-padding:8px}} </style>','@media(max-width:650px){.family-nav{scroll-padding:8px}}'+CSS+'</style>','css');
fs.mkdirSync(OUT.replace(/[^/]+$/,''),{recursive:true});fs.writeFileSync(OUT,s);
const js=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);js.forEach(c=>new Function(c));
console.log('ok',s.length,'script',js.length);
