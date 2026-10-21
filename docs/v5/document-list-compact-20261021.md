# Elenco Documenti compatto — 21 ottobre 2026

Implementata la successiva rifinitura dell’audit: schede più leggibili desktop/mobile. Nessuna modifica a API, originali, dati, stato dei documenti, permessi o analisi AI.

## Comportamento

- Titolo confermato quando disponibile, tipo e visibilità in evidenza; stato compatto e comando principale invariato (Compila, Riprendi, Vedi dettagli o controllo dell’analisi secondo il flusso esistente). I nomi costituiti solo da hash hanno l’etichetta di presentazione “Documento senza titolo”; nessun nome viene salvato o dedotto automaticamente.
- Nome originale, formato, dimensione e caricamento sotto **Dettagli del file**, chiusi inizialmente. Nessuna richiesta aggiuntiva per espanderli. I nomi originali restano disponibili e invariati; tipi non classificati descritti come “Tipo non indicato”.
- **Altre azioni** raccoglie Vedi/Chiudi originale e, con gli stessi permessi di prima, Elimina. Il menu si chiude con Esc e riporta il focus al comando. Nessuna rimozione viene avviata aprendo il menu; la finestra e i controlli server esistenti sono conservati. L’apertura dell’originale resta una lettura esplicita.
- Ricerca nell’intero archivio, filtri, paginazione, selezioni AI/ZIP e limiti di idoneità invariati. Le etichette delle caselle usano il titolo leggibile. Ritorno dal dettaglio con pagine, focus, posizione e pannelli dei metadati già aperti conservati nello stato di vista separato per account/casa e filtri.
- Su desktop azioni/stato affiancati al titolo; su mobile flusso verticale compatto, con controlli di almeno 44 px e nomi lunghi a capo.

## Verifiche

72 test mirati in cinque file: archivio, ricerca, workflow, azioni di compilazione e presentazione. Aggiornate le aspettative intenzionalmente cambiate: metadati separati anziché testo unico e nome leggibile della selezione AI. Inclusi paginazione, ritorno dal dettaglio/Indietro, permessi ed esclusione dei completati/AI riuscite. I 27 test dell’archivio rieseguiti dopo il controllo Esc; nuova prova su metadati richiudibili conservati, focus e originale senza scritture. Nessun DB reale.

Build con TypeScript e lint frontend superati. Resta l’avviso Vite preesistente sul bundle principale oltre 500 kB.

Browser con router/componenti di produzione e dati fittizi isolati: desktop 1440×1000 e mobile 390×844/320×740; titolo confermato, hash, nome lungo, tipo, visibilità, azioni e metadati verificati. Ricerca “Planimetria” e filtro Completati conservati dal dettaglio. Pannelli già aperti ripristinati; originale e menu Esc provati. Nessun overflow a 320 px, anche con metadati lunghi (contenuto 305 px). Zero scritture nella consultazione del simulatore, nessun invio AI.

App reale usata in sola lettura per consultare Completati, con cinque schede e cinque pannelli file. Dati reali e modifiche legacy intatti. Screenshot nella chat in `outputs/document-list-20261021/`; simulatore chiuso e viewport ripristinato.

Restano fuori ambito i filtri stanza e i testi Ambienti, e il collaudo UX di Attività/Rubrica con molti elementi fittizi.
