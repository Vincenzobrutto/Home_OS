# Backlog

Attività aperte, non ancora pianificate in una milestone specifica. Priorità: **Alta** (blocca o rischia dati/sicurezza) · **Media** (debito tecnico o friction reale) · **Bassa** (nice-to-have).

| # | Attività | Priorità | Dipendenze / note |
|---|---|---|---|
| B1 | Test automatici backend (unit + e2e) — Jest è configurato e funziona (`npm run test`), ma copre solo lo scaffold di default, nessuna logica di dominio | Alta | prioritario prima di refactorizzare aree senza copertura (pipeline documentale, calcolo status) |
| B1b | Test automatici frontend — nessun framework installato, `package.json` non ha nemmeno uno script `test` | Alta | scegliere e installare un framework (es. Vitest, già compatibile con Vite) prima di aggiungere test |
| B2 | Autenticazione/sessione reale sulle API | Alta | prerequisito per qualunque esposizione del backend oltre la LAN locale |
| B3 | ~~`git init` del repository~~ — risolto 2026-08-02, repo pubblicato su https://github.com/Vincenzobrutto/Home_OS | — | chiuso. Nota: durante l'operazione trovato e rimosso un secondo prima del commit (password DB in chiaro in `.claude/settings.local.json`, mai coperta da nessun `.gitignore` esistente) — vedi `decisions.md` #17 |
| B4 | OAuth Gmail/Drive non funziona se avviato da un cellulare in LAN (redirect URI pensato per `localhost`) | Media | richiede decidere come gestire il redirect URI quando l'host non è fisso (vedi `decisions.md` #12 sullo stesso problema già risolto per le chiamate API dirette) |
| B5 | ~~`FRONTEND_ORIGIN` manca da `backend/.env.example`~~ — risolto 2026-08-02, ora documentata anche `VITE_API_URL` in `frontend/.env.example` (nuovo file) | — | chiuso |
| B14 | 12 errori `@typescript-eslint/no-unsafe-*` in `backend/src/documents/claude-extraction.service.ts` (risposta HTTP di Claude tipata `any`) | Media | non bloccano build/test, verificato 2026-08-02 con `npm run lint`; da risolvere tipando la risposta `/v1/messages` invece di silenziare le regole |
| B15 | `backend/package.json#prisma` è deprecato (Prisma avvisa in vista della v7) | Bassa | migrare a `prisma.config.ts` quando si valuterà l'aggiornamento oltre 6.19.3 (vedi `decisions.md` #14) — non urgente da pinnati |
| B16 | Bundle frontend: `dist/assets/index-*.js` ~760 kB (219 kB gzip), oltre la soglia di warning di Vite | Bassa | valutare code-splitting (`import()` dinamico) se il tempo di caricamento diventa un problema reale, non anticipare |
| B6 | Righe Ambienti sospette/corrotte (AMB-005–AMB-011) da verificare | Media | segnalato come task separato (chip `task_fb8af2a5`) in una sessione precedente, non ancora verificato né chiuso |
| B7 | Evento cronologia "Daikin Perfera" su un asset AC dall'aspetto stale — chiarire con l'utente se è dato reale o di test | Bassa | richiede input utente, non risolvibile solo leggendo il codice |
| B8 | Contatto "Idrotermica Bianchi" potenzialmente collegato a eventi storici non pertinenti | Bassa | richiede verifica manuale dei dati, non un bug di codice |
| B9 | Rubrica: nessun auto-suggerimento di contatto esistente quando il campo "Fornitore" estratto da un documento coincide con un contatto già in rubrica | Bassa | oggi il collegamento contatto↔intervento è sempre manuale, deliberatamente (vedi `domain-model.md` su Contact) — da rivalutare se il re-inserimento manuale diventa fastidioso in uso reale |
| B10 | Token OAuth Gmail/Drive salvati in chiaro in DB | Alta (prima di produzione) | accettabile per MVP mono-utente locale, non per un deploy esposto — vedi `architecture.md` §2 |
| B11 | Navigazione senza URL reali (niente back/forward browser, niente link condivisibile a una vista) | Media | richiederebbe introdurre un router (oggi deliberatamente assente, vedi `architecture.md` §3) |
| B12 | Multi-utente per casa (UI di invito/permessi) | Media | modello dati (`HouseMembership`) già pronto, manca solo la UI e la logica di autorizzazione — dipende da B2 |
| B13 | `MOBILE_CSS` ha un solo breakpoint (860px), nessun trattamento dedicato per tablet | Bassa | da rivalutare solo se emerge un caso d'uso tablet reale |

Le decisioni di design già prese (comprese quelle che generano debito accettato consapevolmente, es. niente test, CORS aperto) sono in `decisions.md` — questo file è per il lavoro non ancora fatto, non per rispiegare perché.
