# Campagna AI condivisa tra case autorizzate — 21 ottobre 2026

Su incarico del committente, la casa di prova con i cinque originali può usare il credito residuo della campagna già autorizzata, senza incremento di budget o numero di chiamate e senza disabilitare la casa reale.

`ONBOARDING_AI_ADDITIONAL_HOME_IDS` è una lista opzionale di massimo nove UUID ulteriori. È valida solo con `ONBOARDING_AI_SCOPE=home`, account e casa principale validi. Tutte le case appartengono allo stesso account configurato; membership, fonte, SHA, consenso e autorizzazioni applicative restano obbligatori. UUID malformati, separatori vuoti o liste eccessive rendono la configurazione non disponibile; nessun fallback al vecchio permesso per hash. La variabile assente conserva il comportamento su una sola casa.

Controllo disponibilità e worker usano gli stessi ID espliciti. Campagna, modello, ledger e lock per campagna restano unici: costi effettivi, riserve ed esiti incerti di tutte le case concorrono allo stesso tetto. Nessuna nuova campagna, reset, copia di credito o modifica a tentativi pregressi. La selezione delle case nella configurazione non è un consenso all’invio: l’utente avvia ciascuna analisi dall’interfaccia.

Verifiche: 32 test offline di onboarding/configurazione, inclusi account/case estranei, configurazione invalida, saldo ed esaurimento condivisi e filtro worker; build e lint. Attivazione locale verificata sui cinque documenti, ledger e conteggio job invariati. Snapshot storico all’attivazione: tetto 3 USD, impegnati 0,226290 USD, residuo 2,773710 USD, 6 chiamate conteggiate su 50. Questi numeri non sono un saldo aggiornato per sessioni future. Nessuna analisi AI avviata dall’agente.
