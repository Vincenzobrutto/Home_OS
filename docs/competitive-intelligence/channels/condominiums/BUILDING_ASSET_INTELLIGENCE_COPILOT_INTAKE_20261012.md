# Building Asset Intelligence — Copilot due diligence intake
**Data:** 2026-10-12. **Documento originale:** PDF 22 pagine ricevuto in conversazione, `due_diligence_dimora_homeos_building_asset_intelligence_20261012_105334.pdf`.
**Status:** ricerca esterna non ancora confermata indipendentemente. Nessuna modifica a roadmap/ADR.

## Verdetto
**TEST, non GO sviluppo.** La memoria tecnica + scadenzario è già coperta da gestionali. Il vero capital planning (inventory, condition, vita residua, replacement cost, scenari/funding) è job distinto, ma già presidiato da Maintego/GeCoMAX e piattaforme capital planning internazionali come Spacewell, FMX Capital Planner, Planon, Archibus, Siemens Predictor.

## Segmento
Il miglior economic buyer ipotetico è gestore multi-building con edifici tecnicamente complessi, funzione tecnica interna/partner continuativo, oppure società manutenzione/FM multi-cliente. Il migliore primo segmento di test può essere studio medio strutturato con coordinatore tecnico. Non assume che il singolo condominio paghi.

## Three potential wedges (all unvalidated)
1. **Capital Plan Readiness:** document→asset inventory+missing data+preliminary scenario; 3 studi x 3 edifici, chiedere prezzo vero.
2. **Decision pack assembleare lavori straordinari:** ricostruire 10 lavori deliberati, comparare con alternative, chiedere ordine sul prossimo.
3. **Technical Asset Passport validato da manutentore:** 100 rapportini storici da due manutentori, valutare precisione matching e willingness-to-pay.

## Hard constraints
AI document ingestion ≠ validazione condition. Sopralluogo/tecnico per condizione reale, vita residua, costi locali. No forecast certificato. Il gestionale resta source-of-record operativo; Dimora intelligence layer documentale, senza doppio inserimento. Dati comuni vs personali segregati. Interoperabilità API/export non provata. Nessuna integrazione in roadmap finché non verificata.

## Proposed gates (assunzioni del ricercatore)
Test assistito su 9 edifici, >=2 tipologie e >=2 gestionali, validazione tecnica indipendente; >=2 buyer paganti; report cambia timing/priorità/funding; costo di aggiornamento sostenibile; nessun double-entry costoso. No go se nessuno paga, tecnico deve rifare tutto, incumbents soddisfano job, o unico valore è scadenzario.

## To red-team independently
- Verificare oggi feature **Maintego/GeCoMAX** più nel dettaglio (perché è il comparabile italiano più minaccioso), inclusi clienti e pricing.
- Verificare che 'capital planning' per condomini italiani abbia domanda ricorrente e sia vendibile a un soggetto identificabile; separare piano professionale one-off da SaaS.
- Testare business economics incluso lavoro tecnico/onboarding, accuratezza, responsabilità di report e doppia imputazione.
- Verificare possibilità reale di analizzare 9 edifici con solo MVP Dimora (single-property alpha) + spreadsheet senza software nuovo.
- Confrontare contro manutentori/CMMS e gli altri buyer B2B2C.
- Nessuna stima numerica di mercato o prezzo senza dati primari.

## Cross-references
- `BUILDING_ASSET_INTELLIGENCE_RESEARCH_BRIEF_v1.md`
- `strategy/B2B2C_BUYER_STRATEGY_REVIEW_v0.1_20261012.md`
- `docs/decisions.md` ADR #77 (priorità attuale Renovation + Financing)
