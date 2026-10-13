# H2 — ricerca documenti integrata e verificata in locale

14 ottobre 2026. Baseline contratto 534d6cf; branch dev/dimora-v5-local-20261013. Solo backend-v5/doc condivisi; Claude sviluppa frontend nel checkout distinto. Nessun main/push/schema/migrazione/DB legacy modificato.

## Implementazione
GET document-search-capabilities e lista documenti estesa q/format/visibility con pagina M2 invariata. DTO dedicato SearchDocumentsDto; rotte M3/M4 mantengono ListDocumentsDto. Ricerca nel DB, policy privata prima dei filtri/take, membership condivisa bloccata e riletta prima di proiettare. Titolo OR originalFilename, confronto letterale NFC/case-insensitive, MIME verificato, visibilità autorizzata; niente totali/facet o lettura originali per cercare.

Cursori nuovi con digest dei filtri, account/Home/risorsa, creato/id keyset; limite indipendente, <=512 caratteri senza query in chiaro. Vecchi cursori M2 ammessi solo senza filtri. Caratteri di controllo, chiavi query ripetute e parametri sconosciuti rifiutati; %/_/backslash/apostrofo letterali, SQL parametrizzato.

Verificati UTF8/NFC e collation ICU installata sul DB locale. Default locale C non gestiva CAFÉ/café; confronto esplicito und-x-icu risolve senza cambiare metadati/collation globale. Il primo test paginazione ha rilevato ripetizione dovuta a confronto timestamp/timestamptz in sessione Europe/Berlin; corretto usando parametro testuale timestamp senza fuso. Ora 25 documenti sono paginati senza duplicati e viene trovato un risultato fuori dalla prima pagina base.

## Prove eseguite
- Build TypeScript e lint passano; nessuna nuova dipendenza o generazione/migrazione Prisma.
- npm test: 73 test offline superati (71 baseline, 2 H2).
- npm run test:integration: 75 test superati (conteggio Node include contenitori), regressioni identity/documents/review/H1 incluse. H2 contiene otto scenari DB + contenitore e quattro HTTP + contenitore.
- H2 DB e HTTP sono reali: il harness Nest su porta effimera usa sessioni/controller/policy/PostgreSQL/upload/file/ZIP reali, senza worker AI. Non è ancora prova del processo utente su 3001 con il nuovo codice.
- Due account owner: private altrui invisibile; home esplicito leggibile, viewer senza upload/export, revoca dopo ricerca blocca anche file/capabilities. Match titolo/file, NFC legacy, case/accents, query SQL-like letterale, MIME fuorviante, cursor/paging e metadata/hash invariati passano.
- Nessuna chiamata provider/live AI. Fixture del test interrotto durante il difetto di paging rimosse soltanto per i due ID account osservati, verificati come non-login, e 34 metadati sintetici attesi; le nuove suite ripuliscono i propri record/file. Nessun reset.

Log: outputs/Dimora-V5-H2-backend-test.log e Dimora-V5-H2-backend-integrazione.log.

## Ancora aperto
Il 14 ottobre, dopo il cambio effettivo a Full access, il launcher -Restart ha identificato e riavviato soltanto l'API Dimora registrata (nuovo PID 8408), lasciando PostgreSQL attivo. La suite document-search.http.test.cjs con V5_DOCUMENT_SEARCH_API=1 ha verificato il servizio reale 3001: cinque test superati, zero fallimenti, nessuna analisi Anthropic. Autenticazione/context, capabilities, upload/ricerca/filtri, input 422 e query M3 rigorose, download/ZIP e revoca verificati sul processo aggiornato.

Frontend Claude 524d577 integrato in sei commit (escluso sync aa7268f). Build/lint e 180 test mock/fixture passano. Codex conserva i controlli ai margini prima del trim: 28 test H2 mirati passano dopo la correzione. Fixture PNG della suite client inizialmente rifiutata dal file-type reale: sostituita con PNG 1x1 completo senza indebolire il backend.

Client/API reali: identity/documents/review 9 pass; anthropic/activities 6 pass e quattro live saltati. H2 prima interrotta da PostgreSQL (503), cluster recuperato con -Resume; poi fixture PNG corretta e due test H2 passati. Totale 17 client/API non-live verdi, nessuna chiamata Anthropic. La prima esecuzione interrotta non è conteggiata come verde.

Browser con sessione e DB reali: ingresso da Casa a 390 porta focus al campo; Invio trova MULTIPAGINA; dettaglio/refresh/ritorno conservano ricerca; PNG produce zero risultati, Azzera restituisce archivio; cambio filtri azzera ZIP. 320 e desktop senza overflow. PDF/Solo io combinati funzionano. Screenshot outputs/Dimora-V5-H2-browser-reale.png. Paging, viewer/revoca e byte/ZIP sono verificati nelle suite DB/HTTP, non tutti ripetuti manualmente nel browser. Nessuna dichiarazione WCAG. H2 chiusa come incremento locale; produzione, OCR, spese e vendita restano successive.

Questioni Claude: testi Condivisi nella casa/Persone della casa equivalenti, uniformazione editoriale futura; valori URL sconosciuti valgono Tutti nel client ma API rigorosa; 403 capabilities coincide con membership; 422 mostra errore, comuni query invalide intercettate sul campo; PNG completo corretto; viewer verificato DB/HTTP senza nuova API ruoli. Avviso Vite 509.54 kB tracciato: valutare code splitting prima del pilota, non nascondere aumentando la soglia.

Launcher esterno supporta -Search come build/riavvio, senza npm ci/generate/migrazione; flag H2 client quando la suite è presente. Il cambio effettivo dei permessi consente ora il riavvio diretto dalla chat. Non creati proxy/endpoint di gestione per aggirare la sandbox.
