# Fase 0 — corpus e misuratore v2, consegna Claude · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Fase0-corpus-v2-20261016.md`. Lavoro **solo offline**: nessuna campagna, nessun provider remoto, nessun DB, servizio, porta, email, `.env`, chiave o backup.

**Autorità per le regole:** `docs/v5/fase0-chiusura-arbitrato-20261016.md`, errata E1–E8, con le correzioni di Codex alla mia proposta.

**Cosa non misura:** nessuna percentuale prodotta da questi strumenti è accuratezza del provider.

## Checkout

| Voce | Valore |
|---|---|
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-Fase0-corpus-v2`, nuovo |
| Branch | `claude/fase0-corpus-v2-20261016` |
| Baseline | `5285da0` |
| Fetch | HEAD `5285da0`, `origin/main` `cdbb318`: 201 avanti, 0 indietro. Il `main` locale non esiste e non l'ho creato |
| Dipendenze | Il worktree non ha `node_modules` né `dist`. Non ho installato nulla e non ho lanciato build |
| File del corpus alla baseline | Identici a `1e13e43`: `git diff` vuoto su corpus, report, test, `src/economy` e `src/review` |

## Commit

| Commit | Contenuto |
|---|---|
| `2c9c81f` | `test(v5): corpus pilota v2, misuratore puro e osservazioni v2 (E1-E8)`: solo `backend-v5/test/pilot-*` e `backend-v5/tools/pilot-corpus-report.cjs` |
| commit documentale, hash in `git log` | Questa cartella: `CONSEGNA.md`, `corpus-v2-manifest.json`, `esempio-osservazioni-v2.json`, `esempio-report-v2.json` |

Nessun push e nessun commit di sincronizzazione.

## File

| File | Stato | Ruolo |
|---|---|---|
| `backend-v5/test/pilot-corpus.cjs` | modificato | Corpus v2, solo dati, e generatore dei byte. Il caricamento non richiede `dist`; `materialize()` usa solo `node:fs`, i fixture statici M4 e `document-fixtures.cjs` |
| `backend-v5/test/pilot-score.cjs` | nuovo | Misuratore puro: citazioni e valori come i validatori correnti, categorie dei fatti, esiti, critici, aggregato |
| `backend-v5/test/pilot-observations.cjs` | nuovo | Formato delle osservazioni v2 e adattatore rigoroso: output economico validato, candidati tecnici, esito del parser |
| `backend-v5/tools/pilot-corpus-report.cjs` | modificato | Report v2: manifesto e, con `--observations`, punteggi con provenienza dichiarata |
| `backend-v5/test/pilot-corpus.test.cjs` | modificato | 5 test puri più 4 test reali (`dist`), saltati se `dist` manca |
| `backend-v5/test/pilot-score.test.cjs` | nuovo | 10 test del misuratore |
| `backend-v5/test/pilot-observations.test.cjs` | nuovo | 5 test dell'adattatore e del report |

**Da fare per Codex:** `package.json` non è nelle mie aree. Il comando `npm test` include `pilot-corpus.test.cjs` ma non `pilot-score.test.cjs` né `pilot-observations.test.cjs`, che vanno aggiunti nel master.

## Errata applicati (secondo l'arbitrato)

| ID | Implementazione |
|---|---|
| E1 | P01 e P07 con gold completo sui campi supportati. Il titolo è ammesso. Attesi `documentKind` e `amountSelectionRequired` (P01 `true`, P07 `false`) |
| E2 | Ogni caso ha `required`, `allowed`, `absent` e `future`. I fatti ammessi sono valori concreti: un valore diverso per una chiave ammessa è `wrong`. Ammessi: titoli, categorie dimostrabili, righe `other`/`line_total` |
| E3 | P10: 50000 richiesto come `current_document_total`; 200000 solo ammesso come `other`. Come corrente diventa `wrong` più il critico `amount_role_swap` |
| E4 | P14 con testo «Potenza nominale riportata: 28 kW» e `reported_nominal`; atteso `quantity_interpretation`. Nuovi byte e hash; corpus versione 2 |
| E5 | L'identità di un fatto è campo, ruolo o quantityCode, e valore, più un'ancora opzionale della fonte; mai l'id del provider. Un duplicato identico è contato come `duplicate` e non dà punti. Due righe con lo stesso importo e fonti diverse non vengono fuse se il gold le distingue con un'ancora. P16 ha due `model` e atteso `value_conflict` |
| E6 | Per ogni caso: `outcomeMatch` (esito del modello), `systemSafe` (nulla pubblicato sui negativi), `positiveRejected`, `blockedBySystem`, `notEvaluable` (guasti di infrastruttura). `evidence_unverified` su un negativo è un blocco sicuro ma non un esito corretto; su un positivo è analisi non disponibile, con tutti i richiesti omessi |
| E7 | Pipeline esplicita: 17 economiche, 4 tecniche, 3 del parser. P20 è economica con `no_supported_economic_data` |
| E8 | Le chiavi fuori contratto sono in `future` (non misurabili, mai successi): `warrantyEndsOn`, `singleObjectId`, `paidOn`, `professionalId`, `professionalPhone`. Le assenze in `absent` sono controllate solo se il campo esiste nel contratto |

## Regole del misuratore (`pilot-score.cjs`)

**Citazioni.** Pagina esistente; estratto non vuoto, al massimo 2000 caratteri; contenuto nella pagina dopo NFC e spazi, **rispettando le maiuscole**, come `citation()` economica e `validateEvidence` M3. Il testo della pagina viene **dal corpus**, mai dall'osservazione.

**Valori economici:**
- importi con `printedCents`, prendendo l'unione delle fonti come il validatore;
- date con `printedDates`;
- categoria con le stesse espressioni regolari su testo in minuscolo;
- testo con contenimento in minuscolo («claims»), unico punto in cui il validatore ignora le maiuscole.

**Valori tecnici:**
- `brand` e `model`: l'estratto contiene il valore;
- `power`: etichetta contenuta nell'estratto, quantityCode coerente con l'etichetta, numero dopo l'etichetta seguito da «kW» e confrontato con `decimal()`.

Un estratto più corto è accettato solo se dimostra ancora il fatto.

**Categorie dei fatti:**

| Categoria | Significato |
|---|---|
| `required` / `allowed` | Fatto corretto e dimostrato |
| `wrong` | Chiave nota con valore, ruolo o ancora diversi |
| `unexpected` | Chiave del contratto non annotata. Include il flag `proven` per la revisione del gold |
| `unsupported` | Valore giusto, prova non valida, con il motivo |
| `duplicate` | Ripetizione senza punti |
| `forbidden` | Campo assente atteso. È anche critico |
| `omitted` | Richiesto non trovato |

**Critici:**
- `amount_role_swap`;
- `forbidden_field`;
- `negative_published`;
- `amount_selection_flag`;
- `conflict_not_preserved` (P16);
- `quantities_not_distinct` (P14).

**Aggregato:**
- `agreementWithAnnotations` e `requiredCoverage` sono accordo con le annotazioni sul campione fornito;
- `measurerOnly: true` salvo provenienza `provider_campaign`;
- un avviso esplicito se non è stato proposto nessun fatto;
- nessuna soglia statistica.

## Formato delle osservazioni v2

```json
{
  "format": "dimora-v5-pilot-observations", "formatVersion": 2,
  "corpusFormat": "dimora-v5-pilot-corpus", "corpusVersion": 2,
  "provenance": { "kind": "hand_built | deterministic_fixture | provider_campaign", "providerCalled": false, "stage": "…", "description": "…" },
  "observations": [
    { "caseId": "P07", "pipeline": "economic", "documentSha256": "<sha256 dei byte del corpus v2>", "outcome": "proposal",
      "economic": { "documentKind": "…", "amountSelectionRequired": false, "proposedFields": { "<campo>": { "value": "…", "sources": [{ "page": 1, "excerpt": "…" }] } },
                    "amountCandidates": [{ "id": "…", "amountCents": 12200, "role": "…", "label": "…", "sources": [ … ] }] } },
    { "caseId": "P16", "pipeline": "technical", "documentSha256": "…", "outcome": "proposal",
      "technical": { "brand": [], "model": [{ "id": "…", "value": "TD-24", "sources": [ … ] }], "power": [{ "value": "24", "measurement": { "value": "24", "unit": "kW", "quantityCode": "…", "quantityLabel": "…" }, "sources": [ … ] }] } },
    { "caseId": "P17", "pipeline": "parser", "documentSha256": "…", "outcome": "pdf_text_unavailable" }
  ]
}
```

**Da quale passaggio vengono i dati:**
- `economic` ha la forma di `EconomicOutput` **dopo** `validateOutput()`;
- `technical` ha la forma di `Record<FieldKey, Candidate[]>` **dopo** `validateEvidence()`;
- `parser` è il solo esito di `PdfTextExtractor.extract()`, cioè `text_extracted` o un codice d'errore.

Nelle fonti sono ammessi `documentId`, `documentVersion` e `sha256`/`documentSha256`: se presenti, l'hash deve coincidere con il documento osservato.

**Rifiuti espliciti, senza metriche:**

| Codice | Causa |
|---|---|
| `unsupported_format` | Array v1 o versione diversa: nessuna reinterpretazione automatica |
| `corpus_version_mismatch` | Corpus diverso da v2 |
| `document_hash_mismatch` / `source_hash_mismatch` | Binding al fixture fallito |
| `pipeline_mismatch` / `payload_pipeline_mismatch` | Pipeline incoerente |
| `unknown_key` | Chiave sconosciuta, per esempio `evidenceVerified`, `warrantyEndsOn` |
| `unknown_outcome` | Esito sconosciuto, per esempio `no_relevant_data` |
| `missing_payload` / `payload_without_proposal` | Payload incoerente con l'esito |
| `invalid_provenance` | `providerCalled` assente o incoerente con il tipo. Non viene mai dedotto dal file |
| `inconsistent_with_validator` | `amountSelectionRequired` diverso da quello ricalcolato dalle regole del validatore, oppure quantityCode non coerente con l'etichetta |
| `duplicate_case` / `unknown_case` | Casi ripetuti o inesistenti |

I casi mancanti sono elencati in `missing` e il report esce con codice 1.

## Comandi eseguiti e risultati reali

Nel worktree, `backend-v5`, Node v24.20.0:

| Comando | Risultato |
|---|---|
| `node --test test/pilot-corpus.test.cjs test/pilot-score.test.cjs test/pilot-observations.test.cjs` | **24 test: 20 passati, 0 falliti, 4 saltati** (i 4 test reali di `pilot-corpus.test.cjs`: «dist assente») |
| `node tools/pilot-corpus-report.cjs > …/corpus-v2-manifest.json` | Manifesto con 24 hash, exit 0 |
| `node tools/pilot-corpus-report.cjs --observations …/esempio-osservazioni-v2.json > …/esempio-report-v2.json` | Exit 1 come previsto: 17 casi mancanti nell'esempio |
| `git diff --check` prima del commit | OK |

Primo risultato, prima di una rifinitura semantica: 23 test, tutti passati alla prima esecuzione. Poi ho deciso che sui positivi con proposta pubblicata `systemSafe` non si applica (`null`, i rischi sono nei critici) e ho aggiunto l'asserzione relativa. La riesecuzione è quella riportata sopra.

**Verifica preliminare, in sola lettura, del `dist` del master.** Ho eseguito uno script nello scratchpad della sessione, non versionato. Ha importato il `dist` compilato del master (`Home_OS/backend-v5/dist`, file delle 11:20, master `d57e22a`) senza scrivere nulla nel master, senza servizi e senza provider. Risultati:
- `textPdf(GAS_LINES)` e `textPdf(INVOICE_LINES)` sono **identici byte per byte** a `economicFixturePdf('gas'/'invoice')`;
- `printedCents` e `printedDates` del misuratore coincidono con quelli compilati su **78 campioni**: 0 differenze;
- `PdfTextExtractor` reale sui 24 input: pagine normalizzate **uguali al corpus in 21/21** casi testuali; esiti del parser corretti per P17–P19;
- `EconomicFixtureProvider.analyze` reale, poi `validateOutput`, poi adattatore v2, poi misuratore: P01 10/10 richiesti più 1 ammesso, P07 7/7 più 1, **0** wrong, unexpected, unsupported e critici.

È una verifica preliminare: i test reali di `pilot-corpus.test.cjs` vanno eseguiti da Codex nel master con build aggiornata.

## Esempi sintetici

`esempio-osservazioni-v2.json` è costruito a mano, con provenienza `hand_built` e `providerCalled: false`. Contiene:
- P07 corretto;
- P10 con il preventivo proposto come costo corrente, errore intenzionale;
- P03 con una citazione su una pagina inesistente;
- P16 con il conflitto conservato;
- P17 con l'esito del parser;
- P22 con `evidence_unverified`;
- P02 con `evidence_unverified`, cioè un positivo rifiutato.

Sintesi del report su 7 osservazioni (17 mancanti):

| Misura | Valore |
|---|---|
| Richiesti trovati | 11 su 15 |
| Ammessi | 1 |
| `wrong` | 1 |
| `unsupported` | 1 |
| `omitted` | 4 |
| Critici P10 | `amount_role_swap`; `amount_selection_flag` (due totali correnti) |
| P22 | `blockedBySystem: true`, `outcomeMatch: false` |
| P02 | `positiveRejected: true` |
| Avvisi | Misuratore, non accuratezza |

## Gap registrati, non aggiunti al corpus 24

- Caso multipagina con il totale a pagina 2.
- Due totali correnti con valori diversi.
- Prompt injection nel testo.
- Formato inglese «1,234.56».
- Importo intero senza decimali, che deve dare esito negativo.
- Documento tecnico con più caldaie (`multi_assets_unsupported`).
- Caso tecnico negativo con il codice reale `no_supported_data`, perché P20 ora è economico.

Il test delle due righe con lo stesso importo usa un caso sintetico costruito **solo nel test** del misuratore.

## Limiti

- Senza `dist` nel worktree, i test reali sono saltati. La verifica preliminare usa il `dist` del master compilato alle 11:20, non dalla mia baseline. Codex deve rieseguire i 4 test reali nel master.
- Il misuratore reimplementa la logica dei validatori: un cambiamento futuro dei validatori va riflesso qui. Il test reale di parità su `printedCents`/`printedDates` ne copre una parte. Il controllo di pagina della valuta (USD) avviene nell'adapter e incide solo sull'esito, non sui fatti.
- Il controllo su `amountSelectionRequired` ricalcola la regola del validatore (arretrati presenti, oppure un numero di totali correnti diverso da uno).
- 24 casi sintetici: nessuna soglia statistica. Le soglie e la campagna vanno congelate separatamente, con budget e consenso nuovi.

## Scelte aperte

1. **`systemSafe` sui positivi con proposta pubblicata** è `null` invece di `true`: i rischi sono espressi dai critici. Codex può preferire un campo dedicato «publishedRisk».
2. **Ammessi come valori concreti** (titolo verbatim, categorie dimostrabili, righe). Una formulazione diversa ma dimostrata viene contata `wrong` con prova valida. È più severo, ma coerente con «allowed non è un lasciapassare»; da rivedere sui dati della campagna.
