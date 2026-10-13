# HANDOFF — H3a frontend Spese essenziali (expenses-v1)

Autore: Claude Code. Data: 14/10/2026. Destinatario: Codex (contratto, backend, DB, integrazione, collaudo reale).

**Stato: frontend H3a pronto per l'integrazione, verificato solo con backend simulato. H3a non è completata.** Il backend expenses-v1 non è attivo nel runtime e non ho eseguito alcuna prova API, DB o browser reale.

- Nessuna chiamata Anthropic e nessun test live.
- Nessuna lettura di `.env`, chiavi, ledger o configurazioni.
- Nessuna nuova dipendenza.

Il rapporto notturno precedente (`docs/H3-proposta-notturna-20261014.md`) è materiale storico: prevale `docs/v5/expenses-api-contract.md`.

## Checkout, sincronizzazione e commit

- **Checkout**: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude`, branch `claude/dimora-v5-identity`.
  - HEAD atteso e verificato: `cfdd0b324d656ffba48ba0c4808468cd841da0f5`.
  - Albero tracciato pulito; `docs/v5/backend-status.md` non tracciato preservato.
- **Bundle** `Dimora-V5-sync-Claude-spese.bundle`: `verify` ok, `unbundle` senza cambio di branch, SHA `076d5a9b95d99aafda457d768e4b68ebe8a06c8c`.
- **Ripristino** solo sui percorsi autorizzati:
  - `frontend-v5/`;
  - `docs/v5/{api,documents-api,review-api,anthropic-api,activities-api,document-search-api,expenses-api}-contract.md`;
  - `implementation-decisions.md`, `domain-model.md`, `h1-`, `h2-` e `m4-integration-review.md`;
  - `docs/v5/fixtures/m3/` e `docs/v5/fixtures/m4/`.
- **Verifiche dopo il sync**:
  - `git diff 076d5a9` su quei percorsi è vuoto;
  - byte dei PDF: 10/10 coincidono con i manifest, attributi binari intatti.
- Ho conservato le correzioni di Codex R1–R3 (`next` con solo il pathname, `documentsAccountId`, pulizia della cache dopo il 403 della casa).

| Commit | Contenuto | Azione per Codex |
|---|---|---|
| `cacc8fc` chore(v5): sync H2 reviewed and H3 expenses contract | Copia della baseline `076d5a9` | **Escludere / non riapplicare** |
| `19fc3ec` feat: client, chiavi cache, importi e hook expenses-v1 | Tipi, 8 metodi client, chiavi `h3`, `lib/expenses.ts`, hook | Integrare |
| `1e33ba2` test: backend simulato expenses-v1 | `src/test/fakeExpenses.ts` collegato a `FakeBackend` | Integrare |
| `5f93cbe` feat: Spese essenziali H3a e ingressi | Pagine Spese e dettaglio, Casa, documento, caldaia, shell; test di routing aggiornato | Integrare |
| `d80ddce` test: casi H3a | 21 UI + 6 unitari + 3 client | Integrare |
| `91d4727` test: integrazione reale, quarto gruppo, seed mock | `tests/integration/expenses.int.test.ts`, runner, `mock-api` | Integrare |
| `a5f1c7c` fix: focus | Focus al modulo aperto e alla nuova azione dopo archivia/ripristina/modifica | Integrare |
| commit successivo docs(frontend-v5) | README, questo HANDOFF, screenshot | Integrare. SHA: `git log -1 -- frontend-v5/HANDOFF.md` |

**Test precedente modificato apposta**: in `src/routes/routing.test.tsx` le righe che si aspettavano «Spese — Non ancora disponibile» ora si aspettano la sezione attiva («Le tue spese della casa»). È il cambiamento richiesto dall'incarico, non una regressione nascosta.

## Cosa è stato fatto

### 1. Client e cache

- **Trasporto**: 8 metodi sul percorso comune `send`, con cookie, CSRF sui POST, `X-Account-Context`, `Idempotency-Key`, `no-store` e AbortSignal.
  - Metodi: `getExpenseCapabilities`, `listExpenses`, `getExpense`, `createExpense`, `expenseMutation` (`updates`/`archive`/`restore`), `listExpenseHistory`, `getExpenseSummary`.
  - Solo GET e POST; una risposta fuori forma diventa errore di servizio.
- **Chiavi della cache**:
  - forma `['account', id, 'home', homeId, 'h3', …]`;
  - liste per `state`/`year`/`source`/`assetId`/`documentId`, dettaglio, storia, riepilogo per anno.
- **Invalidazione**: dopo successo o replay il dettaglio viene dalla risposta, poi viene riletto tutto il prefisso `h3`, compresi i costi collegati alla caldaia e al documento. Se l'account è cambiato nel frattempo, la cache non viene scritta.
- **403 su elenco, riepilogo o capabilities**: rimuove dalla cache `h3` le query non osservate e rilegge la casa (poi interviene la pulizia di Codex sul 403 della casa).

### 2. Importi e date (`src/lib/expenses.ts`)

- **Parsing con BigInt** sulle cifre scritte, mai float:
  - `1.234,56` → 123456, `1234,5` → 123450, `0,01` → 1;
  - rifiutati: zero, negativi, `+`, spazi interni, punto usato come decimale, raggruppamenti irregolari, più di due decimali, testo, oltre `amountMaxCents` delle capabilities (999 999 999).
- **Formattazione** intera: `1.234,56 €`. Il campo resta una stringa fino all'invio.
- **Date**: `spentOn` è obbligatoria, reale e non futura rispetto al `today` del server (Europe/Rome). Il campo data ha `max = today`. Formattazione in UTC come H1, senza spostamenti di giorno.

### 3. Spese (`/home/:id/spese`), con la sezione attiva nella shell

- «Le tue spese della casa» con nota personale.
- **Riepilogo annuo dal server**: «Inserite da te», «Collegate a un documento» e «Totale registrato», con i conteggi; solo spese attive. Nessuna somma è fatta sul client.
- **Filtri Anno / Stato / Origine** nell'URL (`anno`, `stato`, `origine`), validati. Mai importi, note o chiavi nell'URL.
- Paginazione «Mostra altre spese».
- **Stati distinti**:
  - verifica del servizio in corso;
  - 404 → «Spese non ancora attive» (nessun totale, nessun modulo);
  - 503 o errore → errore con «Riprova»;
  - vuoto globale;
  - anno o filtri senza voci, con il pulsante di ritorno;
  - errore dell'elenco, distinto dal vuoto.
- Il viewer consulta senza pulsanti di modifica.

### 4. Modulo (nuova spesa o modifica)

- **Campi**: titolo, importo, data, nota, documento e caldaia facoltativi.
- **Testo esplicito**: la spesa è un costo sostenuto, visibile solo a te; non è un pagamento, un incasso o una stima.
- **Destinazione** sempre visibile.
- **Selettori**:
  - mostrano solo documenti M2 e caldaie autorizzati, con «Carica altri …» finché ci sono pagine;
  - un ID arrivato dall'URL (`documentId`/`assetId`) viene verificato con una lettura autorizzata prima di mostrarne il nome; se non è leggibile compare un avviso e non viene inviato.
- **Modifica**:
  - invia solo i campi cambiati, più `expectedVersion`;
  - un collegamento non toccato viene omesso, `null` lo scollega (anche uno `unavailable`, senza mai riproporre ID nascosti);
  - nessun cambiamento → «Nessuna modifica da salvare», senza richiesta.
- **Operazione pessimistica** come H1:
  - doppio clic → un solo invio;
  - risposta persa → campi e «Annulla» bloccati, «Riprova invio» con stessa chiave e stesso payload;
  - 409 → «Rileggi i dati»;
  - nessun retry automatico.
- All'apertura il focus va al titolo del modulo.

### 5. Dettaglio (`/spese/:id`)

- Importo, data, origine, documento e caldaia (link se `linked`, testo redatto se `unavailable`), nota, date di registrazione e archiviazione.
- **Archivia e Ripristina** in dialogo (focus trap ed Escape del dialogo H1). La chiusura è bloccata durante l'invio o con esito incerto. La nota dell'operazione è distinta da quella persistente.
- Dopo l'operazione il focus va alla nuova azione.
- Una spesa archiviata non è modificabile finché non viene ripristinata.
- **Storia** con il prima/dopo per campo, collegamenti redatti anche nella storia.
- 403/422 senza contenuto.
- Il link «← Spese» ripristina i filtri solo se lo stato di navigazione appartiene allo stesso account.

### 6. Ingressi

- **Casa**: «Le tue spese del <anno>», con i totali del server e le ultime 3.
- **Dettaglio documento**: «Spese collegate» e «Registra una spesa da questo documento».
- **Scheda caldaia**: «Costi collegati», letti dalla stessa lista API con `assetId`, e «Registra un costo».
- Il costo è un solo record, richiamato in questi contesti e mai copiato.
- La storia tecnica della caldaia e i byte del documento non cambiano (verificato nei test).

### 7. Backend simulato (solo harness)

`FakeExpenses` copre:
- permessi personali (owner non vede spese altrui; viewer legge, non scrive);
- validazioni 422 (parametri sconosciuti o ripetuti, importo, data futura o inesistente, campi non ammessi);
- 403 sui riferimenti non leggibili;
- link `linked`/`unavailable` con origine `document` conservata;
- idempotenza (replay riproiettato con i diritti attuali, body diverso → 409);
- CAS con versione, no-op senza evento, archive/restore con stati 409;
- storia con before/after;
- cursor legati ai filtri ma non al limit;
- riepilogo esatto in centesimi.

Il seed `mock-api --seed` aggiunge 4 spese e la «Caldaia cucina». Il bundle di produzione non contiene il simulatore (verificato sul build).

## API usate (expenses-v1, nessun campo o endpoint inventato)

GET `expense-capabilities` · GET `expenses?state&year&source&assetId&documentId&limit&cursor` · POST `expenses` · GET `expenses/:id` · POST `expenses/:id/updates|archive|restore` · GET `expenses/:id/history?limit&cursor` · GET `expense-summary?year` (tutti sotto `/homes/:homeId`). Il client invia solo i filtri diversi dal default.

## Prove realmente eseguite (Node 24.20.0, in `frontend-v5/`)

| Comando | Esito |
|---|---|
| `npm run typecheck` / `npm run lint` | OK |
| `npm test` (mock + fixtures) | **213 superati**, 18 file |
| `npm run build` | OK. Il simulatore non è nel bundle. Avviso Vite: chunk JS 543,59 kB (Codex ne aveva tracciati 509,54 prima di H3a) |
| `npx vitest run --project integration` senza flag | 23 saltati (7 file) |
| `V5_EXPENSES_API=1` contro il **mock su 3101** | 2/2: verifica solo il codice dei test, **non è integrazione reale** |

**Composizione dei 213:**
- 183 di baseline: i 180 indicati da Codex più 3 sue regressioni. Ne ho modificato uno solo, in `routing.test.tsx`, come spiegato sopra.
- 6 unitari (`src/lib/expenses.test.ts`): importi validi e invalidi, 0,10 + 0,20 = 30 centesimi, formattazione, date, filtri URL, ritorno legato all'account.
- 3 client (`src/api/expensesClient.test.ts`): parametri, idempotenza e conflitto, cursor di altri filtri → 422, riepilogo active.
- 21 UI (`src/routes/expenses.test.tsx`).

**Criteri del contratto nelle prove mock:**
1. Importi esatti e rifiuti; 0,10 + 0,20 = 0,30 € in Spese e in Casa.
2. Date: bisestile, 0001/9999 e futura nei test unitari; futura e inesistente nella UI. jsdom, come i browser, svuota il valore del campo data quando la data non esiste.
3. Creazione, risposta persa con riprova (stessa chiave e payload, un record, un evento), doppio clic, conflitto 409, no-op.
4. Archive/restore con storia e totali; hash del documento e versione della caldaia invariati.
5. Owner non vede né conta le spese del member; viewer in sola lettura; ID altrui 403; revoca → 403 senza dati in pagina o in cache; cambio account e casa azzerano le bozze.
6. Riferimenti dall'URL non autorizzati non inviati; documento `unavailable` redatto anche nella storia; costo della caldaia contato una volta.
7. Paginazione 20 + 5 senza duplicati e selettore documenti oltre la prima pagina. I cursor rifiutati con altri filtri sono provati nei test client e nella suite reale.
8. Vuoto, anno vuoto, errore e capabilities 404/503 distinti, senza totali inventati.
9. Regressioni M1–M4, H1 e H2 verdi; nessuna AI.
10. Nessun pulsante «pagata», «incassata» o «Ho pagato».

**Suite reale** (`tests/integration/expenses.int.test.ts`):
- Si esegue solo con `V5_API_URL` + `V5_EXPENSES_API=1`, nel quarto gruppo del runner dopo 61 s, con `--maxWorkers=1` e `V5_ANTHROPIC_LIVE=0`; tre registrazioni in tutto. **Non l'ho eseguita contro 3001.**
- Copre:
  - capabilities;
  - riepilogo vuoto;
  - 422 per zero, oltre soglia, frazione di centesimo, data futura o inesistente, valuta;
  - replay e conflitto di idempotenza;
  - collegamento a documento e caldaia;
  - lista per `assetId`;
  - hash del documento;
  - no-op, CAS e 409;
  - archive/restore e 409 di stato;
  - storia;
  - totali esatti;
  - paginazione e cursor;
  - privacy tra account (403) e 422 per ID non valido.

**Browser (mock 3101 con `--seed`, Vite 5175):**
- Riepilogo a 390 px: 225,00 + 84,30 = 309,30 €.
- Creazione **da tastiera** (focus al titolo del modulo, Invio per inviare, focus al titolo del dettaglio, URL pulito); l'importo «0,10» entra nei totali (225,10 €).
- Dialogo «Archivia» a 320 px: focus sulla nota, Escape con focus restituito, Tab che resta nel dialogo, conferma, storia con la nota; dopo il ripristino il focus va su «Modifica».
- Elenco desktop.
- Dal documento: precompilazione verificata, data futura rifiutata sul campo, spesa da 1.234,50 € collegata.
- Costi della caldaia a 390 px.
- Casa a 390 px con totale 1.543,90 €.
- Viewer: nessun pulsante, totali a zero, spesa di Giulia → 403.
- Nessuno scroll orizzontale a 320 e 390 px.
- Non provati nel browser: riprova dopo risposta persa e 503, perché il mock non li espone dal browser; sono coperti nei test jsdom.

**Due difetti trovati nel browser e corretti** (`a5f1c7c`): il pulsante che apre il modulo spariva e il focus finiva sul body; dopo archivia/ripristina il dettaglio si rimonta per la nuova versione e il focus si perdeva.

**Processi:**
- Avevo lasciato un mio Vite H2 orfano sulla 5175 (PID 16768, avviato alle 00:32 dal mio checkout): l'ho verificato e fermato.
- A fine lavoro i miei 3101 e 5175 sono fermi; nessun processo `node` del mio checkout resta attivo.
- 3001, 5174, 55432 e 5173 non sono stati toccati.

## Screenshot (`docs/screenshots/`, backend simulato)

- `25-mock-h3-spese-riepilogo-390`
- `26-mock-h3-dialogo-archivia-320`
- `27-mock-h3-elenco-desktop`
- `28-mock-h3-modulo-data-futura-desktop`
- `29-mock-h3-costi-caldaia-390`
- `30-mock-h3-casa-spese-390`

Nessuna dichiarazione di conformità WCAG.

## Domande e note per Codex

1. **Anni nel filtro**: «Tutti gli anni» più gli ultimi 10 anni a partire dal `today` del server; un anno più vecchio funziona solo dall'URL. Serve un elenco degli anni con voci? Il contratto non lo prevede e non l'ho inventato.
2. **Riepilogo con «Tutti gli anni»**: mostra l'anno corrente del server (default del contratto), non un totale pluriennale. Confermare.
3. **503 sui POST** trattato come esito ambiguo (riprova con la stessa chiave). Va bene anche per un 503 con busta `SERVICE_UNAVAILABLE` emesso prima della transazione?
4. **Selettore documenti**: elenca i documenti M2 leggibili, compresi quelli «Persone della casa» caricati da altri membri. Il contratto dice «documento M2 leggibile»: confermare che collegarli sia ammesso.
5. **Filtro `assetId`/`documentId` su un riferimento non più leggibile**: la UI lo usa solo dalle pagine della caldaia o del documento già autorizzate; un 403 lì viene mostrato come errore della sezione «Costi collegati».
6. **Inviti e ruoli**: il frontend non ha un'API V5 per gli inviti, quindi owner, member, viewer e revoca nella stessa casa vanno provati da Codex in DB/HTTP; nel mock sono coperti.
7. **Osservazione su H1 (non modificato)**: `ActivityDetailPage` probabilmente perde il focus dopo completa/annulla/riapri per lo stesso motivo corretto qui (vista con chiave di versione, pulsante d'origine smontato, callback di `mutate` non eseguite dopo lo smontaggio). Da verificare con Codex prima di toccare H1.
8. **Bundle**: 543,59 kB. Il code splitting per rotta (Spese, Attività/M4, Documenti) è consigliato prima del pilota.

## Limiti

- Solo prove mock. H3a si chiude dopo backend, API, DB e browser reali di Codex.
- Export delle spese prima della vendita (CV-01) e rate condominiali dell'amministratore restano futuri, come da contratto; H3b (ricorrenze, stime, proiezioni) non è iniziata.
- Gli screenshot desktop sono limitati dal pannello del browser integrato (800 px).

## Note per i documenti condivisi (le aggiorna Codex)

- **changelog**: frontend H3a. Spese personali con totali annui dal server, modulo con importi in centesimi interi, archivia/ripristina con storia, ingressi da Casa, documento e caldaia. Solo prove mock.
- **decisions**:
  - importi come stringa nel campo, convertiti in centesimi con BigInt e formattati con aritmetica intera;
  - nessun totale calcolato sul client;
  - riferimenti dall'URL verificati con una lettura autorizzata prima di mostrarne il nome;
  - focus spostato per cambio di versione e non tramite le callback di `mutate`.
- **backlog**: domande 1–8, code splitting, e2e browser reale H3a.
- **roadmap**: frontend H3a pronto per integrazione; H3a si chiude dopo integrazione e verifica reale di Codex.
