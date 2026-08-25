# Modello di dominio

Fonte di verità: `backend/prisma/schema.prisma`. Questo documento lo spiega in prosa e va aggiornato ogni volta che lo schema cambia — se sono in disaccordo, lo schema ha ragione.

## Allineamento con il Property Digital Record di Dimora

Il modello implementato rappresenta già gran parte del record (`House`, `Floor`, `Room`, `Asset`, `Document`, timeline e manutenzioni), ma non coincide ancora con l'ontologia completa descritta nel venture document Dimora.

- `Property` corrisponde a `House`; B36 aggiunge il profilo catastale, fisico, energetico e di agibilità v1 direttamente come campi tipizzati, con provenienza satellite.
- `System` **non è un'entità corrente**: impianto elettrico, termico, idrico o fotovoltaico sono modellati come Asset/tipi di Asset. Prima di introdurre `System` va validato se serve davvero una relazione gerarchica `House → System → Asset` o se basta una classificazione evoluta degli Asset.
- `Event` è intenzionalmente diviso tra `AssetTimelineEvent`, `HouseTimelineEvent` e `MaintenanceOccurrence`; non esiste una tabella evento universale.
- `Document` può alimentare la casa, un Asset, una bolletta o una manutenzione. Asset e Property Profile conservano la provenienza campo-per-campo, ma questo non equivale a una verifica terza.

Finché questi gap non sono implementati, "Property Digital Record" indica il modello strutturato complessivo; non implica completezza catastale, validità certificativa o trasferibilità automatica.

## Diagramma testuale (entità e relazioni)

```
User ──< HouseMembership >── House ──< Room ──< Asset >── AssetCustomField
 │                              │        (opzionale)  │
 ├── GmailConnection (0..1)     ├── Contact            ├── AssetTimelineEvent >── Contact (opz.)
 └── DriveConnection (0..1)     └── Document            │        │
                                    (asset_id opz.) ─────┘        └── Document (opz.)
                                                     └── MaintenancePlan ──< MaintenanceOccurrence
                                                     │      │                    ├── Contact (opz.)
                                                     │      │                    └── Document (opz.)
                                                     └── DismissedMaintenanceSuggestion

House ──< Floor ──< Room (floorId opzionale)
House ──< ScanSession ──< Observation (mai scritta su Room/Asset da sola, solo dopo conferma)
House ──< Issue >── Recommendation (0..1, 1:1 oggi)
House ──< ScoreSnapshot (fotografia nel tempo, mai ricalcolata "sul vecchio")
House ──< HouseTimelineEvent (eventi a livello casa, distinti da AssetTimelineEvent)
House ──< UtilityBill >── Document (uno o più periodi elettrici confermati per bolletta)
House ──< HouseFieldProvenance >── Document/User (fonte e conferma dell'ultimo valore del profilo)
```

Legenda: `──<` = "uno a molti" verso l'entità collegata. Tutte le relazioni verso `House` hanno `onDelete: Cascade`; `Asset.roomId` e `Document.assetId` hanno `onDelete: SetNull` (cancellare una stanza o un asset non cancella i documenti collegati, li scollega soltanto).

## Entità

### House
La casa e il Property Profile. `code` (es. `CASA-0142`) è generato automaticamente in sequenza. Oltre ai dati Genesis, contiene campi tipizzati per identificazione/indirizzo, superfici distinte, riferimenti catastali, APE e agibilità. Definizioni diverse di superficie restano colonne diverse: dichiarata, calpestabile, catastale e utile riscaldata non sono intercambiabili. La percentuale di completezza è calcolata in lettura sui 16 dati essenziali, non persistita. `floorPlanRotation` conserva l'orientamento della planimetria; `genesisStatus` rappresenta lo stato complessivo e `genesisStep` lo step esatto.

`HouseFieldProvenance` conserva l'origine dell'ultimo valore per `(houseId, fieldName)`, documento sorgente, utente e data di conferma. Una modifica dalla vista Profilo casa produce `DECLARED`; la conferma di un documento riconosciuto come `property_profile` produce `EXTRACTED`. Non esiste ancora un flusso `ATTESTED`.

### UtilityBill
Un periodo di consumo elettrico confermato dall'utente, sempre collegato alla casa e al `Document` sorgente. Contiene `periodStart`, `periodEnd`, `consumptionKwh`, importo e fornitore opzionali. Una bolletta può produrre più righe quando espone consumi mensili distinti. Periodi plurimensili restano tali nel dato sorgente: la ripartizione mensile è calcolata in lettura e marcata come stimata.

### Room (Ambiente)
Una stanza. `type` è un enum chiuso (`CUCINA`, `SOGGIORNO`, `CAMERA`, `BAGNO` — **non** uno per ogni possibile stanza, l'etichetta libera è nel campo `name`). `planGeometry` è JSON libero con due forme possibili (vedi `frontend/src/geometry.ts`):
- `{ kind: 'rect', x, y, width, height }` — rettangolo, coordinate 0–1 relative alla planimetria.
- `{ kind: 'polygon', points: [{x,y}, ...] }` — forma libera disegnata a mano.

**Le stanze non hanno documenti né garanzie proprie** — sono solo un contenitore per gli Asset (vedi `decisions.md` #1).

### Asset
Il centro del sistema. `roomId` nullable = "impianto di casa" (es. impianto elettrico condominiale), non un dato mancante — vedi il filtro esplicito in `HouseDocuments.tsx`.

Campi strutturati (`installedAt`, `warrantyUntil`, `serialNumber`, `manufacturer`, `model`, `purchasedAt`, `supplier`): popolati **solo se ancora vuoti**, mai sovrascritti da un documento successivo (vedi `applyFieldsToAsset` in `documents.service.ts` e `decisions.md`). Per dati specifici di un tipo di impianto che non hanno senso come colonna fissa (es. "potenza caldaia"), c'è `AssetCustomField`.

`status` (`OK` / `ATTENTION` / `DUE`) è **calcolato**, mai impostato a mano:
```
DUE        se warrantyUntil è passata
ATTENTION  altrimenti, se non ci sono documenti collegati
OK         altrimenti
```
(`backend/src/common/asset-status.ts`). Se manca `warrantyUntil` ma è nota `purchasedAt`, si applica un default di 24 mesi di garanzia (`backend/src/common/warranty.ts`) — modificabile a mano.

`dismissedAt` è uno stato di ciclo vita **impostato dall'utente** (Dismetti/Riattiva), concettualmente diverso da `status`: un asset dismesso esce dagli elenchi attivi ma non perde nessun dato.

`planPosX`/`planPosY` (0–1, nullable): posizione dell'icona sulla planimetria. Null finché l'utente non la trascina almeno una volta — prima di allora la posizione mostrata è calcolata (centro della stanza + un piccolo scarto deterministico per non sovrapporre più asset nella stessa stanza).

`code` (es. `AST-007`) è **unico a livello globale**, non per casa — generato dal massimo codice esistente, non da un conteggio (un asset cancellato lascerebbe un buco che un conteggio rigenererebbe, causando conflitti).

### AssetCustomField
Coppia libera etichetta/valore. `source` (`MANUAL` | `AI_EXTRACTED`) distingue cosa ha scritto l'utente da cosa ha proposto un documento — utile per un futuro audit, non ancora usato in UI oltre alla scrittura.

### Document
Un file caricato, o candidato da Gmail/Drive. Stati (`status`): `PENDING → ANALYZING → ANALYZED → CONFIRMED`.

- `assetId` nullable: null finché non confermato/associato.
- `houseLevel`: true solo se confermato esplicitamente come "riguarda la casa, non un impianto" (es. APE) — **non va dedotto da `assetId` nullo**, perché cancellare un Asset lascia `assetId` null anche su documenti già confermati (vedi `onDelete: SetNull`).
- `source` (`UPLOAD` | `GMAIL` | `DRIVE`) + campi specifici per sorgente (`gmailMessageId`/`emailFrom`/... o `driveFileId`/`driveModifiedAt`) per il dedup tra scansioni ripetute.
- `importedAt`: solo per Gmail/Drive — null finché l'utente non clicca "Importa" nella vista candidati; da quel momento si comporta come un documento caricato normalmente.
- `ignoredAt`: documento scartato dall'utente. Resta in DB (per non riproporlo), non appare in nessuna vista.
- `extractedFields`: JSON grezzo del risultato AI; oltre ad Asset, planimetrie e bollette può avere `{ kind: 'property_profile', docType, fields: {...} }`. Quest'ultima forma è solo una proposta finché l'utente non conferma.

### AssetTimelineEvent
Cronologia di un Asset (installazione, manutenzione, documento collegato...). `documentId` opzionale collega l'evento al documento che l'ha generato; `contactId` opzionale collega chi ha eseguito l'intervento — **mai popolato automaticamente dall'AI**, solo scelto dall'utente (stesso principio "AI propone, utente conferma").

### MaintenancePlan
Piano di manutenzione appartenente sempre a un Asset. Può essere una tantum oppure ricorrente ogni N giorni/mesi/anni (`MaintenanceRecurrenceUnit`). Conserva prossima scadenza, finestra di preavviso, contatto abituale opzionale, obbligatorietà, note e stato di sospensione/completamento.

Lo stato (`SCHEDULED` / `UPCOMING` / `OVERDUE` / `COMPLETED` / `PAUSED`) è calcolato a runtime e non salvato. È distinto da `Asset.status`: una garanzia scaduta e una manutenzione scaduta sono segnali diversi. Gli Asset dismessi conservano i piani ma non generano promemoria.

### MaintenanceOccurrence
Esecuzione storica e immutabile di un piano: conserva la scadenza prevista, la data effettiva, contatto, documento e note opzionali. Il completamento crea nella stessa transazione anche un `AssetTimelineEvent`. Per i piani ricorrenti la prossima data resta ancorata al calendario programmato e avanza alla prima ricorrenza successiva al completamento; per una tantum il piano diventa `COMPLETED`.

### DismissedMaintenanceSuggestion
"Ignora" persistito su un suggerimento di manutenzione (le linee guida stesse vivono nel codice, non in DB — vedi `maintenance-guidelines.ts`). Chiave unica `(assetId, guidelineCode)`: `guidelineCode` non è una foreign key, è lo slug stabile della linea guida (es. `clima-filtri`). Non c'è un'azione di "ripristina" — il dismiss è definitivo finché non emerge un bisogno reale di tornare indietro (vedi `decisions.md` #22).

### Contact (Rubrica)
Tecnici/aziende che hanno lavorato in casa. Collegamento a un intervento in cronologia è manuale; niente auto-popolamento da AI anche se il nome compare identico nel campo "Fornitore" estratto da un documento (rimandato, vedi `backlog.md`).

### User / Session / HouseMembership / GmailConnection / DriveConnection
`User.passwordHash` è nullable: gli account creati prima dell'introduzione dell'autenticazione (B2) non ne hanno ancora una — il login riconosce il caso e offre di impostarla, vedi `auth.service.ts`. `Session` è la sessione di login: `id` è il token stesso (32 byte random, inviato come cookie httpOnly `sid`), non un JWT — niente libreria in più, la revoca è un semplice `delete`. `HouseMembership`, predisposta fin dall'MVP per la futura condivisione multi-utente, è ora effettivamente il criterio di autorizzazione per-casa (`AccessControlService.assertHouseAccess`, non più solo `House.ownerId`) — ogni casa esistente ha ricevuto una `HouseMembership` `OWNER` retroattiva alla prima attivazione del controllo (backfill idempotente in `AccessControlService.onModuleInit`). `GmailConnection`/`DriveConnection`: un solo account collegato per utente, token in chiaro in DB (accettabile per l'MVP, da rivedere — vedi `architecture.md` §3); il collegamento OAuth ora richiede una sessione valida e usa un nonce CSRF effimero (in memoria di processo, non in DB) invece di fidarsi di un `userId` passato dal client.

### Provenienza, affidabilità e titolarità

La conferma dell'utente rende un dato **accettato nel proprio record**, non verificato da una fonte autorevole. B38 lo traccia sugli Asset e B36 sul Property Profile della House. `FieldSource` distingue l'origine (`DECLARED`/`EXTRACTED`/`ATTESTED`), separata da chi/quando ha confermato; `ATTESTED` è predisposto ma nessun flusso lo produce oggi.

- `AssetCustomField` (campi liberi): + `sourceDocumentId`, `confirmedByUserId`, `confirmedAt`.
- `AssetFieldProvenance` (nuova tabella): provenienza dei 7 campi strutturati "universali" di Asset (`installedAt`/`warrantyUntil`/`purchasedAt`/`serialNumber`/`manufacturer`/`model`/`supplier`) — vivono come colonne dirette su `Asset` (serve tipizzato per query/ordinamento), quindi la provenienza vive in una tabella satellite, un record per `(assetId, fieldName)`. `AssetsService.update` scrive `DECLARED` solo se il valore è **davvero cambiato** rispetto a quello esistente (non basta comparire nel body: il form di modifica rimanda sempre tutti i campi anche quelli invariati). `DocumentsService.applyFieldsToAsset` scrive `EXTRACTED` con `sourceDocumentId`/`confirmedByUserId` del documento confermato.
- `HouseFieldProvenance`: stesso pattern per i campi tipizzati del Property Profile; la conferma documentale riempie esclusivamente valori vuoti e segnala i conflitti senza sovrascriverli.
- **Nessun backfill** dei valori già esistenti prima di B38: la provenienza è assente (non un errore) per ogni campo strutturato mai riscritto da allora — `ProvenanceBadge` in `Assets.tsx` semplicemente non compare in quel caso.
- **v1 non fa audit trail multi-versione**: un solo record per campo, sovrascritto ad ogni riscrittura, non uno storico di versioni precedenti.

Per un record condivisibile con banche, assicurazioni o acquirenti servirà comunque altro: `ATTESTED` realmente raggiungibile da una verifica terza e uno storico multi-versione — vedi `decisions.md` B38/B36 e `product-backlog.md` EPIC 10.

Il trasferimento della casa a un altro proprietario non è implementato. Dovrà separare dati propri dell'immobile (potenzialmente trasferibili) da dati personali del proprietario e richiederà ruoli, consenso, audit e una validazione legale dedicata. Non va dedotto dalla sola presenza di `HouseMembership`.

## Entità Genesis (vedi `docs/genesis-architecture.md` per il dettaglio completo)

Aggiunte per il percorso guidato Genesis (2026-08-04) — dettaglio esteso, motivazioni e limiti noti in `docs/genesis-architecture.md` e `decisions.md` #25; qui solo un riassunto per restare coerenti col resto di questo documento.

### Floor
Piano dell'edificio (es. "Piano terra"). Concetto nuovo — le `Room` esistenti non ne avevano bisogno perché la planimetria era sempre a livello unico. `Room.floorId` è opzionale, quindi le stanze pre-Genesis restano valide senza modifiche.

### ScanSession / Observation
Una `ScanSession` rappresenta un'esecuzione della scansione guidata (oggi solo `type: GUIDED_MOCK`, tramite `HouseScanProvider`/`MockHouseScanProvider`). Contiene N `Observation`, ciascuna una proposta di Room o Asset (`entityType`), con `confidence` e un `payload` libero (per un Asset, include `roomName` per il collegamento alla Room osservata nello stesso giro). Un'Observation **non diventa mai** una Room/Asset reale da sola: solo la conferma esplicita dell'utente (`POST .../scan/:id/confirm`) crea la riga vera, con `source: SCAN_MOCK` e la stessa `confidence` salvata.

### Issue / Recommendation
Un'`Issue` è un problema rilevato da Home Detective (regole deterministiche, mai un LLM — vedi `common/home-detective.ts`), identificato da `ruleCode` + contesto (`assetId`/`documentId`). Idempotente a livello applicativo, non con un vincolo DB: ad ogni ricalcolo, le Issue non più valide vengono risolte (`status: RESOLVED`), quelle nuove create. Una `Recommendation` è l'azione consigliata derivata (oggi 1:1) da un'Issue aperta.

### ScoreSnapshot
Fotografia nel tempo del calcolo Home Score (`common/home-score.ts`, 5 dimensioni pesate: documentazione 25%, manutenzione 20%, sicurezza 25%, efficienza 15%, completezza 15%). Ogni calcolo crea uno snapshot nuovo, mai un aggiornamento in place — `calculationVersion` permette di riconoscere snapshot calcolati con pesi di una versione precedente.

### HouseTimelineEvent
Eventi a livello di **casa** (Genesis avviato/completato, scansione completata...) — modello nuovo, deliberatamente non una generalizzazione di `AssetTimelineEvent` (già in uso reale con `assetId` obbligatorio, vedi `decisions.md` #25).

### Campi Genesis su House/Room/Asset
- `House`: `address`, `postalCode`, `propertyType`, `country` (tutti opzionali), `genesisStatus` (`NOT_STARTED` → `IN_PROGRESS` → `PROCESSING` → `COMPLETED`).
- `Room`/`Asset`: `confidence` (0–1, nullable), `source` (`MANUAL` di default, o `SCAN_MOCK`/`DOCUMENT`/`IMPORT`), `confirmed` (default `true` — solo le righe nate da una scansione non ancora confermata partono `false`). Le righe create prima di Genesis restano `MANUAL`/`confirmed: true` senza bisogno di alcuna migrazione dati.
- `Asset`: `estimatedReplacementYear` (stima grezza per il segnale di efficienza dell'Home Score, non popolata automaticamente da nessun flusso in questo MVP).

## Regole di business (riassunto — dettaglio in `decisions.md`)

1. Ambienti ≠ Asset: le stanze non hanno garanzie/documenti propri.
2. L'AI non scrive mai direttamente su Asset/AssetCustomField: solo dopo conferma esplicita dell'utente.
3. Ogni campo strutturato dell'Asset si riempie solo se vuoto, mai sovrascritto.
4. Se un documento suggerisce un tipo di asset non presente in casa, il sistema propone di crearlo (con possibilità di assegnare subito un ambiente), non forza un'associazione sbagliata.
5. Il matching "documento → asset esistente" richiede tipo **uguale** e nome **simile** (non solo tipo uguale — vedi `decisions.md`, bug corretto in sessione).
6. `status` dell'Asset è sempre calcolato, mai un campo scrivibile dall'utente.
7. Ruotare la planimetria ruota per davvero le coordinate salvate di stanze e asset (non solo la vista), così un asset resta nell'ambiente a cui è assegnato senza bisogno di ricalcolare l'assegnazione.
8. I piani di manutenzione appartengono agli Asset; stato e promemoria sono calcolati e non modificano `Asset.status`.
9. Completare una manutenzione è un'azione utente esplicita e atomica: occorrenza, cronologia e prossima scadenza vengono registrate insieme.
10. I piani di manutenzione suggeriti (da linee guida statiche per tipo di Asset) non vengono mai creati automaticamente: il sistema pre-compila il form, l'utente deve comunque confermare — vedi `decisions.md` #19.
11. Un suggerimento di manutenzione ignorato non ricompare: il dismiss è persistito per Asset+linea guida, non solo nello state del browser — vedi `decisions.md` #22.
