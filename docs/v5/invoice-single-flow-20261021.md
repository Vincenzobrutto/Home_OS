# Fatture e documenti dello stesso intervento — 21 ottobre 2026

## Comportamento implementato

- Nel modulo unico della fattura il riferimento facoltativo all’oggetto e la scelta importo unico/acconto/saldo precedono importo, fornitore, categoria e data. Una sola proposta di riferimento viene precompilata e resta modificabile; più proposte richiedono una scelta. Nessuna scrittura economica avviene prima della conferma finale.
- Scegliere un riferimento esistente esclude la creazione dei componenti proposti da quella fattura. Si può rimuovere il riferimento o conservare solo il documento. Nessuna distribuzione automatica del totale tra più oggetti.
- Un solo totale inequivocabile è direttamente modificabile; totali ambigui conservano la scelta esplicita. Numero fattura, emissione e nota sono in «Altri dati e collegamenti» e si conservano anche nella bozza. Emissione futura impedisce la conferma, senza impedire la bozza.
- Riepilogo unico, senza ripetere il totale di una singola spesa. Pulsanti «Salva acconto»/«Salva saldo». «Completa i dati» porta al campo mancante della spesa e non invia conferme.
- L’etichetta acconto/saldo può essere precompilata solo da una dicitura esplicita e non contraddittoria della fattura attuale. Resta correggibile; non indica pagamento verificato. Non viene inferita da importi, fatture precedenti o saldi contabili generici.
- Conformità e documenti tecnici senza componenti estratti consentono di aggiungere esplicitamente una scheda da creare o collegare. Nei documenti tecnici non si mostra una sezione spese vuota; soppresso l’avviso improprio «materiale di consumo». Nessuna creazione canonica all’aggiunta della proposta.
- Le fatture delle spese attive attribuite a un oggetto compaiono anche nei suoi documenti. La relazione viene derivata in lettura da spesa, fonte e riferimento: nessuna copia del file e nessun nuovo collegamento persistente. Rimuovere/spostare/archiviare il costo aggiorna la vista; collegamenti espliciti indipendenti restano validi. Privacy della fonte, account/casa, deduplica e cursori sono preservati.
- Ogni riga costo espone «Apri documento» solo se la fonte è leggibile. Funziona anche sulle attribuzioni già salvate, senza migrazione dei dati.

## Collaudo reale isolato

Account e casa dedicati, inizialmente senza documenti, oggetti o spese; API e storage separati dall’app principale. Usati i cinque originali indicati dal committente, senza pubblicarli nel repository. Scritture del percorso limitate alla casa di test; app personale verificata in sola lettura.

1. Caricati insieme tre documenti tecnici e due fatture.
2. Dalla dichiarazione riconosciuta creata e confermata una sola scheda di impianto, senza spese.
3. Prima fattura: totale e data corretti; selezionato l’impianto e distinto il saldo, escludendo le due nuove schede proposte dall’AI.
4. Seconda fattura: stesso impianto proposto automaticamente da fornitore e descrizione; categoria mancante completata, acconto confermato come spesa distinta. Stesso importo delle due fatture non equivale a doppione.
5. Schema riconosciuto e collegato all’impianto esistente. Relazione materiali: output AI non valido, nessun retry; completata manualmente e collegata allo stesso impianto.
6. Risultato verificato su DB/API e browser: **1 impianto, 5 originali distinti, 5 documenti nella scheda, 2 spese, totale 3.074,40 €**. Ogni spesa mantiene la propria fattura.
7. Desktop e telefono 390×844: Compila/Originale conserva valori e scelte; focus sul campo mancante; consultazione del documento dalla riga costo; nessun overflow orizzontale nella scheda mobile. Nessun salvataggio eseguito sui dati personali esistenti.

AI autorizzata per questi cinque file, sul credito esistente: **5 tentativi, 4 riusciti, 1 output non valido; 0,185652 USD complessivi**, compreso il fallimento. Nessun aumento del limite o nuovo invio dopo il quinto tentativo. Il costo è un dato storico del collaudo, non una promessa per analisi future.

Report cronologico e schermate restano locali nella conversazione, fuori da Git, perché contengono originali personali. Non pubblicare contesto di accesso, risposte AI o storage di test.

## Verifiche

Frontend: 108 casi distinti nelle sette suite mirate di modulo, riepilogo, modello, bozza, pagina onboarding e workspace; build e lint. Backend: build/lint e 16 casi di bozza, attribuzione, suggerimenti e integrazione dei documenti delle spese. Integrazione con fixture sintetiche e cleanup del solo scope creato dal test; nessuna AI live nelle suite.

## Limiti osservati

- L’AI può fallire sui documenti tecnici: fallback manuale verificato, affidabilità del riconoscimento della relazione materiali da approfondire offline. Non allentare i validatori per accettare output non valido.
- Titoli estratti generici («Fattura», sigle dello schema), categoria assente e diciture non inequivocabili richiedono ancora controllo umano. Nessuna categoria o rata indovinata.
- La coda segue l’ordinamento dell’archivio, non l’ordine didattico dichiarazione → allegati → fatture. Il collaudo ha completato dichiarazione → saldo → acconto → schema → relazione.
- Nel fallback di un documento non classificato resta il modulo generico degli articoli: funzionale, ma più lungo del collegamento tecnico riconosciuto.
- Anteprima di uno schema già ruotato nell’originale: nessuna correzione o riscrittura del file. Una futura rotazione di sola visualizzazione può ridurre la frizione.
- Acconto/saldo sono spese distinte con etichetta; nessun nuovo modello di rate, computo residuo o attestazione del pagamento.
