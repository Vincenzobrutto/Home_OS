# Documenti: tre viste e tipologie — 21 ottobre 2026

Ingresso, posizione dei filtri e testata mobile aggiornati nel [primo intervento dell’audit](document-archive-entry-20261021.md); restano valide le regole di appartenenza e le API descritte qui.

## Comportamento attuale

Solo la pagina Documenti: Tutti i documenti, Documenti della casa, Documenti di oggetti e impianti. Un solo archivio e gli stessi ID/originali. Le altre pagine, il catalogo Oggetti, le schede e il menu sono invariati. L’ingresso esistente da Casa (`collection=house`) viene interpretato dalla pagina come nuova vista Casa.

La vista Casa raggruppa in Planimetrie, Pratiche edilizie e catastali, APE e certificazioni energetiche, Contratti, Altri documenti della casa. Si apre una tipologia alla volta, con paginazione server dedicata; gli altri gruppi restano raggiungibili. Conteggi calcolati prima del LIMIT sull’intero archivio autorizzato, con ricerca/stato/formato/visibilità correnti. Non sono il numero di righe già caricate.

Ricerca globale conservata: iniziando una nuova ricerca si passa a Tutti i documenti e stato Tutti; modificando una ricerca esistente si mantengono i filtri espliciti. Viste, gruppo, ricerca e stato sono nell’URL. Ritorno dal dettaglio conserva pagine caricate, focus, apertura dei dettagli file e posizione. Compilazione, caricamento, selezione AI ed esportazione delle righe restano disponibili.

## Regole di appartenenza

- Tutti: tutti e soli i documenti leggibili nella casa, compresi quelli ancora da organizzare.
- Degli oggetti: riferimento personale leggibile tramite collegamento documento attivo, documento di spesa attiva attribuita a un oggetto/caldaia, o fonte corrente di analisi riuscita della caldaia. Stessa policy delle fonti del catalogo; nessun nome privato di un altro account usato per classificare.
- Della casa: organizzazione personale confermata, riferita alla versione/SHA correnti, senza uno dei riferimenti precedenti. Non basta l’assenza di un oggetto per classificare un originale non organizzato.
- Gruppi esclusivi: prima planimetria, poi edilizia, energia, contratti, altri. Un PDF con più tipi compare una volta nella vista. I documenti tecnici già riferiti all’impianto restano nella vista degli oggetti.

Sono proiezioni di lettura, non spostamenti o nuove copie. Nessuna riclassificazione, nuova analisi AI o scrittura dei dati personali. Nessuna modifica al credito o ai consensi AI.

## Contratto e persistenza

`document-search-v1` aggiunge capability `documentViews:true`, filtri opt-in `view` e `group`, risposta `summary`; vedi [contratto API](api-contract.md). Senza `view`, comportamento/cursori precedenti conservati. Cursor nuovo vincolato anche a vista/gruppo.

Migrazione `20261021160000_document_contract_collection`: allinea il solo CHECK delle raccolte a `contracts`, tipo già accettato dal dominio. Nessuna riga, fonte o file riscritto. Necessaria perché il vincolo originale non consentiva il salvataggio dei contratti.

## Verifiche

- Backend: build/lint; 4 test dominio ricerca, 9 scenari ricerca PostgreSQL e 5 nuove verifiche viste con fixture isolate. Categorie oltre prima pagina, duplicazioni, privacy owner, organizzazione obsoleta, collegamenti documento/costo, rimozione link e revoca membership.
- Frontend: 53 test mirati su ricerca, client, viste, gruppi, categorie e URL; build/lint. Solo mock e fixture nei test frontend, nessuna chiamata AI.
- Browser reale sull’app con API separata: 33 PDF sintetici in nuovo account/casa; desktop 1440×1000, mobile 390×844 e 320×740. Ingresso da Casa, cinque gruppi, 25 planimetrie su due pagine, Contratti, documenti degli oggetti, ricerca globale, filtri mobile, apertura originale e ritorno con pagine/focus/posizione. Nessuno scorrimento orizzontale.
- Evidenze locali fuori Git: `outputs/document-views-implementation-20261021/desktop.png` e `mobile.png` nella workspace della conversazione. Nessun file personale incluso.

## Limiti intenzionali

Le viste non riparano metadati o riferimenti mancanti e non interpretano di nuovo gli originali. I file senza organizzazione corrente restano in Tutti; completandoli o collegandoli con i flussi esistenti cambia la proiezione. La vista degli oggetti mantiene l’elenco documentale esistente, senza ridisegnare Oggetti e impianti.
