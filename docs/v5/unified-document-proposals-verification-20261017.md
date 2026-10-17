# Verifica caricamento unico — 17 ottobre 2026

Incremento operativo della specifica unified-document-proposals-v1.md. Schema JSON additivo, senza migrazioni. Provider onboarding esteso alle bollette; provider economy/M4/receipt non attivati. Budget e variabili d’ambiente non modificati.

## Prove

- Backend build/lint verdi; 52 unit mirati (prodotti, fatture, bollette, schema provider, importi ambigui, evidenza/categoria/valuta e body senza oggetti).
- 20 test DB locali verdi: parser PDF effettivo, trasporto Anthropic simulato senza rete, fattura e due bollette sintetiche elettricità/gas; le due bollette attraversano coda/provider/validazione/bozza/conferma canonica. Zero oggetti per bollette; originali, storia e provenienza; riuso copia esatta, blocco doppioni, recupero pending e replay. Suite include isolamento, rollback e limiti concorrenti 5 USD/40 analisi. Account/campagne sintetici separati e ripuliti; nessun reset di dati utente.
- 5 test HTTP verdi su sessione, contesto, CSRF, deep link/conferma/ricevuta legacy.
- FE: 109 casi della suite mirata iniziale, con tre aspettative aggiornate per apertura su richiesta (non più primo file automatico); tutti risolti in follow-up. Aggiunti 4 test bollette e 2 consenso di lotto, verdi. Ultimo controllo 28 test router onboarding verdi dopo aggiornamento budget a fine job. Build/lint finali verdi.
- Browser reale IAB: elenco dei tre originali, fattura «Proposta pronta» disabilitata per nuovo avvio, due bollette «Da preparare» selezionabili. Nessun pannello aperto automaticamente. A 390 px: viewport390, larghezza contenuto375, nessun overflow; screenshot outputs/unified-upload-mobile-20261017.png. Sola lettura: nessun consenso/provider/conferma personale azionato.
- Runtime riavviato tramite servizio registrato Dimora-V5-Telefono.ps1; API3001 e frontend5174/LAN5175 conservati. Nessuna modifica firewall o env.

Log mirati in outputs/unified-*.log: be-unit, house-db, house-http, fe-tests, fe-followup, batch-ui, onboarding-ui-final, fe-build/lint, be-build/lint e runtime-restart. Le prime tre aspettative UI obsolete sono documentate nel log iniziale; follow-up corretto verde. Non sommare riesecuzioni come casi distinti.

## Budget e dati reali

Verifica UI residuo 4,98 USD, 1/40 analisi: stessa campagna onboarding-home-pilot-20261017, valore esatto precedentemente contabilizzato 4,976130 USD (costo0,023870). Zero nuovi Messages reali durante questo sviluppo. La fattura già pronta viene riusata; le due bollette reali non sono state inviate né contabilizzate dall’agente. Saranno preparate solo dopo il consenso del committente nell’app, sul medesimo residuo. Nessun nuovo oggetto/spesa personale confermato.

## Limiti e prossimo collaudo

UI bollette e conferme verificate con harness; pipeline backend con parser/DB e trasporto simulato. Lettura reale Anthropic delle due bollette ancora da provare. Chrome non più collegato, verifica lettura effettuata nell’IAB disponibile. Nessuna affermazione di OCR indipendentemente verificato o di atomicità globale tra archiviazione e finanza.

I tre file reali risultavano già organizzati quando aperti nel browser: la loro classificazione confermata viene conservata. Le vecchie etichette «Ricevuta + Fattura + Bolletta» non sono state cambiate implicitamente. Una nuova proposta utility_bill viene archiviata in Bollette nei caricamenti non già confermati; per correggere organizzazioni pregresse si usa Modifica con consenso alla sostituzione.

Prossimo passo: nel lotto381c5875-5759-4047-80ba-4d988c5b2c66 selezionare le due bollette, controllare elenco e consenso, preparare proposte e rivedere i totali; confermare ciascuna spesa solo se corretta. Nessuna ri-analisi della fattura necessaria. Mischiare acquisti di beni e bollette nello stesso PDF resta fuori da questo primo incremento; i controlli multiparte sono conservativi. Le altre note UI/prezzo oggetto/posizione Casa restano nel backlog condiviso.

## Collaudo reale successivo: rifiuto HTTP400 e recupero esplicito

Alle13:35:48Z i due Messages delle bollette autorizzate nell’app hanno ricevuto HTTP400. Job55f6970f-f853-4858-a6cb-b3ccca61d761 e743fcb6e-d80c-491b-bffe-c3547cab4b41: uncertain, nessuna bozza/usage. Le due riserve0,25 restano impegnate, senza attribuire un costo effettivo non verificato. Budget residuo4,476130USD,3/40 tentativi conteggiati. Non sono stati effettuati nuovi Messages dall’agente.

Il log conserva soltanto stato HTTP/endpoint/request-id, senza corpo errore o documenti. Il400 è certo; la sua causa precisa non è ricostruibile dal log redatto. Complessità dello schema sospettata: la documentazione ufficiale Anthropic segnala limiti interni di compilazione anche sotto il limite esplicito delle union (https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Non dichiarare il problema provider definitivamente risolto prima della prova reale.

Schema ora specializzato per fonte: region=null per testo, region obbligatoria per immagini/PDF visuali,2 union anziché7. Restano invariati validazione evidenza locale, dati, consenso e budget. HTTP400 futuri hanno codice provider_request_rejected; nessun corpo provider letto/loggato. La UI segnala i file senza proposte.

Nuovo tentativo possibile soltanto con consenso UI che dichiara espressamente l’ulteriore riserva e acknowledgePreviousUncertainAnalysis=true; vecchi tentativi/riserve restano conservati. Il comportamento predefinito continua a bloccare la ripetizione dopo esito incerto. Chiave nuova distinta dall’incarico precedente e stabile per replay HTTP; stesso campaign/budget/scope e limiti persistenti. Nessun invio all’apertura della pagina o al riavvio.

Verifiche aggiornamento:30 unit,20 DB simulati (ack separato, vecchia riserva conservata, nessun dispatch automatico),3 UI lotto verdi; build/lint BE/FE verdi. Runtime riavviato via launcher registrato. Prossima prova consigliata: una sola bolletta prima, consenso nell’app; seconda dopo esito positivo.

## Prove autonome autorizzate — esito reale bolletta

Dopo autorizzazione del committente («ti autorizzo a fare in autonomia le prove»), eseguiti due tentativi espliciti nell’app sulla sola bolletta f49816d1ace71c8106013fe781d18b81.pdf, doc c922d90c-6eae-441b-8f3e-d9ca090bc3e1. Consenso Anthropic e acknowledgement precedenti riserve attivati per ciascun invio, entro campagna5USD/40 e riserva0,25 per tentativo. Nessun reset di quote, env o riserve400 pregresse.

1. Job e69f0835-5e08-4d13-b505-4844fe17a0f4: il provider accetta lo schema specializzato (superato il400), costo0,037548USD; validazione locale rigida scarta intera risposta (analysis_invalid_output), nessuna bozza. Corpo risposta non conservato, causa del singolo campo non ricostruibile.
2. Corretta validazione bollette: singoli campi/importi non verificabili vengono esclusi, annotando soltanto codici di warning; tutti i dati accettati conservano le prove originali. Non si accetta un valore non verificato per far passare il documento. Un unico totale corrente verificato rimane proposto anche quando un dettaglio ausiliario è escluso; arretrati o più totali richiedono scelta.
3. Verifica finale job254023f8-10b6-4f96-93e4-7a3598e48b5b: succeeded, costo0,037428USD, bozza4e071925-086f-4e41-9efc-e6e1dd39ffd8. Utility_bill,0 prodotti,1 proposta spesa; Sorgenia S.p.A, electricity, totale corrente e totale da pagare entrambi7820centesimi, data22/11/2025, scadenza12/12/2025. Un dettaglio importo non verificato escluso con warning, nessun testo originale nei log. Periodo non proposto: non inventato.

Costo complessivo delle due nuove prove0,074976USD. Campagna finale:5tentativi/40; costo effettivo noto complessivo0,098846USD inclusa fattura precedente;0,50USD riserve incerte conservate; residuo4,401154USD. L’altra bolletta ef361… non reinviata in questo collaudo. Nessun oggetto o spesa reale confermato: DB verifica billExpenses=0, billObjectLinks=0, bozza open. La spesa dell’invoice già presente non è stata modificata.

UX: scheda bolletta mostra importo/fornitore/utenza/date e Conferma spesa; campi dietro Modifica dati se completi, aperti se mancano dati o ci sono doppioni. Rimossi riferimenti ad articoli/quantità/zero oggetti nella revisione bollette; dettaglio documento con utility_bill offre Rivedi la spesa proposta, non percorsi separati per prodotti/analisi legacy. Le organizzazioni già confermate non vengono riscritte implicitamente.

Verifiche:8 unit bollette verdi (inclusa esclusione sicura di importo ausiliario),20 DB/parser+trasporto simulato verdi,32 FE verdi (spese bollette + regressioni onboarding),build/lint verdi. IAB reale390px: contenuto375px, riepilogo78,20EUR e pulsante Conferma spesa presente senza confermarlo. Screenshot outputs/bill-real-proposal-mobile-20261017.png. Runtime aggiornato tramite launcher registrato, nessuna modifica firewall.

Limiti: una sola delle due bollette reali ora pronta; l’altra ha ancora il vecchio esito incerto. Conferme su dati sintetici verificate nel DB; conferma di questa spesa reale lasciata al committente. La rilettura di PDF complessi può lasciare campi mancanti; non dichiarare riconoscimento completo di tutto il documento. Il caricamento conserva ancora consenso esterno esplicito; non esistono invii AI nascosti all’upload.


## Accesso dall’archivio Documenti (17 ottobre, 16:35)

Aggiunto accesso in sola lettura per le bollette nell’elenco e nel dettaglio: proposta aperta → Rivedi e conferma la spesa; assente → Prepara la proposta di spesa; analisi attiva → Vedi analisi in corso; bozza conclusa → Vedi esito della proposta. Il mount non avvia analisi né scrive spese. Account, casa e documento isolano la cache; nessuna modifica agli originali o ai titoli già confermati.

Verifica: 4 test mirati verdi, build e lint frontend verdi. Nel browser reale il collegamento della prima bolletta apre la bozza corretta e mostra “Spesa confermata” (conferma intervenuta dall’utente); la seconda non viene presentata come pronta. Nessuna chiamata provider o conferma eseguita da Codex. Screenshot outputs/bill-archive-entry-20261017.png nel workspace.
