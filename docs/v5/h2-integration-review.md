# H2 — ricerca documenti: backend verificato, integrazione aperta

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
Attivazione nel processo API registrato 3001, nuova prova HTTP con V5_DOCUMENT_SEARCH_API=1; consegna/revisione/integrazione Claude, client/API e browser reali 320/390/desktop/tastiera. H2 non ancora chiusa, nessuna ricerca frontend reale dichiarata.

Launcher esterno supporta -Search come build/riavvio, senza npm ci/generate/migrazione; flag H2 client quando la suite è presente. Il processo utente resta fuori dai permessi della chat: richiesto al committente di cambiare la modalità di accesso per permettere il riavvio diretto, come da sua preferenza. Non creati proxy/endpoint di gestione per aggirare la sandbox.
