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
