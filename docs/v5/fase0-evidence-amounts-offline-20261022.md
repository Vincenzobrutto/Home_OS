# Fase 0 — evidenze visive e importi, correzioni offline del 22 ottobre 2026

Seguito successivo: [Q48 con fatture separate per pagina](fase0-q48-invoices-offline-20261022.md) estende il contratto con verifiche di privacy/idempotenza. Il residuo Q48 descritto sotto resta la fotografia della consegna v23; risultati e gold della campagna non cambiano.

Implementate e verificate offline sul branch `codex/fase0-ai-quality-v3`, dopo la [campagna sintetica](fase0-quality-v3-campaign-20261022.md) di `24551f8`. **Nessuna nuova chiamata AI, nessuna spesa e nessun accesso agli originali reali**. Gold, corpus, soglie, risultati e ricevuta della campagna rimangono invariati. Il gate AI resta non superato.

## Diagnosi riproducibile

La campagna conservava score e metadati, non risposte grezze. Non è quindi possibile riprodurre esattamente tutte le sue risposte o attribuire ogni rifiuto a una sola causa. Sono stati isolati due difetti deterministici con risposte costruite a mano da fonti sintetiche, attraversando normalizzazione delle citazioni e decoder di produzione:

- Un titolo letterale come `Targhetta lavatrice` o `Etichetta energetica UE` veniva rifiutato dalla verifica semantica `product_label`: riconosceva `Modello`, `Type`, unità e altri indizi, ma non quei titoli stampati. I sette titoli distinti coprono le otto etichette Q35–Q42; queste riproduzioni non provano quali titoli il modello abbia effettivamente restituito.
- `Totale documento corrente EUR 118,47`, stampato anche nel PDF sintetico Q01, veniva omesso perché la grammatica ammetteva `Totale documento` seguito subito dall’importo, senza `corrente`. Il difetto era presente sia nelle bollette sia nei percorsi del totale acquisto/fattura. Non dimostra che tutte le altre assenze o ambiguità della campagna abbiano la stessa causa.

Prima della ricompilazione, il decoder precedente rifiutava le riproduzioni dei sette titoli e delle tre forme di totale corrente. Dopo le correzioni gli stessi casi passano. Nessuna risposta simulata viene conteggiata come accuratezza AI.

## Correzioni e invarianti

Riconoscimento dei titoli letterali `Targhetta`, `Etichetta energetica/tecnica/del prodotto`, mantenendo la presenza letterale del titolo nella propria citazione. Nessun titolo generato o eccezione alla fonte. Regioni normalizzate, pagine fisiche, pagine effettivamente inviate, legame SHA/versione e appartenenza del valore alla citazione restano obbligatori. Le immagini rimangono `provider_observed_image`, mai `verified_text`, e non autorizzano creazioni automatiche.

La grammatica monetaria riconosce la specificazione esplicita `documento corrente`, senza rimuoverla dalla citazione. Il criterio rimane il totale corrente effettivamente stampato con ruolo, valuta EUR e valore corrispondenti: niente somme, conversioni o ripartizioni. IVA, imponibile, arretrati, importo da pagare, percentuali, valuta estera, valore diverso o fonte assente non diventano un totale corrente. Due totali concorrenti restano candidati distinti e richiedono revisione; nessuna deduplica o selezione opportunistica per far passare il gate. Non sono state abbassate soglie, disattivate verifiche o modificate asserzioni esistenti.

Prompt versionato `document-understanding-v23-evidence`: richiede titolo stampato e riga monetaria completa con il ruolo originale; vieta di togliere parole dalle citazioni per superare i controlli. Il decoder aggiunge soltanto l’enum diagnostico `evidenceReason=document_title` per quel rifiuto, senza titolo, estratti o risposte nei log. Schema HTTP, quote, migrazioni e politica automatica invariati.

La ricevuta della campagna completata non è rigenerata: il codice modificato non può riutilizzarla. Una regressione verifica il rifiuto `synthetic_authorization_mismatch` senza aprire DB o trasporti. Il nuovo prompt non è stato inviato a un provider.

## Verifiche eseguite

- Build TypeScript e lint backend verdi; lint del nuovo file ripetuto dopo l’ultimo test aggiunto.
- Suite onboarding completa elencata in `test:object-onboarding`, eseguita sul nuovo `dist`: **166/166**, inclusi **18 nuovi test** nel file `test/onboarding-evidence-regression.test.cjs`.
- `npm run test:quality-v3`: **24/24**, inclusi corpus/parser, adattatore, lettura e scorer.
- `npm run test:quality-v3-live-guards`: **10/10**, senza eseguire il runner live.
- `npm test` backend: **213/213**.

Le nuove regressioni attraversano il decoder con pool delle citazioni per immagine e PDF visivo, controllano titolo inventato, etichetta di spedizione, pagina/regioni errate, pagine non inviate, assenza del testo, importi falsi/ambigui e blocco delle creazioni automatiche visive. Il PDF reale **sintetico** Q01 viene letto dal parser di produzione per verificare la citazione del totale e rifiutare un valore differente. Le risposte sono costruite localmente e `fetch` è disabilitato nel nuovo file; non sono registrazioni del modello né OCR delle immagini. Le asserzioni precedenti di privacy, citazione e idempotenza sono conservate.

Nessuna suite HTTP/DB o frontend ripetuta: modifiche limitate al percorso backend puro e al prompt. Nessun processo API o cluster PostgreSQL avviato/fermato in questo incarico, nessun deploy. Ledger e audit della campagna precedente conservati; `.env`, `main`, dati personali, file legacy sporchi e altri file estranei preservati.

Controllo finale in sola lettura dei file della campagna: ricevuta/risultati/attestazione identici alle copie pubblicate, audit ancora di 876 righe e 146 dispatch Messages. `git diff` conferma corpus/gold e tre JSON storici invariati; collegamenti del report e `git diff --check` verdi.

## Residui e prossimo passo

Q48 contiene due fatture distinte nella stessa scansione, mentre il contratto corrente ammette al massimo una spesa per una fattura non utility. Una nuova regressione mantiene il rifiuto dei due candidati di fatture su pagine differenti; non li fonde né li scarta per inventare un successo. Supportare più originali/fatture richiede un contratto di segmentazione e identità delle fonti, conferma separata e idempotenza: resta da progettare, senza modificare il gold a una sola spesa.

Restano da diagnosticare risposte assenti/multiple, rifiuti wire e altre evidenze, non ricostruibili esattamente dai metadati. Il contatore importi della campagna resta **13/70**, etichette **0/16**, senza ricalcoli retroattivi. Non è verificato il miglioramento effettivo del modello o della stabilità con v23: richiederebbe una nuova campagna versionata e autorizzata. Nessun utilizzo del budget residuo e nessun invio di reali è autorizzato da queste correzioni.
