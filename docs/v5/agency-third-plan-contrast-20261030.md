# Terza planimetria: prova indipendente e tratti chiari — 30 ottobre 2026

## Esito reale, senza nascondere il primo fallimento
Nuova immagine fornita dall'utente con autorizzazione aggiuntiva2EUR, tetto complessivo6,50EUR. Originale intero, nessun suggerimento su numero/posizione dei vani, nessun ricalco o coordinata corretta manualmente. Due generazioni reali inventario/revisione con il provider esistente; censiti10spazi non esclusi e2spazi esclusi. Il profilo precedente con soglia180 non chiudeva alcun vano:0regioni, semi tutti nello stesso grande componente. Quindi il test iniziale non era superato.

Le risposte sono state conservate; nessun nuovo invio per correggere il risultato. Una regola ottica calcolata sui pixel e sui seed già proposti recupera9contorni, compresi2balconi e2bagni. Ingresso e vano adiacente rimangono una componente condivisa con conflitto semantico; un'apertura proposta dall'AI resta da verificare. Zerooverlap, nessun seed delle scale/porzione estranea incluso, originale byte-identico allo SHA registrato. Non è un numero atteso suggerito al modello.

Immagine privata negli output della chat Dimora-nuova-planimetria/planimetria-riconosciuta.png: verde interni, blu balconi. Piccole cavità dovute alle scritte sono ancora conservate, non eliminate indiscriminatamente come se ogni vuoto fosse testo: ripulitura e validazione degli interni ancora aperte. Nessuna metratura dalla scala nominale1:100.

## Regola aggiunta al software
Pipelinev8: soltanto quando non ci sono regioni valide, propone una soglia ottica da ROI dei seed non esclusi con margine8%della diagonale. Istogramma dei pixel non bianchi fino245, almeno100campioni e3spazi; percentile90+4, incremento significativo almeno15, massimo245. Nessuna ricerca del parametro che massimizza il numero di vani. In questa foto35370campioni, soglia candidata245. Originale e profilo richiesto180 rimangono intatti.

La nuova segmentazione deve produrre regioni valide senza inglobare alcun seed dichiarato escluso. In caso contrario nessuna proposta. Il risultato viene confezionato come surfaceProposal pending, legata a fingerprint e geometria base, con metadato contrast incluso nel digest canonico e verifica contrast_requires_review. Le aperture ancora incerte non vengono nascoste. Il pacchetto si adotta con lo stesso comando atomico già integrato, mai tramite cambio automatico dei vani canonici. La UI descrive i tratti chiari e richiede confronto con l'originale.

Replay locale della pipeline aggiornata con le risposte cached: base0regioni e proposta9, stesso contorno dell'immagine consegnata. Nessun nuovo punto/seed/poligono passato al motore. L'AI aveva individuato i vani, il problema principale era ottico; la calibrazione del contrasto non risolve da sola la separazione semantica degli ambienti comunicanti.

## Costi e guardie
Due generazioni e due conteggi preventivi, cap totale0,25USD, massimo0,125per fase, nessun retry. Ricevute effettive0,041194USD. Aggregato ricevute0,664144USD. Bound prudenziale5,1235EUR entro6,50 con fattore2,5 conservato; non è un cambio valutario, tutte le riserve/cap storici restano intatti. Ledger originale immutato, journal nuovo separato e indice aggiornato. Originale, identificativi, coordinate, risposte e ricevute dettagliate restano privati fuori Git. Nessun nuovo servizio o invio dopo le due generazioni.

## Verifiche e limiti
Backend finale643/643, inclusi quattro nuovi casi per tratti chiari, proposta separata/adozione, seed comune escluso e apertura irrisolta preservata. UI Agenzie44/44in5file, typecheck/build e lint mirati verdi. Nessun nuovo collaudo DB/browser della specifica variante ottica; la persistenza JSONB e l'adozione generale restano quelle del precedente report integrazione, ulteriormente coperte dal test di adozione ottica puro. Trial browser sintetico precedente non aggiornato o riavviato in questo turno. Nessun deploy/merge/main o modifica demo Alessio.

Questo è un campione nuovo che ha evidenziato un difetto e sul quale è stata sviluppata la nuova regola: non usarlo come misura indipendente dell'accuratezza della versionev8. Servono ulteriori documenti senza adattamenti preventivi, soprattutto sfondi rumorosi, pareti pallide, porte aperte e testo interno. La soglia può oscurare dettagli deboli e non deve essere confermata senza verifica. Restano ingresso/vano comunicanti, apertura incerta e microvuoti delle scritte. Il recupero rimane una proposta non certificata.
