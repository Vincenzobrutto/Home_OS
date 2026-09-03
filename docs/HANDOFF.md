# Handoff

Documento di consegna per chi riceve questo progetto (sviluppatore umano o assistente AI). Aggiornato il 2026-09-03 dopo il primo incremento tecnico del **Check-up adempimenti v6** e il successivo riallineamento delle priorità di prodotto. Per il dettaglio storico vedi [`changelog.md`](changelog.md).

## Stato attuale del progetto

MVP funzionante, uso locale/LAN, con autenticazione a sessione e isolamento per casa; nessun deploy pubblico. Backend e frontend compilano con i comandi documentati sotto. Il repository è versionato su GitHub e il branch di riferimento è `main`.

**Novità 2026-08-04 — HomeOS Genesis è ora su `main`**: percorso guidato di onboarding (wizard 6 step) che porta una casa nuova a un primo Digital Twin. B33 protegge dai duplicati e B34 persiste lo step preciso, ricaricando l'ultima scansione quando si riprende Review. **Prima di lavorarci leggi [`genesis-architecture.md`](genesis-architecture.md) e [`decisions.md`](decisions.md) #25-#28**.

Per la visione di prodotto vedi [`vision.md`](vision.md); per le milestone vedi [`roadmap.md`](roadmap.md); per le 10 epiche di prodotto vedi [`product-backlog.md`](product-backlog.md).

## Funzionalità completate

- Gestione Asset: CRUD, campi strutturati (marca/modello/seriale/date), campi liberi, dismissione/riattivazione, cronologia interventi.
- Gestione Ambienti: vista a blocchi e planimetria interattiva (disegno forme libere/rettangoli, drag degli asset, rotazione a 90°).
- Pipeline documentale: upload manuale, scansione automatica Gmail/Drive, estrazione AI (Claude), proposta con conferma utente, creazione automatica di nuovo Asset (con scelta ambiente) se non esiste quello corretto.
- Documenti casa (non legati a un ambiente specifico, es. APE).
- Piani di manutenzione (una tantum o ricorrenti) sugli Asset, con suggerimenti automatici da linee guida statiche per tipo (CLIMA/CALDAIA/FOTOVOLTAICO/ELETTRICO) — sempre da confermare, mai creati in automatico.
- Fatture e rapporti di intervento possono proporre di completare piani compatibili su più Asset; l'utente corregge selezione/data e conferma atomicamente.
- Rubrica contatti collegabile alla cronologia interventi.
- Dashboard con promemoria cliccabili verso l'asset.
- Manutenzione programmata per Asset: ricorrenze, preavviso, tecnico/documento, completamento, storico, sospensione e promemoria Dashboard.
- UI ottimizzata per mobile (sidebar a scomparsa, touch sulla planimetria, layout responsive).
- **HomeOS Genesis (2026-08-04)**: wizard di onboarding a 6 step; scansione dimostrativa con catalogo selezionabile, revisione esplicita, Home Score v1 e Home Detective. La Dashboard mostra anche il trend degli ultimi 12 mesi e consente il ricalcolo manuale senza snapshot duplicati. Dettaglio in [`genesis-architecture.md`](genesis-architecture.md).
- **Consumi elettrici B25 (2026-08-04)**: bollette estratte da Claude e confermate dall'utente, periodi `UtilityBill`, vista Energia con confronto YoY e installazioni Asset per mese. I periodi plurimensili sono marcati come stimati.
- **Check-up adempimenti v6 — fondazioni (2026-09-03)**: schema per evidenza, impianti termici, libretti/rapporti, territori e regole versionate; `MaintenancePlan` generalizzato e motori puri iniziali. Nessuna regola regionale o UI compliance è ancora attiva: proseguire da B41–B45.

Dettaglio completo in [`vision.md`](vision.md) e [`roadmap.md`](roadmap.md).

## Architettura e stack

Due servizi Node indipendenti, nessun monorepo tool:

| Livello | Scelta |
|---|---|
| Backend | NestJS 11 + TypeScript, moduli per risorsa |
| ORM/DB | Prisma **6.19.3** (pinnato) + PostgreSQL |
| Frontend | React 19 + Vite 8 + TypeScript, SPA senza router esterno |
| Stile UI | Inline styles + token (`theme.ts`); unica eccezione `MOBILE_CSS` per le media query |
| AI | Claude (Sonnet), chiamata `fetch` diretta, no SDK |
| Integrazioni | Gmail API + Google Drive API (OAuth2 redirect server-side) |

Motivazioni complete in [`architecture.md`](architecture.md); ogni scelta non ovvia con le sue alternative scartate è in [`decisions.md`](decisions.md).

## File principali

```
backend/src/
├── assets/       CRUD asset, campi liberi, cronologia, dismiss/reactivate
├── documents/     pipeline documentale (analyze/confirm), estrazione Claude
├── maintenance/   piani ricorrenti, completamento, storico e promemoria
├── rooms/          CRUD ambienti + geometria planimetria
├── gmail/, drive/    OAuth + scansione candidati
├── genesis/            wizard onboarding, HouseScanProvider/mock, dto (vedi genesis-architecture.md)
├── common/             home-score.ts, home-detective.ts (motori puri) + asset-status/warranty/maintenance-guidelines
├── houses/, contacts/, users/
└── main.ts           bootstrap, CORS

frontend/src/
├── App.tsx           stato globale (house/rooms/assets/view) + composizione
├── theme.ts            design token (T) + MOBILE_CSS
├── geometry.ts           math planimetria (rotazione, forme stanza)
├── api.ts                client fetch verso il backend
└── components/            Sidebar, Dashboard, Genesis (wizard), Inbox, RoomsHub/FloorPlan, Assets, Maintenance, HouseDocuments, Contacts

backend/prisma/schema.prisma   fonte di verità del modello dati (vedi domain-model.md)
```

Riferimento completo: [`domain-model.md`](domain-model.md) (entità/regole), [`api.md`](api.md) (endpoint REST), [`ui-ux.md`](ui-ux.md) (navigazione/design system).

## Comandi

### Installazione e avvio

```bash
# backend — porta 3000
cd backend
npm install
npx prisma migrate deploy
npm run start:dev

# frontend — porta 5173
cd frontend
npm install
npm run dev
```

Il repository contiene ora 17 migrazioni, inclusa `20260903120000_add_compliance_foundations`. Eseguire `npx prisma migrate deploy` con il `DATABASE_URL` reale prima di usare le nuove fondazioni; la migrazione retrocompila `MaintenancePlan.houseId` dai relativi Asset.

### Lint, build, test — risultati verificati il 2026-09-03

| Comando | Backend | Frontend |
|---|---|---|
| `npm run build` | ✅ pulito | ✅ pulito (warning: bundle principale ~805 kB, oltre soglia Vite — vedi `backlog.md` B16) |
| `npm run lint` | ✅ 0 errori, 0 warning | ⚠️ 3 warning `react-hooks/exhaustive-deps` (Drive.tsx, Inbox.tsx, Gmail.tsx), invariati |
| `npm run test` | ✅ 76/76 (inclusi motori compliance, consumi, Property Profile e Genesis) | ❌ nessuno script `test` configurato — nessun framework di test installato |

Verificato anche **end-to-end nel browser** (non solo unit test): l'intero wizard Genesis eseguito sulla casa reale — creazione stanze/asset dalla scansione demo, calcolo Home Score, generazione Issue/Recommendation coerenti. Dettaglio in `changelog.md` (2026-08-04).

Nessuno di questi errori impedisce build o avvio dell'app. Non sono stati corretti in questa sessione (vedi `decisions.md` #16 sul perché) — tracciati in `backlog.md` come B1, B1b, B16.

## Variabili d'ambiente necessarie

**Backend** (`backend/.env`, vedi `backend/.env.example`):
- `DATABASE_URL` — connessione PostgreSQL
- `ANTHROPIC_API_KEY` — estrazione documenti
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_DRIVE_REDIRECT_URI` — OAuth Gmail/Drive
- `FRONTEND_ORIGIN` — opzionale, default `http://localhost:5173`

**Frontend** (`frontend/.env`, vedi `frontend/.env.example`, nuovo in questa sessione):
- `VITE_API_URL` — opzionale, default `http://<host della pagina>:3000`

Nessun valore segreto è presente in questo documento o nei file `.env.example` — solo nomi di variabili e placeholder. I valori reali vivono solo in `backend/.env` (gitignored).

## Problemi noti

- OAuth Gmail/Drive non funziona se avviato da un cellulare in LAN (redirect URI pensato per `localhost`) — `backlog.md` B4.
- Righe Ambienti sospette/corrotte (AMB-005–AMB-011) segnalate in una sessione precedente, mai verificate — `backlog.md` B6.
- Un evento cronologia ("Daikin Perfera") dall'aspetto stale su un asset AC, mai chiarito con l'utente — `backlog.md` B7.
- Contatto "Idrotermica Bianchi" potenzialmente collegato a eventi storici non pertinenti — `backlog.md` B8.
- `backend/uploads/` contiene già file caricati da un utente reale durante lo sviluppo — è gitignored correttamente, ma chi clona il repo su un'altra macchina non li avrà (comportamento atteso, non un bug).

## Debito tecnico

- Autenticazione/sessione B2 completata; restano rate limiting del login e reset password via email come possibili evoluzioni.
- Token OAuth Gmail/Drive salvati in chiaro in DB — `backlog.md` B10.
- Test automatici backend ancora parziali (buona copertura di dominio, inclusi i motori Genesis), frontend assenti del tutto — `backlog.md` B1, B1b.
- Navigazione senza URL reali (niente back/forward browser, niente link condivisibili) — `backlog.md` B11.
- `backend/package.json#prisma` è una configurazione deprecata in vista di Prisma 7 — `backlog.md` B15.
- Bundle frontend oltre la soglia di warning Vite (~805 kB) — `backlog.md` B16.
- Genesis: scansione ancora solo mock (percorso verso il reale in `genesis-architecture.md` §10); la ripresa precisa B34 è completata.

Elenco completo con priorità e dipendenze in [`backlog.md`](backlog.md).

## Attività successive consigliate

Ordine corrente, deciso dopo il primo incremento B41:
1. B46 — validazione continua del posizionamento “memoria digitale della casa” con 15–20 questionari e sintesi dei segnali.
2. B47 — audit e requisitazione del Memory Core (`Contact`, timeline, garanzie, costi intervento) prima di una nuova migrazione.
3. B48 — affidabilità della memoria e copertura informativa in Dashboard.
4. B49 — ricerca unificata e azioni rapide; poi B50, garanzie e cartella clinica dell'Asset.
5. Proseguire B41 come fondazione tecnica; non anticipare la UI compliance. Genesis 2.0 e pilota Lombardia/Piemonte vengono dopo i P0 della memoria.

Vincoli trasversali: non avviare B18 (standby); cifrare token OAuth e dati tutelati prima di un deploy esterno; mantenere separati Stato adempimenti e Home Score; non attivare regole regionali senza governance.

Per iniziare a lavorare su questo repository, leggi anche [`AGENTS.md`](../AGENTS.md) (protocollo di aggiornamento documentazione e handoff di fine sessione) e [`prompts/coding-guidelines.md`](../prompts/coding-guidelines.md) (principi di dominio da non violare).
