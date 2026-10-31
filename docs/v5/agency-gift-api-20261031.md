# Gift v1 — API, rilascio documenti e coda applicativa

31 ottobre 2026. Ramo `codex/agency-gift-contract-20261031`, PR draft72. Backend e client di protocollo implementati e verificati; schermate Gift ancora da collegare. Nessun deploy o invio reale. Il precedente limite delle23 è superato per autorizzazione di Vincenzo.

## Collegamento applicativo

`GiftAccountModule` rende disponibili lettura della ricevuta, ripresa del proprio lavoro e riepilogo del diritto annuale anche se l'ingresso di nuove Gift viene disabilitato. Non dipende dal vault o dai permessi Agency per i documenti già consegnati.

`GiftDeliveryModule` si registra nell'app soltanto con `DIMORA_AGENCY_GIFT_ENABLED=1` e `DIMORA_AGENCY_STORAGE_ROOT` esplicita. Importa il normale `DocumentsModule` e riusa il suo `LocalFileStorage`: nessun secondo archivio Home o fallback simulato. All'avvio controlla che i due storage siano separati e non annidati. Provider AI, email, addebiti e modelli d'incarico non sono coinvolti.

Il poller riscopre dal DB i job queued/ready, i retry dopo30secondi e le lease scadute o assenti. Concorrenza locale limitata a1 (massimo2 configurabile), lease/fencing persistenti del copier. Nessun endpoint permette di chiamare il worker direttamente. I guasti noti prima della lease vanno in quarantena sotto lock; un errore ignoto o un esito SQL incerto non provoca pulizia o cicli immediati. Alla chiusura il worker termina l'ammissione corrente e rilascia il lavoro durevole prima di iniziare altri file.

## Rilascio esplicito dei documenti già caricati

Il caricamento crea una fonte, non metadati Gift finali. Il nuovo comando di revisione dell'agente richiede fonte/versione/SHA correnti, revisione della pratica, titolo, origine dichiarata e conferme esplicite di versione finale e rilascio. Il server deriva scope, attore e versione metadati. Il browser non può impostare autore, firma, qualifiche/superfici, account, Home o offerta commerciale.

Per un nuovo documento ricevuto l'autore è dichiarato non verificato; per la produzione Agency il testo indica che è una dichiarazione dell'agente. Sul medesimo originale vengono conservati autore, eventuale stato sottoscritto e tutte le qualifiche delle superfici già registrati dal producer server; la firma resta `not_assessed`. Un nuovo originale non eredita stime o attribuzioni del precedente. L'approvazione rende il file eleggibile, senza selezionarlo o inviarlo automaticamente. Non serve inventare un modello incarico per consegnare documenti ricevuti.

## Contratto HTTP

Tutti i percorsi sono sotto `/api/v5`. Le mutazioni richiedono sessione, Origin e CSRF; landing ammette anche una sessione anonima con CSRF. `Idempotency-Key` è obbligatoria per release, creazione e accettazione. Query aggiuntive vengono rifiutate. Risposte ed errori Gift: `no-store`, `nosniff`, `Referrer-Policy:no-referrer`.

| Metodo e percorso | Contenuto/autorità |
| --- | --- |
| GET `/gift-capabilities` | Account autenticato; abilitazione ingresso e verifica email obbligatoria. |
| GET `/agencies/:agencyId/practices/:practiceId/gift-documents` | Fonti visibili/esportabili, stato metadati missing/current/stale; nessuna storia privata o descrizione superata. |
| POST `/agencies/:agencyId/practices/:practiceId/sources/:sourceId/gift-release` | Agente edit/export; corpo limitato a expectedRevision, expectedSourceVersion, expectedSha256, title, origin, finalDocumentConfirmed:true, releaseApproved:true. |
| GET/POST `/agencies/:agencyId/practices/:practiceId/gift-invitations` | Elenco senza segreti o dati fonte; creazione con selezione finale e destinatario unico. Segreto soltanto nella prima risposta. |
| POST `/agencies/:agencyId/practices/:practiceId/gift-invitations/:id/revoke` | Edit/export; expectedVersion; non revoca una Home già accettata. |
| POST `/gift-invitations/:id/landing` | `{secret}` nel corpo; versione corrente e necessità di account, nessun documento o email. |
| POST `/gift-invitations/:id/preview` | Secret nel corpo; solo destinatario con email verificata; proiezione nominativa, nessun originale o percorso. |
| POST `/gift-invitations/:id/claim` | Secret e expectedVersion; associazione, non creazione Home. |
| POST `/gift-invitations/:id/acceptances` | Secret, expectedInvitationVersion, home:{name,address};202, senza attendere il file scanner. |
| GET `/gift-invitations/:id/my-acceptance` | Solo lavoro/ricevuta del proprio account; not_started non rivela inviti altrui. Nessun token richiesto per la ripresa. |
| GET `/gift-acceptances/:jobId` | Stato del proprio lavoro o ricevuta accettata, indipendente da Agency/token. |
| POST `/gift-acceptances/:jobId/cancel` | Corpo vuoto, account proprietario; non annulla Gift accettate o lease attive. |
| GET `/gift-benefits` | Riepilogo minimo account del diritto full-access; false non introduce limitazioni del futuro piano free. |

Il filtro dedicato conserva401/account_context_changed e gli errori previsti, restituisce404uniforme per Gift non disponibile,409per conflitti,422per input,503per guasti. Non inoltra percorsi, email, token, getter o diagnostiche arbitrarie.

## Verifiche e limiti

- 842/842 test backend ordinari, inclusi183unit Gift, zero fallimenti o skip. Log `gift-app-regression-2.log`.
- 111/111 DB Gift, inclusi16HTTP e22copier, su cluster nuovo `zRsj7p`, poi arrestato. Log `gift-app-db-3.log`.
- 6/6 poller reale su cluster nuovo vuoto `OpnHJL`, poi arrestato: riscoperta all'avvio/periodica, quarantena e nuova app con il solo modulo letture senza vault/storage. Log `gift-app-poller-db-2.log`.
- 1829/1829 frontend,177file, typecheck/lint/build app verdi. Comprendono18test memoria link,32wire/API e14recovery. Successivo allineamento Unicode Home verificato con33/33wire/API mirati e typecheck/lint; il client mantiene joiner validi come il comando canonico server. Log `gift-app-frontend.log` e `gift-app-frontend-build.log`.
- Scanner dichiaratamente stub; filesystem/SQL/HTTP reali con fixture sintetiche. Nessuna chiamata AI, email o AV reale, nessun database esistente.

Le prime prove hanno corretto soltanto il collaudo: variante annuale false senza campo activated, normale ValidationPipe necessaria ai DTO Documenti e abortOnError:false nel test che verifica l'assenza di un provider Nest. Nessuna regola di prodotto indebolita. I cluster iniziali `odPpAd`/`Yo6adq` sono arrestati e conservati. La proiezione release finale esclude anche la ricevuta interna di audit; il nuovo test HTTP ne controlla esattamente le chiavi.

Nel frontend esistono tipi/parser e `GiftApi` sul trasporto V5 condiviso, ancora senza façade/router/viste Gift. La verifica email normale ora consente allo stesso account connesso di inviare il token; richiede logout solo quando il server lo indica. Il reset password mantiene il suo vincolo precedente. Nessuna verifica o login vengono simulati dall'interfaccia.
Frontend applicativo non ancora collegato: esistono helper token/next e client Gift, verificati; le schermate non li consumano ancora. Nessuna QA browser o375px nuova. Registrazione/verifica email normali restano obbligatorie; nessun bypass per account locali non verificati. Reissue atomico, rate limit e UI di preparazione/accettazione restano da completare prima di presentare il flusso come finito. La demo pubblica Alessio e il vecchio collaudo utente rimangono invariati.