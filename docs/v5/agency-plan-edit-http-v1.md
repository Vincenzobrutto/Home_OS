# Agenzie — edit planimetrie e sostituzione via HTTP

Estensione del modulo **opt-in**, sempre assente da AppModule. Aggiunti GET fonte corrente, upload sostitutivo e POST edit del piano. Nessuna route di spesa/analisi live, nessun caricamento dei servizi esistenti.

GET `/sources/:sourceId` restituisce metadata/prova correnti (versione/SHA/MIME/dimensione), filtrati dagli stessi permessi degli originali. Il client può usare il fingerprint del server per richiedere il download: non deve inventarlo o autoattestarlo. Nessuna versione precedente restituita da questa route.

POST `/sources/:sourceId/replacements`: un file+metadata `{expectedRevision,expectedSourceVersion}`, stesso cap20MiB e guard preflight. Identità dai bytes; fonte riclassificata unclassified e vecchie geometrie/computi non più correnti. Non modifica il documento in-place.

POST `/plans/:planId/edits`: Idempotency-Key e `{expectedRevision,expectedPlanVersion,reason,command}`. Comandi consentiti: geometry (rooms/perimeter), measure e resolve_issue. `parsePlanEdit` ammette soltanto chiavi esatte anche nei poligoni, calibrazione, muri e assegnazioni. Normalizza l'ordine degli oggetti per replay dopo JSON diversamente ordinato; mantiene l'ordine dei vertici.

Coordinate finite0–5000, ulteriormente limitate al raster originale dal dominio; massimo4096vertici complessivi nel DTO e limiti locali per anelli/vuoti/righe. Geometrie autointersecanti o valori non numerici rifiutati. Nessun raster, SHA, risultato AI o stato certificato dal browser. Le conferme sono booleani espliciti, non stringhe truthy. Intervalli dei coefficienti non scelti restano assenti: nessuna media automatica. Il criterio e il limite muri richiedono valori espliciti.

Il dominio rimane responsabile di sovrapposizioni, appartenenza al perimetro, versioni e precondizioni. PlanError viene mappato422 senza diagnostica interna. Una misura può essere salvata come incompleta con totale null e questioni visibili, senza forzare tutte le conferme. Definire perimetro lordo non sovrascrive i singoli vani e invalida il computo precedente; il nuovo lordo non somma nuovamente i vani.

Verifiche: parser contro campi contraffatti, ordine oggetti, geometria, conferme, coefficienti mancanti, muri e calibrazione. HTTP/DB: metadata privati, seed analisi **sintetica interna** (non provider), correzione/replay, versione obsoleta, DTO contraffatto, computo incompleto, perimetro separato, lordo confermato, sostituzione e invalidazione. Il seed non prova estrazione live: serve a verificare edit e persistito.

Restano UI pratica e form, disegno iniziale del perimetro, consenso/approval nel prodotto e attivazione esplicita del modulo. Nessun documento personale, AI a pagamento o demo Alessio toccati. Il cap DTO è una guardia applicativa, non prova di resistenza a ogni carico ostile; quote e collaudi prestazionali restano da completare.
