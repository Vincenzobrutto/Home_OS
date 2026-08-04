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
- Completamento di manutenzioni da fatture/rapporti già eseguiti: proposta AI, matching con piani attivi su più Asset, selezione esplicita e conferma transazionale collegata al documento (B22, 2026-08-03).
- App raggiungibile da cellulare sulla stessa rete (LAN) con UI ottimizzata per mobile (sidebar a scomparsa, touch sulla planimetria, layout responsive).
- Documentazione di progetto per collaborazione multi-assistente (`docs/`, `prompts/`, `AGENTS.md`).
- Repository verificato pronto per il passaggio di consegne: `.gitignore` root/backend/frontend confermati completi, build/lint/test eseguiti e documentati, `docs/HANDOFF.md` creato (2026-08-02).
- Copertura backend delle regole di dominio: stato/garanzia Asset, pipeline documentale, calendario/suggerimenti manutenzione e completamento multiplo da documento (26 test totali, 2026-08-03).

**M2 — HomeOS Genesis MVP (2026-08-04)**
- Wizard di onboarding a 6 step (Benvenuto → Informazioni casa → Documenti → Scansione guidata → Revisione Digital Twin → Risultati), persistente e ripresumibile a grana grossa.
- Scansione guidata dimostrativa con catalogo configurabile di 14 ambienti e 25 Asset/impianti: l'utente sceglie cosa assomiglia alla propria casa prima della proposta, poi conferma/modifica/scarta ogni elemento.
- Home Score v1: punteggio 0-100 su 5 dimensioni pesate (documentazione, manutenzione, sicurezza, efficienza, completezza), ogni scostamento spiegato da una `reason` esplicita, versionato e persistito come storico (`ScoreSnapshot`).
- Home Detective: 5 regole deterministiche (mai un LLM) che generano `Issue`/`Recommendation` idempotenti, riconciliate ad ogni completamento di Genesis.
- Dashboard aggiornata: card Home Score, sezione "Da tenere d'occhio", "Consigliato", conteggio documenti reale (non più hardcoded), cronologia casa.
- Nuove entità: `Floor`, `ScanSession`, `Observation`, `Issue`, `Recommendation`, `ScoreSnapshot`, `HouseTimelineEvent`; `House`/`Room`/`Asset` estesi in modo retrocompatibile.
- Verificato end-to-end nel browser il flusso Genesis originario; il nuovo catalogo selezionabile è coperto da test automatico del provider mock.
- **Blocco noto e accettato**: nessuna autenticazione, quindi l'isolamento per utente richiesto dalla specifica non è applicato (vedi `decisions.md` #25, `product-backlog.md` EPIC 7). Limitazioni di dettaglio in `genesis-architecture.md` §9 (nessuna deduplica contro dati esistenti, ripresa del wizard a grana grossa).

## Prossimi passi (non ordinati per data — vedi priorità in `backlog.md`)

- Autenticazione/sessione reale (oggi zero auth sulle API, un solo utente bootstrap).
- Multi-utente per casa (il modello `HouseMembership` è già pronto, manca tutta la UI/logica di invito e permessi).
- Ampliare i test automatici backend oltre la prima copertura di dominio e introdurre i test frontend (nessun framework installato).
- OAuth Gmail/Drive funzionante anche da un client mobile in LAN (oggi il redirect è pensato per `localhost`).
- Navigazione con URL reali (oggi `view` è solo stato in memoria, niente back/forward del browser né link condivisibili).
- Rivedere la conservazione in chiaro dei token OAuth in DB prima di qualunque esposizione oltre la rete locale.
- Genesis: sostituire la scansione mock con un provider reale (foto/video), aggiungere deduplica contro Asset/Room esistenti, ripresa del wizard a grana fine — vedi `genesis-architecture.md` §9-10, `backlog.md` B33/B34.

## Idee di prodotto da valutare (engagement / monetizzazione)

Non ancora decise né pianificate — pensate insieme all'utente il 2026-08-03, dettaglio in `backlog.md`:

- **In standby per decisione dell'utente (2026-08-03)** — notifiche esterne (email/push) per scadenze di garanzie e manutenzioni, eventualmente con digest periodico — B18. Nessuna scelta di provider, canale o frequenza è stata ancora approvata; non implementare finché l'utente non la riattiva.
- Export "libretto casa" in PDF, utile alla vendita dell'immobile o per l'assicurazione — B23. Valore concreto e puntuale, buon primo esperimento di monetizzazione perché non richiede prima un sistema di piani/abbonamenti.
- Limite mensile di documenti analizzati dall'AI nel piano gratuito — B24. Leva freemium onesta (rispecchia il costo reale delle chiamate a Claude), ma dipende da un sistema di autenticazione/piani che oggi non esiste.

### Cosa monitorare della casa (oltre garanzie/manutenzioni)

Stessa origine (2026-08-03), dettaglio in `backlog.md`. Divise in due fasce per sforzo:

**Solo dati caricati/estratti — si innestano su quello che c'è già:**
- Monitoraggio consumi elettrici: bolletta caricata, istogramma mensile con confronto anno-su-anno (rispetta la stagionalità), correlazione visiva con gli Asset installati in quel periodo — design completo affinato con l'utente il 2026-08-03 — B25.
- Rilevatori di sicurezza (fumo/CO/allagamento) come Asset con piano di manutenzione batteria — B26, sforzo quasi nullo perché riusa Asset+MaintenancePlan.
- Scadenze generalizzate oltre l'Asset (polizza casa, APE, IMU/TARI) — B27, riusa il motore di promemoria già costruito.
- Valore stimato del contenuto casa dai prezzi già estratti — B28, complementare al libretto PDF (B23).
- "Punteggio salute casa" aggregato in Dashboard — B29, leva di engagement senza nuovo modello dati.

**Integrazione con dispositivi reali (IoT) — molto più ambizioso:**
- Stato reale dagli elettrodomestici smart connessi invece di calendario fisso — B30. Il più differenziante nel senso letterale di "digital twin", ma richiede integrazioni per piattaforma/marca — da valutare solo dopo le idee più semplici.

Per il dettaglio di ogni voce (dipendenze, priorità) vedi `backlog.md`. Per il ragionamento dietro le scelte già fatte vedi `decisions.md`.
