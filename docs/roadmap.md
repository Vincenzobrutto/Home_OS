# Roadmap corrente — Dimora V5, 23 ottobre 2026

Questo indice distingue il lavoro attuale dalla cronologia. La roadmap precedente è conservata integralmente nell’[archivio del 23 ottobre](roadmap-history-20261023.md), inclusi checkpoint e decisioni dei diversi agenti. I suoi esiti descrivono la data del singolo lotto. [Stato verificato](project-status.md), [backlog completo](backlog.md), [architettura](architecture.md).

## Manutenzione autorizzata in corso

Seguire i dieci rilievi dell’[audit](v5/fase0-code-audit-refactor-20261023.md), con commit distinti e prove offline. R01/R02 corretti; R03 estrazioni dagli editor e R04 validazioni/conferma affrontati per responsabilità, senza riscrittura generale. R07 test protetti completato; R08 protocollo provider separato e verificato. R10 client per dominio completato e verificato ([report](v5/fase0-api-client-domains-refactor-20261023.md)); R06 ricognizione conclusa con conservazione deliberata. R05 candidati misurato/ottimizzato ([report](v5/fase0-candidate-query-batching-20261023.md)); R03 richieste editor e presentazione intake concluso nel perimetro selezionato, collaudo completo verde ([chiusura e opportunità residue](v5/fase0-refactor-closure-20261023.md)); aggiornamenti e risultati nel solo project-status. R09 separa qui stato e archivio, preservando i contenuti storici.

La chiusura del refactoring richiede riepilogo delle verifiche, limiti residui e push verificato. Creato il [branch di consolidamento](v5/dimora-v5-consolidation-branch-20261023.md) dalla versione verificata fef9d96, senza includere il dirty locale. Nessuna integrazione con main. Dal 23/10 le evolutive partono da questo branch, un lotto per branch e PR ([flusso](../AGENTS.md#flusso-delle-evolutive-deciso-dal-committente-il-23-ottobre-2026)).

## Evolutiva ordini e acquisto

Lotto Codex isolato dal Cestino: [costo/data da ordine confermato](v5/ordini-acquisto-20261023.md), verificato offline con 864/864 mock e 88/88 DB mirati; [PR #8](https://github.com/Vincenzobrutto/Home_OS/pull/8) verso il consolidamento, integrata su approvazione del committente (`30c73a2`); collaudo isolato aggiornato in sola consultazione, dati invariati. Nessuna AI, deploy o modifica al collaudo persistito. Il merge resta al committente.

## Classificazione locale: ricevute e negazioni

[Lotto separato](v5/ricevute-negazioni-20261023.md) implementato e verificato: apostrofi, negazioni per occorrenza, riferimenti all'obbligo di emissione e documenti misti. 233/233 ordinari, build/lint e riscontro locale sul PDF reale. PR #12 integrata su approvazione a `b74efe9`; solo collaudo isolato ricompilato/riavviato in consultazione, dati invariati. Cestino di Claude escluso; nessun OCR o nuova analisi AI.

## Evolutive proposte, in ordine

1. Cestino ed eliminazione dati: [progetto con le scelte del committente del 22/10](v5/fase0-deletion-design-20261022.md). Lotto 1 backend documenti implementato e verificato offline ([report](v5/cestino-lotto1-report-20261023.md)), in PR. Restano lotto 2 pagina Cestino (frontend), lotto 3 schede/storia, casa e account, ciclo dei backup.
2. DB di test dedicato e permanente, utile prima di toccare le eliminazioni.
3. Audit npm P0 delle dipendenze ([backlog](backlog.md)).
4. Attività del committente: verifica proposte caffè, BL-04 su telefono.

## Qualità documentale prima del pilota

La Fase 0 qualità AI generale resta non promossa. Campagne sintetiche e singolo PDF anonimizzato del caffè sono evidenze differenti: non dimostrano riconoscimento universale o produzione pronta. Correzioni offline di evidenze, ruoli economici/date, acconto/saldo e generalità delle regole restano soggette ai criteri e ai gold esistenti. [Archivio dello stato](project-status-history-20261023.md), [campagna v24](v5/fase0-quality-v24-campaign-20261023.md).

Una futura prova sui reali richiede documenti e dati corretti concordati, consenso specifico e limiti distinti. Nessuna chiamata AI, promozione di gate o salvataggio canonico autorizzati dal refactoring.

## Attività di prodotto ancora distinte

- Verifica del committente sulle proposte del PDF caffè: dati leggibili mancanti, varianti e stanza effettiva; acquisto proposto secondo la nuova regola degli ordini, nessun pagamento, consegna o garanzia dedotti.
- BL-04 su telefono reale con accesso di sviluppo concordato; conversione HEIC rinviata dal committente.
- Campagna qualità AI/eliminazione dati Fase 0 e test DB permanente dedicato richiedono il proprio incarico. Il runner temporaneo non istituisce quel DB.
- Sicurezza, recovery/export, qualità per famiglie e restanti attività di prodotto: consultare il backlog e le decisioni, preservati; questo indice non li dichiara completati.

## Vincoli per i prossimi lotti

Solo backend-v5/frontend-v5 e documentazione pertinente. Nessuna AI/email a pagamento o DB reale, modifica .env, reset/clean, force push, rimozione worktree o cancellazione dei 104 StoredFile. Conservare il lavoro legacy e il collaudo dell’utente. Ogni nuova ottimizzazione deve mantenere fonte/versione/SHA, privacy, CSRF, membership e idempotenza.
