# H1 — attività personali: backend verificato, integrazione frontend aperta

13 ottobre 2026. Baseline 9f34ca2 (M4 da8b197); branch dev/dimora-v5-local-20261013. Nessuna modifica a main/push/database legacy. Claude lavora nel checkout distinto; i suoi commit non ancora integrati.

## Backend e runtime
Dieci endpoint activities-v1 in backend-v5/src/activities; migrazione additiva 202610130005_activities applicata al solo dimora_v5_product_dev, 127.0.0.1:55432. Servizio registrato 3001 riavviato dal committente e verificato via HTTP reale. Nessuna nuova dipendenza.

HomeActivity personale al creatore con membership valida. Caldaia facoltativa autorizzata da policy M3/fonti; perdita accesso redige ID/nome ma conserva il promemoria, anche nella storia. Azioni esplicite e idempotenti, versione e storia atomiche. Completa/annulla/riapri non alterano caldaia/proposte/documenti/ledger. Date gregoriane 0001–9999, giorno calcolato dal server in Europe/Rome, clock controllabile nei test. Viewer legge i propri record ma non scrive; owner non supera la privacy altrui. Nessuna scrittura offline o chiamata AI.

## Prove eseguite
- Build TypeScript e lint backend: passano.
- npm test: 71/71 offline, inclusi quattro test H1 su calendario/ora legale/NFC/input/query.
- npm run test:integration: 61/61 (conteggio Node include i contenitori). M1/M2/M3 sul runtime registrato; H1 dieci scenari diretti PostgreSQL e quattro scenari HTTP nel harness Nest reale, senza worker AI.
- V5_ACTIVITIES_API=1, activities.http.test.cjs: 5/5 (quattro scenari più contenitore) sul servizio riavviato 3001. Sessione, cookie, CSRF, Account-Context, no-store, input 422, ciclo completo, storia e privacy reali.
- Doppia creazione concorrente produce un solo record/evento; due aggiornamenti con stessa versione danno un solo vincitore. Retry riproduce snapshot senza duplicare storia, rilegge diritti e riferimenti; no-op non cambia versione.
- Record dei nuovi harness rimossi soltanto per gli ID creati da ciascuna prova. Le regressioni precedenti conservano dati sintetici come già documentato.
- Zero chiamate Anthropic in questa sessione; H1 non ripristina la campagna o il limite M4.

Log esterni: outputs/Dimora-V5-H1-backend-test.log, Dimora-V5-H1-integrazione-backend.log, Dimora-V5-H1-http-runtime.log.

## Aperto prima di dichiarare H1 finita
Consegna finale Claude, revisione/cherry-pick dei soli commit frontend H1 (escludere sync), build/lint/test frontend, client contro API 3001 e navigazione browser reale 320/390/desktop/tastiera. Screenshot e comportamento dopo reload/login ancora da produrre; nessuna dichiarazione WCAG. Le 18 prove del contratto sono i criteri complessivi, non tutte già dimostrate dall'UI.

Limite dell'implementazione locale da affrontare prima del pilota: lista/summary/storia leggono e ordinano i record personali autorizzati prima di paginare; ottimizzare con query aggregate/keyset quando il dataset cresce, mantenendo filtri, ordinamento e redazione. Nessuna promessa di prestazioni su grandi portafogli.
