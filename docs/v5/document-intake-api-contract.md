# Archivio assistito — contratto V1 (baseline componenti)

16 ottobre2026. Specifica: document-intake-spec-v1.md. Baseline catalogo e semantica per lavoro parallelo; trasporto qui progettato NON ancora attivo. Capabilities devono restare disabilitate finché persistenza/upload/revisione non superano collaudo. Nessuna nuova funzione live annunciata da questo documento.

## Identità e tipi condivisi

Account/Home da sessione e contesto autenticato, mai dal payload di organizzazione. ID opachi UUID; versioni interi positivi. Snapshot documento `{documentId,documentVersion,sha256}`; parte solo server, non modificabile dal browser.

Collection: energy | building | technical | condominium | purchases | utilities | unclassified.
Kind → collection:
- ape, energy_certificate → energy
- cila, scia, building_permit, habitability, agibility → building
- system_diagram, conformity_declaration, system_booklet → technical
- condominium_rules, condominium_minutes, millesimal_tables → condominium
- receipt, invoice, warranty, manual → purchases
- utility_bill → utilities
- other → unclassified

La collezione è derivata dal tipo; un PDF può appartenere a più collezioni tramite parti diverse. Il manuale di un impianto può essere anche collegato alla scheda tecnica senza riscrivere il catalogo. `manual` è un tipo documentale distinto da origin:user_declared.

ClassificationPart: `{kind, pageFrom:number|null, pageTo:number|null}`. Entrambi null consentiti nella classificazione manuale dell'intero documento; intervallo1-based inclusivo, verificato contro pageCount del parser quando noto. Nessuna pagina inventata se ignota. Max12parti; tuple duplicate respinte, intervalli sovrapposti di tipi diversi ammessi se approvati. Estratto della proposta separato `{page,excerpt}`; il server lo verifica sul testo e non lo prende per buono dal client.

OrganizationSelection: `{title:string, parts:ClassificationPart[], target:{kind:'home'}|{kind:'object'|'boiler',id,expectedVersion}, action:'organize'|'defer'}`. Titolo1–120codepoint; defer non contiene altri campi. Niente visibility, accountId, createExpense, createObject, certificazioni o campi AI nei payload. Creazione/modifica di oggetti/costi rimane nei percorsi esistenti. Scelta target valida solo con permessi e stato corrente verificati dal server.

## DTO di lettura per UI

Batch: `{id,version,homeId,state:'open'|'completed',limits,items,permissions,createdAt,updatedAt}`. Max20elementi quindi nessuna paginazione interna in V1; elenco lotti paginato con cursor legato a contesto. State completed soltanto se tutti gli elementi hanno decisione terminale; defer resta aperto/riprendibile.

Item: `{id,clientItemId,version,filename,byteSize,mimeType,uploadState:'pending'|'uploading'|'stored'|'duplicate'|'failed',analysisState:'not_started'|'queued'|'running'|'ready'|'needs_choice'|'unreadable'|'unsupported'|'failed'|'uncertain',reviewState:'unreviewed'|'saved'|'deferred'|'confirmed',documentLink:{state:'linked'|'unavailable',document:{id,name}|null},pageCount:number|null,proposal:null|{title,parts,collections,sources},selection:OrganizationSelection|null,duplicate:null|{itemId:string|null,document:{id,name}|null},error:null|{code,message},permissions}`.

Fonti/target non leggibili: niente titolo/citazioni/selezione/costo/nomi duplicati recuperati dalla cache; segnaposto indisponibile. DTO contabile/provider/job aggiunto soltanto nell'incremento B3, prima del container; Claude non deve inventare budget o provider. UI deve gestire capability enabled:false e originale non apribile senza fallback dati.

## Trasporto previsto, non implementato

Base `/api/v5/homes/:homeId/document-intake`. GET capabilities, GET batches (cursor), POST batches (manifest), GET batches/:id. Sessione, contesto account, CSRF sulle mutazioni e Idempotency-Key come moduli V5 esistenti.

POST batches: `{items:[{clientItemId,filename,byteSize,mimeType}]}`; proprietà soltanto dichiarative, validate nuovamente sui byte. Restituisce `{batch}`. Stessa chiave/payload → stesso lotto; chiave riusata con dati diversi409.

POST batches/:batchId/items/:itemId/file: multipart field file, chiave per elemento e contenuto stabili; prima membership/quota, poi MIME/byte/Defender, snapshot e dedup autorizzata. Un errore è dell'elemento, non del lotto. GET recupera l'esito dopo risposta persa. Dedup prima di scrivere un nuovo originale richiede integrazione con uploadRequest/storage e lock: NON simulare il riuso solo nel browser, NON cancellare copie già presenti. Nessuna dedup fra account o su fonti non leggibili; primo incremento Soloio/uploader corrente, visibilità diverse mai fuse automaticamente.

POST .../review: `{expectedVersion,selection}` salva solo decisione, non organizzazione. POST .../confirmations: `{expectedVersion,items:[{id,expectedVersion}]}` applica soltanto decisioni salvate valide e rilette; risponde risultati per elemento. Ogni elemento atomicamente applicato insieme alla sua richiesta, indipendente dagli errori degli altri; retry batch con stessa chiave recupera esiti, non riapplica elementi conclusi. Payload completo congelato dopo esito incerto, GET esito prima di cambiarlo. Nessuna promessa all-or-nothing sull'intero lotto.

Conferma organization personale versionata con fonte/snapshot. Directory Documenti e dettaglio leggono i metadati solo se fonte corrente; raccolte come filtri esatti, niente riscrittura degli originali o nomi condivisi. Filtri/export fanno parte B2 e vanno verificati prima del rilascio, non lasciati come sola vista post-conferma.

Endpoint job/classificazione, costo aggregato, ripresa da esito paid incerto saranno dettagliati in B3 PRIMA di implementare trasporto frontend; nessun riuso tacito della campagna ricevuta receipt-live-20261016-r1 già consumata. Il frontend isolato espone callback, senza fetch.

## B1a implementato —16ottobre2026
Catalogo/manifest/classificazione/selezione in backend-v5/src/document-intake/domain.ts:7testoffline verdi. Lotti ed elementi normalizzati, migrazione20261016190000_document_intake_batches (21 sul solo DB V5 locale) applicata. Service/controller/modulo isolati per GETcapabilities(enabledfalse)/POSTbatches/GETbatches/:id. Chiavi e digest scoped account/Home, lock per creazione concorrente, ordine elemento persistente, validazione limiti, email verificata ove richiesta, sessione/CSRF/ruolo/membership e nessuna lettura crossaccount. GET da nuova istanza verifica ripresa, manifesto senza file non significa caricamento completato. Riferimenti sorgente atomici vincolati dal DB.
6testHTTP/DB sintetici verdi, nessun file originale letto/scritto e nessuna chiamata AI; conteggi Document e tre ledger AI invariati. Build/lint BE verdi. API registrata riavviata per Prisma Client aggiornato, PG/frontend preservati, nessuna.env modificata. AppModule NON importa DocumentIntakeModule e il servizio live non espone questi endpoint. projection nega fonti stored/duplicate fino a redazione/sourcecheck B1b, niente anteprima o metadati non verificati.
Restano: upload per elemento e deduplica autorizzata/storage, ripresa file falliti/risposte perse, metadati personali confermati+filtri/export, proposte/classificazione/worker/budget, client/container/route e contributo Claude. Non presentare B1a come caricamento massivo pronto o AI funzionante. La campagna ricevuta reale resta chiusa, nessuna nuova spesa autorizzata.
