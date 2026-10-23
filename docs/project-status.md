## Fase 0 — piano autonomo attuato e verificato offline, 23 ottobre 2026 (Codex)

**Implementato offline**: UI Q48 con pagine coperte/pendenti, pagina di ogni fattura e importi separati; conferma parziale resta aperta, solo-documento non chiude il pendente. Regressioni Q20/Q29/Q30 e prompt **document-understanding-v27-literal-headings**, senza allentare validatori/gold. Vocabolario locale di **91 apparati / 9 categorie**: tipo e ambiente suggeriti, scelta esplicita; nessuna collocazione automatica o modifica di posizioni confermate. [Report, comandi e limiti](v5/fase0-night-plan-offline-20261023.md).

**Verifiche**: backend build/lint, onboarding **200/200**, qualità **24/24**, guard **11/11**, ordinari **213/213**, matrice **1/1**. Frontend typecheck/lint/build e mock completo **834/834 (102 file)**. HTTP/DB **98/98**, regressioni Q15/Q22/Q48 **38/38**, su API/DB/storage temporanei separati, poi fermati. Fixture automatico aggiornate al validatore corrente; aggiunto il rifiuto delle vecchie bozze senza controllo pagamento/tipo. Browser dei componenti solo sintetico desktop/mobile, senza account o telefono reale.

**Preparato per revisione / non misurato**: [matrice delle 147 voci documentali](v5/fase0-document-family-matrix-v4-20261023.json), con ambiguità e nove voci Diario; nessuna nuova famiglia/backfill o regola normativa. [Prossima misura](v5/fase0-next-measure-proposal-20261023.md) preparata, non autorizzata né eseguita. Nessuna nuova accuratezza AI dichiarata; gate storico **NON SUPERATO**, vecchi risultati/ledger e 52 gold preservati. Continuazioni/non fatture rimangono pendenti; matrice da rivedere prima di regole automatiche. HEIC, prova telefono, eliminazione dati e DB di test permanente restano fuori scope.

**Vincoli**: zero chiamate AI/email, nessun reale, `.env`, migrazione, intervento su API/DB/storage dell’app o `main`. I 104 StoredFile orfani e le case esistenti non sono stati toccati. File estranei preesistenti conservati ed esclusi dal commit. [Piano e attuazione](v5/fase0-next-hours-plan-20261023.md).

## Checkpoint precedente — Q48, copertura delle due fatture verificata offline, 23 ottobre 2026 (Codex)

**Implementato e verificato offline**: schema `invoicePages` con uno slot per pagina fisica inviata e una fattura completa per slot. Q48 mantiene **122 EUR / Idroquarzo / 18 settembre** e **244 EUR / Termonimbo / 19 settembre**, senza totale aggregato, costi o contatti impliciti. Copertura server `invoice-coverage-v1`: pagine inviate/coperte/pendenti; prima proposta isolata non copre pagina 2, conferma parziale resta open e documentOnly non nasconde il pendente. Segmenti, fonti e deduplica preservati. Prompt **document-understanding-v26-invoice-coverage**, nessuna nuova chiamata per pagina. [Report e limiti](v5/fase0-q48-coverage-offline-20261023.md).

**Verifiche**: build/lint backend V5, onboarding **195/195**, qualità **24/24**, guard **11/11**, backend **213/213**. DB sintetico nuovo **55433: 38/38**, inclusa copertura Q48 su ledger durevole e regressioni Q15/Q22/Q48: due prefissi persistiti, replay da altro client senza nuove richieste simulate, prima fattura collegata e sola seconda creata, concorrenza/rollback, privacy, revoche, SHA/versione e ruoli. Slot completi su Q48: 2/2 importi, date e fornitori nella risposta costruita offline; revisione visiva sempre obbligatoria. Cluster conservato e spento.

**Seguito**: il piano è stato successivamente attuato con autorizzazione autonoma offline; vedere il checkpoint corrente e il [report](v5/fase0-night-plan-offline-20261023.md).

**Non verificato / residuo**: nessuna nuova risposta AI, originale reale, modifica `.env`, accesso DB/API app o riavvio API. Gold/corpus/scorer/soglie e artefatti/ledger delle campagne v22/v24 invariati; gate storico ancora **NON SUPERATO**, senza ricalcolo del vecchio Q48 1/2. Lo schema non recupera una fattura illeggibile né certifica osservazioni visive. UI/browser e HTTP non ripetuti; indicazione esplicita del pendente nella UI e pagine di continuazione/non fattura da affrontare prima dell’attivazione. Vecchie bozze non retrocompilate; file estranei preservati.

## Checkpoint precedente — Q22, due prezzi e date verificati offline, 23 ottobre 2026 (Codex)

**Implementato e verificato offline**: lettura locale della tabella esplicita Importo di Q22: forno **300,00 EUR**, frigorifero **500,00 EUR**, entrambi **18/09/2026** dalla Data acquisto stampata. Nessuna ripartizione degli 800 EUR, somma o moltiplicazione. Soggetti già citati, riga univoca sulla stessa pagina autorizzata, citazioni contigue e validazioni preservate; proposte errate restano segnalate. Identità server per riga, costi/fonti separati, deduplica tra copie/abbreviazioni e controllo prezzo/data nella conferma automatica transazionale. Prompt `document-understanding-v25-invoice-lines`; nessuna migrazione. [Diagnosi, correzione e limiti](v5/fase0-q22-lines-offline-20261023.md).

**Verifiche**: build/lint backend V5, onboarding **188/188**, qualità **24/24**, guard **11/11**, backend **213/213**. DB sintetico nuovo **55433: 30/30**: Q22 10, Q15 9, Q48 11 inclusi contenitori. Concorrenza, rollback sulla seconda riga, replay da altro client, copie SHA ancora sotto il limite totale, collegamenti incrociati, privacy, revoche, SHA/versione, viewer e membership verificati. Parser/scorer sul Q22 congelato: 2/2 importi e 2/2 date nella risposta costruita offline; adattatore completo/locale/progressivo solo in memoria. Cluster conservato e spento.

**Non verificato / residuo**: nessuna nuova chiamata AI o accesso a originali reali, DB/API app, `.env` o riavvio API. Gold/corpus, scorer/soglie e artefatti/ledger v22/v24 invariati; nessun ricalcolo storico, gate AI ancora **NON SUPERATO**. Le risposte live grezze non erano conservate: correzione verificata del formato sorgente e delle omissioni, non ricostruzione certa dei payload né misura AI v25. Restano Q48 live, Q20/date, titoli Q29/Q30, stabilità/modalità di lettura e autorizzazione distinta per nuove misure. Frontend/browser e HTTP non ripetuti. File estranei preservati.

## Checkpoint precedente — Q15 split payment corretto offline, 23 ottobre 2026 (Codex)

**Implementato e verificato offline**: policy server `payment-review-v1` sul testo completo verificato dell’originale, indipendente da importi omessi e flag del modello. Q15 conserva il totale **244,00 EUR** e richiede revisione; niente automatico di spese/oggetti/contatti. Controllo ripetuto nella transazione di conferma con binding documento/versione/SHA. Vecchie bozze finanziarie prive del controllo o con policy/snapshot errati richiedono conferma esplicita. Conferma manuale e opt-in contatti preservati; nessuna migrazione. [Correzione, test e limiti](v5/fase0-q15-payment-offline-20261023.md).

**Verifiche**: build/lint backend V5, onboarding **181/181**, qualità **24/24**, guard **11/11**, backend **213/213**. DB sintetico nuovo **55433: 20/20**, Q15 9 e regressioni Q48 11 inclusi contenitori: privacy, revoca fonte, SHA/versione, ruoli, rollback, concorrenza e replay da altro client. Una sola spesa da 244 EUR e un solo contatto dopo conferma manuale concorrente, zero risorse dopo tentativi automatici. Cluster conservato e spento. Vecchio test sulle chiavi aggiornato al metadato interno, nessuna asserzione privacy/idempotenza indebolita.

**Non verificato / residuo**: nessun nuovo invio AI, originale reale, accesso DB/API app, modifica `.env` o riavvio API; frontend/browser e HTTP non ripetuti. Gold/corpus e artefatti/ledger delle campagne invariati; la ricevuta v24 è rifiutata dal codice modificato. Gate AI ancora **NON SUPERATO**, nessun ricalcolo retroattivo dei due critici Q15. Restano Q22, copertura live Q48, date/titoli/stabilità e consenso distinto per future misure. File estranei preservati.

## Campagna precedente v24 — fotografia congelata, 23 ottobre 2026

**Eseguita e verificata** `fase0-quality-v3-v24-20261023-synthetic-02`: **52 sintetici, 120/120 attività, 148/150 Messages**, tutti liquidati, **3,562652/12 USD**, **0 esiti incerti e nessun retry**. Ricevuta/piano/codice/gold congelati prima dell’invio, prompt `document-understanding-v24-invoice-pages`. Cluster/ledger nuovi sulla 55433, directory `quality-v24-live-20261023`, conservati e spenti, separati da campagna v22 e app. [Report e confronto](v5/fase0-quality-v24-campaign-20261023.md), [ricevuta](v5/fase0-quality-v24-authorization-20261023.json), [verifica](v5/fase0-quality-v24-verification-20261023.json).

**Gate NON SUPERATO**. Baseline: **101/104 output validi** (v22: 81), classificazione **99/104**, tipologia **38/40**, etichette **16/16** (v22: 0), importi **64/70** (v22: 13), date **63/70**, stabilità **45/52**. **Due critici automatici su Q15 split payment**, in entrambi i run: campi misurati corretti, decisione `complete` contraria al gold `review`. Correttezza automatica **20/22**, nessuna conferma canonica eseguita. Q22 non soddisfa i due costi di riga in entrambi i run; Q48 è valido/in revisione ma resta **1/2 per importo/data/fornitore** anche con tutte le pagine e nel progressivo finale. Tre rifiuti del titolo: Q29/run 1 e Q30/entrambi. Non ricostruire risposte assenti dai soli score, non allentare gold o validazioni.

**Verifiche**: prima degli invii build/lint, qualità **24/24**, guard+regressioni **29/29** (11 + 18). Dopo riavvio del solo cluster v24: 52 SHA/consensi sintetici, costi e 148 liquidazioni coerenti, zero oggetti/spese/contatti; replay a rete disabilitata **0 richieste e 0 tentativi nuovi**. Codice/gold/piano congelati invariati; nessun accesso a dati reali, DB/API app o campagna precedente, nessuna modifica `.env`. Suite generali/frontend non ripetute in questo incarico; risultati precedenti storici. File estranei preservati.

**Residuo**: bloccare offline l’automatico dei casi split payment, riprodurre i prezzi di riga Q22, la copertura di entrambe le fatture Q48 e i rifiuti del titolo; niente modifiche retroattive o nuovi invii. Progressivo Q43/Q44 esaurisce tutti i prefissi, costa circa 5,60×/6,93× la completa: nessuna modalità promossa. Pilota bloccato; nuove campagne o reali richiedono autorizzazione distinta.

## Checkpoint precedente — Q48 con due fatture separate, 22 ottobre 2026 (Codex)

**Implementato**: Q48 ora produce due spese distinte con fonti sulla rispettiva pagina: **122,00 EUR / Idroquarzo / 18 settembre** e **244,00 EUR / Termonimbo / 19 settembre**, nessun totale globale. Segmento server derivato da SHA/pagina, ancoraggi espliciti fornitore/numero/data, scelte e provenienza separate. Conferma manuale obbligatoria; somme manuali, valori incrociati e riuso della spesa dell’altra fattura bloccati. Copie/rianalisi della stessa pagina non duplicano la spesa, anche abbreviando gli identificativi. Prompt **`document-understanding-v24-invoice-pages`**. Nessuna migrazione o duplicazione degli originali. [Contratto, prove e limiti](v5/fase0-q48-invoices-offline-20261022.md).

**Verificato offline**: build/lint, onboarding **174/174** (8 nuovi casi Q48), qualità **24/24**, guard **11/11** (incluso congelamento del nuovo percorso di validazione), backend **213/213**. DB isolato sulla **55433: 11/11** (contenitore più 10 scenari), inclusi concorrenza, rollback della seconda fattura, replay da altro client, copie SHA, collegamenti e rinvio separati, owner diverso, revoca fonte, SHA e viewer. Cluster sintetico nuovo poi spento, file conservati; nessun accesso al DB/API dell’app o al ledger AI. Preparazione/decoder/scorer su Q48 sintetico con trasporto interamente in memoria: due importi/date/fornitori corrispondono al gold invariato; non è una nuova misura del modello.

**Non verificato / limiti**: UI/browser e nuove risposte AI; frontend e suite HTTP non ripetuti. Supporto limitato a fatture complete su singole pagine distinte, senza soggetti, contatti o totali globali: multipagina o ancoraggi mancanti restano rifiutati. Gate AI ancora **non superato**; gold, corpus e risultati della campagna congelati. Nessuna chiamata AI, modifica `.env`, restart API o dato personale; lavoro estraneo preservato. Il precedente blocco Q48 sotto riportato è superato soltanto per questo contratto verificato offline.

## Checkpoint precedente — correzioni evidenze e importi, 22 ottobre 2026 (Codex)

**Implementato e verificato offline**: corretti due falsi rifiuti riproducibili, titoli stampati `Targhetta`/`Etichetta energetica` e totale con dicitura `documento corrente`. Titolo e importo restano legati alla propria citazione letterale, con pagina/regioni/valuta/ruolo obbligatori; evidenze visive sempre da revisionare, IVA/arretrati/importi concorrenti mai promossi automaticamente. Prompt versionato **`document-understanding-v23-evidence`**, diagnostica `document_title` senza contenuti. Gold, corpus, soglie, ricevuta e score della campagna precedente invariati. [Diagnosi, correzioni e limiti](v5/fase0-evidence-amounts-offline-20261022.md).

**Verificato**: build/lint, onboarding **166/166** (18 nuove regressioni), qualità **24/24**, guard **10/10**, backend `npm test` **213/213**. Risposte costruite localmente e parser sul PDF sintetico Q01: prove del decoder, non nuova accuratezza AI. Nessuna chiamata AI, DB, originale reale, modifica `.env` o riavvio API. Frontend/HTTP/DB non ripetuti; modifiche estranee preservate.

**Non verificato / residuo**: miglioramento effettivo del modello e gate AI, che resta **non superato**. Q48 con due fatture resta rifiutato dal contratto attuale, senza fusione o modifica del gold; serve progettare segmentazione/conferma/idempotenza per originali distinti. Altri rifiuti/assenze non sono ricostruibili esattamente senza risposte grezze; non attribuirli tutti ai due difetti isolati. Nuova campagna e reali richiedono autorizzazioni distinte. Il nuovo codice rifiuta la ricevuta congelata della campagna precedente, senza reset o ricalcolo del ledger.

## Campagna sintetica precedente — esito congelato, 22 ottobre 2026 (Codex)

**Eseguita e verificata** `fase0-quality-v3-20261022-synthetic-01`: soli **52 sintetici**, **120/120 attività**, **146 Messages/150**, tutte liquidate, **3,545746/12 USD**, **0 esiti incerti e nessun retry**. Ricevuta, hash dei file/gold/codice e piano congelati prima dell’invio (massimo pianificato 148 Messages). Ledger persistente separato sulla porta 55433, conservato e spento; nessuna modifica al DB o alle quote dell’app. [Protocollo e risultati](v5/fase0-quality-v3-campaign-20261022.md), [ricevuta](v5/fase0-quality-v3-authorization-20261022.json), [verifica finale](v5/fase0-quality-v3-verification-20261022.json).

**Gate qualità NON SUPERATO**: baseline completa 81/104 output validi; tipo documento 79/104, tipologia oggetto 21/40, marca/modello etichette 0/16, importo univoco 13/70, stabilità decisione 39/52. Zero errori critici automatici, ma soltanto 7/104 esiti `complete`, tutti documentali: non certificano creazioni automatiche di oggetti/spese. Gli invalidi rimangono nel denominatore; i rifiuti delle evidenze visive non dimostrano da soli incapacità di lettura del modello. Report con misure per campo, limiti del gold auditato dall’agente e confronti costi. Nessuna modalità promossa; lettura completa ancora predefinita. Correzioni e diagnostica successive offline, nuova campagna versionata soltanto con nuova autorizzazione. Tappa sui reali esclusa.

**Verifiche di questo passaggio**: build, lint, `test:quality-v3` **24/24**, `test:quality-v3-live-guards` **10/10**, prima degli invii. Verifica finale in sola lettura dopo riavvio del solo cluster sintetico: 52 SHA autorizzati, 146 liquidazioni, costi coerenti, zero oggetti/spese/contatti creati; replay con rete disabilitata **0 nuove richieste HTTP e 0 nuovi tentativi**. Corpus/gold/codice congelati invariati. Suite generali backend/frontend non ripetute: gli esiti sottostanti sono storici. `.env`, `main`, dati personali e modifiche legacy preesistenti preservati.

## Checkpoint offline precedente — adattatore e ciclo progressivo, 22 ottobre 2026

**Implementato e verificato offline**: corpus sintetico completo di 52 casi, hash/gold aggiornati e 52 audit fonte/gold; tavole visive delle 52 prime pagine e di tutte le 46 pagine dei quattro documenti lunghi esaminate. Test del parser di produzione su tutto il corpus 2/2; audit indipendente 52/52. Scorer puro per document kind, oggetti, tipologia, spese, professionisti, citazioni, decisioni automatiche, costo e stabilità (quando sono presenti due esecuzioni), con test adversarial.

Tipologia oggetto aggiunta allo schema onboarding v22 con certezza e citazione: solo corrispondenza esplicita nella fonte testuale verificata può passare al percorso automatico; immagini, incertezza e tipologia mancante richiedono conferma. Cache effimera di 5 minuti applicata solo alle istruzioni fisse; il costo include token non cache, scrittura con sovrapprezzo prudenziale e lettura cache a tariffa specifica. PDF testuali: selezione conservativa delle pagine come modalità sperimentale, con estratti fisici originali e tutte le pagine non riconosciute come boilerplate; la modalità completa resta predefinita fino a confronto AI autorizzato. Ciclo progressivo ora collegato al ledger: prefissi cumulativi 1…n, con prenotazione distinta per ciascun passaggio, arresto e ripresa basati sul risultato minimale persistito. Corretto il preparatore testuale che in modalità progressiva inviava tutte le pagine; comportamento versionato `onboarding-reading-v2`.

Taratura locale autorizzata, ripetuta dopo il corpus completo: 34 originali, 0 mancanti/illeggibili; nessun testo, percorso o identificativo registrato. Intervalli reali vs sintetici: pagine 1–20 vs 1–20 (mediana 2/2, p75 8/2); densità testuale 0–2.762 vs 0–2.254 caratteri/pagina (mediana 1.253,5/1.156; p75 2.238/2.059); cifre 0–1.678 vs 0–1.359; date 0–19 vs 0–7; presenza immagini 100% in entrambi. La prima generazione dei documenti lunghi eccedeva cifre/date per ripetizione artificiale di letture; ridotta a quattro righe rappresentative per pagina e rifatti audit/aggregati. Gli intervalli ora coincidono, ma l’aggregazione strutturale non prova equivalenza semantica.

**Implementato e verificato in questo passaggio**: adattatore `quality-v3-model-v1` con trasporto obbligatoriamente iniettato, preparazione HTTP e schema reali, decoding e citazioni del prodotto, politica `automaticPlan` e contabilità cache reali. Il runner rivalida membership/fonte prima di preparazione, conteggio, invio e dopo risposta. Il ledger conserva score, usage aggregato, pagine inviate, decisione e completezza; nessun testo originale, prompt o risposta grezza. Un output invalido ma con usage valido liquida il costo noto e arresta il ciclo; un esito incerto trattiene la riserva e blocca anche le pagine successive. Completezza dell’estrazione e permesso automatico sono distinti: un documento visivo può fermare la lettura e richiedere comunque revisione. **Verifica finale verde**: build/lint, `test:quality-v3` **24/24**, ledger+adattatore/ciclo su DB isolato **23/23**, ripresa dopo riavvio effettivo PostgreSQL **2/2**, regressioni onboarding **148/148**. **52 originali × 2 ripetizioni = 104 richieste HTTP simulate**, replay con zero richieste, anche di metadata/conteggio. Rendering scansioni, ripresa da altro processo, crash, tetti, concorrenza, revoca/annullamento prima e dopo risposta verificati. [Report adattatore/ciclo e verifiche](v5/fase0-quality-v3-model-20261022.md).

Il ledger resta quello onboarding esistente, con prenotazione standard di 0,25 USD e lock per campagna; tetti persistiti non aumentabili. Test soltanto su cluster temporaneo **55433**, DB `dimora_v5_quality_v3_test`; schema esistente, nessuna nuova migrazione. API/DB dell’app non fermati né modificati. [Checkpoint precedente del ledger](v5/fase0-quality-v3-ledger-20261022.md).

**Verifiche precedenti conservate** (`62b17c0`): backend `npm test` 213/213; frontend typecheck/lint e suite mock completa 100/100 file, 822/822 test, exit 0, 641,59 s. Non ripetute in questo passaggio. Suite onboarding ripetuta qui: **148/148**; nessuna asserzione indebolita. Unica modifica al codice prodotto: prefisso della modalità PDF progressiva; nessun cambio a prompt/schema, quote o frontend.

**Limite del checkpoint offline, ora storico**: HTTP simulato provava il percorso, non la qualità AI. Autorizzazione e campagna sintetica sono state successivamente completate nel riepilogo corrente in testa, con gate non superato. Restano separati consenso e tetto per i 10–15 reali; i 52 casi sono un cancello per il pilota, non una misura statistica generale.

Il checkpoint precedente resta nel [report prima consegna](v5/fase0-quality-v3-stage1-20261022.md); dettagli tecnici nel [report Fase 0 qualità v3](v5/fase0-quality-v3-stage2-20261022.md).

## Fase 0 qualità AI v3 - prima consegna offline — 22 ottobre 2026 (Codex)

Su `codex/fase0-ai-quality-v3` da dev aggiornata: conservati piano/prototipo nel primo commit `eee8733`, generatore realistico e primi 30 originali sintetici con gold, hash e audit. 30 controlli fonte/gold e 2 test corpus/parser verdi; tavole visive esaminate. Taratura aggregata locale autorizzata: 34 originali reali letti in sola lettura, nessun contenuto/identificativo copiato, nessuna AI. [Prima consegna, limiti e prossimi passi](v5/fase0-quality-v3-stage1-20261022.md). **Non ancora implementati** in questa consegna: tipologia certa, caching, modalità di lettura, misuratore/runner onboarding e gli ultimi 22 originali. Non è una misura della qualità AI né un'autorizzazione a spendere. Prosegue la preparazione offline; budget sintetico e invio dei reali richiedono autorizzazioni successive distinte.

## Integrazione V5 BL-01/02/03/04/10b — 22 ottobre 2026 (Codex)

**Implementato e integrato**: `claude/bl02-garanzia` unito con fast-forward da `44d9448` a `161e605` in `dev/dimora-v5-local-20261013`. Fetch effettivo prima dell'unione: confronto remoto `0 9`; primo push verificato con `git ls-remote` su `161e6055f2ce6da58c92068b0862b8cffa3637dd`. Nessuna modifica a `main`, nessun force push. I resoconti Claude sottostanti sono fotografie precedenti: questo riepilogo prevale per integrazione e verifiche.

**Verificato dopo l'unione**:

- Backend V5: build, lint e `npm test` **213/213**.
- DB reale V5: `npm run db:deploy`, **34 migrazioni, nessuna pendente**; nessuna nuova migrazione applicata.
- HTTP/DB: **100/100**, eseguiti serialmente: `contacts.http`, `object-onboarding.integration`, `object-onboarding.http`, `automatic-intake.integration`, `activities.integration`, `activities.http`, `documents.integration` (file `backend-v5/test/*.test.cjs`). Cluster temporaneo vuoto con lo stesso nome/ruolo/porta richiesti dal guard, tutte le migrazioni applicate solo al cluster temporaneo; copia del backend con storage separato e provider finti. API/DB reali fermati durante le prove e poi ripristinati; conteggi di **tutte** le tabelle del DB reale identici prima/dopo. Primo tentativo invalidato dal worker PDF sorgente mancante nella copia di collaudo; copia completata e tutte le suite ripetute verdi, nessuna asserzione modificata.
- Frontend V5: **verifica completa chiusa il 22 ottobre 2026 dopo i fix di `0445c17`**. `node node_modules/vitest/vitest.mjs run --project mock --maxWorkers=2`, da `frontend-v5`: **100/100 file e 822/822 test passati**, exit code **0**, durata **585,88 s**. Questa esecuzione unica completa supera il precedente esito 819/822 e le successive sole ripetizioni mirate. Typecheck e lint restano quelli verdi della verifica precedente; non ripetuti in questo passaggio, che non modifica codice o test. I fix precaricano i moduli lazy nei test ricevuta/spese e attendono il ritorno React con tutte le 24 righe prima del focus nella ricerca; nessuna asserzione di privacy/idempotenza indebolita e nessun codice prodotto cambiato. Suite eseguita fuori sandbox per evitare il precedente EPERM sulla cache; soli mock, nessuna chiamata AI/email a pagamento e nessun accesso al DB reale. Gli avvisi jsdom su `scrollTo` non hanno prodotto fallimenti.
- API V5 riavviata dal checkout di integrazione con il `dist` ricostruito, PID registrato aggiornato, `GET /api/v5/session` **HTTP 200**.

**Preservato**: modifiche legacy locali in `backend/src/main.ts`, `frontend/package.json`, `frontend/public/dimora-v5-design.html`; directory `node_modules/` non tracciata. Durante il lavoro è comparso anche `docs/v5/fase0-ai-quality-plan-20261022.md` non tracciato: lasciato al suo autore, escluso dal commit. Nessuna modifica a `.env`, nessun reset/clean, nessuna rimozione di worktree, nessuna chiamata AI/email a pagamento, nessuna cancellazione dei 104 StoredFile senza file. Nessuna suite eseguita sui dati personali.

**Non verificato / rimandato**: foto BL-04 da telefono vero, HEIC, gate Fase 0 qualità AI/eliminazione dati e DB di test dedicato permanente restano fuori incarico. Restano validi i limiti browser specifici dei report BL. Prossimo passo: prova telefono con accesso concordato e decisioni sui gate aperti, senza assimilare i test sintetici a una verifica del pilota reale.

## Stabilizzazione: test allineati — 22 ottobre 2026

Test rimasti indietro aggiornati al comportamento attuale, nessun codice di prodotto modificato (Claude, branch `claude/bl02-garanzia`): backend `documents.test.cjs` (mock con transazione e organizzazione), fixture bolletta di `automatic-intake.integration` (periodo di competenza, bb5b83d); frontend `collectionFilters` (dialogo Filtri dopo 74efc05), `casaTasks` («Controlla i dati»), `routing` (Agenzie/Amministratori senza link né rotte dopo f7e7b94), `PendingUploads` (etichette attuali della pagina Documenti), `ManualBillFlow` (mock dell'endpoint object-suggestions). Esiti: backend `npm test` tutto verde; integrazione onboarding + automatic-intake 57/57 su DB temporaneo vuoto (DB vero fermo, poi riavviato con conteggi identici); frontend 822/822, typecheck e lint verdi (`documentSearch`/`objects` possono fallire per tempi solo in parallelo; da soli verdi). Integrazione nel branch `dev/dimora-v5-local-20261013` affidata a Codex (prompt nella chat del committente; `main` non modificato).

## Documenti: BL-10b completato — 22 ottobre 2026

Analisi: quasi tutto BL-10b era già implementato (18/10). Aggiunto il collegamento automatico del professionista a spesa e oggetti della stessa conferma (`linkConfirmedContacts`), senza migrazioni. [Report](v5/bl10b-document-professional-object-20261022.md). Verificato: test offline, integrazione su DB temporaneo vuoto (54/57, 3 preesistenti bollette), frontend mirato. **Non verificato**: browser con bozza reale (servirebbe una nuova analisi a pagamento). Con BL-01/02/03/04/10/10b le funzioni della release Home sono implementate; restano prova telefono BL-04, qualità AI e cancellazione (Fase 0), stabilizzazione e pilota.

## Documenti: scatta una foto (BL-04) — 22 ottobre 2026

Implementato su branch `claude/bl02-garanzia` (Claude), solo frontend, nessuna migrazione. [Report](v5/photo-capture-bl04-20261022.md). Verificato: typecheck/lint, 4 test nuovi, suite invariata (14 preesistenti), caricamento reale sul computer nella casa «COLLAUDO V2» (privato, nessuna analisi), 390 px. **Non verificato**: scatto da telefono reale (gate del piano aperto). Con BL-01/02/03/04 i blocchi pre-rubrica sono implementati; prossimo: prova su telefono, BL-10b, gate Fase 0 (recupero account).

## Attività: prossimo promemoria (BL-01) — 22 ottobre 2026

Implementato su branch `claude/bl02-garanzia` (Claude). Dopo il completamento: proposta 6/12/24 mesi dal giorno di completamento o data libera, conferma esplicita, collegamenti leggibili copiati, un solo successivo per attività. Migrazione additiva `20261022180000_activity_follow_up` applicata dopo backup verificato `backups/dimora-v5-20261022T154341Z`. [Report](v5/activity-follow-up-bl01-20261022.md).

Verificato: typecheck/lint FE e BE; test offline (BE 3 nuovi, FE 4 nuovi, `activities.test.tsx` verde); browser su «COLLAUDO V2» con doppio clic senza duplicati e 390 px. **Non verificato**: suite HTTP/DB. Prossimo passo: BL-04 Foto (serve accordo su come provare da telefono reale), poi BL-10b; in parallelo decisione sul recupero account (Fase 0).

## Casa: storia essenziale (BL-03) — 22 ottobre 2026

Implementato su branch `claude/bl02-garanzia` (Claude). Pagina «Storia della casa» (Casa → Esplora la casa), eventi a mano con precisione anno/mese/giorno e documenti, lavori/promemoria completati/oggetti aggiunti a Dimora, filtro anno, «Aggiungi alla storia» dal documento. Migrazione additiva `20261022150000_home_history` applicata al DB V5 dopo backup verificato `backups/dimora-v5-20261022T133036Z`. [Report](v5/home-history-bl03-20261022.md), [contratto](v5/home-history-api-contract.md).

Verificato: typecheck/lint FE e BE; test offline storia (BE 3, FE 8); browser su «COLLAUDO V2» desktop e 390 px (evento di prova creato e rimosso). **Non verificato**: suite HTTP/DB. **Problemi aperti**: 104 `StoredFile` senza file sul disco nel DB V5 (account sintetici dei test di integrazione e orfani, nessuno del committente); 3 test backend (`documents.test.cjs`) e 18 test frontend preesistenti falliscono. **Push**: branch pubblicato su `origin/claude/bl02-garanzia` (non ancora unito a main). Prossimo passo: BL-04 Foto e BL-01 Prossimo promemoria, poi BL-10b.

## Oggetti: garanzia manuale (BL-02) — 22 ottobre 2026

Implementato su branch `claude/bl02-garanzia` (Claude). Scheda: garanzia «fino al/scaduta il», provenienza e documento di supporto; modifica per data o mesi con scorciatoia esplicita 24 mesi; «Crea promemoria» precompilato e confermato dall'utente; onboarding senza scadenza presunta. Contratto profilo esteso con `warrantyDocument`, nessuna migrazione. [Report](v5/warranty-bl02-20261022.md).

Verificato: typecheck/lint FE e BE, test offline backend (35) e frontend mirati (28), browser su casa «COLLAUDO V2» (una scrittura sintetica). **Non verificato**: suite HTTP/DB, onboarding nel browser. Prossimo passo concordato: BL-03 Storia essenziale della casa; BL-04 e BL-01 restano da fare.

## Passaggio di consegne multi-agente e autorizzazioni — 22 ottobre 2026

Aggiornati [AGENTS.md](../AGENTS.md) e [frontend-v5/AGENTS.md](../frontend-v5/AGENTS.md): formalizzata l'alternanza operativa tra Antigravity, Claude e Codex, con continuità demandata esclusivamente a repository e documentazione condivisa (nessuna presunzione di memoria delle sessioni/chat altrui). Autorizzato Antigravity a intervenire su frontend-v5, backend-v5 e documenti condivisi. Fissate a livello di root le regole di passaggio di consegne per ogni sessione (nessuna informazione indispensabile lasciata solo nella chat o nell'IDE, aggiornamento documentazione condivisa, verifiche dichiarate con precisione, preservazione modifiche preesistenti, commit del proprio lavoro e push verificato).

Verificato: diff e link documentali, controllo assenza credenziali/segreti; modifiche legacy locali preesistenti preservate senza inclusione nello staging.

## Documenti: azioni su una riga e dettagli file compatti — 22 ottobre 2026

Solo CSS in frontend-v5 ([documents.module.css](../frontend-v5/src/routes/documents.module.css)). Su mobile (≤600 px) «Vedi dettagli», «Vedi originale» e «Altre azioni» stanno su una riga (vanno a capo solo se le etichette sono più lunghe); link secondari della riga e «Dettagli del file» con altezza minima ridotta (32/36 px invece di 44; resta sopra il minimo WCAG 2.2 di 24 px). Altezza righe nella casa sintetica «COLLAUDO V2»: mobile 252–308 px (prima 344–412), desktop ~254 px (prima ~288). Nessun overflow orizzontale; menu «Altre azioni» dentro la viewport; «Dettagli del file» si apre e chiude.

Verificato: typecheck, lint, build; 101 test su documenti/ricerca/workflow/archivio passati. **Non verificato/aperto**: `documentSearch.test.tsx › restores all loaded result pages and the document focus after detail and Back` è instabile (fallisce in 3 prove su 5, anche senza queste modifiche CSS: preesistente); i 2 test di `collectionFilters.test.tsx` falliscono su HEAD (pulsanti rimossi dall'archivio unico). Non provati stati con etichette lunghe («Riprendi compilazione», «Rivedi proposta») né viewport 320 px.
Osservazione: aprendo un URL con `group=unclassified` subito dopo aver visto un altro gruppo la pagina è finita su `group=building` (una volta, in collaudo); non analizzato.

## Documenti: righe più compatte, meno ripetizioni — 22 ottobre 2026

Implementate le priorità 1–2 dell'audit del 22 ottobre (solo frontend-v5, nessun cambio API/schema/dati). «Cambia famiglia» è ora un comando testuale sulla riga del tipo (stesso nome accessibile, editor invariato e a tutta riga quando aperto); la famiglia della riga non è ripetuta dentro il gruppo che la contiene, resta nei risultati di ricerca; «Collegato a:» sta sulla stessa riga del collegamento. Altezza righe in collaudo: desktop ~288 px (prima 267–311), mobile ~344 px (prima ~311–350): **guadagno modesto**, dovuto alla rimozione di pulsante e etichetta; il grosso dell'altezza resta in stato, due pulsanti, «Altre azioni» e «Dettagli del file» (da affrontare a parte se si vuole una riga davvero compatta).

Verificato: typecheck, lint, build; 7 test mirati (archivio, famiglia, ArchiveFamilies) + 101 su documenti/ricerca/workflow passati, test pagina esteso (etichetta assente nel gruppo, presente nella ricerca). Browser su casa «COLLAUDO V2» (documenti sintetici) desktop e mobile 375 px: nessun overflow orizzontale, editor famiglia aperto e annullato senza salvare. Nessuna scrittura, nessuna AI.
**Problema preesistente**: 2 test di `src/documents/collectionFilters.test.tsx` falliscono anche su HEAD (cercano i pulsanti di raccolta rimossi dall'archivio unico del 21 ottobre): da aggiornare o eliminare.
Priorità 3–8 dell'audit restano da decidere.

## Audit UX/UI browser (sola lettura) — 22 ottobre 2026

Proposta, **nessuna modifica al codice**. Casa «Appartamento Roma» (dati reali, solo consultazione) su `127.0.0.1:5174`, desktop e mobile 375 px: Casa, Documenti (panoramica e gruppi Catasto e Da classificare), Oggetti, Ambienti, Attività, Spese, Rubrica. Nessun overflow orizzontale mobile; nessuna scrittura, caricamento o AI. **Non esaminati**: dialoghi Info, dettaglio documento/oggetto/spesa, caricamento e compilazione, altre due case, Ambienti/Rubrica come schermata (solo testo).

Priorità proposte (da approvare prima di implementare):

1. **Righe Documenti troppo alte.** Ogni riga occupa 270–350 px (mobile ~350): «Cambia famiglia» a tutta larghezza, stato, due pulsanti, «Altre azioni» e «Dettagli del file» impilati. Aprendo un gruppo il primo documento sta sotto la piega (mobile) e 6 documenti superano 2000 px. Proposta: azione famiglia nel menu secondario o come link discreto, azioni in una riga.
2. **Ridondanze nelle righe.** Nel gruppo «Da classificare» ogni riga ripete «Da classificare»; in un gruppo la famiglia è ripetuta su ogni riga. Mostrare la famiglia solo nei risultati di ricerca/Tutti.
3. **Titoli poco identificabili.** «Fattura», «Ricevuta d'acquisto», «Ordine di acquisto», «macchina caffe.pdf» senza fornitore/importo in riga quando i dati mancano; tre documenti sono indistinguibili senza aprire «Collegato a».
4. **Conteggio ambiguo con gruppo selezionato.** Dopo aver aperto un gruppo l'etichetta resta «16 documenti nell'archivio» e compare il chip filtro: non è chiaro se i 16 siano il totale o il gruppo. Il chip del gruppo e «Rimuovi filtri» duplicano il comando di chiusura del gruppo.
5. **Casa con stati vuoti rumorosi.** «Da completare: Non ci sono attività da completare» con link «Apri documenti / Controlla i dati» e «Le tue scadenze» vuota occupano due box prima delle spese. Proposta: riga unica o box nascosti se vuoti.
6. **Spese mobile.** Paragrafo esplicativo di 4 righe prima delle azioni; «Altre modalità» e «Lavori» non chiariscono cosa fanno; titoli spesa troncati nel box Casa mobile.
7. **Etichette.** «Documenti ricevuti» (barra superiore) e «Documenti» (menu) sembrano sinonimi; il pulsante Esporta ZIP accanto al titolo è solo un'icona senza testo visibile.
8. **Focus.** Aprendo un gruppo da URL il focus resta sulla pagina (già noto, vedi [report archivio](v5/document-unified-archive-20261021.md)).

Dato, non UX: la spesa «Saldo · lavori elettricidi…» contiene un refuso nel titolo salvato; non modificato.

Prossimo passo: scegliere quali priorità implementare (suggerite 1–2, poi 4–5); frontend-v5 soltanto, test mirati e browser su fixture isolate (casa «COLLAUDO V2»).

## Documenti: archivio unico con dieci famiglie — 21 ottobre 2026

Implementata l’organizzazione approvata: dieci famiglie con Info accessibile e Da classificare condizionale. Macroviste sostituite da filtro Collegamento; ricerca globale e ritorno conservati. Proiezione dai record attuali senza backfill; tipi generici non assegnati per indizi del titolo. Migrazione amplia solo il vincolo, dati reali verificati invariati. Test mirati e browser desktop/mobile con fixture isolate. [Regole e verifiche](v5/document-unified-archive-20261021.md). La famiglia acquisti è ora «Acquisti, garanzie e manuali», con Info esplicita su fatture e scontrini degli elettrodomestici; chiave e dati invariati.

## Documenti: cambia famiglia dall’elenco — 21 ottobre 2026

Menu diretto nella vista Documenti della casa, scelta manuale indipendente dal tipo e ritorno alla famiglia scelta. Conservati originali, collegamenti e spese; Automatico dal tipo rimuove la scelta manuale. Migrazione additiva, 35 test backend e 5 frontend passati, build/lint e browser desktop/mobile con fatture fittizie; dati reali verificati invariati. [Regole e verifiche](v5/document-house-family-20261021.md).

## Documenti della casa da scheda oggetto — 21 ottobre 2026

**Sposta in Documenti della casa** archivia solo la scheda scelta. Fatture condivise disponibili sia nella casa sia dagli altri oggetti: videocitofono, collegamenti e spese conservati, nessun duplicato. Appartenenza esplicita personale/versionata distinta dai riferimenti agli oggetti; migrazione additiva e viste sovrapposte. Test isolati e browser desktop/mobile; nessuno spostamento reale eseguito. [Comportamento, sicurezza e limiti](v5/house-documents-from-object-20261021.md).

## Documenti: originale e classificazioni più accessibili — 21 ottobre 2026

Originale diretto nelle righe e in testa al dettaglio, PDF con renderer locale, ritorno conservato e modifica del tipo senza duplicati. Stato Completato coerente, originale distinto dalla compilazione; Correggi tipo in Altri e PDF di esempio solo in modalità demo/test. Browser desktop/mobile, test mirati e dati reali invariati. [Regole e verifiche](v5/document-original-classification-20261021.md).

## Documenti: ricerca con ritorno e rimandi — 21 ottobre 2026

Cancellando la ricerca si ripristinano vista, gruppo, filtri e punto di lettura iniziali. Le viste vuote rimandano ai risultati server nelle altre viste mantenendo i filtri. Browser desktop/mobile in sola lettura, 41 test mirati, build/lint e dati reali invariati. [Regole, verifiche e limiti](v5/document-search-context-20261021.md).

## Documenti: oggetti collegati e fatture riconoscibili — 21 ottobre 2026

Righe con tutti i riferimenti personali leggibili, anche derivati dalle spese; fatture con descrizione, fornitore, numero, emissione e importo già salvati. Titoli/originali invariati. Test mirati e browser desktop/mobile in sola lettura, dati reali verificati invariati. [Regole e verifiche](v5/document-row-context-20261021.md).

## Documenti: ingresso e filtri semplificati — 21 ottobre 2026

Ingresso su tutti i documenti, stato nei Filtri con etichetta rimovibile e avviso dei pendenti solo quando presenti. Testata mobile compatta e ricerca raggiungibile durante lo scorrimento; testi e ritorno dal dettaglio coerenti. 72 test mirati e browser desktop/mobile in sola lettura. [Comportamento, verifiche e limiti](v5/document-archive-entry-20261021.md).

## Documenti: tre viste e gruppi per tipologia — 21 ottobre 2026

Implementate solo in Documenti le viste Tutti / Della casa / Degli oggetti, categorie della casa con conteggi globali e paginazione server. Ricerca globale e ritorni conservati. Nessuna copia o modifica dei documenti reali; altre sezioni invariate. Collaudo desktop/mobile con 33 PDF sintetici, test mirati e build/lint. [Regole, verifiche e limiti](v5/document-views-20261021.md).

## AI: stesso credito per casa reale e casa di prova — 21 ottobre 2026

Case aggiuntive dello stesso account esplicitamente autorizzabili sulla medesima campagna: credito, riserve e limite chiamate condivisi, nessun aumento o reset. Casa di prova abilitata localmente, analisi lasciate all’utente. 32 test offline, build/lint e disponibilità browser. [Configurazione e verifiche](v5/shared-ai-campaign-20261021.md).

## Documenti: collegamento diretto, titoli, categoria e coda — 21 ottobre 2026

Documenti tecnici e fallback collegabili direttamente all’impianto senza nuovo articolo; titolo iniziale più leggibile e categoria proposta soltanto da precedenti concordi dello stesso intervento. Coda dei nuovi gruppi nell’ordine di caricamento, numerata, e anteprima PDF ruotabile senza cambiare gli originali. Verificati bozza/ripresa, salvataggio e consultazione desktop/mobile con soli dati fittizi; dati reali invariati, nessuna AI live. 127 test frontend e 15 backend, build/lint. [Regole, verifiche e limiti](v5/document-flow-simplification-20261021.md).

## Fatture: modulo unico e documenti dell’intervento — 21 ottobre 2026

Implementati selettore compatto del riferimento, riepilogo unico, dati secondari ripristinabili e documenti derivati dalle spese già attribuite. Collaudo su casa inizialmente vuota con i cinque originali autorizzati: 1 impianto, 5 documenti, 2 spese distinte per 3.074,40 €. AI: 4 esiti validi e 1 fallback manuale, senza retry. App principale aggiornata e controllata in sola lettura; legacy locale preservato. [Comportamento, verifiche e frizioni residue](v5/invoice-single-flow-20261021.md).

## Fatture: stesso oggetto proposto per acconto e saldo — 21 ottobre 2026

Proposte automatiche di riferimenti esistenti, motivate da nome/identità o fornitore più descrizione della spesa già attribuita. Accettazione esplicita senza nuove schede, un solo costo e riuso delle spese già collegate. Nessuna scelta arbitraria tra più oggetti; controlli anche nella modalità automatica. [Regole, verifiche e limiti](v5/object-suggestions-20261021.md). Resta la scelta facoltativa del riferimento e importo unico/acconto/saldo nel titolo, senza modello rate o pagamento verificato. [Correzione iniziale e causa](v5/expense-installments-object-20261021.md). Caso da casa vuota verificato nel [modulo unico](v5/invoice-single-flow-20261021.md); le registrazioni personali esistenti sono conservate.

## Dettaglio Ambiente compatto — 21 ottobre 2026

Testata come Oggetti, azioni in alto, schede oggetto condivise, nota visibile e dettagli/storia compatti. Modulo, archivio/ripristino, altre collocazioni e ritorni conservati. [Comportamento e verifiche](v5/room-detail-20261021.md). 30 casi mirati, build/lint e browser desktop/mobile con dati fittizi; dati reali intatti.

## Ambienti a schede — 21 ottobre 2026

Implementata l’anteprima approvata: schede coerenti con Oggetti, ricerca e filtro unico con archivio e contenuto personale. Creazione, planimetria e dettagli conservati; ritorno con ricerca/filtri. [Comportamento, verifiche e limiti](v5/room-cards-20261021.md). 26 test mirati, build/lint e browser desktop/mobile; dati reali intatti.

## Rubrica: ricerca durante lo scorrimento — 21 ottobre 2026

Ricerca e filtro sempre raggiungibili durante lo scorrimento desktop/mobile. Solo CSS; vista e paginazione conservate. [Comportamento e verifiche](v5/contact-search-sticky-20261021.md). Collaudo con 100 contatti fittizi, 8 test mirati, build/lint; dati reali intatti. Altre proposte Rubrica rinviate per scelta dell’utente.

## Attività: ricerca e compattezza; paginazione stabile — 21 ottobre 2026

Ricerca per titolo su tutte le pagine, Mostra/Scadenza compatti e righe sintetiche. Mostra altri conserva il punto di lettura in Attività e Rubrica, con focus sul primo risultato aggiunto. [Comportamento, verifiche e limiti](v5/activities-search-pagination-20261021.md). 37 test frontend e 6 backend offline, build/lint e browser desktop/mobile con 80 attività e 100 contatti fittizi; dati reali intatti.

## Filtri stanza compatti — 21 ottobre 2026

Oggetti: selettore Stanza sempre visibile, prima le stanze con oggetti, conteggi server e accesso a tutte le altre. Ambienti: elenco compatto con lo stesso ordine e conteggi personali. Ricerca e ritorno conservati. [Comportamento, verifiche e limiti](v5/room-filters-compact-20261021.md). 24 test mirati, build/lint e browser desktop/mobile; dati reali intatti.

## Elenco Documenti compatto — 21 ottobre 2026

Titolo/tipo/visibilità, stato e azione principale in evidenza; metadati nei dettagli richiudibili e originale nel menu secondario. Ricerca, filtri, selezioni e ritorno conservati, inclusi i dettagli già aperti. [Comportamento, verifiche e attività residue](v5/document-list-compact-20261021.md). 72 test mirati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Documento–spesa: ritorno e azioni esplicite — 21 ottobre 2026

Ritorno al documento di provenienza, “Registra un’altra spesa” distinto dalla consultazione e data della proposta etichettata Emissione. Annullamento della spesa aggiuntiva torna al documento; provenienza preservata anche dopo il salvataggio esplicito. [Comportamento, verifiche e attività residue](v5/document-expense-navigation-20261021.md). 86 test simulati, build/lint e browser desktop/mobile; dati reali intatti.

## Dettagli spese e bollette: riepilogo iniziale — 21 ottobre 2026

Completata la priorità concordata: importo, fornitore e periodo insieme in testa alla spesa; emissione e scadenza distinte. Stesso riepilogo nei documenti collegati, con dati mancanti espliciti e nessuna duplicazione dei record. [Comportamento e verifiche](v5/expense-detail-overview-20261021.md). 75 test simulati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Riepilogo, filtri Spese e dettaglio oggetto — 21 ottobre 2026

Riepilogo dei valori da salvare con periodo/emissione/scadenza distinti; filtri Spese unificati e richiudibili con indicatori rimovibili; collocazione oggetto evidente e dati secondari richiudibili. Campi della spesa conservati al cambio solo-documento. [Comportamento, verifiche e limiti](v5/ux-summary-filters-object-20261021.md). 131 test simulati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Recupero bozze e collegamento Ambienti — 21 ottobre 2026

Avviso e Riprova salvataggio nella barra sempre visibile, focus sull’errore e recupero idempotente preservato. Gestisci ambienti non si sposta al focus e apre al primo clic. [Comportamento e verifiche](v5/ux-recovery-fixes-20261021.md). Frontend soltanto; dati reali intatti.

## Documenti: Salva bozza ed esci — 21 ottobre 2026

Bozza esplicita anche incompleta, ripresa dalla stessa scheda, nessuna spesa/oggetto/contatto creato e nessun invio AI. Errori e risposte perse conservano il modulo; altre uscite mantengono l’avviso. [Comportamento, verifiche e limiti](v5/compilation-draft-20261021.md). Sostituisce il rinvio delle bozze nei resoconti precedenti; nessun autosalvataggio.

## Rubrica: archiviazione e collegamenti distinti — 21 ottobre 2026

Nel dettaglio, spiegazioni separate per Archivia contatto e Rimuovi collegamento, con indicazione dei dati conservati e messaggio dopo l’esito riuscito. Azioni dirette, elenco e ritorno invariati. [Comportamento e verifiche](v5/contact-actions-20261021.md). Collaudo su contatti fittizi; dati reali intatti. Bozze rimandate.

## Testi tecnici più semplici — 21 ottobre 2026

Documenti ricevuti sostituisce Consegne ricevute; dimensioni in KB/MB con conversione decimale e limiti approssimati leggibili, controlli esatti in byte invariati. [Comportamento e verifiche](v5/plain-language-20261021.md). Nessuna modifica ai dati reali; bozze rimandate.

## Ricerca Documenti unificata — 21 ottobre 2026

Ricerca automatica nell’intero archivio della casa, stato unico Tutti/Da fare/Completati, filtri in pannello desktop/mobile e indicatori rimovibili. Nuova ricerca senza restrizioni nascoste; testo, filtri, pagine, focus e posizione conservati dal dettaglio. [Comportamento, verifiche e limiti](v5/document-search-unified-20261021.md). Dati reali intatti; bozze rinviate.

## Rubrica compatta e ritorno all’elenco — 21 ottobre 2026

Elenco desktop/mobile approvato, ricerca durante la digitazione, azioni Chiama/Email e pagine aggiunte. Ricerca, filtro, pagine, focus e posizione preservati dal dettaglio e con Indietro. [Comportamento, verifiche e limiti](v5/contacts-catalog-20261021.md). Dati reali intatti; bozze rinviate.

## Analisi AI riuscite: nessuna rianalisi — 21 ottobre 2026

Risultati estratti riutilizzati anche prima della conferma; esclusione dalla selezione multipla e blocco server dei nuovi invii sullo stesso snapshot. Correzione manuale e recupero idempotente preservati. [Regola e verifiche](v5/ai-success-reuse-20261021.md). Nessuna modifica ai dati reali; bozze rinviate.

## Accesso diretto a Oggetti e Ambienti — 21 ottobre 2026

Menu laterale desktop con sette sezioni; Menu mobile completo con barra inferiore a cinque voci preservata. Sezione attiva precisa, focus e chiusura gestiti, ritorno Rubrica mantenuto. [Comportamento e verifiche](v5/section-navigation-20261021.md). Nessuna modifica dei dati reali.

## Casa e Documenti: testi chiari e primo utilizzo — 20 ottobre 2026

Documenti da controllare e Dati da confermare distinguono le due code; casa senza documenti con invito iniziale, casa completata con messaggio distinto. Versioni e impronta nei dettagli tecnici richiudibili. [Comportamento e verifiche](v5/casa-document-copy-20261020.md). Bozze escluse dall’intervento.

## Compila diretto e uscita esplicita — 20 ottobre 2026

Compila apre direttamente il modulo, recupera la bozza esistente e non avvia AI; Precompila con AI resta nel modulo con consenso separato. Riprendi più tardi sostituito da Esci senza salvare con spiegazione di ciò che resta disponibile. [Comportamento e verifica](v5/direct-compilation-20261020.md).

## Bollette: modulo e linguaggio semplificati — 20 ottobre 2026

Scelta esclusiva Un mese/Un intervallo con bozze locali conservate al cambio; emissione e scadenza separate. Precompila con AI, Registra spesa e Salva documento espliciti; riepilogo confermato descritto come già salvato. API e dati reali invariati. [Comportamento e verifiche](v5/bill-form-language-20261020.md).

## Compilazione: avviso coerente sulle modifiche non salvate — 20 ottobre 2026

Menu e cronologia Indietro protetti come cambio documento e ritorno; Annulla conserva i campi, salvataggio riuscito prosegue senza doppio avviso. Verifica su dati simulati, dati reali intatti. [Comportamento e limiti](v5/document-unsaved-guard-20261020.md).

## Selezione AI riservata ai documenti non completati — 20 ottobre 2026

Completati esclusi da caselle e selezione totale anche in Tutti e ricerca; rianalisi dal dettaglio da decidere. Dati reali preservati. [Regola e verifiche](v5/ux-audit-followup-20261020.md#selezione-ai-esclusione-dei-completati).

## Correzioni dopo audit browser — 20 ottobre 2026

Competenza nelle spese collegate, titolo leggibile dalla spesa, tipologia precisa dei documenti e contrasto dei campi migliorati. Dati reali preservati; selezione AI sui completati da decidere. [Comportamento e verifiche](v5/ux-audit-followup-20261020.md).

## Correzioni UX Documenti e Rubrica — 20 ottobre 2026

Tipologie casa leggibili su mobile, ambito di ricerca coerente con la vista e ricerca globale preservata, selezione AI esplicita e ritorno della Rubrica alla provenienza. Nessuna modifica ai dati reali. [Comportamento, verifica e limiti](v5/ux-confirmed-fixes-20261020.md).

## Dettaglio oggetto compatto — 19 ottobre 2026

Implementata anteprima desktop/mobile: sintesi, menu modifica, dati essenziali compatti, documenti/manuali raggruppati, costi e attività laterali, contatti/storia richiudibili. Funzioni e fonti preservate; nessun dato reale modificato. [Comportamento, verifica e limiti](v5/object-detail-layout-20261019.md).

## Audit UX Casa applicato — 19 ottobre 2026

Stati vuoti più discreti, Esplora mobile uniforme, Condivisioni richiudibile senza nascondere avvisi, anno vicino al totale e Storico Attività separato. Nessuna modifica ai dati reali. [Comportamento e verifica](v5/casa-layout-20261019.md#audit-ux-applicato--19-ottobre-2026).

## Casa più compatta — 19 ottobre 2026

Scadenze e Da completare con tre conteggi affiancati. Da completare dopo Esplora e Spese; rimosso il riepilogo duplicato ambienti/oggetti/tecnica, dettagli casa e ruolo più discreti. Dati e collegamenti canonici preservati. [Comportamento e verifica](v5/casa-layout-20261019.md#casa-più-compatta--19-ottobre-2026).

## Collocazione oggetto dal dettaglio — 19 ottobre 2026

Menu Stanza nel box Dettagli, salvataggio esplicito, Da collocare e Più ambienti mantenuti. Stanze disponibili reali, stato vuoto e caricamento pagine; nessuna assegnazione reale automatica. [Verifica e comportamento](v5/object-catalog-layout-20261019.md#scelta-stanza-nel-dettaglio--19-ottobre-2026).

## Oggetti e impianti — 19 ottobre 2026

Implementati schede compatte desktop/mobile, Elenco, ricerca server nome/marca/modello, chip ambiente con conteggi completi e ordinamento. Ritorno dal dettaglio con vista, filtri, pagine, focus e posizione. Dati reali e icone, nessuna foto inventata. [Comportamento, API, verifiche e limiti](v5/object-catalog-layout-20261019.md).

## Ambienti dalla planimetria — 19 ottobre 2026

Implementati punti numerati coerenti con le schede, proposte AI da rivedere, elenco modificabile, bozza persistente e conferma atomica con collegamento agli ambienti già presenti. Desktop/mobile verificati; analisi reale autorizzata con 8 proposte lasciate in bozza e nessun ambiente reale creato. [Comportamento, contratto e limiti](v5/floor-plan-rooms-20261019.md).

## Documenti della casa e Rubrica — 19 ottobre 2026

Esplora la casa con tre accessi: Oggetti e impianti, Ambienti, Documenti della casa. Rubrica sotto Spese; archivio unico con filtri Planimetrie/Pratiche/APE/Contratti/Impianti. [Dettagli](v5/house-document-navigation-20261019.md).

## Bollette per periodo di riferimento — 19 ottobre 2026

Implementati raggruppamento/filtri/totali per competenza, emissione e scadenza separate, inserimento mese/intervallo e controllo evidenze AI. SORGENIA corretta a dicembre 2025 sulla stessa spesa. [Comportamento e verifica](v5/bill-reference-period-20261019.md).

## Spese: layout desktop/mobile e distribuzione — 19 ottobre 2026

Totale e ricerca anticipati, Registrazioni/Riepilogo, grafico mantenuto anche accanto/sotto l’elenco su richiesta esplicita. Ritorno dal dettaglio con ricerca privata, filtri, pagine e posizione. [Comportamento, verifica e limiti](v5/spese-layout-20261019.md).

## Attività: layout approvato e ritorno al contesto — 19 ottobre 2026

Scadenze con filtri e conteggi server, Analisi e verifiche in vista distinta, strumenti secondari richiudibili. Desktop/mobile senza selezione multipla. Il ritorno dal dettaglio conserva filtro, pagine e posizione; supportato anche Indietro. [Comportamento, verifica e limiti](v5/activity-layout-20261019.md).

## Casa: scadenze compatte e filtri collegati — 19 ottobre 2026

Tre righe con conteggi server delle attività aperte: Scadute, Oggi e In programma (tutte le date future). Ogni riga apre il filtro corrispondente in Attività; i filtri sono conservati nell’URL. Accesso alle attività senza data mantenuto quando presenti. Verificati desktop e mobile a 390 px, senza scorrimento orizzontale. Nessun cambiamento API o dati.

## Casa: Da completare compatto con conteggi — 19 ottobre 2026

Tre righe per documenti da compilare, proposte e verifiche; conteggi completi dal servizio e gruppi cliccabili. [Contratto, verifica e limiti](v5/casa-counts-20261019.md).

## Casa: scadenze in box autonomo — 19 ottobre 2026

Le tue scadenze ora ha un box autonomo sopra Da completare, che mantiene documenti, proposte e verifiche. Separazione strutturale valida per desktop, mobile e ordine di lettura. Nessuna modifica ai dati.

## Casa: scadenze prima dei documenti — 19 ottobre 2026

Le scadenze aprono il blocco Da completare su desktop e mobile, con maggiore evidenza del titolo e sfondo leggero. Seguono documenti e verifiche. Dati e logica dei promemoria invariati.

## Casa: layout approvato e scadenze — 19 ottobre 2026

Implementati riepilogo operativo, fonti pendenti reali, scadenze personali, accessi alla casa e spese sintetiche su desktop/mobile. [Verifica e limiti](v5/casa-layout-20261019.md).

## Ricerca visibile e viste mobile Documenti — 18 ottobre 2026

Implementata la fase approvata: ricerca globale con ambito esplicito, filtri separati, alternanza Compila/Originale senza smontare i pannelli e intestazioni Fattura/Ricevuta corrette. [Comportamento, verifica e limiti](v5/document-search-mobile-20261018.md).

## Etichette della spesa da documento — 18 ottobre 2026

«Nessun oggetto» sostituito da «costo non attribuito a un oggetto», con spiegazione che gli oggetti collegati al documento non ricevono automaticamente il costo. Riepilogo ora «Data della spesa», coerente con il campo inserito. Solo testi, nessuna variazione ai collegamenti o ai dati.

## Collaudo browser Fattura/Ricevuta — 18 ottobre 2026

Verificati upload, spesa sola, nuovo oggetto facoltativo, collegamento esistente, Completati e costi unici. Corretto azzeramento dei campi spesa dopo aggiunta articolo. [Evidenze e osservazioni UX](v5/manual-purchase-flow-20261018.md#collaudo-browser-e-correzione-successiva).

## Fattura e Ricevuta: spesa diretta, oggetti facoltativi — 18 ottobre 2026

Implementato il percorso approvato: importo/data/fornitore/categoria senza oggetto obbligatorio; aggiunta o collegamento facoltativi, costo unico e solo documento conservati. [Comportamento, motivazione e verifiche](v5/manual-purchase-flow-20261018.md).

## Ultimo aggiornamento — Bolletta manuale senza oggetti

Corretta la scelta Bolletta nella scheda unica: converte la bozza manuale vuota, apre direttamente importo/data/fornitore/categoria e salva solo la spesa casa. Rimane «Conserva solo il documento». Input già salvati, decisioni e conferme pendenti sono protetti. [Verifica e limiti](v5/manual-bill-flow-20261018.md).

## Ultimo aggiornamento — Spazio di lavoro Documenti combinato

Implementata la proposta approvata: coda personale, scheda unica manuale/AI, sezioni Documento/Spese/Oggetti/Contatti e originale affiancato richiudibile con PDF locale. Il caricamento apre la prima fonte; salvataggio confermato e passaggio al documento successivo, filtri e recuperi preservati. 131 test frontend mirati, build/lint e prova browser sintetica riusciti. Nessun nuovo invio AI, API o schema. [Report e limiti](v5/document-editor-workspace-20261018.md).

## Ultimo aggiornamento — Correzioni UX Documenti 1–4

Implementati i quattro punti approvati dopo l’audit: scelta «Conserva solo il documento», chiusura della bozza dopo salvataggio metadati senza smontare la revisione, indicazioni cliccabili sui campi mancanti, ritorno ai dettagli con vista/filtri conservati. Nessuna nuova chiamata AI, migrazione o modifica legacy. Verifica e limiti: [report correzioni](v5/document-ux-fixes-20261018.md). Prossima fase: ricerca e mobile, da proporre prima di implementare.

## Ultimo aggiornamento — Documenti, proposta 3 implementata

Pagina iniziale Da fare, vista Completati e stati visibili per documento; proposta pronta distinta da dati salvati. Etichetta server workflowState account/casa/versione/SHA coerente con filtro prima del paging. Elimina sotto Altre azioni, selezione AI attivabile; recupero elaborazioni persistenti conservato anche con selezione chiusa. Nessuna nuova analisi a pagamento, schema/migrazione o modifica delle tre differenze legacy locali. Vedi docs/v5/document-workflow-20261018.md per verifica e limiti.

# Stato corrente — Dimora V5

Consolidamento 18 ottobre 2026. Baseline funzionale `4742bd4`, branch `dev/dimora-v5-local-20261013`, repository `Vincenzobrutto/Home_OS`. Chat sorgente «Configura ambiente Dimora V5», terminata. Questa consegna non cambia il software.

## Fonti e limiti

Ricostruzione dal checkout, schema/moduli, report versionati e ultimi turni disponibili della chat sorgente. Non è una rilettura integrale di ogni messaggio storico né una ricertificazione completa. Codice/test determinano l'implementazione; ADR recenti determinano le decisioni. Stati M1/M3/H3a nei vecchi handoff sono fotografie storiche. `docs/HANDOFF.md` resta per il legacy; `frontend-v5/HANDOFF.md` conserva una precedente consegna frontend.

## Implementato nel checkout

| Area | Stato ed evidenze da aprire se pertinenti |
|---|---|
| Account/casa | API reale, sessione, ruoli, permessi, CSRF e isolamento; [identity](v5/api-contract.md), moduli auth/homes |
| Originali | Upload, archivio, ricerca, anteprima, export e privacy; [contratto](v5/documents-api-contract.md) |
| Pagina Documenti | Aggiunta e revisione inline, filtri server Tutti/Da completare/Completati prima del paging, recupero upload parziali, eliminazione privata propria solo se inutilizzata; [report](v5/document-workspace-20261018.md) |
| Onboarding | Bozze manuali/AI con evidenze, conferme canoniche e protezione doppioni; [revisione unica](v5/unified-review-autonomous-final-20261018.md), `backend-v5/src/object-onboarding/` |
| Selezione AI | Fino a 20 fonti per gruppo, consenso sul gruppo esatto, coda persistente `proposalOnly`, nessuna creazione canonica alla sola analisi; [report](v5/document-classification-bulk-ai-20261018.md) |
| Ultima correzione | `4742bd4`: «Rivedi proposta» apre la bozza pronta anche dopo AI multipla. Se nessuna bozza è prodotta resta «Compila tramite AI». Chat sorgente: 17 test e prova browser riusciti, senza nuovo invio AI |
| Oggetti/ambienti/attività/spese | Moduli `home-objects`, `activities`, `expenses`; HomeObject/HomeRoom/HomeActivity/HomeExpense/EconomicWork nello schema. Non equivale a interventi tecnici estratti automaticamente |
| Rubrica | HomeContact personale account/casa, collegamenti, archivio e deduplica; [mini rubrica](v5/mini-rubrica-20261018.md), [estrazione V19](v5/contact-extraction-v19-20261018.md) |
| Automatico autorizzato | Orchestrazione persistente distinta da solo proposte; conferme via servizi canonici e opt-in separato contatti; `automatic.service.ts`, ADR del 18 ottobre |

## Parziale, aperto e problemi conosciuti

- Estrazione AI operativa ma qualità non universale: layout/quantità, ambiguità fra totali e richiamo sul corpus reale ancora da misurare. Fixture non dimostrano affidabilità generale. Vecchie bozze non arricchite retroattivamente.
- Cestino/ripristino per originali già analizzati/collegati assente: rimozione definitiva bloccata per conservare fonte e storico. Nessuna cascata economica.
- Link e ingressi precedenti ai lotti compatibili, convergenza completa sulla pagina Documenti da valutare.
- Modifiche non salvate nella revisione non hanno persistenza garantita su refresh/cambio pannello: usare «Salva e organizza» o «Decidi più avanti».
- OCR per pagina/PDF misti, fatti tecnici canonici editabili e attività/interventi da estrazione non completati dalla sola pipeline. Conformità è prima di tutto documento casa, senza obbligo di creare oggetti.
- Matching tra fonti non prova identità dell'esemplare. Costi mai divisi/sommati/attribuiti arbitrariamente.
- BL-10b e rubrica condivisa non completati; HomeContact non implica condivisione tra account/case.
- Hardening/antimalware e disponibilità pubblica non certificati dal collaudo locale. Problemi OAuth legacy non vanno attribuiti automaticamente alla V5.
- Consensi e budget nei report sono storici: leggere ledger e autorizzazione correnti prima di nuovi invii.

## Decisioni prodotto/UX

Documenti è il punto unico per aggiungere, consultare originale, compilare e rivedere: nessun secondo archivio. Classificazione non significa creazione di oggetti/spese. Dati mancanti completabili nella stessa revisione, sostituzioni esplicite. Proposta pronta riaperta senza nuova spesa AI. Conformità può completarsi come solo documento casa. Quantità multiple, fonti incomplete e conflitti richiedono revisione. Preservare collegamenti e originali consultabili.

## Ambiente e controlli mirati

- Node frontend >=22.12, lockfile autonomi. API `127.0.0.1:3001/api/v5`, frontend `127.0.0.1:5174` con proxy. DB/storage V5 separati; `.env`, DB e storage esclusi dal push.
- Avvio backend-v5: `npm run build`, poi `npm start`; frontend-v5: `npm run dev`. Prima di migrazioni verificare DB destinatario. [Modalità telefono](v5/phone-local-access-20261017.md): launcher esterno al repo; IP/PID storici.
- Frontend: `npm run typecheck`, `npm run lint`, `npm run build`; suite mirata `npx vitest run --project mock <file.test.tsx>`. `npm test` copre mock+fixtures, non prova da solo API reali.
- Backend: `npm run typecheck`, `npm run lint`, `npm run build`, offline `npm test` e `npm run test:object-onboarding`. Non tutti i nuovi test sono inclusi nello script generale: cercare in `test/` per modulo.
- Documenti: frontend `src/object-onboarding/DocumentCompilationActions.test.tsx`; DB dedicato `test/document-workspace.integration.test.cjs` e `test/automatic-intake.integration.test.cjs`, quando necessario e con provider finto. Per questa consegna niente scritture DB personale o invii live.
- Risultati storici nei report collegati; verifiche ripetute durante questa consegna nel resoconto finale.

## Git e dati esterni

Prima della consegna: HEAD `4742bd4`, 326 commit oltre origin/main e nessuno mancante rispetto a main; branch omonimo remoto assente, nessun upstream. Pubblicazione sul branch di sviluppo, senza merge su main.

Le modifiche documentali preesistenti in api/backlog/changelog/decisions/domain-model/roadmap e report fattura sono consolidate nel commit di consegna. Restano locali ed esclusi: `backend/src/main.ts` (bind HOST), `frontend/package.json` (lint su src), `frontend/public/dimora-v5-design.html` non tracciato. L'HTML è un ingresso locale al prototipo, non una nuova funzione V5.

Backup nel workspace della chat di consegna, cartella outputs: bundle Git pre-consegna verificato, patch binaria di tutte le differenze preesistenti, copia HTML. Non applicare integralmente la patch dopo il commit di consegna: contiene anche documentazione già consolidata. Il bundle include i branch/worktree committati, non le modifiche non committate degli altri worktree. DB, storage, segreti e file ignorati restano sul PC: trasferirli altrove richiede procedura separata protetta, senza versionarli.

## Verifica della consegna

Controlli ripetuti: git diff --check, link locali dei documenti di ingresso e ricerca firme di segreti sul diff documentale; nessun errore rilevato. Suite frontend DocumentCompilationActions: 10/10 test passati. Nessuna nuova build generale o prova DB/live, essendo il cambiamento esclusivamente documentale. Il riepilogo finale riporta hash e verifica effettiva del remote dopo push.
