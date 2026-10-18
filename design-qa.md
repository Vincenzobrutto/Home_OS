# Design QA — Documenti, proposta 3

final result: passed

Confronto: terzo risultato Image Gen scelto dal committente (Da fare e Completati) con pagina reale del checkout esistente, non nuovo prototipo. Source 1487x1058; cattura desktop allo stesso viewport, ridimensionamento uniforme affiancato in work/design-comparison.png della chat. Stato Da fare confrontato con stato Da fare; i documenti sintetici disponibili sono tre, non i cinque illustrativi. Screenshot di Completati e mobile390 in outputs della chat. Confronto letto sia completo sia nei dettagli di righe/stati e CTA; mobile verificato separatamente a390 e320.

- Tipografia: font/token del prodotto conservati, nomi lunghi vanno a capo e azioni leggibili; nessun testo generato come immagine.
- Spaziatura: lista unificata con separatori e colonne titolo/stato/azioni; corretti overflow desktop e spazio verticale eccessivo della status area mobile. Nessun overflow orizzontale: clientWidth=scrollWidth ai breakpoint controllati.
- Colori: navy/teal del prodotto, stato con testo/icona oltre alla tinta; proposta ambra e completato verde, nessuna equivalenza fra analizzato e confermato.
- Immagini: nessun asset raster richiesto dal layout; logo e icone esistenti riusati, originali non alterati.
- Contenuto/interazioni: due viste dello stesso archivio filtrate dal server, stato personale corrente, selezione attivabile e annullabile, compilazione manuale/AI accessibile, proposta esistente aperta senza invio, originali e menu distruttivo conservati. Stato vuoto con destinazione Completati, layout responsive con navigazione mobile esistente.

Adattamenti intenzionali al prodotto reale: nessun contatore inventato senza totali server; ricerca/raccolte ancora nel controllo Cerca e filtra, limitata a titoli e nomi file, non ricerca full text promessa dal mock. Menu testuale Altre azioni invece di ellissi e metadati privacy conservati. Il numero e contenuto dei documenti differiscono dal mock perché si usano dati locali veri/sintetici già disponibili; nessuna nuova analisi creata per riempire la schermata.

Nessuna criticità P0/P1/P2 aperta nel perimetro selezionato. Iterazione P3 possibile: totali server per tab e ricerca compatta sempre visibile, senza cambiare i filtri/cursori. Nessun deploy pubblico.
