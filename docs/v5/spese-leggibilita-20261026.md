# Spese — leggibilità, nomi e filtri

## Incarico e confini

Il committente approva la preview della sezione Spese e chiede di mantenere il grafico. Lotto `codex/spese-leggibilita-20261026`, worktree dedicato dal consolidamento remoto `e95f8fd`, registrato in stato con commit `aae2e95` prima del codice. Verificate le righe dei lotti: nessuna modifica al cestino/Claude o a object-onboarding. La PR documentale #57 resta distinta.

Solo presentazione frontend economy-v1 e test mock. Nessuna modifica ad API, tipi wire, backend, schema, query, calcoli, formulari di creazione/conferma, parser/OCR, dipendenze, dati salvati o originali. Nessun accesso al DB/API/storage reale durante l’implementazione e le verifiche. App reale, processi, main e consolidamento non aggiornati da questo lotto.

## Comportamento

- Titoli visuali per bollette con titolo esattamente generico: fornitore già salvato e mese fattura esplicito, dove presenti. Riutilizzato il formatter prudente dei fornitori; nessun catalogo di marche o deduzione da altri documenti. Titoli specifici e personalizzati preservati. La descrizione originale resta nel dettaglio quando il titolo visuale cambia. Nessuna rinomina persistente o modifica della ricerca sul server.
- Importi in colonna stabile anche per titoli lunghi; categoria distinta dal contesto. Per le utenze, mese fattura, emissione e scadenza hanno etichette separate. Senza mese fattura si indica il periodo dei servizi, se disponibile, senza promuoverlo a mese della fattura. Nessun mese dedotto da emissione/scadenza e nessuno stato di pagamento dedotto dalla data.
- Spiegazione dei criteri temporali espandibile; totale etichettato «Costi registrati nel periodo». Nessun cambio delle priorità delle date o delle somme.
- Tipo di spesa e raggruppamento disponibili fuori dal pannello avanzato, applicati alla selezione. Categoria, oggetto, ambiente, lavoro, origine e stato conservano l’applicazione esplicita; chip rimovibili, ricerca privata, paginazione e ritorno dall’oggetto/dettaglio preservati. Tutte le famiglie restano selezionabili: la preview a tre pulsanti non viene usata per introdurre un filtro «altre» non previsto dal contratto.
- Grafico, legenda e relative azioni riutilizzati integralmente: dati dal riepilogo del servizio, non dalla somma delle pagine già caricate. Preservati BigInt, finanziamenti, arrotondamenti e stati vuoti/errore. Confronto annuale preceduto da avvertenza sullo storico incompleto. Lo stato «Registrazione attiva» nel dettaglio non allude al pagamento.

La pagina H3a di fallback, i form di modifica e i dettagli aggiuntivi di storia/contatti rimangono disponibili. Questo lotto applica la gerarchia approvata al prodotto esistente, senza rimuovere funzionalità non mostrate nella preview sintetica.

## Verifiche e limiti

Mock completa 1548/1548 in 149 file, 1259.76s, un worker/retry0, nessun test saltato/todo. Typecheck, lint e build verdi. Fonte prodotto 9f2c0fe. Grafico e riepiloghi server, API/backend e calcoli invariati. Nessun merge o aggiornamento app implicito.

Primi nuovi test 13/13: 11 regole pure e 2 percorsi con backend in memoria, incluso controllo di assenza scritture, grafico, mese fattura contro servizi, descrizione originale e filtri con ricerca fuori dall’URL. Prima regressione di area 71/72: attesa scaduta sul primo caricamento lazy di DocumentDetailPage («Caricamento della sezione…»), prima di accedere alle spese collegate. Non classificata come difetto del dato né nascosta: nessuna asserzione o timeout ridotti/allungati. Le sole aspettative precedenti aggiornate riguardano il nuovo titolo del totale e il tipo applicato immediatamente; privacy, focus dei filtri avanzati, applicazione esplicita e zero scritture restano asseriti.

La preview locale era stata aperta e approvata dal committente; il browser dell’agente aveva rifiutato il protocollo file. Blocco non aggirato. Non rivendicati collaudo visivo del candidato integrato, verifica su telefono fisico, contrasto misurato o certificazione accessibilità. Focus visibile, etichette e regole responsive sono implementati; il collaudo visivo rimane distinto dai test jsdom.

## Attività del committente

Revisionare la PR del lotto. Solo dopo approvazione: merge nel consolidamento e aggiornamento del frontend per la verifica nell’app. Nessun documento da ricaricare, spesa da riconfermare o dato da bonificare per adottare la presentazione.

### Evidenze finali

Mock completa 1548/1548 in 149 file, 1259.76s, un worker/retry0, nessun test saltato/todo. Typecheck, lint e build verdi. Fonte prodotto 9f2c0fe. Grafico e riepiloghi server, API/backend e calcoli invariati. Il percorso delle spese collegate a dicembre, inizialmente fermo sul caricamento lazy, è incluso nella suite completa senza modificarne asserzioni o timeout. Primi controlli statici avevano rilevato soltanto opzioni `exact` non previste dai tipi di Testing Library nei selettori dei test: sostituite da espressioni regolari ancorate, stessa selezione esatta. Nessuna modifica prodotto successiva alla fonte verificata.

Prima completa: 1516 superati, un fallimento in TrashIndependentReview prima della comparsa del documento atteso, più errore di avvio del worker di documentSearch (file non eseguito). Non dichiarata verde. I due file sono poi passati isolati 36/36, invariati. Seconda completa senza build/lint concorrenti, stesso pool, un worker/retry0 e timeout invariati. Il passaggio isolato non viene usato come sostituto del risultato completo; la causa del fallimento del test del cestino non è dimostrata. Nessuna correzione al cestino o alla ricerca né modifica delle loro asserzioni.

Log locali `work/spese-new.log/json` (13/13), `spese-focus.log/json` (71/72, fallimento conservato), `spese-all-first.log/json` (prima completa non verde), `spese-recheck.log/json` (36/36), `spese-all.log/json` (seconda completa finale), `spese-checks-final.log`; configurazione esterna con envDir vuota e ambiente ripulito dal runner offline. Nessuna configurazione .env letta/modificata, nessun servizio reale. Diff e link controllati prima del push.
