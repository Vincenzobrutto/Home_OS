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

## Backlog A — prototipo React navigabile [DEMO]

Ogni task include dipendenze (tra parentesi) e criterio di accettazione. Nessun task DEMO deve invocare API live o dichiarare azioni reali.

### A0 — Baseline e Design System
- **D00 P0** (—) Verificare head branch, lavori concorrenti, `AGENTS.md`, convenzioni, componenti e schema → inventario riuso/gap, nessun merge.
- **D01 P0** (D00) Baseline frontend build/lint e backend build/test se disponibile → exit code registrati; se non eseguiti dichiararlo.
- **D02 P0** (D00) Audit `v5-preview.html` e `DimoraV5Preview.tsx` → entrypoint e TypeScript validati, nessun falso invio.
- **D03 P0** (D00) Matrice DEMO/V1/FUTURO → ogni CTA mostra natura simulata o reale.
- **D10 P0** (D00) Token premium B isolati, inline styles → non alterare `theme.ts` legacy, contrasti verificabili.
- **D11 P1** (D10) Shell Home mobile con Casa/Attività/Documenti/Spese, Condominio dentro Casa, ricerca e «+» → navigazione da tastiera e touch.
- **D12 P1** (D10) Shell Agenzie desktop con pratica/checklist/dossier/Gift → contesto e indietro coerenti.
- **D13 P1** (D10) Shell Amministratori con edificio/memoria/pubblicazioni/segnalazioni → inbox segnalazioni distinta da «Da rivedere» AI.
- **D14 P0** (D10) Componenti condivisi: DocumentoCard, AssetCard, EvidenceRow, ReviewItem, PermissionPreview, PublishManifest, IssueInfo → fonte/versione/permessi sempre visibili, nessun claim certificativo.
- **D15 P0** (D11–D14) Fixture: almeno 2 edifici, 2 scale, 3 unità e utenti con permessi differenti → verifica visibilità demo e zero dati reali.
- **D16 P1** (D14) Stati vuoto/caricamento/errore/403/quota/offline/duplicato → ogni journey ha errore recuperabile.

### A1 — Home
- **D20 P1** (D11,D15) Casa vuota/Gift prepopolata, ingresso document-first e alternativa manuale → nessun inventario obbligatorio.
- **D21 P1** (D20) Import batch 20+ file, stati, hash duplicati, fallimento AI → riepilogo per oggetto, originale conservato nella simulazione.
- **D22 P1** (D21) Asset provvisori «Da confermare» e «Da collocare» → non attivano scadenze normative.
- **D23 P1** (D22) «Da rivedere» per proposte/conflitti, «Suggerimenti» separati → batch solo basso rischio; normative/permessi puntuali.
- **D24 P1** (D23) Scheda caldaia con valori 24/28 kW e semantiche distinte → non scegliere automaticamente il numero.
- **D25 P1** (D23) Riepilogo import con verifiche residue e prossima azione facoltativa → nessun elemento sparisce per conferma parziale.
- **D26 P1** (D20) Documenti/Attività/Spese e Condominio autonomo/collegato → dati privati e pubblicati distinti, no overwrite.
- **D27 P2** (D26) Free/Pro demo → nessun prezzo/limite inventato, no crediti AI/Event Pass V1.

### A2 — Partner Agenzie
- **D30 P1** (D12,D15) Scheda preliminare gratuita → attivazione operativa esplicita senza prezzi fittizi.
- **D31 P1** (D30) Upload batch/link terzo nel fascicolo → «ricevuto» non «verificato» né automaticamente visibile all'acquirente.
- **D32 P1** (D31) Checklist C+ dinamica, stati, assegnazioni e proposta template → approvazione agente; no learning cross-agenzia, no solleciti automatici venditori.
- **D33 P1** (D32) Dossier anteprima/riservato/Gift → tre dataset e accessi differenti.
- **D34 P1** (D33) Gift manifesto documenti+asset/storico → esclusione finanziari privati per default, nessun obbligo automatico.
- **D35 P1** (D34) Invito nuovo/esistente/scaduto/revocato → non rivela esistenza account né crea account attivo.

### A3 — Partner Amministratori e Segnalazioni (priorità alta)
- **D40 P1** (D13,D15) Dashboard studio, edificio, import documenti/impianti e memoria tecnica → no secondo gestionale.
- **D41 P0** (D15) Distinguere stato **report privato**, **incidente comune**, **evento amministratore**, **notice pubblicata** → niente riuso implicito di `Issue` Genesis.
- **D42 P1** (D26,D41) Home «Segnala problema» con scala/impianto e suggerimento di comunicazioni pertinenti → invio mai bloccato dal matching.
- **D43 P1** (D42) Invio simulato, ricevuta e stato del proprio report → errore rete e retry dimostrabili, nessuna conferma server falsa.
- **D44 P1** (D43) Inbox Admin: leggere, chiedere dettagli, associare a caso noto → originali e identità segnalanti preservati ma privati.
- **D45 P1** (D44) Presa in carico, aggiornamento, chiusura con motivazione → solo azione esplicita Admin, non AI.
- **D46 P0** (D45) Anteprima audience scala/edificio/unità e conferma notice versionata → Scala B non vede notice Scala A, testo report privato non pubblicato.
- **D47 P1** (D46) Home legge aggiornamento e stato proprio report, «Ho trovato risposta» → non conta automaticamente chiamate evitate.
- **D48 P1** (D40) Invito unità/Home e cambio proprietario demo → vecchi accessi riservati revocati, dati privati non trasferiti.
- **D49 P0** (D42–D48) Scenari 403, duplicato, errore invio, audience errata, revoca, urgenza → non promettere presidio h24.

### A4 — Verifica demo
- **D50 P0** (D20–D49) Test task-based tre target → utenti distinguono fonte, permesso e simulazione.
- **D51 P1** (D50) Tastiera, viewport mobile/desktop, zoom, focus, contrasto, bug triage → problemi bloccanti corretti o registrati.
- **D52 P0** (D51) Handoff V1 e scope freeze → componenti riusabili e gap tracciati; nessuna migrazione automatica.
