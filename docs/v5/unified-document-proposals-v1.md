# Caricamento unico: proposte documento, oggetti e spese — 17 ottobre 2026

## Ambito approvato

Primo incremento: fattura d’acquisto e due bollette in file distinti. Un solo caricamento acquisisce gli originali; la classificazione locale resta gratuita. L’utente seleziona i documenti da leggere e autorizza nell’app il loro invio ad Anthropic. Una sola risposta per originale propone prodotti/acquisto oppure bollette della casa. Nessun secondo provider o budget economico.

La campagna onboarding-home-pilot-20261017 conserva il tetto complessivo di 5 USD e 40 analisi, scope account/casa e riserva massima di 0,25 USD per documento; i risultati già disponibili non vengono rianalizzati dal pulsante del lotto. Non cambia il consenso già previsto prima dell’invio. Non si rinnovano quote o riserve incerte.

## Percorso

1. Carica uno o più file con il comando esistente; aggiunte successive restano nello stesso lotto.
2. «Oggetti e spese dai documenti» mostra file, disponibilità della proposta e budget. Selezione esplicita e un consenso per i soli file elencati/selezionati; nessun invio all’apertura della pagina. In coda, lettura e proposta pronta sono distinti.
3. «Rivedi proposta» apre il documento scelto. Non esiste più un pannello privilegiato aperto automaticamente sul primo file. «Solo archiviazione del documento» permette di classificare senza AI.
4. Fattura: percorso esistente, con oggetto nuovo/esistente/escluso e acquisto proposto se verificabile. Importo multiarticolo non distribuito automaticamente.
5. Bolletta: titolo, fornitore, fornitura, data e totale proposti, modificabili; nessun oggetto o lavoro. Un totale corrente univoco è preselezionato. Arretrati o più totali richiedono scelta esplicita. L’utente può collegare una spesa già esistente, rinviare o non registrare la spesa.
6. La conferma finale registra la spesa canonica e il suo originale. Nessuna scrittura dalla sola analisi. Organizzazione documento e conferma finanziaria sono due operazioni recuperabili: se la seconda fallisce, il documento può risultare già archiviato. Non si promette atomicità globale del lotto.

## Contratto additivo

L’output onboarding ammette documentKind=utility_bill, items=[], purchaseTotal=null e houseExpenses[]. Ogni spesa ha ID/fingerprint stabili, proposedFields con fonti dell’originale e amountCandidates separati per totale corrente, saldo da pagare, arretrati, imponibile, imposte e righe. Le osservazioni visuali restano dichiarate come tali; non sono OCR verificato.

POST drafts/:id/confirmations accetta, oltre alle choices legacy, houseExpenses:[{itemId,action,values,amountSelection,...}]. Azioni create/link_existing/skip/defer; create vieta objectRef e workId non null. Le conferme condividono controllo versione/SHA, lock della casa e ricevuta idempotente. Il recupero mantiene il corpo originale della richiesta, senza trasformare i campi economici normalizzati in un nuovo payload.

Le spese usano ExpensesService, storia e ricevute canoniche; provenienza importo e fonti aggiornano anche i relativi snapshot. Stesso originale già contabilizzato blocca una nuova spesa; stesso importo/data o fornitore/numero richiedono verifica esplicita. Le copie esatte possono riusare la spesa conservando il documento canonico. Nessun collegamento a oggetti per le bollette.

## Limiti dichiarati

Primo collaudo su fattura e due file bolletta distinti. PDF che mescolano acquisti di beni e bollette nello stesso originale non sono coperti; non dividere automaticamente importi o generare falsi oggetti. Più bollette nello stesso PDF richiedono identificativi e pagine distinguibili; i controlli conservativi possono bloccare una seconda spesa priva di numero. Documenti già organizzati dall’utente non vengono riclassificati silenziosamente. Importi/date insufficienti restano da completare o gestire manualmente; un documento non prova il pagamento.

Prezzo sulla scheda oggetto, posizione Ambienti e oggetti e revisione generale della tipografia restano nel feedback successivo. Nessun cloud/email/Agenzie/forecast.
