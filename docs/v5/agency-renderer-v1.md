# Agenzie — raster dai bytes autorizzati

## Implementato e confini

`AgencyPlanRasterizer` interpreta PDF e PNG in un processo Node figlio usa-e-getta, usando pdfjs-dist e canvas già presenti. Non installa librerie né modifica il decoder del prodotto Home. Script distinto in agency-plans, senza credenziali nell'ambiente. Non riceve URL, path, comandi o SHA attestati dal browser: verifica i bytes immutabili contro SHA e MIME derivati dal server. Parametri esatti pagina/DPI; campi extra non possono sostituire il documento.

PDF: massimo20pagine, pagina selezionata1–20, DPI esplicito72–300. Controlla viewport prima di creare canvas: massimo4milioni di pixel,5000per lato, minimo8. Conserva rotazione PDF e trasformazione affine dai punti PDF ai pixel. Sfondo bianco, disegno in scala di grigi. PNG: controlla IHDR/dimensioni prima di decodificare e appiattisce trasparenza su bianco; coordinate dei pixel originali, trasformazione identità. Il parametro DPI riguarda il PDF, non inventa una risoluzione fisica per PNG. JPEG restituisce esplicitamente unsupported in questo incremento; upload JPEG rimane consentito come archivio.

Timeout processo15secondi, heap JS256MiB, stdin e stdout limitati. Errori PDF cifrato, invalido, limiti superati e formato non supportato sono distinti senza riportare documento o diagnostica del decoder. I metodi di rete HTTP/fetch sono disabilitati nel figlio e il documento è fornito in memoria; nessun recupero esterno configurato.

Output interno: raster grayscale, SHA dei pixel, SHA originale, pagina, pageCount, DPI richiesto e trasformazione. Nessun ritaglio/rotazione arbitraria del client. I futuri ritagli dovranno avere trasformazioni e fingerprint propri. Il calcolo m² resta subordinato alla calibrazione dalla barra metrica e alla conferma dell'agente: DPI non è scala metrica.

`loadAuthorizedPlanRaster` è il ponte per la porta loadRaster della pipeline: legge lo snapshot corrente tramite store/vault, decodifica e rilegge autorizzazioni/versione dopo il rendering. Revoca o sostituzione durante il lavoro scarta il risultato. La pipeline già verifica classificazione floor_plan e contesto tra le fasi; il ponte da solo non avvia analisi e non chiama AI.

## Limiti operativi

Il processo figlio è isolamento del parser e timeout, non sandbox OS completa: heap JS non limita tutta la memoria nativa e non è un antivirus. Quote di memoria CPU/processi a livello OS, concorrenza massima e test ostili sono necessari prima di esporre file a utenti esterni. Non dichiarare sicurezza completa da queste guardie applicative. Dipendenza canvas opzionale di pdfjs già presente (1.0.11): ambiente privo del binario compatibile deve fallire esplicitamente; riproducibilità/installazione su altri sistemi non verificata in questo incremento.

Nessun endpoint, AppModule, navigazione UI, preview HTTP o job persistente attivo. Nessun file personale usato. Le fixture PDF sono generate come oggetti/xref sintetici con un rettangolo vettoriale; PNG generato in memoria. Nessuna verifica su un catalogo di documenti reali o di PDF malevoli.

## Verifiche e prossimo passo

Test reali del decoder su PDF, DPI, rotazione, seconda pagina, PNG/trasparenza; rifiuto viewport/pagine eccessivi, PDF malformato, JPEG, SHA/MIME alterati e override input. Test del ponte per diniego iniziale e revoca/sostituzione dopo render. Nessun nuovo DB necessario: lo store non cambia.

Prossimo task: job/lease e prenotazioni persistenti run+fase con riserva/costo, identità/consenso, versioni dei prezzi e gestione dell'esito incerto senza retry automatico. Collegare pipeline e provider solo dopo questo confine, poi endpoint sessione/CSRF e UI pratica. Budget sperimentale del PDF reale già impegnato: nessuna nuova chiamata automatica.
