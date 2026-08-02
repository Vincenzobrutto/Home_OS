# Convenzioni di stile e ambiente

Regole concrete, specifiche di questo repository. Per i principi generali vedi `coding-guidelines.md`.

## Frontend

- **Stile: solo inline (`style={{...}}`), token da `frontend/src/theme.ts` (`T`).** Niente CSS Modules, styled-components, Tailwind. Unica eccezione: `MOBILE_CSS` in `theme.ts`, un blocco CSS vero per le media query (che lo stile inline non può esprimere) — non aggiungere altre eccezioni senza discuterne, vedi `docs/decisions.md` #13.
- **Nessun router**: la navigazione è lo stato `view: View` in `App.tsx` + `setView`. Un nuovo "schermo" è un nuovo valore dell'union `View` (`components/Sidebar.tsx`), non una nuova route.
- **Apertura del dettaglio Asset**: sempre tramite `openAsset(id, origin)`, mai `setView('asset-detail')` direttamente — altrimenti il pulsante "indietro" torna al posto sbagliato. Vedi `docs/ui-ux.md`.
- **Interazioni trascinabili** (planimetria, drag di qualunque tipo): usare Pointer Events (`onPointerDown`, listener su `'pointermove'`/`'pointerup'`), non Mouse Events — servono per il touch su mobile. Aggiungere `touchAction: 'none'` all'elemento trascinabile.
- **Icone**: `lucide-react`. Un nuovo `AssetType`/`RoomType` nell'enum Prisma richiede anche una riga nella mappa tipo→icona in `theme.ts`, altrimenti fallback generico silenzioso.

## Backend

- Un modulo NestJS per risorsa (`assets`, `documents`, `rooms`, ...), con `*.controller.ts` + `*.service.ts` + `dto/`. Nuove risorse seguono lo stesso schema.
- DTO con `class-validator` (`@IsOptional()`, `@IsUUID()`, ...) su ogni campo in ingresso da un endpoint pubblico.
- Prisma è **pinnato a 6.19.3** — non aggiornare a 7.x senza una decisione esplicita (vedi `docs/decisions.md` #14).

## Ambiente di sviluppo (Windows)

- **Prisma `generate` con errore `EPERM`/DLL lock** (`query_engine-windows.dll.node.tmp`): il backend in `start:dev` tiene il file bloccato. Fix: `taskkill //F //IM node.exe` prima di rilanciare `npx prisma generate`, poi riavviare il backend.
- **Migrazioni**: creare manualmente la cartella in `backend/prisma/migrations/<timestamp>_<nome>/migration.sql`, poi `npx prisma migrate deploy` — pattern usato finora invece di affidarsi sempre a `migrate dev` interattivo.
- **Git Bash e caratteri accentati**: passare payload SQL/JSON con caratteri accentati (à, è, ò...) inline in un comando Git Bash può corromperli. Scrivere il payload su file (es. con lo strumento di scrittura file) e riferirlo (`psql -f file.sql`, `curl --data-binary @file.json`) invece di passarlo inline.

## Comandi

```bash
# backend
cd backend && npm run start:dev     # porta 3000

# frontend
cd frontend && npm run dev          # porta 5173, raggiungibile anche da LAN (server.host: true)
```

Variabili d'ambiente richieste: vedi `backend/.env.example` (nota: `FRONTEND_ORIGIN` è usato nel codice ma manca da quel file — vedi `docs/backlog.md` B5).
