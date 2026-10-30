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
