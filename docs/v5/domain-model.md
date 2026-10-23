## Ordini: date e spedizione — 23 ottobre 2026

Profilo JSON oggetto/proposta: `orderDate` separata da acquisto/consegna/garanzia; stesse origini e fonti protette, nessuna colonna o migrazione. Fatto documentale `shippingCost` conserva testo monetario esplicito con valuta, mai una seconda spesa automatica. Costo dichiarato e pagamento sono concetti distinti: nessun registro pagamenti introdotto. Nessuna riscrittura dei dati confermati. [Report](fase0-orders-offline-20261023.md).

## Famiglie dell’archivio unico — 21 ottobre 2026

Riutilizzato DocumentOrganization.houseFamily, nessuna nuova entità o copia. Migrazione `20261021230000_document_archive_families`: amplia solo il CHECK dei valori ammessi. Nessun UPDATE dei dati. Chiavi nuove: property, building, energy, condo, utilities, works, tax, insurance, warranty, safety e fallback unclassified. Storici plans/contracts/other conservati; nuova proiezione plans→building, contracts/other→unclassified. Per altre viste API, valori nuovi ricadono nel raggruppamento precedente da tipo.

Scelta manuale valida sulla fonte corrente prevale. Senza scelta, parti tipizzate univoche determinano famiglia (planimetrie/pratiche→building, APE/tecnici→energy, condominio→condo, bolletta→utilities, manuali/garanzie/etichette→warranty). Tipi generici, parti discordanti, organizzazione assente o obsoleta→unclassified. Nessuna euristica sui titoli, nessuna classificazione normativa. Tipo, collection, source proof e collegamenti non riscritti. [Regole](document-unified-archive-20261021.md).

## Famiglia manuale dei documenti della casa — 21 ottobre 2026

`DocumentOrganization.houseFamily` nullable con CHECK sui cinque gruppi `plans|building|energy|contracts|other`, migrazione additiva `20261021193000_document_house_family`. Null usa il raggruppamento preesistente da parti/raccolte; valore manuale prevale nei conteggi, filtri e pagine. La scelta è personale e vincolata a versione/SHA, imposta houseDocument=true anche tornando ad Automatico. Modificare metadati della stessa fonte conserva la scelta; nuova versione/SHA la azzera. Nessun backfill o cambio del tipo. `ObjectOnboardingRequest.operation=document-house-family-v1` protegge i replay della mutazione. [Dettagli](document-house-family-20261021.md).

## Documenti della casa condivisi — 21 ottobre 2026

`DocumentOrganization.houseDocument` (booleano default false, migrazione additiva `20261021190000_document_house_membership`) registra una scelta personale per account/casa/documento e versione/SHA correnti. È indipendente da `ObjectResourceLink`: le stesse fatture possono appartenere alla vista casa e restare collegate ad altri oggetti. Casa e Oggetti non sono partizioni; Tutti non duplica i file. Lo spostamento archivia soltanto la scheda scelta e conserva i riferimenti agli altri oggetti. Nuova versione/SHA invalida la scelta finché non viene riconfermata. [Regole](house-documents-from-object-20261021.md).

## Planimetrie e ambienti — 19 ottobre 2026

ObjectOnboardingJob.purpose distingue products/floor_plan (migrazione additiva). ObjectOnboardingDraft mode=floor_plan conserva output, revisione e mappa numero→HomeRoom; ObjectRequest protegge salvataggio e conferma. Originali e coordinate non diventano dati condivisi con la creazione degli ambienti. [Dettagli](floor-plan-rooms-20261019.md).

# Modello V5 — implementazione locale e incrementi

## Aggiornamento G1 del 14 ottobre 2026

H3a HomeExpense/ExpenseHistory/ExpenseRequest implementati e integrati, fatto economico canonico personale EUR, non pagamento bancario. G1 backend locale aggiunge HomeRoom sharedHome, HomeObject personale e ObjectPosition satellite con esattamente un object/boiler e0..20roomIds autorizzati. Boiler ID/fonti/versioni/conferme invariati. Room archiviata non eliminata; roomIds JSON validato dal server, nessun harddelete G1.

ObjectResourceLink a un Document/HomeActivity/HomeExpense esistente, FKRestrict/check tipo; un oggetto principale attivo per costo/attività, documenti multioggetto. AssetId native H1/H3a non riciclato e rifiutato se incoerente con link G1. ObjectEvent snapshot interno/storia e ObjectRequest ledger account/Home/op/target/key con replay redatto. Sharedroom protetta da lock Home oltre account; CAS/versioni. Migrazioni202610140002/003 applicate solo al DB dedicato; test reali in g1-integration-review.md. Frontend G1 ancora in corso, non conclusa integrazione/browser.

Account, Session, Home, HomeMembership sono entità differenti. Session appartiene a Account; membership collega Account a Home con ruolo, permessi derivati e validità temporale. Home contiene nome/indirizzo/versione, non una scorciatoia di autorizzazione tramite ownerId.

Permessi valutati per azione e istante. Una membership scaduta o revocata resta come fatto storico, senza riabilitazione automatica all'avvio. Creare una nuova casa non modifica diritti della precedente. Orari server determinano scadenze; scheduler non è l'unica barriera agli accessi scaduti.

Prima verticale: account locali di sviluppo, più case per account, ruoli owner/member/viewer; register crea solo account, create Home crea una membership owner valida nella stessa transazione. Logout revoca sessione, non membership. Vendita/organizzazioni/mandati saranno contratti successivi, senza usare chiavi email/indirizzo come identità stabile.

StoredFile, DocumentVersion, Document e UploadRequest sono implementati in M2. Proposal/ProposedField, Confirmation/ReviewItem e AuditEvent appartengono al successivo contratto M3: non sono ancora implementati. Non modellare tutte le verifiche con un unico flag sul documento.

## M2 — contratto documents-v1

Document collega Home, uploader, titolo e visibilità private/home; DocumentVersion conserva originale immutabile, hash SHA-256, MIME verificato, dimensione, versione e fonte manual_upload; StoredFile conserva una chiave interna di storage, mai esposta al client. UploadRequest registra chiave idempotente e impronta account+home. Schema e migrazione sono implementati e verificati nel database locale; il contratto è in documents-api-contract.md.

Private richiede uploader uguale all'account richiedente oltre al diritto Home valido. Home richiede membership valida e read; owner non legge private altrui. Upload richiede edit; ZIP export richiede export e autorizzazione di ogni documento. Originale caricato non significa dati estratti confermati o documento certificato. Nessun Proposal/ReviewItem nasce dal solo upload M2.

Schema M2 implementato e migration applicata al runtime di sviluppo. Il caricamento crea originale e richiesta idempotente in transazione unica dopo staging/finalizzazione del file; dettaglio non espone storageKey. Esito: 23 scenari backend/API/file e 6 frontend/API superati, oltre al browser reale.

## M3 — review-v1, modello da implementare

AnalysisJob collega account/Home e snapshot di uno/due DocumentVersion; stato/lease persistente e richieste idempotenti. Asset type boiler personale al creatore, versione aggregata e stato derivato; nessun ownerId che riabiliti accessi revocati. Job riuscito pubblica asset provvisorio, ProposedField/Candidate con fonti immutabili e ReviewItem nella stessa transazione. Worker non scrive campi confermati.

ConfirmedField conserva valore strutturato, revisione, origine e Confirmation. Ogni misura di potenza mantiene quantità/unità e proprie fonti; History/Audit conserva prima/dopo e decisioni, senza cancellare gli originali. Una conferma chiude soltanto le verifiche selezionate. Fingerprint delle evidenze e revisione del campo distinguono una verifica già risolta da un nuovo conflitto, evitando riaperture sul medesimo caso.

M3 mantiene personali i derivati anche da fonti home: non condivide automaticamente dati provenienti da private. Visibilità di schede fra familiari/professionisti richiede policy successiva. Blueprint e forme API in review-api-contract.md; schema concreto/migrazione ancora di Codex, non vincolati a un'implementazione inventata dal frontend.

### Implementazione M3
Le entita M3 sono ora nello schema backend-v5 e nella migration 202610130003_review. JSON validato per candidati, conferme, snapshot e storia; unicita job/campo e ambito idempotente account/Home/operazione/target/chiave. Migrazione applicata e verificata sul runtime locale con i test M3 API/PostgreSQL.

## H1 — modello implementato, migrazione locale applicata
HomeActivity: creatore/Home, collegamento BoilerAsset facoltativo, testo, dueDate calendario, stato open/completed/cancelled, versione e timestamp di chiusura. ActivityHistory conserva prima/dopo e note delle azioni esplicite; ActivityRequest protegge l'idempotenza. Tutti separati da proposte AI, storia tecnica della caldaia, Issue Genesis e report condominiale. Attività personale leggibile soltanto dal creatore con membership valida; collegamenti asset redatti se non più autorizzati, anche nella storia. Migrazione additiva 202610130005_activities applicata al solo dimora_v5_product_dev. FK Restrict; origine pubblica fissa user_created/explicit_user, snapshot interni con riferimento asset dinamicamente autorizzato. Contratto completo: activities-api-contract.md; ADR-V5-12 in implementation-decisions.md. Test di concorrenza, privacy, ciclo di vita e date passano; frontend integrato e verificato contro API e browser reale il 14 ottobre.

## BL-03 — storia della casa (22/10/2026)

`HomeHistoryEvent`: evento personale inserito a mano (account, casa, titolo, descrizione, `year` obbligatorio, `month`/`day` facoltativi, `sortKey` `YYYY-MM-DD` con `00` per le parti assenti, `documentIds` ≤5, stato `active|removed`, versione); `HomeHistoryRequest` per l'idempotenza. Le altre voci della storia (lavori, promemoria completati, oggetti aggiunti a Dimora) sono lette dalle loro tabelle, non copiate. Contratto: [home-history-api-contract.md](home-history-api-contract.md).

## BL-01 — prossimo promemoria (22/10/2026)

`HomeActivity.previousActivityId`: riferimento facoltativo e unico all'attività completata da cui il promemoria è stato proposto (al più un successivo per attività). Nessuna regola di ricorrenza memorizzata.

## Fatture distinte nello stesso originale — 22 ottobre 2026

Una bozza onboarding può rappresentare fatture complete su pagine singole distinte mediante `houseExpenses[].invoiceSegment:{key,page}`. La chiave deriva da SHA/pagina (`invoice-page-v1`), con fingerprint stabile fra copie e `itemId` legato alla bozza/documento; fornitore, numero e data rimangono ancoraggi obbligatori citati nella stessa pagina del totale. Nessuna nuova entità o migrazione. Ogni spesa canonica conserva `_invoiceSegment` nel JSON `economicProvenance`, oltre alle fonti per campo; separazione, conferma e duplicati operano per segmento. Il file originale e i suoi permessi rimangono unici. Nessun totale globale o soggetto/professionista attribuito implicitamente al gruppo. [Regole e prove Q48](fase0-q48-invoices-offline-20261022.md).

## Revisione split payment sulla fonte — 23 ottobre 2026

Il JSON interno ProductExtraction della bozza può contenere paymentReview: policy payment-review-v1, documentId/documentVersion/documentSha256 e reason split_payment oppure null. Prodotto soltanto dal server sul testo completo localmente verificato, non dallo schema AI; nessun nuovo testo salvato. Policy assente/vecchia o snapshot diverso impediscono automazione finanziaria, preservando la conferma umana. Nessuna tabella/migrazione o riscrittura delle bozze esistenti; metadato non proiettato pubblicamente. [Contratto e prove](fase0-q15-payment-offline-20261023.md).

## Prezzi verificati e identità di riga — 23 ottobre 2026

ProductItem può contenere invoiceLine:{key,page,row}, derivato dal server sul testo locale verificato (invoice-line-v1: SHA, pagina, posizione intestazione e indice riga); non è accettato dallo schema provider. Quantità/prezzo della riga esplicita Importo e data acquisto autonoma comune possono completare campi omessi dello stesso soggetto/pagina autorizzata; nessun prezzo ricavato dal totale o da altre righe. Le fonti restano ProductSource verified_text con estratti contigui.

La spesa salva economicProvenance._invoiceLine e provenienza di amountCents/spentOn; valori coincidenti con quelli verificati hanno origine extraction_confirmed, modifiche esplicite restano user_declared senza citazioni improprie. Storico e ricevuta economica coerenti nella stessa transazione. Identità per duplicati/collegamenti, costi indipendenti per oggetto; nessuna nuova tabella/migrazione o riscrittura dei dati precedenti. [Contratto e verifiche](fase0-q22-lines-offline-20261023.md).

## Copertura delle fatture nel PDF visivo — 23 ottobre 2026

ProductExtraction può conservare invoiceCoverage:{version:invoice-coverage-v1,totalPages,sentPages,coveredPages,pendingPages}, calcolato dal server e non accettato dal provider. Solo riferimenti numerici di pagina, nessun contenuto. Per fatture di servizi in PDF visivo multipagina, una proposta singola riceve comunque invoiceSegment con ancoraggi completi; un’altra pagina senza fattura completa proposta rimane pendente. La bozza può restare open anche dopo aver confermato tutte le proposte attualmente disponibili. Copertura, conferma canonica e verità delle osservazioni visive restano distinte.

Il wire v26 organizza invoicePages.pN con kind/expenses per ogni pagina inviata; normalizzazione verso gli stessi HouseExpense e controllo della pagina di ogni fonte, senza nuovi oggetti persistenti. Il ledger di qualità conserva facoltativamente la copertura bounded, compatibile con osservazioni storiche prive del campo. Nessuna migrazione/backfill o modifica ai risultati precedenti. [Contratto e verifiche](fase0-q48-coverage-offline-20261023.md).

### Costo complessivo con più fatture — 23 ottobre 2026

Nessuna nuova tabella: nel percorso manuale di riconciliazione rimane un solo HomeExpense. `economicProvenance._purchaseReview` conserva policy purchase-review-v1, totale dichiarato, account confermante e snapshot documentId/versione/SHA delle fonti, inclusa la primaria. Origine importo user_declared senza citazioni di importi diversi. I documenti restano distinti e collegati alle stesse schede; non viene creato un movimento per ogni rata. Fonte primaria e data della spesa non sono sostituite automaticamente. Accesso alle fonti e snapshot vengono ricontrollati anche al replay. [Limiti e verifica](fase0-installments-fix-offline-20261023.md).

## Cestino dei documenti — 23 ottobre 2026

Migrazione additiva `20261023200000_document_trash`. `Document` aggiunge `trashedAt`, `purgeAfter` (30 giorni dopo), `purgedAt` e `lifecycleVersion` (versione delle operazioni di cestino); CHECK `Document_trash_lifecycle`: scadenza solo nel cestino, eliminazione definitiva solo da cestino. Dopo l'eliminazione definitiva la riga resta come segnaposto senza contenuto (nome vuoto, versione e `StoredFile` rimossi) per non toccare le chiavi esterne `Restrict` delle schede confermate. `TrashRequest` è il registro idempotente delle operazioni; `DeletionRecord` registra tipo, id, motivo, chiave di storage e `fileRemovedAt` senza contenuto, univoco per risorsa, per la ripetizione della rimozione fisica e la futura riapplicazione dopo restore. [Report](cestino-lotto1-report-20261023.md).
