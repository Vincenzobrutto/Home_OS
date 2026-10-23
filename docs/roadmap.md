# Roadmap corrente — Dimora V5, 23 ottobre 2026

Questo indice distingue il lavoro attuale dalla cronologia. La roadmap precedente è conservata integralmente nell’[archivio del 23 ottobre](roadmap-history-20261023.md), inclusi checkpoint e decisioni dei diversi agenti. I suoi esiti descrivono la data del singolo lotto. [Stato verificato](project-status.md), [backlog completo](backlog.md), [architettura](architecture.md).

## Manutenzione autorizzata in corso

Seguire i dieci rilievi dell’[audit](v5/fase0-code-audit-refactor-20261023.md), con commit distinti e prove offline. R01/R02 corretti; R03 estrazioni dagli editor e R04 validazioni/conferma affrontati per responsabilità, senza riscrittura generale. R07 test protetti completato; R08 protocollo provider separato e verificato. R10 client per dominio completato e verificato ([report](v5/fase0-api-client-domains-refactor-20261023.md)); R06 ricognizione conclusa con conservazione deliberata. R05 candidati misurato/ottimizzato ([report](v5/fase0-candidate-query-batching-20261023.md)); R03 richieste editor e presentazione intake prosegue fino al collaudo finale; aggiornamenti e risultati nel solo project-status. R09 separa qui stato e archivio, preservando i contenuti storici.

La chiusura del refactoring richiede riepilogo delle verifiche, limiti residui e push verificato. La creazione di un nuovo branch pulito su GitHub si valuta dopo: nessuna nuova branch o integrazione con main è implicita.

## Qualità documentale prima del pilota

La Fase 0 qualità AI generale resta non promossa. Campagne sintetiche e singolo PDF anonimizzato del caffè sono evidenze differenti: non dimostrano riconoscimento universale o produzione pronta. Correzioni offline di evidenze, ruoli economici/date, acconto/saldo e generalità delle regole restano soggette ai criteri e ai gold esistenti. [Archivio dello stato](project-status-history-20261023.md), [campagna v24](v5/fase0-quality-v24-campaign-20261023.md).

Una futura prova sui reali richiede documenti e dati corretti concordati, consenso specifico e limiti distinti. Nessuna chiamata AI, promozione di gate o salvataggio canonico autorizzati dal refactoring.

## Attività di prodotto ancora distinte

- Verifica del committente sulle proposte del PDF caffè: dati leggibili mancanti, varianti e stanza effettiva; nessun acquisto o garanzia dedotto automaticamente.
- BL-04 su telefono reale con accesso di sviluppo concordato; conversione HEIC rinviata dal committente.
- Campagna qualità AI/eliminazione dati Fase 0 e test DB permanente dedicato richiedono il proprio incarico. Il runner temporaneo non istituisce quel DB.
- Sicurezza, recovery/export, qualità per famiglie e restanti attività di prodotto: consultare il backlog e le decisioni, preservati; questo indice non li dichiara completati.

## Vincoli per i prossimi lotti

Solo backend-v5/frontend-v5 e documentazione pertinente. Nessuna AI/email a pagamento o DB reale, modifica .env, reset/clean, force push, rimozione worktree o cancellazione dei 104 StoredFile. Conservare il lavoro legacy e il collaudo dell’utente. Ogni nuova ottimizzazione deve mantenere fonte/versione/SHA, privacy, CSRF, membership e idempotenza.
