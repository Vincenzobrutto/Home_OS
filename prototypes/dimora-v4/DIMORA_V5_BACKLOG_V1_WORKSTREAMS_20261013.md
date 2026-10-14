# Dimora V5 — V1: stream Home, Agenzie e Amministratori

**13 ottobre 2026.** Allegato al [backlog V5](DIMORA_V5_BACKLOG_OPERATIVO_v1.0_20261013.md). Tutte le attività dipendono dal gate R00–R06 e dalle decisioni architetturali.

## Edifici e Home (R20–R25)
- R20 (P0, dopo R04): modellare edificio, scala, unità e collegamento Home. AC: invito associato a diritti e unità.
- R21 (P0, dopo R20): separare archivio interno da contenuti pubblicati. AC: manifesto con versione, fonte e destinatari.
- R22 (P1, dopo R21): Home Condominio personale e collegata. AC: utilizzabile anche senza Partner, nessuna sovrascrittura dei dati personali.
- R23 (P0, dopo R20/R02): cambio titolarità e revoca. AC: accessi riservati precedenti rimossi secondo policy.
- R24 (P1, dopo R20/R30): import edificio e memoria tecnica. AC: impianti/documenti collegati, nessun secondo gestionale.
- R25 (P0, dopo R21–R24): test delle pubblicazioni. AC: solo destinatari autorizzati.

## Documenti e Partner Agenzie (R30–R39)
- R30 (P0, dopo R04): riuso pipeline documentale. AC: originali e fonti conservati, associazioni controllate.
- R31 (P1, dopo R30): import Home e revisione. AC: proposte AI non confermate automaticamente.
- R32 (P1, dopo R31): Free manuale e Pro entro quota. AC: downgrade senza perdita di accesso ai dati.
- R33 (P0, dopo R04): pratica e permessi agenzia. AC: separazione delle pratiche.
- R34 (P0, dopo R30/R33): upload da link limitato. AC: ricevuto nel fascicolo, non nel dossier acquirente.
- R35 (P1, dopo R34): checklist C+ e suggerimenti template. AC: approvazione agente, nessun apprendimento cross-agenzia.
- R36 (P0, dopo R34/R01): dossier anteprima e riservato. AC: accesso solo ai destinatari abilitati.
- R37 (P0, dopo R36/R20): Home Gift selettiva. AC: manifesto documenti e memoria, privati esclusi.
- R38 (P0, dopo R37/R05): invito neutro, accettazione e scadenza. AC: non rivelare esistenza account.
- R39 (P0, dopo R30–R38): test di dossier, Gift, revoca e conflitti. AC: nessun trasferimento implicito.

## Qualità, notifiche ed economia (R40–R48)
- R40 (P1, dopo R17): notifiche in-app. AC: pubblicazione distinta da lettura e consegna.
- R41 (P1, dopo R38/R40): email su canali verificati. AC: consegna ed errori tracciati.
- R42 (P2, dopo R40): push, solo se fattibile. AC: consenso e contenuti minimizzati.
- R43 (P1, dopo R30/R40): misurare costi AI, storage e supporto. AC: prezzi/quote basati su dati.
- R44 (P1, dopo R43): pricing Agenzie ibrido e opzioni Admin. AC: prezzi Admin non dati per deliberati.
- R45 (P1, dopo R18/R43): KPI segnalazioni e carico studio. AC: nessun risparmio attribuito senza baseline.
- R46 (P0, dopo R19/R25/R39): test e review privacy/security. AC: problemi critici chiusi.
- R47 (P1, dopo R46): beta privata con tre target. AC: feedback e tempi osservati.
- R48 (P0, dopo R43/R46/R47): decisione go/no-go. AC: sicurezza, qualità, legal, costi e supporto valutati.

**Non incluso V1:** ticketing fornitori, SLA, ordini, contabilità, CRM completo, sensori live, valore immobile/perizia, economia avanzata C, apprendimento cross-agenzia e connettori non verificati.
