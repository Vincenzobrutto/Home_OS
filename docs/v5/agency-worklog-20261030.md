# Dimora Agenzie — registro di lavoro, 30 ottobre 2026

## Incarico e base

Vincenzo autorizza lavoro autonomo fino alle09:00 Europe/Rome del30ottobre2026 sul fascicolo dell’agenzia. Demo Alessio invariata. Niente AI a pagamento, originali personali, servizi o dati esistenti. Un heartbeat locale riprende ogni30minuti fino alle08:00UTC; ogni esecuzione deve controllare l’orologio e questo registro.

Base remota consolidata verificata mediante fetch: `dd52a6af580dedf1641cb2308620c338f2184ae0` (PR69). Worktree isolato `work/dimora-agenzie-implementation`, branch `codex/agenzie-fascicolo-20261030`. Non modificare altri checkout. Main e Fase0 restano invariati. Il piano v0.1 in outputs della chat è una proposta, non codice integrato.

## Piano eseguibile e priorità

1. **Completato e verificato:** dominio puro Agency/Practice: membership/grant temporali, fonti private/condivise, ricezione progressiva, snapshot immutabili, classificazione e versioni, ledger idempotente e revisione ottimistica. Anche riepilogo filtrato e manifest export selettivo senza sottoinsiemi silenziosi.34test nuovi nell’aggregato335/335. Build e lint mirato verdi, nessuna API attiva.
2. **Completato e verificato per i metadati:** schema additivo Agency/AgencyMember/AgencyPractice/AgencyPracticeGrant/AgencyCreateRequest e store interno con lock/revisioni/replay.11/11 test PostgreSQL sintetici, compreso admin su fonte privata, cluster temporaneo fermato; regressione335/335 e lint mirato verdi. Non esistono ancora controller HTTP, file upload o storage di bytes dell’agenzia. L’aggregato persistito conserva metadati e snapshot, non file.
3. **Da fare:** fatti proposti, prove pagina/estratto/SHA, decisioni separate, invalida fonti/bozze; nessuna analisi modifica i dati confermati.
4. **Da fare:** motore coerenza tipizzato nel prodotto; casi atto/visura/successione/pertinenze, anomalie e risoluzioni motivate.
5. **Da fare:** UI locale del fascicolo se il contratto backend è pronto; test errori/ripresa e viewport375. Non modificare UI/mockup esistenti.
6. **Da fare:** validazione input per futura bozza incarico, mapping e manifest fonti; modello reale ancora mancante, non fabbricare clausole.
6a. **Nuovo steering di Vincenzo:** calcolo superficie tramite ricalco sulla planimetria reale in trasparenza. Legacy individuato in FloorPlan.tsx/geometry.ts; calibrazione e m² non risultano già presenti. Dopo fatti/revisione aggiungere motore offline di calibrazione da quota nota, seconda quota di controllo, poligoni e area; separare netto ricalcato da commerciale. Specifica in agency-plan-measurement-proposal-v1.md. UI V5 isolata solo dopo motore e accessi; niente modifica demo Alessio o servizi legacy.
6b. **Due prove reali concluse su autorizzazione specifica:** dopo il rifiuto iniziale, Vincenzo ha autorizzato esplicitamente Anthropic/Claude per il PDF allegato e tetto aggiuntivo complessivo4EUR. Due invii riusciti,nessunretry. Ledger privato in `work/planimetria-prova/budget-ledger.json`: costo calcolato dai token0.07282USD, riserva prudenziale1EUR su4EUR; non è conversione valutaria. Non riutilizzare questo budget per altri documenti o campagne. Documento, immagini, geometrie reali e ledger restano fuori Git e fuori dalla demo. Anteprima privata autonoma in outputs/Dimora-prova-planimetria.html: confronto prove, vertici trascinabili, nuovo vano e ripristino verificati da browser. Prima AI: scala errata e sovrapposizioni; seconda: calibrazione locale fornita e dettaglio ingrandito,nessuna sovrapposizione evidente nel controllo semplice,ma allineamento di alcuni contorni ancora errato e tutte le geometrie a bassa certezza. Nessuna metratura validata. Proseguire sul motore con sole fixture sintetiche; non inviare altri dati reali automaticamente.
7. **Alla fine:** report semplice in outputs; stato/ADR/modello/API aggiornati dove pertinenti, commit e push del solo branch; nessun merge o deploy.

## Stato verifiche

Prima suite mirata28/28, poi29/29 con replay del ritiro. ESLint mirato passato prima dell’aggiunta del manifest export; ripetere a fine lotto. Regressione ordinaria iniziale328/330: un test nuovo eseguito con build precedente durante la modifica (errore eliminato nella mirata29/29); un test preesistente di listener locale negato dal sandbox. Regressione completa avviata nuovamente con permessi per i soli listener di test, log `../agency-backend-regression.log` rispetto alla root del worktree. Non modificati assert o guardie.

Dipendenze: `backend-v5/node_modules` è junction verso le librerie già installate nel checkout storico. NON eseguire installazioni/aggiornamenti che ne cambino il contenuto condiviso. `backend-v5/generated` inizialmente collegato al vecchio client, poi sostituito con directory privata e client rigenerato dallo schema consolidato senza DB. L’errore iniziale di build sui campi cestino derivava dal vecchio client, non risolto modificando codice legacy. Nessun database o runtime attivato.

**Esito finale primo incremento:** build inclusa nel runner; regressione protetta335/335, zero saltati/todo,30.2secondi; lint mirato verde e git diff --check verde.34test nuovi,301preesistenti. Nessun collaudo DB/UI o HTTP del nuovo dominio. Non ripetere identica regressione senza cambiamenti. Prossimo task2: schema/adapter persistente isolato, poi task3fatti/revisione; se mancano binari DB proseguire task3puro e contratti senza dichiarare persistenza verificata.

## Pubblicazione remota autorizzata

Il primo tentativo di `git push` era stato rifiutato dal controllo automatico per assenza di autorizzazione esplicita al trasferimento remoto. Vincenzo ha ora risposto in questa chat «Sì ti autorizzo» alla richiesta di pubblicare il branch su GitHub/Vincenzobrutto/Home_OS. La pubblicazione del solo branch dedicato è quindi autorizzata, senza merge o deploy. Il commit iniziale è0f54126; il primo incremento verificato èe011377. Registrare hash e verifica remota dopo il push. Questa autorizzazione sostituisce il precedente divieto di ritentare il push.

## Regole di ripresa

### Ripresa00:30 — persistenza del fascicolo

Trovati binari PostgreSQL già presenti: `C:/Users/07704017/Documents/Codex/2026-10-13/referenced-chatgpt-conversation-this-is-an/work/postgresql/pgsql/bin`. Usare solo runner protetto con nuova scratch sotto `work/agency-db-tests`, porta55439/API3119. Primo run `dimora-offline-5seYDi`: build/initdb/migrations/tests verdi,11/11, cluster fermato e log conservati. Si tratta di PostgreSQL effettivo su fixture sintetiche, non del DB prodotto. Store non registrato in AppModule e nessun endpoint nuovo: la sessione/CSRF HTTP rimane task futuro.

Nuovo profilo `test:agency-practices-db` aggiunto anche all’aggregato DB; migrazione e test nuovi devono essere git add prima del runner perché copia soltanto file tracciati. `generated` è privato del checkout ed è stato rigenerato senza DB. Il modello dati e ADR sono aggiornati. Il prossimo task è3fatti proposti/revisione; prima dell’API di caricamento serve anche storage controllato di bytes, non accettare fingerprint autoattestati dal client.

**Chiusura ripresa00:30:** run finale `dimora-offline-GZLpvv`11/11, comprese prove admin su fonte privata; cluster fermato secondo stop-postgres.log. Regressione ordinaria335/335 (32.2s), build inclusa; lint store/test verde. Prima invocazione lint dalla root non trovava config, corretta usando backend-v5 senza modificare le regole. Una invocazione git add con path dalla sottocartella è fallita, poi corretta dalla root; il runner copia contenuto corrente dei file già registrati. Contratto HTTP soltanto proposto in agency-api-proposal-v1.md; nessuna route attiva. Prossimo incremento:3fatti/prove/conferma, usando lo snapshot persistente esistente e conservando compatibilità dei record.

Prima di nuove modifiche: ora UTC, git status/log, istruzioni repository, tabella lotti. Conservare modifiche e risultati; aggiornare ogni voce con implementato/verificato/non verificato. Proseguire su test o contratto se l’input umano manca. Nessun messaggio ad altre chat senza autorizzazione.
