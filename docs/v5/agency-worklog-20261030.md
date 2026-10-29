# Dimora Agenzie — registro di lavoro, 30 ottobre 2026

## Incarico e base

Vincenzo autorizza lavoro autonomo fino alle09:00 Europe/Rome del30ottobre2026 sul fascicolo dell’agenzia. Demo Alessio invariata. Niente AI a pagamento, originali personali, servizi o dati esistenti. Un heartbeat locale riprende ogni30minuti fino alle08:00UTC; ogni esecuzione deve controllare l’orologio e questo registro.

Base remota consolidata verificata mediante fetch: `dd52a6af580dedf1641cb2308620c338f2184ae0` (PR69). Worktree isolato `work/dimora-agenzie-implementation`, branch `codex/agenzie-fascicolo-20261030`. Non modificare altri checkout. Main e Fase0 restano invariati. Il piano v0.1 in outputs della chat è una proposta, non codice integrato.

## Piano eseguibile e priorità

1. **Completato e verificato:** dominio puro Agency/Practice: membership/grant temporali, fonti private/condivise, ricezione progressiva, snapshot immutabili, classificazione e versioni, ledger idempotente e revisione ottimistica. Anche riepilogo filtrato e manifest export selettivo senza sottoinsiemi silenziosi.34test nuovi nell’aggregato335/335. Build e lint mirato verdi, nessuna API attiva.
2. **Da fare:** schema persistente additivo e adapter autorizzato, evitando riuso dei permessi Home; scelta esplicita di archiviazione delle fonti di agenzia. Contratto API, DB temporaneo se possibile, mai DB esistente.
3. **Da fare:** fatti proposti, prove pagina/estratto/SHA, decisioni separate, invalida fonti/bozze; nessuna analisi modifica i dati confermati.
4. **Da fare:** motore coerenza tipizzato nel prodotto; casi atto/visura/successione/pertinenze, anomalie e risoluzioni motivate.
5. **Da fare:** UI locale del fascicolo se il contratto backend è pronto; test errori/ripresa e viewport375. Non modificare UI/mockup esistenti.
6. **Da fare:** validazione input per futura bozza incarico, mapping e manifest fonti; modello reale ancora mancante, non fabbricare clausole.
7. **Alla fine:** report semplice in outputs; stato/ADR/modello/API aggiornati dove pertinenti, commit e push del solo branch; nessun merge o deploy.

## Stato verifiche

Prima suite mirata28/28, poi29/29 con replay del ritiro. ESLint mirato passato prima dell’aggiunta del manifest export; ripetere a fine lotto. Regressione ordinaria iniziale328/330: un test nuovo eseguito con build precedente durante la modifica (errore eliminato nella mirata29/29); un test preesistente di listener locale negato dal sandbox. Regressione completa avviata nuovamente con permessi per i soli listener di test, log `../agency-backend-regression.log` rispetto alla root del worktree. Non modificati assert o guardie.

Dipendenze: `backend-v5/node_modules` è junction verso le librerie già installate nel checkout storico. NON eseguire installazioni/aggiornamenti che ne cambino il contenuto condiviso. `backend-v5/generated` inizialmente collegato al vecchio client, poi sostituito con directory privata e client rigenerato dallo schema consolidato senza DB. L’errore iniziale di build sui campi cestino derivava dal vecchio client, non risolto modificando codice legacy. Nessun database o runtime attivato.

**Esito finale primo incremento:** build inclusa nel runner; regressione protetta335/335, zero saltati/todo,30.2secondi; lint mirato verde e git diff --check verde.34test nuovi,301preesistenti. Nessun collaudo DB/UI o HTTP del nuovo dominio. Non ripetere identica regressione senza cambiamenti. Prossimo task2: schema/adapter persistente isolato, poi task3fatti/revisione; se mancano binari DB proseguire task3puro e contratti senza dichiarare persistenza verificata.

## Vincolo aggiuntivo: pubblicazione remota

Il controllo automatico ha rifiutato `git push` perché l’autorizzazione allo sviluppo non autorizza esplicitamente il trasferimento del codice al repository remoto. Non ritentare push, creazione PR o workaround finché Vincenzo non autorizza esplicitamente GitHub/Vincenzobrutto/Home_OS. Il lavoro locale, i commit locali e i test continuano; questo vincolo prevale sul passaggio di push delle istruzioni repository. Nessun push eseguito. Il checkout isolato contiene già il commit di registrazione0f54126.

## Regole di ripresa

Prima di nuove modifiche: ora UTC, git status/log, istruzioni repository, tabella lotti. Conservare modifiche e risultati; aggiornare ogni voce con implementato/verificato/non verificato. Proseguire su test o contratto se l’input umano manca. Nessun messaggio ad altre chat senza autorizzazione.
