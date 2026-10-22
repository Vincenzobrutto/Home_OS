# Fase 0 — campagna AI sui 52 sintetici, 22 ottobre 2026

Campagna `fase0-quality-v3-20261022-synthetic-01`, autorizzata esplicitamente dal committente sui **soli 52 originali sintetici**, tetto **12 USD e 150 chiamate Messages**, nessun retry incerto e nessun documento reale. [Ricevuta congelata](fase0-quality-v3-authorization-20261022.json), hash `84812c5db495ccab13a80093b0e973be2aef9edec7fcf0b9714c4cc9d6eac221`. Questa autorizzazione è successiva ai report offline e non amplia le quote dell’app o i consensi sui reali.

## Protocollo congelato prima del primo invio

Corpus/gold `corpus-v3.1`, 52 casi auditati da Codex (non conferma umana dei singoli gold). Modello configurato `claude-sonnet-5-5`, verificato via Models API (HTTP 200). Prompt `document-understanding-v22-quality`, lettura `onboarding-reading-v2`, adattatore `quality-v3-model-v1`, misure `quality-v3-measures-v1`. La ricevuta vincola hash del manifest, dei 52 originali, dei gold e del codice di preparazione/decoding/runner/ledger/scoring. Nessuna modifica del protocollo dopo il primo risultato.

Piano deterministico, massimo **148 Messages**: 52 originali × 2 esecuzioni complete (104); modalità locale sui quattro lunghi Q43–Q46 × 2 (8); modalità progressiva su scansioni Q47/Q48 e lunghi Q43/Q44 × 2 (massimo 36 prefissi). Le scansioni hanno entrambe due pagine; i due lunghi sei e otto. Le ripetizioni sono esperimenti indipendenti predefiniti per la stabilità, non retry. Il confronto a tre modalità interessa Q43/Q44; Q45/Q46 confrontano completa/locale e Q47/Q48 completa/progressiva.

Preparazione della campagna esplicita, provider `quality-v3-live`, consenso al trasferimento dei soli hash sintetici, database persistente separato `dimora_v5_quality_v3_campaign` sulla porta 55433. Nessuna API, dato, quota o processo del DB dell’app sulla 55432 è stato modificato. Nessuna email e nessun file reale letto/inviato. Il ledger esistente prenota 0,25 USD prima di ogni possibile trasferimento; esito incerto → riserva intera e arresto globale della campagna, senza reinvio. Nessun azzeramento o rilascio di riserve incerte.

Il limite di 150 riguarda le richieste Messages di analisi, come nel piano approvato. Metadata e conteggi token precedono ogni analisi con la stessa autorizzazione/fonte e sono tracciati separatamente nell’audit locale; non costituiscono analisi ripetute. Nessun retry del trasporto HTTP.

Tariffe verificate prima dell’avvio: input 2 USD, output 10 USD, scrittura cache 5 minuti 2,50 USD e lettura cache 0,10 USD per milione di token. [Documentazione ufficiale Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview). Il costo riportato è quello calcolato conservativamente per richiesta dall’usage del provider, non una fattura del conto Anthropic.

## Misure e limiti

Prima del primo invio sono stati completati i contatori per tipo documento, identità/tipologia oggetto, importo/data/fornitore/periodo, P.IVA, marca/modello etichetta, casi difficili e impronta canonica per stabilità. Nomi prodotto abbreviati ma supportati dalla fonte possono corrispondere al soggetto gold tramite marca/modello espliciti; nessuna eccezione alla verifica della citazione. I professionisti aggiunti senza gold e gli errori di spesa automatici sono critici. Le citazioni visive sono riportate come non verificabili sul testo, mai certificate come testo locale verificato; la politica del prodotto mantiene la revisione.

Il report usa tutti i 104 slot baseline come denominatore: assenti/invalidi non diventano successi né coppie stabili. Correttezza automatica con zero decisioni automatiche è inconclusiva, non 100%. Le soglie restano quelle approvate nel piano. L’estrattore e la politica reali vengono misurati; nessun oggetto, costo o contatto viene effettivamente creato dalla campagna.

Il contatore storico `score.invented` può includere citazioni di immagini non verificabili sul testo locale. Non viene interpretato come prova di invenzione: i contatori espliciti `unverifiedVisual` e `badTextEvidence` distinguono i due casi. La politica e gli errori critici automatici restano conservativi.

Nel repository vengono conservati soltanto ricevuta, score/metadati e report. Nessun prompt, risposta grezza, testo originale o credenziale. Il ledger persistente e l’audit HTTP locale conservano metadati di stato/costo e identificatori di richiesta verificati, senza body. Questo limita il dettaglio dell’analisi retrospettiva degli errori ai campi/casi e alle diagnostiche strutturali disponibili.

## Esito

Stato: **complete**. Attività pianificate concluse 120/120; prenotazioni **146/150**, liquidate **146**, incerte **0**. Costo noto **3.545746 USD**, riserva incerta **0.000000 USD**, impegnato **3.545746/12 USD**. Nessun retry incerto.

Baseline: 81/104 esecuzioni con output validato; esiti della politica `complete` 7/104 (6.73%), di cui 0 con errori critici. `complete` include l’organizzazione documentale senza creazioni: non equivale a una scrittura di oggetti/spese/contatti. Nessuna risorsa canonica è stata creata.

**Gate meccanico del protocollo congelato: NON SUPERATO**. I criteri seguenti riguardano la baseline completa; gli esperimenti di lettura sono analizzati separatamente. Nessuna promozione automatica del pilota dai soli dati sintetici.

| Criterio | Risultato | Soglia | Esito |
|---|---:|---:|---|
| Tipo documento | 79/104 (75.96%) | 90.00% | non passa |
| Tipologia oggetto | 21/40 (52.50%) | 90.00% | non passa |
| Marca e modello etichetta | 0/16 (0.00%) | 90.00% | non passa |
| Importo spesa | 13/70 (18.57%) | 95.00% | non passa |
| Data spesa | 60/70 (85.71%) | 95.00% | non passa |
| Fornitore | 45/50 (90.00%) | 90.00% | passa |
| P.IVA professionista | 22/24 (91.67%) | 95.00% | non passa |
| Difficili in revisione | 10/12 (83.33%) | 100.00% | non passa |
| Errori critici automatici (baseline) | 0 | 0 | passa |
| Correttezza esiti automatici | 7/7 (100.00%) | 100.00% | passa |
| Stabilità decisione automatica | 39/52 (75.00%) | 90.00% | non passa |

Impronta canonica identica in 35/52 coppie; questa misura più severa, distinta dalla sola decisione automatica, è informativa. Coppie con entrambi gli output validi: 40/52.

La stabilità condizionata ai soli output validi è 39/40 (97,5%); il criterio congelato resta 39/52 (75%), perché le altre coppie non hanno entrambe un risultato valido. I sette esiti `complete` sono Q27, Q32, Q33 (entrambi i run) e Q34 (solo il primo), casi di organizzazione documentale senza creazioni: il loro 7/7 non misura la correttezza delle creazioni automatiche di oggetti o spese, mai osservate qui.

Il criterio importo richiede un unico `current_document_total` corretto: output invalidi, proposta assente o più candidati falliscono il criterio. **13/70 non significa che gli altri 57 importi numerici siano stati letti male**. Per le etichette tutti i 16 output sono rifiutati dalla validazione delle evidenze immagine; 0/16 misura il percorso estrazione/validazione nel suo insieme, senza dimostrare da solo un limite di lettura del modello.

### Costo per modalità

| Modalità | Prenotazioni | Liquidate | Costo noto USD | Riserva incerta USD | Pagine inviate | Media USD/richiesta liquidata |
|---|---:|---:|---:|---:|---:|---:|
| full | 104 | 104 | 2.371460 | 0.000000 | 268 | 0.022802 |
| progressive | 34 | 34 | 0.912218 | 0.000000 | 122 | 0.026830 |
| local_pages | 8 | 8 | 0.262068 | 0.000000 | 44 | 0.032759 |

Le medie per richiesta non sono costi medi per documento comparabili: il progressivo può avere più prefissi. La tabella successiva somma tutti i prefissi e le due ripetizioni per lo stesso originale.

| Caso | Completa USD (2 run) | Locale USD (2 run) | Progressiva USD (2 run) | Qualità rispetto alla completa |
|---|---:|---:|---:|---|
| Q43 | 0.070772 | 0.076602 | 0.336624 | locale: misure per campo invariate; progressiva: misure per campo invariate |
| Q44 | 0.058750 | 0.044502 | 0.432716 | locale: misure per campo invariate; progressiva: misure per campo invariate |
| Q45 | 0.082316 | 0.086636 | — | locale: non confrontabile (output assente/invalido) |
| Q46 | 0.097006 | 0.054328 | — | locale: misure per campo invariate |
| Q47 | 0.059840 | — | 0.085104 | progressiva: misure per campo invariate |
| Q48 | 0.083120 | — | 0.057774 | progressiva: non confrontabile (output assente/invalido) |

Su Q43/Q44 il progressivo esaurisce rispettivamente tutti i sei/otto prefissi per run e costa circa 4,76/7,37 volte la completa, senza arresto anticipato utile. Il costo minore di Q48 deriva dall’arresto per output invalido al primo prefisso in entrambi i run: non è un’ottimizzazione riuscita. La selezione locale costa meno su Q44/Q46 e più su Q43/Q45; su Q45 il secondo run locale è invalido. “Misure per campo invariate” riguarda i contatori confrontati, non dimostra equivalenza generale o superamento del gate. Nessuna modalità viene promossa.

### Diagnostiche e tracciabilità

Output non validabili liquidati: 26. Q39/1/full/0 analysis_invalid_output; Q38/1/full/0 analysis_invalid_output; Q29/1/full/0 analysis_invalid_output; Q36/2/full/0 analysis_invalid_output; Q40/1/full/0 analysis_invalid_output; Q37/1/full/0 analysis_invalid_output; Q38/2/full/0 analysis_invalid_output; Q48/2/full/0 analysis_invalid_output; Q40/2/full/0 analysis_invalid_output; Q39/2/full/0 analysis_invalid_output; Q48/1/progressive/1 analysis_invalid_output; Q41/2/full/0 analysis_invalid_output; Q03/1/full/0 analysis_invalid_output; Q41/1/full/0 analysis_invalid_output; Q30/1/full/0 analysis_invalid_output; Q35/2/full/0 analysis_invalid_output; Q42/2/full/0 analysis_invalid_output; Q36/1/full/0 analysis_invalid_output; Q48/1/full/0 analysis_invalid_output; Q29/2/full/0 analysis_invalid_output; Q45/2/local_pages/0 analysis_invalid_output; Q48/2/progressive/1 analysis_invalid_output; Q37/2/full/0 analysis_invalid_output; Q35/1/full/0 analysis_invalid_output; Q30/2/full/0 analysis_invalid_output; Q42/1/full/0 analysis_invalid_output

Esecuzioni con score critico, incluse modalità sperimentali: 0. Nessuna.

Usage delle risposte validate/liquidate: input totale 1765926, non cache 387942, scrittura cache 18978, lettura cache 1359006, output 258643 token. Le risposte con usage incerto non sono trasformate in costo zero.

Dispatch HTTP tracciati: models 146, count_tokens 146, messages 146. Risposte HTTP non-2xx: 0. Nessun body è nel log.

[Risultati macchina e score per caso](fase0-quality-v3-results-20261022.json). Ledger e audit completi restano nel percorso locale di lavoro della campagna, conservato e spento a fine verifica; non nel DB dell’app.

Le diagnostiche baseline distinguono Q03/1 (struttura wire), Q29/Q30 (evidenza testuale), Q35–Q42 (evidenza immagine), Q48 (evidenza PDF visiva), entrambi i run salvo Q03. Negli esperimenti si aggiungono Q45/2 locale (wire) e i primi prefissi di Q48 (evidenza). Sono 23 invalidi baseline più tre sperimentali. Nessuna risposta grezza è conservata: la causa precisa dei rifiuti richiede riproduzioni offline, senza indebolire le validazioni o ritoccare il gold congelato.

### Verifiche operative finali

Prima degli invii: build e lint verdi, `npm run test:quality-v3` **24/24**, `npm run test:quality-v3-live-guards` **10/10**. Le suite generali backend e frontend non sono state ripetute in questo passaggio; gli esiti precedenti restano nei checkpoint offline.

Dopo il completamento: riavviato soltanto il cluster sintetico persistente, verificate in sola lettura 52 fonti private con SHA autorizzati, consensi/provider della campagna, 146 tentativi tutti liquidati e somma esatta di 3.545746 USD. Zero `HomeObject`, `HomeExpense`, `HomeContact` nello scope. Eseguito nuovamente l’ingresso del runner sulla campagna conclusa **con rete disabilitata**: zero nuove richieste HTTP e zero nuovi tentativi. Verificati hash di corpus/gold/codice e piano rispetto alla ricevuta, senza modifiche. Cluster poi spento, file e ledger conservati. [Attestazione macchina della verifica](fase0-quality-v3-verification-20261022.json).

Gli hash del codice nella ricevuta riguardano i byte del checkout usato nella campagna: la normalizzazione LF/CRLF di Git può far rifiutare un checkout successivo, pur con sorgente equivalente. Il rifiuto è prudenziale e non autorizza rigenerazione della ricevuta o reset del ledger; le verifiche qui riportate riguardano il checkout originale conservato.

### Baseline per caso

| Caso | Output validi / 2 | Decisioni run 1 / 2 | Critici | Costo noto USD |
|---|---:|---|---:|---:|
| Q01 | 2/2 | review / review | 0 | 0.063861 |
| Q02 | 2/2 | review / review | 0 | 0.059841 |
| Q03 | 1/2 | output invalido / review | 0 | 0.028168 |
| Q04 | 2/2 | review / review | 0 | 0.042886 |
| Q05 | 2/2 | review / review | 0 | 0.055024 |
| Q06 | 2/2 | review / review | 0 | 0.057962 |
| Q07 | 2/2 | review / review | 0 | 0.052640 |
| Q08 | 2/2 | review / review | 0 | 0.041676 |
| Q09 | 2/2 | review / review | 0 | 0.047244 |
| Q10 | 2/2 | review / review | 0 | 0.039562 |
| Q11 | 2/2 | review / review | 0 | 0.068780 |
| Q12 | 2/2 | review / review | 0 | 0.073060 |
| Q13 | 2/2 | review / review | 0 | 0.069666 |
| Q14 | 2/2 | review / review | 0 | 0.058678 |
| Q15 | 2/2 | review / review | 0 | 0.059530 |
| Q16 | 2/2 | review / review | 0 | 0.056604 |
| Q17 | 2/2 | review / review | 0 | 0.044620 |
| Q18 | 2/2 | review / review | 0 | 0.075024 |
| Q19 | 2/2 | review / review | 0 | 0.039250 |
| Q20 | 2/2 | review / review | 0 | 0.036090 |
| Q21 | 2/2 | review / review | 0 | 0.042280 |
| Q22 | 2/2 | review / review | 0 | 0.060502 |
| Q23 | 2/2 | review / review | 0 | 0.038932 |
| Q24 | 2/2 | review / review | 0 | 0.043290 |
| Q25 | 2/2 | review / review | 0 | 0.053092 |
| Q26 | 2/2 | review / review | 0 | 0.047146 |
| Q27 | 2/2 | complete / complete | 0 | 0.036556 |
| Q28 | 2/2 | review / review | 0 | 0.028680 |
| Q29 | 0/2 | output invalido / output invalido | 0 | 0.039062 |
| Q30 | 0/2 | output invalido / output invalido | 0 | 0.044426 |
| Q31 | 2/2 | review / review | 0 | 0.023940 |
| Q32 | 2/2 | complete / complete | 0 | 0.018986 |
| Q33 | 2/2 | complete / complete | 0 | 0.024420 |
| Q34 | 2/2 | complete / review | 0 | 0.020800 |
| Q35 | 0/2 | output invalido / output invalido | 0 | 0.023862 |
| Q36 | 0/2 | output invalido / output invalido | 0 | 0.022622 |
| Q37 | 0/2 | output invalido / output invalido | 0 | 0.022792 |
| Q38 | 0/2 | output invalido / output invalido | 0 | 0.022522 |
| Q39 | 0/2 | output invalido / output invalido | 0 | 0.022802 |
| Q40 | 0/2 | output invalido / output invalido | 0 | 0.034492 |
| Q41 | 0/2 | output invalido / output invalido | 0 | 0.022822 |
| Q42 | 0/2 | output invalido / output invalido | 0 | 0.022762 |
| Q43 | 2/2 | review / review | 0 | 0.070772 |
| Q44 | 2/2 | review / review | 0 | 0.058750 |
| Q45 | 2/2 | review / review | 0 | 0.082316 |
| Q46 | 2/2 | review / review | 0 | 0.097006 |
| Q47 | 2/2 | review / review | 0 | 0.059840 |
| Q48 | 0/2 | output invalido / output invalido | 0 | 0.083120 |
| Q49 | 2/2 | review / review | 0 | 0.028648 |
| Q50 | 2/2 | review / review | 0 | 0.041394 |
| Q51 | 2/2 | review / review | 0 | 0.030152 |
| Q52 | 2/2 | review / review | 0 | 0.032508 |

## Conclusione e limiti

La campagna misura il protocollo congelato, senza correzioni o nuovi invii per migliorare gli esiti. Qualunque difetto emerso va corretto offline, versionato e valutato in una nuova campagna esplicitamente autorizzata; non modifica retroattivamente questi risultati. Nessuna modalità viene adottata automaticamente sulla sola convenienza economica. La fonte completa del prodotto resta predefinita.

I 52 sintetici costituiscono un cancello per il pilota, non una stima di affidabilità generale. La tappa sui 10–15 reali resta esclusa: richiede scelta/gold confermati, consenso al trasferimento e tetto separati. Il gate non superato blocca il pilota; il budget residuo non autorizza una nuova campagna o ulteriori esperimenti.
