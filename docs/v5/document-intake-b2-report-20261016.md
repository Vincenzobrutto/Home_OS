# Archivio assistito B2 — esito16ottobre2026

## Risultato e attivazione
Backend organizzazione personale implementato, migrazione23 additiva applicata al solo dimora_v5_product_dev:55432. Decisioni salvate/rimandate, ripresa nuova istanza, conferma parziale atomica per elemento, ricevute richieste ed esiti recuperabili; niente sovrascritture silenziose. Target personali correnti/versionati, append del collegamento documentale canonico senza duplicati. Originali, filename, visibilità e campi schede/spese non modificati. Metadata multiparte consentono più raccolte per un solo PDF.

Documenti: filtro raccolta combinabile, titolo personale quando confermato, dettaglio parti e metadati in manifest ZIP/JSON personale. Cursor e cache includono raccolta. Nessun conteggio totale inventato. Gli originali pregressi senza organizzazione corrente restano Da organizzare: non è stata avviata classificazione automatica.

API registrata riavviata tramite launcher verificato, session200. Intake NON importato AppModule: route live404 e capability modulo isolato false. Filtri Documenti sono attivi; il caricamento massivo/AI non è ancora utilizzabile nell'app. PostgreSQL e frontend preservati, nessuna.env/sicurezza/provider/ledger live cambiati. Nessun invio AI/paid/email o caricamento personale. Le prove HTTP hanno creato/rimosso solo proprie fixture sintetiche.

## Claude raccolto
Worktree Dimora-V5-Claude-archivio-assistito pulito, CONSEGNA C1/C2/C3 PRONTE. Solo directory di ownership nei quattro commit, nessun allineamento o dirty copiato:

| Originale Claude | Master | Contenuto |
|---|---|---|
|27994f0|4a97008|Modello/componenti a props|
|539e94a|28bec15|Test casi approvati e filtri|
|42c9fdc|c4b1996|Rifinitura/harness/handoff/screenshot|
|59c2f7b|a4e7787|Indice consegna finale|

Integrato DocumentCollectionFilters in SearchForm; assistente resta isolato. HANDOFF R1/R3/R4/R6 risolti lato backend; dettagli aggiornati nel contratto. R2 mapping limiti/permessi e R5 link autorizzati rimangono al container; R7 analisi è B3. Prima B4: consenso esplicito alla sostituzione, fonte null redatta anche per duplicate e conservazione delle parti manuali multiple in revisione. Nessun messaggio/UI inviato a Claude.

## Prove
- BE build/lint verdi. 2unit ricerca verdi, inclusi collection non-stringa e cursor cambiato/legacy.
- 29test Node complessivi verdi in sequenza: fondazione lotti, upload memoria e organizzazione (conteggio include i tre test contenitori). Nuovo B2:9casi+contenitore. Coprono guard account/CSRF/ruolo/revoca, salvataggio/rinvio/ripresa, conferma selettiva, file stale indipendente da file valido, riuso duplicato, versione target, link esistente/concorrenza, consenso sostituzione e conflitto organizzazione, ack perso dopo commit, privacy tra account e fonte cambiata, filtri/cursor/dettaglio/ZIP/JSON personale. Conteggi ledger AI e spese invariati nel test.
- 9test ricerca PostgreSQL (8casi+contenitore) verdi; 14test regressione HTTP ricerca/originali/ZIP e JSON personale verdi in sequenza. Fixture H2 aggiornata per email verification introdotta dopo la scrittura del vecchio test: marcata verificata solo l'email @example.test di quel test, senza email reali. Prima esecuzione concorrente delle suite falsava una verifica di conteggi globali; ripetuta correttamente con test-concurrency=1. Non è stato modificato il prodotto per aggirare i controlli.
- FE 68regressioni esistenti verdi su ricerca/client/documenti;18test componenti Claude+2nuovi test raccolte verdi. Dopo correzione cache, rieseguiti i2test raccolte e la suite ricerca UI. Build/lint FE verdi. Entry493,92kB, gzip150,38kB; componenti assistente completi non importati dall'app.
- Browser IAB su servizio reale: raccolte visibili in Documenti; Da organizzare trova i3originali esistenti, Energia vuota senza false classificazioni, passaggio tra raccolte già in cache corretto, reload/deep link e Azzera preservano gli originali. Solo GET/filtro, nessun download di file personali o modifica di dati. Scheda dedicata nascosta, mockup dell'utente preservato. Screenshot workspace outputs/document-intake-b2-filters-20261016.png.

La prova browser ha trovato e fatto correggere una cache key incompleta: mancava collection, quindi si poteva vedere il risultato precedente sotto una nuova etichetta. Regressione dedicata aggiunta. Una precedente prova DB ha trovato confronto JSONB dipendente dall'ordine delle proprietà: ora confronto semantico tipo/intervallo, verificato anche nel riuso senza modifiche. Non dichiarare verdi soltanto le prove iniziali.

## Limiti e prossimi passi
La nuova suite B2 usa HTTP/DB reali e metadata/byte sintetici espliciti; non è una nuova prova Defender o classificatore/provider. B1b aveva già una prova fisica separata, non ripetuta senza cambiamenti upload. Browser ha verificato i filtri desktop reali; le immagini mobile di Claude sono dell'harness, non prova del prodotto completo su cellulare/screen reader. Nessuna conformità legale/tecnica attribuita ai documenti.

Restano B3 classificatore con fonti verificate, worker e budget separato (prima offline), poi B4 client/container/lazy/ingressi, lista lotti/ripresa, upload/cancel/recovery, originale/candidati, handoff ricevuta ed esiti, collaudo sintetico desktop/mobile. Nessuna nuova campagna AI autorizzata. Automazioni restano PAUSED. Branch/main/dirty estraneo preservati, nessun push/deploy.
