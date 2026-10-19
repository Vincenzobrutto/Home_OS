## Catalogo compatto — 19 ottobre 2026

GET objects esteso con ordinamento, ricerca autorizzata marca/modello, conteggi e riepiloghi. [Dettagli e semantica dei contatori](object-catalog-layout-20261019.md#api-e-sicurezza).

## Ambienti da planimetria — 19 ottobre 2026

Aggiunti endpoint floor-plan-layouts, bozza privata e conferma atomica verso HomeRoom, senza duplicare gli originali. [Contratto e comportamento](floor-plan-rooms-20261019.md#api-e-persistenza).

# G1 — home-objects-v1: ambienti, oggetti e collegamenti

14 ottobre 2026. G1 integrata e verificata in locale: backend/schema, frontend Claude, client/API e browser reali. Contratto baseline0b12d8a con precisazioni history/importi dei riferimenti durante integrazione. Esito autorevole g1-integration-review.md. Fonte prodotto home-economy-module.md. API H1/H3a e caldaie M3/M4 conservate.

## Scelte

- Ambienti condivisi della Home: owner/member leggono e modificano; viewer legge. Non espongono documenti/garanzie propri. Nome/tipo/note descrivono soltanto l'ambiente.
- Oggetti manuali personali del creatore con membership valida. Le caldaie esistenti restano personali e conservano ID/fonti/versioni/storia; non vengono clonate o convertite in schede manuali. Condivisione degli oggetti è C1, non default G1.
- Catalogo unificato restituisce riferimenti discriminati `{kind:'object'|'boiler',id:UUID}`; l'ID non cambia la sua semantica. Boiler rimanda al dettaglio tecnico già esistente. Metadati posizione aggiuntivi non riscrivono BoilerAsset.confirmed/version/name.
- Posizione facoltativa fino a 20 ambienti della stessa Home; array vuoto = Da collocare. Nessuna stanza sintetica di default creata durante GET. Impianti multiambiente senza copie.
- Collegamenti a documenti/attività/costi sono riferimenti ai dati V5 esistenti, non copie. Per costo/attività un solo oggetto principale in G1; costi multioggetto con quote rimandati. Documento può riguardare più oggetti.
- Oggetto boiler: documenti derivati dalle sue fonti autorizzate, costi/attività nativi da assetId. Non consentire un link manuale a un costo/attività nativo di un'altra caldaia. Oggetto manuale collega costo/attività privi di assetId nativo; non «spostare» dati implicitamente.
- Archiviazione logica di ambienti/oggetti, reversibile. Archiviare non cancella posizione/link/storia/risorse. Ambienti archiviati restano nella posizione esistente con stato visibile; per nuove assegnazioni solo active. Nessuna fusione o hard delete.
- Niente foto/upload nuovi, campi tecnici AI generici, interventi strutturati, categorie economiche o condivisione in questo incremento. Schema e migrazioni additive soltanto nel DB locale dedicato.

## Trasporto/permessi

Base `/api/v5/homes/:homeId`, cookie/CSRF/Origin/X-Account-Context e no-store esistenti. Tutti POST Idempotency-Key 16..100 [A-Za-z0-9_-]; UUID/query/body sconosciuti o ripetuti 422 validation_error. Anonimo401; riferimento/casa valido ma inesistente o non autorizzato403 generico. Resource validation prima di conteggi/paging; risposte private al contesto. Errori409: idempotency_conflict, room_version_conflict, object_version_conflict, placement_version_conflict, link_version_conflict, resource_state_conflict, resource_already_linked. 503 non vuoto o successo.

Membership FOR SHARE e lock transazionali coerenti con V5. Risorse condivise serializzate con lock Home/room oltre al lock account/Home (l'account lock da solo non serializza due membri). Acquisizione lock ordine Home -> account/Home -> risorse ordinate. CAS e richiesta/storia/mutazione atomici. Revoca/scadenza rispettata senza scheduler.

Replays conservano snapshot interno di risultato ma riautorizzano risorsa/collegamenti al momento della risposta. Non restituire nomi/ID di fonti illeggibili da vecchio JSON pubblico. Revoca fonte boiler rende non leggibile quella scheda anche nel catalogo; non contare/generare preview del boiler nascosto. Origine esplicita native/reference, non attesta verifica documentale.

## DTO comuni

Room `{id,homeId,name,type,note,state:'active'|'archived',version,createdAt,updatedAt,permissions:('read'|'edit')[]}`. Tipi kitchen,living,bedroom,bathroom,hall,utility,outdoor,other. Testo NFC trim; name1..80codepoint; note nullable<=500. Nomi uguali consentiti (due bagni); nessuna deduplica per nome o tipo.

Object `{ref:{kind:'object',id},homeId,name,type,note,state:'active'|'archived',version,createdAt,updatedAt,permissions}`. Tipi appliance,heating,cooling,electrical,plumbing,security,fixture,other; name1..120, note nullable<=500. Tipo manuale heating non ha dati certificati caldaia o analisi implicita.

CatalogItem `{ref,name,type,kindLabel,state,permissions,position:{version:number,rooms:Room[]},technicalLink:null|{assetId:UUID}}`. Object type da DTO; boiler type:'boiler', state active per G1, technicalLink assetId esistente; stato conferma tecnica rimane nel dettaglio M3. Posizione versione0 indica mai impostata. Non include conteggi privati o documenti prima dell'autorizzazione. AccountId/ledger/storage mai esposti. Nella lista, summary additivo con brand/model autorizzati e nextActivity nullable (titolo/data della prima attività aperta collegata dell’account corrente); metadati pagina e conteggi come nel report del 19 ottobre.

Pagine `{items:T[],nextCursor:string|null}`; limit1..50 default20; cursor base64url1..2048. Ordinamento createdAt desc,id desc per room; catalogo sort=recent (default) oppure name, con tie-break kind,id. Keyset DB limit+1, nessun fetch integrale. Cursor legato account/Home/risorsa/filtri, non limite. Nessun dato nascosto nei contatori o sommatori.

## Endpoint

| Metodo / risorsa | Input / risposta |
|---|---|
| GET object-capabilities | query vuota; `{apiVersion:'home-objects-v1',enabled:true,isSimulation:false,limits:{nameMaxCodePoints:120,roomNameMaxCodePoints:80,noteMaxCodePoints:500,maxRoomsPerObject:20,maxPageSize:50},types,roomTypes}` |
| GET rooms | state active(default)/archived/all,limit,cursor; pagina Room |
| POST rooms | name,type,note?;201 `{room}` |
| GET rooms/:id | query vuota; `{room}` |
| POST rooms/:id/updates | expectedVersion + almeno name/type/note;200 `{room}` |
| POST rooms/:id/archive oppure restore | expectedVersion;200 `{room}` |
| GET rooms/:id/history | limit,cursor; pagina eventi autorizzati |
| GET objects | state active(default)/archived/all,roomId facoltativo,placement all(default)/unplaced,q facoltativo,type facoltativo,sort name/recent (default recent),limit,cursor; pagina CatalogItem incluse boiler leggibili più total/facets/today |
| POST objects | name,type,note?,roomIds?;201 `{object:CatalogItem}`; posizione e creazione atomiche |
| GET objects/:kind/:id | kind object/boiler;query vuota; `{object:CatalogItem}` |
| POST objects/object/:id/updates | expectedVersion + almeno name/type/note;200 `{object}`; boiler aggiornamenti tecnici restano API M3 |
| POST objects/object/:id/archive oppure restore | expectedVersion;200 `{object}`; nessun archivio boiler G1 |
| POST objects/:kind/:id/position | expectedVersion>=0,roomIds UUID[] unici max20;200 `{object}`; array vuoto esplicitamente scollega posizione |
| GET objects/:kind/:id/history | limit,cursor; eventi metadati G1; per boiler rinvio storia tecnica esistente separata |
| GET objects/:kind/:id/links | resourceType document/activity/expense obbligatorio,limit,cursor; pagina LinkedResource |
| POST objects/:kind/:id/links | resourceType,resourceId;201 `{link}`; target personal/read/edit e risorsa autorizzata |
| POST objects/:kind/:id/links/:linkId/remove | expectedVersion>=1;200 `{link}` inactive; non modifica risorsa originale |

No roomId insieme a placement unplaced. Room filter richiede stanza leggibile stessaHome. Boiler selezionati dalla policy M3 comprese fonti correnti; filtri applicati prima di paging. Lista stanza non significa che stanza abbia documenti/costi propri.

q: stringa NFC trim max80codepoint, vuota equivalente ad assenza; ricerca letterale case-insensitive su nome e marca/modello autorizzati, accenti distinti come H2, nessun wildcard client o filtro della sola pagina locale. type: una delle objectTypes o boiler; non ripetibile. Query/paging binding include q/type/sort. Picker documenti usa H2 autorizzata, non scarica tutto il catalogo per cercare localmente.

## Collegamenti

LinkedResource `{linkId:UUID|null,version:number|null,origin:'native'|'reference',state:'active'|'removed'|'unavailable',resourceType,resource:null|{id,title},objectRef}`. Per expense autorizzata resource include anche `amountCents,currency:'EUR',spentOn`, dal record H3a corrente senza copie/sommatori; per document/activity assenti. Fonte native non removibile da G1, usa dettaglio H1/H3a/M3. Risorsa unavailable redatta interamente, inclusi importi/ID/title: linkId interno di associazione può restare per rimozione, non è resourceId. objectRef presente solo perché già autorizzato. Link rimosso solo nello storico, non nella lista attiva.

GET links non duplica tra native e reference; spese/attività native richiedono creatore corrente. Documento home di altro uploader collegabile se leggibile; ciò non condivide oggetto o dati economici. Nuovo link richiede oggetto active; replay/rimozione possono leggere archivio. Rimozione reference archiviato ammessa se oggetto leggibile/edit, risorsa può essere unavailable.

La creazione costo/attività continua H3a/H1, poi collegamento G1 esplicito. Due operazioni, non una transazione promessa: se seconda fallisce il costo/attività esiste e UI dice «Registrato, collegamento da completare», conserva ID e consente riprova senza ricrearlo. Non considerare successo del collegamento quando ha salvato solo il costo. Lo stato del passaggio e la chiave di ogni POST restano in memoria legati account/Home; cambio contesto interrompe e pulisce bozze. Un endpoint atomico futuro richiede contratto distinto.

Idempotenza su link consente stessa risorsa/target già collegati come no-op senza nuova storia; altro oggetto per stesso costo/attività409 resource_already_linked, modifica esplicita rimuovi/ricollega. Nessuna unique artificiale un-documento/un-importo. Collegamenti non alterano totale H3a; prima G1 nessun nuovo sommatorio oggetto: lista costi con importi letti autorizzati, riepilogo in S1.

H1/H3a: aggiornamento assetId nativo rifiutato409 resource_already_linked se la risorsa ha già un riferimento G1 a oggetto diverso. Rimuovere prima il vecchio link esplicitamente; nessun nuovo DTO o riuso di assetId per oggetti generici. Impedisce di aggirare unicità tramite l'API precedente.

Storia `{id,kind,at,before,after}` con snapshot Room/CatalogItem/LinkedResource proiettati secondo policy correnti, direttamente nel before/after (non wrapper `{room}`/`{object}`/`{link}`). Posizione inclusa in CatalogItem.position.rooms. Boiler tecnico non copiato nella storia G1. No-op non incrementa versione/evento. Position roomIds canonici ordinati (ordine utente non significativo); CAS0 per prima impostazione, versione1 dopo. Creazione object con roomIds assente o vuoto inizializza position0; non creare evento posizione vuota.

## Frontend e accettazione

Ingresso Casa -> Ambienti / Oggetti; Casa mostra ambienti e Da collocare senza totali privati di altri utenti. Form manuali brevi, tipo modificabile; stanza non obbligatoria. Scheda boiler accede al dettaglio tecnico originale, stessa identità e conferme. Picker room/doc/activity/expense autorizzati e paginati; no richiesta credenziali legacy o mock fallback.

Prove: nomi Unicode/codepoint/NFC, due ambienti stesso tipo; multiambiente e archivio/restore; posizione senza stanza; costi/doc/attività originali immutati; privacy stessaHome altrocreatore/viewer/fonti revocate; roomedit concorrente fra membri; posizione CAS0 in gara; risposta persa/replay/bodydiverso; paging 25+ record con timestamp uguali/limiti diversi; origine native non removibile; fallimento secondoPOST senza duplicare costo; reload/login; 320/390/desktop/tastiera/focus. Nessuna dichiarazione conformità WCAG.

## Taglio operativo

G1a: Room + Object manuale + posizione + boiler nel catalogo + storia, dominio/schema/API/test. G1b: collegamenti a risorse e relativi flussi. Entrambi necessari per chiudere G1; G1a non va presentata come completa economia/oggetti. Claude revisiona UX documentale in parallelo; incarico frontend eseguibile solo con contratto congelato e baseline sincronizzata. Nessuna nuova chiamata Anthropic.
# Aggiornamento additivo17ottobre2026: manuali online

Il DTO CatalogItem può includere `manual` nullable (URL, kind manual/support, brand/reference, origin, sourceUrl/checkedAt, boundVersion/needsReview). Solo HomeObject generico personale, originale e privacy invariati. POST `/homes/:homeId/objects/object/:id/manual-proposals` ricerca senza salvare; POST stesso prefisso `/manual` salva/rimuove con expectedVersion, selection e Idempotency-Key. Contratto completo, copertura produttori e prove in [object-manuals-20261017.md](object-manuals-20261017.md). L'onboarding da foto resta un incremento separato, non attivato da questi endpoint.


## 17 ottobre 2026 — profilo oggetto e onboarding additivi

Catalogo/dettaglio HomeObject includono `profile` con versione, campi tipizzati/origini e segnale di fonti indisponibili. Una fonte revocata non espone il suo valore. POST `/homes/:homeId/objects/object/:id/profile` modifica i campi dichiarati dall’utente con expectedVersion e Idempotency-Key, senza cambiare posizione o visibilità. Brand/model legacy restano compatibili. Date future acquisto/consegna rifiutate; default garanzia solo proposta modificabile. Confronti rinviati e flusso dal documento: vedere `object-onboarding-api-contract-v2.md`. Manuale resta link esterno con propria conferma.
