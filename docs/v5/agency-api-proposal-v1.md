# API Agenzie — proposta di contratto v1

30 ottobre2026. **Non implementata e non registrata in AppModule.** Lo store interno è implementato e collaudato separatamente; queste route non sono disponibili sul prodotto.

## Identità e confini

Base proposta `/api/v5/agencies/:agencyId/practices`. Cookie/CSRF/Origin e X-Account-Context V5; account dall’autenticazione server, mai da body. UUID validati all’ingresso. Appartenenza Agency e assegnazione Practice separate dai permessi Home. Nessun provisioning pubblico automatico per l’agenzia, nessun ruolo scelto dal client. Le nuove migrazioni sono applicate soltanto ai cluster di test finché il committente non autorizza un rilascio.

## Primo gruppo di route da implementare

| Route | Corpo/risposta | Protezioni |
| --- | --- | --- |
| POST `/` | `{label}`; riepilogo filtrato della nuova pratica | Chiave idempotente; membro attivo agent/admin; assegnazione al creatore atomica |
| GET `/:practiceId` | Label, revisione, documenti leggibili; nessun conteggio di fonti private altrui | Assegnazione temporale e appartenenza valide |
| POST `/:practiceId/documents` | Multipart file+visibilità, expectedRevision | Validazione byte/MIME/hash, controllo file, storage privato e staging; il client non fornisce SHA attendibile |
| POST `/:practiceId/documents/:sourceId/versions` | Nuovo file, expectedRevision, expectedSourceVersion | Stessa validazione, originale precedente preservato, invalidazione dipendenze |
| POST `/:practiceId/documents/:sourceId/classification` | kind, expectedRevision e expectedSourceVersion | Decisione esplicita, tipo non equivale a contenuto verificato |
| GET `/:practiceId/documents/:sourceId/file` | Binario privato | Diritto sulla singola fonte riletto immediatamente prima della consegna |
| POST `/:practiceId/export` | Selezione esplicita di sourceId/version/SHA |1..50fonti,100MiB; rifiuto dell’intera selezione se una fonte non è consentita |

La preparazione del manifest non è autorizzazione permanente al download. Niente URL di storage, link pubblici o originali in localStorage. Le risposte pubbliche non serializzano l’aggregato interno contenente ricevute, fonti private e prove.

## Errori proposti

403 `access_denied` generico per risorsa assente/altrui/revocata;409 `revision_conflict` o `source_changed`;409 `idempotency_conflict`;422 `invalid_input`; errore file/storage esplicito senza creare una fonte completa se il caricamento non conclude. Nessun fallback dal nuovo dominio a Home o al backend legacy.

## Group successivi

Analisi con consenso e budget, proposta dei fatti con evidenze, decisioni e correzioni versionate, esiti di coerenza e risoluzioni, bozza incarico. Contratti da dettagliare dopo il nucleo di revisione. Non aggiungere chiamate AI a pagamento o compilazione automatica dei ruoli finché il relativo incremento non è autorizzato e collaudato.

## Revisione — nucleo implementato, trasporto ancora proposto

Lo store interno dispone di readReview/review, non di route attive. Il futuro GET `/:practiceId/review` restituisce solo fatti e prove leggibili, revisione della pratica e unità. Per ogni fatto: valore proposto, origine, stato/versione, eventuale valore confermato con confirmedOrigin/confirmedBy/confirmedAt, prove originali e decisioni. Correzione manuale etichettata manual_correction; fonte obsoleta azzera il valore confermato corrente, non la storia.

POST proposto `/:practiceId/review` con Idempotency-Key e `{expectedRevision,command}`. Il key del nucleo interno viene aggiunto dal server, non duplicato dal browser nel body. Comandi iniziali:

* unit: id server, label; nessun matching automatico per nome.
* propose: id server, unitId, subjectKey interno, field in allowlist, value scalare tipizzato, origin extracted/declared, visibility private/practice, evidence. Extracted richiede fonte/versione/SHA/pagina/estratto, declared nessuna prova artificiale.
* decide: factId, expectedFactVersion, action confirm/correct/reject; correct richiede value e reason. Nessun campo status=confirmed accettato dal client o da risposta AI.

Il nucleo chiama il target `id`; il futuro DTO HTTP mapperà esplicitamente factId/id senza accettare l’aggregato o Actor. Il gruppo analisi/worker è ancora assente: un browser non deve autoattestare l’origine extracted o le citazioni. Separare i comandi di proposta validata dal provider dai comandi manuali consentiti all’agente al momento di creare i controller. Non esporre direttamente lo store al trasporto senza questo confine.

## Planimetrie — metodi interni, nessuna route attiva

Store.savePlan/readPlans/editPlan disponibili internamente con CAS, idempotenza e accessi. Il risultato AI non è un payload accettabile dal browser. Endpoint futuri richiedono DTO esatti, limiti payload, sessione/CSRF e worker con ledger durevole. Non registrati controller o moduli. [Report](agency-plan-integration-v1.md).

## Confine bytes ora disponibile internamente
Lo store upload/readFile deriva identità dai bytes e applica lock/CAS/permessi. Il trasporto resta proposto: non accettare Actor, SHA, MIME o path dal browser come attestazioni. Limite ricezione20MiB, header download sicuri ed error mapping generico da implementare nel controller; firma media non equivale a decoder. [Limiti storage](agency-files-v1.md).
