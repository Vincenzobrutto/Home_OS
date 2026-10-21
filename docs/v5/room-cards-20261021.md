# Ambienti: schede coerenti con Oggetti

21 ottobre 2026. Implementazione dell’anteprima desktop/mobile approvata dall’utente.

## Comportamento

- Griglia a due colonne desktop e una mobile; stessi token e CSS di base delle schede Oggetti. L’intera scheda è un collegamento al dettaglio esistente, con focus visibile e descrizione accessibile di tipo, nota, conteggio e stato.
- Nome, icona del tipo disponibile e conteggio degli oggetti personali in evidenza. Nessun oggetto distingue lo zero reale dal conteggio assente. Tipo non ridondante e note già presenti restano consultabili; note lunghe limitate visivamente a due righe, testo completo nel dettaglio. Archiviato resta esplicito.
- Prima gli ambienti con oggetti personali, poi gli altri; ordine alfabetico dentro i gruppi, come prima. Ricerca per nome durante la digitazione. Mostra conserva Attivi/Archiviati/Tutti e aggiunge Con oggetti/Senza oggetti senza un secondo pannello. Stato vuoto con azzeramento che conserva il filtro di archivio.
- Ricerca e filtri nell’URL; il ritorno diretto dal dettaglio li mantiene attraverso stato di navigazione vincolato ad account e casa. Il pulsante Indietro mantiene il comportamento del router.
- Aggiungi ambiente, modulo originale, Da planimetria, dettaglio, modifica, archiviazione/ripristino, storia e visibilità per ruolo conservati. Nessuna modifica a schema, endpoint, mutazioni o analisi AI.

## Dati e limiti

I conteggi usano le facets server già esistenti, limitate agli oggetti personali dell’account; non rappresentano gli oggetti di altri membri. Le facets coprono tutti gli ambienti attivi, anche oltre la prima pagina. Nei casi senza facets (inclusi Archiviati/Tutti) ricerca e riepilogo si riferiscono alle pagine caricate, con indicazione esplicita e Mostra altri ambienti conservato. Con oggetti/Senza oggetti richiedono facets disponibili; caricamento ed errore dei conteggi non vengono trattati come elenco vuoto.

Le facets non includono il tipo o le note: le schede senza metadati stanza già caricati mostrano un’icona generica e nessun tipo inventato. Il dettaglio continua a fornire tutti i metadati. Nessuna lettura per ogni singola scheda né scansione automatica di tutte le pagine introdotta.

## Verifiche

- 26 test simulati: routes/objects.test.tsx e floor-plan/FloorPlanPage.test.tsx; dopo la rifinitura di note e accessibilità, rieseguiti i due casi delle schede/ricerca. Creazione, modifica, archivio/ripristino, viewer, scope personale, ricerca oltre la prima pagina attiva, filtri, note e ritorno verificati senza DB reale.
- TypeScript/build e lint frontend superati. Avviso Vite preesistente sul bundle principale oltre 500 kB.
- Browser con componenti e router di produzione, API simulate in memoria, otto ambienti attivi e uno archiviato: desktop 1440×1000, mobile 390×844 e 320×800. Ricerca, stanze vuote/archiviate, apertura e ritorno dal dettaglio, accesso e annullamento del modulo di creazione. Zero richieste di scrittura dopo l’accesso simulato; nessun invio AI.
- Accesso alla pagina planimetria verificato; il simulatore del catalogo non copre il suo picker documentale, mentre il test dedicato copre l’editor esistente. Nessuna nuova analisi o conferma di ambienti eseguita dal browser.
- App reale consultata in sola lettura: griglia di dieci ambienti e ricerca presenti. Nessuna modifica ai dati personali. Screenshot e harness nel workspace del task, `outputs/ambienti-cards-20261021/`.

Le differenze intenzionali rispetto all’anteprima sono l’ordine già vigente, i tipi canonici disponibili, l’accesso agli archiviati e le note esistenti. Le modifiche legacy locali restano escluse.
