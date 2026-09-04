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
- Wizard di onboarding a 6 step (Benvenuto → Informazioni casa → Documenti → Scansione guidata → Revisione Digital Twin → Risultati), con ripresa precisa dello step e ricostruzione della Review dall'ultima sessione (B34).
- Scansione guidata dimostrativa con catalogo configurabile di 14 ambienti e 25 Asset/impianti: l'utente sceglie cosa assomiglia alla propria casa prima della proposta, poi conferma/modifica/scarta ogni elemento.
- Home Score v1: punteggio 0-100 su 5 dimensioni pesate (documentazione, manutenzione, sicurezza, efficienza, completezza), ogni scostamento spiegato da una `reason` esplicita, versionato e persistito come storico (`ScoreSnapshot`).
- Home Detective: 5 regole deterministiche (mai un LLM) che generano `Issue`/`Recommendation` idempotenti, riconciliate ad ogni completamento di Genesis.
- Dashboard aggiornata: card Home Score, sezione "Da tenere d'occhio", "Consigliato", conteggio documenti reale (non più hardcoded), cronologia casa.
- Nuove entità: `Floor`, `ScanSession`, `Observation`, `Issue`, `Recommendation`, `ScoreSnapshot`, `HouseTimelineEvent`; `House`/`Room`/`Asset` estesi in modo retrocompatibile.
- Verificato end-to-end nel browser il flusso Genesis originario; il nuovo catalogo selezionabile è coperto da test automatico del provider mock.
- Dashboard con trend Home Score degli ultimi 12 mesi, selezione dimensione e ricalcolo manuale senza snapshot duplicati (B35).
- Monitoraggio consumi elettrici da bollette confermate: confronto mensile YoY, variazione percentuale e installazioni Asset contestualizzate nel mese (B25).
- **Blocco storico risolto**: l'autenticazione reale (B2, 2026-08-24) applica ora l'isolamento per utente richiesto dalla specifica Genesis — vedi `decisions.md` #32. Deduplica e ripresa precisa sono state completate con B33/B34.
- Property Profile B36: scheda catastale, fisica, energetica e di agibilità; completezza, provenienza campo-per-campo e proposte AI da documenti confermate senza sovrascrivere valori esistenti (2026-08-25).

**M3 — Check-up adempimenti v6 (in corso, avviato 2026-09-03)**
- Fondazioni schema: `EvidenceStatus`, `ThermalSystem`, libretto/rapporti di efficienza, responsabilità, territori e regole versionate.
- `MaintenancePlan` generalizzato a House/ThermalSystem/Asset con migrazione retrocompatibile, provenienza e chiave idempotente per i piani normativi.
- Motori puri iniziali per F-gas, APE conservativo, validazione delle regole e conflitti territoriali; 76 test backend verdi.
- Endpoint read-only di valutazione con copertura, fonti e disclaimer; nessuna generazione di scadenze finché le regole non sono validate e attive.
- Nessuna regola regionale attivata: Lombardia e Piemonte richiedono ancora verifica delle fonti primarie, revisione professionale e test di confine.
- Restano da realizzare servizio/orchestrazione, seed governato, API/UI “Stato adempimenti”, Genesis reale, Home Score v2 e navigazione semplificata.

## MVP v1 — Private alpha (priorità immediata, 2026-09-04)

Le Fasi 0-9 sotto restano la sequenza tecnica di lungo periodo — gran parte è già costruita, dalle Fasi 1-4 in poi (Memory Core, Affidabilità della memoria, Ricerca, Garanzie sono tutte chiuse). Ma **presentare tutto insieme a un utente reale renderebbe difficile capire quale problema Dimora risolve davvero**. Prima del prossimo lavoro tecnico secondo l'ordine di Fase, la priorità immediata è restringere cosa è *esposto* (non cosa è *costruito*) a una private alpha con 15-20 utenti reali, centrata sul flusso "carica un documento → conferma → ritrova" — vedi `docs/mvp-v1.md` per lo scope completo e `docs/backlog.md` B51-B59 per il lavoro tecnico derivato (tutto P0, gating per l'alpha). Nessuna funzionalità viene rimossa dal codice: viene nascosta dietro un flag di navigazione (B52) finché non è validata.

## Roadmap prioritaria v6

La sequenza di prodotto è **Memoria della casa → Fiducia → Recupero rapido → Check-up → Compliance**. Le fondazioni normative già avviate non vengono rimosse, ma il motore compliance non deve diventare l'identità principale del prodotto né anticipare i bisogni già osservati negli utenti.

### Fase 0 — Validazione continua (subito)

- Arrivare ad almeno 15–20 questionari completi, includendo proprietari, seconde case, locatori, over 60 e persone poco digitali.
- Testare il posizionamento “memoria digitale della casa” e misurare interesse, disponibilità a caricare documenti/fotografare targhette e intenzione d'uso.
- Deliverable: Executive Summary utenti, personas, top 10 bisogni e top 10 obiezioni (B46).

### Fase 1 — Fondazioni del dominio (P0)

- Completare il dominio v6 già avviato: `EvidenceStatus`, `RegulatoryTerritory`, `ThermalSystem`, `PlantBooklet`, `RegulatoryRule`, resolver territoriali e `MaintenancePlan` generalizzato (B41).
- ~~Rafforzare il Memory Core~~: B47 completato il 2026-09-03 con interventi canonici multi-Asset/multi-documento, costi, evidenza, Occurrence collegate e fondazione Warranty; la cartella clinica completa resta B50.
- Deliverable: schema dati stabile. Nessuna nuova esperienza compliance prima della stabilità di questi confini.

### Fase 2 — Affidabilità della memoria (P0)

- Applicare sistematicamente provenienza e stati `VERIFIED_PRESENT`, `DECLARED_PRESENT`, `DECLARED_ABSENT`, `UNKNOWN`, `NOT_APPLICABLE` ai dati per cui hanno significato.
- ~~Mostrare copertura informativa e qualità del record in una card "Affidabilità della memoria", senza trasformare UNKNOWN in errore o assenza reale~~: B48 completato il 2026-09-03, endpoint `memory-reliability` + card Dashboard distinta da Home Score.
- Deliverable: prima Dashboard orientata alla memoria.

### Fase 3 — Recupero rapido (P0)

- ~~Ricerca unificata per documento, Asset, tecnico, manuale, garanzia, seriale e fattura; azioni rapide per Asset; nuove regole Home Detective~~: B49 completato il 2026-09-03 — ricerca client-side (`Ctrl/Cmd+K`), azioni rapide in AssetDetail, `INTERVENTION_WITHOUT_DOCUMENT`/`INTERVENTION_WITHOUT_CONTACT`/`WARRANTY_WITHOUT_PROOF`/`CONTACT_TO_VERIFY`, più un fix di un bug reale di collisione nell'idempotenza delle Issue.
- Deliverable: trovare un'informazione utile in meno di 30 secondi.

### Fase 4 — Garanzie e storico interventi (P0)

- ~~Garanzia strutturata con acquisto, durata/scadenza, prova documentale e stato evidenza~~: B50 completato il 2026-09-03, `Warranty` è ora l'unico writer del riepilogo su Asset, sezione Garanzie nella scheda Asset, colore per tipo di intervento in Cronologia.
- Timeline dell'Asset leggibile come storia: installazione → manutenzione → guasto → riparazione → garanzia → costo (B50).
- Deliverable: ogni Asset ha una propria “cartella clinica”.

### Fase 5 — Genesis 2.0 (P1)

- Mantenere il check-up termico v6, ma offrire tre ingressi distinti: “Controlla il mio impianto”, “Organizza i miei documenti”, “Ricostruisci la storia della mia casa”.
- Primo risultato utile entro 3 minuti; catalogo mock confinato alla demo, foto targhetta reale con fallback manuale nel percorso reale (B43).

### Fase 6 — Stato adempimenti (P1)

- ~~Card "Stato adempimenti" in Dashboard~~: B44 completato il 2026-09-03, prima UI per l'endpoint `/houses/:houseId/compliance` (B41) — copertura/esiti/fonti con badge neutro, mai a soglia colorata come le altre card.
- Attivare nazionale, manutenzione, efficienza energetica, APE e F-gas.
- Primo pilota regionale solo Lombardia e Piemonte (B42), dopo governance, fonti primarie aggiornate, revisione professionale e test di confine.
- Lazio, Veneto ed Emilia-Romagna restano non attivi fino al superamento degli stessi gate.

### Fase 7 — Fiducia, privacy e portabilità (P1)

- Export della casa: documenti, Asset, interventi, contatti, garanzie e scadenze.
- Rendere visibile chi vede cosa, cosa viene inviato all'AI, come esportare e come eliminare i dati (B51).
- Deliverable: nessun lock-in percepito.

### Fase 8 — Home Score v2 (P2)

- ~~Sostituire "Efficienza" con "Affidabilità del record"~~: B44 completato il 2026-09-03 — `HOME_SCORE_VERSION` v2, la dimensione riusa `computeMemoryReliability` (B48), stessa formula della card "Affidabilità della memoria", mai una seconda definizione parallela.
- Lo score non misura conformità, rischio sanzioni o qualità tecnica.

### Fase 9 — Standby (P3)

- Non esporre finché non validati: marketplace/verifica tecnici, benchmark costi/prezzi, altre regioni e catasti, compliance avanzata, Smart Home/IoT e monitoraggio realtime.

Debito tecnico e sicurezza restano vincoli trasversali: test frontend, copertura backend, token OAuth cifrati, OAuth mobile LAN, navigazione con URL reali e multi-utente non spariscono dalla pianificazione operativa. Il dettaglio e le dipendenze sono in `backlog.md`.

## Idee di prodotto da valutare (engagement / monetizzazione)

Non ancora decise né pianificate — pensate insieme all'utente il 2026-08-03, dettaglio in `backlog.md`:

- **In standby per decisione dell'utente (2026-08-03)** — notifiche esterne (email/push) per scadenze di garanzie e manutenzioni, eventualmente con digest periodico — B18. Nessuna scelta di provider, canale o frequenza è stata ancora approvata; non implementare finché l'utente non la riattiva.
- Export "libretto casa" in PDF, utile alla vendita dell'immobile o per l'assicurazione — B23. Valore concreto e puntuale, buon primo esperimento di monetizzazione perché non richiede prima un sistema di piani/abbonamenti.
- Limite mensile di documenti analizzati dall'AI nel piano gratuito — B24. Leva freemium onesta (rispecchia il costo reale delle chiamate a Claude), ma dipende da un sistema di autenticazione/piani che oggi non esiste.

### Cosa monitorare della casa (oltre garanzie/manutenzioni)

Stessa origine (2026-08-03), dettaglio in `backlog.md`. Divise in due fasce per sforzo:

**Solo dati caricati/estratti — si innestano su quello che c'è già:**
- ~~Monitoraggio consumi elettrici~~ — completato 2026-08-04 con B25: bollette confermate, confronto YoY e installazioni mensili.
- Rilevatori di sicurezza (fumo/CO/allagamento) come Asset con piano di manutenzione batteria — B26, sforzo quasi nullo perché riusa Asset+MaintenancePlan.
- Scadenze generalizzate oltre l'Asset (polizza casa, APE, IMU/TARI) — B27, riusa il motore di promemoria già costruito.
- Valore stimato del contenuto casa dai prezzi già estratti — B28, complementare al libretto PDF (B23).
- "Punteggio salute casa" aggregato in Dashboard — B29, leva di engagement senza nuovo modello dati.

**Integrazione con dispositivi reali (IoT) — molto più ambizioso:**
- Stato reale dagli elettrodomestici smart connessi invece di calendario fisso — B30. Il più differenziante nel senso letterale di "digital twin", ma richiede integrazioni per piattaforma/marca — da valutare solo dopo le idee più semplici.

Per il dettaglio di ogni voce (dipendenze, priorità) vedi `backlog.md`. Per il ragionamento dietro le scelte già fatte vedi `decisions.md`.
