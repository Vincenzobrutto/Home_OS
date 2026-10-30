# Proposte da atto e binding — adapter persistente

30 ottobre2026, ciclo diurno fino18:00Europe/Rome. Incremento interno verificabile su dati sintetici; nessun nuovo provider AI o documento personale.

## Implementato nello store

Nuovi metodi AgencyPracticesStore:

- `readDeedProposals`: vista dei record autorizzati, valori/proposte nascosti se superati e nessun placeholder per record/fonte privati non leggibili.
- `stageDeedProposals`: testo da decoder server e risposta candidati validati dal dominio; persiste record/receipt/dipendenza nello snapshot JSONB esistente.
- `bindDeedProposal`: scelta umana e fingerprint/CAS; persiste insieme fatto ancora proposto, prova, collegamento e receipt. Restituisce ID server e viste filtrate del record e dei fatti.

Ogni operazione usa il contesto privato esistente: lock membership/grant e riga pratica, verifica corrente e updateMany con revisione attesa. Le mutazioni riverificano permesso edit prima di restituire dati; errori o conflitti fanno rollback. Replay restituisce lo stato attuale senza duplicare record/fatti o annullare una conferma umana successiva. Nessun Practice grezzo o receipt completo al browser.

Nessuna nuova tabella/migration: campi opzionali deedRecords/deedReceipts del JSONB con i limiti del [dominio](agency-deed-records-domain-v1.md). Nessun dato di altri flussi Home o servizi esistenti riutilizzato.

## Confine di fiducia invariato

Stage è **metodo interno**, non endpoint: TrustedDeedText deve provenire dal decoder autorizzato. Non accettare testo pagine o risultato attestato da un body HTTP. Il decoder verifica byte/SHA e rilegge l’autorizzazione; lo store ricarica ancora contesto e fonte prima del commit, così un cambio o una revoca dopo il decoding impediscono il salvataggio.

La risposta candidati è simulata esplicitamente nel test. Testo del PDF e byte provengono davvero dal worker locale; questo non è una chiamata AI o una verifica semantica. L’associazione crea solo proposte, non certifica persone/diritti e non genera un incarico. SubjectKey rimane una scelta esplicita, non un registro anagrafico verificato.

## Collaudo DB dedicato

Nuovo profilo protetto `npm run test:agency-deed-records-db`, incluso nel solo aggregato DB; guardie originarie non allentate. Prima di aprire il client, il test verifica URL esatto offline e marker/token del run posseduto. Vault sintetico nel run stesso, nessuna cancellazione ricorsiva o risorsa altrui.

**14/14 test** (suite+13casi) su nuovo cluster `dimora-offline-2xFrbX`, fermato con log stop-postgres. PDF sintetico a due pagine caricato realmente nel vault e decodificato prima dello stage. Casi:

1. Persistenza e nuova istanza store, clone delle viste senza modifica del record.
2. Stage concorrente stessa key: un record e un replay.
3. Stage concorrenti con key diverse/revisione unica: un successo e un conflitto.
4. Record privato da file condiviso e fatto importato privato/proposto.
5. Binding concorrente stessa key: un fatto e ID stabile.
6. Binding concorrenti diversi: una sola scrittura.
7. Replay JSONB dopo conferma umana: conferma/versione non perse.
8. Fonte privata/record condiviso e admin assegnato o senza assegnazione.
9. Viewer legge ma non stage/bind, snapshot invariato dopo diniego.
10. Fonte sostituita dopo il decoder: nessuno stage del testo vecchio.
11. Grant revocato dopo il decoder: nessuna scrittura.
12. Riclassificazione/ritiro e nessuna riattivazione tramite replay.
13. Fingerprint errato/override client: rollback; key ancora utilizzabile con richiesta corretta.

Build e lint mirato verdi; regressione ordinaria finale568/568, incluse le guardie di registrazione del nuovo profilo. Nessuna API avviata dal profilo e nessuna chiamata a pagamento. Cluster, log e vault conservati nella cartella del run per tracciabilità.

## Ancora da fare

Nessuna route stage/read/bind nuova, nessun contenitore UI collegato a questi metodi. API di lettura e binding richiedono ancora sessione/CSRF e DTO esatti; stage non va esposto come caricamento di risultato AI client. Provider atti/job/consenso/budget distinti restano da implementare prima di qualsiasi invio reale. Le UI dati/finding esistenti restano componenti separati dalla navigazione.

Prossimo passo: GET record e POST binding su endpoint autorizzati, senza parametro di valore o testo fidato; test HTTP con sessione/CSRF, prove private, errori e replay. Poi UI di associazione e montaggio delle revisioni nel percorso pratica. Modello incarico reale ancora assente e canGenerateDraft false.
