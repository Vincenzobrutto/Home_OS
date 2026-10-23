# Architettura corrente V5 — 23 ottobre 2026

Le sezioni legacy e il precedente ingresso V5 sono conservati integralmente nell’[archivio architettura](architecture-history-20261023.md). [Stato operativo](project-status.md), [decisioni V5](v5/implementation-decisions.md), [schema e modello](v5/domain-model.md).

- `frontend-v5/`: React 19, TypeScript, Vite, React Router, TanStack Query per cache server scoped account/casa, CSS Modules e token dedicati; nessun import runtime dal frontend legacy. Ingresso `src/main.tsx`, percorsi `src/routes/`, client `src/api/`.
- `backend-v5/`: NestJS 11, TypeScript, Prisma 6.19.3 e PostgreSQL dedicato. `src/app.module.ts` integra auth, homes, documents, review, activities, expenses, home-objects, sharing, personal-export, receipt-assistance, document-intake, object-onboarding e contacts. Schema concreto in `backend-v5/prisma/schema.prisma`.
- HTTP `/api/v5`, API loopback 3001, frontend loopback 5174/proxy. Sessione httpOnly, CSRF/Origin e membership; errore strutturato con requestId. Accesso per fonte oltre ai permessi casa, derivati personali dove previsto. [Trasporto identity](v5/api-contract.md).
- Originali e versioni immutabili con hash, storage privato distinto dal legacy. Upload/lotti e organizzazione sono separati dalla creazione canonica di oggetti/spese. [Documenti](v5/documents-api-contract.md).
- Pipeline: acquisizione → classificazione/estrazione con evidenze → bozza → revisione/conferma canonica. La modalità automatica autorizzata può delegare le conferme non ambigue; quella `proposalOnly` si ferma alla bozza. Non sono intercambiabili. [Revisione unificata](v5/unified-review-autonomous-final-20261018.md).
- Coda/lease e ledger persistenti, versione/SHA, lock e idempotenza proteggono concorrenza, replay e budget. L'orchestratore automatico usa `ObjectOnboardingRequest`; non una coda volatile nel browser. Nessun retry AI incerto automatico.
- UI Documenti riusa archivio canonico e revisione unica con coda, editor manuale/AI e anteprima locale richiudibile; filtri sul server prima del paging. Vedi [workspace](v5/document-editor-workspace-20261018.md). «Rivedi proposta» riapre la bozza pronta. Eliminazione solo fonte propria privata inutilizzata, bloccata dalle dipendenze. [Pagina unica](v5/document-workspace-20261018.md), [selezione AI](v5/document-classification-bulk-ai-20261018.md).

Non dedurre produzione pronta, OCR universale o completamento di tutti i blueprint dalla presenza dei contratti. I documenti V5 contengono stati storici: per il punto attuale iniziare da project-status.


## Confini di manutenzione e verifica

- Conferma onboarding: una request idempotente e una transazione; fasi private per controlli, oggetti, spese e contatti. Lock, fonte/versione/SHA, membership prima/dopo e replay restano nel percorso canonico. [R04](v5/fase0-confirmation-orchestration-refactor-20261023.md).
- Provider: preparazione/autorizzazione e diagnostica nel provider; schema, decoder compatto e prompt separati con export compatibili. Prompt v29 invariato, nessun nuovo consenso. [R08](v5/fase0-provider-protocol-refactor-20261023.md).
- Test backend: un solo ingresso offline con build, guardie Node/Prisma e cluster nuovo posseduto. Porte test 55439/API3119, distinte dal prodotto e dal collaudo dell’utente; nessun riuso del DB esistente. [Comandi](../backend-v5/test/OFFLINE.md), [R07](v5/fase0-offline-test-harness-20261023.md).
- Client frontend: facciata ApiClient compatibile, otto moduli di dominio e un solo ApiTransport per istanza, che possiede sessione/CSRF/fetch e controlli JSON/binari. [R10 e costo del bundle](v5/fase0-api-client-domains-refactor-20261023.md). Controller editor: [scritture pendenti separate dalla presentazione](v5/fase0-editor-write-presentation-refactor-20261023.md), stesse chiavi/recupero e key di contesto; stato e verifiche in [project-status](project-status.md); nessuna deduzione di deploy dalla presenza del sorgente.

Le configurazioni e i comandi legacy nell’archivio sono evidenza storica. Non costituiscono istruzioni per avviare test sulla V5 o sul DB reale.
