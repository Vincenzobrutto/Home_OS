# R03 — ripristino e serializzazione della compilazione

23 ottobre 2026, Codex. Lotto successivo del [piano di audit](fase0-code-audit-refactor-20261023.md), base a775a5261e92cd53ad6240199426cdb77d5e6ee8 sul branch codex/fase0-ai-quality-v3, HEAD/upstream 0/0 dopo fetch. Applicate le procedure simple-refactor/refactor-roadmap già esaminate; nessuna nuova dipendenza o installazione.

## Intervento

La costruzione della compilazione era duplicata nel salvataggio esplicito e nel percorso che precede la conferma. Anche l’applicazione del form nell’editor aperto era ripetuta prima del salvataggio e dell’arricchimento. Il nuovo modulo puro editorCompilation.ts espone tre responsabilità:

- **restoredItemForm** applica i default correnti e poi le scelte salvate, unendo le decisioni dei singoli campi. Un vecchio form senza expenseAutoState resta manuale; una scelta esplicita di revisione rimane tale. Valori vuoti/false non vengono sostituiti con proposte nuove.
- **formsWithEditing** conserva la mappa originale se nessun editor è aperto; altrimenti sovrappone soltanto il form dell’articolo in revisione.
- **compilationSnapshot** costruisce la compilazione modificabile, preservando metadati, scelta solo-documento, riferimento diretto e relativa versione, totale digitato, ordine dei contatti e form delle spese rinviate/non attualmente renderizzate. I form già rivisti sostituiscono solo quelli con lo stesso ID.

Il componente mantiene hook, versioni, richieste, lock UI e chiavi. La differenza esistente tra i percorsi è conservata: il salvataggio esplicito costruisce lo snapshot anche senza metadati; la compilazione allegata al percorso di conferma resta condizionata alla loro presenza. Un riferimento viene incluso solo nel contesto diretto come prima; omissione, null e valore sono distinti. Nessun totale viene calcolato o reinterpretato dal nuovo modulo.

Il modulo non è un validatore o un’autorizzazione: non accede a orologio, DOM, rete, storage o DB e non crea richieste pendenti. Accesso alle fonti, snapshot/versione/SHA, appartenenza alla casa, gestione dell’esito e idempotenza restano nei confini precedenti di componente e backend. Nessuna modifica a pauseAfterCompilation, alla pausa esplicita del salvataggio, al CAS o alla conferma canonica.

## Verifiche offline

- Primo gruppo mirato dopo l’estrazione: **87/87 test**, quattro file. Sei nuove regressioni permanenti portano il gruppo finale a **93/93**, cinque file. Coperti input vuoti/false, decisioni sui campi, vecchi form che non devono riattivare il costo automatico, modifica del solo articolo aperto, riferimento diretto/versione/null, conservazione dei rinvii e salvataggio senza metadati separato dalle richieste pendenti.
- **10.000 casi deterministici**, tre proiezioni per caso: confronto strutturale e JSON serializzato contro le espressioni del sorgente Git della base. Tutti equivalenti, input invariati. Verificate costruzione della compilazione, ripristino del form e override dell’editor. Sono stati software generati per l’equivalenza, non nuovi documenti o prove di accuratezza AI.
- I corpi delle funzioni **confirm, confirmHouse e recover sono identici** alla base; **48 espressioni di hook/query/chiamata API** identiche e nello stesso ordine. L’unica sostituzione di payload prima di saveDraft/enrich è l’helper puro verificato; generazione delle chiavi, ordine delle scritture e flag di pausa invariati.
- Typecheck, lint e build Vite produzione superati. Grafo runtime V5 esaminato senza cicli. **Suite mock completa finale 858/858, 104 file, 483,70 secondi**, due worker e retry massimo 1 configurato. Nessun test esistente, asserzione o timeout modificato.

L’equivalenza non copre tutti gli input possibili né sostituisce i controlli server. I test UI usano backend simulato; nessuna prova browser o HTTP/DB ripetuta e nessuna suite backend eseguita, perché il prodotto backend è invariato.

## Effetto e seguito

Ridotta la duplicazione nella preparazione degli input, senza una promessa di riduzione totale del codice o maggiore velocità. Build sullo stesso ambiente: entry JS 479.496 → 479.513 byte, chunk differito OnboardingPage 113.938 → 114.073 byte. Differenze piccole di composizione dei moduli, non benchmark di latenza; il beneficio atteso è rendere verificabili responsabilità prima immerse nel componente.

R03 rimane parzialmente affrontato: gestione asincrona e altre sezioni degli editor sono ancora estese. I due lotti R03 coprono la [proiezione delle spese](fase0-editor-review-refactor-20261023.md) e questi helper; non una riscrittura completa. Prossimo lotto proposto: R04, estrazione del validatore di un campo backend preservando ordine/codici/diagnostica, con suite offline e verifica del registro dei file usato per future autorizzazioni qualità. Nessun cambio di transazione, gold o nuova campagna AI implicito.

## Vincoli e consegna

Nessuna AI/email a pagamento, modifica a .env, DB/API/storage reale o DB temporaneo del committente, migrazione, deploy, main, gold/scorer/ledger/campagne o 104 StoredFile. Bozza caffè, file sporchi legacy e untracked estranei preservati. Aggiornati stato corrente, audit e piano senza accumulare nuovi checkpoint nello stato; commit limitato al lotto sul branch Fase 0, con verifica dell’hash remoto.
