# Audit e progetto incrementale del motore bollette — 25 ottobre 2026

## 1. Stato attuale: perimetro, prove e architettura effettiva

**Conclusione:** Dimora possiede una precompilazione locale prudente del riepilogo e un percorso AI con evidenze, budget e conferma. Non possiede ancora un motore normalizzato di fatture, forniture e consumi. Estendere soltanto le regex ai fornitori non soddisfa l'obiettivo. Si raccomanda di riusare la pipeline, aggiungendo prima ruoli economici e tracciabilità, poi interpretazione delle sezioni necessarie. Nessuna riscrittura o implementazione effettuata da questo audit.

Base ispezionata: consolidamento remoto `911b0fba29d56db6d4da1da54e241ab44e99af37`, dopo fetch riuscito. Lotto documentale `codex/audit-motore-bollette-20261025`, registrato con `71d44e8`. Confronto separato con PR #44, fonte prodotto `debfcc3952cd304c25f3ff96d93634d79f86d439`: non integrata e non disponibile nell'app. API del precedente rilascio a `dc58ada`, frontend a `911b0fb`: riferimenti operativi precedenti, non ricertificati interrogando servizi reali in questo audit.

Legenda applicata alle conclusioni:

- **C — VERIFICATO NEL CODICE:** percorso o contratto letto sulla base indicata; non significa eseguito né sicuro in ogni scenario.
- **T — VERIFICATO DA TEST:** risultato effettivamente eseguito, con fonte e limiti dichiarati.
- **I — IPOTESI DA VALIDARE:** proposta, stima o rischio senza prova completa.
- **N — NON IMPLEMENTATO:** assente dal percorso/schema ispezionato; eventuali omonimie legacy non valgono come supporto V5.
- **X — NON VERIFICABILE:** manca dataset, misura o accesso autorizzato; non è un esito negativo del prodotto.

Non sono stati letti `.env`, credenziali, database, API o storage dell'app; nessuna AI/email, migrazione, nuova dipendenza, upload, conferma o aggiornamento app. Nessuna modifica al codice, ai test o ai branch Claude/main. Documenti personali e testi estratti non sono inclusi nel report o in fixture Git.

### Inventario verificato

| Componente | Evidenza nel repository | Funzionamento e limite | Modifica necessaria |
| --- | --- | --- | --- |
| Frontend | `frontend-v5/src/object-onboarding/OnboardingPage.tsx:68`, `HouseExpenseProposal.tsx:20`, `localBill.ts:10` | C: React/Query, bozza manuale eleggibile solo senza scelte/campi preesistenti; download autorizzato, proposta locale e schede. Protegge le compilazioni pregresse. | Preservare controller e conferma; rendere espliciti esito/ruolo/fonte per campo. |
| Upload | `backend-v5/src/document-intake/uploads.service.ts`, `batches.service.ts`, `backend-v5/prisma/schema.prisma:247` | C: documento, versione/hash, file, batch/item e richieste idempotenti. Upload non coincide con spesa confermata. | Riutilizzare; deduplica semantica fattura distinta dal digest del file. |
| Classificazione server | `backend-v5/src/document-intake/classifier.ts:4` | C: regole di testo per famiglie, negazioni locali; fattura e bolletta possono essere parti distinte. Non estrae consumi o contabilità. | Tassonomia condivisa; separare categoria, natura e servizio, evitare due verità divergenti client/server. |
| PDF locale | `localBillPdf.ts:9`, `:35`, `localBillLayout.ts:8` | C: PDF.js, SHA verificato, max10 MiB/20 pagine/100k caratteri; legge **solo pagina 1**. Mantiene token/geometria per alcuni accoppiamenti, poi testo lineare. Non un estrattore di tabelle. | Prima pagina per riepilogo; escalation locale selettiva quando si richiedono dettaglio/riconciliazione. |
| OCR | `localOcr.ts:3`, `:5`, `:57`, `ocrDatePairs.ts`, `ocrPixels.ts` | C: worker Tesseract 6.0.1 e modello italiano locali, cache lingua disabilitata; soglie parola/linea, barriere sulle cifre dubbie; limiti pixel/tempo, cancellazione. Il limite generale 10 pagine non significa che il chiamante le legga: qui solo pagina 1. | Non abbassare soglie; conservare candidati e coordinate, diagnosticare perché un campo manca. |
| Regole bollette locali | `localBill.ts:38`, `localBillMoney.ts:38`, `localBillSupplier.ts` | C: fatturazione + servizio, EUR positivo, date etichettate, periodo esplicito, fornitore corroborato; nessun catalogo marchi. Un solo `amount`, nessuna riga di consumo. | Priorità: distinguere totale/dovuto/credito prima di ampliare estrazione. |
| PR #44 separata | `localBillSignals.ts`, `localBillSummary.ts` sul solo branch PR #44 | C/T: combinazioni linea+abbonamento+identificativo e riepilogo fiscale relativo, non coordinate assolute. Generalizza alcuni layout telecom. Restano soglie geometriche da misurare su layout indipendenti. | Non scambiarla per motore universale; eventuale integrazione su approvazione distinta. |
| PDF backend | `backend-v5/src/review/pdf-text.ts:11`, `pdf-worker.cjs` | C: parsing/rendering PDF in processo limitato, hash e timeout. Percorso distinto dall'OCR browser; nessun servizio Python necessario. | Interfaccia comune delle evidenze, evitando duplicazione di parser economici. |
| Provider AI | `object-onboarding/anthropic-provider.ts:39`, `:58`, `:90`, `provider-prompt.ts:4`, `provider-schema.ts:12` | C: prompt v30, testo/pagine selezionate o PDF/immagini; schema strutturato e pool citazioni. Estratti testuali e regioni visuali hanno forza probatoria diversa; la regione visuale non è OCR indipendente. | Schema bolletta dedicato ma compatibile con la revisione esistente; fallback esplicito per lacune, non invio sempre attivo. |
| Validazione AI | `object-onboarding/domain.ts:261`, `field-validation.ts`, `invoice-evidence.ts` | C: EUR, date, citazione e ruolo; campi invalidi possono essere omessi con warning. Ruoli totale/dovuto/arretrati già distinti nei candidati AI. Non riconcilia una contabilità di righe/consumi. | Validatore economico indipendente e condiviso anche con l'estrazione locale. |
| Worker/budget | `jobs.worker.ts`, `ai-analysis.ts:29`, `ai-budget.ts:67`, schema `ObjectOnboardingJob`/`Attempt` | C: lease, prenotazione, stato incerto, controllo fonte/consenso e costo persistito. Nessun retry cieco del trasporto. | Conservare ledger e guardie; telemetria non sensibile degli stadi locali/preflight. |
| Lettura progressiva | `object-onboarding/reading.ts:2`, `:21`, `:32` | C: helper versionato, selezione pagine ed euristica completezza; il ciclo può rileggere prefissi. **Non trovato un uso di `readProgressively` nel worker applicativo ispezionato**: test/helper non provano attivazione nel prodotto. L'euristica non certifica consumi/riconciliazione. | Collegare solo dopo prove costo/copertura; evitare escalation che ripete l'intero prefisso inutilmente. |
| Conferma/persistenza | `onboarding.service.ts:318`, `:384`, `access.ts`, `automatic-plan.ts:35` | C: scelta candidata/manuale, versione, hash, lock, idempotenza, transazione canonica e controlli duplicati. L'automatico richiede totale unico, assenza arretrati e compatibilità dovuto/totale; non attivato dall'audit. | Riutilizzare. Nessuna conferma implicita dal solo riconoscimento. |
| Spese/dashboard | `schema.prisma:468`, `expenses/expenses.service.ts:103`, frontend `routes/ExpensesPage.tsx` | C: `HomeExpense`, centesimi, fornitore/numero/date/competenza/scadenza, provenienza JSON e storico. Riepilogo anno basato su `spentOn`; non un motore di ripartizione consumi/costi per competenza. | Introdurre viste economiche coerenti solo dopo modello fattura/periodi. |
| Consumi/contratti | schema Prisma V5 ispezionato | N: nessun modello dedicato fornitura, contratto tariffario, misurazione per fascia o transazione di pagamento della bolletta. Testo libero/JSON non equivale a supporto funzionale. | Estensione minima progressiva, descritta in §5. |
| Errori e UX | `localBillPdf.ts` catch/finally; `OnboardingPage.tsx`; `LocalReadingIsolation.test.tsx` | C: annullamento e fallback manuale; può restituire campi nativi quando OCR opzionale fallisce. Non c'è spiegazione strutturata persistente di ogni campo mancante. | Esito per campo e messaggio operativo: assente, ambiguo, illeggibile, non letto. |
| Test/fixture | `localBill*.test.ts`, `localOcr*.test.ts`, `LocalReadingIsolation.test.tsx`, `StandaloneBillCompletion.test.tsx`, backend `bill-completion.integration.test.cjs`, `quality-v3-reading.test.cjs`, `test/OFFLINE.md` | C/T: parser, OCR, UI mock, guardie, conferma/idempotenza. Nessun corpus rappresentativo multi-fornitore con metriche economiche/consumi dimostrato. | Separare unità, percorso offline e corpus documentale con holdout. |

### Sicurezza, privacy e affidabilità: controlli e limiti dell'audit

| Area | Verifica e limite |
| --- | --- |
| Accessi/isolamento | C: `documents/access.ts:9` esclude cestinati e applica visibilità/uploader; l'accesso va combinato con membership e fonte/versione/SHA dei servizi, non usare il predicato isolato come autorizzazione completa. `object-onboarding/access.ts` e richieste scoped proteggono le proposte. Non eseguito pentest né lettura dei permessi reali. |
| Trasmissione esterna | C: `jobs.service.ts:85` controlla fonte autorizzata e consenso; `anthropic-provider.ts:90` include il count_tokens nel confine autorizzato. Prompt tratta documenti come dati, senza tool/esecuzione link. Efficacia contro tutte le injection X; includere casi avversari e validazione indipendente. |
| Identificativi/log | C: errore HTTP provider conserva codice/requestId ma non legge il corpo errore potenzialmente sensibile (`review/anthropic.ts:19`). Non certifica assenza PII in tutti i log, infrastruttura o copie di backup. POD/PDR/linea futuri richiedono minimizzazione, accessi e redazione come gli originali. |
| Conservazione/cancellazione | C: `documents/trash.ts:6`, `trash.service.ts`, schema `DeletionRecord`/`TrashRequest`: retention30 giorni, purge e trattamento delle risposte idempotenti. Non significa cancellazione immediata di backup/provider; ciclo backup separato, da non includere come risolto. Estensioni dati future entrano nell'inventario di cancellazione/export. |
| Cache | C: query locale scoped account/casa/documento/versione/SHA, `gcTime:0`; lingua OCR `cacheMethod:none`. Non dimostra pulizia di cache browser/HTTP/OS o retention provider: X senza verifica dedicata. Vietato riuso globale degli estratti per digest uguale. |
| Correzioni/audit trail | C: draft review/decisions, versioni e history canoniche esistono; N una traccia uniforme campo-per-campo della lettura locale e della regola applicata. Ledger conserva tentativi AI e costi/stati; non è prova dell'esattezza del dato. |

### Prove riproducibili e loro limiti

In questo audit eseguite **5 sonde sintetiche pure su ciascuna delle due fonti**, senza dati personali: bundle in memoria del solo `localBill.ts` tramite esbuild già disponibile, nessuna nuova dipendenza. Input e risultati riportati in §3: sono sonde diagnostiche, non una nuova suite di prodotto né un benchmark. Esito processo 0; tutti i risultati confrontati.

Evidenze pregresse del lavoro immediatamente precedente, non rieseguite né attribuite al consolidamento: PR #44 mirata **209/209**, fixture OCR **5/5**, typecheck/lint/build verdi sulla fonte `debfcc3`. Prima completa conclusa **1225/1226**, un timeout in `routes/objects.test.tsx:59`; file invariato rieseguito **27/27**. Una seconda completa era già avviata prima dell'audit: esito finale registrato in consegna solo quando disponibile. Due esecuzioni ancora precedenti erano state interrotte per completare modifiche; non conteggiate come passate. Queste prove non certificano bollette di altri fornitori, consumi o pagamenti. Nessun test DB eseguito in questo audit.

## 2. Valutazione separata Sorgenia / TIM

Questa matrice riguarda il **percorso locale oggi distribuito**, con differenze PR #44 dichiarate. «Supporto» indica una proposta da confermare, non valore automaticamente verificato. La precedente verifica locale dei PDF autorizzati si limitava alla prima pagina; nessun contenuto personale viene ripubblicato. Il fornitore non determina una regola speciale.

| Campo/funzione | Sorgenia elettrica | TIM telefonia | Evidenza/limite |
| --- | --- | --- | --- |
| Categoria e fornitore | Supportati, T sul campione precedente | Parziali nel consolidamento; T sul nuovo campione solo con PR #44 | Segnali e corroborazione; marca sconosciuta o logo senza testo possono restare assenti. |
| Intestatario | N | N | Non in `LocalBill`; non confonderlo con fornitore. |
| POD / contratto o linea | N come dato strutturato | N come dato strutturato | POD è segnale di tipo; nella #44 numero linea è ancora segnale, non anagrafica persistita. |
| Indirizzo di fornitura | N | N | Nessuna associazione automatica ad altra casa. |
| Numero fattura | Parziale | Parziale | Locale lo usa come guardia multipla ma non lo restituisce; AI lo supporta come proposta con fonte. |
| Data emissione | Supportata, T sul campione precedente | Supportata, T campione #44 | Etichetta e data valida; non data pagamento. |
| Periodo fatturato | Supportato se esplicito, T sul campione | Parziale: sul campione #44 assente | Non convertire «Fattura Settembre» in competenza del servizio. Più periodi non rappresentati separatamente. |
| Scadenza | Supportata, T sul campione | Supportata, T campione #44 con OCR/geometria | Data OCR incerta resta vuota. |
| Totale fattura / importo da pagare | Parziale | Parziale | Un `amount` locale perde il ruolo; due valori diversi restano vuoti. Candidati AI hanno ruoli distinti. |
| Pagamento avvenuto/residuo/data | N | N | Nessuna prova da SDD, metodo di pagamento o scadenza. |
| Consumi kWh / traffico variabile | N | N | Non estratti nel modello locale o nello schema houseExpenses AI. |
| Effettivi/stimati, letture, fasce | N | N | Non dedurre da importo o storico. |
| Quote fisse / canone connettività | N | N | Non classificate come righe economiche. |
| Quote variabili / servizi aggiuntivi | N | N | Non classificati. |
| Materia energia, trasporto/rete, oneri | N | Non applicabile al servizio telefonico | Presenza nel PDF campione non verificata in questo audit. |
| Imposte/IVA | N locale; parziale AI come candidato ausiliario | Idem | Candidato tax non equivale a dettaglio fiscale riconciliato. |
| Canone RAI | N; presenza X | Non applicabile | Non supporre che sia incluso nel campione. |
| Rate modem/dispositivi | Non applicabile salvo beni accessori | N per interpretazione tariffaria | Campi rate generici UI non provano riconoscimento della rata modem. |
| Sconti/promozioni e relativa scadenza | N | N | Nessuna proiezione contrattuale automatica. |
| Costi attivazione/una tantum/terzi | N per voci dedicate | N | Non confondere con oggetti acquistati. |
| Conguagli/rettifiche/arretrati | Parziale AI, N interpretazione locale | Idem | AI conserva candidato arretrati e blocca automatico; non ricostruisce fattura rettificata. |
| Informazioni tariffarie/contrattuali | N | N | Né parser dedicato né modello contratto. |
| Costo servizio vs fatturato vs dovuto | Non adeguato nel locale | Non adeguato nel locale | I ruoli AI sono riutilizzabili; nessun importo pagato provato. |

**Non verificato:** accuratezza su popolazione Sorgenia/TIM, vecchi layout, residenziale/business, fatture negative, dettagli economici delle pagine successive e altri fornitori. I campioni dimostrano casi, non copertura universale.

## 3. Problemi identificati, gravità e riproduzioni

Nessuna perdita dati o violazione di accesso dimostrata: non si dichiara un problema critico senza prova. La priorità economica rimane P0 anche quando l'utente deve confermare.

| Gravità | Rilievo, posizione e scenario concreto | Prova e azione raccomandata |
| --- | --- | --- |
| **Alto, P0** | Perdita ruolo economico locale, `localBill.ts:5`, `localBillMoney.ts:1`, `HouseExpenseProposal.tsx:21`. Input «Fattura / Energia elettrica / Totale da pagare: 150,00 EUR / Arretrati: 50,00 EUR» produce `amount=150.00`, nessuna distinzione arretrati/costo corrente. | **T**, entrambi i branch. Non prova un salvataggio errato avvenuto, ma espone una proposta ambigua come unico importo. Conservare ruolo, arretrati e scelta esplicita; non sottrarre automaticamente 50. |
| **Alto, P0** | Provenienza locale impoverita: `localBill.ts:5`, `localBillForm`, schema `HomeExpense`. Valore locale entra nel percorso manuale senza evidenza strutturata per campo. | **C**: preservare metodo, pagina, regione/estratto, versione parser e stato. La conferma umana non rende verificata la semantica economica. |
| **Alto, P0/P1** | Solo pagina 1, `localBillPdf.ts:35`: nessun dettaglio per riconciliare importi, consumi, più forniture. | **C**. Ottimo limite per riepilogo rapido, insufficiente per il motore richiesto. Dichiarare «dettaglio non letto», poi leggere solo sezioni necessarie localmente. |
| **Alto, P0** | Crediti non supportati: `localBillMoney.ts` e `domain.ts:290`. «Totale fattura: -25,00 EUR» lascia il valore assente; candidati totali AI negativi scartati. | **T/C**. Comportamento prudente attuale; servono documento a credito e importi firmati distinti dalle spese positive. Non usare valore assoluto. |
| **Medio, P1** | Falsi negativi telecom ricchi di testo: `localBill.ts:43`, `localOcr.ts:57`. «Fattura Settembre 2026 / Numero fattura: XYZ1 / Data emissione: 16/09/2026 / Informazioni linea / Numero telefono: 000000000 / Abbonamenti attivi / Totale fattura: 30,00 EUR» → null consolidamento. | **T**. PR #44 riconosce internet_services e 30.00 sulla stessa sonda, senza marchio. Non risolve tutti i layout o i ruoli economici. |
| **Medio, P1** | Documenti multiservizio: «Fattura / Energia elettrica e gas naturale / Totale fattura: 100,00 EUR» → importo ma categoria assente. | **T**, entrambi. Non ripartire; segmentare con evidenze o revisione. |
| **Medio, P1** | Geometria/soglie e grammatica italiane: `localBillLayout.ts:12`, `localOcr.ts:8`, helper #44. Cambi font/colonne/lingua possono alterare copertura. | **C/I**: test avversari e holdout, non abbassamento delle soglie OCR né decine di eccezioni per marchio. |
| **Medio, P1** | Motori locale/AI classificatore server non hanno un unico contratto di estrazione/validazione; frontend senza versione parser nella chiave query `OnboardingPage.tsx:69`. | **C**. Versionare esito e cache; una query in memoria scoped non è una cache durevole sicura delle interpretazioni. |
| **Medio, P1** | Ciclo progressivo non dimostrato nel prodotto; prefissi ripetuti possono aumentare token e chiamate. `reading.ts:32`. | **C/I**: connettere solo dopo misura comparativa, mantenendo ledger e consensi. |
| **Medio, P1** | Mancano benchmark multi-fornitore e telemetria locale per campo, costi manuali e motivi fallback. | **X/N**: creare baseline prima di soglie di qualità/costo; non convertire pass rate unitario in accuratezza documentale. |
| **Basso, P1** | Reinizializzazioni OCR/letture ripetute e duplicazione parser possono pesare su mobile. | **I**: misurare CPU/memoria/p95 prima di caching o pool worker; evitare ottimizzazioni che mescolano utenti. |

Controllo positivo riprodotto: «Totale fattura: 100,00 EUR / Totale da pagare: 150,00 EUR» conserva categoria ma **non propone amount** su entrambi i branch. Preservare questa prudenza: la soluzione è un tipo economico più ricco, non scegliere il numero più grande.

## 4. Architettura raccomandata e alternative economiche

Raccomandata **C incrementale**, con B come primo stadio operativo. Riutilizzare stack TypeScript/PDF.js/Tesseract, controller, storage, provider, ledger e conferma; nessun Python, nuovo microservizio o motore parallelo giustificato dalle prove attuali.

Flusso proposto, non implementato:

1. Autorizzare fonte/versione/SHA e acquisire bytes; estrarre testo e geometria pagina 1.
2. Riconoscere separatamente categoria, natura (fattura/credito/sollecito/rettifica), servizio e molteplicità. Il nome fornitore è un risultato, non prerequisito.
3. Generare candidati con valore **e ruolo**, fonte e regola. Regole comuni versionate; adapter di famiglia/layout limitato quando dimostrato necessario. Nessun `if` fornitore disseminato.
4. Validare sintassi e semantica indipendentemente; distinguere riepilogo completo da riconciliazione completa. Segnalare contraddizioni native/OCR, non cancellarle.
5. Se manca informazione necessaria, espandere localmente pagine/sezioni pertinenti; OCR solo dove serve. Non leggere sempre tutto, ma nemmeno dichiarare dettagli riconciliati dalla prima pagina.
6. Se resta ambiguità, offrire manuale o AI autorizzata e budgetata. Preferire una richiesta strutturata con contesto minimo sufficiente; raggruppare campi correlati anziché una chiamata per campo.
7. Passare anche i candidati AI al medesimo validatore; nessun maggior privilegio per la confidence LLM. Revisione sugli scarti; conferma canonica unica e atomica.

ARERA può ridurre le variazioni delle famiglie luce/gas: il frontespizio uniforma il riepilogo; scontrino, box offerta ed elementi informativi contengono altri livelli di dettaglio. Non rende uguali tutti i documenti né include telefonia/acqua/TARI. Verificati la [pagina ufficiale](https://www.arera.it/nuova-bolletta) e l'[aggiornamento regolatorio 64/2025/R/com](https://www.arera.it/fileadmin/allegati/docs/25/64-2025-R-com.pdf); controllare ambito/versione sul corpus, senza assumere conformità del singolo PDF. Non aprire QR/link del documento automaticamente.

| Alternativa | Accuratezza, errori e latenza | Costo, manutenzione e scala | Valutazione |
| --- | --- | --- | --- |
| A — AI ogni documento | X: nessuna accuratezza universale misurata; output plausibile può essere errato. Rete/preflight/inferenza sempre presenti. | Costo AI su ogni file; schema/prompt/validazioni sempre da mantenere; forte dipendenza provider. OCR locale talvolta evitabile ma lettura visiva/token non gratuiti. | Non raccomandata come default. Utile baseline comparativa autorizzata. |
| B — parser + fallback sull'intero documento | I: vantaggio sui layout coperti; rischio di classificare erroneamente come «coperto». Un passaggio AI può essere più coerente di molti frammenti. | Costo proporzionale ai fallback; manutenzione adapter può superare risparmio AI; prompt e validatore riusati. | Primo rilascio ragionevole dopo P0, con copertura esplicita. |
| C — deterministico + AI selettiva | I: conserva evidenza locale e limita esposizione; frammenti privi di contesto possono sbagliare ruolo/fornitura. Latenza buona senza fallback, peggiore se molte escalation. | Minori token possibili, non garantiti; più orchestrazione. Total cost include OCR, manutenzione, rete e correzioni. Riusa B, non nuova infrastruttura. | Obiettivo raccomandato, da promuovere con confronto misurato B/C. |

### Misure di costo realmente disponibili

**C:** `review/ai-config.ts:4` ammette Sonnet 5.5 (2/10), Sonnet 5 (2/10), Sonnet 4.6 (3/15), valori micro-USD/token equivalenti a USD/milione. Il modello onboarding effettivo deriva dalla configurazione; **X** in questo audit, non letta. Non dichiarare che sia il default del servizio review. Prezzi nominali confrontati con la [documentazione Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), consultata il 25/10/2026; contratto/provider/regione e listino vanno ricontrollati prima di una campagna. Nessun modello nuovo proposto come migrazione automatica.

**C:** `review/anthropic.ts:31` prepara con GET modello + POST count_tokens, poi `send` esegue un POST Messages. Quindi un tentativo standard completo comporta **3 richieste HTTP**, non una; count_tokens trasmette contenuto pur non essendo una generazione. Non c'è un ciclo retry nel trasporto. Limite output4096, input+riserva output≤50000; prenotazione conservativa **0,25 USD**, non costo addebitato. `onboardingUsageCost` considera input normale, scrittura cache1,25×, lettura cache e output. Il prezzo è congelato nel tentativo. Gli incerti mantengono la prenotazione, non diventano costo zero.

**C:** il testo può essere trasmesso in pagine; il visuale può inviare l'intero PDF base64 o immagini selezionate. Prompt/schema generalisti portano overhead anche per pochi campi. Modalità selettiva e prompt caching disponibili non provano un risparmio reale. Altri sottosistemi AI (`review`, `economy`, `receipt-assistance`) usano provider/ledger propri: non sommare solo l'onboarding quando si calcola costo del documento.

Evidenza **documentale storica, non ricertificata sul ledger**: [terzo tentativo caffè](fase0-coffee-third-attempt-20261023.md) registra Sonnet5.5, un Messages più controllo modello e conteggio token, nessun retry, costo settled0,038369 USD e totale dei tre tentativi0,115147 USD. È un esempio di costo comprensivo dei tentativi falliti e non una misura di bollette o della nuova architettura; i token dettagliati non sono riportati in quel riepilogo. Non usarlo per stimare una media universale.

**X:** numero reale di richieste duplicate, token/costo medio delle bollette, quota fallback, durata OCR/mobile, cache hit, correzioni manuali e costo manutentivo. Ledger storico non interrogato; report di campagne precedenti non sono una baseline bollette rappresentativa. OCR locale ha zero chiamate LLM ma CPU, RAM, download asset e assistenza non sono costo nullo.

Metodologia, senza benchmark inventati:

- `C_A = C_estrazioneA + C_AI_intero + C_validazione + C_correzione + C_manutenzione/N`.
- `C_B = C_locale + p_fallback × C_AI_intero + C_validazione + C_correzione + C_manutenzione/N`.
- `C_C = C_locale + E[somma costi richieste selettive] + C_orchestrazione + C_validazione + C_correzione + C_manutenzione/N`.
- Costo AI per richiesta: token non cached×tariffa + scritture/letture cache×tariffa rispettiva + output×tariffa; prenotato e addebitato sempre distinti. Includere errori/abbandoni nel denominatore; costo per interpretazione **corretta**, non solo per invio riuscito.
- Misurare su stesso corpus/holdout e gold, hardware e versioni congelati; B/C prima con replay offline, eventuale confronto live richiede consenso e budget nuovi. Nessuna soglia definitiva prima della baseline.

Telemetria proposta: identificativi pseudonimi scoped, SHA non pubblico, parser/schema/prompt/modello, stadio, pagine tentate/lette, esiti campo senza valore, causa fallback, durata/CPU disponibile, dimensioni, cache hit, conteggi modello/count_tokens/Messages, token cached/noncached, prenotato/settled/uncertain, codice errore, correzioni/tempo conferma con consenso. Non loggare intestatari, POD, telefono, bytes, estratti o payload. Aggiungere aggregazioni al ledger esistente; non un secondo contatore budget.

## 5. Modello dati minimo e migrazione concettuale

`HomeExpense` è adeguato alla **spesa confermata aggregata**, non alla fattura completa o a un pagamento. `spentOn` non dimostra esborso; mantenere compatibilità delle viste esistenti. `economicProvenance`, draft output/review e history sono basi riusabili; non affidare tutto a JSON arbitrario senza schema/versione.

### Prima estensione, P0 (proposta, nessuna migrazione eseguita)

- Una interpretazione versionata collegata a documento/versione/SHA e account/casa, distinguendo tentativo e revisione attiva. Payload JSON validato per candidati/risultati; riusare il draft, definire nuovo tipo solo se la semantica fattura non è compatibile. Nessun duplicato del ledger.
- Campo candidato: valore normalizzato e unità/valuta/segno; `role`, metodo, parserVersion/schemaVersion, pagina, regione/token/estratto protetto, validazioni e correzione. Separare stato **verificato da regola**, plausibile, mancante, incoerente e non applicabile, più stato conferma. LLMconfidence e OCRconfidence non sono probabilità calibrate; «confermato» è un'altra dimensione.
- Riepilogo fattura: numero, natura, emessa/scadenza, periodo/i e importi distinti `invoiceTotal`, `amountDue`, `arrears`, eventuale credito. Mancante≠zero. Nessuna identità «costo servizio=fatturato=dovuto» implicita.
- Relazione a `HomeExpense` esistente dopo conferma, esplicitando ruolo dell'importo scelto. Credito/rimborso richiede decisione sul registro economico, non numero negativo forzato nel contratto attuale.

### Estensioni solo al bisogno, P1/P2

| Dominio | Minimo utile | Vincolo |
| --- | --- | --- |
| Fornitura/contratto | Identità scoped casa/utente, categoria, fornitore, identificativo POD/PDR/linea, periodi validità e fonte. Contratto tariffario opzionale versionato. | Non dedurre casa dall'indirizzo fatturazione; nessuna chiave globale per nome fornitore. |
| Fattura | Documento/versione, fornitura/e, numero, natura, valuta, date, totali firmati distinti, riferimento rettifica. | Un file può contenere più fatture; un identificativo fattura non è globalmente unico. |
| Riga economica | Descrizione originale protetta, categoria normalizzata opzionale, importo in centesimi con segno, imposta se esposta, ricorrente/una tantum/ignoto, competenza, collegamento servizio/consumo. | Mai attribuire una classe per riempire lo schema o sommare due rappresentazioni dello stesso totale. |
| Consumo | Quantità decimale esatta come stringa/Decimal, unità kWh/Smc/m³, periodo, letture/fascia, effettivo/stimato/rettificato e fonti. | Non usare centesimi o floating point per quantità; nessuna conversione senza coefficienti e regola espliciti. |
| Pagamento | Evento separato con data, importo pagato/residuo, evidenza e stato verificabile; collegamenti alla fattura. | SDD programmato non è pagamento eseguito; stato sconosciuto ammesso. |

Ogni nuova tabella/cache deve avere account/casa, accesso per fonte, gestione cestino/purge/export e storico correzioni. Schema additivo e backfill solo in un lotto futuro approvato e con test/migrazione dedicati. Non reinterpretare retroattivamente le spese esistenti senza scelta esplicita.

Caching: chiave account+casa+documentId+versione+SHA+parserVersion+schemaVersion+modalità/pagine+opzioni OCR; per AI anche prompt/modello e per riuso dati contratto versione del confermato. Riconvalidare accesso e lifecycle a ogni rilascio. Hash uguale non autorizza condivisione fra utenti/case. Cache browser attuale è effimera (`gcTime:0`), non riuso durevole. Invalidare su revoca, cestino/purge, sostituzione versione e cambi regole. Nessun testo originale in cache globale o analytics.

## 6. AI on demand, casi particolari e integrazione con la casa

Fallback proposto: niente AI se campi richiesti sono sufficienti e coerenti; nuova famiglia sconosciuta **non impone** AI se il riepilogo deterministico è valido. Prima tentare lettura locale delle sezioni mancanti. AI solo per lacuna rilevante/ambiguità semantica dopo consenso a contenuto, scopo, destinatario e budget; fallback manuale sempre disponibile. Il documento è input non attendibile, non può autorizzare tool/link, cambiare schema o policy. Rifiuto, errore o costo incerto fermano l'automatismo; nessun retry cieco. Mai sovrascrivere campi pieni/confermati.

| Caso | Interpretazione/validazione proposta | AI e conferma; incertezza |
| --- | --- | --- |
| 1 Ordinaria | Riepilogo coerente; ruoli/date/utenza univoci. Riconciliazione solo se dettaglio sufficiente. | No AI se basta; conferma finale, non «pagata». |
| 2 Conguaglio | Voci e periodo originario separati, confronto con consumi rettificati senza doppio conteggio. | AI se nesso non leggibile; revisione, nessuna riallocazione inventata. |
| 3 Nota credito | Natura e fattura riferita, segno e importo rimborso distinto dal pagamento. | Conferma credito/collegamento; non creare spesa positiva. |
| 4 Fattura negativa | Mantenere segno; validazione del documento e del saldo. | Nessun valore assoluto; manuale se modello attuale non rappresenta il caso. |
| 5 Più periodi | Intervalli per riga/consumo; sovrapposizione segnalata, non necessariamente errore. | Nessun prorata automatico non documentato. |
| 6 Servizi differenti | Segmentare servizi e righe; totale condiviso una volta sola. | Conferma ripartizione solo se evidenziata, altrimenti non ripartita. |
| 7 Più punti | Gruppi per punto, totali riconciliati quando disponibili. | Associazione esplicita per utenza; non assegnare tutto alla casa aperta. |
| 8 Pagati/arretrati | Separare costo corrente, partite precedenti, dovuto e pagato documentato. | Se non dimostrabile pagamento sconosciuto. |
| 9 Rateizzazione | Calendario/scadenze come piano; capitale/costo rata non sommati due volte. | Confermare piano e nesso, nessun addebito eseguito dedotto. |
| 10 Sconto temporaneo | Riga firmata e periodo esplicito. | Non prolungarlo oltre periodo noto; ambiguità da rivedere. |
| 11 Promo in scadenza | Data/fonte contrattuale; controllo sintattico e confronto periodo. | Avviso solo da evidenza; nessuna raccomandazione risparmio automatica. |
| 12 Canone anticipato | Competenza futura separata da emissione/scadenza. | Non sostituire date o trattare come già pagato. |
| 13 Stimati | Tipo stimato e letture/periodo; non confondere stima con misura. | Mostrare distintamente, non correggere con AI. |
| 14 Rettificati | Collegare revisione e periodo originario, preservando storico. | Conferma sostituzione effetti, non aggiungere consumi duplicati. |
| 15 Duplicato | Hash prima; identità fattura+utenza/fornitore/date per somiglianza. | Idempotenza per replay; warning e scelta su duplicato semantico. |
| 16 Versione corretta | Nuova versione/interpretazione, link a rettificata. | Non sovrascrivere valori confermati né cancellare storico. |
| 17 PDF digitale | Nativo+geometria, controllare completezza e colonne. | No AI salvo lacune; testo abbondante non implica leggibilità economica. |
| 18 Scansione | OCR locale limitato, qualità per token/campo. | AI opzionale autorizzata; cifre dubbie assenti, mai riparate arbitrariamente. |
| 19 Incompleto | Copertura esplicita; non verificare somme con righe mancanti. | Chiedere solo dati necessari o altra pagina, non inventare. |
| 20 Illeggibile | Errore/assenza distinguibile, preservare altri campi validi. | Manuale; AI non può fabbricare evidenza. |
| 21 Voce sconosciuta | Descrizione e valore conservati con classe ignota. | AI per classe se utile, ma somma/ruolo restano validati. |
| 22 Più immobili | Non usare automaticamente indirizzo cliente come fornitura. | Conferma mappatura delle fonti; nessun trasferimento fra case implicito. |

Integrazione raccomandata: conferma fattura alimenta la spesa una sola volta; forniture riusano anagrafica confermata con fonte/versione; consumi alimentano serie solo con unità e periodi attribuibili. Date di scadenza possono alimentare avvisi, ma emissione non dimostra pagamento. Dashboard per competenza e dashboard per flussi devono essere esplicitamente distinte. Segnalazioni anomalia/duplicato/promozione/conguaglio solo dopo controllo della qualità e copertura: confronto fra stimato/reale o finestre diverse non giustifica un allarme economico. Niente suggerimenti di risparmio in questa fase.

UX proposta: riepilogo subito, evidenze apribili per campo, correzione limitata agli incerti, salvataggio unico attuale. Non aggiungere una schermata per ogni voce. «Verificato» significa regole superate su evidenza disponibile; non certificazione del documento. Proteggere i dati canonici già confermati anche quando l'originale diventa indisponibile, redigendo estratti/proposte secondo le policy esistenti.

## 7. Piano test, corpus e metriche

**Unitari:** grammatica comune separata da adapter; numeri locali, segni, zero/mancante, valute, colonne, ripetizioni, date/scadenza/competenza, ruoli totale/dovuto/arretrati, fornitori ignoti, negazioni, righe ambigue, coordinate scalate/rotazioni, prompt injection come testo. Test economici senza allentare gold/assert/soglie.

**Integrazione:** bytes→estrazione→candidati→validazione→revisione→conferma su cluster nuovo del runner offline, mai database reale; ripetere upload/conferma dopo risposta persa, ordini invertiti, due utenti/case, revoca/cestino/purge/export, errore OCR/provider, cambio versione/SHA e concorrenza. Mock UI per desktop/mobile e ritorno pagina unica; test transazione atomica e assenza scritture prima della conferma. Nessun chiamante live nei test automatici.

**Regressione documentale:** autorizzati locali fuori Git; fixture versionate completamente sintetiche con stessi fenomeni di layout, mai una semplice redazione che lasci PII nel livello testo/metadati. Gold per campo include stato e fonte, non solo valore; annotazione doppia e risoluzione disaccordi sui casi economici. Separare training/regole da holdout di layout e fornitore. Copertura iniziale elettricità multi-fornitore (Enel, Plenitude, A2A, Edison se disponibili), poi gas, acqua e telecom (Vodafone, Fastweb, WINDTRE, Iliad se disponibili). Nomi non equivalgono a copertura: richiedere documenti indipendenti per famiglia/versione e casi limite. TARI/condominio/avvisi fuori dalle bollette commerciali, adapter dedicato futuro.

Metriche con denominatore pubblicato per servizio, layout, digitale/scansione, metodo e campo:

| Metrica | Definizione utile |
| --- | --- |
| Categoria/fornitore | Precisione, recall, astensioni e confusione per classe; fornitore non inferito dal nome file. |
| Importi/date/consumi | Exact match normalizzato con ruolo/segno/unità e fonte corretti; campo omesso separato da errato. |
| Classificazione/tempo | Accuratezza ruolo economico e competenza per riga; overlap e periodo non attribuito. |
| Riconciliazione | Corretti verificati / verificati, non riconciliabili / totale; errore per soglia contabile esplicitamente definita. |
| Duplicati | Precisione/recall su file identici e fatture semanticamente uguali, separati. |
| Falsi verificati | Campi errati classificati verificati / campi verificati, più valore assoluto ed esposizione economica. |
| Conferme/correzioni | Campi da rivedere / applicabili; percentuale correzioni, tempo mediano/p95, abbandoni. |
| Efficienza | Quota senza LLM, chiamate/preflight per documento, pagine/OCR, latenza p50/p95, RAM/CPU, costo settled e prenotato incerto distinti, manutenzione per famiglia. |

Criteri di accettazione iniziali: zero regressioni nei test economici/privacy/idempotenza esistenti; nessuna somma/ripartizione/identità pagamento inventata; tutti i candidati economici con ruolo/fonte/versione e ambiguità esplicita; nessun falso verificato nel gold di rilascio, con numerosità dichiarata (non garanzia statistica universale). Definire soglie quantitative di copertura/latency/costo **dopo baseline**, con intervalli di incertezza e holdout congelato. Un test non coperto non è passato. Conservare tentativi falliti e ripetizioni, senza nasconderli con timeout maggiori.

## 8. Roadmap implementativa proposta

Nessuna attività seguente avviata in codice. Ogni riga è un futuro lotto da registrare e approvare; non prenota file dei lotti aperti. Complessità relativa: S limitata, M più moduli, L modello/contratto trasversale; non stima di giorni senza baseline.

| Lotto / priorità | Problema e impatto utente | Complessità, dipendenze, moduli | Accettazione e rischio regressione |
| --- | --- | --- | --- |
| **P0.1 — ruoli monetari locali** | Dovuto e arretrati non devono diventare costo corrente. Più chiaro cosa confermare. | M; nessuna dipendenza P1. `localBill*`, `HouseExpenseProposal`, tipi, validatore comune, test. | Sonde §3 diventano regressioni; preservare importi distinti/ambiguità, mai sottrazione implicita; payload esistente compatibile. Rischio campi salvati e recupero bozza. |
| **P0.2 — evidenza/versione/esiti** | Spiegare e riprodurre proposte locali e AI. | M; P0.1. Tipi draft, decoder, `domain`, UI, provenienza e cache. | Campo con metodo/regola/pagina/versione e validazioni; nessun «verificato» solo per confidence. Privacy/purge/export coperti. Rischio leak di estratti. |
| **P0.3 — natura credito e riconciliazione minima** | Totale, dovuto, pagato e saldo distinti; gestire crediti senza falsa spesa. | L; decisione registro e P0.1/2. Schema concettuale §5, expenses, onboarding, test DB offline. | Crediti/arretrati/multi-totali e pagamento ignoto gold; migrazione solo futura autorizzata. Rischio somme storiche e report. |
| **P0.4 — corpus/baseline riproducibile** | Misurare generalizzazione e impedire regole ad hoc. | M; autorizzazione campioni, gold/manifest non sensibile, runner offline. Può precedere P0.1. | Dataset/gold e holdout distinti; metriche campo/ruolo, falsi positivi e tentativi falliti pubblicati. Rischio fixture con dati personali. |
| **P1.1 — estrazione a sezioni** | Riepilogo veloce, dettagli solo quando servono. | M; P0.2/4. `localBillPdf`, OCR/layout, parser backend come capacità riusata. | Pagina1 sempre sufficiente per riepilogo quando evidenziato; escalation locale per lacune, limiti/cancel; copertura dichiarata. Rischio costo mobile e dati pagina sbagliata. |
| **P1.2 — contratto regole/adapter** | Aggiungere fornitori senza patch sparse. | M; P0.1/2/4. Classifier, regole comuni TypeScript e adapter versionati per famiglia. | Provider ignoto e layout holdout, evidenze obbligatorie, nessun lookup solo marchio. Rischio divergenza server/client. |
| **P1.3 — forniture e componenti** | Luce→gas→acqua→telecom: quantità, fissi/variabili, tasse, sconti, rate, periodi. | L; P0.3 e P1.1/2, decisione modello §5. Schema/API/validatori/UX; lotti separati per servizio. | POD/PDR/linea e unità/periodi, più punti, voci ignote; nessuna allocazione non documentata. Rischio duplicati e associazione casa errata. |
| **P1.4 — telemetria/caching/fallback AI** | Ridurre costo totale e attesa senza sacrificare correttezza. | M; P0.2/4, P1.1/2. Ledger, provider, query cache, UI consenso. | Confronto B/C con stessi gold, contare preflight e incerti; nessun retry/bypass consenso; cache scoped revocabile. Rischio trasmissioni duplicate o leak. |
| **P1.5 — famiglie non commerciali** | TARI, avvisi, condominio senza forzarli come bollette. | M/L; corpus specifico e decisioni modello. Classificatore/adapter/review. | Nature distinte e importi/periodi corretti; nessuna duplicazione dei pagamenti. Rischio riuso improprio regole fattura. |
| **P2.1 — storico consumi/competenza** | Consultare costi e quantità nel periodo corretto. | L; P1.3 e qualità validata. Viste aggregazione expenses/consumi/UI. | Nessun doppio conteggio rettifiche, stimati distinti, finestre comparabili. Rischio confondere data fattura con consumo/pagamento. |
| **P2.2 — avvisi documentati** | Scadenze, promo, duplicati, conguagli e anomalie utili. | M; P2.1, baseline e prove per ciascun avviso. Home/activity/insight futuri. | Evidence link, ragione e astensione; nessun allarme su serie insufficienti; niente consigli risparmio non supportati. Rischio falsi allarmi. |

Ordine raccomandato: approvare P0.4 + P0.1, poi P0.2 e disegno P0.3; misurare prima di scegliere adapter aggiuntivi e fallback. PR #44 è una correzione tattica separata: la sua eventuale approvazione non approva questa roadmap né completa P0.1.

## 9. Decisioni esplicite richieste

1. **Ambito primo rilascio:** solo riepilogo affidabile oppure dettaglio/consumi insieme? Raccomandazione: P0 riepilogo con ruoli/fonte, dettaglio P1. Riduce rischio economico e regressioni.
2. **Registro economico:** quale ruolo mostra la spesa e come trattare credito/pagato? Raccomandazione: costo fatturato distinto dal dovuto; evento pagamento separato, stato ignoto ammesso. Nessun backfill automatico delle spese storiche.
3. **Prima pagina vs dettaglio:** consentire lettura locale selettiva oltre pagina1 quando l'utente richiede componenti/consumi? Raccomandazione: sì, su necessità dichiarata e copertura visibile, preservando riepilogo rapido.
4. **Fallback AI e consenso:** manuale per default o opt-in per documento/campagna con limiti? Raccomandazione: opt-in preciso e ledger esistente, una richiesta raggruppata ove conveniente, nessun invio implicito da famiglia sconosciuta. Nessun consenso live richiesto/eseguito da questo audit.
5. **Corpus autorizzato:** quali campioni e chi valida gold economico/competenza? Raccomandazione: campioni locali autorizzati + sintetici Git, holdout indipendente; conferma dei ruoli ambigui prima di attivare supporto.
6. **Architettura e lotti:** approvare percorso C incrementale con primo passo B e P0 indicati? Raccomandazione: sì, mantenendo stack, provider e conferma, senza nuovo servizio o catalogo per marchi.

Non richiedono scelte di prodotto: nomenclatura dei file, helper puri, normale validazione ISO/centesimi e protezioni esistenti. Non si chiede di ridiscutere cestino30 giorni, accesso per fonte o rigore dei test. **Fermarsi qui: attendere approvazione della roadmap prima di implementare.**
