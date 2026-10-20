# Rubrica: archiviazione e collegamenti — 21 ottobre 2026

## Comportamento confermato e testi

Verificati servizio contacts e contratto esistenti: archive cambia soltanto lo stato del contatto; conserva recapiti, note e collegamenti e vieta nuovi collegamenti fino al ripristino. unlink imposta removed sul solo collegamento indicato, mantenendo il contatto, la risorsa e le altre associazioni. Le due operazioni non cancellano documenti, oggetti, spese, lavori o attività.

Nel dettaglio la sezione Archiviazione del contatto spiega cosa scompare da Attivi, cosa rimane e come ritrovare il contatto con il filtro Archiviati. Da archiviato, spiegazione e pulsante Ripristina contatto espongono la reversibilità e la possibilità di aggiungere nuovamente collegamenti.

La sezione Collegamenti spiega invece la rimozione della sola associazione. Scollega [nome] diventa Rimuovi collegamento, con nome accessibile univoco che comprende l’elemento interessato. Ogni pulsante è associato alla spiegazione pertinente. Nome della risorsa e pulsante restano affiancati o si dispongono su più righe su mobile.

Messaggio in area status soltanto dopo risposta riuscita e rilettura: dati conservati per archivio/ripristino, collegamento nominato per rimozione. Errori senza falso esito positivo; dati e collegamenti restano visibili. Dopo rimozione il focus passa al titolo Collegamenti, dopo archivio/ripristino torna al pulsante corrispondente. Stato locale ricreato per account/casa/contatto, per non trasferire feedback o modulo aperto a un altro dettaglio.

Azioni dirette: nessun nuovo passaggio di conferma. Elenco, ricerca, filtro, paginazione e contesto di ritorno della Rubrica invariati. Nessuna API, migrazione, modifica di permessi o cancellazione definitiva aggiunta. Le scritture esistenti conservano expectedVersion e Idempotency-Key.

## Verifiche e confini

12 test frontend mirati superati su azioni, contatti e catalogo; i 3 test delle azioni ripetuti dopo la rifinitura del focus. Copertura: spiegazioni accessibili prima dell’azione e assenza di POST iniziali, archiviazione/ripristino con valori e collegamenti conservati, rimozione della sola associazione nominata anche da contatto archiviato, versione/chiave d’idempotenza, errore di conflitto senza successo e senza perdita dei collegamenti. Suite esistenti su creazione/modifica e ritorno ricerca/posizione preservate. Typecheck, build e lint riusciti; warning Vite preesistente sul bundle principale.

Browser: Rubrica reale vuota controllata in sola lettura. Dettaglio e azioni verificati con app e router reali e API esclusivamente in memoria (contactActionsFixture), contatti fittizi e banner di collaudo. Desktop, mobile 390×844 e 320×740; archivio mantiene due collegamenti, ripristino li conserva, rimozione lascia l’altro e spiega il risultato. Focus verificato; nessun overflow orizzontale e nessun errore/avviso console nelle prove. Fixture fuori dal percorso produttivo, nessun mock come fallback reale. Nessun contatto reale creato, modificato, archiviato o scollegato. Nessuna chiamata AI. Non eseguite nuove scritture DB reali: la semantica server è preesistente ed è stata riletta, non modificata.

Evidenze locali della chat: outputs/rubrica-actions-20261021, incluse desktop.png, mobile390.png, mobile320.png e schermate dopo la rimozione. Bozze rimandate; legacy locale preservato.
