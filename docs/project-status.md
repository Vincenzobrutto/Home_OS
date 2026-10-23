# Stato corrente — Dimora V5, 23 ottobre 2026

[Chiusura della tranche di refactoring e limiti](v5/fase0-refactor-closure-20261023.md). I 98 checkpoint precedenti restano nell’[archivio dello stato](project-status-history-20261023.md); sono evidenze datate. [Architettura](architecture.md), [roadmap corrente](roadmap.md), [backlog completo](backlog.md), [decisioni V5](v5/implementation-decisions.md).

## Branch e vincoli

Base delle evolutive: **codex/dimora-v5-consolidata-20261023**, creata dal commit collaudato **fef9d96faeed1d932507f3527e24b76ff706fa95** ([registrazione](v5/dimora-v5-consolidation-branch-20261023.md)), con il commit documentale di registrazione riportato dalla Fase 0. Lavorata nel worktree dedicato `Home_OS-v5-consolidata`; il checkout `Home_OS` resta su Fase 0 con i file legacy sporchi e gli untracked estranei, esclusi dai commit. Nessuna modifica/integrazione su main. Flusso di lavoro fra agenti in [AGENTS.md](../AGENTS.md#flusso-delle-evolutive-deciso-dal-committente-il-23-ottobre-2026).

### Lotti in corso

| Lotto | Agente | Branch | Area/file | Stato |
| --- | --- | --- | --- | --- |
| Classificatore locale — ricevute e negazioni | Codex | `codex/ricevute-negazioni-20261023` | `backend-v5/src/document-intake/classifier.ts`, `test/intake-classifier.test.cjs`; report e stato/roadmap/changelog | Implementato e verificato offline 23/10: [report](v5/ricevute-negazioni-20261023.md), build/lint e 233/233 ordinari. Ricevute con apostrofi e negazioni per occorrenza, documenti misti preservati. PDF reale letto solo localmente: fattura → ricevuta. PR verso il consolidamento, merge al committente; nessun deploy, AI/DB o modifica al lotto Claude. |
| Ordini confermati — proposte acquisto | Codex | `codex/ordini-acquisto-20261023` | Validazione/proiezione pura `object-onboarding/domain.ts`, `profile.ts`, nuovo helper ordini e congelamento autorizzazioni future; frontend `object-onboarding/model.ts`, `ItemEditor.tsx`, test pertinenti; documentazione del lotto | Implementato e verificato offline: [report](v5/ordini-acquisto-20261023.md), [PR #8](https://github.com/Vincenzobrutto/Home_OS/pull/8) integrata su approvazione del committente il 23/10, merge `30c73a2`; collaudo isolato aggiornato in consultazione, nessun dato salvato. Lotto chiuso, area liberata. Nessuna AI o DB reale; esclusi accesso/letture DB, schema, documenti/cestino e file del lotto Claude. |
| Cestino 1 — modello e backend documenti | Claude | `claude/cestino-backend-20261023` | Schema/migrazione, documenti, letture documenti e worker; test e documentazione del lotto | Aperto, piano sul branch Claude rilevato in sola lettura; area non modificata da questo lotto. |

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

## Evolutiva ordini confermati — verificata sul branch del lotto

[Regola, implementazione e limiti](v5/ordini-acquisto-20261023.md), [PR #8](https://github.com/Vincenzobrutto/Home_OS/pull/8) verso il consolidamento. Ordine confermato come acquisto proposto; costo del singolo prodotto uguale al totale, spedizione già inclusa. Caso caffè offline: 499 EUR e acquisto proposto al 14/06/2026. Pagamento, consegna e garanzia non dedotti; nessuna spesa all’apertura. Bozze precedenti riprese senza AI/backfill, rispettando le compilazioni salvate. Nuove proposte con origine distinta e fonte verificata; fatti estratti, warning, gold e validazioni invariati.

Backend build/lint e 306/306 onboarding, 224/224 ordinari, 24/24 qualità, 18/18 guardie; 88/88 test DB mirati anche nella ripetizione finale, su cluster nuovi poi arrestati. Frontend typecheck/lint/build e mock completa **864/864, 105 file, 525.86 secondi**. Risolto il solo percorso locale del worker PDF per le dipendenze con junction, tramite override fuori dal repository; nessuna modifica a configurazione di prodotto, assert o timeout. Questi esiti non promuovono il gate AI e non sono una nuova estrazione del PDF.

Il committente ha approvato il merge della PR #8: integrata nel consolidamento (`30c73a29d73294ccee6a62b3f616bbb84a618e3f`), main invariato. API ricompilata e collaudo isolato riavviato dalla versione integrata, con provider AI, worker e salvataggi bloccati. Verifica browser della bozza esistente: 499 EUR, acquisto proposto al 14/06/2026, «Non creare una spesa». Impronte prima/dopo di documenti/originale, bozze, job/attempt, oggetti e spese identiche: 1 documento, 0 oggetti, 0 spese. Nessuna migrazione, backfill o nuova AI. Prossimo passo: verifica del committente sui dati ancora aperti (descrizione/varianti, stanza e scheda nuova/esistente). Il lotto Cestino di Claude resta aperto e distinto.
## Precompilazione caffè e lavoro di prodotto ancora aperto

Ultimo esito AI reale, precedente all’audit: [terzo invio autorizzato](v5/fase0-coffee-third-attempt-20261023.md) riuscito, una chiamata da 0,038369 USD, tre tentativi complessivi 0,115147 USD. Bozza proposta: 1 documento, 0 oggetti, 0 spese. Nome breve/marca/modello e ordine 14/06/2026 coerenti; totale 499 EUR e spedizione zero. Nome, marca e modello confermati dal committente nella successiva verifica UI. Evolutiva separata: [ordine confermato come acquisto proposto e totale come costo del singolo prodotto](v5/ordini-acquisto-20261023.md), senza pagamento/consegna o garanzia dedotti; collaudo ora aggiornato alla PR #8 integrata, senza modifiche ai dati persistiti. Restano descrizione/colore/quantità, stanza e oggetto nuovo/esistente.

Il collaudo persistito e i suoi servizi temporanei preesistenti non sono un deploy né una disponibilità garantita; nessun nuovo consenso AI implicito. **Gate qualità AI Fase 0 generale non promosso.** Restano prova BL-04 su telefono/accesso concordato, HEIC rinviato, qualità AI/eliminazione dati e DB permanente di test. Il branch di consolidamento è ora creato sulla punta verificata fef9d96: conserva storia e file già tracciati, esclude il dirty locale. Nessuna riscrittura della storia; eventuale lavoro futuro richiede un checkout distinto, non creato in questa operazione.
