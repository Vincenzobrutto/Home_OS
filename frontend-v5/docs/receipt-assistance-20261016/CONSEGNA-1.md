# Ricevuta assistita — Fase 1: modello UI e componenti a props

Incarico `Dimora-V5-incarico-Claude-ricevuta-tre-compiti-20261016.md`, compito 1. Specifica di riferimento: `docs/v5/receipt-assisted-spec-v1.md`, letta dal master al commit `0bd30d4`. Nel mio ramo non c'è, perché il ramo parte da `b654fae`. Mockup approvato: `frontend-v5/public/mockup-ricevuta-assistita.html`.

**Cosa non è:** UI non integrata. Nessun router, client, rotta o pagina comune toccati, e nessuna chiamata HTTP. I dati arrivano dalle props del futuro container Codex.

## File (tutti nuovi, in `frontend-v5/src/receipt-assistance/`)

| File | Ruolo |
|---|---|
| `model.ts` | Tipi del modello UI e funzioni pure: stato iniziale, importi e date, confronti, origini e fonti, validazione, riepilogo, payload di conferma |
| `ReceiptFields.tsx` | `ReceiptFieldInput` (campo con origine e «Vedi fonte»), `ComparisonField` (keep_existing/defer senza default), `FIELD_LABEL` |
| `ChoiceSections.tsx` | `ObjectSection` e `ExpenseSection`: scelte crea/riusa/salta indipendenti, candidati paginati con motivazione e ambiente |
| `ReceiptSummary.tsx` | `ReceiptSummaryView`: riepilogo delle sole scelte, conteggi 0/1 |
| `receipt.module.css` | Stili isolati, solo token V5 esistenti (`styles/tokens.css`) |
| `index.ts` | Export pubblici |
| `testing/fixtures.ts` | **Solo test e harness**: cinque scenari sintetici del mockup. Nessun componente runtime lo importa |
| `model.test.ts` | 13 test del modello |

Riuso in sola lettura di `components/ui` (`Field`, `Tag`, `cx`, `ui`) senza modificarlo.

## Modello a props (`model.ts`)

- **Contesto:** `ReceiptContextKey { accountId, homeId, documentId, draftId }` e `contextKeyString()`. Il cambio di chiave serve ad azzerare lo stato; l'uso è nella fase 2.
- **Opachi:** `OpaqueId = string` e `OpaqueVersion = string | number`. Vengono solo confrontati e restituiti.
- **Bozza:** `ReceiptDraft { id, version, state, origin: 'extraction' | 'manual', proposals, linkedObjects, linkedExpenses, openComparisons }`.
  - Proposte con citazioni `{ page, excerpt }` già verificate dal server.
  - Nomi dei campi allineati al nucleo backend `receiptFields` (`backend-v5/src/receipt-assistance/domain.ts`): name, brand, model, title, supplier, documentDate, documentNumber, più `total`.
- **Riferimenti esistenti:**
  - `ObjectRef` (solo oggetti generici, mai caldaie): versione, ambiente, marca e modello confermati, `linkedToDocument`, `reasons`;
  - `ExpenseRef`;
  - `PersistedComparison` per i rinvii già salvati;
  - `CandidatePage<T> { items, hasMore, status }` per la paginazione.
- **Originale:** `ReceiptOriginal { status: 'available' | 'unavailable', name, pageCount }`. L'apertura è una callback asincrona del container (fase 2).
- **Altro stato:**
  - `ReceiptLoadState`: loading / ready / error / unavailable, dove unavailable corrisponde a un 403 senza dettagli;
  - `ReceiptCapabilities`: provider e consenso reali, nessuna invenzione;
  - `ReceiptJobState`.
- **Esiti delle callback:**
  - `ConfirmOutcome`: confirmed / rejected (esito certo) / unknown (rete);
  - `RecoverOutcome`;
  - `ParkOutcome`.

**Funzioni pure:**

| Funzione | Comportamento |
|---|---|
| `initialFormState(draft, objectCandidates, expenseCandidates)` | Un solo collegamento esplicito → riusa. Più collegamenti o soli candidati → `unset`, senza preselezione. Niente → crea. Bozza manuale → valori vuoti |
| `parseEuroToCents` / `centsToInput` / `formatCents` | «179,90», «1.234,56», «85», «85.5» diventano centesimi interi sicuri. Rifiuta negativi, 3 decimali, gruppi errati, valori troppo grandi |
| `isCalendarDate` / `formatDate` | Date di calendario reali; formattazione in UTC, senza slittamenti di fuso |
| `pendingComparisons` | Marca/modello confermati diversi dalla proposta sull'oggetto riusato. Esclude i confronti già rinviati e persistiti |
| `fieldOrigin` / `fieldSources` | Documento solo se il valore non è stato modificato in una bozza estratta. I campi manuali non ereditano citazioni |
| `validateForm(state, draft, objects, today)` | Valida solo ciò che verrà salvato; `today` arriva dalle props. Limiti: nome e descrizione 1–120, marca 80, modello/venditore 120, importo 1–999999999 centesimi, data reale non futura |
| `buildSummary` | Conteggi esatti `newObjects` / `newExpenses` 0/1, nuovi collegamenti, campi completati, mantenuti e rinviati, differenze della spesa riusata (mostrate, non applicate) |
| `buildConfirmationPayload` | Payload UI stabile, `null` se il form non è valido. Le azioni per campo seguono `resolveReceiptField` del backend (accept/manual/keep_existing/defer/skip). Senza accountId/homeId, citazioni o conteggi |
| `canonicalPayload` | Serializzazione canonica a chiavi ordinate, per permettere al container di riconoscere lo stesso payload. La Idempotency-Key resta del container |

## Componenti

Tutti controllati da props, senza fetch:
- `ObjectSection` e `ExpenseSection` ricevono `draft`, `state`, `errors`, `today`, `canEdit`, `onChange(nextState)`, `onShowSource(field)`, gli elenchi uniti (`allObjects` / `allExpenses`), `candidates` e `onLoadMore`;
- `ReceiptSummaryView({ summary })`.

Testi e regole dal mockup:
- escludere significa non intervenire, mai scollegare;
- una spesa collegata si riusa senza nuova registrazione;
- marca e modello confermati non si sovrascrivono.

## Test

`npx vitest run --project mock src/receipt-assistance`: **13/13 passati**, eseguito due volte (prima e dopo le correzioni dei tipi). Coprono:
- stato iniziale nei cinque scenari;
- più collegamenti senza scelta automatica;
- chiave di contesto;
- importi, date e `today` dalle props;
- campi esclusi che non bloccano;
- combinazioni 1/1, 1/0, 0/1, 0/0;
- spesa riusata;
- confronti keep/defer e rinvio persistito non ripetuto;
- completamento dei soli campi vuoti;
- origini e payload senza citazioni;
- serializzazione canonica.

Altri controlli:
- `npx tsc -b --noEmit`: nessun errore. La prima esecuzione aveva errori dovuti a `noUncheckedIndexedAccess`, corretti;
- `npx eslint src/receipt-assistance`: OK, dopo un'assegnazione inutile corretta;
- dipendenze: `npm ci` dal lockfile, senza modifiche a `package.json` o lock. Lo script di postinstall di esbuild non è stato approvato e non serve: vitest e tsc funzionano.

## Limiti

- Le spese collegate con valori diversi (importo, data) vengono **mostrate** come differenza, senza richiedere keep/defer: la specifica parla di «differenza esposta», mentre il nucleo backend gestisce confronti solo per marca e modello. Da confermare con Codex.
- `onReview` non serve in questa fase: entra nella shell della fase 2 come notifica all'apertura del riepilogo.
- Nessuna prova browser in questa fase.
