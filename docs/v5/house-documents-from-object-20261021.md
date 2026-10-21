# Conservare documenti nella casa da una scheda oggetto

Implementato il 21 ottobre 2026 nella V5. Dalla scheda di un oggetto generico attivo: **Altre azioni → Conserva come documento della casa**.

## Comportamento

Il riepilogo consultabile prima della scrittura elenca i documenti diretti e quelli delle spese collegate, senza duplicati, con le relative spese. Mostra anche il nome originale quando diverso dal titolo, per distinguere per esempio due voci “Fattura”. Si scelgono i documenti da conservare; gli originali, le spese e i dati economici restano gli stessi. Si rimuovono soltanto i riferimenti personali all’oggetto corrente. La classificazione valida già presente resta invariata; se manca un’organizzazione corrente, si registra la scelta manuale generica in Altri documenti della casa, senza dedurre la tipologia dal nome.

L’opzione **Archivia anche la scheda oggetto e toglila dalle stanze** è inizialmente disattivata. Richiede tutti i documenti selezionati, nessuna fonte non consultabile e nessun altro riferimento a documenti, attività o costi residuo. Archivia la scheda e svuota la sua posizione; il ripristino della scheda resta disponibile, con stanza da riassegnare. Senza questa opzione la scheda e la stanza restano.

La conferma conduce a Documenti → Della casa con messaggio di esito. I documenti possono essere nei rispettivi gruppi: non è una nuova cartella né una copia dei file. Annulla non scrive. Importi, date, fornitore, provenienza e allegato delle spese non cambiano; versione e storia delle spese registrano il cambio di attribuzione.

## Sicurezza e limiti

- Solo oggetti generici personali; caldaie native escluse. Massimo 50 documenti per riepilogo.
- Sessione, Origin/CSRF, contesto account, membership e diritto di modifica verificati sul server. Oggetti/fonte privati altrui non accessibili; collegamenti non consultabili non espongono titoli.
- Originali correnti verificati per versione/SHA e diritto di lettura. Token del riepilogo vincolato a scheda, posizione, collegamenti, costi, organizzazioni e blocchi; modifiche concorrenti richiedono un nuovo riepilogo.
- Documento con altri collegamenti personali a oggetti/caldaie, attribuzione nativa di spesa o analisi caldaia riuscita: operazione bloccata, nessuna rimozione implicita da altre schede.
- Elaborazioni di acquisizione/prodotto in corso, incerte o orchestrazioni automatiche pendenti: operazione bloccata. Nessuna cancellazione di lavori o nuova analisi AI.
- Transazione atomica col lock G1 della casa, lock delle fonti, storia collegamenti/archivio/posizione e chiave di idempotenza. Replay ricontrolla permessi e fonte/versione/SHA; risposta persa ritentata con stesso corpo e chiave. Nessun nuovo documento, oggetto o costo canonico.
- Non elimina schede/file, non unisce oggetti e non migra dati tecnici su documenti. I dati della scheda archiviata restano nella sua storia. Eventuali conferme future di bozze restano scelte esplicite nel flusso ordinario.

## Verifiche

Backend: suite `house-documents.integration.test.cjs`, `home-objects.http.test.cjs`, `home-objects.integration.test.cjs`: 21 test passati su fixture isolate con pulizia scoped; archivio unico verificato anche dalla ricerca server. Coperti preservazione originali/importi, archivio/ripristino, altre risorse, token scaduto, multioggetto, elaborazione automatica pendente, privacy, viewer, CSRF/contesto e replay.

Frontend: `KeepHouseDocuments.test.tsx` e `objects.test.tsx`: 29 test passati con backend simulato; menu, annullamento, conferma esplicita, opzione archivio, ritorno e retry stessa chiave. Build e lint V5. Browser desktop 1366×900 e mobile 390×844 con due PDF/costi sintetici, annullamento e conferma; nessuna AI live. Dati reali verificati separatamente in sola lettura.
