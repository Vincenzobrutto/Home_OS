# Creazione di confronti circoscritti nel fascicolo

30 ottobre2026. Incremento frontend indipendente durante la prenotazione dei servizi dell'altro incarico. ComparisonWorkspace/client nuovi e pannello Crea un confronto nella revisione pratica. Riusa GET review e POST findings già implementati; nessuna nuova route, provider o migrazione.

## Scelta esplicita

Unità e riferimento soggetto esatti, campo unico, periodo scritto dall'agente e2–20fatti correnti scelti singolarmente. L'agente riconosce che riguardano lo stesso soggetto/unità/significato/periodo. Nessuna precompilazione o matching per nome. Fatti di altra unità/soggetto/campo, rifiutati o stale non sono selezionabili; superfici interne/catastali/commerciali rimangono confronti distinti.

Mostra valore confermato se presente, altrimenti proposta, stato e citazioni ricevute. Le dichiarazioni senza documento rimangono senza citazione. La visibilità iniziale è privata, condivisione esplicita. Cambiare ambito o selezione invalida il riconoscimento; cambiare unità/soggetto/campo cancella i fatti scelti. Il periodo non viene dedotto dalle date o attestato dal software.

Il body contiene revisione e domanda: operation comparison, visibility, question unitId/subjectKey/epoch/field/factIds. ID del confronto dal server. Nessuna decisione sui fatti, correzione valori o esito del confronto autoattestato dal browser. Il server calcola il confronto e l'agente ricarica Punti da verificare per leggerlo; uguaglianza non significa proprietà o conformità verificata.

## Gestione modifiche

Privacy/accessi e CAS restano autorità backend.403nasconde tutto nel contenitore,409congela fino a reload;422permette correzione; risposta incerta conserva body/key soltanto per retry manuale. Readonly blocca anche retry precedente; cambi scope/porta scartano risposte tardive. Nessun remount forzato delle altre viste e nessuna promozione ottimistica a confermato. Gli snapshot sorelli richiedono ricarica esplicita.

## Verifiche e limiti

14nuovi casi:11workspace,2client,1contenitore. Gruppo finale130/130in15file (incluse116precedenti), typecheck app/lint mirato verdi. Primo129verde prima del caso montato; relativa fixture iniziale non rispettava envelopePOSTfindings, corretta al contratto effettivo, poi130verde. Coprono scelta minima/massima, ambiti incompatibili, citazioni/valori confermati, reset riconoscimento, body/domanda senza conferme, readonly/errori/retry, porta mutata, sessione/CSRF/key e montaggio tramite route esistente.

Solo trasporto sintetico nei test. Browser/API/DB del nuovo pannello restano da verificare nel trial posseduto dopo fine prenotazione altrui15:15UTC; non riusare o arrestare i servizi di quell'incarico. Nessuna nuova AI/spesa/documento personale o demo Alessio. Modello incarico manca, canGenerateDraftfalse. Soggetti sono riferimenti espliciti, non anagrafiche certificate; prova selezionata e coincidenza di valori non completano una verifica di successione o conformità.
