# Archivio assistito — specifica V1

16 ottobre 2026. Il committente ha navigato e approvato il mockup `frontend-v5/public/mockup-archivio-assistito.html`, mantenendo la revisione per singolo file. Autorizzato lo sviluppo additivo; non autorizzati nuovi invii AI o caricamenti di documenti personali da parte degli agenti. Guida, Agenzie, cloud, email e forecast restano fuori.

## Esperienza approvata

Documenti → Carica più documenti → Lotto con esito per file → Analisi esplicita → Proposte → Revisione → Riepilogo → Conferma parziale → Documenti organizzati. Caricare conserva originali; analizzare produce proposte; soltanto confermare applica organizzazione. APE e documenti generici appartengono alla casa senza oggetto o costo obbligatorio. Le raccolte sono filtri sull'archivio, non copie e non le famiglie della sezione Spese.

Raccolte iniziali: Energia, Pratiche edilizie, Impianti e documenti tecnici, Condominio, Acquisti e garanzie, Bollette, Da organizzare. Tipi multipli nello stesso PDF ammessi: per esempio CILA e agibilità, con intervalli di pagina distinti e un originale unico. Nessun accorpamento/spezzatura fisica automatica, deduzione di validità tecnica, regolarità urbanistica, pagamento o titolarità.

Visibilità iniziale Solo io. Una classificazione Condominio non pubblica né cambia visibilità; un eventuale documento condiviso mantiene i permessi esistenti. Nome organizzato, classificazioni e decisioni sono personali all'account e non riscrivono il nome o la classificazione per altri utenti. Non ampliare i permessi di file, casa o schede.

## Comportamenti

- Ogni file mantiene stato indipendente: in attesa, caricamento, acquisito, copia da gestire, errore caricamento, analisi in attesa/in corso, pronto, da scegliere, non leggibile, non supportato, esito incerto, rimandato, confermato. Un errore non ripete l'intero lotto.
- Copie identiche: SHA256 dei byte, non nome simile; usare solo fonti leggibili autorizzate e distinguere contenuto uguale da nuova versione. Nel lotto non creare un secondo originale per byte identici dopo conferma del riuso. Non eliminare originali già caricati. Nessuna informazione su hash o documenti privati altrui.
- Proposta pronta richiede comunque revisione esplicita. Nessuna selezione multipla automatica o conferma globale nascosta. Casi ambigui: nessuna associazione preselezionata; scegliere scheda esistente oppure solo casa. Creare nuove schede è un'azione separata da approvare, non effetto della classificazione.
- Dati confermati non sovrascritti. Collegamenti a oggetti/impianti esistenti soltanto dopo verifica target/versione/permessi. Niente oggetto per ogni file o costo per ogni numero. Le ricevute rimandano al percorso ricevuta assistita già esistente, senza seconda estrazione o spesa automatica. Stesso principio per bollette/attività: classificare non avvia un'altra analisi.
- Fonte per proposta: pagina ed estratto letterale verificati sullo snapshot esatto. Manuale: nome/raccolta scelti dall'utente, senza fonti AI inventate. Immagini o scansioni non leggibili restano archiviabili manualmente; nessun finto OCR.
- Conflitti fra organizzazione già confermata e nuova proposta mostrati, senza sostituzione automatica. Versione non corrente: scelta da rivedere prima della conferma.
- Riepilogo delle sole decisioni selezionate; gli altri elementi restano da rivedere. Esito per elemento; una conferma parziale non dichiara concluso il resto. Ricaricare e cambiare pagina non devono perdere il lotto reale (il mockup in memoria non è il comportamento finale).

## Limiti tecnici iniziali

Scelte implementative conservative, visibili tramite capability e rivedibili senza cambiare il flusso: 20 file per lotto, 200 MiB totali dichiarati/verificati, massimo20 MiB per originale, PDF/JPEG/PNG come upload esistente, 2 upload concorrenti. Riutilizzare scansione Defender e storage byte-identico, controllo MIME reale, sessione/CSRF e chiavi stabili. Nessun multipart enorme unico: richieste indipendenti per elemento.

Prima analisi automatica: PDF con testo nei limiti del parser esistente (10 MiB,20pagine,100000codepoint). File eccedenti o immagini: originale conservato, archiviazione manuale disponibile, limite chiaramente spiegato. OCR richiede incremento distinto.

Il manifest client non prova MIME/hash/numero pagine: controllare i byte sul server. Idempotenza scoped account/Home/lotto/elemento e digest del payload. Guardare fonte, membership, target e snapshot a ogni lettura/mutazione/pubblicazione; redigere dati e metadati se accesso revocato.

## AI e costi

Provider del lotto separato da campagne ricevuta/M4/S1. Nessuna attivazione in questo incremento iniziale. Prima del live occorrono consenso all'insieme preciso dei file/testi e budget esplicito del lotto. Costo/riserva/stato per elemento e totale coerente; stop a budget esaurito senza perdere quanto già elaborato. Un timeout dopo invio non autorizza retry a pagamento; recuperare lo stesso job. Nessun trasferimento di tutti i documenti della casa per comodità di matching. Contenuti documentali non sono istruzioni eseguibili.

## Consegne e ordine

1. B1 Codex: catalogo e validazioni, contratto DTO, persistenza lotto/elementi/richieste, upload indipendenti, idempotenza e deduplica con test sintetici.
2. B2 Codex: organizzazione personale confermata, revisione/versioni/rinvio/ripresa, collegamenti esistenti e filtri Documenti/export. Nessuna mutazione implicita delle schede.
3. Claude in parallelo: componenti isolati a props, modello UI e test in `frontend-v5/src/document-intake/**`, consegne in `frontend-v5/docs/document-intake-20261016/**`. Niente trasporto, router o pagine condivise.
4. B3 Codex: classificazione con fonti, worker e budget dedicato, prima solo offline/stub; nessun fallback dimostrativo nella modalità reale.
5. B4 Codex: client/container/route/ingressi e integrazione dei componenti Claude; build/lint, test mirati, browser su corpus sintetico e mobile. Solo dopo definire eventuale collaudo provider autorizzato.

## Criteri di accettazione

Lotto misto approvato nel mockup: APE, CILA+agibilità, schema ambiguo, regolamento, ricevuta già collegata, copia e scansione. Dimostrare: nessuna perdita di originali, niente duplicati o scritture prima conferma, una fonte per PDF multiparte, selezioni puntuali fedeli, privacy invariata, nessuna certificazione implicita, ripresa reale dopo reload, retry soltanto dello stesso elemento fallito, fonte/target revocati redatti, costo non duplicato. Distinguere sempre prove UI/mock, parser, DB, HTTP, file fisici e provider reale.

### Stato B1b16ott2026
Upload per elemento e deduplica controllata implementati e collaudati in modulo isolato; migrazione22V5 applicata.13HTTP/DB storageesplicitamentestub +1testfisico scannerreale verdi, build/lint verdi; dettagli e DTO redatti in document-intake-api-contract.md B1b. Non ancora attivo nell’app, nessuna classificazione AI o organizzazione confermata implementata. NextB2metadati/filtri e poi B3B4.

### Stato corrente B2,16ottobre2026 — prevale sul precedente stato B1b
Organizzazione personale confermata, parti/pagine, target esistenti, review/defer/ripresa e conferma parziale persistenti implementati; migrazione23 sul solo DB V5. Firme vincolanti in document-intake-api-contract.md B2: consenso sostituzione, recupero richieste, riuso duplicato. Documenti usa raccolte/query/cursor/cache e metadati correnti in elenco/dettaglio/export, nessuna riclassificazione automatica pregressa. Claude C1/C2/C3 raccolto, filtri collegati; assistente non ancora agganciato. Restano B3 classificazione/worker/budget e B4 client/container/API/browser completo. Nessuna AI o mutazione dei documenti personali in B2.

### Stato B3 locale/B4 app16ott2026
Attivo ingresso Documenti→Organizza più documenti, caricamento2alla volta, elenco/ripresa lotti, classificatore locale su PDFtestuali, originale e fonti perfile, revisione/rinvio/consenso sostituzione e confermaparziale. Provider locale dichiarato, gratuito senza trasmissione; NON analisi Anthropic/OCR/semantica avanzata. Necessaria revisione umana, nessun obbligo/validità dedotto. Nuove firme e limiti nella sezione B3locale/B4 del contratto, prevale sui precedenti enabled:false. Nessuna nuova campagna esterna autorizzata né documenti personali inviati. Restano eventuale motore AI esterno con budget/consenso dedicati e collaudi avanzati separati, non abilitati da questo rilascio.

### 16 ottobre 2026 — Aggiunta progressiva di documenti allo stesso lotto
POST /homes/:homeId/document-intake/batches/:batchId/items, body {items:[clientItemId,filename,byteSize,mimeType]}, Idempotency-Key. Stessa validazione manifest/CSRF/account/Home/ruolo/email del caricamento iniziale. Append commutativo senza expectedVersion: lock lotto e quote rilette serializzano conteggio, byte e ordinali, mentre i job possono avanzare. Max20file e200MiB sull'intero lotto, non per singola selezione. Stessa chiave/payload → replay del lotto attuale; payload diverso →409; clientItemId già presente con altra richiesta →409. Nessuna lettura di originali, schema o provider aggiunti.
I file, le proposte, le scelte e gli esiti confermati precedenti non sono sovrascritti. Un lotto completato riapre solo per accogliere nuovi file; i risultati precedenti restano registrati. Il client usa stesso batchId e upload indipendenti soltanto per gli ID della nuova selezione; non ritenta automaticamente file precedenti falliti. Esito incerto conserva chiave/manifest per recupero. Risposta tardiva non naviga in un altro lotto.
Il pulsante «+ Aggiungi documenti» nel lotto apre la medesima selezione/drag&drop e torna al lotto dopo la scelta, anche scegliendo un solo file. Durante il caricamento il selettore è disabilitato. Nessun file personale usato per verificare l'aggiunta, nessuna chiamata AI/email/paid, nessuna modifica .env/quote/sicurezza. Solo DB V5 dedicato e riavvio dell'API registrata.

### 16 ottobre 2026 — Titolo e tipi proposti, revisione semplificata
Il committente richiede di ridurre la compilazione manuale: il classificatore locale propone il titolo da una riga breve riconoscibile del testo effettivo, quando comincia con il tipo rilevato e non supera120caratteri. In assenza di intestazione affidabile resta un'etichetta del tipo; nessuna deduzione dal nomefile o OCR/AI esterna. I contenuti proposti sono tutti preselezionati, modificabili prima di salvataggio/conferma: prevale sulle precedenti istruzioni V1 che richiedevano selezione manuale dei PDF multiparte. Nessuna scrittura di organizzazione senza conferma e nessun consenso sostituzione preselezionato.
Catalogo additivo: agibility_record → building, «Visura agibilità (non certificato)». Una pagina con Visuraagibilità/noncostituiscecertificazione non viene proposta come certificato agibilità/abitabilità solo perché li menziona. Non è una verifica semantica o legale: resta obbligatorio controllare l'originale. Test sintetici separano intestazione reale, prosa, riferimenti e dichiarazione di noncertificazione.
Anche le copie identiche autorizzate possono essere classificate LOCALMENTE su avvio esplicito, tramite la stessa fonte canonica e controlli esistenti. Nessuna copia nuova, alterazione dell'originale o avvio paid. Possono essere riproposti file ready senza proposta ma ancora unreviewed; saved/confirmed/deferred esclusi dall'avvio UI. Backend conserva blocco saved/confirmed. Titolo e contenuti già confermati prevalgono sulla nuova proposta della copia, con scelta di riuso/organizzazione e consenso di sostituzione invariati.
Revisione manuale: pagine facoltative in details richiudibile; già aperto se intervalli presenti. Percorso tastiera aggiornato al nuovo controllo, range conservati. Nessuna analisi dei documenti personali eseguita durante sviluppo: il nuovo comportamento si vede al prossimo avvio locale scelto dall'utente, non riclassificando retroattivamente.

### 16 ottobre 2026 — Riuso distinto da organizzazione e correzione senza upload
Diagnosi in sola lettura sul contesto del committente: il classificatore aveva proposto agibility_record, ma l'azione scelta era reuse dell'originale; una precedente organizzazione other/unclassified era quindi rimasta invariata. Non è un errore del filtro building né un fallimento di riconoscimento della visura. Nessuna modifica dei suoi dati effettuata dal collaudo: consultati solo metadati scoped al suo account/Home, non i byte originali. Evidenza locale outputs/intake-organization-readonly-result.json NON da committare.
La revisione di una copia con organizzazione other e proposta più specifica ora preseleziona i tipi proposti, conservando titolo personalizzato e consenso di sostituzione esplicito. Scelte già classificate restano conservate. Il solo riuso avvisa che non applica titolo/categoria e lo stato non dice più Organizzato: Originale riusato · organizzazione invariata.
POST /homes/:homeId/document-intake/batches/from-documents {documentIds:[uuid,...]} +Idempotency-Key prepara una nuova revisione degli originali già autorizzati (max20/200MiB e stessi limiti di formato/dimensione). Non ricarica byte, non crea Document/StoredFile, non modifica organizzazioni o vecchi ledger. Lock/check di account/Home/ruolo/email/originale; idempotenza peraccount/Home/chiave con digest origine distinto dai manifest. Riusa solo proposte precedenti dello stesso account/Home/documentId/versione/hash; altrimenti not_started. La nuova organizzazione esiste solo dopo salvataggio e conferma, con replaceOrganization/versioni quando necessario.
Il comando Riorganizza senza ricaricare sui file confermati prepara quel lotto e porta lì il client, proteggendo da doppio clic e risposte tardive di altro lotto. Nessun automatismo paid/AI/OCR o classificazione retroattiva; la categoria deriva dal tipo riconosciuto oppure scelto. Per scansioni unreadable l'OCR resta fuori scope.

## Emendamento approvato: flusso semplificato V2 — 16 ottobre 2026

La specifica `document-intake-simplified-spec-v2.md` prevale su salva scelta/riepilogo/conferma V1: conferma diretta singola o selezione esplicita dall'elenco multiplo, lettura locale automatica dopo upload. Copie e conflitti restano individuali. Mantiene tutte le protezioni V1 e la compatibilità delle richieste precedenti.
