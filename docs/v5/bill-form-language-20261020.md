# Bollette: modulo e linguaggio — 20 ottobre 2026

## Comportamento implementato

- Componente condiviso tra compilazione del documento e modulo Spese: Un mese mostra soltanto Mese di riferimento; Un intervallo mostra Dal/Al. Un periodo parziale o su più mesi apre l’intervallo, senza estenderlo al mese intero.
- Il mese corrisponde ai confini del calendario, compresi gli anni bisestili. Le due bozze restano in memoria cambiando modalità: il payload usa solo le date della modalità visibile. Non è una persistenza dopo uscita o ricaricamento.
- Fornitore/importo/categoria/periodo sono accessibili direttamente; titolo e collegamenti secondari in Altri dati e collegamenti. I controlli dei possibili doppioni restano obbligatori.
- Emissione e scadenza separate dal periodo; la scadenza è informativa e non genera promemoria né pagamenti. Intervalli conteggiati una sola volta nel mese iniziale, secondo la regola già esistente.
- Compilazione: Completa i dati del documento; Precompila con AI apre la scelta e Avvia precompilazione AI esegue l’azione solo dopo il consenso esistente. Nessun ampliamento del consenso.
- Conserva solo il documento nasconde la spesa e usa Salva documento; una spesa senza oggetti usa Registra spesa; i salvataggi misti conservano l’azione generale. Nei risultati già confermati: Riepilogo dei dati salvati e Spesa registrata.
- Aggiornamenti dei parametri della bozza sullo stesso documento non sono uscite: nessun falso avviso. Menu, cambio documento, ritorno e cronologia continuano a proteggere le modifiche.

## Verifica

101 test passati su 9 file: periodo, proposte, compilazione manuale/AI, caricamento, classificazione e protezione delle modifiche. Build TypeScript/Vite e typecheck finale riusciti; lint mirato riuscito. Browser desktop 1280 e mobile 390/320: mese/intervallo, ripristino di entrambe le bozze, mantenimento di emissione/scadenza e assenza di overflow. Salva documento verificato in harness isolato con i componenti reali e API simulate. Modulo della spesa reale aperto in sola verifica e annullato; nessuna modifica dei dati reali, nessun invio AI.

Le prove browser della compilazione usano esclusivamente dati sintetici: non attestano un nuovo salvataggio sul database reale. Screenshot e log locali in outputs/bill-language-20261020 della chat. Nessuna modifica a schema, contratti o backend.
