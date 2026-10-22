# Fase 0 — Q48, due fatture separate nello stesso originale

22 ottobre 2026, branch `codex/fase0-ai-quality-v3`. Supporto implementato offline dopo `345a35d`, senza chiamate AI, modifica dei gold o ricalcolo della campagna. Le due proposte Q48 restano **122,00 EUR / Idroquarzo Collaudo / 18 settembre** e **244,00 EUR / Termonimbo Collaudo / 19 settembre**. Non esiste una proposta canonica da 366,00 EUR.

## Contratto e confini

Un unico file originale privato conserva SHA, versione e permessi. Le due fatture sono segmenti logici distinti, ciascuno su una propria pagina fisica: nessuna copia di file o creazione di documenti sostitutivi. Questo incremento supporta solo fatture non utility complete su pagine singole differenti, fino al limite esistente di dieci proposte.

Per ogni fattura sono obbligatori fornitore, numero e data espliciti, con citazioni sulla stessa pagina del suo unico `current_document_total`. Numero e data devono avere il rispettivo contesto stampato. Tutte le altre fonti dei campi/importi di quel segmento devono rimanere sulla sua pagina e sullo stesso SHA/documento autorizzato. Sono rifiutati ancoraggi mancanti, candidati invalidi, pagine sovrapposte, identità ripetute e riferimenti fuori dalle pagine inviate. Le citazioni visive restano osservazioni del provider con regione obbligatoria, non OCR verificato.

Il gruppo non può contenere soggetti/oggetti, fatti globali o un totale globale: senza un’attribuzione per fattura questi dati rischierebbero di essere associati alla pagina sbagliata. Per questo incremento rimangono esclusi anche contatti globali. Una fattura singola e le bollette mantengono il contratto precedente. I titoli espliciti con `fatture` sono riconosciuti come intestazioni di fattura, sempre con citazione letterale.

`houseExpenses[].invoiceSegment = {key,page}` è metadato derivato dal server, non input della conferma. La chiave `invoice-page-v1` dipende da SHA e pagina fisica, **non da importo, ordine dei candidati o testo modificabile restituito dal modello**. I tre ancoraggi restano obbligatori, ma abbreviare un numero/fornitore stampato non trasforma la stessa pagina in una nuova fattura. Fingerprint stabili fra copie dello stesso originale; `itemId` distinto e legato al documento della bozza.

Prompt versionato `document-understanding-v24-invoice-pages`. Il gruppo richiede sempre revisione; anche la conferma interna con flag automatico è bloccata. Non è stato eseguito alcun invio con il nuovo prompt.

## Conferma, privacy e idempotenza

Ogni proposta conserva scelta, decisione, numero, fornitore, data e importo separati; si può confermare/rinviare una fattura lasciando l’altra aperta. La creazione richiede il candidato `current_document_total` della fattura selezionata e i suoi ancoraggi, con data spesa uguale alla data documento. Non è consentito sostituirlo con una somma manuale o con l’importo/identità dell’altra pagina.

Le due creazioni avvengono nella transazione esistente sotto lock della casa. Il fallimento della seconda annulla anche la prima e la ricevuta. Stessa richiesta/chiave ripete soltanto la ricevuta; payload diverso con la stessa chiave resta un conflitto. Nuove chiavi non riaprono decisioni già risolte.

La provenienza persistita in `HomeExpense.economicProvenance._invoiceSegment` conserva chiave/pagina; le fonti dei singoli campi mantengono documento/versione/SHA/pagina originali. Nessuna nuova tabella o migrazione. Il controllo duplicati sullo stesso SHA confronta il segmento, così pagine/fatture distinte non vengono fuse perché hanno lo stesso importo o numero. Le righe precedenti prive di segmento mantengono il controllo prudenziale precedente. Una copia o rianalisi della stessa pagina non può creare una nuova spesa, neppure con identificativi abbreviati o consenso ai possibili duplicati.

Il riuso di una spesa esistente richiede lo stesso segmento e la fonte leggibile corrente: è bloccato il collegamento della prima fattura alla spesa della seconda. Fonte privata, account/casa, ruolo, versione/SHA e diritti sono rivalidati anche nel replay. Se la fonte non è più leggibile, entrambe le proposte vengono oscurate e il replay non restituisce la ricevuta sensibile.

## Verifiche offline

Le risposte sono costruite localmente da citazioni del corpus sintetico, non registrazioni del modello o letture OCR certificate. Il test dell’adattatore prepara l’originale Q48 reale **sintetico**, usa parser e decoder di produzione con trasporto HTTP interamente in memoria e controlla lo score contro il gold invariato: due importi/date/fornitori corretti nella fixture, decisione di revisione, nessun totale globale. `fetch` di rete è disabilitato nei nuovi test.

La suite DB usa un cluster nuovo e vuoto sulla **55433**, database `dimora_v5_quality_v3_test`, ruolo `quality_test`, con guard sull’URL. Migrazioni esistenti applicate solo al cluster temporaneo; `.env` non caricato dal migratore, API e DB dell’app sulla 55432 e ledger della campagna non toccati. Cluster poi spento e file conservati. Comando riproducibile da `backend-v5`: `npm run test:q48-db -- -PgBin <directory-bin-PostgreSQL> -ScratchRoot <directory-lavoro>`.

Esiti finali: **build/lint verdi**, suite onboarding **174/174** (8 nuovi test Q48), qualità **24/24**, guard **11/11**, backend `npm test` **213/213**, DB isolato **11/11** (10 scenari più contenitore). Eseguite le stesse liste di file degli script onboarding/qualità sul `dist` finale; il wrapper DB esegue la build prima delle prove. Le prove DB coprono account senza accesso, owner diverso sulla stessa casa, modalità automatica, importi/identità incrociati, rollback, concorrenza, replay da altro client DB, copie dello stesso SHA, abbreviazioni, collegamento corretto/errato, rinvio parziale, revoca fonte, cambio SHA e ruolo viewer. Nessun oggetto o contatto viene creato.

Il generatore delle eventuali future ricevute include ora anche hash di `domain.ts`, `understanding.ts` e `invoice-segments.ts`; un nuovo guard lo verifica. Non è stata generata o sostituita alcuna ricevuta operativa. Controllo finale dei file storici e dell’audit: ancora 876 righe e 146 invii Messages della campagna precedente, senza nuovi invii. Corpus/gold e tre JSON storici invariati; link e `git diff --check` verificati.

## Limiti e seguito

Non sono supportate da questo incremento fatture multipagina, più fatture sulla stessa pagina, ancoraggi assenti, soggetti o professionisti da attribuire a fatture differenti. Rimangono rifiutate senza fallback AI o fusione. L’UI esistente tratta già `houseExpenses` come una lista con scelte per `itemId`; nessuna modifica frontend né collaudo browser/live in questo incarico.

Gold, corpus, ricevuta, risultati e audit della campagna precedente rimangono invariati: il gate AI resta **non superato**, con Q48 storico invalido. Le fixture offline dimostrano il contratto e la persistenza, non un miglioramento misurato del modello. Nuova campagna o invio di reali richiedono autorizzazione distinta. Nessuna modifica a `main`, quote o dati personali; file sporchi estranei preservati.
