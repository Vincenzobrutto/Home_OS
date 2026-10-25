# Bollette: segnali del servizio e riepilogo fiscale — 25 ottobre 2026

## Perimetro

Branch codex/bollette-segnali-generali-20261025 e worktree dedicato dal consolidamento 911b0fb dopo fetch. Registrazione d4cd607 prima del codice; prima implementazione 597b57c, ulteriori guardie 0ed2e2e e 3fffb23, varianti grammaticali debfcc3. Il seguito documentale della precedente attivazione PR #43 è importato con 055ae61. Nessun codice o checkout Claude toccato; nessun backend, API, schema, dipendenza, configurazione .env o contratto di conferma modificato. La lettura resta limitata alla prima pagina.

## Diagnosi e regole generali

Il nuovo PDF telefonico ha un livello di testo ricco: la prima pagina non è una scansione vuota. Il classificatore precedente trovava l'intestazione Fattura ma nessuna delle parole chiave di telefonia allora previste; restituiva null e non avviava l'OCR perché il testo superava la soglia per le scansioni. Non dipende dal nome dell'operatore.

Ora una combinazione di segnali del contratto può identificare il servizio: informazioni/identificazione della linea, abbonamenti attivi o canone/servizio di accesso, più numero telefono o codice migrazione etichettati. Rimangono obbligatori i precedenti segnali di fatturazione e intestazione. Un telefono di contatto isolato, due soli segnali, abbonamenti a riviste, preventivi, offerte e dichiarazioni negative non bastano. Non è introdotto alcun elenco di fornitori né una regola sul filename.

Il totale del documento può essere stampato in grande nel riepilogo senza la frase Totale da pagare. Il nuovo helper spaziale ammette un valore in evidenza soltanto nella stessa colonna di un'intestazione Fattura univoca, con numero fattura e data di emissione valida. Coordinate e dimensioni sono relative all'intestazione: nessuna posizione assoluta, colore o modello grafico di un fornitore. Valori in altre colonne o piccoli dettagli non diventano il totale. Valute, segni, precisione, limiti monetari e contraddizioni restano sottoposti allo stesso validatore; nessuna somma, conversione o selezione arbitraria tra più importi. Segni e unità separati dai token numerici sono barriere, non caratteri da scartare.

Il riepilogo nativo è confrontato anche con i totali espliciti nell'OCR: una contraddizione resta un importo da confermare. Fornitore e date continuano a usare intestazioni/evidenze locali già previste; non sono requisiti per conoscere il tipo prima di leggere gli altri campi. Fonte/versione/SHA, annullamento e protezione delle compilazioni salvate restano invariati.

## Prove locali sui documenti forniti

Prima pagina del nuovo documento telefonico, PDF.js e worker/WASM italiano senza rete: tipo internet/telefonia, fornitore, totale, emissione e scadenza confrontati positivamente con la pagina. I valori effettivi del documento non sono riprodotti in questa consegna; i test usano importi e operatori inventati. Il periodo di consumo non è esplicito nella prima pagina e resta da confermare: il mese nel titolo Fattura non è trasformato nel periodo di competenza. Nessuna lettura delle cinque pagine successive.

Regressione sulla prima pagina della precedente bolletta elettrica: fornitore, importo, emissione, scadenza e periodo invariati. Nessuna lettura delle sette pagine successive. Questi controlli locali non sono un collaudo browser o delle bozze reali. Nessun originale, raster, recapito, identificativo cliente o testo personale aggiunto al repository; le fixture versionate usano operatori e valori inventati.

## Verifiche e tentativi

Prima mirata 191/191, prima dei tre casi aggiuntivi sul percorso PDF/UI e delle nove barriere su operatori/unità. La prima suite completa è stata interrotta ancora in corso per aggiungere queste barriere, non dichiarata verde. Sono stati fermati solo runner mock e figli identificati, escludendo API, PostgreSQL e frontend applicativo; log conservato. Nessuna asserzione o timeout precedente modificato.

Mirata successiva 202/203: il nuovo caso per unità ha esposto il confine di parola ASCII sulla lettera accentata. Corretto il codice con un confine Unicode senza modificare il test. Mirata successiva 203/203 verde. Aggiunte poi sei prove sulle forme singolari/plurali di abbonamento e servizio, con correzione debfcc3: mirata definitiva 209/209 in 11 file verde; suite completa sulla fonte debfcc3 da completare prima della consegna. Anche la seconda completa preliminare è stata interrotta per congelare questa correzione grammaticale, senza dichiararla verde. Typecheck/lint/build della prima implementazione verdi; da ripetere sulla fonte finale. Fixture 5/5, incluso motore OCR reale su scansione sintetica senza rete.

Evidenze locali del task: work/bill-signals-focus.log, work/bill-signals-focus-final.log, work/bill-signals-focus-verified.log, work/bill-signals-focus-definitive.log, work/bill-signals-full-before-rate-guard.log, work/bill-signals-full-before-grammar.log, work/bill-signals-full.json e work/bill-signals-full-definitive.log, work/bill-signals-checks-definitive.log e work/bill-signals-fixtures.json/log. Nessun cluster DB avviato. La prova della scheda Spese usa soltanto il harness: nessun salvataggio o conferma automatica nell'app.

## Stato di consegna

Implementato sul branch proprio, collaudo finale in corso. App invariata sulla fonte integrata 911b0fb; nessuna AI/email, lettura o modifica di DB/API/storage reale, migrazione o riavvio. Dopo i controlli: stato/roadmap/changelog, push verificato e PR verso il consolidamento; merge e aggiornamento app restano al committente. I dati confermati e le compilazioni già salvate non vengono riscritti.

[PR #44](https://github.com/Vincenzobrutto/Home_OS/pull/44) aperta in bozza verso il consolidamento durante la verifica definitiva; pronta solo dopo esito completo. Gli intermedi locali con testo/raster della diagnosi corrente sono stati rimossi, PDF originali preservati.
