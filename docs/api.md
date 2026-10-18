## 2026-10-18 — Modalità delle bozze nelle capabilities

GET object-onboarding/capabilities include anche `mode` per ciascuna bozza già filtrata per account, casa e versione/SHA della fonte. Il frontend distingue una proposta `extraction` aperta da una bozza `manual` e apre direttamente la revisione disponibile. Nessun nuovo endpoint o invio al provider.

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

## V5 M2 — API documentali autonome
Base /api/v5; contratto completo docs/v5/documents-api-contract.md. GET/POST /homes/:homeId/documents, GET /homes/:homeId/documents/:documentId, GET .../:documentId/file, POST /homes/:homeId/documents/export. Cookie+Account-Context; Origin/CSRF su POST; upload multipart idempotente; file e ZIP binari autorizzati. Codice implementato, runtime/migrazione e prove API ancora da eseguire con launcher -Documents -Test. API legacy non cambiate.

## V5 M3 review-v1
Dodici endpoint locali analysis-capabilities, analysis-jobs (lista/creazione/dettaglio/retry), assets (lista/creazione/dettaglio), review, confirmations, manual-confirmations e history. Contratto completo docs/v5/review-api-contract.md. Codice implementato, migration/attivazione e API/PostgreSQL da verificare prima di dichiararli disponibili.


## V5 M4 — analysis-v2
Stessi endpoint review-v1, contratto esteso docs/v5/anthropic-api-contract.md. Capabilities espone providers, limiti e budget; POST analysis-jobs accetta provider esplicito e consentToProviderTransfer=true per Anthropic. Omissione del provider rimane analisi fixture per client M3. Retry Anthropic richiede nuovo consenso e nuovo tentativo con costo; nessun retry automatico. Job espone model/provider/isSimulation/billing; scheda espone analysisProviders e proposte/storia dichiarano origine per elemento. Zero dati supportati è succeeded/no_supported_data senza creare scheda vuota. Adapter implementato e verificato offline, runtime e live ancora da collaudare.

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


### API V5 economy-v1 — S1a/b locale

Base /api/v5/homes/:homeId/economy. GET capabilities, expenses, expenses/:id, expenses/:id/history, summary, works, works/:id, works/:id/history; POST expenses, expenses/:id/updates|archive|restore, works, works/:id/updates|archive|restore. Sessione/CSRF/account-context, CAS e idempotenza; tipi/query/errori in docs/v5/economic-history-api-contract.md. documentDrafts=false: rotte job/bozze non ancora implementate. Vecchie API H3a invariate.


### V5 economy-v1 — job/draft S1c in modalità fixture

POST document-analysis-jobs, GET document-analysis-jobs/:id, POST document-analysis-jobs/:id/retries; GET drafts, drafts/:id, drafts/:id/candidates; POST drafts/:id/park|reopen|confirm. Stessa base economy-v1, sessione/CSRF, idempotenza, CAS e redazione attuale. Capabilities documentDrafts true, test_fixture_v1 esplicito e Anthropic disabled. Vedere report S1c per limiti e prove: non è estrazione AI generale da PDF arbitrari.


### 15 ottobre 2026 — Ledger e worker Anthropic economico, ancora disabilitato
Registro separato EconomicAiCampaign/EconomicAiAttempt, riserva atomica, quota/costi, consenso start/retry, recupero senza reinvio e permessi prima di count/Messages/pubblicazione. Migrazione20261015090000 solo DBV5 dedicato. Build/lint96offline/21DBHTTP verdi con AnthropicHTTP stub. API riavviata; providerdisabled, ledger economico vuoto, M4rimasto8. Report docs/v5/economic-ai-ledger-worker-20261015.md. Consenso frontend affidabile a Claude; nessun paid, budgetlive ancora da autorizzare dopo integrazione.



### 15 ottobre 2026 — Primo collaudo Anthropic economico reale
Autorizzati1USD/treanalisi solo sintetici. Aggiunta allowlistSHA256 obbligatoria server (ECONOMY_AI_ALLOWED_SHA256), rifiuto prima riserva e trasferimento. Build/lint16mirati verdi; dueMessages reali Sonnet4.6, gas80/20/100 e fattura100+22/lordo122 corretti, conferma canonica totale202EUR. SpesaAPI0,021834USD settled; M4invariato8. Providerdisabilitato in finally/APIriavviata. Report docs/v5/economic-anthropic-live-20261015.md. Nessun terzoinvio o quota resettata; nessuna bolletta personale. Claude possibileottimizzazione bundle incaricopreparato; frontendnonmodificato.


## V5 C1a sharing-v1 — 15 ottobre 2026

API documentale selettiva separata da M2: capability/picker/preview/share sotto homes/:homeId, code-claims autenticato, received-shares a livello account e download per sola consegna accettata. Nessun accesso implicito a Home o economie. Trasporto, DTO, errori e limiti nel contratto [sharing-v1](v5/sharing-api-contract.md); backend verificato in [C1 backend](v5/c1-backend-review-20261015.md).

## V5 account recovery e verifica email 16 ottobre 2026

Nuovi POST /api/v5/auth/password-recovery, /complete, /auth/email-verification e /complete; primo 202 neutro, completamenti204. GET /session aggiunge authRecovery.enabled e account.emailVerifiedAt/requiresEmailVerification. Contratto completo docs/v5/account-recovery-api-contract.md. CSRF/Origin e sessione anonima, token monouso hash, nessun login automatico. Nuovi account a canale attivo richiedono verifica per upload; precedenti non bloccati.


## V5 Fase0 — 16 ottobre 2026
POST documenti conserva il contratto, aggiunge errori 503 file_check_unavailable e storage_capacity_low prima del commit documento. Ricevuta scanner solo DB, nessun nuovo endpoint export. Vedi docs/v5/documents-api-contract.md.

## V5 personal-export-v1 — 16 ottobre 2026
POST /api/v5/homes/:homeId/personal-export con body {}, Origin/CSRF e X-Account-Context obbligatorio:200 allegato JSON versione1 personale, membership owner/member con export. Originali separati ZIP M2. 413 personal_export_too_large;503 personal_export_busy/personal_export_unavailable; autenticazione/privacy come identity. Budget10000righe10MiB2concorrenti, letture coerenti e controllo fresco prima della risposta. Contratto docs/v5/personal-export-api-contract.md; esito docs/v5/personal-export-esito-20261016.md.

## 2026-10-16 — Ricevuta assistita, specifica e primo nucleo backend
Le rotte receipt-assistance descritte in docs/v5/receipt-assisted-spec-v1.md sono pianificate, NON disponibili. Il nuovo validatore/policy offline non espone endpoint. Non riutilizzare document-analysis-jobs economici come se creassero già oggetti generici.

## 2026-10-16 — Ricevuta R2: bozze persistenti in modulo isolato
Modulo non importato in AppModule: rotte manual-drafts, drafts/:id, park/reopen e capabilities provate solo in harness HTTP reale. Payload/stati/privacy in docs/v5/receipt-assistance-backend-20261016.md. Nessun nuovo endpoint attivo annunciato.

## 2026-10-16 — Ricevuta R3 e integrazione sorgenti Claude
Modulo ancora non attivato: lettura campi/confronti, paginazione e risoluzioni keep/defer implementate e provate in harness HTTP. Dettagli contratto R3 in docs/v5/receipt-assistance-backend-20261016.md; conferma atomica/job restano da implementare.

## 2026-10-16 — Ricevuta R4 conferma transazionale
POST confirmations e GET confirmation per recupero esito nel modulo isolato, body e risposta definiti nel rapporto R4 docs/v5/receipt-assistance-backend-20261016.md. Modulo ancora NON importato: nessuna nuova API di prodotto annunciata attiva.


Ricevuta assistita R5a (16 ottobre2026): policy fonte/versione/hash del nome generico estesa a catalogo G1 prima di LIMIT, scheda/storia, riferimento S1 ed export con verifica dei proof dopo snapshot. Rinomina manuale sostituisce la provenienza del nome; storia degli oggetti ricevuta mostra nome corrente autorizzato. Backend compilato/testato su fixture, servizio registrato non riavviato, modulo ricevuta ancora isolato/capabilities false. Dettagli docs/v5/receipt-assistance-backend-20261016.md.

Ricevuta R5b: JSON personale v1 aggiunge array receiptFields/receiptComparisons con mapper allowlist e controllo fonti; filtro ambiente S1 esclude correlazioni a nomi derivati non più autorizzati. Build/lint e30DB/HTTP mirati verdi; servizio non ancora riavviato, modulo ricevuta isolato. Vedi report receipt-assistance-backend-20261016.

Ricevuta R5c: GET /api/v5/homes/:homeId/receipt-assistance/drafts/:id/object-candidates e expense-candidates implementate nel modulo NON attivo. limit1–50/cursor; risposta items/linkedCount/nextCursor; cursor account/Home/bozza/versione/tipo. linkedCount oltre pagina impedisce falsa unicità. Rank legame stesso documento, stesso hash leggibile, marca+modello per oggetti, poi selezione manuale personale. Conferma deduplica copie dello stesso originale e riusa il documentId canonico del costo; nessun confronto con fonti private altrui. Report receipt-assistance-backend-20261016.

Ricevuta R6b: POST /api/v5/homes/:homeId/receipt-assistance/jobs (202, documentId/provider receipt_fixture_v1/consentToProviderTransfer:false, Idempotency-Key) e GET jobs/:id implementati nel modulo NON attivo. DTO e codici in docs/v5/receipt-assistance-backend-20261016.md; fonte stale/revocata redatta, nessuna chiamata esterna, solo hash fixture noti. Manuale indipendente.


### 2026-10-16 — Ricevuta R7a
Ricevuta R7a: park accetta selection object/expense validata, GETdraft proietta review con targetVersions/staleTargets; reopen esplicito. API ancora isolata, non attiva.


### 2026-10-16 — Ricevuta R7b
Receipt R7b: capability documentId opzionale con controllo fonte; confronti DTO con draftId/documentLink redatti se indisponibili. GETrecupero frontend porta stessa key della POST. Modulo ancora isolato.


### 2026-10-16 — Ricevuta R7c preparazione
Preparazione QA ricevuta: capability per documentId noto sintetico ed edit, provider fixture locale esplicito; fonti diverse bloccate503 receipt_assistance_in_development nelle mutazioni del modulo. Non ancora attivo nel servizio.


### 2026-10-16 — Ricevuta R7c browser
R7c runtime ricevuta attivo esclusivamente fixture4hash: capability per documento+resume scoped {draftId,jobId}, job attivo prioritario, poi bozza open/parked. Personali bloccati503 nelle mutazioni. Browser reale sintetico verificato.

### 16ott2026 Ricevuta R8b
Receipt jobs supportano anthropic opt-in con consenso esplicito e allowlist server; provider resta disabilitato. JobDTO aggiunge model/billing e stato uncertain, DraftDTO analysis opzionale con costo persistente. Fonte revocata redige metadati. Dettagli: docs/v5/receipt-assisted-spec-v1.md R8b. Nessun nuovo endpoint live o chiamata esterna eseguita.

### 16ott2026 Archivio assistito B1a — solo modulo isolato
Progettato contratto docs/v5/document-intake-api-contract.md. Implementati GETdocument-intake/capabilities(disabled), POSTbatches e GETbatches/:id solo nel modulo di collaudo NON importato in AppModule. Sessione/CSRF/account/Home/idempotenza; nessun nuovo endpoint esposto nell’app. Upload/job/review/conferma e filtri ancora da completare.

###16ott2026 ArchivioB1b isolato
Aggiunto POSTdocument-intake/batches/:batchId/items/:itemId/file (solo file multipart, chiave stabile) e GETlotto recupera esito/scadenza. Dedup privata perupload, sorgenti rilette e redatte, quota2account/lease120s. AppModule NON importato, nessun endpoint prodotto attivato. Specifica B1b document-intake-api-contract.md. Filtro errori comune esteso solo a questi path, errori Documenti precedenti preservati.

## V5 B2 —16ott2026
Intake ISOLATO: POST review, GET ricevuta review, POST confirmations, GET esiti, POST duplicate-resolution; firme vincolanti in docs/v5/document-intake-api-contract.md B2. Nessuna registrazione AppModule. Documenti attivo: query collection, metadati personali in lista/dettaglio/manifestZIP/JSON personale, source proof e cursor/cache per raccolta.

## V5 archivio nell'app16ott2026
DocumentIntakeModule registrato, capability enabledtrue con motore local_text_v1, costo0 e externalTransmissionfalse. Nuovi POSTanalyses locale, GETbatches paginato, POSTupload-cancellation e404recuperoconfermanonricevuta. Dettagli vincolanti in docs/v5/document-intake-api-contract.md B3locale/B4. Nessun endpoint invia dati ad Anthropic; futuro provider richiede budget/consenso/contratto proprio.

### 16 ottobre 2026 — Aggiunta progressiva di documenti allo stesso lotto
POST /homes/:homeId/document-intake/batches/:batchId/items, body {items:[clientItemId,filename,byteSize,mimeType]}, Idempotency-Key. Stessa validazione manifest/CSRF/account/Home/ruolo/email del caricamento iniziale. Append commutativo senza expectedVersion: lock lotto e quote rilette serializzano conteggio, byte e ordinali, mentre i job possono avanzare. Max20file e200MiB sull'intero lotto, non per singola selezione. Stessa chiave/payload → replay del lotto attuale; payload diverso →409; clientItemId già presente con altra richiesta →409. Nessuna lettura di originali, schema o provider aggiunti.
I file, le proposte, le scelte e gli esiti confermati precedenti non sono sovrascritti. Un lotto completato riapre solo per accogliere nuovi file; i risultati precedenti restano registrati. Il client usa stesso batchId e upload indipendenti soltanto per gli ID della nuova selezione; non ritenta automaticamente file precedenti falliti. Esito incerto conserva chiave/manifest per recupero. Risposta tardiva non naviga in un altro lotto.
Il pulsante «+ Aggiungi documenti» nel lotto apre la medesima selezione/drag&drop e torna al lotto dopo la scelta, anche scegliendo un solo file. Durante il caricamento il selettore è disabilitato. Nessun file personale usato per verificare l'aggiunta, nessuna chiamata AI/email/paid, nessuna modifica .env/quote/sicurezza. Solo DB V5 dedicato e riavvio dell'API registrata.

16ott2026: catalogo intake additivo agibility_record→building; stesso POSTanalyses locale, ora anche copie autorizzate e file ready senza proposta selezionabili dalla UI. Nessuna API nuova/migrazione; nessunpaid/OCR.


### 16 ottobre 2026 — Riuso distinto da organizzazione e correzione senza upload
Diagnosi in sola lettura sul contesto del committente: il classificatore aveva proposto agibility_record, ma l'azione scelta era reuse dell'originale; una precedente organizzazione other/unclassified era quindi rimasta invariata. Non è un errore del filtro building né un fallimento di riconoscimento della visura. Nessuna modifica dei suoi dati effettuata dal collaudo: consultati solo metadati scoped al suo account/Home, non i byte originali. Evidenza locale outputs/intake-organization-readonly-result.json NON da committare.
La revisione di una copia con organizzazione other e proposta più specifica ora preseleziona i tipi proposti, conservando titolo personalizzato e consenso di sostituzione esplicito. Scelte già classificate restano conservate. Il solo riuso avvisa che non applica titolo/categoria e lo stato non dice più Organizzato: Originale riusato · organizzazione invariata.
POST /homes/:homeId/document-intake/batches/from-documents {documentIds:[uuid,...]} +Idempotency-Key prepara una nuova revisione degli originali già autorizzati (max20/200MiB e stessi limiti di formato/dimensione). Non ricarica byte, non crea Document/StoredFile, non modifica organizzazioni o vecchi ledger. Lock/check di account/Home/ruolo/email/originale; idempotenza peraccount/Home/chiave con digest origine distinto dai manifest. Riusa solo proposte precedenti dello stesso account/Home/documentId/versione/hash; altrimenti not_started. La nuova organizzazione esiste solo dopo salvataggio e conferma, con replaceOrganization/versioni quando necessario.
Il comando Riorganizza senza ricaricare sui file confermati prepara quel lotto e porta lì il client, proteggendo da doppio clic e risposte tardive di altro lotto. Nessun automatismo paid/AI/OCR o classificazione retroattiva; la categoria deriva dal tipo riconosciuto oppure scelto. Per scansioni unreadable l'OCR resta fuori scope.

### Documenti V2 — API integrate e collaudate, notte 16 ottobre 2026
POST /homes/:homeId/document-intake/batches/:batchId/organizations e GET /organizations/:key: conferma diretta singola/multipla, selezione esplicita, ricevute e recupero same-key, esiti per file. duplicate-resolution/reuse_reference mantiene anche stored già organizzati con fonte e proof attuali; niente riscritture o collegamenti. Contratto autorevole docs/v5/document-intake-api-contract.md e document-intake-simplified-spec-v2.md. Compatibilità V1 conservata; nessuna migrazione/provider esterno.


### V5 manuali online oggetti — 17 ottobre 2026
POST homes/:homeId/objects/object/:id/manual-proposals ricerca pubblica produttore senza scrittura; POST .../manual conferma candidate/token, aggiunta manuale o rimozione con expectedVersion e Idempotency-Key. Guard/CSRF/contesto/proprietà/ruolo, replay e versioni comuni. Solo oggetti generici; GET objects/:kind/:id proietta manual additivo. Contratto, limiti e prove docs/v5/object-manuals-20261017.md.


### 17 ottobre 2026 — onboarding documenti e oggetti O2–O5

Endpoint Home V5 object-onboarding (job/bozze/candidati/revisione/conferme recuperabili/confronti) e modifica profile oggetto implementati; contratto completo docs/v5/object-onboarding-api-contract-v2.md. Provider attualmente disabilitato, prova reale incerta.


### 17 ottobre 2026 — validazione fattura e caricamento integrato

Capabilities e endpoint onboarding restano invariati; nuova composizione frontend Documenti V2 organizations prima di onboarding confirmations. Nessuna creazione se esito documenti incerto. Formati ricevuta tabellare/data acquisto supportati; contratto dettagliato docs/v5/object-onboarding-api-contract-v2.md.

### 17 ottobre 2026 — proposta automatica spesa con conferma unica

Ricevuta estratta non ambigua,unico articolo/esemplare,totale positivo e acquisto esplicito: controllo candidati e proposta create già visibile, mai scrittura prima della conferma articolo. Nessun costo automatico da consegna/etichetta/multiarticolo o dati insufficienti. Scelte precedenti salvate restano prioritarie, inclusa esclusione costo. Ricerca incerta/errore blocca proposta automatica: riprova oppure scelta esplicita. Stessa ricevuta o stessa cifra/data producono avviso senza scelta automatica. Importo/data non provano identità del costo: scelta link/skip oppure acquisto distinto dichiarato. Conferma resta una e usa transazione/idempotenza esistenti.

GET expense-candidates: rank2 stessa fonteSHA,rank1 stesso importo/data acquisto,rank0 selezione manuale. Ordinamento su tutto lo scope autorizzato prima della paginazione. Conferma expense.create ammette acknowledgePossibleDuplicate boolean opzionale; senza true un altro costo attivo leggibile con stesso importo/data genera409 onboarding_possible_expense_duplicate. True non supera il divieto di secondo costo per stessa ricevuta, né controlli fonte/target/versione. Nessuna migrazione o nuovo endpoint. Controllo ripetuto nella transazione con lock Home condiviso dalle mutazioni.



### 17 ottobre 2026 — consolidamento onboarding pilota

Sostituzione esplicita versionata, quote manuali multiarticolo con limite cumulativo e tipi ordine/consegna/etichetta implementati; conferma unica e recupero conservati. Dettagli, prove e limiti: `v5/onboarding-pilot-consolidation-20261017.md`. Nessuna migrazione o attivazione provider; priorità ora uso reale e feedback.


### 17 ottobre 2026 — attivazione AI casa con tetto autorizzato

Modalità pilota account/casa, consenso per invio e campagna persistente5 USD/40 analisi. Contatori e blocchi visibili; collaudi esclusivamente simulati, attivazione verificata senza Messages. Appartamento Roma svuotato dopo conferma definitiva, mantenendo account/anagrafica e nuovo budget. Vedi `v5/ai-home-pilot-20261017.md`.


### Caricamento unico — 17 ottobre 2026

Output onboarding additivo houseExpenses e documentKind utility_bill; conferma di costi della casa senza objectRef/workId, nello stesso budget del pilota. Vedi docs/v5/unified-document-proposals-v1.md.


### HTTP400 bollette — 17 ottobre 2026

POST object-onboarding/jobs accetta acknowledgePreviousUncertainAnalysis=true soltanto come nuovo consenso esplicito; chiave separata e budget invariato. Capability additiva canStartWithUncertainAcknowledgement. Report: docs/v5/unified-document-proposals-verification-20261017.md.


### Bollette — prove autonome 17 ottobre2026

Bozze bollette includono reviewWarnings con codici dei dati esclusi; solo candidati verificati entrano nella conferma. Report: docs/v5/unified-document-proposals-verification-20261017.md.


## V5 — 18 ottobre 2026, revisione unica

Endpoint invariati. JSON delle proposte articoli esteso con purchaseAmount facoltativo (amountCents e fonte verificata), senza migrazione. expense-candidates accetta itemId anche per articoli, con confronto importo/data della riga; choices multiple e skip restano la conferma atomica esistente. Nessun oggetto/costo dalla lettura. Contratto e recupero: v5/document-review-unified-v4.md.

### Onboarding V5 —18 ottobre 2026
Confirmations: costo dichiarato esplicitamente ammesso anche per bozza mode=manual/documentKind=unsupported, con medesimi controlli canonici e transazione oggetto+spesa. Nessuna nuova API, schema Prisma o modifica quote. Il wire esterno V8 usa array0/1; i DTO applicativi e le bozze mantengono oggetti nullable.
