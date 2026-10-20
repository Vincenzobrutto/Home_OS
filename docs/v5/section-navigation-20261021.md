# Navigazione delle sezioni — 21 ottobre 2026

## Comportamento implementato

- Desktop: Casa, Oggetti e impianti, Ambienti, Attività, Documenti, Spese, Rubrica. Oggetti e Ambienti disponibili con un clic da qualsiasi sezione della casa; voce corrente precisa anche nel dettaglio di un oggetto/ambiente. Nessuna nuova pagina o copia delle risorse.
- Mobile fino a 800 px: Menu nella testata, con pannello delle sette sezioni e nome della casa. Accesso in due tocchi senza caricare Casa o scorrere fino a Esplora. Barra inferiore preservata: Casa, Attività, Documenti, Spese, Rubrica. In questa barra Casa continua a rappresentare anche Oggetti e Ambienti; nel pannello è evidenziata la destinazione esatta.
- Menu solo con una casa corrente autorizzata, legato ad account, casa e posizione di navigazione. Chiusura dopo scelta, Chiudi menu, Escape, tocco sullo sfondo o passaggio a desktop. Pannello scorrevole entro l’altezza disponibile; sfondo inattivo e scroll bloccato mentre aperto; ripristino alla chiusura.
- Focus iniziale su Chiudi menu, Tab/Shift+Tab confinati al pannello, ritorno al pulsante di apertura. La navigazione continua a usare Link del router: contesto della Rubrica e protezione delle modifiche non salvate riusati.
- Icone da libreria Phosphor già installata, armonizzate con il sistema esistente. Nessuna nuova dipendenza.

## Verifiche

17 test mirati superati nelle quattro suite AppShell, layout Casa, editor documenti e Rubrica (con riesecuzione di AppShell/editor dopo il nuovo caso). Copertura: struttura di sette/cinque voci, selezione dei dettagli Oggetti e Ambienti, apertura/chiusura, focus, Tab/Escape, cambio pagina, contatti/ritorni e avvisi sulle modifiche non salvate. Il caso aggiunto del Menu dentro l’editor controlla che annullare l’uscita conservi il campo e confermare navighi senza preparare un altro documento.

Browser reale in sola lettura: Documenti → Oggetti → Ambienti su desktop; mobile 390/320, apertura, scelta Oggetti, selezione corrente, Tab/Shift+Tab/Escape e ritorno del focus. Oggetti → Menu → Rubrica → Oggetti mantiene la provenienza. Resize a desktop chiude il pannello e libera la pagina. Testata leggibile a 320 px, nessun overflow orizzontale nelle viste provate; barra inferiore ancora a cinque voci. Evidenze locali nella chat: outputs/menu-navigation-20261021.

Build e TypeScript riusciti, lint mirato. Vite segnala il bundle principale oltre 500 kB (circa 503 kB), senza errore di compilazione. Non eseguita certificazione screen reader o prova su telefono fisico.

Nessun dato reale modificato, upload, nuova bozza o invio AI. API, schema e backend invariati. Modifiche legacy locali preservate. Salvataggio delle bozze resta rinviato.
