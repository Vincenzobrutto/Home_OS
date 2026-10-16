# Documenti semplificati V2 — consegne Claude

| Voce | Valore |
|---|---|
| Incarico | `outputs/Dimora-V5-incarico-Claude-documenti-semplificati-20261016.md` |
| Checkout | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-documenti-semplificati`, branch `claude/documenti-semplificati-20261016` |
| Base | `e769abf` «docs(v5): freeze approved simplified document organization flow», stato pulito all'avvio |
| Contratto | `docs/v5/document-intake-simplified-spec-v2.md` (congelato) e mockup `frontend-v5/public/mockup-documenti-semplificato.html` |
| Aree scritte | Solo `frontend-v5/src/document-intake/**` e `frontend-v5/docs/document-intake-simplified-20261016/**` |
| Push | Nessuno, nessun cherry-pick di sync |

**`node_modules` (nota tecnica):** il checkout non lo aveva. `package.json` e `package-lock.json` sono identici al master (md5 verificato), quindi ho creato una **junction locale** `frontend-v5/node_modules` verso `node_modules` del master. È ignorata da git: nessuna installazione, nessuna modifica a package o lock.

## Fase 1 — Area di lavoro unica e revisione individuale · PRONTA per integrazione

Commit: `e9db445` «feat(frontend-v5): documenti semplificati fase 1, area unica e conferma diretta individuale».

**Interfaccia:**
- **Area di lavoro unica.**
  - Un solo elenco con i filtri Tutti, Da rivedere, Più tardi e Completati, ciascuno con il conteggio.
  - Ogni riga mostra stato e, quando c'è una proposta, titolo, «Tipo: …» e «Destinazione: … · Solo alla casa» (oppure «scheda da scegliere»).
  - «+ Aggiungi documenti» sta sotto l'elenco; i risultati precedenti restano visibili.
  - Sono **eliminati** passi, «Rivedi le proposte», riepilogo, casella «Ho controllato», «Usa questa organizzazione» e lo stato «Scelta pronta».
  - **Nessun pulsante Analizza:** il pannello consenso/avvio non si mostra più. Mentre la lettura locale è in corso il titolo diventa «Stiamo preparando le proposte…».
- **Revisione individuale.**
  - Il primario «Conferma e organizza» chiama `onOrganize` con `mode: 'single'` ed esattamente un elemento.
  - Il dialogo si chiude solo con l'esito `confirmed` di quell'elemento. Un rifiuto per elemento resta nel dialogo come «Non applicato: …», con la scelta conservata.
- **Decidi più avanti.** Chiama `onSaveReview` con `action: 'defer'`, `expectedOrganizationVersion` letto e `replaceOrganization: false`. Il documento passa in «Più tardi» come «Da riprendere» e si riapre con «Riprendi».
- **Legacy `saved`.** Torna «Da rivedere», mai completato senza applicazione, e non è selezionabile in gruppo.
- **Copie** (`uploadState: duplicate`):
  - avviso «Questo file è già nei tuoi Documenti»;
  - confronto **DATI ATTUALI / Già confermati da te** contro **PROPOSTA DAL DOCUMENTO**;
  - nessuna scelta preselezionata;
  - «Mantieni invariato» chiama `onResolveDuplicate`; l'esito è «Mantenuto invariato» e non si crea un secondo originale;
  - «Aggiorna titolo o tipo» chiama `onOrganize` single sulla copia, con consenso se cambiano dati confermati.
- **Conflitti** (proposta diversa da `confirmedOrganization`):
  - stesso confronto, con «Mantieni i dati attuali» (organizzazione diretta con i dati confermati e `replaceOrganization: false`) oppure «Usa la proposta e controlla i valori»;
  - il consenso «Sostituisci i dati già confermati» non è preselezionato e decade se cambiano contenuto o `organizationVersion`.
- **Scansioni e documenti senza proposta.**
  - «Tipo da indicare» con il menu «Scegli il tipo…» **vuoto**: «Altro» non è un valore predefinito.
  - Pagine facoltative e più contenuti con «Aggiungi un contenuto».
  - Nessuna fonte inventata.
  - La destinazione è «Solo alla casa», salvo `needs_choice`.
- **Chiusura con modifiche** (Chiudi o Esc). Compare «Hai modifiche non confermate. Vuoi scartarle?» con «Continua a modificare» e «Scarta le modifiche», e il focus va sullo scarto. Le bozze non restano in silenzio dopo la chiusura.
- **Mobile e anteprima.**
  - Nel DOM le decisioni vengono **prima** dell'anteprima.
  - L'originale sta in «Vedi documento e fonte» (`details`, chiuso).
  - `renderPreview` viene chiamato **solo** dopo l'apertura, così su mobile il PDF non si scarica in anticipo.
- **Callback diretta assente.** Banner e nota «La conferma diretta non è ancora disponibile in questo servizio», «Conferma e organizza» disabilitato e nessuna casella di selezione. **Nessun ricorso** a `onConfirm` o `onSaveReview` organize, nessun successo simulato.
- **Esiti incerti** (anche una promessa rifiutata):
  - l'elemento resta bloccato, con «Esito non noto»;
  - «Verifica l'esito» chiama `onRecoverOrganization(stesso payload)`;
  - se l'esito è `not_found`, compare «Invia di nuovo la stessa conferma», che ripete `onOrganize` con il payload identico, solo su scelta esplicita;
  - senza `onRecoverOrganization` non c'è verifica finta: solo l'indicazione di ricaricare.

**Modello (`model.ts`, additivo):**
- Tipi e costanti nuovi:
  - `OrganizeItemPayload` e `OrganizeBatchPayload = { batchId, expectedVersion, mode, items }`, con `expectedOrganizationVersion` e `replaceOrganization` sempre valorizzati;
  - `MAX_ORGANIZE_ITEMS = 20`;
  - `WorkGroup` e `WorkFilter`.
- Funzioni nuove:
  - `workGroup`, `matchesWorkFilter`;
  - `hasConflict`, `needsKeepOrUpdate`, `chooseKeep`, `chooseUpdate`;
  - `bulkEligible`, `bulkItem`, `buildOrganizePayload`;
  - `draftChanged`, `rowTitle`.
- Etichette V2 in `STATUS_LABEL`: «Caricato», «Lettura in corso», «Proposta pronta», «Tipo da indicare», «Da riprendere»; `saved` diventa «Da rivedere».
- `initialReviewDraft`: copie e conflitti partono con `duplicateMode: null` sui dati attuali. La destinazione è casa salvo `needs_choice`.

**Props (`DocumentIntakeAssistant`):**
- Aggiunte facoltative: `onOrganize?` e `onRecoverOrganization?`, come da specifica.
- Le props precedenti restano tutte, con gli stessi tipi, perché il container compili: `onConfirm`, `onRecoverConfirmation`, `analysis`, `onStartAnalysis`. Il percorso V1 non è più esposto.

**Nota sincera sul taglio dei commit:** la selezione multipla (caselle, «Seleziona le N proposte disponibili», barra «Organizza N documenti selezionati», esiti per file) è intrecciata con lo stato dell'area di lavoro. Il suo **codice** è entrato in questo commit. I **test** e la rifinitura sono nella fase 2, che non è ancora dichiarata pronta.

**Test (fase 1):** 43 verdi in 5 file. Le suite V1 sono state **riscritte** sul percorso V2, mantenendo le garanzie:

| File | Casi |
|---|---|
| `DocumentIntakeAssistant.test.tsx` | Payload single esatto, multiparte, cambio tipo, destinazione ambigua, condominio e ricevuta, scansione manuale, anteprima su richiesta, rinvio persistente, legacy `saved`, scarto alla chiusura, callback assente, rifiuto del singolo, upload fallito, cambio account con risposta tardiva, fonte revocata, tastiera, sola lettura, filtri delle raccolte |
| `DocumentIntakeAssistant.smoke.test.tsx` | Area unica senza scritture, proposta leggibile in riga, lettura in corso senza Analizza, copia mantenuta con Modifica, ingressi (selezione, drag&drop, aggiunta) |
| `ReplaceConsent.test.tsx` | Conflitto con DATI ATTUALI e nessuna preselezione, Mantieni, consenso necessario, consenso che decade, copia Mantieni / Aggiorna, modello |
| `RobustReview.test.tsx` | Parti manuali multiple, validazioni, fonti perse anche con cache vecchia, manifest in attesa |
| `LateAndUncertain.test.tsx` | Singolo incerto con verifica sullo stesso payload, `not_found` con reinvio esplicito identico, nessun recupero, promessa rifiutata, copia incerta, risposta tardiva dopo cambio account, editor da tastiera |

Nuovo helper solo per i test: `testing/server.tsx`, un container finto in memoria che applica gli esiti.

**Comandi:**
```
cd frontend-v5
npx vitest run --project mock src/document-intake
npx tsc -b --noEmit
npx eslint src/document-intake
```
Risultato: 43/43, `tsc` pulito, lint pulito.

**Differenze richieste al container (Codex), da fare prima di collegare:**

| # | Differenza |
|---|---|
| K1 | Passare `onOrganize(payload)`: POST `…/batches/:batchId/organizations` con chiave stabile per il corpo, corpo `{ expectedVersion, mode, items }` (senza `batchId`). Risposta mappata su `ConfirmBatchOutcome` per elemento. Elementi mancanti nei `results` vanno lasciati mancanti: il componente li tratta come esito da chiarire |
| K2 | Passare `onRecoverOrganization(payload)`: GET `…/organizations/:key` con la **stessa** chiave. 404 o mancante → `{ status: 'not_found' }`. Registrata ma parziale → `done` con i soli risultati presenti, oppure `uncertain` |
| K3 | Avviare la lettura locale dopo ogni acquisizione riuscita (specifica V2): il componente non mostra più il pannello consenso/avvio e ignora `analysis` / `onStartAnalysis` |
| K4 | `src/intake-integration/IntakePage.test.tsx` (non mio): **2 test falliscono** perché cercano testi V1 («Il lotto è pronto da organizzare.», «2 file nel lotto», «Autorizzo l'analisi», «Avvia l'analisi»). Vanno aggiornati ai testi V2 («Controlla e organizza.» / «Stiamo preparando le proposte…», «Tutti · 2») e all'avvio automatico |
| K5 | `renderOutcomeLinks(results)` ora è nell'intestazione dell'area di lavoro, con i risultati accumulati (anche vuoti): adatto a «Vai ai Documenti» |
| K6 | Messaggi del container che parlano di «lotto» o «Riapri il lotto dal server»: da allineare al linguaggio V2. È fuori dalla mia ownership |

## Fase 2 — Selezione multipla diretta · PRONTA per integrazione

Commit: quello di questa fase (messaggio «documenti semplificati fase 2»). Il codice è in `e9db445` (vedi la nota sul taglio dei commit); qui entrano i test, che hanno verificato il comportamento senza richiedere correzioni.

**Comportamento:**
- **Caselle e barra.**
  - Le caselle sono vuote e compaiono solo con 2 o più documenti, e solo sulle proposte chiare (`bulkEligible`), con una scrittura non in corso o non incerta e `onOrganize` presente.
  - Tipo e destinazione si leggono nella riga **prima** di selezionare.
  - «Seleziona le N proposte disponibili» (quelle visibili nel filtro) è sempre un'azione esplicita; c'è anche «Annulla selezione».
  - La barra fissa in basso mostra «N documenti selezionati» e «Organizza N documenti selezionati», che chiama `onOrganize` con `mode: 'multiple'` (da 1 a 20 elementi) **senza altro dialogo**.
  - Ogni elemento porta **esattamente** la proposta mostrata, destinazione casa, `replaceOrganization: false` e la versione dell'organizzazione letta.
- **Esclusi** (revisione individuale):
  - copie;
  - documenti con organizzazione già confermata;
  - classificazione manuale (scansioni, nessuna proposta);
  - `needs_choice`;
  - rinviati;
  - legacy `saved`;
  - fonti indisponibili;
  - letture in corso;
  - scritture in corso o incerte;
  - completati;
  - `selectionStale`.
- **Reset della selezione:**
  - cambio di filtro;
  - nuova versione dell'elemento: la selezione di quell'elemento cade, le altre restano;
  - cambio di account, casa o lotto: rimontaggio;
  - reload: lo stato è solo in memoria.
  - Nessuna selezione nascosta da filtri: vale solo per gli elementi visibili.
- **Esiti:**
  - per file: gli applicati vanno in Completati; i rifiutati restano «Da rivedere» con «Non applicato: …», sono elencati nel riepilogo con nome e motivo e restano selezionabili;
  - **rifiuto dell'intera richiesta:** nessuno applicato, messaggio, elementi ancora selezionabili;
  - **incerto:**
    - banner «Esito non confermato», elementi bloccati («Esito non noto», senza casella), barra disabilitata, nessun reinvio;
    - «Verifica l'esito» chiama `onRecoverOrganization` con lo **stesso** payload;
    - registrata solo in parte (risultati mancanti): resta da chiarire, con una nuova verifica sullo stesso payload;
    - `not_found`: «Invia di nuovo la stessa richiesta» con il payload identico.
- Nessuna distinzione «Scelte salvate / Da rivedere».

**Test (`BulkSelection.test.tsx`, 8):**
- caselle solo sulle 4 proposte chiare del lotto misto e payload multiplo esatto;
- 10 casi esclusi;
- reset per filtro, versione e contesto;
- errore di un elemento con esito per file;
- incerto con verifica e risultato parziale;
- `not_found` con reinvio identico;
- rifiuto dell'intera richiesta;
- documento singolo senza caselle.

**Comandi:** gli stessi della fase 1. Risultato: **51/51** in 6 file, `tsc` e lint puliti.

**Differenze per il container:** nessuna oltre K1–K6. Per K2: una ricevuta GET che riporta solo una parte dei risultati va restituita come `done` con i risultati presenti (il componente chiede un'altra verifica) oppure come `uncertain`, mai come successo completo.

## Fase 3 — Test, tastiera e mobile 320/390 · IN_CORSO
