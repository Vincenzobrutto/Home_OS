# Fase 0 — nuova campagna sintetica v24, 23 ottobre 2026

Campagna `fase0-quality-v3-v24-20261023-synthetic-02`, autorizzata dal committente sui **soli 52 originali sintetici**, nuovo tetto **12 USD e 150 richieste Messages**, nessun retry incerto e nessun originale reale. Ricevuta indipendente [congelata prima dell’invio](fase0-quality-v24-authorization-20261023.json), hash `06f298195188ad3a37dbe2006f306926749ef432db344260128b5d6390fdb3c1`. La [campagna v22 precedente](fase0-quality-v3-campaign-20261022.md), i suoi file e il suo ledger restano conservati e invariati.

## Protocollo prima del primo invio

Corpus/gold **`corpus-v3.1` invariati**, 52 casi auditati dall’agente, `humanReviewed=false`: nessuna conferma umana dei singoli gold. Modello `claude-sonnet-5-5`, prompt **`document-understanding-v24-invoice-pages`**, lettura `onboarding-reading-v2`, adattatore `quality-v3-model-v1`, misure `quality-v3-measures-v1`. Congelati protocollo, piano, hash dei 52 originali, gold e codice; nessun ritocco dopo il primo risultato. Nessuna modifica di prodotto in questo incarico: si misurano le correzioni offline già consegnate in `345a35d` e `3963c4a`.

Stesso piano e stessi denominatori della precedente campagna: **104 baseline** (52 × 2 esecuzioni indipendenti complete), **8 confronti locali** (Q43–Q46 × 2), fino a **36 Messages progressivi** (Q47/Q48 scansioni, Q43/Q44 lunghi × 2), totale massimo **148**. Sono 120 attività; ogni prefisso cumulativo è una richiesta prenotata separata. Le ripetizioni baseline sono esperimenti di stabilità predefiniti, non retry. La selezione locale resta sperimentale, lettura completa predefinita.

Cluster persistente **nuovo e separato** nella directory locale di lavoro `quality-v24-live-20261023`, porta 55433, DB `dimora_v5_quality_v3_campaign`, solo account/home/fonti sintetici. Nessun reset, riuso o scrittura sul cluster della precedente campagna. Nessun accesso a API/DB dell’app sulla 55432 o a originali personali; quote dell’app e `.env` invariati (sola lettura della configurazione necessaria all’invio). Non vengono create risorse canoniche: solo fonti sintetiche e ledger di valutazione.

Riserva prudenziale **0,25 USD** prima di ogni trasferimento. Esito incerto → riserva mantenuta e **arresto globale**, senza retry. Output non validabile con usage certo → costo noto liquidato, nessuna approvazione dei dati; il singolo ciclo progressivo si ferma. Metadata e count_tokens sono autorizzati sulle stesse fonti e tracciati separatamente; il limite Messages riguarda le analisi. Nessun retry HTTP o redirect a destinazioni differenti.

Tariffe verificate prima dell’avvio: per milione di token input **2 USD**, output **10 USD**, scrittura cache 5 minuti **2,50 USD**, lettura cache **0,10 USD**. [Documentazione ufficiale Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview). Il costo viene calcolato conservativamente dall’usage per richiesta, non costituisce una fattura del conto provider.

## Misure, sicurezza e limiti

Soglie/scorer e gold restano quelli della campagna v22. I 104 slot baseline sono il denominatore anche per output assenti/invalidi; le coppie con un output invalido non sono stabili. Un corretto totale richiede un unico `current_document_total`; assenze o ambiguità non significano necessariamente lettura numerica errata. Evidenza immagine osservata ≠ testo verificato; rifiuti visivi non dimostrano da soli incapacità del modello. Nessuna asserzione di privacy, evidenza o idempotenza indebolita.

Q48 può restituire due fatture con fonti separate per pagina, numero/fornitore/data e totale autonomi; non un costo aggregato. Il percorso richiede sempre revisione. [Contratto e prove offline](fase0-q48-invoices-offline-20261022.md). La campagna applica la politica e misura le proposte, senza confermarle o scrivere oggetti/spese/contatti.

Prima dell’invio: build/lint verdi, suite qualità **24/24**, guard e regressioni del decoder **29/29** (11 guard/scorer + 18 regressioni). Dopo l’aggiunta del protocollo esplicito è stato corretto il rifiuto delle vecchie ricevute senza campo protocollo: ora restituisce l’errore strutturato previsto; nessun invio era iniziato. Verificati hash/piano e prompt v24 prima di usare la ricevuta. Suite generali e frontend non ripetute in questo incarico; gli esiti precedenti sono storici.

Nel repository soltanto ricevuta, score/metadati, attestazione e report; niente prompt, risposte grezze, originali personali o credenziali. Il log HTTP locale contiene endpoint/stato e identificatori tecnici, senza body. Questo limita la diagnosi retrospettiva delle cause. La nuova autorizzazione non copre documenti reali o altre campagne dopo questa.
## Esito

Stato: **complete**. Attività pianificate concluse 120/120; prenotazioni **148/150**, liquidate **148**, incerte **0**. Costo noto **3.562652 USD**, riserva incerta **0.000000 USD**, impegnato **3.562652/12 USD**. Nessun retry incerto.

Baseline: 101/104 esecuzioni con output validato; esiti della politica `complete` 22/104 (21.15%), di cui 2 con errori critici. `complete` include l’organizzazione documentale senza creazioni: non equivale a una scrittura di oggetti/spese/contatti. Nessuna risorsa canonica è stata creata.

**Gate meccanico del protocollo congelato: NON SUPERATO**. I criteri seguenti riguardano la baseline completa; gli esperimenti di lettura sono analizzati separatamente. Nessuna promozione automatica del pilota dai soli dati sintetici.

| Criterio | Risultato | Soglia | Esito |
|---|---:|---:|---|
| Tipo documento | 99/104 (95.19%) | 90.00% | passa |
| Tipologia oggetto | 38/40 (95.00%) | 90.00% | passa |
| Marca e modello etichetta | 16/16 (100.00%) | 90.00% | passa |
| Importo spesa | 64/70 (91.43%) | 95.00% | non passa |
| Data spesa | 63/70 (90.00%) | 95.00% | non passa |
| Fornitore | 48/50 (96.00%) | 90.00% | passa |
| P.IVA professionista | 23/24 (95.83%) | 95.00% | passa |
| Difficili in revisione | 12/12 (100.00%) | 100.00% | passa |
| Errori critici automatici (baseline) | 2 | 0 | non passa |
| Correttezza esiti automatici | 20/22 (90.91%) | 100.00% | non passa |
| Stabilità decisione automatica | 45/52 (86.54%) | 90.00% | non passa |

Impronta canonica identica in 43/52 coppie; questa misura più severa, distinta dalla sola decisione automatica, è informativa. Coppie con entrambi gli output validi: 50/52.

### Interpretazione del gate e blocchi

La copertura migliora rispetto alla v22: 101/104 output validi (prima 81), etichette 16/16 (prima 0), importi 64/70 (prima 13). **Il gate rimane non superato**: importi e date non raggiungono il 95%, stabilità 45/52 sotto il 90%, e compaiono due errori critici automatici. Nessuna promozione del pilota.

Entrambi i critici riguardano **Q15, split payment**, con ragione `automatic_when_review_expected`. I campi misurati di importo/data/fornitore sono corretti in entrambi i run, ma la politica produce `complete` dove il gold prescrive `review`. È un difetto di decisione rispetto al protocollo, non la prova di un totale numerico sbagliato. Il risultato resta critico: il gold non viene cambiato. La campagna non ha eseguito queste conferme né creato spese.

Gli altri sei importi non corretti secondo il criterio sono **Q22 × 2 run × 2 spese** e **Q48 × 2 run × 1 spesa non corrispondente per run**. Per le date si aggiunge Q20/run 2. Q22 è l’acquisto di due articoli con prezzi di riga; Q48 è il file con due fatture. Assenze, ambiguità e proposte non valide restano fallimenti. In particolare il contatore data spesa è associato a una proposta economica: una proposta assente può fallire anche se una data è leggibile altrove. Non si deduce che tutti questi numeri/date siano stati letti male.

Q48 resta in revisione e senza errore di decoding, ma ciascuna lettura completa e ciascun ultimo prefisso progressivo totalizza **1/2 per importo, data e fornitore**. Il supporto del decoder verificato con fixture non garantisce la copertura del modello. Gli score conservati non permettono di ricostruire esattamente se una seconda proposta sia assente o abbia campi non corrispondenti: niente risposte grezze e nessun reinvio diagnostico. Il primo prefisso non include ancora pagina 2 e non è una lettura completa; i confronti usano l’ultimo prefisso.

### Costo per modalità

| Modalità | Prenotazioni | Liquidate | Costo noto USD | Riserva incerta USD | Pagine inviate | Media USD/richiesta liquidata |
|---|---:|---:|---:|---:|---:|---:|
| local_pages | 8 | 8 | 0.256126 | 0.000000 | 44 | 0.032016 |
| full | 104 | 104 | 2.354642 | 0.000000 | 268 | 0.022641 |
| progressive | 36 | 36 | 0.951884 | 0.000000 | 126 | 0.026441 |

Le medie per richiesta non sono costi medi per documento comparabili: il progressivo può avere più prefissi. La tabella successiva somma tutti i prefissi e le due ripetizioni per lo stesso originale.

| Caso | Completa USD (2 run) | Locale USD (2 run) | Progressiva USD (2 run) | Qualità rispetto alla completa |
|---|---:|---:|---:|---|
| Q43 | 0.062674 | 0.073074 | 0.350936 | locale: misure per campo invariate; progressiva: misure per campo invariate |
| Q44 | 0.059742 | 0.049524 | 0.413742 | locale: misure per campo invariate; progressiva: misure per campo invariate |
| Q45 | 0.092558 | 0.093678 | — | locale: misure per campo invariate |
| Q46 | 0.085428 | 0.039850 | — | locale: misure per campo invariate |
| Q47 | 0.042602 | — | 0.112088 | progressiva: misure per campo invariate |
| Q48 | 0.047122 | — | 0.075118 | progressiva: misure per campo invariate |

Q43 e Q44 esauriscono rispettivamente tutti i sei e otto prefissi in entrambi i run, senza arresto anticipato utile; il progressivo costa circa **5,60× e 6,93×** la completa. La selezione locale costa meno su Q44/Q46 e più su Q43/Q45. “Misure per campo invariate” riguarda i contatori confrontati, non certifica equivalenza generale o superamento del gate: su Q48 resta la copertura 1/2 anche nel progressivo. Nessuna modalità viene promossa dal solo costo.

### Diagnostiche e tracciabilità

Output non validabili liquidati: 3. Q29/1/full/0 analysis_invalid_output; Q30/2/full/0 analysis_invalid_output; Q30/1/full/0 analysis_invalid_output

Tutti e tre riportano la diagnostica strutturale `stage=evidence`, `sourceMode=text`, `evidenceReason=document_title`, `stopReason=end_turn`. Il codice enum distingue il controllo fallito senza conservare titolo o estratto; non dimostra da solo se il modello abbia inventato il titolo o scelto una classificazione incompatibile con il suo estratto.

Esecuzioni con score critico, incluse modalità sperimentali: 2. Q15/1/full/0 [automatic_when_review_expected]; Q15/2/full/0 [automatic_when_review_expected]

Usage delle risposte liquidate, incluse le tre non validabili: input totale 1843296, non cache 392568, scrittura cache 19702, lettura cache 1431026, output 258510 token. Le risposte con usage incerto non sono trasformate in costo zero.

Dispatch HTTP tracciati: models 148, count_tokens 148, messages 148. Risposte HTTP non-2xx: 0. Nessun body è nel log.

[Risultati macchina e score per caso](fase0-quality-v24-results-20261023.json). Ledger e audit completi restano nel percorso locale di lavoro della campagna, conservato e spento a fine verifica; non nel DB dell’app.

### Verifica dopo riavvio e replay senza rete

Riavviato solo il nuovo cluster v24 persistente; transazione di verifica in sola lettura: **52 fonti private con hash autorizzati**, account/home/consensi sintetici, modello atteso e **148 tentativi tutti liquidati** con somma **3.562652 USD**, entro riserve e tetti. **Zero HomeObject, HomeExpense e HomeContact** nello scope. Hash di codice/gold/protocollo e piano effettivo uguali alla ricevuta. Poi eseguito il runner sulla campagna conclusa con `fetch` disabilitato: **0 nuove richieste HTTP e 0 nuovi tentativi**, audit invariato. Verifica ripetuta e cluster nuovamente spento; ledger/file conservati. [Attestazione macchina](fase0-quality-v24-verification-20261023.json).

La campagna precedente rimane separata e invariata. Nessun reset/clean, modifica `.env`, riavvio dell’API dell’app, cancellazione dei StoredFile orfani o rimozione di worktree. Gli hash del codice nella ricevuta riguardano i byte del checkout originale: la normalizzazione LF/CRLF può far rifiutare un checkout successivo equivalente. Tale rifiuto non autorizza rigenerazione della ricevuta o reset del ledger.

### Baseline per caso

| Caso | Output validi / 2 | Decisioni run 1 / 2 | Critici | Costo noto USD |
|---|---:|---|---:|---:|
| Q01 | 2/2 | review / review | 0 | 0.071862 |
| Q02 | 2/2 | review / review | 0 | 0.062782 |
| Q03 | 2/2 | complete / complete | 0 | 0.044080 |
| Q04 | 2/2 | complete / review | 0 | 0.043788 |
| Q05 | 2/2 | review / review | 0 | 0.057856 |
| Q06 | 2/2 | review / review | 0 | 0.049504 |
| Q07 | 2/2 | review / review | 0 | 0.054802 |
| Q08 | 2/2 | complete / review | 0 | 0.042938 |
| Q09 | 2/2 | review / review | 0 | 0.046986 |
| Q10 | 2/2 | review / review | 0 | 0.049384 |
| Q11 | 2/2 | complete / complete | 0 | 0.045902 |
| Q12 | 2/2 | review / review | 0 | 0.074122 |
| Q13 | 2/2 | review / review | 0 | 0.071428 |
| Q14 | 2/2 | review / review | 0 | 0.056180 |
| Q15 | 2/2 | complete / complete | 2 | 0.057972 |
| Q16 | 2/2 | review / complete | 0 | 0.049026 |
| Q17 | 2/2 | review / review | 0 | 0.058692 |
| Q18 | 2/2 | complete / complete | 0 | 0.070346 |
| Q19 | 2/2 | review / review | 0 | 0.045642 |
| Q20 | 2/2 | review / review | 0 | 0.034462 |
| Q21 | 2/2 | review / review | 0 | 0.046562 |
| Q22 | 2/2 | review / review | 0 | 0.053804 |
| Q23 | 2/2 | review / review | 0 | 0.040094 |
| Q24 | 2/2 | review / review | 0 | 0.049672 |
| Q25 | 2/2 | review / review | 0 | 0.054544 |
| Q26 | 2/2 | review / review | 0 | 0.048708 |
| Q27 | 2/2 | complete / complete | 0 | 0.037158 |
| Q28 | 2/2 | review / review | 0 | 0.033902 |
| Q29 | 1/2 | output invalido / complete | 0 | 0.038194 |
| Q30 | 0/2 | output invalido / output invalido | 0 | 0.038098 |
| Q31 | 2/2 | review / review | 0 | 0.023032 |
| Q32 | 2/2 | complete / review | 0 | 0.018298 |
| Q33 | 2/2 | complete / complete | 0 | 0.022592 |
| Q34 | 2/2 | complete / review | 0 | 0.025712 |
| Q35 | 2/2 | review / review | 0 | 0.023134 |
| Q36 | 2/2 | review / review | 0 | 0.029494 |
| Q37 | 2/2 | review / review | 0 | 0.035404 |
| Q38 | 2/2 | review / review | 0 | 0.022674 |
| Q39 | 2/2 | review / review | 0 | 0.022874 |
| Q40 | 2/2 | review / review | 0 | 0.030254 |
| Q41 | 2/2 | review / review | 0 | 0.022894 |
| Q42 | 2/2 | review / review | 0 | 0.028964 |
| Q43 | 2/2 | review / review | 0 | 0.062674 |
| Q44 | 2/2 | review / review | 0 | 0.059742 |
| Q45 | 2/2 | complete / complete | 0 | 0.092558 |
| Q46 | 2/2 | complete / complete | 0 | 0.085428 |
| Q47 | 2/2 | review / review | 0 | 0.042602 |
| Q48 | 2/2 | review / review | 0 | 0.047122 |
| Q49 | 2/2 | review / review | 0 | 0.035770 |
| Q50 | 2/2 | review / review | 0 | 0.036496 |
| Q51 | 2/2 | review / review | 0 | 0.027004 |
| Q52 | 2/2 | review / review | 0 | 0.031430 |

## Conclusione e limiti

La campagna misura il protocollo congelato, senza correzioni o nuovi invii per migliorare gli esiti. Qualunque difetto emerso va corretto offline, versionato e valutato in una nuova campagna esplicitamente autorizzata; non modifica retroattivamente questi risultati. Nessuna modalità viene adottata automaticamente sulla sola convenienza economica. La fonte completa del prodotto resta predefinita.

I 52 sintetici costituiscono un cancello per il pilota, non una stima di affidabilità generale. La tappa sui 10–15 reali resta esclusa: richiede scelta/gold confermati, consenso al trasferimento e tetto separati.

## Confronto con la baseline v22 congelata

Stesso corpus/gold, stesso modello API e piano, due esecuzioni per originale; il confronto riguarda il percorso completo modificato fra v22 e v24, non isola una singola correzione o la capacità del modello. Due ripetizioni non dimostrano un miglioramento statistico generale.

| Criterio | v22 | v24 |
|---|---:|---:|
| documentKind | 79/104 (75.96%) | 99/104 (95.19%) |
| objectType | 21/40 (52.50%) | 38/40 (95.00%) |
| labelBrandModel | 0/16 (0.00%) | 16/16 (100.00%) |
| expenseAmountCents | 13/70 (18.57%) | 64/70 (91.43%) |
| expenseDate | 60/70 (85.71%) | 63/70 (90.00%) |
| expenseSupplier | 45/50 (90.00%) | 48/50 (96.00%) |
| professionalVatId | 22/24 (91.67%) | 23/24 (95.83%) |
| difficultReview | 10/12 (83.33%) | 12/12 (100.00%) |
| criticalAutomaticErrors | 0 | 2 |
| automaticCorrectness | 7/7 (100.00%) | 20/22 (90.91%) |
| decisionStability | 39/52 (75.00%) | 45/52 (86.54%) |

Output baseline validi 81/104 → 101/104. Costo baseline completa 2.371460 → 2.354642 USD. Il costo totale include esperimenti progressivi con arresti differenti e non è da solo un confronto di qualità.

Stabilità condizionata alle coppie valide 45/50; criterio principale invariato 45/52. Importo univoco: assente, invalido o con più candidati è un fallimento, senza implicare necessariamente una lettura numerica sbagliata.

Esiti automatici baseline: Q45/2, Q33/1, Q15/1, Q33/2, Q46/2, Q03/2, Q27/1, Q11/2, Q04/1, Q46/1, Q45/1, Q32/1, Q18/2, Q03/1, Q16/2, Q18/1, Q11/1, Q29/2, Q15/2, Q27/2, Q34/1, Q08/1. Sono decisioni della politica, non scritture canoniche. I due esiti critici sono Q15 in entrambi i run; il rapporto 20/22 è la misura meccanica del protocollo, non una certificazione dei casi rimasti in revisione o invalidi.

### Q48 per richiesta

| Run/modalità/prefisso | Stato output | Importi | Date | Fornitori |
|---|---|---:|---:|---:|
| 2/progressive/2 | review | 1/2 | 1/2 | 1/2 |
| 1/full/0 | review | 1/2 | 1/2 | 1/2 |
| 1/progressive/2 | review | 1/2 | 1/2 | 1/2 |
| 1/progressive/1 | review | 1/2 | 1/2 | 1/2 |
| 2/full/0 | review | 1/2 | 1/2 | 1/2 |
| 2/progressive/1 | review | 1/2 | 1/2 | 1/2 |

## Seguito offline del 23 ottobre: Q15

Il blocco automatico split payment è stato corretto e verificato successivamente con parser Q15 e trasporto in memoria, più prove privacy/idempotenza su DB sintetico nuovo. [Report separato](fase0-q15-payment-offline-20261023.md). Queste prove non modificano i risultati, i due critici Q15, la ricevuta o il ledger qui congelati; gate sempre non superato. Nessuna nuova chiamata AI o uso del residuo autorizzato.

## Seguito offline del 23 ottobre: Q22

Aggiunta lettura locale verificata del formato Importo e della Data acquisto comune per i soggetti già citati; 300/500 EUR e 18/09/2026, senza ripartizione degli 800 EUR. [Report distinto con privacy/idempotenza](fase0-q22-lines-offline-20261023.md). Fixture/parser/scorer offline non ricostruiscono le risposte live assenti né ricalcolano i run Q22, il gate, i JSON o il ledger della campagna. Prompt successivo v25, nessuna nuova chiamata AI.
