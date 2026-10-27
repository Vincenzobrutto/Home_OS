# Spese — andamento mensile e anello principale, 27 ottobre 2026
**Aggiornamento corrente:** rifiniture autorizzate dopo la revisione indipendente di Claude su b0553b3; vedi la sezione finale «Rifiniture dopo il riesame». Gli esiti precedenti descrivono la prima consegna.

## Incarico e perimetro

Lotto Codex separato dalla punta remota dd52a6af580dedf1641cb2308620c338f2184ae0 del consolidamento. Branch codex/spese-andamento-mensile-20261027, worktree dedicato; registrazione 1e3803d prima del codice. Controllati AGENTS.md, istruzioni frontend e tabella dei lotti: nessun lotto Claude aperto sovrapposto ai moduli economy/SpesePage. Main, checkout Home_OS sporco, altri worktree e runtime in uso non modificati.

Il committente approva la disposizione dello screenshot: elenco a sinistra, totale/anello/distribuzione a destra, andamento a barre sotto. Solo sviluppo e PR: nessun merge o rilascio implicito.

## Comportamento implementato

- Totale e anello restano il riepilogo del periodo e dei filtri selezionati. Su mobile sono sempre visibili prima dell’elenco; superata per questo lotto la precedente analisi chiusa inizialmente.
- Andamento mostra fino a tre mesi, i più recenti del periodo autoritativo del server, incluso quello corrente nell’anno in corso. Stessa scala per le due barre di ogni mese: periodo selezionato e anno precedente. Importi esatti testuali; differenza fra assenza di registrazioni, zero ed errore.
- Mostra tutto l’anno espande soltanto il grafico, senza cambiare URL, totale o filtri. Negli intervalli personalizzati il comando si riferisce ai mesi dell’intervallo; periodi brevi non hanno un’espansione inutile. Per intervalli superiori a 12 mesi: finestre di 12 con precedenti/successivi; nessuna richiesta illimitata e nessun taglio silenzioso.
- Click/Enter/Spazio sul mese applicano gli stessi estremi di quel segmento all’elenco e aprono Acquisti e interventi con focus sul suo comando. Gli estremi parziali non sono estesi al mese intero. Ricerca privata conservata nello stato di navigazione, mai aggiunta all’URL. Anello e totale seguono il mese dopo il drill.
- Il confronto per gruppi resta richiudibile e consultabile esplicitamente; viene aperto dal drill, non ripetuto per intero all’ingresso. Nessuna mutazione da questi comandi.

## Dati e contratto

Nessun backend, schema, migrazione, dipendenza o nuova API. Ogni coppia usa GET summary con from/to già contrattualizzati e tutti gli altri filtri invariati. Il server calcola il totale dell’intero mese e il confronto precedente, con privacy, membership, fonti e regole temporali canoniche. Non si sommano le pagine caricate e non si deduce il mese dai servizi/emissione. Non si riclassificano costi né si deducono pagamenti o risparmi.

Il grafico richiede tre riepiloghi aggiuntivi iniziali (meno per periodi brevi), fino a dodici espandendo. Cache TanStack comune e scoped account/casa/filtri, AbortSignal, nessun dato placeholder di un altro ambito. Retry automatico disabilitato per queste letture; recupero esplicito sugli errori ammessi, nessun retry su 403. Se un mese fallisce, nessun insieme parziale viene presentato come grafico completo. Il 403 elimina le barre precedenti e richiama la pulizia/scadenza autorizzazioni già usata nello storico.

Non sono un’unica snapshot atomica tra tutti i mesi: i riepiloghi sono richieste indipendenti. Un futuro endpoint aggregato potrebbe ridurre richieste e allineare asOf; non è necessario leggere o modificare il database reale in questo lotto. Date e adattamento bisestile restano autorità del servizio. Grafico e totali riguardano solo costi attivi; archiviate/tutti mantengono l’avviso precedente senza grafico delle attive spacciato per totale archiviate.

## Verifiche offline

Harness FakeBackend in memoria, solo dati sintetici. Runner esterno con cleanEnvironment(unit), guardie rete/Prisma, un worker e retry 0. Nessuna modifica a timeout, gold o asserzioni esistenti di privacy/idempotenza. Nessun test su DB/API/storage reale; nessuna AI/email.

- Gruppo Spese iniziale: 73/73 in 7 file, incluso il primo nucleo dei nuovi test. Nuovi casi finali **17/17**, inclusi nella suite completa **1586/1586 in 153 file**, 1170,23 secondi. Zero casi saltati/todo e retry 0; unica esecuzione completa, verde. Fonte prodotto **3f7044e1ff667d9d037787a31d1f7c15cc0adc8f**, invariata durante e dopo le verifiche.
- Typecheck, lint e build finali: **superati**.
- Fixture locali: **5/5 in 2 file**, incluso OCR sulla scansione sintetica locale senza rete.
- Test nuovi: mesi/calendario/bisestile/anno basso, finestra lunga e limite richieste, 25 righe contro prima pagina di 20, totale e filtri invarianti all’espansione, drill da tastiera, privacy della ricerca, periodi parziali, errore/riprova, assenza di storico, cambio casa/ambito e revoca membership, 403 mensile senza vecchie barre o retry automatici.

Primi tentativi dei soli test nuovi: corretta un’aspettativa del contenitore, inizialmente atteso assente anziché presente con errore. Conservati i controlli sostanziali: vecchie barre assenti, nessun retry automatico, nessuna scrittura. Un’altra aspettativa sul details chiuso usa l’attributo open anziché assumere che JSDOM nasconda i discendenti alle query. Nessuna modifica alle asserzioni storiche.

## Browser del candidato

Harness esterno compilato importando i componenti React di questo worktree, non screenshot o HTML della preview. FakeBackend in memoria, login sintetico; origine 5197 autorizzata con profili Chrome separati. Playwright soddisfa solo gli asset locali /monthly-implementation/, blocca altre destinazioni/metodi. Nessuna API reale. Dopo il seed/login i percorsi provati eseguono solo letture nel simulatore.

Desktop 1440x1024, tablet 873x805, mobile 390x844 e 320x844 verificati con screenshot salvati e ispezionati. Tre coppie, espansione/ritorno senza cambiare periodo, anello visibile, drill mensile da tastiera e dettaglio aperto; nessun errore JS, richiesta esterna o overflow della pagina/righe. Artefatti locali outputs/spese-andamento-implementazione-20261027 nel task; nessun documento personale o credenziale in Git. Ricattura finale eseguita sulla fonte 3f7044e e immagini ispezionate; anche il percorso Bollette → settembre → Internet è verde a desktop e mobile: una sola riga da32,90 euro, stessi importi in anello e barre. Prima il selettore browser contava anche l’intestazione del mese come seconda riga: ristretto alle righe effettive, senza modificare dati o aspettative monetarie. Sette scenari browser finali verdi.

Limiti: nessuna prova su telefono Safari fisico o screen reader reale; nessuna attestazione completa WCAG. Nessun collaudo sul runtime reale.

## Consegna

Push della fonte prodotto 3f7044e verificato con git ls-remote; consolidamento dd52a6a e main cdbb318 invariati. [PR #70](https://github.com/Vincenzobrutto/Home_OS/pull/70) aperta verso codex/dimora-v5-consolidata-20261023 dopo il commit documentale 6f87003, push verificato con git ls-remote. Il commit successivo registra soltanto questo link, senza cambiare prodotto o test. Merge e attivazione al committente; nessuna migrazione necessaria. Il committente dovrà rivedere la PR e, dopo eventuale integrazione/attivazione autorizzata, provare i dati della propria casa.


Comandi eseguiti attraverso il runner locale con ambiente ripulito: vitest run --project mock --maxWorkers=1 --retry=0; vitest run --project fixtures --maxWorkers=1 --retry=0; tsc -b --noEmit; eslint .; vite build. Per la junction delle dipendenze usato soltanto un override Vite esterno con il percorso fisico degli asset PDF, come nel precedente lotto, senza cambiare prodotto o validazioni. Log locali work/monthly-all.log, monthly-fixtures.log, monthly-typecheck.log, monthly-lint.log e monthly-build.log nel task; misure browser in outputs/spese-andamento-implementazione-20261027. Nessuna asserzione preesistente modificata.


## Rifiniture dopo il riesame

Il committente approva le rifiniture proposte dopo il [commento indipendente di Claude](https://github.com/Vincenzobrutto/Home_OS/pull/70#issuecomment-6439449689), senza rilievi bloccanti su b0553b3. Ripresa dello stesso lotto/PR #70 registrata con commit73ed6e8 prima del codice; nessuna sovrapposizione con altri lotti. Nessuna autorizzazione al merge o al rilascio.

### Comportamento corrente

- Nella disposizione a colonna singola totale e anello restano visibili. Legenda/importi per gruppo e relative spiegazioni sono apribili con un details nativo; i confronti estesi si trovano dopo l’elenco. Il dettaglio è una sola istanza, spostata con un portal React nel contenitore mobile: niente duplicazione di controlli o ID. Su desktop rimane sotto le barre a destra.
- Tre coppie di barre restano visibili, con altezza ridotta su telefono e testi sintetici; spiegazioni complete apribili. Controlli del periodo e azioni si dispongono su una riga anche a320px. L’elenco sintetico di prova inizia a1062px a390 e1089px a320 (prima misura del nuovo harness:1439px a390). Il limite di1100px nel test non è stato allentato.
- Espandendo, lo scorrimento parte dai mesi recenti, con gli ultimi mesi già in vista; le finestre lunghe restano limitate a12 mesi. L’espansione sopravvive ai filtri tramite stato UI separato dagli aggregati.
- Il drill conserva il periodo di contesto del grafico e i tre mesi (o la finestra espansa scelta), evidenziando il segmento selezionato. Totale e lista seguono il mese. Un secondo clic sullo stesso segmento apre il dettaglio senza una navigazione duplicata.
- Indietro ripristina il focus sulla barra e lo stato precedente di apertura del dettaglio. Le istantanee di sola UI sono limitate a32 e verificate per account/casa; nessun importo è memorizzato in questi record. Il contesto mensile nello stato di navigazione è validato per casa, calendario e selezione; la ricerca resta privata fuori dall’URL.
- Febbraio2025 mostra esplicitamente il confronto1–28febbraio2024 e l’esclusione del29. L’adattamento inverso del bisestile è spiegato dai metadati server. Importi, periodi e regole del contratto non cambiano.
- Rimossi i vecchi stili mobileTotal/analisi a scomparsa e consolidati i breakpoint. Selettore della griglia dell’anello reso esplicito, indipendente dalla posizione dei figli DOM. Nessun nuovo endpoint o dipendenza.

### Verifiche della rifinitura

- Test nuovi/rafforzati:22/22, inclusi tre nuovi percorsi UI (contesto/cronologia/Indietro, espansione e dettaglio già aperto, febbraio) e due casi puri sulle note del calendario. Gruppo Spese finale in verifica; precedente gruppo79/79 prima dell’ultima rifinitura responsive.
- Typecheck, lint, build e fixture5/5 verdi. Il nuovo entry del harness è verificato con tsconfig.browser.json dedicato al JSX; non viene lasciato privo di controllo dei tipi né incluso erroneamente nella configurazione Node.
- Suite mock completa della fonte rifinita in corso, un worker/retry0; nessun timeout, gold o asserzione storica indebolito.
- Harness riproducibile ora nel repository: frontend-v5/tests/browser/spese e scripts/spese-browser-check.mjs; comando npm run test:spese-browser con Playwright/Chrome già installati e parametri documentati nel README. Non installa software, non avvia server né DB, non carica configurazione .env. Compila i componenti candidati e soddisfa soltanto asset locali su5197/spese-browser; backend solo in memoria.
- Verificati1440/873/390/320: anello e tre mesi, espansione sui recenti, filtri, drill da tastiera/secondo clic/Indietro, febbraio,503/403 e righe senza overflow. Zero richieste esterne, errori JS o scritture dopo il seed/login sintetico. Screenshot salvati e ispezionati; ultima ripetizione finale del runner ancora da registrare. Artefatti locali outputs/spese-pr70-rifiniture-20261027 nel task.

Durante la diagnosi: prima compilazione del harness erroneamente inclusa nel progetto TS Node senza JSX, risolta con progetto TS dedicato; prima lint corregge una mutazione DOM nel callback usando il metodo nativo setAttribute. Controlli browser iniziali della distanza dell’elenco rossi a1439/1213px: corretto il layout, mantenendo la soglia. Prova successiva a320 rossa a1170px: compattati i controlli del periodo e le azioni, senza nasconderli. Ispezione screenshot ha rilevato una legenda desktop troppo stretta: corretto il selettore strutturale, ricatturato. Nessuna esclusione delle prove o modifica degli importi.

### Limiti e consegna della rifinitura

Le letture restano tre riepiloghi mensili iniziali, fino a12 nella finestra espansa; un endpoint aggregato unico resta in roadmap. Nessun fallback con dati inventati in modalità reale, snapshot atomica fra mesi, collaudo sul DB reale o prova Safari/telefono/screen reader dichiarati. Main, consolidamento, runtime e dati reali preservati. La PR #70 verrà aggiornata con i risultati finali; merge e attivazione restano al committente.
