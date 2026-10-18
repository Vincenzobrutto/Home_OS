# V12 — fatture di lavori, soggetti e spese nella revisione unica

18 ottobre 2026. Implementazione del percorso concordato dopo il caso di una fattura lavori senza articoli proposti. Nessuna nuova chiamata AI durante sviluppo e collaudo; budget, ledger e consensi invariati.

## Pipeline e comportamento

Una richiesta provider raccoglie classificazione, fatti documentali, soggetti fisici e costi con citazioni condivise. La normalizzazione e la validazione locale mantengono distinti contenuti del documento e risorse canoniche da creare. Prompt version document-understanding-v12; vecchi output senza subjectKind restano compatibili.

- Fatture di soli prodotti: schede e prezzi per articolo, con regole esistenti e controllo cumulativo.
- Fatture di lavori/servizi o miste: soggetti product/system e descrizione dei lavori come fatto documentale; ONE houseExpenses simple_invoice per il costo complessivo. Nessuna ripartizione del totale su quadro, monitor o altri soggetti. Le categorie ammesse includono manutenzione, lavori/riparazioni, acquisti/sostituzioni, con prova testuale.
- Fattura di soli servizi: spesa della casa anche con items vuoto, senza inventare un elettrodomestico.
- Conformità: percorso V11 conservato; tipo impianto proposto anche quando descritto da una fattura. Le date fattura non diventano automaticamente date di acquisto/garanzia di tutti i soggetti.
- Bollette: spese della casa senza oggetti; nessun pulsante Aggiungi articolo nella revisione della bolletta.
- Etichette: identità e dati tecnici comprovati, nessun prezzo/data di acquisto inventati.

L’utente vede oggetti/impianti e spesa nella stessa revisione, con un solo Salva e organizza. Può creare, collegare o conservare solo alla casa i soggetti di una fattura con costo complessivo. Conferma finale combinata con choices e houseExpenses, ricevuta stabile e transazione esistenti. I percorsi storici senza compila mantengono compatibilità.

## Validazione e controllo economico

Un campo opzionale, un prezzo o un totale non verificabile viene omesso con avviso Da verificare; gli altri dati validi sopravvivono. Non viene preservato come prezzo estratto utilizzabile un valore smentito dalla fonte. Identità principale, struttura, quantità e citazioni malformate restano controllate; identità a bassa confidenza non genera proposte arbitrarie. Totali singolarmente comprovati ma incoerenti con le righe restano visibili con avviso e sono bloccati dal limite economico prima del salvataggio, anche lato server per un singolo articolo.

Data documento riconosciuta da intestazione Fattura/Numero/data. Citazione della sola data espandibile soltanto dentro la stessa intestazione già citata, stessa pagina e un’unica data corrispondente. Nessuna ricerca libera di una data altrove nel documento.

Il costo complessivo di fattura e i costi sugli oggetti sono allocazioni alternative: non possono essere registrati insieme. Un articolo escluso obbliga a dichiarare manualmente l’importo della casa; le quote escluse comprovate riducono il tetto massimo. Se la quota è sconosciuta non viene stimata: l’utente indica il costo corretto. Tutti i soggetti vanno rivisti prima di confermare il costo complessivo, così un rinvio non consente una successiva esclusione lasciando indisturbato il totale. Rimangono controlli di stessa fonte, costi simili, versioni e privacy.

## Test ed evidenze

- 92 test backend offline distinti verdi, dopo aggiornamento delle aspettative di omissione dei costi non verificati. Inclusi fattura lavori sintetica, servizi senza oggetto, data intestazione, totale con valuta tra parentesi, IVA/subtotali scartati, costo isolato errato e incoerenza importi senza perdita delle identità.
- 28 test DB/integrazione verdi: parser PDF reale, trasporto fake senza rete, transazioni, house cost canonico, tre schede/documenti collegati, replay, rollback su doppia allocazione, rinvio di soggetti e importo sopra totale.
- 54 test frontend mirati verdi: cinque nuovi casi per fattura lavori combinata, soli servizi, esclusione con costo manuale, bolletta senza oggetto e risposta di conferma persa senza seconda creazione.
- Build frontend/backend, typecheck e lint mirati verdi. Suites ripetute solo quando nuovi cambiamenti o errori lo richiedevano.
- Browser sull’app reale con cinque PDF sintetici in casa QA temporanea. Fattura lavori: tre soggetti e una spesa da 1.537,20 EUR; esclusione blocca il totale e correzione manuale sblocca il salvataggio. Acquisto: nome/marca/modello, 99,99 EUR e data corretti. Bolletta: 84,50 EUR senza oggetto e una sola conferma. Desktop1280 e mobile390/320 senza overflow orizzontale. Non premuta conferma browser; salvataggi provati nella suite DB.
- Screenshot nel workspace contenitore: outputs/v12-lavori-mobile-20261018.png. Casa QA, cinque bozze, documenti e originali fisici rimossi dopo la prova. Nessun job AI creato e nessuna modifica ai contenuti reali della casa.

## Limiti del collaudo

Il provider è stato simulato: questi test dimostrano contratto, mapping, completezza dei dati attesi nelle fixture, UI e salvataggio. Non misurano il richiamo del modello reale o garantiscono la lettura di ogni scansione. V12 non ha ancora un collaudo live. Il prossimo invio deve partire dal consenso nell’app usando il budget residuo autorizzato; nessun retry automatico a pagamento.

Le bozze precedenti non sono riscritte e non acquistano informazioni mai estratte: serve una nuova analisi oppure compilazione manuale. Lavori/interventi sono descrizioni documentali e categorie della spesa, non nuove attività canoniche create automaticamente. I dati tecnici restano osservazioni documentali, non nuovi campi impianto editabili. Restano qualità OCR per pagina/PDF misti e ulteriori casi della proposta V11. La separazione è nello schema e nell’adattamento locale, non in più richieste AI o in un nuovo servizio remoto.

## Collaudo reale delegato dal committente — 18 ottobre 2026

Il committente, da cellulare, ha autorizzato l’agente a svolgere autonomamente le prove necessarie nel budget esistente. Eseguiti due nuovi incarichi tramite il consenso nell’app; nessun riavvio/retry automatico e nessuna modifica a limiti o ledger.

1. Fattura lavori: job 00811dee-4451-40f8-ac7f-7866bbfc2424, bozza f2ffc6d8-5cd5-4eff-98f6-971e2dc7c489, V12 succeeded/settled. Due soggetti riconosciuti: quadro elettrico (system/electrical) e monitor videocitofonico (product). Descrizione lavori presente; una spesa lavori/riparazioni da 153720 centesimi, data documento/spesa 2026-07-08. Marca e modello non presenti nella fattura, lasciati vuoti. Un candidato importo non verificabile è stato omesso con avviso, senza perdere il totale valido. Costo 0.041002 USD.
2. Documento acquisto macchina caffè: job e1f63e1f-ba19-4061-8af8-804283014252, bozza 309d0e18-ff96-4b20-b466-52ce651ccfc7, V12 succeeded/settled. Nome De’Longhi Rivelia con descrizione completa della fonte, marca De’Longhi, modello EXAM440.35.B, totale49900 centesimi e acquisto2026-06-14 riconosciuti. Consegna effettiva non comprovata omessa con avviso. Il controllo costi trova la spesa da499 già registrata dalla stessa ricevuta e impedisce la nuova spesa automatica. La scheda Macchina caffè esistente è selezionabile esplicitamente: confronta marca/modello attuali con quelli estratti senza sovrascriverli. Prova UI di collegamento oggetto+spesa pronta con riepilogo0nuovioggetti/1collegamento/0nuovespese, senza premere Salva.

Costo totale dei due test 0.067026 USD; residuo visualizzato circa2.88 USD. Le riserve incerte storiche restano conservate. Nessun job queued/running a fine prova. Nessun nuovo oggetto, spesa, sostituzione di dati confermati o archiviazione finale dei documenti eseguita.

Corrette localmente due proposte di presentazione osservate: citofono/videocitofono ha tipo elettrico modificabile invece del default elettrodomestico; il titolo generico Fattura di una spesa lavori usa la descrizione documentale già verificata (max120caratteri). Non altera l’output AI né il profilo canonico: sono default del modulo editabile; i titoli specifici e tipi esplicitamente proposti restano prioritari. Due nuovi testfrontend, typecheck/lint e build verdi; nessuna terza AI.

Verifica browser mobile reale390 senza overflow (375px area utile), screenshot outputs/v12-lavori-live-mobile-20261018.png; confronto caffè outputs/v12-caffe-live-20261018.png. Dimostrato il miglioramento su questi due documenti reali, non una garanzia generale su ogni scansione. Restano confronto delle identità esistenti con nomi/modelli diversi e chiarezza degli avvisi su campi opzionali. Le bozze sono disponibili per revisione umana finale.
