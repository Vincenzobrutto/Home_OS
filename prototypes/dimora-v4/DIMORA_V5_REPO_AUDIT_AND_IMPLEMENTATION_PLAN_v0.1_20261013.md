# Dimora V5 — repository audit e piano di integrazione React v0.1
Data: 13 ottobre 2026. Branch esaminato: `prototype/dimora-partner-home-v4`.
**Metodo:** lettura diretta di struttura GitHub, `AGENTS.md`, `README.md`, `frontend/package.json`, `frontend/src/App.tsx` (intestazione), `frontend/src/theme.ts` (inizio), `prompts/conventions.md`, `backend/prisma/schema.prisma` (intestazione), `docs/domain-model.md` e `docs/decisions.md` (inizio). Audit **preliminare**, non analisi esaustiva di ogni componente/endpoints né build eseguita.

## 1. Esistente verificato
- Frontend `frontend/src/` su **React 19 + Vite 8 + TypeScript 6 + lucide-react**, nessuna dipendenza router; `App.tsx` usa componenti, stato view e API backend.
- Componenti riusabili riscontrati: `Dashboard`, `Rooms`, `RoomsHub`, `Assets`, `HouseDocuments`, `Genesis`, `InboxHub`, `GlobalSearch`, `EnergyConsumption`, `LoginScreen`, `ConsentScreen`, `Sidebar`, `Shared`.
- Il design attuale è `theme.ts` palette «Smeraldo» e `MOBILE_CSS`; non coincide con la nuova direzione B proposta. **Non cambiare globalmente i token senza regression test visuali.**
- Backend: moduli `access-control`, `assets`, `auth`, `compliance`, `documents`, `genesis`, `houses`, `maintenance`, `utility-bills`, `warranties`, `gmail`, `drive` ecc. Schema Prisma effettivamente presente.
- `AGENTS.md` impone lettura linee guida, aggiornamento ADR/documenti in modifiche di dominio, verifica sincronizzazione e collaborazione multi-agente; codice usa CSS inline, token `T`; nessun router convenzionale.
- `README.md`: alcuni test backend, nessun framework di test frontend; OAuth token Google in chiaro indicati come rischio prima di deploy.

## 2. Gap funzionali V5 (ipotesi da verificare contro ogni file backend prima di implementare)
A. Shell React Home V5 mobile-first e bottom nav Casa / Attività / Documenti / Spese, mantenendo UX e funzioni esistenti.
B. Shell Partner Agenzie: fascicolo, checklist C+, dossier a tre livelli, consegna Home Gift con inviti e permessi.
C. Shell Partner Amministratori: edificio, memoria tecnica, pubblicazioni versionate verso unità e Home, legame utenti/unità, cambio titolarità.
D. «Segnalazioni intelligenti»: caso condominiale condiviso vs segnalazioni individuali vs comunicazione pubblicata; verifica preliminare del caso noto; inbox Admin; presa in carico, notifica e chiusura, permessi per audience.
E. Fondamenta cross-product: organizzazioni e membership, appartenenza unità, access control prima del retrieval, manifesti pubblicazione, originali e fonti, storici ed export.
**Non presumere** che A-E siano del tutto assenti: lo schema e i servizi devono essere letti integralmente prima di proporre migration o endpoints.

## 3. Piano tecnico raccomandato
**P0 — Ispezione completa e baseline**
Leggere `frontend/src/App.tsx`, `Sidebar.tsx`, `Shared.tsx`, `api.ts`, `backend/prisma/schema.prisma`, guard auth, `docs/backlog.md`, `docs/HANDOFF.md`, `prompts/coding-guidelines.md`; verificare branch/head con altri agenti e installare/build/lint/test in checkout isolato se disponibile. Non cambiare main.
**P1 — Prototipo navigabile isolato** nella branch: componenti React sotto `frontend/src/v5/`, fixtures immutabili, switch ruolo demo; non fingere invii o sicurezza reale, nessun network ai dati veri, nessuna sostituzione di `App.tsx`. Adottare i token V5 isolati in modulo TypeScript compatibile con stili inline, mantenendo `theme.ts` esistente per produzione. Successivamente decidere integrazione graduale.
**P2 — Journey dimostrativi**: Home review, Agenzia fascicolo→Gift, Admin segnalazione→presa in carico→aggiornamento→Home; errori e negazione permessi simulati etichettati.
**P3 — Specifica domain/API+security**: approvare nuove entità con ADR e schema prima di implementare V1 reale. Chiarire allineamento tra case, edifici, unità, utenti, permessi e notifiche.
**P4 — Conversione in verticale reale**: un workflow alla volta con DB, API, validazione DTO, audit, test auth/permission, error handling, privacy, osservabilità.
**P5 — Test beta**: task, comprensione states, tempi, duplicazioni, utilità delle risposte ai guasti, costi AI e notifiche.

## 4. Segnalazioni: contratto di dominio da stabilire
Separare `CondominiumIssue` (problema comune), `IssueReport` (segnalazione privata di utente), `IssueUpdate` (azione/stato amministrativo) e `PublishedNotice` (messaggio audience autorizzata). Sono **nomi candidati**, NON entità già presenti/approvate in Prisma.
- Ricezione: conferma di persistenza nel backend, non solo click del condòmino.
- Deduplica: propone associazione, ma l'autore può inviare comunque.
- Privato di default: altre unità non vedono testo o identità del segnalante; la comunicazione dell'amministratore è esplicitamente pubblicata e scoping per edificio/scala.
- Stati accurati: ricevuta, in valutazione, in carico, risolta/chiusa, cronologia e motivazione; stato comunicato separato da delivery/lettura.
- Nessuna urgenza presidiata h24 né SLA/dispatch in V1.

## 5. Criteri accettazione prototipo
- Le tre esperienze cambiano senza refresh; le CTA percorrono scenari coerenti e ritorni; stato demo non confuso con scritture vere.
- Home mostra documento personale e pubblicazione comune con fonti distinte.
- Agenzia non rivela esistenza account, mostra anteprima concesso vs riservato, manifesto Gift e invito **simulato**.
- Admin mostra segnalazioni private, associa un caso e pubblica aggiornamento di sola scala; Home autorizzata riceve contenuto pubblicato (solo state demo); altri utenti non vedono segnalazione privata.
- Accessibility: tastiera, etichette, gerarchia titoli, stati, contrasto; responsive mobile e desktop.
- Nessun endpoint live invocato dal prototipo standalone e nessun dato vero incluso nelle fixtures.

## 6. Bloccanti / attenzioni
- Il prototipo HTML v5 oggi nel repo è standalone e non integra React o backend; va migrato, non scambiato per funzionalità esistente.
- Il nuovo design system è una scelta estetica approvata, ma il dettaglio token/contrasti richiede test.
- Non sono stati eseguiti build/lint/test né un merge. L'audit non prova assenza di moduli specifici: serve lettura completa.
- Conservare compatibilità con `docs/decisions.md` e convenzioni; evitare di alterare `frontend/src/App.tsx` finché il V5 demo non è isolato e funzionante.

## 7. Sequenza prossima implementazione
1. Creare entrypoint React demo isolato e V5 tokens; scrivere shell e fixture iniziali.
2. Completare scenari navigabili Home/Agency/Admin e segnalazioni.
3. Eseguire `npm run build`, `npm run lint`, successivamente review.
4. Preparare backlog V5 con stime solo dopo verifica completa architettura e test.
