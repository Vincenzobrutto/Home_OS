# Filtri stanza compatti — 21 ottobre 2026

## Comportamento implementato

- Oggetti: un solo selettore «Stanza», sempre visibile, sostituisce la fila orizzontale di pulsanti e il selettore duplicato nei filtri. «Tutte le stanze», «Senza stanza», gruppo «Con oggetti» prima di «Altre stanze», con ordine alfabetico dentro ciascun gruppo. Tipo e stato restano nel pannello Filtri.
- Conteggi dalle facets del catalogo server, riferiti agli oggetti personali e alla ricerca/tipo/stato correnti, prima del filtro stanza e della paginazione. Nessun conteggio ricavato dalla sola pagina caricata; nessuna richiesta per ciascuna stanza.
- Ambienti: descrizione semplificata, «Le stanze» e Mostra nella stessa barra; righe compatte con il numero dei propri oggetti attivi. Stanze con oggetti prima delle altre, poi nome alfabetico. Tipologia e altri dettagli restano consultabili aprendo la stanza.
- Le facets includono tutte le stanze attive: anche quelle oltre la prima pagina sono raggiungibili subito e ordinate correttamente. Per archiviati/tutti resta la paginazione delle stanze; i conteggi non disponibili non diventano zeri inventati. Se le facets mancano o la loro lettura fallisce, Ambienti conserva l’elenco paginato, senza conteggi; Oggetti conserva il caricamento di altre stanze.
- Parametri URL, ricerca server, Schede/Elenco, filtri, ritorno dal dettaglio e controlli di accesso conservati. Nessuna modifica a API, schema, dati o regole AI.

## Verifiche

- Suite `src/routes/objects.test.tsx`: 24 test superati; nuovo caso con 25 stanze, oggetti personali/altrui, stanza occupata oltre la prima pagina, filtro stanza e senza stanza, ritorno dal dettaglio e zero scritture durante la consultazione. Caso mirato ripetuto dopo la rifinitura del layout.
- FakeObjects allineato al contratto facets già presente nel backend: conteggi prima di collocazione e paginazione, limitati ad account/casa.
- Build TypeScript/Vite e lint frontend. Avviso Vite sui bundle maggiori di 500 kB preesistente; nessun errore bloccante.
- Browser desktop 1440×1000 e mobile 390×844: app reale soltanto in lettura; collaudo separato con 26 stanze e oggetti fittizi, nomi lunghi, stanza vuota oltre pagina 1, Senza stanza, elenco Ambienti, ritorno dal dettaglio. Nessuno scorrimento orizzontale della pagina; select alto 44 px. Contatore delle scritture nel collaudo fermo a zero.
- Schermate e harness locali: `outputs/room-filters-20261021/` nella cartella della chat; non inclusi nel repository. Nessuna scrittura o analisi AI sui dati reali.

## Attività residue

Resta la verifica di Attività e Rubrica con molti elementi fittizi, già individuata nel giro UX precedente. Nessun problema bloccante emerso sui filtri stanza.
