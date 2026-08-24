# Architettura

## 1. Vista d'insieme

Due servizi separati, nessun monorepo tool (no Nx/Turborepo) — struttura volutamente semplice per un progetto a questo stadio:

```
homeos-project/
├── backend/     NestJS + Prisma + PostgreSQL — API REST, autenticazione a sessione, pipeline AI, integrazioni Gmail/Drive
├── frontend/    React + Vite + TypeScript — SPA, login reale + un'unica casa per utente autenticato
├── docs/        questa cartella
├── prompts/     convenzioni di stile/codice per chi (umano o AI) scrive codice qui
├── architettura/, prototipo/, ai-test/   materiale storico pre-implementazione (vedi nota sotto)
└── START_HERE.md   note originali di progettazione, precedono questo albero di documenti
```

Non esiste una cartella `/src` o `/tests` a livello di repo: il codice vive dentro `backend/src` e `frontend/src` perché sono **due progetti Node indipendenti** (due `package.json`, due server di sviluppo, due deploy separati), non un unico pacchetto. Introdurre un `/src` comune avrebbe richiesto spostare centinaia di file e riscrivere path/config (Vite, Nest CLI, Prisma, `launch.json`) senza nessun beneficio reale — è la deviazione intenzionale dal template generico richiesto per questa riorganizzazione.

**Test automatici: copertura ancora parziale.** Backend: Jest configurato e funzionante (`npm run test`), con prime suite sulle regole di stato/garanzia Asset e sulla pipeline documentale, oltre allo scaffold NestJS. Frontend: nessun framework di test installato (`package.json` non ha nemmeno uno script `test`). Il lavoro residuo è tracciato in `backlog.md`; stato verificato eseguendo i comandi in data 2026-08-02, con dettaglio in `docs/HANDOFF.md`.

## 2. Stack tecnologico

| Livello | Scelta | Note |
|---|---|---|
| Backend | NestJS 11 + TypeScript | struttura a moduli (`auth`, `access-control`, `assets`, `documents`, `rooms`, `contacts`, `houses`, `gmail`, `drive`, `maintenance`, `genesis`, `utility-bills`), un controller/service/dto per modulo |
| ORM / DB | Prisma **6.19.3** (pinnato, non v7) + PostgreSQL | schema in `backend/prisma/schema.prisma`, migrazioni in `backend/prisma/migrations/` |
| Frontend | React 19 + Vite 8 + TypeScript | SPA, nessun router esterno — navigazione gestita a mano con uno stato `view` in `App.tsx` (vedi `ui-ux.md`) |
| Stile UI | Inline styles + design token condivisi (`frontend/src/theme.ts`) | nessun CSS-in-JS/Tailwind; unica eccezione è `MOBILE_CSS`, un blocco di CSS vero iniettato via `<style>` per le media query, che gli style inline non possono esprimere |
| AI estrazione documenti | Claude (famiglia Sonnet), chiamata diretta via `fetch` a `api.anthropic.com`, no SDK | vedi `backend/src/documents/claude-extraction.service.ts` |
| Autenticazione | Sessione in-house: cookie httpOnly + tabella `Session` in Postgres, password con `crypto.scrypt` nativo di Node | niente JWT/provider esterno (Auth0/Clerk/Supabase) — vedi `decisions.md`; ogni rotta è protetta di default (`AuthGuard` globale), l'autorizzazione per-casa verifica `HouseMembership` |
| Integrazioni | Gmail API + Google Drive API (OAuth2, redirect server-side, richiede sessione) | token salvati in chiaro in DB — accettabile per la fase attuale, da rivedere (`backlog.md` B10) |
| Rendering planimetrie | `pdfjs-dist` (client-side) per convertire la prima pagina di un PDF caricato in immagine di sfondo | |

## 3. Perché queste scelte

- **NestJS invece di Express nudo**: struttura a moduli/DI già pronta per un dominio con molte entità collegate (Asset/Room/Document/Contact/Timeline); minore probabilità che il codice diventi un unico file di route man mano che cresce.
- **Prisma invece di query SQL a mano**: modello dati condiviso tra schema e tipi TypeScript, migrazioni versionate. Pinnato a 6.19.3 perché la v7 introduce cambi non ancora verificati per questo progetto.
- **Niente state manager esterno nel frontend** (no Redux/Zustand/React Query): lo stato vive in `App.tsx` e scende via props. Scelta deliberata per la dimensione attuale dell'app — vedi `decisions.md` se in futuro si valuta di introdurne uno quando la profondità del prop-drilling diventa un problema reale, non anticipata.
- **Inline styles invece di un framework CSS**: il progetto nasce da un prototipo React con stile inline già validato con utenti reali (`prototipo/homeos_prototype.jsx`) — mantenere lo stesso approccio ha permesso di riusare la UI 1:1 invece di riscriverla. Il costo (niente pseudo-classi/media query native) è stato accettato finché non è servito il primo layout responsive, risolto con un singolo blocco CSS iniettato (`MOBILE_CSS`) invece di migrare tutto il progetto a un'altra tecnica.
- **Claude via `fetch` diretto, non un SDK**: unico endpoint usato (`/v1/messages`), un SDK avrebbe aggiunto una dipendenza per poco beneficio. Include l'uso del tool lato server `web_search_20250305` per l'arricchimento dati su richiesta (vedi `documents.service.ts searchOnline`).
- **OAuth Gmail/Drive redirect server-side, niente Google Picker/JS client-side**: più semplice da implementare e mantenere.
- **Sessione in-house invece di JWT o un provider gestito (Auth0/Clerk/Supabase)**: coerente con lo stack minimale già scelto in questo repo — zero costi/vendor lock-in prima che servano davvero, zero dipendenze pesanti nuove (solo `cookie-parser`; l'hashing usa `crypto.scrypt` nativo di Node, non bcrypt/argon2). Il token di sessione è il valore casuale stesso salvato in DB (non firmato): la revoca è un semplice `delete`, non serve gestire un secret di firma né un flusso di refresh token. Da rivalutare se/quando servirà SSO, MFA o reset password via email — vedi `decisions.md`.

## 4. Flusso dati principale (pipeline documentale)

```
Upload / Scatto foto / Scansione Gmail-Drive
        │
        ▼
  Document (status=PENDING o già ANALYZED per i candidati Gmail/Drive)
        │  POST /documents/:id/analyze
        ▼
  Claude estrae uno dei kind: asset_document, floor_plan, utility_bill
        │
        ▼
  Matching: cerca un Asset esistente dello stesso tipo E con nome simile
  (word-overlap, non "il primo dello stesso tipo" — vedi decisions.md)
        │
        ▼
  Document status=ANALYZED, extractedFields valorizzato
  ── NESSUNA scrittura su Asset qui ──
        │  utente rivede la proposta in Inbox
        │  POST /documents/:id/confirm { assetId | createAssetType+roomId | linkToHouse }
        ▼
  Scrittura reale: Asset creato/aggiornato (solo campi vuoti), AssetTimelineEvent,
  Document status=CONFIRMED
```

Il principio "l'AI propone, l'utente conferma" (vedi `decisions.md`) è la ragione per cui `analyze` e `confirm` sono due endpoint separati, non un'unica chiamata.

Le bollette elettriche seguono lo stesso confine: `analyze` conserva periodi/kWh solo in `extractedFields`; `confirm-utility-bill` crea le righe interrogabili `UtilityBill` e conferma il documento in una transazione. Non vengono associate forzatamente a un Asset: sono dati della casa.

## 4bis. Modulo Genesis (onboarding guidato)

`backend/src/genesis/` orchestra il percorso guidato di creazione del Digital Twin — vedi `docs/genesis-architecture.md` per il dettaglio completo (componenti, motore Home Score, motore Home Detective, confine mock/reale). In breve: `GenesisController`/`GenesisService` riusano `RoomsService`/`AssetsService` esistenti invece di duplicarne la logica di creazione; la scansione passa sempre attraverso l'interfaccia `HouseScanProvider`, oggi legata a un solo `MockHouseScanProvider` via token DI — nessun dato mock è mai presentato come reale in UI.

## 5. Ambiente di sviluppo

- Backend: `cd backend && npm run start:dev` (porta 3000), variabili in `backend/.env` (vedi `backend/.env.example` per le chiavi richieste — DB, Anthropic, Google OAuth).
- Frontend: `cd frontend && npm run dev` (porta 5173, Vite). `vite.config.ts` ha `server.host: true` per essere raggiungibile anche da cellulare sulla stessa rete Wi-Fi (vedi `decisions.md`).
- CORS backend: `origin: true` (riflette l'Origin della richiesta) — scelta deliberata per non dover fissare un IP LAN che cambia col DHCP; da restringere se il progetto va in produzione esposta su internet.
- Su Windows, i lock di file del query engine Prisma richiedono di terminare i processi `node.exe` prima di `prisma generate` se il backend è già in esecuzione (vedi `prompts/conventions.md`).
