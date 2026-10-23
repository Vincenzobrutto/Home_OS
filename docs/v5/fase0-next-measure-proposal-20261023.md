# Fase 0 — protocollo proposto per la prossima misura, 23 ottobre 2026

**Preparato offline, non autorizzato e non eseguito.** Non è una ricevuta di consenso e non abilita il runner live. Le campagne v22/v24, i ledger e le loro quote restano storici; il cambio di codice/prompt impedisce di riutilizzarne le autorizzazioni congelate.

## Cosa confrontare

- Conservare i 52 originali e i 52 gold del corpus v3.1, scorer e soglie attuali. Verificare hash contro manifest e ricevute precedenti prima di ogni eventuale misura. Non correggere un gold per accomodare un output.
- Candidato attuale: prompt `document-understanding-v27-literal-headings`, con copertura `invoice-coverage-v1`, segmenti `invoice-page-v1` e controllo `payment-review-v1`. Congelare hash di codice, prompt, piano, prezzi/configurazione e gold solo dopo la revisione e una nuova autorizzazione esplicita. Nessuna ricevuta destinata a una nuova campagna live è stata generata o salvata; le guard usano soltanto fixture di autorizzazione in memoria.
- Il piano locale esistente contiene 120 task: 104 baseline (52 documenti × 2), 8 letture locali selezionate e 8 cicli progressivi. Massimo teorico **148 Messages**, prima di eventuali preflight/metadata: questi ultimi vanno dichiarati separatamente nel consenso. Questa è una stima della struttura, non una prenotazione o una quota disponibile. Budget e limiti richiedono nuova conferma; nessun residuo usato implicitamente.
- Eseguire prima una verifica offline del ledger durevole, dell’esclusione dei reali e del mancato reinvio a esito incerto. Solo dopo nuova autorizzazione valutare il live sui soli hash autorizzati, senza retry incerti e con arresto al primo limite. Nessun accesso a originali reali o email è parte di questo protocollo.

## Evidenze richieste

| Aspetto | Dato da conservare/confrontare |
|---|---|
| Q48 | Pagine totali/inviate/coperte/pendenti per prefisso; due importi, date, numeri e fornitori indipendenti. La sola prima proposta non è file completo. Other/unreadable/continuation restano pendenti. |
| Q15 | Split payment sempre in revisione, anche se il modello omette il saldo o imposta needsReview=false. Nessun aumento degli automatici non sicuri. |
| Q22 | 300 e 500 EUR sulle rispettive righe e data di acquisto stampata; nessuna ripartizione del totale. |
| Q20 | Nome abbreviato letterale, data acquisto distinta da emissione/scadenza/consegna/competenza; visivo sempre da rivedere. |
| Q29/Q30 | Titolo letterale vs tipo ammesso; omissioni, titolo inventato e citazioni errate separati. Nessun costo/quantità/potenza/garanzia presunti. |
| Stabilità | Esiti tra due run e modalità, errori di validazione, misure per campo; mancanti e invalidi restano fallimenti. |
| Privacy e spesa | Solo metadati bounded già approvati, nessuna risposta grezza o documento nel ledger; costi/preflight/Messages/incerti separati e replay dopo riavvio senza invii. |

Il vocabolario dei 91 apparati e la matrice dei 147 tipi sono riferimenti distinti: i loro conteggi non misurano l’accuratezza AI e non ampliano automaticamente i 52 casi o il consenso. L’attuale classificatore locale propone tipo e ambienti; la posizione effettiva resta una scelta esplicita. Valutare in futuro casi sintetici dedicati senza modificare retroattivamente il corpus congelato.

## Criterio di uscita

Applicare le soglie esistenti e registrare tutti i fallimenti, senza ripromuovere l’automatico dai soli test offline. Il gate storico resta **NON SUPERATO** fino a una nuova misura autorizzata sufficiente. Una verifica live non autorizza da sola un pilota su documenti reali, deployment o eliminazione di dati.
