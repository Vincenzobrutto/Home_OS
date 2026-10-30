# Dimora Agenzie — continuità del ciclo diurno

Autorizzazione di Vincenzo fino alle18:00 del30ottobre2026 Europe/Rome (17:00UTC). Oltre il termine soltanto consegna, nessuno sviluppo. Piano negli output della chat `Dimora-Agenzie-piano-diurno-20261030.txt`. Questo registro separato evita di sovrascrivere modifiche concorrenti già presenti in worklog/roadmap/changelog/stato.

## 09:00UTC /10:00EuropeRome — contratto atti

Commit pubblicato332af643366e015775ef86063de4813dc3305102, base già pubblicata f249585 del cablaggio concorrente. Worktree separato detached, nessun merge/rebase. Contratto puro per risposta non fidata e testo pagina fidato, citazione/valore verificati lessicalmente, ruoli proposti storici/eredi, soggetti/unità non associati alla pratica. Nessuna conferma automatica, `current_owner` vietato.13nuovi casi sintetici, regressione535/535, build/lint mirato verdi. [Report](agency-deed-extraction-contract-v1.md). PR71 resta draft con limiti del cablaggio espliciti.

## 09:28UTC /10:28EuropeRome — decoder locale e byte autorizzati

Implementati AgencyDeedTextDecoder e loadAuthorizedDeedText, nuovi file indipendenti. Byte/SHA/media verificati dal server, copia immutabile prima di await, parser PDF reale locale riusato senza snapshot Home, restituzione delle pagine fisiche e prova della fonte. Limiti10MiB/20pagine/100.000codepoint. Nessun OCR per scansioni o pagine vuote.

Due letture autorizzate del file prima/dopo decoding: revoca o fonte sostituita scartano il testo. Scope e selezione catturati; risultato decoder con prova diversa rifiutato. Nessuna nuova API/DB, persistenza testi/proposte, classificazione automatica o invio AI. [Report](agency-deed-decoder-v1.md).

Verifiche12nuovi casi: PDF sintetici realmente parse, citazione verificata sul testo fisico, vuoto/invalidità/21pagine, SHA/media/limiti, copia byte, limiti parser iniettato, revoca/sostituzione postdecode, scope e prova non retargetabili. Mirato51/51, regressione ordinaria547/547, build e lint mirato verdi. Nessun test DB nuovo: wrapper autorizzazione testato con store finto esplicito e nessuna dichiarazione di collaudo HTTP/DB reale. Nessuna libreria installata o servizio esistente toccato.

Originale worktree: modifiche concorrenti anche in docs/v5/agency-worklog-20261030.md, docs/roadmap.md, docs/changelog.md e stato; escluse dal nuovo commit e preservate. Continuare in questo registro finché il lotto concorrente non è consolidato, senza riformattare o riscrivere il suo lavoro. Nessun reset/clean/rimozione di worktree. Generated/cache privati.

## Prossimo task

UI controllata in nuovi file indipendenti per revisione fatti/prove e risoluzioni: origine/status, conferma/correzione motivata, stale e conflitti, privacy ricevuta dal server, fonte/pagina senza URL arbitrari. Porte iniettate; nessun fallback mock nel prodotto. Poi persistenza proposte e binding umano fra riferimenti del documento e soggetti/unità della pratica. Modello incarico reale ancora assente: nessuna generazione contratto o certificazione.

Demo Alessio invariata. Budget sperimentale precedente4EUR già impegnato: nessuna nuova AI reale, file personale, email, merge o deploy in questo ciclo. Solo push del branch dedicato con hash/CAS; se un altro commit avanza il branch, non sovrascriverlo né pubblicare staging concorrente.

### Sincronizzazione durante la pubblicazione del decoder

Mentre finivano le verifiche, l'altro incarico ha pubblicato91075c0 (navigazione/perimetro e collaudo). Il CAS locale ha rifiutato l'avanzamento e il primo push e stato respinto non-fast-forward, senza modificare il remoto. Conservato il commit proprio non pubblicato f7fce02 in un ref locale; passati detached al nuovo discendente gia pubblicato e applicato solo quel commit proprio con cherry-pick. Nessun merge, force o riscrittura di commit pubblicati. Diff backend/src e test finding fra snapshot misurato e nuova composizione vuoto: codice/test del decoder identici, esiti547/547 e51/51 pertinenti a quella identita. Il nuovo commit altrui cambia solo frontend/docs e profilo trial, non backend/src.

Il report altrui agency-navigation-validation-20261030.md dichiara1609/1609 frontend, typecheck/lint/build e prove browser reali con provider sintetico, oltre limiti precisi (PNG nel browser, PDF non provato nello stesso flow, provider reale non usato). Queste evidenze restano attribuite al suo collaudo e non sono ripetute o promosse da questo incremento. Il suo ambiente trial e servizio esistente per questa attivita: non toccarlo.

## 10:00UTC /11:00EuropeRome — UI dati/fonti

Nuovi file frontend-v5/src/agency-review e client delle route review gia esistenti. Valori/status/origine/prove, scelta esplicita conferma/correzione/rifiuto, motivo correzione obbligatorio e tipi numerici/false conservati. Nessuna promozione ottimistica o estrazione AI. Source superata e readonly bloccano decisioni;403nasconde tutto,409congela,422mantiene form, esito incerto permette solo retry manuale identico con stessa key. Scope/porta API mutati non ripristinano risposte tardive. Nessuna nuova API/DB/router o modifica ai file del cablaggio.

18/18 nuovi test (15UI+3client), typecheck app e lint mirato verdi. Nuovi casi inclusi numero/false, readonly, cambio scope e cambio porta stessa pratica durante una mutazione; client con sessione/CSRF/account/idempotenza veri su fetch finto. Solo dipendenze gia presenti collegate con junction al worktree, cache privata, nessuna installazione. Primo JSX mancava parentesi; corretto prima del gruppo15verde. Lint vietava reset sincroni in effect, ristrutturati owner della vista e callback/eventi senza disabilitare regole; gruppo finale18verde.

Browser desktop/375 su harness esplicitamente sintetico indipendente: correzione, motivo, evento fonte, save simulato e reload.375viewport/client360/scroll360 e0errori console. Screenshot negli outputs Dimora-revisione-dati-desktop.png, Dimora-revisione-dati-375.png e375-salvata.png. Capturefullpage non disponibile: usata viewport; locatorlabel non risolto, usato combobox per ruolo dopo nuova osservazione. Viewport ripristinato, tab propria chiusa e server34879 fermato con assenza listener verificata. Non e browser contro API reale o telefono fisico.

Report agency-review-ui-v1.md. UI ancora non nella navigazione; fonte originale e nomi soggetti richiedono contenitore autorizzato, storico autori/motivazioni non ancora visualizzato anche se backend lo conserva. Prossimo: UI finding/risoluzioni e poi persistenza/binding umano delle proposte. Backend invariato, nessun suo collaudo ripetuto, modello incarico ancora assente. Demo Alessio e servizi esistenti invariati, nessuna AI/spesa, merge o deploy.

## 10:28UTC /11:28EuropeRome — UI registro verifiche

Implementati FindingsWorkspace e client GET/POST findings esistenti in file indipendenti. Confronti con unita/ambito/epoca e valori/prove, osservazioni manuali, stato open/resolved/reopened, chiusura con motivo e fingerprint corrente. Documento tecnico ricevuto solo con prova selezionata, massimo5 e invalidazione locale se opzioni rimosse; payload clonato per retry immutabile. Nuova nota richiede unita e tipo espliciti, default privata. Storico esiti/motivi/prove, niente conformita o titolarita dedotte. Nessun backend/router/API esistenti modificati.

20nuovi test (17UI+3client); gruppo38/38 inclusi18precedenti, typecheck app/lint mirato verdi. Primo35/35, aggiunti tre casi per readonly corrente, prova rimossa e confronto non valutabile; ambito del confronto reso esplicito e ultimo38/38. Coperti CAS/fingerprint, prove, riapertura, clonazione payload, retry/409/reload/403, scope, visibilita e limite prove. Client sessione/CSRF/account/key reali su fetch finto.

Browser desktop/375 su harness sintetico separato: nota parete interna, documento tecnico non inviabile senza prova, scelta prova/motivo, save e storico, evento fonte, nuova nota successione e reload.375/client360/scroll360 e0errori console. Screenshot outputs Dimora-verifiche-desktop.png,375.png,375-storico.png e375-successione.png. Viewport ripristinato/tab propria chiusa;34879fermato con assenza listener. Non e browser contro DB/API reale o telefono fisico; confronti verificati nei test, non in quel flow browser.

Report agency-findings-ui-v1.md. Componente non nella navigazione, creazione confronti/prove e autori/date storico ancora aperti. Backend invariato e non ritestato senza motivo. Prossimo persist results adapter atti e binding umano a unita/soggetti, poi cablaggio UI dati/finding. Modello incarico assente, nessuna AI/spesa, file personale, servizio esistente, demo Alessio, merge o deploy.

## 11:00UTC /12:00EuropeRome — dominio risultati e binding umano

Nuovo deed-records.ts, solo dominio: stage ricalcola contratto lessicale da TrustedDeedText del server e candidati non fidati, record immutabile con scope/fingerprint/visibilita, senza fatti. Binding sceglie unita/subjectKey e riconosce ruolo documentale, valore/campo/prova dal record e ID fatto server, senza override client; nuovo fatto ancora proposto, mai confermato. SubjectKey non e un registro anagrafico o una verifica di proprieta. Dipendenza su citazione reale invalida alla modifica fonte/classificazione; replay non ripristina record superati.

Privacy separata record/file e ereditata nel fatto: fonte condivisa non rende pubblico un record privato; fonte privata prevale anche su record condiviso, nessun admin implicito. CAS/receipt per actor-key, replay preserva conferme umane successive, no duplicato per candidato/destinazione, altra unita solo scelta esplicita. Limiti20record/2000receipt/2MiB metadati, copia atomica senza mutation parziale; ordine JSONB non altera digest. Nessun metodo store, route, schema/migration o nuova persistenza DB.

21nuovi casi, mirato72/72, ordinari568/568, build/lint mirato verdi. Coperti clone/privacy/ruoli, stage/replay/CAS, override/ack/unita, conferma separata, secondo target, cambi fonte/classificazione/ritiro/revoca, JSONB, cap record/byte, ingresso pacchetto solo dopo conferma e contratto sempre bloccato. Test di dominio con testo fidato sintetico esplicito; non nuova prova DB. Report agency-deed-records-domain-v1.md. Prossimo adapter store transazionale e cluster nuovo posseduto, incluso un PDF realmente decodificato e concorrenza; poi HTTP/UI senza accettare dal browser testo fidato o risultato attestato.

Demo Alessio e servizi esistenti invariati. Nessuna AI/spesa, file personale, installazione, merge o deploy. Registro e risultati aggiornati senza rifare collaudi UI gia conclusi.

## 11:30UTC /12:30EuropeRome — persistenza record/binding

Aggiunti solo metodi interni readDeedProposals/stageDeedProposals/bindDeedProposal nello store esistente, riusando context privato e lock membership/grant/pratica. Dominio, updateManyCAS, riverifica edit e viste filtrate; mai Practice grezzo. Staging da TrustedDeedText server, nessun nuovo endpoint o modello DB; dati nel JSONB opzionale gia previsto. Binding persiste in una transazione fatto proposto/prova/link/receipt senza conferma automatica.

Nuovo profilo protetto test:agency-deed-records-db, incluso nell'aggregato DB senza indebolire guardie/timeout/assert esistenti. Test verifica URLoffline esatto e marker/token prima del client; vault dentro run e nessuna cancellazione.14/14 (suite+13casi) nel nuovo cluster dimora-offline-2xFrbX, stop-postgres.log conferma fermo. PDF sintetico realmente uploadato/decodificato prima dello stage, non AI. Prove persistenza nuova istanza, concorrenza stage/bind stesso e diverso key, JSONB replay dopo conferma, privati/admin/viewer, decoder->source replace o grant revoke, classificazione/withdraw, fingerprint/override con rollback e key non consumata.

Backend568/568 ordinari finali, build/lint mirato verdi; frontend invariato, nessuna sua prova ripetuta. Log work/agency-deed-persistence-regression.log e runDB conservati con dati solo sintetici. Report agency-deed-persistence-v1.md, modello/stato aggiornati distinguendo adapter vero da endpoint ancora assente. Primo script documentale respinto dal parser PowerShell per apostrofo tipografico, nessuna modifica parziale; applicati patch e script isolato corretti. Nessuna AI/spesa, documento personale, servizio/DB esistente o demo Alessio, merge/deploy/installazione.

Prossimo: GET record e POST binding con sessione/CSRF/DTO esatti, mai stage con testo fidato/risultato attestato dal browser; test HTTP su nuovo cluster proprio. Poi UI binding e montaggio revisioni pratica. Stage/provider atti/job/consenso/budget dedicati restano separati e nessun invio reale e autorizzato dalla sola presenza di questi metodi.

## 12:00UTC /13:00EuropeRome — HTTP proposte e binding

Aggiunte GET deed-proposals e POST deed-proposals/:recordId/bindings nel controller esistente. Sessione/CSRF/preflight e DTO esatti: recordId dal path, key da header, nessun override valore/prova/visibilita/confirmed o Actor. Nuove risposte riuscite no-store/nosniff. Stage resta interno, nessuna route che accetti testo fidato o candidati autoattestati dal browser. Binding crea sempre fatto proposto, conferma separata via review.

15/15 HTTP (suite+14casi) con Nest reale, sessioni vere e PostgreSQL nuovo dimora-offline-aQNB9u, fermato e stop-postgres.log verificato. Test prepara solo PDF e candidati sintetici tramite store/decoder, non AI; prova accessi/context, CSRF/Origin, DTO/query, assenza route stage, header, replay dopo conferma distinta, viewer, privacy record/file anche admin, isolamento pratica/agenzia, CAS/fingerprint con key non consumata, fonte sostituita/ritirata e grant revocato. Profilo protetto dedicato incluso nel DB aggregate, guardie non indebolite, vault nel run e nessuna cancellazione. Build/lint mirato verdi.

Primo comando preparazione aveva cwd backend duplicato, fallito prima delle modifiche; corretto. Primo avvio DB sandbox terminato prima di initdb, nessun cluster; ripetuto nel perimetro autorizzato. Prima regressione ordinaria sandbox562/568: cinque hard-link vault EPERM e listener posseduto impedito, non alterati assert/guardie. Ripetizione autorizzata finale568/568,0fail/skip, log work/agency-deed-http-regression-authorized.log. Nessun codice/test cambiato tra i due run. Report agency-deed-http-v1.md. Frontend invariato, nessuna sua prova ripetuta; prossimo UI associazione e montaggio revisioni pratica. Stage/provider atti/consenso/budget dedicati e modello incarico ancora mancanti. Nessuna AI/spesa, file personale, demo Alessio, servizio/DB esistente, merge o deploy.

## 12:32UTC /13:32EuropeRome — UI associazione proposte

DeedWorkspace e client delle route verificate in nuovi file indipendenti. Originale valore/citazione/ruolo e riferimenti documentali separati da destinazione; unita mai precompilata, subjectKey esplicito e checkbox ruolo obbligatoria, motivo facoltativo. Import ancora proposto, conferma separata. Stessa destinazione gia associata bloccata; fonte stale o unita assenti non inventano dati. Client legge review/proposte e rifiuta revisioni diverse, no stage/fallback.

20nuovi casi16UI+4client, gruppo58/58 (incluse38precedenti), typecheck/lint app verdi. Test errori/readonly/retry identico/cambi scope-porta, quote testuali/fontecallback, nessuna unita/record/stale, duplicati e body esplicito. Primo runner sandbox non avviava test per renameEPERMcache; ripetuto autorizzato senza alterare guardie.57verdi prima, aggiunto readonly su retry e ultimo58verde. Nessun backend cambiato o suo collaudo ripetuto.

Browser desktop/375su harness sintetico separato: selezione destinazione/ruolo/motivo, salvataggio ancora proposto, evento fonte e ricarica.375/client360/scroll360,0erroriconsole. Screenshot outputs Dimora-associazione-atto-desktop.png,375.png,375-salvata.png; primo frame mobile puo precedere paint ultimo input, DOM e vista salvata confermano stato. Viewport ripristinato/tabpropriachiusa/server34879fermato con assenza listener. Non e flusso contro API/DB reali o telefono fisico. Report agency-deed-ui-v1.md, ancora non montato nel router; prossimo contenitore autorizzato e cablaggio revisioni pratica. Modello incarico assente, nessuna AI/spesa/filepersonale/demoAlessio/servizioesistente/merge/deploy.

## 13:00UTC /14:00EuropeRome — montaggio revisione nella pratica

Nuovo PracticeReviewSection e ingresso esplicito Apri dati e verifiche in AgencyPages, file precedentemente concorrente verificato pulito e gia pubblicato. Nessun altro router/AppModule/Home. LazyGETcontesto, tre workspace reali con porte memoizzate e readonly server; details conserva form/incerti. Errori accesso in qualsiasi pannello nascondono tutta la revisione. Download originale autorizzato con versione/SHA e bloblocale revocato, risposte tardive scartate; nessun viewerinline. Avviso dopo modifica per reload delle schede sorelle, nessun resetautomatico che perda invii incerti.

9nuovi casi,67/67revisione iniziale; gruppo finale102/102in11file (67revisione+35planimetrie/navigazione), typecheck/lint verdi. Lint prima segnalava ref-taint oggetto, separata identita; primo gruppo102con1errore callbacktoken rimasto dopo fix, corretto e finale102verde senza cambiare assert/timeout. Test solo trasporto sintetico, nessuna scrittura reale. Backend invariato e non ritestato; browser montato/DBreali ancora da provare su nuovo trial. Report agency-review-mount-v1.md. Contesto unita/prove iniziale, sincronizzazione manuale; nessuna UIcreazioneunita/fattidichiarati/confronti o selettoreprovecompleto, stageattinonattivo. Modello incarico assente. Nessuna AI/spesa/filepersonale/demoAlessio/servizioesistente/merge/deploy.
