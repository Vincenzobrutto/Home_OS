# HomeOS — Architettura Tecnica

**Stato:** proposta per lo sviluppo post-validazione
**Riferimento:** basata sul modello dati validato nel prototipo cliccabile (Casa → Ambienti → Asset → Documenti)

---

## 1. Obiettivo di questo documento

Tradurre in scelte tecniche concrete il modello che abbiamo validato con gli utenti: Digital Twin della casa, Asset come centro del sistema, Ambienti come contenitori, documenti collegati agli Asset tramite AI con conferma umana. Il prototipo ha dimostrato il flusso; qui definiamo come costruirlo per davvero.

---

## 2. Stack tecnologico consigliato

| Livello | Scelta consigliata | Alternative valide |
|---|---|---|
| Frontend | React + TypeScript (stesso linguaggio del prototipo, migrazione diretta) | Vue, Next.js se serve SSR/SEO per landing pubbliche |
| Backend | Node.js + TypeScript (NestJS) | Python (FastAPI) se il team AI preferisce restare in Python |
| Database | PostgreSQL | — (scelta consigliata senza riserve: relazionale + supporto JSONB per i campi liberi) |
| Storage documenti | S3-compatible (AWS S3, Cloudflare R2, o storage del cloud TIM se disponibile) | — |
| AI estrazione documenti | Modello LLM multimodale con function calling (es. famiglia Claude o GPT-4o) per OCR + estrazione strutturata in un unico passaggio | Pipeline separata OCR (Textract/Document AI) + LLM per l'estrazione, se serve maggiore controllo sui costi |
| Autenticazione | Auth gestita (Auth0, Clerk, o Supabase Auth) per non reinventare login/reset password/MFA | Soluzione custom solo se richiesto da vincoli aziendali specifici |
| Hosting | Container su cloud provider standard (AWS/GCP/Azure) con CI/CD | Infrastruttura TIM se il progetto viene incardinato lì |

**Perché questa combinazione:** è lo stack con cui si trova più rapidamente supporto, documentazione e persone in caso di crescita del team, e non blocca nessuna delle scelte di prodotto già validate nel prototipo (Ambienti come entità separata, campi liberi per Asset, drag&drop planimetria).

---

## 3. Modello dati (schema DB)

Il modello ricalca direttamente quello del prototipo, con le relazioni ora esplicite e vincolate a livello di database.

### `houses`
| Campo | Tipo | Note |
|---|---|---|
| id | uuid (PK) | |
| owner_id | uuid (FK → users) | |
| name | text | indirizzo |
| city | text | |
| surface_sqm | numeric | può arrivare da input manuale o da estrazione planimetria |
| rooms_count | integer | derivato o dichiarato |
| build_year | integer | nullable |
| code | text | es. `CASA—0142`, generato |
| created_at | timestamptz | |

### `rooms` (Ambienti)
| Campo | Tipo | Note |
|---|---|---|
| id | uuid (PK) | |
| house_id | uuid (FK → houses) | |
| type | text | enum: cucina, soggiorno, camera, bagno, ... |
| name | text | |
| code | text | es. `AMB—001` |
| plan_geometry | jsonb | nullable — coordinate reali della stanza quando disponibili da una planimetria vera |

### `assets`
| Campo | Tipo | Note |
|---|---|---|
| id | uuid (PK) | |
| house_id | uuid (FK → houses) | |
| room_id | uuid (FK → rooms, nullable) | null = impianto di casa, non legato a una stanza |
| type | text | enum: caldaia, elettrico, idraulico, fotovoltaico, clima, tetto, finestre, elettrodomestico |
| name | text | |
| code | text | es. `AST—001` |
| installed_at | date | nullable |
| warranty_until | date | nullable |
| status | text | enum: ok, attention, due — **da rendere calcolato**, non inserito a mano (vedi §7) |
| plan_pos_x, plan_pos_y | numeric | posizione relativa 0–1 nella cella planimetria |
| created_at, updated_at | timestamptz | |

### `asset_custom_fields`
| Campo | Tipo | Note |
|---|---|---|
| id | uuid (PK) | |
| asset_id | uuid (FK → assets) | |
| label | text | es. "Numero certificazione" |
| value | text | |
| source | text | `manual` \| `ai_extracted` — utile per audit e per pesare l'affidabilità |

### `documents`
| Campo | Tipo | Note |
|---|---|---|
| id | uuid (PK) | |
| asset_id | uuid (FK → assets, nullable) | nullable finché non confermato/associato |
| house_id | uuid (FK → houses) | per i documenti ancora in Inbox, non associati |
| file_url | text | path nello storage |
| original_filename | text | |
| doc_type | text | es. "Fattura", "Certificato", "Manuale" — proposto dall'AI, confermabile |
| status | text | `pending` \| `analyzing` \| `analyzed` \| `confirmed` |
| ai_confidence | numeric | nullable |
| extracted_fields | jsonb | risultato grezzo dell'estrazione, prima della conferma utente |
| uploaded_at, confirmed_at | timestamptz | |

### `asset_timeline_events`
| Campo | Tipo | Note |
|---|---|---|
| id | uuid (PK) | |
| asset_id | uuid (FK → assets) | |
| event_date | date | |
| event_type | text | installazione, manutenzione, documento collegato, ambiente aggiornato, ... |
| detail | text | |
| document_id | uuid (FK → documents, nullable) | se l'evento è generato da un documento |

### `users` / `house_memberships`
Da subito prevedere una tabella `house_memberships` (house_id, user_id, ruolo) anche se nell'MVP ogni casa ha un solo proprietario: evita una migrazione dolorosa quando arriverà la condivisione con un coniuge, un amministratore di condominio o un artigiano — funzionalità quasi certa nel prodotto maturo.

---

## 4. API — endpoint principali

Impostazione REST, risorse annidate dove ha senso:

```
POST   /houses
GET    /houses/:id
PATCH  /houses/:id

POST   /houses/:id/rooms
GET    /houses/:id/rooms
PATCH  /rooms/:id

POST   /houses/:id/assets
GET    /houses/:id/assets
PATCH  /assets/:id                    → include cambio room_id, plan_pos, status manuale
POST   /assets/:id/custom-fields
DELETE /custom-fields/:id

POST   /houses/:id/documents           → upload, crea record status=pending
POST   /documents/:id/analyze          → job asincrono, invoca la pipeline AI
POST   /documents/:id/confirm          → { asset_id, apply_fields: bool } — scrive su assets/custom_fields/timeline

GET    /assets/:id/timeline
```

Il verbo `analyze` e `confirm` separati (non un'unica upload sincrona) è intenzionale: l'estrazione AI può richiedere secondi, e nel frattempo l'utente può continuare a usare l'app — lo stesso pattern "stato pending/analyzing/analyzed" già disegnato nel prototipo si traduce 1:1 in un job asincrono reale (coda + webhook o polling).

---

## 5. Pipeline AI documentale

Questo è il cuore tecnico che nel prototipo è simulato con `setTimeout`. La pipeline reale:

1. **Upload** → file salvato nello storage, record `documents` creato con `status=pending`.
2. **Trigger analisi** → job in coda (es. tramite queue: SQS, BullMQ su Redis, o Temporal se la logica cresce).
3. **Estrazione** → il documento (PDF/immagine) viene inviato a un modello multimodale con un prompt strutturato che richiede in output: tipo documento, campi rilevanti (fornitore, date, importi, numeri di certificazione...), e un asset-type suggerito tra quelli noti in casa.
4. **Matching asset** → confronto tra l'asset-type suggerito e gli asset esistenti nella casa (stesso `type`, eventualmente disambiguato per nome se ce n'è più di uno dello stesso tipo — caso già visibile nel prototipo con i climatizzatori multipli).
5. **Scoring di confidenza** → il modello stesso può essere prompt-ato a restituire una confidenza, oppure si calcola euristicamente (qualità OCR, ambiguità del matching, completezza dei campi attesi per quel tipo di documento).
6. **Salvataggio risultato** → `status=analyzed`, `extracted_fields` e `ai_confidence` valorizzati. **Nessuna scrittura su `assets` o `asset_custom_fields` a questo punto** — è lo stesso principio già applicato nel prototipo: l'AI propone, non modifica mai i dati di produzione.
7. **Conferma utente** → l'endpoint `/documents/:id/confirm` scrive effettivamente su `assets`/`asset_custom_fields`/`asset_timeline_events`, applicando la stessa logica di mapping già scritta nel prototipo (campi con "installazione"/"intervento" → `installed_at`; "garanzia"/"scadenza" → `warranty_until`; il resto → campo libero).

**Nota pratica:** il mapping euristico per parole chiave (già nel prototipo) è un ottimo punto di partenza anche in produzione — è trasparente, spiegabile all'utente, e non richiede training. Ha senso sostituirlo con qualcosa di più sofisticato solo se in produzione emergono molti casi limite che il matching per parole chiave non copre.

---

## 5bis. Esito del primo test con documenti reali

Prima di scegliere un provider, abbiamo testato l'estrazione su 4 documenti reali relativi allo stesso intervento (fattura, dichiarazione di conformità, relazione materiali, schema impianto manoscritto). Risultati:

- **Sui documenti stampati/digitali (fattura, dichiarazione, relazione) l'estrazione è affidabile fin da subito**, confidenza 92–98% con qualunque modello multimodale — conferma che per la maggior parte dei documenti reali (fatture, certificati) la scelta del provider specifico pesa meno di quanto temuto in fase di pianificazione.
- **Il vero punto debole è il documento manoscritto** (schema impianto a penna): confidenza stimata intorno al 65%. È il caso che giustifica la soglia di confidenza già prevista al §5 — sotto una certa soglia, la conferma utente non è un dettaglio UX ma una necessità.
- **Nessuno dei documenti conteneva una data di garanzia esplicita**, solo date di intervento/dichiarazione — il modello a campi liberi (`asset_custom_fields`) scelto al §3 regge bene questo caso, perché non forza mai un campo assente.
- **Scoperta di prodotto imprevista**: i 4 documenti testati erano tutti riconducibili allo stesso intervento (stessa ditta, stessa data, stesso indirizzo). Il flusso Inbox attuale li tratta come upload indipendenti da confermare uno a uno. Vale la pena aggiungere alla pipeline un passaggio di **riconoscimento di documenti correlati** (stesso fornitore + data vicina + stesso asset suggerito → proposta "questi documenti sembrano appartenere allo stesso intervento, li colleghi insieme?") invece di richiedere N conferme separate per un solo evento reale.
- **Nota su privacy**: i documenti di test contenevano C.F., P.IVA e recapiti reali del fornitore e del proprietario. Prima di scegliere il provider AI definitivo va verificato contrattualmente che non utilizzi i contenuti inviati per addestramento — punto da chiudere in fase di procurement, non dopo.
- **Aggiornamento al prototipo, già implementato**: se un documento suggerisce un tipo di asset non ancora presente in casa (es. certificato di un impianto idraulico quando l'asset "Impianto idraulico" non esiste), l'Inbox ora propone di **crearlo automaticamente alla conferma dell'utente**, invece di forzare l'associazione a un asset sbagliato o bloccare il flusso.

---

## 6. Un punto da correggere rispetto al prototipo: lo `status` dell'Asset

Nel prototipo lo stato (`ok` / `attention` / `due`) è impostato a mano alla creazione. In produzione ha più senso **calcolarlo**, non impostarlo:

- `attention` se l'asset non ha documenti collegati
- `due` se `warranty_until` è passata, o se manca una manutenzione prevista entro una finestra configurabile
- `ok` altrimenti

Questo trasforma lo stato da dato statico a segnale utile — è anche la logica dietro ai "Promemoria" in dashboard, che nel prototipo sono hardcoded e in produzione diventerebbero una query.

---

## 7. Sicurezza e privacy

- I documenti caricati (fatture, certificati) contengono dati personali e talvolta indirizzi/importi: storage con accesso privato, URL firmati a tempo per il download, mai bucket pubblici.
- `house_memberships` come descritto in §3 predispone fin da subito il modello a permessi per-casa, evitando di dover innestare un sistema di autorizzazione dopo.
- L'invio di documenti a un modello AI esterno per l'estrazione va valutato in base al fornitore: verificare le politiche di retention/training sui dati inviati prima di scegliere il provider.

---

## 8. Percorso di migrazione dal prototipo

Il prototipo React resta riutilizzabile quasi per intero: la UI è già validata dagli utenti, cambia solo la fonte dati.

1. Sostituire gli `useState` con dati mock con chiamate alle API reali (React Query o simile per gestire caching/stato asincrono)
2. Sostituire i `setTimeout` di analisi AI con polling/websocket sullo stato reale del job
3. Sostituire lo storage persistente dei feedback (usato per il test) con la tabella `users`/autenticazione reale
4. Aggiungere gestione errori e stati di caricamento più robusti di quelli del prototipo (che assume sempre successo)

---

## 9. Rischi tecnici principali

| Rischio | Mitigazione |
|---|---|
| Costo/latenza della pipeline AI su grandi volumi di documenti | Batching, cache dei risultati per documenti duplicati, modello più economico per una prima classificazione grezza prima di uno più preciso |
| Qualità estrazione su scansioni di bassa qualità | Soglia di confidenza sotto la quale si chiede sempre conferma esplicita invece di pre-compilare i campi |
| Crescita del modello dati (es. condivisione multi-utente, sub-ambienti) | `house_memberships` e `plan_geometry` jsonb già predisposti per non richiedere migrazioni distruttive |

---

*Prossimo passo naturale: scegliere il provider AI per l'estrazione documentale e validare costi/latenza su un piccolo set di documenti reali (fatture, certificati) prima di impegnarsi sull'architettura definitiva della pipeline.*
