# Spese — Acquisti e sostituzione di componenti, 26 ottobre 2026

Decisione approvata dal committente: chiamare «Acquisti» la categoria degli oggetti nuovi, anche se sostituiscono un oggetto precedente. La sostituzione di un componente durante un intervento va indicata come «Riparazioni e lavori». La distinzione è spiegata nei moduli manuale e da documento, inclusa la compilazione a schede.

## Perimetro

Lotto frontend separato dal consolidamento d5bf35f33b8f8aa406b0183b9b5f421853b8da00, branch codex/spese-acquisti-20261026, worktree dedicato. Registrazione prima del codice e005f06. La PR #61 (Gruppi di spesa) resta separata e non integrata; le aree precedenti risultano liberate, nessun file di un lotto Claude modificato.

La presentazione usa «Acquisti» anche se le capabilities server restituiscono la vecchia etichetta. Grafici, elenco, filtri, dettagli e selettori passano dall’helper categoryLabel; uniformate anche ricevute, proposte casa e riepilogo finale. «Riparazioni e lavori» è coerente anche nei due riepiloghi che usavano l’ordine inverso.

Il codice purchase_replacement, i payload di categoria, i raggruppamenti server, gli importi e i collegamenti restano invariati. Nessuna riclassificazione o modifica retroattiva delle spese. Le proposte automatiche mantengono le regole esistenti: il chiarimento aiuta la scelta esplicita dell’utente, senza introdurre una deduzione automatica nuovo oggetto/componente. Se una spesa precedente era classificata come acquisto rimane in quella categoria, con il nuovo nome visuale.

## Verifiche

Primo gruppo mock mirato: 173/174 in 14 file (405,74 s), con una attesa scaduta sul lazy loading di «Spese collegate» nel primo caso di routes/expenses.test.tsx. La schermata nel dump era ancora in caricamento; non basta a dimostrare una causa temporale. La riesecuzione del file invariato fallisce nello stesso punto. Il confronto sul worktree precedente Dimora-V5-spese-leggibilita-20261026 riproduce lo stesso errore nel solo caso selezionato (1 fallito, 22 esclusi dal filtro -t, non eliminati). Corretto soltanto il setup del caso con import esplicito del modulo DocumentDetailPage prima della navigazione: la compilazione iniziale del modulo lazy viene attesa fuori dalle asserzioni sul contenuto. Nessun timeout, asserzione o configurazione di retry modificati. File stabilizzato: 23/23 in 72,24 s, senza casi saltati. Gli altri 151 casi nei 13 file del gruppo precedente erano verdi: coperti quindi tutti i 174 casi selezionati, con esecuzioni distinte. Non si dichiara un aggregato finale 174/174 in una sola esecuzione, né la suite mock completa. Typecheck, lint e build finali superati. Il primo typecheck ha rilevato una opzione exact non supportata nel matcher ByRole: sostituita con regex ancorata, senza cambiare la corrispondenza attesa; caso mirato finale superato (1/1 selezionato con -t; gli altri 22 casi del file esclusi soltanto dal filtro). Il mock mantiene intenzionalmente «Acquisti e sostituzioni» nelle capabilities: il test esistente del modulo verifica che l’opzione presentata sia «Acquisti», con codice purchase_replacement e spiegazione dei componenti; restano tutte le asserzioni su importi, categoria/lavoro, privacy e idempotenza.

Nessuna nuova dipendenza. Runner con ambiente ripulito, envDir vuota, un worker e retry0; nessuna AI/email, DB/API/storage reale, migrazione, modifica .env o salvataggio automatico. Main e applicazione attiva preservati.

## Consegna

Stato, roadmap e changelog aggiornati; PR verso il consolidamento. Nessun collaudo visivo né attivazione per questo lotto. Merge e rilascio al committente.

Attività del committente: approvare la PR; dopo l’attivazione verificare la distinzione nel selettore delle categorie.
