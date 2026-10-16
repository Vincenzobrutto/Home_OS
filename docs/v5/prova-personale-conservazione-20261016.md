# Prova personale Home: conservazione e rimozione dei dati

16 ottobre 2026. Regole consolidate con il committente. Ambito: prima costruzione della sua casa reale nel servizio locale V5; «pilota» non significa ambiente usa e getta. Questo documento definisce il comportamento e la procedura di richiesta, non introduce endpoint o funzioni di eliminazione.

## Regole della prova

1. I documenti e i dati confermati vengono conservati per proseguire la gestione della casa. La fine della prova, una pausa nell'utilizzo o un riavvio del PC non ne autorizzano la cancellazione. Nessuna scadenza automatica dei contenuti viene introdotta. Questo non è una promessa di disponibilità perpetua del servizio.
2. Il committente mantiene i propri originali anche fuori da Dimora. La copia nel servizio, l'export personale e il backup hanno scopi diversi: JSON per dati strutturati autorizzati, ZIP per originali selezionati, backup per ripristino tecnico. Nessuno dei primi due è oggi un reimport completo.
3. Archiviazione di oggetti, attività o costi, rimozione di un collegamento e revoca di una condivisione non equivalgono a cancellazione dei dati. Una revoca interrompe l'accesso nel servizio; non richiama file già scaricati dal destinatario.
4. L'eliminazione richiede una richiesta esplicita che identifichi il contenuto e il risultato desiderato. Non è una tappa obbligatoria della prova. Non si esegue un reset generale per correggere un singolo errore.
5. Un documento può essere fonte di informazioni confermate, costi, cronologia o condivisioni. L'originale, i riferimenti alla fonte e i dati derivati vanno trattati separatamente. Prima di eliminarlo si deve mostrare l'impatto; nessuna rimozione silenziosa di costi, schede o dati di altre persone.
6. Le regole già approvate per vendita, passaggio di proprietà e cessazione del rapporto professionale restano distinte. Questa prova non le modifica e non autorizza la permanenza di accessi dopo un cambio di titolarità.

## Capacità attuali e limite dichiarato

Oggi si possono caricare file, esportare originali e ottenere il JSON personale della casa secondo i contratti esistenti. Non esiste ancora un comando di eliminazione di documento, casa o account, né una procedura tecnica di cancellazione completa già collaudata. L'avviso nel caricamento rimane veritiero: non viene sostituito con un pulsante o una promessa inesistenti.

Se viene richiesta una rimozione prima della disponibilità della funzione, si apre un intervento assistito: identificazione del contenuto, analisi delle dipendenze, proposta concreta e nuova conferma prima di qualsiasi azione distruttiva. Non eseguire SQL manuale improvvisato sul database personale. Se la rimozione sicura non è ancora realizzabile, dichiararlo e concordare il seguito; non presentare la semplice invisibilità in UI come cancellazione avvenuta.

Nessuna rimozione è stata richiesta o eseguita durante la definizione di queste regole.

## Requisiti della futura eliminazione

| Caso | Risultato da rendere esplicito prima della conferma |
|---|---|
| Documento caricato per errore, senza utilizzi | Originale e metadati da rimuovere; esito fisico e applicativo verificati, retry che non ricrei il documento |
| Documento già utilizzato | Elenco delle dipendenze autorizzate; possibilità di conservare i dati confermati senza fingere che la fonte resti disponibile. Eventuale eliminazione di estratti o dati derivati è un'azione aggiuntiva, non implicita |
| Documento condiviso | Revoca degli accessi nel servizio e trattamento dei manifesti/anteprime; impossibilità di richiamare copie già scaricate dichiarata |
| Casa o account intero | Operazione separata, inventario completo e impatto sui dati comuni/altrui; niente cancellazione a cascata indistinta |
| Backup contenente dati rimossi | Trattamento delle copie precedenti e prevenzione della ricomparsa in caso di ripristino; non basta cancellare il database attivo |

Verifiche tecniche obbligatorie prima di rilasciare l'eliminazione: fonti JSON e cronologie oltre alle chiavi esterne, richieste idempotenti, analisi in corso, condivisioni anche revocate/scadute, letture/download/export concorrenti, errori di rimozione fisica e ripetizione sicura dell'operazione. Test iniziali soltanto su dati sintetici isolati. Uno stato «archiviato» o un file non più visibile non prova questi requisiti.

## Backup e conservazione delle copie

Aggiornamento del committente successivo al primo lotto: backup aggiornato rinviato in questa fase. Conserva gli originali e accetta di doverli ricaricare in caso di perdita dei dati successivi allo snapshot. Il passaggio raccomandato sotto non è quindi un blocco della prova o un'operazione da avviare automaticamente. La copia già verificata resta disponibile al suo precedente punto nel tempo.

La copia locale e quella cifrata in Drive già verificate sono punti di ripristino: non includono automaticamente i caricamenti successivi. Dopo il primo piccolo lotto personale, e prima di aumentare il volume, creare e verificare un nuovo punto di ripristino con la procedura esistente; l'eventuale copia in Drive resta cifrata, nella destinazione privata concordata e senza la chiave. È un passaggio operativo da eseguire, non un'automazione già attiva.

Non viene attivata una rotazione automatica e non si inventa oggi un termine di 30/60/90 giorni. Le copie esistenti restano conservate finché non viene definito e applicato il loro ciclo di sostituzione/rimozione. Di conseguenza oggi non si promette un termine massimo di permanenza nei backup dopo una futura cancellazione.

Per una richiesta effettiva di eliminazione occorre individuare tutte le copie sotto controllo del progetto (snapshot, copie cifrate locali, copia riscaricata, Drive e area temporanea di ripristino), decidere quali sostituire o rimuovere e registrare l'esito. Gestire anche gli eventuali cestini del supporto cloud. Non considerare la distruzione di una singola chiave prova sufficiente se esistono copie in chiaro o altre copie della chiave.

Un ripristino futuro deve tenere conto delle rimozioni successive allo snapshot prima di riaprire l'accesso: il solo restore non deve ripubblicare dati cancellati. Il registro minimo delle rimozioni e la procedura di riapplicazione sono requisiti ancora da implementare, senza contenuti documentali o credenziali nel registro.

## Percorso per iniziare con i documenti reali

Distinguere due capacità, senza cambiare lo stato complessivo della Fase 0:

- **Primo lotto come archivio personale:** account del committente già creato e verificato, casa dedicata, 2–3 documenti iniziali non delicati in Solo io, originali conservati fuori Dimora. Prima rimane da completare il collaudo visivo reale upload/apertura/ZIP/JSON su account QA separato, senza modificare la sessione personale. L'assenza di eliminazione deve essere chiara; se per il committente è necessaria prima del primo caricamento, l'avvio attende la sua implementazione. Non introdurre un reset come prerequisito automatico.
- **Uso dell'AI sui documenti personali:** separato dall'archiviazione. Claude corregge corpus e misuratore offline; Codex deve raccogliere e verificare la consegna. Poi serve la campagna sintetica rappresentativa con nuovo budget e consenso, prima di proporre analisi su documenti personali. Non riusare automaticamente il precedente budget e non trasmettere file personali senza scelta esplicita dei file e del trasferimento.

Il controllo Defender usa le impostazioni Windows esistenti: Microsoft può ricevere informazioni o campioni secondo tali impostazioni. Questo limite è già mostrato prima dell'upload e rimane valido anche senza analisi Anthropic. Non dichiarare quindi che ogni trattamento rimane esclusivamente sul PC. JPEG/PNG sono archiviabili; l'estrazione attuale usa testo PDF e non promette OCR di foto/scansioni.

Per il primo lotto sono adatti un manuale di elettrodomestico, un documento tecnico senza dati delicati e una fattura semplice controllata dall'utente. Rimandare inizialmente rogito completo, documenti d'identità, mutuo e materiali con dati di altre persone. Non è una nuova restrizione permanente del prodotto: riduce la complessità della prima prova.

## Stato e criteri di chiusura

Regole di conservazione definite; nessuna cancellazione automatica o manuale effettuata. Restano aperti implementazione/eliminazione e ciclo delle copie, con limiti dichiarati. La definizione documentale non chiude da sola il requisito operativo di rimozione né tutta la Fase 0.

Le evidenze già eseguite restano in personal-export-esito-20261016.md, fase0-file-control-esito-20261016.md e fase0-chiusura-arbitrato-20261016.md. Questa sessione è documentale: nessun nuovo test runtime, accesso ai contenuti personali, invio email/AI, modifica DB, backup o impostazione di sicurezza. Non è una valutazione legale o una dichiarazione di conformità.
