# Fase 0 — Q48, copertura per pagina e due fatture, 23 ottobre 2026

Implementato e verificato offline su `codex/fase0-ai-quality-v3`. Nuovo contratto per le pagine del PDF visivo: **122,00 EUR / Idroquarzo / 18 settembre 2026** e **244,00 EUR / Termonimbo / 19 settembre 2026**, senza somma o fusione. Il decoder precedente già supportava entrambe le fatture con una fixture completa; la correzione attuale rende esplicita la pagina omessa e impedisce che una conferma parziale chiuda il file come completo.

Nessuna chiamata AI o invio diagnostico, neppure metadata/conteggi; nessuna modifica a gold, originali sintetici, scorer, soglie o risultati storici. Verificati i 52 originali e i 52 gold contro entrambe le ricevute congelate e i sei JSON di campagna contro HEAD; SHA del workbook allegato invariato dopo la lettura. Le risposte grezze v24 non erano conservate: il precedente 1/2 per campo non consente di distinguere con certezza omissione di proposta e campi errati. Non si afferma di avere ricostruito quei payload o misurato una nuova accuratezza AI.

## Contratto e controlli

- Prompt **`document-understanding-v26-invoice-coverage`**. Per PDF visivi con più pagine, lo schema richiede un oggetto `invoicePages` con uno slot `pN` per ogni pagina fisica inviata. Ogni slot dichiara invoice/other/unreadable/continuation; invoice contiene **una sola fattura completa**, gli altri nessuna. Per questo percorso i contenitori globali di costi, soggetti, fatti e totale restano vuoti. Le utility e i documenti di soli prodotti conservano il proprio percorso.
- Normalizzazione degli slot prima degli stessi validatori esistenti: citazioni e regioni, pagina fisica, fornitore, numero fattura, data etichettata, ruolo/valuta/importo stampato. Proposte in pagina sbagliata, slot assenti/extra, due fatture nello stesso slot, totale globale o costi globali concorrenti vengono rifiutati. Nessun riempimento con importi del gold, OCR inventato o nuove chiamate per pagina.
- Anche un’unica proposta in un PDF visivo multipagina riceve un segmento SHA/pagina con gli stessi ancoraggi obbligatori. Il server calcola `invoiceCoverage`: versione, totale pagine, pagine inviate, coperte e ancora pendenti. Il metadato non è accettato dal modello. Una pagina non inviata, non proposta, illeggibile, altra o di continuazione rimane pendente nel contratto conservativo di fatture complete su pagine singole.
- La revisione visiva resta sempre obbligatoria. `automaticPlan` e il segnale di completezza non possono ignorare pagine pendenti, nemmeno se il modello imposta `needsReview=false`. Una conferma manuale può salvare la prima fattura valida, ma la bozza resta **open**; `documentOnly` non aggira il controllo (`onboarding_invoice_coverage_review`).
- Copertura completa e conferma di tutte le proposte sono distinte dalla verità delle osservazioni visive. La classificazione di una pagina come other non certifica che non contenga una fattura; non viene usata per cancellare il pendente. Nessun supporto implicito a una fattura che si estende su più pagine.
- Segmenti, provenienza e deduplica restano `invoice-page-v1`. Identità della prima fattura stabile quando si aggiunge la seconda; copie SHA, costi/ancoraggi incrociati, concorrenza, rollback e replay continuano a essere protetti. Nessuna nuova tabella o migrazione, nessuna riscrittura delle vecchie bozze.

La proiezione della bozza espone `invoiceCoverage` soltanto quando la fonte corrente è leggibile. Fonte/versione/SHA e membership restano obbligatori anche al replay. Il ledger di valutazione conserva la copertura come **metadati bounded**, senza titoli, citazioni, risposte o importi: total/sent/covered/pending devono essere coerenti e ordinati. Il campo è facoltativo per leggere osservazioni storiche; i protocolli precedenti restano congelati e le loro ricevute non autorizzano il codice cambiato.

## Verifiche offline

| Verifica | Esito |
|---|---|
| Build e lint backend V5 | verdi |
| Onboarding | **195/195**, 7 nuovi test di copertura Q48 |
| Qualità v3 | **24/24** |
| Guard di campagna | **11/11**, solo offline |
| Backend `npm test` | **213/213** |
| DB isolato: nuova copertura Q48 + regressioni Q48/Q22/Q15 | **38/38**, inclusi contenitori |

Q48 reale sintetico attraversa preparazione, schema, decoding e policy con trasporto **interamente in memoria**: modalità completa, locale e prefissi 1 e 2. Con entrambi gli slot: **2/2 importi, 2/2 date, 2/2 fornitori** sul gold invariato, decisione review. Il prefisso 1 registra pagina 2 pendente; il prefisso 2 contiene entrambe. La suite mantiene negativi sulle regioni, fonti fuori prefisso, ancoraggi e importi; l’asserzione del vecchio caso «singola proposta» è aggiornata al vincolo più forte segmento + pagina mancante, senza rimuovere controlli privacy/idempotenza.

Il primo tentativo delle nuove prove ha individuato un alias nello schema dinamico: la stessa struttura di citazione era visitata più volte per slot diversi. Corretto usando copie indipendenti; suite completa poi verde. Una ripetizione DB ha inoltre rilevato l’ordine non garantito delle righe del ledger nel nuovo test: confronto reso esplicito per prefisso, mantenendo tutti i controlli di copertura e di assenza di richieste al replay.

DB con `npm run test:q48-coverage-db -- -PgBin <bin PostgreSQL locale> -ScratchRoot <work>`, cluster nuovo **55433**, ruolo `quality_test`, DB `dimora_v5_quality_v3_test`. Guard host/porta/nome prima della connessione, schema solo nel cluster temporaneo, nessun caricamento `.env`. Directory `invoice-coverage-a0ce9f6b345d4942b82bebbbb8ae9155`, conservata e cluster spento nel `finally`.

Le 8 prove della nuova copertura (7 scenari più contenitore) verificano: altro owner/estraneo; persistenza dei due prefissi su ledger e replay da altro client senza nuove richieste simulate; prima fattura confermata con pagina 2 ancora pendente; impossibilità di archiviare nascondendo il pendente; errore seconda proposta e rollback della ricevuta; collegamento della prima spesa già esistente più creazione della sola seconda anche con concorrenza; replay da altro client, nuova chiave/body cambiato; redazione alla revoca e blocchi SHA/versione/ruolo. Le altre 30 prove ripetono Q15, Q22 e segmentazione Q48, inclusa atomicità di due nuove creazioni. Le richieste del trasporto finto non aprono socket né spendono denaro.

## Limiti e seguito

Questa correzione verifica il contratto, la segnalazione delle omissioni e i percorsi canonici. **Non recupera una fattura illeggibile senza evidenza e non prova che il modello reale produrrà entrambe le fatture con v26**. Copertura di proposte visive non è OCR verificato. Risultati/ledger v22 e v24 e gate non superato restano invariati; nessun ricalcolo retroattivo di Q48.

Frontend/browser e suite HTTP non ripetuti, API/DB dell’app non riavviati o modificati. Le vecchie bozze non vengono retrocompilate con una copertura inventata. L’indicazione esplicita delle pagine pendenti nell’interfaccia e il percorso per pagine di continuazione/non fattura sono lavoro successivo prima dell’attivazione. Originali personali, `.env`, `main` e file estranei preservati.

La mappa Excel fornita è stata letta in sola lettura come riferimento di classificazione: 126 voci, 13 aree, nessuna importazione o riclassificazione. [Piano proposto per le prossime 4–6 ore e corrispondenza con le famiglie esistenti](fase0-next-hours-plan-20261023.md). È una proposta di lavoro, non una campagna avviata né una modifica già applicata alla tassonomia.
