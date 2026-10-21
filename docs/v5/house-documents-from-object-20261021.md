# Conservare documenti nella casa da una scheda oggetto

Implementato e semplificato il 21 ottobre 2026 nella V5. Dalla scheda di un oggetto generico attivo: **Altre azioni → Sposta in Documenti della casa**. La seconda revisione sostituisce l’archivio facoltativo iniziale, su richiesta dell’utente.

## Comportamento

Il riepilogo consultabile prima della scrittura include tutti i documenti diretti e quelli delle spese collegate, comprese le fatture, senza duplicati. Mostra titolo, nome originale e spese conservate. Quando una fattura o la sua spesa è collegata anche ad altre schede generiche personali, mostra i loro nomi autorizzati e spiega che quei collegamenti verranno rimossi. Una sola conferma **Sposta e archivia scheda** autorizza l’intero spostamento; nessuna selezione parziale o seconda casella di archivio.

Lo spostamento archivia sempre la scheda corrente e svuota la sua posizione: scompare dagli oggetti attivi e dalle stanze. Resta ripristinabile dagli archiviati, con stanza da riassegnare. Le altre schede mantengono il loro stato. Tutti i documenti devono essere disponibili e inclusi; attività o costi senza documento residui richiedono prima la gestione dei relativi collegamenti.

Originali, spese e dati economici restano gli stessi. Si rimuovono i riferimenti personali dei documenti e delle loro spese alle schede elencate nel riepilogo; si registra la storia su ciascuna scheda interessata. La classificazione corrente resta invariata, anche per Fattura/Ricevuta. Se manca un’organizzazione corrente, si registra la scelta manuale generica in Altri documenti della casa, senza dedurre la tipologia dal nome.

La conferma conduce a Documenti → Della casa con messaggio di esito. I documenti possono essere nei rispettivi gruppi: non è una nuova cartella né una copia dei file. Annulla non scrive. Importi, date, fornitore, provenienza e allegato delle spese non cambiano; versione e storia delle spese registrano il cambio di attribuzione.

## Sicurezza e limiti

- Solo oggetti generici personali; caldaie native escluse. Massimo 50 documenti per riepilogo.
- Sessione, Origin/CSRF, contesto account, membership e diritto di modifica verificati sul server. Oggetti/fonte privati altrui non accessibili; collegamenti non consultabili non espongono titoli.
- Originali correnti verificati per versione/SHA e diritto di lettura. Token del riepilogo vincolato a scheda, posizione, collegamenti, costi, organizzazioni e blocchi; modifiche concorrenti richiedono un nuovo riepilogo.
- Collegamenti ad altre schede generiche consentiti soltanto con fonti/nome accessibili, token aggiornato e consenso server `detachRelatedObjects:true`, dopo il riepilogo. Storia e versione delle spese aggiornate per la loro attribuzione effettiva, senza nuove spese o modifica degli importi.
- Collegamenti nativi a caldaie, attribuzioni native di spesa, analisi caldaia riuscite o fonti non consultabili restano bloccati. Nessun nome privato esposto e nessuna rimozione forzata aggirando il riepilogo.
- Elaborazioni di acquisizione/prodotto in corso, incerte o orchestrazioni automatiche pendenti: operazione bloccata. Nessuna cancellazione di lavori o nuova analisi AI.
- Transazione atomica col lock G1 della casa, lock delle fonti, storia collegamenti/archivio/posizione e chiave di idempotenza. Replay ricontrolla permessi e fonte/versione/SHA; risposta persa ritentata con stesso corpo e chiave. Nessun nuovo documento, oggetto o costo canonico.
- Non elimina schede/file, non unisce oggetti e non migra dati tecnici su documenti. I dati della scheda archiviata restano nella sua storia. Eventuali conferme future di bozze restano scelte esplicite nel flusso ordinario.

## Verifiche

Backend: suite `house-documents.integration.test.cjs`, `home-objects.http.test.cjs`, `home-objects.integration.test.cjs`: 23 test passati su fixture isolate con pulizia scoped; archivio unico verificato anche dalla ricerca server. Coperti preservazione originali/importi, archivio automatico/ripristino, altre risorse, token scaduto anche su altra scheda, fatture acconto/saldo multioggetto, consenso mancante, fonti private di altre schede, riferimenti nativi, elaborazione automatica pendente, viewer, CSRF/contesto e replay. Il vecchio replay già registrato prima della revisione resta compatibile; nuove conferme senza archivio sono rifiutate.

Frontend: `KeepHouseDocuments.test.tsx` e `objects.test.tsx`: 29 test passati con backend simulato; menu, annullamento, singola conferma con archivio automatico e consenso ai collegamenti correlati, ritorno e retry stessa chiave. Build e lint V5. Browser desktop 1366×900 e mobile 390×844 con due fatture/costi sintetici e altra scheda conservata; nessuna AI live. Dati reali verificati separatamente in sola lettura.
