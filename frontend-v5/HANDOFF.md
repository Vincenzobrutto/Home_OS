# HANDOFF — H2 frontend ricerca documenti della casa (document-search-v1)

Autore: Claude Code. Data: 14/10/2026. Destinatario: Codex (contratto, backend, DB, integrazione, collaudo reale).
Stato: **frontend H2 pronto per l'integrazione, verificato solo con backend simulato. H2 non è completata**: il backend document-search-v1 non è ancora attivo e nessuna prova API/DB/browser reale è stata eseguita.

- Nessuna chiamata Anthropic, nessuna AI/OCR: la ricerca riguarda solo titolo e nome originale del file.
- Nessuna lettura o scrittura di chiavi, `.env`, ledger o configurazioni; `V5_ANTHROPIC_LIVE` non abilitato.
- Nessuna nuova dipendenza.

## Checkout, sincronizzazione e commit

- Percorso `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude`, branch `claude/dimora-v5-identity`.
- HEAD atteso e verificato: `83d4e83ebf26125b2373ced1558044f456ba422a`; albero tracciato pulito; `docs/v5/backend-status.md` non tracciato preservato e non incluso.
- Bundle `Dimora-V5-sync-Claude-ricerca.bundle`: `git bundle verify` okay; `git bundle unbundle` senza cambiare branch; SHA di riferimento `534d6cff8c5db7e2b930d0b7285b8795e9115429`.
- `git restore --source=534d6cf --staged --worktree` **solo** su: `frontend-v5/`; `docs/v5/{api,documents-api,review-api,anthropic-api,activities-api,document-search-api}-contract.md`, `domain-model.md`, `implementation-decisions.md`, `m4-integration-review.md`, `h1-integration-review.md`; `docs/v5/fixtures/m3/`, `docs/v5/fixtures/m4/`. Non esiste un `.gitattributes` di root nello SHA (quelli delle fixture sono sotto i percorsi ripristinati).
- Dopo il sync `git diff 534d6cf` su quei percorsi è vuoto.
- **Byte dei PDF verificati contro i manifest**: 10/10 (M3 3/3 in `docs/v5/fixtures/m3`, 3/3 in `public/m3-examples`; M4 4/4); attributi binari intatti.
- Fix H1 di Codex conservati (focus trap del dialogo, riprova protetta, runner con pause, live AI disabilitata). Baseline prima di H2: 152 test.

Commit, in ordine (locali, nessun push):

| Commit | Contenuto | Azione per Codex |
|---|---|---|
| `aa7268f` chore(v5): sync H1 consolidated and H2 search contract | Copia della baseline `534d6cf` sui percorsi autorizzati | **Escludere / non riapplicare** |
| `c2d0e11` feat(frontend-v5): client, chiavi cache e hook document-search-v1 (H2) | Tipi, `getDocumentSearchCapabilities`, `listDocuments` con filtri facoltativi, chiavi, regole, hook | Integrare |
| `3de496f` test(frontend-v5): ricerca documenti nel backend simulato | `FakeBackend`: capabilities, filtri sul dataset completo, cursor legati ai filtri, 422 | Integrare |
| `55e3416` feat(frontend-v5): ricerca nei documenti della casa H2 | Modulo di ricerca, stati, URL, ritorno dal dettaglio, link da Casa | Integrare |
| `e638879` test(frontend-v5): casi H2 ricerca documenti con backend simulato | 23 test UI + 5 unitari/client | Integrare |
| `ad08772` test(frontend-v5): integrazione reale document-search-v1 | Suite reale saltata di default; terzo gruppo nel runner | Integrare |
| commit successivo docs(frontend-v5) | Seed mock H2, questo HANDOFF, README, screenshot | Integrare. SHA: `git log -1 -- frontend-v5/HANDOFF.md` |

## Cosa è stato fatto

1. **Client e cache**:
   - `GET /homes/:homeId/document-search-capabilities` sul trasporto comune (cookie, `X-Account-Context`, `no-store`, abort); risposta validata (`apiVersion`, `enabled`, `limits`), altrimenti errore di servizio.
   - `listDocuments(homeId, page, signal, accountId, filters?)`: firma M2 invariata. Senza filtri attivi la richiesta è **identica a M2** (`?limit=20[&cursor]`); con filtri vanno solo i parametri attivi (`q` se non vuota, `format`/`visibility` se diversi da «all»). DocumentSummary/DocumentsPage invariati.
   - Chiavi: lista M2 `[..., 'documents', 'list']` invariata; ricerche `[..., 'documents', 'list', 'search', q canonica, format, visibility]`, cursor nella pagina dell'infinite query. L'upload invalida il prefisso `list`: tutte le varianti filtrate e la lista M3 usata dall'analisi.
   - `useDocuments` (M3/M4) non è cambiato e non riceve mai i nuovi parametri; jobs/assets/review/history non toccati.
2. **Documenti**: modulo `role="search"` «Cerca nei documenti di <Casa>» con «Ricerca in: <Casa>», nota «La ricerca riguarda titoli e nomi dei file, non il contenuto», campo «Cerca nei documenti» (placeholder «Titolo o nome del file»), Formato (Tutti/PDF/JPEG/PNG), Visibilità (Tutti/Solo io/Condivisi nella casa), «Cerca» e «Azzera filtri».
   - Bozza distinta dai filtri applicati: nessuna richiesta a ogni tasto; Invio o «Cerca» applicano tutto insieme. La bozza si riallinea se i filtri applicati cambiano (Azzera, indietro/avanti).
   - Query normalizzata trim + NFC; >120 code point (o il limite delle capabilities) e caratteri di controllo: errore sul campo, focus e nessuna richiesta. Gli errori del server restano autorevoli.
3. **URL**: solo `q`/`format`/`visibility` (mai cursor); valori sconosciuti di formato/visibilità valgono «Tutti». `?ricerca=1` da Casa porta il focus sul campo e non va all'API; cade al primo «Cerca». L'apertura normale lascia il focus al titolo.
4. **Casa**: link «Cerca documenti» → `/home/:homeId/documenti?ricerca=1` accanto ad «Apri i documenti».
5. **Ritorno dal dettaglio**: il link al dettaglio porta i filtri nello stato di navigazione; «← Documenti di <Casa>» li ricostruisce (riletti e riscritti, solo i tre parametri). Il refresh della lista o del dettaglio li conserva. Dettaglio, originale e download autenticato sono quelli M2.
6. **Stati distinti**: caricamento («Ricerca in corso…»), casa senza documenti, «Nessun documento corrisponde ai filtri» con filtri applicati e «Azzera filtri», errore «Ricerca non riuscita» con «Riprova» (mai «nessun documento»). Testo dei filtri e della query reso come testo React.
7. **Selezione ZIP**: l'archivio è rimontato a ogni cambio dei filtri applicati: prima pagina, selezione ed esito export azzerati; «Mostra altri documenti» con gli stessi filtri conserva la selezione. Si esportano solo documenti visibili e selezionati.
8. **Capabilities assenti**: 404 → «La ricerca nei documenti non è ancora attiva su questo servizio…»; 503/rete → «non è disponibile in questo momento» con «Riprova». Il modulo non compare, la lista M2 senza filtri resta consultabile; con filtri nell'URL compare «Filtri non applicati» e nessuna richiesta parte, nessuna ricerca locale sulle pagine già caricate.
9. **Permessi e contesto**: un 403 sulla lista blocca la vista anche se c'erano risultati, rimuove le varianti non osservate dalla cache e rilegge la casa (il guard mostra «Accesso non consentito»). Viewer cerca e apre, senza caricamento né selezione ZIP. Bozza, filtri, cache e selezione sono per account/casa: nulla in localStorage; cambio casa o account li azzera; le risposte tardive non popolano un altro account (chiavi per account + pulizia cache esistente).
10. **Gare**: cambiando filtri la query precedente resta senza osservatori e TanStack annulla la richiesta (segnale abort verificato).

## API usate (document-search-v1, nessun campo o endpoint inventato)

GET `/homes/:homeId/document-search-capabilities` · GET `/homes/:homeId/documents?q&format&visibility&limit&cursor`. Nessun POST nuovo; upload, file, ZIP invariati.

## Prove realmente eseguite (Node 24.20.0, in `frontend-v5/`)

| Comando | Esito |
|---|---|
| `npm run typecheck` / `npm run lint` | OK |
| `npm test` (mock + fixtures) | **180 superati** (15 file) |
| `npm run build` | OK; il bundle non contiene il backend simulato; avviso Vite «chunk > 500 kB» |
| `npx vitest run --project integration` senza flag | 21 saltati (6 file) |
| `V5_DOCUMENT_SEARCH_API=1` contro **mock su 3101** | 2/2: verifica solo il codice dei test, **non è integrazione reale** |

- **Composizione dei 180**: 152 baseline (M1–M4, H1) senza modifiche + 5 in `src/lib/documentSearch.test.ts` (regole, URL, client: richiesta M2 invariata, parametri attivi, capabilities, simulatore con cursor legati ai filtri) + 23 in `src/routes/documentSearch.test.tsx`.
- **UI (mock)**, per criterio del contratto: 1 casa vuota / zero risultati / errore con Riprova; 2 titolo e filename, maiuscole; 3 trim, solo spazi, NFC su titolo decomposto, accenti distinti, 120/121 code point, controlli dall'URL; 4 `%`, `_`, backslash, apostrofo, SQL-like, HTML non interpretato; 5 formato da MIME con estensione fuorviante; 6 privati altrui esclusi all'owner, Solo io / Condivisi nella casa; 7 viewer, 403 dopo revoca senza risultati in pagina o cache, cambio account; 8 risultato oltre la prima pagina M2, pagine filtrate 20+4 senza duplicati con cursor della ricerca; 10 Cerca/Invio/Azzera, filtri combinati in una sola richiesta, focus da Casa e non all'apertura normale, ritorno dal dettaglio e ricarica; 11 due ricerche (prima annullata), cambio account con risposta tardiva, selezione ZIP azzerata e conservata con «Mostra altri»; 12 upload che compare nella ricerca, export solo del selezionato visibile, analisi M3/M4 su lista non filtrata; 13 capabilities 404 e 503. Il 9 (cursor) è provato sul client contro il simulatore e nella suite reale.
- **Integrazione reale** (`tests/integration/document-search.int.test.ts`, solo `V5_API_URL` + `V5_DOCUMENT_SEARCH_API=1`; terzo gruppo del runner dopo la pausa di 61 s; tre registrazioni): capabilities; titolo/filename; `%`, `_`, SQL-like; NFC e accenti; formato da MIME; visibilità; 121 e controlli → 422; pagine 2+limit diverso senza duplicati; cursor con altri filtri → 422; vecchio cursor M2 accettato solo senza filtri; account esterno 403 su lista e capabilities. **Non eseguita contro 3001.**

**Browser (mock 3101 con `--seed`, Vite 5175)**: da Casa a 390 px «Cerca documenti» con focus sul campo, `scan_0042` + Invio trova «Bolletta gas gennaio» dal nome file; dettaglio e ritorno con `?q=scan_0042`, anche dopo ricarica del dettaglio; 320 px con query SQL-like + PNG + Condivisi → zero risultati, nessuno scroll orizzontale; desktop con filtri PDF/Condivisi e focus sul titolo all'apertura normale.

I processi di Codex su 3001, 5174, 55432 e 5173 non sono stati interrogati né fermati; i miei su 3101 e 5175 sono stati fermati.

## Screenshot (`docs/screenshots/`, backend simulato)

- `21-mock-h2-ricerca-da-casa-390`: modulo dopo l'ingresso da Casa.
- `22-mock-h2-risultati-390`: risultato trovato dal nome file.
- `23-mock-h2-zero-risultati-320`: zero risultati con filtri combinati e query SQL-like resa come testo.
- `24-mock-h2-filtri-desktop`: filtri PDF + Condivisi nella casa (pannello del browser integrato, 800 px).

Nessuna dichiarazione di conformità WCAG.

## Domande contrattuali e lacune per Codex

1. **Etichetta di visibilità**: il filtro usa «Condivisi nella casa» (contratto), le righe e l'upload M2 continuano a dire «Persone della casa». Uniformare?
2. **Valori non validi nell'URL**: formato/visibilità sconosciuti vengono trattati come «Tutti» senza avviso; una `q` non valida mostra «Ricerca non valida» senza richiesta. Va bene?
3. **Capabilities 403**: non mostro il riquadro «Ricerca non attiva» (lo gestisce il 403 della casa/lista). Confermare che il 403 delle capabilities coincide con la membership.
4. **`fieldErrors` del 422 di ricerca**: oggi il 422 del server appare come errore generico «Ricerca non riuscita» (la UI previene già 121/controlli). Serve mostrarlo sul campo?
5. **Upload PNG nella suite reale**: uso un PNG minimale (firma + 4 byte). Se il backend valida l'immagine completa, va sostituito con una fixture.
6. **Viewer nella suite reale**: senza API V5 per inviti/ruoli il frontend non può creare un viewer; la ricerca del viewer va provata da Codex nel DB.
7. **Avviso build «chunk > 500 kB»**: presente nell'output; non ho verificato se esisteva già prima di H2 (H2 aggiunge poco codice). Code splitting in backlog?

## Limiti

- Solo prove mock; H2 si chiude dopo backend, API, DB e browser reali di Codex (criterio 14).
- Nessun conteggio totale dei risultati (il contratto non lo prevede): la UI dice solo «ce ne sono altri».
- Gli screenshot desktop sono limitati dal pannello del browser integrato.

## Note per i documenti condivisi (le aggiorna Codex)

- **changelog**: frontend H2 (ricerca per titolo e nome file in Documenti, filtri formato/visibilità, link da Casa, ritorno dal dettaglio con gli stessi filtri); solo prove mock.
- **decisions/ADR**: senza filtri attivi la richiesta resta M2 (stessa chiave e cursor `c…`); varianti filtrate sotto il prefisso della lista per l'invalidazione da upload; filtri nell'URL, cursor mai; archivio rimontato al cambio filtri (prima pagina e selezione ZIP vuota); 403 rimuove le varianti non osservate e rilegge la casa; capabilities assenti = nessuna ricerca, nessun ripiego locale.
- **backlog**: domande 1–7; conteggio risultati se mai previsto dal contratto; e2e browser reale H2.
- **roadmap**: frontend H2 pronto per integrazione; H2 si chiude dopo integrazione e verifica reale di Codex.

## Prossimi passi consigliati

1. Codex: backend H2, poi integrazione dei commit da `c2d0e11` in poi (escludere `aa7268f`); risposte alle domande.
2. `V5_API_URL=http://127.0.0.1:3001/api/v5 V5_DOCUMENT_SEARCH_API=1 npm run test:integration`, poi collaudo browser reale a 320/390 px, desktop e tastiera.
3. Adeguamenti dalla review in nuovi commit `frontend-v5/**`.
