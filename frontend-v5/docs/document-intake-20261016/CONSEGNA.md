# Archivio assistito — consegne Claude

| Voce | Valore |
|---|---|
| Incarico | `outputs/Dimora-V5-incarico-Claude-archivio-assistito-20261016.md` |
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-archivio-assistito` |
| Branch | `claude/archivio-assistito-20261016`, da `5240708` (baseline indicata in `Dimora-V5-archivio-assistito-stato-20261016.md`) |
| Fonti lette dal master (sola lettura, non tracciate) | `docs/v5/document-intake-spec-v1.md` e `docs/v5/document-intake-api-contract.md`. Il mockup `frontend-v5/public/mockup-archivio-assistito.html` è nel commit di base |
| Aree scritte | Solo `frontend-v5/src/document-intake/**` e `frontend-v5/docs/document-intake-20261016/**` |

Nessun router, client, sessione, pagina, CSS globale, receipt-assistance, package o lock modificati. Nessun push.

## C1 — Modello UI e componenti navigabili a props · PRONTA

Commit: quello di questa fase (hash in `git log`, messaggio «archivio assistito C1»).

**File in `src/document-intake/`:**

| File | Ruolo |
|---|---|
| `model.ts` | Tipi e funzioni pure |
| `DocumentIntakeAssistant.tsx` | Flusso ingresso → lotto → proposte → riepilogo → esito |
| `ReviewDialog.tsx` | Revisione per singolo file e `Modal` (Esc sul documento, Tab confinato, focus restituito) |
| `intake.module.css` | Stili isolati |
| `index.ts` | Export pubblici |
| `testing/fixtures.ts`, `testing/renderIntake.tsx` | **Solo test e harness** |
| `DocumentIntakeAssistant.smoke.test.tsx` | Test di fumo della navigazione |

**Export da `index.ts`:**
- tutto `model.ts`;
- `DocumentIntakeAssistant` e `DocumentIntakeAssistantProps`;
- `StatusBadge`;
- `ReviewDialog`, `Modal`, `ReviewWriteState`.

**Props di `DocumentIntakeAssistant`.** Dati:

| Prop | Contenuto |
|---|---|
| `contextKey` | `{ accountId, homeId, batchId }`: cambiarla rimonta tutto |
| `load` | `loading` / `ready` / `error{message, retryable}` / `unavailable` |
| `capabilities` | `{ enabled, limits }` oppure `null` |
| `batch` | `IntakeBatch` oppure `null` |
| `canEdit`, `homeName` | Permesso di scrittura sulla casa e nome mostrato |
| `analysis?` | `IntakeAnalysisPanel`: assente finché non ci sono testi, limiti e stati veri (B3) |
| `candidates` | `Record<itemId, CandidatePage>` |

Callback:

| Callback | Uso |
|---|---|
| `onStartAnalysis?(itemIds)` | Avvio dell'analisi, solo se c'è il pannello |
| `loadCandidates(itemId, more)` | Carica le schede candidate per quel file |
| `onSelectFiles(File[])` | Il componente non legge né invia contenuti |
| `onRetryUpload(itemId)`, `onCancelUpload(itemId)` | Restituiscono `WriteOutcome` |
| `onSaveReview(ReviewPayload)` | `WriteOutcome` |
| `onRecoverReview(ReviewPayload)` | `WriteOutcome` oppure `not_found` |
| `onResolveDuplicate(itemId, expectedVersion)` | `WriteOutcome` |
| `onConfirm(ConfirmBatchPayload)` | `ConfirmBatchOutcome` |
| `onRecoverConfirmation(payload)` | `RecoverBatchOutcome` |
| `openOriginal(itemId, page)` | `Promise<void>` |
| `renderPreview?(itemId, page)` | Slot di anteprima |
| `onOpenReceiptFlow?(itemId)` | Ingresso alla ricevuta assistita |
| `renderOutcomeLinks?(results)` | Collegamenti dopo l'esito |
| `onRetryLoad?()` | Nuovo tentativo di caricamento |

**Esiti delle scritture:** `confirmed` / `rejected{code, message}` / `uncertain`. Nessuna chiave HTTP e nessun retry automatico. Con un esito incerto le scelte restano bloccate e il recupero è esplicito.

**Mapping al wire (dettaglio in `HANDOFF.md`):**
- `IntakeItem` e `IntakeBatch` seguono il DTO del contratto;
- `limits` è `{ maxFiles, maxTotalBytes, maxFileBytes, acceptedMimeTypes }`;
- `permissions` del lotto è `{ upload, review, confirm }`;
- campi UI facoltativi in più: `confirmedOrganization`, `selectionStale`, `existingLinks`.

**Prove C1:**
- `npx vitest run --project mock src/document-intake`: 2/2;
- `npx tsc -b --noEmit`: OK;
- `npx eslint src/document-intake`: OK;
- dipendenze installate con `npm ci` dal lockfile, senza modifiche.

## C2 — Casi approvati e test significativi · IN_CORSO

## C3 — Rifinitura e consegna · IN_CORSO
