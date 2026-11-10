# Collegamento API e navigazione Agenzie — consegna 30 ottobre 2026

Stato: implementato sul branch dedicato, collaudo complessivo NON concluso. Nessun merge o deploy. Chiusura al termine autorizzato delle 09:00 Europe/Rome; questo documento registra il risultato senza ulteriore sviluppo.

## Implementato

Ingresso autenticato Area Agenzie, elenco/creazione agenzie e pratiche, caricamento documenti con visibilità, classificazione planimetria, consenso esplicito per documento e avvio analisi, stato job e apertura volontaria della bozza. API registrate in AppModule solo con storage Agenzie esplicito; nessun fallback dimostrativo. Entrambe le viste restano: vani modificabili e perimetro lordo separato per il computo commerciale. Configurazione scala, coefficienti e controlli salvata via API con CAS e idempotenza.

Application coordinator con massimo due worker, budget server obbligatorio e preventivo fisso massimo 250000 microUSD (0,25 USD) per run. Chiave e consenso dedicati; mai ereditati da altri flussi. Prima del primo invio, gli errori chiudono il job e liberano la prenotazione non usata; dopo un invio incerto nessun rimborso o retry automatico. Questo limite non e un prezzo commerciale promesso.

Abilitazione operativa: DIMORA_AGENCY_STORAGE_ROOT esplicita; per AI anche DIMORA_AGENCY_PLAN_AI_ENABLED=1, DIMORA_AGENCY_PLAN_WORKER_SECRET (64 caratteri hex), DIMORA_AGENCY_PLAN_API_KEY e budget dedicato provisionato lato server. La creazione agenzia non assegna credito. Nessuna chiave o nuova chiamata AI a pagamento usata nel collaudo.

## Verifiche e limiti

- Backend ordinario 509/509 al relativo snapshot di navigazione; log agency-navigation-unit-final.log. Gli incrementi concorrenti finding/mandate hanno verifiche separate nel registro: non sommare i conteggi ne attribuire questa regressione a un commit successivo.
- HTTP/DB reale isolato 36/36: agency-navigation + HTTP + worker; run dimora-offline-fGiDF5, cluster fermato. Provider falso esplicito, immagini sintetiche realmente decodificate. Consenso, isolamento, quote, replay, due chiamate simulate, geometria, computo lordo e rimborso prima della chiamata verificati.
- Frontend mirato 33/33, typecheck app e lint mirato verdi prima dell'ultima aggiunta dei titoli pagina. Log .agency-cache/navigation-ui-final.log. I soli titoli pagina aggiunti successivamente non hanno avuto una nuova verifica completa.
- Frontend completo: 1605/1607, NON verde. Restano due assert obsoleti che richiedono assenza di Agenzie: src/routes/casaLayout.test.tsx:35 e src/routes/routing.test.tsx:121. Da aggiornare al nuovo requisito e ripetere. Log .agency-cache/full-navigation-regression-final.log. Nessun assert allentato per nascondere il problema.
- Browser su stack reale isolato: login, ingresso agenzia e creazione pratica riusciti. Upload non concluso: il selettore file e rimasto bloccato per circa due ore e il termine autorizzato e scaduto durante la chiamata. Il trial si e arrestato automaticamente alle 08:00 UTC / 09:00 Europe/Rome. Risposta servizio indisponibile dopo lo stop, nessuna prova completa analisi/salvataggio in browser. Screenshot nello spazio outputs: Dimora-Agenzie-collegamento-api-stato-browser.png, solo stato parziale.
- Nessuna nuova prova completa a 375 px sul verticale reale. Le prove precedenti del componente non sostituiscono questa verifica.
- Profilo test:agency-trial separato dagli aggregati, dati solo sintetici, server e cluster propri. Run finale dimora-offline-87ksij, lifecycle 1/1; non significa flusso utente 1/1. URL localhost:34873 ormai spento, non consegnato come link funzionante. Prima esecuzione ett83i fallita per flag proxy assente, poi corretta mantenendo guardie offline.
- Dipendenze frontend gia dichiarate installate in cartella privata work/agency-frontend-dependencies; nessuna installazione nella junction condivisa, nessuna modifica versioni o lockfile.
- Diff check segnala una riga vuota finale nel solo test agency-trial.integration.test.cjs; non corretta dopo il termine per evitare nuovo sviluppo.

## Prossimo passo esatto

Aggiornare le due aspettative frontend alla presenza autorizzata di Agenzie; ripetere regressione/typecheck sul checkpoint finale. Riattivare un trial isolato con nuova finestra autorizzata (quella fissata nel profilo e scaduta), completare upload sintetico, classificazione, consenso, analisi, revisione vani, perimetro, calibrazione e computo/salvataggio/ricarica su desktop e 375 px. Solo dopo dichiarare il verticale provabile end-to-end. Valutare inoltre la gestione degli errori di costruzione del provider prima del try del worker: non modificata in questa tranche.

Demo Alessio invariata: worktree pulito a 58974db479e440bde8128a88a2a851763527c393. Nessun documento personale, servizio esistente, email, merge, main o deploy modificati. Il pubblico resta la demo, non questo software integrato.
