# R04 — orchestrazione della conferma transazionale

23 ottobre 2026. Branch codex/fase0-ai-quality-v3; base 6d72fd268bcdeb2ef125efccfbeabf92592ae1ed, fetch e confronto upstream 0/0 prima del lotto. Main escluso.

## Intervento

La conferma distingue ora controlli preliminari, articoli/oggetti, spese della casa e contatti in quattro metodi privati con un contesto tipizzato. La facciata pubblica continua a validare il body e ad aprire la stessa request idempotente: passa lo stesso tx a ogni fase, collega i contatti e finalizza la bozza solo alla fine. Nessuna fase apre transazioni o effettua scritture autonome.

I quattro blocchi operativi sono conservati integralmente, nello stesso ordine. Contatori degli articoli e delle spese della casa vengono sommati nel risultato; decisioni e Set degli oggetti selezionati conservano il medesimo ambito. Il confronto AST conferma identici gli altri 19 metodi, inclusi request/open/project, controlli accesso e replay; finalizzazione identica. Lock casa/membership, fonte/versione/SHA, visibilità privata, revisione acconto/saldo, rifiuto dei duplicati e confronto di modelli/manuali non cambiano.

## Verifica offline

- Build e lint superati. Onboarding 300/300, ordinari 224/224, guardie qualità 15/15.
- HTTP/DB: 495/495 (54 HTTP esterni, 439 diretti, 2 dopo riavvio PostgreSQL) sul cluster sintetico nuovo del runner R07, porte 55439/3119; compresi privacy, idempotenza, conferme concorrenti/parziali, revoche, acconto/saldo e riavvio ledger.
- Blocchi spostati confrontati testualmente; altri 19 metodi e finalizzazione identici. Non è una prova formale di equivalenza per ogni input, né un benchmark.
- Nessun test, gold, soglia, criterio o errore modificato. Nessuna chiamata AI/email o accesso al DB reale, nessuna modifica .env/migrazioni/deploy. Collaudo dell'utente 55433/3109 e file sporchi legacy preservati.

## Limiti e seguito

R04 avanzato: il metodo pubblico ora esplicita le fasi della transazione. Le operazioni sui singoli esemplari restano nel relativo metodo e altre validazioni di spesa possono essere separate in lotti successivi se utili; non si dichiara l'intero servizio riscritto o l'audit concluso. Segue R08 con separazione del protocollo provider preservando prompt e richieste byte per byte. Hash di commit/push nella consegna; nessun nuovo branch creato.
