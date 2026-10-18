# Fattura e Ricevuta: spesa diretta — 18 ottobre 2026

La scelta manuale Fattura o Ricevuta nella scheda Documenti apre una spesa casa con importo, data, fornitore e categoria. Nessun oggetto è obbligatorio: nella sezione Oggetti si può aggiungere un articolo e scegliere nuova scheda o collegamento esistente. Il costo rimane unico sulla spesa casa, senza attribuzioni automatiche agli oggetti. Resta disponibile «Conserva solo il documento».

La conversione delle bozze manuali vuote usa il percorso esistente `purchase_document` con proposta economica `simple_invoice` e inizialmente nessun articolo. La selezione già organizzata viene riallineata all’apertura. Bozze con dati salvati, decisioni o conferme pendenti conservano le protezioni esistenti; non vengono convertite distruggendo i dati. Le bozze AI e il vecchio endpoint manuale con allocazioni per articolo mantengono il comportamento esistente. Nessuna migrazione o nuova analisi AI.

Verifica: 72 test frontend (percorso integrato, revisione unica, onboarding, spesa casa), 43 test backend su DB dedicato con provider finto. Coperti Fattura/Ricevuta, tipo nuovo o già selezionato, solo documento, sola spesa, creazione/collegamento facoltativi e replay con una sola spesa. Typecheck, lint e build frontend/backend riusciti. Non effettuato un nuovo collaudo browser né una verifica AI live; i test non certificano la qualità di estrazione di documenti reali.

## Collaudo browser e correzione successiva

Eseguito sul frontend locale con API reali nella casa COLLAUDO V2, usando tre nuovi PDF sintetici, senza analisi AI o modifica di originali personali:

- `fattura-spesa-browser.pdf`: Fattura, sola spesa 12,31 €, nessun oggetto.
- `ricevuta-oggetto-browser.pdf`: Ricevuta, spesa 23,42 €, un nuovo oggetto sintetico.
- `fattura-collegamento-browser.pdf`: Fattura, spesa 34,53 €, collegamento allo stesso oggetto, nessuna seconda scheda.

Confermati nel browser: salvataggio disponibile prima di aggiungere oggetti, passaggio alla scheda successiva, tre fonti in Completati, una registrazione economica per ciascuna fonte, entrambi gli originali sulla stessa scheda oggetto. Le spese restano casa senza attribuzione automatica all’oggetto. La prima fixture è datata 17/11/2025, le altre 18/09/2026; verificate nei rispettivi filtri anno. L’automazione `fill` del controllo data non aggiornava lo stato React: completato tramite tastiera nativa, senza cambiare la validazione del prodotto.

Rilevato e corretto un difetto reale: aggiungere un articolo incrementava la versione bozza e rimontava il form economico, azzerando i campi locali. La chiave della proposta economica ora segue l’identità della proposta; le query dei doppioni continuano a seguire la versione. Verificato nel browser che importo/data/fornitore/categoria rimangono dopo aggiunta; test integrato di regressione incluso. 61 test frontend mirati superati, oltre a typecheck/lint/build.

Osservazioni UX ancora aperte: «Spesa della casa · nessun oggetto» descrive l’allocazione economica ma può essere confuso con l’assenza di collegamenti documentali; «Data del documento» nel riepilogo dovrebbe distinguere la data della spesa inserita. Nessuna promessa di persistenza dei campi su refresh.
