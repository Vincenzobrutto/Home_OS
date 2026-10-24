# Compilazione a schede — riscontro mobile e più articoli

24 ottobre 2026. Seguito del [report del lotto](compilazione-schede-report-20261024.md), PR #23. Codice di prodotto invariato rispetto a `3ba9835`; aggiornamenti di questa sessione soltanto documentali. Nessun merge.

## Esito per la decisione

**Mantenere per ora le schede disponibili in prova e la pagina attuale come alternativa. Non dichiarare concluso il collaudo né ritirare definitivamente il renderer precedente.** Il percorso monoriga è stato osservato nel browser mobile emulato, mentre quello con più articoli è verificato nei test mock ma non visivamente. L'anteprima PDF risulta vuota nel browser integrato anche con la pagina attuale: problema riprodotto, non una regressione attribuita alle schede e non ancora diagnosticato nella causa.

Il committente ha confermato nella conversazione la correttezza dei dati della bozza caffè. Questa conferma riguarda il documento verificato, non l'accuratezza generale dell'estrattore o l'approvazione del merge.

## Percorso osservato nel browser

Usata esclusivamente la bozza caffè già persistita sulla5174, API3011 protetta. Un primo stato della scheda mostrava il servizio irraggiungibile; un ricaricamento ha caricato regolarmente la bozza. Non sono stati avviati altri servizi o cambiati permessi del browser in questa sessione.

Viewport impostato tramite la capability supportata a **390×844**; controllo aggiuntivo a **320×740**. Non è una prova su telefono fisico, tastiera virtuale o lettore di schermo. Override rimosso alla fine; lasciata aperta la bozza nella nuova vista, su Documento, originale richiuso.

| Verifica | Osservazione |
| --- | --- |
| Sequenza | Percorsi Documento → Contenuto → Articolo1 → Spese → Riepilogo completati senza usare salvataggi o conferme. |
| Dati | Identità caffè, marca/modello, ordine/acquisto14/06/2026 e importo499 EUR conservati. Riepilogo: un oggetto proposto, «Nessuna nuova spesa». Nessun oggetto effettivamente creato. |
| Ritorni e tastiera | Dal Riepilogo, Invio su «Modifica Articolo1» torna al titolo della scheda con i valori conservati; ritorno al Riepilogo tramite stepper. Focus osservato sul titolo h2 del passo. |
| Larghezza | A390: clientWidth e scrollWidth375; a320: entrambi305. Differenza dal viewport15px, coerente con lo spazio della scrollbar; nessun overflow orizzontale rilevato nei passi osservati. |
| Comandi | Salva bozza/Indietro/Avanti e i comandi Modifica misurati alti44px; raggiungibili con lo scroll. Barra delle sezioni mobile visibile; nei controlli osservati non copre il piede di navigazione. |
| Anteprima | Il contenitore si apre e richiude. Il PDF resta bianco anche scorrendo fino al suo interno: elemento OBJECT application/pdf con sorgente blob, circa293×464px al viewport390. Non è stato attivato Scarica originale. |
| Confronto con pagina attuale | Comando di ritorno alla pagina unica e riattivazione delle schede usati senza salvataggio. L'anteprima resta vuota anche nella pagina unica, con lo stesso contenitore. Il confronto non prova la causa del mancato rendering. |

Screenshot conservati soltanto negli outputs del task: `schede-mobile-articolo-20261024.jpg`, `schede-mobile-riepilogo-20261024.jpg`, `schede-mobile-pdf-baseline-20261024.jpg`. Non sono copiati nel repository né includono il corpo del PDF.

## Più articoli: verificato in mock, non nel browser

Ricerca con transazione READ ONLY e RepeatableRead delle bozze open dello stesso account e casa della bozza caffè: **nessuna con almeno due articoli**. Non sono state aggiunte righe alla bozza: il comando «Aggiungi un altro articolo» usa una scrittura server, incompatibile con questo incarico senza salvataggi.

Rieseguiti `compilationFlow.test.ts`, `CompilationSteps.test.tsx`, `OnboardingPage.test.tsx`: **77/77 superati**, nessun test saltato o asserzione modificata, due worker e retry0. Ambiente sanificato e guardia offline già esistente; soltanto handler mock in memoria. Tra i casi verdi:

- Tre righe crea/collega/escludi: sei passaggi e payload completo identico alla pagina unica.
- Navigazione senza scritture; campi locali conservati e ritorno a una riga esclusa.
- Due esemplari con target distinti; esclusione e ritorno a collega senza perdere il target.
- Doppioni e errori nel controllo candidati mantengono le scelte obbligatorie.
- Contatti su scheda dedicata, passi futuri non raggiungibili e pannelli precedenti hidden/inert.
- Parità integrale del body anche con spesa globale e bolletta; recupero della conferma incerta con la stessa chiave nel solo mock.

Un primo avvio nel sandbox non ha eseguito test: EPERM nella rinomina della cache temporanea, tre file non caricati, zero test. La ripetizione fuori da quel vincolo di filesystem, con le stesse guardie offline, è verde77/77. Non è un retry di test falliti o di richieste AI. Report macchina nel work del task, `schede-collaudo-multi-final.json`.

La precedente suite completa898/898 e typecheck/lint/build restano evidenze sullo stesso codice: non rieseguiti in questa sessione senza modifiche di prodotto. Nessun test DB/HTTP di integrazione lanciato.

## Integrità del collaudo e lavoro residuo

Audit READ ONLY finale confrontato con le impronte già registrate prima dell'avvio dell'API: invariati5 oggetti,9 spese,12 stanze,1 contatto,30 documenti,22 bozze,14 job della casa e tutte le71 righe del ledger tentativi, oltre alle migrazioni. Bozza caffè ancora open. Nessuna nuova AI, caricamento, conferma, modifica `.env`, migrazione o dato salvato. Le protezioni del runtime restano attive.

Per chiudere la sostituzione serve il giro visivo con più articoli su dati già disponibili o in un simulatore autorizzato, senza aggirare il precedente diniego dell'origine5186, e la decisione sulla compatibilità dell'anteprima PDF nel browser integrato. La verifica su telefono fisico e tastiera virtuale resta un limite esplicito, non dichiarato risolto dall'emulazione. Non introdotte fixture o fallback mock nell'app reale. Nessuna sostituzione del default, rimozione della pagina unica o merge automatico.
