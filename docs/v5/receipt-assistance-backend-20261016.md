# Ricevuta assistita — avanzamento backend

## Incremento R2: bozze manuali persistenti e policy

16 ottobre 2026. Specifica consolidata receipt-assisted-spec-v1.md. Primo nucleo offline nel commit0bd30d4: dieci test verdi su evidenze e totali semplici, provenienza e confronti conservativi, candidati scoped senza associazioni per solo nome.

Implementate ReceiptDraft e ReceiptRequest con migrazione20261016114500_receipt_drafts: solo nuove tabelle, FK Restrict, indici scoped e ledger univoco; check su versione, snapshot SHA, stato/modalità e forma JSON. Nessuna modifica alle tabelle/dati esistenti. Applicata soltanto a dimora_v5_product_dev su127.0.0.1:55432 dopo assertDevelopmentDatabase. Client rigenerato fermando solo il PID corrispondente al registro/porta/percorso Node; launcher ha ripristinato l'API V5. Nessuna modifica a .env, provider o sicurezza.

Service e controller implementati, ma **ReceiptAssistanceModule non importato in AppModule**. Non sono endpoint disponibili nel servizio di produzione locale: provati in un harness Nest su porta effimera127.0.0.1 con controller/sessione/CSRF reali e database V5. Capabilities del nuovo service enabled=false, manualEnabled=false, providers=[] fino al completamento dei gate. Non presentare questa fase come ricevuta assistita utilizzabile.

### Trasporto R2 implementato nel modulo non ancora attivo

Base /api/v5/homes/:homeId/receipt-assistance. Cookie e X-Account-Context; POST richiedono Origin, CSRF e Idempotency-Key16–100 caratteri [A-Za-z0-9_-].

| Risorsa | Input / risultato |
| --- | --- |
| GET capabilities | Query vuota; apiVersion receipt-assistance-v1, enabled=false, manualEnabled=false, providers=[], disabledReason receipt_assistance_in_development, today/asOf/timeZone Europe/Rome. |
| POST manual-drafts | documentId soltanto;201 {draft}; nessun campo estratto accettato dal client. Riutilizza una bozza manuale open/parked dello stesso snapshot. |
| GET drafts/:id | Query vuota;200 {draft}, soltanto creatore/account/Home e membership attuale. |
| POST drafts/:id/park | expectedVersion;200 {draft}, open→parked. |
| POST drafts/:id/reopen | expectedVersion;200 {draft}, parked→open. |

Draft: id/homeId/version/mode/state, documentLink linked/unavailable con documento{id,name} o null, snapshot{documentId,documentVersion,sha256} o null, fields/total, permissions, createdAt/updatedAt. In manuale fields={}, total=null. Nessuna estrazione automatica dalla creazione della bozza.

Quando la fonte diventa privata/non disponibile o cambia versione/hash: GET conserva solo metadati della bozza personale, documentLink unavailable, snapshot null, fields={}, total=null, sola permission read. Nessun ID/nome/hash/citazione/valore della fonte non autorizzata. Le mutazioni e i replay richiedono fonte attuale valida e altrimenti403. Anche la riga DocumentVersion è bloccata FOR SHARE durante il controllo.

Transazione con lock account/Home e membership come servizi esistenti. Ledger registra digest/body canonico e riferimento bozza, non una risposta privata storica. Ripetizione ricontrolla accessi e proietta dati correnti; stessa chiave con body diverso409 idempotency_conflict. Versione/stato errato409 receipt_draft_version_conflict/receipt_draft_state_conflict. Nessuna modifica di oggetti o spese in questo incremento.

### Prove

- Build TypeScript e lint backend verdi.
- Test HTTP/DB su fixture sintetiche isolate: sessione/CSRF; manuale vuoto persistente e replay concorrente; nuova chiave senza seconda bozza; body diverso; account/Home/documenti privati; park concorrente e versioni; reopen/replay; revoca fonte con redazione e replay negato; originale cambiato; viewer e membership revocata.7 test conteggiati da node:test (suite padre più6subtest), nessuno skip.
- Dopo aggiunta del lock DocumentVersion: build e gli stessi7test ripetuti una volta, verdi. Contatori AiAttempt/EconomicAiAttempt invariati. Nessun file fisico caricato o analizzato: documenti della fixture sono metadati sintetici, non prova di apertura/storage/OCR.
- Test registrato in test:receipt-db e test:integration. Fixture ripulite solo tramite ID creati nel test. Nessun reset o cancellazione di dati personali.

### Prossimo incremento e limiti

Marca/modello/provenienza degli oggetti generici, confronti persistenti, decisioni e loro riapertura, matching paginato, conferma transazionale che riusa costo/oggetto e storia; nessuno di questi risulta già implementato da R2. Poi job/fixture validata, integrazione frontend Claude e contenitori, policy/fonti/proiezioni/export. Solo dopo gate DB/HTTP/browser si importa il modulo nell'app e si annuncia capabilities. Anthropic reale resta disabilitato: nessuna campagna personale o budget precedente riutilizzati.


## R3 — campi e confronti persistenti, raccolta Claude

Consegna Claude completa verificata tramite indice finale e worktree pulito. Integrati esclusivamente636b96a→6403a81,65602ff→856e598,22baab1→f6c2cce,2490a45→de459bb. Tutti i file nelle directory assegnate, nessun sync.34test originali rieseguiti nel master verdi; componenti non ancora agganciati a route/API. Demo e screenshot sono harness sintetici, non prova del prodotto.

Aggiunte tabelle ReceiptObjectField (nome/marca/modello, origine, fonti/snapshot/versione) e ReceiptComparison (confronto brand/model, target versionato, fingerprint univoco per non duplicare la stessa differenza, stato open/resolved). Migrazione20261016121000_receipt_fields_comparisons solo additiva, applicata al DB V5 verificato; client generato fermando soltanto API registrata e poi launcher/health ripristinati. CHECK su chiavi, origine e presenza/assenza fonti, versioni e valori.

Nel modulo ancora isolato: GET object-fields/:id; GET comparisons con state open/resolved/all, filtri objectId/draftId, limit1–50, cursor legato ad account/Home/filtri; GET comparisons/:id; POST comparisons/:id/resolutions con expectedVersion e action keep_existing/defer, Idempotency-Key. La risposta POST è {draft} aggiornato, confronto riletto con GET. Nessuna sostituzione del valore dell'oggetto. Chiusura dell'ultimo confronto porta partially_resolved→confirmed; rinvio riapre e conserva il valore. Target cambiato409; confronto/fonte/valore non autorizzato redatti oppure mutazione403. Anche nome estratto oscurato se fonte non più leggibile.

Sono implementate lettura e risoluzione dei confronti: creazione di oggetti/campi e confronti attraverso conferma atomica è il prossimo incremento, NON già attiva. La fixture DB costruisce questi dati sinteticamente. AppModule resta senza ReceiptAssistanceModule, capabilities false, nessun provider reale. Tutte le proiezioni G1/S1/storia/export dei futuri dati derivati devono ancora essere allineate prima di attivare la creazione.

Verifiche:9test HTTP/DB (padre+8subtest) verdi con paginazione, cursor cross-account rifiutato, chiusura/rinvio persistenti, CAS, nessuna sovrascrittura, revoca fonte e nomi/campi/confronti oscurati, mutazione negata. Ripetuti dopo ulteriore caso revoca della fonte del campo. Backend build/lint verdi.

Revisione Codex frontend: chiuso focus loop Tab/Shift+Tab nel dialogo; parser importi rifiuta «1 2»/«1€2» invece di concatenarli; selezione di oggetto o spesa scomparsi blocca il payload senza crash anche con arricchimento disattivo.38test mirati verdi e typecheck/lint verdi dopo le correzioni. Build completa verde prima dell'ultima guardia target; entry492,67kB immutata perché componenti non referenziati. Non ripetere build finché non cambia integrazione: typecheck finale è già verde. Nessun collaudo browser/API del nuovo frontend ancora svolto.


## R4 — conferma atomica e recupero dell'esito

Aggiunto parser rigoroso confirmation.ts e POST drafts/:id/confirmations, ancora solo nel modulo isolato. Body: expectedVersion, object e expense indipendenti. object.action skip; create{values{name,brand,model},origins{name,brand,model}}; reuse{targetId,targetVersion,fields[{field:brand|model,action:accept|manual|keep_existing|defer|skip,value solo manual}]}. expense.action skip; create{values{title,amountCents,spentOn,supplier},origins{title,amount,date,supplier}}; reuse{targetId,targetVersion}. Origini manual/extraction/null, validate contro valori reali e proposte server: non fidate dal client. Nessun accountId, conteggio o citazione arbitraria ammessi. Il container rimuoverà draftId del payload UI perché è già nel path.

Nuovo ReceiptDraft.confirmation JSONB nullable, migrazione20261016124500_receipt_confirmation additiva applicata solo al DB V5 verificato. Conserva solo contatori e ID creati/riusati; la proiezione rilegge i riferimenti con permessi attuali. draft.confirmation restituisce newObjects/newExpenses, object{id,name} o null, expense{id,title,amountCents} o null, openComparisons. Fonte non autorizzata: confirmation=null insieme a snapshot/proposte redatti.

Transazione unica con lock account/Home e fonte/snapshot/versioni target: crea o riusa oggetto generico, marca/modello/nome con provenienza, link originale G1, costo tramite ExpensesService.mutateInTransaction canonico e link oggetto S1, provenienza economica/storia/ledger e chiusura bozza. Riuso costo non cambia importo/data/titolo; permette soltanto link mancanti coerenti. Documento diverso o oggetto già diverso409, nessuna riassegnazione. La creazione controlla link espliciti da documento e dal relativo costo; un costo già collegato non viene ricreato. Un errore tardivo annulla anche campi/eventi/link dell'oggetto creato.

Tipo generico iniziale other, non appliance inventato dal solo fatto di leggere una ricevuta: nessuna classificazione tipo verificata nel contratto attuale. Il tipo è modificabile dalla scheda G1. Categoria del costo purchase_replacement, EUR e giornata server. Le proposte con origine dichiarata extraction devono corrispondere al valore e alle fonti della bozza verificata; bozza manuale non può assegnare origine AI.

Fingerprint conflitto legato a fonte/versione/hash/campo/valore normalizzato, indipendente dall'ordine/formattazione della citazione. Risolto non riaperto dalla stessa evidenza in una nuova analisi. Chiusura dei confronti riallinea anche bozze precedenti dello stesso oggetto, evitando partially_resolved obsoleti.

GET drafts/:id/confirmation richiede Idempotency-Key header e query vuota: status confirmed con draft aggiornato se ledger confirm trovato, altrimenti not_found; accesso e fonte attuali richiesti. Serve alla verifica di una risposta di rete persa, senza ripetere ciecamente l'operazione. Stessa chiave/body una sola mutazione; stessa chiave/body diverso409; nuova chiave su bozza già confermata409.

Prove: build/lint backend verdi,12test offline (10precedenti+2DTO) verdi,15test HTTP/DB (padre+14subtest) verdi,7regressioni offline economic-documents/home-objects verdi. Casi aggiunti:1/1 concorrente e replay; recupero/not_found; errore tardivo con rollback completo; riuso costo499euro/16giugno preservato e CAS spesa;1/0,0/1,0/0; conflitto rinviato→risolto e rianalisi senza riapertura/duplicazione; fonti/versioni/origini false; target altrui e relink ad altro documento negati. Fixture di proposte estratte sono seed trusted per collaudare orchestrazione, NON prova di analisi PDF/provider. Contatori AI invariati, fixture eliminate solo per ID creati dal test.

Residui prima attivazione: protezione delle nuove provenienze/nome derivato su TUTTE le proiezioni G1/S1/storia/export e aggiornamento export delle nuove entità; candidati paginati e link originali con snapshot attuale, deduplica tra due Document ID con medesimo hash leggibile; avvio/job fixture e adapter API/frontend, collaudo browser reale. Non attivare il modulo prima dei gate. Nessuna campagna live.


## R5a — privacy trasversale dei nomi derivati

Aggiunta policy condivisa receipt-assistance/access.ts: il nome estratto richiede fonte attualmente leggibile nella stessa Home e versione/hash corrispondenti. Catalogo G1 applica il predicato SQL prima di ricerca e LIMIT; dettaglio, storia e link negano la scheda non autorizzata. S1 oscura il riferimento senza cancellare il costo personale. Export omette oggetto/riferimenti/storia esclusi e ricontrolla i proof catturati dopo lo snapshot RepeatableRead, anche se il campo corrente nel frattempo viene reso manuale. Nessuna migrazione nuova.

Rinomina manuale G1 converte la provenienza del solo nome in user_declared e rimuove fonti/snapshot precedenti. Per oggetti con campo nome ricevuta, la cronologia G1 e JSON mostra il nome attualmente autorizzato invece del nome storico privo di proof per evento; limitazione export receipt_object_history_uses_current_name. Evento receipt_fields_confirmed riconosciuto dalla allowlist export. I valori confermati delle spese restano personali secondo contratto S1 esistente; non sono cancellati da una revoca della fonte.

Prove finali: build/lint backend verdi;37test DB/HTTP e regressioni G1/S1 (17ricevuta,8G1,12S1 incluse suite padre) verdi;16unit delle aree export/G1/S1 verdi. Due nuove prove coprono privacy trasversale, rinomina/replay/storia e revoca dopo snapshot con sostituzione concorrente del campo. Prima esecuzione delle nuove fixture fallita per fonti vuote non ammesse dal CHECK, fixture corretta; esecuzione finale verde. Solo dati sintetici ripuliti per ID propri, contatori AI invariati. Frontend invariato, nessuna prova browser nuova. API registrata non riavviata in questo incremento: prove usano classi compilate/harness, non annunciare nuovo comportamento nel servizio già avviato.

Residui R5b: export esplicito campi/confronti ricevuta con allowlist e fonti attuali; API candidati paginati; deduplica hash fra DocumentID. Poi job/adapter/container/browser. Modulo ricevuta ancora NON importato in AppModule; capabilities false. Claude già raccolto completamente. Nessun provider/email/.env/legacy/push.


## R5b — export dei campi e confronti ricevuta

JSON personale v1 esteso in modo additivo con due array data.receiptFields e data.receiptComparisons. Mapper allowlist esplicita: campi id/objectId/fieldKey/value/origin/version/date e fonti autorizzate; confronti id/objectId/fieldKey/targetVersion/state/version/date e proposed{value,sources}. Nessun dump di draft/proposed, fingerprint, token o account aggiuntivo. Le citazioni sono legate allo snapshot persistito, verificate rispetto ai soli originali propri inclusi nel JSON; una fonte condivisa leggibile può sostenere il valore ma i suoi riferimenti/estratti restano esclusi dall'export personale. Fonte revocata o hash/versione cambiati esclude il campo/confronto. Proof catturati prima dell'export sono ricontrollati anche dopo lo snapshot. Letture nel budget cumulativo righe/byte; nessuna troncatura.

Controllo aggiuntivo S1: i totali filtrati per ambiente non correlano un costo a un oggetto dal nome derivato non autorizzato. Il costo personale resta in Spese e mantiene importo/data; viene esclusa soltanto la correlazione tramite quella scheda. Test reale DB prima/dopo revoca: totale ambiente123centesimi→0; dettaglio costo ancora123.

Verifiche dopo ultime modifiche: build/lint BE verdi;30test DB/HTTP ricevuta+S1 verdi (18ricevuta,12S1 incluse suite padre). Nuovo caso JSON controlla provenienza, confronto aperto, whitelist, hash cambiato e conservazione dell'oggetto manuale. Privacy fixture estesa con filtro ambiente. Test G1 e16unit verdi nell'incremento R5a precedente, non ripetuti perché invariati in R5b. Nessun frontend/browser/provider reale, file personali o .env toccati. API registrata non ancora riavviata, modulo sempre isolato e capabilities false. Restano API candidati, dedup hash, job/adapter/frontend e browser.


## R5c — candidati paginati e deduplica dell'originale

Due rotte aggiunte nel modulo isolato: GET drafts/:id/object-candidates e expense-candidates. Query solo limit1–50 (default20) e cursor. Risposta {items,linkedCount,nextCursor}. Cursor legato ad account/Home/tipo/bozza/versione/snapshot, rank e ID; ordinamento rank decrescente/ID crescente. Risultati riletti con permessi attuali, nessuna preselezione server. linkedCount conta solo oggetti/costi leggibili collegati a questo originale, anche oltre la prima pagina: il futuro adapter NON deve dedurre unicità da un solo elemento nella pagina.

Oggetti personali attivi: collegamento esplicito stesso DocumentID prioritario, poi stesso SHA256 originale leggibile, poi marca+modello normalizzati entrambi leggibili; infine altre schede personali disponibili per scelta manuale senza ragione di matching. Nome da solo non conta. Posizioni mostrano nomi ambienti della Home; nessuna nota o dato altrui. Costo: personali attivi senza documento oppure associati allo stesso originale leggibile; altri documenti esclusi. Importo/data da soli non danno identità. reasons same_document/same_original/same_brand_model, linkedToDocument vero per stesso documento o stessa copia originale. Le voci non compatibili restano scelte manuali, da esplicitare nel copy frontend (non chiamare tutte compatibili).

Conferma controlla anche copie caricate con DocumentID diversi ma SHA256 identico, nella stessa Home e con documento attualmente leggibile. Nessun confronto hash o deduplica fra account o fonti private altrui. Una seconda creazione viene respinta; riuso esplicito conserva il documento canonico del costo e importo/data/titolo, aggiungendo soltanto il collegamento mancante della nuova copia all'oggetto. Lock account/Home serializza due conferme contemporanee delle copie: una sola coppia oggetto/costo. Boiler resta nel percorso tecnico preesistente, non viene convertito in oggetto generico.

Fingerprint dei confronti aggiornato a receipt_evidence_v2 + SHA256 + campo + proposta normalizzata, nello scope oggetto/account/Home. Un'altra copia byte-identica non riapre una differenza già risolta. Nessun backfill/migrazione richiesto per il modulo ancora non attivato; fixture sempre ripulite. Hash fixture ora distinti per documento salvo copie intenzionali.

Verifiche finali build/lint BE e22test DB/HTTP ricevuta verdi (padre+21subtest), incluse quattro nuove prove: pagina oltre la prima e ranked ambiguity, linkedCount2 con pagina1, cursor scope/versione/tipo e limit rifiutati, privacy nomi/campi/candidati, duplicato DocumentID, concorrenza copie, confronto risolto non riaperto, fonte privata/hash uguale senza leak/blocco fra account. Un'asserzione iniziale assumeva soltanto due match Lume/Mini90: fixture precedenti contenevano altri match validi; corretta per verificare entrambi prima del nome-solo, senza imporre una falsa unicità. Nessuna chiamata provider o lettura documento reale. Frontend invariato, nessun browser nuovo; modulo NON importato in AppModule, capabilities false, servizio registrato non riavviato in R5c.

Prossimo R6: job asincrono ricevuta con provider fixture esplicito e PDF sintetico, output validato dal parser ricevuta prima della persistenza; nessun fallback mock reale e Anthropic non attivato. Poi adapter/container/route lazy e browser. Adapter deve usare linkedCount per impedire preselezione su pagina parziale, dare copy same_original, non chiamare compatibili le schede con reasons vuote; filtri correnti e esiti/retry stabili. Proposte e candidato endpoint adesso esistono solo nel backend isolato, non dichiarare analisi utilizzabile.
