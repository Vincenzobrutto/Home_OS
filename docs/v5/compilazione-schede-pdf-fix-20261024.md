# Compilazione a schede — correzione PDF e limite del collaudo mock

24 ottobre 2026, seguito del [collaudo mobile](compilazione-schede-collaudo-mobile-20261024.md). PR #23, nessun merge. Estensione dell'area registrata prima del codice nel commit `b1d3476`; correzione e test nel commit `0b9b6fc`.

## Correzione implementata e osservata

L'originale della compilazione standalone usava un elemento OBJECT application/pdf, dipendente dal visualizzatore nativo del browser. Il precedente collaudo aveva osservato il riquadro bianco sia nella pagina unica sia nelle schede. Ora Original in OnboardingPage riusa il componente PdfPreview già presente in Dimora: PDF.js, byte autorizzati e worker/risorse locali. Non modificato il renderer condiviso, né aggiunte librerie, visualizzatori esterni o servizi.

Download e immagini restano nel percorso precedente; il renderer riceve showDownload=false per conservare un solo comando di download con il filename originale. Query dei file ancora scoped account/casa/documento, stessi controlli di accesso e stessa pulizia di cache/URL al cambio contesto. Nessun endpoint, payload di conferma, CSRF, versione/SHA o criterio di validazione modificato.

Verifica nel browser integrato sulla bozza caffè già disponibile, API protetta in sola consultazione: originale visibile e non più bianco; indicatore1/1, canvas renderizzato, zoom150% e quattro rotazioni provati. Ripristinati100% e orientamento iniziale. A390×844, clientWidth e scrollWidth entrambi375 anche con lo zoom: l'ingrandimento resta nel contenitore. Un solo comando Scarica originale, non attivato. Override del viewport rimosso alla fine; lasciata aperta l'anteprima corretta nella bozza a schede.

Screenshot `schede-pdf-mobile-corretto-20261024.jpg` soltanto negli outputs locali del task: contiene il PDF anonimizzato già autorizzato alla consultazione, non viene pubblicato su GitHub. Nessun nuovo caricamento o invio AI.

## Test e vincoli

Due regressioni aggiunte nel router mock: byte PDF autorizzati al renderer locale con un solo download e nessuna scrittura; byte negati403 non montano il renderer e non offrono il download. Il mock del componente verifica il confine di autorizzazione, non dimostra il rendering: quest'ultimo è coperto dai test esistenti di PdfPreview e dal riscontro browser sopra.

Mirati OnboardingPage e PdfPreview: **71/71 superati**, due worker, retry0 e guardie offline. Typecheck, lint e build superati; build Vite11,30s. Suite mock completa finale: **900/900 test,108/108 file, nessun test saltato,664,94s, verde** sul codice0b9b6fc. Due worker e retry0; nessuna asserzione o timeout modificati. Asserzioni precedenti invariate; nessun test DB/HTTP reale o migrazione.

## Più articoli nel mock: prova visiva ancora bloccata

Avviati soltanto API simulata3101 e frontend5186, con ambiente sanificato e guardia di rete limitata alle due porte. Il simulatore fornisce tre proposte sintetiche già presenti, senza estrazione, database o fallback reale. Tentata una sola apertura diretta della stessa origine già autorizzata, senza cambiare porta, browser o policy.

Il controllo del browser ha nuovamente rifiutato http://127.0.0.1:5186 per un permesso salvato o una policy gestita. Nessuna pagina mock aperta e nessuna prova visiva multi-articolo completata. Non tentati CDP, altre superfici, origini alternative o inserimento di fixture nel prodotto reale. Dopo il rifiuto, verificate le identità e chiusi soltanto i due processi mock propri; API3011/frontend5174/PostgreSQL55432 preservati.

Restano valide le verifiche automatiche di tre articoli con azioni distinte, conservazione dei dati e parità integrale del body. Non vengono descritte come una prova visiva o una nuova estrazione AI. La nuova autorizzazione del committente non ha rimosso il blocco tecnico del browser.

## Raccomandazione

Nel successivo collaudo manuale il committente ha segnalato pagina bianca sulla5186. Diagnosi locale: processi UI/API entrambi attivi, nessun errore di compilazione nei log; configurazione mock con script-src self senza inline, mentre il plugin React di Vite dev inserisce un preambolo inline. Incompatibilità riscontrata nel codice/configurazione, compatibile con il sintomo; causa del singolo errore client non confermata da console browser. Corretto il launcher locale per servire la build verificata0b9b6fc in modalità preview statica, priva di script inline, sulla stessa5186, con CSP identica e proxy esclusivo3101. Riavviato soltanto il processo UI mock, API e dati sintetici in memoria preservati; identità e listener verificati. Nessun cambiamento a protezioni, browser, codice prodotto o servizi reali, nessuna origine alternativa. Stesso link valido; rendering dopo il ricaricamento ancora da confermare dal committente. I900/900 e la build precedenti restano riferiti al medesimo codice, non sono stati ripetuti per la sola configurazione di avvio locale.

Successivo incarico del committente: preparare la prova manuale nel browser, senza un nuovo tentativo di navigazione dell'agente. Riavviati soltanto mock3101 e UI5186 con guardie offline e ambiente sanificato; identità dei processi e ascolto loopback verificati. Codice dalla punta8896dae, nessuna nuova modifica di prodotto. Consegnati account solo sintetico, link diretto e percorso crea/crea/escludi, ritorni, anteprima e riepilogo. I processi mock sono lasciati disponibili per il committente; stato effettivo nel work del task, dati esclusivamente in memoria. **Esito visivo manuale ancora atteso**, nessuna approvazione o sostituzione della pagina attuale dedotta dalla preparazione. Nessun accesso o salvataggio sul reale in questo avvio; nessuna nuova AI.

**Anteprima corretta; non ritirare ancora definitivamente la pagina attuale.** Mantenere l'opt-in e il ritorno alla pagina unica finché la prova visiva multi-articolo richiesta è eseguibile. Il limite residuo non è un difetto dimostrato del flusso a schede: è una verifica incompleta per il diniego del browser. Nessun merge o cambio del default implicito in questa correzione.

Audit finale READ ONLY esplicitamente autorizzato dal committente: conteggi e impronte di dati, bozze, job, ledger e migrazioni identici al riferimento precedente. Invariati5 oggetti,9 spese,12 stanze,1 contatto,30 documenti,22 bozze,14 job della casa e71 tentativi del ledger; bozza caffè ancora open. Il primo tentativo di audit era stato rifiutato dalla revisione automatica per accesso al DB reale tramite configurazione esistente: non aggirato; eseguito soltanto dopo il consenso specifico successivo del committente. Runtime con tutti e sette i worker di servizio disattivati e scritture server bloccate salvo login/logout; nessun salvataggio sul reale, nuova AI, modifica .env o migrazione autorizzati da questo lotto.
