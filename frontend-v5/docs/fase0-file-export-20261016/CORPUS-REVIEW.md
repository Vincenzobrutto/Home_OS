# Revisione indipendente del corpus pilota · 16/10/2026

Consegna B dell'incarico `Dimora-V5-incarico-Claude-Fase0-file-export-20261016.md`.

**Cosa ho letto, in sola lettura, alla baseline `1e13e43`:**
- il corpus: `backend-v5/test/pilot-corpus.cjs`, `backend-v5/tools/pilot-corpus-report.cjs`, `backend-v5/test/pilot-corpus.test.cjs`;
- i contratti attuali S1c/M4 economici: `src/economy/document-domain.ts`, `document-anthropic.ts`, `document-evidence.ts`, `document-fixture.ts`;
- i contratti M3/M4 tecnici: `src/review/domain.ts`, `ai-evidence.ts`, `lib/review.ts`.

**Cosa non ho fatto:** nessuna modifica ai dati, nessuna chiamata al provider, nessun caricamento.

**Unica esecuzione locale:** lo scorer `score()`, copiato nello scratchpad e caricato con stub vuoti per i due moduli che servono solo a generare i byte. Gli ho dato osservazioni scritte a mano, descritte sotto.

I 24 casi sono **annotazioni**, non risultati di un modello. Nulla di quanto segue misura l'accuratezza di un provider.

## Sintesi

1. **Semantica corretta.** In quasi tutti i casi le annotazioni sono giuste sui punti critici:
   - totale corrente distinto da dovuto, arretrati, imponibile e IVA;
   - acconto distinto dal preventivo;
   - nota di credito e dollari non trasformati in un costo in euro;
   - data del documento distinta dalla scadenza;
   - due potenze tenute distinte;
   - conflitto di modello non risolto;
   - fornitore non trasformato in professionista.
2. **Gold incompleto rispetto ai contratti.** Molti campi che il contratto supporta e che il documento dimostra non sono annotati: titolo, fornitore, numero, date, categoria, righe di importo alternative. Lo scorer conta ogni campo non annotato come **errato**. Ne segue che **l'output deterministico del provider di prova di Dimora** (`EconomicFixtureProvider`) ottiene precisione 0,36 su P01 e 0,38 su P07, pur essendo corretto per costruzione.
3. **Lo scorer ha quattro limiti strutturali:**
   - chiavi che non possono ripetersi, quando il contratto ammette più candidati;
   - citazioni confrontate per uguaglianza esatta invece che con la regola del validatore;
   - esiti non raggruppati per equivalenza (`no_supported_economic_data` contro `evidence_unverified`);
   - nessuna indicazione della pipeline, economica o tecnica.
4. **Due annotazioni non compatibili con i contratti attuali:**
   - P14: «Potenza nominale» produce `quantityCode: other`, non `nominal`;
   - P20: `no_relevant_data` non è un esito di nessuna pipeline.

Prima di qualunque campagna con il provider servono le correzioni degli **errata E1–E8** e del formato (sezione «Proposta di formato»). Altrimenti le metriche misurano il gold, non il modello.

## Dimostrazione offline

Osservazioni **scritte a mano**, corrette secondo i contratti, passate a `score()`:

| Caso | Osservazione | correct / wrong / unsupported / omitted | Precisione | Recall | Motivo |
|---|---|---|---|---|---|
| P01 | Output esatto di `EconomicFixtureProvider` per la bolletta gas | 4 / **7** / 0 / 0 | **0,36** | 1,00 | Titolo, fornitore, numero, data documento, competenze e scadenza non annotati |
| P07 | Output esatto di `EconomicFixtureProvider` per la fattura | 3 / **5** / 0 / 0 | **0,38** | 1,00 | Titolo, fornitore, categoria `repairs_works`, numero e data non annotati |
| P04 | Categoria gas, totale, consumi e conguaglio come `other` | 1 / **3** / 0 / 0 | 0,25 | 1,00 | Il prompt chiede di conservare le alternative; la categoria è dimostrabile |
| P12 | Totale più due righe `line_total` | 1 / **2** / 0 / 0 | 0,33 | 1,00 | Righe ammesse dal contratto; la seconda collide sulla chiave |
| P03 | Citazione «Totale documento: 35,20», valida per il validatore | 1 / 0 / **1** / 1 | 0,50 | 0,50 | Citazione senza «EUR» = non supportata per uguaglianza esatta |
| P16 | Due candidati `model` (conflitto M3) | 0 / **2** / 0 / 2 | 0 | 0 | Le chiavi `model.libretto` e `model.allegato` non esistono nel contratto |
| P14 | `power.useful_heating` e `power.other` (etichetta «Potenza nominale») | 1 / **1** / 0 / 1 | 0,50 | 0,50 | Il contratto M3 mappa solo «Potenza nominale riportata» a `reported_nominal` |
| P20 | Esito `no_supported_economic_data` | esito errato | — | — | `no_relevant_data` non è un codice di contratto |
| P22 | Esito `evidence_unverified`, rifiuto sicuro del sistema | esito errato | — | — | L'adapter rifiuta le pagine con USD con `evidence_unverified`; anche questo è un esito sicuro |

Lo script della dimostrazione è nello scratchpad della sessione Claude e non è versionato. Si riproduce con le osservazioni elencate e il `score()` del corpus.

## Verdetti per caso

Legenda:
- **OK:** corretto e compatibile con i contratti.
- **Integrare:** corretto, ma mancano campi supportati da segnare come ammessi o attesi.
- **Correggere:** errore rispetto al contratto.
- **Ambiguo:** serve una decisione di Codex.

Le chiavi segnate come assenti ma **fuori contratto** non possono comparire nell'output, perché schema ed enum le rifiutano. Sono quindi controlli vuoti oggi: vanno tenute come desiderio futuro, non contate come successi.

| Caso | Verdetto | Osservazioni e correzione proposta |
|---|---|---|
| P01 | **Integrare** | Semantica corretta (80 corrente, 20 arretrati, 100 da pagare). Aggiungere come attesi: `supplier` Gas Demo, `documentNumber` G-2026-09, `documentDate` 2026-09-30, `competenceFrom` 2026-09-01, `competenceTo` 2026-09-30, `dueOn` 2026-10-20; `title` come ammesso. Aggiungere `amountSelectionRequired: true` (arretrati presenti). **E1** |
| P02 | Integrare | `title` ammesso. Il resto è OK |
| P03 | OK | `dueOn` assente è significativo (il campo esiste nel contratto). `title` ammesso |
| P04 | **Integrare** | `category: gas` dimostrabile da «Bolletta gas con conguaglio»: attesa o ammessa. Consumi 60,00 e conguaglio 20,00 come `amount.other` ammessi (il prompt chiede di conservare le alternative). **E2** |
| P05 | Integrare | `competenceFrom/To` assenti: ottimo controllo. `category: gas` ammessa |
| P06 | Integrare | Ruoli corretti (120 corrente, 90 dovuto). «Credito precedente 30,00» come `other` ammesso; `amountSelectionRequired: false`. `category: electricity` ammessa |
| P07 | **Integrare** | Come P01: `supplier` Idraulico Demo, `documentNumber` 42, `documentDate` 2026-09-30, `category: repairs_works` («riparazione») attesi; `title` ammesso. **E1** |
| P08 | OK | `supplier` atteso, corretto. Nessuna categoria dimostrabile («lavori» non soddisfa la regola del validatore). Nota per Codex: se il modello propone `repairs_works` qui, il validatore scarta **tutta** l'analisi (`evidence_unverified`). Il caso misura quindi anche l'effetto «tutto o niente» |
| P09 | Integrare | `category: purchase_replacement` («acquisto») ammessa. `warrantyEndsOn` è fuori contratto (BL-02 AI, futuro): segnarlo come controllo vuoto |
| P10 | **Ambiguo** | 500 come totale corrente: corretto. «Valore preventivo 2000» come `other` **richiesto** è discutibile: ometterlo è più prudente, perché c'è il rischio che l'utente lo scelga come costo. Proposta: ammesso, non richiesto. **E3** |
| P11 | OK | Il prompt dichiara le note di credito non supportate e `printedCents` ignora i negativi: nessun candidato, quindi `no_supported_economic_data`. Accettare anche `evidence_unverified` come rifiuto sicuro (E6) |
| P12 | **Integrare** | Righe Forno e Lavatrice come `line_total` ammesse (servono chiavi ripetibili, E5). `category: purchase_replacement` ammessa. `singleObjectId` fuori contratto (BL-10b, futuro) |
| P13 | OK | `power` assente è significativo |
| P14 | **Correggere** | Con l'etichetta «Potenza nominale» il contratto M3 produce `quantityCode: other`: solo «Potenza nominale riportata» diventa `reported_nominal`. Rinominare la chiave in `power.other`, oppure cambiare il testo in «Potenza nominale riportata: 28 kW» e la chiave in `power.reported_nominal`. Preferisco la seconda: misura il caso canonico e lascia `other` a un caso dedicato. Controllare che le due potenze restino due candidati (`quantity_interpretation`). **E4** |
| P15 | OK | `power` e `model` assenti, significativi |
| P16 | **Correggere (formato)** | Semantica corretta: due modelli, nessuna risoluzione. Nel contratto M3 sono due candidati dello stesso campo `model` (`value_conflict`). Sostituire `model.libretto` e `model.allegato` con due fatti `model` distinti per valore; `model.resolved` diventa «nessuna proposta single_value». **E5** |
| P17 | OK | `pdf_text_unavailable` verificato dal test con il parser reale |
| P18 | OK | `pdf_invalid` per il JPEG. Nel prodotto l'analisi non è offerta sulle immagini: il caso misura il parser, non un percorso utente |
| P19 | OK | `pdf_encrypted` verificato dal test con il parser reale |
| P20 | **Correggere** | `no_relevant_data` non esiste. Indicare la pipeline: economica → `no_supported_economic_data`; tecnica (M3) → `no_supported_data`. Se il caso deve valere per entrambe, duplicarlo o usare un gruppo d'esito «nessun dato» (E6). **E7** |
| P21 | Integrare | Date corrette (03/04/2026 → 2026-04-03; scadenza distinta). `category: maintenance` ammessa. `paidOn` fuori contratto: controllo vuoto |
| P22 | OK nella sostanza | Esito sicuro in ogni caso. Accettare sia `no_supported_economic_data` (il modello dice `unsupported`) sia `evidence_unverified` (il modello dice EUR e l'adapter trova USD nella pagina). Registrare quale dei due, perché il secondo indica un errore del modello anche se il sistema è salvo (E6) |
| P23 | OK | Separatore delle migliaia «1.220,00» gestito da `printedCents` |
| P24 | Integrare | `category: purchase_replacement` ammessa. `professionalId` e `professionalPhone` fuori contratto (BL-10b, futuro): controlli vuoti. Restano utili come promemoria per BL-10b, senza ampliarlo qui |

## Errata proposti (Codex arbitra)

| ID | Correzione | Casi |
|---|---|---|
| E1 | Completare il gold dei due fixture con tutti i campi che `EconomicFixtureProvider` produce già, il riferimento deterministico del sistema | P01, P07 |
| E2 | Segnare come **ammessi** (né richiesti né penalizzati) i campi supportati e dimostrabili: `title`, `category`, righe `other` e `line_total` | P02, P04–P06, P09, P12, P21, P24 |
| E3 | Preventivo dell'acconto: da richiesto ad ammesso | P10 |
| E4 | Etichetta o chiave della potenza nominale allineata a `quantityCode` M3 | P14 |
| E5 | Chiavi ripetibili per i campi con più candidati: identità del fatto = chiave + valore (+ quantityCode per la potenza) | P12, P14, P16 |
| E6 | Esiti per gruppi di equivalenza, registrando comunque il codice effettivo | P11, P20, P22 |
| E7 | Pipeline esplicita per ogni caso: `economic`, `technical` o `parser` | P20 (e tutti) |
| E8 | Distinguere i campi assenti dentro il contratto dai desideri futuri fuori contratto | P09, P12, P21, P24 |

## Valutazione dello scorer

| Aspetto | Oggi | Problema | Proposta |
|---|---|---|---|
| Fatti non annotati | `wrong` | Penalizza output corretti (dimostrazione) | Tre insiemi: `required`, `allowed`, `absent`. Un fatto ammesso non conta né come giusto né come sbagliato; un fatto fuori da tutti è `unexpected` (falso positivo) |
| Chiavi ripetute | Il secondo fatto con la stessa chiave è `wrong` | Il contratto ammette più candidati (`line_total`, `model` in conflitto, potenze distinte) | Identità = chiave + valore normalizzato |
| Valori | Uguaglianza `!==` | Accettabile per importi interi e date canoniche | Normalizzazione esplicita: testo NFC, spazi e maiuscole come il validatore (`normalized(...).toLocaleLowerCase('it')`), potenza con `decimal()` |
| Citazioni | Uguaglianza esatta di pagina ed estratto | Un estratto più corto ma valido per il validatore diventa `unsupported` (P03) | Stessa regola del validatore: estratto contenuto nella pagina normalizzata e valore dimostrato (`printedCents`, `printedDates`, inclusione del testo) |
| Esiti | Codice esatto | Due rifiuti sicuri diversi contati come errore (P22) | Gruppi: `proposal`, `safe_rejection` (`no_supported_*`, `evidence_unverified` per i negativi attesi), `parser_error`. Riportare comunque il codice |
| Campi vietati | Conta i fatti con chiave in `absent` | Chiavi fuori contratto non possono mai apparire: il conteggio 0 è vuoto | Riportare separatamente «assenze verificabili» e «fuori contratto» |
| Esito senza fatti | `precision` null, `recall` 0 | Corretto | Tenere |
| Osservazione mancante | `missingObservation`, exit code 1 | Corretto: l'astensione non vale come successo | Tenere |
| Proprietà di sistema | Non misurate | `amountSelectionRequired` e `documentKind` determinano cosa vede l'utente | Aggiungere attesi per caso (P01 `true`, P06 `false`) |
| Effetto «tutto o niente» | Non visibile | Un campo opzionale non dimostrato annulla l'intera analisi | Contare per pipeline la quota di `evidence_unverified` e `analysis_invalid_output` sui casi `proposal` |

Il test `Scorer distinguishes…` verifica i conteggi del misuratore su un caso costruito a mano. È corretto come test del codice, ma non è accuratezza: nella documentazione e nel report va sempre chiamato così.

## Gap del corpus (senza ampliare BL-10b, OCR o categorie)

- **Una sola pagina ovunque:** il controllo di pagina della citazione non è mai messo alla prova. Basta un caso a due pagine con il totale a pagina 2.
- **Nessun caso con due totali correnti** (`amountSelectionRequired` per molteplicità), per esempio una fattura con riepilogo e un totale ripetuto con valore diverso.
- **Nessun caso di prompt injection nel testo** («ignora le istruzioni…»), che il prompt dichiara di gestire.
- **Nessun formato inglese «1,234.56»**, dichiarato supportato dal prompt.
- **Nessun valore intero senza decimali** («Totale 80 EUR»), dichiarato non supportato: serve come caso negativo.
- **Tecnico:** manca un documento con più caldaie (`multi_assets_unsupported`) e uno con l'etichetta canonica «Potenza nominale riportata» (vedi E4).

Tutti si costruiscono con il generatore ASCII esistente.

## Soglie proposte per i campi critici

Con 24 casi le percentuali non sono stabili: una differenza di un caso vale 4–8 punti. Propongo **soglie a caso, a tolleranza zero, sui comportamenti critici**, e metriche solo descrittive per i campi secondari, finché il corpus non raggiunge almeno 10–15 casi per ciascun campo critico.

| Comportamento critico | Casi | Soglia |
|---|---|---|
| Nessun importo errato come `current_document_total` sui casi `proposal` | P01–P10, P12, P21, P23, P24 | 0 errori. L'omissione è tollerata: l'utente inserisce l'importo a mano |
| Ruoli distinti (corrente / dovuto / arretrati / imponibile / IVA / acconto / preventivo) | P01, P06, P07, P10, P23 | 0 scambi |
| `amountSelectionRequired` corretto | P01, P06 | 0 errori |
| Nessun costo in EUR da note di credito o valute diverse | P11, P22 | 0 fatti; esito sicuro |
| Nessuna data inventata; data del documento ≠ scadenza | P03, P05, P21 | 0 |
| Potenze distinte mai fuse; conflitto di modello mai risolto | P14, P16 | 0 |
| Campi tecnici assenti non inventati | P13, P15 | 0 |
| Negativi | P17–P20 | 4/4 esiti sicuri, 0 fatti |
| Citazioni non verificabili pubblicate | tutti | 0 (garantito dal validatore: controllo di regressione) |
| Campi secondari (titolo, fornitore, numero, categoria) | — | Solo descrittivi: precisione e recall per campo, più la quota di analisi annullate per un solo campo |

Se il committente autorizza la campagna, propongo **almeno 3 esecuzioni per caso** per vedere la variabilità del modello. Costo e budget vanno approvati a parte, e nessuna esecuzione sui casi del solo parser (P17–P19), come già previsto.
