# C1a — sharing-v1, contratto frontend/backend

15 ottobre 2026. Congelato per la verticale documentale approvata: originali propri selezionati, destinatario membro o esterno autenticato, manifesto, abbinamento, accettazione, revoca/scadenza. **Contratto di sviluppo, non dichiarazione di runtime già collaudato.** Sostituisce il disegno API v0.1. Schede tecniche/oggetti, ZIP, email, SMS, pagamenti e record economici fuori da questa verticale. Nessuna modifica ai permessi M2.

Backend implementato e collaudato localmente il 15 ottobre: c1-backend-review-20261015.md. Frontend reale in consegna a Claude; non dichiarare già verificata l'integrazione UI/API.

## Trasporto e tipi

Base `/api/v5`; regole sessione/CSRF/Origin/account-context di identity-v1.1. POST con `Idempotency-Key` 16–100 caratteri ASCII alfanumerici/underscore/trattino. JSON sconosciuto/ripetuto rifiutato, nessun fallback mock. Sessione e cache separate per account; 401/logout puliscono tutte le selezioni e i contesti C1. Preview/selezioni non in localStorage.

```ts
type Recipient = { kind:'member'; accountId:string } | { kind:'external' };
type Item = { documentId:string; documentVersion:number; name:string; byteSize:number; mimeType:string };
type Person = { id:string; name:string; email:string; identityVerified:false };
type ShareState = 'awaiting_pairing'|'awaiting_confirmation'|'pending'|'accepted'|'declined'|'revoked'|'expired'|'unavailable';
type Preview = {
  id:string; version:1; recipient:Recipient; recipientPerson:Person|null;
  items:Item[]; expiresAt:string; validUntil:string; manifestFingerprint:string;
};
type Share = {
  id:string; version:number; state:ShareState; createdAt:string; expiresAt:string|null;
  senderName:string|null; recipient:Person|null; items:Item[]; // [] prima dell'accettazione per il destinatario
  permissions:Array<'revoke'|'rotate_code'|'confirm_pairing'|'accept'|'decline'|'read_files'>;
  pairing:null|{ code:string|null; codeExpiresAt:string|null;
    claim:null|{id:string; account:Person; comparisonCode:string; expiresAt:string} };
  comparison:null|{claimId:string; code:string; expiresAt:string};
};
```

`Person` è profilo dichiarato, non verificato. Mittente vede destinatario scelto/claim per identificarlo, destinatario non riceve profilo completo del mittente. In unavailable niente file/ID di originali, recapiti, claim o causa vendita: items vuoti, senderName/recipient/expiresAt null. ID share/version/stato sono metadati di un invito già assegnato all'account.

Stati terminali revoked/declined/expired: items vuoti e nessun codice di abbinamento per entrambi i punti di vista. Il mittente conserva stato/versione/scadenza se ancora autorizzato alla casa; per tornare agli originali usa il proprio archivio autorizzato.

## Endpoint

| Metodo/percorso | Body / risposta |
| --- | --- |
| GET `/homes/:homeId/sharing-capabilities` | `{apiVersion:'sharing-v1',enabled:true,isSimulation:false,externalPairing:true,technicalData:false,economy:false,limits:{maxDocuments:20,maxBytes:104857600,durationDays:[1,7,30],previewMinutes:10,codeMinutes:15},permissions:['prepare']}`; permissions vuote per viewer. |
| GET `/homes/:homeId/sharing-recipients` | `{items:Person[]}`: soli altri membri attivi della casa, elenco autorizzato massimo 100; 422 se più di 100 (richiede estensione con paging, non lista troncata silenziosa). Solo mittente con edit. |
| GET `/homes/:homeId/sharing-documents` | `{items:Array<Item & {visibility:'private'|'home';eligible:boolean;ineligibleReason:'not_uploader'|null}>,nextCursor:string|null}`. Query limit/cursor; soli originali già leggibili al mittente, file altrui leggibili disattivati con motivo, privati altrui mai elencati. Il client non deduce proprietà da permissions M2. |
| POST `/homes/:homeId/share-previews` | `{documentIds:string[],recipient:Recipient,durationDays:1|7|30}` → 201 `{preview:Preview}`. Selezione 1–20 UUID distinti, file propri/leggibili, max100MiB. |
| POST `/homes/:homeId/shares` | `{previewId,expectedPreviewVersion:1,manifestFingerprint,acknowledgedDocumentIds:string[]}` → 201 `{share:Share}`. Tutti gli originali confermati, TTL preview10min, fonti/diritti ricontrollati, preview consumata una sola volta. |
| GET `/homes/:homeId/shares` | `{items:Share[],nextCursor:string|null}`. Solo mittente corrente, newest first. |
| GET `/homes/:homeId/shares/:shareId` | `{share:Share}` mittente corrente e Home autorizzata. |
| POST `/homes/:homeId/shares/:shareId/revoke` | `{expectedVersion}` → 200 `{share}`; terminale revoked, niente cancellazione. |
| POST `/homes/:homeId/shares/:shareId/rotate-code` | `{expectedVersion}` → 200 `{share}`; solo esterno ancora non abbinato/confermato e consegna non scaduta; annulla claim precedente e genera nuovo codice. |
| POST `/homes/:homeId/shares/:shareId/confirm-pairing` | `{expectedVersion,claimId,comparisonCode,confirmRecipient:true}` → 200 `{share}` pending. Confronto tramite contatto già noto obbligatorio; non basta leggere nome/email. |
| POST `/sharing/code-claims` | `{code,discloseAccount:true}` → 201 `{share}`. Account autenticato consente di mostrare al mittente nome/email dichiarati e codice confronto. Il codice non è mai in URL. |
| GET `/received-shares` | `{items:Share[],nextCursor:string|null}`; solo inviti assegnati/claim dell'account. |
| GET `/received-shares/:shareId` | `{share}`; niente Home ID, indirizzo, altri moduli o fonti prima di accept. |
| POST `/received-shares/:shareId/accept` o `/decline` | `{expectedVersion}` → 200 `{share}`. Solo destinatario pending; accept non attesta lettura e non crea membership. |
| GET `/received-shares/:shareId/documents/:documentId/file` | Attachment originale, solo accepted e ID/versione/hash presenti nel manifesto e ancora autorizzati. Nessuna URL storage pubblica. |

Liste: query solo `limit` (1–50, default20) e `cursor`. Cursore opaco vincolato ad account/Home/tipo elenco; non riutilizzabile su altro elenco. Nessun totale globale né enumerazione di altri account. Il destinatario non può filtrare per Home.

## Stati e abbinamento

Membro: creazione pending → accept/decline. Esterno: awaiting_pairing → claim → awaiting_confirmation → conferma mittente → pending → accept/decline. Revoca mittente da qualsiasi stato non terminale. Scadenza calcolata ad ogni richiesta, a `now >= expiresAt`; non scritta da scheduler. Diritti/fonti persi → proiezione unavailable o 403 generico per azioni/file. Membership del mittente corrente sempre obbligatoria; quella del destinatario richiesta solo nel percorso member.

Codice casuale base32 senza ambigui, 10 caratteri (50bit), monouso, TTL15min. Spazi/trattini ammessi per leggibilità, confronto case-insensitive; hash a riposo, niente log. Claim atomico per account autenticato, non sostituibile da altri claim. Codice consumato al claim. Codice confronto distinto casuale base32 8 caratteri (40bit), TTL15min, legato a claimId/account/versione. Il mittente contatta la persona mediante un recapito già noto, confronta le due schermate e conferma. Non è un servizio di identità verificata e non protegge una conferma data alla persona sbagliata.

Il codice iniziale è restituito **solo nella risposta che lo genera**. Ledger non salva il segreto in chiaro. Retry con stessa chiave recupera lo stesso invito ma `pairing.code:null`: mostra «Codice non recuperabile: genera un nuovo codice» con azione esplicita, mai secondo invito o rotazione automatica. Rotazione idem. Claim ripetuto stessa chiave può recuperare il codice confronto se ancora autorizzato e valido. Approva/accept non prolungano la scadenza del manifesto.

Rate limit persistente sui tentativi claim: max10/account/minuto,30/IP/minuto,100 globale/minuto e5/codice/15min. Anche tentativi falliti contano; una richiesta idempotente già riuscita può recuperare senza ripetere il claim. Risposte invalido/usato/scaduto/bloccato generiche, nessuna ricerca tramite email. Il rate limit non è un limite economico e non modifica contatori AI.

## Manifesto, autorizzazione e UI

Istante accessExpiresAt fissato nell'anteprima e mostrato prima della conferma; TTL anteprima distinto. Contenuti immutabili, niente nuovi file/versioni automatici. Avviso file completo sempre; tutti i file esplicitamente confermati, non classificare come sicuri quelli senza etichetta economica. Digest del contesto, non credenziale: il server ricostruisce/verifica solo fatti canonici e confronterà la preview salvata, mai un manifesto del client.

Revoca C1 non elimina permessi M2 già concessi; avvisare se si condivide un file home a un membro. Copie scaricate e byte già consegnati non si ritirano. Una condivisione non modifica altro: niente Spese, AI, attività, oggetti o history economica nei payload.

Consegne ricevute a livello account; Condivisioni raggiungibile da Casa e documenti senza quinta tab principale. Mockup è guida visiva, non sostituisce il contratto: niente simulazione persone/rete/eventi nell'app reale, nessun codice fisso, nessuna scheda tecnica selezionabile in C1a.

## Errori

403 `share_unavailable` generico per altro account, sorgenti non autorizzate, codice invalido/usato/scaduto; nessun nome/ID/file nella risposta. 409 `share_conflict` per versione/stato, `share_preview_expired`, `idempotency_conflict`; rilettura esplicita. 422 `validation_error` / `share_acknowledgement_required`; 429 `share_try_later`; 503 `storage_unavailable` o errore servizio standard. 401 identity invariato. Nessun errore diventa archivio vuoto, nessun successo ottimistico. POST incerto conserva body/key e offre retry esplicito; cambio dati richiede nuova operazione dopo recupero dell'esito.

Privacy da verificare su liste, dettagli, file, replay e cache. Persistenza, ledger/eventi/versione atomici; lock delle membership/fonti condiviso con revoche/modifiche. Nessuna chiamata AI, installazione esterna o invio email in questa verticale.
