# API

Base URL: `http://<host>:3000` (nessun prefisso globale). Sessione reale via cookie httpOnly `sid` (vedi `## Auth` sotto e `decisions.md`): ogni rotta richiede una sessione valida salvo quelle marcate `@Public()` (`/auth/register`, `/auth/login`, `/auth/set-password`, `/auth/account-status`). L'autorizzazione per-casa verifica `HouseMembership` (non solo `House.ownerId`), quindi 403 se la sessione è valida ma l'utente non ha accesso a quella casa specifica. Il client deve inviare le richieste con `credentials: 'include'` perché il cookie viaggi tra origin diversi (frontend/backend su porte diverse).

Convenzioni: JSON in richiesta/risposta salvo dove indicato (upload file = `multipart/form-data`). Nessun envelope di risposta — gli endpoint restituiscono l'entità o l'array direttamente.

## Auth
| Metodo | Path | Note |
|---|---|---|
| POST | `/auth/account-status` | `{ email }` → `{ exists, hasPassword }`, usato dal login per decidere il passo successivo (accesso/imposta password/registrazione) |
| POST | `/auth/register` | `{ email, password, name? }`, crea utente + sessione, imposta il cookie `sid` |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/set-password` | `{ email, password }` — solo per account creati prima dell'introduzione dell'autenticazione (`passwordHash` ancora null); non utilizzabile se una password è già impostata |
| POST | `/auth/logout` | invalida la sessione corrente (cancella la riga `Session`) e il cookie |
| GET | `/auth/me` | utente della sessione corrente, 401 se assente/scaduta |
| DELETE | `/auth/me` | cancella l'account: le case possedute (cascata su tutto il contenuto), le membership residue, poi l'utente (cascata `Session`/`GmailConnection`/`DriveConnection`); invalida il cookie. Irreversibile, vedi `decisions.md` #53 |
| POST | `/auth/consent` | registra `consentedAt = now()` per l'utente della sessione corrente (B55) — idempotente |

## Houses
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses` | crea casa (owner = utente della sessione, non più un `ownerId` nel body), genera `code` (`CASA-####`) e la `HouseMembership` `OWNER` |
| GET | `/houses/:id` | dettaglio |
| PATCH | `/houses/:id` | anche `floorPlanRotation` |
| DELETE | `/houses/:id` | solo l'utente con ruolo `OWNER` (403 altrimenti); cancella la casa e tutto il contenuto via cascata già esistente a livello di schema, nessuna pulizia applicativa. Irreversibile, vedi `decisions.md` #53 |
| GET | `/houses/:id/export` | export minimo dati (B54): anagrafica, ambienti, Asset, documenti (solo metadati, mai il file), interventi, garanzie, contatti. Chiunque abbia accesso alla casa (non solo OWNER) |
| PATCH | `/houses/:id/property-profile` | modifica esplicita del profilo; registra provenienza `DECLARED` solo per i valori realmente cambiati |
| GET | `/houses` | case dell'utente della sessione corrente (era `/users/:userId/houses`) |

## Rooms
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses/:houseId/rooms` | crea ambiente (`type`, `name`, `planGeometry`) |
| GET | `/houses/:houseId/rooms` | elenco |
| PATCH | `/rooms/:id` | anche riposizionamento/ridimensionamento planimetria |
| DELETE | `/rooms/:id` | gli asset collegati restano, `roomId` → null |

## Assets
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses/:houseId/assets` | `quantity > 1` crea più asset in un colpo solo (es. "3 termosifoni") |
| GET | `/houses/:houseId/assets` | elenco (include dismessi, filtrare lato client) |
| PATCH | `/assets/:id` | campi strutturati — include collegamento opzionale `thermalSystemId` e dati F-gas (`refrigerant`, `refrigerantChargeKg`, tre boolean nullable); **non** accetta `status` (calcolato). Da B50 `warrantyUntil` non è più scritto direttamente: crea/aggiorna in-place la `Warranty` "gestita da qui" (vedi `decisions.md` #47) |
| DELETE | `/assets/:id` | documenti collegati restano, `assetId` → null |
| POST | `/assets/:id/dismiss` | imposta `dismissedAt` |
| POST | `/assets/:id/reactivate` | azzera `dismissedAt` |
| POST | `/assets/:id/custom-fields` | aggiunge campo libero |
| PATCH | `/custom-fields/:id` | |
| DELETE | `/custom-fields/:id` | |
| GET | `/assets/:id/timeline` | cronologia interventi |
| POST | `/assets/:id/timeline-events` | evento manuale (`contactId`/`documentId` opzionali) |
| PATCH | `/timeline-events/:id` | |

Da B47 le rotte timeline restano compatibili ma `POST /assets/:id/timeline-events` crea un `Intervention` canonico; accetta tipo, costo, altri Asset, documenti ed evidenza. `GET /assets/:id/timeline` compone interventi e righe legacy non già collegate.

### Interventi (Memory Core B47)

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/houses/:houseId/interventions` | lista filtrabile per Asset, contatto, testo e intervallo date |
| POST | `/houses/:houseId/interventions` | crea intervento atomico con 1..N Asset e 0..N documenti confermati |
| GET | `/interventions/:id` | dettaglio canonico |
| PATCH | `/interventions/:id` | modifica esplicita con verifica di tutti i riferimenti nella stessa casa |

Un documento collegato forza `evidenceStatus = VERIFIED_PRESENT`; questo stato non è accettato senza un documento confermato. Il costo è unico per intervento e richiede valuta ISO a tre lettere.

### Garanzie (B50)

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/assets/:assetId/warranties` | elenco garanzie dell'Asset, più recenti prima |
| GET | `/houses/:houseId/warranties` | elenco garanzie di tutta la casa (via relazione Asset→House), con l'Asset collegato incluso — usato dalla ricerca unificata (B49) |
| POST | `/assets/:assetId/warranties` | crea garanzia (`expiresAt` obbligatoria, `startsAt`/`kind`/`providerContactId`/`proofDocumentId`/`notes` opzionali) |
| PATCH | `/warranties/:id` | modifica esplicita; nessun `DELETE` (stessa convenzione di Intervention) |

Stessa regola di evidenza degli interventi: `proofDocumentId` forza `VERIFIED_PRESENT`, non accettato senza documento confermato. Dopo ogni scrittura, `Asset.warrantyUntil`/`status` vengono ricalcolati dalla garanzia con scadenza più lontana (vedi `decisions.md` #47) — non sono mai scritti altrove.

## Documents (pipeline documentale — vedi `architecture.md` §4)
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses/:houseId/documents` | upload (`multipart/form-data`), crea `Document` status `PENDING`. Max 20MB, solo PDF/PNG/JPG/WEBP (B56, verifica sul Content-Type dichiarato) |
| GET | `/houses/:houseId/documents` | elenco; filtrare per `houseLevel`/`assetId` lato client per "Documenti casa" |
| POST | `/houses/:houseId/floorplan-background` | upload immagine/PDF planimetria di sfondo |
| GET | `/documents/:id/file` | streaming del file originale |
| POST | `/documents/:id/analyze` | invoca Claude, popola `extractedFields`, status → `ANALYZED`. Nessuna scrittura su Asset. |
| POST | `/documents/:id/confirm` | scrittura reale: `{ assetId }` **oppure** `{ createAssetType, assetName?, roomId? }` **oppure** `{ linkToHouse: true }`. Funziona anche su un documento mai analizzato (`extractedFields` null) — percorso "classifica manualmente" (B57) |
| POST | `/documents/:id/confirm-floorplan` | conferma ambienti estratti da una planimetria caricata |
| POST | `/documents/:id/confirm-utility-bill` | conferma periodi elettrici estratti e crea `UtilityBill` atomicamente |
| POST | `/documents/:id/confirm-property-profile` | conferma i dati casa estratti; riempie solo campi vuoti, registra provenienza `EXTRACTED`, restituisce campi applicati/conflitti |
| GET | `/houses/:houseId/gmail-candidates` | documenti trovati su Gmail non ancora importati |
| GET | `/houses/:houseId/drive-candidates` | idem per Google Drive |
| POST | `/documents/:id/import-candidate` | promuove un candidato Gmail/Drive a documento normale (`importedAt`) |
| POST | `/documents/:id/ignore` | imposta `ignoredAt`, il candidato non viene riproposto |
| POST | `/documents/:id/move-to-house` | sposta un documento tra case (correzione errore utente) |
| POST | `/documents/:id/search-online` | arricchimento dati via Claude + tool `web_search` |

## Energy
| Metodo | Path | Note |
|---|---|---|
| GET | `/houses/:houseId/energy-consumption?year=YYYY` | confronto mensile YoY, indicatori di stima e Asset installati nell'anno selezionato |

## Contacts
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses/:houseId/contacts` | |
| GET | `/houses/:houseId/contacts` | |
| GET | `/contacts/:id` | |
| PATCH | `/contacts/:id` | |
| DELETE | `/contacts/:id` | |

## Maintenance

Lo schema sottostante supporta ora soggetti House/ThermalSystem/Asset, ma questi endpoint restano deliberatamente Asset-centrici finché il modulo compliance non espone riconciliazione e UI dedicate. I piani esistenti sono migrati come `subjectType=ASSET`, `origin=USER`.
| Metodo | Path | Note |
|---|---|---|
| GET | `/assets/:assetId/maintenance-suggestions` | proposte di piani basate su linee guida statiche per tipo di Asset (nessuna scrittura — vedi `decisions.md` #19) |
| POST | `/assets/:assetId/maintenance-suggestions/:code/dismiss` | ignora definitivamente una linea guida per quell'Asset (persistito, idempotente) — vedi `decisions.md` #22 |
| GET | `/documents/:id/maintenance-proposals` | calcola interventi estratti e piani attivi compatibili, inclusi candidati multi-Asset |
| POST | `/documents/:id/complete-maintenance` | conferma atomicamente i piani selezionati e li collega al documento |
| GET | `/assets/:assetId/maintenance-plans` | piani dell'Asset con stato calcolato e conteggio esecuzioni |
| POST | `/assets/:assetId/maintenance-plans` | crea piano una tantum o ricorrente |
| PATCH | `/maintenance-plans/:id` | modifica il piano senza alterare lo storico |
| DELETE | `/maintenance-plans/:id` | ammesso solo se non esistono esecuzioni; altrimenti sospendere |
| POST | `/maintenance-plans/:id/complete` | registra esecuzione + evento cronologia e calcola la prossima scadenza in transazione |
| POST | `/maintenance-plans/:id/pause` | sospende i promemoria preservando dati e storico |
| POST | `/maintenance-plans/:id/reactivate` | riattiva con una nuova `nextDueAt` confermata dall'utente |
| GET | `/maintenance-plans/:id/occurrences` | storico esecuzioni con contatto/documento opzionali |
| GET | `/houses/:houseId/maintenance-reminders` | sole manutenzioni `UPCOMING`/`OVERDUE`, esclude Asset dismessi |

## Compliance

| Metodo | Path | Note |
|---|---|---|
| GET | `/houses/:houseId/compliance` | valutazione read-only con copertura, esiti conservativi, fonti e disclaimer. Senza regole territoriali `ACTIVE` restituisce `UNKNOWN` e non genera `MaintenancePlan` |

## Affidabilità della memoria (B48)

| Metodo | Path | Note |
|---|---|---|
| GET | `/houses/:houseId/memory-reliability` | calcolo dal vivo (nessuno snapshot persistito): tre coperture `{completed, total}` — Asset con documenti, campi "core" con provenienza, Intervention/Warranty con evidenza nota — e media pesata che esclude le dimensioni senza dati. Distinto da Home Score e da Compliance, vedi `decisions.md` #48 |

## Genesis

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/genesis/demo-catalog` | catalogo dimostrativo selezionabile di ambienti e Asset |
| POST | `/houses/:houseId/genesis/scan` | avvia la demo con `type`, `roomNames[]` e `assetNames[]`; crea solo le Observation scelte |
| GET | `/houses/:houseId/genesis/resume` | restituisce lo step persistito e, per Review, ultima sessione con Observation |
| PATCH | `/houses/:houseId/genesis/step` | salva uno dei 6 step; consente ritorno indietro o avanzamento di un solo step |
| GET | `/houses/:houseId/genesis/score-history` | ScoreSnapshot degli ultimi 12 mesi, in ordine cronologico |
| POST | `/houses/:houseId/genesis/recalculate` | ricalcola Score e Issue correnti; salva uno snapshot solo se valori/versione cambiano |

## Gmail (OAuth + scansione)
| Metodo | Path | Note |
|---|---|---|
| GET | `/auth/gmail/connect` | avvia OAuth per l'utente della sessione corrente (redirect a Google, `state` = nonce CSRF legato alla sessione, non più un `userId` in query — vedi `decisions.md`) |
| GET | `/auth/gmail/callback` | redirect URI registrato in Google Console; verifica il nonce prima di salvare i token |
| GET | `/users/me/gmail-status` | connesso sì/no, per l'utente della sessione |
| POST | `/users/me/gmail-disconnect` | |
| POST | `/houses/:houseId/gmail-scan` | cerca nuove email con allegati, popola i candidati |

## Drive (OAuth + scansione)
| Metodo | Path | Note |
|---|---|---|
| GET | `/auth/drive/connect` | stesso schema di Gmail |
| GET | `/auth/drive/callback` | |
| GET | `/users/me/drive-status` | |
| POST | `/users/me/drive-disconnect` | |
| GET | `/users/me/drive-folders` | elenco cartelle per la scelta utente |
| POST | `/users/me/drive-folder` | imposta cartella da scansionare |
| POST | `/houses/:houseId/drive-scan` | |

## Nota

Il flusso OAuth (Gmail/Drive) fa un redirect completo del browser: **non funziona se avviato da un cellulare connesso all'IP LAN del backend**, perché il redirect URI registrato in Google Console punta a `localhost` — tracciato in `backlog.md`.
