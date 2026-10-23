# Oggetti e stanze: collaudo offline — 23 ottobre 2026

Lotto Codex `codex/oggetti-stanze-20261023`, worktree dedicato dalla punta remota del consolidamento `b0c9857` (PR #15 già integrata). Registrazione preventiva nel commit `9d638d1`, prima del codice. Nessuna modifica ai file dei lotti Cestino backend/frontend di Claude; esclusi documenti, schema, accessi DB, worker, conferme canoniche e provider.

## Problemi riprodotti e correzioni

1. La specificità degli alias era globale al nome: in «Caldaia e ferro da stiro a caldaia» il secondo apparato nascondeva la caldaia separata. Ora gli alias sono confrontati per intervallo della singola occorrenza. Un alias più preciso sopprime solo quello generico contenuto nella stessa occorrenza; due apparati distinti restano due possibili corrispondenze e l'editor richiede di separarli, senza scegliere automaticamente un tipo.
2. Un nome come «Corridoio della cucina», con tipo dichiarato `hall`, poteva essere proposto per un frigorifero perché conteneva «cucina». Ora il tipo dichiarato prevale sui riferimenti a stanze diverse nel nome. Per `other`/`utility` rimangono gli indizi lessicali; per tipi più ampi sono ammesse le sottocategorie nominate esplicitamente (giardino/balcone/terrazza/tetto/facciata dentro `outdoor`, vano scale dentro `hall`). Non basta un generico spazio esterno per dedurre un giardino.
3. Mancavano le varianti generiche «macchina da caffè» e «forno microonde». Aggiunte come alias nel vocabolario derivato, versione `apparatus-reference-v4-2`. Restano le 91 righe, identificativi, riferimenti e impronta del workbook originale V4: i due alias sono un'estensione locale del vocabolario, non nuovi dati estratti dal foglio. Nessun marchio, SKU, prezzo o regola per documenti del committente.

La prima riproduzione sui nuovi test produceva tre fallimenti di asserzione (specificità, stanza contraddittoria e variante caffè), con cinque test superati. Nessuna chiamata al modello o nuova estrazione dei documenti.

## Cosa resta invariato

- Il catalogo è un suggerimento, non una fonte documentale o una prova di possesso/ubicazione. Non compila marca, modello, seriale, attributi tecnici, garanzia o prezzi; un nome composto soltanto da marca/modello sconosciuti non riceve una classificazione per conoscenza presunta.
- L'utente usa esplicitamente il tipo suggerito; un tipo già scelto non viene sovrascritto e l'editor disabilitato non invoca il callback. Più apparati mantengono l'ambiguità e non ricevono un solo ambiente tipico.
- `typicalRooms` filtra solo le stanze attive già autorizzate fornite dal chiamante; non legge API/DB e non crea stanze. Gli impianti distribuiti non ricevono un ambiente singolo automatico.
- Il percorso di collocazione esistente mantiene scelta esplicita, «Salva stanza», versione attesa, gestione conflitti/revoche e nessuna richiesta di salvataggio all'apertura o alla scelta di un suggerimento. Nessun cambiamento a payload, endpoint o permessi.

## Matrice e verifiche

Sei nuovi gruppi coprono occorrenze indipendenti in ordine invertito e con separatori diversi; alias specifici senza duplicare l'apparato; tipi stanza contraddittori; nomi Unicode e marchi/modelli variabili; sottocategorie di ambienti; editor ambiguo/disabilitato senza scelta automatica. Restano le asserzioni preesistenti su 91 righe, fonti generiche, stanze archiviate, accessori/servizi esclusi, impianti distribuiti e conferma esplicita.

Implementato e verificato: **typecheck, lint completo e build frontend** superati; **mock completa finale 870/870, 105 file, 643,30 secondi**, due worker e retry massimo 1. Nessun fallimento residuo. La build finale comprende nuovamente il controllo TypeScript sul codice completo. Prima verifica mirata: 50/50 su `apparatusSuggestions.test.tsx`, `model.test.ts` e `routes/objects.test.tsx`; il codice finale comprende anche i casi aggiuntivi di compatibilità delle sottocategorie, coperti dalla suite completa finale. Nessuna asserzione o timeout preesistente modificati.

Configurazione temporanea fuori dal repository per la junction delle dipendenze: importa la configurazione di prodotto, usa cache/envDir nel work del task e ammette solo root frontend e directory del worker PDF già locale. Preload Node temporaneo nega fetch reale, connessioni TCP e TLS; i test usano i trasporti simulati. Nessun avvio di mock API esterna, API di prodotto o PostgreSQL. Queste guardie sono sui trasporti JS, non un firewall di sistema.

Comandi dalla cartella `frontend-v5`: `npm run typecheck`, `npm run lint`, build (`tsc -b` e Vite con configurazione temporanea) e `vitest run --config <override-locale> --project mock --maxWorkers=2 --retry=1`. I retry della suite sono espliciti; non autorizzano retry AI. Log nel work del task: `objects-rooms-before.log`, `objects-rooms-targeted.log`, `objects-rooms-typecheck.log`, `objects-rooms-lint.log`, `objects-rooms-mock-final.log` e `objects-rooms-build.log`.

## Limiti e consegna

Verifica di codice e UI simulata, senza browser reale, nuove risposte AI o misure di qualità dell'estrattore. Backend, suite HTTP/DB e ambiente caffè persistito non modificati né avviati; nessuna certificazione universale della classificazione o dell'ubicazione. Il gate qualità AI generale resta non promosso.

Nessuna AI/email, DB/API/storage reale, file personale/workbook originale, `.env`, migrazione o salvataggio automatico. Main e checkout legacy invariati; nessun reset/clean, force push o rimozione worktree. Report/stato/roadmap/changelog e PR verso il consolidamento; merge riservato al committente.
