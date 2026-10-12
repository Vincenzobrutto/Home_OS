# Dimora V4 — Prototipo navigabile

Questa cartella contiene una demo statica autonoma delle esperienze **Partner Agenzie**, **Partner Amministratori** e **Dimora Home unificata**.

## Avvio
Aprire `index.html` in un browser. Non servono Node, backend, database o variabili d'ambiente. La demo include stati locali e dati **esclusivamente fittizi**; al refresh torna allo stato iniziale.

## Cosa si può provare
- Agenzia: pratiche, checklist, ricezione simulata di documenti, AI con conferma, anteprima dossier e Gift.
- Amministratore: documento del fabbricato, impianti/scadenze esemplificativi, selezione di documenti pubblicabili.
- Home: Mio immobile, Parti comuni, selezione dei documenti per il futuro proprietario ed esclusione per default dei dati personali.

## Cosa NON fa
Nessun upload di file reali, nessun login o invito, nessun AI live, nessuna condivisione o trasferimento reale, nessun pagamento, nessuna API, nessuna persistenza. Il selettore di documenti non vale come verifica legale dei diritti o sanificazione di documenti di terzi. Le etichette di readiness non costituiscono certificazione di conformità.

## Confini architetturali
Questo è un **prototipo UX** e non la prima tranche production della V4. Rimane separato dalle app frontend/backend esistenti; l'alpha proprietario non cambia. La successiva eventuale implementazione reale richiede prima test e correzione del modello permessi, distinzione Pratica/Casa/Edificio, audit, conservazione sicura, verifica identità e confronto legale sulla condivisione. Vedi draft PR #6 e `docs/competitive-intelligence` sul ramo research.

## Test con utenti
Durante le interviste mostrare prima le funzioni professionali, poi Gift e Home. Registrare reale preferenza rispetto al software corrente, minuti o passaggi risparmiati, scelta del modello economico (per pratica / gift / canone) e disponibilità ad un ordine specifico. Non presentare schermate come funzioni già pronte alla vendita.


## V4.1 — miglioramenti della demo
- Due pratiche selezionabili dalla vista Agenzia.
- Anteprima di richiesta documentale al venditore, senza inviare messaggi.
- Stato Gift (anteprima pronta / riscattato in simulazione) per mostrare l'effetto post-rogito.
- Dashboard fabbricato con indicatori dimostrativi.
- Manifesto di passaggio preparabile solo dopo una conferma esplicita nella demo; i documenti personali restano esclusi e non viene realmente copiato alcun file.

## Copione demo per colloqui (8–10 minuti)
1. Agenzia (2 minuti): seleziona una pratica e mostra i documenti mancanti. Chiedi quali informazioni vengono già gestite nel CRM.
2. Raccolta e conferma (2 minuti): mostra la richiesta al venditore, simula un documento ricevuto e conferma il campo AI. Chiedi se diminuisce o aumenta il lavoro.
3. Dossier (1 minuto): anteprima del risultato per interlocutori professionali; non dichiarare conformità.
4. Gift → Home (2 minuti): prepara l'anteprima Gift, visualizza il proprietario con i dati della casa, poi prova a selezionare documenti trasferibili. Verifica la distinzione dai documenti personali.
5. Admin (1 minuto): mostra documenti e scadenze delle parti comuni e la selezione dei contenuti autorizzati. Nessuna comunicazione inviata.
6. Domanda economica (2 minuti): «In una pratica reale, per cosa pagheresti: pratica completata, Gift consegnato, canone con Gift inclusi oppure nulla?» Chiedi caso, budget e decisore, non accontentarti dell'interesse espresso.

Limiti: non c'è ancora una relazione persistente e completa tra le due pratiche selezionabili e i dati del proprietario; sono esempi visuali non un database. Non raccogliere documenti di clienti reali in questa demo.
