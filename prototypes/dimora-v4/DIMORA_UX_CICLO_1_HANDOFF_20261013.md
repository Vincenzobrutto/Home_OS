# Dimora — Handoff UX ciclo 1 (Home, Agenzie, Amministratori)
Data: 13 ottobre 2026. Stato: chiusura **prima raccolta decisioni UX**, non validazione con utenti o sviluppo.

## Documenti di riferimento
1. DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md — precedenza sulle specifiche storiche.
2. DIMORA_HOME_IMPORT_REVIEW_UX_v0.1_20261013.md — ingestione, deduplica, proposte asset, conflitti, caldaia, esito.
3. DIMORA_PARTNER_AGENZIE_UX_v0.1_20261013.md — checklist C+, raccolta, dossier, email e Gift.
4. DIMORA_PARTNER_AMMINISTRATORI_UX_v0.1_20261013.md — dashboard, memoria tecnica, pubblicazioni, collegamento e integrazioni.

## Journey end-to-end da produrre come prototipo (D06/D08)
- Home: document-first/Gift → import e proposta → «Da rivedere» → asset/scadenze → ricerca/condivisione/Spese e downgrade Free/Pro.
- Agenzia: incarico preliminare → fascicolo → checklist dinamica e collaborazione → dossier con accesso controllato → manifesto e Home Gift con invito email.
- Amministratore: edificio minimal → import/inventario → «Da rivedere» → memoria tecnica → pubblicazione versionata → collegamento e cambio titolarità unità → lettura Home.

## Due livelli di fedeltà funzionale
Livello 1: tre journey comprensibili, navigabili, con errore, incompleto, revisione, permesso negato, invito scaduto e successo. Livello 2: simulazioni ben etichettate di feature prospettiche (planimetria interattiva, previsioni C, AVM ecc.). Le demo non devono fingere enforcement backend.

## Conflitti storici da correggere prima di delivery
Vecchia tab «Scadenze» sostituita da «Attività», Inbox «In sospeso» da «Da rivedere», packaging Home Free/Pro senza crediti/Event Pass V1, Agenzie pricing ibrido, notifiche esterne target approvato ma da pianificare tecnicamente. Nel Master storico esiste link di prevalenza; produrre Master v0.3 testuale integrale prima di formalizzare release requirements.

## Ambiti ancora NON approvati
Numeri di prezzo/storage/AI, costo pipeline email e inviti/push, obblighi territoriali, affidabilità automatica delle checklist, trattamento documenti nel cambio proprietario, benchmark efficienza, clienti paganti e risultati misurati, specifiche CRM/gestionali e rilascio integrazioni. Nessun codice/ADR/backlog cambiato con questo documento.
