# Spese a pagina unica — integrazione e attivazione del 27 ottobre 2026

## Autorizzazione e merge

Il committente approva la prosecuzione dopo la PR #68 e la schermata del candidato. Integrata [PR #68](https://github.com/Vincenzobrutto/Home_OS/pull/68) con merge, verificando la punta attesa `7cc3d05184a6e18e63557bf10615165649adb1f0` e il target `codex/dimora-v5-consolidata-20261023`.

Merge remoto: **68113f566a8b4fd76685398b6fcad8e522d00a42**, confermato da fetch e `git ls-remote`. Main resta **cdbb318ddb56e764ad4b111a71560e3e71c7a033**. Nessun push o merge sui branch Claude.

Lotto documentale separato `codex/rilascio-spese-pagina-unica-20261027`, registrazione `74728d5`; runtime in worktree dedicato e detached alla fonte approvata. Nessun checkout esistente ripulito, resettato o rimosso.

## Preparazione e verifica della fonte

- Albero frontend integrato **0b62ed790e8aae688197953a9c42a517359f629d**, identico alla fonte collaudata della PR #68. Sono riusabili gli esiti offline del [lotto](spese-pagina-unica-20261027.md): 1569/1569 mock, 19/19 nuovi, fixture 5/5, typecheck/lint/build e browser mock.
- Albero backend **38a44dfde979c11fac6dcde6edd3ee387c14d64b**, identico alla fonte API già in esecuzione `ccc8469dc260b8289b65a273663ae4fbb0285881`. Nessuna modifica backend, schema o migrazione.
- Package lock confrontato byte per byte con il candidato verificato. Nessuna installazione o dipendenza nuova; riutilizzate le dipendenze locali con junction.
- Frontend ricompilato dalla fonte del merge, con ambiente ripulito e guardie offline; build superata. Configurazione runtime esterna al repository, `envDir` vuota e `.env` invariati.

## Attivazione del solo frontend

Verificati listener, PID, comando e data di creazione prima di fermare il solo frontend precedente. API e PostgreSQL non sono stati fermati, riavviati o riconfigurati.

| Processo | Prima | Dopo | Esito |
| --- | --- | --- | --- |
| Frontend loopback5174 | PID16756, fonte e4e24b3 | PID14664, fonte68113f5 | Unico processo sostituito |
| API loopback3011 | PID30836 | PID30836, stessa creazione | Preservata |
| PostgreSQL loopback55432 | PID19804 | PID19804, stessa creazione | Preservato |

Le impronte delle guardie frontend/API sono invariate. Rimangono i blocchi di invii AI, email e accessi esterni; nessuna nuova chiamata AI o uso del budget residuo. La modalità resta interattiva manuale. Nessun documento, oggetto, spesa, stanza o contatto caricato, confermato o modificato dal rilascio.

L’aggiornamento registra soltanto i metadati locali del runtime. Non eseguito un audit SQL o degli originali: non si dichiarano conteggi o impronte DB riletti. Le evidenze di preservazione riguardano processi, guardie, assenza di migrazioni e richieste mutative/autenticate durante i controlli.

## Controlli dopo l’attivazione

**39/39 HTTP statici/anonimi superati**: pagina iniziale e moduli della nuova sezione, confronti, periodo, layout CSS, precedenti componenti bollette/titoli/rilettura, worker PDF e OCR. L’API tramite proxy risponde401 senza cookie e mantiene l’header `roma-consolidata-ccc8469-no-ai`.

Evidenze locali: `spese-unified-release-runtime-proof.json`, `spese-unified-release-runtime-http-proof.json`, identità prima/dopo e log build in `work/` del task. Nessun contenuto privato o credenziale aggiunto al repository. Non è una nuova verifica visiva autenticata sulla casa reale: quella resta al committente; le prove visive del candidato con dati sintetici sono nel report di sviluppo.

## Prova del committente

Aprire la pagina Spese della casa scelta e aggiornare la scheda del browser. Controllare periodo Anno/Mese/Intervallo, elenco affiancato al grafico, filtri e confronti; su mobile il riepilogo è compatto e l’analisi è espandibile dopo l’elenco. La navigazione e i filtri sono letture; per questa prima verifica non serve registrare nuove spese.

Gli aggregati mensili completi e la ricerca estesa rimangono nella roadmap: il frontend non ricostruisce totali da pagine parziali. Nessuna migrazione necessaria per questo rilascio.

La PR documentale di consegna è separata dal prodotto già integrato; il suo merge resta al committente.

Consegna documentale: [PR #69](https://github.com/Vincenzobrutto/Home_OS/pull/69), branch codex/rilascio-spese-pagina-unica-20261027; push verificato con git ls-remote. Nessun ulteriore merge o cambiamento del runtime da questa registrazione.
