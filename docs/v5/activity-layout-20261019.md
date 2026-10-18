# Attività: layout desktop/mobile — 19 ottobre 2026

## Comportamento implementato

Pagina separata in Scadenze e Analisi e verifiche, con scelta nella query URL. I link esistenti con analizza/job aprono direttamente la seconda vista; nessun avvio AI automatico. Schede caldaia ed esempi rimangono accessibili da Strumenti ed esempi, inizialmente chiuso.

Scadenze mostra i conteggi completi delle attività personali aperte dal riepilogo server: tutte aperte, scadute, oggi, tutte le future, senza data. Caricamento/errore non sono convertiti in zero. Selezione esplicita con aria-pressed; filtri a capo su mobile. Storico usa il selettore degli stati esistente (completate, annullate, tutte), senza nuovi endpoint. Il titolo riflette la categoria e i conteggi delle aperte. Elenco con separatori, nessuna selezione multipla, un solo badge di stato per le chiuse. Stato vuoto specifico con ritorno a tutte le aperte.

Il link al dettaglio salva indirizzo filtrato, posizione, ID e numero di pagine caricate nello stato di navigazione. Sia il link di ritorno sia Indietro del browser ripristinano il contesto. Dopo perdita della cache vengono ricaricate soltanto le pagine già viste; poi focus sull’attività senza scorrimento implicito e ripristino della posizione. Se l’attività non è più presente il focus passa al titolo dei risultati; la posizione viene limitata dal browser allo spazio disponibile. Accesso diretto al dettaglio: ritorno all’elenco standard della stessa casa. Nessun dato privato salvato in storage persistente.

## Verifica

Browser con API reali: desktop 1440×1024 e mobile 390×844, nessun overflow orizzontale (larghezza documento 375 px su viewport 390 px). Verificati Casa→Oggi, categorie rapide, Storico completate, apertura della fixture sintetica e ritorno con link e Indietro; posizione mobile ripristinata a 170 px con focus sull’attività. Verificati cambio vista Analisi, apertura/annullamento creazione senza scritture e console senza errori rilevati. Nessun originale personale aperto o analisi AI avviata.

Test mirati: attività/Casa, navigazione paginata dopo rimozione della cache, regressioni analisi M3 e provider M4 con backend simulato. Aggiornate le aspettative di navigazione alla nuova vista e agli strumenti chiusi; riallineate due aspettative già obsolete di Documenti/Casa ai controlli correnti. Build/typecheck/lint frontend. Esito: 25 test Attività/Casa e 42 test analisi M3/M4 passati; ripetuti con successo i test mirati di creazione e ripristino paginato dopo l’ultimo affinamento.

## Limiti

Modello, permessi, API e salvataggio invariati. Nessuna promessa di conformità WCAG o prova su telefono fisico. Verifiche di salvataggio e provider sono simulate; nessuna chiamata AI a pagamento. Mock usavano dati dimostrativi, app usa i dati disponibili. La pagina conserva token e shell reali: non è una copia pixel per pixel dell’immagine generata.
