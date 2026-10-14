# Dimora V5 — nuovo frontend

## Stato G1 consolidato — 14 ottobre 2026

Ambienti shared Home, oggetti personali e caldaia originale nel catalogo unico, posizioni multiambiente/Da collocare, collegamenti a documenti/costi/attività, archive/restore/storia attivi sulle API/DB reali. Consegna Claude bf10356 integrata, sync escluso; Codex ha verificato client/API21non-live e browser320/390/desktop/reload/logout-login.237mock/fixture baseline e47mirati finali, build/lint verdi. Rapporti autorevoli ../docs/v5/g1-integration-review.md; G1-HANDOFF descrive la precedente fase solo mock. Nessuna chiamata Anthropic prodotto. C1/S1-S4 futuri, no condivisione implicita o somma di previsioni ai costi registrati.

## Stato consolidato H3a — 14 ottobre, integrazione Codex
Spese attive nell'ambiente reale5174/3001 con PostgreSQL dedicato: costi personali EUR, manuali/documentali, totali annuali, modifiche e archive/restore/storia, riferimenti a documento/caldaia senza duplicazione. Consegna Claude integrata escludendo sync;213 mock/fixture e19 client/API non-live passano, quattro live AI saltati. Rifiniture Codex anno storico e messaggio503 verificate con31 test H3 mirati, build/lint e browser320/390/desktop/tastiera/reload/login. Report ../docs/v5/h3-integration-review.md prevale sul HANDOFF che descrive la fase precedente solo mock. Nessuna nuova chiamata Anthropic; stime/ricorrenze, export Home e rate Admin restano future.

React 19 + TypeScript + Vite 7, React Router 7, TanStack Query 5, CSS Modules. Verticali: identity-v1.1 (accesso, case, shell Home), documents-v1 (Documenti M2: archivio, caricamento, dettaglio, download, ZIP), review-v1 (M3 Caldaia: analisi di test, proposte, conferme, Da rivedere, storia), analysis-v2 (M4: scelta esplicita Analisi di test o Anthropic, consenso, costi del collaudo), activities-v1 (H1: attività personali e scadenze, nessuna AI), document-search-v1 (H2: ricerca nei titoli e nomi file dei documenti della casa, nessuna AI/OCR) ed expenses-v1 (H3a: spese personali sostenute, manuali o collegate a documento/caldaia, totali annui dal server; nessun pagamento o AI). Nessun codice del frontend legacy.

Leggere AGENTS.md locale e root; contratti in `docs/v5/api-contract.md`, `docs/v5/documents-api-contract.md`, `docs/v5/review-api-contract.md`, `docs/v5/anthropic-api-contract.md`, `docs/v5/activities-api-contract.md`, `docs/v5/document-search-api-contract.md` e `docs/v5/expenses-api-contract.md`. Stato del lavoro e richieste a Codex in [HANDOFF.md](HANDOFF.md).

## Comandi

```bash
npm ci                 # dipendenze dal lockfile
npm run dev            # http://127.0.0.1:5174 (strictPort), /api/v5 → 127.0.0.1:3001 (backend reale)
npm run build          # tsc -b + build di produzione in dist/
npm run lint
npm test               # prove con backend SIMULATO (mock) + integrità dei PDF di esempio M3
npm run test:integration   # backend V5 REALE; saltata se manca V5_API_URL
```

Integrazione reale (solo database/storage di sviluppo V5):

```bash
V5_API_URL=http://127.0.0.1:3001/api/v5 npm run test:integration                     # identity
V5_API_URL=http://127.0.0.1:3001/api/v5 V5_DOCUMENTS_API=1 npm run test:integration  # + documents
V5_API_URL=http://127.0.0.1:3001/api/v5 V5_REVIEW_API=1 npm run test:integration     # + review M3
V5_API_URL=http://127.0.0.1:3001/api/v5 V5_ANALYSIS_V2=1 npm run test:integration   # + M4 senza chiamate Anthropic
V5_API_URL=http://127.0.0.1:3001/api/v5 V5_ACTIVITIES_API=1 npm run test:integration # + H1 attività
V5_API_URL=http://127.0.0.1:3001/api/v5 V5_DOCUMENT_SEARCH_API=1 npm run test:integration # + H2 ricerca
V5_API_URL=http://127.0.0.1:3001/api/v5 V5_EXPENSES_API=1 npm run test:integration # + H3a spese (dopo attivazione di Codex)
# Solo Codex, consuma budget del collaudo (max 10 USD): aggiungere V5_ANTHROPIC_LIVE=1
```

Harness manuale con backend SIMULATO, mai sulla porta reale 3001:

```bash
npm run mock-api -- --seed                                       # 127.0.0.1:3101, con i PDF di esempio M3
npm run mock-api -- --seed --anthropic-mock                      # + Anthropic SIMULATO (nessuna rete, nessuna chiave)
DIMORA_API_TARGET=http://127.0.0.1:3101 npx vite --port 5175     # frontend verso il mock
```

Modalità reale: l'app parla solo con `/api/v5`. Se il backend o un endpoint non risponde mostra un errore con «Riprova», mai dati dimostrativi né successi simulati. Il backend simulato (`src/test/fakeBackend.ts`, `scripts/mock-api.ts`) non entra nel bundle (regola ESLint e verifica sul build).

## Struttura

- `src/api/` — tipi dei contratti, client tipizzato (JSON, multipart e binari su un unico percorso: CSRF in memoria, X-Account-Context, Idempotency-Key, errori), chiavi cache.
- `src/session/` — QueryClient (gestione 401, pulizia cache), sessione/account, hook case.
- `src/documents/` — hook documenti (elenco paginato, ricerca H2, dettaglio, byte, upload, ZIP), modulo di ricerca e URL Blob.
- `src/activities/` — hook e componenti H1 (attività personali, operazioni idempotenti, dialogo di annullamento).
- `src/expenses/` — hook e componenti H3a (spese personali, modulo con selettori autorizzati, costi collegati a documento/caldaia).
- `src/review/` — hook M3 (capabilities, job con polling limitato, schede, Da rivedere, conferme, storia) e componenti di decisione.
- `src/routes/` — rotte, guardie, pagine (Casa, Documenti, dettaglio documento, Attività, Da rivedere, scheda caldaia, Spese e dettaglio spesa).
- `src/components/` — shell, icone, primitive UI.
- `src/lib/` — validazioni, regole file (limiti, formati, salvataggio sicuro), etichette e regole M3, regole H1, della ricerca H2 e degli importi H3a (centesimi interi, nessun float).
- `public/m3-examples/` — tre PDF sintetici e manifest M3, byte identici al manifest (verificati da `tests/fixtures`).
- `src/styles/` — solo token e reset globali.
- `src/test/` — harness, stub del browser e backend simulato (solo test).
- `tests/fixtures/` — integrità dei PDF di esempio e riconoscimento sui byte reali (Node).
- `tests/integration/` — prove contro il backend reale.

## Integrazione Codex M4 — 13 ottobre 2026
Frontend integrato con backend/DB/storage reali, sei chiamate Anthropic registrate entro il tetto 10 USD. Build/lint e 126 test mock/fixture passano; 12 client/API non-live e 7 della suite live (tre non-live, quattro live) passano. Browser 320/390/desktop e tastiera verificati. I dettagli del handoff Claude descrivono la fase precedente solo mock; lo stato consolidato e le correzioni sono in ../docs/v5/m4-integration-review.md. Budget utilizzato 0.041714 USD, nessun costo incerto. Chiamate iniziali terminate: non riattivare/ripetere live senza definire la fase successiva. Analisi di test sempre selezionabile; risultati AI reali restano navigabili e confermabili.
