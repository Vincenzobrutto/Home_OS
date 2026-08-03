# Changelog

Modifiche rilevanti per sessione di sviluppo, più recenti in cima. Non è un elenco di ogni commit — vedi `git log` su https://github.com/Vincenzobrutto/Home_OS per quello — ma delle decisioni/feature che cambiano il comportamento dell'app o il modello dati.

## 2026-08-03 (10) — B18 messa in standby

- Su indicazione dell'utente, le notifiche esterne per manutenzioni/garanzie restano in roadmap ma non sono pianificate: nessuna scelta di provider, canale o frequenza è approvata e non va iniziata finché non viene riattivata.

## 2026-08-03 (9) — B22, manutenzioni completate da documento

- Claude distingue gli interventi già eseguiti da preventivi, manuali e appuntamenti ed estrae attività, data, quantità e note.
- L'Inbox propone i piani compatibili su più Asset della stessa casa, preselezionati entro la quantità dichiarata; l'utente può correggere Asset e data prima di confermare.
- La conferma multipla è atomica: crea occorrenze ed eventi cronologia, collega lo stesso documento e aggiorna le prossime scadenze. Duplicati e piani di un'altra casa vengono bloccati.
- Aggiunti due endpoint e test backend; baseline aggiornata a 26 test verdi. Vedi `decisions.md` #24.

## 2026-08-03 (8) — design affinato: monitoraggio consumi elettrici

- **B25 aggiornata** da spunto generico a design completo, dopo una sessione di discussione con l'utente (nessun codice scritto): entità dedicata `UtilityBill`, solo elettricità in v1, istogramma mensile con confronto anno-su-anno per rispettare la stagionalità, badge colorati per categoria sotto i mesi in cui è stato installato un nuovo Asset (correlazione visiva, non attribuzione numerica finta). Deciso esplicitamente di NON stimare un risparmio in € per Asset in v1 finché non ci sono numeri verificati con fonti reali (stessa lezione della caldaia, `decisions.md` #20/#21).
- Validato un mockup visivo del grafico con l'utente prima di scrivere la specifica in `backlog.md`.

## 2026-08-03 (7) — anteprima nuovo look&feel su Dashboard (placeholder)

- **Dashboard**: nuova palette blu/verde acqua e badge circolari colorati per categoria (icona dell'Asset dentro un cerchio con tinta diversa per tipo), applicata SOLO qui come anteprima — il resto dell'app resta sullo stile "carta/inchiostro" attuale. Vive in un oggetto locale `PT`/`CATEGORY_COLORS` dentro `Dashboard.tsx`, non ancora in `theme.ts`.
- **`GET /houses/:id/maintenance-reminders`**: la select dell'Asset ora include anche `type` (serviva per scegliere l'icona di categoria giusta nei promemoria di manutenzione in Dashboard).
- Rimane un placeholder in attesa di ulteriore riflessione dell'utente prima di decidere se propagarlo al resto dell'app — vedi `backlog.md` B31.

## 2026-08-03 (6) — implementazione backlog, Fascia 1 completata

- **B21**: aggiunte le label "Ricorrenza", "Ogni quanti", "Preavviso (giorni)" nel form piano di manutenzione — i campi erano numeri senza contesto.
- **B19**: il dismiss di un suggerimento di manutenzione è ora persistito (nuova tabella `DismissedMaintenanceSuggestion`, endpoint `POST /assets/:id/maintenance-suggestions/:code/dismiss`) invece che solo nello state del browser — verificato che sopravvive a un reload della pagina. Vedi `decisions.md` #22.
- **B14**: tipizzata la risposta di `/v1/messages` in `claude-extraction.service.ts` invece di lasciarla `any` — risolti tutti i 12 errori lint. Corretti "di rimbalzo" (stesso pattern) anche i 2 warning in `documents.service.ts` e 1 in `main.ts`. `npm run lint` backend ora 0 errori/0 warning.
- **B17**: corretto un bug reale di matching documento→asset — una singola parola condivisa (es. la marca "Bosch") non basta più a far scambiare due prodotti diversi ("Frigorifero Bosch" vs "Forno Bosch Serie 8"); ora serve più di una parola in comune, oppure una parola di prodotto riconosciuta (`PRODUCT_WORDS`). Aggiunto test di regressione che riproduce il bug prima del fix. Vedi `decisions.md` #23.

## 2026-08-03 (5) — verifica web delle rimanenti linee guida di manutenzione

- **`clima-filtri`**: intervallo corretto da 6 a **2 mesi** (preavviso 14→7 gg) — i produttori (Daikin, Mitsubishi Electric) consigliano 1-2 mesi durante l'uso, molto più frequente di quanto scritto inizialmente.
- **`clima-tecnica`**: intervallo confermato (1 anno), ma corretta un'affermazione fuorviante — non è un obbligo di legge per la maggior parte dei climatizzatori domestici (soglia F-Gas 517/2014 raramente raggiunta), solo manutenzione consigliata.
- **`fotovoltaico-pulizia`**: intervallo confermato (1 anno), aggiunta la soglia reale dell'unico obbligo esistente (Delibera ARERA 78/2016, sopra 11,08 kW, non riguarda la pulizia).
- **`elettrico-verifica`**: intervallo confermato (5 anni), chiarito che il DPR 462/2001 riguarda soprattutto luoghi di lavoro/contesti specifici, non la casa privata tipica.
- Test aggiornati (22/22 verdi), verificato via API sul climatizzatore reale usato nei test precedenti. Vedi `decisions.md` #21.

## 2026-08-03 (4) — verifica fonte linea guida caldaia

- **Correzione dato non verificato**: la cadenza del "Controllo fumi ed efficienza energetica" per CALDAIA era ogni 1 anno, scritta da conoscenza generica senza fonte. Dopo una ricerca web esplicita, corretta a **ogni 2 anni** (DPR 74/2013, cadenza tipica per potenza domestica <35 kW secondo la normativa Lombardia — le altre regioni possono variare). Descrizione della linea guida aggiornata per citare la fonte invece di restare generica. Vedi `decisions.md` #20.
- **Motivo**: l'utente ha chiesto esplicitamente affidabilità e fonte di ogni linea guida introdotta nella sessione precedente — nessuna era stata verificata con una ricerca reale, solo scritta con linguaggio prudente. Corretto solo il caso marcato obbligatorio (il più delicato); le altre linee guida (CLIMA, FOTOVOLTAICO, ELETTRICO) restano non verificate e dichiarate tali.

## 2026-08-03 (3) — suggerimenti automatici di manutenzione

- **Nuovo endpoint** `GET /assets/:id/maintenance-suggestions`: propone piani di manutenzione basati su linee guida statiche per tipo di Asset (CLIMA, CALDAIA, FOTOVOLTAICO, ELETTRICO), con la prima scadenza calcolata da `installedAt` (fallback `purchasedAt`, poi data di creazione della scheda) + l'intervallo della linea guida — es. climatizzatore installato il 24/07/2025 con pulizia filtri ogni 6 mesi → prima scadenza proposta 24/01/2026.
- **UI**: nel dettaglio Asset, sezione "Manutenzione" mostra le proposte con badge "Suggerita", motivazione della data e due azioni — "Aggiungi" (apre il form già compilato, l'utente conferma o modifica prima di salvare) e "Ignora" (nasconde la proposta solo per la sessione corrente). Una proposta sparisce da sola una volta creato un piano con lo stesso titolo.
- **Nessuna scrittura automatica**: coerente con "l'AI propone, l'utente conferma" — qui applicato a una regola fissa, non a un'estrazione AI. Vedi `decisions.md` #19.
- **Test e build**: 22/22 test backend (5 nuovi sulla funzione pura di calcolo), build/lint puliti; verificato end-to-end nel browser su un climatizzatore reale (suggerimento → form pre-compilato → salvataggio → sparizione del suggerimento).

## 2026-08-03 (2) — piani di manutenzione programmata

- **Piani per Asset**: creazione e modifica di manutenzioni una tantum o ricorrenti ogni N giorni/mesi/anni, con prima scadenza, preavviso, tecnico abituale, obbligatorietà, descrizione e note.
- **Ciclo operativo**: completamento esplicito con data, contatto, documento e note; esecuzione e cronologia salvate atomicamente, prossima scadenza ancorata al calendario previsto. Sospensione, riattivazione ed eliminazione sicura senza perdita dello storico.
- **Dashboard**: manutenzioni imminenti e scadute visibili insieme agli altri promemoria e cliccabili verso l'Asset; gli Asset dismessi non generano avvisi.
- **Modello/API**: nuove entità `MaintenancePlan`/`MaintenanceOccurrence`, migrazione Prisma e modulo NestJS dedicato; riferimento REST aggiornato.
- **Test e build**: 18/18 test backend e build backend/frontend pulite; frontend lint invariato con 3 warning pre-esistenti. Aggiunti 10 test sulle regole temporali, ricorrenza e fine mese.

## 2026-08-03 — prima copertura delle regole di dominio backend

- **Test Asset**: aggiunti test Jest per il calcolo deterministico di `DUE`, `ATTENTION` e `OK` e per la garanzia predefinita di 24 mesi senza mutare la data di acquisto.
- **Test pipeline documentale**: aggiunti test per matching tipo+nome, assenza di suggerimenti quando il nome non coincide, nessuna scrittura durante la classificazione e applicazione dei campi solo dopo conferma esplicita.
- **Protezione dati esistenti**: verificato che la conferma non sovrascrive un campo strutturato già valorizzato, non lo duplica come campo libero e applica la garanzia predefinita quando arriva la data di acquisto.
- **Baseline verificata**: backend build e 8 test puliti; frontend build e lint puliti salvo i 3 warning già noti; restano i 12 errori e 4 warning lint backend pre-esistenti.

## 2026-08-02 (3) — repository pubblicato su GitHub

- **Git inizializzato e pushato**: primo commit (135 file) su https://github.com/Vincenzobrutto/Home_OS, branch `main`. Trovato e rimosso prima del commit un problema reale: `.claude/settings.local.json` conteneva la password del database in chiaro in una riga di permessi salvata in una sessione precedente — ora escluso in `.gitignore` root. Vedi `decisions.md` #17.
- **Identità Git locale**: impostata a `Vincenzo Brutto <bruttovincenzo@gmail.com>` (solo per questo repository, non globalmente).
- **Protocollo di coordinamento multi-agente**: aggiunta una regola in `AGENTS.md` — ogni assistente fa `git fetch` e confronta con `origin/main` prima di iniziare a lavorare, per accorgersi se un altro assistente (es. Codex) ha pushato modifiche nel frattempo.
- **Workflow di sincronizzazione concordato con l'utente**: commit + push automatici dopo ogni modifica rilevante, senza richiedere conferma ogni volta (preferenza esplicita, salvata anche nella memoria dell'assistente).

## 2026-08-02 (2) — preparazione al passaggio di consegne

- **`docs/HANDOFF.md`**: nuovo documento di consegna (stato, funzionalità, comandi, problemi noti, debito tecnico, prossimi passi).
- **`.gitignore`**: aggiunto `.gitignore` di root (era assente); `backend/.gitignore` esteso con `coverage/`, `.env.*`; `frontend/.gitignore` corretto — mancava del tutto `.env`/`.env.*` (bug reale: un `.env` frontend non sarebbe stato escluso dal futuro repository Git).
- **`frontend/.env.example`**: nuovo file, documenta `VITE_API_URL` (opzionale, non esisteva prima nessun `.env.example` per il frontend).
- **`backend/.env.example`**: aggiunta `FRONTEND_ORIGIN` (opzionale, era usata nel codice ma non documentata — chiudeva `backlog.md` B5).
- **Verifica build/lint/test**: eseguiti su backend e frontend, nessuna modifica funzionale necessaria. Risultati: backend build ✅, test ✅ (solo scaffold), lint 12 errori pre-esistenti (`claude-extraction.service.ts`, risposta Claude tipata `any`); frontend build ✅, lint 3 warning (`exhaustive-deps`), nessuno script `test` configurato. Dettaglio completo in `docs/HANDOFF.md`.
- **Verifica avvio da README**: confermato che `npm install && npx prisma migrate deploy && npm run start:dev` (backend) e `npm install && npm run dev` (frontend) funzionano come documentato — nessuna modifica necessaria al quickstart, solo aggiunta la sezione "Lint, build, test".
- **Aggiornamento documentazione**: `README.md`, `architecture.md`, `roadmap.md`, `backlog.md` aggiornati per riflettere lo stato verificato (test frontend assenti, non solo "scaffold"; nuove voci di debito tecnico B14–B16 da lint/build).

## 2026-08-02

- **Documentazione di progetto per collaborazione multi-assistente**: creati `README.md`, `docs/` (vision, architecture, domain-model, api, ui-ux, roadmap, decisions, backlog, changelog), `prompts/` (coding-guidelines, conventions), `AGENTS.md` + `CLAUDE.md`.
- **Dashboard → Asset**: cliccare un promemoria in Dashboard porta ora direttamente al dettaglio dell'asset corrispondente (`Dashboard.tsx`, `App.tsx`).
- **Rotazione planimetria**: nuovo pulsante "Ruota" (90° per volta) in `FloorPlan.tsx`. Ruota le coordinate persistite di ambienti e asset (non solo la vista), mantenendo ogni asset nella stanza a cui è assegnato. Nuovo campo `House.floorPlanRotation` (migrazione `20260802142034_add_house_floor_plan_rotation`) usato per ri-ruotare l'immagine di sfondo raster in modo coerente. Vedi `decisions.md` #10.
- **Fix selezione asset vicino ai vertici stanza**: corretto z-index dell'icona asset (`FloorPlan.tsx`) che veniva intercettata dagli handle di ridimensionamento. Vedi `decisions.md` #15.
- **`createdAt`/`updatedAt` visibili in UI**: aggiunta riga "Creato il / ultima modifica il" nel dettaglio Asset (`Assets.tsx`) — i campi esistevano già nello schema, non erano solo esposti.
- **App raggiungibile da cellulare in LAN**: CORS backend `origin: true`, base URL API calcolato da `window.location.hostname` nel frontend, Vite con `server.host: true`. Vedi `decisions.md` #12.
- **Fix suggerimento asset da documento**: il matching documento→asset ora richiede tipo uguale **e** nome simile, non più "il primo asset di quel tipo" (causava il suggerimento sempre sbagliato con più elettrodomestici in casa). Sotto la soglia di confidenza (~50%), nessun suggerimento invece di uno arbitrario. Vedi `decisions.md` #7, #8.
- **Ottimizzazione mobile**: sidebar a scomparsa (drawer) sotto 860px, griglie responsive, fix overflow modali, supporto touch (Pointer Events) sull'intera planimetria interattiva. Vedi `ui-ux.md`.
- **Scelta ambiente alla creazione asset da Inbox**: il mini-form di creazione asset da documento non riconosciuto include ora la selezione dell'Ambiente, per non far finire ogni nuovo asset in "Documenti casa". Vedi `decisions.md` #9.

## Prima di questa sessione

Storia non tracciata in questo changelog (il repository non era ancora un progetto Git — vedi `backlog.md` B3). Per il contesto di progettazione originale vedi `START_HERE.md` e `architettura/homeos_architettura_tecnica.md`; il grosso del modello dati e delle feature elencate come "già implementate" in `roadmap.md` (M1) proviene da sessioni precedenti non documentate qui.
