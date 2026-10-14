> **Aggiornamento decisionale (13 ottobre 2026).** Le decisioni approvate dopo la review UX/AI sono consolidate in [DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md](DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md). In caso di conflitto (D01–D10, tre esperienze parallele, bottom navigation, Inbox «Da rivedere», notifiche, Free/Pro senza crediti ed Event Pass V1, pricing Agenzie, economia B/C, planimetria, acquisizione email Pro), **prevale il consolidato**. Questo file resta riferimento storico e di dettaglio per quanto non modificato. Non implica modifica di codice, ADR o backlog.

# Dimora Home — Consolidamento UX/UI v0.1
Data: 12 ottobre 2026
Stato: decisioni di concept confermate in intervista; non autorizza sviluppo né riapertura backlog.
Branch di lavoro: prototype/dimora-partner-home-v4.

## 1. Nord stella e navigazione
- Dimora è memoria digitale della casa; non software per cantieri, property management professionale o contabilità condominiale.
- Casa al centro, scadenze importanti subito dopo, poi completamento, attività recenti e spese; moduli secondari progressivi e leggermente personalizzabili.
- Mobile: quattro sezioni principali Casa, Scadenze, Documenti, Spese; AI accessibile nel contesto e tramite pulsante quando il piano lo consente; menu secondario per storico, condividi, esporta, impostazioni.
- Desktop: menu laterale e pannelli affiancati per dettaglio/anteprima documento e revisione.
- 1 immobile: ingresso diretto nella casa; più immobili: panoramica patrimoniale e accesso alle singole case.
- Ricerca Free per parole chiave, filtri e categorie, risultati rilevanti prima e categorie dopo; interrogazione naturale AI soltanto Pro.

## 2. Visualizzazione casa
- Navigazione primaria per ambienti; sezioni trasversali documenti, scadenze, spese, storia.
- Ogni ambiente ha scheda completa: foto facoltativa, asset, documenti, interventi; illustrato per default, sostituito da foto utente.
- Ambienti predefiniti personalizzabili; elementi privi di stanza restano «Da collocare», impianti multiambiente collegabili a più stanze.
- Planimetria opzionale caricata come documento; attivazione successiva modalità interattiva assistita: prima clic sugli ambienti, poi eventuali marcatori di asset; mai obbligo 3D.
- Pertinenze separate concettualmente dalle stanze, ma navigabili dalla stessa proprietà; parti comuni condominiali progressive, senza carico di censimento sul proprietario.
- Scheda asset: sintesi nome/immagine/modello, posizione, prossima attenzione; approfondimenti per documenti, tecnico, manutenzioni e costi.
- Asset dismessi/sostituiti conservati nello storico con legame al successore; cancellazione definitiva distinta, con conferma.

## 3. Acquisizione e revisione
- Asset tramite targhetta fotografata, fattura/manuale o manuale; AI propone, proprietario conferma. Ricerca online del manuale solo su comando, preferenza fonti ufficiali, corrispondenza modello da confermare.
- Import massivo: analisi in background, riepilogo proposte per tipi (asset, interventi, anomalie), poi gruppi per oggetto; revisione differibile.
- Dati non confermati separati dai definitivi; area unificata «In sospeso» con filtri Bozze, Da verificare, Discrepanze; badge contestuali, prioritizzazione e operazioni rapide.
- Su telefono anteprima dati e passaggio rapido alla fonte; desktop fonte e form affiancati.
- Auto-salvataggio bozze, conferma finale; documento originale conservato anche quando AI fallisce. Errori imputabili al sistema non consumano dotazione AI.
- Acquisizione mobile di pagine, ritaglio/rotazione, multipagina PDF, analisi AI solo dopo azione esplicita.
- Controllo deduplica file tecnicamente identici senza AI, supporto per simili/versioni senza sovrascrittura. Uno stesso documento può linkare più asset; ripartizione economica facoltativa; costo registrato una sola volta.
- Provenienza, versioni, modifica umana tracciata per dati importanti; correzione umana non sovrascritta dall'AI. Incongruenze tra fonti conservate e spiegate.
- Archivio ibrido: categorie automatiche, ricerca/filtri, navigazione contestuale senza duplicare file; checklist mancanze distingue non caricato/da verificare/da recuperare/facoltativo.
- Indicatore esplicativo di completezza delle informazioni, non conformità della casa; suggerimenti contestuali e azioni Ignora/Rimanda/Lo farò.

## 4. Scadenze, manutenzioni e storia
- Scadenziario unico con vista primaria per priorità e calendario alternativo, filtri private/condominiali/pagamenti, responsabilità e provenienza.
- Distinzione netta: scadenza determinata, da verificare, manutenzione consigliata, promemoria utente; regole normative verificate e fonti consultabili con «Perché questa scadenza?».
- Completamento rapido, con documento facoltativo; dichiarazione dell'utente NON equivale a prova normativa.
- Ricorrenze suggerite da fonti/storico, attivate con conferma; dopo completamento automatismi semplici per promemoria privati, calcolo controllato per obblighi.
- Rinviare una notifica non altera la data legale; contestazione aggiorna input e ricalcola solo se regole e dati sufficienti.
- Timeline generale casa e cronologie degli asset; interventi possono partire da documento o ingresso manuale; archivio storico selettivo delle modifiche.
- Ristrutturazioni come progetti che raggruppano lavori/documenti/costi/ambienti, NON gestione cantiere. Scheda progetto riassuntiva, timeline e fotografie prima/dopo; economia «B+»: preventivo, consuntivo, allegati, non fornitori/SAL/pagamenti complessi.
- Problema asset: accesso rapido a garanzia, fattura, manuale, contatti e storico, non diagnosi/dispatch/marketplace.
- Garanzie: vista aggregata, distinguere legale/commerciale/estesa; date da verificare. Inventario assicurativo documentato e fascicolo esportabile; nessuna garanzia di copertura.

## 5. Economia, locazione, condominio
- Dashboard costi sintetica + dettagli, con costi documentati/manuali/stime distinti; bollette e ricorrenti manuali o estratti da documenti, integrazioni generiche esterne solo possibili in futuro e senza dipendenza.
- Previsioni a 12 mesi e pianificazione 5 anni; risparmio/efficientamento proposti sinteticamente e simulati su richiesta, assunzioni esplicite.
- Valore immobile stimato in area patrimoniale, approfondimenti a richiesta, NON perizia. Impatto ristrutturazioni sul valore «C condizionata»: se non attendibile usare solo B (CAPEX storico).
- Energia: **SOLO bollette** e dati periodici, niente contatori, hardware o monitoraggio live nel perimetro corrente. Consumi vs prezzo separati; periodi mancanti evidenziati e proiezione solo su richiesta.
- Mutui/polizze: schede riservate + spese ricorrenti; capitale residuo non spesa.
- Locatore: modalità facoltativa, canoni/documenti/deposito/interventi, nessun portale inquilino richiesto. Ripartizione oneri B (registro responsabilità), C interpretativo solo potenziale Pro.
- Condominio: area propria e collegamenti trasversali; dati amministratore autorizzati, fonti/versioni storicizzate, riservatezza e condizioni di conservazione. Spese condominiali: preventivo/consuntivo/riparti e scadenze, ricevute proprietario distinte da incasso confermato amministratore. Nessuna seconda contabilità.

## 6. Onboarding, condivisione e ciclo di vita
- Onboarding autonomo rapido: indirizzo obbligatorio, tipologia, ingresso subito e scelta iniziale ambienti/documenti/asset. Onboarding da intermediario: fascicolo già predisposto e consenso import selettivo, etichette fonti e verifiche differite.
- Gift Home Free permanente; benvenuto enfatizza patrimonio documentale ricevuto, non up-sell. Agenzia resta contatto informativo senza accesso automatico perpetuo.
- Familiari: ruoli e permessi personalizzabili, documenti finanziari riservati per default; inviti via email o link breve a uso singolo con autenticazione, attività rilevanti tracciate; conflitti di modifiche contemporanee con avviso, no collaborazione realtime evoluta.
- Documento singolo o fascicolo selezionato: esportazione PDF + ZIP oppure link temporaneo con revoca e scadenza; revoke non annulla copie già scaricate. Contributi diretti di tecnici solo futuro, non rilascio iniziale.
- Vendita: copia selettiva per acquirente, niente trasferimento account, esclusione dati personali per default; archiviazione guidata immobile venduto e conservazione storico legittimo.
- Cestino temporaneo con recupero dei collegamenti, quote storage trasparenti, formati base comuni iniziali, formati specialistici e video eventuali Pro/futuro.
- Accesso flessibile password/passwordless e biometria device, autenticazione forte per azioni sensibili; consultazione offline limitata in prima versione, modifica offline futura.

## 7. Free vs Pro / sostenibilità
- Free è memoria indipendente e utilizzabile per sempre: gestione manuale, consultazione, ricerca classica, aggiornamenti, esportazione, scadenze e riepiloghi deterministici.
- Free: dotazione AI **una tantum in onboarding**, tetto economico rigoroso; non assumere AI gratis continuativa. Il fascicolo già preparato da un Partner non richiede rielaborazione a carico Home.
- Pro: assistente conversazionale, ulteriori estrazioni, analisi/simulazioni approfondite e capacità aggiuntive; non bloccare dati già creati quando downgrade.
- Upgrade contestuale al bisogno o esaurimento dotazione; anteprima statica dei benefici, percorso Free manuale sempre disponibile. No paywall durante onboarding.
- Rinnovo manuale o automatico con consenso e condizioni trasparenti; downgrade senza perdita di risultati e informazioni strutturate Pro.
- Valore abbonamento rendicontato con attività misurate, non risparmi/tempo inventati. Riepilogo mensile Free regole/Pro analisi facoltative.
- Notifiche interne/email/push configurabili come direzione UX, canali al lancio dipendono da costi/fattibilità; avvisi urgenti individuali, ordinari in digest, senza generazione AI per ogni evento.

## 8. Questioni da validare e possibili conflitti
1. «AI propone, utente conferma» vs estrazione iniziale Free limitata: verificare che onboarding Free sia davvero utile anche senza AI e partner.
2. Alcune scelte sono UX target, non MVP: planimetria interattiva, fascicoli linkati, offline consultivo, calendario, moduli energetici e accesso biometrico richiedono valutazione tecnico-economica.
3. Visibilità AI contestuale/promessa assistente sempre presente deve essere **feature-gated**: non mostrare chat attiva nella Free senza Pro.
4. Proposte normative e valutazione mercato dipendono da fonti/regole affidabili, nessun claim di conformità o perizia.
5. Rinnovo manuale vs automatico da conciliare con PSP/store/legge; non introdurre promesse commerciali premature.
6. Quote AI/storages, prezzi e formati non quantificati: serve unit economics di prima coorte e stress test.
7. La coppia «In sospeso» e «Da valutare» va distinta nettamente: dati da confermare vs suggerimenti facoltativi.
8. Prototipo a tre viaggi esistenti in repo: Home, Partner Agenzie, Partner Amministratori; questa specifica riguarda SOLO Home.
9. Rischio sovraccarico feature: mantenere 4 tab + flussi «+» e nascondere moduli senza dati.
10. Per evitare costi, ricerca online manuali su richiesta; nessuna elaborazione silenziosa permanente.

## 9. Wireframe da produrre e testare
W1 mobile Home casa nuova vuota (indirizzo, tre azioni iniziali).
W2 mobile Home popolata con ambienti/illustrazioni, scadenze, moduli progressivi.
W3 ambiente + scheda asset, aggiunta da targhetta/fattura/manuale.
W4 import massivo: stato in background, riepilogo, In sospeso, revisione fonte/dati.
W5 archivio documenti + ricerca + condividi/esporta.
W6 scadenziario priorità/calendario, spiegazione fonte, completamento.
W7 spese e consumi, grafici bollette, documentato vs stimato.
W8 Gift da agenzia / consegna a nuovo proprietario.
W9 Home Free vs Pro: dotazione iniziale, anteprima statica upgrade e downgrade.
W10 desktop revisione documenti affiancata.
Tutti i wireframe: schermate illustrative, non dichiarare funzionalità implementate; usare dati fittizi, permessi e stati evidenti.
