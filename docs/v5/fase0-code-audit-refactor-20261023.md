**Seguito R06/R09:** [ricognizione conclusa e archivi documentali verificati](fase0-maintenance-boundaries-20261023.md); componenti conservati deliberatamente, nessun ritiro UX implicito.

**Seguito R08:** [protocollo provider separato](fase0-provider-protocol-refactor-20261023.md), prompt/schema e richieste equivalenti; 300 onboarding, 24 qualità, 16 guardie offline. Nessuna nuova chiamata AI.

**Seguito R04:** [conferma transazionale separata per fasi](fase0-confirmation-orchestration-refactor-20261023.md), stessa transazione/ordine/errori; 495/495 HTTP/DB sintetici.

# Audit del debito tecnico V5 e primo lotto di refactoring

**Seguito R03:** proiezione pura delle spese e presentazione della checklist separate nel [secondo lotto](fase0-editor-review-refactor-20261023.md); seguono gli [helper di ripristino/compilazione](fase0-editor-compilation-refactor-20261023.md). Rilievo parzialmente affrontato, altri editor ancora aperti. Le misure e le verifiche sottostanti restano quelle dell’audit iniziale.

**Seguito R04:** [validazione del singolo campo backend separata](fase0-backend-field-validation-refactor-20261023.md), con criteri/errori invariati e verifica differenziale offline. Ora separati anche [quantità/prezzi/totale](fase0-backend-purchase-validation-refactor-20261023.md), con criteri ed errori invariati, 20.672 confronti e 495/495 HTTP/DB sintetici. Conferma e altre validazioni ancora aperte.

**Seguito R07:** [ingresso offline unico implementato e verificato](fase0-offline-test-harness-20261023.md), con guardie Node/Prisma, cluster nuovo e 495/495 HTTP/DB, incluso riavvio del ledger. Nessun DB permanente istituito.

23 ottobre 2026, Codex. Base esaminata: 0422af6d9a287c0584a0d7699e6b60a1f7909c15, branch codex/fase0-ai-quality-v3, HEAD/upstream 0/0 dopo fetch. Nessuna integrazione con main. Incarico: verificare gli accumuli nel codice e procedere con interventi pratici verificabili.

## Metodo e perimetro

Applicate le skill esterne lette integralmente: [tech-debt-portfolio](https://github.com/proflead/codex-skills-library/blob/master/skills/planning/tech-debt-portfolio/SKILL.md), [refactor-roadmap](https://github.com/proflead/codex-skills-library/blob/master/skills/planning/refactor-roadmap/SKILL.md), [simple-refactor](https://github.com/proflead/codex-skills-library/blob/master/skills/planning/simple-refactor/SKILL.md). Copie locali nella cartella di lavoro della chat, scaricate con skill-installer; nessuna installazione globale o esecuzione di script della libreria. Sono brevi procedure di classificazione, piano e modifiche reversibili, non scanner automatici o certificazioni.

Inventario AST TypeScript di backend-v5/src e frontend-v5/src, import relativi statici/dinamici, distinzione dei type-only, misure di funzioni e build Vite. Esclusi i file .test e le cartelle test; demo/testing sotto src rimangono nell’inventario e sono distinti nel controllo di raggiungibilità. Ricognizione di 148 file TS backend (10.103 righe) e 169 TS/TSX frontend (26.732 righe), prima del refactoring. Le righe fisiche includono codice molto compresso: si usano anche caratteri e diramazioni, non soglie arbitrarie di lunghezza.

Lettura manuale mirata di routing, workspace/intake/onboarding, decoder, conferma canonica, accesso per fonte/profilo, candidati, orchestratore automatico, trasporto/ledger AI, query client e comandi di test. Build di riferimento backend e frontend e lint backend eseguiti. Nessuna profilazione HTTP/DB o benchmark del dispositivo; non è una revisione completa di sicurezza, licenze, vulnerabilità o accuratezza AI. Nessun accesso al DB reale o ai documenti personali necessario all’audit.

## Esito generale

Esiste debito di manutenzione concreto, concentrato negli orchestratori e in alcuni confini tra moduli. Non emerge una ragione per riscrivere la V5 o rimuovere in massa controlli. Il volume dei commit non misura il costo runtime. Due accumuli nel codice sono stati corretti subito; separato anche il riepilogo corrente dallo storico documentale. Gli altri richiedono un piano graduale e prove specifiche.

Scala del portafoglio: impatto I e rischio dell’intervento R da 1 (basso) a 5 (alto); sforzo E da 1 (piccolo) a 5 (ampio). Sono stime qualitative di manutenzione, non ore misurate o incidenti aperti. P1 precede P2 per frequenza dei cambiamenti, criticità del dato e bisogno di evidenza; nessun P0 dichiarato.

| ID | Priorità, I/R/E | Evidenza e conseguenza | Stato / azione |
| --- | --- | --- | --- |
| R01 | P1, 3/2/1 | IntakePage importava DocumentEditorWorkspace, che importava IntakePage. Un ciclo runtime reale tra selezione rotta e contenuto incorporato. | Corretto: selettore di rotta separato da IntakeContent; editor dipende solo dal contenuto. Nessun ciclo runtime residuo nel grafo esaminato. |
| R02 | P1, 3/2/1 | HomePages → SpeseSummary → expenses/components → activities/components: una riga di riepilogo portava nel bundle iniziale anche form e hook di modifica. Confermato dalle source map, non dalla sola struttura delle cartelle. | Corretto: ExpenseRow e expensePath separati, import diretto del riepilogo, vecchi export mantenuti. Riduzione misurata dell’entry JS. |
| R03 | P1, 5/4/4 | DocumentIntakeAssistant.Inner ~33.675 caratteri e 127 diramazioni; IntakeContainer ~32.683/135; OnboardingPage.Container ~22.607/99 e DraftEditor ~21.564/78; HouseExpenseProposal ~25.648/88. Mescolano stato, ripresa, richieste, consenso e rendering. | Aperto. Estrarre prima trasformazioni pure e sezioni di presentazione; poi un controller per gestione richieste/bozza. Conservare account/home/document key, recovery, dirty state e consenso. Nessun generico framework di form. |
| R04 | P1, 5/5/4 | onboarding.service.confirm ~17.721 caratteri e 82 diramazioni; domain.productExtraction ~16.611/82. Conferme, costi, profili, fonti e diagnostica convivono in funzioni estese. | Aperto. Separare validazione per campo/articolo e operazioni transazionali con contratti interni espliciti. Mantenere la singola transazione, lock, controlli fonte prima/dopo e idempotenza. Non dividere le scritture in transazioni autonome. |
| R05 | P1, 4/5/3 | candidates.ts costruisce per ciascun candidato target, profilo, posizione e stanze; project/safeReview e automatic.service.view rivalidano fonti/target per elemento. Numero di round trip cresce con elementi/pagine. Sono chiamate visibili nel codice, non latenza misurata. | Misurazione necessaria. Contare query su dataset sintetici 1/10/50 candidati e più fonti; poi preletture batch con gli stessi filtri account/casa/visibilità/versione/SHA. Nessuna cache trasversale a utenti o revoche. |
| R06 | P2, 2/2/2 | BatchProposals, PendingUploads, ObjectsSummary e DocumentCollectionFilters non risultano raggiungibili dall’ingresso reale, inclusi import dinamici; sono assenti da tutte le source map di produzione. Alcuni restano coperti da test isolati. | Candidati obsoleti, non eliminati. Confermare l’intento UX e cercare entry esterne prima di ritirarli con i relativi test/documenti. Rimuoverli ridurrebbe manutenzione, non il bundle già privo di questi moduli. |
| R07 | P1, 4/4/3 | Molti script test:*-db/test:integration caricano .env; altri harness offline duplicano creazione cluster, copia schema, blocco fetch e lifecycle. npm test backend usa dist senza build automatica. | Implementato nel [lotto R07](fase0-offline-test-harness-20261023.md): alias generici ora protetti, build automatica, allowlist/env/guardie e cleanup del cluster posseduto verificati. Per i DB usare i nuovi parametri espliciti della guida; nessun DB permanente istituito. |
| R08 | P2, 3/4/3 | anthropic-provider.ts concentra schema compatto, espansione delle evidenze, prompt esteso con policy per molte famiglie e decoder. Le istruzioni si sono accumulate nello stesso modulo. | Aperto. Separare sezioni del prompt/schema e relative responsabilità preservando prima la stringa byte per byte; qualsiasi revisione semantica richiede versionamento, regressioni e una nuova misura autorizzata distinta. Nessuna riduzione di validazioni per ottenere più accettazioni. |
| R09 | P2, 3/2/2 | project-status alla base ha 569 righe e 98 sezioni di checkpoint. Le parti storiche contengono stati superati; architettura e roadmap conservano ampie sezioni legacy/storiche, pur segnalate. | Primo passo completato: project-status corrente separato da un archivio integrale dei 98 checkpoint alla base, nella stessa cartella per preservare i link relativi. Restano roadmap/architettura e altri documenti storici da valutare separatamente; nessun esito storico riscritto. |
| R10 | P2, 3/3/3 | api/client.ts 1.135 righe, ~48 kB sorgente, molte aree funzionali; presenti client specialistici separati e tipi frontend più permissivi dei domini server. | Aperto. Separare metodi per dominio mantenendo un solo trasporto auth/CSRF/errori/idempotenza e la facciata pubblica. Rigorosi controlli server restano l’autorità; niente copia automatica di tutte le validazioni nel client. |

I conteggi delle diramazioni sono euristiche AST (if/ternari/case/catch/cicli, incluse funzioni annidate), non complessità ciclomatica certificata; funzioni annidate non vanno sommate come lavoro distinto.

## Cosa non è un problema dimostrato

- I due gruppi ciclici backend rilevati dal grafo ingenuo comprendono import type-only (domain e tipi DTO): non sono cicli di esecuzione del JavaScript emesso. Non giustificano un refactoring urgente.
- Non risultano import runtime diretti dal legacy backend/frontend nel sorgente V5 esaminato; le due generazioni non vanno fuse o eliminate sulla sola base del nome.
- Strict/noUnusedLocals/noUnusedParameters sono già attivi; molte regole monetarie, calendari e controlli delle fonti sono già centralizzati. Non introdurre utility generiche per normalizzazioni con significati diversi.
- Nessun blocco identico cross-file sopra la soglia euristica del primo passaggio AST; questo non esclude duplicazioni semantiche. Le ripetizioni dei controlli ai confini di lettura/conferma/replay possono essere difesa necessaria.
- PDFJS è già caricato dinamicamente e il suo chunk resta invariato. Nessun modulo test/demo compare nell’entry JS di riferimento.
- Non dimostrate perdite di memoria, query lente o regressioni di reattività sul PC/telefono; non attribuire miglioramenti di latenza alle sole dimensioni del bundle.

## Interventi pratici eseguiti

### R01: dipendenze del workspace in una direzione

IntakePage resta l’ingresso compatibile con le props precedenti, decide quando aprire DocumentEditorWorkspace e ne conserva la key account/casa. Il nuovo IntakeContent contiene l’adattatore del caricamento e mantiene la key interna account/casa; il workspace lo monta con la key documento già esistente. I corpi di IntakeContainer e OriginalPreview sono identici alla base, dopo normalizzazione dei soli fine riga. Nessun cambiamento ai payload, retry, controlli o selezione automatica.

Il test del workspace cambia soltanto percorso/nome del componente simulato per seguire il nuovo confine; nessuna asserzione, timeout o scenario rimosso. La suite IntakePage con routing reale mock continua a esercitare entrambi gli ingressi.

### R02: riga spesa separata dai form

ExpenseRow.tsx contiene solo riga, costruzione percorso e stili già usati. I corpi di ExpenseRow ed expensePath sono identici alla base. expenses/components li riesporta per non rompere gli import esistenti; SpeseSummary usa il modulo leggero direttamente. Nessuna logica monetaria, controllo accessi, chiamata HTTP o azione utente cambia.

Misura della stessa build Vite di produzione, stessi lockfile/configurazione/macchina:

| Misura | Prima | Dopo | Differenza |
| --- | ---: | ---: | ---: |
| Entry JavaScript minificata | 507.951 byte | 479.496 byte | −28.455 byte (−5,60%) |
| Entry gzip, stessa compressione Node | 156.490 byte | 147.622 byte | −8.868 byte (−5,67%) |
| Somma di tutti i chunk JS | 1.857.135 byte | 1.859.649 byte | +2.514 byte (+0,14%) |

È soprattutto uno spostamento del codice fuori dall’avvio, non una cancellazione dell’intera applicazione: il piccolo aumento totale include separazione dei moduli e collegamenti dei chunk. I moduli dei form attività/spese non compaiono più nella source map dell’entry; rimangono disponibili nelle sezioni che li usano. Il warning della entry oltre 500 kB scompare senza cambiare la soglia. La durata del build non viene usata come benchmark: cache e carico differiscono.

### R09: stato corrente e archivio fedele

Il contenuto di project-status alla base è conservato integralmente in docs/project-status-history-20261023.md, con confronto contro git show della base: entrambi i blob Git sono 515f600f20ff4b78912f8eb932bcbb7ff775ec46. Essendo nella stessa cartella, i link relativi mantengono la stessa risoluzione. Il nuovo stato corrente riporta interventi e verifiche di questo lotto, esito caffè/limiti/consenso consumato, vincoli e prossimi passi. L’archivio conserva le evidenze degli altri agenti e le baseline storiche; non si eliminano decisioni o risultati delle campagne.

## Piano dei lotti successivi

1. **R03, estrazioni pure/frontend**: una responsabilità alla volta da DraftEditor/HouseExpenseProposal, senza cambiare payload o hook di accesso. Confrontare comportamento su conferma parziale, ripresa durevole, ordine/saldo/acconto, account/casa diversi e ricaricamenti; typecheck/lint e mock completa a fine lotto.
2. **R04, validatore/backend**: prima estrazione di validazione del singolo campo mantenendo ordine degli errori e diagnostica. Onboarding completo, ordinari e guard offline; non cambiare gold, prompt o soglie. Per conferme transazionali, DB temporaneo nuovo e regressioni privacy/idempotenza/concorrenza prima e dopo.
3. **R07, ingresso test offline**: consolidare un harness alla volta con confronto dei conteggi degli scenari e prova di rifiuto dei DB non autorizzati; preservare i dati temporanei utili alla verifica dell’utente.
4. **R05, query**: introdurre conteggi misurabili su fixture generali, poi eventuale batch reading con equivalenza delle risposte per source visibility/SHA/revoche. Nessuna rimozione preventiva dei lock per inseguire velocità.
5. **R06/R09, ritiro codice e documentazione**: decidere quali percorsi sono realmente dismessi, archiviare riferimenti senza perdere l’evidenza. R08/R10 successivamente, evitando un unico PR/commit con cambi funzionali e strutturali mescolati.

Ogni lotto deve avere differenze limitate, verifica adeguata, documentazione e commit autonomo; rollback del proprio commit possibile senza reset/clean né modifiche al lavoro altrui. Le stime vanno aggiornate con l’evidenza, non usate come promessa di velocità o date.

## Verifiche di questa sessione

- Baseline backend build e lint: superati; backend prodotto invariato, suite backend/HTTP/DB non ripetute e non dichiarate nuove.
- Primo refactoring: typecheck/lint frontend e **76/76 test mirati** in quattro file, senza retry configurato.
- Entrambi i refactoring: build Vite di produzione prima/dopo, confronto dei quattro corpi spostati e grafo runtime senza cicli nel perimetro esaminato.
- Typecheck/lint finali: superati. Suite mock completa finale: **844/844 test, 102 file, 480,95 secondi**, comando npx vitest run --project mock --maxWorkers 2 --retry 1. Nessuna asserzione, timeout o scenario rimosso/allentato.
- Nessuna prova UI con browser o nuovo salvataggio nella casa di collaudo in questo incarico; risultati caffè e servizi isolati preesistenti preservati. Nessuna AI/email, .env, DB/API/storage reale, main, gold/ledger sintetici, migrazione o deploy. File sporchi preesistenti e 104 StoredFile non toccati.
