# Importi ausiliari e ruoli economici — V16

Secondo blocco autonomo, 18 ottobre 2026. Lavoro offline, nessuna chiamata AI o scrittura sui contenuti reali.

## Cause riprodotte

Nove casi sintetici fallivano prima della modifica: quattro voci ausiliarie a zero e arretrati zero venivano scartati con warning; quattro etichette di dettaglio/saldo potevano essere accettate come totale corrente di una bolletta quando il provider attribuiva loro il ruolo sbagliato.

La risposta grezza delle prove personali V13 non è conservata: non è dimostrato che il precedente warning generico degli importi avesse esattamente queste cause. Il lavoro corregge casi riproducibili e verifica la compatibilità degli importi già validati.

## Correzioni

- IVA, imponibile, righe accessorie, altri importi e arretrati possono conservare zero solo se stampato come importo monetario in EUR. Uno zero ausiliario non diventa un totale o una spesa selezionabile.
- Arretrati zero non impongono una scelta del totale; arretrati positivi e saldo da pagare diverso dal costo corrente richiedono ancora revisione. Nessuna somma/ripartizione automatica.
- Ogni importo deve essere associabile alla propria indicazione valutaria. Percentuali, valori negativi, valuta estera e valuta presa da un altro numero della citazione non forniscono prova monetaria.
- Il totale corrente delle bollette richiede un'etichetta da totale corrente. «Subtotale», «Totale IVA», arretrati o «Totale da pagare» non diventano current_document_total. Il saldo mantiene amount_due.
- Importo e ruolo si riferiscono al primo valore monetario della rispettiva etichetta, non a un numero successivo nella citazione. Una scadenza aggiunta dopo «Totale da pagare» non invalida il saldo che la precede.
- I controlli esistenti del totale fattura, dei costi canonici positivi, dei doppioni, delle esclusioni e del replay restano in vigore.
- Prompt document-understanding-v16 chiarisce ruoli, valuta nelle citazioni e zeri ausiliari. Nessun nuovo endpoint o dipendenza; nessuna modifica frontend.

## Verifiche

27 test nuovi, incluso PDF sintetico reale e normalizzazione wire di una fattura con IVA zero; 83 test offline mirati complessivi verdi. 48 test DB/HTTP: 15 automatic intake e 33 onboarding/router HTTP. Il nuovo scenario automatico crea una sola spesa positiva da una proposta con IVA/arretrati zero, senza oggetti né duplicazioni al replay. Build e lint verdi.

Il primo tentativo del nuovo scenario DB incontrava correttamente il guard doppioni, perché condivideva importo/data con la precedente bolletta sintetica. Il fixture è stato reso distinto; il guard non è stato indebolito. Il primo replay della bolletta personale ha rilevato una regressione sul suffisso di scadenza del saldo: aggiunta la copertura sintetica e corretto il riconoscimento dell'importo precedente prima di consolidare.

Replay finanziario in lettura dei due output V13 già validati, contro il testo dei rispettivi originali, senza creare nuove bozze: bolletta 67,97 € current_document_total e 76,97 € amount_due conservati distinti; fattura lavori 1.537,20 € current_document_total conservato. Nessuna reinterpretazione dell'oggetto o completamento manuale dei dati. Ricevuta privata outputs/house-amount-replay-20261018.json, script locale work/house-amount-replay.cjs.

Invarianti finali: 9 documenti, 5 oggetti, 5 spese per 3.012,17 €, un ambiente, nove SHA invariati. Budget 2,416046 USD e 39/40 analisi, invariato. Ricevuta privata outputs/house-amount-v16-invariants-20261018.json. API aggiornata in locale; nessuna modifica env, quote, sicurezza, push o deploy.

## Limiti e seguito

Il nuovo prompt non è collaudato con un invio reale: resta una sola analisi disponibile e non è necessaria per questi test. Citazioni senza valuta attribuibile o etichetta riconoscibile rimangono da rivedere; non si presume la valuta dall'intero documento o da un'altra pagina. I nuovi controlli non riscrivono le vecchie bozze o i dati canonici. Nessun test mobile aggiuntivo perché il frontend non è cambiato.

Blocco 2 concluso offline. Segue il blocco 3: verificare che dati validati e manuali arrivino nella revisione unica e nelle schede, con esclusioni e doppioni. Nessuna domanda per il committente.
