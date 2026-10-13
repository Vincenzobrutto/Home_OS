# Dimora V5 — Matrice test e decisioni aperte

**13 ottobre 2026.** Allegato al [Backlog operativo V5](DIMORA_V5_BACKLOG_OPERATIVO_v1.0_20261013.md). Questa è una proposta di test, non prova di esecuzione.

## Happy path ed error path
| Scenario | Successo | Variante negativa |
|---|---|---|
| S1 Segnalazione | Home invia, studio riceve | Rete assente, invio ripetuto, unità errata |
| S2 Caso noto | Comunicazione pertinente, invio facoltativo | Scala diversa, segnalazione comunque possibile |
| S3 Presa in carico | Admin aggiorna stato, autore lo vede | Utente non abilitato, nessuna decisione AI |
| S4 Pubblicazione | Scala A riceve notice mirata | Scala B esclusa, annullamento prima conferma |
| S5 Chiusura | Motivazione e storico | Rettifica e correzione di stato |
| S6 Cambio titolarità | Revoca accessi e nuovo invito | Invito scaduto, documenti privati non trasferiti |
| H1 Import Home | Batch, asset provvisori, revisione | AI indisponibile, duplicati, quota, conflitti |
| H2 Gift | Manifesto, invito, accettazione | Account già esistente non rivelato, link revocato |
| A1 Agenzia | Incarico, upload, checklist, dossier | File illeggibile, accesso non autorizzato |
| C1 Admin | Archivio, revisione, pubblicazione | Upload non pubblica, no overwrite Home |
| F1 Free/Pro | Uso manuale ed export | Downgrade senza perdita dati |

## Controlli di qualità
Test unitari su stati e regole, test integrati con organizzazioni distinte, percorsi end-to-end dei tre ruoli, tastiera e viewport mobile/desktop, regressione HomeOS, permessi su download/ricerca/condivisione e revoca. Solo dati sintetici.
