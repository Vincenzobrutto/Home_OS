# Agenzie — registro persistente di confronti e osservazioni

Domande di confronto e osservazioni manuali conservate nello snapshot AgencyPractice, separate dai fatti e dalle decisioni sui valori. Nessuna conferma automatica, certificazione di titolarità o rilevamento universale di difformità. Il motore di confronto continua a operare su unità/soggetto/campo/epoca dichiarati esplicitamente; epoca e associazioni non sono verificate automaticamente.

Una comparazione mantiene la selezione dei fatti e ricalcola risultato/fingerprint alla lettura. La risoluzione richiede il fingerprint corrente, un esito e un motivo; non modifica il dato proposto o confermato. Fonte o decisione cambiata riaprono la verifica, senza cancellare la storia. Il fingerprint usa coordinate canoniche delle prove, indipendenti dall'ordine delle proprietà JSONB.

Osservazioni manuali: succession_chain, internal_layout, other; unità esplicita, testo e prove opzionali leggibili/versionate. Dichiarazione senza allegati resta tale: non diventa estrazione documentale. Esito technical_document_received richiede una prova corrente aggiuntiva; è una decisione umana documentata, non una validazione automatica del contenuto tecnico. Se cambia la risposta tecnica, la risoluzione si riapre anche quando la nota originaria è invariata.

Stati derivati open/resolved/reopened, cronologia autore/data/motivo e prove. Fonti/fatti privati nascondono il confronto e note private non hanno placeholder per altri agenti/admin. Una decisione supportata solo da prova privata non chiude silenziosamente un quesito pubblico per chi non può leggerla: per lui rimane aperto. Nessun conteggio di elementi nascosti.

Mutazioni con parser esatto, revisione pratica, chiave idempotente e lock/CAS dello store. Massimo100confronti,100osservazioni,50decisioni per elemento e10000ricevute. Replay non duplica la storia. Risoluzione su prove obsolete/non leggibili o fingerprint precedente rifiutata. Tabelle esistenti e snapshot opzionali retrocompatibili, nessuna nuova migrazione.

API nel modulo opt-in, sempre inattivo nel prodotto: GET/POST `/:practiceId/findings`. ID di nuovi elementi generati dal server a partire da scope/key; il browser non imposta autore, stato o certificazione. Sessione/CSRF e preflight edit esistenti. Nessuna UI completa del registro ancora collegata.

Caso sintetico SUC-DEMO-001: madre proprietaria storica e due eredi dichiarati sono una catena da verificare, non nomi da confrontare come la stessa persona. Un subalterno differente fra atto e visura è un quesito di coerenza, eventualmente spiegabile con una variazione storica. Parete spostata al sopralluogo è osservazione manuale, con risposta tecnica separata. Nessuna di queste prove certifica regolarità o vendibilità; non vengono inventati obblighi/documenti applicabili al caso reale.

Limiti: questioni e note iniziali immutabili, niente retarget/versionamento della selezione, archivio, assignee o scadenze in questo incremento. Se le vecchie proposte diventano obsolete servono nuove proposte/nuovo confronto; una domanda non valutabile rimane nello storico e non viene chiusa artificialmente. Citazioni manuali verificano struttura/snapshot/accesso, non che l'estratto compaia materialmente nei bytes. Il registro non attesta completezza del fascicolo; i documenti mancanti richiedono checklist e controllo umano. Prima del pilota UI, normalizzazione del JSONB, quote e gestione del ciclo di vita.

Verifiche pure su privacy, replay, riapertura e JSONB; PostgreSQL su concorrenza, rilettura, risposta tecnica e revoca. HTTP con nota manuale e risoluzione sul fingerprint corrente. Fixture esclusivamente sintetiche, nessuna AI o documento personale.
