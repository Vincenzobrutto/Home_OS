# Test offline V5

Eseguire i comandi dalla cartella backend-v5. Tutti gli script npm test/test:* passano da offline.cjs, con profili espliciti in offline-suites.cjs. Il runner ricompila prima di ogni suite: npm test non usa più un dist eventualmente vecchio.

## Suite senza DB

```powershell
npm test
npm run test:object-onboarding
npm run test:quality-v3
npm run test:quality-v3-live-guards
npm run test:offline -- --list
npm run test:document-workflow
```

Il profilo live-guards verifica ricevute e limiti con fixture offline; non avvia una campagna. I trasporti provider dei test sono simulati. I comandi non caricano .env.

## Suite con un DB temporaneo nuovo

Servono i binari PostgreSQL Windows già disponibili e una cartella di lavoro esplicita. Esempio, sostituendo i due percorsi:

```powershell
$testPgBin = 'C:\strumenti\postgresql\bin'
$testScratch = 'C:\collaudi-dimora'
npm run test:offline-db -- --pg-bin "$testPgBin" --scratch-root "$testScratch"
```

Il profilo completo unisce senza duplicati i file delle suite DB registrate e verifica il ledger anche dopo un arresto/riavvio di PostgreSQL. Per un solo gruppo:

```powershell
npm run test:contacts-db -- --pg-bin "$testPgBin" --scratch-root "$testScratch"
npm run test:q48-coverage-db -- --pg-bin "$testPgBin" --scratch-root "$testScratch"
npm run test:document-workflow-db -- --pg-bin "$testPgBin" --scratch-root "$testScratch"
npm run test:workflow-fixtures-db -- --pg-bin "$testPgBin" --scratch-root "$testScratch"
npm run test:workflow-clock-db -- --pg-bin "$testPgBin" --scratch-root "$testScratch"
```

Gli altri alias esistenti restano disponibili con gli stessi parametri; anche i sette vecchi wrapper PowerShell delegano al medesimo runner. PgBin e ScratchRoot sono ora obbligatori per ogni ingresso DB, incluso il vecchio quality-v3-offline.ps1.

Il gruppo `document-workflow` recupera i test unitari di bozze, suggerimenti, periodo, contatti e guardie di automazione; è incluso anche in `npm test`. Il gruppo DB verifica archivio, famiglie, planimetrie, catalogo, conservazione del solo documento e completamento della bolletta; confluisce in `test:offline-db`. `offline-registration.test.cjs` impedisce di lasciare file di test esclusi da tutti i profili.

`workflow-clock-db` osserva su sole fixture l'eventuale differenza fra il default PostgreSQL e l'ora Node, mantenendo il divieto di membership future, revocate o scadute. Per una fixture che deve essere già attiva dichiarare `validFrom` esplicitamente nel passato: non introdurre tolleranze nell'autorizzazione o attese/retry per far sparire un 403. `workflow-fixtures-db` verifica i tre scenari di ordini, acconto/saldo e varianti generali con questo setup; l'aggregato deduplica i file presenti in più profili.

## Confini e gestione delle risorse

Profili indipendenti del cestino (eseguire in sequenza, con gli stessi PgBin/ScratchRoot): `test:cestino-race-db`, `test:cestino-riesame-db`, `test:cestino-extra-review-db` e `test:cestino-fixes-db`. Quest'ultimo copre continuazione, privacy delle fonti, ricontrollo dell'export e lifecycle delle anteprime. Sono separati dall'aggregato originale; vanno eseguiti esplicitamente, non saltati perché `test:offline-db` è verde. [Correzioni e risultati](../../docs/v5/cestino-correzioni-backend-20261025.md).

Per la chiusura integrata, `npm run test:cestino-completo-db -- --pg-bin <PgBin> --scratch-root <ScratchRoot>` riunisce i cinque gruppi del cestino su un unico cluster nuovo, senza duplicare i file o cambiare le asserzioni. Rimane fuori dall'aggregato storico: eseguire anche `test:offline-db`. Il contratto bolletta incluso nell'aggregato verifica inoltre cestino/ripristino con classificazione conservata e una sola spesa. [Chiusura e limiti di attivazione](../../docs/v5/cestino-chiusura-20261025.md).

- Unico target del runner: quality_test@127.0.0.1:55439/dimora_v5_quality_v3_test. API isolata su 3119. Porte occupate causano un rifiuto, senza stop o riuso di servizi esistenti. Nessun fallback a 55432/3001 o al collaudo 55433/3109.
- Ogni esecuzione crea una sottocartella dimora-offline-* nuova con marcatore di proprietà. Copia input tracciati da Git, dist appena compilato, client generato e fixture. node_modules è una junction di sola dipendenza; .env, storage e configurazioni locali non vengono copiati. Per nuovi test DB, aggiungere i file all’indice prima del collaudo.
- Soltanto nella copia temporanea vengono adattati gli indirizzi dei test e il vincolo Prisma compilato; assert, Origin/CSRF, gold e controlli applicativi rimangono. Un formato compilato inatteso fa fallire la preparazione. La risposta di readiness deve riportare il marcatore dell’API appena creata.
- L’ambiente dei figli conserva soltanto le variabili necessarie al sistema operativo e la configurazione sintetica del runner. Credenziali provider/email, proxy, PG*, override API e NODE_OPTIONS ereditati vengono esclusi. Un DATABASE_URL/QUALITY_V3_DATABASE_URL ereditato diverso dall’allowlist viene rifiutato prima della build; rimuovere la sola variabile del processo, senza modificare .env.
- Preload ereditato dai processi Node: controllo fetch/socket/TLS e costruttori Prisma generati. Niente DB nei profili unitari; nei profili DB anche URL espliciti devono coincidere con l’allowlist. HTTP ammesso per il solo API isolato e i listener creati dal processo di test. Gli strumenti PostgreSQL ricevono indirizzi e directory espliciti.
- L’API esterna parte solo per i file che la richiedono. Viene arrestata prima dei test che gestiscono direttamente le code, così i worker non sottraggono job al collaudo. Le suite vengono serializzate; asserzioni, timeout dei test e validazioni di prodotto non sono ridotti.
- Su successo o errore il runner arresta soltanto API/processi figli e cluster posseduti. Ogni comando ha un limite di dieci minuti; Ctrl+C/SIGTERM porta al cleanup delle risorse possedute. Log, cluster fermo e file temporanei restano sul disco; nessuna cancellazione ricorsiva. Per API/PG vedere api.log, postgres.log e stop-postgres.log; i risultati sono in http-tests.log, tests.log e restart-tests.log.

Le guardie coprono i trasporti Node e i client Prisma delle suite registrate. Il runner esegue codice di test fidato del repository, senza cambiare firewall o configurazione del sistema. Non è un ingresso per comandi arbitrari, documenti personali o campagne AI.
