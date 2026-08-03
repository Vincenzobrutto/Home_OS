# API

Base URL: `http://<host>:3000` (nessun prefisso globale). Nessuna autenticazione/sessione nell'MVP — tutte le route sono aperte, la separazione tra utenti/case è solo logica (`houseId`/`userId` nel path). Non esporre questo backend direttamente su internet senza aggiungere autenticazione.

Convenzioni: JSON in richiesta/risposta salvo dove indicato (upload file = `multipart/form-data`). Nessun envelope di risposta — gli endpoint restituiscono l'entità o l'array direttamente.

## Users
| Metodo | Path | Note |
|---|---|---|
| POST | `/users` | crea utente |
| GET | `/users` | elenco |
| GET | `/users/:id` | dettaglio |

## Houses
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses` | crea casa, genera `code` (`CASA-####`) |
| GET | `/houses/:id` | dettaglio |
| PATCH | `/houses/:id` | anche `floorPlanRotation` |
| GET | `/users/:userId/houses` | case dell'utente |

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
| PATCH | `/assets/:id` | campi strutturati — **non** accetta `status` (calcolato) |
| DELETE | `/assets/:id` | documenti collegati restano, `assetId` → null |
| POST | `/assets/:id/dismiss` | imposta `dismissedAt` |
| POST | `/assets/:id/reactivate` | azzera `dismissedAt` |
| POST | `/assets/:id/custom-fields` | aggiunge campo libero |
| PATCH | `/custom-fields/:id` | |
| DELETE | `/custom-fields/:id` | |
| GET | `/assets/:id/timeline` | cronologia interventi |
| POST | `/assets/:id/timeline-events` | evento manuale (`contactId`/`documentId` opzionali) |
| PATCH | `/timeline-events/:id` | |

## Documents (pipeline documentale — vedi `architecture.md` §4)
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses/:houseId/documents` | upload (`multipart/form-data`), crea `Document` status `PENDING` |
| GET | `/houses/:houseId/documents` | elenco; filtrare per `houseLevel`/`assetId` lato client per "Documenti casa" |
| POST | `/houses/:houseId/floorplan-background` | upload immagine/PDF planimetria di sfondo |
| GET | `/documents/:id/file` | streaming del file originale |
| POST | `/documents/:id/analyze` | invoca Claude, popola `extractedFields`, status → `ANALYZED`. Nessuna scrittura su Asset. |
| POST | `/documents/:id/confirm` | scrittura reale: `{ assetId }` **oppure** `{ createAssetType, assetName?, roomId? }` **oppure** `{ linkToHouse: true }` |
| POST | `/documents/:id/confirm-floorplan` | conferma ambienti estratti da una planimetria caricata |
| GET | `/houses/:houseId/gmail-candidates` | documenti trovati su Gmail non ancora importati |
| GET | `/houses/:houseId/drive-candidates` | idem per Google Drive |
| POST | `/documents/:id/import-candidate` | promuove un candidato Gmail/Drive a documento normale (`importedAt`) |
| POST | `/documents/:id/ignore` | imposta `ignoredAt`, il candidato non viene riproposto |
| POST | `/documents/:id/move-to-house` | sposta un documento tra case (correzione errore utente) |
| POST | `/documents/:id/search-online` | arricchimento dati via Claude + tool `web_search` |

## Contacts
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses/:houseId/contacts` | |
| GET | `/houses/:houseId/contacts` | |
| GET | `/contacts/:id` | |
| PATCH | `/contacts/:id` | |
| DELETE | `/contacts/:id` | |

## Maintenance
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

## Gmail (OAuth + scansione)
| Metodo | Path | Note |
|---|---|---|
| GET | `/auth/gmail/connect` | avvia OAuth (redirect a Google) |
| GET | `/auth/gmail/callback` | redirect URI registrato in Google Console |
| GET | `/users/:userId/gmail-status` | connesso sì/no |
| POST | `/users/:userId/gmail-disconnect` | |
| POST | `/houses/:houseId/gmail-scan` | cerca nuove email con allegati, popola i candidati |

## Drive (OAuth + scansione)
| Metodo | Path | Note |
|---|---|---|
| GET | `/auth/drive/connect` | |
| GET | `/auth/drive/callback` | |
| GET | `/users/:userId/drive-status` | |
| POST | `/users/:userId/drive-disconnect` | |
| GET | `/users/:userId/drive-folders` | elenco cartelle per la scelta utente |
| POST | `/users/:userId/drive-folder` | imposta cartella da scansionare |
| POST | `/houses/:houseId/drive-scan` | |

## Nota

Il flusso OAuth (Gmail/Drive) fa un redirect completo del browser: **non funziona se avviato da un cellulare connesso all'IP LAN del backend**, perché il redirect URI registrato in Google Console punta a `localhost` — tracciato in `backlog.md`.
