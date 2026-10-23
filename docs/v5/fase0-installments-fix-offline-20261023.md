# Fase 0 — correzione offline acconto/saldo, 23 ottobre 2026

## Comportamento implementato

Le fatture riferite agli stessi climatizzatori si collegano alle stesse schede tramite selezione esplicita. Nella conferma di una singola fattura il server impedisce la creazione di una scheda con nome normalizzato già presente e leggibile nella stessa casa/account: propone di collegarla o di identificare esplicitamente un apparato distinto. Nessun merge di oggetti dedotto dal solo modello commerciale.

Se le schede sono già collegate a un'altra fattura con una spesa, il secondo totale non può diventare una nuova spesa attraverso questa conferma, nemmeno con la generica accettazione dei possibili doppioni. Occorre lasciare l'importo pendente oppure dichiarare esplicitamente lo stesso acquisto e confermare il costo complessivo. Le etichette acconto/saldo richiedono inoltre conferma esplicita del costo complessivo già sulla prima registrazione. Le diciture proposte non possono essere aggirate modificando solo il titolo finale.

La nuova revisione `purchaseReview` consente, per una singola fattura non segmentata, di collegare il secondo documento alla spesa già esistente quando entrambi i documenti sono leggibili e collegati esattamente allo stesso insieme non vuoto di schede attive. Il costo complessivo viene inserito esplicitamente dall'utente; non viene ricavato sommando, sottraendo o confrontando i totali. Il sistema aggiorna un solo record economico, con CAS sulla versione, storico e ricevuta di onboarding nella stessa transazione. L'importo confermato è `user_declared`, senza citazioni che fingano di dimostrarlo.

L'interfaccia offre la conferma «Acconto e saldo dello stesso acquisto: mantieni una sola spesa» e un campo vuoto «Costo complessivo confermato (€)». Non copia automaticamente il totale di una fattura nel campo. Cambiare spesa o modalità azzera la conferma. «Decidi più avanti» mantiene aperta la revisione senza nuovi costi. Il salvataggio della compilazione non equivale a conferma economica.

## Protezioni preservate

- Nessuna autorizzazione automatica alla riconciliazione: conferma manuale obbligatoria.
- Accesso per fonte, membership, account/casa, schede attive, snapshot versione/SHA, CAS della spesa, lock casa e idempotenza. Replay da altro client e revoca di una qualsiasi fonte della riconciliazione vengono ricontrollati.
- Gli originali restano documenti distinti. La fonte primaria della spesa e la sua data rimangono quelle già registrate; non viene inventata una nuova data di acquisto o pagamento.
- Le fonti aggiuntive sono registrate internamente in `economicProvenance._purchaseReview` con versione/SHA; massimo 20 documenti. Anche una copia della seconda fattura già riconciliata non può generare un nuovo costo.
- Il percorso normale `link_existing` continua a respingere SHA diversi. L'eccezione richiede `same_purchase`, fonti verificabili e identico insieme di schede. Spese precedenti senza riferimenti verificabili richiedono revisione, non un bypass.
- Nessuna modifica a schema/migrazioni, gold, corpus, scorer, prompt o ledger AI. Nessuna chiamata AI/email, accesso a DB/API/storage reale, `.env`, deploy o riavvio dell'API dell'app.

## Verifica e limiti

Il caso deriva dai due documenti reali anonimizzati e dalla relazione acconto/saldo confermata dal committente. Nel DB temporaneo entrano soltanto riferimenti SHA/dimensione e dati manuali di collaudo: nessun PDF originale è copiato nello storage o nel repository. Entrambi i PDF rimangono immagini senza testo locale estraibile; non è stato verificato un riconoscimento OCR/AI. Tre nomi dichiarati rappresentano le tre schede del test e non certificano identità/matricole estratte.

Le prove coprono acconto→saldo, saldo→acconto, file ricaricati con nuovi ID/chiavi, conferme concorrenti, replay da client nuovo, rollback, seconda spesa bloccata, costo pendente, costo complessivo dichiarato dall'utente, insiemi di schede incompleti, costo non confermato, ruolo viewer, revoca e cambio versione/SHA delle fonti. Il costo complessivo di 1.999,00 EUR usato nella prova è un dato manuale di test volutamente diverso dai totali delle fatture: dimostra che non viene dedotto dai due importi, **non conferma il costo reale dei climatizzatori**. Il controllo di storico/versione verifica una sola modifica canonica dopo replay concorrente.

La correzione riguarda il percorso di conferma fatture dell'onboarding e il caso manuale verificato. Non introduce un registro rate/pagamenti, una riconciliazione di ogni movimento bancario, un accorpamento retroattivo dei dati o una deduplicazione universale di apparati senza identificativi. Due apparati distinti con lo stesso nome richiedono nomi espliciti o revisione. Le fatture segmentate multipagina Q48 restano separate e non possono essere fuse con questa opzione. Il guard conservativo su precedenti spese degli stessi oggetti richiede revisione anche per un eventuale intervento successivo realmente distinto; nessun costo viene inventato per superare il blocco.

Il caso precedente non superato resta documentato nel [report diagnostico](fase0-installments-offline-20261023.md). Questa correzione non promuove il gate qualità AI o il pilota su dati reali.

## Comando riproducibile

```powershell
& backend-v5/test/installment-offline.ps1 -PgBin '<bin PostgreSQL locale>' -ScratchRoot '<cartella di lavoro>'
```

Il runner crea un cluster nuovo, ruolo quality_test, database dimora_v5_quality_v3_test sulla sola porta 55433; blocca le chiamate provider nei test, non legge `.env`, rimuove la chiave dal processo e ferma soltanto il proprio cluster in finally. Directory e log restano disponibili. Il manifest locale opzionale dei file serve soltanto a usare i riferimenti SHA/dimensione effettivi; senza manifest si usano riferimenti di fixture dichiarate.


## Verifiche backend e dati completate

- Build/lint backend; onboarding 200/200, ordinari 213/213.
- Acconto/saldo e Q48: 48/48 controlli (contenitori inclusi), cluster finale `installments-a029fe4661614b90ae182e846c25ce54`, poi fermato. Inclusi totali uguali e totale dichiarato diverso dai due documenti.
- Suite contatti/onboarding/attività/oggetti/documenti HTTP/DB: 98/98; Q15/Q22/Q48 DB: 38/38. Cluster/API/storage nuovi del harness `night-plan-985fa760ae494474b8c3016aa78e66c4`, poi fermati. Copia locale del harness esistente con sola correzione dell'attesa Windows di pg_ctl; guard DB/API modificati soltanto nella copia di build temporanea.
- Fixture DB indipendenti V12 e acquisti facoltativi distinte anche nel nome dichiarato: prima riusavano nomi di oggetti già presenti nella stessa casa di test. Asserzioni su creazioni, costi, replay, privacy e rollback conservate.
- SHA/dimensione dei due PDF originali ricontrollati: 2/2 invariati. Nessun contenuto personale o originale inserito nel repository.
- Frontend typecheck/lint superati, mirati **69/69**, suite mock completa **836/836, 102 file**, dopo i fix. Comando finale `node node_modules/vitest/vitest.mjs run --project mock --maxWorkers=2 --retry=1`: retry massimo 1 dei soli test frontend per i timeout noti, nessuna chiamata AI o retry provider. Le esecuzioni precedenti hanno individuato tre test con vecchia conferma di acconto/saldo, aggiornati aggiungendo controlli di blocco e conferma esplicita; nessuna asserzione privacy/idempotenza o soglia è stata ridotta.

Il confronto dei nomi usa la stessa normalizzazione Unicode su entrambi i valori, compresi accenti/maiuscole italiani, e soltanto schede leggibili. Il controllo si applica al nome effettivo di ciascuna unità da creare. Test accentati e concorrenza inclusi. Il testo di aiuto nell’onboarding richiede un solo costo complessivo, senza cambiare le etichette degli altri flussi di Spese. L’API reale non è stata riavviata o aggiornata in esecuzione.
