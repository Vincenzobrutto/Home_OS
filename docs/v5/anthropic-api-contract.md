# M4 — analysis-v2 con Anthropic

13 ottobre 2026. Contratto di sviluppo, **non ancora implementato**. M3 completata in locale resta la baseline. Committente: chiave API Anthropic disponibile, **massimo 10 USD cumulativi per il collaudo M4**, nessuna ricarica o incremento implicito. Al momento della preparazione chiave assente in backend-v5/.env e nel processo; nessuna chiamata API effettuata.

## Verticale e limiti

Originali M2 già caricati → scelta esplicita provider/documenti/destinazione → analisi → proposte con citazioni verificate → conferme M3. Ancora una caldaia, marca/modello/potenza; nessun obbligo normativo o scrittura automatica di campi confermati. Nessun agente con tool, web, email, accesso a file arbitrari o upload al mount. Schede personali e controlli account/Home/fonti M3 invariati.

M4 prima versione: PDF con testo estraibile, 1–2 file; massimo 10 MiB ciascuno, 20 pagine complessive, 100.000 code point estratti complessivi e 50.000 token di input conteggiati dal provider. Originali M2 più grandi restano consultabili: non sono automaticamente analizzabili. PDF cifrati/corrotti, scansioni senza testo o pagine prive di testo → fallimento esplicito prima della chiamata a pagamento, senza analisi parziale nascosta. OCR/vision è un incremento successivo; non fingere di aver letto immagini o tabelle non estratte correttamente.

PDF con più caldaie o modelli incompatibili non deve essere fuso in una sola scheda: multi_assets_unsupported, manuale disponibile. Dati mancanti restano assenti. Nessun valore generico di ripiego.

## Provider e modello

ProviderId = 'test_fixture_v1' | 'anthropic'. Test fixture preservato per le regressioni e selezionabile come tale: non è un fallback al fallimento dell'AI. Anthropic usa Messages API nel backend, chiave solo server, nessun segreto in frontend/bundle/log/Git.

Modello iniziale server: claude-sonnet-5-5, configurabile solo dal backend. Prima del collaudo verificare disponibilità nell'account con Models API e capacità richieste; se assente, esito esplicito ai_model_unavailable, nessun cambio automatico a modello più costoso. Modello legacy claude-sonnet-5 non copiato alla cieca. Prompt/versione/schema/modello effettivo registrati per tentativo.

Documentazione ufficiale consultata: [modelli](https://platform.claude.com/docs/en/models/overview), [prezzi](https://platform.claude.com/docs/en/about-claude/pricing), [citazioni](https://platform.claude.com/docs/en/build-with-claude/citations), [PDF](https://platform.claude.com/docs/en/build-with-claude/pdf-support). Listino standard Sonnet 5.5 consultato: 2 USD/input MTok e 10 USD/output MTok. Prezzi/capacità vanno ricontrollati prima della prima chiamata. Nessun cache write, batch, fast mode, server tool o sovrapprezzo opzionale in questo collaudo.

Citazioni native e structured outputs non sono combinabili secondo Anthropic. M4 adotta **JSON strutturato e controllo locale di pagina/estratto**, senza dichiararlo una citazione nativa del provider. Il testo estratto dal PDF contiene marcatori documentIndex/page; questi sono generati dal backend, non fidati dal modello.

Ogni claim include campo, valore, documentIndex, page, excerpt e per potenza value/unit/quantityLabel. Il backend verifica indice, pagina e citazione contro il testo di QUELLA pagina di QUELL'originale/hash, normalizzando soltanto Unicode e spazi. Valore marca/modello, numero e denominazione della potenza devono essere sostenuti dall'estratto; niente conversioni o deduzioni non verificabili. quantityCode deriva da denominazioni ammesse dal server; su denominazione ambigua usare other, non dedurre una grandezza tecnica.

Unknown keys/schema invalido/risposta troncata/refusal/citazione assente o fuori pagina → fallimento analysis_invalid_output o evidence_unverified, senza pubblicare una scheda parziale. Non riparare chiamando di nuovo il modello in automatico. JSON valido senza dati sostenuti → succeeded/no_supported_data, assetId null senza target; con target conserva la scheda. Nessuna falsa conferma e nessuna nuova scheda vuota. Testo documentale trattato come dati non fidati, mai istruzioni; UI React escaped, nessun dangerouslySetInnerHTML per output/citazioni.

## Compatibilità e forme API

Gli endpoint M3 restano. analysis-v2 amplia:

- SourceRef.page: intero positivo riferito alla pagina fisica del PDF, non più literal 1; documentVersion resta 1, excerpt massimo 2.000 code point, hash dell'originale. Controllo server prima della pubblicazione.
- AnalysisJob e ProposedField: provider ProviderId, isSimulation boolean, model string|null (null per fixture); identità persistita, mai dedotta dalla configurazione corrente.
- BoilerSummary/Detail: analysisProviders: ProviderId[], isSimulation true solo se ha analisi e tutte sono fixture. Scheda solo manuale: lista vuota, nessuna etichetta AI. Per schede miste mostra provider sulle proposte e nelle fonti della storia, non un'etichetta globale «tutto reale».
- HistoryEvent.origin: test_provider | ai_provider | explicit_user. Analisi: provider/model/isSimulation coerenti; conferme sempre explicit_user. SourceRef non implica validità tecnica.
- AnalysisJob.outcome aggiunge no_supported_data. error conserva codice/messaggio. billing: null per fixture; altrimenti {currency:'USD',maxReservedUsd:string,actualUsd:string|null,state:'reserved'|'settled'|'uncertain'}.

GET analysis-capabilities conserva i campi M3 top-level provider/isSimulation/enabled/maxDocuments/formats e aggiunge apiVersion:'analysis-v2', providers:[{id,label,isSimulation,enabled,disabledReason:string|null,model:string|null}], limits:{maxFileBytes,maxTotalPages,maxExtractedCodePoints,maxInputTokens}, budget:{currency:'USD',limitUsd:'10.00',remainingUsd:string,uncertainUsd:string}. Top-level provider indica il provider iniziale configurato; frontend usa la selezione esplicita della lista, non un cambio silenzioso. Budget è quello del collaudo locale, non saldo dell'account Anthropic né prezzo commerciale Dimora. Capability aggiornata dopo esiti e a richiesta; non conservarla cinque minuti senza aggiornamento.

POST analysis-jobs aggiunge provider e consentToProviderTransfer. Client M4 invia sempre provider. Per anthropic è obbligatorio consentToProviderTransfer:true da una casella non presele­zionata con «Invia ad Anthropic il testo dei documenti selezionati per proporre i dati della caldaia». Nessun invio di dati personali in test automatici: solo PDF sintetici. Per fixture nessun trasferimento esterno e nessun costo. Assenza di provider conserva comportamento fixture M3 per i vecchi test: **non avvia mai Anthropic**.

Il body e il provider sono inclusi nel digest idempotente. POST rifiutato prima di creare il job se provider non configurato/disabilitato/budget insufficiente/consenso assente. Membership edit e fonti leggibili ancora obbligatorie. Retry preserva provider, modello previsto, fonti e destinatario; per retry Anthropic body {consentToProviderTransfer:true}; fixture mantiene {}. Il retry è un nuovo tentativo, con eventuale nuovo costo visibile, mai un cambio automatico di provider.

## Costi e tentativi persistenti

Cap del collaudo: 10.000.000 microUSD globali per campagna locale m4-20261013, non per singolo account. Ledger persistente transazionale condiviso tra job/account/restart: spent + reserved + uncertain non supera il cap. Nessun endpoint client può aumentarlo/azzerarlo. Limite iniziale per chiamata 0,25 USD, max_tokens output 4096, input <=50.000 conteggiato con gli stessi prompt/schema; validazione prezzo/cap prima dell'invio. Se la stima conservativa supera 0,25 non spedire. Un conto locale non governa consumi di altre applicazioni sulla stessa chiave né il listino del fornitore: nessuna promessa sul totale globale della Console Anthropic.

Una sola chiamata Messages per tentativo, nessun retry HTTP/SDK automatico e nessun ciclo di riparazione. Token counting/discovery gratuiti secondo documentazione da verificare; hanno timeout e numero limitato, mai polling infinito. Riserva 0,25 persistita prima della dispatch; uso effettivo e request ID salvati quando ricevuti, costi derivati da usage con listino verificato. Errore/timeout a esito ambiguo mantiene la riserva in uncertain, senza rimborso inventato. Prima di aumentare disponibilità riconciliare con prove del fornitore; non basta riavviare.

M3 può recuperare un job fixture automaticamente. M4 **non reinvia una richiesta Anthropic di cui ignora l'esito** dopo crash/lease scaduta. Tentativo unico per job, stato reserved/sending/responded/settled/uncertain e response artifact privato persistente. Su sending già presente: non ridispatch; attendere esito entro timeout o failed analysis_outcome_unknown. Se risposta completa già persistita, recupero valida e pubblica senza una seconda chiamata. Pubblicazione job/proposte/storia atomica, idempotente, protetta da lease/token. Un retry dell'utente crea un altro tentativo e un'altra riserva, dopo messaggio sull'eventuale costo precedente incerto.

HTTP timeout provider 90 s; job massimo 120 s inclusa estrazione/conteggio. Lease rinnovata durante IO esterno o attempt unico che impedisce ridispatch. Rilettura membership/fonti prima di inviare ad Anthropic e prima di pubblicare. Revoca durante chiamata: non pubblica, ma contabilizza il costo eventualmente già sostenuto. Logout non equivale a revoca e non cancella il job. Nessun costo riportato come zero se non noto.

## Errori e UI

Nuovi codici: ai_provider_unconfigured (503), ai_provider_disabled (503), ai_model_unavailable, ai_budget_exhausted (429), provider_rate_limited, provider_auth_failed, provider_unavailable, analysis_invalid_output, evidence_unverified, pdf_text_unavailable, pdf_encrypted, pdf_invalid, analysis_limits_exceeded, multi_assets_unsupported, analysis_outcome_unknown. Errori avvio possono essere HTTP; errori dopo dispatch in job failed. Mai risposta grezza del provider o contenuto/chiave nei log. Messaggi distinti e manuale sempre disponibile.

Fixture: Analisi di test — nessuna AI reale. Anthropic: Analisi AI con Anthropic; prima della scelta mostra trasferimento e limiti. Nessun punteggio di confidenza inventato. «Verificato sulla fonte» significa soltanto controllo testuale di pagina/estratto; non certificazione o conferma dell'utente. Provider guasto non deve mostrare successo o suggerimenti standard.

Restano conferme M3 puntuali, potenza separata, sostituzione esplicita e nota, inbox solo aperte, revisioni e no sovrascritture alla reanalisi. Quantità other ambigue non vengono trattate automaticamente come grandezze sicuramente diverse: richiedono interpretazione/correzione esplicita.

## Accettazione

Offline/mocked: M1/M2/M3 verdi; pagine 2/3 e citazioni sbagliate; JSON/refusal/troncamento; sparse/no dati; più caldaie; scansione/cifratura/limiti; injection; originale immutabile; diversi provider/mixed/manual-only; consenso; budget concorrente e riavvio; timeout ambiguo senza seconda chiamata; recupero risposta persistita; revoca prima invio/pubblicazione; idempotenza/retry; nessun segreto nel bundle/log.

API/DB reali con provider simulato: flussi e contabilità verificati senza consumare credito. Live Anthropic separato, flag esplicito e massimo sei chiamate Messages iniziali, riserve/costi registrati entro 10 USD; soltanto PDF sintetici A, A+B, A+C e almeno un PDF su più pagine, non riconosciuto per hash dal fixture. Nessun live test al normale npm test/build. Se risultati non sono affidabili correggere prompt/validator offline prima di nuove chiamate. Browser reale 320/390/desktop/tastiera e fonti pagina corretta. M4 si chiude solo dopo questa integrazione, non dopo mock frontend.
