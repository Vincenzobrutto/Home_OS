# Scelta delle aree proposte — 31 ottobre 2026

## Risultato
Lo scarto della singola candidata è disponibile prima dell'adozione: checkbox Scarta, confronto tratteggiato grigio, nuova conferma richiesta dopo ogni cambio. Solo ID di nuove candidate firmate, mai vani canonici. Il server conserva proposta originale, selezione accettata, motivo e replay idempotente. Tutte le candidate sono inizialmente incluse; nessuna cancellazione automatica. Non è una funzione di eliminazione generica dei vani già adottati.

## Segnalazione prudenziale
Pipeline raster-seeds-v10-candidate-choice: componente molto allungata (perimetro²/area >=100) e larghezza idraulica <=20% della mediana dei vani room/kitchen noti (almeno due) riceve shapeHint wall_band. È un indizio relativo, invariante alla scala, non una classificazione certa. L'agente può mantenere anche un passaggio stretto. La diagnostica è disponibile alla revisione AI esistente, senza nuove fasi.

## Prove su immagini già note
Replay delle risposte AI salvate, nessun nuovo invio o ritocco dei contorni. PDF: 10 canonici invariati, proposta12, corridoio ovest conservato, area sottile presso la porta segnalata. Foto inclinata A: 8 canonici invariati, proposta11, fascia unassigned-259 segnalata; due altre candidate in conflitto restano verifiche. Foto chiara B: proposta di contrasto9, nessuna candidata di copertura; ingresso ancora unito a stanza adiacente. Zero sovrapposizioni in tutti i risultati. Sono casi di sviluppo già noti, non corpus indipendente o prova di completezza. Dati e immagini private fuori Git in work/candidate-choice-replay e work/candidate-choice-pdf.

## Verifica
Backend ordinario658/658; UI60/60; typecheck e lint mirati verdi. Test dedicati su scelta parziale/totale, ID sconosciuti/canonici/duplicati, firma originale, replay, invalidazione confronto e visualizzazione tratteggiata. Build verde. Cluster isolato finale ECINDe:20/20 DB-HTTP-worker, arrestato. Prima esecuzione19/20 per un difetto del test di concorrenza preesistente: replay verificato ora sulla richiesta realmente vincente, mantenendo gli assert CAS. Nessun nuovo collaudo browser live in questa sessione.

## Limiti e seguito
La geometria non migliora automaticamente: migliora la segnalazione delle fasce sospette e il controllo umano. Rimangono copertura sulle proposte di contrasto e separazione semantica di ambienti comunicanti. Nessuna modifica della demo Alessio, nessun deploy/main/merge e costo AI aggiuntivo zero.
