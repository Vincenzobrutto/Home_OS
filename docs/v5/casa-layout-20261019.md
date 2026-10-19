# Casa: riepilogo operativo e scadenze — 19 ottobre 2026

Implementata la struttura desktop/mobile approvata nelle anteprime, integrando la richiesta esplicita sulle scadenze.

- Testata compatta con nome e indirizzo reali. Due azioni principali per chi può modificare: Aggiungi documento e Registra una spesa. Ruolo e permessi restano nei dettagli.
- Da completare: prime tre fonti pendenti reali con stato server e accesso alla lista completa; promemoria e verifiche separati. Nessun conteggio documenti inventato da una pagina parziale: i badge numerici del mock non sono riportati senza un aggregato autorizzato.
- Scadenze conservate dal riepilogo attività esistente: scadute, oggi, in programma, senza data, anteprima e creazione attività. Un errore non diventa zero. Sono promemoria personali; la sola data di scadenza di una fattura non crea automaticamente un’attività.
- Esplora la casa con accessi a Documenti, Oggetti e impianti, Ambienti e Rubrica. Spese con un totale server dell’anno e ultime tre registrazioni, senza duplicare i subtotali per origine. Distinzione tra costo e pagamento esplicita.
- Condivisioni, schede tecniche, ambienti/oggetti dettagliati e ruolo restano disponibili più in basso. Desktop a due colonne; mobile a colonna unica con righe compatte e navigazione esistente.

## Verifica

46 test mirati Casa/attività/spese passati; typecheck, lint e build verificati. Nessun endpoint o schema nuovo. Il build segnala un avviso di dimensione del chunk principale oltre 500 kB, non un errore.

Browser locale con API reali, dati della casa COLLAUDO V2: visualizzati documenti pendenti e totale reale del servizio; provati i collegamenti Aggiungi documento e Registra una spesa senza caricare fonti o creare costi. Per provare lo stato positivo è stato creato il promemoria «COLLAUDO Casa — verifica scadenza sintetica», data 19/10/2025: visibile come una scaduta nel riepilogo e apribile dal collegamento. Successivamente completato con nota di collaudo; storico conservato, nessun promemoria sintetico lasciato aperto. Nessun originale personale analizzato e nessun invio AI.

Verificate screenshot desktop e viewport mobile 390 × 844, righe lunghe e assenza di overflow generale dopo correzione del min-width dei riepiloghi. Il layout conserva il linguaggio visivo delle anteprime; nomi reali, elenco delle fonti e scadenze rendono intenzionalmente il contenuto diverso dal mock. Nessun dato di esempio hardcoded nell’app.

## Limiti

Telefono fisico, tastiera virtuale e screen reader non collaudati. Nessuna certificazione di accessibilità o verifica generale della qualità AI. I documenti sono un’anteprima delle prime tre fonti pendenti, non una lista completa né un riepilogo quantitativo. Le scadenze sono quelle delle attività personali: ricorrenze e promemoria automatici da bollette rimangono fuori scope.


### Priorità alle scadenze

Su richiesta successiva, le scadenze aprono il blocco Da completare prima delle fonti documentali, con fondo leggero, accento e titolo più evidente. Ordine verificato nel browser desktop e viewport mobile 390 × 844. Nessuna modifica ai dati o alla logica dei promemoria.


### Scadenze autonome

Su approvazione successiva, Le tue scadenze è un box autonomo precedente a Da completare, non più annidato al suo interno. Documenti, proposte e verifiche mantengono il nome Da completare. Ordine e separazione verificati su desktop e mobile.


### Conteggi e gruppi compatti

La successiva implementazione del [riepilogo aggregato](casa-counts-20261019.md) supera il precedente limite sui contatori: Da completare mostra tre gruppi con conteggi completi dal server, non più una lista delle prime tre fonti.

### Scadenze compatte — 19 ottobre

Il box autonomo ora mostra tre righe cliccabili con conteggi completi dal riepilogo server: Scadute, Oggi, In programma. Quest’ultimo include tutte le attività future, anche oltre sette giorni. Rimangono Tutte le attività, Nuova attività per chi può modificare e Senza data quando il conteggio è positivo. Errori e caricamento restano distinti dallo zero.

I filtri Stato/Scadenza di Attività leggono e aggiornano la query URL; link dalla Casa e navigazione indietro mantengono il filtro corretto. Browser: verificati Scadute su desktop, Oggi e In programma su mobile 390×844, con stato vuoto coerente e assenza di overflow. Test mock verificano conteggi positivi, collegamenti filtrati, date ieri/oggi/+7/+8 e senza data. Nessun originale aperto o dato modificato durante il collaudo browser.

## Casa più compatta — 19 ottobre 2026

Le tue scadenze e Da completare ora mostrano tre conteggi affiancati, con collegamenti invariati e stato di caricamento/errore distinto dallo zero. Scadenze resta sopra Esplora/Spese; Da completare segue entrambi nell’ordine DOM, anche su mobile. Rimosso dalla Casa il riepilogo duplicato Ambienti, oggetti e schede tecniche: accessi canonici in Esplora; caldaie nel catalogo Oggetti e impianti, verifica in Da completare/Attività. Dettagli casa/ruolo mantenuti chiusi di default con font ridotto. Nessuna API o dato modificato.

Verifica: build/typecheck e lint frontend; 69 test pertinenti passati (67 al primo giro, 2 aspettative aggiornate alla navigazione senza riepilogo duplicato e riprovate). Browser reale desktop 1440×1100 e mobile 390×844: Scadenze circa 180 px desktop/232 mobile, Da completare circa 140/147 px, nessun overflow. Provati accessi e apertura dettagli senza scritture nei test. Evidenze locali outputs/dimora-v5-completo/casa-compact nella chat del 18 ottobre.

## Audit UX applicato — 19 ottobre 2026

Stati vuoti Casa alleggeriti: Nessuna attività aperta senza tre contatori a zero; Da completare diventa Tutto completato solo con conteggi documenti e verifiche disponibili, senza errori e tutti i pendenti a zero. Analisi in corso/attenzione e attività senza data impediscono il falso stato vuoto. I documenti già completati non tengono aperto il riepilogo pendenti. Conteggi non nulli e gestione errori restano consultabili come prima.

Esplora mobile su tre righe con descrizione e freccia, link secondari principali da 44 px e corpo maggiore, anno accanto al totale. Condivisioni con spiegazione richiudibile e accesso diretto sempre visibile; avvisi di conferma/errori restano fuori dal dettaglio per non nasconderli. Storico in Attività separato dai filtri temporali. Nome/indirizzo della casa invariati: nessuna rinomina arbitraria dei dati dell’utente.

Verifica: 56 test frontend pertinenti passati (52 percorsi Casa/attività/review/condivisioni, quattro casi stato vuoto/analisi/errore/conteggio sconosciuto), build/typecheck/lint riusciti. Browser desktop 1440×1000 e mobile 390×844, accesso Attività e ritorno, apertura/chiusura Condivisioni, nessun overflow/errore console. Nessun dato reale modificato, nessuna API/schema nuova o chiamata AI. Catture negli output della chat, dimora-v5-completo/casa-audit-implemented. Non è certificazione WCAG completa.
