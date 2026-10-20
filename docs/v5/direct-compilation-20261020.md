# Compila diretto e uscita esplicita — 20 ottobre 2026

## Comportamento

- Archivio e ingresso alla compilazione presentano un unico pulsante Compila, senza menu preliminare manuale/AI. Crea una bozza manuale solo se non esiste già una bozza aperta; riusa quella esistente. La risposta persa conserva la stessa chiave di idempotenza.
- Una proposta AI disponibile mantiene Rivedi proposta. Completati, analisi in corso, attenzione ed esiti confermati mantengono i percorsi precedenti. Non introdotta rianalisi dei completati.
- Precompila con AI resta nel modulo. Apertura e compilazione manuale non trasmettono documenti al provider; consenso, conferma del cambio percorso e avvio AI esplicito invariati.
- Riprendi più tardi sostituito da Esci senza salvare. Nota: «Il documento e le proposte già salvate restano disponibili. Se esci, le modifiche non salvate vengono scartate.» Nessuna promessa di autosalvataggio.
- La conferma di uscita esistente protegge i campi modificati: annullare conserva i valori, confermare chiude senza salvarli. Le proposte già persistite restano recuperabili. Nessun salvataggio di spese o oggetti all’apertura/uscita.

## Verifica e limiti

32 test passati su quattro suite: azioni di compilazione, spazio di lavoro e protezione uscita, documenti pendenti e caricamento. Compresi recupero della bozza, risposta persa con stessa chiave, AI dentro il modulo con consenso non preselezionato e nessun avvio automatico. Build TypeScript/Vite e lint mirato riusciti.

Browser su harness isolato con componenti reali (azione, editor, modulo e shell) e API in memoria: apertura in un clic, campo titolo modificato, annullamento e conferma uscita, recupero della bozza senza conservare i valori scartati, Compila/Originale senza perdita del titolo. Desktop 1280, mobile 390/320; pulsanti leggibili, nessun overflow orizzontale nelle viste provate. Originale sintetico sostituito da segnaposto; nessuna nuova prova di rendering PDF.

Il percorso dal modulo fino all’avvio AI disabilitato senza consenso è coperto dai test. Nel browser l’apertura del pannello opzionale è verificata; il successivo dialogo del cambio percorso ha interrotto il controllo browser. Nessun invio al provider. Le prove non costituiscono una nuova conferma sul backend reale.

Nessuna modifica dei dati personali: non aperte nuove bozze sul servizio reale, non effettuati upload o salvataggi. API/schema/backend invariati; modifiche legacy preservate. Evidenze locali nella chat: outputs/direct-compila-20261020 e outputs/direct-compila-tests.log.
