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
