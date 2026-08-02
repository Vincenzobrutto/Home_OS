# Roadmap

## Milestone raggiunte

**M0 — Prototipo di design (pre-implementazione)**
UI validata con utenti reali su dati finti (`prototipo/homeos_prototype.jsx`), architettura tecnica definita (`architettura/homeos_architettura_tecnica.md`), test di estrazione AI su documenti reali per validare la fattibilità della pipeline (`ai-test/`).

**M1 — MVP funzionante (stato attuale)**
- Modello dati completo (House/Room/Asset/Document/Contact/Timeline) con Prisma + PostgreSQL.
- CRUD Asset/Room/Contact, campi strutturati + campi liberi, cronologia interventi.
- Pipeline documentale end-to-end: upload → estrazione AI (Claude) → proposta → conferma utente → scrittura, con matching per tipo+nome-simile.
- Creazione automatica di nuovo Asset da documento non riconosciuto, con scelta immediata dell'ambiente.
- Integrazioni Gmail e Google Drive (OAuth + scansione + candidati in Inbox).
- Planimetria interattiva: disegno ambienti (rettangolo o forma libera), posizionamento asset via drag, rotazione a 90° con asset che restano nella stanza assegnata.
- Dashboard con promemoria (garanzie scadute, asset senza documenti) cliccabili verso l'asset.
- App raggiungibile da cellulare sulla stessa rete (LAN) con UI ottimizzata per mobile (sidebar a scomparsa, touch sulla planimetria, layout responsive).
- Documentazione di progetto per collaborazione multi-assistente (`docs/`, `prompts/`, `AGENTS.md`).
- Repository verificato pronto per il passaggio di consegne: `.gitignore` root/backend/frontend confermati completi, build/lint/test eseguiti e documentati, `docs/HANDOFF.md` creato (2026-08-02).

## Prossimi passi (non ordinati per data — vedi priorità in `backlog.md`)

- Autenticazione/sessione reale (oggi zero auth sulle API, un solo utente bootstrap).
- Multi-utente per casa (il modello `HouseMembership` è già pronto, manca tutta la UI/logica di invito e permessi).
- Test automatici backend (Jest configurato ma senza copertura reale) e frontend (nessun framework installato).
- `git init` del repository (finora sviluppato senza controllo di versione).
- OAuth Gmail/Drive funzionante anche da un client mobile in LAN (oggi il redirect è pensato per `localhost`).
- Navigazione con URL reali (oggi `view` è solo stato in memoria, niente back/forward del browser né link condivisibili).
- Rivedere la conservazione in chiaro dei token OAuth in DB prima di qualunque esposizione oltre la rete locale.

Per il dettaglio di ogni voce (dipendenze, priorità) vedi `backlog.md`. Per il ragionamento dietro le scelte già fatte vedi `decisions.md`.
