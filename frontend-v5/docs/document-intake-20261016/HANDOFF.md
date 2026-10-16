# Archivio assistito — HANDOFF per Codex

Componenti isolati in `frontend-v5/src/document-intake/`. **Non integrati**: nessun router, client, container o pagina toccati. Elenco degli agganci, delle richieste al contratto e dei rilievi emersi.

## 1. Agganci del container (B4)

- **Pagina lazy** che rende `DocumentIntakeAssistant`:
  - `contextKey = { accountId, homeId, batchId }`, da cambiare a ogni cambio di contesto;
  - `load`, `capabilities`, `batch` dal contratto: `GET capabilities`, `GET batches/:id`;
  - `homeName` e `canEdit` dalla casa corrente.
- **`onSelectFiles(File[])`:**
  - il container costruisce il manifest `{ clientItemId, filename, byteSize, mimeType }` e crea il lotto (`POST batches`);
  - carica ogni elemento con una richiesta indipendente (`POST …/items/:itemId/file`), al massimo 2 alla volta.

  Il componente non legge i byte e non filtra per limiti: lo fa il server.
- **Scritture:** traduzione degli esiti in `WriteOutcome`:
  - 2xx → `confirmed`;
  - 409/422/403/503 → `rejected{code, message}`;
  - rete o 5xx ambigui → `uncertain`.

  Una promessa rifiutata viene già trattata dal componente come `uncertain`. Idempotency-Key per elemento e per conferma, stabile sullo stesso payload; `canonical()` aiuta a riconoscerlo.
- **Callback di scrittura:**

  | Callback | Endpoint |
  |---|---|
  | `onSaveReview` | `POST …/review` con `{ expectedVersion, selection }` |
  | `onRecoverReview` | Rilettura dell'elemento |
  | `onConfirm` | `POST …/confirmations` con `{ expectedVersion, items:[{ id, expectedVersion }] }`, risposta per elemento come `{ status: 'done', results }` |
  | `onRecoverConfirmation` | Stessa chiave, oppure GET dell'esito |
- **Originale e candidati:**
  - `openOriginal(itemId, page)` e `renderPreview(itemId, page)` usano il download autenticato esistente dell'originale; nessun URL di storage;
  - `loadCandidates(itemId, more)` riempie `candidates[itemId]` con oggetti e caldaie **autorizzati** (`{ kind, id, version, name, roomName }`).
- **Navigazione:** `onOpenReceiptFlow(itemId)` porta al percorso ricevuta assistita esistente; `renderOutcomeLinks(results)` porta a Documenti filtrati.
- **Filtri dell'archivio:** `DocumentCollectionFilters` va agganciato a Documenti in B2. Passare `countsExact` solo con totali esatti del server.

## 2. Richieste al contratto, o mapping da confermare

| # | Richiesta | Motivo |
|---|---|---|
| R1 | **Azione per la copia identica**: l'`OrganizationSelection` ha solo `organize`/`defer`. Serve un'operazione esplicita, per esempio `POST …/items/:id/duplicate-resolution` con `{ expectedVersion, action: 'reuse_reference' }`, mappata su `onResolveDuplicate(itemId, expectedVersion)` | La specifica chiede di confermare il riuso senza creare un secondo originale e senza eliminare nulla |
| R2 | **`limits` nel DTO**: forma attesa `{ maxFiles, maxTotalBytes, maxFileBytes, acceptedMimeTypes }`. **`permissions` del lotto**: `{ upload, review, confirm }`. **`permissions` dell'elemento**: almeno `{ review }` | Il contratto li cita senza la forma dei campi |
| R3 | **`confirmedOrganization`** facoltativo sull'elemento, con l'organizzazione già confermata | Mostrare il conflitto senza sostituire (specifica, «Conflitti») |
| R4 | **`selectionStale`** facoltativo: la scelta salvata riguarda una versione non corrente | La UI la esclude dal riepilogo e chiede di rivederla |
| R5 | **`existingLinks`** facoltativo per le ricevute: oggetti e spese già collegati, solo se leggibili | Mostrare «già collegata, nessun doppione» come nel mockup |
| R6 | **Recupero di un salvataggio incerto**: `onRecoverReview(payload)` restituisce `confirmed` (selection sul server uguale al payload), `not_found` oppure `rejected` | Definire come il GET distingue «salvata» da «non salvata» |
| R7 | **Stati dell'analisi e pannello costi (B3):** testi di consenso e costo, limiti e stati veri (`IntakeAnalysisPanel`), più `onStartAnalysis(itemIds)` | Senza questi dati il pannello resta assente |

## 3. Rilievi emersi in sviluppo

- **Nome accessibile:** pulsanti «Rivedi / Modifica scelta / Vedi originale» con un `aria-label` che inizia con il testo visibile («Rivedi APE_Casa.pdf»). Con lo span nascosto, il nome calcolato in jsdom risultava «RivediAPE_Casa.pdf». La stessa tecnica dello span nascosto c'è anche in `receipt-assistance` («Vedi fonte»): da valutare lì (non è un'area mia in questo incarico).
- **Nomi lunghi nel dialogo:** a 390 e 320 px il dialogo superava la viewport. Corretto in C3 con `min-width: 0` sul blocco del titolo e `overflow-wrap` sulle note.
- **Dialogo e focus:** il `Modal` ha Esc a livello di documento, Tab confinato e focus restituito al controllo di partenza. È più robusto del dialogo della ricevuta, che non confina il Tab.
- **Mockup e contratto sulla pratica CILA + agibilità:** nel mockup è «Serve una scelta». Qui è `ready` con due parti **non preselezionate**, perché `needs_choice` nel contratto riguarda il destinatario ambiguo e farebbe perdere la preselezione «solo casa». Va confermato da Codex.

## 4. Per changelog e backlog (li aggiorna Codex)

- **Changelog:** «Componenti isolati dell'archivio assistito: lotto con stato per file, revisione singola con originale e fonti, conferma parziale con esiti incerti recuperabili, filtri raccolte. Non ancora agganciati».
- **Backlog:**
  - R1–R7;
  - collaudo nel browser reale dopo l'integrazione, a 320/390/desktop;
  - le prove attuali sono solo su un harness sintetico.
