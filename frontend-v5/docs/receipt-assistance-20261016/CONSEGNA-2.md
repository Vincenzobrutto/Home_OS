# Ricevuta assistita — Fase 2: esperienza completa

Compito 2 dell'incarico. Componente integrabile `ReceiptAssistant`, con il percorso Documento → Proposte → Riepilogo → Esito.

**Cosa non è:** UI non integrata. Nessuna rotta, pagina, client o cache comune toccati. Il container Codex fornisce dati reali e callback.

## File nuovi o modificati (solo `frontend-v5/src/receipt-assistance/`)

| File | Ruolo |
|---|---|
| `ReceiptAssistant.tsx` | Shell: passi, documento, analisi o manuale, proposte, riepilogo, conferma asincrona, recupero dell'esito, rinvio, esito, reset per contesto, 403 |
| `SourceDialog.tsx` | Dialogo per una fonte o per l'originale: modale, Esc chiude, focus restituito, slot di anteprima, callback di apertura |
| `receipt.module.css` | Aggiunti backdrop, dialog e actionGroup |
| `index.ts` | Export di `ReceiptAssistant`, `ReceiptAssistantProps`, `SourceDialog` |
| `testing/renderAssistant.tsx` | **Solo test**: props complete con callback spia |
| `ReceiptAssistant.test.tsx` | 5 test di comportamento |

## Props di `ReceiptAssistant` (punti di integrazione per Codex)

**Dati:**

| Prop | Contenuto |
|---|---|
| `contextKey` | `{ accountId, homeId, documentId, draftId }` |
| `load` | `loading` / `ready` / `error{message, retryable}` / `unavailable` (403) |
| `capabilities` | `{ enabled, manualEnabled, providers[{ id, label, requiresConsent, consentText, costNote }] }`, oppure `null` durante il caricamento |
| `original` | `{ status, name, pageCount }` |
| `draft` | `ReceiptDraft`, oppure `null` prima di analisi o bozza manuale |
| `job` | `none` / `starting` / `queued` / `running` / `failed{reason, message}` / `uncertain{message}` |
| `objectCandidates`, `expenseCandidates` | `CandidatePage<…>` |
| `today` | Giorno corrente Europe/Rome dal server |
| `canEdit` | Permesso di modifica |

**Callback:**

| Callback | Uso |
|---|---|
| `onStartAnalysis({ providerId, consentToProviderTransfer })` | Solo dopo clic esplicito e consenso, se richiesto |
| `onStartManual()` | Avvia una bozza manuale |
| `openOriginal(): Promise<void>` | Se rifiuta, il componente mostra un errore |
| `renderOriginalPreview?()` | Slot di anteprima |
| `loadMoreCandidates('object' \| 'expense')` | Paginazione dei candidati |
| `onReview?(payload)` | All'apertura del riepilogo |
| `onConfirm(payload): Promise<ConfirmOutcome>` | Una promessa rifiutata vale come esito **non noto** |
| `onRecoverOutcome(payload): Promise<RecoverOutcome>` | Recupero esplicito dell'esito |
| `onPark(): Promise<ParkOutcome>` | Rinvio della bozza |
| `onReopenComparison?(comparison)` | Riapre un confronto rinviato |
| `onRetryLoad?()` | Nuovo tentativo di caricamento |
| `renderOutcomeLinks?(result)` | Collegamenti con il router dell'app |

**Agganci da fare nel container (Codex):**
- una pagina lazy che legge le capabilities, la bozza e i candidati paginati dal contratto R1;
- avvio del job e polling;
- `onConfirm` con Idempotency-Key stabile per lo stesso payload: usare `canonicalPayload()` per riconoscerlo;
- `onRecoverOutcome` con la stessa chiave;
- invalidazione della cache dopo la conferma;
- collegamenti da passare in `renderOutcomeLinks`.

## Comportamenti implementati

**Nessuna chiamata all'apertura.** L'analisi parte solo da «Avvia l'analisi»:
- con il provider scelto tra quelli delle capabilities reali;
- con la casella di consenso, se il provider la richiede;
- con il testo di consenso e la nota sui costi forniti dal container.

La compilazione manuale è disponibile senza analisi.

**Originale e fonti:**
- L'originale è apribile sempre, anche dopo un errore di lettura: il banner del job offre «Vedi documento originale».
- Per i campi letti, «Vedi fonte» mostra pagina ed estratto.
- Nessun iframe e nessun URL: l'apertura è affidata alla callback.
- Chiudere il dialogo conserva il form.

**Confronti:**
- Marca e modello confermati diversi da quelli letti mostrano «Già confermato» contro «Letto nella ricevuta», con la fonte.
- Le scelte sono «Mantieni» e «Decidi più avanti», senza preselezione e senza opzione di sovrascrittura.
- I confronti già rinviati arrivano dalle props e si riaprono con `onReopenComparison`.

**Collegamenti e candidati:**
- Un collegamento esplicito viene riusato.
- Più candidati: «Serve una scelta», nessuna selezione automatica.
- Una spesa collegata è mantenuta senza nuova registrazione.
- Solo oggetti generici (`ObjectRef`): il componente non tratta schede caldaia.

**Riepilogo:**
- Conteggi esatti 0/0, 1/0, 0/1, 1/1.
- «Modifica le scelte» torna alle proposte conservando le correzioni.
- Le azioni escluse sono descritte come «non scollegare, non eliminare».

**Conferma asincrona:**
- Blocco del doppio clic con un ref, oltre al pulsante disattivato.
- Esito certo (`rejected`): messaggio, form conservato, nuove correzioni consentite.
- Esito non noto (`unknown` o promessa rifiutata):
  - payload congelato;
  - modifica bloccata;
  - nessun reinvio automatico;
  - «Verifica l'esito» chiama `onRecoverOutcome` con lo **stesso** payload.
- Se la conferma non viene trovata: «Invia di nuovo la stessa conferma», solo esplicito.
- Nessun successo mostrato se la callback fallisce. Nessun flag locale che finga idempotenza.

**Rinvio:** «Rimanda» chiama `onPark`. Il componente mostra «rimandata» solo con un esito `parked`; un errore o una promessa rifiutata danno un messaggio onesto. Nessun localStorage.

**Contesto e sicurezza:**
- Il componente interno è rimontato con `key = contextKeyString(contextKey)`: cambiare account, casa, documento o bozza azzera form, citazioni, dialoghi ed esiti.
- `load.unavailable` (403) mostra solo «Ricevuta non disponibile», senza dati della bozza.

**Sola lettura:** con `canEdit` falso:
- campi e scelte disattivati;
- nessun pulsante di analisi, compilazione manuale, conferma o rinvio;
- un messaggio spiega il ruolo.

**Fuori dal flusso, come da specifica:** la modifica di valori esistenti dalla scheda.

## Prove

- `npx vitest run --project mock src/receipt-assistance`: **18/18 passati** (13 del modello e 5 della shell). Prima esecuzione già verde. Dopo una correzione di soli tipi nel test l'ho rieseguita una volta, ancora verde.
- I 5 test della shell coprono:
  - primo acquisto con conferma e payload senza dati di contesto, e `onReview`;
  - esito incerto con doppio clic bloccato, modifica bloccata, nessun reinvio e recupero esplicito con lo stesso payload;
  - 403 senza residui;
  - cambio di contesto che svuota le correzioni;
  - originale apribile dopo un errore di lettura, errore di apertura, Esc, compilazione manuale disponibile.
- `npx tsc -b --noEmit`: OK.
- `npx eslint src/receipt-assistance`: OK. Il primo lint segnalava `setState` dentro gli effetti: form e passo ora sono **derivati** durante il render (`userForm ?? initialFormState(...)`), senza effetti.

## Limiti e scelte aperte

- Il dialogo è un `div role="dialog"` modale con Esc e restituzione del focus, ma senza un focus trap completo. Valutare `<dialog>` nativo dopo la verifica nel browser reale.
- Il passaggio a «proposte» avviene quando arriva una bozza. Siccome `draftId` è nel contesto, l'arrivo della bozza rimonta il componente: voluto, nessuno stato della fase documento sopravvive.
- Le differenze della spesa riusata sono esposte senza keep/defer (vedi CONSEGNA-1).
- Nessuna prova browser in questa fase: è nella fase 3.
