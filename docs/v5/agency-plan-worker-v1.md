# Agenzie — coordinatore interno planimetrie

## Implementato

`runAgencyPlanJob` collega porte già verificate: contesto fresco AgencyPractice → claim → bytes autorizzati → decoder PDF/PNG → pipeline semi/segmentazione/revisione → prenotazioni/settlement persistenti → registrazione risultato e completamento atomici. Inerte finché invocato; nessuno scheduler, route o provider di rete attivo.

Capability HMAC-SHA256 derivata da chiave server e scope account/agenzia/pratica/run. Un worker riavviato può ricomputarla senza token nel payload di coda/browser; nel DB solo hash. La chiave viene iniettata, non letta da file/env durante i test. Produzione richiede chiave ad alta entropia provisionata e conservata in secret store, rotazione/versione e broker ancora da cablare. La prova usa una chiave sintetica.

Configurazione modello/prezzi proviene dal job persistito ed è fornita alla factory provider interna. Metà del tetto run è il massimo per ciascuna delle due chiamate, fino1USD/fase; nessun budget reale nasce da questo criterio. Prima di ogni invio viene committata la prenotazione unica. L'accounting ricalcola il costo con i prezzi del job e confronta la cifra del provider. Output invalido, revoca o errore dopo una chiamata conserva la spesa nota e marca il run incerto; nessun riavvio automatico.

`completePlanJob` verifica prova/fingerprint e le due ricevute contro il ledger, registra la geometria proposta, completa il job e chiude/rilascia il residuo dell'autorizzazione **nella stessa transazione**. Errore di geometria o autorizzazione non salva né risultato né chiusura. Lo store non supporta più il vecchio finish senza risultato: claim/reserve soltanto, poi completePlanJob. La funzione pura finish rimane parte della transizione interna.

Job già completato: restituisce risultato persistito leggibile senza ricostruire il provider o rifare chiamate. Job leased/incerto non viene rilanciato. Concorrenza di due worker: uno solo può acquisire la lease. Il contesto worker è un oggetto interno che include Actor/Practice; vietato serializzarlo in HTTP. Le viste restituite all'agente passano sempre dai filtri sulle fonti.

## Limiti ancora aperti

Non è integrazione utilizzabile dall'agente: mancano approvazione/provisioning budget nel prodotto, trasporto provider, endpoint sessione/CSRF/DTO e navigazione/UI della pratica. Il test con provider fake è end-to-end **interno offline**, non HTTP o analisi live.

Non persiste proposte intermedie complete per ricostruire un run interrotto: non riprende un invio pregresso. Stato e impegni restano durevoli e bloccati per riconciliazione manuale. Errori prima della prima prenotazione lasciano lease/impegno fino alla gestione esplicita; nessun rimborso automatico o handover. Risultati finali conservati, ma nessuna garanzia di output dopo crash fra settlement e completamento. Restano isolamento OS del decoder, JPEG/EXIF, quote e retention.

## Verifiche

Unitari su derivazione scope/chiave, chiave debole, replay completed senza provider, rifiuto leased/uncertain e diniego iniziale. PostgreSQL con bytes PNG sintetici realmente caricati e decodificati, provider in memoria: due fasi, segmentazione, risultato/job/budget conclusi insieme; riapertura senza richieste; output fatturato invalido conserva costo e cap senza geometria; revoca durante chiamata registra costo e scarta risultato. Il profilo combinato riprova anche job/budget e rollback della chiusura con geometria invalida. Nessuna AI, documento personale o DB esistente utilizzato.
