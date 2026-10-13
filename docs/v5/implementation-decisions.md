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

M1/M2 completate in locale il 13 ottobre 2026: account/casa e documenti reali, API/DB/storage dedicati e collaudo frontend integrato. Non presentare sezioni future come operative. M3 review-v1 ha contratto e fixture fissati, implementazione da iniziare.

## ADR-V5-05 — originali e riservatezza M2

Originali immutabili PDF/JPEG/PNG; un file per richiesta, storage privato dedicato, upload idempotente, ZIP selettivo autorizzato. Visibilità default private (solo uploader con diritto Home valido), home soltanto con scelta esplicita. Il ruolo owner non supera la riservatezza di altri uploader. Niente AI, conferme tecniche, sostituzioni o cestino in M2: seguono contratti separati.

Alternativa scartata: rendere ogni upload automaticamente leggibile a tutta la Home, incompatibile con documenti personali/finanziari riservati. Limiti 20 MiB/file e 100 MiB/ZIP sono limiti tecnici locali, non prezzi o quote commerciali. Dettagli in documents-api-contract.md. Antimalware e hardening prima del pilota, senza prometterli nel locale.

## ADR-V5-07 — provider M3 e fonti verificabili

Provider test_fixture_v1 riconosce solo hash dei tre PDF sintetici versionati in fixtures/m3. Etichetta simulazione obbligatoria; nessuna estrazione arbitraria da documenti sconosciuti né quote fittizie attribuite all'originale. Scartato un provider che genera dati standard su ogni upload, perché confonde simulazione con fonte reale. Pagina/estratto coerenti col PDF; zero chiamate AI a pagamento. Job/lease persistenti e pubblicazione atomica, worker separato dalle conferme.

## ADR-V5-08 — conferme e riservatezza M3

Derivati personali al creatore in M3, oltre alla membership Home e autorizzazione fonti. Scartata condivisione automatica della scheda ottenuta da private. Conferme per campo e potenza puntuale con denominazione; originale invariato, mai certificazione. Campi pieni richiedono sostituzione esplicita e nota; versioni/idempotenza proteggono concorrenza e retry. Identiche evidenze già risolte non riaprono la stessa verifica; nuova divergenza non sovrascrive un dato corretto dall'utente. A+B conserva due grandezze, A+C è conflitto della stessa grandezza. Dettagli operativi in review-api-contract.md.

## ADR-V5-06 — Storage e dipendenze M2
Storage locale privato backend-v5/storage-private, nomi UUID, staging e rename prima della transazione DB; rollback rimuove file soltanto dopo verifica DB riuscita di assenza del riferimento. Commit incerto conserva il file; cleanup dopo 24 ore con lookup DB e nessuna cancellazione senza verifica. Nessun reset o pulizia di directory legacy. Originali verificati con hash anche prima del download/ZIP, membership e sessione ricontrollate prima della risposta binaria.
Archiver 7.0.1 e file-type 21.3.4, gia installati/verificati nel workspace, dichiarati come dipendenze dirette V5 con lock autonomo. Alternativa scartata: scrivere a mano ZIP/detection generici o importare FileStorageService legacy con dipendenze incidentali. file-type rileva firma, non certifica validita completa o assenza di malware; hardening prima del pilota. Export in memoria con limite 100 MiB e massimo due concorrenti, coerente con ambiente locale; adapter streaming remoto per ambiente ospitato da rivalutare. Fonti primarie: https://www.archiverjs.com/docs/archiver/ e https://github.com/sindresorhus/file-type.

## ADR-V5-09 — M3, esecuzione persistente
Worker locale ogni 500 ms, claim CAS e lease 30 s/token; limite 120 s dal primo avvio anche dopo recupero. Transazione per risultato/job/storia, lock account/Home e diritti/fonti riletti in pubblicazione. DTO e validazione discriminata stretta, nessun sources/origin fidato dal client. Nessuna nuova dipendenza o provider a pagamento. Test reali ancora aperti.

## ADR-V5-10 — M4 Anthropic e collaudo massimo 10 USD
Scelta esplicita del committente: API Anthropic, plafon cumulativo 10 USD per il collaudo locale. Modello iniziale Sonnet 5.5 configurabile e da verificare nell'account; nessuna escalation o retry automatico. Primo incremento PDF testuali con JSON strutturato e riscontro locale pagina/citazione, non citazioni native incompatibili con structured outputs. Ledger persistente conserva costi incerti e impedisce ridispatch dopo crash. Scartati riuso integrale della pipeline legacy, fonte suggerita senza verifica e limite di spesa solo in memoria. Contratto analysis-v2 in docs/v5/anthropic-api-contract.md; implementazione/live test ancora da fare. Fonte primaria: https://platform.claude.com/docs/en/build-with-claude/citations e https://platform.claude.com/docs/en/models/overview .

## ADR-V5-11 — integrazione M4 e limiti distinti
M4 verificata con provider reale; JSON finale può essere preceduto da thinking/redacted_thinking, ignorati come evidenze. Un solo blocco text JSON, nessun tool/refusal/troncamento accettato. Prompt v2 richiede solo numero per power.value; numero, denominazione e kW verificati insieme sull'estratto. PDF.js 6.4.299 in processo separato senza chiave; fetch senza SDK/retry. Ledger serializzato anche alla prima creazione campagna. Riserva 0.25 USD, cap monetario 10 USD e sei chiamate iniziali distinti: ai_evaluation_limit_reached conserva il saldo. Scartati refund di esiti incerti, rilancio automatico e finta assenza di costi sui fallimenti post-dispatch. La rivalidazione della risposta salvata non ricontatta Anthropic. Resoconto m4-integration-review.md; nessuna dichiarazione di sandbox OS o certificazione tecnica.

## ADR-V5-12 — H1 promemoria personali e date calendario
Primo sottoincremento di Home utile dopo M4 Anthropic: attività manuali private al creatore con diritto Home, eventuale propria caldaia, date utente, completamento/annullamento/riapertura e storia. Nessun obbligo o ricorrenza inferito dai dati della caldaia; documenti, notifiche, normative e costi seguono separatamente. Scartati Issue Genesis/report condominiale come attività personali e generazione automatica da conferma AI. Il nome H1 evita di chiamare M5 Agenzie un sottoincremento della Home o di dichiarare costruita la vecchia M4 Home utile.
Date YYYY-MM-DD, fuso Europe/Rome esplicito per H1; il server determina today/dueState, timestamp storia UTC. Scartato timestamp UTC per una data senza ora, che cambierebbe giorno nel client. App personali protette per account/Home; link asset illeggibile redatto senza cancellare appunti manuali. Annullamento reversibile, niente hard delete. Versione/evento/richiesta atomici e replay autorizzato prima dello stato/versione; nessun completamento offline finto. Contratto activities-api-contract.md; schema/API ancora da implementare. Condivisione familiare, ricorrenze e fuso configurabile successivi, senza promessa di normativa o attestazione.
