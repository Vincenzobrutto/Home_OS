# Planimetrie agenzie — incremento integrato nel branch, 30 ottobre 2026

## Stato concreto

Codice in `backend-v5/src/agency-plans` e componente isolato `frontend-v5/src/agency-plans`. Non registrato in AppModule, nessuna route HTTP o navigazione prodotto attivata. Non è un rilascio. Demo Alessio invariata. Nessuna libreria installata o chiamata AI a pagamento durante questo incremento. Originali, immagini e geometrie reali restano fuori Git.

Implementato:
- raster TypeScript senza dipendenze di imaging esterne: componenti connesse, semi alternativi, morfologia configurata, contorni/vuoti e deduplicazione; limiti dimensionali e rifiuto delle regioni che fuggono al bordo;
- orchestrazione inventario AI → segmentazione → controllo AI → ricostruzione, con autorizzazioni correnti prima/dopo le operazioni, scope e SHA/versione/pagina; massimo due generazioni nel percorso implementato;
- adapter provider con PNG lossless/overlay generati localmente, conteggio preventivo dei token, tetto di spesa, output JSON e uso fatturato restituito anche se la risposta è incompleta. Trasporto HTTP, credenziali e ledger persistente sono porte da collegare, non chiamate globali implicite;
- conservazione di un simbolo valido della prima fase se il controllo, per lo stesso id/genitore e decisione di inclusione, produce semi invalidi. Il mantenimento è segnalato e non vale come conferma umana;
- geometria/calibrazione con quota di controllo, area meno vuoti, inserimento/eliminazione vertici e controllo sovrapposizioni;
- motore commerciale con righe, coefficienti e problemi espliciti; totale finale nullo quando mancano dati o conferme;
- snapshot e modifiche nello store AgencyPractice esistente: CAS, replay, fonte privata e invalidazione su nuova versione. Non contiene bytes o nuove tabelle. Modifiche manuali conservano fotogramma precedente e motivazione; computo invalidato se cambia la geometria;
- componente controllato con due viste **Singoli vani / Perimetro commerciale**, geometrie indipendenti, vuoti, vertici, undo, zoom e confronto con originale. Cambiare scope smonta editor/storico per evitare dati di un documento sul successivo.

## Due basi di computo, mai sommate

1. **Vani + muri:** superfici interne dei singoli vani più componenti fisiche dei muri dell'unità principale, ciascuna contata una volta. Le fasce dei muri devono essere definite e classificate, non si ricavano affidabilmente dalla sola somma dei vani. Gli accessori usano la propria base dichiarata senza conteggiare due volte i loro muri.
2. **Perimetro lordo principale:** comprende già vani e muri interni. Il dettaglio dei vani rimane disponibile per uso e verifica, ma non si somma al perimetro. Le componenti dei muri servono soltanto a sottrarre quote non computabili (comunione/eccedenza spessore), non ad aggiungere nuovamente area. Pertinenze esterne ponderate separatamente.

Il perimetro lordo NON viene inventato come inviluppo convesso o rettangolo della segmentazione. Lo snapshot automatico parte con `mainPerimeter:null`; serve una definizione/revisione esplicita del contorno lordo. Il componente demanda l'avvio della sua definizione al contenitore: disegno iniziale e rilevamento automatico dell'esterno restano da collegare. La modalità perimetro supportata è per il corpo principale al100%; categorie principali miste richiedono la base vani+muri, senza ignorare coefficienti differenti.

## Profilo commerciale fornito dal committente

Identificativo `agency_commercial_custom`, versione scelta dall'agenzia. Non etichettarlo superficie catastale, DPR138/98 o criterio nazionale universale.

| Categoria | Coefficiente |
| --- | --- |
| Principali/accessori diretti |100%|
| Soppalco/veranda rifiniti |80%|
| Mansarda, quota dichiarata almeno2,40m |75–80%|
| Sottotetto non abitabile,1,50–2,40m |35%|
| Taverna/seminterrato abitabile |60%|
| Balcone/terrazza scoperti |25%|
| Balcone coperto/patio/portico |35–50%|
| Giardino/area scoperta |10–15%|
| Cantina/soffitta non collegata |20–25%|
| Garage |50–60%|
| Posto auto scoperto |25%|

Intervalli senza scelta: nessuna media nascosta; computo incompleto. Scelta esplicita motivata e salvata. Le porzioni con altezza nota sotto1,50m hanno contributo0; altezza non letta/non confermata non viene inventata. Per categorie che richiedono finitura/qualificazione abitativa il motore richiede conferma esplicita; non la deduce dall'etichetta o dall'altezza. Non certifica abitabilità.

Muri dell'unità principale: interni/esclusivi100%, spessore computabile massimo0,50m; comunione50%, riferimento0,25m. Per evitare un'ambiguità di input, `commonWallCapBasis` deve dichiarare se0,25m limita lo spessore fisico prima del50% oppure la quota di spessore già attribuita. Nessuna scelta implicita; da concordare nel profilo reale. Le geometrie dei muri sono non sovrapposte e dichiarate di spessore uniforme; intersezioni ai nodi richiedono partizione, non somme di strisce sovrapposte. Muri sconosciuti o copertura non confermata bloccano il totale. Nessun incremento forfettario5% applicato automaticamente.

Fonti consultate il30ottobre2026:
- [Allegato C DPR138/1998, fonte MEF](https://def.finanze.it/DocTribFrontend/executePrintArticolo.do?articolo=Allegato+C&codiceOrdinamento=60C+++++0000000&id=%7BCE130656-7850-4531-9B95-F17CC19790C4%7D): disciplina la superficie **catastale**, con coefficienti e scaglioni diversi; non è l'algoritmo commerciale qui implementato.
- [Borsino/FIMAA Como](https://www.borsino-immobiliare.com/pagina/calcolo-della-superficie-commerciale-dell%E2%80%99immobile): proprio criterio commerciale, ad esempio balconi30% e altri intervalli differenti.
- [Requot](https://www.requot.com/calcolo-superficie-commerciale.html): ulteriore metodo commerciale con percentuali/scaglioni diversi. Non trattare le fonti come un unico profilo normativo.

## Sicurezza e persistenza

`analyzePlan` richiede contesto fresco e fonte floor_plan leggibile; scope account/agenzia/pratica immutabile tra le fasi. Il fingerprint comprende documento/versione/SHA/pagina, raster effettivo con SHA e dimensioni, parametri e versione pipeline. Il raster è validato prima di riservare/chiamare AI. Nessun riuso di HomeMembership.

`AgencyPracticesStore.savePlan/readPlans/editPlan` sono metodi **interni**, non endpoint. Le mutazioni hanno revisione pratica e versione analisi, ledger e motivazione. Fonte privata nasconde anche geometrie/computi agli altri agenti/admin. Fonte sostituita rende vista stale e nasconde geometrie correnti; il replay non aggira la verifica. Lo snapshot dello storico non è esposto dall'API generica delle pratiche. Prima di un futuro endpoint servono parser esatti/DTO e limite payload: non esporre direttamente il completamento AI o accettare SHA del file attestato dal browser.

Le prenotazioni `run+phase` e le chiamate devono essere rese durevoli prima dell'invio. Le porte del pipeline le richiedono, ma questo incremento non implementa il ledger job sul DB. Non è quindi lecito collegare il trasporto reale direttamente ai callback senza implementare lease/stati, autorizzazione e budget. Risposta di rete incerta: nessun retry automatico. Uso fatturato registrato anche con JSON invalido.

## Verifiche

Suite dedicata `npm run test:agency-plans`, inclusa nell'aggregato ordinario. Test sintetici su geometria, semi, esterni, duplicati, scala, coefficienti, muri, basi alternative, privacy/replay, budget/provider e regressione dei simboli. Suite frontend8/8, typecheck app/node e lint mirato verdi con cache private `.agency-cache` e dipendenze già installate; nessuna installazione nella junction.

Regressione backend419/419 dopo44nuovi test. PostgreSQL dedicato: prima7/7 sul nuovo store; poi profilo combinato store preesistente+nuovi casi,21/21 in `dimora-offline-BSSeKo`, cluster fermato. Primo tentativo DB non trovava un file nuovo non ancora registrato nell'indice; nessuna modifica di assert, corretto staging e rilanciato su nuovo cluster. Profilo `test:agency-plans-db` ora comprende entrambi i file, mai DB esistenti.

Replay privato offline dei due output AI già raccolti sul documento reale: nuovo motore trova11regioni, zero problemi nel proprio controllo, deduplica balcone e conserva il caminetto valido della prima fase. Nessuna chiamata provider o scrittura applicativa; contesto autorizzativo sintetico nel solo harness, non analisi autentica persistita. PNG aperto e controllato visivamente. Non è nuova prova live né benchmark su più documenti.

Browser: harness sintetico separato `tests/agency-plan-preview.html`, due viste verificate, aggiunta sul lato di chiusura4→5punti e undo, ritorno ai vani conservati. Controllo desktop e375px, nessun overflow pagina osservato; screenshot privati in outputs. Non prova API né salvataggio end-to-end.

## Prossimi task necessari per la funzionalità utilizzabile

1. Upload/storage bytes delle fonti agenzia e rasterizzatore fidato (PDF/pagine/ritagli/trasformazioni), con accessi e hash server-side; nessun riuso implicito di Document Home.
2. Job/lease/ledger persistenti e trasporto provider autorizzato, riserva/costo/versione prezzi e stati incerti. Non riusare il budget sperimentale: riserva prudenziale4EUR già impegnata, nessun nuovo invio automatico.
3. Endpoint/sessione/CSRF con parser stretti e test HTTP offline. Cablaggio del componente alla navigazione pratiche e alle mutazioni; form calibrazione/coefficienti/copertura e gestione dei conflitti.
4. Definizione iniziale e revisione del perimetro lordo e classificazione fasce dei muri; definire con Vincenzo base del limite25cm e scelte negli intervalli. Questi input mancanti mantengono il report incompleto, non richiedono valori inventati.
5. Prove su planimetrie diverse autorizzate e più esecuzioni, compresi muri interrotti, simboli, risoluzioni e unità multiple. Parametri del caso reale non universali: il profilo raster ha una versione esplicita.

Nessuna attivazione, merge, deploy o modifica della demo Alessio in questo incremento.
