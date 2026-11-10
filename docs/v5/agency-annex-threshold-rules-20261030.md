# Accessori e soglie virtuali — regole e laboratorio, 30 ottobre 2026

## Implementato nel nucleo

`recognition-rules.ts` separa riconoscimento del tipo, geometria e associazione all'abitazione. Etichette esplicite per cantine/cellar, garage/autorimesse/box auto, posti auto, soffitte/sottotetti, balconi, terrazze e giardini. Negazioni, tipi contraddittori e testo a bassa confidenza producono revisione; BOX da solo resta candidato ambiguo, non garage certo. La soglia0,75 è euristica, non probabilità calibrata. Il censimento corrente lavora sulle etichette del modello già registrate, non esegue nuovo OCR sull'immagine.

Una pertinenza esplicitamente etichettata e proposta come excluded può essere segmentata come candidato geometrico separato se non sono espliciti parti comuni/altra unità e il tipo non è ambiguo. Inventario AI grezzo e sua esclusione restano immutati/tracciati. Associazione sempre unverified; nessuna titolarità, abitabilità, appartenenza al corpo principale o coefficiente commerciale inferiti. Non modifica i seed per ottenere un risultato desiderato. Mancanza di un'etichetta o seed adeguato resta un problema aperto.

Pipeline inventory/review usano questa derivazione geometrica; annexInventory registra tipo proposto, motivo, associazione, esclusione da rivedere e disponibilità del contorno. La review riceve anche i candidati da riesaminare. Il risultato resta needs_review quando ci sono esclusioni recuperate. Record JSON e letture conservano lo scope della fonte, nessuna migration. Fingerprint raster-seeds-v4-annex-candidates. Il computo continua a richiedere scelte/conferme esplicite, nessun totale automatico per un accessorio candidato.

## Regole per aperture: funzioni disponibili, applicazione solo in anteprima

OpeningObservation distingue segnali (estremi muro, freccia, arco/anta), contesto e provenienza. Ruolo proposto ingresso soltanto con contesto interno-verso-comune e freccia o segno porta; porta interna con contesto fra vani e arco/anta. Una freccia da sola non identifica un ingresso. Sono osservazioni dichiarate dal chiamante, non un riconoscimento automatico del glifo da parte del modulo.

Il rilevatore geometrico esplora tratti collineari a passi angolari15gradi, cerca vuoti con fianchi di tratto e diramazioni laterali, controlla estremi sul tratto ed eccesso di inchiostro attraversato. Produce solo aperture non classificate: possono essere porte, finestre, interruzioni o falsi positivi. Limiti200proposte,3000frammenti intermedi,30soglie selezionate; span fra4pixel e25%diagonale come guardia euristica, mai misura fisica di una porta. BOX/garage non sono riconosciuti dalla sola larghezza del vuoto.

previewVirtualThresholds ricalcola l'ammissibilità sugli originali, ignora flag canPreview contraffatti e applica soltanto gli ID selezionati a una copia dei pixel. Originale invariato, state preview_only e requiresConfirmation true. Le linee sono barriere tecniche, non muri ricostruiti o dati certificati. Nessuna soglia è applicata automaticamente dal worker prodotto in questo incremento.

## Laboratorio navigabile

Strumento generico versionato in `backend-v5/tools/agency-threshold-lab/`, builder senza rete/AI e manifest privato esplicito. HTML autosufficiente con originali incorporati, contorni e tratteggi, selezione, modifica XY/trascinamento degli estremi e nuova segmentazione temporanea. Una modifica deseleziona la soglia; di default si mostrano solo proposte attive/selezionate. Nessuna persistenza nella pratica o account; non sostituisce sessione/CSRF/CAS e autorizzazioni del workspace. Nessun nuovo endpoint prodotto.

Tre casi privati di collaudo: sintetico, seconda foto e replay delle proposte originali della prima planimetria (con il simbolo già mantenuto dalla vecchia pipeline). Il replay della prima non rappresenta la pratica successivamente corretta con11vani, che resta invariata.

Verifiche browser:

- Caso sintetico con freccia esterna/apertura:0→1contorno selezionando la soglia; originale preservato. Un tentativo esplorativo con freccia attraversante il bordo aveva prodotto polygon_unresolved: non dichiarare coperto quel caso. Distinzione annotazioni/tratti fisici ancora aperta.
- Seconda immagine:5contorni originari→6con la cantina recuperata automaticamente come candidato lessicale/geometrico; associazione non confermata. Una proposta interna selezionata da Codex nel collaudo separa il piccolo passaggio e porta l'anteprima a7contorni/3issue. Questa selezione non è una validazione di un agente reale né riconoscimento autonomo dell'ingresso principale.
- Prima planimetria replay:10contorni/4issue e nessuna soglia selezionata, senza scritture alla pratica corretta.
- Correzione XY verificata: deselezione obbligatoria e nuova anteprima; screenshot e artefatto negli output privati. Il calcolo della prima immagine ha temporaneamente bloccato il thread UI e una lettura del browser è scaduta; lettura successiva riuscita. Worker e collaudo mobile ancora necessari.

Le prove automatiche su40candidati per immagine contengono falsi positivi: sulla seconda, una lunga linea interna aumenta il conteggio tagliando impropriamente un vano. Non ottimizzare né selezionare automaticamente dal solo numero di contorni. Dopo la derivazione della cantina cambia anche il campo di scansione, quindi gli ID ordinali dei candidati non sono identità persistenti.

## Verifiche e limiti operativi

596/596 backend ordinari finali, test mirati progressivi fino66/66 prima dell'ultima prova positiva inclusa nei596,21/21 DB isolato per persistenza/privacy del censimento, build e lint backend mirato verdi. Typecheck del laboratorio con lib DOM e build esbuild verdi. Nessuna libreria installata. Fixture di porta, freccia insufficiente, parete attraversata, estremi mancanti, flag falsificati, nessuna selezione, ripristino immagine, rifiuto sottolineatura, BOX ambiguo, esclusioni comuni/altra unità e passaggio di candidati alla review.

Prototipo privato su127.0.0.3:34876fino17:19Europe/Rome, connessioni esterne bloccate; HTML utilizzabile anche offline dopo l'arresto. Originali, manifest, risposte AI e coordinate personali soltanto nella cartella privata della chat, mai nel repository. Nessuna nuova chiamata AI/costo, ledger e riserve invariati. Nessuna modifica demo Alessio, merge o deploy del prodotto.

Prossimo incremento: riconoscere le annotazioni di ingresso con evidenza localizzata, verificare semanticamente le proposte (inclusi falsi tagli), associare le pertinenze e integrare decisioni/preview nel workspace con fonte/versione/SHA, revisione e worker. L'ingresso principale della seconda scansione e la ricostruzione completa restano irrisolti.
