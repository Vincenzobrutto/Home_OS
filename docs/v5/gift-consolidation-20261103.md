# Gift e planimetrie — consolidamento del 3 novembre 2026

## Mandato e perimetro

Vincenzo ha confermato nella prova locale: «funziona top», dopo ricezione Gift e apertura Ambienti/Planimetria. Il 3 novembre ha approvato: chiusura Gift/classificazione ricevuta, integrazione dei rami nel consolidamento, poi ripresa del fascicolo documentale AI. Nessun deploy o modifica main, demo pubblica Alessio, nuova AI/spesa o uso di dati personali.

## Fonti e candidato

Remote consolidamento `cbddcf0884cdc17cfeff41daf7ba6cbe4ccd999e`; main `cdbb318ddb56e764ad4b111a71560e3e71c7a033`. Fetch e hash verificati. PR72 `b6efba3`, PR73 `c3f9956`, PR74 `8f1ba91`, PR75 `f961f47` sono una catena di antenati: l'ultima contiene tutte le precedenti. Corpi/diff e dipendenze esaminati; nessun cherry-pick dell'ultimo commit isolato. Candidato `codex/gift-consolidamento-20261103`, checkout separato dalla base remota; merge locale `4dd8469` senza conflitti. Il checkout locale storico del consolidamento è più arretrato e pulito: non usato per scritture né riavviato.

## Prova utente e recupero del collegamento

La prima Gift era stata indirizzata a un'email diversa dal destinatario demo. Prima dell'accettazione il link è stato revocato e la consegna ricreata per l'account sintetico concordato, con i tre documenti indicati, mappa e anno. Accesso normale, anteprima poi ricezione completata dal committente e mappa aperta nella sua nuova casa. Non un test con documenti reali né prova di nuova registrazione. Link personali non riportati in Git. Collaudo lAunc8 ancora disponibile fino3nov12:30Rome; non modifica o ferma alcun altro ambiente. I precedenti bLJISV/b55HFe hanno arresto verificato, non sono stati ripristinati.

## Correzione della classificazione implementata

Usare solo Source.kind già classificato esplicitamente, con snapshot/versione/fingerprint nella consegna. Nessuna inferenza dal filename. Tipo canonico solo per corrispondenze certe; famiglia archivio può raggruppare il tipo dichiarato dall'agenzia. La provenienza dell'organizzazione resta agency_gift finché il proprietario adotta esplicitamente i dati; consegna finale e compilazione personale sono cose diverse. Vecchie consegne e documenti già ricevuti restano invariati, senza backfill.

## Implementazione e verifiche

Prodotto `80680b53b797864f87aaa8f7ee5d001d8f75d5ee`: classificazione Gift policy1/provenienza/organizzazione personale e selettore dei7tipi nella pratica. Prisma client privato generato, nuova migrazione additiva pronta. Backend ordinari889/889 senza skip; frontend mirato60/60 su navigazione/workspace/revisione e parser provenienza10/10; typecheck/lint mirati e build frontend verdi. Bundle principale517,71kB, warning Vite mantenuto.

Review indipendente in sola lettura: nessun blocker su sessione/Origin/CSRF, copia atomica/fence/receipt, indipendenza Home, segreti/retry e classificazione sigillata. Non sostituisce verifiche runtime. Dependency/cache/generated privati; node_modules junction read-only. DB soltanto su nuovi cluster protetti, nessuna migrazione dei servizi esistenti.
## Prove post-integrazione concluse

Backend del prodotto80680b5, identico nel candidato dopo le sole correzioni frontend:889/889 ordinari; nuovo cluster LQs36N:792/792 DB,54/54 HTTP e2/2 riavvio, tutti senza skip. Migrazioni applicate soltanto al nuovo cluster. Runner50146exit0, stopPostgreSQL riuscito, postmaster.pid assente e nessun listener55439/3119. Non riutilizzato o ripristinato.

Il collegamento fra catalogazione e Gift aveva una lettura pre-commit: il pannello poteva mantenere una revisione vecchia. Correzione9725ce3 con practiceRevision opzionale e GET differito a pannello libero, risposte tardive recintate, invio bloccato finché l'elenco non è aggiornato. Nessun remount, POST automatico o perdita del link per il solo refresh. Quattro riproduzioni inizialmente rosse, poi40/40 mirati su40casi finali (19SimplePanel,21Navigation), typecheck/lint verdi. Semantica preesistente readOnly/revoca preservata.

Primo run frontend ampio interrotto per la correzione reale dopo una failure Oggetti/focus. Il file isolato passava quel caso ma falliva su un altro import lazy; il test esatto falliva nello stesso punto anche sulla baseline cbddcf0 senza Gift, con DOM ancora nel fallback Suspense. Nessuna asserzione o timeout sono stati allentati. Commit test-only b396a00 precarica RoomsPages/ObjectsPages/DocumentDetailPage prima delle attese UI: 27/27 verdi, navigazione e conteggio scritture invariati. Route prodotto ancora lazy.

Regressione completa finale su b396a00: **2.009/2.010**, 190 file passati e un file routing con attesa scaduta entrando in Agenzie; il DOM conservava la lista case durante la navigazione. Riesecuzione dell'intero file invariato: **10/10**. Anche il test singolo baseline passa: non attribuire con certezza la causa alla sola importazione. Preload test-only del modulo Agenzie, senza cambiare produzione/asserzioni/timeout: **10/10**. Non è stata rieseguita una seconda suite completa dopo questa sola modifica al caricamento del test. Typecheck app/node, lint mirato e build finali verificati separatamente.

Browser QA sul nuovo llVmXl, snapshot prodotto9725ce3: login agente, tipo Atto salvato, Gift creata immediatamente senza ricarica manuale, selezione atto+planimetria/mappa3vani+prospetto e nota interna esclusa. Destinatario fixture già verificato, normale accesso/accettazione/poller, anno lasciato disattivato. Nell'archivio:3file, proprietà1,catasto1,da classificare1(prospetto non classificato nel fascicolo); tipoPlanimetria canonico e workflowto_compile3, filtro/type persistenti dopo reload. Nessuna inferenza sui dati sconosciuti.

Archivio e selettore tipi leggibili a375×812, scrollWidth360su375, console senza errori, viewport ripristinato. Screenshot privato negli outputs della chat, senza token inGit. Non una prova su telefono fisico. Tab QA chiusa e cluster fermato con il proprio marker:1/1harness,runner90204exit0,owned-stop-marker10:12:11.815UTC,stopPG riuscito,pid assente,nessun listener55439/63145. UsertriallAunc8secondary55440lasciato invariato. Nessuna nuova AI, email reale o servizio esistente coinvolto.
