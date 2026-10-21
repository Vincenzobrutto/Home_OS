# Rubrica: ricerca raggiungibile durante lo scorrimento

21 ottobre 2026. Intervento limitato alla priorità scelta dall’utente.

La barra con ricerca e filtro Attivi/Archiviati/Tutti resta in testa alla finestra durante lo scorrimento dell’elenco, su desktop e mobile. Sfondo opaco e separatore distinguono i controlli dai contatti; menu e navigazione mobile mantengono la precedenza. I collegamenti e i pulsanti dell’elenco hanno un margine di scorrimento per non finire sotto la barra quando raggiunti tramite navigazione da tastiera.

Solo CSS della Rubrica: nessun cambiamento a query, paginazione, memorizzazione della vista, API o dati. Conteggi, ordinamento e nomi accessibili per omonimi restano fuori da questo intervento per scelta dell’utente.

## Verifiche

- 8 test mirati Rubrica (catalogo e navigazione), build e lint frontend.
- Browser con 100 contatti interamente fittizi e scritture bloccate dopo l’accesso simulato: desktop 1440×1000, mobile 390×844 e 320×800.
- Barra a quota 0 dopo scorrimento profondo; nessuna eccedenza orizzontale. Mostra altri conserva il punto di lettura e il primo nuovo contatto resta visibile.
- Ricerca Idraulico dalla posizione scorsa e ritorno dal dettaglio con ricerca, filtro e focus conservati.
- Screenshot nel workspace del task: `outputs/contacts-sticky-search-20261021/`. Nessun dato reale modificato, nessuna chiamata AI, nessuna modifica backend.
