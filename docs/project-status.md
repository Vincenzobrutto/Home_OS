# Stato corrente — Dimora V5, 23 ottobre 2026

Questo file riassume il punto attuale. I 98 checkpoint precedenti sono conservati integralmente nell’[archivio dello stato al 23 ottobre](project-status-history-20261023.md); descrivono verifiche storiche, non uno stato cumulativo sempre valido. Per architettura, contratti e problemi aperti: [architettura](architecture.md), [decisioni V5](v5/implementation-decisions.md), [backlog](backlog.md), [roadmap](roadmap.md).

## Branch e confini operativi

- Checkout di lavoro: **codex/fase0-ai-quality-v3**, base dell’audit **0422af6**, sincronizzata con origin prima degli interventi. Il codice non è stato integrato o distribuito su main in questo incarico.
- Sviluppo corrente in backend-v5/ e frontend-v5/. Legacy backend/ e frontend/ esclusi. Conservati i file sporchi preesistenti backend/src/main.ts, frontend/package.json e frontend/public/dimora-v5-design.html, oltre agli altri untracked estranei.
- DB reale dimora_v5_product_dev su 55432, API 3001/storage reali: non usati in audit/refactoring. Nessuna modifica a .env, migrazioni, gold/ledger sintetici o 104 StoredFile orfani. Nessun reset/clean, force push o rimozione worktree.

## Audit tecnico e interventi correnti

[Audit approfondito, dieci rilievi e piano dei lotti](v5/fase0-code-audit-refactor-20261023.md), [misure ripetibili](v5/fase0-code-audit-metrics-20261023.json). Inventario AST V5, import statici/dinamici/type-only, lettura dei percorsi critici e build di riferimento.

**Implementato e verificato nel primo lotto:**

- R01: eliminato il ciclo runtime IntakePage/workspace, separando ingresso della rotta da IntakeContent. Key di account/casa/documento e logica operativa preservate.
- R02: ExpenseRow separata dai form e importata direttamente dal riepilogo Casa. Entry JS **507.951 → 479.496 byte (−5,60%)**, gzip **156.490 → 147.622 (−5,67%)**; somma chunk +0,14%, codice rinviato alle sezioni interessate. Nessun benchmark di latenza o accuratezza AI dichiarato.
- R09, primo passo: stato corrente separato dai 98 checkpoint storici, senza perdita dei contenuti o cambi dei link relativi. Altri documenti storici/legacy non riorganizzati.

**Verifiche del primo lotto:** backend baseline build/lint; primo refactoring frontend typecheck/lint e **76/76 mirati**. Build Vite produzione prima/dopo, confronto identico dei quattro corpi operativi spostati e grafo runtime esaminato senza cicli. Typecheck/lint finali superati. **Mock completa finale 844/844, 102 file, 480,95 secondi**, due worker e retry massimo 1 configurato; nessuna asserzione o timeout modificato. Backend prodotto invariato: suite backend/HTTP/DB non ripetute. Nessuna verifica UI con browser in questo incarico.

**R03 implementato parzialmente:** separate la proiezione pura delle spese e la checklist ([report](v5/fase0-editor-review-refactor-20261023.md)); ora centralizzati ripristino dei moduli, override dell’editor aperto e snapshot di compilazione ([report](v5/fase0-editor-compilation-refactor-20261023.md)). Richieste, versioni, conferme e recupero invariati. Ultime verifiche: **93/93 mirati**, confronto equivalente su 10.000 casi/tre proiezioni, typecheck/lint/build; **mock completa finale 858/858, 104 file, 483,70 secondi**, due worker e retry massimo 1 configurato. Nessun nuovo dato estratto o salvataggio nel collaudo. Il precedente lotto R03 resta verificato a 852/852 nel relativo report.

**R04 implementato parzialmente:** separati il [validatore del singolo campo](v5/fase0-backend-field-validation-refactor-20261023.md) e ora i [validatori di quantità, prezzo articolo e totale documento](v5/fase0-backend-purchase-validation-refactor-20261023.md). Criteri, ordine, errori, diagnostica, recuperi consentiti e avvisi preservati; classe di errore condivisa, nuovi sorgenti vincolati nelle future autorizzazioni qualità. Ultimo lotto: build/lint, **300/300 onboarding**, **224/224 ordinari**, **24/24 qualità offline**, **15/15 guardie qualità**, **495/495 HTTP/DB** sul cluster sintetico nuovo, incluso riavvio del ledger. Equivalenza su **20.672 casi**, sette corpi delle altre funzioni identici, nessun ciclo runtime. Nessun AI o DB reale. Separata anche l’[orchestrazione della conferma](v5/fase0-confirmation-orchestration-refactor-20261023.md) in controlli, oggetti, spese e contatti: stessa transazione, ordine e finalizzazione; 19 altri metodi identici, build/lint, 300/300 onboarding, 224/224 ordinari, 15/15 guardie e 495/495 HTTP/DB sintetici, incluso riavvio. Altre validazioni non separate. Il primo lotto resta documentato con le sue verifiche storiche nel relativo report.

**R07 implementato e verificato:** [ingresso offline unico](../backend-v5/test/OFFLINE.md) per tutti gli alias test backend e sette wrapper, build automatica, profili espliciti, ambiente ridotto, guardie Node/Prisma e cluster nuovo posseduto su 55439/API 3119 ([report](v5/fase0-offline-test-harness-20261023.md)). Porte occupate rifiutate; collaudo 55433/3109 conservato. API fermata prima dei test di code; corrette due fragilità delle fixture senza ridurre asserzioni di privacy o idempotenza. Verifiche del lotto R07: **224/224 ordinari**, **295/295 onboarding**, **24/24 qualità offline**, **14/14 guardie qualità**, **495/495 HTTP/DB** inclusi due dopo riavvio PostgreSQL. Errore intenzionale: arresto delle sole risorse possedute verificato, log conservati. Nessun AI o DB reale; nessun DB permanente di test creato.

**Aperti, non implementati:** completamento delle estrazioni dagli altri orchestratori frontend (R03, parzialmente affrontato), restante separazione validazioni/conferme backend preservando la transazione (R04, parzialmente affrontato), conteggio query prima di letture batch (R05); verifica componenti non raggiungibili (R06), modularizzazione prompt/client API (R08/R10) e restante documentazione (R09). Nessuna riscrittura generale o rimozione dei controlli di privacy/SHA/idempotenza.

## Precompilazione del PDF caffè — ultimo esito reale, precedente all’audit

[Terzo invio autorizzato](v5/fase0-coffee-third-attempt-20261023.md): succeeded, una chiamata Anthropic per il solo PDF anonimizzato, **0,038369 USD**, nessun retry; totale tre tentativi **0,115147 USD**. Bozza AI aperta, **1 documento, 0 oggetti, 0 spese** nel collaudo isolato. Nome breve De’Longhi Rivelia, marca/modello e data ordine 14/06/2026 coerenti con il PDF; totale documento 499 EUR e spedizione zero.

Da controllare dal committente: prezzo articolo non proposto, descrizione estesa incompleta e colore non esplicito, quantità non verificata, stanza effettiva e oggetto nuovo/esistente. Data acquisto/consegna/pagamento e garanzia non dedotte; nessuna spesa registrata dal totale. Il successo non ricostruisce i due vecchi rifiuti né dimostra accuratezza generale.

UI temporanea del collaudo su 5179, API 3109 e DB 55433/dimora_v5_quality_v3_test: ripristinata offline nel checkpoint precedente con AI disabilitata e fetch esterni bloccati, supervisore a quattro ore. Disponibilità temporanea, non stato di deploy. La bozza resta persistita anche a servizi fermi. Nessuna nuova chiamata AI autorizzata dal budget residuo; il consenso alla singola chiamata è consumato.

## Baseline storiche e prossimo lavoro

- Ultimo checkpoint backend prima dell’audit: onboarding **291/291**, DB temporaneo **87/87** ([report](v5/fase0-additional-offline-tests-20261023.md)); ordinari **214/214**, guard/runner **17/17** nel checkpoint del [nome breve](v5/fase0-short-product-name-offline-20261023.md). Non sono nuove esecuzioni di questa sessione.
- Fase 0 qualità AI generale **non promossa**; gold e campagne storiche immutati. [Campagna v24](v5/fase0-quality-v24-campaign-20261023.md) e successive correzioni offline nell’archivio/backlog. Il singolo PDF caffè non chiude il gate.
- Proseguimento autonomo autorizzato: R08 protocollo provider preservato byte per byte; R10 client per dominio, R05 misure su sintetici e ricognizione R06/R09. R03 sugli editor e altre validazioni delle spese restano nel piano; nessun cambio funzionale o nuova campagna impliciti.
- Restano fuori da questo lotto: prova BL-04 su telefono/accesso concordato, conversione HEIC rinviata, campagna AI/eliminazione dati Fase 0 e DB di test dedicato permanente. Nessuna autorizzazione implicita a invii a pagamento, deploy o eliminazione dati.
