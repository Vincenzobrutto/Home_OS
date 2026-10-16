# Nuova spesa dall'oggetto: verifica del contesto

16 ottobre 2026. Segnalazione del committente: ha dovuto scegliere manualmente l'oggetto nel percorso perOggetto. Prima della modifica, riproduzione browser corrente sul suo percorso: oggetto già preselezionato. Non è stata dimostrata la causa esatta dell'episodio originario; la precedente affermazione in chat di un difetto certo era prematura.

## Difetto circoscritto e correzione

La lettura autorizzata dei riferimenti URL è asincrona. Finché non arriva, il valore effettivo può essere vuoto ma il modulo consentiva il salvataggio: una compilazione/invio più rapida della lettura può perdere il collegamento. Ora il salvataggio attende la verifica dei riferimenti di partenza non sostituiti esplicitamente dall'utente (oggetto, documento o lavoro). Il controllo vale anche sul submit diretto, non soltanto sul pulsante.

I campi restano compilabili durante l'attesa, con messaggio di stato. All'arrivo dell'oggetto valido compare «Oggetto preselezionato: …»; nessuna sostituzione di una scelta esplicita. Riferimenti non disponibili non vengono forzati e conservano l'avviso esistente. La ricevuta non si sceglie automaticamente solo perché è collegata all'oggetto: un oggetto può avere più documenti e la scelta non va inventata.

Nessuna modifica API, schema o costo già registrato. Il committente ha già salvato il costo e il collegamento: non occorre rifarlo.

## Verifiche

-19test di spese.test.tsx verdi con backend simulato:17esistenti,2nuovi. Nuovi casi: deep link URL codificato con lettura bloccata controllabile, dati digitati preservati, submit anticipato senza POST, preselezione al termine e body con objectRef; riferimento non disponibile non selezionato, scelta/scollegamento manuale possibili.
- Build e lint frontend completi verdi.
- Browser reale sul percorso del committente, senza scritture: aperto «Registra un costo per questo oggetto», osservati caricamento/disabilitazione e poi oggetto selezionato con avviso esplicito; chiuso con Annulla, ritorno alla scheda. Il costo esistente resta unico. Il ritardo controllato e la verifica del nuovo body sono prove harness, non throttling del browser personale.
- Screenshot locale outputs/Dimora-V5-spesa-oggetto-preselezionato-20261016.jpg nel workspace. Nessun contenuto della ricevuta letto o trasmesso.

## Passaggio successivo: analisi assistita

La richiesta emersa nella prova è coerente con il principio «AI propone, utente conferma», ma va oltre il contratto corrente delle caldaie e delle bozze economiche. È un'estensione della direzione BL-10b, non una capacità già implementata. Primo scenario da specificare: ricevuta di acquisto → proposta di oggetto nuovo o associazione a oggetto esistente → proposta economica o riuso della spesa già presente.

Nel caso già completato manualmente non si devono ricreare oggetto e costo. La futura revisione deve rilevare i collegamenti esistenti, confrontare eventuali valori estratti e proporre integrazioni singole, senza sovrascriverli. Brand/modello soltanto se leggibili con evidenza; importo/data/fornitore derivati separatamente; negozio non trasformato in professionista. Un nome generico simile non basta a un'associazione certa; casi ambigui richiedono scelta dell'utente.

Prima di sviluppare questo ampliamento: definire contratto e transazione di conferma/idempotenza (oggetto, documento, eventuale spesa) e far verificare un percorso di revisione sintetico. Non cambiare implicitamente tutta la sequenza di release BL-04/01/02/03/10/10b, né accorpare una rubrica professionisti per questa singola ricevuta. APE/licenza/abitabilità restano fuori da questo primo contratto di acquisto; nessuna certificazione o OCR implicito.

Qualità AI: corpus/scorer v2 disponibile e verificato; campagna rappresentativa ancora da congelare e autorizzare con budget nuovo, prima di trasmettere documenti personali. Nessuna chiamata o attivazione provider in questa sessione. Preparazione del flusso e contratto può procedere offline.

Il committente ha rinviato l'aggiornamento del backup per questa fase, accettando di ricaricare dagli originali in caso di perdita. Nessun backup creato e nessun blocco aggiunto per tale motivo. Eliminazione tecnica/ciclo copie restano distinti. Nessun push, migrazione, servizio riavviato, dato personale modificato o lavoro automatico dopo il turno.
