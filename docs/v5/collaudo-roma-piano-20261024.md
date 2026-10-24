# Collaudo Roma — preparazione per il 24 ottobre 2026

## Perimetro e consenso

Incarico successivo al riesame della PR #9: rendere disponibile il caricamento di dati reali nella casa applicativa già esistente, non in una casa sintetica. Il committente ha chiesto una proposta separata di documenti, budget e limiti prima di ogni nuovo invio AI. Nessun consenso AI è implicito nella preparazione notturna.

Base prodotto: consolidamento `703cac42b36a3abb3f10a29339a201f0de46ad45`, comprendente le PR #15 e #17 già approvate e unite. Worktree separato `Dimora-V5-collaudo-roma-20261023`, branch `codex/collaudo-roma-20261023`; registrazione `e83f933` prima degli interventi. Nessuna modifica al codice prodotto o allo schema. Il cestino Claude (PR #9/#16) e le evidenze rosse PR #18 non entrano nel runtime.

## Piano operativo e stato

| Attività | Stato ed evidenza |
| --- | --- |
| Identificare la casa e l'account senza scritture canoniche | Verificato con transazione SQL RepeatableRead READ ONLY e accesso normale nel browser. Distinte la casa principale e quella separata con prefisso PROVA. Identificatori e account conservati solo negli strumenti locali, fuori dal repository. |
| Inventario prima e dopo la preparazione | Casa principale: 28 documenti, 5 oggetti, 9 spese, 12 stanze, 21 bozze onboarding e 11 job. Conteggi delle due case corrispondenti e stati/conteggi globali dei job identici prima/dopo accesso e sonde HTTP. Le sessioni di accesso sono normalmente create dal prodotto e non fanno parte dell'inventario canonico. |
| Compatibilità schema | Schema locale identico al client già generato sulla base ordini, prima di copiarlo. Tutte le 34 migrazioni registrate sono completate e non annullate; i 34 nomi coincidono con le cartelle di migrazione locali. Nessuna migrazione lanciata sul reale. |
| Runtime consolidato | Backend compilato nel nuovo worktree, API propria loopback 3011; frontend loopback 5174 con proxy alla nuova API. API precedente 3001, DB e ambiente isolato preesistenti non fermati/modificati. Solo porta nell'artefatto compilato adattata, non nel sorgente. |
| Protezioni del collaudo | Provider fetch/HTTP bloccati, chiave Anthropic rimossa dal solo processo figlio, quattro flag AI false; worker a pagamento/automatici e cleanup storage disabilitati; classificatore solo locale abilitato con coda separata `roma-collaudo-20261024`, accessibile unicamente dai caricamenti della casa concordata. Accesso/letture consentiti; sole route di upload manuale nella casa concordata ammesse in scrittura. AI, automatic-runs, conferme canoniche, cancellazioni, condivisioni e recupero email bloccati prima dei controller. Autenticazione, membership, CSRF, scanner e validazioni originali restano attivi. |
| Verifica dei blocchi | Cinque sonde POST senza dati reali restituiscono 403 `roma_collaudo_protected`: job AI, automatic-runs, spese, conferma bozza, recupero email. Header `X-Dimora-Collaudo: roma-consolidata-703cac4-no-ai`. Nessun job creato o email inviata. |
| Storage e antivirus | Circa 200 GB liberi al controllo; Windows Defender antivirus e protezione in tempo reale attivi. Storage privato originale usato tramite configurazione del solo runtime; nessuna copia o eliminazione di originali. I 104 StoredFile orfani non toccati. Nessuna scansione/upload di prova sul reale. |
| Browser | Accesso riuscito con le credenziali già compilate dal browser, senza leggere o cambiare password. Archivio della casa principale aperto, pannello Aggiungi documenti visibile. Prima del consenso: nessun file selezionato e nessun clic AI/conferma. Dopo il consenso sono stati caricati soltanto i primi due PDF e aperta la bozza caffè, senza conferme. |
| Verifiche di compilazione | Backend build e frontend build/typecheck superati. Il sorgente frontend è quello della PR #17, la cui mock completa 870/870 è evidenza precedente, non una nuova esecuzione di questa preparazione. |
| Regressione HTTP/DB sintetica | Superato: 497/497 sul consolidamento, 54 HTTP + 441 diretti + 2 dopo riavvio. Cluster nuovo `tr/dimora-offline-uYpet0`, poi fermato, scratch corta e nessun altro runner simultaneo. Primo tentativo fermato durante la copia/junction prima di initdb; ripetizione con permessi adeguati. |
| Ricontrollo fino alle 08:00 | Heartbeat della chat attivato per il controllo finale delle 08:00 Europe/Rome, 24/10; disponibilità, guardie, versione e stato. Nessuna ripresa AI dopo il rifiuto, nessun merge, caricamento o dato canonico automatico. |

## Proposta AI — autorizzata, campagna interrotta secondo i limiti

Quattro documenti reali già anonimizzati forniti dal committente: ordine macchina da caffè, ordine frigorifero Samsung, acconto e saldo degli stessi climatizzatori. Manifesto locale con nomi esatti, dimensioni e SHA-256 verificati il 23/10; nessun PDF, testo, risposta provider o identificatore della casa reale nel repository.

Proposta: invio ad Anthropic per il solo onboarding articoli, modello `claude-sonnet-5-5` e prompt v29 già usati nel precedente collaudo caffè. **Massimo 1 USD complessivo e quattro richieste Messages, una per PDF**, prenotazione massima di 0,25 USD ciascuna. La preparazione attuale prevede per ogni PDF anche un controllo modello e un `count_tokens`: massimo quattro GET modello, quattro POST conteggio token e quattro POST Messages, dodici richieste HTTP totali. Il conteggio token trasmette già il documento/testo al provider e richiede lo stesso consenso. La proposta è stata successivamente approvata esplicitamente dal committente nella chat; gli esiti effettivi sono riportati sotto.

Prima dell'eventuale avvio: verificare nuovamente SHA, account/casa, ledger e disponibilità del modello; applicare allowlist dei quattro hash e blocco della casa/account nel runner, campagna nuova dedicata senza resettare campagne storiche. Nessuna autorizzazione generica per tutti i documenti della casa. Arresto al primo timeout/esito incerto, errore provider o validazione rifiutata; nessun retry o estensione di quota. Se un documento già presente con lo stesso hash dispone di proposta riutilizzabile, valutarla senza un nuovo invio e non consumare una chiamata per raggiungere il numero massimo.

Il percorso è **solo proposte**: bozze e ledger possono essere persistiti dopo consenso, ma nessun oggetto, spesa, contatto o stanza viene creato/aggiornato automaticamente. Nessun caricamento preventivo dei quattro file nella casa reale durante questa preparazione. L'API nel browser mantiene AI e conferme bloccate; la campagna è stata eseguita da un runner locale separato con gli stessi servizi di prodotto, membership/fonti/versione/SHA e ledger, più controllo di casa/account/hash e journal HTTP durevole. Nessun endpoint AI generico è stato aperto.

## Percorso di verifica del committente

1. Aprire l'archivio della casa principale dal browser già predisposto. Verificare intestazione della casa; non scegliere la casa PROVA.
2. Caricare inizialmente un solo documento tramite Aggiungi documenti → Scegli file. È un caricamento reale: il documento entra nell'archivio, ma non crea oggetti o spese. Nessuna elaborazione AI deve partire da sola.
3. Dopo consenso AI specifico e attivazione controllata, verificare le proposte prima di confermare: identità e variante, quantità, costo, ruoli delle date, stanza effettiva e scelta oggetto nuovo/esistente. Non premere conferma durante il collaudo di sole proposte.
4. Caffè: confrontare 499 EUR complessivi, spedizione zero, data ordine/acquisto proposta 14/06/2026; consegna e pagamento non vanno trasformati nella data di acquisto. Marca e modello devono rimanere completi anche con nome breve.
5. Samsung: prezzo riga 849,15 EUR, spedizione 75 EUR e totale 924,15 EUR distinti; la regola concordata può proporre il totale come costo di acquisto dell'unico prodotto, dichiarando che include la spedizione. Modello oscurato non inventato; ordine distinto da consegna e pagamento.
6. Acconto/saldo: collegamento agli stessi climatizzatori; nessun oggetto duplicato, nessuna somma o ripartizione arbitraria dei totali. Il documento ambiguo richiede conferma. Ordine inverso e ricaricamenti restano verifiche offline, evitando creazioni ripetute nella casa reale.
7. Stanza: suggerimento basato su tipologia e ambienti realmente disponibili, da confermare; nessuna deduzione dell'ubicazione effettiva dal solo tipo di apparecchio. In un documento di impianto distribuito non scegliere una stanza unica automaticamente.

## Esito della campagna autorizzata, 24 ottobre alle 07:10

Campagna nuova `onboarding-roma-four-20261024`, nessun reset di ledger. Prima dell'avvio: controllo a secco con fetch vietato, quattro hash verificati, casa/account e budget limitati, sette worker/servizi automatici disabilitati. Claim esplicito dei soli job creati dal runner; nessuno svuotamento della coda generale. Ogni endpoint provider consentito una sola volta per hash, con registrazione prima del dispatch; massimo quattro per tipo e dodici richieste totali. I contenuti delle risposte provider non sono copiati nei log o nel repository.

| Documento | Esito e azione |
| --- | --- |
| Macchina da caffè | Caricata attraverso l'interfaccia normale con scanner attivo. Modello, conteggio token e Messages HTTP 200; job succeeded e bozza extraction aperta. Costo settled 0,037809 USD. |
| Ordine Samsung | Caricato dal servizio di upload di prodotto con scanner, membership e idempotenza invariati; fonte e hash verificati. Modello e conteggio token HTTP 200; Messages HTTP 400, `provider_request_rejected`. Job/attempt conservati uncertain, senza bozza. Campagna arrestata immediatamente, nessun retry. |
| Acconto e saldo climatizzatori | Non caricati e non inviati, poiché il limite operativo imponeva l'arresto al primo errore/incertezza. Restano nel manifesto autorizzato, ma il residuo del budget non viene usato per riprendere la campagna. |

Due Messages, due controlli modello e due conteggi token: **sei richieste HTTP** totali. Costo noto settled **0,037809 USD**; Samsung conserva una prenotazione incerta di **0,25 USD**, quindi impegno prudenziale totale **0,287809 USD**. Non dichiarare Samsung gratuito o liberare manualmente la prenotazione. Nessuna nuova AI dopo lo stop.

Audit separato in transazione READ ONLY dopo lo stop: **impronte identiche** per tutti i record di oggetti, spese, stanze e contatti della casa (5/9/12/1). I documenti passano legittimamente da 28 a 30 e viene aggiunta una sola bozza AI. Hash dei due originali nel DB identici ai due file del manifesto. Le due vecchie analisi incerte non sono state ritentate.

### Confronto caffè con il PDF e con la schermata

Verificata la pagina renderizzata del PDF fornito e la bozza nel browser della casa reale, senza cambiare campi o premere Salva. Riepilogo ordine e marca De'Longhi coerenti; totale 499,00 EUR, spedizione 0,00 EUR, ordine 14/06/2026. La UI propone **499 EUR** come costo dell'unico prodotto e **14/06/2026** come acquisto da ordine, con spiegazione dell'origine; opzione costo **Non creare una spesa** e riepilogo **Nessuna nuova spesa**. Tipo Elettrodomestico e ambiente tipico Cucina sono suggerimenti da confermare, non collocazioni salvate.

**Limite osservato:** questa nuova estrazione non restituisce il codice completo `EXAM440.35.B`, visibile nel PDF; il warning `item:0:model/unverified` è mantenuto. La UI mostra il nome di gamma Rivelia nel campo Modello, ma non equivale al codice completo. Colore/variante, quantità e stanza effettiva restano da controllare. Nessuna deduzione di pagamento o consegna. Il successo tecnico della bozza non significa completezza di tutti i campi e non sostituisce la verifica del committente.

### Diagnosi Samsung, soltanto offline

Ricostruita la preparazione dei due payload con trasporto fittizio e fetch vietato, senza un nuovo preflight. Caffè: PDF visuale una pagina, schema 4.625 byte/53 proprietà; Samsung: PDF visuale due pagine, schema 6.838 byte/80 proprietà, profondità JSON maggiore per i campi di copertura delle fatture per pagina. I due conteggi token online precedenti erano passati. Non è stato letto o registrato il corpo dell'errore HTTP, secondo la protezione esistente che evita l'eco di contenuti personali.

La causa specifica del 400 **non è accertata**: la maggiore complessità dello schema multi-pagina è un'ipotesi da verificare offline; non è prova di un rifiuto del contenuto Samsung o di un difetto negli importi. La documentazione ufficiale descrive ulteriori limiti interni di compilazione oltre a quelli espliciti ([Anthropic, Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)). Nessun parser, gold, schema o validazione è stato allentato per tentare un successo. Prossimo lotto proposto: compatibilità del protocollo multi-pagina e diagnostica non personale del rifiuto, con test generalizzati offline e PR separata; nessun retry dell'esito incerto.

## Limiti e prossime azioni

La casa reale è accessibile e due caricamenti autorizzati sono stati eseguiti; il collaudo AI dei quattro documenti è **parziale e interrotto**, non tutto verde. Il collaudo delle conferme canoniche rimane bloccato; potrà essere aperto dopo revisione delle proposte e incarico pertinente. Nessun bypass di login o recupero password, `.env` modificato, migrazione sul reale, dato canonico automatico, AI fuori dal consenso o email.

Documentazione del lotto su branch proprio con PR verso il consolidamento; il merge resta al committente. Gli strumenti di avvio/guardia e gli audit contenenti identificatori locali rimangono nel work del task, con istruzioni di ripresa nella consegna locale. Il controllo mattutino deve rileggere lo stato effettivo e non dedurre disponibilità dalle sole evidenze di questa notte.

## Ricontrollo mattutino — 24 ottobre, finestra delle 08:00

Verificati nuovamente frontend 5174 HTTP200, API3011 con header di protezione e autenticazione obbligatoria (401 senza sessione); gli stessi processi propri sono ancora attivi. La bozza caffè si riapre dal server nel browser autenticato, con 499 EUR, 14/06/2026, modello da verificare e nessuna nuova spesa. Audit READ ONLY: impronte canoniche ancora identiche, 30 documenti, una bozza riuscita; ledger invariato a 0,037809 USD settled più 0,25 USD uncertain. Nessun riavvio, nuovo upload, AI/preflight/retry o conferma durante il controllo. Monitoraggio concluso dopo questa finestra; servizi lasciati disponibili e PR #19 senza merge.

## Aggiornamento dopo approvazione PR #20 — 24 ottobre

PR #20 integrata su approvazione a 112ad051aa3c291ab56a88149af1d0beae0d0a63; hash remoto verificato, main e Claude invariati. Preparato un checkout runtime separato dalla versione integrata, senza modificare il checkout Home_OS. Il prodotto integrato è identico al codice già verificato nella PR (498/498 HTTP/DB offline e controlli del modulo); build backend rieseguita dopo il merge. Nessuna migrazione o modifica .env.

Riavviati soltanto frontend5174 e API3011 del collaudo, dopo controllo dei PID e delle porte. API precedente3001 e PostgreSQL55432 preservati. Il preload controlla le impronte dei moduli compilati v30; header di risposta X-Dimora-Protocol conferma document-understanding-v30-shared-expense-grammar. AI, processi automatici e conferme canoniche restano bloccati; classificatore locale su coda propria invariato. Cinque sonde di protezione tutte403 prima dei controller.

Audit READ ONLY prima/dopo: intero risultato identico per fonti/hash, bozza caffè, migrazioni, tentativi e ledger, oltre alle impronte canoniche (5 oggetti, 9 spese, 12 stanze, 1 contatto; 30 documenti). Samsung conserva la prenotazione incerta0,25USD; nessun nuovo invio, token count o retry. Il nuovo invio Samsung richiede ancora consenso separato; il merge non lo autorizza. Helper precedenti conservati per il ripristino; stato corrente locale in work/roma-runtime.json.
