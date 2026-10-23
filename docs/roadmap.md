**Seguito R04:** [conferma transazionale separata per fasi](v5/fase0-confirmation-orchestration-refactor-20261023.md), stessa transazione/ordine/errori; 495/495 HTTP/DB sintetici.

## 23 ottobre 2026 — R03, secondo lotto di manutenzione editor

Proiezione pura di spese e checklist con focus separate dal componente che gestisce stato/query/conferme. [Equivalenza, regressioni e limiti](v5/fase0-editor-review-refactor-20261023.md). R03 non chiuso integralmente; ripristino/serializzazione di DraftEditor ora estratti nel [lotto successivo](v5/fase0-editor-compilation-refactor-20261023.md). R04 ora parzialmente implementato: [validatore per campo estratto](v5/fase0-backend-field-validation-refactor-20261023.md), contratti e diagnostica preservati e verificati offline; ora separati anche [quantità, prezzo e totale documento](v5/fase0-backend-purchase-validation-refactor-20261023.md), con equivalenza su 20.672 casi e 495/495 HTTP/DB sul cluster nuovo. R07 ora [completato nel perimetro dei test backend](v5/fase0-offline-test-harness-20261023.md): ingresso unico protetto e verifica completa su cluster nuovo. Restano altre validazioni, conferma transazionale e altri lotti del piano. Nessuna modifica funzionale, nuove capacità AI, accesso al DB o deploy implicito.

## 23 ottobre 2026 — Manutenzione V5 dopo audit tecnico

[Audit e piano dei lotti](v5/fase0-code-audit-refactor-20261023.md): primo lotto con dipendenze workspace in una direzione e riga spesa separata dai form; entry JS ridotta del 5,60%, non misurata latenza utente. Seguito prioritario: estrazioni pure dagli editor, validazioni/backend mantenendo transazione e controlli, ingresso test DB offline uniforme; conteggio query prima di eventuali letture batch. Ritiri di componenti, prompt/client e archivio documentazione restano proposte. Nessuna riscrittura generale, nuovo gate AI o deploy implicito.

## Fase 0 — generalità delle regole prima di nuove misure AI, 23 ottobre 2026

Regole di acquisto riviste per ruoli semantici, varianti e colonne riordinate, mantenendo controlli su attribuzione e fonti. [Report](v5/fase0-general-rules-offline-20261023.md). Test di contratto e DB isolato non dimostrano accuratezza su tutti i documenti; futuro confronto sui reali richiede perimetro e consenso distinti. Nessuna nuova campagna o deploy implicito.

## Fase 0 — ordini reali, correzioni offline del 23 ottobre 2026

Implementata distinzione data ordine/acquisto/consegna e spedizione/prezzo/totale, con revisione economica esplicita. [Report](v5/fase0-orders-offline-20261023.md). La lettura automatica delle due scansioni non è verificata: il worker locale non trova testo. Nessuna campagna o promozione del gate AI; pagamento e anno di consegna restano da confermare dove non documentati.

## Fase 0 — attuazione offline del piano completata, 23 ottobre 2026

UI delle fatture incomplete, regressioni di titoli/date e suggerimenti locali per 91 apparati/ambienti attuati e collaudati offline. [Report e limiti](v5/fase0-night-plan-offline-20261023.md). La [matrice dei 147 documenti](v5/fase0-document-family-matrix-v4-20261023.json) resta proposta; nessuna nuova famiglia o backfill. Gate AI storico non superato e nessuna campagna avviata; [protocollo candidato](v5/fase0-next-measure-proposal-20261023.md) da autorizzare separatamente.

## Fase 0 qualità AI — campagna v24 conclusa, gate non superato, 23 ottobre 2026

Nuova misura autorizzata v24 sui 52 sintetici: 148 Messages, 3,562652 USD, zero incerti/retry. Output validi 101/104, etichette 16/16, importi 64/70. **Gate non superato**: Q15 split payment, Q22 prezzi/date di riga e Q48 copertura per pagina corretti e verificati offline, con privacy/idempotenza su DB isolato. [Copertura Q48 e limiti](v5/fase0-q48-coverage-offline-20261023.md). [Correzione Q22 e limiti](v5/fase0-q22-lines-offline-20261023.md). Prima del pilota restano verifica AI della copertura Q48, UI dei pendenti, Q20/date, stabilità e rifiuti del titolo; gold/validazioni e risultati storici invariati. [Correzione Q15 e limiti](v5/fase0-q15-payment-offline-20261023.md). Supporto Q48 del decoder verificato offline non equivale a estrazione AI completa: il live resta 1/2 per campo. Nessuna modalità di lettura promossa; progressivo lungo più costoso. Nuova campagna e reali richiedono autorizzazioni distinte. [Esiti e confronto v22/v24](v5/fase0-quality-v24-campaign-20261023.md).

## Archivio unico Documenti completato — 21 ottobre 2026

Dieci famiglie e descrizioni su richiesta, ricerca globale, filtro Collegamento e cambio famiglia separato dal tipo. [Piano v4 e attuazione](v5/fase0-next-hours-plan-20261023.md): matrice documentale proposta e suggerimenti locali per apparati/ambienti, con scelta esplicita. Nessun import di inventari, checklist normativa o nuova AI. [Regole e verifiche](v5/document-unified-archive-20261021.md).

## Documenti: famiglia manuale completata — 21 ottobre 2026

Cambia famiglia direttamente dalle righe della casa, senza compilazione o cambio del tipo. Conteggi e filtri server coerenti; nessuna riclassificazione automatica dei dati esistenti. [Regole e verifiche](v5/document-house-family-20261021.md).

## Documenti della casa da scheda oggetto completato — 21 ottobre 2026

Spostamento nella casa con archivio della sola scheda scelta; documenti condivisi e relativi collegamenti sugli altri oggetti preservati. Viste sovrapposte con un unico archivio. Restano separati riferimenti nativi a caldaie e fusione delle schede. [Regole e verifiche](v5/house-documents-from-object-20261021.md).

## Documenti: originale, classificazioni ed esempi completati — 21 ottobre 2026

Completati gli interventi richiesti sulla consultazione, sui duplicati e sulla distinzione degli stati; correzione esplicita facilitata e PDF sintetici riservati alle modalità di prova. Resta separato il focus durante l’apertura dei gruppi. [Regole e verifiche](v5/document-original-classification-20261021.md).

## Documenti: contesto di ricerca completato — 21 ottobre 2026

Completati ripristino della vista/gruppo/posizione alla cancellazione e rimandi ai risultati delle altre viste. Consultazione originale/dettaglio e gestione degli esempi ora completate; resta il focus dei gruppi. Classificazioni personali da correggere solo con scelta esplicita. [Regole e verifiche](v5/document-search-context-20261021.md).

## Documenti: secondo intervento dell’audit completato — 21 ottobre 2026

Completati riferimenti oggetto nelle righe e riconoscibilità delle fatture dai dati salvati. Contesto di ricerca ora completato; restano accessibilità e classificazioni mancanti; nessuna modifica automatica dei dati. [Verifiche](v5/document-row-context-20261021.md).

## Documenti: primo intervento dell’audit completato — 21 ottobre 2026

Completati ingresso sull’archivio, stato nei Filtri, compattezza mobile e ricerca sticky. I riferimenti oggetto nelle righe sono ora completati; il contesto di ricerca è ora completato, restano rilievi di accessibilità. Nessuna riclassificazione automatica. [Ambito e verifiche](v5/document-archive-entry-20261021.md).

## Documenti: viste dell’archivio completate — 21 ottobre 2026

Concluse le tre viste e i gruppi della casa, mantenendo archivio unico e catalogo Oggetti invariato. Nessuna riclassificazione automatica dei file ancora da organizzare. [Regole e verifiche](v5/document-views-20261021.md).

## AI: prova sulla stessa campagna — 21 ottobre 2026

Abilitazione di case aggiuntive esplicite dello stesso account, senza duplicare il credito. Prova live dei cinque documenti lasciata al committente; nessuna analisi automatica. [Regole](v5/shared-ai-campaign-20261021.md).

## Documenti: priorità 1, 2 e 4 concluse — 21 ottobre 2026

Collegamento diretto del documento, titoli/categoria proposti con criteri conservativi, ordine e avanzamento della coda e rotazione di anteprima implementati e collaudati. Restano il riconoscimento tecnico da approfondire offline e le proposte coordinate nello stesso lotto. [Esiti e limiti](v5/document-flow-simplification-20261021.md).

## Fatture: collaudo del modulo unico completato — 21 ottobre 2026

Concluso il caso da casa vuota con cinque originali, un impianto e due spese senza doppioni. Riferimento precompilato modificabile e consultazione dei documenti tramite i costi. Restano miglioramenti mirati su titoli/categorie estratti e fallback dei documenti tecnici, da valutare senza nuovi invii AI impliciti. [Esiti e limiti](v5/invoice-single-flow-20261021.md).

## Fatture: impianto, acconto e saldo — 21 ottobre 2026

Completati collegamento esplicito, acconto/saldo e [proposte di riuso degli oggetti esistenti](v5/object-suggestions-20261021.md), senza nuove schede alla loro accettazione e con deduplica dei costi. [Correzione iniziale](v5/expense-installments-object-20261021.md). Caso di acconto e saldo verificato nel [collaudo del modulo unico](v5/invoice-single-flow-20261021.md). Nessuna associazione per solo fornitore o in presenza di dati insufficienti.

## Dettaglio Ambiente compatto — 21 ottobre 2026

Completata la proposta approvata: testata e schede coerenti con Oggetti, azioni e dati secondari riordinati senza perdere funzionalità. [Verifiche e limiti](v5/room-detail-20261021.md). Dati reali intatti.

## Ambienti a schede — 21 ottobre 2026

Completata la proposta approvata desktop/mobile: schede come Oggetti, ricerca, filtri e funzionalità esistenti conservate. [Verifiche e limiti](v5/room-cards-20261021.md). Nessuna modifica ai dati reali.

## Rubrica: ricerca durante lo scorrimento — 21 ottobre 2026

Completata la sola priorità scelta: ricerca e filtro sempre raggiungibili su desktop/mobile. [Verifiche](v5/contact-search-sticky-20261021.md). Conteggi, ordinamento e omonimi rinviati per scelta dell’utente.

## Attività: ricerca e compattezza; paginazione stabile — 21 ottobre 2026

Ricerca per titolo su tutte le pagine, Mostra/Scadenza compatti e righe sintetiche. Mostra altri conserva il punto di lettura in Attività e Rubrica, con focus sul primo risultato aggiunto. [Comportamento, verifiche e limiti](v5/activities-search-pagination-20261021.md). 37 test frontend e 6 backend offline, build/lint e browser desktop/mobile con 80 attività e 100 contatti fittizi; dati reali intatti.

## Filtri stanza compatti — 21 ottobre 2026

Oggetti: selettore Stanza sempre visibile, prima le stanze con oggetti, conteggi server e accesso a tutte le altre. Ambienti: elenco compatto con lo stesso ordine e conteggi personali. Ricerca e ritorno conservati. [Comportamento, verifiche e limiti](v5/room-filters-compact-20261021.md). 24 test mirati, build/lint e browser desktop/mobile; dati reali intatti.

## Elenco Documenti compatto — 21 ottobre 2026

Titolo/tipo/visibilità, stato e azione principale in evidenza; metadati nei dettagli richiudibili e originale nel menu secondario. Ricerca, filtri, selezioni e ritorno conservati, inclusi i dettagli già aperti. [Comportamento, verifiche e attività residue](v5/document-list-compact-20261021.md). 72 test mirati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Documento–spesa: ritorno e azioni esplicite — 21 ottobre 2026

Ritorno al documento di provenienza, “Registra un’altra spesa” distinto dalla consultazione e data della proposta etichettata Emissione. Annullamento della spesa aggiuntiva torna al documento; provenienza preservata anche dopo il salvataggio esplicito. [Comportamento, verifiche e attività residue](v5/document-expense-navigation-20261021.md). 86 test simulati, build/lint e browser desktop/mobile; dati reali intatti.

## Dettagli spese e bollette: riepilogo iniziale — 21 ottobre 2026

Completata la priorità concordata: importo, fornitore e periodo insieme in testa alla spesa; emissione e scadenza distinte. Stesso riepilogo nei documenti collegati, con dati mancanti espliciti e nessuna duplicazione dei record. [Comportamento e verifiche](v5/expense-detail-overview-20261021.md). 75 test simulati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Riepilogo, filtri Spese e dettaglio oggetto — 21 ottobre 2026

Riepilogo dei valori da salvare con periodo/emissione/scadenza distinti; filtri Spese unificati e richiudibili con indicatori rimovibili; collocazione oggetto evidente e dati secondari richiudibili. Campi della spesa conservati al cambio solo-documento. [Comportamento, verifiche e limiti](v5/ux-summary-filters-object-20261021.md). 131 test simulati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Recupero bozze e collegamento Ambienti — 21 ottobre 2026

Avviso e Riprova salvataggio nella barra sempre visibile, focus sull’errore e recupero idempotente preservato. Gestisci ambienti non si sposta al focus e apre al primo clic. [Comportamento e verifiche](v5/ux-recovery-fixes-20261021.md). Frontend soltanto; dati reali intatti.

## Documenti: Salva bozza ed esci — 21 ottobre 2026

Bozza esplicita anche incompleta, ripresa dalla stessa scheda, nessuna spesa/oggetto/contatto creato e nessun invio AI. Errori e risposte perse conservano il modulo; altre uscite mantengono l’avviso. [Comportamento, verifiche e limiti](v5/compilation-draft-20261021.md). Sostituisce il rinvio delle bozze nei resoconti precedenti; nessun autosalvataggio.

## Rubrica: archiviazione e collegamenti distinti — 21 ottobre 2026

Nel dettaglio, spiegazioni separate per Archivia contatto e Rimuovi collegamento, con indicazione dei dati conservati e messaggio dopo l’esito riuscito. Azioni dirette, elenco e ritorno invariati. [Comportamento e verifiche](v5/contact-actions-20261021.md). Collaudo su contatti fittizi; dati reali intatti. Bozze rimandate.

## Testi tecnici più semplici — 21 ottobre 2026

Documenti ricevuti sostituisce Consegne ricevute; dimensioni in KB/MB con conversione decimale e limiti approssimati leggibili, controlli esatti in byte invariati. [Comportamento e verifiche](v5/plain-language-20261021.md). Nessuna modifica ai dati reali; bozze rimandate.

## Ricerca Documenti unificata — 21 ottobre 2026

Ricerca automatica nell’intero archivio della casa, stato unico Tutti/Da fare/Completati, filtri in pannello desktop/mobile e indicatori rimovibili. Nuova ricerca senza restrizioni nascoste; testo, filtri, pagine, focus e posizione conservati dal dettaglio. [Comportamento, verifiche e limiti](v5/document-search-unified-20261021.md). Dati reali intatti; bozze rinviate.

## Rubrica compatta e ritorno all’elenco — 21 ottobre 2026

Elenco desktop/mobile approvato, ricerca durante la digitazione, azioni Chiama/Email e pagine aggiunte. Ricerca, filtro, pagine, focus e posizione preservati dal dettaglio e con Indietro. [Comportamento, verifiche e limiti](v5/contacts-catalog-20261021.md). Dati reali intatti; bozze rinviate.

## Analisi AI riuscite: nessuna rianalisi — 21 ottobre 2026

Risultati estratti riutilizzati anche prima della conferma; esclusione dalla selezione multipla e blocco server dei nuovi invii sullo stesso snapshot. Correzione manuale e recupero idempotente preservati. [Regola e verifiche](v5/ai-success-reuse-20261021.md). Nessuna modifica ai dati reali; bozze rinviate.

## Accesso diretto a Oggetti e Ambienti — 21 ottobre 2026

Menu laterale desktop con sette sezioni; Menu mobile completo con barra inferiore a cinque voci preservata. Sezione attiva precisa, focus e chiusura gestiti, ritorno Rubrica mantenuto. [Comportamento e verifiche](v5/section-navigation-20261021.md). Nessuna modifica dei dati reali.

## Casa e Documenti: testi chiari e primo utilizzo — 20 ottobre 2026

Documenti da controllare e Dati da confermare distinguono le due code; casa senza documenti con invito iniziale, casa completata con messaggio distinto. Versioni e impronta nei dettagli tecnici richiudibili. [Comportamento e verifiche](v5/casa-document-copy-20261020.md). Bozze escluse dall’intervento.

## Compila diretto e uscita esplicita — 20 ottobre 2026

Compila apre direttamente il modulo, recupera la bozza esistente e non avvia AI; Precompila con AI resta nel modulo con consenso separato. Riprendi più tardi sostituito da Esci senza salvare con spiegazione di ciò che resta disponibile. [Comportamento e verifica](v5/direct-compilation-20261020.md).

## Bollette: modulo e linguaggio semplificati — 20 ottobre 2026

Scelta esclusiva Un mese/Un intervallo con bozze locali conservate al cambio; emissione e scadenza separate. Precompila con AI, Registra spesa e Salva documento espliciti; riepilogo confermato descritto come già salvato. API e dati reali invariati. [Comportamento e verifiche](v5/bill-form-language-20261020.md).

## Compilazione: avviso coerente sulle modifiche non salvate — 20 ottobre 2026

Menu e cronologia Indietro protetti come cambio documento e ritorno; Annulla conserva i campi, salvataggio riuscito prosegue senza doppio avviso. Verifica su dati simulati, dati reali intatti. [Comportamento e limiti](v5/document-unsaved-guard-20261020.md).

## Selezione AI riservata ai documenti non completati — 20 ottobre 2026

Completati esclusi da caselle e selezione totale anche in Tutti e ricerca; rianalisi dal dettaglio da decidere. Dati reali preservati. [Regola e verifiche](v5/ux-audit-followup-20261020.md#selezione-ai-esclusione-dei-completati).

## Correzioni dopo audit browser — 20 ottobre 2026

Competenza nelle spese collegate, titolo leggibile dalla spesa, tipologia precisa dei documenti e contrasto dei campi migliorati. Dati reali preservati; selezione AI sui completati da decidere. [Comportamento e verifiche](v5/ux-audit-followup-20261020.md).

## Correzioni UX Documenti e Rubrica — 20 ottobre 2026

Tipologie casa leggibili su mobile, ambito di ricerca coerente con la vista e ricerca globale preservata, selezione AI esplicita e ritorno della Rubrica alla provenienza. Nessuna modifica ai dati reali. [Comportamento, verifica e limiti](v5/ux-confirmed-fixes-20261020.md).

## Dettaglio oggetto compatto — 19 ottobre 2026

Implementata anteprima desktop/mobile: sintesi, menu modifica, dati essenziali compatti, documenti/manuali raggruppati, costi e attività laterali, contatti/storia richiudibili. Funzioni e fonti preservate; nessun dato reale modificato. [Comportamento, verifica e limiti](v5/object-detail-layout-20261019.md).

## Audit UX Casa applicato — 19 ottobre 2026

Stati vuoti più discreti, Esplora mobile uniforme, Condivisioni richiudibile senza nascondere avvisi, anno vicino al totale e Storico Attività separato. Nessuna modifica ai dati reali. [Comportamento e verifica](v5/casa-layout-20261019.md#audit-ux-applicato--19-ottobre-2026).

## Casa più compatta — 19 ottobre 2026

Scadenze e Da completare con tre conteggi affiancati. Da completare dopo Esplora e Spese; rimosso il riepilogo duplicato ambienti/oggetti/tecnica, dettagli casa e ruolo più discreti. Dati e collegamenti canonici preservati. [Comportamento e verifica](v5/casa-layout-20261019.md#casa-più-compatta--19-ottobre-2026).

## Collocazione oggetto dal dettaglio — 19 ottobre 2026

Menu Stanza nel box Dettagli, salvataggio esplicito, Da collocare e Più ambienti mantenuti. Stanze disponibili reali, stato vuoto e caricamento pagine; nessuna assegnazione reale automatica. [Verifica e comportamento](v5/object-catalog-layout-20261019.md#scelta-stanza-nel-dettaglio--19-ottobre-2026).

## Oggetti e impianti — 19 ottobre 2026

Implementati schede compatte desktop/mobile, Elenco, ricerca server nome/marca/modello, chip ambiente con conteggi completi e ordinamento. Ritorno dal dettaglio con vista, filtri, pagine, focus e posizione. Dati reali e icone, nessuna foto inventata. [Comportamento, API, verifiche e limiti](v5/object-catalog-layout-20261019.md).

## Ambienti dalla planimetria — 19 ottobre 2026

Implementati punti numerati coerenti con le schede, proposte AI da rivedere, elenco modificabile, bozza persistente e conferma atomica con collegamento agli ambienti già presenti. Desktop/mobile verificati; analisi reale autorizzata con 8 proposte lasciate in bozza e nessun ambiente reale creato. [Comportamento, contratto e limiti](v5/floor-plan-rooms-20261019.md).

## Documenti della casa e Rubrica — 19 ottobre 2026

Esplora la casa con tre accessi: Oggetti e impianti, Ambienti, Documenti della casa. Rubrica sotto Spese; archivio unico con filtri Planimetrie/Pratiche/APE/Contratti/Impianti. [Dettagli](v5/house-document-navigation-20261019.md).

## Bollette: periodo di riferimento — 19 ottobre 2026

Completati raggruppamento mensile, filtri e totali per competenza, con emissione e scadenza separate. SORGENIA corretta sulla registrazione esistente. [Regole, verifica e limiti](v5/bill-reference-period-20261019.md).

## Spese: layout desktop/mobile e distribuzione — 19 ottobre 2026

Totale e ricerca anticipati, Registrazioni/Riepilogo, grafico mantenuto anche accanto/sotto l’elenco su richiesta esplicita. Ritorno dal dettaglio con ricerca privata, filtri, pagine e posizione. [Comportamento, verifica e limiti](v5/spese-layout-20261019.md).

## Attività: layout approvato e ritorno al contesto — 19 ottobre 2026

Scadenze con filtri e conteggi server, Analisi e verifiche in vista distinta, strumenti secondari richiudibili. Desktop/mobile senza selezione multipla. Il ritorno dal dettaglio conserva filtro, pagine e posizione; supportato anche Indietro. [Comportamento, verifica e limiti](v5/activity-layout-20261019.md).

## Casa: scadenze compatte e filtri collegati — 19 ottobre 2026

Tre righe con conteggi server delle attività aperte: Scadute, Oggi e In programma (tutte le date future). Ogni riga apre il filtro corrispondente in Attività; i filtri sono conservati nell’URL. Accesso alle attività senza data mantenuto quando presenti. Verificati desktop e mobile a 390 px, senza scorrimento orizzontale. Nessun cambiamento API o dati.

## Casa: Da completare compatto con conteggi — 19 ottobre 2026

Tre righe per documenti da compilare, proposte e verifiche; conteggi completi dal servizio e gruppi cliccabili. [Contratto, verifica e limiti](v5/casa-counts-20261019.md).

## Casa: layout approvato e scadenze — 19 ottobre 2026

Implementati riepilogo operativo, fonti pendenti reali, scadenze personali, accessi alla casa e spese sintetiche su desktop/mobile. [Verifica e limiti](v5/casa-layout-20261019.md).

## Ricerca visibile e viste mobile Documenti — 18 ottobre 2026

Implementata la fase approvata: ricerca globale con ambito esplicito, filtri separati, alternanza Compila/Originale senza smontare i pannelli e intestazioni Fattura/Ricevuta corrette. [Comportamento, verifica e limiti](v5/document-search-mobile-20261018.md).

## Fattura e Ricevuta: spesa diretta, oggetti facoltativi — 18 ottobre 2026

Implementato il percorso approvato: importo/data/fornitore/categoria senza oggetto obbligatorio; aggiunta o collegamento facoltativi, costo unico e solo documento conservati. [Comportamento, motivazione e verifiche](v5/manual-purchase-flow-20261018.md).

## 18 ottobre 2026 — Corretto ingresso Bolletta manuale

Completato il seguito del feedback: importo/data/fornitore/categoria diretti e nessun oggetto, anche partendo da bozza generica vuota. Conservazione documento sola preservata. Conversione di bozze già popolate richiede una specifica di preservazione/mapping e resta esclusa. [Report](v5/manual-bill-flow-20261018.md).

## 18 ottobre 2026 — Spazio di lavoro Documenti raggiunto

Implementata e verificata la combinazione approvata: coda, scheda unica e originale affiancato. Prossimo passo: feedback sul flusso reale; ricerca e rifiniture mobile ulteriori su proposta mirata. Persistenza dei campi non salvati e convergenza degli ingressi legacy restano nel backlog, senza nuovi invii AI impliciti. [Report](v5/document-editor-workspace-20261018.md).

## 18 ottobre 2026 — Prossima fase Documenti

Completati i punti UX 1–4: solo documento, salvataggio/Completati, campi mancanti precisi e ritorno alla stessa vista. Prossimo passaggio richiesto: proposta mirata per ricerca e mobile, prima dell’implementazione. Restano aperti persistenza della revisione non salvata, cestino/ripristino e miglioramenti di estrazione; nessun nuovo consenso AI implicito. [Verifica](v5/document-ux-fixes-20261018.md).

## 18 ottobre 2026 — Raggiunto: Documenti, Da fare e Completati

Implementata proposta UX 3 scelta dal committente: due viste filtrate sul server, stato esplicito per riga, azione primaria contestuale e selezione AI attivabile. Proposta pronta resta Da fare fino al salvataggio; nessuna nuova analisi per riaprirla. Cestino, OCR e persistenza delle modifiche non salvate restano nel backlog.

## Priorità di ripartenza — 18 ottobre 2026

Punto attuale: [project-status](project-status.md). Questa sezione ordina il lavoro aperto senza autorizzare nuove funzionalità o nuovi invii AI; il seguito conserva le milestone storiche.

1. Riprendere dal feedback dell'utente sulla pagina unica e su «Rivedi proposta» (`4742bd4`), senza rifare uploader/revisione o rilanciare analisi già disponibili.
2. Persistenza della revisione non salvata e convergenza degli ingressi precedenti, da definire prima di implementare; [backlog](backlog.md), seguito pagina unica Documenti.
3. Progettare cestino/ripristino per fonti già utilizzate preservando dipendenze, storico economico e ledger; non estendere l'eliminazione definitiva.
4. Misurare e migliorare estrazione con fixture/replay prima di live test: quantità, totali/ruoli, OCR per pagina e PDF misti. Nuovo live test soltanto con consenso e budget correnti.
5. Riprendere fatti tecnici/interventi e BL-10b soltanto con specifica approvata; hardening/antimalware prima di un pilota esposto.

Raggiunto: pagina unica, recupero upload parziali, revisione inline con tipi canonici, AI multipla solo proposte e apertura della bozza pronta. Dettagli e limiti nei report già collegati dallo stato corrente.

## 18 ottobre 2026 — Raggiunto: AI multipla selettiva e classificazione nella revisione

Documenti permette di spuntare fino20 fonti alla volta e precompilare con AI entro il budget autorizzato. Stato recuperabile dopo chiusura, nessuna creazione canonica alla sola analisi. Lo schema di impianto e gli altri tipi si confermano direttamente nella revisione unica, con correzione inline dei metadati.

## 18 ottobre 2026 — Raggiunto: gestione unica Documenti V5

L’utente aggiunge file, riprende i documenti incompleti, sceglie manuale/AI, consulta l’originale ed elimina caricamenti inutilizzati dalla pagina Documenti. La revisione unica rimane nello stesso elenco; i filtri non creano un secondo archivio. Gli indirizzi dei vecchi lotti restano compatibili.

## 18 ottobre 2026 — Ripresa caricamenti

Completato ingresso Da completare direttamente in Documenti, con link a Controlla e organizza sul lotto esistente. Verificati percorsi ripresa, paginazione ed errore/vuoto; nessuna nuova area di revisione o chiamata AI.

## 18 ottobre 2026 — Ingresso caricamento semplificato

Completata selezione locale modificabile prima dell’invio, pulsante file esplicito e scarto di acquisizioni errate prima dell’AI. Revisione unica e consenso automatico esistenti conservati. Eliminazione generale dopo elaborazione resta fuori perimetro.

## Aggiornamento 18 ottobre 2026 — Rubrica assistita operativa

Completati estrazione del professionista nella chiamata documentale esistente, revisione unica e salvataggio automatico con opt-in esplicito, deduplica e protezione dei campi presenti. Verificati offline email e dati cliente esclusi; live conformità e fattura dello stesso elettricista, senza creare ulteriori oggetti/spese. Estensione ad altri mestieri/formati da valutare sui feedback, senza promessa di riconoscimento universale.

## 18 ottobre 2026 — Rubrica utilizzabile da Casa

Raggiunta prima versione BL-10: contatti personali e collegamenti a documenti/oggetti/spese/lavori/attività con versione, archivio, duplicati e privacy. Proposta installatore riutilizza estrazione esistente. BL-10b e inserimento contatto nella bozza di nuova spesa/lavoro restano successivi, senza riaprire estrazione o automazioni. [Report](v5/mini-rubrica-20261018.md).

## 18 ottobre 2026 — Revisione unica consolidata offline

Raggiunti i tre blocchi autonomi: conformità solo casa, ruoli monetari e importi ausiliari, dati precompilati e costo in una conferma con esclusioni e doppioni. Collaudo live di V16 su nuovi originali ancora da misurare. [Report e limiti](v5/unified-review-autonomous-final-20261018.md).

## 18 ottobre 2026 — Consolidamento economico V16 offline

Completato blocco2: valori ausiliari zero, valuta e ruoli dei totali con test e replay originali, senza nuovi invii o mutazioni personali. Nessuna modifica frontend o nuove funzioni. Resta la verifica finale del passaggio dei dati alla scheda, poi chiusura dell’automazione. [Report](v5/house-amount-evidence-v16-20261018.md).

## 18 ottobre 2026 — Documenti tecnici con archiviazione semplice

Conformità ricondotta al documento della casa: classificazione, originale e metadati opzionali; zero proposte di oggetti/spese. Verificato desktop/mobile e percorso canonico senza cambiare dati esistenti. Collegamento installatore alla mini rubrica rinviato; nessuna nuova analisi AI. Seguono importi e revisione dati degli acquisti. [V15](v5/conformity-document-only-20261018.md).

## 18 ottobre 2026 — Conformità, consolidamento V14 offline

Completato primo incremento autonomo su etichette date e tipo impianto con16nuovi test e regressioni verdi. Nessuna migrazione o modifica della revisione unica. Proseguire su importi ausiliari e passaggio dei dati alla scheda, senza ripetere collaudi già verdi o consumare inutilmente l’ultima analisi. [Report](v5/conformity-evidence-v14-20261018.md).

## 18 ottobre 2026 — Consolidamento qualità estrazione

V13 attiva in locale e collaudata su sette originali già caricati senza nuove scritture canoniche. Acquisti, bollette, lavori e planimetrie producono proposte distinte nella revisione unica; conformità tecnica ancora parziale. Prossimo passo: coprire le semantiche residue con test sintetici e osservazioni utenti, preservando budget e controlli dei doppioni. Nessun via libera a estendere il limite di 40 analisi. [Evidenze](v5/document-extraction-v13-20261018.md).

## V5 — caricamento automatico: prima implementazione (2026-10-18)

Implementati consenso per caricamento, orchestrazione persistente e conferma delegata dei casi chiari; revisione solo delle eccezioni. Riavvio server/pagina, replay, fonte modificata, possibili doppioni, fattura/bolletta/planimetria ed importi per riga coperti con dati sintetici. Resta misurare il tasso reale di completamento senza interventi: l’estrazione AI sottostante non è stata migliorata né ricollaudata a pagamento in questa sessione.

## V12 — primo collaudo live superato

Due fonti reali verificate: lavori con soggetti e spesa unica; macchina caffè con cinque dati essenziali e controllo spesa esistente. Nessuna garanzia generale OCR; continuare raccolta feedback nel budget residuo.

## V12 — raggiunto 18 ottobre 2026

Fatture lavori/servizi e miste: soggetti e unico costo della casa nella stessa revisione; servizi senza oggetto e bollette con una conferma. Restano qualità live del modello, OCR per pagina e ulteriori casistiche.

## V11 — robustezza fatture, 18 ottobre 2026

Totali con valuta tra parentesi supportati e verificati offline; qualità live del caso specifico ancora da ricollaudare.

## V5 — raggiunto 18 ottobre 2026

Prima tranche V11 implementata: conformità/fattura/bolletta/etichetta e revisione unica. Restano collaudo provider reale con consenso, OCR per pagina e ulteriori casi del piano.

# Roadmap

## Nuovo prototipo V5 — Blu architettura, 13 ottobre 2026

Direzione visiva scelta dall'utente: proposta 3. Frontend nuovo senza riuso legacy; prototipo locale dei tre journey disponibile in `/v5/index.html`. Prossimo gate: test guidati con il committente, accessibilità/terminologia, triage e congelamento scope; poi ADR stack e gate R00–R06 per il prodotto reale. Non segnare M3 UX o M4–M8 completate prima di queste verifiche.

## Baseline locale V5 — 13 ottobre 2026

Ambiente Windows verificato sul branch locale `dev/dimora-v5-local-20261013`: build frontend/backend, lint backend, lint frontend con tre warning, 119 test backend passati. PostgreSQL dedicato con 22 migrazioni, zero dati reali. La preview React esistente è una demo; M1–M8 e i gate R00–R06 del backlog V5 rimangono da realizzare e verificare. Nessuna milestone funzionale promossa dal solo setup.

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
- Private-alpha safety e portabilità completate (B61-B64): cancellazione fisica dei file, export ZIP completo, tecnico apribile da ogni intervento e una sola CTA per il primo documento.

## MVP v1 — Private alpha (priorità immediata, 2026-09-04)

Le Fasi 0-9 sotto restano la sequenza tecnica di lungo periodo — gran parte è già costruita, dalle Fasi 1-4 in poi (Memory Core, Affidabilità della memoria, Ricerca, Garanzie sono tutte chiuse). Ma **presentare tutto insieme a un utente reale renderebbe difficile capire quale problema Dimora risolve davvero**. Prima del prossimo lavoro tecnico secondo l'ordine di Fase, la priorità immediata è restringere cosa è *esposto* (non cosa è *costruito*) a una private alpha con 15-20 utenti reali, centrata sul flusso "carica un documento → conferma → ritrova" — vedi `docs/mvp-v1.md` per lo scope completo e `docs/backlog.md` B51-B59 per il lavoro tecnico derivato (tutto P0, gating per l'alpha). Nessuna funzionalità viene rimossa dal codice: viene nascosta dietro un flag di navigazione (B52) finché non è validata.

## Roadmap prioritaria v6

La sequenza di prodotto è **Memoria della casa → Fiducia → Recupero rapido → Check-up → Compliance**. Le fondazioni normative già avviate non vengono rimosse, ma il motore compliance non deve diventare l'identità principale del prodotto né anticipare i bisogni già osservati negli utenti.

### Fase 0 — Validazione continua (subito)

- Arrivare ad almeno 15–20 questionari completi, includendo proprietari, seconde case, locatori, over 60 e persone poco digitali.
- Testare il posizionamento “memoria digitale della casa” e misurare interesse, disponibilità a caricare documenti/fotografare targhette e intenzione d'uso.
- Eseguire il protocollo B65 su almeno 30 foto di targhette/10 partecipanti (`alpha-ai-label-measurement.md`) prima di decidere un prompt dedicato.
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

## Direzione B2B2C — Renovation + Financing (Italia, dopo validazione)

Decisa con l'utente il 2026-09-16 dopo il giro di verifica competitiva (`docs/market-strategy.md`, ADR #77 in `decisions.md`): se Dimora aprirà un layer di monetizzazione B2B2C, sarà **Renovation + Financing** (dato immobiliare che origina credito/lavori di ristrutturazione, come RenoFi) — non Insurance, Energy o Transaction Readiness. Deciso anche di **non costruire un layer di esecuzione fisica** (niente rete tecnici propria come Casa): Dimora resta software + referral.

**Non ancora una fase della roadmap tecnica**: nessuno dei due punti è validato. Prima passo, non sviluppo: eseguire B74 (colloqui con banca/lender, operatore di ristrutturazione, rete installatori) durante/dopo i colloqui di Fase 0. Solo se validato, il passo successivo naturale è un "renovation opportunity model" che riusa dati già in gran parte presenti (Property Profile energetico, età/tipo Asset, storico interventi) estendendo le regole Home Detective esistenti (nuova `Issue`/`Recommendation`, non un secondo prodotto) — resta comunque dopo Fase 9, non salta davanti alla sequenza Fase 0-9 già in corso.

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

### Dimora V5 — aggiornamento 13 ottobre 2026
Raggiunto nel prototipo: ciclo vendita / consegna agenzia 60 giorni / cessazione mandato (ADR 80). Da sviluppare in produzione: permessi server-side, scheduler effettivo, archivi originali, passaggio fra studi e gestione di più case per account.


### Dimora V5 — baseline finale v9
Completata la revisione dei sette rilievi R2 e verificati i cinque percorsi di valutazione, con 21 controlli automatici e 64 verifiche UI. Documento guida MASTER-02. Prossimo passo: valutazione delle sequenze da parte del committente e successivo piano di sviluppo reale; nessun nuovo giro di riprogettazione necessario per questi rilievi.


Validazione guidata V5: conferme e persistenza approvate dal committente; targhetta libretto corretta in v9.1. Proseguire con gli altri percorsi UX.

Validazione guidata v9.2: accessi espliciti al condominio e alla segnalazione nella Casa. Proseguire con report privato e gestione studio.

Validazione guidata v9.3: inviata segnalazione privata dal committente; corretta dicitura invio. Prossimo passaggio: presa in carico studio.

Validazione guidata v9.4: comunicazioni pubblicate leggibili in Home senza click sul dettaglio, da confermare visivamente con il committente.

Validazione guidata v9.5: stato e icone per comunicazioni pubblicate. Il committente può completare la rettifica e verificare la spunta verde in Home.

V5-DEV-001 parziale: contratto identity-v1, ADR e checkout Claude pronti. Restano scaffold backend/runtime e database dedicato. V5-DEV-003 frontend assegnabile con mock soltanto nei test; integrazione dipende dall'API V5 Codex.

V5-DEV-002: codice identity-v1 implementato e verificato con 14 test dominio; accettazione API/database ancora aperta. V5-DEV-001: dipendenze backend, schema/client/migrazione e launcher pronti; database/runtime da inizializzare fuori dalla sandbox.

Frontend V5-DEV-003 integrato; backend API v1 avviata e verificata su DB dedicato. M1 consolidamento v1.1: 17 test backend/47 mock frontend e build/lint passano; restano 11 scenari API, 3 frontend/API e browser smoke dopo riavvio launcher.

## Collaudo reale del 13 ottobre — aggiornamento finale
11 scenari API/PostgreSQL e 3 frontend/API superati nei log delle 16:22. Collaudo browser reale eseguito: due account, case persistenti, logout/login, URL altrui negato, mobile 320/390 e sezioni future esplicite. M1-UI-001: seconda casa salvata ma risposta 403 intermittente; assegnato validFrom con Date applicativo per evitare arrotondamento futuro del default DB. Regressione di dominio superata, 18 test backend e 47 frontend mock passano, build/lint passano. Nuovo scenario reale con dieci creazioni consecutive pronto, ancora da eseguire dopo riavvio API. M1 non chiusa. Evidenze: outputs/Dimora-V5-collaudo-prima-app-reale.md. Nessun main o database legacy alterato.

M1-UI-001 chiusa con prova database e browser. Resta ultima prova launcher -Frontend e suite client/API sull'ultimo runtime.

## M1 chiusa — 13 ottobre 2026, 17:41
Launcher ripetuto con riuso del frontend: log frontend/API aggiornato alle 17:41:37, tutti i 3 test reali passano. Sono gia superati 12 scenari API/PostgreSQL (13 includendo la suite), 18 dominio, 47 mock frontend, build/lint e collaudo browser. La regressione della creazione casa e verificata nel DB e nell'interfaccia. M0/M1 chiuse per sviluppo locale; non equivale a prodotto pronto per utenti reali.
Prossimo incremento M2: Codex V5-DEV-004 API/storage/permessi; Claude V5-DEV-005 frontend Documenti. Contratto docs/v5/documents-api-contract.md fissato, endpoint ancora da implementare. Incarico operativo outputs/Dimora-V5-incarico-Claude-M2-documenti.md e patch sync M1/M2 pronta. Il checkout Claude non e stato modificato e Claude non e stato avviato da Codex.

V5-DEV-004 codice M2 implementato: cinque endpoint, storage privato e migration autonoma. Build/lint e 31 test locali passano. Collaudo API reale e integrazione frontend ancora aperti.

## Ripresa dopo riavvio PC — integrazione frontend M2
Integrati sei commit Claude, da 8bf099e a 514a39d, senza riapplicare il sync 577d56c; corrispondenti commit Codex d3bc197, 696f5b4, 1144f55, 116e7fd, 1d0520c, ed48b0b. UI Documenti pronta, nessun file del checkout Claude modificato.
Review: fonte Caricamento manuale mantenuta; upload da Home edit confermato; 404 JSON di Nest gestito, non-JSON resta errore; ZIP fornisce sempre nome attachment documenti-dimora.zip; unità tecniche uniformate a MiB/KiB; Blob locale con gcTime 0 e URL revocati confermati, memoria da valutare prima del pilota; PDF mobile mantiene download visibile; account_context_changed pulisce bozze e cache. Privacy tra membri e revoca sono nella suite backend con fixture DB dedicate.
Correzione aggiuntiva: risposte HTML 200 non accettate come file/ZIP, Content-Type verificato. Build/lint passano; suite completa prima review 80/80, dopo modifiche 80/81 con sola asserzione MB→MiB da aggiornare; aggiornata e riverificate tutte le 34 prove documentali, 34/34. Nessuna nuova prova API/DB o browser reale dichiarata.
Accesso rete autorizzato nella sessione, Git fetch riuscito; restano limiti runtime/loopback e filesystem della sandbox Windows. PostgreSQL si è avviato e ha completato recovery, ma migrate deploy ha restituito Schema engine error senza conferma di applicazione. Servizi avviati per il tentativo Codex fermati; nessun processo sconosciuto terminato. Fonte autorevole dei test reali resta il log M1 delle 17:38 e client M1 delle 17:41, non prove M2.
Launcher ora supporta -Resume per il cluster dopo reboot. Il committente deve eseguire in PowerShell normale -Resume -Documents -Test -Frontend: poi Codex legge i nuovi log e corregge/riverifica. M2 resta aperta fino a API/PostgreSQL/file e browser reali. Nessun push/main o database legacy modificato.

## M2-UPLOAD-001 — correzione parser multipart
Il collaudo reale del committente delle 19:57 ha passato 12 scenari identity e setup documentale, poi rifiutato ogni upload valido con 422. La lettura del parser Busboy conferma che partsLimit viene emesso al raggiungimento del limite, e Multer lo tratta come errore: parts=3 rifiutava anche file + titolo + visibilita. Corretto parts=4, conservando files=1 e fields=2 e tutte le altre soglie. Configurazione estratta e usata dalla nuova regressione sul vero middleware Multer con multipart reale, senza rete/DB simulati per il parser. Titolo+visibilita+file accettati; terzo campo e secondo file rifiutati. Esito log reale precedente conservato in Dimora-V5-M2-integrazione-prima-correzione-upload.log; non e un esito della correzione. Riverifica API/PostgreSQL e client reale richiede riavvio del processo esterno. Nessun dato o originale cancellato, frontend invariato.

## M2 chiusa — 13 ottobre 2026
Ultimo collaudo reale: 23 scenari API/PostgreSQL/file superati (25 con suite), 6 frontend/API superati alle 20:06. Browser: upload PNG private e PDF home esplicito, reload, dettaglio, anteprima immagine, download byte identici, export ZIP e manifesto, mobile 320/390 senza overflow. Logout finale. M2-UPLOAD-001 chiusa, nessun reset dati o modifica main. Esito completo outputs/Dimora-V5-M2-esito-consolidato.md; app reale 5174. Prossimo M3 proposte/confirm per campo, contratto da preparare prima del parallelo; nessuna AI reale attiva in M2.

## M3 — Contratto e assegnazione pronti
Contratto review-api e fixture sintetiche verificati. Codex: backend/schema/worker/permessi/test reali. Claude: frontend nel checkout dedicato dopo patch di sync M2/M3. Nessuna API M3 attiva: prossima fase implementazione parallela, poi integrazione e collaudo reale prima della chiusura.


## Backend M3 — codice pronto, collaudo reale aperto
Implementati i 12 endpoint review-v1, cinque nuove tabelle con migration additiva e worker con lease/token persistenti, timeout e pubblicazione atomica. Schede private del creatore; fonte/hash M2 verificati. Conferme per campo, potenze semanticamente distinte, sostituzione esplicita, versioni/idempotenza, compilazione manuale e storico. Provider solo test_fixture_v1, nessuna AI reale. Build/lint e 52 test locali superati (33 precedenti, 19 M3); 19 scenari M3 API/PostgreSQL preparati ma NON eseguiti. migrate status nella sandbox restituisce Schema engine error: nessuna applicazione della migration dichiarata. Client generato temporaneamente fuori dalla DLL in uso; launcher lo rigenera correttamente prima dell'attivazione.
Il committente puo eseguire outputs/Dimora-V5-Dev.ps1 -Review -Test in PowerShell normale. Migra soltanto dimora_v5_product_dev su 55432 e riavvia solo il PID API registrato, senza reset. Claude frontend ancora in sviluppo; M3 non chiusa.


## M3 chiusa in locale — 13 ottobre 2026
Integrati sette commit frontend Claude senza sync 29bb4c7. Backend 52 test locali; API/PostgreSQL 42 scenari (45 test con suite), client/API 9 e frontend 105 passano. Build/lint finali superati. Browser reale: upload privati A+B, job, conferma marca parziale, potenze distinte, modello, inbox vuota, fonte M2 e persistenza; mobile 320/390 senza overflow. Schede restano personali e provider solo test dichiarato. Resoconto outputs/Dimora-V5-M3-esito-consolidato.md. Test combinati nel launcher distanziati per rispettare il limite auth invariato; launcher aggiornato per V5_REVIEW_API. Nessun main/push o database legacy. Restano provider reale, condivisione schede e hardening pilota.


## M4 — preparazione Anthropic
Provider e budget 10 USD autorizzati; contratto analysis-v2 e incarichi separati pronti. M3 resta runtime attuale. Segue Codex backend/parser/fonti/ledger, Claude frontend sul contratto; integrazione offline prima di massimo sei chiamate iniziali su PDF sintetici. Chiave da configurare localmente, mai in chat.


## M4 — stato backend offline
Implementati parser paginato isolato, adapter Anthropic, consenso, ledger e worker con heartbeat/recovery. Build/lint e 64 test offline passano. Chiave aggiornata e modello Sonnet 5.5 accessibili (Models HTTP 200). Nessuna chiamata Messages effettuata: PostgreSQL locale non rimane attivo nei tentativi di avvio, API ancora 503. Chiesta esecuzione PostgreSQL in finestra persistente e launcher nel PowerShell utente; restano migrazione/API, frontend Claude, test live e browser. M4 non chiusa.

## M4 raggiunta in locale — 13 ottobre 2026
Parser testuale, Anthropic reale, fonti pagina 2/3, consenso, ledger e frontend integrati; conferme e privacy M3 conservate. Prove automatiche e browser concluse, sei chiamate per 0.041714 USD entro 10 USD. Le precedenti voci M4 da implementare/collaudare sono chiuse da questa integrazione. Resta da scegliere il prossimo incremento (OCR oppure estensione del verticale); Agenzie/Admin/Spese reali e hardening pilota restano futuri. Stato autorevole: docs/v5/m4-integration-review.md.

## Prossimo H1 — Attività e scadenze personali
M4 Anthropic chiusa; segue il primo sottoincremento Home utile della roadmap originaria, non ancora Agenzie. Contratto e incarichi pronti; Codex backend/model/test, Claude frontend/mock, poi integrazione e prove reali. Uscita: crea → modifica → completa → storia → riapri, privacy e date corrette dopo reload/login. Seguono ricerca/spese/ciclo proprietario e poi Agenzie/Admin; OCR separato. Non rinumerare il piano storico come se quelle funzioni fossero già implementate.

### H1 — avanzamento backend
Schema/migrazione e dieci endpoint reali verificati nel DB locale; regressioni M1–M4 offline/M1–M3 API passano. Restano consegna/revisione frontend Claude, integrazione client e browser reale prima di chiudere Home attività. Nessuna nuova chiamata Anthropic.

### H1 chiusa in locale — 14 ottobre 2026
Attività personali e scadenze: schema/API/frontend integrati e verificati con test e browser reali. Supera gli stati precedenti «frontend da integrare». Il primo sottoincremento Home utile è completato; ricerca, spese essenziali e ciclo proprietario restano successivi, prima delle esperienze Agenzie/Admin. Ricorrenze/condivisione/OCR/notifiche non incluse.

### Prossimo H2 — ricerca documenti
H1 chiusa in locale; contratto e incarichi H2 pronti. Codex backend/policy/test, Claude frontend/mock, poi integrazione e browser reali. Ricerca dei metadati della Home corrente; contenuto PDF, globale/attività e OCR fuori incremento. Dopo H2 restano spese essenziali e ciclo proprietario; Agenzie/Admin successivi.

### H2 — backend pronto, integrazione aperta
Backend verificato con 73 test offline e 75 integrazione. Prossimi passi: caricare nel servizio API registrato, integrare il frontend Claude e verificare ricerca su browser reale. Non chiudere H2 sui soli test backend o mock.

### H3a — sviluppo autonomo notturno autorizzato
H2 integrata localmente; revisione indipendente raccolta, tre difetti di contesto/cache corretti. H3a Spese essenziali segue il contratto congelato: Codex implementa backend/test e frontend, senza attendere un nuovo incarico Claude. Validazioni iniziali pronte; non dichiarare Spese operativa prima di schema/API/DB/client/browser verdi.

### H3a — backend attivo in locale
Nove endpoint e DB spese verificati; Claude sviluppa il frontend nel checkout distinto, Codex raccoglie la consegna e completa client/API/browser. Non dichiarare Spese navigabile finché frontend non integrato. Nessuna chiamata AI live.

### H3a — raggiunta per sviluppo locale
Spese personali manuali/documentali con riepilogo annuo, originali/caldera referenziati, storia/modifica/archive/restore e percorsi Casa/documento/caldaia verificati con backend/DB/frontend/client/browser reali. Successivi: H3b stime/ricorrenze ed export spese nel ciclo vendita; Agenzie/Admin separati. Nessuna pubblicazione o dichiarazione di prontezza produzione.


## Economia V5 — definizione consolidata del 14 ottobre 2026

Priorità umana aggiornata: G1 ambienti/oggetti generici, C1 condivisione selettiva; evoluzione Spese S1 storico/categorie/oggetti, S2 ricorrenze/calendario, S3 estrazione confermata e S4 stime/rettifiche anticipata nel piano, con contratti separati. Vendita/cessazione accesso e rifinitura globale dopo. Controlli accesso/test inclusi in ogni incremento. H3a resta completata; le estensioni sono definite, NON operative. Fonte docs/v5/home-economy-module.md.


## G1 — contratto e revisione UX raccolta (14 ottobre 2026)

Claude UX27514fa integrato8d52b8f, contratto home-objects-v1 preparato/congelato e prime validazioni dominio verdi. G1a schema/API poi G1b links: entrambi necessari per chiudere G1. G1 frontend/DB non attivi, runtime H3a invariato. Economia futura si chiama Impegni, non In programma come H1.


## G1 — backend attivo e verificato (14 ottobre 2026)

G1 backend/schema/DB/API reali attivi: ambienti, oggetti manuali, posizione multiambiente, catalogo boiler, storia e link a documenti/attività/spese. Frontend Claude ancora in sviluppo; raccolta/review/client/API/browser mancanti, G1 non chiusa. Build/lint81offline/102integrazione/5HTTP runtime verdi. S1/C1 non avviati.


## G1 — integrazione finale reale (14 ottobre 2026)

G1 ambienti/oggetti/collegamenti CHIUSA in locale con frontend Claude raccolto,8commit integrati sync escluso. Backend/DB/HTTP/client/browser reali verdi, reload/logout-login e dati sintetici navigabili. C1 condivisione selettiva successiva secondo priorità umana; Spese S1-S4 definita ma non attiva, ciclo vendita dopo. Nessuna readiness pubblica dichiarata.

## S1 — pianificazione approvata dopo G1 (14 ottobre 2026)
S1 precede C1 e include manuale breve più proposta economica da bollette/fatture semplici, con conferma e costo unico. Specifica docs/v5/s1-economic-history-spec.md; revisione UX documentale preparata per Claude. Implementazione e contratto REST congelato ancora da completare; nessuna migrazione, chiamata paid o modifica runtime in questa sessione.

## ADR-V5-19 — S1 prima C1, contratto e arbitrato UX
14 ottobre 2026. S1 include manuale breve e compilazione assistita bollette/fatture. Bozza economy-v1 separata da expenses-v1 e da analisi caldaia, stesso HomeExpense canonico. Proposta create atomico con lavoro/oggetto e riepiloghi server con somme stringhe centesimi. Scartati copie del costo, pagamento dedotto e esclusione finanziamento dal totale generale. Revisione Claude d54a533 raccolta come db45d1b e arbitrata in s1-design-review.md: collegamento documento incrementa CAS/storia se cambia costo; bozze originali persistite, edit non salvati espliciti; consenso per ogni trasferimento. Nessuna dipendenza/migrazione/runtime o chiamata paid in questa fase. Contratto ancora bozza fino esempi DTO/congelamento.

## S1 — mockup prima dello sviluppo e modulo aggiuntivo
14 ottobre 2026. Steering esplicito: prima navigazione UX mockup, poi implementazione; Economia aggiunge capacità senza alterare funzionalità già definite. Creato frontend-v5/public/mockup-economia-s1.html standalone, dati sintetici in chiave localStorage isolata dimora-s1-ux-mock-v1 (QA separata suffisso -qa), nessuna API/AI o DB. Provati da browser: manuale85 EUR Lavatrice totale505; link gas esistente totale invariato; scelta80su80+20 e nuova registrazione esplicita; fatturaIVA122; scansione manuale; filtroGas e confronto;320px senza overflow. Backend invariato, nessuna build/test backend necessari. Confronti e archivio nel mockup sono simulazioni, non funzioni già aggiunte all'app.

## S1 — schede oggetto preservate nel mockup
14 ottobre 2026. Su richiesta committente, catalogo Oggetti distinto da Costi per oggetto. Scheda completa con sintesi essenziale e sezioni documenti/attività/costi/storia, link verso vista economica e ritorno. Verificato browser accesso fonte sintetica e ritorno,320px senza overflow e console senza errori. Solo mockup isolato: app/backend/DB e funzionalità già definite invariati. Specifica aggiornata docs/v5/s1-economic-history-spec.md; guida outputs/Dimora-V5-S1-mockup-navigazione.md. Sviluppo operativo ancora sospeso per revisione esperienza.

## Mockup Home proprietario completo prima S1
14 ottobre 2026. Quattro sezioni Casa/Attività/Documenti/Spese; ambienti/oggetti/condominio da Casa; spese essenziali distinte da approfondimento Economia. Archivio generale, review card aperte, attività, originali, costi collegati, ritorni contestuali, C1/ciclo di vita come anteprime simulate. Verifica browser reale delle sole simulazioni e viewport320, zero consoleerrori; nessuna API/DB/AI o modifica runtime. Source frontend-v5/public/mockup-proprietario-v5.html e report docs/v5/owner-mockup-navigation.md. Multi-casa/onboarding account e funzioni future non rappresentati. Backend S1 ancora sospeso finché committente valuta navigazione.

## Audit UX Home e famiglie approvate —14ottobre
Contributi Claude da02584/9357f2b raccolti selettivamente (audit20screenshot, proposta autonoma, famiglie). Audit attendibile con correzioni alle affermazioni assolute; alternativa2 raccomandata con schede ad anteprime limitate, unico ingresso Spese e ritorni contestuali; ufficiale non modificato. Report docs/v5/home-ux-audit-arbitration-20261014.md. Famiglie approvate recepite in spec/modulo/bozzaREST: settecodici serverfamily, categorie invarianti, repairs_works derivata da lavoro, polizza mutuo financing esplicita, totale generale e withoutFinancing stessa base. Non importare fonte Claude integralmente: vecchi gruppi, confronti annuali non omogenei, secondarie segnaposto, liste complete e viewportmeta assente. Nessuna API/DB/AIpaid; contratto non congelato.

## Famiglie approvate ora visibili nei mockup —14ottobre
Aggiornati mockup proprietario e copia navigabile proposta-Claude: tutte7famiglie, repairs_works con lavoro derivata in works_purchases, polizza casa180EUR insurance e polizza mutuo120EUR financing espliciti sintetici, rata450 già presente. Totale fixture2477,90EUR, famigliafinancing570EUR, senza1907,90EUR. Dati esistenti non riclassificati; esempi inseriti soltanto se ID mancante. Confronto proposta corrente allineato fino14ott in entrambi anni, viewportmeta/lang aggiunti. Originale consegna Claude in frontend-v5/docs/proposta-ux preservato; copia public ora adattata Codex e marcata. Browser verificato riepilogo proposta e proprietario, sintassi valida e console senza errori. Nessuna API/DB/AI. Non applicata ancora intera riorganizzazione UX al mockup ufficiale.

## Spese — macro famiglie come navigazione principale
14 ottobre2026. Richiesta esplicita committente: sostituire menu Elenco/Peroggetto/Lavori/Riepilogo con famiglie. Proposta navigabile aggiornata: Tutte+7famiglie; modalità secondarie nel select Visualizza, family applicata a elenco/totali/riepilogo/oggetti/lavori; mantenuto scroll orizzontale mobile. Verificati Mutuo570 e Assicurazioni180 con registrazioni giuste, Riepilogo stessa famiglia,320px senza overflow/scrollWidth305; console nessun errore. SintassiJS controllata. Solo copia proposta public e spec, mockup ufficiale/backend invariati da questa modifica. Scelta documentata per successiva integrazione UX ufficiale.


### 14 ottobre 2026 — Consolidamento mockup proprietario S1

Approvata dal committente la navigazione Spese per macro famiglie con Visualizza secondario. Applicata al mockup ufficiale completo, preservando sezioni oggetto/documenti/attività e percorsi condivisione/storia/esportazione. Report e limiti: docs/v5/owner-ux-consolidation-20261014.md. Si rimuove la duplicazione di ingresso Spese/Economia senza rimuovere funzioni. Contratto e implementazione S1 operativa restano separati dalla prova UX. Nessun nuovo incarico Claude o consumo API.


### 14 ottobre 2026 — Rifinitura UI Claude integrata

Raccolta variante Claude 2a5fd69/f37768d e applicata al mockup ufficiale preservando stato e funzionalità. Tipografia, densità, gerarchia azioni e righe Spese migliorate. Verifiche e limiti in docs/v5/owner-ui-refinement-integration-20261014.md; contratto S1 ancora da congelare, runtime invariato.


### 14 ottobre 2026 — Contratto S1 e proposta dashboard

Definizione S1 e wire economy-v1 congelati con tipi, esempi e hash in docs/v5/s1-contract-freeze-20261014.md. Bozze accantonate recuperabili, confronto nullable e compatibilità H3a/G1 definiti. Incarico Claude dashboard alternativa separata pronto; non cambia specifica, ingressi o API e non blocca implementazione. Nessun runtime o DB modificato.


### 14 ottobre 2026 — Backend S1a/b e dashboard separata

API economy-v1 implementate per costi/metadati/famiglie/filtri/confronti e lavori personali; mutazioni condivise con H3a e riferimenti G1 atomici. Migrazione additiva solo DB V5 dedicato. DocumentDrafts false: S1c e frontend operativo restano aperti. Build/lint,86 offline e119 integrazione passati;5 test ulteriori contro API registrata. Report docs/v5/s1ab-backend-review-20261014.md. Dashboard Claude raccolta e servita separatamente, non integrata nel mockup ufficiale.


### 15 ottobre 2026 — Backend S1c fixture e ripresa verifiche

Job economici persistenti, bozze recuperabili, candidati e conferma atomica sul costo canonico implementati; fonte/versione/hash e redazione replay/storia. Provider fixture solo due PDF sintetici, Anthropic economico disabilitato senza invii o spesa. Build/lint e12test S1c mirati verdi nella ripresa;89offline e130integrazione precedenti documentati. API locale ripristinata autonomamente. Frontend Claude non raccolto, S1 nel complesso non completato. Report docs/v5/s1c-backend-review-20261015.md.


### 15 ottobre 2026 — Integrazione frontend Spese S1a/b
Claude c7f145b/1e2ae0e raccolti senza sync, dashboard/manuale/lavori operativi. Build/lint e267test frontend verdi,17test mirati sulla correzione ritorno dal nuovo costo. Percorso browser/API/DB reale verificato: costo sintetico240EUR, totale240,60EUR, archivio/ripristino e storia. Report docs/v5/s1ab-frontend-integration-20261015.md. S1c UI resta aperta; Anthropic economico disabilitato, nessuna chiamata paid. Warning bundle677kB e riepiloghi H3a da evolvere tracciati nel report. Nessun push/main/legacyDB.



### 15 ottobre 2026 — S1c frontend integrato con fixture
Claude1e76d7f/afb9897 raccolti come da0135d/d3a27dd, sync escluso. Build/lint/typecheck e37test mirati verdi. Browser/API/DB reale: upload gas sintetico, fonti/importi, park/reopen dopo reload, conferma80EUR e link_existing senza duplicato. Dashboard320,60EUR/cinque record; AiAttempt8 invariato. Report docs/v5/s1c-frontend-integration-20261015.md. Adapter Anthropic economico non implementato/disabilitato; bundle715kB aperto. Nessun push/main/DBlegacy/paid.



### 15 ottobre 2026 — Adapter economico Anthropic offline
Prepare/decode con parser reale e schema/citazioni verificate, trasporto strutturato condiviso con regressioni caldaia verdi. Evidenza date italiane/importi raggruppati. Build/lint,95offline e12S1cDB/HTTP verdi. Report docs/v5/economic-anthropic-offline-20261015.md. Nessun invio paid/.env/migrazione/restart. Provider resta disabled: ledger economico dedicato, worker protetto e consenso UI reale ancora da implementare prima di autorizzare campagna live.



### 15 ottobre 2026 — Ledger e worker Anthropic economico, ancora disabilitato
Registro separato EconomicAiCampaign/EconomicAiAttempt, riserva atomica, quota/costi, consenso start/retry, recupero senza reinvio e permessi prima di count/Messages/pubblicazione. Migrazione20261015090000 solo DBV5 dedicato. Build/lint96offline/21DBHTTP verdi con AnthropicHTTP stub. API riavviata; providerdisabled, ledger economico vuoto, M4rimasto8. Report docs/v5/economic-ai-ledger-worker-20261015.md. Consenso frontend affidabile a Claude; nessun paid, budgetlive ancora da autorizzare dopo integrazione.



### 15 ottobre 2026 — Consenso Anthropic economico integrato
Claude0c3db1b/55aec7f raccolti d8c5e0b/a6b7497; allineamento escluso. Consenso locale, reset, nuovo retry e billing separato; Codex esclude retry quando billinguncertain anche con timeout. Build/lint48mirati e1test client/API reale a providerdisabled verdi. Economyledger0/M4Attempt8. Report docs/v5/economic-consent-integration-20261015.md. 311completi/browser solo evidenza Claude; nessun paid o budget attivato. Proposta collaudo1USD/treMessages sintetiche ancora da approvare.



### 15 ottobre 2026 — Primo collaudo Anthropic economico reale
Autorizzati1USD/treanalisi solo sintetici. Aggiunta allowlistSHA256 obbligatoria server (ECONOMY_AI_ALLOWED_SHA256), rifiuto prima riserva e trasferimento. Build/lint16mirati verdi; dueMessages reali Sonnet4.6, gas80/20/100 e fattura100+22/lordo122 corretti, conferma canonica totale202EUR. SpesaAPI0,021834USD settled; M4invariato8. Providerdisabilitato in finally/APIriavviata. Report docs/v5/economic-anthropic-live-20261015.md. Nessun terzoinvio o quota resettata; nessuna bolletta personale. Claude possibileottimizzazione bundle incaricopreparato; frontendnonmodificato.


- 2026-10-15: completata integrazione caricamento differito frontend V5; entry sotto 500 kB e 316 test verdi. Vedi v5/frontend-loading-integration-20261015.md.

- 2026-10-15: verificato percorso Spese completo sul servizio locale, più 29 test DB/HTTP; nessun nuovo sviluppo incluso. Vedi v5/spese-verifica-percorso-20261015.md.

- 2026-10-15 C1: definizione e policy offline pronte (9 test); mockup/revisione Claude avviati. Runtime/schema/API da implementare dopo arbitrato e congelamento; non segnare C1 completata.

- 2026-10-15 C1: consegna UX raccolta, simulazione corretta/verificata. Primo rilascio raccomandato con esterni autenticati e abbinamento confermato, non solo same-Home. Contratto esterno/schema/API/frontend reale ancora da implementare dopo valutazione del percorso.

- 2026-10-15 C1a backend attivo locale e verificato; frontend reale Claude in consegna. Integrazione e collaudo UI/API ancora richiesti, non dichiarare C1 completa. Schede tecniche/ZIP/email e altre economie fuori incremento.


## Stato locale 15 ottobre — C1a documentale

Raggiunto nel prodotto V5 locale: preparazione, abbinamento esterno autenticato, accettazione, download e revoca selettiva degli originali; nessuna estensione dei diritti Home/Spese. Verifiche e limiti in v5/c1-frontend-integration-20261015.md. Prossimo: preparazione Agenzie affidabile su specifiche/prototipo, ancora senza autorizzazione a implementare quel modulo. Proiezioni tecniche C1 successive.


## 16 ottobre — consolidamento Home, primo blocco

Audit di Claude raccolto e arbitrato. Applicate correzioni puntuali a messaggi, testi, focus, esempi e permessi mostrati. Nessuna nuova funzione di Agenzie, forecast o guida ancora attiva. Prossimo gate UX: Casa orientata all'azione, destinatari senza casa e guida leggera3passi, con demo separata già disponibile. Rapporto v5/home-consolidamento-arbitrato-20261016.md.

## 2026-10-16 — Consolidamento Home UX

Completati ordine Casa, dettagli richiudibili, segnale limitato alle conferme rilevate, ingresso codice senza case e istruzioni TTL. Guida esclusa su richiesta. Prossimo: valutazione visiva committente, poi definizione/simulazione Agenzie. Prove e limiti in v5/home-consolidamento-integrazione-20261016.md.

## 2026-10-16 — Verifica funzionale Home conclusa nel perimetro provato

Percorsi e limiti in v5/home-collaudo-funzionale-20261016.md. Claude avviato dal committente sulla rifinitura UX, solo report/screenshot; Codex ha concluso il collaudo e mantiene codice. Prossimo arbitrato della consegna, poi valutazione passaggio Agenzie.

## 2026-10-16 — Chiusura revisione esperta Home

Raccolta e arbitrato Claude completati, difetti focus/terminologia corretti. Restano rifiniture facoltative documentate; niente altra riprogettazione generale prima della prova personale. Prossimo: backup DB+originali con verifica ripristino isolato, poi account personale e primi documenti Solo io. Backup non ancora eseguito.

## 2026-10-16 — Piano corrente approvato, prima di Agenzie

Ordine vincolante: Fase0 → BL-04 → BL-01 → BL-02 manuale → BL-03 essenziale (22/10: il committente ha scelto di fare prima BL-02 manuale e BL-03 essenziale, entrambi completati, poi BL-01 e BL-04 completati; BL-04 da provare su telefono reale; BL-10b completato il 22/10 con il collegamento del professionista a spesa e oggetti) → BL-10 mini-rubrica → BL-10b documento/professionista/oggetto → Agenzie. Supera precedenti rinvii di storia e mini-rubrica per questo perimetro. Stime e dipendenze da valutare PRIMA di sviluppare: v5/home-release-piano-20261016.md. Backup/restauro Fase0 verificati; recovery/storage/export/sensibili/qualita AI ancora gate da chiudere. BL-07/08/09 successiva release. BL-12..16 placeholder non pianificati o stimati.

## Fase 0 Home 16 ottobre 2026 avvio

Backup/restore già verificato; controlli storage mirati verdi. Restano aperti recovery, export completo/retention, controllo antimalware, seconda destinazione backup e qualità AI rappresentativa. Recupero soltanto progettato, non disponibile. Vedi docs/v5/fase0-prerequisiti-20261016.md. BL-04 non avviata.


## Fase 0 avanzamento tecnico parallelo alla UX

Preparati email adapter offline, corpus24 e preflight read-only. Recovery end-to-end, antimalware applicativo, export/retention e backup su seconda destinazione ancora aperti. Claude al lavoro sui soli artefatti UX. Nessuna nuova funzione disponibile al cliente, BL04 non avviata.


## Fase 0 recupero account 16 ottobre 2026

Schema/API/frontend recupero e verifica completati localmente e testati. Configurazione Brevo e mittente attivo verificati, canale abilitato per azioni esplicite utente. Account utente creato; verifica email/reset reale ancora da chiudere nel report. Antimalware applicativo, export/retention, seconda destinazione backup e qualitaAI rappresentativa restano aperti; guida rinviata e BL04 non avviata.


## 16 ottobre 2026 Collaudo live recupero concluso

Brevo/API mittente verificati dopo autorizzazione IP eseguita dal committente, due email reali richieste da lui (verifica e reset), challenge accepted/consumed confermate DB. Committente conferma login con nuova password; Codex osserva /case autenticato senza case. Nessuna password letta. Runtime660e50d, report docs/v5/account-recovery-esito-20261016.md. Backup aggiornato083531Z verificato con restore43tabelle/262originali, clusterspento. Recupero gatechiuso locale; altri gate Fase0 aperti. Nessun paidAI/main/legacy/push. Preflight ora distingue il GETsession che puo creare metadato anonimo da una lettura file pura.


## V5 Fase0 — controllo file, 16 ottobre 2026
Attivo controllo bloccante nuovi upload con Defender, provato su API locale. Ancora aperti seconda copia cifrata, export personale/retention e qualità AI; nessun avvio BL04 o Agenzie. Esito docs/v5/fase0-file-control-esito-20261016.md.

## 2026-10-16 — Fase0 export personale
Completati backend e accesso minimo da Documenti per JSON personale Home; originali ZIP separati. Test DB/HTTP sintetici e frontend harness verdi, verifica browser/mobile reale ancora da fare. Fase0 resta aperta per conservazione, custodia chiave backup, politica Defender e qualità AI; Claude al lavoro su UX/corpus. Nessun avvio implicito BL04/Agenzie.

## 2026-10-16 — Fase0 dopo Claude file/export
Consegne documentali integrate a7340b1/07dab2e, arbitrate su runtime nuovo; corretto difetto UX503 noto. Backup completo per il pilota locale (roundtrip cifrato, chiave esterna confermata). Rimangono tre blocchi: gold/scorer e qualitàAI, QA visivo reale, conservazione/cancellazione. Guida/BL04/Agenzie non avviati.

## 2026-10-16 — Regole prova personale consolidate
Definite conservazione senza scadenza automatica, richiesta esplicita di rimozione e distinzione copie attive/backup. Nessun codice o dato eliminato. Prima del primo piccolo lotto come archivio: QA visiva reale upload/apertura/export, con limite eliminazione dichiarato. Per AI personale: raccolta corpus v2 e campagna qualità con nuovo consenso/budget. Rimozione tecnica e ciclo copie ancora aperti; v5/prova-personale-conservazione-20261016.md.

## 2026-10-16 — Primo lotto archivio personale
Gate QA visivo upload/apertura/export chiuso nel perimetro provato con Chrome e dati sintetici, desktop/390/320; fix overflow320 incluso. Si può iniziare 2–3 PDF non delicati Solo io nel proprio account, conservando originali e aggiornando poi il backup. Non attivata AI personale: corpus/campagna ancora aperti; eliminazione e ciclo copie ancora da realizzare. Vedi v5/fase0-browser-collaudo-20261016.md.

## 2026-10-16 — Misuratore offline chiuso
Corpus/scorer v2 implementati e verificati nel master. Residuo qualitàAI: congelare campagna sintetica, criteri e nuovo budget/consenso; niente inferenza di accuratezza dalle prove deterministiche. Archivio personale iniziale già possibile nel perimetro del collaudo UI. Eliminazione/ciclo copie restano aperti. Vedi v5/fase0-corpus-v2-integrazione-20261016.md.

## 2026-10-16 — Contesto nuova spesa consolidato
Attesa dei preset prima di salvare, selezione esplicita e verifica reale completate. Analisi assistita di acquisti: prossimo contratto/revisione sintetica con riuso oggetto e spesa già esistenti; non disponibile ora e nessuna campagna AI avviata. Ordine release non cambiato implicitamente. Fonte v5/expense-object-preset-20261016.md.

## 2026-10-16 — Anteprima ricevuta assistita disponibile
Mockup separato navigabile per acquisto nuovo, oggetto/costo già presenti, ambiguità e documento non leggibile. Riuso senza doppioni e conferma selettiva da valutare; sviluppo reale, nuovi campi generici e contratto conferma ancora da definire dopo feedback. Nessuna AI personale avviata. Fonte v5/receipt-assisted-flow-mockup-20261016.md.

## 2026-10-16 — Mockup ricevuta: verifiche indipendenti e conflitti
Completato affinamento del solo mockup: confronto campi discordanti e collaudo delle scelte separate. Restano feedback sul conflitto e contratto prima dello sviluppo; nessuna capacità AI aggiuntiva attiva.

## 2026-10-16 — Ricevuta assistita, specifica e primo nucleo backend
Passaggio da mockup a sviluppo autorizzato. Completato primo nucleo puro offline; persistenza e trasporto non implementati. Fonte docs/v5/receipt-assisted-spec-v1.md; piano e proprietà in outputs/Dimora-V5-ricevuta-piano-autonomo-20261016.md.

## 2026-10-16 — Ricevuta R2: bozze persistenti in modulo isolato
Completata fondazione persistente e collaudo HTTP/controller/DB sintetico, capabilities false e modulo non attivato. Prossimo: campi/provenienza e confronti, conferma atomica, job e frontend. Claude avviato dal committente, worktree rilevato; fase1 ancora non consegnata.

## 2026-10-16 — Ricevuta R3 e integrazione sorgenti Claude
R3 lettura/risoluzione confronti e provenienza persistenti verificati; consegne Claude integrate nei soli sorgenti, senza aggancio UI. R4 atteso: conferma unica transazionale e privacy su tutti i percorsi. Nessuna funzionalità ricevuta assistita attiva nella Home reale.

## 2026-10-16 — Ricevuta R4 conferma transazionale
Conferma atomica e recupero esito implementati e collaudati in modulo isolato. Non confondere con disponibilità reale nella Home. Prossimo R5: controlli trasversali fonti/export e completamento API di lettura prima del collegamento UI.

Ricevuta R6b backend isolato concluso; residuo R7 adapter/client/route lazy, form park persistente/onesto, linkedCount, fonte originale, confronti riapribili e browser sintetico desktop/mobile. Gate manual/fixture solo dopo tali verifiche; nessuna analisi personale/paid autorizzata.


### 2026-10-16 — Ricevuta R7a
Ricevuta R7a completata offline/DB: pausa persistente. Restano client/container, superfici confronti e collaudo browser prima attivazione.


### 2026-10-16 — Ricevuta R7b
Ricevuta R7b client/container/scheda/review implementati e testati in harness. Restano browser/storage reali sintetici e gate attivazione; provider Anthropic ricevute non implementato.


### 2026-10-16 — Ricevuta R7c preparazione
R7c gate sintetico implementato/testato; attende Chrome per QA reale prima attivazione. Automazione fino20 disattivata dal committente.


### 2026-10-16 — Ricevuta R7c browser
Ricevuta R7c percorso reale sintetico collaudato: upload/originale/job/parser/review/park/reload/confirm/mobileviewport/scheda/costo/riuso/export. Release personale non attiva: manca provider ricevute reale e allineamento segnale Casa per confronti ricevute.


### 2026-10-16 — Ricevuta R8a
R8a ricevute: parser/adattatore Anthropic offline completo e10test verdi; ledger dedicato e attivazione futura ancora aperti. DOPO ricevuta lavorare all’ingresso documenti multipli con proposte di organizzazione e revisione.

### 16ott2026 R8b
Ricevuta: collegamento Anthropic implementato e verificato offline/DB, migrazione20 e API aggiornate; collaudo provider reale ancora da autorizzare, nessun documento personale abilitato. Successivo caricamento multiplo documenti da progettare dopo ricevuta.

### 16ott2026 R8c
Smoke reale ricevuta Anthropic completato su un PDF sintetico e riuso0/0, provider spento. Non equivale a rollout personale o supporto bulk/OCR; prossimo segnale Casa e consenso distinto per eventuale personale, poi progettazione mockup caricamento multiplo.

### 16ott2026 — Bulk documenti M1
Pronto mockup standalone archivio assistito per lotto misto, da navigare col committente. Classificatore, upload multiplo reale, ripresa e budget lotto restano da specificare e sviluppare.

### 16ott2026 — Archivio assistito sviluppo avviato
Specifica V1 approvata e consolidata, B1a lotto persistente/catalogo/guard testati. Restano B1b upload+dedup e B2 metadati/filtri, B3 classificazione con budget distinto, B4 integrazione client/UI e collaudo. Claude frontend isolato in parallelo, nessuna attivazione AI.

###16ott2026 — ArchivioB1b completato in isolamento
Caricamento perfile/dedup/recovery e privacy collaudati, anche disco+Defender sintetico; pronto passare a B2organizzazione personale/filtri/export. Classificatore e interfaccia applicativa restano da integrare, nessun rollout. ClaudeC3 in corso, non dedurre fine da commit.

## V5 archivio assistito B2,16ott2026
Raggiunto: overlay confermato/ripresa/conferma parziale e raccolte Documenti, C1-C3 Claude raccolti. Prossimi: B3 classificatore/fonti/worker/budget offline; B4 adapter/container lazy, ingressi, originale/candidati/receipt, consensi reali e collaudo sintetico desktop/mobile. Non annunciare caricamento massivo AI pronto.

## V5 archivio B3locale/B4,16ott2026
Raggiunto: percorso nell'app e classificazione locale dichiarata, trasporto/container/route lazy, ripresa lotti e originali/fonti reali; collaudo sintetico completo desktop. ClaudeB4-1/B4-2/B4-3 raccolti. Rimangono futuri motore AI semantico esterno con budget/consenso dedicati, OCR, riconoscimento più evoluto; niente cloud/email/forecast/Agenzie introdotto. Mobile attuale verificato sul harness daClaude, collaudo completo fisico distinto.

### 16 ottobre 2026 — Sezioni Documenti
Raccolte in evidenza sopra la ricerca, con gli stessi controlli grafici delle famiglie Spese. Cambio raccolta immediato e URL persistente, preserva ricerca/formato/visibilità applicati; Tutti riunisce l'archivio, Azzera filtri rimuove tutto. Nessuna riclassificazione automatica dei file esistenti o modifica di permessi. Test mirati e build/lint frontend; nessuna modifica backend.


### 16 ottobre 2026 — Export come icona di pagina
Su richiesta del committente l'export ZIP è un'icona accanto al titolo Documenti in ogni raccolta, incluse quelle vuote (disabilitato). La raccolta non limita la presenza dell'azione; ruoli e selezione continuano a governarne l'abilitazione. Tooltip e nome accessibile espliciti, target44px. Stessa icona per scaricare l'originale e dati personaliJSON. Non aggiunti nuovi endpoint o export Spese separati. Nessun download personale effettuato durante la verifica.


### 16 ottobre 2026 — Documenti: ingresso unico, export contestuale e ricerca compatta
- Un solo ingresso «Carica documenti» per uno o più PDF/JPEG/PNG: selezione multipla dal dispositivo o drag&drop nella medesima area. Il controller esistente mantiene limiti, upload indipendenti e conferma esplicita dell'organizzazione. Non è un collegamento a cartelle cloud o scansione ricorsiva di directory.
- Icona export accanto al titolo: primo clic abilita caselle/strumenti, secondo clic sui selezionati prepara ZIP. Annulla/cambio raccolta escono dalla selezione; successo la chiude. Nessuna casella nell'archivio normale. Il pannello JSON conserva la funzione distinta e compare soltanto nelle opzioni di esportazione, anche quando non ci sono originali.
- Ricerca compatta con titolo «Cerca documenti», campo e azioni. «Ricerca in» e nota sul contenuto conservate per lettori di schermo, senza duplicare visivamente la casa già nel titolo. Formato e visibilità in details «Filtri aggiuntivi», chiusi se inattivi e aperti con filtri applicati.
- Il form UploadForm ancora usato da Spese non è cancellato. Le sue regressioni sono isolate nel SingleUploadHarness e in route aggiuntive SOLO del harness, senza ingresso legacy nascosto nel prodotto. Nessuna API/mock fallback nel runtime.

### 16 ottobre 2026 — Unico ingresso documentale
Rimosso anche Analizza documenti dalla testata Documenti: resta solo Carica documenti, che entra nel percorso caricamento/classificazione locale/revisione/conferma. L'analisi tecnica M3/M4 resta disponibile da Attività e dai percorsi dedicati: nessuna funzione rimossa, nessuna AI a pagamento avviata. L'avvio locale e le conferme nel lotto mantengono le regole già implementate; non dichiarare introdotta un'analisi esterna automatica. Test mirato sulla testata, typecheck ed eslint dei file coinvolti.


### 16 ottobre 2026 — Aggiunta progressiva di documenti allo stesso lotto
POST /homes/:homeId/document-intake/batches/:batchId/items, body {items:[clientItemId,filename,byteSize,mimeType]}, Idempotency-Key. Stessa validazione manifest/CSRF/account/Home/ruolo/email del caricamento iniziale. Append commutativo senza expectedVersion: lock lotto e quote rilette serializzano conteggio, byte e ordinali, mentre i job possono avanzare. Max20file e200MiB sull'intero lotto, non per singola selezione. Stessa chiave/payload → replay del lotto attuale; payload diverso →409; clientItemId già presente con altra richiesta →409. Nessuna lettura di originali, schema o provider aggiunti.
I file, le proposte, le scelte e gli esiti confermati precedenti non sono sovrascritti. Un lotto completato riapre solo per accogliere nuovi file; i risultati precedenti restano registrati. Il client usa stesso batchId e upload indipendenti soltanto per gli ID della nuova selezione; non ritenta automaticamente file precedenti falliti. Esito incerto conserva chiave/manifest per recupero. Risposta tardiva non naviga in un altro lotto.
Il pulsante «+ Aggiungi documenti» nel lotto apre la medesima selezione/drag&drop e torna al lotto dopo la scelta, anche scegliendo un solo file. Durante il caricamento il selettore è disabilitato. Nessun file personale usato per verificare l'aggiunta, nessuna chiamata AI/email/paid, nessuna modifica .env/quote/sicurezza. Solo DB V5 dedicato e riavvio dell'API registrata.

16ott2026: + Aggiungi documenti spostato dalla colonna laterale a subito dopo l'elenco, dentro File del lotto, su indicazione del committente. Nessun cambiamento di comportamento/API. Verifica smoke, typecheck ed eslint mirati.


### 16 ottobre 2026 — Titolo e tipi proposti, revisione semplificata
Il committente richiede di ridurre la compilazione manuale: il classificatore locale propone il titolo da una riga breve riconoscibile del testo effettivo, quando comincia con il tipo rilevato e non supera120caratteri. In assenza di intestazione affidabile resta un'etichetta del tipo; nessuna deduzione dal nomefile o OCR/AI esterna. I contenuti proposti sono tutti preselezionati, modificabili prima di salvataggio/conferma: prevale sulle precedenti istruzioni V1 che richiedevano selezione manuale dei PDF multiparte. Nessuna scrittura di organizzazione senza conferma e nessun consenso sostituzione preselezionato.
Catalogo additivo: agibility_record → building, «Visura agibilità (non certificato)». Una pagina con Visuraagibilità/noncostituiscecertificazione non viene proposta come certificato agibilità/abitabilità solo perché li menziona. Non è una verifica semantica o legale: resta obbligatorio controllare l'originale. Test sintetici separano intestazione reale, prosa, riferimenti e dichiarazione di noncertificazione.
Anche le copie identiche autorizzate possono essere classificate LOCALMENTE su avvio esplicito, tramite la stessa fonte canonica e controlli esistenti. Nessuna copia nuova, alterazione dell'originale o avvio paid. Possono essere riproposti file ready senza proposta ma ancora unreviewed; saved/confirmed/deferred esclusi dall'avvio UI. Backend conserva blocco saved/confirmed. Titolo e contenuti già confermati prevalgono sulla nuova proposta della copia, con scelta di riuso/organizzazione e consenso di sostituzione invariati.
Revisione manuale: pagine facoltative in details richiudibile; già aperto se intervalli presenti. Percorso tastiera aggiornato al nuovo controllo, range conservati. Nessuna analisi dei documenti personali eseguita durante sviluppo: il nuovo comportamento si vede al prossimo avvio locale scelto dall'utente, non riclassificando retroattivamente.

### 16 ottobre 2026 — Riuso distinto da organizzazione e correzione senza upload
Diagnosi in sola lettura sul contesto del committente: il classificatore aveva proposto agibility_record, ma l'azione scelta era reuse dell'originale; una precedente organizzazione other/unclassified era quindi rimasta invariata. Non è un errore del filtro building né un fallimento di riconoscimento della visura. Nessuna modifica dei suoi dati effettuata dal collaudo: consultati solo metadati scoped al suo account/Home, non i byte originali. Evidenza locale outputs/intake-organization-readonly-result.json NON da committare.
La revisione di una copia con organizzazione other e proposta più specifica ora preseleziona i tipi proposti, conservando titolo personalizzato e consenso di sostituzione esplicito. Scelte già classificate restano conservate. Il solo riuso avvisa che non applica titolo/categoria e lo stato non dice più Organizzato: Originale riusato · organizzazione invariata.
POST /homes/:homeId/document-intake/batches/from-documents {documentIds:[uuid,...]} +Idempotency-Key prepara una nuova revisione degli originali già autorizzati (max20/200MiB e stessi limiti di formato/dimensione). Non ricarica byte, non crea Document/StoredFile, non modifica organizzazioni o vecchi ledger. Lock/check di account/Home/ruolo/email/originale; idempotenza peraccount/Home/chiave con digest origine distinto dai manifest. Riusa solo proposte precedenti dello stesso account/Home/documentId/versione/hash; altrimenti not_started. La nuova organizzazione esiste solo dopo salvataggio e conferma, con replaceOrganization/versioni quando necessario.
Il comando Riorganizza senza ricaricare sui file confermati prepara quel lotto e porta lì il client, proteggendo da doppio clic e risposte tardive di altro lotto. Nessun automatismo paid/AI/OCR o classificazione retroattiva; la categoria deriva dal tipo riconosciuto oppure scelto. Per scansioni unreadable l'OCR resta fuori scope.

### Documenti V2 — stato 16 ottobre, integrazione notturna
Raggiunto il flusso approvato dal mockup: area unica, conferma diretta singola/multipla, lettura esclusivamente locale automatica, copie/conflitti, rinvio e modifica dall'archivio. Collaudo reale con file sintetici concluso, report docs/v5/document-intake-simplified-development-20261016.md. Prossimo: breve prova del committente nella propria casa; nessuna richiesta di nuovo incarico Claude, guida o Agenzie per completare questo giro.

### 17 ottobre 2026 — onboarding documenti/oggetti
Avviata estensione additiva autorizzata: prodotti da screenshot di consegna/ordine e documenti multiarticolo. O1 offline implementato; integrazione nell'app ancora da completare. Fonte docs/v5/object-onboarding-development-20261017.md. Nessuna funzione esistente dichiarata sostituita, nessun provider abilitato.

### 17 ottobre — manuale nella scheda, disponibile locale
Completati sezione manuali per oggetti personali, ricerca ufficiale Moulinex/URL pagina prodotto, conferma/aggiunta manuale/rimozione, storia/export metadati e collaudo browser mobile sintetico. Resta aperto onboarding assistito da foto con creazione schede e campi tecnici/garanzia: non confonderlo con questo rilascio. Report docs/v5/object-manuals-20261017.md.


### 17 ottobre 2026 — onboarding documenti e oggetti O2–O5

Onboarding assistito oggetti O2–O5 implementato e collaudato con DB/HTTP/browser sintetici; da chiudere con nuovo collaudo provider reale autorizzato dopo esito incerto. Campagna precedente non riutilizzabile; manuali universali e OCR locale non inclusi.


### 17 ottobre 2026 — collaudo reale onboarding r2

Riconoscimento reale screenshot Amazon v3 verificato, proposta persistita nell’app. Restano ampliamento collaudo reale ad altri casi e produttori, senza nuovi invii impliciti.


### 17 ottobre 2026 — identità dal nome del prodotto

Onboarding oggetti: proposta locale marca/modello dal nome disponibile; recupero preciso del riferimento e descrizione più chiara del campo rimandati ad approfondimento.


### 17 ottobre 2026 — consolidamento caso Echo

Caso reale singolo email di consegna → oggetto Echo accettato dal committente, marca/modello e originale collegati. Prova reale fattura/costo/garanzia rinviata, multiarticolo ed etichetta ancora da verificare separatamente.


### 17 ottobre 2026 — validazione fattura e caricamento integrato

Implementata revisione inline documento/oggetti/spesa con conferma coordinata e ripresa. Validazione ricevuta testata localmente con PDF sintetico e candidato dall’originale; nuovo collaudo provider reale ancora distinto e non eseguito.

- 17ott2026: proposta automatica costo singolo acquisto con una conferma articolo, ricerca duplicati e controllo server, dettagli contratto onboardingV2.


## 2026-10-17 — proposta onboarding semplificato

Mockup onboarding semplificato disponibile; validazione guidata del committente prima di qualunque integrazione del nuovo flusso.


### 2026-10-17 — verifica autonoma onboarding

Completata la verifica autonoma del mockup onboarding semplificato; integrazione del nuovo flusso ancora da autorizzare e pianificare sulla specifica consolidata.


## 2026-10-17 — integrazione UX onboarding V3

Prima integrazione UX onboarding V3 disponibile per i contratti attuali. Conferma unica, lista compatta, campi precompilati e pannello mobile verificati; restano estensioni versionate per sostituzioni, quote multiarticolo e tipi ordine/consegna/etichetta. Non segnare completa la copertura del mockup.


### 17 ottobre 2026 — consolidamento onboarding pilota

Sostituzione esplicita versionata, quote manuali multiarticolo con limite cumulativo e tipi ordine/consegna/etichetta implementati; conferma unica e recupero conservati. Dettagli, prove e limiti: `v5/onboarding-pilot-consolidation-20261017.md`. Nessuna migrazione o attivazione provider; priorità ora uso reale e feedback.


### 17 ottobre 2026 — attivazione AI casa con tetto autorizzato

Modalità pilota account/casa, consenso per invio e campagna persistente5 USD/40 analisi. Contatori e blocchi visibili; collaudi esclusivamente simulati, attivazione verificata senza Messages. Appartamento Roma svuotato dopo conferma definitiva, mantenendo account/anagrafica e nuovo budget. Vedi `v5/ai-home-pilot-20261017.md`.


### 17 ottobre 2026 — coda AI pilota corretta

Allineati claim del worker e lettura input allo scope account/casa, mantenendo consenso e filtro campagna/modello. Corretto il blocco queued del primo uso;19 test DB mirati verdi con nuovo percorso completo simulato. Nessun secondo incarico o reset budget. Dettagli in `v5/ai-home-pilot-20261017.md`.


### Caricamento unico — 17 ottobre 2026

Primo incremento fattura + due bollette implementato; collaudo reale delle due bollette ancora da eseguire col consenso nell’app. Vedi docs/v5/unified-document-proposals-v1.md.


### HTTP400 bollette — 17 ottobre 2026

Prossimo collaudo reale: una bolletta con schema ridotto, solo dopo consenso UI; causa esatta HTTP400 precedente non ricostruibile dal log redatto. Report: docs/v5/unified-document-proposals-verification-20261017.md.


### Bollette — prove autonome 17 ottobre2026

Una bolletta reale pronta da confermare; altra da collaudare successivamente senza duplicare analisi già verdi. Report: docs/v5/unified-document-proposals-verification-20261017.md.

- 2026-10-17: Completata semplificazione della Casa, vista ambiente e riepilogo oggetto, con verifica mobile e regressioni mirate.

- 2026-10-17: Completata la priorità esiti/lotto del secondo audit: consultazione dei risultati senza riproporre analisi, accesso diretto alle spese e ritorno contestuale.


### 17 ottobre 2026 — Compilazione per documento

Completata compilazione per documento manuale/AI con stesso editor, consenso e conferma; rimossa selezione AI collettiva, verificati recupero Dreame e mobile320/390. Report v5/document-compilation-per-file-20261017.md.


### 17 ottobre 2026 — Copia Samsung nella conferma articolo

Completato raccordo copia→conferma articolo nella stessa scheda, con mantenimento dei metadati e test di errore/recupero. Dettagli: v5/document-compilation-per-file-20261017.md.


### 17 ottobre 2026 — Originale nella revisione articolo

Completato accesso permanente all’originale dalla revisione articolo manuale/AI.


### 17 ottobre 2026 — Planimetria a livello immobile

Completato trattamento planimetria/APE come documenti della casa, classificazione e filtri additivi.


## 18 ottobre 2026 — Documenti, revisione unica V4

Portata nell’app la revisione inline per singolo documento: più articoli e spese in una conferma, righe escluse fuori dai costi; prezzi per riga proposti solo con fonte esplicita. Bollette senza oggetto e documenti immobiliari solo casa conservati. Prossimo: feedback d’uso e copertura di tabelle prezzi senza etichette univoche, senza inferire ripartizioni. Specifica v5/document-review-unified-v4.md.

### 18 ottobre 2026 — Onboarding: consolidamento uso reale
Completati layout delle righe, costo manuale nella stessa conferma, data acquisto principale e recupero capabilities AI. Schema/prompt V8 verificati offline; collaudo provider sul PDF visuale ancora da eseguire con consenso UI.

### 18 ottobre 2026 — Provider visuale V9 collaudato
Schema con pool fonti accettato da Anthropic e cinque dati acquisto estratti dal PDF sintetico: nome,marca,modello,costo,data. Resta collaudo personale macchina caffè con nuovo consenso UI; nessuna sovrascrittura dei dati già confermati.

### 18 ottobre 2026 — Prezzo in revisione articolo
Costo dichiarabile subito anche dopo letturaAI ordine/immagine; totale ordine esplicito leggibile e distinta assenza della data. Nessuna rianalisi automatica o nuove spese senza conferma.

### Checkpoint diagnostico acconto/saldo — 23 ottobre 2026

Requisito non superato integralmente: idempotenza e collegamento esplicito verificati, riconciliazione tra due fatture e costo unico/rate ancora da progettare. [Report](v5/fase0-installments-offline-20261023.md). Nessuna promozione del gate AI o del pilota.

### Acconto/saldo — correzione manuale offline, 23 ottobre 2026

Attuato il collegamento di due fatture allo stesso insieme di schede e a un solo costo complessivo confermato dall'utente; importi ambigui pendenti. Verificati entrambi gli ordini e ricaricamenti. Registro rate, riconciliazione universale e misura AI restano fuori scope. [Report](v5/fase0-installments-fix-offline-20261023.md).
