# Integrazione caricamento frontend — 15 ottobre 2026

## Esito e perimetro

Consegna Claude raccolta dal checkout locale e integrata nel branch `dev/dimora-v5-local-20261013`:

- `3c250c3` → `7387335`: caricamento differito delle sezioni, gestione locale del fallimento dei chunk e test.
- `6c5dbf1` → `432d0f5`: rapporto e quattro screenshot.
- Escluso `cffd8da`, commit di allineamento già rappresentato nel master.

Revisione del delta: URL, albero delle route e guard restano invariati; Casa e autenticazione restano immediati. Le altre sezioni caricano i rispettivi moduli alla prima apertura. Il riepilogo economico condiviso è stato separato senza modificarne il contenuto, evitando che Casa importi l'intera pagina Spese. Nessuna nuova dipendenza o funzione di prodotto.

Il confine di errore intercetta il fallimento del caricamento della sezione, presenta un messaggio esplicito e propone il ricaricamento della stessa pagina. Non introduce retry automatici o logout e lascia propagare gli errori di rendering non pertinenti.

## Misure sul master

Build di produzione prima e dopo l'integrazione, stesso ambiente locale:

| Risorsa | Prima | Dopo | Riduzione |
| --- | ---: | ---: | ---: |
| Entry JavaScript, byte | 721140 | 485144 | 32,7% |
| Entry JavaScript gzip, byte | 205299 | 148155 | 27,8% |

Entry dopo: `index-Deo0ScZO.js`. Il maggiore chunk differito è `DocumentDraftPages`, circa 40,07 kB. Non compare più il warning Vite per chunk oltre 500 kB; nessuna soglia è stata aumentata e le source map sono conservate. La riduzione dell'entry sposta codice sulle sezioni: non equivale a una riduzione identica di tutto il JavaScript scaricato durante una visita completa.

## Verifiche e limiti

- Eseguiti sul master: build di produzione con TypeScript e lint, entrambi riusciti.
- Suite frontend completa eseguita una volta sul master: **316 test riusciti, 27 file**, durata 85,20 secondi; comprende routing, loader/errori e regressioni delle pagine esistenti. Log: `outputs/Dimora-V5-loading-integrazione-test.log` nel workspace esterno al repository.
- Revisionati codice del loader, gestione errori, import e albero delle route.
- Prove browser di Claude, distinte dalle verifiche eseguite qui: preview di produzione con API simulate; deep link e reload, query string, guard con destinazione di ritorno, caricamento/cache dei chunk e blocco intenzionale di un chunk seguito da ricaricamento esplicito. Evidenze in `frontend-v5/docs/FRONTEND-LOADING-CONSEGNA-20261015.md` e relativi screenshot.
- Non è stata ripetuta la navigazione browser in questa integrazione. Nessuna misura cronometrica di velocità o dichiarazione di conformità WCAG.

Nessun cambiamento a backend, database, migrazioni o `.env`; nessuna chiamata Anthropic o reset di contatori. Dirty estraneo preservato, nessun push e nessuna modifica a `main`. Non è necessario riavviare API o PostgreSQL per questo intervento.

Automazione monouso disattivata dopo la raccolta della consegna; nessuna lavorazione successiva pianificata da questo incarico.
