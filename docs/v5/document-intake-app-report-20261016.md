# Archivio assistito nell'app — 16 ottobre 2026

## Risultato

Ingresso reale da Documenti → Organizza più documenti, route lazy `/home/:homeId/documenti/organizza`. Caricamento multipart indipendente, recupero dei lotti, classificazione locale dei PDF testuali, revisione e conferma selettiva sono collegati alle API e al DB V5 dedicato. Le decisioni confermate alimentano raccolte e filtri Documenti. Gli originali rimangono privati e immutati; classificare non condivide né certifica la regolarità del documento.

Il motore `local_text_v1` cerca segnali nel testo estratto dalle pagine reali e propone tipi, raccolte e citazioni verificabili. Non è Anthropic, OCR o estrazione semantica evoluta. Nessun hash di fixture o fallback dimostrativo nel codice prodotto. Può riconoscere una semplice menzione come tipo: conferma umana sempre obbligatoria. Testo sconosciuto → compilazione manuale; scansioni senza testo → non leggibile; immagini o limiti parser → non supportato per analisi, originale comunque disponibile. PDF tecnici richiedono una scelta di destinazione esplicita.

## Implementazione e contratti

- Migrazione additiva 24: proposta per elemento e coda persistente DocumentIntakeAnalysis. Lease 120 secondi, token, idempotenza e namespace interno separato dai test; controllo di ruolo, fonte e versione prima della lettura e della pubblicazione. Ripresa del lavoro locale dopo lease scaduta senza addebiti esterni.
- GET capabilities/lotti/lotto e POST analisi locali/cancellazione upload registrati nel prodotto, insieme agli endpoint B1/B2. Nessun altro provider ammesso dall'endpoint analisi.
- Client reale account/Home scoped; due upload alla volta, chiave stabile per elemento, AbortSignal inoltrato. Nessun file o segreto nel localStorage. Riapertura recupera file acquisiti; per file incompleti può servire riselezionarli.
- Originale via endpoint binario autenticato, candidati da catalogo personale, collegamenti esistenti solo autorizzati. Fonti perse redatte anche per le copie; esiti incerti richiedono recupero o rilettura, senza simulare successo.
- Sostituzione organizzazione con consenso esplicito e versione; parti manuali multiple conservate. Conferma parziale senza duplicare costi o creare oggetti implicitamente.

## Contributi Claude raccolti

Solo consegne dichiarate pronte, senza merge di allineamento o copia di dirty:

- 19124eb → 5ec4d4a: consenso sostituzione e revisione.
- 713f51b → 26b02d2: casi robusti e test.
- 6bd3715 → 30613b7: copie con esito incerto, focus, editor e prove mobile nel harness.
- 0baa7de → e28fc08: indice finale.

Le prove mobile di Claude sono nel harness, non un collaudo mobile completo del prodotto reale. Ownership rispettata: componenti in `src/document-intake`, integrazione Codex in `src/intake-integration`.

## Collaudo reale separato dai test

Chrome, API registrata, DB V5, LocalFileStorage e Microsoft Defender reali; account di collaudo e soli PDF sintetici. Lotto `046a7d4c-bf1b-43ef-ba0d-22a927941d1b`:

1. Quattro PDF scelti dal file picker: tre acquisiti e una copia identica riconosciuta tramite originale sintetico precedente.
2. Tre classificazioni locali concluse; APE, CILA + Agibilità e regolamento proposti con estratti di pagina. Originale consultabile durante la revisione.
3. Confermate due decisioni: APE in Energia, CILA + Agibilità in Pratiche edilizie. Gli altri due elementi restano da rivedere.
4. Documenti mostra le raccolte confermate; filtro Energia verificato. Nessun nuovo oggetto o costo.
5. Verifica indipendente in sola lettura: quattro riferimenti a originali privati, byte identici al corpus sintetico, due organizzazioni persistite, tre job. Ledger AI invariati `[8,2,1]`.

Evidenze fuori Git nel workspace: `outputs/document-intake-app-result-20261016.png` e `outputs/document-intake-app-verification-20261016.json`. Lo script readonly legge solo gli originali del lotto sintetico dopo verifica degli hash del corpus. I documenti personali già caricati non sono stati analizzati o modificati.

## Prove automatiche e limiti

Unità classificatore/parser reale: due test verdi. Suite DB/HTTP fondazione/upload/analisi: 25 test inclusi tre contenitori verdi; organizzazione B2 verificata separatamente. Test della nuova coda includono replay, lease scaduta, revoca fonte, immagini/scansioni, testo sconosciuto, destinazione tecnica e isolamento dei lotti. Client/UI verificano contesto, redazione, multipart, abort e ripresa da deep link; i mock di trasporto sono dichiarati nei test e non entrano nel prodotto.

Log conclusivi di build/lint/test in `outputs/intake-final-*.log`. Nessuna chiamata AI, email o servizio a pagamento; nessuna modifica di `.env`, quote, sicurezza, database legacy o reali. Servizi registrati e solo DB V5 locale; nessun push/deploy. Automazioni lasciate PAUSED. Dirty estraneo e documenti root misti preservati.

Restano fuori da questa consegna: classificazione semantica esterna con contratto/consenso/budget dedicati, OCR e verifica completa su dispositivo mobile fisico. Una copia già riconosciuta può essere organizzata manualmente o semplicemente riusata: non viene analizzata automaticamente. Nessuna nuova funzione cloud/email/forecast/Agenzie.

Verifica conclusiva sull'ultimo codice: 39 test frontend in 7 file e 6 test DB della coda verdi; build/lint frontend e backend verdi. Entry frontend 494,18 kB (gzip 150,46), chunk lazy IntakePage 49,29 kB (gzip 15,04). API registrata raggiungibile (session HTTP 200).

### 16 ottobre 2026 — Documenti: ingresso unico, export contestuale e ricerca compatta
- Un solo ingresso «Carica documenti» per uno o più PDF/JPEG/PNG: selezione multipla dal dispositivo o drag&drop nella medesima area. Il controller esistente mantiene limiti, upload indipendenti e conferma esplicita dell'organizzazione. Non è un collegamento a cartelle cloud o scansione ricorsiva di directory.
- Icona export accanto al titolo: primo clic abilita caselle/strumenti, secondo clic sui selezionati prepara ZIP. Annulla/cambio raccolta escono dalla selezione; successo la chiude. Nessuna casella nell'archivio normale. Il pannello JSON conserva la funzione distinta e compare soltanto nelle opzioni di esportazione, anche quando non ci sono originali.
- Ricerca compatta con titolo «Cerca documenti», campo e azioni. «Ricerca in» e nota sul contenuto conservate per lettori di schermo, senza duplicare visivamente la casa già nel titolo. Formato e visibilità in details «Filtri aggiuntivi», chiusi se inattivi e aperti con filtri applicati.
- Il form UploadForm ancora usato da Spese non è cancellato. Le sue regressioni sono isolate nel SingleUploadHarness e in route aggiuntive SOLO del harness, senza ingresso legacy nascosto nel prodotto. Nessuna API/mock fallback nel runtime.

Verifica finale rifiniture: 78 test mirati in 6 file, build e lint frontend verdi (outputs/documents-final-ui-*.log). IAB reale: ingresso unico con input multiple e area drag&drop visibili, modalità export attivata e annullata senza scaricare file, checkbox assenti dopo annullamento, filtri aperti con clic e richiusi da tastiera. Nessun file personale caricato/scaricato o analizzato. Screenshot finale outputs/documenti-compact-20261016.png. Le altre suite intake/client già verdi non ripetute senza modifica del relativo comportamento. L'icona iniziale apre le opzioni anche senza originali, per conservare l'accesso al JSON; soltanto l'azione ZIP finale è disabilitata se la selezione è vuota.

### 16 ottobre 2026 — Unico ingresso documentale
Rimosso anche Analizza documenti dalla testata Documenti: resta solo Carica documenti, che entra nel percorso caricamento/classificazione locale/revisione/conferma. L'analisi tecnica M3/M4 resta disponibile da Attività e dai percorsi dedicati: nessuna funzione rimossa, nessuna AI a pagamento avviata. L'avvio locale e le conferme nel lotto mantengono le regole già implementate; non dichiarare introdotta un'analisi esterna automatica. Test mirato sulla testata, typecheck ed eslint dei file coinvolti.


### 16 ottobre 2026 — Aggiunta progressiva di documenti allo stesso lotto
POST /homes/:homeId/document-intake/batches/:batchId/items, body {items:[clientItemId,filename,byteSize,mimeType]}, Idempotency-Key. Stessa validazione manifest/CSRF/account/Home/ruolo/email del caricamento iniziale. Append commutativo senza expectedVersion: lock lotto e quote rilette serializzano conteggio, byte e ordinali, mentre i job possono avanzare. Max20file e200MiB sull'intero lotto, non per singola selezione. Stessa chiave/payload → replay del lotto attuale; payload diverso →409; clientItemId già presente con altra richiesta →409. Nessuna lettura di originali, schema o provider aggiunti.
I file, le proposte, le scelte e gli esiti confermati precedenti non sono sovrascritti. Un lotto completato riapre solo per accogliere nuovi file; i risultati precedenti restano registrati. Il client usa stesso batchId e upload indipendenti soltanto per gli ID della nuova selezione; non ritenta automaticamente file precedenti falliti. Esito incerto conserva chiave/manifest per recupero. Risposta tardiva non naviga in un altro lotto.
Il pulsante «+ Aggiungi documenti» nel lotto apre la medesima selezione/drag&drop e torna al lotto dopo la scelta, anche scegliendo un solo file. Durante il caricamento il selettore è disabilitato. Nessun file personale usato per verificare l'aggiunta, nessuna chiamata AI/email/paid, nessuna modifica .env/quote/sicurezza. Solo DB V5 dedicato e riavvio dell'API registrata.

Prove aggiunta progressiva: 8 test HTTP/DB reali sintetici verdi (replay concorrente, quote atomiche, scope/CSRF/revoca e scelte preservate), 7 test frontend nel primo giro più nuovo test container della seconda selezione (2 test container verdi nell'ultimo giro), build/lint FE e BE verdi, typecheck finale verde. API registrata riavviata, session200. IAB sul lotto utente in sola navigazione: pulsante + Aggiungi documenti, input multiple e stesso batchId; nessun suo file aggiunto o scaricato. Screenshot outputs/documenti-aggiungi-lotto-20261016.png. Log outputs/intake-append-*.log.

### 16 ottobre 2026 — Titolo e tipi proposti, revisione semplificata
Il committente richiede di ridurre la compilazione manuale: il classificatore locale propone il titolo da una riga breve riconoscibile del testo effettivo, quando comincia con il tipo rilevato e non supera120caratteri. In assenza di intestazione affidabile resta un'etichetta del tipo; nessuna deduzione dal nomefile o OCR/AI esterna. I contenuti proposti sono tutti preselezionati, modificabili prima di salvataggio/conferma: prevale sulle precedenti istruzioni V1 che richiedevano selezione manuale dei PDF multiparte. Nessuna scrittura di organizzazione senza conferma e nessun consenso sostituzione preselezionato.
Catalogo additivo: agibility_record → building, «Visura agibilità (non certificato)». Una pagina con Visuraagibilità/noncostituiscecertificazione non viene proposta come certificato agibilità/abitabilità solo perché li menziona. Non è una verifica semantica o legale: resta obbligatorio controllare l'originale. Test sintetici separano intestazione reale, prosa, riferimenti e dichiarazione di noncertificazione.
Anche le copie identiche autorizzate possono essere classificate LOCALMENTE su avvio esplicito, tramite la stessa fonte canonica e controlli esistenti. Nessuna copia nuova, alterazione dell'originale o avvio paid. Possono essere riproposti file ready senza proposta ma ancora unreviewed; saved/confirmed/deferred esclusi dall'avvio UI. Backend conserva blocco saved/confirmed. Titolo e contenuti già confermati prevalgono sulla nuova proposta della copia, con scelta di riuso/organizzazione e consenso di sostituzione invariati.
Revisione manuale: pagine facoltative in details richiudibile; già aperto se intervalli presenti. Percorso tastiera aggiornato al nuovo controllo, range conservati. Nessuna analisi dei documenti personali eseguita durante sviluppo: il nuovo comportamento si vede al prossimo avvio locale scelto dall'utente, non riclassificando retroattivamente.

Verifiche di questa rifinitura: 43 test frontend in7file verdi (incl. proposta su copia senza organizzazione, protezione titolo già confermato, multiparti preselezionate e tastiera per pagine facoltative), build/lintFEverdi. Parser3unit con PDFreali sintetici verdi; DB/coda7test inclusocontenitore verdi, copiaconvisurapropostasenzaamutareoriginale/organizzazione; build/lintBEverdi. Logs outputs/intake-proposal-*.log. APIregistrata riavviata pronta. Nessuna analisi o lettura di originali personali eseguita, nessunAIesterno/paid/env/push/migrazione.

### 16 ottobre 2026 — Riuso distinto da organizzazione e correzione senza upload
Diagnosi in sola lettura sul contesto del committente: il classificatore aveva proposto agibility_record, ma l'azione scelta era reuse dell'originale; una precedente organizzazione other/unclassified era quindi rimasta invariata. Non è un errore del filtro building né un fallimento di riconoscimento della visura. Nessuna modifica dei suoi dati effettuata dal collaudo: consultati solo metadati scoped al suo account/Home, non i byte originali. Evidenza locale outputs/intake-organization-readonly-result.json NON da committare.
La revisione di una copia con organizzazione other e proposta più specifica ora preseleziona i tipi proposti, conservando titolo personalizzato e consenso di sostituzione esplicito. Scelte già classificate restano conservate. Il solo riuso avvisa che non applica titolo/categoria e lo stato non dice più Organizzato: Originale riusato · organizzazione invariata.
POST /homes/:homeId/document-intake/batches/from-documents {documentIds:[uuid,...]} +Idempotency-Key prepara una nuova revisione degli originali già autorizzati (max20/200MiB e stessi limiti di formato/dimensione). Non ricarica byte, non crea Document/StoredFile, non modifica organizzazioni o vecchi ledger. Lock/check di account/Home/ruolo/email/originale; idempotenza peraccount/Home/chiave con digest origine distinto dai manifest. Riusa solo proposte precedenti dello stesso account/Home/documentId/versione/hash; altrimenti not_started. La nuova organizzazione esiste solo dopo salvataggio e conferma, con replaceOrganization/versioni quando necessario.
Il comando Riorganizza senza ricaricare sui file confermati prepara quel lotto e porta lì il client, proteggendo da doppio clic e risposte tardive di altro lotto. Nessun automatismo paid/AI/OCR o classificazione retroattiva; la categoria deriva dal tipo riconosciuto oppure scelto. Per scansioni unreadable l'OCR resta fuori scope.

Verifiche: 44FE/7fileverdi, build/lintFEverdi; 8DBcoda con ripreparazione→consenso→conferma building e invarianti originali,8HTTPfoundation/CSRF/accesso verdi; build/lintBEverdi. Logs outputs/intake-reorganize-*.log. APIregistrata riavviata. BrowserIAB sul lotto esistente in sola navigazione:2comandi Riorganizza e2stati riusoinvariato visibili, nessun comando azionato sui file personali. Screenshot outputs/documenti-riorganizza-20261016.png. Nessunaenv/quote/provider/paid/OCR/email/push/DBlegacy o nuove migrazioni.
