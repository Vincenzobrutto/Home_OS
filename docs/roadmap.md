# Roadmap corrente — Dimora V5, 23 ottobre 2026

Tipo documento modificabile direttamente nella riga dell'archivio: [lotto frontend e report](v5/tipo-documento-inline-20261025.md). Menu con conferma esplicita, senza nuova compilazione né modifica di titolo, collegamenti o spese; 29/29 nuovi test e typecheck/lint/build verdi, mock completa in corso. App invariata; integrazione al committente.

Cestino disponibile nel collaudo applicativo: [PR #41 integrata e attivazione autorizzata](v5/cestino-chiusura-20261025.md), backup verificato, sola migrazione additiva e API/frontend aggiornati a dc58ada. Regressione DB564/564 e mock1127/1127 verdi; dati preesistenti e originali invariati. Prossimo passo: prova interattiva del committente su spostamento e ripristino; nessuna eliminazione o conferma eseguita automaticamente. Ciclo backup separato.

Copertura del collaudo offline e completamento dei documenti: [19 file recuperati, guardia e contratto server](v5/workflow-server-offline-20261025.md), con aggregato 547/547. Distinti test del codice e disponibilità dell'app: [consegna per l'integrazione](v5/consegna-integrazione-20261025.md). Nessun merge o deploy implicito.

Bollette: importi completi e valuta coerente, senza conversione o troncamento; in caso ambiguo mantenere gli altri dati e richiedere conferma del valore. [Report](v5/bollette-importi-prudenti-20261025.md). Il candidato include la PR #38; aggiornamento app e integrazione ancora da approvare.

Compilazione robusta contro risposte tardive: [isolamento, letture locali, tastiera e misura bundle](v5/compilazione-resilienza-20261025.md). Candidato separato con la combinazione della PR #37; integrazione e aggiornamento app subordinati alla decisione del committente.

Collaudo combinato delle PR #35 e #36 sul branch separato: [matrice e consegna](v5/compilazione-collaudo-combinato-20261025.md). Candidato congiunto da approvare prima di integrare; nessun aggiornamento app o completamento automatico dei documenti reali.


Compilazione dall’archivio: [lotto separato](v5/compilazione-archivio-20261025.md) per recuperare i collegamenti senza lotto, preservando bozza e modalità senza scritture all’apertura. Verifiche su tipo Bolletta e uscita dai documenti da completare solo dopo conferma finale: 20/20 mirati, 1008/1008 mock in 118 file, typecheck/lint/build verdi. Merge e aggiornamento app al committente.
Completamento delle bollette dalla pagina diretta: [collaudo autonomo e correzione](v5/collaudo-completamento-report-20261025.md). La classificazione canonica precede la spesa anche senza workspace; nessuna classificazione all’apertura e salvataggio della bozza distinto dalla conferma finale. Test specifici su conflitti, fonte revocata/cambiata, idempotenza e importi discordanti; typecheck/lint/build verdi e suite mock completa 1030/1030 (118 file, nessun test saltato o retry). PR #35 separata; nessuna integrazione o modifica all’app reale.

Bollette ibride e telecomunicazioni: [correzione separata](v5/bollette-lettura-affidabile-20261025.md), 1002/1002 mock, 5/5 fixture, typecheck/lint/build. Intestazione/periodo geometrici e calendario nativo più OCR, senza indebolire confidenze o inventare anni. Riscontro locale sul PDF fornito riuscito; PR da approvare prima di aggiornare l’app.

OCR precedente PR #26 già integrato a 69d9f00 e frontend5174 attivato su autorizzazione esplicita basata sui test offline. Il collaudo browser resta non eseguito; dettagli operativi nella PR documentale #30. Nessun servizio o dato reale modificato da questo nuovo lotto.

Bollette testuali senza AI: [lotto frontend separato](v5/bollette-locali-20261024.md), proposte locali modificabili nella compilazione, senza oggetti o deduzione di pagamento. Stesso salvataggio canonico e nessuna modifica al cestino Claude. Seguito per scansioni nel lotto OCR sopra; collaudo browser e verifica del file effettivamente caricato restano aperti, senza aggiornamento dei dati reali in questo lotto.

Compilazione del documento a schede: ora predefinita, dopo il collaudo manuale confermato e l'incarico esplicito del committente. Ritorno alla pagina unica mantenuto, scelte e payload conservati. [Esito corrente](v5/compilazione-schede-default-20261024.md), [piano](v5/compilazione-schede-piano-20261024.md), PR #23. Codice 61f4a37: mock completa 910/910 in 108 file, nessun test saltato, typecheck/lint/build verdi. Nessuna nuova AI o scrittura reale; telefono fisico/tastiera virtuale non provati. Merge della PR #23 approvato dal committente il 24 ottobre; nessun nuovo cambiamento di prodotto richiesto.

Cestino documenti: D1–D4 corretti e verificati sul [branch indipendente](v5/cestino-correzioni-backend-20261025.md): riproduzioni 6/6, nuove 8/8, aggregato 513/513. Correzioni dirette al branch Claude, nessun merge eseguito. Prima dell'integrazione aggiornare dal consolidamento e coordinare la paginazione UI.

Cestino frontend: [correzioni indipendenti E1/D2](v5/cestino-correzioni-ui-20261025.md) implementate e verificate sul solo branch Codex: 882/882 mock, typecheck/lint/build; riproduzioni precedenti invariate. Dipendenza backend corretta e verificata nella [PR #31](https://github.com/Vincenzobrutto/Home_OS/pull/31). Prima dell'integrazione coordinare entrambi i lotti e aggiornare dal consolidamento. Nessun merge eseguito.

Questo indice distingue il lavoro attuale dalla cronologia. La roadmap precedente è conservata integralmente nell’[archivio del 23 ottobre](roadmap-history-20261023.md), inclusi checkpoint e decisioni dei diversi agenti. I suoi esiti descrivono la data del singolo lotto. [Stato verificato](project-status.md), [backlog completo](backlog.md), [architettura](architecture.md).

## Manutenzione autorizzata in corso

Seguire i dieci rilievi dell’[audit](v5/fase0-code-audit-refactor-20261023.md), con commit distinti e prove offline. R01/R02 corretti; R03 estrazioni dagli editor e R04 validazioni/conferma affrontati per responsabilità, senza riscrittura generale. R07 test protetti completato; R08 protocollo provider separato e verificato. R10 client per dominio completato e verificato ([report](v5/fase0-api-client-domains-refactor-20261023.md)); R06 ricognizione conclusa con conservazione deliberata. R05 candidati misurato/ottimizzato ([report](v5/fase0-candidate-query-batching-20261023.md)); R03 richieste editor e presentazione intake concluso nel perimetro selezionato, collaudo completo verde ([chiusura e opportunità residue](v5/fase0-refactor-closure-20261023.md)); aggiornamenti e risultati nel solo project-status. R09 separa qui stato e archivio, preservando i contenuti storici.

La chiusura del refactoring richiede riepilogo delle verifiche, limiti residui e push verificato. Creato il [branch di consolidamento](v5/dimora-v5-consolidation-branch-20261023.md) dalla versione verificata fef9d96, senza includere il dirty locale. Nessuna integrazione con main. Dal 23/10 le evolutive partono da questo branch, un lotto per branch e PR ([flusso](../AGENTS.md#flusso-delle-evolutive-deciso-dal-committente-il-23-ottobre-2026)).

## Evolutiva ordini e acquisto

Lotto Codex isolato dal Cestino: [costo/data da ordine confermato](v5/ordini-acquisto-20261023.md), verificato offline con 864/864 mock e 88/88 DB mirati; [PR #8](https://github.com/Vincenzobrutto/Home_OS/pull/8) verso il consolidamento, integrata su approvazione del committente (`30c73a2`); collaudo isolato aggiornato in sola consultazione, dati invariati. Nessuna AI, deploy o modifica al collaudo persistito. Il merge resta al committente.

## Classificazione locale: ricevute e negazioni

[Lotto separato](v5/ricevute-negazioni-20261023.md) implementato e verificato: apostrofi, negazioni per occorrenza, riferimenti all'obbligo di emissione e documenti misti. 233/233 ordinari, build/lint e riscontro locale sul PDF reale. PR #12 integrata su approvazione a `b74efe9`; solo collaudo isolato ricompilato/riavviato in consultazione, dati invariati. Cestino di Claude escluso; nessun OCR o nuova analisi AI.

## Collaudo offline di prezzi e date

Lotto separato [prezzi e date](v5/prezzi-date-20261023.md): implementato e verificato offline, 311/311 onboarding, 233/233 ordinari, 18/18 guardie e build/lint. Date sconosciute/condizionali e riferimenti con date ripetute restano da confermare; note neutre e ruoli economici preservati. PR verso il consolidamento, merge al committente; nessuna AI, DB o modifica al lotto Cestino.

## Collaudo offline di oggetti e stanze

Lotto separato [oggetti e stanze](v5/oggetti-stanze-20261023.md): specificità per occorrenza, varianti generiche del vocabolario e compatibilità dei tipi stanza. Suggerimenti da confermare; nessuna deduzione di marca/modello o ubicazione. Verificati typecheck/lint/build e mock completa 870/870 (105 file); esiti e limiti nel report, PR verso il consolidamento con merge al committente. Esclusi lotti Cestino, AI e DB reale.

## Evolutive proposte, in ordine

1. Cestino ed eliminazione dati: [progetto con le scelte del committente del 22/10](v5/fase0-deletion-design-20261022.md). Lotto 1 backend documenti implementato e verificato offline ([report](v5/cestino-lotto1-report-20261023.md)), in PR. Restano lotto 2 pagina Cestino (frontend), lotto 3 schede/storia, casa e account, ciclo dei backup.
2. DB di test dedicato e permanente, utile prima di toccare le eliminazioni.
3. Audit npm P0 delle dipendenze ([backlog](backlog.md)).
4. Attività del committente: verifica proposte caffè, BL-04 su telefono.

## Qualità documentale prima del pilota

La Fase 0 qualità AI generale resta non promossa. Campagne sintetiche e singolo PDF anonimizzato del caffè sono evidenze differenti: non dimostrano riconoscimento universale o produzione pronta. Correzioni offline di evidenze, ruoli economici/date, acconto/saldo e generalità delle regole restano soggette ai criteri e ai gold esistenti. [Archivio dello stato](project-status-history-20261023.md), [campagna v24](v5/fase0-quality-v24-campaign-20261023.md).

Una futura prova sui reali richiede documenti e dati corretti concordati, consenso specifico e limiti distinti. Nessuna chiamata AI, promozione di gate o salvataggio canonico autorizzati dal refactoring.

## Attività di prodotto ancora distinte

- Verifica del committente sulle proposte del PDF caffè: dati leggibili mancanti, varianti e stanza effettiva; acquisto proposto secondo la nuova regola degli ordini, nessun pagamento, consegna o garanzia dedotti.
- BL-04 su telefono reale con accesso di sviluppo concordato; conversione HEIC rinviata dal committente.
- Campagna qualità AI/eliminazione dati Fase 0 e test DB permanente dedicato richiedono il proprio incarico. Il runner temporaneo non istituisce quel DB.
- Sicurezza, recovery/export, qualità per famiglie e restanti attività di prodotto: consultare il backlog e le decisioni, preservati; questo indice non li dichiara completati.

## Vincoli per i prossimi lotti

Solo backend-v5/frontend-v5 e documentazione pertinente. Nessuna AI/email a pagamento o DB reale, modifica .env, reset/clean, force push, rimozione worktree o cancellazione dei 104 StoredFile. Conservare il lavoro legacy e il collaudo dell’utente. Ogni nuova ottimizzazione deve mantenere fonte/versione/SHA, privacy, CSRF, membership e idempotenza.

## Protocollo multi-pagina — lotto offline 24 ottobre

[Schema di spesa condiviso e prove](v5/protocollo-multipagina-offline-20261024.md): contratto espanso identico per 1–20 pagine, senza modifiche a gold, evidenze o conferme. Protocollo v30 distingue la nuova preparazione. Il rifiuto Samsung resta incerto e non ritentato; accettazione remota non verificata. Nessun deploy o AI, PR separata verso il consolidamento e merge al committente.
