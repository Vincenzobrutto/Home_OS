# Roadmap corrente — Dimora V5, 23 ottobre 2026

**Spese — dettaglio riparazioni nel Riepilogo:** rimossa la vecchia esclusione di repairs_works e la nota sul raggruppamento per lavoro, superata dalla PR #64. Righe di categoria da byCategory e totali server invariati. Regressione prima rossa e poi verde; gruppo 47/47 offline, typecheck/lint/build verdi; lotto chiuso e area liberata. [Report](v5/spese-riepilogo-riparazioni-20261026.md). App invariata, merge al committente.

**Spese — pagina unica attiva:** implementazione frontend del layout scelto dal committente, periodo Anno/Mese/Intervallo, elenco/riepilogo affiancati e analisi mobile espandibile. Aggregati completi del server e confronti per gruppo con gli stessi filtri; nessuna somma di pagine parziali. [Report e verifiche](v5/spese-pagina-unica-20261027.md). PR #68 integrata e frontend attivato a68113f5; build e39/39 HTTP statici/anonimi verdi, API/PostgreSQL e guardie preservati. [Consegna](v5/spese-pagina-unica-rilascio-20261027.md). Verifica finale del committente; nessuna AI o scrittura applicativa durante il rilascio.

**Spese — aggregati successivi separati:** subtotali completi per mese, aggregati per oggetto, filtro bollette senza mese fattura, ricerca estesa oltre descrizione/fornitore e confronto per gruppo in una sola risposta. Da progettare nel backend; non simulati sul dataset parziale del frontend.


**Gruppi Spese attivi:** PR #64 integrata su approvazione a ccc8469; API/frontend aggiornati insieme, cluster esistente ripristinato senza migrazioni. Build e34/34 HTTP statici/anonimi verdi; nessuna AI o scrittura applicativa eseguita. [Consegna e limiti](v5/spese-gruppi-rilascio-20261026.md). Verifica finale della pagina Spese al committente.


**Spese — gruppi distinti:** Acquisti separato da Manutenzione, riparazioni e lavori; collegamenti a lavori indipendenti dal gruppo. Codici e categorie salvate conservati, subtotali ricalcolati senza migrazione e totale generale invariato. [Report](v5/spese-gruppi-distinti-20261026.md). Verificato offline: backend301/301, DB temporaneo19/19, mock mirati con riesecuzione documentata del timeout, statici/build verdi. PR e merge al committente.


**Spese — Acquisti e componenti:** categoria visuale «Acquisti» per oggetti nuovi, anche in sostituzione; aiuto esplicito verso «Riparazioni e lavori» per componenti durante un intervento. Codici e classificazioni salvate invariati, nessuna riclassificazione automatica. [Report](v5/spese-acquisti-20261026.md); verifica offline e PR separata, merge al committente.

**Spese — gruppi e categorie:** etichette uniformate a «Gruppi di spesa» per i raggruppamenti ampi e «Categorie» per il dettaglio, inclusi grafico, moduli e storico. Solo presentazione, chiavi URL/payload e calcoli invariati. [Report e verifiche](v5/spese-gruppi-20261026.md); PR verso consolidamento, app invariata fino all’approvazione.


**Spese — elenco leggibile e filtri:** [report](v5/spese-leggibilita-20261026.md), [PR #60](https://github.com/Vincenzobrutto/Home_OS/pull/60). Titoli visuali delle bollette da dati confermati, importi stabili e date distinte; tipo/raggruppamento accessibili e filtri avanzati preservati. Grafico e somme server invariati. Mock completa1548/1548 in149 file, un worker/retry0, typecheck/lint/build verdi. Primo tentativo non verde conservato nel report; nessuna asserzione di privacy/idempotenza o timeout indeboliti. Solo frontend, nessun accesso ai dati reali o aggiornamento app. Collaudo visivo del candidato ancora da eseguire; merge al committente.

**Uniformare i titoli generici delle bollette già caricate:** [report](v5/bollette-titoli-servizio-20261026.md). Per le sole descrizioni generiche di servizio, usare il fornitore personale confermato; suffissi legali espliciti normalizzati a video, titoli specifici preservati. Nessun cambiamento dei dati o rilettura automatica degli originali. Nuovi23/23, regressioni 260/260 in 27 file e typecheck/lint/build verdi; PR con merge e attivazione al committente.

**Nomi progressivi delle bollette:** [report](v5/bollette-nomi-progressivi-20261026.md). Superato il requisito visuale di fornitore e mese insieme: dati singoli utilizzabili separatamente, fallback Bolletta e filename, titoli personalizzati preservati. Nessuna deduzione da altre date o scelta tra più spese. Nuovi16/16, regressioni 237/237 in 25 file e typecheck/lint/build verdi; solo frontend, app invariata e merge al committente.

**Nomi parlanti estesi ai completati:** [lotto](v5/documenti-nomi-parlanti-20261026.md), fonte verificata67c3fa5. Fatture, ordini, ricevute e documenti specifici possono presentare tipo, oggetti e dati personali confermati già disponibili; bollette, originali e titoli personalizzati preservati. Nuovi35/35, regressioni221/221 in23file e typecheck/lint/build verdi. Solo frontend, nessuna lettura o bonifica reale; app invariata e PR con merge al committente.

**Rilettura locale delle bollette:** [lotto separato](v5/bollette-rilettura-locale-20261025.md), proposta temporanea con differenze e applicazione esplicita dei soli campi selezionati al form. Nessun nuovo documento/spesa, nessuna sovrascrittura della bozza salvata; lettura e applicazione bloccate se fonte/accesso/form cambiano. Mirata111/111, fixture5/5 e typecheck/lint/build verdi; mock completa1437/1437 in139file sulla fonte definitiva0b5d7e0, zero saltati/retry0. [PR #53](https://github.com/Vincenzobrutto/Home_OS/pull/53) pronta per revisione, push verificato. PR #53 integrata su approvazione a44cd449: frontend aggiornato e16/16 HTTP anonimi verdi, API/PostgreSQL preservati; nessuna scrittura automatica.

**Titoli leggibili dei documenti completati:** [lotto e report](v5/documenti-titoli-completati-20261025.md), fonteefade50. Nome visuale per unica bolletta completata e unica spesa personale attiva con fornitore/mese fattura espliciti; titoli personalizzati e originali preservati, nessun backfill.24/24 nuovi test, backend301/301 e50/50 DB temporaneo, statici frontend verdi; mock completa1461/1461 in141file, zero saltati/retry0. [PR #54](https://github.com/Vincenzobrutto/Home_OS/pull/54) integrata su autorizzazione a a8de901 e attiva nell’app insieme alla rilettura.18/18 HTTP statici/anonimi verdi, API/frontend ricompilati e schema invariato; PostgreSQL preservato, nessun backfill o salvataggio automatico.

**Mese fattura distinto dai servizi:** [nuovo lotto](v5/bollette-mese-fattura-20261025.md) su chiarimento del committente. Campo opzionale persistente, intestazione esplicita indipendente dal fornitore, form/riepilogo/storico separati e aggregazione sul mese fattura quando noto. Nessun backfill; un solo totale. Backend301/301, onboarding313/313 e runner temporanei18/18 +49/49 verdi; mock completa1419/1419 in137 file, fixture5/5 e typecheck/lint/build verdi, zero saltati/retry0. [PR #51](https://github.com/Vincenzobrutto/Home_OS/pull/51) pronta, push verificato e merge al committente; il rilascio futuro richiede migrazione additiva e backend/frontend coordinati, non applicati al reale nel lotto.

**Chiusura offline fase 1 bollette:** [collaudo conclusivo](v5/bollette-chiusura-fase1-20261025.md), con PDF già forniti e controllo del percorso fino all'uscita dai documenti da completare. Sei file bolletta (cinque fatture distinte, due fornitori), quattro controlli negativi; dati mancanti non inventati, un solo totale. Nessun difetto prodotto dimostrato; sole asserzioni mock aggiuntive, gruppo339/339. Suite mock completa1397/1397 in136 file, fixture5/5 e typecheck/lint/build verdi; zero saltati/retry0. Verifiche offline concluse, [PR #50](https://github.com/Vincenzobrutto/Home_OS/pull/50) con merge al committente. La prova visiva autenticata resta distinta; ulteriori layout indipendenti e storico durevole non sono implicitamente coperti. Nessuna AI, DB reale o aggiornamento app.

Bollette fase1: [traccia locale e motivi dei campi non proposti](v5/bollette-tracciabilita-20261025.md), con fonte/metodo/pagina e distinzione fra non individuato, non utilizzabile e discordante. Traccia effimera della lettura iniziale, nessun cambiamento del totale o del payload; storico durevole backend non implementato. Verifica estesa offline689/689 in47 file, typecheck/lint/build verdi; [PR #48](https://github.com/Vincenzobrutto/Home_OS/pull/48) integrata su approvazione a b6edac5 e frontend aggiornato; build e13/13 controlli HTTP statici/anonimi verdi. Prova autenticata al committente; nessuna nuova AI, migrazione o scrittura automatica.

**Fase1 scelta dal committente:** riepilogo e un solo importo per bolletta, prima generalizzazione senza catalogo fornitori, poi tracciabilità e robustezza del flusso. [Primo incremento e corpus](v5/bollette-generalizzazione-fase1-20261025.md). Dettaglio economico, consumi, contratti/tariffe e avvisi avanzati rinviati; non sono prerequisiti per migliorare il riepilogo. Importi incompatibili e dati assenti restano da confermare. Nessun aggiornamento app implicito.

Riconoscimento bollette senza catalogo fornitori: combinazioni di segnali del contratto e riepilogo fiscale univoco, sempre nella prima pagina. [Report](v5/bollette-segnali-generali-20261025.md). Mirata 209/209 e fixture 5/5 verdi; completa/statica finale in corso. App invariata; nessuna AI, modifica DB o inferenza del periodo dal mese della fattura.

Bollette: proposta locale dalla sola prima pagina, marchio clienti corroborato da contatti email/web e OCR per etichette mancanti. [Report](v5/bollette-prima-pagina-20261025.md). Implementazione e verifica del documento locale completate; statici e fixture 5/5 verdi, mock completa 1175/1175 in 131 file, zero saltati/retry0. [PR #43](https://github.com/Vincenzobrutto/Home_OS/pull/43) integrata su approvazione a 911b0fb e solo frontend aggiornato; build e 8/8 controlli HTTP statici/anonimi verdi, API/PostgreSQL preservati. Prova interattiva al committente.

Tipo documento modificabile direttamente nella riga dell'archivio: [lotto frontend e report](v5/tipo-documento-inline-20261025.md). Menu con conferma esplicita, senza nuova compilazione né modifica di titolo, collegamenti o spese; 29/29 nuovi test, mock completa1156/1156 in129 file e typecheck/lint/build verdi. [PR #42](https://github.com/Vincenzobrutto/Home_OS/pull/42) integrata su approvazione a 49635d8, hash remoto verificato e solo frontend aggiornato. Build e 7/7 controlli HTTP anonimi verdi; API/PostgreSQL invariati. Prossimo passo: prova del menu dal committente.

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

Chiusura verifica offline del lotto segnali generali: mock completa1226/1226 in133 file, mirata209/209, fixture5/5 e typecheck/lint/build verdi sulla fonte debfcc3. Prima completa1225/1226 e isolato27/27 preservati, nessuna asserzione/timeout modificati. PR #44 senza merge o attivazione; successivo audit e roadmap PR #45 da approvare, senza altro codice. [Report](v5/bollette-segnali-generali-20261025.md).

## Agenzie — 30 ottobre 2026
Prima verticale: fascicolo → dati con fonti → confronto → bozza incarico. Nucleo di dominio locale avviato; persistenza/API/UI ancora da fare. [Registro](v5/agency-worklog-20261030.md). Nessuna attivazione implicita sul prodotto o sulla demo Alessio.
