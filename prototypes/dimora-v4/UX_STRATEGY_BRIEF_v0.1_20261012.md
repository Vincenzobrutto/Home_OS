> **Aggiornamento decisionale (13 ottobre 2026).** Le decisioni approvate dopo la review UX/AI sono consolidate in [DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md](DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md). In caso di conflitto (D01–D10, tre esperienze parallele, bottom navigation, Inbox «Da rivedere», notifiche, Free/Pro senza crediti ed Event Pass V1, pricing Agenzie, economia B/C, planimetria, acquisizione email Pro), **prevale il consolidato**. Questo file resta riferimento storico e di dettaglio per quanto non modificato. Non implica modifica di codice, ADR o backlog.

# Dimora — UX/UI Discovery Brief v0.1
**Data:** 12 ottobre 2026. **Stato:** avvio UX Strategy, nessuna soluzione grafica approvata.
**Input:** MASTER_FUNCTIONAL_CATALOG_v0.2_20261012.md; PROTOTYPE_EXPERIENCE_SELECTION_v0.1_20261012.md; Home scope e Amministratori questionnaire. La V4 è una demo funzionale, non design vincolante.

## Obiettivo
Progettare un ecosistema comprensibile con tre esperienze: Home (memoria personale dell'abitazione), Partner Agenzie (fascicolo dall'incarico alla consegna Home), Partner Amministratori (documenti disordinati → memoria tecnica e scadenze → diffusione selettiva in Home).

## Vincoli
- AI propone e indica fonte; utente conferma e corregge. Evitare interfaccia basata obbligatoriamente sulla chat.
- Onboarding progressivo, caricamento massivo e contributi tramite link senza account obbligatorio.
- Separare casa/unità, pratica immobiliare, edificio e studio/agenzia. Permessi prima delle viste.
- Home Free permanente: consultazione, aggiornamento ed esportazione non bloccati da Pro.
- Conservare la distinzione fra «documentato», «dichiarato», «stimato» e «da verificare».
- Nessuna visualizzazione deve suggerire certificazione urbanistica, tecnica o normativa da parte dell'AI.
- Manutenzioni e scadenze con fonti; segnali proattivi non invadenti.
- Canali Partner con co-branding controllato e Home indipendente.
- Non progettare come MVP tecnico tutto ciò che è nel catalogo completo.

## I tre user journey di riferimento
1. **Home:** ricezione fascicolo Gift o import batch → estrazione proposte → conferma → asset/documenti/interventi/scadenze → domanda con fonte → proposta contestuale.
2. **Agenzia:** acquisizione incarico → creazione scheda → raccolta con link / tradizionale → completezza e coerenza → dossier acquirente ad accessi progressivi → selezione copia Home Free e invito.
3. **Amministratore:** archivio batch (A) → inventario tecnico e suggerimenti manutentivi (B) → selezione e diffusione a Home (C), senza doppio gestionale.

## Alternative architettura informativa da confrontare
- **Ipotesi 1: immobile/edificio al centro.** Utente seleziona un bene e naviga documenti, impianti, interventi, scadenze, spese, attività. Il Partner gestisce un portafoglio di pratiche/edifici. Pro: modello chiaro; contro: azioni urgenti trasversali meno visibili.
- **Ipotesi 2: attività e situazioni al centro.** Dashboard «cosa devo fare / cosa è cambiato / cosa trovo», con dettagli che si aprono sul contesto immobile. Pro: orientamento all'azione; contro: complessità e rischio di dashboard rumorosa.
- **Soluzioni ibride ammesse**, ma motivare compromessi e carico cognitivo; nessuna architettura è già approvata.

## Output richiesti nella prima review UX, prima della UI
1. Due mappe di navigazione alternative, separate per Home, Agenzia e Amministratore.
2. Tre customer journeys end-to-end con stati ingresso, errore, incompletezza, revisione AI, successo e privacy.
3. Wireframe low-fi delle sole tappe decisive (non tutte le feature).
4. Decision matrix con vantaggi/svantaggi, frizioni, comprensibilità per target non tecnico.
5. Test script di 5 attività per owner e 5 per ciascun partner; osservare successo e tempo, non gradimento generico.
6. Piano del secondo round: scelta direzione, linguaggio visivo, componenti, high fidelity e successivo update del prototipo.

## Questioni aperte da risolvere con il committente
- Home: qual è l'ingresso mentale primario, «casa» oppure «cosa fare»?
- In Partner: quanto emergono pratiche/portafoglio vs edificio/immobile?
- Layout prioritario mobile per Home e desktop/tablet per Partner (ipotesi da verificare).
- Evidenza pratica del Free vs Pro senza vincolare accesso a dati personali.
- Informazioni cross-condominio per proprietari multiimmobile, stati del consenso e dei collegamenti.
- Le funzionalità secondarie (forecast, polizze, AVM, moduli premium) sono esempi, non tutti i journey da implementare.

**Nessuna modifica di backlog, codice, ADR, permessi, UI esistente.**
