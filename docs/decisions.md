# Decisioni architetturali (ADR log)

Registro cronologico. Ogni voce: contesto, decisione, motivazione, alternative scartate. Nuove voci si aggiungono **in fondo**, non si modificano quelle passate (se una decisione viene ribaltata, si aggiunge una nuova voce che lo dice, vedi es. #9).

---

### 1. Ambienti (Room) non hanno documenti/garanzie propri
**Decisione**: solo l'Asset ha documenti, garanzie, cronologia. Room è puramente un contenitore geometrico + di raggruppamento.
**Motivazione**: una stanza non "si rompe" o "scade" — è la caldaia dentro la stanza che ha una garanzia. Modellare i documenti sull'Asset tiene il dominio più vicino alla domanda reale dell'utente ("quando scade la garanzia della caldaia?").
**Alternative scartate**: documenti collegabili sia a Room che ad Asset — scartata perché avrebbe reso ambiguo dove cercare un documento e duplicato la UI di associazione.

### 2. Principio "l'AI propone, l'utente conferma"
**Decisione**: l'estrazione AI (`POST /documents/:id/analyze`) non scrive mai su Asset/AssetCustomField. Solo `POST /documents/:id/confirm`, azione esplicita dell'utente, scrive.
**Motivazione**: l'estrazione AI da documenti reali (specialmente manoscritti) ha confidenza variabile (~65% su documenti manoscritti vs 92–98% su documenti stampati, da test con documenti reali pre-implementazione — vedi `architettura/homeos_architettura_tecnica.md` §5bis). Scrivere dati sbagliati su un Asset silenziosamente sarebbe peggio di non estrarli affatto.
**Alternative scartate**: scrittura automatica con soglia di confidenza alta e revisione solo sotto soglia — scartata per mantenere un modello mentale semplice e uniforme ("nulla cambia senza conferma"), non un comportamento che varia in modo poco prevedibile per l'utente.

### 3. Campi strutturati dell'Asset: riempi solo se vuoto
**Decisione**: `applyFieldsToAsset` scrive un campo (es. `warrantyUntil`, `serialNumber`) solo se il valore attuale è `null`; un documento successivo non sovrascrive mai un valore già presente.
**Motivazione**: un documento più recente non è necessariamente più corretto (es. una fattura di riparazione non deve cancellare il numero di serie già noto da un manuale). Sovrascrivere in automatico rischierebbe di perdere dati corretti senza che l'utente se ne accorga.
**Alternative scartate**: sovrascrivere sempre con l'ultimo dato estratto — scartata per il rischio di perdita silenziosa di dati corretti; "chiedi sempre all'utente quale tenere" — scartata come troppo invasiva per il caso comune (il campo è quasi sempre vuoto la prima volta).

### 4. `status` dell'Asset è calcolato, non un campo scrivibile
**Decisione**: `OK`/`ATTENTION`/`DUE` derivato da `warrantyUntil` + presenza di documenti collegati (`backend/src/common/asset-status.ts`), mai accettato in input da `PATCH /assets/:id`.
**Motivazione**: evita che lo stato mostrato diverga dai dati che lo determinano — un solo posto in cui la logica "cosa significa OK" vive.
**Alternative scartate**: stato impostabile a mano con default calcolato — scartata perché avrebbe reintrodotto esattamente la divergenza che il calcolo automatico vuole evitare.

### 5. Garanzia di default a 24 mesi da `purchasedAt`
**Decisione**: se `warrantyUntil` è nullo ma `purchasedAt` è noto, si assume 24 mesi di garanzia per il calcolo dello stato (modificabile a mano dall'utente).
**Motivazione**: 24 mesi è il minimo legale standard in Italia/UE per i beni di consumo; un default ragionevole evita che ogni asset senza garanzia esplicita risulti "da verificare" fin da subito.
**Alternative scartate**: nessun default (asset senza `warrantyUntil` esplicita risulta sempre `ATTENTION`) — scartata perché avrebbe reso il segnale "da verificare" troppo rumoroso nell'uso reale.

### 6. `code` dell'Asset è unico globale, generato dal massimo esistente
**Decisione**: `AST-###` generato leggendo il massimo codice esistente in DB + 1, non un contatore separato.
**Motivazione**: un contatore separato desincronizzato da cancellazioni/asset creati in blocco (`quantity`) potrebbe generare collisioni; leggere il massimo reale è più lento ma sempre corretto.
**Alternative scartate**: contatore autoincrement dedicato — scartata per il rischio di collisione dopo cancellazioni, non giustificato dal volume di dati previsto (case singole, non migliaia di asset).

### 7. Matching documento→asset esistente: tipo uguale **e** nome simile
**Decisione**: `classifyBuffer` cerca un asset candidato con `type` uguale **e** nome simile (word-overlap, `haveSimilarSuggestedName`), non più "il primo asset di quel tipo in casa".
**Motivazione (bug reale, corretto in sessione)**: con più asset dello stesso tipo in una casa (es. più elettrodomestici), "il primo trovato" produceva sempre lo stesso suggerimento sbagliato (es. sempre "Piano cottura a induzione" per qualunque documento elettrodomestico) indipendentemente dal contenuto del documento. Il codice originale aveva già un commento che segnalava questa come semplificazione MVP accettabile "finché non emergono casi reali con asset duplicati dello stesso tipo" — questo caso si è verificato.
**Alternative scartate**: nessuna, era un bug da correggere, non una scelta di design con alternative valide.

### 8. Se la confidenza è bassa, nessun suggerimento (non un suggerimento arbitrario)
**Decisione**: sotto una soglia di confidenza (~50%) nel match nome-asset, la proposta di asset resta vuota invece di proporre comunque il candidato più vicino.
**Motivazione**: un suggerimento sbagliato ma sicuro-in-apparenza (una select pre-compilata) è peggiore di nessun suggerimento — l'utente tende a fidarsi della UI e confermare senza controllare.
**Alternative scartate**: mostrare comunque il candidato migliore con un'etichetta "bassa confidenza" — scartata per semplicità di UI in questa fase; da rivalutare se il caso "nessun suggerimento" risulta frustrante in uso reale.

### 9. Creazione asset da documento con scelta immediata dell'ambiente
**Decisione**: quando l'Inbox propone di creare un nuovo asset da un documento non associabile, il mini-form di creazione include anche la scelta dell'Ambiente (`roomId`), non solo tipo e nome.
**Motivazione**: senza questo campo, ogni asset creato da Inbox finiva sempre in "Documenti casa" (nessun `roomId`) e richiedeva una modifica manuale successiva per assegnarlo alla stanza corretta — friction segnalata direttamente dall'utente.
**Alternative scartate**: nessuna — la richiesta era specifica e la soluzione diretta.

### 10. Rotazione planimetria: rotazione dei DATI, non della vista (CSS transform)
**Decisione**: "Ruota" ruota per davvero le coordinate persistite di stanze (`planGeometry`) e asset (`planPosX/Y`), più un campo `House.floorPlanRotation` (0/90/180/270) usato solo per ruotare l'immagine di sfondo raster in modo coerente al caricamento.
**Motivazione**: una rotazione "solo vista" (CSS `transform: rotate()`) avrebbe richiesto: invertire larghezza/altezza del contenitore ad ogni 90°, ricalcolare ad ogni frame le coordinate mostra-vs-salva, e rendere rotation-aware tutta la matematica di drag già esistente in `FloorPlan.tsx`. Ruotare i dati una volta, al click, lascia tutta l'interazione di trascinamento invariata: continua a lavorare nello stesso sistema di coordinate "già ruotato" salvato in DB.
**Conseguenza accettata**: la rotazione è un'operazione batch esplicita (un click, non continua), non un pan/zoom libero.
**Alternative scartate**: rotazione CSS pura — scartata per la complessità aggiunta a un componente già complesso; libreria di canvas/whiteboard esterna — scartata come sproporzionata per il bisogno (solo 4 orientamenti fissi, non rotazione libera).

### 11. `onRoomsChanged`/`onAssetsChanged` devono essere `Promise<void>` e attesi
**Decisione (bugfix)**: le callback di refresh passate a `FloorPlan` sono tipate `() => Promise<void>` e vengono `await`-ate dentro `rotateView()` prima di riabilitare il pulsante "Ruota".
**Motivazione**: senza `await`, un secondo click rapido su "Ruota" poteva leggere `rooms`/`assets` non ancora aggiornati dal refetch del genitore e corrompere la rotazione (sommare 90° a dati non ancora coerenti). Verificato con un test di 6 click rapidi che deve risultare esattamente in `6×90°=180°` senza drift.
**Alternative scartate**: disabilitare il pulsante con un timeout fisso invece che attendere la vera fine del refetch — scartata come fragile (dipendente dalla latenza di rete, non da un evento reale).

### 12. LAN reachability: CORS `origin: true` + API base URL dinamico
**Decisione**: backend `enableCors({ origin: true })` (riflette l'Origin della richiesta invece di un valore fisso); frontend calcola `BASE_URL` da `window.location.hostname` invece di un `localhost` hardcoded; Vite con `server.host: true` e `allowedHosts: true`.
**Motivazione**: l'app deve essere raggiungibile da un telefono sulla stessa rete Wi-Fi, dove l'host non è `localhost` e l'IP della macchina di sviluppo può cambiare (DHCP) — fissare un IP nella config sarebbe stato fragile.
**Conseguenza accettata**: CORS aperto a qualunque origin è **accettabile solo perché il backend non è esposto oltre la LAN locale** — da restringere prima di un deploy pubblico (vedi `backlog.md`).
**Alternative scartate**: IP fisso in `.env` — scartata perché richiede riconfigurazione ad ogni cambio di rete/IP.

### 13. Inline styles come unico approccio di styling, con una sola eccezione (`MOBILE_CSS`)
**Decisione**: tutto lo stile del frontend è `style={{...}}` con token da `theme.ts`; l'unica eccezione è `MOBILE_CSS`, un blocco CSS vero iniettato via `<style>` per le media query.
**Motivazione**: il progetto è partito da un prototipo React validato con utenti reali già scritto interamente in stile inline (`prototipo/homeos_prototype.jsx`) — mantenere lo stesso approccio ha permesso di riusare la UI così com'era. Le media query però sono l'unica cosa che lo stile inline di React non può esprimere, da cui l'eccezione mirata invece di migrare tutto il progetto a un'altra tecnica di styling.
**Alternative scartate**: migrare a CSS Modules/Tailwind per l'intero progetto per gestire il responsive in modo "canonico" — scartata come sproporzionata rispetto al bisogno reale (un solo breakpoint).

### 14. Prisma pinnato a 6.19.3
**Decisione**: `package.json` fissa Prisma a `6.19.3` esplicitamente, non un range che permetterebbe l'aggiornamento a 7.x.
**Motivazione**: la v7 introduce cambiamenti non ancora verificati per questo progetto; pinnare evita un aggiornamento involontario che romperebbe la generazione del client o le migrazioni senza preavviso.
**Alternative scartate**: nessuna — è una scelta conservativa in attesa di verifica, non un confronto tra alternative equivalenti.

### 15. Vertex handle e asset marker: priorità di selezione via z-index
**Decisione (bugfix)**: z-index dell'icona asset alzato a `hovered ? 11 : 10` (era `7:5`), sopra lo z-index fisso `6` degli handle dei vertici stanza.
**Motivazione**: quando un asset si trovava vicino a un vertice della stanza, l'handle del vertice intercettava il click prima dell'icona asset sottostante, rendendo impossibile selezionarla con il mouse — bug segnalato direttamente dall'utente.
**Alternative scartate**: ingrandire l'area cliccabile dell'asset — non avrebbe risolto la vera causa (ordine di stacking), solo mascherato il sintomo in alcuni casi.

### 16. Preparazione al passaggio di consegne: solo hygiene, nessuna feature nuova
**Decisione**: durante la preparazione del repository per il passaggio a un altro sviluppatore/assistente, ci si è limitati a: verificare build/lint/test, correggere `.gitignore` (mancava del tutto `.env`/`.env.*` nel `.gitignore` del frontend — bug reale, non solo hygiene), documentare variabili d'ambiente opzionali non ancora in nessun `.env.example` (`FRONTEND_ORIGIN`, `VITE_API_URL`), e scrivere `docs/HANDOFF.md`. Non è stato eseguito `git init`, non sono stati aggiunti test al frontend, non sono stati corretti i 12 errori di lint pre-esistenti in `claude-extraction.service.ts`.
**Motivazione**: il compito richiedeva esplicitamente di non modificare funzionalità applicative salvo correzioni necessarie a rendere build/test eseguibili — build e test **erano già** eseguibili (verificato), quindi non c'era una correzione "necessaria" da fare. Aggiungere un framework di test al frontend, tipizzare le risposte Claude, o inizializzare Git sono tutti lavori legittimi ma ciascuno una decisione a sé, non hygiene di consegna — meglio tracciarli in `backlog.md` (B1b, B3, B14) con priorità esplicita che farli di nascosto dentro un task "prepara il repository".
**Alternative scartate**: risolvere anche i problemi trovati (lint, test mancanti, `git init`) nella stessa sessione — scartata perché avrebbe ecceduto lo scope esplicitamente delimitato dal punto 6 della richiesta, e perché `git init` in particolare è un'azione che cambia lo stato del progetto in un modo che l'utente potrebbe voler rivedere prima (es. primo commit, remote, branch) piuttosto che vedersela eseguita silenziosamente.

### 17. Repository su GitHub + protocollo di coordinamento multi-agente via `git fetch`
**Decisione**: repository inizializzato e pubblicato su https://github.com/Vincenzobrutto/Home_OS (branch `main`). Identità Git impostata **localmente** (non globalmente) a `Vincenzo Brutto <bruttovincenzo@gmail.com>`. Aggiunta una regola in `AGENTS.md` (punto 4 di "Prima di iniziare"): ogni assistente deve fare `git fetch origin` e confrontare con `origin/main` prima di iniziare a lavorare, e se il remoto è avanti deve fare `pull` e ripassare le modifiche con l'utente prima di continuare.
**Motivazione**: con più assistenti AI (Claude Code, Codex) che lavorano sullo stesso repository ma in sessioni/ambienti separati, nessuno dei due sa automaticamente cosa ha fatto l'altro — l'unico modo per scoprirlo è chiederlo esplicitamente a GitHub. Un secondo trovato durante la stessa attività: `.claude/settings.local.json` (config locale dello strumento, non del progetto) conteneva la password del database in chiaro dentro una riga di permessi salvata in una sessione precedente — è stato tolto dallo staging ed escluso in `.gitignore` prima del primo commit, non era coperto da nessuna regola preesistente.
**Alternative scartate**: affidarsi a un promemoria verbale ("dimmi tu quando l'altro assistente ha pushato") — scartata perché l'utente ha esplicitamente chiesto di occuparmene io, ed è comunque un controllo a costo quasi nullo (`git fetch` è un'operazione di sola lettura) da fare in automatico piuttosto che ricordare a voce ogni volta.

### 18. Manutenzioni ricorrenti: stato separato e calendario ancorato
**Decisione**: una manutenzione è modellata come `MaintenancePlan` dell'Asset più `MaintenanceOccurrence` immutabili. Gli stati manutentivi sono calcolati e restano separati da `Asset.status`. Quando una ricorrenza viene completata in ritardo, la prossima scadenza avanza dalla data programmata alla prima ricorrenza futura, non dalla data effettiva di completamento. Occorrenza, evento cronologia e aggiornamento del piano sono scritti in un'unica transazione.
**Motivazione**: garanzia e manutenzione comunicano rischi diversi; fonderli renderebbe ambiguo il segnale mostrato. Ancorare il calendario evita lo slittamento progressivo delle manutenzioni annuali e conserva sia “quando era prevista” sia “quando è stata fatta”. La transazione impedisce storici parziali o prossime scadenze aggiornate senza un'esecuzione corrispondente.
**Alternative scartate**: riusare solo `AssetTimelineEvent` senza un piano — non rappresenta la prossima scadenza né la ricorrenza; salvare uno stato sul piano — rischia divergenza dalle date; calcolare la prossima scadenza dalla data effettiva — introduce drift; generare in anticipo infinite occorrenze future — aggiunge record e complessità senza valore per l'MVP.

### 19. Suggerimenti di manutenzione: linee guida statiche, non AI, sempre editabili prima di salvare
**Decisione**: `GET /assets/:id/maintenance-suggestions` calcola proposte da una tabella statica di linee guida per `AssetType` (`backend/src/common/maintenance-guidelines.ts`), non da una chiamata a Claude. La prima scadenza si ancora a `installedAt` (fallback `purchasedAt`, poi `createdAt`) + l'intervallo della linea guida. L'endpoint non scrive nulla: il frontend apre il form di creazione già compilato con i valori suggeriti, l'utente deve comunque premere "Salva" (o modificare prima) — stesso principio "l'AI propone, l'utente conferma" di `decisions.md` #2, applicato qui senza AI perché la regola è nota e fissa, non estratta da un documento. Coperti solo i tipi con una cadenza generica sensata (CLIMA, CALDAIA, FOTOVOLTAICO, ELETTRICO); TETTO/FINESTRE/ELETTRODOMESTICO restano senza suggerimenti perché non esiste una cadenza comune a un intero tipo così ampio. Una proposta smette di comparire non appena esiste un piano con lo stesso titolo per quell'Asset (confronto case/spazi-insensitive) — non c'è un "dismesso per sempre" persistito: se l'utente clicca "Ignora" senza salvare, la proposta ricompare alla prossima apertura della scheda.
**Motivazione**: dare un punto di partenza già sensato (non un form vuoto) per i casi più comuni segnalati dall'utente (es. climatizzatori) senza far credere che sia un consiglio autorevole e verificato — ogni descrizione in `maintenance-guidelines.ts` è scritta per essere onesta sul fatto che la cadenza esatta va comunque controllata sul libretto/normativa specifica. Non passare da un'estrazione AI evita di introdurre incertezza (e latenza/costo di una chiamata a Claude) per un'informazione che è in realtà una regola fissa, uguale per ogni Asset dello stesso tipo — coerente con come `warranty.ts` calcola già un default senza AI.
**Alternative scartate**: creare automaticamente il piano al posto dell'utente — violerebbe direttamente il principio "AI propone, utente conferma" (qui "AI" per estensione = "il sistema"), anche se la fonte non è un modello linguistico; persistere un flag "suggerimento ignorato" per non riproporlo — scartato come scope creep per una nudge che non blocca nulla, se diventa fastidioso si aggiunge in un secondo momento (vedi `backlog.md`); coprire tutti gli `AssetType` con un default generico — scartato perché per TETTO/FINESTRE/ELETTRODOMESTICO non esiste una cadenza comune abbastanza vera da essere utile, meglio nessun suggerimento che uno inventato.
