# Ricevuta assistita — specifica consolidata V1

16 ottobre 2026. Flusso UX approvato dal committente dopo navigazione del mockup. Autorizzato lo sviluppo; non autorizzata da questo documento alcuna chiamata esterna o analisi dei documenti personali. Il resoconto del mockup è storico in receipt-assisted-flow-mockup-20261016.md.

## Perimetro e comportamento

Incremento additivo alla Home: da una ricevuta di acquisto già conservata in Documenti proporre un oggetto generico personale e un costo, oppure riutilizzare quelli esistenti. Funzioni precedenti di Documenti, Oggetti, attività e Spese restano disponibili. Prima versione: un acquisto/oggetto, un totale EUR corrente chiaramente identificato, PDF con testo estraibile. Multiarticolo, IVA/rate/acconti, OCR e scansioni non leggibili, APE e documenti edilizi richiedono altri percorsi; nessuna falsa estrazione. Originale apribile anche se l'estrazione fallisce. Inserimento manuale con dati vuoti disponibile anche senza provider.

Percorso: Documento → Analisi esplicita → Proposte → Riepilogo → Conferma atomica → Esito e collegamenti. Anteprima originale e fonti per campo. Su desktop anteprima affiancabile, su mobile pulsante sempre accessibile. Aprire/chiudere l'originale o tornare dal riepilogo conserva il form. Modifiche manuali distinte dai dati estratti; nessuna data di pagamento o garanzia inventata.

Oggetto e spesa sono scelte indipendenti: 1/1, 1/0, 0/1, 0/0 consentiti. Escludere significa non intervenire, mai scollegare o eliminare. I collegamenti già esistenti leggibili sono evidenza prioritaria e non si duplicano. Candidati multipli senza preselezione; nome o importo da soli non provano identità. Mostrare ambiente e motivazione. L'utente può scegliere un candidato, crearne uno nuovo o non associare.

Nome oggetto e descrizione costo 1–120 code point, marca max80/modello max120 facoltativi, venditore max120 facoltativo. Importo intero EUR 1–999999999 centesimi; data di riferimento valida non futura rispetto a Europe/Rome server. Campi non selezionati non ostacolano la conferma; dati obbligatori errati danno errore comprensibile senza perdita del form. Categoria iniziale purchase_replacement, senza nuova tassonomia. Nessun negozio aggiunto automaticamente alla rubrica.

## Valori esistenti e confronti rinviati

Riempire solo campi vuoti. Per campi già uguali mantenere fonte e conferma originali. Valori diversi: confronto per campo fra dato già confermato e proposta con pagina/estratto; nessuna scelta predefinita. Azioni keep_existing e defer. defer conserva il valore attuale e registra un confronto aperto persistente, riapribile da scheda e Da rivedere. keep_existing chiude quel confronto senza sostituire il valore. Rianalisi della stessa fonte e proposta non ripete confronti già risolti. Correzione esplicita dalla scheda distinta dall'analisi; non aggiungere qui un'opzione di sovrascrittura.

Il mockup ha mostrato marca/modello discordanti dell'oggetto; stessa regola conservativa per un costo già collegato: importo/data/descrizione confermati invariati e differenza esposta. Nessuna nuova spesa per aggirare un conflitto con costo già collegato. Più costi o oggetti collegati: scelta esplicita, mai prendere il primo. Quantità/articoli multipli non supportati esplicitamente, non troncare a uno.

## Dati, autorizzazione e conferma

Oggetti generici richiedono campi marca/modello e provenienza ancora da aggiungere: non infilare questi dati nella nota e non riutilizzare impropriamente BoilerAsset. Proposte persistenti distinte da oggetto/spesa confermati. Citazione legata a documento/versione/SHA256/pagina/estratto verificato sul testo. Campi manuali non ereditano citazioni o origine AI. Nome/descrizione riformulati chiaramente distinti da citazione letterale.

Tutto scoped all'account personale e alla Home corrente, con membership e diritti riletti anche alla conferma/replay. Nessun candidato o conteggio da altri account. Una membership owner non autorizza documenti privati altrui. Oggetti archiviati o fonte revocata/versione cambiata bloccano le azioni che dipendono da essi; nessun dato sensibile nelle risposte unavailable. Nessun ampliamento automatico di condivisioni.

Conferma singola in transazione: verifica bozza/fonti/versioni dei target, crea o riusa oggetto, completa solo vuoti, collega originale, crea o riusa costo, registra provenienza e storia, conserva i confronti aperti, chiude le operazioni risolte. Una sola spesa riferita da scheda e Spese. Nessun risultato parziale dichiarato successo. Idempotency-Key stabile sullo stesso tentativo e hash canonico del body, replay autorizzato e redatto con diritti attuali; stesso key/body una sola mutazione, body diverso409. Esito rete incerto mantiene form/key e permette recupero esito, senza secondo invio cieco.

Analisi e salvataggio sono separati. Job riprende infrastruttura PDF/limiti/provider/ledger esistenti senza riattivare campagne concluse. Provare prima con fixture offline; capabilities enabled solo dopo service/DB e controlli pronti. Nessun mock fallback in produzione. Risorse UI nuove lazy come moduli esistenti, niente regressioni login/deep link.

## Contratto tecnico di coordinamento R1

Questo è il confine di lavoro per i componenti Claude; le rotte seguenti sono pianificate, NON attive. Codex implementa e aggiorna wire/types prima dell'aggancio della UI. Non dedurre payload economici esistenti dalle nuove rotte.

Base futura /api/v5/homes/:homeId/receipt-assistance. Cookie/CSRF/Origin/X-Account-Context, no-store, POST con Idempotency-Key come contratti V5 esistenti.

- GET capabilities: versione receipt-assistance-v1, enabled, manualEnabled, providers disponibili e limiti, today/asOf/timeZone.
- POST jobs: documentId, provider, consentToProviderTransfer; job asincrono. GET jobs/:id per polling, stato queued/running/succeeded/failed/uncertain e draftId nullable. Nessun retry automatico su invio incerto.
- POST manual-drafts: documentId; bozza con campi vuoti, stessa revisione/conferma. Non richiede né simula analisi.
- GET drafts/:id: versione, fonte autorizzata, proposte e citazioni, oggetti/costi già collegati e confronti, stato open/parked/confirmed/partially_resolved. Risorse candidate paginate e autorizzate con GET drafts/:id/object-candidates e expense-candidates; liste non troncate silenziosamente.
- POST drafts/:id/confirmations: expectedVersion, snapshot fonte e scelte indipendenti object/expense, versioni target se esistenti, decisioni per confronto; risultato conteggi, link autorizzati ed eventuali confronti aperti. Non inviare accountId/homeId nel body, citazioni arbitrarie o conteggi fidati dal client.
- POST drafts/:id/park e reopen: expectedVersion; GET comparisons e POST comparisons/:id/resolutions per keep_existing/defer con expectedVersion. Conflitto originale risolto non ricreato per stesso fingerprint.

Errori:401 sessione;403 generico accesso non consentito;422 validazione/tipo non supportato/evidenza non verificata;409 bozza/fonte/target cambiati, idempotency conflict o duplicazione da rivedere;503 servizio/provider non disponibile. Job errore lettura distinto da errore trasporto/conferma. Nessun messaggio d'errore contiene valori privati di target negati.

Le forme concrete JSON/API restano di Codex: primo incarico Claude riceve un modello UI esplicito a props, non un client inventato. Questo permette lavoro parallelo prima delle migrazioni e limita gli adattamenti al container.

## Gate di rilascio e matrice

1. Fonte di testo e citazioni verificate; output malformato/istruzioni nel documento trattati come dati. Bassa confidenza senza suggerimenti certi. Fixture non spaccia qualità provider reale.
2. Cinque scenari approvati, scelte indipendenti, ritorno e originali; form vuoti/zero/negativi/date future, ambiguità, conflitti risolti/rinviati e loro ripresa.
3. Test DB/HTTP su dataset sintetico V5: concorrenza, replay, stessa key/body diverso, seconda analisi senza duplicati, source/target cambiati, revoca membership/documento, account/Home separati, rollback e riferimenti/provenienze/esportazione filtrati.
4. Build/lint e regressioni mirate dei percorsi toccati; browser reale desktop320/390, focus e deep link. Nessuna chiamata Anthropic reale o documento personale fino a nuovo consenso/budget/campagna. Se manca un gate, dichiarare esattamente il livello raggiunto e tenere funzione non attiva.

## Ripartizione approvata per il pomeriggio

Codex: contratti/schema/backend/policy/test DB-HTTP, documenti condivisi, container/rotte/client comuni e integrazione finale. Claude: nuovi componenti isolati frontend-v5/src/receipt-assistance/**, loro modello UI e test, consegne progressive; non tocca le pagine/router/client comuni. Fonte operativa e ownership in outputs/Dimora-V5-ricevuta-piano-autonomo-20261016.md. Nessuna funzione cloud/email/drag-and-drop in questo incremento.


### Dettaglio R5c: copie e pagine
Candidati GET object-candidates/expense-candidates: limit1–50/cursor, risposta items/linkedCount/nextCursor. linkedCount considera tutte le corrispondenze già collegate leggibili, non solo la pagina; nessuna preselezione se più di una. Le altre schede personali sono selezionabili manualmente con reasons vuote, non definite compatibili. same_original significa SHA256 identico di un documento leggibile nella stessa Home, mai confronto su fonti private altrui. Riuso del costo conserva il suo documentId canonico; la copia viene collegata alla scheda senza ricreare costo/oggetto. Fingerprint receipt_evidence_v2 per hash/campo/valore, scoped oggetto/account/Home: la copia identica non riapre il conflitto risolto. Nessuna estrazione reale/route attiva ancora annunciata.


### Trasporto job R6b (ancora isolato)
POST jobs:202 {job}, provider receipt_fixture_v1 e consentToProviderTransfer:false, key stabile. GET jobs/:id: query vuota. Job id/version/provider/isSimulation/state/draftId/errorCode/documentLink/date; nessun lease/key/digest/storage. Fonte stale/revocata → unavailable con riferimenti/errori null. Coda8globale/2account, worker2, lease/deadline30s anche storage; timeout necessita retry esplicito. Soltanto hash dei4PDF sintetici receipt riconosciuti prima di leggere storage, nessun fallback su documenti reali. Schema provider fixture-only; Anthropic richiederà incremento separato autorizzato. Modulo/capabilities rimangono inattivi fino integrazione/browser.
