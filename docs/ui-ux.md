# UI/UX

## Struttura frontend

SPA React 19 + Vite, nessun router esterno (no react-router). Un solo componente stateful, `App.tsx`, tiene lo stato applicativo e lo passa via props — vedi `architecture.md` §3 sul perché non c'è uno state manager.

```
frontend/src/
├── App.tsx           stato globale (house, rooms, assets, view) + composizione
├── theme.ts           T (design token) + FONTS + MOBILE_CSS
├── geometry.ts         math planimetria (rotazione, geometria stanze)
├── api.ts              client fetch verso il backend
├── types.ts             tipi condivisi (Asset, Room, House, Document, Contact...)
└── components/
    ├── Sidebar.tsx           nav laterale (desktop) / drawer (mobile)
    ├── Dashboard.tsx          panoramica + promemoria
    ├── Inbox.tsx               pipeline documentale (upload, candidati Gmail/Drive, conferma)
    ├── RoomsHub.tsx + FloorPlan.tsx   vista ambienti a blocchi / planimetria interattiva
    ├── Assets.tsx               elenco + dettaglio asset
    ├── Maintenance.tsx          piani, completamento e storico manutenzioni nel dettaglio Asset
    ├── HouseDocuments.tsx        documenti non legati a un ambiente (houseLevel)
    ├── Contacts.tsx               rubrica
    └── Modals.tsx                   ModalShell condiviso
```

## Navigazione (pattern `view`)

Nessun URL/router: `App.tsx` tiene `view: View` (`dashboard | inbox | rooms | room-detail | assets | asset-detail | house-documents | contacts | contact-detail`) e la passa a `Sidebar`, che chiama `setView`. Cambiare vista = re-render condizionale in `App.tsx`, non una navigazione del browser (niente back/forward, niente URL condivisibili — limite noto, vedi `backlog.md`).

**Pattern "origine" per il dettaglio asset**: `openAsset(id, origin?: View)` salva `origin` in `assetDetailOrigin` prima di passare a `asset-detail`; il pulsante "indietro" nel dettaglio fa `setView(assetDetailOrigin)`. Serve perché un Asset può essere aperto da più punti (elenco Asset, Documenti casa, Dashboard, dettaglio Ambiente, Rubrica) e "indietro" deve tornare a quello giusto, non sempre all'elenco Asset. Ogni nuovo punto d'ingresso al dettaglio asset deve passare l'`origin` corretto — è l'errore più facile da introdurre aggiungendo una nuova card cliccabile.

## Manutenzione nel dettaglio Asset

`MaintenanceSection` vive nella scheda Asset e carica i piani separatamente dallo stato globale di `App.tsx`. Le card sono ordinate dal backend per scadenza e mostrano stato calcolato, ricorrenza, preavviso, obbligatorietà e tecnico abituale. Da ogni card si può completare, modificare, sospendere/riattivare, consultare lo storico o eliminare solo se non esistono esecuzioni. Il completamento permette di scegliere un documento già confermato sull'Asset e aggiorna anche la cronologia generale.

La Dashboard interroga `/houses/:houseId/maintenance-reminders` quando viene aperta e unisce visivamente manutenzioni `UPCOMING`/`OVERDUE` agli altri promemoria. Il click usa lo stesso `openAsset(id, 'dashboard')`, quindi il ritorno conserva l'origine corretta.

## Design system (`theme.ts`)

- `T`: palette piatta (`paper`, `ink`, `pine`, `ochre`, `rust`, `line`, `card`, `slate`...) — nessun tema chiaro/scuro, un solo tema "carta/inchiostro". Font: Space Grotesk (titoli), Inter (corpo), IBM Plex Mono (dati tecnici/codici).
- **Stile 100% inline** (`style={{...}}`), tokens da `T`, niente CSS Modules/Tailwind/styled-components. Vedi `prompts/conventions.md`.
- Icone: `lucide-react`, una mappa `type → icona` per Asset/Room (in `theme.ts`) così un nuovo `AssetType`/`RoomType` nell'enum Prisma richiede anche una riga qui, altrimenti fallback a un'icona generica.

## Comportamento mobile (`MOBILE_CSS`, `@media (max-width: 860px)`)

Unica eccezione alla regola "solo inline style": un blocco CSS vero iniettato via `<style>{FONTS}{MOBILE_CSS}</style>` in `App.tsx`, perché le media query non sono esprimibili con lo style inline di React.

- **Sidebar → drawer a scomparsa**: sotto gli 860px, `.app-sidebar` diventa `position: fixed` fuori schermo (`translateX(-100%)`), un tasto hamburger in una topbar sticky (`.app-topbar`, nascosta su desktop) la apre, un backdrop semi-trasparente e una X la chiudono. Navigare chiude automaticamente il drawer (`onNavigate` prop di `Sidebar`).
- **Griglie**: classi `grid-responsive` (3→1 colonna) e `grid-responsive-2` (4→2 colonne) applicate dove servono, il resto del layout scala naturalmente perché già basato su flex/percentuali.
- **Modali**: `ModalShell` ha `maxWidth: calc(100vw - 40px)` per non uscire dallo schermo su telefoni stretti.
- **Planimetria touch**: tutta l'interazione in `FloorPlan.tsx` usa Pointer Events (`onPointerDown`/`pointermove`/`pointerup`, non `onMouseDown`) + `touchAction: 'none'` sugli elementi trascinabili, così trascinare una stanza/asset non fa anche scorrere la pagina o attivare gesture del browser.
- **Rete di sicurezza globale**: `html, body { overflow-x: hidden; max-width: 100vw }` per evitare che un singolo elemento non ancora reso responsive faccia scorrere l'intera pagina lateralmente.

Limite noto: `MOBILE_CSS` ha un'unica soglia (860px), non breakpoint intermedi per tablet — accettabile finché l'uso reale resta desktop/telefono, vedi `backlog.md` se emerge un caso tablet.
