# Fase 0 — Q22, prezzi e date delle due righe, 23 ottobre 2026

Implementato e verificato offline su `codex/fase0-ai-quality-v3`: **Forno Nubeo N4: 300,00 EUR**, **Frigorifero Vetravia R3: 500,00 EUR**, entrambi con **data acquisto 18/09/2026**. Il totale di 800,00 EUR resta un controllo superiore, mai una base di ripartizione. Nessuna chiamata AI, inclusi metadata/conteggi; nessun originale reale, accesso a DB/API dell’app, modifica `.env` o migrazione del prodotto.

## Diagnosi e limiti della riproduzione

Il PDF sintetico congelato stampa `Descrizione / Quantità / periodo / Importo`, con quantità esplicita e importo su ciascuna riga. Il validatore precedente riconosceva altre tabelle con colonna Totale e le etichette Totale riga/Importo riga, ma non questo formato Importo. Inoltre il lettore monetario generico, applicato all’intera citazione `Quantità: 1   300.00 EUR`, può interpretare il conteggio adiacente come parte di un raggruppamento numerico e rifiutarlo: ora quantità e cella monetaria sono isolate e validate separatamente all’interno della riga verificata.

La fonte contiene sia Data documento sia **Data acquisto**, esplicitamente etichettata. La data d’acquisto comune può completare le due righe quando il campo è omesso, citando la propria riga originale. Non è dedotta da data documento, fattura, pagamento, consegna o dal totale; nessun cambiamento al validatore delle date proposte dal modello. Una proposta di data errata o non verificabile resta segnalata, senza sostituzione silenziosa.

Le risposte grezze v24 non sono conservate: non è possibile attribuire con certezza i due esiti live a un payload specifico. Importi mancanti possono anche rendere assenti le date delle spese nello scorer, senza provare che il modello avesse letto male le date. La nuova fixture costruisce risposte offline con omissioni o citazioni delle righe effettivamente presenti; non è un replay delle risposte live né una nuova misura di accuratezza AI.

## Comportamento implementato

- Lettura locale solo su **testo verificato**, nella pagina del soggetto già citato e tra quelle autorizzate dal prefisso/selezione. Intestazione esplicita Importo e riga univoca con nome, `Quantità:` e un solo importo EUR positivo; niente prezzo unitario, percentuali, segni negativi, moltiplicazione, somma o attribuzione dal totale. Righe duplicate/ambigue, fonti visive e formati non supportati non ricevono questa integrazione locale.
- Per campi omessi: quantità e prezzo provengono dalla riga; data soltanto da una riga autonoma `Data acquisto`/`Data di acquisto`/`Purchase date` con data completa univoca, sulla stessa pagina e non futura. Non si cercano valori nel gold o in altre pagine. Non vengono creati soggetti ulteriori né un costo globale aggiuntivo.
- I valori proposti continuano a richiedere citazioni autentiche, nome/ruolo/pagina/valuta coerenti. Le citazioni corte della riga possono essere estese al loro **vero estratto contiguo**, dall’intestazione fino alla riga, senza concatenare frammenti inesistenti. Prezzi/date/quantità proposti ma errati conservano gli avvisi e bloccano l’automatico; non vengono corretti nascondendo il fallimento.
- Identità server `invoice-line-v1` da SHA, pagina, posizione fisica dell’intestazione e indice della riga; `items[].invoiceLine={key,page,row}` non è accettato dal provider. Copie dello stesso originale, ordine delle proposte e abbreviazioni del nome non cambiano l’identità fisica. Due proposte riferite alla stessa riga sono rifiutate.
- Prima delle creazioni automatiche, il servizio confronta **prezzo e data scelti con quelli verificati per l’articolo**, dentro la transazione. Differenze generano `onboarding_item_cost_review`; un errore sulla seconda riga annulla anche la prima, oggetti e ricevuta inclusi. Il protocollo preesistente `manualItemAmount` per scelte multiarticolo resta un consenso per articolo, non un calcolo di quote.
- Le spese conservano `_invoiceLine` e fonti separate per importo e data in `economicProvenance`, con origine coerente; storico e ricevuta economica sono aggiornati nella stessa transazione. Deduplica per riga tra copie/rianalisi con i controlli di visibilità della fonte; collegamento alla spesa di un’altra riga rifiutato con `onboarding_invoice_line_conflict`. La conferma parziale non consuma né fonde l’altra riga. Nessuna nuova tabella/migrazione o riscrittura delle vecchie spese.

Prompt **`document-understanding-v25-invoice-lines`**: esplicita il formato Importo e la data d’acquisto comune citata per ciascun articolo. Il congelamento delle autorizzazioni future include il nuovo modulo, i validatori monetari/date richiamati e il servizio di conferma. Ricevute v22/v24 non riutilizzabili; runner live v24 resta vincolato al suo build storico. Nessuna campagna v25 avviata o autorizzata implicitamente.

## Verifiche eseguite

| Verifica | Esito |
|---|---|
| Build TypeScript e lint backend V5 | verdi |
| `npm run test:object-onboarding` | **188/188**, inclusi 7 nuovi test Q22 e regressioni Q15/Q48 |
| `npm run test:quality-v3` | **24/24** |
| `npm run test:quality-v3-live-guards` | **11/11**, soltanto offline |
| `npm test` backend V5 | **213/213** |
| Q22 + Q15 + Q48 su DB sintetico isolato | **30/30**: 10 Q22, 9 Q15, 11 Q48, inclusi contenitori |

Il parser reale sul PDF Q22 e lo scorer invariato confermano nella fixture **2/2 importi, 2/2 date**, nessuna evidenza testuale inventata o errore critico automatico. Adattatore/preparazione/schema/decoder/policy reali nelle modalità completa, locale e progressiva, con trasporto interamente in memoria e `fetch` globale vietato: zero richieste esterne. Negativi: importi incrociati, perdita del prezzo, totale diverso, colonne unitarie, USD, percentuali, negativi/zero, righe ambigue, header assente, data fattura/documento/consegna/pagamento/futura o di altra pagina, data ambigua, proposta errata e identità server fabbricata. Nessun gold, scorer, soglia o asserzione privacy/idempotenza indeboliti.

DB tramite `npm run test:q22-db -- -PgBin <bin PostgreSQL locale> -ScratchRoot <work>`: cluster nuovo sulla **55433**, ruolo `quality_test`, DB `dimora_v5_quality_v3_test`, guard host/porta/nome/ruolo prima della connessione. Schema applicato soltanto al cluster sintetico, senza caricare `.env`; cluster conservato e spento nel `finally`. Ultima esecuzione completa: directory `invoice-lines-12a6b92269ed47ea81ff6140b29112cb`, dopo aver completato il filtro di visibilità della deduplica.

Q22 verifica due oggetti e due costi canonici separati, origine/fonti e collegamento corretto all’oggetto, due conferme concorrenti con una sola transazione efficace, replay da altro client, body cambiato e nuove chiavi, rollback sulla seconda riga, conferma parziale, copia SHA con nome abbreviato **quando resta ancora margine sotto il totale**, collegamento sbagliato/corretto alla riga, altro owner/estraneo, candidati privati, redazione alla revoca, SHA/versione, viewer e perdita membership. Le regressioni DB Q15/Q48 passano senza modificare i loro test.

## Stato residuo

Implementazione e percorso offline verificati; **qualità delle nuove risposte AI non verificata**. Verificati i 52 originali e i 52 gold contro entrambe le ricevute congelate; i sei JSON autorizzazione/risultati/verifica e il codice di scorer/misure risultano invariati rispetto a HEAD. Corpus/gold, autorizzazioni, risultati, verifiche JSON e ledger v22/v24 conservati: nessun ricalcolo retroattivo di Q22 o dei critici Q15, gate storico ancora **non superato**. Supporto limitato al formato testuale esplicito sopra descritto; nessuna estrazione OCR o garanzia sulle altre tabelle. Frontend/browser e suite HTTP non ripetuti, API dell’app non riavviata. Restano copertura live Q48, Q20/date, rifiuti titolo Q29/Q30, stabilità e valutazione delle modalità di lettura; nuove misure AI e reali richiedono autorizzazione distinta. File estranei preesistenti preservati.
