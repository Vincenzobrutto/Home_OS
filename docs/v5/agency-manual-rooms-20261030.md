# Vani mancanti e separazione manuale — 30 ottobre 2026

Richiesta: conservare i contorni soddisfacenti della prova reale, ridurre omissioni dei passaggi e permettere di aggiungere un vano dall'anteprima. Demo Alessio esclusa.

## Implementato

- Prompt inventory/review: censimento separato dei percorsi dall'ingresso, corridoi e disimpegni stretti o senza etichetta, anche con porte aperte. Uno spazio funzionale non coincide necessariamente con una componente bianca connessa. Stesso contorno prodotto per due vani non-balcone dello stesso tipo genera `semantic_regions_merged`; i casi di tipo diverso mantengono il conflitto già esistente. Nessuna parete inventata o spostamento arbitrario dei seed per occultare il problema.
- Pulsante `Disegna / aggiungi vano` nel workspace reale, entrambe le viste conservate. Nome, tipo, motivo; ricalco sull'originale con i contorni esistenti come riferimento e vertici aggiunti in ordine. Dopo il salvataggio valgono gli strumenti già presenti per spostare, aggiungere su un lato ed eliminare vertici.
- `Nuovo spazio non riconosciuto`: nuovo poligono distinto, sovrapposizioni rifiutate. `Ricava da…`: intersezione della selezione con il vano di origine e sottrazione atomica da esso; altri vani e perimetro invariati. Non si duplica la superficie.
- Anteprima server non persistente obbligatoria prima di salvare. La conferma riusa esattamente corpo/revisioni/key controllati; salvataggio incerto congelato con retry identico, conflitto richiede reload, revoca propaga al contenitore. Le modifiche ai campi invalidano l'anteprima.
- Provenienza `manual`, `derivedFrom` quando applicabile, niente seed/componente/area pixel AI inventati. Storico precedente conservato; versione/revisione geometrica incrementate, computo/configurazione invalidati e simboli del vano di origine riaperti prudentemente. Nessuna verifica documentale chiusa automaticamente.

## Contratto e limiti

`POST /api/v5/agencies/:agencyId/practices/:practiceId/plans/:planId/edit-preview` usa lo stesso DTO esatto di `/edits`, con sessione, account context, Origin/CSRF, fonte corrente e autorizzazione di modifica. Risposta `{plans}` del candidato, senza scritture a snapshot o receipt. La revisione nella risposta è ipotetica; la conferma invia quella originale.

Nuovo comando: `{operation:'add_room', id, label, kind, geometry:{points,holes}, parentId?}`. Tipo esplicito tra room/bathroom/kitchen/corridor/balcony. Limiti, identità, raster, geometria e sovrapposizioni verificati dal server. `/edits` continua a garantire CAS, idempotenza e filtro per fonte.

Ritaglio locale con Path2D boolean ops della dipendenza canvas già presente: nessuna nuova libreria o chiamata AI. Conservazione area controllata con tolleranza massima tra 0,01 pixel quadrati e 1e-6 relativo. Ritagli vuoti, intero vano e risultati con più componenti separate vengono rifiutati invece di scartare porzioni. Non è una certificazione geometrica o metrica.

Le nuove istruzioni AI non sono ancora state misurate su un nuovo invio reale: riducono ambiguità nel contratto ma non garantiscono zero omissioni. Per spazi comunicanti manca ancora una partizione automatica affidabile; il fallback manuale resta necessario. Nessuna nuova spesa in questa attività.

## Verifiche effettive

- Backend ordinari 578/578 prima dell'ultimo test di guardia aggiunto; guardie finali 13/13, incluso secondo target esatto. Prima esecuzione sandbox fallita per hardlink temporanei/listener, ripetizione fuori sandbox verde senza rimuovere guardie.
- Target geometria/DTO 61/61; HTTP/PostgreSQL isolato 25/25, inclusi preview non mutante, accesso privato negato, salvataggio/replay, sottrazione atomica e revisioni obsolete.
- Frontend planimetrie finale 41/41 in cinque file; typecheck e lint mirati verdi. Test nuovi per conferma dopo anteprima, retry incerto, overlap, revoca, invalidazione preview e trasporto autenticato. Primo ciclo corretto per fallback dialog jsdom; nessun assert allentato. Una successiva esecuzione sandbox bloccata dalla cache, ripetuta fuori sandbox.
- Browser reale: comando e dialog di aggiunta aperti sulla pratica del PDF fornito; ricalco con contorni di riferimento aperto. Nessuna geometria reale nuova salvata in questa verifica: il ritaglio persistente è verificato con fixture sintetiche via HTTP. Nessun nuovo collaudo mobile dichiarato.

## Trial e riservatezza

Il trial utente resta sul cluster già posseduto, stessi originali/account/sessione, codice aggiornato in loco. API3120/UI127.0.0.2:34874 con AI disabilitata, fine invariata 16:15 Europe/Rome. Nessun originale, geometria reale, risposta provider o sessione in Git.

Un precedente tentativo di preparare un'esportazione ampia del database privato per migrare l'ambiente è stato respinto dall'auto-review per copia non necessaria di sessioni/permessi e dati sensibili. Non eseguito, nessun export prodotto; sostituito con aggiornamento in loco del solo codice. Non aggirare quel rifiuto.

Per HTTP test: nuovo cluster sintetico sulla seconda porta fissa55440 tramite `test/offline-secondary.cjs`, limitato al profilo agency-http-db. URL esatto, marker di ownership e rete/AI bloccate restano obbligatori; non si accede al trial55439. Cluster di test arrestato dopo la suite, file conservati. Nessun deploy o merge; incrementi paralleli del branch preservati.

## Prossimo passo

Verificare visivamente con Vincenzo quale passaggio aggiungere e salvarne il contorno; poi benchmark indipendente su planimetrie autorizzate per misurare copertura e separazione dei percorsi. Nuovo invio AI solo con verifica preventiva del ledger attuale, mai retry del run incerto.

## Prova reale successiva — 16:06 Europe/Rome

Su conferma esplicita del committente eseguito il recupero nella pratica reale. Rettifica della diagnosi preliminare: il corridoio ovest costituisce una componente separata omessa, non una parte del soggiorno. Punto interno scelto manualmente; stesso algoritmo locale di segmentazione sui pixel dell'originale produce un contorno di28vertici, senza AI. Inserito tramite campi XY del disegno manuale, anteprima server, conferma e reload reale:11vani presenti. Non presentare questa prova come riconoscimento AI autonomo o nuova funzione di selezione seed nell'interfaccia.

Controllo successivo strettamente limitato alla singola pratica autorizzata: dieci room record precedenti identici, perimetro identico, nuovo vano origine manuale con seed nullo e nessuna sovrapposizione. Nessuna esportazione di account/sessioni/permessi/documenti; diagnostica privata locale, nessuna geometria reale suGit.

Scala invariata10m sulla stessa barra. Corridoio6,344496958m2. Ricalcolo da UI con identiche categorie della prova precedente e nuovo corridoio principale: interni127,918615m2, balcone scoperto51,816910m2 al25%=12,954227m2; parziale140,872842m2, rispetto al precedente134,528346m2. Le fasce dei muri non sono state inventate o confermate: stato incomplete, totalM2=null e sette verifiche aperte. Persistenza del nuovo parziale verificata dopo ulteriore reload.

Screenshot del corridoio selezionato sull'originale negli output privati della chat. Nessuna nuova chiamata AI/spesa o modifica demo Alessio. Fine trial invariata16:15. Prossimo: benchmark dei prompt su altro documento autorizzato e completamento esplicito di perimetro/muri/simboli/criterio, non chiusura automatica delle verifiche.
