## Archivio unico Documenti — 21 ottobre 2026

Capability document-search-capabilities aggiunge `documentFamilies:true`. GET documenti accetta `view=archive`, `group=property|building|energy|condo|utilities|works|tax|insurance|warranty|safety|unclassified` facoltativo e `related=all|house|objects` facoltativo (solo con view=archive). Stessi limiti, privacy, keyset e filtri titolo/filename, formato, visibilità, collection e workflow. Nessuna ricerca nel contenuto o per nomi degli oggetti. Il client inizia una nuova ricerca in tutto l’archivio e mantiene le restrizioni applicate esplicitamente dopo la ricerca.

In archive, `summary.groups` comprende le dieci famiglie più unclassified, sull’intero dataset autorizzato filtrato prima di LIMIT e prima di group; ogni originale appartiene a un solo gruppo e la somma equivale a summary.views.all. Ogni riga aggiunge `family` canonica, indipendente dal tipo. related usa le precedenti regole di appartenenza personale alla casa/riferimenti leggibili agli oggetti; i due insiemi possono sovrapporsi. Nessun JOIN che moltiplica documenti. Cursor e cache vincolati anche a related. Vecchie viste API e cursor compatibili; la UI traduce gli URL precedenti nell’archivio con filtro equivalente.

POST house-family ammette le nuove chiavi e l’opzionale `scope:'archive'`: in questa modalità preserva anche houseDocument. Omettendo scope mantiene il comportamento storico di appartenenza esplicita alla casa. Il digest di idempotenza include scope quando presente, vecchi replay invariati. Risposta aggiunge `archiveFamily` canonica oltre a effectiveFamily storico e organization. Organizzazione e fonte correnti obbligatorie, nessuna creazione di organizzazione implicita. [Dettagli](document-unified-archive-20261021.md).

## Cambia famiglia della casa — 21 ottobre 2026

POST `/homes/:homeId/documents/:documentId/house-family`, `Idempotency-Key` obbligatorio (16–100 caratteri alfanumerici, `_`, `-`), corpo esatto `{expectedOrganizationVersion,documentVersion,sha256,family}`. Versioni intere positive, SHA-256 esadecimale; family `plans|building|energy|contracts|other|null` (null = Automatico dal tipo). Risposta 200 `{organization,effectiveFamily}`. Le proiezioni organization autorizzate aggiungono `houseFamily`, `documentVersion`, `documentSha256` per il controllo della fonte.

Richiede organizzazione corrente, sessione, Origin/CSRF, contesto, membership edit e lettura della fonte. Lock G1, confronto versione/SHA e versione organizzazione, richiesta idempotente per account/casa/documento. 422 input, 403 accesso, 409 `document_version_conflict`, `organization_version_conflict`, `idempotency_conflict`. Aggiorna solo override/appartenenza casa/versione organizzazione; nessuna modifica di tipo, parti, raccolte, file, collegamenti o costi. [Dettagli](document-house-family-20261021.md).

## Conserva documenti nella casa da oggetto — 21 ottobre 2026

GET `/homes/:homeId/objects/object/:id/house-documents`: riepilogo personale `{token,objectName,documents:[{id,title,originalFilename,reason,willOrganize,relatedObjects:[{id,name}],expenses:[{id,title,amountCents}]}],unavailable,archiveBlocked}`. Include fatture e costi anche attribuiti ad altre schede generiche personali; espone i loro nomi soltanto con fonti autorizzate. `reason:null` indica documento disponibile. Le fonti non consultabili non vengono elencate; altri riferimenti inaccessibili impediscono lo spostamento senza esporre nomi/costi. Nessuna scrittura nel GET.

POST stesso percorso, header `Idempotency-Key`, corpo `{expectedToken,documentIds,archiveObject:true}`. Da 1 a 50 UUID distinti: tutti i documenti del riepilogo. Risposta 200 `{documentIds,archivedObject:true}`. Archivia solo la scheda corrente e svuota la posizione; rimuove soltanto i suoi riferimenti a documenti/costi. Registra l’appartenenza esplicita personale/versionata alla casa (`DocumentOrganization.houseDocument`). Altre schede, collegamenti a fatture e costi restano invariati. Un file può apparire sia in casa sia negli oggetti; una sola riga in Tutti. Nuove richieste con `archiveObject:false` o `detachRelatedObjects:true` rifiutate; il campo detach è accettato solo false/omesso per compatibilità. Replay storici già registrati compatibili, nessuna nuova rimozione. Sessione, Origin/CSRF, contesto, membership edit e fonte/versione/SHA rivalidati. 403 accesso; 422 input; 409 `house_documents_changed`, `house_documents_unavailable`, `object_has_other_resources`, `too_many_documents` o `idempotency_conflict`. Relazioni native e fonti non leggibili restano bloccate. Transazione atomica/idempotente sotto lock G1. [Regole e test](house-documents-from-object-20261021.md).

## Stato personale nel dettaglio Documenti — 21 ottobre 2026

GET `/homes/:homeId/documents/:id` aggiunge `document.workflowState`, con gli stessi valori e la stessa proiezione account/casa/versione/SHA dell’elenco (`to_compile|analyzing|review|completed|attention`). Membership, visibilità e lock della fonte prima della proiezione. `status:stored` continua a descrivere il file conservato: non viene usato come stato della compilazione. Nessuna scrittura o analisi durante il GET. [UI e verifiche](document-original-classification-20261021.md).

## Contesto personale nelle righe Documenti — 21 ottobre 2026

GET `/homes/:homeId/documents` aggiunge a ogni elemento `linkedObjects: Array<{id,kind:'object'|'boiler',name}>` e `savedExpenses: Array<{id,title,amountCents,supplier:string|null,documentNumber:string|null,documentDate:string|null,invoiceMonth?:string}>`, anche senza `view`. Collezioni vuote se assenti. Dettaglio, cursori e filtri invariati. `linkedObjects` deduplica riferimenti diretti, derivati da spesa attiva e fonti correnti caldaia con la stessa policy fonte del catalogo. `savedExpenses` contiene solo spese attive personali dello stesso account/casa associate al documento accessibile; ordinamento data spesa discendente, ID crescente. Dati confermati, nessuna proposta AI o inferenza. Il frontend mostra i dati della spesa nelle righe classificate Fattura e tollera l’assenza delle due proprietà su API precedenti. [Regole e verifiche](document-row-context-20261021.md).

## Viste Documenti e conteggi — 21 ottobre 2026

GET `/homes/:homeId/document-search-capabilities` aggiunge `documentViews:true`. GET `/homes/:homeId/documents` accetta `view=all|house|objects`, opzionale; `group=plans|building|energy|contracts|other` ammesso soltanto con `view=house`, altrimenti 422. Senza `view` restano comportamento e cursori precedenti, con il contesto additivo delle righe descritto sopra.

Con `view` la risposta aggiunge `summary:{views:{all,house,objects},groups:{plans,building,energy,contracts,other}}`. Conteggi dell’intero dataset autorizzato prima del LIMIT, applicando `q`, `workflow`, `format`, `visibility`, `collection`, senza restringerli a vista/gruppo correnti. Nuovi cursori vincolati anche a vista e gruppo; cambiare contesto restituisce 422. `view=house` senza `group` restituisce `items:[],nextCursor:null` e il riepilogo: è l’indice dei gruppi, non un archivio vuoto. Con `group` restituisce e pagina soltanto quella tipologia.

Casa = organizzazione personale corrente (versione/SHA) senza riferimento personale leggibile a oggetto/caldaia; Oggetti = documento collegato direttamente o tramite spesa attiva o fonte corrente di analisi caldaia riuscita, con policy fonte del catalogo. Tutti include anche documenti non organizzati. Gruppi esclusivi con precedenza plans/building/energy/contracts/other. Scope, membership, visibilità e versione/SHA prima dei conteggi; nessuna duplicazione o scrittura canonica. [Dettagli e verifiche](document-views-20261021.md).

## Documenti derivati dalle spese e dati della fattura — 21 ottobre 2026

GET dei collegamenti oggetto con `resourceType=document` include ora le fonti leggibili delle spese attive attribuite allo stesso riferimento. Proiezione `origin=native`, senza link persistente aggiuntivo; deduplica con i riferimenti espliciti, paginazione e privacy invariati. GET dei collegamenti `resourceType=expense` aggiunge `resource.document: {id,title} | null`, presente solo per fonte accessibile nello stesso scope. Il frontend può aprire direttamente la fattura. Nessun nuovo endpoint o schema.

`review.compilation.houseForms[id]` ammette le stringhe opzionali `objectLabel`, `documentNumber`, `documentDate`, `note`, conservate come input grezzo. `objectLabel` è solo presentazione: il server continua a validare il riferimento alla conferma; numero, emissione e nota passano nei già esistenti `houseExpenses[].values`. [Regole e verifiche](invoice-single-flow-20261021.md).

## Compilazione salvata esplicitamente — 21 ottobre 2026

POST `/homes/:homeId/object-onboarding/drafts/:id/review` conserva ora anche `review.compilation`: `{saved:true, documentTitle, documentKind, replaceOrganization, reuseCopy, documentOnly, manualTotal, contacts, houseForms}`. Titolo/tipo, totale e campi casa sono stringhe grezze, anche vuote/incomplete; houseForms è indicizzato per proposta e conserva selezione/importo/fornitore/date/categoria/azione/collegamento e alternative del periodo. I campi degli oggetti restano in `review.forms`. Il server valida la struttura e il limite complessivo di 100.000 caratteri, senza applicare decisioni. Fonte, membership/edit, stato aperto, versione e Idempotency-Key restano obbligatori. Nessuna modifica canonica o invio AI. GET draft riproietta `compilation` solo quando la fonte è accessibile. GET capabilities aggiunge `drafts[].hasSavedCompilation` (solo per bozze aperte), senza esporre il review. [Dettagli e verifiche](compilation-draft-20261021.md).

# Contratto API V5 — identity-v1

identity-v1.1: endpoint invariati, estensioni concordate in review Codex del ticket frontend V5-DEV-003. M1 verificata: 12 scenari API/PostgreSQL, 3 client/API, 18 dominio e 47 frontend mock; collaudo browser reale e regressione creazione superati. Documenti seguono documents-api-contract.md; proposte restano fuori da entrambi i contratti.

## Trasporto

Base `/api/v5`. Frontend usa URL relativi e `credentials: 'include'`; proxy Vite verso `http://127.0.0.1:3001`, host frontend `127.0.0.1:5174`, strictPort. Nessun fallback a API legacy o demo. Server usa cookie di sessione httpOnly; token non restituito al frontend, né loggato né salvato in localStorage. Cookie Secure in HTTPS di produzione. Tutte le scritture hanno controlli Origin/CSRF implementati sul server; client invia `X-CSRF-Token`, token ottenuto da GET session, per ogni mutazione, anche login/register.

JSON UTF-8, timestamp ISO UTC. UI italiana. Errori sempre `{ "error": { "code": "...", "message": "...", "fieldErrors": { "name": "..." }, "requestId": "..." } }`; fieldErrors facoltativo. 401 sessione assente/scaduta, 403 permesso negato, 409 conflitto, 422 form non valido, 429 limite, 503 servizio indisponibile. Risposta non-JSON o connessione rifiutata = errore rete/servizio, mai successo o dati demo.

## Tipi

```ts
type Account = { id: string; name: string; email: string };
type HomeRole = 'owner' | 'member' | 'viewer';
type Home = {
  id: string; name: string; address: string; version: number;
  role: HomeRole;
  permissions: Array<'read' | 'edit' | 'manage_members' | 'export' | 'sell'>;
};
type SessionResponse = {
  account: Account | null;
  csrfToken: string;
};
```

L'ID della casa è stabile. L'indirizzo non è identità né prova di proprietà. `account.id` e `home.id` non coincidono; non assumere una sola Home. Il server restituisce solo case attualmente autorizzate. Un diritto revocato/scaduto non torna valido creando una nuova Home.

## Endpoint prima verticale

| Metodo/percorso | Richiesta | Risposta |
|---|---|---|
| GET `/session` | Nessuna | 200 SessionResponse, anche anonima; token CSRF legato al contesto/sessione |
| POST `/auth/register` | `{name,email,password}` + CSRF | 201 `{account}` e cookie; 409 registrazione non completabile, senza dettaglio su account altrui |
| POST `/auth/login` | `{email,password}` + CSRF | 200 `{account}` e cookie; 401 stesso messaggio per credenziali errate |
| POST `/auth/logout` | CSRF, nessun body | 204; revoca sessione, client pulisce cache e richiede nuova sessione/CSRF |
| GET `/homes` | Sessione | 200 `{items: Home[]}`; elenco della prima verticale non paginato |
| POST `/homes` | `{name,address}` + CSRF + `Idempotency-Key` | 201 `{home: Home}`; stessa chiave/body ripetuti restituiscono stessa casa; chiave riusata con body diverso 409 |
| GET `/homes/:homeId` | Sessione | 200 `{home: Home}`; 403 se non autorizzata, nessun dettaglio privato |

Validazioni iniziali: name account 1–80 caratteri, nome casa 1–80, address 1–200, email valida fino a 254, password 12–128 caratteri; trim per nomi/indirizzo/email, mai trim silenzioso della password. Messaggi campo in italiano. Verifica email obbligatoria prima di utenti esterni; prima verticale solo account locali di sviluppo. Ruoli professionali arriveranno nel contratto successivo.

Le lunghezze sono code point Unicode, non unità UTF-16 o grafemi. Il backend usa un validatore esplicito coerente con il frontend; i selettori di presentazione contano come code point. Email normalizzata in minuscolo sul server.

Una mutazione login/register può ruotare la sessione: richiedere GET session dopo successo per il nuovo token CSRF. Se arriva 401 su una richiesta protetta, annullare richieste pendenti, pulire cache privata e tornare al login senza loop di retry. Un 403 non va trasformato in elenco vuoto.

## Selezione casa e cache

Il frontend seleziona la casa via URL `/home/:homeId/casa`; non serve endpoint server per un puntatore globale alla casa corrente. Zero case = onboarding; più case = scelta esplicita. Verificare sempre i diritti sul server; il routing frontend non autorizza operazioni. Cache privata con chiavi almeno `[accountId, homeId, resource]`. Preferenze UI non sensibili possono essere locali; niente credenziali/documenti/bozze private persistenti in localStorage.

## Chiarimenti identity-v1.1 dalla review

- Le richieste UI protette inviano `X-Account-Context` con l'account catturato dalla relativa query o form. Il server confronta il valore con la sessione prima delle operazioni: mismatch = 401 `account_context_changed`, senza dati né scritture. Header aggiuntivo facoltativo a livello di trasporto per compatibilità con la suite v1; il frontend V5 lo invia sempre per homes. Il controllo non concede diritti: la membership resta necessaria. La sessione si rilegge sempre al focus e una mutazione tardiva non ripopola la cache di un account diverso.
- CSRF/Origin errati: 403 `csrf_invalid`. Nessun retry automatico delle mutazioni; il client conserva la chiave idempotente e mostra il messaggio del server. Rinnovo automatico e retry di scritture non sono richiesti in questo incremento.
- Chiave di creazione riusata con dati diversi: 409 `idempotency_conflict`. Non trattare altri 409 futuri come conflitto di idempotenza. Formato 16–100 caratteri ASCII alfanumerici, `_` o `-`; UUID v4 ammesso; ambito per account, non sessione. Record mantenuto finché esiste account/casa nel database di sviluppo; nessuna scadenza temporale silenziosa. Concorrenti con stessa chiave/payload convergono sulla stessa casa; revoca successiva impedisce il retry di consultazione.
- ID casa inesistente e ID altrui: 403 generico; UUID sintatticamente invalido: 422. Nessuna esposizione di dati del proprietario.
- 429: messaggio italiano con indicazione di attesa; Retry-After non ancora previsto. Prima del pilota sostituire rate limit in memoria con protezione adeguata all'ambiente ospitato.
- Origin/proxy/cookie sono quelli sopra. Nessun Domain sul cookie; Path `/api/v5`.
- Logout di sessione già scaduta: 204 idempotente con Origin corretto, cookie rimosso; GET session successivo crea un contesto anonimo con CSRF nuovo. Sessione ancora valida richiede CSRF corretto.

## Scenari di accettazione

1. Anonimo: sessione 200 account null, GET homes 401; login errato 401 generico.
2. Account A con due Home: scelta, URL diretto e reload mantengono il contesto corretto.
3. Account B: GET Home A 403 senza contenuti; cache di A non visibile dopo logout/login B.
4. Creazione ripetuta con stessa Idempotency-Key non duplica; retry con nuovo body esplicita il conflitto.
5. Backend spento: errore comprensibile e retry manuale; nessun fallback a dati sintetici.
6. Frontend mock nei test può verificare contratto/rendering; etichettare test con mock e integrazione reale separatamente.

## Collaudo reale del 13 ottobre — aggiornamento finale
11 scenari API/PostgreSQL e 3 frontend/API superati nei log delle 16:22. Collaudo browser reale eseguito: due account, case persistenti, logout/login, URL altrui negato, mobile 320/390 e sezioni future esplicite. M1-UI-001: seconda casa salvata ma risposta 403 intermittente; assegnato validFrom con Date applicativo per evitare arrotondamento futuro del default DB. Regressione di dominio superata, 18 test backend e 47 frontend mock passano, build/lint passano. Nuovo scenario reale con dieci creazioni consecutive pronto, ancora da eseguire dopo riavvio API. M1 non chiusa. Evidenze: outputs/Dimora-V5-collaudo-prima-app-reale.md. Nessun main o database legacy alterato.


## Estensione V11 — 18 ottobre 2026

Contratto additivo di onboarding descritto in [report V11](document-understanding-v11-report-20261018.md#contratto-e-persistenza). documentInfo e reviewWarnings opzionali; soggetti impianto con subjectKind/proposedType. Conferma document_only limitata a conformità e documentOnly=true esteso alla chiusura delle proposte aperte senza nuove risorse quando esiste organizzazione personale sulla stessa versione/SHA. Rifiuta choices, houseExpenses e totale manuale; contatti ammessi soltanto nel preesistente caso documentInfo senza articoli/spese, per compatibilità. Le altre proposte contatto sono escluse. Restano ricevute, membership, versione/SHA e idempotenza. Vedi [correzioni UX](document-ux-fixes-20261018.md). Nessun nuovo endpoint.


## V12 — soggetti e costo complessivo (18 ottobre 2026)

Estensione additiva: item.subjectKind product/system; houseExpenses.documentKind simple_invoice oltre a utility_bill. Categoria manutenzione/lavori/acquisti ammessa per fatture; bollette restano forniture. Un’unica conferma choices+houseExpenses; document_only anche per fatture con costo complessivo. Limiti, esclusioni e condizioni nel [report V12](document-understanding-v12-report-20261018.md).

Dal 21 ottobre: `houseExpenses[].action=create` accetta `values.objectRef` facoltativo, validato dalla policy economica nella transazione account/casa/fonte/stato; non viene più forzato a null. `workId` resta escluso. `review.compilation.houseForms[id].objectChoice` è una stringa opzionale di input ripristinabile, non un’autorizzazione. Acconto/saldo sono etichette del titolo ordinario, senza nuovo enum o campo economico. Link a spesa già presente, idempotenza e controlli doppioni invariati. [Comportamento e limiti](expense-installments-object-20261021.md).

Estensione successiva: GET `/homes/:homeId/object-onboarding/drafts/:id/object-suggestions?itemId=…`, sola lettura, risponde `{items:[{ref:{kind,id},name,reason}]}`; reason `document_name`, `product_identity` o `supplier_and_description`. Massimo cinque proposte autorizzate, nessuna scrittura o dichiarazione di unicità. Snapshot e scope verificati; bollette restituiscono elenco vuoto. `review.compilation.houseForms[id].objectSuggestionReviewed` boolean opzionale conserva la decisione UI, senza concedere permessi. `expense-candidates` include ora le spese già collegate a un oggetto ma esclude i lavori per questo percorso; `link_existing` può riusarle preservando ID/riferimento, con policy sul soggetto e controllo della fonte/versione. [Regole e verifiche](object-suggestions-20261021.md).

## Cambio percorso manuale — 18 ottobre 2026

POST `/homes/:homeId/object-onboarding/drafts/:id/document-kind`, Idempotency-Key obbligatoria, body `{expectedVersion,documentKind:"utility_bill"|"unsupported"}`. Converte sulla stessa bozza manuale aperta il segnaposto vuoto in una spesa casa senza oggetti (o ripristina il segnaposto). Incrementa versione, nessuna creazione canonica. Fonte/versione/SHA, membership e permessi edit verificati dal servizio esistente. Rifiuta bozze AI/concluse, decisioni o pending (`onboarding_kind_locked`), più articoli/proposte/arricchimenti o input salvati (`onboarding_kind_has_data`). Conflitto di versione e replay secondo contratto onboarding. Il tipo documentale e il titolo vengono comunque organizzati nel normale salvataggio. «Conserva solo il documento» rimane `documentOnly:true`, senza houseExpenses.


### Estensione tipo manuale: Fattura e Ricevuta (18 ottobre 2026)

`POST /object-onboarding/drafts/:id/document-kind` accetta anche `documentKind: invoice | receipt`, oltre a `utility_bill | unsupported`, con `expectedVersion` e chiave idempotente invariati. Le due selezioni producono `purchase_document`, zero articoli iniziali e una proposta `simple_invoice` vuota. Un percorso già allineato non incrementa la versione; una vecchia bozza purchase senza proposta casa viene convertita soltanto se vuota. Aggiunta articolo e conferma canonica esistenti permettono oggetti facoltativi; il costo complessivo non può essere registrato anche sui singoli oggetti. Nessun cambiamento allo schema o al consenso AI. Restano vincoli di accesso, fonte/versione/SHA, dati salvati e conferma pendente del contratto precedente.

## Bollette e periodo — 19 ottobre 2026

Nessun nuovo campo o endpoint: economy-v1 usa competenceFrom (quando sono presenti entrambi gli estremi e la categoria è un'utenza) per filtri temporali, ordinamento, cursore, totali e confronti. Emissione documentDate e scadenza dueOn restano separate. Intervalli conteggiati una volta nel mese iniziale, senza prorata. Record senza periodo: fallback spentOn. I vecchi cursori dell'elenco economy sono invalidati dal binding v2. [Dettagli](bill-reference-period-20261019.md).

## Ricerca documenti: casa, planimetrie e contratti — 19 ottobre 2026

collection accetta inoltre house e floor_plans come viste virtuali, contracts come nuova raccolta reale. Il tipo documentale contract appartiene a contracts. Nessun nuovo endpoint o copia: filtri prima del paging e stesso controllo fonti/permissi. [Regole](house-document-navigation-20261019.md).

### Titoli visuali delle bollette completate (lotto titoli)

L’elenco include invoiceMonth nelle sole spese personali attive che lo possiedono, formato YYYY-MM; se nullo il campo è omesso per compatibilità. Nessuna nuova query per riga, schema o scrittura. Il frontend può mostrare un alias per una sola bolletta completata con unica spesa, fornitore e mese fattura confermati, se il titolo salvato è ancora il filename o il suo stem. Nome e organization.title della risposta restano canonici, senza rinomina/backfill; il dettaglio non riceve nuovi campi. Titoli personalizzati, fonti composite, dati mancanti e risposte API precedenti mantengono la presentazione precedente. Ricerca, ordinamento ed export restano su titolo salvato e filename, non sull’alias visuale. [Report](documenti-titoli-completati-20261025.md).

### Planimetrie — evidenze delle soglie virtuali proposte

La lettura scoped esistente dei piani può includere openingReviews (id,spaceId,state,reasons,threshold,hintSource,endpointSource), mai conferma. Le regioni derivate possono avere boundary.virtualThresholdIds. Nessun nuovo endpoint o input HTTP di risultato AI. Le issue opening_recovery_requires_review/opening_requires_review restano bloccanti come le altre verifiche. Fonte non leggibile/stale continua a oscurare le derivazioni. [Contratto e limiti](agency-opening-recovery-20261030.md).

La provenienza delle aperture può indicare endpointSource:pixel_neighborhood_search e search:{tested,candidateCount,initialReasons}; il filtro fonte/privacy è invariato. È ricerca locale di una bozza da verificare, non conferma umana. Nessun nuovo input HTTP. [Dettagli](agency-focus-local-recovery-20261030.md).

### Adozione delle superfici proposte — pipelinev7

GET plans può includere surfaceProposal con digest, state pending/applied/stale, sourceFingerprint, baseGeometryRevision/baseGeometryDigest, baseIssues, rooms, issues e summary. Fonte privata/stale oscura il derivato come i contorni. POST plans/:planId/edits (ed edit-preview non mutante) accetta command {operation:'apply_surface_proposal',proposalDigest:'<64 hex lowercase>'}, envelope expectedRevision/expectedPlanVersion/reason e Idempotency-Key esistenti. Coordinate/rooms/conferme extra rifiutate. Membership, fonte corrente, CAS e digest canonico server prima del commit; storia e perimetro preservati, computo/configurazione null, geometryRevision/version/revision incrementati. rooms.origin può essere geometry_proposal, con surfaceProposalDigest; seed/component/pixelArea null sui contorni adottati modificati. Manual edit rimuove tale provenienza. Esiti interni/certificazione non confermati automaticamente. [Report](agency-surface-integration-20261030.md).

Per l’illustrazione da annuncio, POST plans/:planId/edits accetta save_listing_details con openings (tipo door/window e due punti raster) e alignments (coppie target/reference, ciascuna con id vano e due punti raster). L’envelope, l’autorizzazione alla fonte, il controllo di versione e l’idempotenza sono quelli degli altri edit. GET plans espone listingDetails con la revisione geometrica di riferimento. L’editor illustrativo applica i dettagli alla revisione corrispondente. Il salvataggio incrementa le versioni della pratica e della planimetria e conserva i contorni e i computi. Il campo facoltativo contours contiene le sostituzioni grafiche per vano (id, geometry con points e holes in coordinate raster), con id univoci della planimetria e poligoni validi entro il raster. Il campo facoltativo scale accetta due punti e una distanza reale in metri con mode manual o bar. L’edit salva questa scala nella stima rapida condivisa, conservando i parametri e le coperture. Una apertura può avere fixed: true per conservare gli estremi posizionati manualmente nel PNG senza un ulteriore aggancio automatico.

Da Modifica pianta, save_plan_graphics usa lo stesso formato con alignments vuoto. Applica i soli contours modificati ai vani canonici, controlla i poligoni finali e rifiuta sovrapposizioni in una sola scrittura. Se cambia geometria, salva lo storico, invalida il computo e le varianti illustrative precedenti, preserva scala e perimetro lordo e ricollega le aperture alla nuova revisione. Se cambiano solo le aperture, non invalida il computo né le geometrie.

SurfaceProposal può includere contrast:{originalThreshold,proposedThreshold,rule,samples,requiresReview:true}; il metadato è nel digest. I vani canonici e il profilo originale restano invariati fino all'adozione; contrast_requires_review e aperture incerte rimangono problemi espliciti. Nessun nuovo campo scrivibile dal client o endpoint. [Pipelinev8](agency-third-plan-contrast-20261030.md).

### Agenzie — calibrazione da foglio presunto, 30 ottobre 2026

Nello stesso comando plans edits measure, calibration.paper opzionale contiene format (A4/A3), orientation (portrait/landscape), denominator (1–10000), widthUnits/heightUnits (interi positivi <=5000). I riferimenti derivati devono corrispondere al formato, alle dimensioni del raster e all'orientamento; proporzioni entro 3%. confirmed deve essere false per questa base presunta. Il report conserva paper_scale_estimated e totalM2 null in entrambe le basi commerciali. I client precedenti con sola barra restano compatibili. Nessuna nuova route o migrazione. [Contratto e limiti](agency-paper-calibration-20261030.md).

### Agenzie — diagnostica di copertura e candidate locali, 31 ottobre 2026

Nelle stesse risposte plans, coverage opzionale contiene scope closed_components_between_known_interiors, complete:false, truncated e candidates (region, neighbors, clearancePixels, source unassigned_component, requiresReview:true). Metadato storico dell'analisi, visibile solo sotto autorizzazione della fonte. SurfaceProposal.coverage opzionale contiene candidateIds e truncated, firmati nel digest; summary.unassignedAreas opzionale alimenta il contatore. Vani canonici invariati fino al comando apply_surface_proposal esistente. Issue coverage_candidate_pending/coverage_search_limited prima della decisione; coverage_area_requires_review/coverage_area_conflict nella proposta. Le nuove aree mantengono destinazione da verificare anche dopo adozione geometrica. Nessuna route o migrazione nuova. [Report](agency-unassigned-areas-20261031.md).

### Scarto selettivo candidate di copertura (31/10)
apply_surface_proposal accetta excludedCandidateIds opzionale, massimo12 ID unici appartenenti a surfaceProposal.coverage.candidateIds e assenti dai vani canonici. Nessuna coordinata client. coverage può contenere possibleWallIds firmati; coverage.candidates espone shapeHint wall_band e shapeEvidence opzionali. La risposta applicata conserva acceptedExcludedCandidateIds e la proposta firmata integrale; scelte e motivo sono tracciati. Campo omesso mantiene il comportamento precedente. Nessuna nuova route/schema. [Report](agency-candidate-selection-20261031.md).

## Gift v1 (1 novembre2026)

Nuovi endpoint e DTO nel [contratto Gift](agency-gift-api-20261031.md). Token solo nel corpo dei POST; Origin/CSRF anche per landing anonima, nessuna query extra. Claim/inizio richiedono account corrispondente con email verificata dal DB anche per account legacy; non creano Home. Accettazione202 e polling autenticano la stessa sessione. Ricevuta già accettata e beneficio si leggono senza token/Agency e non ricreano originali eliminati. Il frontend non conserva token in URL query, browser storage o cache Query. Schermate Gift ancora da collegare nel checkpoint API.
### Gift — rigenerazione e throttle (1 novembre2026)

`POST /agencies/:agencyId/practices/:practiceId/gift-invitations/:id/reissue` con `Idempotency-Key` e `{expectedRevision,expectedVersion}` sostituisce atomicamente il link, mantenendo manifest/destinatario/offerta e rifiutando accettazioni prenotate/accettate. Replay con secret:null; nuovo segreto solo al primo commit, nuova scadenza7giorni. Le API Gift applicano429persistente perIP/account dopo l’autenticazione/CSRF; non è un limite commerciale. [Contratto, UI e prove](agency-gift-app-20261101.md).


## Mappe digitali ricevute con Gift (1 novembre2026)
Rilascio Gift: campo opzionale `digitalPlan:{planId,expectedPlanVersion,reviewed:true}`, soltanto riferimento/dichiarazione; DTO esatto, geometrie client rifiutate. Listing documenti aggiunge opzionalmente `digitalPlans` (ID/versione/revisione/conteggio/pending); descriptor e preview espongono solo sommario della mappa inclusa. [Contratto e prove](gift-digital-plan-20261101.md).

API Home normali sotto /api/v5, guard sessione/Origin/CSRF/membership e prova fonte:
- GET /homes/:homeId/digital-plans: elenco mappe leggibili dell’account; nessuna dipendenza dall’Agency o anno.
- GET /homes/:homeId/digital-plans/:id: documento/qualifiche, geometrie, mapping ambienti, oggetti privati autorizzati, pin e needsReview.
- POST /homes/:homeId/digital-plans/:id/pins: Idempotency-Key; expectedVersion, objectId, regionId, x, y, expectedPositionVersion. Coordinate raster pagina intera, origine alto sinistra. Aggiornamento atomico pin + collocazione canonica nel singolo ambiente; punto strettamente dentro il vano e fuori dai vuoti.
- POST /homes/:homeId/digital-plans/:id/geometry: Idempotency-Key; expectedVersion, regionId, geometry:{points,holes}. Nessun overlap; nuova revisione, calibrazione/perimetro operativo invalidati, pin non spostati e da riconfermare.
Query extra e body extra rifiutati;403 fonte/ambito non autorizzato,409 revisioni o chiave concorrenti,422 geometria/valori non validi. Nessun endpoint importa snapshot privilegiati o attiva AI.

### Ambienti — associazioni canoniche sulla mappa (1 novembre2026)
GET /homes/:homeId/digital-plans/:id aggiunge objects[].roomIds: array delle associazioni canoniche autorizzate, insieme a positionVersion. Una lettura non crea pin fisici. Il frontend dispone provvisoriamente gli oggetti dentro i vani associati con indicazione esplicita; senza stanza non la indovina. Il POST pins esistente rimane identico e sostituisce le precedenti associazioni con il solo vano scelto, atomicamente alle coordinate e con CAS/idempotenza. Nessun endpoint o schema nuovo. Client precedente compatibile; client nuovo senza roomIds può mostrare i pin espliciti ma non inventa le associazioni. [Report](ambienti-map-drag-20261101.md).

## Gift — orchestrazione frontend della consegna semplice, 3 novembre 2026

Nessun nuovo endpoint, DTO o schema: la CTA della pratica usa le API Gift già documentate per lettura, rilascio dei soli file selezionati mancanti e creazione dell'invito. Il click Crea link Gift autorizza la consegna dopo la stipula dei finali selezionati; le conferme del contratto esistente sono trasmesse in quell'azione, senza un secondo editor UI. Descrittori e caveat già presenti non vengono riscritti. Sessione/Origin/CSRF, membership, revisioni e fonte/versione/SHA restano verificati dal server. Nuove selezioni mappa vincolate a id/versione canonici, nessuna adozione di proposte. Gestione incerti e limiti nel [report](gift-simple-delivery-20261103.md).
## Gift — classificazione ricevuta e organizzazione personale, 3 novembre 2026

Nessuna nuova route o campo privilegiato nel body di creazione. Nuovi manifesti server includono classificationPolicyVersion1 e, per ogni fonte scelta autorizzata, classification={policyVersion:1,sourceKind,documentKind,family}. documentKind è floor_plan/ape o null; family è property/building/energy/unclassified secondo la policy dichiarata. Il raw sourceKind entra sempre nell'impronta, anche se non produce un tipo Home. Le API di provenienza documenti espongono opzionalmente la stessa classification; vecchi manifesti/provenienze senza campo restano validi.

organization.origin nelle normali letture Documenti può essere user_declared o agency_gift. La seconda è un'organizzazione nativa privata del destinatario, vincolata alla copia locale/versione/SHA: filtri, conteggi e famiglie canonici la comprendono. Non completa da sola workflowState; normale salvataggio esplicito di organizzazione del proprietario adotta i dati, cambio sola famiglia no. Nessun backfill o nuova inferenza sui file già accettati. Incarico vero e AI documentale restano separati. [Implementazione e prove](gift-consolidation-20261103.md).
## Agenzie: analisi documentale nativa (3 novembre 2026)

Route montate anche con provider disabilitato; sessione normale, membership/grant e visibilità della fonte obbligatori. Lettura dello storico del solo attore ammessa con accesso read, avvio/condizioni richiedono edit; export non necessario. Mutazioni con Origin/CSRF e Idempotency-Key, no-store, DTO esatti senza testo, risultati, tariffe o proof attestabili dal browser.

- GET /agencies/:agencyId/practices/:practiceId/deed-analysis-options?sourceId=…&expectedSourceVersion=…&pages=1,2 restituisce revision, canEdit, source minima, pageCount, available/reason e offer oppure null. L'offerta è server-side, immutabile/scadente, vincolata a documento/versione/SHA/tipo/pagine/configurazione. GET non trasferisce dati al provider e non prenota budget.
- POST …/deed-analysis-jobs con {expectedRevision,sourceId,expectedSourceVersion,pages,offerId,approved:true} restituisce {job,replay}. Una chiave equivale allo stesso body/attore; conflitto non autorizza nuovo invio.
- GET …/deed-analysis-jobs restituisce {jobs}; GET …/deed-analysis-jobs/:jobId restituisce il job minimo; GET …/deed-analysis-jobs/lookup con Idempotency-Key restituisce {job:null|job}. Lo storico non include testo, credenziali o capability interne.
- Job contiene id,sourceId,sourceVersion,sourceKind,pages,state,version,capMicros,spentMicros,committedMicros,currency,createdAt,updatedAt,recordId,reason. Stati: queued,leased_before_dispatch,dispatched,completed_with_proposals,completed_unusable,discarded_source_changed,denied_after_revocation,uncertain_no_retry,failed_before_dispatch.
- Il record concluso è letto e associato tramite le route esistenti deed-proposals/bindings/review. Nessun fatto è confermato dall'AI; nessun endpoint genera incarichi senza modello approvato.

Default senza configurazione/provider/budget attuali: unavailable o 503 per l'avvio, senza fallback simulato. PDF scansiti/misti privi di testo: indisponibili in questa versione, senza invio. L'envelope di recupero UI contiene solo chiave/body tecnici, è scoped e purgato al logout/cambio account; reload/navigazione riconciliano via GET, nessun POST automatico. [Policy, motivazioni, prove e limiti](agency-document-analysis-20261103.md).


## Agency Journey — 5 novembre 2026

GET e POST `/agencies/:agencyId/practices/:practiceId/journey`: sessione/membership/grant; POST con Origin/CSRF e Idempotency-Key. GET no-store ritorna `{revision,state,profileStale}`. POST strict `{expectedRevision,command}`; command ammette solo una sezione fra profile, checklist, stage, listing e transaction; risposta include replay. Dati nel JSON snapshot opzionale, CAS sulla revisione unica della pratica, ricevuta per account+chiave. L’elenco pratiche aggiunge `stage`, default preparation per le pratiche preesistenti.

Il profilo può legarsi solo a fonte condivisa nella pratica, leggibile e versione corrente, oppure essere dichiarato manualmente con sourceId/version null. Invalidation/versione/revoca mascherano il profilo nelle nuove letture. Checklist filtra assegnazioni a fonti non leggibili; acquisti simulati sono sole richieste, non fonti ricevute. Nessun endpoint genera documenti giuridici o abilita AI. [Schema, limiti e verifiche](agency-journey-20261105.md).
