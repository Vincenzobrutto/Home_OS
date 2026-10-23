# R05 — query misurate e letture batch limitate alla richiesta

23 ottobre 2026, branch codex/fase0-ai-quality-v3. Dataset sintetico nuovo, nessun documento reale o chiamata AI. Una casa, 50 oggetti, una stanza per oggetto, profili con una oppure tre fonti private leggibili; pagine da 1/10/50 candidati.

## Misura e intervento

Conteggio degli statement effettivamente emessi dal client Prisma (inclusi transazione e controlli), non stima dal sorgente e non latenza. Baseline prima del cambio: profilo onboarding integrazione 44/44 sul proprio cluster nuovo. Dopo il cambio: stessa fixture nel collaudo completo, sempre cluster nuovo.

| Candidati | Fonti per profilo | Prima | Dopo | Lock FOR SHARE prima/dopo |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 23 | 23 | 4 / 4 |
| 10 | 1 | 77 | 50 | 4 / 4 |
| 50 | 1 | 317 | 170 | 4 / 4 |
| 1 | 3 | 23 | 23 | 4 / 4 |
| 10 | 3 | 77 | 50 | 4 / 4 |
| 50 | 3 | 317 | 170 | 4 / 4 |

A 50 candidati: 317 → 170, 147 statement in meno (−46,37%). A 10: 77 → 50 (−35,06%); a 1 invariato. Nessun benchmark di velocità, nessuna promessa sul numero di query di ogni schermata.

La selezione/ranking SQL e la verifica target per ciascun oggetto restano. Solo dopo quei controlli, ricevute di marca/modello, prove dei profili e posizioni vengono lette insieme per la richiesta corrente. Ogni campo richiede ancora TUTTE le sue prove di fonte leggibili con casa, uploader/visibilità, versione e SHA corretti; una fonte accessibile su un altro oggetto non sana quella privata o cambiata. Nessuna cache fra richieste/account e nessuna rimozione dei lock. Le query stanze restano per oggetto con filtri e ordine precedenti.

objectProfileView continua a servire i chiamanti del singolo oggetto attraverso lo stesso proiettore. project/safeReview/automatic non ricevono cache globali: eventuale ulteriore batching si valuta su misure del loro specifico percorso; la riduzione riportata riguarda solo i candidati misurati.

## Verifiche

- Tre nuove prove unit su batch, fallback ricevuta, dichiarazioni utente, fonti private/casa/SHA/versione e batch vuoto; un nuovo test DB su scaling e revoca effettiva. Nuova fixture aggiunta ai profili onboarding e night-plan, union completa senza duplicazione. Aggiornato soltanto il conteggio night-plan 11 → 12 e verificata inclusione del nuovo test; tutti i controlli del runner restano.
- Primo collaudo della nuova fixture fallito per type della stanza mancante; corretta la fixture e ripetuta. Un primo ordinario ha rilevato il vecchio conteggio del profilo; aggiornato senza ridurre guardie. Non erano difetti di prodotto.
- **1.458 confronti differenziali**, due target per caso e facciata singola: output/serializzazione e input immutati, contro il proiettore precedente.
- Build/lint, **303/303 onboarding**, **224/224 ordinari**, **24/24 qualità offline**, **17/17 guardie qualità**.
- **496/496 HTTP/DB** nel runner R07: 54 HTTP esterni, 440 diretti, 2 dopo riavvio PostgreSQL. Privacy, revoche/versione/SHA, replay, acconto/saldo, Q15/Q22/Q48, concorrenza e ledger inclusi. Cluster/API propri fermati; log conservati.
- access.ts e candidates.ts vincolati nelle future autorizzazioni qualità, con test di rifiuto per hash alterato. Vecchie autorizzazioni/ledger non riscritti o riattivati. Rimossi due soli newline vuoti esterni alle costanti del protocollo R08; prompt e schema invariati.

Nessuna AI/email a pagamento, DB/API/storage reale, .env, migrazione di prodotto, deploy, gold o dati del collaudo utente modificati. Restano opportunità di query in altri percorsi, non ottimizzazioni dichiarate o necessarie per questo lotto.
