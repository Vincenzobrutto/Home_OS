# PR #9: riesame indipendente di 66c2915 — 23 ottobre 2026

Punta esaminata: `66c2915f34ec4f7a23f88581ca8e8f019031793b`, branch Claude in sola lettura. Nuovo worktree dedicato; branch di evidenze `codex/cestino-riesame-finale-20261023`, registrato in `7414a02` prima dei nuovi test. Nessuna modifica a codice prodotto o schema. Le cinque riproduzioni originali e i sei casi della PR #14 sono identici a `a08335d`; nessuna asserzione modificata.

**Esito: non chiudere ancora positivamente la revisione.** I casi già consegnati passano; ulteriori percorsi lasciano un problema di eliminazione definitiva e tre problemi funzionali/concorrenziali. Il merge resta al committente e non viene eseguito in questa revisione.

## Rilievi

### C1 — P1: il corpo della conferma diretta conserva il titolo dopo il purge

`backend-v5/src/documents/trash.ts:149-156`. La pulizia copre `review:<itemId>`, `duplicate:<itemId>` e manifesti con `clientItemId`, ma non il corpo `organize`, che contiene `items[].id` e `items[].decision.selection`. Un'organizzazione diretta reale del servizio persiste un titolo sintetico; dopo cestino e purge, `DocumentOrganization` è eliminata ma il titolo resta in `DocumentIntakeRequest.body`. Digest e risultati rimangono correttamente persistenti: il problema è il contenuto documentale nel corpo, non la presenza del ledger. Nessun oggetto/spesa canonico del caso richiede quel titolo.

Estendere la redazione per coppia lotto/elemento anche alle selezioni dirette, preservando le altre voci e l'idempotenza. Non basta ripulire `filename` o le sole operazioni `review:`.

### C2 — P2: ripristino tra controllo del ciclo e revoca della prima condivisione

`backend-v5/src/documents/trash.service.ts:63-65`. La rilettura di `Document` non blocca il documento né serializza il controllo con il ripristino. In assenza di precedenti `ShareRecord`, il primo lock non blocca alcuna riga. Il test sospende il ritorno della rilettura nel post-commit, ripristina il documento, crea e accetta una prima condivisione tramite i veri servizi, verifica il download e riprende la vecchia revoca. Il documento rimane attivo, ma la nuova condivisione diventa `revoked`.

Il replay sequenziale della PR #14 è corretto; questa è una corsa fra controllo ed effetto. Rendere atomica rispetto al ripristino la verifica del ciclo e la revoca, conservando l'ordine dei lock e il recupero di revoche interrotte.

### C3 — P2: una nuova ricevuta non può riusare valori confermati da una fonte nel cestino

`backend-v5/src/receipt-assistance/receipt.service.ts:378`, anche `:208` per il salvataggio della revisione. `objectFields` ora mostra correttamente il valore confermato, ma `decideFields` e `validateReview` richiedono ancora `this.source` attiva per il valore precedente. Un oggetto ha marca confermata da A; B è una ricevuta nuova, attiva e leggibile; la scelta `reuse` + `keep_existing` risponde 403 dopo il cestino di A. Non si chiede di leggere A, accettare un nuovo dato da A o sovrascrivere la marca: si conserva il valore canonico e si collega B.

Usare la prova dei dati confermati per il valore precedente, mantenendo fonte attiva/versione/SHA per le proposte della nuova ricevuta. Il test verifica che la stessa scelta riesca prima del cestino e non duplichi l'oggetto.

### C4 — P2: export di metadati di un documento eliminato dopo lo snapshot

`backend-v5/src/personal-export/personal-export.service.ts:120-127`. Il ricontrollo finale verifica asset, oggetti, campi ricevuta e confronti, ma non i documenti serializzati in `data.documents`. Senza oggetti o confronti, quelle prove sono vuote. Il test avvia uno snapshot con un documento leggibile, completa cestino oppure purge prima della seconda transazione e riceve ancora nome e metadati dell'originale nell'allegato.

È contenuto dello stesso utente, non una fuga tra account; viola comunque l'esclusione dei documenti cestinati/eliminati dall'export. Ricontrollare con la regola della fonte attiva tutti i documenti e metadati documentali restituiti, senza togliere i valori canonici confermati che devono restare leggibili.

## Correzioni precedenti e ambiti delle prove

| Chiamante | Dati | Ambito osservato |
| --- | --- | --- |
| `object-onboarding/access.ts:25` | Profilo canonico e campi ricevuta già confermati | `confirmed` predefinito: appropriato |
| `receipt-assistance/receipt.service.ts:233` | `value` confermato / disponibilità degli estratti | `confirmed` / `proposal`: separati |
| `personal-export/personal-export.service.ts:54` | `ReceiptObjectField` confermati | `confirmed`: appropriato |
| `personal-export/personal-export.service.ts:56,127` | `ReceiptComparison`, selezione e ricontrollo | `proposal`: corretto |
| `personal-export/personal-export.service.ts:126` | Campi canonici più prove organizzazione | `confirmed`; non sostituisce il controllo dei documenti attivi mancanti di C4 |

Non trovato un altro chiamante che usi `confirmed` per rilasciare una nuova proposta o un confronto non confermato. Gli endpoint confronti ricevute e onboarding controllano inoltre la propria fonte tramite `source`/`canReadDocument`, indipendentemente dai campi canonici del target.

B1 e B3 passano nei casi originali; B2 passa per `objectFields` ma resta C3; B4 passa nel replay sequenziale ma resta C2. Visibilità privata, altra casa, fonte attiva con versione/SHA errati, mancata riattivazione delle vecchie condivisioni e membership revocata restano coperti dai test precedenti invariati.

## Verifiche indipendenti

- `test:cestino-riesame-db`: 7/7, sei casi più contenitore, file identico alla PR #14.
- `test:trash-db`: 16/16, incluse le cinque riproduzioni originali.
- `test:offline-db`: 513/513, 54 HTTP su API del runner, 457 diretti e 2 dopo riavvio PostgreSQL; superato al primo lancio di questo riesame.
- `npm test`: 236/236.
- `test:object-onboarding`: 306/306; build e lint superati.
- Ripetizione finale di `test:cestino-race-db`: gli stessi cinque fallimenti riprodotti, dopo il controllo positivo aggiunto prima del cestino; nessun errore di preparazione o timeout.

Profilo aggiuntivo `test:cestino-race-db`, fuori dall'aggregato e separato da quello della PR #14: cinque test, quattro rilievi (export in due fasi). Primo lancio: quattro errori di asserzione e un 403 nel percorso `decideFields`; nessun errore di preparazione o timeout. I test creano dati sintetici, usano i servizi reali e barriere esplicite, senza sleep per costruire le corse. Nessuna simulazione della regola di lettura/revoca che si vuole verificare.

Tutti i collaudi DB sono seriali nel runner offline, con `--pg-bin` esplicito e scratch corta `C:/Users/07704017/Documents/Codex/t9`. Nessun altro runner DB rilevato all'avvio; i servizi applicativi persistenti preesistenti non sono stati fermati o usati. Cluster conservati e arrestati: `dimora-offline-OSyJ4J` (7 casi), `dimora-offline-jL5skp` (Cestino), `dimora-offline-EHDoNG` (aggregato), `dimora-offline-TBnW0j` (nuove riproduzioni), `dimora-offline-11mI5P` (ripetizione finale). Log nel work del task: `review9-r3-extra.log`, `review9-r3-trash.log`, `review9-r3-full.log`, `review9-r3-races.log`, `review9-r3-races-final.log`, `review9-r3-unit.log`, `review9-r3-onboarding.log`, `review9-r3-lint.log`.

Nessuna AI/email, DB/API/storage reale, `.env`, dato personale, gold, soglia, timeout o asserzione preesistente modificati. Migrazioni applicate solo nei cluster nuovi. Nessun push su Claude, consolidamento o main; nessun reset/clean, force push o rimozione worktree. PR #9 resta aperta senza merge. Il consolidamento remoto è nel frattempo `703cac4` (PR #15/#17): questa revisione rimane deliberatamente sulla punta richiesta `66c2915`, che include `976d62c`; non certifica un futuro merge di aggiornamento.
