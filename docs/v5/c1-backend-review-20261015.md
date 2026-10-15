# C1a — backend documentale, 15 ottobre 2026

## Completato

Il committente ha approvato il percorso dopo revisione UX. Congelato `sharing-api-contract.md` con destinatari membri o esterni autenticati. Implementati modulo/controller/service C1 separati da M2: picker con eleggibilità server, preview/manifesto, creazione e liste mittente, codice monouso, claim/approvazione/accettazione, rifiuto, rotazione, revoca e download originale.

Nessun nuovo permesso nell'archivio M2, nelle schede oggetto o nelle economie. L'esterno non riceve membership Home. Nessun file prima dell'accettazione; claim e conferma del mittente sono stati separati. Avvisi e confronto umano non equivalgono a identità verificata.

Persistenza additiva: SharePreview, ShareRecord, ShareRequest, ShareEvent, ShareThrottle. Migrazione `20261015160000_selective_sharing` applicata esclusivamente a `dimora_v5_product_dev` su loopback55432 dopo assertDevelopmentDatabase. Prisma6.19.3 invariato. Client rigenerato fermando soltanto il processo API registrato, poi API riavviata dal launcher. Nessun nuovo software, dipendenza o configurazione `.env`.

## Garanzie implementate

- Preview di 10 minuti, manifesto con originali propri/versione/hash e durata1/7/30giorni. Digest e consenso alla selezione esatta, CAS/versioni ed eventi con ledger idempotente account/key nella stessa transazione.
- Codice iniziale50bit, hash a riposo, TTL15min e solo risposta di generazione. Replay non conserva/restituisce il segreto: recupera stesso invito con code:null e richiede rotazione esplicita. Nessuna seconda consegna su risposta persa.
- Claim atomico e codice confronto distinto40bit, legato ad account/claim/versione/TTL. Approvazione esplicita del mittente; poi accettazione distinta del destinatario. Profilo dichiarato etichettato non verificato.
- Rate limit persistente account/IP/globale/codice, anche su tentativi falliti; recupero di idempotenza già riuscita non riesegue il claim. Metadati dei contatori C1 distinti dai contatori AI; pulizia dei soli bucket oltre24ore nel normale flusso.
- Lock condivisi su membership, Document e DocumentVersion; lock esclusivo sullo share durante mutazioni/download. Autorizzazione e fonti rilette nei replay e prima della consegna dei byte. Hash e dimensione verificati sui byte reali; nessuna URL storage pubblica.
- Revoca/scadenza/fonti o membership perse negano nuovi download. unavailable redatto, senza nomi/ID di originali, indirizzo, causa vendita o profilo del destinatario. M2 home/private rimane invariato; copie già scaricate e permessi indipendenti non si ritirano.
- Liste con paging SQL, cursor vincolato al contesto. Picker non rivela originali privati altrui; documenti home già leggibili di altro uploader disattivati con motivo server. Non si deduce la proprietà da permissions M2.

## Prove eseguite da Codex

- Build TypeScript e lint riusciti.
- **25 test C1 verdi**: nove policy offline e sedici risultati del runner HTTP/DB (quindici scenari più contenitore). Log workspace `outputs/Dimora-V5-C1-backend-test.log`.
- **105 test offline backend verdi**, includono i nove C1 già conteggiati sopra. Log `outputs/Dimora-V5-C1-regressioni-offline.log`. Non sommare i nove due volte.
- **29 test di regressione DB/HTTP/documenti verdi** nei file documents.integration, economy.integration, economy.http; log `outputs/Dimora-V5-C1-regressioni-db.log`. La parte M2 usa il servizio registrato3001, la parte economy il proprio harness isolato previsto dal test.

I test C1 montano i controller reali con sessioni/cookie/CSRF, PostgreSQL V5 e storage reale, su listener temporaneo loopback chiuso a fine prova. Tre account sintetici, originali PNG veri. Coperti create concorrente/replay, segreto non persistito, claim senza accesso, codice consumato/rotazione, tuple errate di approvazione, accept/retry, byte/hash, nessuna membership o economia implicita, fonte cambiata e replay redatto, revoca, accept/decline concorrenti, scadenze esatte, viewer, claim scaduto, picker privacy e cursor, rate limit persistente e contatori AI invariati. Record e file sintetici del test vengono rimossi; i bucket tecnici di rate limit scadono con la loro policy, senza reset manuale.

Prima esecuzione: fixture membership creata dopo l'orologio congelato del test, quindi rifiutata correttamente come futura e fallimenti successivi a cascata. Allineata validFrom della sola fixture al passato e usato codice inesistente nuovo per ogni prova del rate limit; nessun indebolimento della policy, reset dei contatori o aumento dei timeout. Ripetizioni mirate motivate da tale correzione e dai successivi controlli su picker/lock/versione.

API registrata riavviata direttamente tramite launcher dopo build e migrazione; non chiesto PowerShell al committente. Nessuna chiamata Anthropic, nessuna quota AI resettata; i test verificano AiAttempt/EconomicAiAttempt invariati. Nessun dato reale/legacy, main o push toccato.

## Frontend, prossima integrazione e limiti

Il committente ha avviato Claude con `outputs/Dimora-V5-incarico-Claude-C1-frontend.md`. Proprietà di Claude: frontend-v5 runtime/client/harness/test nel suo checkout; Codex non ha modificato frontend durante questo lavoro. Consegna attesa `frontend-v5/docs/C1-FRONTEND-CONSEGNA-20261015.md`. Raccogliere soli commit pertinenti, escludere sync, poi collaudo browser UI/API reale e regressioni mirate.

Non c'è ancora UI C1 reale integrata. Mockup resta una simulazione: nessuna prova browser frontend reale viene dichiarata in questo rapporto. Fuori scope schede tecniche condivise, ZIP C1, email/SMS, tracciamento letture, ruoli nuovi o condivisione economica. Non è un audit di sicurezza esaustivo o una dichiarazione WCAG. Nessuna automazione Codex creata: al termine del turno il lavoro Codex si ferma, Claude prosegue nel processo avviato dal committente.
