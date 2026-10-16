# Archivio assistito — rifinitura B4, consegne Claude

| Voce | Valore |
|---|---|
| Incarico | `outputs/Dimora-V5-incarico-Claude-archivio-rifinitura-B4-20261016.md` |
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-archivio-assistito` |
| Branch | `claude/archivio-assistito-20261016` |
| Allineamento | Il merge `3651561` di `97a9f92` non è lavoro mio e non fa parte di queste consegne |
| Fonti lette | Sezione B2 di `docs/v5/document-intake-api-contract.md` e `docs/v5/document-intake-b2-report-20261016.md` |
| Aree scritte | Solo `frontend-v5/src/document-intake/**` e `frontend-v5/docs/document-intake-20261016/**` |

Componenti **non integrati**: nessun fetch e nessun fallback demo. Nessun push.

## B4-1 — Consenso alla sostituzione · PRONTA

Commit: `19124eb` «feat(frontend-v5): archivio B4-1, consenso esplicito alla sostituzione».

**Nota sincera sul taglio dei commit.** Le modifiche del punto 2 (parti manuali multiple, redazione delle fonti perse, doppia scelta per le copie) toccano gli stessi `model.ts` e `ReviewDialog.tsx` del consenso. Il loro **codice** è entrato in questo commit; i **test e le fixture** del punto 2 sono nella consegna B4-2.

**Modello (`model.ts`):**
- `IntakeItem.organizationVersion?: number | null` (B2: 0 o null se assente). `confirmedOrganization` resta il nome UI per `organization` del DTO.
- `ReviewPayload` diventa `{ itemId, expectedVersion, expectedOrganizationVersion?: number, replaceOrganization?: boolean, selection }`. La UI valorizza **sempre** entrambi i campi nuovi.
- Funzioni nuove:

  | Funzione | Comportamento |
  |---|---|
  | `sameParts` | Confronto per tipo e intervallo, indipendente dall'ordine |
  | `replacesConfirmed(draft, item)` | Titolo o parti diversi dai dati confermati |
  | `consentSignature` / `hasReplaceConsent` | Il consenso vale solo per il contenuto scelto **e** per la versione dell'organizzazione letta: se cambia uno dei due, decade |
  | `buildReviewPayload` | Payload completo, oppure `null` se non valido |
  | `deferPayload` | Rinvio: `replaceOrganization: false` e versione letta |
- `validateReviewDraft` restituisce l'errore `replace` finché una scelta diversa dai dati confermati non ha il consenso attuale.

**Dialogo:**
- riquadro «Organizzazione già confermata» con titolo e parti;
- se la scelta è diversa: la scelta nuova, la casella **non preselezionata** «Sostituisci l'organizzazione confermata con questa scelta» e il pulsante «Mantieni l'organizzazione confermata»;
- se la scelta coincide: «nessuna sostituzione».

**Test (`ReplaceConsent.test.tsx`, 6):**
- confronto e blocco del salvataggio, poi consenso esplicito con `replaceOrganization: true` e versione 3;
- «Mantieni» porta a `false`;
- il consenso decade cambiando il titolo o con l'arrivo di una versione 4 (risposta tardiva o altro dispositivo), e il salvataggio torna bloccato;
- rimando con `false`;
- esito incerto dopo il consenso: payload congelato, recupero con lo stesso payload, nessun reinvio;
- stesse parti in ordine diverso: nessuna sostituzione.

**Test esistenti aggiornati (cambiamenti voluti, non regressioni):**
- il payload APE ora include `expectedOrganizationVersion: 0, replaceOrganization: false`;
- la copia identica richiede di scegliere tra riferimento e organizzazione;
- la scansione si classifica con l'editor a più contenuti («Aggiungi un contenuto»).

**Prove:**
- `npx vitest run --project mock src/document-intake`: **24/24**;
- `tsc -b --noEmit` e `eslint src/document-intake`: OK.

**Mapping richiesto al container, prima dell'aggancio:**
- `organization` → `confirmedOrganization { title, parts }`;
- `organizationVersion` → `organizationVersion` (null o 0);
- `replaceOrganization` va inoltrato **così com'è**, mai impostato dall'adapter.

## B4-2 — Revisione robusta · PRONTA

Commit: quello di questa fase (messaggio «archivio B4-2»). Il codice è in `19124eb` (vedi nota sopra); qui entrano fixture e test.

**Differenze richieste al container (segnalate prima di PRONTA):**

| # | Differenza | Perché |
|---|---|---|
| D1 | **Organizzare una copia identica** passa da `onSaveReview` con `itemId` della copia, `selection.action: 'organize'`, `expectedOrganizationVersion` e `replaceOrganization` letti dal documento esistente. Codex deve confermare che l'endpoint review B2 accetti una selezione su un elemento `duplicate` e la applichi al documento **esistente**, senza nuovo originale, schede o spese. Se non la accetta, l'adapter deve rifiutare (`rejected`) e la UI resta sul solo riferimento. | Il contratto B2 documenta solo `reuse_reference` per i duplicati |
| D2 | Con fonte persa il DTO B2 restituisce `null` per filename, byteSize, mimeType, pageCount, proposal, selection, duplicate, cost, error: l'adapter li passa **così come sono** (i tipi ora li ammettono). | Il componente redige comunque, ma non deve ricevere valori inventati |
| D3 | `permissions: []` del DTO → `permissions: { review: false }`; la presenza di `review` nell'array → `true`. | Il componente usa booleani |
| D4 | Per una copia identica il container fornisce `organization`/`organizationVersion` del documento **esistente** (non della copia). | Base del confronto e del consenso |

**Comportamento coperto:**
- riaprendo una scelta manuale si ritrovano **tutte** le parti con i loro intervalli, anche senza proposta; una scelta non coperta dalla proposta corrente passa in modalità manuale con tutte le parti, mai ridotta a un solo tipo;
- editor manuale: pagine fuori intervallo, intervallo a metà e contenuto ripetuto bloccano il salvataggio con messaggio;
- fonte persa (anche su copia `duplicate`): stato «Non più disponibile», nome «Documento non disponibile», nessun nome file, dimensione, MIME, nome del duplicato o «Rivedi», anche se il container ha ancora valori vecchi in cache;
- elemento `pending` senza originale: il manifest resta visibile, «In attesa», annullabile;
- revoca a dialogo aperto: il dialogo si chiude e la bozza non riappare;
- copia identica: scelta obbligatoria tra «Usa solo il riferimento all'originale esistente» (`onResolveDuplicate`, invariato) e «Organizza il documento esistente» (precompilato dai dati confermati, consenso esplicito se cambiano, `onResolveDuplicate` non chiamato).

**Test (`RobustReview.test.tsx`, 8) e fixture nuove** in `testing/fixtures.ts`: `multiPartScan`, `lostCopyRedacted`, `lostCopyStaleCache`, `pendingManifest`, `copyOfOrganized`.

**Prove:** `npx vitest run --project mock src/document-intake` **32/32**; `tsc -b --noEmit` e `eslint src/document-intake` OK.

## B4-3 — Test mirati, mobile e tastiera · IN_CORSO
