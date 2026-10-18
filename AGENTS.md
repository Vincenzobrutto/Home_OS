# Istruzioni operative

## Orientamento rapido

- Sviluppo attuale: **Dimora V5**, `backend-v5/` e `frontend-v5/`. `backend/`, `frontend/` e gran parte del README descrivono il legacy.
- Inizia da [stato corrente](docs/project-status.md) e [architettura](docs/architecture.md); apri poi soltanto il contratto/report V5 pertinente al task. Usa `rg` nel modulo interessato, evitando scansioni complete e riletture integrali dello storico.
- Decisioni: [ADR](docs/decisions.md) e [scelte V5](docs/v5/implementation-decisions.md). Modello: `backend-v5/prisma/schema.prisma` e [modello V5](docs/v5/domain-model.md). Priorità: [roadmap](docs/roadmap.md), [backlog](docs/backlog.md).
- Leggi le istruzioni della sottocartella, incluso [frontend-v5/AGENTS.md](frontend-v5/AGENTS.md). Router, TanStack Query e CSS Modules sono autorizzati nella V5. Le convenzioni [legacy](prompts/conventions.md) inline/theme valgono al legacy, non alla V5.

## Prima di modificare

- Verifica branch, `git status`, staging e remote; `git fetch origin`, confronto HEAD/upstream/origin/main. Non dichiarare sincronizzazione dalla sola cache locale.
- Mantieni il branch di lavoro, non modificare main. Con dirty tree o divergenza niente pull automatico: analizza sovrapposizioni e conserva il lavoro altrui. Nessun reset, clean, force push o rimozione di worktree senza autorizzazione esplicita.
- Al passaggio del 18 ottobre restano modifiche legacy locali escluse dal commit documentale: vedi stato corrente. Non includerle per errore nei commit futuri.

## Vincoli confermati

- API/DB/storage V5 dedicati; niente credenziali, migrazioni o dati legacy. Non stampare `.env`, token, originali personali o risposte AI sensibili.
- Sessione httpOnly, Origin/CSRF, membership, visibilità per fonte, versione/SHA e idempotenza obbligatori. Owner non significa accesso a originali privati altrui.
- AI: normalmente propone, utente conferma. Eccezione V5 esplicita: caricamento automatico autorizzato sul gruppo esatto e soli dati validati non ambigui; contatti con opt-in distinto. La selezione AI dalla pagina Documenti è **solo proposte**. Non ampliare consensi precedenti o sovrascrivere campi pieni automaticamente.
- Nessun nuovo invio a pagamento, aumento quote, retry incerto, reset ledger, deploy o cambiamento DB/firewall senza incarico pertinente. Verifica consenso e ledger attuali: numeri nei report sono storici.
- Non presentare fixture come dati reali, conferma come certificazione, backlog come implementazione. Per regole Asset legacy leggi [principi](prompts/coding-guidelines.md), modello e ADR prima di intervenire.

## Verifica e consegna

- Comandi e suite mirate nello [stato corrente](docs/project-status.md). Test del modulo modificato; DB soltanto dedicato al collaudo. Per documentazione bastano link, diff e controllo segreti; nessun test AI live.
- Aggiorna API se cambia un endpoint, modello se cambia schema, ADR per decisioni, backlog per problemi fuori scope; stato/roadmap/changelog per comportamento. Mantieni un solo riepilogo corrente e rimanda ai report.
- Controlla diff/staging prima del commit; pubblica sul branch autorizzato e verifica hash con `git ls-remote`. Riferisci separatamente sincronizzazione dei commit e dirty tree residuo.
