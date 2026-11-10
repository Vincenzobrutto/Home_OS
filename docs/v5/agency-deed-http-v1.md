# Atti — lettura proposte e associazione HTTP

30 ottobre 2026, ciclo diurno. Superficie reale del modulo AgencyPracticesModule, già opt-in nel runtime V5; nessuna attivazione/deploy eseguita da questo incremento.

## Contratto implementato

Prefisso /api/v5/agencies/:agencyId/practices/:practiceId.

* GET /deed-proposals: nessun query/body di attestazione, restituisce revisione e record leggibili. Fonte o record privati non autorizzati non hanno placeholder. Record superato ha result/bindings null; nessun incarico generabile.
* POST /deed-proposals/:recordId/bindings: Idempotency-Key obbligatoria e body esatto expectedRevision, candidateId, expectedFingerprint, unitId, subjectKey, acknowledgedDocumentRole, reason (facoltativo/null). RecordId proviene solo dal percorso, identità solo dalla sessione. Valore, campo, prova, visibilità e ID fatto sono derivati dal server, non scrivibili nel body.

Binding restituisce replay, recordId, factId, proposals e review filtrate. Il nuovo fatto è proposto. Conferma/correzione restano decisioni distinte del percorso review esistente. SubjectKey è un'associazione umana esplicita, non una persona verificata o una titolarità attuale accertata.

Le due nuove route impostano Cache-Control no-store e X-Content-Type-Options nosniff senza dipendere dal middleware globale per le risposte riuscite. Riutilizzano sessione cookie httpOnly, account-context, Origin/CSRF, preflight grant, lock/CAS e riverifica transazionale dello store. Viewer legge, solo edit associa. Errori generici senza valore/citazione/nome file:401sessione,403accesso/CSRF,422DTO,409conflitto/fonte superata;503errore inatteso. Gli errori rimangono quelli del filtro comune.

**Nessun endpoint stage o di testo fidato.** Il test prepara il record con metodo interno e PDF sintetico realmente decodificato. Un browser non può inviare pagine o candidati autoattestati. Mancano ancora coordinatore/provider atti, relativo consenso e budget durevole, UI associazione e montaggio nella pratica; non è un flusso completo documento→incarico.

## Verifiche

Nuovo profilo protetto test:agency-deed-http-db, incluso nell'aggregato DB. Guardie URL/marker/token prima del client; nuovo cluster dimora-offline-aQNB9u con vault sintetico al suo interno, conservato senza cancellazioni. Server Nest reale su porta casuale posseduta, sessioni vere e PostgreSQL nuovo; niente provider AI o servizi esistenti.

15/15 test (suite+14casi): sessione/context; GET e header reali; pratica vuota; CSRF/Origin; DTO e query; assenza endpoint stage; binding proposto e replay dopo conferma umana distinta; viewer; privacy record/file anche admin; isolamento pratica/agenzia; CAS/fingerprint e key non consumata; sostituzione; ritiro; grant revocato. Snapshot invariati nei dinieghi. Cluster fermato, stop-postgres.log verificato. Build e lint mirato verdi. Regressione ordinaria finale568/568 nel perimetro autorizzato; prima esecuzione sandbox562/568 per hard-link EPERM e listener posseduto impedito, senza modifica di assert o guardie. Log separati conservati.

Il primo tentativo nel sandbox ha terminato prima di initdb, senza cluster, con offline_runner_failed; ripetizione nel perimetro autorizzato ha completato il profilo. Nessuna guardia o timeout indeboliti. Nessuna migrazione/schema, spesa, file personale, demo Alessio, merge o deploy.
