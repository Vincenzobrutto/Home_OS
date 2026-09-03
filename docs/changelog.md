# Changelog

Modifiche rilevanti per sessione di sviluppo, più recenti in cima. Non è un elenco di ogni commit — vedi `git log` su https://github.com/Vincenzobrutto/Home_OS per quello — ma delle decisioni/feature che cambiano il comportamento dell'app o il modello dati.

## 2026-09-03 — Roadmap di prodotto v6: memoria prima della compliance

- Confermate le fondazioni tecniche normative già avviate, ma riordinata la roadmap di prodotto: Memoria della casa → Fiducia → Recupero rapido → Check-up → Compliance.
- Definite dieci fasi operative (0–9), dalla validazione continua al pilota Lombardia/Piemonte, con marketplace, altre regioni, benchmark e IoT in standby.
- Aggiunte B46–B51: validazione utenti, Memory Core, affidabilità della memoria, ricerca unificata, cartella clinica Asset ed export/privacy/portabilità.
- Riposizionate B41–B44: B41 resta P0 come fondazione; Genesis 2.0 e Stato adempimenti sono P1; Home Score v2 è P2 e misura affidabilità del record, non conformità.
- Nessuna modifica al codice o allo schema in questa voce; ADR #45 registra la priorità e impedisce che la compliance diventi l'identità principale di Dimora.

## 2026-09-03 (2) — Verifica B41 (Codex)

Recuperato e verificato da GitHub il commit di Codex che implementa le fondazioni tecniche del check-up adempimenti v6 (vedi voce sotto): revisione approfondita dello schema/migrazione (backfill `MaintenancePlan.houseId` sicuro, vincolo XOR e indice univoco "un solo libretto attivo" a livello database, nessun endpoint scrive ancora codici libretto in chiaro — cifratura correttamente rimandata), dei motori puri (`fgas.ts`/`ape-state.ts`, nessuna soglia normativa hardcoded, sempre passata da `RegulatoryRule`) e degli ADR registrati (#38-44, coerenti con `decisions.md` #35/#37).

**Trovati e corretti 2 errori di build reali** (il changelog del commit dichiarava "build pulita" ma `nest build`/`tsc` falliva, a differenza di `npm test` che passava già): `ComplianceController` usava il tipo `Request` di Express invece di `AuthenticatedRequest` (introdotto in B2), rendendo `req.user` inesistente a livello di tipi; `MaintenanceService.planOrThrow` non restituiva un tipo con `assetId` non nullable nonostante il controllo a runtime lo garantisse, causando un mismatch in due scritture (`MaintenanceOccurrence`/`AssetTimelineEvent`, che richiedono `assetId` obbligatorio anche dopo la generalizzazione di `MaintenancePlan`).

Migrazione applicata al database reale: nessun dato perso, l'unico `MaintenancePlan` esistente retrocompilato correttamente (`houseId` dalla propria casa, `subjectType: ASSET`, `origin: USER`). Verificato dal vivo `GET /houses/:houseId/compliance` sulla casa reale: risposta onesta (`UNKNOWN`, copertura 0/1, nessuna fonte, disclaimer obbligatorio presente) coerente con l'assenza di impianti termici/regole normative attive oggi. Build/lint puliti, 76/76 test.

## 2026-09-03 — Check-up adempimenti v6: primo incremento tecnico

- Registrati gli ADR che aggiornano B37: `ThermalSystem` ristretto, libretto a livello impianto, resolver separati, regole versionate, piani generalizzati, Stato adempimenti separato dallo score e demo Genesis separata dal percorso reale.
- Aggiunti `EvidenceStatus`, territori/regole normative versionate, `ThermalSystem`, `PlantBooklet`, `EfficiencyControlReport` e `PlantResponsibility`; Asset esteso con collegamento termico e dati F-gas.
- `MaintenancePlan` ora appartiene sempre alla casa e a un solo soggetto House/ThermalSystem/Asset, con origine, regola, snapshot e chiave idempotente; migrazione retrocompila i piani esistenti come Asset/USER senza inventare provenienza.
- Aggiunti motori puri conservativi per evidenza, F-gas, APE, validazione regole e conflitti territoriali. Regole non ACTIVE o incomplete non sono eseguibili; una riga evidenza mancante resta UNKNOWN.
- Nuovo `GET /houses/:houseId/compliance`: valutazione read-only con copertura, controlli, fonti e disclaimer obbligatorio; non genera piani e resta UNKNOWN quando mancano dati o regole attive.
- Nessun seed regionale o claim normativo attivato: Lombardia/Piemonte restano subordinati a fonti primarie aggiornate e revisione professionale. Verifica: schema Prisma valido, backend build pulita, 76/76 test.

## 2026-08-25 (5) — Fix: creare una seconda casa rompeva il completamento di Genesis

Bug reale trovato creando la prima seconda casa mai esistita nel database (per simulare un nuovo utente riusando documenti già analizzati, senza consumare altro credito AI): `RoomsService.create()` generava `AMB-001` contando le stanze della sola casa nuova, ma `Room.code` è unico su tutta la tabella — collideva con l'`AMB-001` già esistente nella prima casa. Il wizard Genesis falliva con "Internal server error" al primissimo ambiente, sia per lui che per la creazione manuale di un ambiente. Corretto usando lo stesso pattern già in produzione per `Asset.code`: il prossimo numero si calcola dal massimo esistente su tutta la tabella, non da un conteggio per casa — vedi `decisions.md` #37. Nessuno stato parziale da riparare (l'errore fermava tutto al primo tentativo); verificato dal vivo completando con successo Genesis sulla seconda casa (11 ambienti, 16 asset, Home Score 80).


## 2026-08-25 (4) — Verifica B36 (Codex)

Recuperato e verificato da GitHub il commit di Codex che implementa B36 (Property Profile strutturato, vedi voce sotto): merge fast-forward pulito, `npx prisma generate` (necessario dopo il pull, il client generato non è nel repo), build/test puliti su entrambi i lati (65/65), migrazione `20260825160000_add_property_profile` applicata al DB reale — puramente additiva, dati esistenti della casa reale verificati intatti dopo l'applicazione. Revisione del codice: `HouseFieldProvenance`/`changedPropertyFields` seguono correttamente il pattern origine/conferma di B38, incluso il controllo "solo se il valore è davvero cambiato" (lo stesso bug corretto in B38 non si è ripetuto qui). Verificato dal vivo: vista "Profilo casa" con i dati reali già presenti, aggiornamento di un campo tramite l'endpoint `PATCH .../property-profile` con badge di provenienza corretto — valore di prova rimosso subito dopo la verifica.

## 2026-08-25 (3) — B36: Property Profile strutturato

- Nuova vista **Profilo casa** con dati identificativi, fisici, catastali, APE e agibilità, organizzati per fonte tipica e modificabili dall'utente.
- `House` estesa con campi tipizzati e migrazione additiva; completezza calcolata sui dati essenziali, senza confondere le diverse definizioni di superficie.
- Nuova `HouseFieldProvenance`: modifiche manuali `DECLARED`, valori confermati da documenti `EXTRACTED`, con documento/utente/data visibili tramite badge.
- Claude riconosce `property_profile` per visure, APE, atti, agibilità e relazioni tecniche. Inbox permette revisione/correzione; la conferma riempie solo campi vuoti e segnala i conflitti senza sovrascrivere.
- Verifica: backend build/lint puliti e 65/65 test; frontend build pulita e lint senza errori (restano i 3 warning hook storici).

## 2026-08-25 (2) — B37: discovery su `System`, nessuna migrazione + un doppione corretto

Discovery richiesta dal backlog prima di scrivere codice: nessuna entità `System` introdotta, il bisogno non è emerso sull'unico caso reale disponibile (fotovoltaico e climatizzatori confermati come Asset indipendenti, nessuna scomposizione necessaria) — dettaglio in `decisions.md` #35. Rimane una decisione provvisoria (n=1, non i ~10 casi auspicati), da riaprire con altri utenti reali.

- Trovato durante la discovery e corretto con conferma dell'utente: due Asset `ELETTRICO` "Impianto elettrico" sulla stessa casa erano un doppione, non due impianti reali — quello vuoto (0 campi/documenti/interventi, probabile artefatto di una scansione Genesis) è stato eliminato, nessun dato perso.
- `backlog.md` B37 non chiuso ma riclassificato a priorità bassa, in attesa di altri casi.


## 2026-08-25 — B38: provenienza campo-per-campo per gli Asset

Priorità più alta rimasta nell'allineamento Dimora (sbloccata da B2), limitata in v1 agli **Asset** — Room/House restano fuori scope.

- `FieldSource` rinominato `MANUAL`/`AI_EXTRACTED` → `DECLARED`/`EXTRACTED`/`ATTESTED` (terzo valore predisposto per una futura verifica terza, nessun flusso lo scrive ancora).
- Nuova tabella `AssetFieldProvenance` per i 7 campi strutturati di Asset (marca, modello, seriale, date, fornitore); `AssetCustomField` estesa con documento sorgente, chi e quando ha confermato.
- `documents.service.ts` (conferma documento) ed `assets.service.ts` (modifica manuale) scrivono la provenienza corretta ad ogni scrittura.
- Nuovo badge `ProvenanceBadge` in `Assets.tsx`: icona + tooltip ("Dichiarato da...", "Estratto da [documento], confermato da... il...") su ogni campo che ha un record di provenienza — assente sui valori scritti prima di questa modifica (provenienza sconosciuta, non un errore).
- **Bug trovato in verifica e corretto**: la prima versione ri-etichettava come "appena dichiarato" qualunque campo presente nel form di modifica, anche se invariato (il form rimanda sempre tutti i 7 campi) — ora scrive provenienza solo se il valore è davvero cambiato rispetto a quello esistente.
- Migrazione additiva, nessun backfill dei valori già esistenti; test estesi in `documents.service.spec.ts`; verificato dal vivo (modifica manuale → badge "Dichiarato", pulizia degli asset di test usati per la verifica).


## 2026-08-24 (3) — Palette "Smeraldo": UI più vivida

Su richiesta dell'utente di colori più vivaci, proposte 3 direzioni via artifact (mockup della Dashboard reale) — l'utente ha scelto "Smeraldo", evoluzione satura della palette esistente.

- `theme.ts`: stessi token (`pine`/`ochre`/`rust`/`paper`/`card`/`slate`/`line`/`ink`), valori più saturi — verde smeraldo `#0E8A5F` (era `#2C5C4C`), marigold `#F2A93B` (era `#C4842A`), corallo `#E4572E` (era `#A94A2E`), sfondo quasi bianco `#F5F6EF` (era beige `#F1F1EC`). Propagato automaticamente a tutti i componenti, nessuna modifica oltre a `Dashboard.tsx`.
- Trovato e rimosso un esperimento di palette isolato lasciato in `Dashboard.tsx` (blu/verde acqua, mai promosso a `theme.ts`) che avrebbe reso la Dashboard incoerente con il resto dell'app — vedi `decisions.md` #33.
- Verificato dal vivo: Dashboard e Asset coerenti con la nuova palette, build/lint puliti.


## 2026-08-24 (2) — Nome utente-facing allineato a Dimora

Esecuzione pratica di `decisions.md` #31 (Dimora = nome di prodotto, HomeOS = nome tecnico del repository): i punti dell'interfaccia dove il nome compare davvero all'utente ora dicono "Dimora" — titolo scheda browser, intestazione Sidebar, `LoginScreen`, `BootstrapScreen`, testo di benvenuto del wizard Genesis, messaggio a vuoto di Consumi elettrici. Commenti di codice, prompt di estrazione AI, README e nomi tecnici (repository, package, cartelle) restano "HomeOS" — non è un rename tecnico, solo del testo mostrato all'utente. Verificato dal vivo: titolo tab e sidebar mostrano "Dimora" dopo login, dati reali invariati.

## 2026-08-24 — B2: autenticazione e sessione reale sulle API

Chiude il buco di sicurezza aperto fin dall'MVP: prima ogni endpoint si fidava ciecamente di un `userId`/`houseId` passato dal client, `GET /users` elencava tutti gli utenti, e chiunque raggiungesse il backend poteva leggere/modificare qualunque casa.

- **Login reale**: `LoginScreen` sostituisce il bootstrap automatico "prendi il primo utente" — email → login (account con password) / imposta password (account pre-esistenti senza, migrazione self-service) / registrazione (account nuovo). Sessione via cookie httpOnly `sid` + tabella `Session`, password con `crypto.scrypt` nativo di Node.
- **Autorizzazione per-casa reale**: ogni rotta è protetta di default (`AuthGuard` globale); l'accesso a una casa verifica `HouseMembership` (non più solo `House.ownerId`), su rotte dirette e su quelle per id di risorsa (assets, documents, rooms, ecc. — risolvendo `houseId` dalla risorsa). Le case esistenti hanno ricevuto una `HouseMembership` `OWNER` retroattiva (backfill automatico al boot).
- **OAuth Gmail/Drive legato alla sessione**: `connect`/`callback` usano l'utente della sessione invece di un `userId` in query — prima chiunque poteva agganciare il proprio account Google a un `userId` altrui. Il parametro `state` verso Google è ora un nonce CSRF, non più l'id in chiaro.
- **Rimosso il modulo `users`**: `POST /users` (creava account senza password) e `GET /users` (elencava tutti gli utenti) non avevano più un caso d'uso legittimo — la creazione utenti vive ora in `AuthService`.
- Nessuna perdita di dati: verificato dal vivo che la casa reale (73 Home Score, 15 ambienti, 23 asset) resti intatta e accessibile dopo il login con la nuova password.
- Nuova migrazione (`User.passwordHash`, modello `Session`), nuova dipendenza `cookie-parser`, 64/64 test backend, build/lint puliti su entrambi i lati. Dettaglio completo delle scelte in `decisions.md` #32.

## 2026-08-23 — Allineamento strategico HomeOS → Dimora

- Chiarito che Dimora è il nome/posizionamento di prodotto e HomeOS il nome tecnico storico del repository: un solo prodotto, due livelli di descrizione.
- Definito il Property Digital Record come core; Digital Twin, Home Score, manutenzioni, consumi e futuri agenti sono esperienze alimentate dal record.
- Separato esplicitamente ciò che è implementato, parziale e futuro, evitando di presentare trasferimento, record verificato e integrazioni regolatorie come capacità attuali.
- Aggiunte EPIC 10 (Property Record & Provenance) ed EPIC 11 (Ownership & Transfer), con attività B36–B39.
- Nessun cambiamento a codice, schema Prisma o comportamento applicativo in questa sessione.

## 2026-08-04 (10) — Fix bollette: race condition "Analizza con AI" e periodi non precompilati

Due bug reali segnalati dall'utente dopo il primo utilizzo con bollette vere:
- **Race condition su "Analizza con AI"**: `Inbox.tsx` teneva lo stato "in analisi" in un singolo `analyzingId: string | null` invece del pattern `Set<string>` già usato per ogni altra azione del file (`busyDocIds`) — analizzare un secondo documento prima che il primo finisse sovrascriveva lo stato del primo, facendo tornare la sua label a "Analizza con AI" mentre l'analisi era ancora in corso. Convertito in `analyzingIds: Set<string>`.
- **Periodo/consumi non precompilati nel form di conferma bolletta**: causa reale diversa da quella apparente. Il modello estraeva correttamente periodo e consumo (verificato con chiamate dirette all'API Claude sullo stesso documento, 100% di successo su più tentativi), ma `documents.service.ts` scartava l'intero periodo in fase di classificazione: il campo `amount` arrivava come stringa con virgola italiana (es. `"95,48"`, coerente con come l'importo appare sulla bolletta), `Number("95,48")` produce `NaN`, e il filtro `Number.isFinite(amount)` buttava via l'intero periodo pur avendo consumo e date validi — da qui il form vuoto che chiedeva di reinserire tutto a mano. Corretto in due punti: prompt di estrazione ora richiede esplicitamente numeri JSON con punto decimale (mai stringhe, mai virgola) per `consumptionKwh`/`amount`; `documents.service.ts` normalizza comunque una virgola decimale prima di convertire in numero, per non perdere un periodo valido se il modello sbaglia formato. Le 12 bollette già caricate dall'utente sono state ri-analizzate: 11 ora hanno periodo/consumo/importo corretti, la dodicesima è tornata a `PENDING` per credito API esaurito durante il test (comportamento corretto del gestore errori, non un bug).

## 2026-08-04 (9) — Verifica B25 (Codex)

Recuperato e verificato da GitHub il commit di Codex che implementa B25 (monitoraggio consumi elettrici YoY, vedi voce sotto e `decisions.md` #30): build/lint/test su entrambi i lati, 64/64 test, migrazione `20260804143000_add_utility_bills` applicata (puramente additiva, FK con cascade coerenti). Revisione del codice: pipeline di estrazione/conferma bollette ben guardata (blocca doppie conferme, periodi sovrapposti, ordine date invertito), matematica di ripartizione pro-rata verificata dai test (bolletta bimestrale 16gen–14feb → 160+140 kWh), UI fedele al mockup validato in sessione precedente. Nessuna correzione necessaria. Verificato dal vivo lo stato vuoto della vista "Energia" (nessuna bolletta ancora confermata); non replicato un caricamento reale end-to-end per mancanza di un PDF bolletta di prova.

## 2026-08-04 (8) — B25, monitoraggio consumi elettrici YoY

- Claude riconosce le bollette elettriche e propone fornitore, periodi, kWh e importi; l'utente corregge ogni valore prima della conferma.
- Nuova entità `UtilityBill`, collegata a casa e documento originale; conferma dei periodi e del documento atomica.
- Vista Energia con barre anno selezionato/precedente, variazione YoY e Asset installati nel mese cliccabili.
- Periodi plurimensili ripartiti per giorni e marcati con `~`, mai presentati come misure mensili reali.
- Nuova migrazione, 2 endpoint e 5 test; baseline backend 64/64.

## 2026-08-04 (7) — Sync con le evoluzioni di Codex + fix

Recuperate da GitHub e verificate le 3 evoluzioni Genesis di Codex (catalogo demo ampliato/selezionabile, ripresa precisa B34, trend storico Home Score — vedi voci sotto): build/lint/test su entrambi i lati, 59/59 test, migrazione `20260804120000_add_genesis_step` applicata e verificata additiva. Nessuna regressione: la deduplica (B33) e le rifiniture di usabilità della sessione precedente sono state preservate ed estese, non riscritte.

- **Fix trovato in verifica**: nello stepper del wizard, `textDecoration` (shorthand) mescolato con `textDecorationColor` (longhand) — React lo segnala come rischio di bug di stile. Sostituito con `textDecorationLine`, tutto longhand.
- Verificato live: catalogo demo selezionabile, ripresa precisa dello step, grafico trend Home Score — tutti funzionanti sulla casa reale.

## 2026-08-04 (6) — Trend storico Home Score

- La Dashboard mostra l'andamento degli ultimi 12 mesi per score totale e cinque dimensioni, con valori sempre leggibili anche su mobile.
- “Aggiorna Home Score” ricalcola score e Home Detective sui dati correnti; crea una nuova rilevazione solo se valori o versione cambiano.
- Evidenziata la variazione dall'ultimo snapshot e segnalata la presenza di versioni diverse dell'algoritmo.
- Due endpoint e due test backend; baseline 59/59.

## 2026-08-04 (5) — B34, ripresa precisa del wizard Genesis

- Tutti i 6 step sono ora persistiti in `House.genesisStep`, incluse le navigazioni all'indietro.
- Chi chiude durante Documenti riparte da Documenti; chi chiude durante Revisione ritrova ultima `ScanSession` e relative `Observation`.
- Il backend impedisce salti arbitrari in avanti e ripiega su Scansione se una Review non ha una sessione recuperabile.
- Nuovi endpoint `resume`/`step`, migrazione additiva e 2 test backend; baseline 57/57.

## 2026-08-04 (4) — Genesis non più modellata su una sola casa

- Il dataset dimostrativo passa da 4 a 14 ambienti e da 7 a 25 Asset/impianti comuni.
- Lo step Scansione mostra un catalogo selezionabile: solo gli elementi scelti entrano nella proposta, evitando di imporre all'utente decine di dati finti da scartare.
- Gli Asset legati a una stanza compaiono solo quando quella stanza è selezionata; gli impianti a livello casa restano sempre disponibili.
- Nuovo endpoint catalogo e supporto a `roomNames`/`assetNames` nel comando di scansione. Aggiunto test sul filtro del provider mock; backend 55/55 test.

## 2026-08-04 (3) — Genesis: rifiniture usabilità dal walkthrough

Seguito ai punti medi/bassi del walkthrough di usabilità (dopo B33):
- **Stepper del wizard cliccabile all'indietro**: si può tornare a uno step già superato per correggere qualcosa, senza dover uscire dal percorso. Non si può saltare avanti a step non ancora raggiunti.
- **Nome svuotato per errore durante la modifica**: non causa più un errore di validazione poco chiaro all'invio — ricade sul nome originariamente proposto, sia chiudendo la modifica col blur sia ricliccando la matita.
- **Pannello "Dettagli"** per ogni elemento proposto nello step di revisione: categoria in italiano, e per i possibili duplicati il codice dell'elemento reale esistente (es. "AMB-004") per poterlo controllare nella sua scheda — la scansione resta dimostrativa, dichiarato esplicitamente che non ci sono foto reali da mostrare.
- **Dashboard**: le card "Consigliato" ora sono cliccabili verso l'asset collegato (tramite l'Issue associata), come già le card "Da tenere d'occhio".
- **Step "Documenti"**: nuovo pulsante per rimuovere un documento caricato per errore (riusa l'endpoint "scarta" già usato in Inbox) — nascosto per i documenti già `CONFIRMED`, che il backend non permette di scartare da qui. Aggiunto anche un indicatore di caricamento.
- **Accessibilità**: le etichette del form "La tua casa" ora sono associate ai campi (`htmlFor`/`id`).
- **Home Score card**: `flexWrap` per non stringere il layout su schermi molto stretti.

Verificato live nel browser sulla casa reale: navigazione a ritroso funzionante, pannello Dettagli mostra correttamente categoria e codice del duplicato, pulsante rimuovi assente sui documenti già confermati. Backend 54/54 test invariati, build/lint puliti su entrambi i lati.

## 2026-08-04 (2) — Genesis: deduplica contro dati esistenti (B33)

- Trovato durante un walkthrough di usabilità sul wizard Genesis appena mergeato: la conferma di una scansione demo su una casa con dati reali preesistenti duplicava sistematicamente ambienti/asset con nomi simili (verificato: tutti e 4 gli ambienti demo e diversi asset coincidevano con dati già censiti).
- **`genesis-duplicate.ts`** (nuovo, funzione pura testata): segnala un possibile duplicato (stesso tipo + nome simile) confrontando ogni Observation con i Room/Asset già confermati in casa.
- **Step di revisione**: un elemento con un possibile duplicato mostra un avviso e parte su "Scarta" invece di "Conferma" — sempre annullabile con un click. Nessuna fusione automatica in nessun caso.
- Quando una Room duplicata resta scartata, gli Asset dello stesso batch che la referenziano per nome si collegano comunque alla Room reale, non finiscono orfani come "impianto di casa".
- Verificato live: scansione di prova sulla casa reale → 10/10 elementi correttamente segnalati (inclusi match su nomi specifici come "Forno a microonde Samsung MC28H5015AS"); rifiuto di tutti e 10 → nessuna riga creata; stato ripristinato identico a prima del test.
- Vedi `decisions.md` #26. Backend: 54/54 test (3 nuovi + 3 di regressione aggiornati), build/lint puliti su backend e frontend.

## 2026-08-04 — HomeOS Genesis MVP

- **Vertical slice completo**, su richiesta esplicita dell'utente dopo un'analisi di repository che ha flaggato il blocco reale (nessuna autenticazione, isolamento per utente non applicabile) e le sovrapposizioni con entità esistenti — utente ha accettato lo scope. Vedi `decisions.md` #25.
- **Schema**: `House`/`Room`/`Asset` estesi in modo retrocompatibile (`confidence`/`source`/`confirmed`, `address`/`postalCode`/`propertyType`/`country`/`genesisStatus`, `estimatedReplacementYear`); nuove tabelle `Floor`, `ScanSession`, `Observation`, `Issue`, `Recommendation`, `ScoreSnapshot`, `HouseTimelineEvent`. Migrazione `20260804063159_add_genesis_mvp`, puramente additiva.
- **Home Score v1** (`common/home-score.ts`): 5 dimensioni pesate, ogni scostamento motivato da una `reason` esplicita, versionato e persistito come storico (`ScoreSnapshot`). 9 test.
- **Home Detective** (`common/home-detective.ts`): 5 regole deterministiche (mai un LLM), `ASSET_WITHOUT_ROOM` adattata per rispettare la semantica esistente di `roomId: null` = "impianto di casa" (solo ELETTRODOMESTICO/CLIMA, non tutti i tipi). 8 test.
- **`HouseScanProvider`/`MockHouseScanProvider`**: interfaccia sostituibile, dataset demo fisso e non casuale (4 stanze, 7 asset), mai presentato come reale in UI.
- **Modulo backend Genesis**: `GenesisService` riusa `RoomsService`/`AssetsService` esistenti per creare Room/Asset da Observation confermate (nessuna duplicazione della generazione codice `AMB-###`/`AST-###`); riconciliazione idempotente di Issue/Recommendation per `ruleCode:assetId`. 8 endpoint REST, 3 test di servizio.
- **Wizard frontend** (`Genesis.tsx`, 6 step): Benvenuto → Informazioni casa → Documenti (riusa l'upload esistente) → Scansione guidata → Revisione Digital Twin (conferma/modifica/scarta) → Risultati (Home Score + Issue + Recommendation).
- **Dashboard**: card Home Score con le 5 barre dimensione, "Da tenere d'occhio" (Issue aperte), "Consigliato" (Recommendation aperte), conteggio documenti ora reale (era hardcoded a 0), "Cronologia casa". Banner di invito quando Genesis non è completato.
- **Verifica end-to-end reale nel browser**, non solo unit test: eseguito l'intero percorso sulla casa reale dell'utente — 4 stanze e 7 asset creati dalla scansione demo, collegamento stanza↔asset corretto (incluso `roomId: null` per impianti di casa), Home Score calcolato (73/100), Issue "Caldaia senza documentazione tecnica" generata coerentemente con lo stato reale della caldaia esistente.
- **Limite trovato durante la verifica**: la conferma non deduplica contro Asset esistenti — creato un secondo "Impianto elettrico" accanto a uno già censito. Non corretto in questa sessione, tracciato come `backlog.md` B33 (insieme a B34, ripresa del wizard a grana grossa).
- **Nuovi documenti**: `docs/genesis-architecture.md` (componenti, motori, flusso, limitazioni, percorso verso il reale), `docs/product-backlog.md` (10 epiche EPIC 0–9). Aggiornati `domain-model.md`, `architecture.md`, `roadmap.md`, `backlog.md`, `decisions.md` (#25), `README.md`.
- **Test e build**: backend 46/46 test verdi (da 26), build/lint puliti; frontend build/lint puliti (3 warning pre-esistenti invariati, non introdotti da Genesis).
- **Non fatto in questa sessione**: push su GitHub (per istruzione esplicita della specifica, da confermare con l'utente prima del primo push Genesis).

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
