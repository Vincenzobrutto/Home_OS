# Riesame indipendente correzioni PR #9

Codex, 23 ottobre 2026. Punta esaminata: `a132696bd6878246a471b42b44ac977eb6b8cce5`, branch `claude/cestino-backend-20261023`. Nuovo worktree dedicato, branch `codex/cestino-riesame-20261023`, registrazione iniziale `ecff1ed`. Nessun merge della PR #9 o push sul branch Claude.

## Perimetro

Verifica delle correzioni dei due P1 e due P2 della [prima revisione](cestino-review-20261023.md), con attenzione al ripristino delle condivisioni e alla distinzione fra prove dei dati confermati e fonte utilizzabile per leggere/proporre. Nessun cambiamento alle decisioni: solo uploader, 30 giorni, dati confermati conservati, backup separati.

La PR #11 risulta già **chiusa e unita** da GitHub, merge `3470278`; `2546279` è antenato della punta Claude. Non serve una chiusura manuale. Diff del file `document-trash-review.integration.test.cjs` rispetto al nostro commit originale: vuoto, asserzioni invariate. Il cambiamento del conteggio della rimozione fisica nel test Claude limita correttamente la verifica alle chiavi della propria fixture; non cambia il comportamento del prodotto.

## Correzioni ricontrollate

- Nuove prove distinte per il contenuto confermato; restano filtro di visibilità, home/account e membership. `canReadDocument` continua a negare fonti nel cestino; su fonti attive restano versione/SHA. La deroga sulle fonti non attive non deve essere usata per contenuti ancora da approvare.
- Purge esteso a `ObjectRequest.response` e ai corpi delle richieste intake, con digest conservati.
- Le condivisioni sono invalidate dal cestino nella transazione del documento e revocate in una seconda transazione; ripristino/purge acquisiscono ShareRecord prima di Document. Nessun ritorno all'ordine inverso del download originario.
- Tombstone `sourceDeleted` controllato dopo il digest nei replay, con risposta 410 controllata. Nessun nuovo job dal replay.

## Casi indipendenti aggiuntivi

Il file nuovo `test/document-trash-rereview.integration.test.cjs` usa solo record sintetici in un cluster nuovo del runner e storage in memoria. Non modifica le cinque riproduzioni originali.

1. Interruzione deliberata della seconda transazione di revoca: il documento è già nel cestino, ShareRecord ancora accepted. Il download deve fallire; il ripristino deve revocare la condivisione e lasciarla inutilizzabile.
2. Prove di fonte privata altrui, altra casa, SHA/versione errati su fonte attiva, tentativo di nuova proposta da fonte nel cestino o purgata e membership revocata. La deroga dei dati confermati non deve concedere nuove letture o nuove estrazioni.
3. Confronto di marca differente lasciato esplicitamente «da decidere», creato passando da `ReceiptAssistanceService.confirm`. Dopo il cestino il confronto diretto è indisponibile e l'export personale deve escludere il valore non confermato, conservando la marca canonica precedente.
4. Marca estratta e confermata con il servizio ricevute. L'endpoint `objectFields` deve conservare il valore dopo il cestino, con fonte non apribile.
5. Stesso documento in due lotti, con clientItemId differenti; un altro file del secondo lotto riusa legalmente il clientItemId del primo lotto. Il purge deve ripulire soltanto le coppie batch/clientItemId del documento ed evitare di alterare il corpo del file estraneo.
6. Documento cestinato, ripristinato, poi condiviso nuovamente con una nuova ShareRecord: il replay della vecchia richiesta di cestino non deve revocare la nuova condivisione né modificare il ciclo di vita attuale.

Il profilo esplicito `test:cestino-riesame-db` è aggiunto dopo la costruzione dell'aggregato originale: l'aggregato di Claude resta invariato, e i casi nuovi vengono rendicontati separatamente.

## Rilievi confermati dai casi aggiuntivi

### B1 — P1: proposta non confermata leggibile nell'export durante il cestino

`backend-v5/src/receipt-assistance/access.ts:37` permette alle prove di fonte nel cestino di passare con sola visibilità. `personal-export/personal-export.service.ts:52-56` usa lo stesso helper per le proposte ReceiptComparison, non soltanto per i valori confermati. La proiezione conserva `proposed.value` anche quando le fonti non compaiono nell'export.

Il caso 3 crea realmente il confronto tramite conferma di una ricevuta su un oggetto esistente, scegliendo defer sulla nuova marca. La marca canonica rimane quella precedente. Dopo il cestino, GET del confronto nasconde correttamente la proposta; l'export JSON contiene ancora la sentinella non confermata. Il difetto non è un accesso di un altro account: viola la regola di non leggibilità della proposta durante il cestino anche per l'uploader.

Separare le prove dei dati confermati da quelle dei confronti/proposte: questi ultimi richiedono fonte attiva sia nella selezione sia nel ricontrollo fresco prima di rilasciare l'export. Non annullare l'eccezione approvata per i valori canonici confermati.

### B2 — P2: il percorso ricevute nasconde ancora i valori confermati

`backend-v5/src/receipt-assistance/receipt.service.ts:233` continua a usare la fonte attiva dentro `fields`. Nel caso 4 una marca estratta e poi confermata con `ReceiptAssistanceService.confirm` è leggibile prima del cestino; `objectFields` restituisce poi value null/state unavailable, benché il valore canonico sia conservato e gli altri percorsi abbiano ricevuto la nuova regola. La correzione R1 rimane incompleta per questo endpoint.

Usare il criterio dei valori già confermati per i loro dati, mantenendo indisponibili originale e nuove proposte. La disponibilità del valore deve restare distinta dalla disponibilità della fonte.

### B3 — P2: collisione clientItemId fra lotti altera un registro estraneo

`backend-v5/src/documents/trash.ts:147-153` costruisce un set globale dei clientItemId sui lotti coinvolti. La loro unicità nel modello è invece per batch. Il caso 5 usa due lotti validi e fa riapparire lo stesso documento in entrambi con clientItemId diversi; un altro file nel secondo lotto riusa il clientItemId del primo lotto. Il purge sostituisce anche il filename di quel file estraneo dentro DocumentIntakeRequest.body. Il suo originale/item non viene cancellato: il danno riprodotto riguarda il corpo della richiesta conservata, che il requisito imponeva di lasciare intatto. Digest invariato.

Filtrare per coppia batchId/clientItemId e conservare batchId fra le colonne lette per ogni richiesta, senza cambiare digest o i record degli altri file.

### B4 — P2: un vecchio replay revoca una nuova condivisione dopo il ripristino

`backend-v5/src/documents/trash.service.ts:57-61` esegue sempre la revoca dopo `request`, anche se quest'ultima ha soltanto restituito la risposta salvata di un ciclo precedente. Nel caso 6: cestino, ripristino, creazione esplicita di una nuova ShareRecord accepted e download riuscito; replay del primo cestino con identico payload/chiave. Il documento resta attivo, ma la nuova condivisione diventa revoked. La vecchia condivisione era già rimasta correttamente revocata.

Vincolare la revoca successiva al commit al ciclo di vita della richiesta originaria; il recupero di una revoca interrotta non deve toccare condivisioni di un ciclo successivo. Conservare l'ordine ShareRecord → Document e il controllo della fonte.

## Verifiche e limiti

| Verifica | Esito indipendente |
| --- | --- |
| Build e lint backend | Superati; anche sintassi/lint mirati dei test finali |
| Unitari attraverso runner offline | **227/227** |
| Onboarding senza DB | **306/306** |
| Cestino con le cinque riproduzioni originali | **16/16** |
| Aggregato originale dopo le correzioni | **513/513** = 54 HTTP + 457 diretti + 2 dopo riavvio PostgreSQL |
| Sei nuovi casi del riesame | **2 superati, 4 falliti sulle asserzioni attese**, B1–B4; Node conta 7 test, 2 pass e 5 fail includendo il contenitore |

Log e cluster temporanei conservati: `dimora-offline-bM3IxC` per Cestino, `dimora-offline-nkx9Zr` per l'aggregato, `dimora-offline-5LCAZc` per i nuovi casi. I runner hanno arrestato i propri cluster. Nessun errore di setup conteggiato come rilievo: i quattro fallimenti sono rispettivamente sentinella ancora esportata, marca confermata null, filename estraneo sostituito e nuova condivisione revocata.

L'assenza di versione/SHA su una fonte purgata non produce un allargamento verso un altro uploader privato o un'altra casa nei casi verificati: restano filtri home/account e membership. Produce invece l'allargamento B1 quando un controllo riservato ai dati confermati viene riusato su una proposta non confermata. La prova sul ripristino dopo revoca interrotta passa; il difetto B4 riguarda un replay successivo e una **nuova** condivisione, non la riattivazione della precedente.

## Esito del riesame

**Non ancora approvabile per il merge: 1 P1 e 3 P2 residui/nuovi.** I cinque scenari originari sono corretti, il vecchio deadlock e l'eccezione interna del replay non si riproducono. R1 è incompleto nel percorso B2 e introduce B1 nell'export; R2 deve ancora rispettare la separazione fra lotti (B3); la correzione di R3 richiede la protezione di ciclo di vita B4. Ripetere i sei nuovi casi e l'aggregato dopo le correzioni, mantenendo invariate le asserzioni. La PR #9 resta aperta, senza merge; PR #11 già unita, nessuna azione necessaria.

Nessun codice prodotto di Claude modificato. Nessuna AI/email, `.env`, DB/API/storage reale, modifica al collaudo utente, force push, reset/clean o rimozione worktree. Solo runner offline, scratch corta `Documents/Codex/t9`; cluster fermati dal proprio runner e conservati con log. I test aggiuntivi non sono una misura di qualità AI né un collaudo frontend. Il consolidamento è avanzato a `976d62c` dopo le PR #12/#13, non incluse nella punta Claude esaminata: la successiva integrazione richiederà l'aggiornamento alla base corrente, senza merge automatico in questa revisione.
