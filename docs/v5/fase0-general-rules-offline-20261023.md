# Fase 0 — regole documentali generali, verificate offline

23 ottobre 2026. Correzione sul branch `codex/fase0-ai-quality-v3`, base `c15e0a0`. Incarico: rendere le regole meno dipendenti dai campioni del committente, conservando rigore sui dati. Nessuna AI, provider o email; nessun accesso al DB/API/storage reale, modifica `.env`, migrazione, backfill o deploy. Originali personali non necessari ai nuovi test e non copiati nel repository.

## Cosa è emerso dall’audit

| Dipendenza o rischio | Correzione | Vincolo conservato |
|---|---|---|
| Poche formule esatte per data ordine/acquisto, due liste diverse per la data comune | Ruoli condivisi e varianti italiane/inglesi, apostrofi e ritorni a capo; stesso controllo per citazioni e data comune delle righe | Data completa e significato esplicito; nessun anno inventato o prestito da altra pagina |
| «Data fattura» ammessa come acquisto | Rimosso quel significato dal validatore di acquisto; vecchie bozze con data non più verificabile richiedono revisione per l’automatico | Data documento, ordine, consegna e pagamento restano distinti; nessuna riscrittura delle schede confermate |
| Ricerca della sottostringa “order” in qualunque testo | Riconoscimento del ruolo data d’ordine, non della semplice sottostringa | Le date d’ordine continuano a bloccare l’automatismo economico |
| Tabelle con ordine fisso di colonne | Colonne esplicite identificabili per ruolo, riordinabili, delimitate da pipe, tab o punto e virgola; EUR nella cella o nella sua colonna totale | Una riga e un totale stampato univoci; prezzo unitario non moltiplicato, celle vuote non completate, intestazioni ripetute/ambigue respinte |
| Spedizione limitata a due diciture | Ruolo trasporto/spedizione anche con sinonimi italiani e inglesi; importo monetario completo e zero esplicito | Non è prezzo oggetto né ulteriore spesa; niente valuta, segno negativo o frase “gratis” convertiti in importo |
| Totale ordine limitato a un’intestazione | Varianti di totale complessivo italiano/inglese, con valuta e numero monetario validato | Subtotale, IVA, imponibile, sconto, saldo da pagare e recap pagamento non diventano totale dell’acquisto |
| Prezzo attribuibile solo perché nome e parole “totale riga” compaiono nella stessa citazione | Nome, ruolo e importo devono appartenere alla stessa riga identificabile | La riga di un altro prodotto non presta il prezzo; un dato ambiguo resta da verificare senza perdere marca/nome leggibili |
| Numeri decimali nel modello o nelle specifiche | Il ruolo monetario si legge nella cella/riga del prezzo, separato dai numeri del nome | Una capacità come 2.20L non è un secondo prezzo |

Non sono stati introdotti riconoscitori di Samsung, Amazon o degli identificativi dei documenti forniti. Il catalogo conservativo dei marchi per suggerimenti dal nome rimane opzionale: un marchio esplicitamente citato fuori catalogo è già accettato, come verificato con un nome inventato nuovo. Nessun marchio viene dedotto dalla sola prima parola o dal venditore. Tipologie e stanze incerte restano proposte da confermare.

## Prove e risultati

- **Build e lint backend superati** dopo le correzioni; onboarding **275/275**, inclusi **63 nuovi controlli** di varianti/invarianti senza riferimenti ai file personali. Ordinari **214/214**; infrastruttura qualità/runner/adattatore offline **24/24**; autorizzazioni e hash del validatore **5/5**.
- **DB isolato 82/82**: formati generali più regressioni ordini, acconto/saldo e Q48. Tre impaginazioni e diciture diverse arrivano a scheda/spesa con il prezzo della propria riga, non il totale comprensivo degli altri costi. Privacy anche tra owner, copie dello stesso file, codici di rifiuto specifici, replay concorrente e da altro client, versione/SHA e revoca verificati.
- **HTTP/DB 98/98** e **Q15/Q22/Q48 38/38** sull’ultimo dist in ambiente separato; API e cluster temporanei fermati. Gold, scorer, soglie, campagne archiviate e ledger invariati.
- **Frontend non modificato e non rieseguito**: nessuna modifica della forma API. L’ultimo 838/838 mock completo è storico del checkpoint precedente, non una prova di questo incarico. Nessun test live di estrazione OCR/AI.

I nuovi esempi sono fixture tecniche dichiarate per verificare invarianti, NON risposte AI, nuovi gold o una misura dell’estrazione sui documenti reali. Le 24 permutazioni delle quattro colonne cambiano anche importi, nomi e separatori; controllano prezzi stampati diversi dai prezzi unitari, riga mancante e ripetuta. Altre prove coprono data qualificata per un solo prodotto, valuta estera, percentuali, negativi, date incomplete, fonte inventata, pagina sbagliata e prezzi presi da un’altra riga. In caso di prezzo non verificabile, identità e quantità leggibili sono conservate con un avviso di revisione; quantità non verificabile non cancella un prezzo di riga indipendentemente provato. Una riga riconoscibile senza prezzo valido blocca il ripiego automatico sul totale, sia nel planner sia nel controllo finanziario server.

La regressione Q22 ha inizialmente respinto un’estensione troppo larga della data comune: una data qualificata «solo [un articolo]» poteva essere copiata ad altri oggetti. Corretto il controllo sul significato e sul testo completo, senza modificare quel test o i suoi gold. I test DB verificano anche i codici specifici `automatic_duplicate_review` e `onboarding_expense_exists`, oltre ai conteggi finali: non basta una qualsiasi eccezione per dichiarare protetti i doppioni.

Riproduzione: backend `npm run test:object-onboarding`, `npm test`, `npm run test:quality-v3`, `node --test test/quality-v3-authorization.test.cjs`, build/lint. Test DB con `test/installment-offline.ps1 -PgBin <binari locali> -ScratchRoot <directory temporanea>`: cluster nuovo solo `127.0.0.1:55433/dimora_v5_quality_v3_test`, ruolo quality_test, fetch esterno bloccato; stop in finally. Il runner include formati generali, ordini, acconto/saldo e Q48. Per HTTP è stata usata una copia temporanea del dist/API sulla porta 3109, con guard del DB modificato esclusivamente nella copia e senza `.env` o credenziali provider.

## Protocollo e limiti

Prompt candidato v29: istruzioni per ruoli semantici, colonne in ordine diverso e citazioni originali, senza riscriverle nel formato di un campione. Nessuna richiesta al modello. Il nuovo validatore viene incluso negli hash congelati delle eventuali future autorizzazioni di campagna; un hash differente è respinto offline. Un test vecchio con protocollo atteso fisso v27 è stato corretto per verificare il protocollo dell’autorizzazione fornita, mantenendo tutti i controlli sul gate incompleto. Nessuna nuova autorizzazione live, variazione di tetti, reset ledger, riscrittura di campagne o gold.

Questo non è un interprete universale di qualsiasi documento o lingua. Le varianti supportate restano esplicite e verificabili. Celle unite, tabelle senza separazione univoca, valute diverse da EUR, date numeriche con convenzioni estere ambigue e nuovi ruoli non riconosciuti richiedono revisione; non inventare conversioni o impaginazioni. I parser precedenti per tabelle testuali restano disponibili quando non c’è una tabella a colonne riconoscibile; una struttura riconosciuta ma ambigua non ricade su un parser più permissivo. Le regole dedicate di bollette e fatture segmentate non vengono sostituite con il lettore dei totali d’acquisto.

Nessuna nuova capacità OCR dimostrata; scansioni e osservazioni visive conservano il loro livello di prova e i controlli esistenti. UI e forma dell’API invariati. La suite frontend completa non è stata ripetuta in questo intervento backend: l’ultimo esito 838/838 appartiene al checkpoint precedente. Nessuna promozione del gate AI, certificazione di pagamento, associazione automatica a stanze, backfill di dati confermati o distribuzione sull’app reale.

## Continuità

Principio per il seguito: gli esempi del committente fanno emergere difetti, non definiscono un formato obbligatorio. A ogni nuova famiglia di formato aggiungere varianti strutturali e controesempi di attribuzione, senza introdurre nomi/valori del cliente nei validatori e senza abbassare la prova richiesta. Restano invariati privacy per fonte, membership, versione/SHA, conferma esplicita dei casi ambigui e idempotenza. Preservati main, file sporchi estranei e 104 StoredFile.
