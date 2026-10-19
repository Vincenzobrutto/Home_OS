# Design QA — Ambienti dalla planimetria

19 ottobre 2026. Target: anteprima approvata `outputs/dimora-v5-completo/ambienti-preview/`, desktop 1440×1024 e mobile 390×844. Implementazione: V5 reale, route ambienti/da-planimetria/:documentId. Confrontate immagini di riferimento e catture implementate nello stesso input visivo; ulteriore verifica ravvicinata di mappa/punto 5/campi e footer mobile.

Composizione conservata: mappa a sinistra, schede numerate a destra, riga attiva chiara e punto evidenziato, controlli zoom/aggiunta, footer con conteggio e conferma. Su mobile alternanza Planimetria/Elenco, dati conservati, controlli sopra le cinque voci inferiori. Nessun overflow orizzontale a 390 px. Dialog nativo con riepilogo prima della scrittura.

Differenze intenzionali: chrome dell’app esistente, Salva bozza, selezione di ambienti già presenti, informazioni di condivisione e segnalazioni AI richiudibili. L’AI reale ha proposto 8 punti, mentre il prototipo conteneva 7 punti preparati manualmente: dati e numeri spaziali non possono essere confrontati come una replica identica dell’estrazione. La numerazione interna mappa/elenco è stata controllata, inclusa scheda 5 con nome iniziale Ambiente 5. Nessuna creazione reale eseguita.

Correzioni durante QA: avviso di duplicato rimosso dalle schede già confermate, selezione esistente mostra l’ambiente effettivo, toolbar mobile più compatta, segnalazioni raccolte in un riepilogo, recupero bozza e scheda selezionata verificati. Salvataggio completo e protezione duplicati provati in casa sintetica isolata, poi rimossa.

Evidenze locali: ambienti-implementation/desktop-real.png, mobile-map-real.png, mobile-list-real.png, synthetic-confirmed.png sotto gli output del mockup. Verifica finale dopo ricarica per distinguere errori transitori HMR da errori riproducibili.

Limiti residui: posizioni e confini proposti dall’AI approssimativi, da rivedere sull’originale. Nessun P0/P1/P2 aperto nell’interfaccia verificata; non è una certificazione dell’estrazione geometrica.

final result: passed
