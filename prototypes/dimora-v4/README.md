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
