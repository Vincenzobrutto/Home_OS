# R07 — avvio uniforme e protetto dei test offline

23 ottobre 2026. Branch codex/fase0-ai-quality-v3, base c34bfbf934e2e3edb096ef846b24ad344dad1375. Fetch iniziale: HEAD/upstream 0/0, HEAD/origin/main 435/0; nessuna integrazione con main. Prosegue il piano di audit con le procedure simple-refactor/refactor-roadmap già lette, senza nuove dipendenze.

## Risultato

Tutti gli alias npm test/test:* del backend passano da test/offline.cjs. Il registro esplicito contiene **34 profili: nove senza DB e 25 con DB**, incluso il profilo aggregato. I sette wrapper PowerShell precedenti delegano al medesimo ingresso. Confrontate le liste di file dei **25 vecchi comandi npm** e dei **sette wrapper**: nessuno scenario rimosso. Il profilo test:offline-db unisce senza duplicati **41 file DB**, più il file di verifica dopo riavvio. File HTTP esterni e test diretti sono eseguiti in fasi separate; l’ordine operativo cambia per evitare competizione dei worker.

Ogni ingresso ricompila il backend: npm test non dipende più da un dist eventualmente vecchio. I comandi DB richiedono PgBin e ScratchRoot espliciti, anche il wrapper quality-v3 prima dotato di default. Niente --env-file=.env negli script di test. Il comando start e gli strumenti DB di prodotto non vengono modificati.

## Protezioni

- Target fisso **quality_test@127.0.0.1:55439/dimora_v5_quality_v3_test**, API temporanea **3119**. Un primo avvio ha rifiutato correttamente la porta 55433 occupata dal collaudo dell’utente: i servizi 55433/3109 sono stati lasciati intatti. Nessuna scelta automatica di server esistente; porte del runner occupate causano un rifiuto.
- Nuova directory e cluster per ogni esecuzione, con marcatore di proprietà. Copia dei soli input tracciati, build e client generato; dipendenze tramite junction. Niente .env, storage o configurazioni locali. Solo la copia temporanea adatta gli indirizzi, il guard Prisma compilato e un header di proprietà per la readiness dell’API; un formato compilato inatteso viene rifiutato. Gold e sorgenti di prodotto restano identici.
- Ambiente dei figli ridotto alle variabili del sistema operativo e alla configurazione sintetica. Esclusi chiavi AI/email, proxy, PG*, override API e NODE_OPTIONS ereditati. URL DB ereditati estranei all’allowlist rifiutati prima della build. Stato del processo chiamante conservato.
- Preload nei processi Node: guardia fetch/socket/TLS e guardia sui costruttori Prisma generati, compresi URL espliciti. Nei test unitari nessun client DB; nei test DB il client riceve solo il target sintetico ammesso. Gli strumenti PostgreSQL ricevono directory/host/porta espliciti. HTTP ammesso solo per l’API posseduta e i listener creati dal processo di test.
- Migrazioni applicate al solo cluster nuovo e vuoto. Su fine o errore vengono arrestati soltanto l’API, i processi figli e il cluster del runner. Log e cluster fermo restano sul disco, senza rimozioni ricorsive. Dieci minuti massimi per comando; gestione Ctrl+C/SIGTERM implementata. Arresto forzato del sistema e timeout massimo non simulati in questa verifica.

Le protezioni agiscono sui processi Node/Prisma delle suite fidate del repository e sui parametri degli strumenti PostgreSQL; nessuna modifica del firewall o pretesa di isolamento da codice ostile arbitrario. Nessuna API, transazione, autorizzazione, validazione o percorso del prodotto viene modificato.

## Problemi intercettati e corretti

1. **API e test di code in competizione.** L’API completa avviata per tutto il gruppo poteva reclamare i job dei test diretti: assert(claimed) o stato succeeded fallivano. Ora l’API parte soltanto per i quattro file che ne hanno bisogno e viene fermata prima degli altri. La ripetizione ha eliminato quei due errori senza cambiare asserzioni o logica di prodotto.
2. **Snapshot obsoleto del catalogo vuoto dopo revoca.** Un test ricevute attendeva solo items/nextCursor. Ora verifica esattamente anche total, facets e today, imponendo zero conteggi dopo la revoca. Conservati tutti i successivi rifiuti 403, l’esclusione da export, lo storico e i controlli sui costi. Nessuna asserzione di privacy ridotta.
3. **Fixture incerta non deterministica nel test dopo riavvio.** findFirst selezionava un’incertezza di un’altra campagna/modalità; la ricostruzione senza modalità generava una richiesta diversa. La fixture di crash ha ora un identificatore riconoscibile e il test seleziona quella, verificando anche key full-run e provider offline. L’asserzione **zero nuovi invii**, la riserva incerta e i tetti immutabili restano obbligatorie. Nessun retry del prodotto modificato, nessuna campagna storica riscritta.

Corretti inoltre quoting Windows del preload e lettura dei moduli durante il caricamento della guardia Prisma; nessuna soppressione globale dei warning.

## Verifiche

| Comando/prova | Esito finale |
| --- | --- |
| Build TypeScript e lint | superati |
| npm test | **224/224**, inclusi i dieci nuovi test delle guardie |
| npm run test:object-onboarding | **295/295** |
| npm run test:quality-v3 | **24/24** |
| npm run test:quality-v3-live-guards | **14/14**, fixture senza invio |
| npm run test:object-manuals / test:reference-matrix | **7/7** e **1/1** |
| npm run test:offline-db | **495/495**: 54 HTTP esterni, 439 DB diretti, due dopo riavvio PostgreSQL |
| Errore intenzionale nella fase HTTP | cleanup verificato: API/PG fermati, 55439/3119 libere, marcatore e log conservati |
| Liste scenari dei comandi precedenti | 25 alias npm + sette wrapper confrontati, file preservati |

I conteggi dei comandi si sovrappongono e non vanno sommati come test distinti. La campagna sintetica del ledger usa provider finti e verifica persistenza/idempotenza; non è una nuova campagna AI. Sono provati rifiuto di URL reali/remoti/ambigui, rimozione delle credenziali ereditate, socket/TLS/fetch vietati, URL espliciti Prisma vietati prima del motore, porte occupate conservate, proprietà, adattamento stretto della copia e rifiuto dei formati inattesi.

Log e cluster trattenuti nella cartella work della chat, sottocartelle r07-clusters e r07-failure-clusters. I titoli storici di alcuni test dicono “DB reale”: in questo lotto significano PostgreSQL effettivo nel cluster temporaneo, mai il DB personale. Run finale dimora-offline-piLlXd: tutte le tre fasi verdi, guardie finali attive dall’avvio; marcatore postmaster assente al termine e porte 55439/3119 libere. Anche i sette wrapper PowerShell sono stati provati con percorsi contenenti spazi e binari inesistenti: rifiuto prima della build e codice nonzero propagato. La ExecutionPolicy di sistema resta invariata; la prova usa l’opzione di processo già presente nei vecchi comandi.

## Uso e seguito

Dalla cartella backend-v5:

```powershell
npm test
npm run test:object-onboarding
npm run test:offline-db -- --pg-bin "C:\strumenti\postgresql\bin" --scratch-root "C:\collaudi-dimora"
```

Sostituire i due percorsi con quelli locali. Guida dettagliata: backend-v5/test/OFFLINE.md. R07 completato nel perimetro dei comandi di test backend; nessun DB permanente di test istituito. Restano R03/R04 sulle altre estrazioni, R05 misure delle query e gli altri lotti del piano. Frontend invariato, mock non ripetuta: ultimo dato storico 858/858.

Nessuna chiamata AI/email, lettura di originali personali, connessione al DB reale 55432, modifica .env, gold, ledger storici, migrazioni di prodotto o 104 StoredFile orfani. Nessun reset/clean, force push, rimozione worktree o riavvio dei servizi dell’utente. File legacy sporchi e untracked estranei preservati. Commit e push sul solo branch Fase 0, hash definitivo verificato nella consegna.
