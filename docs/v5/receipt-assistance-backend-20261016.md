# Ricevuta assistita — avanzamento backend

## Incremento R2: bozze manuali persistenti e policy

16 ottobre 2026. Specifica consolidata receipt-assisted-spec-v1.md. Primo nucleo offline nel commit0bd30d4: dieci test verdi su evidenze e totali semplici, provenienza e confronti conservativi, candidati scoped senza associazioni per solo nome.

Implementate ReceiptDraft e ReceiptRequest con migrazione20261016114500_receipt_drafts: solo nuove tabelle, FK Restrict, indici scoped e ledger univoco; check su versione, snapshot SHA, stato/modalità e forma JSON. Nessuna modifica alle tabelle/dati esistenti. Applicata soltanto a dimora_v5_product_dev su127.0.0.1:55432 dopo assertDevelopmentDatabase. Client rigenerato fermando solo il PID corrispondente al registro/porta/percorso Node; launcher ha ripristinato l'API V5. Nessuna modifica a .env, provider o sicurezza.

Service e controller implementati, ma **ReceiptAssistanceModule non importato in AppModule**. Non sono endpoint disponibili nel servizio di produzione locale: provati in un harness Nest su porta effimera127.0.0.1 con controller/sessione/CSRF reali e database V5. Capabilities del nuovo service enabled=false, manualEnabled=false, providers=[] fino al completamento dei gate. Non presentare questa fase come ricevuta assistita utilizzabile.

### Trasporto R2 implementato nel modulo non ancora attivo

Base /api/v5/homes/:homeId/receipt-assistance. Cookie e X-Account-Context; POST richiedono Origin, CSRF e Idempotency-Key16–100 caratteri [A-Za-z0-9_-].

| Risorsa | Input / risultato |
| --- | --- |
| GET capabilities | Query vuota; apiVersion receipt-assistance-v1, enabled=false, manualEnabled=false, providers=[], disabledReason receipt_assistance_in_development, today/asOf/timeZone Europe/Rome. |
| POST manual-drafts | documentId soltanto;201 {draft}; nessun campo estratto accettato dal client. Riutilizza una bozza manuale open/parked dello stesso snapshot. |
| GET drafts/:id | Query vuota;200 {draft}, soltanto creatore/account/Home e membership attuale. |
| POST drafts/:id/park | expectedVersion;200 {draft}, open→parked. |
| POST drafts/:id/reopen | expectedVersion;200 {draft}, parked→open. |

Draft: id/homeId/version/mode/state, documentLink linked/unavailable con documento{id,name} o null, snapshot{documentId,documentVersion,sha256} o null, fields/total, permissions, createdAt/updatedAt. In manuale fields={}, total=null. Nessuna estrazione automatica dalla creazione della bozza.

Quando la fonte diventa privata/non disponibile o cambia versione/hash: GET conserva solo metadati della bozza personale, documentLink unavailable, snapshot null, fields={}, total=null, sola permission read. Nessun ID/nome/hash/citazione/valore della fonte non autorizzata. Le mutazioni e i replay richiedono fonte attuale valida e altrimenti403. Anche la riga DocumentVersion è bloccata FOR SHARE durante il controllo.

Transazione con lock account/Home e membership come servizi esistenti. Ledger registra digest/body canonico e riferimento bozza, non una risposta privata storica. Ripetizione ricontrolla accessi e proietta dati correnti; stessa chiave con body diverso409 idempotency_conflict. Versione/stato errato409 receipt_draft_version_conflict/receipt_draft_state_conflict. Nessuna modifica di oggetti o spese in questo incremento.

### Prove

- Build TypeScript e lint backend verdi.
- Test HTTP/DB su fixture sintetiche isolate: sessione/CSRF; manuale vuoto persistente e replay concorrente; nuova chiave senza seconda bozza; body diverso; account/Home/documenti privati; park concorrente e versioni; reopen/replay; revoca fonte con redazione e replay negato; originale cambiato; viewer e membership revocata.7 test conteggiati da node:test (suite padre più6subtest), nessuno skip.
- Dopo aggiunta del lock DocumentVersion: build e gli stessi7test ripetuti una volta, verdi. Contatori AiAttempt/EconomicAiAttempt invariati. Nessun file fisico caricato o analizzato: documenti della fixture sono metadati sintetici, non prova di apertura/storage/OCR.
- Test registrato in test:receipt-db e test:integration. Fixture ripulite solo tramite ID creati nel test. Nessun reset o cancellazione di dati personali.

### Prossimo incremento e limiti

Marca/modello/provenienza degli oggetti generici, confronti persistenti, decisioni e loro riapertura, matching paginato, conferma transazionale che riusa costo/oggetto e storia; nessuno di questi risulta già implementato da R2. Poi job/fixture validata, integrazione frontend Claude e contenitori, policy/fonti/proiezioni/export. Solo dopo gate DB/HTTP/browser si importa il modulo nell'app e si annuncia capabilities. Anthropic reale resta disabilitato: nessuna campagna personale o budget precedente riutilizzati.
