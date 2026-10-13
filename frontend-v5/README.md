# Dimora V5 — nuovo frontend

React 19 + TypeScript + Vite 7, React Router 7, TanStack Query 5, CSS Modules. Verticali: identity-v1.1 (accesso, case, shell Home) e documents-v1 (Documenti M2: archivio, caricamento, dettaglio, download, ZIP). Nessun codice del frontend legacy.

Leggere AGENTS.md locale e root; contratti in `docs/v5/api-contract.md` e `docs/v5/documents-api-contract.md`. Stato del lavoro e richieste a Codex in [HANDOFF.md](HANDOFF.md).

## Comandi

```bash
npm ci                 # dipendenze dal lockfile
npm run dev            # http://127.0.0.1:5174 (strictPort), /api/v5 → 127.0.0.1:3001 (backend reale)
npm run build          # tsc -b + build di produzione in dist/
npm run lint
npm test               # prove con backend SIMULATO (mock): contratto e rendering
npm run test:integration   # backend V5 REALE; saltata se manca V5_API_URL
```

Integrazione reale (solo database/storage di sviluppo V5):

```bash
V5_API_URL=http://127.0.0.1:3001/api/v5 npm run test:integration                     # identity
V5_API_URL=http://127.0.0.1:3001/api/v5 V5_DOCUMENTS_API=1 npm run test:integration  # + documents
```

Harness manuale con backend SIMULATO, mai sulla porta reale 3001:

```bash
npm run mock-api -- --seed                                       # 127.0.0.1:3101
DIMORA_API_TARGET=http://127.0.0.1:3101 npx vite --port 5175     # frontend verso il mock
```

Modalità reale: l'app parla solo con `/api/v5`. Se il backend o un endpoint non risponde mostra un errore con «Riprova», mai dati dimostrativi né successi simulati. Il backend simulato (`src/test/fakeBackend.ts`, `scripts/mock-api.ts`) non entra nel bundle (regola ESLint e verifica sul build).

## Struttura

- `src/api/` — tipi dei contratti, client tipizzato (JSON, multipart e binari su un unico percorso: CSRF in memoria, X-Account-Context, Idempotency-Key, errori), chiavi cache.
- `src/session/` — QueryClient (gestione 401, pulizia cache), sessione/account, hook case.
- `src/documents/` — hook documenti (elenco paginato, dettaglio, byte, upload, ZIP) e URL Blob.
- `src/routes/` — rotte, guardie, pagine (Casa, Documenti, dettaglio documento).
- `src/components/` — shell, icone, primitive UI.
- `src/lib/` — validazioni, regole file (limiti, formati, salvataggio sicuro).
- `src/styles/` — solo token e reset globali.
- `src/test/` — harness, stub del browser e backend simulato (solo test).
- `tests/integration/` — prove contro il backend reale.
