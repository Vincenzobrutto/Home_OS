# Rubrica compatta desktop e mobile — 21 ottobre 2026

## Implementato

Elenco unico a righe, nome/mestiere, recapiti e azioni Chiama/Email disponibili soltanto quando il dato esiste. Nome e freccia aprono il dettaglio esistente; le azioni non avviano chiamate/email automaticamente. Ricerca nome/mestiere durante la digitazione con attesa di 300 ms, Invio immediato e azzeramento. Un solo filtro Attivi/Archiviati/Tutti, senza controlli duplicati.

Mostra altri contatti aggiunge pagine server e conserva le righe precedenti. Gli ID ripetuti fra pagine sono deduplicati; caricamento successivo fallito mostra errore/riprova senza nascondere le righe disponibili. Stati vuoti distinti per primo uso, archiviati e ricerca senza risultati.

Dal dettaglio o con Indietro: ricerca, filtro, pagine caricate, posizione e focus del contatto vengono recuperati dalla cache privata in memoria, vincolata ad account/casa. In caso di pagine espulse dalla cache si ricaricano prima di ripristinare posizione. Nessuna nuova persistenza su disco o stringa di ricerca aggiunta all’URL. Logout/sessione scaduta riusano la pulizia della cache privata. Il componente è ricreato al cambio account/casa. La provenienza esterna della Rubrica, già implementata, resta distinta dalla posizione nell’elenco.

Desktop: righe compatte in colonne e superficie unica con separatori. Mobile: nome, mestiere e telefono sopra Chiama/Email, freccia per dettaglio e barra inferiore mantenuta. Pulsanti principali e freccia di dettaglio di almeno 44 px; testo e nomi lunghi possono andare a capo.

## Confini

API, backend, schema e ordinamento server invariati: non si riordinano localmente le sole pagine caricate. I conteggi dei collegamenti illustrati nei mock non sono esposti dall’API attuale e non vengono inventati: i collegamenti restano nel dettaglio autorizzato. Niente dati dimostrativi nell’app reale. Form di creazione/modifica, archiviazione/ripristino e collegamenti conservano i comportamenti esistenti: questo intervento realizza l’elenco approvato, non introduce nuove conferme/annullamenti delle mutazioni. Bozze rinviate.

## Verifica

15 test mirati superati complessivamente su catalogo, contatti, contesto di ritorno e AppShell (catalogo rieseguito dopo correzione dell’aspettativa sul titolo del banner e aggiunta del caso 403). Copertura: ricerca automatica, pagine aggiunte, ricerca/filtro/posizione/focus dopo dettaglio e Indietro, errore pagina/riprova senza sostituzione, accesso revocato durante paginazione senza mostrare dati in cache, recapiti assenti, creazione/modifica/archiviazione/ripristino su API simulate, idempotenza e ritorno alla risorsa originaria.

Browser: stato vuoto reale desktop/mobile, nessuna modifica. Con app/router reali e API in memoria: elenco popolato a 1440×1024 e 390×844/320×740, caricamento pagina successiva, dettaglio, ritorno con y=257 e focus su Tecnica Nord, ricerca Idraulico mantenuta con Indietro su mobile, filtro Archiviati, controlli e fondo elenco senza overflow nelle viste provate. Pulsanti tel/mailto verificati come link senza attivare app esterne. Contatti fittizi confinati al test/harness; nessuna chiamata AI, salvataggio, creazione o modifica reale.

Confronto affiancato con le due immagini approvate, con dettagli delle righe. Ridotti gli spazi inizialmente troppo ampi, specialmente su mobile. Font/token/shell reali preservati; differenze accettate: nessun badge demo in produzione, nessun conteggio stimato, numero righe dipendente da paginazione/scorrimento. Evidenze locali della chat: outputs/rubrica-implementation-20261021, incluso design-qa.md.

Build TypeScript/Vite e lint mirati superati; warning Vite preesistente sul bundle principale di circa 503 kB. Nessuna certificazione screen reader o prova su telefono fisico. Legacy locale preservato.
