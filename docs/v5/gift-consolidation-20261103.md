# Gift e planimetrie — consolidamento del 3 novembre 2026

## Mandato e perimetro

Vincenzo ha confermato nella prova locale: «funziona top», dopo ricezione Gift e apertura Ambienti/Planimetria. Il 3 novembre ha approvato: chiusura Gift/classificazione ricevuta, integrazione dei rami nel consolidamento, poi ripresa del fascicolo documentale AI. Nessun deploy o modifica main, demo pubblica Alessio, nuova AI/spesa o uso di dati personali.

## Fonti e candidato

Remote consolidamento `cbddcf0884cdc17cfeff41daf7ba6cbe4ccd999e`; main `cdbb318ddb56e764ad4b111a71560e3e71c7a033`. Fetch e hash verificati. PR72 `b6efba3`, PR73 `c3f9956`, PR74 `8f1ba91`, PR75 `f961f47` sono una catena di antenati: l'ultima contiene tutte le precedenti. Corpi/diff e dipendenze esaminati; nessun cherry-pick dell'ultimo commit isolato. Candidato `codex/gift-consolidamento-20261103`, checkout separato dalla base remota; merge locale `4dd8469` senza conflitti. Il checkout locale storico del consolidamento è più arretrato e pulito: non usato per scritture né riavviato.

## Prova utente e recupero del collegamento

La prima Gift era stata indirizzata a un'email diversa dal destinatario demo. Prima dell'accettazione il link è stato revocato e la consegna ricreata per l'account sintetico concordato, con i tre documenti indicati, mappa e anno. Accesso normale, anteprima poi ricezione completata dal committente e mappa aperta nella sua nuova casa. Non un test con documenti reali né prova di nuova registrazione. Link personali non riportati in Git. Collaudo lAunc8 ancora disponibile fino3nov12:30Rome; non modifica o ferma alcun altro ambiente. I precedenti bLJISV/b55HFe hanno arresto verificato, non sono stati ripristinati.

## Correzione della classificazione (in lavorazione)

Usare solo Source.kind già classificato esplicitamente, con snapshot/versione/fingerprint nella consegna. Nessuna inferenza dal filename. Tipo canonico solo per corrispondenze certe; famiglia archivio può raggruppare il tipo dichiarato dall'agenzia. La provenienza dell'organizzazione resta agency_gift finché il proprietario adotta esplicitamente i dati; consegna finale e compilazione personale sono cose diverse. Vecchie consegne e documenti già ricevuti restano invariati, senza backfill.

## Verifiche e pubblicazione

In corso, nessun risultato storico presentato come nuovo. Dependency/cache/generated privati del candidato; node_modules junction read-only. DB solo nuovi cluster protetti, seriali sul primario libero55439; usertrial55440 invariato. Risultati finali e hash saranno registrati dopo i controlli.
## Candidato implementato e primi controlli

Prodotto `80680b53b797864f87aaa8f7ee5d001d8f75d5ee`: classificazione Gift policy1/provenienza/organizzazione personale e selettore dei7tipi nella pratica. Prisma client privato generato, nuova migrazione additiva pronta. Backend ordinari889/889 senza skip; frontend mirato60/60 su navigazione/workspace/revisione e parser provenienza10/10; typecheck/lint mirati e build frontend verdi. Bundle principale517,71kB, warning Vite mantenuto.

Review indipendente in sola lettura: nessun blocker su sessione/Origin/CSRF, copia atomica/fence/receipt, indipendenza Home, segreti/retry e classificazione sigillata. Non sostituisce verifiche runtime. Regressione frontend completa e DB/API completi sono in corso: un errore nel test preesistente objects.test.tsx sulla creazione attività/focus è da diagnosticare al termine, non classificato ancora come flake. Nessuna asserzione o timeout allentati e nessun push al consolidamento prima della risoluzione.