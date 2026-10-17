# Verifica caricamento unico — 17 ottobre 2026

Incremento operativo della specifica unified-document-proposals-v1.md. Schema JSON additivo, senza migrazioni. Provider onboarding esteso alle bollette; provider economy/M4/receipt non attivati. Budget e variabili d’ambiente non modificati.

## Prove

- Backend build/lint verdi; 52 unit mirati (prodotti, fatture, bollette, schema provider, importi ambigui, evidenza/categoria/valuta e body senza oggetti).
- 20 test DB locali verdi: parser PDF effettivo, trasporto Anthropic simulato senza rete, fattura e due bollette sintetiche elettricità/gas; le due bollette attraversano coda/provider/validazione/bozza/conferma canonica. Zero oggetti per bollette; originali, storia e provenienza; riuso copia esatta, blocco doppioni, recupero pending e replay. Suite include isolamento, rollback e limiti concorrenti 5 USD/40 analisi. Account/campagne sintetici separati e ripuliti; nessun reset di dati utente.
- 5 test HTTP verdi su sessione, contesto, CSRF, deep link/conferma/ricevuta legacy.
- FE: 109 casi della suite mirata iniziale, con tre aspettative aggiornate per apertura su richiesta (non più primo file automatico); tutti risolti in follow-up. Aggiunti 4 test bollette e 2 consenso di lotto, verdi. Ultimo controllo 28 test router onboarding verdi dopo aggiornamento budget a fine job. Build/lint finali verdi.
- Browser reale IAB: elenco dei tre originali, fattura «Proposta pronta» disabilitata per nuovo avvio, due bollette «Da preparare» selezionabili. Nessun pannello aperto automaticamente. A 390 px: viewport390, larghezza contenuto375, nessun overflow; screenshot outputs/unified-upload-mobile-20261017.png. Sola lettura: nessun consenso/provider/conferma personale azionato.
- Runtime riavviato tramite servizio registrato Dimora-V5-Telefono.ps1; API3001 e frontend5174/LAN5175 conservati. Nessuna modifica firewall o env.

Log mirati in outputs/unified-*.log: be-unit, house-db, house-http, fe-tests, fe-followup, batch-ui, onboarding-ui-final, fe-build/lint, be-build/lint e runtime-restart. Le prime tre aspettative UI obsolete sono documentate nel log iniziale; follow-up corretto verde. Non sommare riesecuzioni come casi distinti.

## Budget e dati reali

Verifica UI residuo 4,98 USD, 1/40 analisi: stessa campagna onboarding-home-pilot-20261017, valore esatto precedentemente contabilizzato 4,976130 USD (costo0,023870). Zero nuovi Messages reali durante questo sviluppo. La fattura già pronta viene riusata; le due bollette reali non sono state inviate né contabilizzate dall’agente. Saranno preparate solo dopo il consenso del committente nell’app, sul medesimo residuo. Nessun nuovo oggetto/spesa personale confermato.

## Limiti e prossimo collaudo

UI bollette e conferme verificate con harness; pipeline backend con parser/DB e trasporto simulato. Lettura reale Anthropic delle due bollette ancora da provare. Chrome non più collegato, verifica lettura effettuata nell’IAB disponibile. Nessuna affermazione di OCR indipendentemente verificato o di atomicità globale tra archiviazione e finanza.

I tre file reali risultavano già organizzati quando aperti nel browser: la loro classificazione confermata viene conservata. Le vecchie etichette «Ricevuta + Fattura + Bolletta» non sono state cambiate implicitamente. Una nuova proposta utility_bill viene archiviata in Bollette nei caricamenti non già confermati; per correggere organizzazioni pregresse si usa Modifica con consenso alla sostituzione.

Prossimo passo: nel lotto381c5875-5759-4047-80ba-4d988c5b2c66 selezionare le due bollette, controllare elenco e consenso, preparare proposte e rivedere i totali; confermare ciascuna spesa solo se corretta. Nessuna ri-analisi della fattura necessaria. Mischiare acquisti di beni e bollette nello stesso PDF resta fuori da questo primo incremento; i controlli multiparte sono conservativi. Le altre note UI/prezzo oggetto/posizione Casa restano nel backlog condiviso.
