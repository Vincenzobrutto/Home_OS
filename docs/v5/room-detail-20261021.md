# Dettaglio Ambiente compatto

21 ottobre 2026. Implementata la proposta desktop/mobile approvata dopo l’anteprima.

## Comportamento

- Testata coerente con Oggetti: icona del tipo, nome, Ambiente condiviso e Modifica in alto. Archivia nel menu Altre azioni, con chiusura esterna/Esc e ripristino del focus; conferma esistente conservata. Per gli archiviati restano stato esplicito e Ripristina diretto. Stessi permessi di prima.
- Nota leggibile sotto la testata, se presente. Dettagli e storia in due righe richiudibili uniformi. Tipo, visibilità e storia completa restano disponibili. Il modulo originale di modifica, con nome/tipo/nota e gestione errori/versioni, rimane inline subito sotto la testata; non è sostituito dal dialogo dimostrativo dell’anteprima. Durante la modifica le azioni di testata sono disabilitate.
- I tuoi oggetti con totale server quando disponibile; altrimenti numero caricato dichiarato, senza dedurre il totale dalla prima pagina. Zero visibile solo da dati disponibili; errori/403 non mostrano oggetti o conteggi precedenti non autorizzati.
- Schede CatalogTile condivise con Oggetti, due colonne desktop e una mobile: nome, marca/modello o tipo, garanzia/prossima attività quando disponibili, apertura sull’intera scheda. Il nome della stanza corrente non viene ripetuto, ma le altre collocazioni rimangono esplicite con Anche in. L’opzione contestuale non cambia il catalogo generale.
- Ritorno oggetto → ambiente preservato. Mostra altri conserva il punto di lettura e assegna il focus al primo elemento aggiunto; annuncio accessibile e recupero della pagina fallita. Stato vuoto con accesso a Oggetti e impianti.
- Nessuna modifica a API, schema, AI, autorizzazioni o mutazioni. Nessuna nuova ricerca interna o tab introdotta.

## Verifiche

30 casi mirati superati: 25 precedenti in routes/objects.test.tsx, nuovo caso dettaglio con 22 oggetti/paginazione/altre stanze/esclusione dati altrui/menu/Esc/annullamento, quattro in objects/CatalogTile.test.tsx. Dopo l’ultima rifinitura del focus rieseguiti i due casi di dettaglio e modifica/archivio. Coperti anche salvataggio solo campi cambiati, no-op, storia, viewer e ritorni contestuali. Tutti con API simulate, senza DB reale.

Build con TypeScript e lint frontend superati. Avviso Vite preesistente sul bundle principale oltre 500 kB.

Browser con componenti di produzione e API in memoria: desktop 1440×1000 e mobile 390×844/320×800. Verificati dettaglio popolato con sei oggetti, menu e annullamento archiviazione, modulo originale aperto/annullato, oggetto e ritorno, dettagli/storia, ambiente vuoto e archiviato. Nessun overflow orizzontale nelle larghezze provate. Zero richieste di scrittura nel browser dopo l’accesso simulato.

App reale consultata soltanto in lettura per confermare il dettaglio aggiornato. Nessun dato personale modificato e nessun invio AI. Screenshot, confronto con l’anteprima e harness: `outputs/room-detail-20261021/` nel workspace della chat. Confronto con contenuti fittizi differenti, non misura di fedeltà pixel per pixel o benchmark API. Nessuna certificazione di accessibilità.
