# Ambienti: planimetria e trascinamento degli elettrodomestici
1 novembre 2026. Lotto `codex/ambienti-mappa-drag-20261101`, base diretta PR73 `c3f9956cb656ecf3e15d7b9be57435b604fa7968`, con dipendenza PR72. Base comune remota `cbddcf0` invariata. Codice `92d6a47ef715990a54d4183edb1e1fd9c55ef4ce`, push verificato; [PR draft74](https://github.com/Vincenzobrutto/Home_OS/pull/74) verso consolidamento, esplicitamente dipendente dalle PR73/72. Nessun merge, deploy, nuova AI o modifica della demo Alessio.

## Implementato
Nella normale pagina Ambienti rimangono le schede come vista iniziale; il selettore **Schede / Planimetria** apre la mappa nella stessa pagina (`?vista=planimetria`). Ricerca e filtro delle schede sono conservati. Se manca la mappa si può proseguire con schede e documenti, senza un piano sintetico di ripiego. Il percorso precedente /mappa resta compatibile.

Gli oggetti propri già associati a un ambiente compaiono nel relativo poligono. Senza coordinate salvate il segnaposto è tratteggiato e **indicativo**: nessuna posizione fisica è inferita o scritta da una lettura. Le coordinate confermate sono conservate. Gli oggetti senza stanza rappresentata restano nella lista Da collocare. Associazioni multiple possono mostrare lo stesso oggetto nei rispettivi vani; il testo spiega che un trascinamento sceglie il solo vano di arrivo, senza duplicare l’oggetto.

Trascinando si salva una posizione reale scelta dall’utente. Passando a un altro vano, pin e associazione canonica ObjectPosition cambiano nella stessa operazione server già esistente. Schede, conteggi e normale catalogo seguono il nuovo ambiente; ricaricando la posizione rimane. Il clic breve apre la scheda normale. Controlli posizione e tastiera restano disponibili; Escape/pointercancel annullano il gesto.

La geometria viene calcolata nello spazio raster della pagina intera, anche con zoom e scorrimento. Rilascio sui muri, nei vuoti, fra due vani, fuori dalla mappa visibile o sopra pannelli/barra fissa annulla senza scrivere. Durante un gesto cambiano versione/associazioni: annullamento; il server mantiene CAS e idempotenza. Invii concorrenti bloccati. Esito incerto: ripetizione manuale dello stesso payload/chiave; salvataggio confermato con refresh fallito: sola nuova lettura. 401/403/404 nascondono la vista; 409 richiede dati aggiornati. Modifica di un contorno precedente disabilitata se la versione è cambiata.

Non si trasferiscono elettrodomestici del venditore con la Gift. La prova include oggetti propri già censiti. Regole Gift, indipendenza Agency/Home e anno opzionale ereditate dal [lotto precedente](gift-digital-plan-20261101.md).

## Contratto e dipendenze
GET digital-plans/:id espone `objects[].roomIds`, associazioni canoniche autorizzate, insieme a positionVersion. Il client accetta risposte precedenti mostrando soltanto i pin espliciti disponibili; backend e frontend aggiornati sono necessari per disporre anche oggetti ancora senza pin. POST pins invariato: expectedVersion, objectId, regionId, x, y, expectedPositionVersion e Idempotency-Key. Una sola associazione di destinazione è la semantica già esistente del salvataggio.

Nessuna migrazione aggiuntiva in questo lotto. Serve lo schema HomeDigitalPlan della PR73, oltre alla PR72; non è stato applicato a servizi/DB esistenti. Nuovo profilo browser nominale e profilo DB dedicato registrati nei runner protetti, non negli aggregati ordinari.

## Verificato
- Backend ordinari **878/878**, nessun salto; log privato .drag-test-runs/backend-ordinary.log.
- DB/HTTP mappa **13/13**, nuovo cluster secondario gaOyxL, arresto PostgreSQL verificato. Inclusi aggiornamento stanza/conteggi, replay senza duplicazione, concorrenza, posizione interna e lettura roomIds senza creare pin.
- Frontend **78/78 in 8 file**: geometria/scene, PointerEvents, gestione invii/errori e navigazione Ambienti, più regressioni oggetti/routing/floor-plan. Non è l’intera suite frontend. Il primo run dopo il vincolo del viewport aveva 5 test falliti per rettangolo JSDOM nullo: fixture corretta a un viewport reale, nessuna asserzione/soglia indebolita. Log fallito conservato, esecuzione finale verde in drag-frontend-verified.log.
- Guardie runner **16/16**. Typecheck e lint mirati backend/frontend verdi. Build frontend finale verde; bundle principale **516,90 kB, gzip157,45 kB**, warning Vite500kB conservato.
- Browser reale desktop e **375×812**, codice finale sul nuovo collaudo MHo0Ha: Schede→Planimetria nella stessa pagina, drag Cucina→Balcone, conteggio normale aggiornato senza reload, ricarica/persistenza; drag di ritorno a375 e ricarica. Zoom: rilascio geometricamente valido ma dietro pannello annullato; a375 rilascio sopra navigazione fissa annullato con posizione identica. Nessun overflow orizzontale (client/scroll360px), viewport ripristinato1280px/client1265px.
- Le interazioni a375 sono PointerEvents nel browser ridimensionato, **non un telefono fisico**. Il precedente collaudo proprio L27OVf era verde prima dell’ultimo vincolo di visibilità e viene mantenuto distinto; arrestato correttamente.
- MHo0Ha usa account sintetici già verificati e Gift già accettate: **non è un nuovo test del flusso di registrazione**. PDF sintetico rasterizzato dal vero renderer locale; contorni fixture dichiarati, nessuna nuova inferenza AI. Scanner/email stub espliciti, nessun AV/SMTP reale.
- Screenshot osservati nella traccia del collaudo; il salvataggio negli outputs era negato dal runtime CUA, nessun PNG consegnato o inventato.

## Prova e limiti
Nuovo collaudo locale MHo0Ha attivo fino al **1 novembre2026 ore10:00 Europe/Rome (09:00UTC)**, su origine univoca e cluster nuovo; poi arresto automatico. La guida privata negli outputs contiene URL/account sintetici, non in Git. Vecchio collaudo utente cNnivm e relativi dati **non usati o fermati**. Questo non è un deploy.

Schede normali e mappa sono collegate, ma la disposizione iniziale non rappresenta la collocazione reale degli elettrodomestici né il loro ingombro. Planimetrie dense e moltissimi oggetti richiedono ulteriori prove su leggibilità/prestazioni; multiutenza, multipiano, calibrazione/computo commerciale Home e nuova AI restano fuori da questo lotto. Nessuna promessa di riconoscimento universale o certificazione delle superfici. La vera bozza incarico resta bloccata senza modello agenzia approvato.

## Prosecuzione autonoma fino alle14:00 — 1novembre,08:03UTC
Su incarico di Vincenzo il lotto resta aperto per il riesame mirato. Diagnostica sintetica:250oggetti in2vani producevano250marker ma solo162posizioni distinte, per esaurimento delle ancore indicative. Due casi rossi riproducono il problema anche con poligono concavo e vuoto (44posizioni per120oggetti); nessun caso/test indebolito.

Correzione: il pool delle sole ancore di visualizzazione si amplia quando necessario su intervalli interni verificati, deduplicati. La scelta aggiorna progressivamente la distanza minima senza ricalcolare a ogni oggetto tutte le distanze e la clearance. I pin confermati non sono ricampionati e non avviene alcuna scrittura dal layout. I2nuovi casi sono verdi; gruppo aggiornato home-maps **42/42 in5file**, typecheck e lint verdi. Le precedenti78verifiche restano storiche, non presentare80/80come una nuova esecuzione. Diagnostica locale, non latenza browser:250/250posizioni distinte17ms e500/50049ms, tutte dentro il vano. Sono fixture rettangolari, non un benchmark indipendente o garanzia di leggibilità di500icone su telefono.

Tre nuovi casi HTTP per modifiche da scheda, rinomina/archiviazione vano e archivio/ripristino oggetto aggiunti: syntaxcheck passato, **esecuzione DB ancora pendente** perché entrambe le porte protette ospitano collaudi. Nessuno di questi collaudi viene fermato per liberarle. Nessun nuovo cluster avviato. Build privata della correzione verde (bundle517,11kB/gzip157,57, warning500kBpreservato); browser della correzione ancora da eseguire; il collaudo MHo0Ha serve il codice precedente e scade normalmente alle10:00Rome. Nessuna nuova AI, merge/deploy o modifica demo Alessio.

Correzione ancore pubblicata a `2fab688b11c95020f5986a5aaa314d5398900698`, hash remoto verificato. I3casi HTTP restano locali non committati in attesa della loro esecuzione.

### Verifiche lifecycle concluse e nuovo profilo nominale,08:35UTC
Prima esecuzione su nuovo cluster primario C9Cs5o:16/16verdi, incluso cambio ambiente dalla normale scheda (pin vecchio da ricontrollare, stale drag409), rinomina/archiviazione/ripristino vano e archiviazione/ripristino oggetto. Aggiunto poi il controllo mancante della fonte tramite normale cestino/ripristino: nuovo cluster v3Rjg9 **17/17verdi**, entrambi arresti PostgreSQL verificati. Il cestino nasconde lista/mappa/scritture senza rivelare nomi; il ripristino recupera pin e associazioni senza duplicarli.

Preparato un **nuovo** profilo nominale test:ambienti-map-followup-trial con scadenza fissa1nov13:00UTC/14:00Rome, nuovo cluster/hostname e terzo account sintetico per90oggetti nella Cucina. Non riavvia o estende MHo0Ha/cNnivm. La sua readiness e il browser sono ancora da verificare. Guardia runner **18/18verdi**: il solo profilo datato autorizzato ha cap5h sufficiente alla scadenza più30s di arresto; gli altri profili restano a2h e build/ordinari a10min. Il nominale non entra negli aggregati. Nessun nuovo limite di prodotto o aggiramento delle protezioni DB/rete.
