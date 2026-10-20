# Correzioni UX confermate — 20 ottobre 2026

Intervento circoscritto ai quattro problemi riprodotti nel browser dopo l’audit statico di Claude. Nessuna API, migrazione, modifica ai dati reali o nuova chiamata AI.

## Comportamento

- **Tipologie dei documenti della casa:** pulsanti su più righe con etichette complete a 320/390 px. Il layout dedicato evita di comprimere sei pulsanti sulla stessa riga; le schede Da fare/Completati/Tutti mantengono la propria disposizione compatta. Filtri e archivio canonico invariati.
- **Ambito della ricerca:** senza testo, Cerca in coincide con la vista applicata, anche tornando indietro o cambiando scheda. Iniziando a scrivere passa visibilmente a Tutti i documenti, conservando la ricerca globale approvata. Una scelta esplicita dell’ambito viene rispettata anche durante la digitazione e le modifiche successive a una ricerca già applicata. Le richieste partono solo con Cerca/Invio. Un ambito Tutti scelto senza testo è ora conservato esplicitamente nell’URL, anziché ricadere sul default Da fare.
- **Selezione AI:** ingresso denominato «Seleziona per compilare con l’AI». Consenso, gruppo esatto, blocchi e recupero degli esiti incerti invariati; aprire la selezione non avvia analisi.
- **Ritorno Rubrica:** navigazione laterale/mobile e pannelli Contatti portano con sé la provenienza. Il ritorno apre documento, oggetto, spesa o elenco di origine con query e stato di navigazione precedenti. Anche il dettaglio contatto usa la provenienza, mantenendo separati ritorno alla Rubrica e ritorno alla risorsa. Ingresso diretto senza provenienza: Casa per la lista, Rubrica per il dettaglio.

Il contesto di ritorno è solo nello stato di navigazione, vincolato ad account e casa. Percorsi esterni, altre case, account diversi e percorsi non previsti vengono rifiutati. Non sostituisce i controlli server. Nessuna nuova dipendenza o persistenza di dati privati.

## Verifiche

- 68 test mirati complessivamente superati: ricerca, workflow documenti, upload/selezione AI e recupero, review, contatti, contesto di ritorno. Test di ricerca sul default Da fare, invio vuoto, ambito esplicito, Tutti senza testo, navigazione e reset. Test sul ritorno reale attraverso il router simulato e sui confini account/casa/percorso. Una vecchia aspettativa su un collegamento Documenti rimosso da Casa è stata allineata all’ingresso attuale Apri documenti; non reintrodotto il collegamento duplicato.
- Build e lint frontend superati; TypeScript verificato anche dalla build. Suite con backend simulato, senza scritture sul database reale. Vitest eseguito fuori dalla sandbox per un errore di permesso sulla cache temporanea.
- Browser reale desktop e mobile 390×844/320×740: tipologie leggibili senza overflow interno o di pagina; filtro Planimetrie trova lo stesso originale; stato e ambito coerenti; ricerca globale; Tutti senza testo; nuova etichetta AI leggibile; Rubrica dalla navigazione e dal pannello del documento; ritorno al documento con ricerca precedente e all’oggetto dalla barra mobile.
- Nessun upload, salvataggio, modifica di record, archiviazione o analisi AI nel browser reale. Il dettaglio contatto con dati popolati è coperto dai test simulati: la Rubrica reale è vuota.

Catture nella chat di lavoro: `outputs/ux-fixes-20261020/`. I rilievi dell’audit non compresi in questi quattro interventi restano da valutare: non sono dichiarati risolti da questa consegna. L’audit parallelo di Claude può osservare la versione aggiornata dopo ricarica.
