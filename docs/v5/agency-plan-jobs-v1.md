# Agenzie — job, lease e ledger per singola analisi

## Implementato

Stato durevole nello snapshot AgencyPractice, protetto dai lock esistenti: massimo100job per pratica. Ogni run conserva creatore, prova fonte/versione/SHA/pagina, riferimento a un'autorizzazione server, modello, versione prezzi, tariffe e tetto in **microUSD interi**. Non legge né riutilizza budget della prova reale.

Metodi interni store: enqueuePlanJob, planJobCommand (claim/reserve/finish) e accountPlanPhase (settlement/uncertain). Nessun endpoint, scheduler o chiamata provider attiva. enqueue non è un DTO di consenso del browser: autorità e budget devono essere forniti dal server. L'autorizzazione è un riferimento interno, non un consenso legale verificato da questa funzione.

Capability casuale256bit fornita dal chiamante server; nel DB solo hash, nelle viste nessun token/hash o aggregate. Serve anche oltre alla membership per le operazioni del worker. Il token deve rimanere in un broker/secret store privato o essere derivato con chiave server: provisioning e recupero della capability dopo riavvio del worker sono ancora da cablare. Il test di ricostruzione store conserva la capability nel proprio harness, non prova il recupero da un broker reale.

Una lease di5minuti, un solo claim concorrente. Nessun rinnovo/handover automatico: se scade, un tentativo di claim produce uncertain anche senza prenotazioni, evitando che un vecchio worker ancora vivo possa sovrapporsi. Una lease attiva duplicata è conflitto. È una scelta conservativa finché non esiste un protocollo di fencing/heartbeat.

Per ogni fase inventory/review la prenotazione va committata prima dell'invio. Duplicato run+fase è errore, **mai** autorizzazione a ritentare. Review richiede inventory contabilizzata e fingerprint invariato. Prenotazione limitata dal tetto del run e dagli impegni esistenti; gli importi incerti rimangono impegnati.

Settlement ricalcola i costi dai token con tariffe immutabili e arrotonda al microUSD superiore. Replay esatto non addebita di nuovo; dati diversi con la stessa fase o requestId riutilizzato su entrambe sono conflitti. Spesa oltre prenotazione si registra comunque e blocca il job come uncertain. Rete incerta non libera la riserva; l'uso arrivato dopo può riconciliare la cifra ma non riavvia automaticamente il job.

Nuove fasi e completamento ricontrollano accesso edit, creatore e fonte floor_plan corrente. La **sola contabilizzazione** può avvenire con capability anche dopo revoca del grant o scadenza lease: restituisce soltanto receipt numerica, mai file o pratica. Ciò evita di perdere il costo di una richiesta già inviata quando l'utente revoca l'accesso. I record di accounting sono attribuiti al creatore come titolare del run, non prova di un suo clic di conferma.

## Non ancora implementato / blocchi prima di trasporto reale

Il tetto è del **singolo run**, non dell'agenzia o della campagna. authorizationId è deduplicato nella pratica, non globalmente fra pratiche: prima di qualunque provider reale serve un registro di autorizzazioni spendibili uniche e budget globale con lock. Non costruire un endpoint che accetti liberamente questi riferimenti dal browser. Nessuna autorizzazione di spesa reale nasce dai fixture o dall'heartbeat di sviluppo senza AI.

Mancano worker/broker con recupero capability, persistenza dei risultati intermedi, cablaggio callback pipeline, rinnovi con fencing, risultato finale salvato atomicamente con completamento, riconciliazione manuale e UI dei job. Lo stato complete del nucleo attesta solo due fasi contabilizzate e accesso corrente, non l'esistenza di una geometria valida: il futuro coordinatore deve completare insieme al salvataggio del risultato validato. Nessun retry automatico degli incerti.

Lo snapshot JSONB è una prima implementazione limitata, non coda ad alto volume. Normalizzazione in tabelle job/authorization/ledger prima del pilota e quote globali rimangono necessarie. Nessuna migrazione aggiunta in questo incremento.

## Verifiche

Test puri: autorizzazioni/capability, claim concorrente logico, scadenza, fasi/duplicati, tetto e fingerprint, prezzi/microUSD, replay/costi oltre riserva, accounting tardivo e revocato, completamento e privacy. PostgreSQL dedicato verifica replay enqueue, claim concorrenti, prenotazione riletta, contabilizzazione concorrente e dopo revoca, capability errata senza scritture e stato incerto persistente. Tutti i token, prezzi e requestId nei test sono sintetici; nessuna rete provider.

## Aggiornamento successivo — registro globale implementato
Il limite descritto sopra sul solo cap per-run è ora affiancato da AgencyAiBudget/AgencyPlanAuthorization: enqueue dello store richiede il binding server e impegna il budget condiviso, accounting/completamento aggiornano entrambi nella stessa transazione. Restano provisioning/consenso applicativo e coordinatore worker da cablare; nessun provider attivo. Fa fede il report agency-ai-budget-v1.md per questo incremento.
