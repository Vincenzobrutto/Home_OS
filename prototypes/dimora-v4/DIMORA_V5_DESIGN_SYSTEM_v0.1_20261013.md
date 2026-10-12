# Dimora V5 — Design System e shell di navigazione v0.1
**Data:** 13 ottobre 2026 · **Stato:** proposta UX iniziale da testare, NON decisione visiva definitivamente approvata e NON codice implementato.
**Fonte funzionale:** MASTER_FUNCTIONAL_CATALOG_v0.3_20261013.md.

## 1. Principi
Una identità Dimora, tre shell: Home mobile-first, Agenzie desktop-first, Amministratori desktop-first. Comunicare fiducia tramite origine, versione, permessi e stati; non usare colori per simulare certificazioni. Semplicità di lettura Home vs densità operativa Partner.

## 2. Direzione grafica proposta
- Tono: calmo, affidabile, contemporaneo, non «startup appariscente» né gestionale legacy.
- Canvas neutro caldo (#F7F8F6); superfici bianche (#FFFFFF); testo quasi nero (#18242A); secondario (#66737A).
- Primario verde petrolio (#11665E) per azioni confermate; accento tenue (#DCECE6) in selezioni e sfondi; link di servizio e focus verificati per accessibilità.
- Ambra discreta (#996416) per azioni da rivedere, rosso (#B33A3A) per errori/pericolo effettivo, blu-grigio (#49657B) per contenuti informativi.
- Scala tipografica di sistema con titoli 28/22/18 e body 16/14 px, metadata 12 px; contrasto, responsive, zoom e target interattivi adeguati da validare con WCAG 2.2 AA.
- Layout: schede leggere, bordi sottili, spazi 8/12/16/24/32; niente «badge conformità» senza verifica formale.

## 3. Navigazione
**Home mobile:** 4 tab Casa / Attività / Documenti / Spese; ricerca globale sempre accessibile; «+» unico, Casa con Condominio progressivo. Empty state propone primo documento/casa manuale. Più case tramite switch.
**Agenzie desktop:** barra laterale Panoramica / Fascicoli / Da rivedere / Modelli e checklist / Team; contesto fascicolo con Documenti / Checklist / Dossier / Gift. Evitare duplicazione CRM.
**Amministratori desktop:** Panoramica / Edifici / Da rivedere / Pubblicazioni / Studio; contesto edificio con Impianti / Documenti / Attività / Segnalazioni / Proprietari e condivisioni. Segnalazioni non è ticketing completo.

## 4. Componenti comuni
- DocumentoCard: titolo, tipologia, fonte, versione, data, visibilità, eventuale oggetto/impianto, menu permessi.
- AssetCard: tipologia, ubicazione, stato dati, numero documenti e attenzioni; stato provvisorio visualmente distinto.
- EvidenceRow: valore, unità/semantica tecnica, estratto origine, confidenza descrittiva non equiparata a verità.
- ReviewItem: proposta, conflitto, gravità, motivazione, fonti, CTA conferma/rifiuta/correggi; azioni batch solo a basso rischio.
- PermissionPreview/PublishManifest: selezione contenuto, audience, versione, esclusioni e conferma esplicita.
- ActivityItem: fonte della data e categoria (documentata/utente/regola validata/da verificare).
- InviteState: preparato/inviato/accettato/scaduto/revocato, nessuna enumerazione account.
- IssueInfo: guasto noto pubblicato, ambito scala/impianto, aggiornamento verificabile, CTA consulta / segnala comunque.
- EconomyCard: importo documentato, periodo, tipologia comunicato/pagato, qualità dati.
- Empty/Error/Offline/NoPermission/QuotaExceeded states sempre disponibili.

## 5. Stati di affidabilità (non confondere con esiti legali)
«Da confermare» = proposta AI non approvata; «Da verificare» = fonte o dato insufficiente; «Ricevuto» = file acquisito, non validato; «Pubblicato dall'amministratore» = origine, non certificazione; «Confermato dall'utente» = dichiarazione umana, non conformità tecnica; «Scaduto» richiede data e riferimento attendibili.

## 6. Primo flusso prototipo V5
Home: step 1 casa vuota/Gift → step 2 batch import → step 3 revisione → step 4 scheda caldaia con conflitto → step 5 Condominio + guasto noto → step 6 eventuale segnalazione assistita → step 7 riepilogo.
Agenzia: fascicolo → richiesta upload → checklist C+ → dossier riservato → Gift e invito.
Amministratore: dashboard → edificio → memoria impianti → pubblicazione guasto e documento → proprietari → monitoraggio consultazioni (non riduzione contatti supposta).

## 7. Implementazione successiva (da non dare per fatta)
Tokens centralizzati CSS/React, libreria componenti condivisa, fixtures dati dimostrativi, routing navigabile, permessi simulati dichiarati e test multi-viewport. Prima verificare design visuale con l'utente. Valutare livelli accessibilità, componenti e dipendenze dello stack reale. Nessun cambio al backend o live notifications.
