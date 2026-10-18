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
