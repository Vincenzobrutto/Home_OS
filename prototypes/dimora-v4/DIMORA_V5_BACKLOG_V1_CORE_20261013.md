# Dimora V5 — V1 reale: allegato A

**13 ottobre 2026.** Parte del [Backlog operativo V5](DIMORA_V5_BACKLOG_OPERATIVO_v1.0_20261013.md). Questa è una specifica di pianificazione, non un'implementazione.

## Gate tecnici obbligatori

- R00 (P0): modello dati per studio, edificio, scala, unità e casa privata. Accettazione: entità e cardinalità documentate.
- R01 (P0, dopo R00): permessi per ruolo, risorsa e operazione. Accettazione: default deny e isolamento server-side.
- R02 (P0, dopo R01): policy di conservazione e cambio titolarità. Accettazione: validazione privacy/legale.
- R03 (P0, dopo R01): revisione dei rischi e dei controlli per condivisioni e inviti. Accettazione: test negativi documentati.
- R04 (P0, dopo R02/R03): ADR, API e piano migrazioni. Accettazione: review prima di ogni modifica database.
- R05 (P0, dopo R03): inviti che non rivelano l'esistenza di account. Accettazione: risposte neutrali.
- R06 (P0, dopo R03): protezione di sessioni, file, token e backup. Accettazione: review prima della beta.

## Segnalazioni intelligenti

Il modello deve distinguere segnalazione privata, problema comune, azioni dell'amministratore e comunicazione pubblicata. Nessuna presa in carico o risoluzione deve essere inferita dall'AI.
