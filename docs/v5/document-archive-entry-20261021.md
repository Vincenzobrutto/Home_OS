# Documenti: ingresso e ricerca semplificati — 21 ottobre 2026

## Comportamento

Solo pagina Documenti e suo contesto di ritorno: ingresso senza parametri su tutto l’archivio e tutti gli stati. Le tre viste restano la scelta principale. I collegamenti espliciti `workflow=pending|to_compile|review|completed` continuano a funzionare.

Stato spostato nel pannello Filtri: Tutti gli stati, Da completare, Da compilare, Da controllare, Completati. Scelte applicate insieme agli altri filtri soltanto con Mostra risultati; Annulla/Escape non le applicano. Stato attivo visibile come filtro rimovibile e incluso nel conteggio Filtri. Rimuovi filtri conserva ricerca e vista, ripristinando stato/formato/visibilità/tipologia.

Quando ci sono documenti pendenti e non si sta cercando o filtrando per stato, compare il loro conteggio personale nell’intero archivio, con Apri. Usa il GET workflow-summary esistente, senza nuova API o scritture; conteggio zero o non disponibile non mostra avvisi. Apri seleziona esplicitamente tutto l’archivio con stato pending.

Ricerca globale conservata: una nuova ricerca rimuove le restrizioni; modificando una ricerca esistente si conservano i filtri espliciti. Indicazione del contesto nei risultati e terminologia delle tipologie allineata ai gruppi. Il ripristino automatico della vista alla cancellazione della ricerca resta da discutere, non è incluso.

Mobile: intestazione senza descrizioni ripetute, pulsante Aggiungi compatto, etichetta Oggetti e impianti completa, tre viste e riga Ricerca/Filtri. Solo la riga ricerca rimane sticky durante lo scorrimento, anche desktop. Filtri applicati e avviso pendenti scorrono con il contenuto, evitando una testata fissa ingombrante. Gruppi e documenti invariati; tolto il titolo Risultati per… quando ripete soltanto vista/gruppo senza ricerca o filtri secondari.

Stati vuoti distinguono assenza di documenti della tipologia e assenza di risultati filtrati. Nella vista Casa vuota si può mostrare tutto l’archivio senza modificare classificazioni. Vedi dettagli ora costruisce il ritorno con stato predefinito all anche quando l’URL di ingresso non contiene workflow. Ritorno con ricerca, stato e focus conservato.

## Verifiche

72 test frontend mirati su ricerca, filtri, documenti, stati, selezione AI e ritorno; build e lint. Fixture simulate per casi pendenti/non pendenti e annullamento dei filtri; nessuna analisi AI live.

Browser nell’app principale in sola lettura: desktop 1440×1000, mobile 390×844 e 320×740. Archivio completo di 15 documenti visibile all’ingresso; applicazione/rimozione dello stato, pannello mobile, Escape e focus, ricerca globale e ritorno dal dettaglio. Ricerca raggiungibile dopo oltre 1.500 px di scorrimento, input a circa 9 px dal bordo superiore; primo gruppo a circa 304 px a 390 px di larghezza, contro circa 572 px dell’audit precedente. Nessun overflow orizzontale. Evidenze locali fuori Git in `outputs/documents-simple-entry-20261021/` della workspace della conversazione.

Nessuna modifica a originali, classificazioni, collegamenti, oggetti, spese, budget o consensi. Nessun cambio backend/schema, né riavvio API necessario. Sezioni esterne a Documenti e legacy locale preservati.

## Resta fuori dal primo intervento

Riferimento dell’oggetto nelle righe e relativo raggruppamento; titoli derivati delle fatture; correzione dei tipi/collegamenti salvati; ritorno automatico alla vista precedente dopo ricerca; comportamento dei gruppi da tastiera; restrizione degli esempi all’ambiente di prova. Sono osservazioni/proposte dell’audit, non funzionalità dichiarate implementate.
