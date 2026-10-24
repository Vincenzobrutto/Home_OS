# Compilazione documento a schede — piano frontend

24 ottobre 2026. Piano iniziale conservato come riferimento. Il committente ha poi autorizzato la preparazione del collaudo comparativo: implementazione e risultati effettivi sono nel [report](compilazione-schede-report-20261024.md). La pagina attuale resta predefinita; la sostituzione sarà decisa dopo il confronto. I test sotto sono requisiti del piano, non risultati da presumere già ottenuti.

## Base, specifica e sovrapposizioni

- Fetch eseguito; base `origin/codex/dimora-v5-consolidata-20261023` a `112ad051aa3c291ab56a88149af1d0beae0d0a63`.
- Nuovo worktree `Dimora-V5-compilazione-schede-20261024`, branch `codex/compilazione-schede-20261024`. Lotto registrato prima del codice nel commit `cc0034f`.
- Fonte: [specifica Claude al commit esatto](https://github.com/Vincenzobrutto/Home_OS/blob/16d56176673ee61a60006f9fcf98fba38f10c294/docs/v5/compilazione-a-schede-proposta-20261024.md), branch `claude/compilazione-schede-20261024`, [PR #22](https://github.com/Vincenzobrutto/Home_OS/pull/22). Punta verificata; quattro file di sola documentazione. Letta senza merge o modifica del branch Claude.
- Letti AGENTS.md, frontend-v5/AGENTS.md, stato/lotti e architettura. Esaminati i componenti e l'assemblaggio della conferma esistenti.

| Area citata nella tabella | Riscontro prima del piano | Scelta del lotto |
| --- | --- | --- |
| apparatusSuggestions.ts / riferimento apparati | PR #17 chiusa e integrata a `703cac4`, antenato della base. File pertinenti identici al branch del lotto; la dicitura «in attesa» nella tabella è storica | Sola lettura; mantenere comportamento e test di suggerimenti |
| model.ts / ItemEditor.tsx | PR #8 integrata a `30c73a2`; file pertinenti identici alla punta del branch ordini. Nessun lotto di implementazione ancora aperto rilevato su questi file nella tabella letta | model.ts in sola lettura; riuso di ItemEditor, con eventuale adattamento di sola presentazione dopo test e ricontrollo dei lotti |
| Cestino Claude | Lotto backend ancora aperto. Anche il confronto della parte object-onboarding del branch frontend Cestino non mostra modifiche rispetto alla base | Escludere backend, documenti/cestino e client API |
| Proposta a schede Claude | PR #22 aperta, nessun codice | Fonte di specifica, non riserva di implementazione sovrapposta |

Prima di implementare: nuovo fetch, controllo dei lotti aggiornati e del diff dei file previsti. Un nuovo lotto sovrapposto richiede delimitare i file prima di modificarli. Non correggere arbitrariamente lo storico degli altri lotti.

## Obiettivo e confine del cambiamento

Sostituire la presentazione della compilazione nello spazio documenti con Documento → Contenuto → Articolo per ogni riga create/link → Spese → Contatti se proposti → Riepilogo. Restano gli stessi dati, controlli, scelte e servizi di conferma.

L'unica registrazione canonica resta la conferma finale corrente. Il percorso attuale prepara e salva anche la richiesta pendente nella bozza per il recupero: non va trasformato nella promessa di una sola richiesta HTTP. Si preservano sequenza, versioni, snapshot della fonte e chiave idempotente esistenti. Avanti, Indietro e i link fra schede non inviano conferme né salvataggi di bozza. «Salva bozza ed esci» resta un comando esplicito, anche con dati incompleti.

Operazioni esplicite già esistenti, come aggiungere un articolo o cambiare il tipo della bozza, possono già usare endpoint di preparazione della bozza: si mantengono come oggi e si verificano nei test, senza spostarle su Avanti o trasformarle in scritture canoniche parziali. Nessuna analisi o arricchimento AI parte dal montaggio/navigazione delle schede.

Solo codice frontend-v5 e documentazione di progetto. Nessuna API, schema, backend, nuova dipendenza, .env o nuova semantica di salvataggio. Nessuna AI/email a pagamento, DB/API/storage reale, migrazione o dato personale di collaudo. Main, checkout Home_OS e lotti Claude preservati; nessun reset/clean/force push o rimozione worktree.

## Componenti e stato

| Componente/modulo proposto | Responsabilità |
| --- | --- |
| CompilationSteps.tsx | Contenitore controllato: scheda corrente, navigazione, mappatura problemi, riepilogo e richiamo degli stessi callback esistenti |
| CompilationStepper.tsx | Elenco ordinato, aria-current, etichette desktop e vista compatta mobile; solo schede già raggiungibili cliccabili |
| CompilationContent.tsx | Direzione delle righe e spiegazione dell'effetto; usa azioni attuali, non un nuovo formato di conferma |
| compilationSteps.ts | Funzioni pure per elenco dei passaggi, risoluzione della chiave corrente e associazione di problemi ai passaggi |
| compilationSteps.module.css | Layout a scheda, piede mobile, originali e focus; token esistenti |
| OnboardingPage.tsx, punto DraftEditor | Sola scelta del renderer e passaggio dei dati/callback. Resta proprietario di forms, houseReviews/houseForms, contactInputs, documentOnly e recupero della richiesta |

Riusare ItemEditor con `part='object'` / `part='expense'`, HouseExpenseProposal in modalità unificata, ContactProposals, SaveSummary e reviewIssues/reviewProblem/reviewTotals. Riutilizzare documentFields, houseFields e contactFields, senza duplicare la logica di costruzione dei dati. Per i props comuni preferire un tipo derivato dal componente esistente; eventuale estrazione del tipo solo se necessaria. Non riscrivere UnifiedReview o ItemEditor per introdurre il flusso.

Lo stato canonico dei form rimane unico a monte; niente copia separata per ogni scheda. Uno stato separato di sola navigazione può contenere chiave corrente e passaggi raggiunti. Un passaggio raggiunto non significa automaticamente valido: completamento e avanzamento dipendono dai controlli attuali.

**Conservazione dei dati locali:** ItemEditor ha anche useState locali (ricerca, URL prodotto, apertura dei facoltativi); HouseExpenseProposal mantiene stato locale e invia onReview. Smontare ingenuamente i pannelli può perdere valori o azzerare controlli. Proposta iniziale: montare un pannello alla prima visita e mantenerlo montato ma nascosto/inert quando inattivo, con chiavi stabili per articolo/proposta. Conservare anche i pannelli di righe temporaneamente escluse, finché resta la stessa bozza. Se il collaudo mostra effetti indesiderati, passare a un minimo stato controllato esterno; niente nuove persistenze backend. Tutto viene azzerato al cambio account/casa/documento/bozza.

Il montaggio della parte spesa avvia i controlli duplicati già previsti. Questi possono essere pendenti o in errore: la scheda Oggetto non deve bloccarsi per un controllo non ancora avviato nella scheda Spese. La conferma finale continua a richiedere tutti i controlli rilevanti, senza ignorare richieste pendenti o fallite.

## Funzione pura dei passaggi

Interfaccia concettuale, da affinare senza modificare model.ts:

`buildCompilationSteps({ draft, forms, documentOnly, houseForms, contactInputs, analysisState, visited }) -> Step[]`

Ogni Step ha chiave stabile, tipo, etichetta, eventuale itemId/proposalId e stato di navigazione/validazione. Nessuna query, clock, scrittura o mutazione degli input nella funzione. Identificativi proposti: `documento`, `contenuto`, `articolo:<id>`, `spese`, `contatti`, `riepilogo`; mai numeri di indice come identità.

- Solo documento: Documento e Riepilogo; niente oggetti, spese o contatti nel payload, anche se rimangono form in memoria.
- Bolletta o nessun articolo: niente Contenuto né Articoli; Spese quando pertinente.
- Righe create/link: una scheda per riga aperta nell'ordine originale, senza riordinare choices. Quantità multipla conserva una scelta per esemplare come oggi; «collega» non viene ridotto a un target se il contratto ne richiede più di uno.
- Righe skip: nessuna scheda articolo né costo della riga. I valori si conservano in memoria per ripristinare la scelta, ma il serializer esistente li esclude.
- Nascondere una scheda non filtra la lista delle choices di conferma: le scelte skip/document_only restano nella richiesta esattamente come oggi. Si mantengono gli stessi callback che confermano tutte le righe aperte, non soltanto le schede visibili.
- Spese: una sola scheda con i controlli esistenti; nessuna duplicazione della spesa globale su ogni riga. Saltare quando non c'è alcun costo rilevante, tutte le righe/costi sono esclusi o è attivo solo-documento. La presenza di una spesa di casa indipendente impedisce di saltarla soltanto perché gli oggetti sono esclusi.
- Contatti: soltanto proposte aperte e ambito non documentOnly; nessun nuovo opt-in implicito.
- Analisi in corso o bozza assente/non accessibile: Documento con stato corrente; le schede successive non vengono sbloccate dall'URL.
- Quando una scelta rimuove il passaggio corrente: ritorno al precedente passaggio coerente (Contenuto o Documento), senza salto a una conferma automatica.

`stepIssues` è un adattatore di presentazione: riusa reviewIssues e i risultati HouseReview/contatti/documento, senza riscriverne i criteri. Nome, tipo e collegamenti/profilo vanno all'Articolo; prezzo/data/costo/doppioni a Spese; titolo/tipo del documento a Documento; consenso contatto a Contatti. I problemi globali (totali, copertura fatture, fonte) restano bloccanti nel Riepilogo. Un problema non classificabile resta visibile e bloccante, non viene scartato. Campo facoltativo vuoto e scelta esplicita invalida sono casi distinti: non si disattivano validazioni esistenti per far avanzare.

## Direzione delle righe e compatibilità

- «Nuovo oggetto» / «Collega» / «Non riguarda la casa» mappano a create/link/skip esistenti. I pulsanti cambiano la scelta del form, non costruiscono un nuovo payload alternativo.
- «Solo spesa» **non è sinonimo di skip**: skip esclude anche il costo. document_only, da solo, non serializza una spesa dell'articolo. Mostrarlo solo se una proposta diretta di spesa già supportata consente l'assenza dell'oggetto; usare HouseExpenseProposal e la sua scelta corrente. Nessuna HouseExpense sintetica nuova per riga, nessun oggetto fittizio, nessuna conversione di importi.
- Documenti tecnici conservano document_only e i collegamenti attuali: niente riuso ambiguo dell'etichetta «Solo spesa» per questa azione.
- Data e fornitore nella scheda Documento riusano solo dati/binding esistenti. Non introdurre campi generici nel contratto compilation; quando oggi appartengono a una spesa, mantenere quel significato e binding, oppure mostrarli come riepilogo.

**Dettaglio da validare nella progettazione:** la specifica chiede sia Contenuto per le righe sia un percorso breve che lo omette con un articolo. Propongo di implementare prima il percorso completo, verificabile e reversibile; l'eventuale abbreviazione deve mantenere disponibile la decisione di direzione e il ritorno alle righe escluse. Non dichiarare soddisfatta la scorciatoia con cinque schede né introdurre una scelta create automatica per ottenere quattro schede. Questo affinamento non modifica i criteri 1–9, ma va concordato prima di attivare la scorciatoia.

## URL e convivenza

Proposta: chiave di navigazione `?passo=articolo:<id>` facoltativa, usando replace per gli spostamenti interni. Conservare tutti i parametri esistenti: lotto/coda, filtri, compila e le chiavi oggetti-* nello spazio documenti, bozza/analisi nella rotta diretta. Resettare il passo al cambio della sorgente/bozza; parametro sconosciuto o non raggiungibile → primo passaggio consentito, mai bypass della validazione. Il passo non entra in review/compilation né nel payload di conferma.

Un refresh non recupera magicamente campi mai salvati: ripristina solo la bozza già salvata e verifica che il passo richiesto sia ancora raggiungibile. Nessuna persistenza in localStorage/sessionStorage di contenuti o consensi. Preservare i guard attuali sull'uscita dal documento e la coda «prossimo»; una navigazione interna non deve chiedere di scartare i dati.

Introdurre una scelta di rendering esplicita `single | steps` nel punto comune di DraftEditor, mantenendo stesso proprietario dello stato e gli stessi callback. Nello sviluppo, il mock opta per steps e permette prove differenziali; UnifiedReview resta utilizzabile. L'attivazione predefinita nello spazio di lavoro avviene nella versione candidata dopo parità e collaudo; il comportamento della rotta non incorporata viene verificato separatamente. Non aggiungere per ora una preferenza utente persistente o una nuova schermata tecnica. La rimozione della pagina unica è una decisione successiva, non parte automatica di questa modifica.

## Piano di implementazione dopo le decisioni

1. Bloccare le scelte di prodotto riportate sotto e ricontrollare i lotti. Fissare fixture mock e test differenziali del comportamento attuale prima di cambiare renderer.
2. Introdurre funzione pura e test di elenco, filtri, identità, problemi e URL; nessuna modifica alla serializzazione o alle scritture.
3. Aggiungere shell/stepper e schede con i componenti esistenti, mantenimento dei pannelli e feedback sul solo passaggio corrente. Una conferma soltanto nel Riepilogo; salvo-bozza accessibile ovunque.
4. Collegare la scelta di renderer nello spazio documenti, conservare originale, focus, errori, recovery e coda. L'evidenziazione dell'originale usa solo coordinate/pagine realmente disponibili e capacità già esistenti: niente rettangoli inventati né nuovo OCR.
5. Eseguire tutti i criteri sotto, più perdita risposta, fonte cambiata, revoca/cambio account e bozza incompleta. Correggere soltanto difetti riprodotti.
6. Typecheck, lint, build, mock completa verde sulla versione finale, report effettivo, aggiornamento stato/roadmap/changelog, commit, push verificato e PR pronta verso consolidamento. Nessun merge automatico.

## Test per i criteri 1–9

| Criterio | Prova e risultato richiesto |
| --- | --- |
| 1. Tre righe, sei passaggi | Fixture unica con nuovo/collega/escluso: Documento, Contenuto, due Articoli, Spese, Riepilogo. Confronto deep-equal dell'intero body di conferma tra renderer single e steps a parità di fixture/scelte. Stessi source/versioni, ordine delle scelte, metadata, contacts/houseExpenses/documentOnly e omissione dei campi. IDs/versioni deterministici nei test, non rimozione di campi «per normalizzare». Zero POST canonici prima del riepilogo, uno alla conferma. Stessa preparazione/recovery corrente; atomicità backend preservata per riuso, non ricollaudata su DB reale |
| 2. Solo documento | Due passaggi; payload identico, senza creazioni o contatti. Ripristinare ambito completo conserva i valori precedenti e non riapplica consensi |
| 3. Bolletta | Documento → Spese → eventuali Contatti → Riepilogo. Nessun Articolo/Contenuto; periodo, emissione/scadenza, importo e duplicati invariati |
| 4. Cambio scelta | create → skip → create e link → skip → link: chiavi stabili, barra aggiornata, valori/target conservati, stato locale dei pannelli conservato. Dati esclusi non serializzati. Inclusi cambio documento/account e righe aggiunte a mano |
| 5. Validazione per scheda | Nome mancante blocca l'Articolo, costo/data/doppioni bloccano Spese, contatto incompleto blocca Contatti. Bozza incompleta salvabile esplicitamente da ogni passaggio; confrontare anche il body review, senza passo o campi nuovi. Errori di salvataggio e risultato incerto restano accessibili e recuperabili |
| 6. Doppioni | Candidati pendenti, falliti, esistenti e nuova spesa distinta: stessi avvisi/consensi e payload del renderer attuale. Non trasformare un errore in lista vuota, non saltare il consenso al cambio di scheda |
| 7. Accessibilità | Focus h2 ad ogni cambio, aria-current unico, aria-pressed sulle direzioni, annunci aria-live non duplicati; tastiera, ritorni dal Riepilogo, link ai problemi e campi facoltativi. Pannelli nascosti non raggiungibili dal focus |
| 8. Mobile 390 px | Prova visiva su mock autorizzato: nessun overflow orizzontale, piede fisso non sovrapposto alla navigazione, touch target 44px, tastiera virtuale e originale richiudibile. jsdom non è prova di layout. Se il browser rifiuta l'origin, registrare il blocco senza aggirarlo e non segnare il criterio verde |
| 9. Regressioni | Nuovi test della funzione e integrazioni mock 1–7; tutti i test attuali restano significativi e invariati nelle asserzioni. Intera suite mock finale, typecheck/lint/build verdi, nessun aumento di timeout o retry usato per nascondere difetti |

Ulteriori prove differenziali: fattura con spesa globale, ricevuta/ordine singolo, più unità, documento tecnico, contatti assenti/presenti/esclusi, campi già confermati, nessuna spesa, totale manuale, pagine fattura pendenti, conferma parziale preesistente, risposta persa e doppio clic. UI-only non deve cambiare i controlli di fonte, versione/SHA, privacy o idempotenza applicati dai servizi attuali.

**Harness:** preferire mock esteso in test frontend, riusando FakeBackend per identità/documenti e handler delle API object-onboarding già impiegati nei test. Per il browser, estendere in modo esplicito il simulatore con bozze/review/candidati/conferma/recupero in memoria e marcatore mock: il mock-api attuale non implementa queste API e non è una prova sufficiente senza l'estensione. Vietati inoltro o fallback a 3001/3011 o servizi reali. Non avviare o modificare il collaudo Roma per questo lotto.

## Tre domande aperte della specifica

Sono proposte, non decisioni già approvate:

1. **Contatti in scheda propria o nel Riepilogo?** Raccomandazione: propria scheda solo se ci sono proposte; il Riepilogo mantiene conteggio e link Modifica. Opt-in attuale invariato.
2. **Dove mostrare «Solo spesa, nessun oggetto»?** Raccomandazione: solo dove il flusso attuale lo supporta davvero. L'estensione ad altri documenti non viene simulata con un'azione dal significato diverso e, se richiede un contratto nuovo, resta fuori da questo lotto frontend.
3. **Ritirare o mantenere la pagina unica?** Raccomandazione: mantenerla durante sviluppo/collaudo dietro selezione di renderer; ritirarla dopo approvazione del nuovo percorso. Mantenerla come vista esperta è possibile, ma richiede una decisione esplicita su UI e manutenzione di entrambe.

Il successivo incarico autorizza la preparazione del test completo prima di decidere la sostituzione. Per questo confronto si adottano Contatti dedicati e Solo spesa soltanto dove supportato, come comunicato prima del codice. La pagina unica resta predefinita. La PR #23 rimane sullo stesso branch; il report distingue prove automatiche superate e collaudo visivo ancora aperto.

Successivo incarico del 24 ottobre: rendere provabile il frontend nell'app attuale. Per questo solo aggiornamento è autorizzato il runtime frontend su5174 con proxy fisso all'API protetta3011; il precedente divieto di aggiornare il frontend Roma non si applica più. Restano esclusi interventi su backend, DB, AI, conferme automatiche e merge. La prova manuale richiede prima API e database disponibili; il solo frontend non costituisce un collaudo end-to-end. Dettagli e stato effettivo nel report.
