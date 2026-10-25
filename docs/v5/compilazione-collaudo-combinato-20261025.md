# Compilazione: collaudo combinato delle PR #35 e #36

## Incarico e piano

Prosecuzione autonoma del 25 ottobre, entro le 14:00 Europe/Rome, autorizzata dal committente. Nessuna integrazione nel consolidamento o modifica dell'app avviata. Branch `codex/collaudo-combinato-20261025`, worktree nuovo dalla base remota `730b93dd76be560fd9530005c532cadd9974e2f3`; lotto registrato in `7d1b195` prima di integrare codice.

1. Combinare sul solo branch di prova le punte esatte [PR #35](https://github.com/Vincenzobrutto/Home_OS/pull/35) `9048c3b405cf4fba0df7f0d118cc895fc2460226` e [PR #36](https://github.com/Vincenzobrutto/Home_OS/pull/36) `c5411467586d0e8175497396b891de998097767e`.
2. Verificare entrambi gli ingressi con i test di ripresa, conservazione del contesto, accesso per fonte, classificazione e conferma della spesa; aggiungere i casi OCR della matrice archivio.
3. Eseguire suite mock completa, fixture sintetiche e typecheck/lint/build con ambiente ripulito, senza `.env` e senza server reali.
4. Registrare esiti e limiti, pubblicare il branch verificando il push e preparare la consegna per la decisione del committente. Nessuna attività artificiale per occupare il tempo residuo se i controlli terminano prima delle 14:00.

## Composizione

Merge locali `d04ea37` e `3347f3f`: nessun conflitto di codice. Conflitti soltanto in stato, roadmap e changelog, risolti conservando entrambi i lavori e le rispettive righe. Nessuna riscrittura della storia dei branch pubblicati; le due PR originali restano aperte e invariate.

La combinazione conserva esattamente i sorgenti prodotto delle due PR. Il commit `5860f24` estende soltanto la matrice del test archivio alle proposte con `method: ocr` nelle due viste; asserzioni, payload attesi e timeout invariati. Questi due casi simulano l'uscita del motore locale: non sono una nuova estrazione OCR di documenti reali.

Verifica dei blob Git: `DocumentEditorWorkspace.tsx` è `e01d0005c1b1f52a7168cc81947f7ee1505be799` come nella PR #35; `OnboardingPage.tsx` è `9a1d793528189e79abfd69a4ff96194741249b2c` e `standaloneBillPreparation.ts` è `4e8440e483e8dc5d6c74857b0b4ecd0cd70b60f0`, come nella PR #36. Backend e manifesti delle dipendenze non differiscono dalla base.

## Matrice di accettazione

| Percorso | Criterio |
| --- | --- |
| Archivio con documento/bozza ma senza lotto | Recupero esplicito, nessun caricamento richiesto e nessuna scrittura all'apertura. |
| Ripresa manuale o analisi già esistente | Parametri, bozza e contesto dello stesso documento conservati; nessun nuovo job AI. |
| Archivio, schede e pagina unica, testo o proposta OCR | Tipo Bolletta e sette campi della spesa coerenti; una sola organizzazione prima della conferma, zero oggetti e una spesa simulata. |
| Conferma dall'archivio | Uscita dal filtro da completare e presenza nei completati con tipo Bolletta, secondo le risposte simulate del contratto. |
| Pagina diretta | Preparazione canonica prima della spesa senza duplicare la callback del workspace. |
| Salva bozza | Nessuna conferma della spesa o classificazione finale; documento ancora da completare. |
| Importi discordanti | Nessuna somma o ripartizione; campo vuoto e avanzamento fermato con errore. |
| Fonte privata/revocata, versione/SHA diversi | Diniego e nessuna prosecuzione alle scritture successive. |
| Classificazione già presente, conflitto, proposta o rinvio preesistente | Valori confermati preservati; nessuna sostituzione implicita. |
| Risposta persa | Nessun retry automatico; recupero esplicito con corpo e chiave invariati. |

## Esiti

Verifiche sulla combinazione `5860f24`:

- Typecheck (`tsc -b --noEmit`), lint (`eslint .`) e build Vite verdi; build in 8,24 secondi.
- Progetto `fixtures`: 5/5, zero fallimenti, con fixture sintetiche locali. Include l'esecuzione del worker/WASM/modello italiano sulle immagini sintetiche e il blocco di risorse esterne, chiamate API e scritture dal worker. Non è una prova Safari o browser integrato.
- Suite mock completa: **1038/1038 in 120 file**, 831,60 secondi, zero fallimenti e zero test saltati. Un worker, retry 0, nessun aumento di timeout o modifica delle asserzioni. La combinazione non ha richiesto ulteriori correzioni di prodotto.

Le dipendenze del nuovo worktree sono installate dalla cache con `npm ci --offline --ignore-scripts --no-audit --no-fund`. I comandi usano `cleanEnvironment(process.env, 'unit')` del runner offline e una configurazione Vite esterna con `envDir` vuota e cache dedicata. Non vengono avviati server o cluster. Log e JSON locali nel task, `work/combined-checks.log`, `work/combined-fixtures.json`, `work/combined-full.log` e `work/combined-full.json`; non contengono originali del committente. I risultati dei singoli branch non vengono presentati come risultato della combinazione.

## Limiti e passaggio al committente

Solo backend simulati in memoria e fixture sintetiche. Nessuna AI, email, DB/API/storage reale, `.env`, migrazione, salvataggio reale, riavvio o accesso browser. Nessuna modifica a main, consolidamento, branch Claude o altri processi. I controlli di privacy/idempotenza nel frontend non sostituiscono il collaudo del server, che non cambia in questo lotto.

Il tipo del documento e la conferma della spesa restano operazioni distinte delle API esistenti: nessuna nuova atomicità fra le due viene dichiarata. Il test simula lo stato completato restituito dal server; altre bozze o analisi aperte sullo stesso originale possono tenerlo da completare nel prodotto.

Dopo approvazione e integrazione: verificare nell'app la ripresa dall'archivio senza ricaricare il PDF, i dati nelle schede, il salvataggio della sola bozza e infine la conferma esplicita. Controllare tipo Bolletta, assenza dai documenti da completare e assenza di spese duplicate. Queste operazioni reali non sono eseguite automaticamente.

### Prova manuale dopo l'eventuale aggiornamento

1. Aprire Documenti nella casa scelta e riprendere una bolletta da completare. Un collegamento privo di lotto deve offrire Riprendi compilazione; non deve chiedere un nuovo caricamento.
2. Controllare tipo, fornitore, importo, categoria, emissione, periodo e scadenza contro il PDF. Un dato assente o ambiguo resta da inserire/confermare: non va considerato ricavabile da ogni documento.
3. Usare Salva bozza ed esci e riaprire: il documento resta da completare e non deve comparire una nuova spesa.
4. Solo quando si desidera davvero registrare la spesa, usare la conferma finale. Controllare una spesa, zero oggetti non richiesti, etichetta Bolletta e stato restituito dal server. La sola navigazione fra schede non deve produrre questo esito.
5. Ricaricare e controllare gli stessi risultati. Se altre bozze/analisi dello stesso originale sono aperte, verificarle prima di interpretare la permanenza fra i documenti da completare come un difetto.

Il branch combinato è un possibile candidato di integrazione delle due PR; non implica la loro approvazione o chiusura. Non integrare anche i medesimi cambiamenti una seconda volta: la scelta fra candidato congiunto e integrazione delle PR singole resta al committente.
