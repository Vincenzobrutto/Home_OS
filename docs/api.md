## 18 ottobre 2026 — Analisi AI dei documenti selezionati

POST /api/v5/homes/:homeId/object-onboarding/automatic-runs estende il contratto con proposalOnly:true, automaticProcessing:false, consentToProviderTransfer:true, batchId e documentIds esatti (1–20). automaticContacts:true è incompatibile con questa modalità. La modalità è inclusa nell’impronta idempotente; il consenso e il manifest restano persistiti. GET automatic-runs/batches/:batchId restituisce anche mode=proposals|automatic. In proposals lo stato completed significa bozza pronta, non organizzazione o creazione di oggetti/spese/contatti. Guardie account/casa/fonte/versione/SHA, quote e riserva per analisi restano invariate.

## 18 ottobre 2026 — Document workspace V5

GET /api/v5/homes/:homeId/documents accetta workflow=all|pending|completed (default all), combinabile con ricerca/raccolta/formato/visibilità; filtro applicato prima della paginazione e incluso nella firma del cursor quando attivo. Le vecchie firme senza filtro rimangono valide. Stato personale account/casa e versione/SHA correnti.

GET /api/v5/homes/:homeId/documents/:documentId/removal restituisce {allowed,reason}; richiede edit e originale privato proprio. POST stesso percorso, {expectedVersion} e Idempotency-Key, restituisce {removed:true}. Rimuove soltanto fonti inutilizzate, relativi riferimenti di caricamento, versione e storage; storico AI, proposte, organizzazioni e collegamenti bloccano l’operazione con 409. Replay persistente; nessuna modifica a oggetti/spese/budget.

## V5 — Lista caricamenti da completare (18 ottobre 2026)

GET /homes/:homeId/document-intake/batches accetta state=open|completed facoltativo insieme a cursor. open restituisce soltanto lotti personali aperti con almeno un item. Filtro applicato prima del limite10; cursori legati a account/casa/filtro. Senza state resta il contratto precedente e sono validi i cursori preesistenti. Nessuna scrittura o chiamata AI.

## V5 — Rimozione dal caricamento (18 ottobre 2026)

Il DTO item aggiunge canRemove:boolean, ricalcolato dai riferimenti canonici. POST /homes/:homeId/document-intake/batches/:batchId/items/:itemId/removal con {expectedVersion} e Idempotency-Key restituisce il lotto aggiornato. Stessi guard account/casa/CSRF/edit, lock casa/lotto, controllo versione e replay. Una copia elimina solo la riga; un originale è cancellabile soltanto se privato dell’utente, unico nel lotto e non elaborato/organizzato/collegato/condiviso. Automatic-run già autorizzato sul lotto blocca rimozione. Risposte409 per stato cambiato o non scartabile. Nessuna modifica al ledger AI.

## V5 — 18 ottobre 2026: contatti nelle proposte documentali

Lo schema AI aggiunge i facts document-level issuerPhone, issuerEmail, issuerVatId, issuerFiscalId (subjectIndex=-1). Il draft espone contacts con id, values, sources, warnings, resolution (create/use_existing/review, contact, candidates, conflicts) e decision. La conferma accetta contacts: [{proposalId, action: save|skip, contactId?, expectedVersion?, values?, createDistinct?}]; è ammessa la sola conferma contatti senza creare oggetti/spese. Ownership, versione, sorgente e idempotenza restano obbligatorie. I risultati aggiungono newContacts/linkedContacts solo alle richieste con contacts. Il corpo di avvio automatico accetta automaticContacts?:boolean: assente/false conserva la vecchia semantica; true deve corrispondere al consenso aggiornato. Scelte manuali di contatto e valori modificati non sono accettati nella conferma interna automatica. Nessun nuovo endpoint o migrazione.

## 18 ottobre 2026 — contacts-v1

Nuova API privata in /homes/:homeId: GET contacts (q/state/resourceKind/resourceId/limit/cursor), GET contacts/:id e /links, POST contacts, POST contacts/:id/updates|archive|restore|links|unlink. Mutazioni idempotenti con versione, controllo membri/CSRF e ambito privato. GET contact-suggestion?documentId propone issuer solo da conformità estratta stessa fonte/versione/SHA, senza AI o salvataggi. Contratto e limiti completi in [mini-rubrica](v5/mini-rubrica-20261018.md).

## 18 ottobre 2026 — Proiezione onboarding: idoneità della proposta umana

La bozza include purchaseExpenseReady:boolean, additivo e falso per bozze storiche prive della prova. Calcolato dal dominio, consente alla UI di proporre il costo di acquisto nonostante sole omissioni opzionali di consegna/garanzia; richiede ancora condizioni prezzo/data/quantità e controllo doppioni. Non autorizza conferma automatica. houseExpenses.amountSelectionRequired considera arretrati solo se positivi. Nessun nuovo endpoint.

## V5 — organizzazione automatica del caricamento (2026-10-18)

- POST /homes/:homeId/object-onboarding/automatic-runs (202), idempotency-key obbligatoria: {batchId,documentIds:[uuid...],consentToProviderTransfer:true,automaticProcessing:true}. Da1a20 documenti, elenco esatto degli originali caricati nel lotto. Consenso include invio Anthropic e salvataggio delegato dei casi chiari. Nessuna API key o quota accettata dal client.
- GET /homes/:homeId/object-onboarding/automatic-runs/batches/:batchId: {run:null|{id,batchId,state:running|finished,entries:[{documentId,name,state:pending|waiting|completed|attention|unavailable,reason,draftId,newObjects,newExpenses}]}}. Nomi/ID/fonti oscurati se non leggibili o cambiati.

Guard sessione/CSRF/context e membership del controller esistente. Il worker continua senza pagina aperta; un singolo invio per originale, limiti AI esistenti invariati. Rifiuto/esito incerto diventa eccezione, nessuna nuova analisi automatica. Fonte aggiornata, campi già iniziati e candidati oggetto/spesa richiedono revisione. I percorsi manuali e le conferme esplicite restano disponibili.

## V5 — contratto onboarding V12

Nessun endpoint nuovo. item.subjectKind opzionale product/system; houseExpenses può avere documentKind simple_invoice per un costo complessivo di fattura, oltre a utility_bill. Conferma combina choices e houseExpenses atomicamente. document_only ammesso anche per soggetti di fattura con costo complessivo. Vietate doppia allocazione e spesa superiore al totale; esclusione richiede costo casa dichiarato e tetto ridotto delle quote escluse note. Dettagli: docs/v5/document-understanding-v12-report-20261018.md.

## V5 — estensione onboarding V11 (2026-10-18)

Nessun nuovo endpoint. Draft può includere documentInfo, reviewWarnings e subjectKind/proposedType sugli item. Conferma ammette action=document_only (solo conformità, itemId/action) e documentOnly=true per bozza riconosciuta senza item/spese. Nessun dato finanziario ammesso nel payload document_only; autorizzazione, privacy, snapshot e idempotenza invariati. Vedi docs/v5/document-understanding-v11-report-20261018.md.

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
| DELETE | `/auth/me` | cancella l'account: elimina fisicamente i file delle case possedute, poi case/membership/utente e invalida il cookie. Irreversibile, vedi `decisions.md` #53/#67 |
| POST | `/auth/consent` | registra `consentedAt = now()` per l'utente della sessione corrente (B55) — idempotente |

## Houses
| Metodo | Path | Note |
|---|---|---|
| POST | `/houses` | crea casa (owner = utente della sessione, non più un `ownerId` nel body), genera `code` (`CASA-####`) e la `HouseMembership` `OWNER`. `region` obbligatoria (una delle 20 regioni italiane), vedi `decisions.md` #70 |
| GET | `/houses/:id` | dettaglio |
| PATCH | `/houses/:id` | anche `floorPlanRotation` |
| DELETE | `/houses/:id` | solo OWNER (403 altrimenti); elimina fisicamente tutti i file della casa e poi i record in cascata. Irreversibile, vedi `decisions.md` #53/#67 |
| GET | `/houses/:id/export` | ZIP B62 con `dimora-data.json` e tutti i file originali in `documents/`. Chiunque abbia accesso alla casa |
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
| DELETE | `/documents/:id` | elimina definitivamente record e file originale; i riferimenti seguono le regole `Cascade`/`SetNull` dello schema |
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

## V5 M4 — integrazione locale conclusa (13 ottobre 2026)
Contratto analysis-v2 implementato sui percorsi review-v1, docs/v5/anthropic-api-contract.md. Provider/consenso, capabilities con budget, billing e origine per proposte/storia. Fixture default per client M3 senza provider; vecchie impronte idempotenti preservate. HTTP 422 validation_error senza consenso, nessun job; errori di analisi nel job failed. HTTP 429/disabledReason ai_evaluation_limit_reached distingue le sei chiamate iniziali dal tetto ai_budget_exhausted. No_supported_data non crea scheda vuota. API/DB/client/browser verificati; report docs/v5/m4-integration-review.md.

## H1 activities-v1 — contratto, non endpoint attivi
Contratto docs/v5/activities-api-contract.md: activity-capabilities, activities lista/creazione/dettaglio, updates/complete/cancel/reopen, history e activity-summary sotto /api/v5/homes/:homeId. Cookie/CSRF/Account-Context, idempotenza, versione e privacy personali. Date YYYY-MM-DD/Europe-Rome, today/dueState server. Implementazione da iniziare, non interrogare i mock come servizio reale.

## H1 activities-v1 — backend locale attivo
Dieci endpoint sotto /api/v5/homes/:homeId: GET activity-capabilities, GET/POST activities, GET activities/:id, POST activities/:id/updates|complete|cancel|reopen, GET activities/:id/history e GET activity-summary. POST richiede Origin/CSRF/Idempotency-Key; versione e dati privati controllati. today/dueState server, fuso Europe/Rome. Contratto docs/v5/activities-api-contract.md; runtime 3001 verificato, frontend/browser ancora aperti.

### H1 — frontend/API verificati
Dieci endpoint activities-v1 integrati con il client reale, 15 prove frontend/API (incluse regressioni M1–M4 non-live) superate. Crea, updates, complete, cancel, reopen, history e summary osservati nel browser con DB reale; nessun fallback demo. Il runner test:integration esclude le prove live a pagamento e rispetta il rate limit. Resoconto docs/v5/h1-integration-review.md.

## H2 document-search-v1 — contratto, endpoint non ancora attivi
GET /api/v5/homes/:homeId/document-search-capabilities pianificata; GET documents da estendere con q/format/visibility oltre limit/cursor. Risposta DocumentsPage M2 invariata; query class dedicata per non allargare le rotte M3/M4. Cursori nuovi legati al digest dei filtri, vecchi M2 accettabili solo senza filtri. Specifica docs/v5/document-search-api-contract.md; backend da implementare.

## H2 document-search-v1 — backend implementato
Capabilities e q/format/visibility della lista documenti implementati, risposta M2 invariata. DTO dedicato lascia rigorose le query M3/M4. Policy applicata prima di filtri e paging; cursori legati a account/Home/digest. Test HTTP su harness passano; attivazione del servizio 3001 ancora da verificare. Contratto e stato in docs/v5/document-search-api-contract.md e h2-integration-review.md.

## H3a expenses-v1 — contratto congelato, endpoint non ancora attivi
Expense capabilities/list/detail/create/updates/archive/restore/history/summary sotto /api/v5/homes/:homeId, trasporto/policy/idempotenza V5. Contratto docs/v5/expenses-api-contract.md; non usare il mock come prova di disponibilità reale.

## H3a expenses-v1 — backend locale attivo
Nove rotte del contratto expenses-api-contract.md implementate su 3001: capabilities/list/create/detail/updates/archive/restore/history/summary. Query/input stretti, CSRF/AccountContext, no-store, membership personale e riferimenti redatti; replay rilegge i diritti correnti. GET summary calcola centesimi annui manual/document nel DB. Frontend e client/browser H3 ancora aperti.

### H3a — client reale consolidato
expenses-v1 consumata dal frontend reale5174 con context/CSRF/no-store/idempotenza;19 suite client/API non-live aggregate passano, quattro test Anthropic live saltati. Anno storico UI usa year dell’API esistente; non introdotto endpoint anni/facet. Contratto e forme restano quelli congelati in docs/v5/expenses-api-contract.md.


## G1 — contratto e revisione UX raccolta (14 ottobre 2026)

Contratto futuro home-objects-v1 in docs/v5/home-objects-api-contract.md: capabilities, ambienti, catalogo oggetti/boiler, posizioni/storia/reference links. Solo specifica: endpoint ancora NON attivi. Contratti H1/H3a restano invariati.


## G1 — backend attivo e verificato (14 ottobre 2026)

home-objects-v1 ora attivo su API locale3001: object-capabilities, rooms CRUD logico/history, objects catalogo/create/detail/manualupdate/archive/restore/position/history/links/remove. Forme e policy in docs/v5/home-objects-api-contract.md. H1/H3a DTO invariati; assetId nuovo incoerente con link G1 attivo409 resource_already_linked.


## G1 — integrazione finale reale (14 ottobre 2026)

home-objects-v1 G1 integrato col frontend reale. CatalogItem ha note/versione/date per metadati; history before/after DTOdiretto e position.rooms. LinkedResource expense autorizzata include amountCents/currency EUR/spentOn da H3a; unavailable null intero senza importo/ID/titolo. Boiler updates/archive/restore G1 assenti404, nessuna azione UI. DTO/edgecompatibilità in docs/v5/home-objects-api-contract.md.
