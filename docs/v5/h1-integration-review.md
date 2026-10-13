# H1 — attività personali e scadenze: integrata e verificata in locale

Consolidamento 14 ottobre 2026, lavoro iniziato il 13. Baseline 9f34ca2 (M4 da8b197); backend 162f18e; branch dev/dimora-v5-local-20261013. Nessuna modifica a main/push/database legacy. Integrati sette commit frontend Claude 9370037…83d4e83, tramite bundle e cherry-pick; escluso c29fcaa (sincronizzazione). Commit locali risultanti e117d57, 16f9e22, 2929785, 9548ec0, ef432c1, e406333, aef3ec0. File non correlati già modificati preservati.

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
- Frontend: build/lint passano, 152/152 test mock/fixture. Comprendono 126 regressioni M1–M4, 25 prove Claude H1 e una nuova regressione sul dialogo/idempotenza.
- Client/API reale: 15/15 (9 nel primo gruppo, 6 nel secondo), quattro test live Anthropic saltati. Primo tentativo complessivo aveva superato il limite auth; singola identity passa isolata e il runner corretto passa completo, senza modificare la protezione del servizio.
- Browser reale su 5174/3001/DB: creazione dalla caldaia, descrizione, modifica data, completa con nota, filtro completate, reload, riapertura con data passata/scaduta, annullamento con nota, seconda riapertura. Seconda attività manuale senza data o caldaia. Logout/login conserva entrambe e il riepilogo (una scaduta, una senza data, zero verifiche AI aperte).
- Tastiera reale: Invio nelle conferme, Shift+Tab/Tab contenuti nel dialogo, Escape chiude e riporta il focus. A 320/390/default desktop: screenshot e larghezze documento non superiori alla viewport; nessuna dichiarazione WCAG.
- Il campo data Chromium è stato verificato con eventi reali ArrowUp/ArrowDown prima del salvataggio: la sola fill dell'automazione aveva cambiato il valore DOM senza aggiornare React. Non classificato come difetto del prodotto.
- Verifica finale DB: attività collegata open, versione 6, sei eventi; dueDate 2026-10-12, timestamp di chiusura null. Caldaia resta versione 4, potenze 30/34 kW e fonti M4. Costo globale registrato invariato a 0.041714 USD.

Log esterni: outputs/Dimora-V5-H1-backend-test.log, Dimora-V5-H1-integrazione-backend.log, Dimora-V5-H1-http-runtime.log, Dimora-V5-H1-frontend-test-finale.log, Dimora-V5-H1-client-api-finale.log e Dimora-V5-H1-frontend-build-finale.log. Screenshot reali H1-dialogo-320, H1-dettaglio-320, H1-casa-390, H1-casa-desktop e H1-scadenze-desktop negli outputs (prefisso Dimora-V5-). Le immagini Claude sotto frontend-v5/docs/screenshots rimangono esplicitamente mock.

## Risposte alle domande Claude
1. Mezzanotte senza focus: rilettura al focus/navigazione sufficiente in H1, come contratto; nessun timer richiesto.
2. 404 JSON con NOT_FOUND e 503 SERVICE_UNAVAILABLE sono ammessi; client distingue servizio indisponibile e attività assente, senza fallback demo.
3. Descrizione vuota e null equivalenti, confermato dal normalizzatore e test.
4. Redazione dinamica della storia, nessun evento aggiunto per la sola perdita di accesso.
5. asOf metadata; today visibile, nessun dettaglio tecnico aggiunto al prodotto.
6. Viewer riceve soltanto read anche sulle attività, verificato nel DB.
7. Elenco dei promemoria nella scheda caldaia rinviato, fuori UX H1 fissata; creazione collegata funziona.
8. Date validate anche sul server; fieldErrors facoltativi, 422 validation_error disponibile anche senza dettagli per campo.

## Correzioni di integrazione
Focus trap nel dialogo e protezione della chiave in caso ambiguo; nuova prova mock di risposta persa e retry singolo. Test client divisi per rispettare auth e separare live; launcher usa il runner senza duplicare pause, flag H1 aggiunto, sintassi PowerShell verificata (zero errori). Aggiornati i testi Casa/Attività per includere i promemoria. Nessun nuovo riavvio backend necessario: le correzioni finali sono frontend/test/docs.

## Confini residui
H1 chiusa per sviluppo locale, non per esposizione pubblica. Nessuna normativa, ricorrenza, allegato al completamento, notifica, attività condivisa o condominiale. Browser ha verificato il flusso felice e tastiera/responsive/persistenza; perdita di rete, conflitti, permessi e redazione sono coperti dai mock UI e dalle prove DB/HTTP, non tutti da guasti riprodotti manualmente nel browser.

Limite dell'implementazione locale da affrontare prima del pilota: lista/summary/storia leggono e ordinano i record personali autorizzati prima di paginare; ottimizzare con query aggregate/keyset quando il dataset cresce, mantenendo filtri, ordinamento e redazione. Nessuna promessa di prestazioni su grandi portafogli.
Il bundle frontend supera di poco la soglia Vite di 500 kB (501.70 kB, gzip 151.75): build riuscita, suddivisione per route da affrontare prima del pilota. Nessuna modifica ai limiti per nascondere l'avviso.
