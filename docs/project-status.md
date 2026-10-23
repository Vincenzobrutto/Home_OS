# Stato corrente — Dimora V5, 23 ottobre 2026

[Chiusura della tranche di refactoring e limiti](v5/fase0-refactor-closure-20261023.md). I 98 checkpoint precedenti restano nell’[archivio dello stato](project-status-history-20261023.md); sono evidenze datate. [Architettura](architecture.md), [roadmap corrente](roadmap.md), [backlog completo](backlog.md), [decisioni V5](v5/implementation-decisions.md).

## Branch e vincoli

Base delle evolutive: **codex/dimora-v5-consolidata-20261023**, creata dal commit collaudato **fef9d96faeed1d932507f3527e24b76ff706fa95** ([registrazione](v5/dimora-v5-consolidation-branch-20261023.md)), con il commit documentale di registrazione riportato dalla Fase 0. Lavorata nel worktree dedicato `Home_OS-v5-consolidata`; il checkout `Home_OS` resta su Fase 0 con i file legacy sporchi e gli untracked estranei, esclusi dai commit. Nessuna modifica/integrazione su main. Flusso di lavoro fra agenti in [AGENTS.md](../AGENTS.md#flusso-delle-evolutive-deciso-dal-committente-il-23-ottobre-2026).

### Lotti in corso

| Lotto | Agente | Branch | Area/file | Stato |
| --- | --- | --- | --- | --- |
| Cestino 1 — modello e backend documenti | Claude | `claude/cestino-backend-20261023` | `backend-v5` (schema/migrazione, `documents`, letture dei documenti negli altri moduli, nuovo worker di scadenza), test e documentazione del lotto | Implementato e verificato offline 23/10 ([report](v5/cestino-lotto1-report-20261023.md)): build/lint, 227/227 ordinari, 303/303 onboarding, 506/506 HTTP/DB sintetici incluso il nuovo test:trash-db. PR verso il consolidamento in attesa del merge del committente. Frontend non toccato: pagina Cestino nel lotto 2. |

Solo backend-v5/frontend-v5 e documentazione pertinente. Nessuna AI/email a pagamento, DB/API/storage reale, .env, migrazione di prodotto, gold/ledger storico, quota o dato del collaudo utente modificati; nessun reset/clean, force push o rimozione worktree. I 104 StoredFile orfani non toccati.

## Audit e interventi verificati

L’[audit iniziale](v5/fase0-code-audit-refactor-20261023.md) e le sue misure sono storici. Questa tranche conclude i lotti selezionati, non dichiara debito tecnico azzerato.

| ID | Stato corrente |
| --- | --- |
| R01 | Ciclo workspace/intake eliminato; key account/casa/documento e percorso preservati. |
| R02 | Riga spesa separata dai form; prima entry JS 507.951 → 479.496 byte, misura del primo lotto. |
| R03 | [Proiezione spese](v5/fase0-editor-review-refactor-20261023.md), [compilazione](v5/fase0-editor-compilation-refactor-20261023.md), [ciclo scritture e presentazione intake](v5/fase0-editor-write-presentation-refactor-20261023.md) separati e verificati. Container ancora ampi, nessuna riscrittura generale. |
| R04 | [Campi](v5/fase0-backend-field-validation-refactor-20261023.md), [quantità/prezzi](v5/fase0-backend-purchase-validation-refactor-20261023.md) e [fasi conferma](v5/fase0-confirmation-orchestration-refactor-20261023.md) separati: stessi errori, unica transazione, lock/replay/fonti invariati. Altre validazioni restano nei moduli. |
| R05 | [Candidati misurati e letture batch](v5/fase0-candidate-query-batching-20261023.md): 1/10/50 candidati, una o tre fonti, SQL 23/77/317 → 23/50/170, stessi lock. Altri percorsi non ottimizzati; nessuna misura di latenza dichiarata. |
| R06 | [Ricognizione conclusa](v5/fase0-maintenance-boundaries-20261023.md): quattro componenti esclusi dal bundle conservati deliberatamente come compatibilità/test. Nessuna UX o asserzione rimossa. |
| R07 | [Runner offline unico](v5/fase0-offline-test-harness-20261023.md): build, guardie Node/Prisma, cluster nuovo posseduto; [comandi](../backend-v5/test/OFFLINE.md). Nessun DB permanente istituito. |
| R08 | [Protocollo provider separato](v5/fase0-provider-protocol-refactor-20261023.md), prompt/schema identici byte per byte, nuovi moduli vincolati nelle future autorizzazioni. |
| R09 | Ingressi stato/roadmap/architettura correnti e archivi integrali con blob verificati, handoff preservati. |
| R10 | [Client per otto domini e unico trasporto](v5/fase0-api-client-domains-refactor-20261023.md), facciata compatibile. Entry del lotto +7.214 byte (+1,50%), gzip +999: manutenzione, non riduzione di peso. |

## Ultimo collaudo della tranche

Backend build/lint, **303/303 onboarding**, **224/224 ordinari**, **24/24 qualità offline**, **17/17 guardie**; **496/496 HTTP/DB sintetici**, inclusi privacy/idempotenza/concorrenza/revoche/acconto-saldo/Q15-Q22-Q48 e due test dopo riavvio PostgreSQL. Cinque cluster temporanei fermati, porte proprie 55439/3119 libere, log conservati.

Frontend typecheck/lint/build e **mock completa finale 860/860, 105 file, 509.88 secondi**, due worker e retry massimo 1 configurato. Nessuna asserzione o timeout esistente allentato. Confronti differenziali e corpi spostati nel report; nessun ciclo runtime rilevato. Nessuna prova browser/salvataggio nel collaudo in questa tranche. I conteggi dei profili non si sommano; le verifiche precedenti sono nei rispettivi report.

## Precompilazione caffè e lavoro di prodotto ancora aperto

Ultimo esito AI reale, precedente all’audit: [terzo invio autorizzato](v5/fase0-coffee-third-attempt-20261023.md) riuscito, una chiamata da 0,038369 USD, tre tentativi complessivi 0,115147 USD. Bozza proposta: 1 documento, 0 oggetti, 0 spese. Nome breve/marca/modello e ordine 14/06/2026 coerenti; totale 499 EUR e spedizione zero. Da controllare prezzo articolo non proposto, descrizione/colore/quantità, stanza e oggetto nuovo/esistente. Acquisto/consegna/pagamento e garanzia non dedotti.

Il collaudo persistito e i suoi servizi temporanei preesistenti non sono un deploy né una disponibilità garantita; nessun nuovo consenso AI implicito. **Gate qualità AI Fase 0 generale non promosso.** Restano prova BL-04 su telefono/accesso concordato, HEIC rinviato, qualità AI/eliminazione dati e DB permanente di test. Il branch di consolidamento è ora creato sulla punta verificata fef9d96: conserva storia e file già tracciati, esclude il dirty locale. Nessuna riscrittura della storia; eventuale lavoro futuro richiede un checkout distinto, non creato in questa operazione.
