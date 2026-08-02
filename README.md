# HomeOS

Digital twin di una casa: raccoglie i documenti che la riguardano (fatture, certificati, manuali, planimetrie) e li collega agli Asset fisici della casa (caldaia, impianto elettrico, elettrodomestici...), non li archivia genericamente. Vedi [`docs/vision.md`](docs/vision.md) per l'obiettivo completo.

## Struttura del repository

```
homeos-project/
├── backend/       NestJS + Prisma + PostgreSQL — API REST, pipeline AI, integrazioni Gmail/Drive
├── frontend/      React + Vite + TypeScript — SPA
├── docs/          documentazione di prodotto e architettura (vedi sotto)
├── prompts/       convenzioni di stile/codice per chi scrive in questo repo (umano o AI)
├── AGENTS.md      istruzioni operative per assistenti AI che lavorano su questo repo
├── START_HERE.md, architettura/, prototipo/, ai-test/   materiale storico di progettazione, pre-implementazione (vedi nota sotto)
```

**Nota sulla struttura**: questo repository non ha una cartella `/src` o `/tests` unica a livello di root. `backend/` e `frontend/` sono due progetti Node indipendenti (due `package.json`, due server di sviluppo) — il codice vive in `backend/src` e `frontend/src`. È una deviazione intenzionale da un template generico a cartella singola: unificare tutto sotto un `/src` comune avrebbe richiesto spostare centinaia di file e riscrivere ogni config (Vite, Nest CLI, Prisma, `.claude/launch.json`) senza un beneficio reale. Vedi [`docs/architecture.md`](docs/architecture.md) §1.

**Test automatici**: il backend usa Jest e copre le prime regole di dominio su stato/garanzia Asset e pipeline documentale; la copertura resta parziale. Il frontend non ha alcun framework di test configurato. Il lavoro residuo è tracciato in [`docs/backlog.md`](docs/backlog.md).

**Repository Git**: il progetto è versionato su GitHub; i `.gitignore` di root, `backend/` e `frontend/` escludono dipendenze, build, file `.env` e upload locali.

## Documentazione

| File | Contenuto |
|---|---|
| [`docs/vision.md`](docs/vision.md) | obiettivo del prodotto, utenti, proposta di valore, funzionalità |
| [`docs/architecture.md`](docs/architecture.md) | architettura logica, stack tecnologico, motivazioni |
| [`docs/domain-model.md`](docs/domain-model.md) | entità, relazioni, regole di business |
| [`docs/api.md`](docs/api.md) | riferimento REST API |
| [`docs/ui-ux.md`](docs/ui-ux.md) | struttura frontend, design system, comportamento mobile |
| [`docs/roadmap.md`](docs/roadmap.md) | milestone, funzionalità completate, prossimi passi |
| [`docs/decisions.md`](docs/decisions.md) | registro cronologico delle decisioni architetturali (ADR), con alternative scartate |
| [`docs/backlog.md`](docs/backlog.md) | attività aperte, priorità, dipendenze |
| [`docs/changelog.md`](docs/changelog.md) | modifiche rilevanti per sessione di sviluppo |
| [`prompts/coding-guidelines.md`](prompts/coding-guidelines.md) | principi di dominio da rispettare scrivendo codice |
| [`prompts/conventions.md`](prompts/conventions.md) | convenzioni concrete di stile e ambiente di sviluppo |
| [`AGENTS.md`](AGENTS.md) | istruzioni per assistenti AI (Claude Code, ChatGPT, altri) che lavorano su questo repo |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | stato del progetto, comandi, problemi noti — punto di partenza per chi riceve il progetto in consegna |

Questi documenti sono la fonte di verità sulle *decisioni*; il codice (in particolare `backend/prisma/schema.prisma`) resta la fonte di verità sui *dettagli tecnici attuali*. In caso di conflitto tra un documento e il codice, aggiorna il documento.

## Avvio rapido

Requisiti: Node.js, PostgreSQL, una chiave API Anthropic (per l'estrazione documenti). Vedi `backend/.env.example` per tutte le variabili richieste.

```bash
# backend — porta 3000
cd backend
npm install
npx prisma migrate deploy
npm run start:dev

# frontend — porta 5173, raggiungibile anche da altri dispositivi sulla stessa rete
cd frontend
npm install
npm run dev
```

Il frontend legge l'URL del backend da `window.location.hostname:3000` per default; per sovrascriverlo (o per usare un backend non locale) copia `frontend/.env.example` in `frontend/.env`.

## Lint, build, test

```bash
# backend
cd backend && npm run lint && npm run build && npm run test

# frontend (nessun test automatico configurato — vedi sopra)
cd frontend && npm run lint && npm run build
```

Stato attuale di questi comandi, incluso l'elenco degli errori di lint pre-esistenti non risolti in questa attività, è in [`docs/HANDOFF.md`](docs/HANDOFF.md).

## Collaborazione multi-assistente

Questo repository è pensato per essere sviluppato da più assistenti AI (Claude Code, ChatGPT) e sviluppatori umani senza perdita di contesto. Se sei un assistente AI, leggi [`AGENTS.md`](AGENTS.md) prima di iniziare — descrive cosa aggiornare (e quando) man mano che il progetto evolve.
