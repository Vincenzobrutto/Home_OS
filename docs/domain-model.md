# Modello di dominio

Fonte di verità: `backend/prisma/schema.prisma`. Questo documento lo spiega in prosa e va aggiornato ogni volta che lo schema cambia — se sono in disaccordo, lo schema ha ragione.

## Diagramma testuale (entità e relazioni)

```
User ──< HouseMembership >── House ──< Room ──< Asset >── AssetCustomField
 │                              │        (opzionale)  │
 ├── GmailConnection (0..1)     ├── Contact            ├── AssetTimelineEvent >── Contact (opz.)
 └── DriveConnection (0..1)     └── Document            │        │
                                    (asset_id opz.) ─────┘        └── Document (opz.)
                                                     └── MaintenancePlan ──< MaintenanceOccurrence
                                                            │                    ├── Contact (opz.)
                                                            │                    └── Document (opz.)
```

Legenda: `──<` = "uno a molti" verso l'entità collegata. Tutte le relazioni verso `House` hanno `onDelete: Cascade`; `Asset.roomId` e `Document.assetId` hanno `onDelete: SetNull` (cancellare una stanza o un asset non cancella i documenti collegati, li scollega soltanto).

## Entità

### House
La casa. `code` (es. `CASA-0142`) generato automaticamente in sequenza. `floorPlanRotation` (0/90/180/270) è l'unico stato "di visualizzazione" persistito lato server — vedi `decisions.md` sul perché.

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
- `extractedFields`: JSON grezzo del risultato AI, forma `{ kind: 'asset_document', docType, fields: [[label,value],...], suggestedAssetType, suggestedAssetId, suggestedAssetName, quantity }` oppure `{ kind: 'floor_plan', rooms: [...] }` per le planimetrie.

### AssetTimelineEvent
Cronologia di un Asset (installazione, manutenzione, documento collegato...). `documentId` opzionale collega l'evento al documento che l'ha generato; `contactId` opzionale collega chi ha eseguito l'intervento — **mai popolato automaticamente dall'AI**, solo scelto dall'utente (stesso principio "AI propone, utente conferma").

### MaintenancePlan
Piano di manutenzione appartenente sempre a un Asset. Può essere una tantum oppure ricorrente ogni N giorni/mesi/anni (`MaintenanceRecurrenceUnit`). Conserva prossima scadenza, finestra di preavviso, contatto abituale opzionale, obbligatorietà, note e stato di sospensione/completamento.

Lo stato (`SCHEDULED` / `UPCOMING` / `OVERDUE` / `COMPLETED` / `PAUSED`) è calcolato a runtime e non salvato. È distinto da `Asset.status`: una garanzia scaduta e una manutenzione scaduta sono segnali diversi. Gli Asset dismessi conservano i piani ma non generano promemoria.

### MaintenanceOccurrence
Esecuzione storica e immutabile di un piano: conserva la scadenza prevista, la data effettiva, contatto, documento e note opzionali. Il completamento crea nella stessa transazione anche un `AssetTimelineEvent`. Per i piani ricorrenti la prossima data resta ancorata al calendario programmato e avanza alla prima ricorrenza successiva al completamento; per una tantum il piano diventa `COMPLETED`.

### Contact (Rubrica)
Tecnici/aziende che hanno lavorato in casa. Collegamento a un intervento in cronologia è manuale; niente auto-popolamento da AI anche se il nome compare identico nel campo "Fornitore" estratto da un documento (rimandato, vedi `backlog.md`).

### User / HouseMembership / GmailConnection / DriveConnection
`HouseMembership` predisposta fin dall'MVP (ogni casa oggi ha un solo proprietario) per non richiedere una migrazione dolorosa quando arriverà la condivisione multi-utente. `GmailConnection`/`DriveConnection`: un solo account collegato per utente, token in chiaro in DB (accettabile per l'MVP, da rivedere — vedi `architecture.md` §3).

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
