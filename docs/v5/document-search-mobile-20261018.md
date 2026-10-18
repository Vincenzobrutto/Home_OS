# Documenti: ricerca visibile e Compila/Originale — 18 ottobre 2026

## Comportamento approvato e implementato

- Ricerca sempre visibile, raccolte/formato/visibilità sotto un unico controllo Filtri. Invio o Cerca applicano i valori, senza richieste per ogni tasto.
- Una nuova ricerca parte da Tutti i documenti; Cerca in permette Da fare o Completati. Senza query, l’ingresso operativo rimane Da fare. Le ricerche con ambito esplicito conservano l’ambito. Ricerca solo per titolo e nome file, non contenuto PDF, fornitore o importo.
- I pulsanti Da fare/Completati/Tutti indicano l’ambito applicato quando c’è una query. Il ritorno dal dettaglio conserva anche l’ambito globale nel pulsante Vedi dettagli.
- A larghezza fino a 600 px, viste Compila e Originale e selettore documento compatto sostituiscono l’impilamento dei pannelli e la coda estesa. I pannelli inattivi sono nascosti tramite CSS: il form e il PDF rimangono montati. Non è autosalvataggio né persistenza su refresh. La protezione delle modifiche non salvate rimane attiva per cambio documento e uscita.
- Desktop: scheda e anteprima affiancate secondo i breakpoint esistenti.
- Identità della proposta economica: distingue simple_invoice da utility_bill; il dettaglio usa il tipo organizzato per distinguere Ricevuta da Fattura. Non modifica classificazione, dati o originale.

## Verifica

Browser locale e API reali su documenti sintetici: ricerca globale trova fattura completata, ritorno conserva query/ambito, titolo Fattura corretto. In formato 390 × 844, fornitore e importo conservati attraverso più alternanze Compila/Originale; zoom PDF 125% conservato. Desktop verificato con entrambi i pannelli visibili. Input temporanei di collaudo rimossi senza salvare. Nessuna analisi AI, migrazione, modifica di originali personali o nuova spesa.

Test mirati coprono ricerca e filtri, ritorno, conferme manuali, conservazione dei campi e intestazioni Fattura/Ricevuta. 46 test mirati superati, typecheck e lint riusciti; build verificata prima della pubblicazione.

## Limiti

Nessun collaudo su telefono fisico, tastiera virtuale, Safari/iOS, fotocamera o screen reader. Nessuna certificazione di accessibilità. Ricerca per contenuto/dati economici e altre opportunità dell’audit restano attività separate; nessuna nuova indicizzazione o API introdotta.
