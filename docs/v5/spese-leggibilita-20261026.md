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

## Consegna

[PR #60](https://github.com/Vincenzobrutto/Home_OS/pull/60) verso il consolidamento; nessun merge. Push verificato con `git ls-remote`, worktree proprio pulito dopo i commit. Ultimo fetch conferma la base e95f8fd e main invariato a cdbb318. Dopo i test soltanto documentazione; codice prodotto identico alla fonte verificata. Le quattro aspettative di nome accessibile del totale nei due test S1c sono state aggiornate al nuovo testo: asserzioni su dati, consensi e mutazioni invariate. Nessun file del cestino o del classificatore cambiato.

Attività del committente: approvare la PR #60 per merge e attivazione del frontend, poi rivedere elenco e grafico desktop/mobile senza creare nuove spese. La PR #57, di sola documentazione dei rilasci precedenti, rimane separata.

## Rilascio autorizzato

PR #60 integrata su approvazione a d5bf35f33b8f8aa406b0183b9b5f421853b8da00, hash remoto verificato. Solo frontend ricompilato e attivato; build12,47s e29/29 controlli statici/anonimi verdi. API15744 e PostgreSQL22924 preservati con identità/listener invariati; main remoto invariato a cdbb318. Nessuna AI/email, migrazione, upload o salvataggio automatico.

Runtime detached `Dimora-V5-runtime-spese-20261026` dalla fonte d5bf35f. Albero frontend identico alla punta approvata eb6ce87 e backend identico alla API attiva a8de901. Lock verificato, ambiente pulito e configurazione esterna, nessun .env. Fermato soltanto il vecchio frontend13740 dopo verifica fresca di PID/creazione/comando/listener; nuovo frontend16596 su loopback5174. API3011 e PostgreSQL55432 mantenuti, header `roma-consolidata-a8de901-no-ai` esatto. Primo controllo subito dopo lo start: connessione rifiutata prima della readiness; successivo controllo29/29 verde, senza riavviare altri servizi. I1548/1548 offline restano evidenza funzionale; non ripetuti perché il codice è identico alla fonte approvata.

Evidenze locali `work/spese-release-build.log`, `-runtime-proof.json`, `-runtime-http-proof.json`, `-frontend.log` e metadata canonici. La PR #57 viene aggiornata con questa consegna, senza altro codice prodotto. Consolidamento riportato nel branch documentale con merge, senza rebase, preservando i tre rilasci precedenti nei conflitti di stato/roadmap/changelog.

Attività del committente: aprire Spese e verificare elenco, date, filtri e grafico. Nessun documento da ricaricare o spesa da riconfermare. Rimane la sola approvazione documentale della PR #57, che non condiziona il frontend già attivo.

### Verifica visiva dopo l’attivazione

App desktop consultata nel browser integrato in sola lettura: nuovi titoli, mese fattura distinto dai servizi quando assente, emissione e scadenza etichettate, importi allineati anche accanto a titoli lunghi. Grafico e legenda visibili a fianco dell’elenco. Nessuna compilazione, apertura di originali, modifica di filtri, upload o salvataggio; soltanto apertura della pagina e scorrimento. Evidenze locali private `outputs/audit-spese-20261026/05-spese-attive.png`, `06-spese-elenco-grafico.png`, `07-spese-grafico.png`; l’ultima mostra elenco e grafico ed è stata riaperta e ispezionata. Immagini e dati non copiati nel repository. Nessuna prova su telefono fisico né certificazione di accessibilità. API e PostgreSQL ricontrollati dopo l’attivazione: identità/creazione/listener invariati.
