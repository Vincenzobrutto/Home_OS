# Compilazione a schede — implementazione e collaudo comparativo

24 ottobre 2026. Branch `codex/compilazione-schede-20261024`, base consolidata `112ad051aa3c291ab56a88149af1d0beae0d0a63`. [PR #23](https://github.com/Vincenzobrutto/Home_OS/pull/23), nessun merge. Registrazione prima del codice: `cc0034f`; avvio del collaudo autorizzato e registrato in `91c117a`. [Piano e fonte della specifica](compilazione-schede-piano-20261024.md).

## Stato e decisione del committente

Il committente ha chiesto di preparare il test completo della nuova interfaccia e decidere **dopo** se sostituire quella disponibile. La pagina attuale resta quindi predefinita. La nuova presentazione si apre con «Prova la compilazione a schede» oppure `vista-compilazione=schede`; «Torna alla compilazione attuale» elimina solo quel parametro. Gli altri parametri della compilazione restano invariati. Nessun deploy nel collaudo Roma.

Per il confronto: Contatti in una scheda dedicata solo se proposti; Solo spesa soltanto nelle fatture che già dispongono di HouseExpenseProposal. Sono le ipotesi operative comunicate prima dell'implementazione; la loro adozione definitiva resta parte del collaudo. Nessun nuovo significato aggiunto alle azioni del contratto.

## Implementazione

- `compilationFlow.ts`: funzione pura dei passaggi e destinazione dei problemi. Chiavi stabili per articolo; bollette e documenti senza righe saltano Contenuto/Articoli; esclusioni complete saltano Spese, salvo una spesa globale indipendente ancora da controllare.
- `CompilationSteps`, `CompilationStepper`, `CompilationContent`: presentazione sequenziale, ritorni e Modifica dal riepilogo. ItemEditor riusato con `part=object/expense`; HouseExpenseProposal, ContactProposals e SaveSummary riusati. Contatti nel riepilogo coerenti anche con le scelte iniziali del componente esistente.
- Stato e callback rimangono in DraftEditor. Nessuna modifica a `confirm`, `confirmHouse`, `recover`, costruzione dei body, chiavi idempotenti o snapshot della fonte. `model.ts`, `apparatusSuggestions.ts`, ItemEditor e UnifiedReview non modificati.
- Pannelli visitati mantenuti montati, nascosti e `inert` quando inattivi. Restano nome, target e anche stato locale, per esempio URL del produttore. Contenuto conserva i dati nei cambi crea/escludi/crea e collega/escludi/collega; le azioni escluse continuano a usare il serializer corrente, che omette i dati non applicabili.
- Avanti controlla i problemi della scheda; il riepilogo conserva il controllo globale attuale. La bozza incompleta resta salvabile esplicitamente. Errori certi/incerti mostrano i distinti comandi di recupero esistenti, senza generare una nuova conferma. Nessuna scrittura su Avanti/Indietro.
- Scelte di Contenuto implementate come **radio native con etichetta a scheda**, anziché pulsanti aria-pressed: conservano anche l'evento change su cui il workspace basa il suo avviso di uscita. Lo stato è esposto con checked, senza sovrapporre semantiche ARIA improprie. Stepper con aria-current, titolo focalizzato e annuncio del passaggio.
- Il riepilogo riusa totali e problemi attuali; l'eventuale spesa globale viene mostrata una sola volta. Nessuna ripartizione degli importi e nessuna inferenza economica aggiunta.

Il percorso monoriga mantiene inizialmente Contenuto, per rendere disponibile la scelta di direzione e il ritorno da un'esclusione. L'abbreviazione a tre/quattro schede resta da decidere dopo il confronto, come segnalato nel piano. Il passo corrente è solo in memoria: non è stato introdotto `?passo=`, né un campo nel salvataggio. Il ricaricamento riparte da Documento e ripristina soltanto i dati già salvati. L'opzione di prova non è resa una preferenza globale e va riattivata su un nuovo documento della coda.

## Prove offline e limiti

Versione del codice fissata nel commit `3ba98353859956e376b4b3ce6be22fe18af2b8b6`. Controlli finali sul codice fissato: `npm run typecheck`, `npm run lint` e `npm run build` **superati** con ambiente sanificato e guardia offline. Suite mock completa finale: **898/898 test, 108/108 file, verde**, durata 470,12 secondi, due worker e `--retry=0`. Baseline 870 test conservata; 28 test aggiunti. Nessun test saltato nella suite completa.

Quattro confronti deep-equal nel router, tutti superati anche nella suite completa: tre righe create/link/skip e fattura lavori, bolletta, prestazione senza oggetti con spesa globale/contatti e compilazione manuale. I confronti mirati passano senza eliminare campi dal body. Prova HTTP del simulatore completata con ambiente sanificato e guardia offline: sessione/CSRF, tre proposte, rifiuto job provider, replay della review, replay della conferma e ricevuta; processo di prova chiuso. Non è una prova browser.

Una prima suite completa durante gli ultimi aggiornamenti ha riportato 889/891 e due fallimenti: il caso nuovo delle righe tutte escluse e il test del promemoria fuori dal lotto. Il primo è verde nella versione finale mirata; entrambi sono superati nella successiva suite completa a sorgenti fermi, senza retry automatici o asserzioni attenuate. Tale prima esecuzione non è usata come esito della consegna.

| Criterio | Copertura |
| --- | --- |
| 1 — sei passaggi e conferma unica | Test nel router con tre righe create/link/skip, confronto deep-equal dell'intero body fra pagina unica e schede. Documento deterministico, SHA/versioni e target invariati; nessuna normalizzazione che elimini campi dal confronto. |
| 2 — solo documento | Riapertura bozza con due passi; body senza oggetti, spese o contatti. Pagine fattura pendenti ancora bloccanti. |
| 3 — bolletta | Nessun Contenuto/Articolo; periodo, importo e unica spesa verificati nel body finale. |
| 4 — direzioni e stato | Crea/escludi/crea, collega/escludi/collega con due target distinti, nome e URL locale conservati; ritorno al renderer corrente conserva i dati del proprietario. |
| 5 — validazione e bozza | Nome assente, problemi documento e contatto, costo pendente/fallito; salvataggio incompleto senza conferma; errori bozza certi e incerti con focus e recuperi distinti. Comando comune a tutti i passi; non simulata una persistenza reale. |
| 6 — doppioni | Possibile doppione blocca l'avanzamento fino alla scelta; collegamento conserva id/versione. Errore di lookup non diventa lista vuota. I controlli/consensi del componente riusato restano invariati. |
| 7 — accessibilità | Focus h2, aria-current, passi futuri disabilitati, tastiera, pannelli hidden/inert; prova automatica in jsdom. Lettore di schermo reale non provato. |
| 8 — telefono 390 px | **Non verificato visivamente.** Riutilizzata la barra fissa del workspace, con spazio sopra la navigazione mobile e controlli minimi 44px. Browser integrato non usato per aggirare il precedente rifiuto di accesso all'origine mock. Overflow, tastiera virtuale e anteprima richiedono il collaudo visivo. |
| 9 — regressioni | Suite mock completa 898/898 e typecheck/lint/build superati. Asserzioni precedenti conservate, nessun timeout aumentato né retry automatico. |

Le prove riguardano frontend e API simulate. Non dimostrano nuove proprietà della transazione backend: questa viene preservata riusando gli stessi callback, non rieseguita contro un database reale. Gli ulteriori casi documentali della matrice del piano non vengono dichiarati collaudati end-to-end su un browser.

## Harness per il confronto nel browser

Esteso `scripts/mock-api.ts` con `--compilation` e modulo dedicato `src/test/fakeCompilation.ts`, escluso dagli import dell'applicazione. Account **solo simulato** `schede@example.test`, password **solo simulata** `password-schede-demo`. Casa chiaramente sintetica, tre proposte fisse; il processo stampa il percorso completo della bozza. Tutto sparisce quando il simulatore si chiude.

Il modulo risponde a bozza, candidati vuoti, review e conferme/ricevute in memoria. Impone identità del proprietario, CSRF, versione/fonte e chiave di replay; i test verificano rifiuti e assenza di duplicazione. Non chiama provider. Le operazioni non implementate vengono rifiutate, senza inoltro o fallback a backend reali. Le conferme del simulatore non creano oggetti canonici consultabili e non certificano il backend: servono a verificare il percorso visivo e il suo esito. Link con candidati, bollette, contatti ed errori sono coperti dal più ampio harness nel router dei test automatici; il simulatore browser non implementa intake/caricamento e tutti questi scenari.

Comandi nel solo worktree frontend dedicato, senza cambiare `.env`:

```powershell
# Terminale API simulata: porta 3101, solo se libera.
npm run mock-api -- --compilation

# Terminale UI di collaudo: impostazioni solo del processo, porta mock concordata.
# Non usare npm run dev con il suo target predefinito reale.
$env:DIMORA_API_TARGET = 'http://127.0.0.1:3101'
npm run dev -- --port 5186 --strictPort
```

La sola API simulata è stata avviata e chiusa per la prova HTTP protetta descritta sopra. La UI non è stata avviata per aggirare il blocco browser già incontrato. Prima del collaudo visivo serve l'accesso esplicito all'origine mock nel browser; non cambiare porta o browser per eludere un rifiuto. Non usare l'utenza reale Roma in questo simulatore.

## Prossimo confronto con il committente

### Aggiornamento frontend del collaudo applicativo, su incarico del committente

Il 24 ottobre il committente ha chiesto di provare il percorso nell'app attuale anziché aprire una segnalazione all'assistenza. Questo incarico supera il precedente limite del piano che escludeva qualsiasi aggiornamento del collaudo Roma: autorizza il solo frontend di prova, senza promuovere le schede a default o approvare implicitamente il merge della PR #23.

Fetch remoto eseguito; base consolidata ancora `112ad05`, branch del lotto senza divergenze remote. Nessun nuovo codice di prodotto: il renderer opt-in e il comando «Prova la compilazione a schede» sono già nel codice verificato `3ba9835`. Preparata una configurazione runtime locale, fuori dal repository, che serve quel frontend su loopback5174 e inoltra soltanto `/api/v5` all'API protetta3011, senza fallback3001 e senza leggere `.env`. Guardie del processo frontend consentono connessioni solo all'API3011. Pagina unica e ritorno dal percorso a schede conservati; nessuna scrittura durante Avanti/Indietro, nessuna nuova AI o conferma automatica.

All'avvio del lavoro, entrambi i PID precedenti del collaudo erano assenti; nessun listener su5174/3011/55432. Avviato soltanto il frontend, identità del processo e ascolto127.0.0.1:5174 verificati. **Collaudo applicativo non disponibile end-to-end:** API3011 e PostgreSQL55432 non risultano in ascolto; non sono stati avviati o modificati in questo incarico frontend. Nessun servizio altrui arrestato. Il solo avvio Vite non prova l'accesso alla bozza o la persistenza.

Nessun nuovo tentativo del browser dell'agente, nessun uso di un'altra origine per aggirare il precedente diniego5186. La prova manuale sull'applicazione viene affidata al committente dopo il ripristino dei servizi dati. Restano non verificati desktop/390px, anteprima e tastiera virtuale. Typecheck, lint e build ripetuti dopo la preparazione: tutti superati, ambiente sanificato e guardia offline; build Vite11,59s. Suite mock completa non ripetuta in assenza di modifiche al codice: resta l'esito898/898 sul medesimo codice3ba9835. Nessuna nuova suite DB. Nessun merge su consolidamento/main, modifica al lotto Claude, migrazione o dato persistito.

### Tentativo di apertura dopo il consenso in chat

Il 24 ottobre, dopo il successivo «Ok» del committente, avviati soltanto il mock su loopback 3101 e la UI su loopback 5186, con target fissato al mock, ambiente sanificato e guardia di rete locale. Il browser integrato ha nuovamente rifiutato l'apertura: un permesso salvato o una regola gestita nega l'accesso all'origine `http://127.0.0.1:5186`. Il consenso nella conversazione non ha rimosso quel blocco tecnico.

Nessuna pagina aperta, screenshot o verifica visiva acquisita. Nessuna modifica di autorizzazioni e nessun tentativo su altra porta, browser o canale alternativo. Verificata l'identità dei due processi appena creati, entrambi chiusi; porte mock nuovamente libere. Nessun altro processo o servizio fermato. Per riprendere serve risolvere il permesso sull'origine nel browser; non un ulteriore consenso generico in chat. Criterio 8 ancora non verificato, PR in bozza, pagina corrente ancora predefinita. Nessun codice modificato né nuova esecuzione dei test: restano gli esiti automatici del commit `3ba9835` sopra riportati.

### Ripristino applicativo successivamente autorizzato

Su incarico esplicito del committente, ripristinati PostgreSQL e API il 24 ottobre. Identificato il cluster esistente `pgdata-local` dal launcher originale, versione17, `postmaster.opts`, ascolto configurato127.0.0.1:55432; nessuna inizializzazione, migrazione, reset o modifica `.env`. Avviato con il `pg_ctl` già installato. Il frontend5174 aggiornato è stato preservato; API3011 avviata dal dist112ad05, con verifica delle impronte compilate e un preload locale derivato dalla guardia Roma. Per questa consultazione tutti e sette gli onModuleInit dei worker sono disattivati, incluso il classificatore locale; HTTP consente solo GET/HEAD/OPTIONS e login/logout. Upload, review e conferme bloccati; provider e rete esterna disabilitati. Nessun altro servizio fermato.

Disponibilità verificata tramite identità dei processi e tre listener loopback55432/3011/5174. API protetta: GET homes anonima401, sonde POST/PATCH/DELETE su percorso privo di handler403 con `roma_collaudo_protected`. Il primo controllo è avvenuto prima che l'API fosse pronta; dopo l'attesa di readiness le verifiche sono passate. Una precedente sonda su `/auth/me`, non presente nel contratto, non è stata usata come prova di autenticazione; verificato il percorso `/homes` del client.

Audit Prisma con transazioni READ ONLY/RepeatableRead prima e dopo l'avvio API: bozza caffè attesa ancora `open`, appartenenza a casa/documento verificata. Impronte identiche per5 oggetti,9 spese,12 stanze,1 contatto,30 documenti,22 bozze,14 job della casa; tutte le71 righe del ledger tentativi confrontate senza nuovi invii, oltre alle migrazioni. Nei log di consegna soltanto conteggi/impronte, nessun contenuto estratto o credenziale.

Predisposta nel browser integrato l'apertura della bozza con `vista-compilazione=schede`; il tool di apertura ha risposto `queued`, quindi non viene dichiarato un rendering osservato. Nessun nuovo tentativo automatizzato sull'origine5186 rifiutata. La bozza è disponibile al committente sulla5174, previa sessione applicativa valida; Avanti/Indietro cambiano soltanto lo stato locale e i comandi di salvataggio restano bloccati dal server. Nessuna nuova suite di prodotto per questo solo ripristino; restano gli esiti precedenti sul codice invariato. Collaudo visivo desktop/390px e scelta della vista predefinita ancora al committente; PR23 senza merge. Stato corrente del runtime e guardie di ripresa nel work del task, senza dati sensibili nel repository.

1. Eseguire il giro visivo desktop e 390px nel mock autorizzato, inclusi originale, ritorni, focus, bozza e riepilogo. Verificare che il piede non copra campi o navigazione, anche con tastiera virtuale.
2. Confrontare chiarezza di Contenuto, Spese, contatti ed esclusioni con la pagina unica. Il comando di ritorno permette il confronto sullo stesso proprietario del form.
3. Decidere se promuovere le schede a default e se abbreviare il monoriga; solo dopo valutare il ritiro della pagina unica. Nessun merge automatico.

Non modificati backend/API/schema, `.env`, main, consolidamento, lotti Claude, dati/personali del collaudo Roma, budget o ledger. Nessun caricamento dei PDF reali, invio AI/email, DB/API/storage reale, reset/clean/force push o rimozione di worktree.
