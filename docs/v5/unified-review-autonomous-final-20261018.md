# Revisione unica e chiusura prove autonome — 18 ottobre 2026

## Esito

I tre blocchi concordati sono completati offline. Le modifiche sono locali sul branch dev/dimora-v5-local-20261013; nessun push o deploy.

1. Conformità elettrica: classificazione e archiviazione a livello casa, originale consultabile, eventuale emittente come metadato. Nessun nuovo oggetto o spesa dalla sola conformità, nessun dettaglio tecnico richiesto. Compatibilità delle vecchie bozze; schede esistenti conservate. Commit 5aa68ad, report conformity-document-only-20261018.md.
2. Fatture e bollette: importi ausiliari zero conservati se provati in EUR; IVA, subtotali e arretrati non diventano il costo corrente. Saldo diverso e arretrati positivi richiedono revisione. Bollette senza oggetto; totale lavori mai ripartito arbitrariamente. Commit b2f71ee, report house-amount-evidence-v16-20261018.md.
3. Revisione unica: verificata la catena PDF sintetico → risposta strutturata → validazione → proiezione API → campi precompilati → conferma unica → profilo, spesa e originale collegati. Nome, marca, modello, riferimento, prezzo e data conservati. Conferma ripetuta non duplica; articoli esclusi non generano schede o costi. Inserimento manuale di prezzo/data già disponibile e coperto dai test.

## Correzioni emerse nel terzo blocco

- La proiezione API ricalcolava amountSelectionRequired considerando anche arretrati zero: il test DB riproduceva true anziché false. Allineata alla validazione economica: solo arretrati positivi impongono scelta.
- Un avviso opzionale sulla consegna disattivava la proposta di spesa anche con prezzo/data verificati. Il dominio ora espone purchaseExpenseReady, calcolato localmente solo se l'incertezza proviene esclusivamente da consegna/garanzia omesse e il provider non ha richiesto revisione generale. La UI conserva le altre condizioni: acquisto, singola unità, totale positivo, data presente e prezzo proprio quando ci sono più articoli. Verifica doppioni prima della proposta, una conferma umana finale. Il flag non autorizza il percorso automatico e non modifica le sue policy conservative.
- Incertezza generale/provider, quantità o prezzo non verificati non sono ignorati. Bozze storiche senza il nuovo flag mantengono il comportamento precedente; nessuna riscrittura delle bozze o dei dati personali.

## Prove finali del terzo blocco

- 89 test backend offline distinti: dominio, provider wire/parser e prove economiche. Una vecchia asserzione sulle chiavi JSON aggiornata per il campo additivo; nessun dato inventato per far passare la prova.
- 44 test DB sintetico distinti: 29 onboarding e 15 automatic intake, compresi esclusioni, doppioni, replay e proposta zero-arretrati. Nuovo test completo con macchina Boreale TestP17, 127,43 EUR, 18/04/2026, fonte PDF sintetica. Corretto il solo harness che trattava spentOn stringa come Date.
- 48 test frontend: pagina onboarding e prezzo nella scheda oggetto. Tre nuovi casi: campi completi/costo proposto con avviso consegna; quantità incerta; incertezza generale. Questi ultimi non propongono automaticamente il costo.
- Build/lint backend e frontend, typecheck frontend verdi.
- Browser reale in sola lettura: fattura caffè, marca/modello/data e prezzo 499 EUR visibili, possibile doppione stessa ricevuta segnalato. Desktop e mobile 390/320 verificati senza overflow orizzontale; nessuna conferma o modifica personale. Le prove browser usano una bozza precedente, non simulano una nuova estrazione V16. Screenshot privato in outputs/unified-review-final-mobile-20261018.png.

## Dati, budget e limiti

Invarianti verificati: 9 documenti, 5 oggetti, 5 spese per 3012,17 EUR, 1 ambiente; nove SHA originali invariati. Nessuna nuova analisi Anthropic in questi tre incrementi: residuo 2.416046 USD, 39/40 analisi utilizzate. Resta una sola analisi disponibile, entro la riserva massima già autorizzata di 0,25 USD.

V15/V16 e il nuovo flag sono collaudati offline; non si dichiara un nuovo successo del provider reale né completezza garantita su qualunque scansione. Replay in lettura degli output originali V13 conferma 67,97 EUR corrente/76,97 EUR saldo bolletta e 1537,20 EUR lavori. Restano la misura della completezza su nuovi documenti e il futuro collegamento dell'installatore alla mini rubrica. Nessuna domanda necessaria al rientro.

API locale aggiornata su 3001, frontend e accesso LAN conservati. Piano/stato aggiornati; automazione posta PAUSED a chiusura, senza archiviare la chat. Dirty estraneo preservato.
