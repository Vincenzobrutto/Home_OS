# Seconda planimetria — benchmark automatico, 30 ottobre 2026

## Esito: non supera la prova

Seconda immagine fornita dal committente per verificare il procedimento su un documento diverso: scansione datata, pianta obliqua, tratti discontinui e pertinenza disegnata separatamente. Stessi prompt aggiornati e algoritmo del software, senza indicare all'AI il numero di vani, seed o geometrie attese. Nessuna correzione manuale dei risultati.

Prova isolata privata, distinta dal trial web e senza scritture al suo DB: non è un collaudo di upload JPEG/navigation/API. Contesto applicativo locale dichiaratamente sintetico per l'accesso alla pipeline, file reale autorizzato e controllo SHA prima di ogni richiesta esterna. JPEG decodificato a grigio nelle dimensioni native807x1280: nessun deskew, soglia adattata o ricostruzione manuale. Il ritaglio del grafico negli output serve soltanto alla presentazione, non all'analisi.

Due generazioni, inventory e review, più due count_tokens, nessun retry. Segmentazione identica al prodotto: threshold180, closingRadius3, minRegionPixels1500, maxRegionFraction0.6, simplifyPixels1, fillTextHolesUpToPixels0. Il riferimento180dpi nel nome della configurazione non rappresenta una risoluzione metrica accertata della foto.

## Risultati osservati

-11elementi censiti dall'AI, due esclusi: scala/ascensore comuni e cantina separata.9spazi non esclusi;5contorni prodotti. Non è una recall5/9 rispetto a un gold umano completo: il denominatore è il censimento AI, a sua volta incompleto/errato.
- Corridoio centrale riconosciuto semanticamente, ma contorno non risolto. Anche vano ovest e zona servizi irrisolti. Piccolo passaggio associato alla stessa maschera del vano sud, conflitto di tipo segnalato. Quattro issue finali, stesso numero di regioni prima e dopo review.
- Cantina esclusa erroneamente come area separata/comune; balcone non censito. Occorre distinguere pertinenza separata da porzione estranea, con associazione da verificare e senza inventare titolarità.
- Controllo geometrico aggiuntivo dopo il risultato: una coppia di poligoni proposta risulta sovrapposta. Il controllo esistente delle maschere pixel non garantisce che la successiva semplificazione dei contorni preservi la separazione. Non dichiarare questi cinque contorni tutti validi o privi di overlap.
- Scala1:100 stampata, barra metrica non visibile: dimensione fisica/pixel non dimostrata. Nessun calcolo in m2, nessuna stima da altezze manoscritte, formato presunto del foglio o DPI inventati.

L'immagine di confronto negli output privati mostra i contorni effettivi e i seed irrisolti, senza ritocchi. Non utilizzare la bozza come ricostruzione completa o computo commerciale.

## Costi e riservatezza

Ricevute0,011174USD +0,024536USD =0,035710USD; stop end_turn, cache letta/scritta nulla. Budget preventivo0,20USD complessivi,0,10 per fase con conteggio token e massimo8192output tokens prima del dispatch. Somme ricevute storiche aggiornate0,548682USD; bound prudenziale aggregato3,911EUR entro4, mantenendo cap precedenti interi e riserva incerta. Il fattore2,5 è prudenziale, non un cambio valutario. Nessun reset/rilascio prenotazioni o nuovo invio pianificato.

Ledger originale byte-identico, journal supplementare separato e indice aggiornato nella cartella privata. Originale, coordinate, immagini e risposte grezze non in Git. Nessuna modifica demo Alessio, al trial web, account/sessioni/permessi o servizi esistenti.

## Seguito richiesto, ancora non implementato

1. Controllo obbligatorio overlap sui poligoni finali dopo semplificazione, rifiuto delle geometrie invalide prima di persistenza/computo. Test sintetico regressivo per maschere distinte e contorni semplificati che si intersecano.
2. Diagnostica dei seed irrisolti: distinguere componente aperta verso l'esterno, sotto soglia, seed su tratto e topologia. Valutare ripristino locale prudente delle linee prima del flood-fill, non chiusura indiscriminata di tutte le porte. Non attribuire già tutti i fallimenti a una sola causa.
3. Censimento esplicito delle pertinenze anche separate e controllo di copertura del balcone, senza regole legate a questo singolo disegno.
4. Rigiocare offline le risposte registrate per verificare le correzioni deterministiche; eventuale nuova prova AI richiede prima il ledger corrente, nessun retry automatico dei due messaggi conclusi.

Nessun nuovo codice prodotto in questa attività: esito negativo registrato e backlog aggiornato. I test precedenti restano evidenze precedenti, non diventano una prova di qualità generalizzata.
