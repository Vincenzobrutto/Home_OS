# Dimora V5 — Backlog operativo integrato v1.0

**Data:** 13 ottobre 2026. **Branch:** `prototype/dimora-partner-home-v4`. **Stato:** piano, non implementazione.

## Fonti e decisioni
Fonti: [Master Functional Catalog v0.3](MASTER_FUNCTIONAL_CATALOG_v0.3_20261013.md), [Design System V5](DIMORA_V5_DESIGN_SYSTEM_v0.1_20261013.md), [Home UX](DIMORA_HOME_UX_CONSOLIDATED_v0.1_20261012.md), [Home Import/Review](DIMORA_HOME_IMPORT_REVIEW_UX_v0.1_20261013.md), [Agenzie UX](DIMORA_PARTNER_AGENZIE_UX_v0.1_20261013.md), [Amministratori UX](DIMORA_PARTNER_AMMINISTRATORI_UX_v0.1_20261013.md), [Decisioni D01–D10](DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md), [Audit repo](DIMORA_V5_REPO_AUDIT_AND_IMPLEMENTATION_PLAN_v0.1_20261013.md), [gap analysis](DIMORA_V5_ARCHITECTURE_GAP_ANALYSIS_20261013.md), [preview audit](V5_PREVIEW_AUDIT_20261013.md), `AGENTS.md`, `docs/domain-model.md`, `docs/decisions.md`, `docs/HANDOFF.md`.

**Precedenza:** il §11.4 del Master approva il workflow end-to-end delle segnalazioni V1 e supera il precedente carattere condizionato del livello 2. Direzione estetica B confermata. Tre esperienze in parallelo a livello UX; le dipendenze tecniche restano sequenziali. **AI propone, utente conferma.**

**Legenda:** D = demo simulata; R = realizzazione V1; P0 = prerequisito o sicurezza; P1 = core; P2 = eventuale. AC = criterio di accettazione. Nessuna durata/costo stimato.

## Stato tecnico verificato
React 19 + Vite 8 + TypeScript 6, navigazione a stato `view` in `App.tsx`, CSS inline e token `theme.ts`. Componenti Home già presenti (`Dashboard`, `Assets`, `Rooms`, `HouseDocuments`, `Genesis`, `InboxHub`, `GlobalSearch`). Backend NestJS/Prisma/PostgreSQL con moduli auth, documents, houses, access-control. `HouseMembership` gestisce ruoli per casa, **non** permessi per studio/edificio/scala/unità. `Issue` nello schema è issue del motore Home/Genesis (`ruleCode`), **non** segnalazione condominiale. `auth/account-status` pubblico espone informazioni su esistenza account: rischio da rivedere prima degli inviti Gift. Preview React in `frontend/src/v5/` e HTML standalone sono solo DEMO; nessun build/lint eseguito in questo task. Le note gap analysis e preview audit disponibili sono sintetiche e non attestano test completi.

## Milestone e gate
- **M0 Audit:** baseline commit, inventario riuso, build/lint/test e rischi documentati.
- **M1 Core DEMO:** token B isolati, tre shell e fixture con permessi simulati, nessuna API reale.
- **M2 Tre journey:** Home import/review; Agenzie fascicolo/Gift; Admin segnalazione/presa in carico/pubblicazione/Home, con error path.
- **M3 UX:** test task-based per tre target, accessibilità e scope freeze.
- **M4 V1 foundations:** modello tenant/edificio/unità, autorizzazioni, ADR, API, privacy e retention approvati.
- **M5 Segnalazioni reali:** persistenza, inbox, presa in carico, notice mirata, storico, test isolamento.
- **M6 Home/edifici:** pubblicazioni versionate, documenti e Home collegata.
- **M7 Agenzie:** checklist, dossier, Gift selettivo e invito neutro.
- **M8 Beta/go-no-go:** sicurezza, qualità, privacy, unit economics, feedback utenti.

**Ordine critico:** M0 → M1 → M2 → M3 → M4 → M5; M6/M7 possono procedere in stream paralleli **dopo** M4. Nessun merge su main o migrazione implicita.
