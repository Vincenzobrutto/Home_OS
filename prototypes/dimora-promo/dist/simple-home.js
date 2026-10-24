/* Simplified free exploration. Synthetic session data only. */
function pCreateGiftHome(g){
 if(g.homeId)return;const source=P.properties.find(p=>p.id===g.property);
 g.homeId='gift-home-'+g.id;g.homeName=g.homeName||source.name;
 const home=pSeed(g.homeId,g.homeName,source.city);Object.assign(home,{unit:source.unit,building:source.building,giftHome:true,sourceProperty:source.id,homeAvailable:false});
 P.properties.push(home);P.homes[g.homeId]=Object.fromEntries(HOME_KEYS.map(k=>[k,[]]));
}
const enrichedHome=P.homes.roma;
const systems=[['Quadro elettrico','Ingresso'],['Impianto idrico','Bagno'],['Climatizzazione','Soggiorno'],['Riscaldamento a pavimento','Soggiorno'],['Ventilazione meccanica','Locale tecnico'],['Fotovoltaico','Terrazzo'],['Accumulo domestico','Locale tecnico'],['Solare termico','Terrazzo'],['Addolcitore acqua','Locale tecnico'],['Antifurto','Ingresso'],['Videocitofono','Ingresso'],['Domotica e luci','Soggiorno'],['Irrigazione','Giardino'],['Ricarica auto','Garage']];
systems.forEach(([name,room],i)=>{const id='system-'+i,doc='system-doc-'+i;if(!enrichedHome.rooms.includes(room))enrichedHome.rooms.push(room);enrichedHome.documents.push({id:doc,name:'Scheda e manuale · '+name,family:'Energia e impianti',status:'Completato',object:name,personal:true,origin:'Archivio di esempio · documento dimostrativo'});enrichedHome.objects.push({id,name,room,type:'Impianto',brand:'Esempio demo',model:'Da verificare',archived:false,warranty:'Da verificare',doc,documents:[doc],cost:0});});
// Populate the agency's same demonstration property with selectable, reviewed sources.
const agencyHouse=P.properties.find(p=>p.id==='roma');
systems.forEach(([name,room],i)=>{const doc='roma-system-doc-'+i;agencyHouse.docs.push({id:doc,name:'Scheda e manuale · '+name,present:true,reviewed:true,allowed:true,private:false,version:1,source:'Tecnico · esempio dimostrativo'});agencyHouse.assets.push({id:'roma-system-'+i,name,room,doc,type:'Impianto'});});
dashboard=function(){if(state.role!=='home')return '';const pending=P.gifts.filter(g=>!g.accepted&&g.status==='Invito predisposto');return (pending.length?pBenefit('Una casa ti aspetta.',pending.length+' consegna da rivedere: accetta la casa e i documenti scelti dall’agenzia.','switch:home:Consegne ricevute','Rivedi consegna →'):'')+metrics([['Oggetti e impianti',V5.objects.length,'Schede e manuali collegati'],['Documenti',V5.documents.length,'Nella casa selezionata'],['Attività',V5.tasks.filter(t=>!t.done).length,'Da ricordare']])+`<div class="gridcards">${card('Oggetti e impianti','<p>Tutti gli impianti di casa, con documenti e dettagli.</p>'+pButton('Esplora impianti →','switch:home:Oggetti e impianti'))}${card('Documenti','<p>Ritrova manuali, planimetrie e documenti ricevuti.</p>'+pButton('Apri documenti →','switch:home:Documenti'))}${card('Attività','<p>Controlli e promemoria, quando servono.</p>'+pButton('Vedi attività →','switch:home:Attività'))}</div>`+card('Le mie case',P.properties.filter(p=>p.homeAvailable!==false).map(p=>pRow(p.name,p.city+(p.giftHome?' · Ricevuta con Home Gift':' · Casa di esempio'),'home-select:'+p.id,p.id===P.current?'Casa aperta':'Apri casa','⌂')).join(''))+(P.properties.find(p=>p.id===P.current)?.giftHome?card('Documenti ricevuti dall’agenzia',V5.documents.filter(d=>d.gift).slice(0,3).map(d=>pRow(d.name,d.origin+' · fonte v'+d.sourceVersion,'home-document:'+d.id,'Consulta')).join('')+pButton('Vedi tutti i documenti →','switch:home:Documenti',true)):'');};
const previousSwitch=pSwitch;
pSwitch=function(role,page){const current=pProperty();if(role!=='home'&&current?.giftHome)pSelect(current.sourceProperty);previousSwitch(role,page);};
const simplePage=pageContent;
pageContent=function(){if(state.role==='home'&&state.page==='Casa')return dashboard();return simplePage();};
const simpleAction=pAction;
pAction=function(a,args){if(a==='home-select'){pSelect(args.join(':'));pSwitch('home','Casa');return;}return simpleAction(a,args);};
const simpleWorkspace=workspace;
workspace=function(){let html=simpleWorkspace();html=html.replace('<button class="navitem" data-action="tour">▷ Percorso guidato</button>','');html=html.replace('La stessa organizzazione della V5, con esempi da esplorare.','Tutto quello che serve, nella casa che hai scelto.');if(state.role==='home'){const split=html.indexOf('<button class="navitem',html.indexOf('nav:Rubrica'));if(split>0){const end=html.indexOf('<div class="sidefoot">',split);if(end>split)html=html.slice(0,split)+'<details class="simple-more"><summary>Altre funzioni</summary>'+html.slice(split,end)+'</details>'+html.slice(end);}}return html;};
render();


