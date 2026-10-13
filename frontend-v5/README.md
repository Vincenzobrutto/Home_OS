# Dimora V5 — nuovo frontend

React 19 + TypeScript + Vite 7, React Router 7, TanStack Query 5, CSS Modules. Prima verticale identity-v1 (V5-DEV-003): accesso/uscita, registrazione locale di sviluppo, creazione/elenco/scelta Home, shell Casa/Attività/Documenti/Spese. Nessun codice del frontend legacy.

Leggere AGENTS.md locale e root; contratto in `docs/v5/api-contract.md`. Stato del lavoro e richieste a Codex in [HANDOFF.md](HANDOFF.md).

## Comandi

```bash
npm ci                 # dipendenze dal lockfile
npm run dev            # http://127.0.0.1:5174 (strictPort), /api/v5 → 127.0.0.1:3001
npm run build          # tsc -b + build di produzione in dist/
npm run lint
npm test               # prove con backend SIMULATO (mock): contratto e rendering
npm run test:integration   # backend V5 REALE; saltata se manca V5_API_URL
npm run mock-api -- --seed # backend SIMULATO su 127.0.0.1:3001, solo per prove manuali
```

Modalità reale: l'app parla solo con `/api/v5`. Se il backend non risponde mostra un errore di servizio con «Riprova», mai dati dimostrativi. Il backend simulato (`src/test/fakeBackend.ts`, `scripts/mock-api.ts`) non entra nel bundle (regola ESLint e verifica sul build) e non va avviato insieme al backend reale: usa la stessa porta 3001.

## Struttura

- `src/api/` — tipi del contratto, client tipizzato (CSRF in memoria, Idempotency-Key, errori), chiavi cache.
- `src/session/` — QueryClient (gestione 401, pulizia cache), sessione/account, hook dati.
- `src/routes/` — rotte, guardie, pagine.
- `src/components/` — shell, icone, primitive UI.
- `src/styles/` — solo token e reset globali.
- `src/test/` — harness e backend simulato (solo test).
- `tests/integration/` — prove contro il backend reale.
