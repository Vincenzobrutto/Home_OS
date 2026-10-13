# V5 — contratto di implementazione iniziale

13 ottobre 2026. Decisioni per la nuova V5, autorizzata dal committente; non modificano il frontend legacy.

## ADR-V5-01 — due progetti nuovi

`frontend-v5/` e `backend-v5/` sono progetti autonomi nello stesso repository. Nessun import di componenti, tema, navigazione o stato legacy. Portare soltanto backend selezionato dopo revisione. API su 3001, frontend su 5174, entrambe su loopback; database e storage nuovi e dedicati. Il prototipo di riferimento resta `frontend/public/v5/`, servito su 5173. Non applicare migrazioni legacy o backfill al nuovo database.

## ADR-V5-02 — frontend moderno

React, TypeScript, Vite; React Router per navigazione; token nuovi Blu architettura e CSS Modules, CSS globale solo reset/token. Client API tipizzato, TanStack Query per cache server, chiavi per account/casa e pulizia al logout/cambio account. Le regole legacy «solo inline» e «nessun router» non si applicano a `frontend-v5/`, come già autorizzato dalla richiesta di frontend nuovo del committente; `frontend/` continua a rispettarle.

Versioni: compatibilità da verificare e dipendenze bloccate in lockfile da Claude durante lo scaffold. Nessun aggiornamento delle dipendenze legacy. Il contratto non dipende da una specifica versione del router.

Alternative scartate: copiare App.tsx/theme.ts/app.js; stato globale in localStorage; introdurre SSR/microservizi senza esigenza. Test e fixture esplicitamente separati dalla modalità reale.

## ADR-V5-03 — responsabilità

Codex gestisce backend, schema, contratti, integrazione e collaudo. Claude Code implementa `frontend-v5/**` nel checkout dedicato. Non modificare `backend/**`, `frontend/**`, schema, contratti o main. Handoff nel file `frontend-v5/HANDOFF.md`. Se il contratto non basta, segnalare la lacuna; non inventare un'API alternativa.

## ADR-V5-04 — baseline UX

Home mobile-first: Casa, Attività, Documenti, Spese; Home/Agenzie/Amministratori come esperienze distinte. AI propone, utente conferma; verifica completata scompare dalle aperte, originale conservato, conferma dati diversa da certificazione documento. Comunicazioni pubbliche leggibili in Home, stato esplicito dello studio con icona e testo. Account, casa, pratica agenzia e condominio sono identità differenti.

Vendita revoca accesso alla casa alla data, non chiude account. Agenzia ha 60 giorni per download/Gift, poi metadati; Gift accettato indipendente. Cessazione studio revoca mandato e mantiene soltanto pubblicazioni autorizzate. Home non è contabilità, Agenzie non è CRM, Admin non è ticketing/SLA.

## Stato

M1 completata il 13 ottobre 2026: account/casa reali, API e DB dedicati, integrazione frontend e collaudo. Non presentare sezioni future come operative. M2 ha un contratto documents-v1 fissato, implementazione da iniziare.

## ADR-V5-05 — originali e riservatezza M2

Originali immutabili PDF/JPEG/PNG; un file per richiesta, storage privato dedicato, upload idempotente, ZIP selettivo autorizzato. Visibilità default private (solo uploader con diritto Home valido), home soltanto con scelta esplicita. Il ruolo owner non supera la riservatezza di altri uploader. Niente AI, conferme tecniche, sostituzioni o cestino in M2: seguono contratti separati.

Alternativa scartata: rendere ogni upload automaticamente leggibile a tutta la Home, incompatibile con documenti personali/finanziari riservati. Limiti 20 MiB/file e 100 MiB/ZIP sono limiti tecnici locali, non prezzi o quote commerciali. Dettagli in documents-api-contract.md. Antimalware e hardening prima del pilota, senza prometterli nel locale.
