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
- Piani di manutenzione una tantum o ricorrenti sugli Asset: stati calcolati, preavviso, tecnico abituale, completamento transazionale, storico, sospensione e promemoria Dashboard.
- Suggerimenti automatici di piani di manutenzione per tipi di Asset con cadenza nota (CLIMA/CALDAIA/FOTOVOLTAICO/ELETTRICO), con prima scadenza calcolata dalla data di installazione/acquisto — sempre da confermare, mai creati in automatico (2026-08-03).
- App raggiungibile da cellulare sulla stessa rete (LAN) con UI ottimizzata per mobile (sidebar a scomparsa, touch sulla planimetria, layout responsive).
- Documentazione di progetto per collaborazione multi-assistente (`docs/`, `prompts/`, `AGENTS.md`).
- Repository verificato pronto per il passaggio di consegne: `.gitignore` root/backend/frontend confermati completi, build/lint/test eseguiti e documentati, `docs/HANDOFF.md` creato (2026-08-02).
- Copertura backend delle regole di dominio: stato/garanzia Asset, matching documento→asset, conferma senza sovrascrittura, calendario manutenzioni e suggerimenti di manutenzione (22 test totali, 2026-08-03).

## Prossimi passi (non ordinati per data — vedi priorità in `backlog.md`)

- Autenticazione/sessione reale (oggi zero auth sulle API, un solo utente bootstrap).
- Multi-utente per casa (il modello `HouseMembership` è già pronto, manca tutta la UI/logica di invito e permessi).
- Ampliare i test automatici backend oltre la prima copertura di dominio e introdurre i test frontend (nessun framework installato).
- OAuth Gmail/Drive funzionante anche da un client mobile in LAN (oggi il redirect è pensato per `localhost`).
- Navigazione con URL reali (oggi `view` è solo stato in memoria, niente back/forward del browser né link condivisibili).
- Rivedere la conservazione in chiaro dei token OAuth in DB prima di qualunque esposizione oltre la rete locale.
- Proporre il completamento di piani di manutenzione a partire da un documento caricato (es. fattura di un intervento), anche su più Asset collegati a un'unica fattura — specifica dettagliata in `backlog.md` B22.

## Idee di prodotto da valutare (engagement / monetizzazione)

Non ancora decise né pianificate — pensate insieme all'utente il 2026-08-03, dettaglio in `backlog.md`:

- Notifiche esterne (email/push) per scadenze di garanzie e manutenzioni, eventualmente con digest periodico — B18. Nel dominio della casa la leva di ritorno naturale è "hai davvero qualcosa da fare", non contenuto generico.
- Export "libretto casa" in PDF, utile alla vendita dell'immobile o per l'assicurazione — B23. Valore concreto e puntuale, buon primo esperimento di monetizzazione perché non richiede prima un sistema di piani/abbonamenti.
- Limite mensile di documenti analizzati dall'AI nel piano gratuito — B24. Leva freemium onesta (rispecchia il costo reale delle chiamate a Claude), ma dipende da un sistema di autenticazione/piani che oggi non esiste.

### Cosa monitorare della casa (oltre garanzie/manutenzioni)

Stessa origine (2026-08-03), dettaglio in `backlog.md`. Divise in due fasce per sforzo:

**Solo dati caricati/estratti — si innestano su quello che c'è già:**
- Bollette e consumi (luce/gas/acqua) con trend nel tempo — B25.
- Rilevatori di sicurezza (fumo/CO/allagamento) come Asset con piano di manutenzione batteria — B26, sforzo quasi nullo perché riusa Asset+MaintenancePlan.
- Scadenze generalizzate oltre l'Asset (polizza casa, APE, IMU/TARI) — B27, riusa il motore di promemoria già costruito.
- Valore stimato del contenuto casa dai prezzi già estratti — B28, complementare al libretto PDF (B23).
- "Punteggio salute casa" aggregato in Dashboard — B29, leva di engagement senza nuovo modello dati.

**Integrazione con dispositivi reali (IoT) — molto più ambizioso:**
- Stato reale dagli elettrodomestici smart connessi invece di calendario fisso — B30. Il più differenziante nel senso letterale di "digital twin", ma richiede integrazioni per piattaforma/marca — da valutare solo dopo le idee più semplici.

Per il dettaglio di ogni voce (dipendenze, priorità) vedi `backlog.md`. Per il ragionamento dietro le scelte già fatte vedi `decisions.md`.
