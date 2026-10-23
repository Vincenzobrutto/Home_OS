# Fase 0 — collaudo del percorso completo nell’interfaccia, 23 ottobre 2026

**Seguito**: le tre anomalie sono state successivamente corrette e il percorso ripetuto offline; vedere il [report delle correzioni](fase0-ui-fixes-offline-20261023.md). Questo documento conserva gli esiti del collaudo precedente.

## Ambito ed esito

Eseguito nel browser il frontend V5 con API vera, PostgreSQL e storage nuovi e temporanei. Tre PDF anonimizzati già autorizzati sono stati letti esclusivamente in locale: ordine macchina da caffè, acconto e saldo degli stessi climatizzatori. Nessuna estrazione AI: tutti i valori e i collegamenti sono dichiarazioni manuali di collaudo. Questa verifica dimostra la persistenza del percorso manuale e i suoi limiti, non l’accuratezza della precompilazione automatica.

Nessun fix di prodotto in questo checkpoint. Le anomalie osservate sono registrate, senza dichiararle risolte o cambiare validazioni. Nessuna modifica ad API/schema, gold, prompt, scorer, campagne o ledger delle campagne.

## Ambiente riproducibile

- Codice iniziale: `d7e234a2ccb3d6cbbf57dba65103c04b4eb2a0eb`, branch `codex/fase0-ai-quality-v3`.
- Frontend sorgente su loopback 5179, API compilata copiata su 3109, database nuovo `dimora_v5_quality_v3_test`, ruolo `quality_test`, porta 55433. Configurazione Vite e cache nel temporaneo; `envDir` vuoto, nessuna `.env` copiata o modificata.
- Solo nella copia compilata il controllo dell’indirizzo DB è adattato al DB temporaneo. Il controllo del prodotto, membership, Origin/CSRF e versione/SHA restano operativi. Migrazioni applicate soltanto al cluster nuovo.
- Seed limitato ad account di prova, una casa e due stanze. Oggetti, documenti, costi e collegamenti creati dal browser attraverso l’interfaccia, senza scritture API alternative. Query SQL finali in transazione `READ ONLY`.
- `M4_AI_ENABLED=false`, chiave provider rimossa dall’ambiente del processo, nessuna configurazione AI/mail copiata; guard delle chiamate fetch esterne nella copia API. Verifica finale: zero `ObjectOnboardingJob` e zero `ObjectOnboardingAttempt`.
- API, frontend e cluster temporanei fermati alla fine; directory conservata. Il DB dell’app sulla porta 55432, gli originali sorgente e i 104 StoredFile segnalati nel backlog non sono stati modificati.

## Prove nell’interfaccia

| Passaggio | Risultato osservato |
|---|---|
| Caricamento ordine caffè, compilazione manuale | Una scheda con marca e modello; un costo dichiarato di 499 EUR, data contabile scelta 14 giugno 2026; documento originale collegato. Il costo non certifica pagamento. |
| Collocazione esplicita | Scelta della stanza di collaudo, comando Salva stanza, persistenza dopo ricaricamento. Nessuna stanza dedotta dal documento. |
| Date | Data dell’ordine inserita e salvata dalla modifica della scheda, persistita dopo reload. Acquisto, consegna e garanzia assenti nel profilo; nessuna data derivata dall’ordine. |
| Ricaricamento identico ordine | Stesso documentId, riepilogo già salvato e stesso costo; nessun secondo oggetto o spesa. |
| Acconto | Tre schede dichiarate manualmente, due Sensira distinti e uno Stylish; costi lasciati da decidere. Nessun importo inventato o ripartito. |
| Saldo | Selezione esplicita delle tre schede esistenti; esito zero nuovi oggetti e zero nuove spese. Entrambe le fatture presenti sulla scheda consultata. |
| Ricaricamento saldo poi acconto | Originali riutilizzati; nessun incremento dei conteggi canonici. La revisione economica resta aperta. Non equivale a una nuova prova UI partendo da casa vuota con saldo per primo. |
| Verifica finale canonica | 3 documenti, 4 oggetti, 1 spesa. Ognuno dei 3 oggetti `cooling` ha esattamente 2 collegamenti documentali attivi, con fonti distinte e nessun collegamento duplicato. Costo caffè `user_declared`, 49900 centesimi. |

La data contabile della spesa è una scelta manuale di test: non prova la data di pagamento o di consegna dell’ordine. Le stanze e le etichette dei singoli esemplari sono dichiarazioni di collaudo, non dati dedotti della casa reale.

## Anomalie e limiti rimasti aperti

1. Il primo Salva e continua dell’ordine ha mostrato «Archiviazione del documento da verificare» senza creare oggetti o costi. Il successivo tentativo, senza cambiare i dati, è riuscito. Prima del successo il ledger di organizzazione era vuoto; dopo contiene una sola ricevuta confermata. Non è stata raccolta la causa HTTP originaria: non attribuire il problema a un conflitto specifico e non dichiararlo corretto. La diagnostica temporanea è stata rimossa, nessun log di contenuti personali nel repository.
2. L’inserimento iniziale della data ordine nell’intake non risultava nel profilo finale. È stata reinserita dalla scheda, verificata nel DOM e dopo reload. Questo verifica la modifica della scheda; la persistenza della data attraverso la prima compilazione intake richiede una regressione mirata, prima di dichiarare quel passaggio superato.
3. Dopo conferma parziale con costo rinviato, riaprendo/ricaricando il documento le schede e le fonti restano salvate, ma il modulo economico riparte da Registra una nuova spesa / Un importo unico. Il rinvio non crea costi e la compilazione incompleta impedisce la conferma; la scelta di rinvio e l’etichetta acconto/saldo vanno però reinserite oppure salvate esplicitamente in bozza. Migliorare la ripresa della compilazione parziale senza riutilizzare una vecchia richiesta di conferma né trasformare il rinvio in costo.

Prossimo passo prioritario: riprodurre questi tre punti con regressioni mirate del workspace, correggere eventuali difetti di persistenza e messaggi di recupero, poi ripetere il percorso UI. Nessun nuovo invio AI implicito. La precompilazione sui reali richiede un consenso distinto e una misura dedicata; il gate AI storico non cambia.

## Verifiche automatiche di questo checkpoint

- Frontend `npm run typecheck` e `npm run lint`: superati.
- Suite frontend completa `npx vitest run --project mock --maxWorkers 2 --retry 1`: **838/838, 102/102 file**, 650,30 secondi. Retry massimo 1 configurato per i timeout già annotati; nessuna asserzione modificata. Avvisi jsdom `scrollTo` non implementato, nessun fallimento finale.
- Runner versionato `backend-v5/test/installment-offline.ps1`: build TypeScript e **82/82** controlli DB, con ordini, acconto/saldo in entrambi gli ordini, Q48 e varianti generali. Inclusi privacy tra owner, revoca, SHA/versione, replay durevole/concorrenza e assenza di doppioni. Cluster nuovo creato e fermato dal runner.
- Query di sola lettura dell’ambiente UI: tutti gli invarianti finali descritti sopra confermati; prima interrogazione del conteggio climatico corretta da tipo inesistente `climate` al valore effettivo `cooling`, poi risultata vera.
- Le altre suite HTTP/DB da 98 e 38 test non sono state ripetute in questa sessione; rimangono risultati del checkpoint precedente. Nessuna nuova chiamata AI né verifica di accuratezza del modello.


Le prove UI sono acconto→saldo e ricaricamento saldo→acconto. L’inversione iniziale su casa vuota, concorrenza, privacy, revoca, SHA/versione e replay da altro client appartengono alla suite DB isolata, non a una seconda sessione UI dichiarata. Screenshot del catalogo, scheda con due fatture, stanza/data e pagina Spese conservati negli output locali della sessione; nessun PDF o screenshot personale versionato.
