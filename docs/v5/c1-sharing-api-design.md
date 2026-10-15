# C1a — disegno API, da congelare dopo revisione UX

15 ottobre 2026. **Non è un contratto attivo.** Nessun endpoint, tabella o permesso C1 è installato. Backend attuale: solo `src/sharing/policy.ts`, funzioni offline e relativi test. La prima verticale proposta riguarda originali propri condivisi con una persona già membro della stessa casa. Esterni e oggetti sono revisionati nel mockup di Claude prima di stabilire l'ordine finale.

## Confini

Namespace separato: i diritti C1 non entrano in `canReadDocument`, ricerca M2, schede oggetto, estrazioni M3 o aggregati S1. Il destinatario usa una vista di consegna stretta, senza ottenere ruolo o membership. Nessun file servito da public. Nessuna riscrittura della visibilità `private/home`.

Fatti di membership/originale risolti dal server e bloccati/riletti nella transazione: mai fidarsi di uploader, destinatario o permessi contenuti nel body. Sender owner/member, non viewer; destinatario anche viewer se membro attivo. Solo uploader può concedere il proprio originale. Perdere membership o diritto alle fonti blocca C1; nessuna concessione storica supera la vendita.

## Proposta delle operazioni

Base `/api/v5`; cookie, CSRF, Origin, account-context e formato errori identity-v1.1. Tutte le POST richiedono chiave idempotente. Liste con keyset vincolato ad account/filtri, massimo 50, nessuna enumerazione globale account.

| Operazione proposta | Body / risultato essenziale |
| --- | --- |
| GET `/homes/:homeId/sharing-capabilities` | enabled, limits, modalità destinatario realmente disponibili. False fino all'integrazione completa. |
| GET `/homes/:homeId/sharing-recipients` | Solo membri attivi della casa autorizzati per questa funzione, ID canonico e nome; nessuna ricerca di email globali o risposta sull'esistenza di altri account. Risolvere omonimi nel manifesto senza divulgare dati non autorizzati. |
| POST `/homes/:homeId/share-previews` | `{documentIds,recipientAccountId,durationDays}`; massimo 20 file, 100 MiB complessivi, durata 1/7/30 giorni. Persistenza temporanea senza permesso di lettura; risposta con previewId/version, items, destinatario autorizzato, expiresAt, previewExpiresAt e manifestFingerprint. |
| POST `/homes/:homeId/shares` | `{previewId,expectedPreviewVersion,manifestFingerprint,acknowledgedDocumentIds}`; confronto col manifesto server, riconvalida diritti/fonti e creazione pending atomica. Nessuna email inviata. |
| GET `/homes/:homeId/shares` | Solo inviti preparati dal mittente corrente; stato server e scadenza, nessun contenuto altrui. |
| GET `/received-shares` | Solo inviti al destinatario corrente. Pending: nome mittente già autorizzato e conteggio, senza titoli, indirizzo, document IDs o file. |
| POST `/received-shares/:shareId/accept` o `/decline` | `{expectedVersion}`; solo destinatario canonico, membership e fonti ricontrollate; nessuna lettura dei contenuti prima di accept. |
| GET `/received-shares/:shareId` | Accepted e attuale: soli originali del manifesto. Nessun derivato/costo/link all'Home del mittente. |
| GET `/received-shares/:shareId/documents/:documentId/file` | Solo ID presente nel manifesto e versione/hash originali immutati. Attachment originale con controllo sessione e permessi prima della consegna, nessuna URL storage pubblica. |
| POST `/homes/:homeId/shares/:shareId/revoke` | `{expectedVersion}`; solo emittente, revoca atomica/versionata e replay idempotente. Nessun hard delete. |

Limiti tecnici proposti, non quote commerciali. Il manifesto scade a un istante UTC esplicito; durata in ore reali (giorni ×24), la UI mostra data/ora locale Europe/Rome. Preview massima 10 minuti, poi rifare l'anteprima. La durata accesso parte dall'anteprima e non si prolunga all'accettazione o al retry. Se questo risulta poco chiaro nel mockup, modificare prima del congelamento, non introdurre due scadenze nascoste.

## Modello e concorrenza previsti

Entità additive: preview temporanea account/Home; share con sender/recipient account ID, home ID, version/state, expiresAt/acceptedAt/revokedAt; righe selezione con FK originale, versione/hash; evento operazione e ledger idempotente. Nessuna copia di PDF o record economici. Vincoli unique per documento nel pacchetto e richiesta account/Home/op/key.

`manifestFingerprint` è un digest del contenuto canonico e del contesto, **non un token di autorizzazione**. La conferma deve riferirsi all'anteprima server corrente: non ricalcolare un manifesto nuovo usando il consenso precedente. Cambio destinatario, durata, versione, file o contenuto invalida la conferma. Replay del ledger nuovamente autorizzato/redatto, mai JSON pubblico storico non controllato.

Prima del commit condividere lock Home/membership/documenti con le operazioni che revocano o sostituiscono le fonti. Accettazione/lettura non bastano al download: ogni file rilegge scadenza/stato/fonti. Una risposta già consegnata e una copia scaricata non possono essere ritirate; la UI lo esplicita. Nessuna promessa che la revoca interrompa byte già trasmessi.

## Errori e cache

- 401 sessione assente/cambiata: pulizia cache privata, login senza dettagli della consegna nel messaggio.
- 403 `share_unavailable`: nessun ID/titolo/indirizzo nella risposta se destinatario errato, revoca, membership o fonte non leggibile. Scadenza può essere spiegata solo a soggetti già autorizzati a conoscere l'invito.
- 409 preview/version/state conflict: rilettura esplicita, nessun conferma/retry automatico con contenuto diverso.
- 422 selezione/consenso/formato/limite: errori sul form; `share_acknowledgement_required` sul manifesto non corrispondente.
- 503 storage/DB: non dichiarare invito fallito con certezza dopo risposta persa; conservare body/key e recuperare idempotentemente.

Cache per account/Home/share; logout e cambio account eliminano preview, selezioni, file references e cache. Nessun localStorage persistente per la selezione. Dati del destinatario non riutilizzati nella schermata di un altro account.

## Gate prima del runtime

Revisione/mockup Claude → arbitrato Codex e specifica aggiornata → contratto REST/tipi congelati → schema/migrazioni/servizi/test DB/HTTP → incarico frontend reale distinto → integrazione/browser. Oggi non è iniziata una migrazione e nessun nuovo accesso è stato concesso. La scelta esterni richiede un protocollo di identità/consegna specifico: non attivare il disegno same-Home come surrogato di un link esterno sicuro.
