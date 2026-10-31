# Agenzie — modulo HTTP opt-in

## Superficie implementata

`AgencyPracticesModule.register(storageRoot)` definisce controller/guard/filter e richiede infrastruttura V5 e root vault esplicita. **Non importato in AppModule**: nessuna nuova route nei servizi esistenti. Nei test il modulo vive in un'app Nest separata su loopback/porta effimera, con sole sessioni e dati sintetici del cluster temporaneo.

Prefisso proposto del modulo sotto `/api/v5/agencies/:agencyId/practices`:

- GET lista assegnata, massimo50 elementi, after UUID e nextAfter. Nessun conteggio privato o accesso admin implicito a pratiche non assegnate.
- POST crea pratica `{label}`, Idempotency-Key obbligatorio; account soltanto dalla sessione.
- GET `/:practiceId`, `/review`, `/plans`: riepiloghi filtrati per fonte. Nessun aggregate interno/ledger/capability serializzato.
- POST `/:practiceId/sources`: multipart file+metadata `{expectedRevision,visibility}`. ID fonte stabile derivato lato server da account/pratica/key; SHA/dimensione/MIME dai bytes.
- POST `/sources/:sourceId/classification` e `/withdraw`: expectedRevision/sourceVersion e soli campi dell'operazione.
- GET `/sources/:sourceId/file?version=...&sha256=...`: snapshot corrente autorizzato; attachment con filename UTF8 codificato, nosniff e no-store.
- POST `/review`: unit, declare o decide. ID unità/fatto derivato server; declare diventa proposta dichiarata senza evidenze artificiali. **Nessuna proposta extracted o citazione dal browser**. Decide richiede factId/versione/action e motivazione quando corregge.

Sessione httpOnly V5, controllo account-context e Origin/CSRF esistenti, senza HomeMembership. AgencySessionGuard fa preflight dei permessi pratica prima del parser multipart; store ricontrolla dopo la ricezione e nelle transazioni. UUID scope stretti, campi extra rifiutati e idempotenza nel nucleo. Guard, DTO e filter sono separati dalla pipeline AI.

Upload: massimo20MiB durante parsing,1file e1campo metadata fino4096byte; nessun upload di hash o path attestati dal browser. Part cap include margine per terminazione multipart, file/campi restano limitati separatamente. Errori applicativi mappati403/409/422, file troppo grande413, storage sconosciuto503 senza path/testi interni; requestId casuale. Corpo multipart può avere prototipo nullo del parser: accettato soltanto con chiavi esatte.

## Limiti

Non è un'API pubblicata o attivata. Nessuna route di analisi/worker/budget/provisioning: un client non può spendere credito o inviare risultati AI. Sostituzione upload, form modifica geometria/computo e relativo DTO HTTP ancora da aggiungere; editor backend rimane interno. Nessuna lista agenzie o gestione inviti/grant nell'interfaccia, nessun file scanner attivo. Vault/decoder non equivalgono ad antivirus o sandbox OS.

JSON parser, cookie/no-store e limite body globale dovranno seguire il bootstrap V5 quando il modulo verrà importato esplicitamente. Il test usa gli stessi servizi sessione e middleware, ma non avvia AppModule né il servizio prodotto. Nessun cambiamento della demo Alessio.

## Collaudo

Sessioni reali sul DB sintetico, CSRF/account-context, lista assegnata, upload/replay, admin su fonte privata, attachment esatto, snapshot sbagliato, input extra/estratto AI contraffatto, viewer, cap20MiB, revisione concorrente obsoleta, proposta/decisione manuale, revoca e ritiro. Nessuna rete provider o AI. Prossimo task: completare trasporto degli edit e cablaggio UI pratica/form scala e coefficienti, mantenendo modulo inattivo sul prodotto fino a integrazione autorizzata.

## Estensione successiva
Metadata fonte corrente, sostituzione multipart e edit planimetria con parser profondo ora implementati e collaudati. Il modulo resta opt-in e inattivo nei servizi esistenti. [Report](agency-plan-edit-http-v1.md).
