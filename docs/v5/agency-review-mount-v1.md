# Revisione fascicolo — collegamento alla pratica V5

30 ottobre2026. Nuovo contenitore PracticeReviewSection e un solo ingresso aggiunto nella pratica agenzia esistente. Il lavoro concorrente precedente era già pubblicato, file/indice originali puliti prima della modifica; nessun AppModule/router/Home o demo Alessio modificato.

## Implementato

Apri dati e verifiche carica il contesto della pratica via GET review, poi monta Proposte dal documento, Dati e fonti e Punti da verificare con i client reali V5. Nessun fallback sintetico o chiamata AI all'ingresso. Porte memoizzate per transport/account/agenzia/pratica, readonly dal canEdit server già presente nella pagina. Pannelli details richiusi rimangono montati: un form o un invio incerto non è scartato dal semplice collasso.

Le tre viste conservano propri snapshot/CAS. Dopo salvataggio il contenitore avvisa di ricaricare le altre schede; nessun reset forzato che cancelli una mutazione incerta. Un409richiede reload locale. Il contesto unità e le opzioni prova restano quelli della lettura iniziale: prove selezionabili soltanto da fatti non stale già leggibili. Non è ancora un selettore completo di tutti i documenti né sincronizzazione automatica di ogni snapshot.

Apri fonte recupera l'originale dal download autorizzato con sourceId/versione/SHA esatti; link locale Scarica originale e pagina della citazione, non URL remoto/iframe. Blob URL revocato alla sostituzione/unmount, lettura annullata e risposta tardiva ignorata su cambio scope/porta. Nessun viewer PDF inline o estrazione dati dal browser.401/403/404in qualsiasi workspace nascondono tutta la revisione, non solo il pannello che ha ricevuto il diniego. Download revocato nasconde anch'esso i valori.

## Verificato

9nuovi test del contenitore: lazy, tre route reali su fetch sintetico, conferma/notice, readonly, accesso negato globale, details preserva form, download con prova esatta/revoca URL, revoca accesso e risposta tardiva fra pratiche. Gruppo mirato finale102/102in11file (67revisione incluse58precedenti +35planimetrie/navigazione/client), typecheck app/lint mirato verdi. Config privata .agency-cache/mount.config.ts, dipendenze esistenti, nessuna installazione. Non è la regressione frontend completa1609storica.

Prima iterazione67/67, lint segnalava confronto con oggetto memoizzato che chiudeva sui ref; introdotta identità separata, senza disabilitare regole. Primo gruppo102aveva1errore: un riferimento token rimasto nella callback successiva al salvataggio; corretto a identity, ultimo102/102. Assert e timeout invariati. Il test di conferma ha rilevato l'errore dopo il ritorno simulato del backend; nessuna scrittura reale. Log .agency-cache/review-mount-final-tests.log, types/lint separati.

## Limiti e prossimo gate

Cablaggio reale presente nel sorgente, ma questa tranche è verificata con trasporto sintetico: browser contro API/DB reali ancora da eseguire in nuovo trial posseduto. Le prove browser precedenti su componenti indipendenti non dimostrano questo flusso montato. Nessun server nuovo rimasto attivo e nessun test DB ripetuto; backend invariato da5260d74.

Non ancora UI creazione unità/fatti dichiarati/confronti, anagrafica soggetti o selettore prove da ogni documento. Record da atto caricabili solo dal coordinatore interno; stage/provider/consenso/budget dedicati non orchestrati, quindi nessuna estrazione atti completa promessa. Modello incarico manca e canGenerateDraft rimane false. Nessuna AI/spesa, file personale, servizio/DB esistente, demo Alessio, merge o deploy. Prossimo: trial reale isolato dei tre workspace e download/revoca, poi colmare unità/contesto e mapping senza modello inventato.
