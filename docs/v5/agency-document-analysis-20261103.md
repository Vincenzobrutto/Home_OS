# Analisi documentale nativa Agenzie — 3 novembre 2026

## Obiettivo e stato

Lotto `codex/agency-document-analysis-20261103`, successivo all'integrazione Gift PR76. Collegare atto, successione e visura del fascicolo a condizioni/consenso, job durevole, lettura testuale autorizzata, proposte citate e revisione esistente. Nessuna AI reale o spesa autorizzata da questo lotto; nessun deploy, main, demo Alessio o servizio esistente modificato.

**Implementato e verificato con fixture:** prodotto 737cdc9, riallineato al comune 3335ea9; backend finale 930/930, DB/API 37/37, frontend mirato 88/88, statici/build e browser desktop/375 px verdi. Runtime reale non attivato né collaudato. Il ramo dedicato viene pubblicato come PR di revisione; Gift PR72–76 è già nel comune, questo lotto nativo resta separato.

## Esperienza nell'app

Area Agenzie → pratica → Dati, fonti e verifiche → Apri dati e verifiche → Analizza atto o visura. La classificazione della fonte determina i campi ammessi. L'agente sceglie documento e pagine fisiche, legge condizioni e limite, autorizza e avvia. Stato e chiave sono riconciliabili dopo una risposta perduta; ricarica/polling non eseguono POST automatici. Le proposte aprono il pannello esistente: citazione, associazione esplicita a persona/unità, poi decisione sul fatto. Non sono fatti già confermati o certificazioni.

Il runtime senza configurazione e budget documentale attuali mostra indisponibilità; lo storico autorizzato resta leggibile. Non esiste fallback fixture nel prodotto. I provider sintetici sono soltanto dependency injection dei test, vincolati agli SHA delle fixture.

## Contratto e persistenza

- Scopo `DOCUMENT_EXTRACT`, distinto dal budget delle planimetrie e dalla vecchia riserva di 4 EUR. Valuta, modello, tariffe input/output, eventuale costo del conteggio e massimale sono espliciti. Nessun tasso di cambio o modello/prezzo implicito.
- Offerta immutabile: attore/pratica, fonte/versione/SHA/tipo, pagine fisiche, configurazione, prompt, contratto campi, massimale e scadenza. Il consenso indica esattamente quell'offerta.
- Ammissione atomica con prenotazione e chiave/idempotenza per attore. Un'unica prova attiva/incerta anche fra attori/chiavi/configurazioni impedisce reinvii alternativi.
- Marker durevole prima di conteggio e generazione, lease con epoch e capability, coda riscoperta da SQL. Nessun lavoro esterno sotto lock SQL. Un marker incerto non autorizza retry o rilascio automatico della prenotazione.
- Conteggio noto riprendibile soltanto prima della generazione mai inviata. Una risposta tardiva viene contabilizzata ma non riapre una quarantena. Finalizzazione di accounting/job/proposte nella stessa transazione.
- Membership, grant e accesso alla fonte rivalutati per fase. Revoca, cambio documento/configurazione o lease scaduta impediscono pubblicazione; la contabilità interna può conservare il costo noto senza rendere il contenuto leggibile.
- Ordine lock ordinario: membership/grant/pratica → budget → job/dispatch. Lo storico del solo attore richiede lettura, non export; avvio e lavoro richiedono gestione.

Nuova migrazione additiva `20261103130000_agency_document_analysis`: budget, offerte, job e dispatch dedicati. Nessuna API pubblica per attribuire budget o dichiarare un risultato provider attendibile.

## API

Sessione normale e controlli Origin/CSRF sulle mutazioni, no-store e DTO esatti:

- `GET /agencies/:agencyId/practices/:practiceId/deed-analysis-options?sourceId=…&expectedSourceVersion=…&pages=1,2`: condizioni e disponibilità; nessun invio provider o prenotazione.
- `POST …/deed-analysis-jobs`, header `Idempotency-Key`, body `{expectedRevision, sourceId, expectedSourceVersion, pages, offerId, approved:true}`.
- `GET …/deed-analysis-jobs`: storico del chiamante.
- `GET …/deed-analysis-jobs/lookup`, stesso header: recupero durevole senza nuovo avvio.
- `GET …/deed-analysis-jobs/:jobId`: stato minimo del job, nessun testo o credenziale.

Le route esistenti `deed-proposals`, bindings e review restano il percorso delle proposte; il browser non può attestare testo decodificato, risultati, prezzi o proof server.

## Limiti deliberati

Prima versione per PDF nativi testuali, massimo 10 MiB, 20 pagine e limiti del decoder esistente. PDF scansiti, misti con pagine prive di testo o non supportati sono indisponibili: nessun OCR reale incluso. Il provider riceve il testo delle sole pagine scelte, conservandone i numeri fisici.

Il contratto riusa i sei campi letterali esistenti per atto/successione; visura ammette i quattro identificativi catastali e nome con ruolo irrisolto. Non ricava data dell'atto da una data di visura o proprietario attuale da un soggetto storico. Citazione letterale verificata non dimostra significato o validità giuridica. Catalogo esteso e normalizzazioni restano successivi.

Trasporto HTTP predisposto e verificabile con fetch iniettato, senza chiamate esterne di collaudo. Attivazione reale richiede configurazione server, budget attuale, consenso specifico e successivo collaudo autorizzato. Generazione incarico resta bloccata senza modello dell'agenzia approvato.

## Verifiche concluse e risultati riproducibili

- Backend finale: **930/930**, zero skip/fail, tramite runner offline. Primo run 929/930 per un alias mancante del nuovo profilo browser: registrazione corretta, suite completa rieseguita 930/930. I 40 casi puri del nuovo modulo sono inclusi, non sommati una seconda volta.
- Nuovo cluster **n7iVln**: **37/37** (23 ledger +12 HTTP e due contenitori), senza provider reale. Copre consenso/quote, chiavi e lookup dopo riavvio Nest, sessione/Origin/CSRF, privacy e canExport:false, PDF/pagine, associazione/conferma, revoca/configurazione, concorrenza, rollback e risposte tardive. Migrazioni soltanto nel nuovo cluster; runner 62849 exit0, stop PostgreSQL, pid e listener assenti verificati.
- Frontend mirato: **88/88 in otto file**, inclusi API/DTO/pending/workspace, binding e sessione/cache; logout normale elimina solo gli envelope dell'account, senza toccare storage Gift estraneo. Nessuna seconda suite frontend completa dichiarata per questo lotto. La regressione ampia Gift e le relative riesecuzioni sono nel report precedente.
- Typecheck backend e frontend app/node, lint mirato e build finali verdi. Bundle principale 523,96 kB con warning Vite preservato. Cache/generated privati, nessuna installazione nelle junction.
- Browser **6YeuAC**, codice prodotto identico a 737cdc9: accesso normale del fixture agente, scan/misto fermato senza invio, consenso annullato al cambio pagine, atto pagine1–2, apertura citazioni/fonti, associazione del subalterno ancora proposto, reload e recupero dello stesso risultato. Visura della sola pagina2 a375×812: secondo record distinto, ruolo irrisolto, nessuna data atto inventata. ScrollWidth360 su viewport375, console senza errori; non telefono fisico.
- Due job completed_with_proposals, quattro sole fasi fixture (count/generate per documento), nessun invio dalla ricarica o dal PDF non leggibile. Scanner/SMTP/AI esterna non esercitati; le persone/documenti sono sintetici, il provider è vincolato agli SHA del manifest test-only. Accuratezza di un modello reale non misurata.
- Primo nominale **MBV0LH** fermato dopo aver rilevato 404 della SPA nel server di collaudo; corretti ordine/filtro statici e readiness SPA/asset/API nel solo harness. Non è un collaudo browser verde. Nuovo nominale6YeuAC con nuovo database e hostname, niente riuso o restore. Dopo QA: viewport ripristinato, solo tab creati chiusi, marker proprietario, runner94729 exit0, harness1/1 e arresto PostgreSQL/pid/listener verificati. Il vecchio trial utente non è stato modificato o fermato.

Screenshot privati negli outputs della chat: proposte-citate-desktop.png e analisi-mobile.png. Nessun link personale o token in Git. Le UI di esito incerto bloccano conservativamente nuovi avvii fino alla riconciliazione: nessuna console operativa di risoluzione inventata.
