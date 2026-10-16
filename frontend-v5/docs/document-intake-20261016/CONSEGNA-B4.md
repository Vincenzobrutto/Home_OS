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

| Consegna | Stato | Commit |
|---|---|---|
| B4-1 Consenso alla sostituzione | PRONTA | `19124eb` |
| B4-2 Revisione robusta | PRONTA | `713f51b` |
| B4-3 Test mirati, mobile e tastiera | PRONTA | commit «archivio B4-3» (vedi `git log`) |

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

Commit: `713f51b` «test(frontend-v5): archivio B4-2, revisione robusta». Il codice è in `19124eb` (vedi nota sopra); qui entrano fixture e test.

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

## B4-3 — Test mirati, mobile e tastiera · PRONTA

Commit: quello di questa fase (messaggio «archivio B4-3»).

**Correzioni trovate scrivendo i test** (nel contratto delle props, nessuna callback nuova):
- **Riuso incerto della copia:** il dialogo mostrava «Verifica l'esito», ma `recoverReview` non aveva un payload per quel percorso, quindi il pulsante non faceva nulla e l'elemento restava bloccato per sempre. Ora lo stato incerto ha `reloadOnly: { version }`:
  - nessun pulsante di verifica, solo il messaggio «Ricarica il lotto…»;
  - nessun reinvio;
  - il blocco cade quando il container porta l'elemento con una versione diversa.
- **Editor dei contenuti da tastiera:** dopo «Aggiungi un contenuto» il focus va sul tipo del nuovo contenuto; dopo «Rimuovi» va sul contenuto vicino, oppure su «Aggiungi».

**Test (`LateAndUncertain.test.tsx`, 4):**
- riuso incerto: un solo invio anche col doppio clic, nessuna verifica finta, nessun `onSaveReview` o `onRetryUpload`, sblocco con la versione nuova;
- risposta tardiva del riuso dopo il cambio di account: nessun esito o dato del contesto precedente;
- organizzazione della copia con risposta tardiva `stale` dopo l'arrivo della versione 3: errore mostrato, consenso decaduto, nessun reinvio;
- editor solo da tastiera: aggiunge, compila e rimuove, focus corretto, payload con gli intervalli scelti.

Non rifatti, perché già verdi e invariati: cambio di contesto e risposta tardiva della revisione, conferma incerta, revisione incerta, upload incerto senza retry automatico, focus del dialogo.

**Harness:**
- `demo/IntakeDemo.tsx` ha lo scenario «Rifinitura B4»: APE con organizzazione confermata (v3), copia di un documento organizzato, scansione con tre contenuti manuali, copia con fonte persa e cache vecchia, manifest in attesa;
- l'etichetta lunga dello scenario allargava la **barra dell'harness** a 320 px (373 px): accorciata e `maxWidth: 100%`. Il componente non era coinvolto.

**Prova browser:**
- bundle statico esbuild su `file://`, Chrome headless via CDP; nessun server, API o AI; la porta 5174 non è stata toccata;
- su 1280, 390 e 320, nel lotto, nelle proposte e nei tre dialoghi: overflow assente, dialogo e controlli nella larghezza;
- il consenso parte non selezionato e il salvataggio resta bloccato con il messaggio;
- «Organizza il documento esistente» precompila «APE appartamento» e mostra «nessuna sostituzione»;
- la fonte persa mostra «Documento non disponibile» e il nome della copia compare una sola volta;
- il manifest in attesa resta visibile;
- tastiera (1280): dopo Aggiungi il focus va su «Tipo del contenuto 4», dopo Rimuovi su «Tipo del contenuto 3», Tab resta nel dialogo, Esc riporta il focus su «Modifica scelta Scansione_documento.pdf»;
- errori in console: nessuno.

Screenshot nuovi in `screenshots/`: `b4-consenso-390.png`, `b4-consenso-320.png`, `b4-copia-organizza-390.png`, `b4-parti-manuali-320.png`.

**Prove finali (una volta):**
- `npx vitest run --project mock src/document-intake`: **36/36** in 5 file;
- `tsc -b --noEmit`, `eslint src/document-intake` e `npm run build`: OK.

**Limiti reali:**
- i componenti **non sono un prodotto integrato**: nessun container, router o fetch;
- le prove sono su jsdom e su un harness sintetico, non sul backend B2;
- D1 (organizzare la copia attraverso l'endpoint review) non è verificato sul server;
- il motore di analisi resta fuori: nessuna chiamata AI, a pagamento o a un provider, e nessuna dichiarazione Anthropic;
- nessuna affermazione di conformità WCAG;
- Guida, Agenzie e previsioni sono fuori perimetro.
