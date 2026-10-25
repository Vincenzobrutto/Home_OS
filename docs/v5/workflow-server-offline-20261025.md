# Stato dei documenti e completezza del collaudo backend offline

## Piano, base e vincoli

Lotto autonomo nella finestra del 25 ottobre fino alle 14:00. Branch `codex/workflow-server-offline-20261025`, worktree nuovo dal consolidamento `730b93d`, registrazione `a91b48d` prima del codice. Le precisazioni di scope `ee04306` e `3f275e0` precedono rispettivamente la guardia sulle omissioni e l'allineamento della vecchia fixture.

Scopo: verificare il completamento delle bollette con i servizi e PostgreSQL temporaneo, oltre al mock frontend; recuperare test presenti ma esclusi dai profili; impedire nuove omissioni. Solo test, profili, script npm e documentazione. Nessuna modifica a `backend-v5/src`, schema, migrazioni o file del lotto Claude. Il lotto frontend e il suo candidato restano distinti.

Ordine: suite frontend conclusa prima dell'avvio backend; test senza DB, guardie, nuovo gruppo DB su cluster nuovo; aggregato DB se il gruppo mirato passa. Nessun cluster concorrente avviato da questo incarico, nessuno stop di processi altrui e nessun aumento dei timeout.

## Lacuna rilevata

Prima del lotto, 19 file `*.test.cjs` presenti nel repository non appartenevano ad alcun profilo offline: 10 unitari e 9 DB, compreso `document-workspace.integration.test.cjs`. Non significa che fossero mai stati eseguiti singolarmente: significa che gli alias npm registrati non li richiamavano e che i precedenti conteggi degli aggregati non li comprendevano.

Ripristinati:

- Unitari: automatic-plan, compilation-draft, contacts-extraction, floor-plan, house-expense-object, lan-origin, object-suggestions, onboarding-no-reanalysis, onboarding-shared-budget e reference-period.
- DB: document-workspace, document-archive, document-family, document-only, document-views, floor-plan, house-documents, invoice-object-documents e object-catalog.

Il profilo esplicito `test:document-workflow` contiene i 10 unitari, ora inclusi anche in `npm test`. `test:document-workflow-db` contiene i 9 DB recuperati e il nuovo test sul completamento della bolletta; confluisce automaticamente nell'aggregato `test:offline-db`. Tutte le selezioni restano nominali e statiche: nessun percorso o comando arbitrario ammesso al runner.

La nuova guardia `offline-registration.test.cjs`, inclusa nei test ordinari e in `test:offline-guards`, richiede che ogni file di test, anche in sottocartelle, sia registrato, che i riferimenti esistano e che i due aggregati includano i gruppi recuperati. Nessuna esclusione silenziosa o test saltato.

## Quattro test vecchi realmente falliti

Prima esecuzione ordinaria con la copertura recuperata: **286/290**. I quattro fallimenti sono in `automatic-plan.test.cjs`: la fixture positiva non aveva il controllo di pagamento testuale introdotto successivamente, una citazione di data d'acquisto valida o una tipologia certa con evidenza verificata.

Allineate solo queste fixture di output già proiettato. Importi, date attese, risultato economico, nomi dei test e asserzioni precedenti invariati. Verifica automatica contro `730b93d`: tutte le otto righe originarie contenenti chiamate `assert.*` sono conservate letteralmente. I dati aggiunti rappresentano le precondizioni correnti; non autorizzano l'uso di flag inventati nel prodotto o un salto del validatore.

Sei nuovi casi negativi dimostrano che mancanza della politica, split payment, data d'ordine al posto di acquisto, tipo assente/incerto o evidenza visiva del tipo restano bloccanti, con `AutomaticReviewNeeded` e messaggio pertinente. Il backend di prodotto non è cambiato. Seconda esecuzione ordinaria: **296/296**, zero fallimenti, cancellazioni o test saltati.

## Nuovo contratto di completamento

`bill-completion.integration.test.cjs` usa i servizi reali con fixture sintetiche nel cluster creato dal runner. Non avvia un provider o un trasporto AI; `fetch` è vietato e lo storage finto fallisce a ogni accesso. L'URL offline è verificato prima di costruire Prisma. Le membership sintetiche iniziano esplicitamente nel passato per non dipendere dall'ordine sub-millisecondo fra orologi Node/PostgreSQL; revoche e autorizzazioni restano verificate.

| Caso | Asserzione richiesta |
| --- | --- |
| Bozza generica → tipo bolletta | Nessun oggetto/spesa o tipo canonico implicito, documento ancora da completare. |
| Salva compilazione incompleta | Campi incompleti riletti identici, stato aperto e nessuna spesa. |
| Organizzazione canonica | Tipo utility_bill presente, ma documento ancora da completare finché la bozza economica è aperta. |
| Fonte diversa o importo zero | Conferma rifiutata e nessuna scrittura canonica. |
| Altro owner o casa diversa | Originale/bozza/preparazione/conferma negati, nessuna fuga nei listing. |
| Conferma finale | Una spesa con fornitore, importo, categoria, emissione, periodo e scadenza identici; zero oggetti; filtro completati e tipo Bolletta. |
| Replay concorrente | Risultato identico e nessun duplicato; chiave con corpo cambiato rifiutata. |
| Nuova bozza sullo stesso originale | Ritorno fra i documenti da completare; chiusura esplicita solo documento senza una seconda spesa. |
| Originale condiviso | La classificazione e lo stato personali dell'altro account restano distinti; revoca della membership blocca accesso e listing. |
| AI e storage | Ledger invariati e zero accessi allo storage. |

Tutta la tabella è verificata nel nuovo test. Il gruppo DB completo, inclusi i nove file recuperati, passa **48/48** sul cluster `TUaBlG`. Prima esecuzione **46/48** su `RxfgI6`: nel nuovo test l'importo zero veniva rifiutato sincronicamente prima di entrare in `assert.rejects`; la pulizia usava homeId per ExpenseHistory, che richiede accountId o relazione expense. Corretti soltanto l'involucro asincrono dell'asserzione (422 invariato) e il filtro della pulizia sui soli account sintetici creati dal test. Gli altri controlli economici e di privacy erano già verdi; nessun cambiamento di prodotto.

## Diagnosi dei 403 e setup delle membership

Primo aggregato: HTTP **54/54**, diretti **475/478**, poi arresto senza eseguire il gruppo dopo riavvio. I due figli Samsung/coffee di `order-roles.integration.test.cjs` falliscono prima delle decisioni, durante `manualDraft`, con 403 da `ReviewService.require`; fallisce anche il loro contenitore. Cluster `ZB4q9A`, log conservato.

La prova osservativa già documentata nel riesame Codex della PR #9 è ripetuta sul consolidamento corrente, copiando il test diagnostico con le sue asserzioni e aggiungendo una guardia URL offline prima di Prisma. Sul nuovo cluster `SRdpGW`: **240 campioni**, **240 validFrom ancora futuri al ritorno a Node**, **240 rifiuti 403 reali**, delta **+10…+13 ms**. Cambiando soltanto validFrom a una data passata, **240/240** autorizzazioni riescono. Il confine futuro +1 ms, revoca e validUntil restano negati: nessuna tolleranza nel codice.

Il prodotto crea già la membership della casa con una data Node esplicita (`homes/homes.service.ts:33`); non lo si modifica per far passare il collaudo. Nei setup di order-roles, installment-linking e generalized-evidence si dichiara invece esplicitamente l'appartenenza sintetica attiva dal 1 gennaio 2026. Gli ultimi due allineamenti coincidono con quelli già descritti nella proposta Codex #28/#31; nessun ramo cestino viene importato. La prova osservativa non attribuisce il delta a uno specifico timer Windows.

Il gruppo dei tre file passa **77/77** su `8YasqC`. Un controllo contro `730b93d` verifica letteralmente tutte le righe con asserzioni preesistenti nei quattro file di fixture modificati: **81 righe conservate** (8 automatic-plan, 17 order-roles, 50 installment-linking, 6 generalized-evidence). Nessuna attesa, retry o timeout aggiunti per nascondere il problema.

Profili aggiuntivi: `test:workflow-clock-db` (osservazione e confini rigorosi) e `test:workflow-fixtures-db` (i tre file). Confluiscono nell'aggregato senza duplicare i file già presenti.

## Esecuzione e risultati

- Unitari ordinari finali su 9210725: **296/296**, 117,12 secondi, con l'enum reale della fonte visiva; zero fallimenti, cancellazioni o test saltati.
- Guardie: **12/12**, zero saltati.
- Nuovo gruppo DB: **48/48**; tre fixture temporali: **77/77**; osservazione orologi: **1/1** e 240 controlli con data passata.
- Aggregato DB finale su `mn5eRQ`: **547/547** (**54 HTTP + 491 diretti + 2 dopo riavvio**), zero fallimenti, cancellazioni o test saltati. Il runner ha arrestato il cluster; nessun file temporaneo cancellato.
- Build ripetuta dal runner e lint verdi. I file selezionati dall'aggregato corrispondono a `94db5ed`; il successivo `9210725` modifica soltanto un nuovo valore di fixture unitario da stringa generica all'enum di evidenza reale `provider_observed_image`, mantenendo lo stesso rifiuto atteso.

Dipendenze riusate in sola lettura da un worktree con `package-lock.json` e `prisma/schema.prisma` identici byte per byte; client generato copiato nel nuovo worktree e build rifatta dal runner. Nessun file di configurazione o `.env` trasferito. Launcher locale `work/workflow-server-run.cjs`; seleziona soltanto profili nominali del runner e un `--pg-bin` già disponibile, con scratch corta `C:/Users/07704017/Documents/Codex/t25w`.

Il runner è l'unico proprietario di cluster/API temporanei e dei relativi bootstrap. Le migrazioni tracciate possono essere applicate soltanto al cluster nuovo vuoto del collaudo; nessuna migrazione o scrittura sul DB dell'app. Log locali `work/workflow-server-*.log` nel task e `tests.log`/log PostgreSQL nelle cartelle del runner. Nessun originale personale usato o copiato.

## Limiti e integrazione

I test dei servizi non sono una prova dell'API attualmente avviata o del browser. L'organizzazione e la conferma della spesa restano operazioni distinte, senza nuova promessa di atomicità fra le due. Il filtro dipende dalle bozze/analisi personali aperte: un documento con un'altra bozza aperta può restare da completare anche dopo una conferma riuscita.

Nessuna AI/email a pagamento, DB/API/storage reale, quota/ledger reale, `.env`, migrazione di prodotto, aggiornamento app o modifica a main/consolidamento/Claude. Test e report non autorizzano il merge. Le verifiche frontend e questo lotto possono essere valutati separatamente dal committente.

## Consegna operativa

[Stato PR verificato e passi di integrazione](consegna-integrazione-20261025.md). Al termine i listener offline 55439/3119 risultano assenti e i log confermano gli arresti dei cluster posseduti. App, API e PostgreSQL reali non sono stati interrogati o riavviati. La mattinata non autorizza merge o aggiornamenti applicativi.

[PR #39](https://github.com/Vincenzobrutto/Home_OS/pull/39) verso il consolidamento, senza merge; push verificato con confronto HEAD/git ls-remote. Le prove del server e dei profili non richiedono modifiche del frontend o del lotto Claude.
