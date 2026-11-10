# Proposte da atto e associazione umana — dominio interno

30 ottobre2026, ciclo diurno fino18:00Europe/Rome. **Dominio implementato; [adapter DB aggiunto successivamente](agency-deed-persistence-v1.md), API/UI di quel passaggio ancora da collegare.** Non è una nuova estrazione AI o un incarico pronto.

## Due passaggi distinti

`stageDeedProposals` ricalcola il risultato del contratto lessicale a partire da testo fidato del decoder server e risposta candidati non fidata. Registra un risultato immutabile con fonte/versione/SHA/classificazione, creatore/visibilità, fingerprint, citazioni e problemi. ID record derivato dal server dal contesto/key, non dall’AI o dal browser. Non crea fatti e non conferma persone.

`bindDeedProposal` riceve soltanto riferimenti e scelte umane: record/candidato/fingerprint, unità della pratica, subjectKey esplicito, ruolo documentale riconosciuto ed eventuale motivo. Il valore/campo/prova vengono dal record, mai da un override del client. Genera ID fatto server-side e chiama il dominio review per creare **un fatto ancora proposto**, con prova e senza decisioni di conferma.

Il collegamento conserva candidato, destinazione, actor/time, riconoscimento del ruolo storico e motivo. Non trasforma acquirente storico/erede dichiarato in proprietario attuale, non genera diritti o quote, non associa automaticamente persone per nome. SubjectKey è ancora la chiave esplicita del dominio esistente, non un registro anagrafico o una verifica d’identità.

## Privacy e invalidazione

- Record privato anche se il file originale è condiviso: non visibile o associabile dagli altri assegnati, admin compreso.
- File privato prevale sul record condiviso: fonte non leggibile nasconde tutto senza placeholder.
- Fatto importato eredita la visibilità del record; nessun parametro client può ampliarla. La prova conserva comunque le restrizioni della fonte.
- Ritiro/revoca negano vista e binding; sostituzione o riclassificazione rendono obsoleto il record. Risultati/bindings non esposti nella vista stale e nessuna riattivazione tramite replay.
- Dipendenza ancorata a citazione reale del testo server anche quando nessun candidato è stato accettato; testo indisponibile non produce un’ancora inventata. Il decoder reale normalmente rifiuta già il testo assente.

Record e fatti restano distinti: associare non conferma. Solo una decisione umana successiva nel dominio review rende il dato utilizzabile dal pacchetto interno; anche allora il modello incarico mancante blocca sempre generazione.

## Integrità e limiti

CAS pratica, receipt per account/key e digest canonici, replay esatto senza duplicati o perdita di una conferma intervenuta dopo l’import. Stesso candidato/unità/subjectKey con key nuova non viene duplicato; un’altra unità richiede un’altra scelta esplicita. Candidati di analisi diverse non vengono deduplicati o fusi con fatti esistenti: nessuna sovrascrittura silenziosa.

Limiti:20record,2000receipt e2MiB UTF-8 complessivi per i metadati deedRecords/deedReceipts, oltre ai limiti del contratto e ai1000fatti del dominio review. Superamento rifiutato su una copia, aggregato originale invariato. Nessun budget/spesa AI viene gestito o autorizzato qui.

Le funzioni sono interne: TrustedDeedText deve provenire dal decoder autorizzato, mai da un body HTTP. L’adapter deve caricare contesto aggiornato sotto lock, applicare la mutazione e persistere atomicamente; non restituire il Practice grezzo al browser. Al checkpoint di questo report i record vivevano soltanto nell’aggregato restituito; il successivo adapter persistente è documentato separatamente, senza nuove tabelle/migration o route.

## Verifiche

21nuovi casi sintetici, profilo finding/domain mirato72/72, regressione ordinaria568/568, build e lint mirato verdi. Coperti immutabilità/view-clone, originali/record privati, admin/viewer, replay/CAS e key conflittuali, ruolo/unità espliciti e override rifiutati, nessuna conferma/diritti, privacy import, replay dopo conferma umana, seconda unità deliberata, fonte sostituita/ritirata/riclassificata, revoca, fingerprint, ordine JSONB, limite record e byte senza scritture parziali, ingresso nel pacchetto soltanto dopo conferma e sempre senza contratto generabile.

Fixture di dominio con testo fidato sintetico esplicito; non un nuovo collaudo decoder o DB. La prova end-to-end persistente con PDF realmente decodificato è il prossimo task, su cluster nuovo posseduto. Nessun documento personale, provider reale, libreria installata, servizio esistente, demo Alessio, merge o deploy.

## Prossimo incremento

Metodi interni store per stage/read/bind, transazione con contesto/lock e viste filtrate. Prove DB di persistenza/riapertura istanza, concorrenza e replay, privati/admin/viewer, cambio fonte o revoca fra decoding e stage, conferma review e pacchetto. Solo dopo contratto HTTP/CSRF e contenitore UI: mai accettare risultato AI attestato dal browser per aggirare il decoder.
