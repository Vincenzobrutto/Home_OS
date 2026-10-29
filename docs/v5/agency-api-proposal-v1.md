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
