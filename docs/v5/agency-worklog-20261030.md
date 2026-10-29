# Dimora Agenzie — registro di lavoro, 30 ottobre 2026

## Incarico e base

Vincenzo autorizza lavoro autonomo fino alle09:00 Europe/Rome del30ottobre2026 sul fascicolo dell’agenzia. Demo Alessio invariata. Niente AI a pagamento, originali personali, servizi o dati esistenti. Un heartbeat locale riprende ogni30minuti fino alle08:00UTC; ogni esecuzione deve controllare l’orologio e questo registro.

Base remota consolidata verificata mediante fetch: `dd52a6af580dedf1641cb2308620c338f2184ae0` (PR69). Worktree isolato `work/dimora-agenzie-implementation`, branch `codex/agenzie-fascicolo-20261030`. Non modificare altri checkout. Main e Fase0 restano invariati. Il piano v0.1 in outputs della chat è una proposta, non codice integrato.

## Piano eseguibile e priorità

1. **In corso:** dominio puro Agency/Practice: membership/grant temporali, fonti private/condivise, ricezione progressiva, snapshot immutabili, classificazione e versioni, ledger idempotente e revisione ottimistica. Test offline, nessuna API attiva.
2. **Da fare:** schema persistente additivo e adapter autorizzato, evitando riuso dei permessi Home; scelta esplicita di archiviazione delle fonti di agenzia. Contratto API, DB temporaneo se possibile, mai DB esistente.
3. **Da fare:** fatti proposti, prove pagina/estratto/SHA, decisioni separate, invalida fonti/bozze; nessuna analisi modifica i dati confermati.
4. **Da fare:** motore coerenza tipizzato nel prodotto; casi atto/visura/successione/pertinenze, anomalie e risoluzioni motivate.
5. **Da fare:** UI locale del fascicolo se il contratto backend è pronto; test errori/ripresa e viewport375. Non modificare UI/mockup esistenti.
6. **Da fare:** validazione input per futura bozza incarico, mapping e manifest fonti; modello reale ancora mancante, non fabbricare clausole.
7. **Alla fine:** report semplice in outputs; stato/ADR/modello/API aggiornati dove pertinenti, commit e push del solo branch; nessun merge o deploy.

## Stato verifiche

Registrazione iniziale prima dell’implementazione. Nessun nuovo test eseguito a questo punto. Nessun database o runtime attivato.

## Regole di ripresa

Prima di nuove modifiche: ora UTC, git status/log, istruzioni repository, tabella lotti. Conservare modifiche e risultati; aggiornare ogni voce con implementato/verificato/non verificato. Proseguire su test o contratto se l’input umano manca. Nessun messaggio ad altre chat senza autorizzazione.
