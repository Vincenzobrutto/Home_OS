# Istruzioni per il nuovo frontend V5

Leggere anche AGENTS.md alla root. Questo file applica le decisioni V5 del committente alla sola cartella frontend-v5.

Il frontend è nuovo: React/TypeScript/Vite, router e CSS Modules autorizzati da docs/v5/implementation-decisions.md. Le convenzioni legacy «solo inline», «nessun router» e uso di theme.ts non si applicano qui. Non importare codice da frontend/src né app.js dal prototipo. Le altre istruzioni root, inclusi principi AI/conferma, test e handoff, continuano a valere.

Dal 22 ottobre 2026 il committente autorizza Claude a intervenire anche su backend-v5 e sulla documentazione condivisa quando necessario per le attività richieste (supera la precedente limitazione al solo frontend-v5). Valgono il passaggio di consegne in AGENTS.md alla root e tutti gli altri vincoli. Non modificare main, non pushare/integrare senza incarico.

Sorgente di comportamento: docs/v5/api-contract.md, domain-model.md e implementation-decisions.md; riferimento visivo: frontend/public/v5. Dati mock ammessi nel harness di test, mai fallback nella modalità reale. Non usare credenziali/DB/API legacy e non installare software di sistema. Dipendenze di progetto da registry riconosciuto secondo il ticket, con lockfile.
