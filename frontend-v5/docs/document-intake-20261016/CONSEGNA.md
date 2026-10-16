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

Commit: `27994f0`.

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

## C2 — Casi approvati e test significativi · PRONTA

Commit: `539e94a`. C1 non è stato riscritto.

**File nuovi o modificati:**

| File | Ruolo |
|---|---|
| `DocumentCollectionFilters.tsx` | Filtri delle raccolte, controllati a props |
| `DocumentIntakeAssistant.test.tsx` | 16 test |
| `DocumentIntakeAssistant.tsx` | Pulsanti «Rivedi / Modifica scelta / Vedi originale» con `aria-label` che inizia con il testo visibile, invece dello span nascosto, il cui nome in jsdom risultava «RivediAPE_Casa.pdf» |
| `index.ts` | Export dei filtri |

**`DocumentCollectionFilters`.** Props:
- `current: CollectionFilter`, cioè `'all' | Collection`;
- `onChange(next)`;
- `counts?` e `countsExact?`: i conteggi compaiono **solo** se il container li dichiara esatti;
- `label?`.

Opzioni: «Tutti» più le 7 raccolte del contratto, con `unclassified` = «Da organizzare». Non è collegato a nessuna pagina.

**Corpus sintetico (`testing/fixtures.ts`), dal mockup:**

| File | Stato |
|---|---|
| APE | Livello casa |
| CILA + agibilità | Un PDF, parti 1–10 e 11–14 non preselezionate |
| Schema di impianto | `needs_choice`, candidati oggetto e caldaia |
| Regolamento condominiale | — |
| Ricevuta | `existingLinks` verso oggetto e spesa |
| Copia identica | `uploadState: duplicate` |
| Scansione | `unreadable` |

**Test (`npx vitest run --project mock src/document-intake`): 18/18, cioè 16 nuovi e 2 di fumo C1.** Coprono:
- **casi del mockup:**
  - APE solo casa, con la revisione che salva solo la decisione e non conferma;
  - CILA e agibilità con contenuti obbligatori e pagine fedeli;
  - schema ambiguo senza preselezione, con id e versione attesa del candidato;
  - regolamento Solo io e ricevuta già collegata, con ingresso alla ricevuta assistita solo su richiesta;
  - copia riusata senza analisi né eliminazione;
  - scansione manuale con `pageFrom/pageTo` null e senza citazioni;
- **scelte:**
  - bozza conservata alla riapertura;
  - rimando fuori dal riepilogo;
  - conferma parziale con esclusione, payload dei soli inclusi, esito per file e resto da rivedere;
  - conferma con esito incerto: doppio clic bloccato, scelte bloccate, recupero con lo stesso payload;
  - salvataggio incerto bloccato e verificato, mai reinviato;
- **errori, contesto e privacy:**
  - upload fallito con retry del solo file;
  - cambio di contesto con risposta tardiva ignorata e nessun residuo;
  - fonte revocata che rimuove titolo, estratti e scelta e toglie l'elemento dal riepilogo;
  - tastiera: focus iniziale, Tab confinato, Esc e focus restituito;
  - capacità disattivata e sola lettura;
  - filtri.

**Altri controlli:**
- la prima esecuzione: 11 test falliti per il nome accessibile dei pulsanti «Rivedi …» (vedi tabella); corretto il componente, poi 18/18;
- un errore di tipo in un test, corretto;
- `tsc -b --noEmit` e `eslint src/document-intake`: OK.

**Limiti:** «schermo piccolo» non si misura in jsdom; è verificato nel browser in C3.

## C3 — Rifinitura e consegna · PRONTA

Commit: quello di questa fase (hash in `git log`, messaggio «archivio assistito C3»). C1 e C2 non sono stati riscritti.

**File:**

| File | Ruolo |
|---|---|
| `src/document-intake/intake.module.css` | Correzione per i nomi lunghi nel dialogo (vedi sotto) |
| `src/document-intake/demo/IntakeDemo.tsx` | **Harness demo**: lotto sintetico e container finto in memoria, banner «HARNESS DEMO · dati sintetici, nessun upload, API o AI». Non è importato dall'app |
| `docs/document-intake-20261016/HANDOFF.md` | Agganci, richieste R1–R7 al contratto, rilievi |
| `docs/document-intake-20261016/screenshots/` | 6 immagini dell'harness |

**Browser: harness statico, nessun server.** La porta 5174 era del master. Ho impacchettato `demo/IntakeDemo.tsx` con l'esbuild già presente in `node_modules`, usando uno script nello scratchpad della sessione (non versionato), e l'ho aperto come file locale in Chrome headless con profilo separato.

| Verifica | Esito |
|---|---|
| 4 scenari (lotto misto, nomi lunghi, caricamento non riuscito, ingresso) a 1280, 390 e 320 px, su lotto e proposte | Nessuno scorrimento orizzontale |
| Dialogo di revisione | Sta nella viewport. Piè di pagina visibile con «Chiudi senza modificare», «Decidi più avanti» e «Usa questa organizzazione» raggiungibili. Focus iniziale su «Chiudi». Esc lo chiude e restituisce il focus a «Rivedi …» |
| **Difetto trovato e corretto** | Con un nome file lunghissimo il dialogo superava la viewport a 390 e 320 px. Corretto con `min-width: 0` sul titolo e `overflow-wrap` sulle note; riverificato a 1280, 390 e 320 |
| Percorso completo a 320 | Salvate APE e CILA (una sola parte), regolamento rimandato. Riepilogo «2 decisioni pronte», Energia 1 / Pratiche edilizie 1, 0/0 nuovi oggetti e spese, 5 da rivedere. Conferma, poi esito «5 file restano da rivedere» |
| Tastiera a 1280 | Invio su «Rivedi» apre il dialogo; 14 Tab restano dentro il dialogo, poi tornano a «Chiudi» |
| Console | Nessun errore |

**Screenshot dell'harness, sintetici:**

| File | Contenuto |
|---|---|
| `01-proposte-320.png` | Proposte dopo le scelte |
| `02-dialogo-multiparte-390.png` | Dialogo CILA e agibilità |
| `03-riepilogo-320.png` | Riepilogo |
| `04-esito-320.png` | Esito |
| `05-lotto-errore-390.png` | Lotto con un file non caricato |
| `06-dialogo-1280.png` | Dialogo su desktop |

**Build, lint e test** (una volta, dopo l'ultima modifica):
- `npm run build`: OK. Entry `index-BpqoPYEJ.js` 493,11 kB (gzip 150,12). I componenti non sono importati dall'app.
- `npm run lint`: OK.
- `npx vitest run --project mock src/document-intake`: 18/18.

Ho chiuso Chrome. Nessun server avviato; 5174, 3001 e 55432 non toccati.

**Limiti:**
- **Non verificati:** upload reale, API, DB, deduplica sul server, AI e provider. L'harness non è il prodotto.
- **Accessibilità:** nessuna dichiarazione WCAG e nessuna prova con screen reader o dispositivo fisico.
- **Agganci:** i componenti vanno collegati dal container Codex (HANDOFF §1). Le richieste R1–R7 vanno decise prima.

## Stato finale

**C1, C2 e C3 sono PRONTE.**
- Commit: `27994f0` (C1), `539e94a` (C2), commit C3, e il commit finale di questo indice (hash in `git log`).
- Worktree pulito dopo l'ultimo commit. Nessun push e nessuna integrazione nel master.
