# S1a/b — frontend operativo Spese con Panoramica: consegna

Claude Code, 14–15 ottobre 2026. Incarico `Dimora-V5-incarico-Claude-frontend-S1ab-dashboard.md`, chiuso secondo `Dimora-V5-followup-Claude-chiusura-S1ab.md`.

**S1 non è chiuso.** Restano:
- l'integrazione dei commit da parte di Codex;
- il collaudo su frontend, API e DB reali;
- la UI S1c.

## Commit

| Commit | Contenuto | Note per Codex |
|---|---|---|
| `0e56168e2b6dc1463212eb29ea614b5ca8b640d8` | Sincronizzazione: 10 file runtime allineati al master `ff6dd6b` (correzioni Codex su G1/H3a già presenti nel master) | **Non applicarlo alla cieca:** il contenuto esiste già nel master. Serve solo come base del mio lavoro |
| `c7f145be262bdf32afab50733429f745f3ea6f7a` | Implementazione S1a/b frontend: 23 file | Da integrare |
| commit successivo | Questo report e gli screenshot | Solo documentazione |

Prima dell'avvio: HEAD `30728a7`; stato pulito, salvo `docs/v5/backend-status.md`, non tracciato e mai toccato. Nessun push, merge o sync verso il master. Backend, DB, mockup standalone e contratti non sono stati modificati.

## Funzioni completate

- **Client economy-v1 tipizzato** (`src/api/economyTypes.ts`, metodi in `src/api/client.ts`).
  - Tipi copiati dal contratto normativo `3c6aa59`.
  - Stesso trasporto H3a: cookie, CSRF, `X-Account-Context`, `Idempotency-Key`, `no-store`.
  - Le risposte fuori contratto (somme non stringhe di centesimi, confronto non discriminato, link non validi) diventano errore di servizio, mai dati.
  - I JSON H3a sono invariati.
- **Capabilities autoritative.**
  - Se economy-v1 risponde 404, o lo storico non è attivo, resta la pagina H3a esistente, senza simulazioni.
  - Per `documentDrafts` true con solo provider simulati (`isSimulation`), «Da documento» dice che esiste solo una simulazione di prova su documenti sintetici, non usata da questa pagina, e apre il manuale.
  - Nessuna rotta S1c viene chiamata.
- **Spese unica** (`src/routes/SpesePage.tsx`):
  - famiglie come menu principale (Tutte + 7, etichette dalle capabilities);
  - Visualizza: Panoramica / Elenco / Per oggetto / Per lavoro / Riepilogo;
  - periodo esplicito: anno in corso, anni precedenti, intervallo di date;
  - filtri: categoria (con «Non classificata» distinta da «Altro»), oggetto, ambiente, lavoro, origine, stato (solo Elenco), ricerca.
- **Vista e indirizzo.**
  - Ordine di scelta della vista: indirizzo, poi filtri che puntano all'elenco, poi scelta conservata per account/Home (sessionStorage), infine Panoramica.
  - Nessun cambio automatico in base al numero di costi.
  - Nell'URL vanno solo codici, date e UUID. La ricerca resta nello stato di navigazione, legato all'account.
- **Panoramica.**
  - Totale (comprende i finanziamenti), seconda misura «senza mutuo e finanziamenti» e conteggio, dal summary server.
  - Anello e legenda da `byFamily`/`byCategory`: somme in BigInt, quote in decimi interi, proporzioni SVG calcolate solo dopo il calcolo intero.
  - Nota quando le percentuali arrotondate non sommano a 100%; famiglie vuote elencate a parte; con totale zero nessun anello.
  - Legenda fatta di pulsanti, quindi azionabile da tastiera. Apre l'Elenco filtrato con periodo e filtri conservati; «← Torna alla panoramica» li ripristina e riporta il focus al titolo.
  - Confronto con stato `unavailable` / `no_previous_records` / `comparable`, con avvertenza sul risparmio.
  - Ultime registrazioni dalla prima pagina della lista filtrata (limit 5), più «Vedi tutte le N».
- **Elenco** paginato keyset («Mostra altri costi»).
- **Per oggetto / Per lavoro:** il servizio non offre aggregati per gruppo, quindi si sceglie un oggetto o un lavoro e totale e righe arrivano da summary e lista filtrati. Niente totali calcolati sulla prima pagina, nessuna nuova rotta.
- **Riepilogo:** tabella per famiglia e categoria, con nota su «Riparazioni e lavori» (due famiglie possibili), più il confronto.
- **Manuale S1** (`src/economy/components.tsx`).
  - Essenziali: descrizione, importo e data di riferimento (parser centesimi H3a).
  - Facoltativi: categoria (raggruppata per famiglia, con aiuto sulla polizza del mutuo), oggetto, lavoro (solo attivi), documento.
  - Dettagli: fornitore, numero e data del documento, competenza (entrambi gli estremi o nessuno), scadenza.
  - Anteprima della famiglia, indicata come tale. In modifica si inviano solo i campi cambiati. Un oggetto già collegato si può solo mantenere o scollegare. I collegamenti «non più disponibili» non toccati vengono omessi.
- **Dettaglio costo S1** (`src/routes/EconomyExpensePage.tsx`): categoria, famiglia, origine dell'importo, oggetto, lavoro, documento, metadati, modifica con CAS, archivio/ripristino con nota, storia S1. Se S1 non è attivo resta il dettaglio H3a.
- **Lavori privati** (`src/routes/WorksPages.tsx`): elenco attivi/archiviati/tutti con ricerca, creazione, modifica, archivio/ripristino con CAS, storia, totale dal summary e righe paginate, «Registra una spesa per questo lavoro». Un lavoro archiviato conserva i costi e non è proposto per nuove assegnazioni.
- **Scheda oggetto.** Con S1 attivo, «Registra un costo per questo oggetto» apre il manuale con `objectRef` (una sola richiesta atomica) e al salvataggio torna alla scheda. C'è anche il link «Vedi i costi di questo oggetto in Spese». Senza S1 resta il flusso G1/H3a precedente. Schede, Documenti e Attività sono invariati.
- **Cache e privacy.**
  - Chiavi sotto `['account', id, 'home', id, 'economy', …]`, rimosse a logout e cambio account come le altre. Un 403 su capabilities, summary o lista rimuove i dati economici della casa e rilegge la casa.
  - Le mutazioni S1, H3a e G1 rileggono le proiezioni collegate, perché il registro spese è uno solo; restano escluse le capabilities (vedi «Correzioni»).
- **Mutazioni pessimistiche e idempotenti.** Con esito ignoto, «Esito non confermato» e «Riprova invio» con stessa chiave e stesso body. Un 409 di versione o di stato invita a rileggere.

## Correzioni emerse durante la chiusura

1. **Capabilities nelle invalidazioni.** Una mutazione H3a invalidava anche le capabilities economy-v1. Con S1 assente (404), la query in errore tornava «in attesa», smontava la pagina H3a e perdeva la navigazione al dettaglio: 9 test H3a fallivano. Le capabilities sono ora escluse dalle invalidazioni (`notCapabilities`) e rilette al focus solo se hanno dati.
2. **Ritorno alla panoramica.** Trovato **nel browser**, non dai test: entrando in Spese senza parametri, la panoramica di partenza era una stringa vuota e il pulsante «← Torna alla panoramica» non compariva. Corretto, con un test che parte dall'indirizzo senza parametri.
3. **Lint React Compiler** sul ref passato come prop e sugli offset dei settori calcolati durante il rendering: corretto.
4. **Messaggio «Da documento»** adeguato a `documentDrafts=true` con il solo provider fixture.

## Comandi e risultati (15 ottobre 2026, dopo l'ultima modifica)

Cartella `frontend-v5`:

| Comando | Esito |
|---|---|
| `npx tsc -b --noEmit` | exit 0 |
| `npx eslint .` | exit 0, nessun avviso |
| `npm test` (progetti `mock` e `fixtures`) | exit 0 — **24 file, 267 test passati** |
| `npm run build` | exit 0. Avviso Vite: bundle JS di 676,87 kB, oltre la soglia consigliata di 500 kB; resta un avviso, non un errore |

**Test nuovi** (backend simulato, dichiarati come tali):
- `src/lib/economy.test.ts` (9): somme stringa, BigInt oltre `Number.MAX_SAFE_INTEGER`, quote e arrotondamento, URL senza dati privati, query del contratto, confronto, competenza.
- `src/api/economyClient.test.ts` (3): header, forma delle risposte, risposta fuori contratto come errore, idempotenza, 409, cursore legato ai filtri.
- `src/routes/spese.test.tsx` (17):
  - aggregati oltre la prima pagina (26 costi, legenda dal summary);
  - legenda da tastiera con periodo conservato e ritorno;
  - ingresso senza parametri;
  - Categorie con «Altro» e «Non classificata» distinte;
  - confronto per stato e vuoto senza anello;
  - 503 senza totale zero;
  - privacy al logout e 403;
  - `documentDrafts` false e true con solo fixture, senza rotte S1c;
  - 404 con ripiego H3a;
  - viewer;
  - ricerca fuori dall'URL;
  - manuale con lavoro;
  - risposta persa e riprova con stessa chiave;
  - 409 con rilettura;
  - lavori e archivio;
  - scheda oggetto con `objectRef`.

Le suite H3a, G1 e le altre preesistenti restano verdi; il FakeBackend ha economy-v1 disattivo per default.

**Una flakiness in esecuzione completa:** l'ultimo test della scheda oggetto è fallito una volta sotto carico. La lista G1 della scheda viene riletta al montaggio e prima mostra la cache, per un tempo che sotto carico supera 1 s. Attesa portata a 5 s; esecuzione completa successiva verde.

**I test sono su un backend simulato (`src/test/fakeEconomy.ts`):** non sono prove del backend reale, di API/DB o della privacy server.

## Prova nel browser

- **Harness mio:** backend SIMULATO `scripts/mock-api.ts --seed --s1` su 127.0.0.1:3101 (nuovo flag `--s1`: dati sintetici S1, `documentDrafts` false) e Vite su 127.0.0.1:5175. Nessun server sulla porta condivisa 5174, nessun servizio del master toccato.
- **Configurazione di avvio:** `.claude/launch.json` è stato modificato temporaneamente per avviare l'harness e poi ripristinato con `git checkout`. Server fermati; porte 3101, 5175 e 9333 libere al termine.
- **Metodo:** il pannello browser integrato non disegnava le pagine (timeout di cattura, come nelle sessioni precedenti). Ho quindi guidato Chrome headless via DevTools Protocol con eventi `Input` reali: clic del mouse, digitazione, tasti per la data, viewport emulati.
  - **Eccezione dichiarata:** le due `<select>` del modulo (categoria e lavoro) sono state impostate via script, perché in headless il menu nativo non si apre.
  - Login con l'account di prova del seed del mock (`a@example.test`), solo dati sintetici.
- **Percorso eseguito ed esiti:**
  - Panoramica 1280 px: totale 2.287,20 € (dati H3a sintetici del seed più quelli S1), «senza finanziamenti» 1.717,20 €, 10 registrazioni. Legenda: Lavori e acquisti 1.120,00 € 49,0%, Mutuo e finanziamenti 570,00 € 24,9%, Altro/Non classificata 309,30 € 13,5%, Tasse e assicurazioni 180,00 € 7,9%, Bollette 107,90 € 4,7%.
  - Clic sulla prima voce della legenda: `?vista=elenco&famiglia=works_purchases`, 2 righe. «← Torna alla panoramica» riporta il focus su «Distribuzione».
  - 390 px e 320 px: `scrollWidth` uguale alla larghezza, nessuno scorrimento orizzontale.
  - Manuale «Rubinetteria doccia», 240,00 €, data 10/10/2026, categoria Riparazioni e lavori, lavoro Rifacimento bagno. L'anteprima diventa Lavori e acquisti; il dettaglio mostra famiglia Lavori e acquisti e il lavoro. La pagina del lavoro mostra 1.360,00 € e 3 registrazioni attive.
  - Errori in console: nessuno.
- **Screenshot** in `frontend-v5/docs/screenshots/s1ab-frontend-20261015/` (dati sintetici):
  - `01-panoramica-desktop-1280.png`
  - `02-elenco-da-legenda-desktop-1280.png`
  - `03-panoramica-mobile-390.png`: la cattura a pagina intera mostra la barra di navigazione fissa a metà immagine. È un effetto della cattura oltre il viewport, non della pagina.
  - `04-manuale-con-lavoro-desktop-1280.png`
  - `05-dettaglio-costo-desktop-1280.png`
  - `06-lavoro-desktop-1280.png`

## Limiti e problemi residui

- **Per oggetto / Per lavoro senza aggregati per gruppo.** Il contratto non ha un endpoint di totali per gruppo. Si mostrano totale e righe del gruppo scelto (summary e lista filtrati), non una classifica di tutti i gruppi. Se serve una vista d'insieme, è una decisione di contratto per Codex.
- **Casa e documento ancora su H3a.** In Casa, `SpeseSummary` resta il riepilogo H3a (totali manuale/documento); `LinkedExpenses` della pagina documento resta sulla lista H3a. Funzionano, ma non mostrano famiglie o categorie: da allineare in un incarico successivo.
- **Storia degli eventi legacy.** Nel simulatore la storia S1 contiene solo eventi S1; la proiezione dei vecchi eventi H3a è responsabilità del backend reale, non verificata qui.
- **Preferenza di vista** in sessionStorage per account/Home. Non è un dato privato, ma non sopravvive alla chiusura del browser.
- **Pagina del lavoro:** il periodo usato è dal 0001-01-01 a oggi (`from`/`to`). Va verificato sul backend reale che quell'intervallo sia accettato.
- **Contrasto:** non verificato per i colori chiari della legenda (azzurro chiaro, grigio). Il significato è sempre nel testo. Nessuna dichiarazione WCAG.
- **Bundle:** avviso Vite sulle dimensioni (sopra).
- **S1c escluso.** Nessuna UI per job, bozze, candidati o conferme; nessun risultato fixture mostrato come reale; analisi caldaia M3/M4 invariata. I tipi S1c sono presenti in `economyTypes.ts` solo come punto d'integrazione.

## File modificati (commit `c7f145b`)

**Nuovi:**
- `src/api/economyTypes.ts`
- `src/api/economyClient.test.ts`
- `src/lib/economy.ts`
- `src/lib/economy.test.ts`
- `src/economy/hooks.ts`
- `src/economy/components.tsx`
- `src/economy/economy.module.css`
- `src/routes/SpesePage.tsx`
- `src/routes/EconomyExpensePage.tsx`
- `src/routes/WorksPages.tsx`
- `src/routes/spese.test.tsx`
- `src/test/fakeEconomy.ts`

**Modificati:**
- `src/api/client.ts`: metodi economy-v1 e validatori.
- `src/api/queryKeys.ts`: chiavi economy.
- `src/expenses/hooks.ts`: invalidazione economy senza capabilities.
- `src/objects/hooks.ts`: idem.
- `src/objects/components.tsx`: costo S1 dalla scheda e link a Spese.
- `src/routes/ObjectsPages.tsx`: capabilities economy.
- `src/routes/ExpensesPage.tsx`: rinominata `LegacyExpensesPage`, usata come ripiego.
- `src/routes/routes.tsx`: Spese S1, lavori, dettaglio.
- `src/test/fakeBackend.ts`: economy simulato, disattivo per default.
- `src/test/fakeObjects.ts`: accessori per i collegamenti costo.
- `scripts/mock-api.ts`: flag `--s1`.

Tutti i percorsi sono relativi a `frontend-v5/`.
