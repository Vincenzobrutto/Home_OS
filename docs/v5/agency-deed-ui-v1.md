# Associazione proposte da atto — UI indipendente

30 ottobre2026, ciclo diurno. DeedWorkspace e client agencyDeedApi in frontend-v5/src/agency-review, riuso CSS del workspace dati. Nuovi file indipendenti, nessun router o runtime Home modificato.

## Comportamento implementato

Mostra valore originale, citazione/versione/pagina, ruolo documentale e riferimenti interni al documento. Nessuna identità o unità precompilata: l'agente sceglie unità già registrata, inserisce subjectKey stabile e riconosce esplicitamente il ruolo nell'atto. Motivo facoltativo. L'azione è Associa come dato proposto; non modifica citazione/valore e non conferma il dato. Associazioni già presenti mostrate; stessa destinazione duplicata bloccata, un'altra destinazione rimane una scelta esplicita. Non certifica anagrafiche, successione o titolarità odierna.

Unità lette tramite GET review e proposte tramite GET deed-proposals con trasporto V5 esistente: sessione/account/CSRF/key e ID record escapato. Letture parallele con revisioni diverse rifiutate409, nessun accoppiamento silenzioso. Binding usa POST già verificato; nessun endpoint stage o mock fallback. Le porte iniettate non eseguono AI.

Fonte superata non ha form; nessuna unità o nessun record non producono analisi/completamento fittizi. Quote React testuali, apertura fonte solo callback con descrittore, nessun URL arbitrario. Il contenitore autorizzato deve fornire il visualizzatore originale.

Gestione stato:401/403/404 nascondono contenuti;409 congela fino a ricarica;422 permette correzione; errore incerto conserva soltanto payload/key originari per retry manuale. Nessuna promozione ottimistica. Revoca locale readonly blocca anche il retry di un invio precedente. Cambio scope o porta API non può ripristinare una risposta tardiva. Backend resta autorità dei permessi e della persistenza.

## Verifiche e limiti

20nuovi test:16UI e4client. Gruppo complessivo58/58, incluse38prove precedenti; typecheck app/lint mirato verdi. Prima esecuzione sandbox non ha eseguito test per rename EPERM nella cache temporanea; rieseguito nel perimetro autorizzato senza cambiare guardie o assert. Prima iterazione57/57, poi aggiunto readonly su retry e ultimo58/58.

Browser desktop e375px su nuovo harness dichiaratamente sintetico agency-deed-preview.html, non route del prodotto. Scelta unità e riferimento, ruolo, motivo, salvataggio simulato ancora proposto, evento fonte e ricarica verificati. A375viewport/client360/scroll360, nessun overflow,0errori console. Screenshot negli outputs della chat: Dimora-associazione-atto-desktop.png,375.png,375-salvata.png. Screenshot iniziale375può precedere il paint degli ultimi campi; stato salvato e DOM confermano l'esito. Viewport ripristinato, tab propria chiusa, server privato34879fermato e assenza listener verificata.

**Non ancora montato nella pratica.** Non è collaudo UI→HTTP→DB end-to-end né telefono fisico. SubjectKey è testo esplicito e stabile ma non un'anagrafica verificata. Mancano contenitore/autorizzazioni fonte, invalidazione coordinata delle altre viste dopo binding e collegamento Dati e fonti. L'estrazione atti/provider/consenso/budget dedicati non è ancora orchestrata; il modello incarico manca, canGenerateDraft rimane false. Nessuna spesa, documento personale, servizio/DB esistente, demo Alessio, merge o deploy. Backend invariato da5260d74, non ripetuti i suoi test.
