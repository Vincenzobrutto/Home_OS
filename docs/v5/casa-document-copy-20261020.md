# Casa e Documenti: testi — 20 ottobre 2026

## Comportamento implementato

- Casa: Le tue schede diventa Elettrodomestici, impianti e altri oggetti; Organizza le stanze diventa Le stanze della casa. Proposte da rivedere diventa Documenti da controllare; Verifiche da rivedere diventa Dati da confermare; Apri verifiche diventa Controlla i dati. Destinazioni, significato dei conteggi e privacy restano distinti e invariati.
- Con conteggi caricati senza errori, nessun documento da compilare/controllare/in analisi/in attenzione e nessuna verifica aperta: se anche i completati sono zero, Inizia con un documento, spiegazione e Aggiungi documento. Il collegamento al caricamento è offerto solo con permesso edit. Se esistono completati: Non ci sono attività da completare. Nessuno stato vuoto dedotto da errori o conteggi mancanti.
- Documenti: istruzioni per inserire/precompilare, controllare e salvare. Analisi da controllare descrive l’azione sul relativo esito; Completato esplicita disponibilità del file originale. Documento salvato e Vai ai documenti completati dopo conferma. La ricerca usa Documenti da controllare per la stessa vista review. Da fare/Completati e gli stati brevi Da compilare/Da rivedere/Completato preservati.
- Dettaglio: Titolo scelto da te al posto di Organizzazione personale. Versione del file, versione del titolo/classificazione e impronta SHA-256 in Dettagli tecnici del file, chiuso inizialmente e apribile da tastiera. Nessun dato rimosso. Titolo, tipologia, visibilità e collegamenti restano fuori; spiegazione dell’integrità conservata nel pannello. ZIP descritto con elenco dei file e codici per verificarne l’integrità; limiti e unità di misura non alterati.

## Verifica

Browser reale in sola lettura: Casa, archivio completati con ricerca BOLLETTA e dettaglio esistente; apertura/chiusura dettagli tecnici, metadati ancora accessibili, testi e assenza di overflow nelle viste desktop/mobile 390 e 320 px. Nessuna nuova bozza, modifica di campi, upload, conferma o analisi AI.

Casa vuota e conteggi non vuoti verificati nel browser con componenti reali e risposte API in memoria, senza creare o svuotare case del servizio reale. Distinti anche il caso con documenti completati e il collegamento al caricamento. Evidenze locali in outputs/casa-documenti-copy-20261020 della chat; viewport ripristinato.

Build TypeScript/Vite e lint dei moduli modificati riusciti. 71 scenari su fixture verificati tra suite e riesecuzioni mirate: stato iniziale, conteggi, ricerca e filtri, permessi, dettaglio e download. Il test del pannello controlla chiusura iniziale, apertura/chiusura, SHA visibile solo dopo apertura e nessun POST al cambio di pannello. Alcune aspettative storiche aggiornate: ingresso dal menu dopo primo uso, attesa del redirect alla casa unica, vista archivio completa esplicita, pulsante Aggiungi documenti e stato Da compilare al posto del vecchio stato generico. Nessun comportamento applicativo alterato per assecondare i test.

API, schema e backend invariati. Dati reali e modifiche legacy locali preservati; salvataggio delle bozze rinviato come richiesto.
