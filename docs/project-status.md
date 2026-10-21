## Documenti: archivio unico con dieci famiglie — 21 ottobre 2026

Implementata l’organizzazione approvata: dieci famiglie con Info accessibile e Da classificare condizionale. Macroviste sostituite da filtro Collegamento; ricerca globale e ritorno conservati. Proiezione dai record attuali senza backfill; tipi generici non assegnati per indizi del titolo. Migrazione amplia solo il vincolo, dati reali verificati invariati. Test mirati e browser desktop/mobile con fixture isolate. [Regole e verifiche](v5/document-unified-archive-20261021.md). La famiglia acquisti è ora «Acquisti, garanzie e manuali», con Info esplicita su fatture e scontrini degli elettrodomestici; chiave e dati invariati.

## Documenti: cambia famiglia dall’elenco — 21 ottobre 2026

Menu diretto nella vista Documenti della casa, scelta manuale indipendente dal tipo e ritorno alla famiglia scelta. Conservati originali, collegamenti e spese; Automatico dal tipo rimuove la scelta manuale. Migrazione additiva, 35 test backend e 5 frontend passati, build/lint e browser desktop/mobile con fatture fittizie; dati reali verificati invariati. [Regole e verifiche](v5/document-house-family-20261021.md).

## Documenti della casa da scheda oggetto — 21 ottobre 2026

**Sposta in Documenti della casa** archivia solo la scheda scelta. Fatture condivise disponibili sia nella casa sia dagli altri oggetti: videocitofono, collegamenti e spese conservati, nessun duplicato. Appartenenza esplicita personale/versionata distinta dai riferimenti agli oggetti; migrazione additiva e viste sovrapposte. Test isolati e browser desktop/mobile; nessuno spostamento reale eseguito. [Comportamento, sicurezza e limiti](v5/house-documents-from-object-20261021.md).

## Documenti: originale e classificazioni più accessibili — 21 ottobre 2026

Originale diretto nelle righe e in testa al dettaglio, PDF con renderer locale, ritorno conservato e modifica del tipo senza duplicati. Stato Completato coerente, originale distinto dalla compilazione; Correggi tipo in Altri e PDF di esempio solo in modalità demo/test. Browser desktop/mobile, test mirati e dati reali invariati. [Regole e verifiche](v5/document-original-classification-20261021.md).

## Documenti: ricerca con ritorno e rimandi — 21 ottobre 2026

Cancellando la ricerca si ripristinano vista, gruppo, filtri e punto di lettura iniziali. Le viste vuote rimandano ai risultati server nelle altre viste mantenendo i filtri. Browser desktop/mobile in sola lettura, 41 test mirati, build/lint e dati reali invariati. [Regole, verifiche e limiti](v5/document-search-context-20261021.md).

## Documenti: oggetti collegati e fatture riconoscibili — 21 ottobre 2026

Righe con tutti i riferimenti personali leggibili, anche derivati dalle spese; fatture con descrizione, fornitore, numero, emissione e importo già salvati. Titoli/originali invariati. Test mirati e browser desktop/mobile in sola lettura, dati reali verificati invariati. [Regole e verifiche](v5/document-row-context-20261021.md).

## Documenti: ingresso e filtri semplificati — 21 ottobre 2026

Ingresso su tutti i documenti, stato nei Filtri con etichetta rimovibile e avviso dei pendenti solo quando presenti. Testata mobile compatta e ricerca raggiungibile durante lo scorrimento; testi e ritorno dal dettaglio coerenti. 72 test mirati e browser desktop/mobile in sola lettura. [Comportamento, verifiche e limiti](v5/document-archive-entry-20261021.md).

## Documenti: tre viste e gruppi per tipologia — 21 ottobre 2026

Implementate solo in Documenti le viste Tutti / Della casa / Degli oggetti, categorie della casa con conteggi globali e paginazione server. Ricerca globale e ritorni conservati. Nessuna copia o modifica dei documenti reali; altre sezioni invariate. Collaudo desktop/mobile con 33 PDF sintetici, test mirati e build/lint. [Regole, verifiche e limiti](v5/document-views-20261021.md).

## AI: stesso credito per casa reale e casa di prova — 21 ottobre 2026

Case aggiuntive dello stesso account esplicitamente autorizzabili sulla medesima campagna: credito, riserve e limite chiamate condivisi, nessun aumento o reset. Casa di prova abilitata localmente, analisi lasciate all’utente. 32 test offline, build/lint e disponibilità browser. [Configurazione e verifiche](v5/shared-ai-campaign-20261021.md).

## Documenti: collegamento diretto, titoli, categoria e coda — 21 ottobre 2026

Documenti tecnici e fallback collegabili direttamente all’impianto senza nuovo articolo; titolo iniziale più leggibile e categoria proposta soltanto da precedenti concordi dello stesso intervento. Coda dei nuovi gruppi nell’ordine di caricamento, numerata, e anteprima PDF ruotabile senza cambiare gli originali. Verificati bozza/ripresa, salvataggio e consultazione desktop/mobile con soli dati fittizi; dati reali invariati, nessuna AI live. 127 test frontend e 15 backend, build/lint. [Regole, verifiche e limiti](v5/document-flow-simplification-20261021.md).

## Fatture: modulo unico e documenti dell’intervento — 21 ottobre 2026

Implementati selettore compatto del riferimento, riepilogo unico, dati secondari ripristinabili e documenti derivati dalle spese già attribuite. Collaudo su casa inizialmente vuota con i cinque originali autorizzati: 1 impianto, 5 documenti, 2 spese distinte per 3.074,40 €. AI: 4 esiti validi e 1 fallback manuale, senza retry. App principale aggiornata e controllata in sola lettura; legacy locale preservato. [Comportamento, verifiche e frizioni residue](v5/invoice-single-flow-20261021.md).

## Fatture: stesso oggetto proposto per acconto e saldo — 21 ottobre 2026

Proposte automatiche di riferimenti esistenti, motivate da nome/identità o fornitore più descrizione della spesa già attribuita. Accettazione esplicita senza nuove schede, un solo costo e riuso delle spese già collegate. Nessuna scelta arbitraria tra più oggetti; controlli anche nella modalità automatica. [Regole, verifiche e limiti](v5/object-suggestions-20261021.md). Resta la scelta facoltativa del riferimento e importo unico/acconto/saldo nel titolo, senza modello rate o pagamento verificato. [Correzione iniziale e causa](v5/expense-installments-object-20261021.md). Caso da casa vuota verificato nel [modulo unico](v5/invoice-single-flow-20261021.md); le registrazioni personali esistenti sono conservate.

## Dettaglio Ambiente compatto — 21 ottobre 2026

Testata come Oggetti, azioni in alto, schede oggetto condivise, nota visibile e dettagli/storia compatti. Modulo, archivio/ripristino, altre collocazioni e ritorni conservati. [Comportamento e verifiche](v5/room-detail-20261021.md). 30 casi mirati, build/lint e browser desktop/mobile con dati fittizi; dati reali intatti.

## Ambienti a schede — 21 ottobre 2026

Implementata l’anteprima approvata: schede coerenti con Oggetti, ricerca e filtro unico con archivio e contenuto personale. Creazione, planimetria e dettagli conservati; ritorno con ricerca/filtri. [Comportamento, verifiche e limiti](v5/room-cards-20261021.md). 26 test mirati, build/lint e browser desktop/mobile; dati reali intatti.

## Rubrica: ricerca durante lo scorrimento — 21 ottobre 2026

Ricerca e filtro sempre raggiungibili durante lo scorrimento desktop/mobile. Solo CSS; vista e paginazione conservate. [Comportamento e verifiche](v5/contact-search-sticky-20261021.md). Collaudo con 100 contatti fittizi, 8 test mirati, build/lint; dati reali intatti. Altre proposte Rubrica rinviate per scelta dell’utente.

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

## Bollette per periodo di riferimento — 19 ottobre 2026

Implementati raggruppamento/filtri/totali per competenza, emissione e scadenza separate, inserimento mese/intervallo e controllo evidenze AI. SORGENIA corretta a dicembre 2025 sulla stessa spesa. [Comportamento e verifica](v5/bill-reference-period-20261019.md).

## Spese: layout desktop/mobile e distribuzione — 19 ottobre 2026

Totale e ricerca anticipati, Registrazioni/Riepilogo, grafico mantenuto anche accanto/sotto l’elenco su richiesta esplicita. Ritorno dal dettaglio con ricerca privata, filtri, pagine e posizione. [Comportamento, verifica e limiti](v5/spese-layout-20261019.md).

## Attività: layout approvato e ritorno al contesto — 19 ottobre 2026

Scadenze con filtri e conteggi server, Analisi e verifiche in vista distinta, strumenti secondari richiudibili. Desktop/mobile senza selezione multipla. Il ritorno dal dettaglio conserva filtro, pagine e posizione; supportato anche Indietro. [Comportamento, verifica e limiti](v5/activity-layout-20261019.md).

## Casa: scadenze compatte e filtri collegati — 19 ottobre 2026

Tre righe con conteggi server delle attività aperte: Scadute, Oggi e In programma (tutte le date future). Ogni riga apre il filtro corrispondente in Attività; i filtri sono conservati nell’URL. Accesso alle attività senza data mantenuto quando presenti. Verificati desktop e mobile a 390 px, senza scorrimento orizzontale. Nessun cambiamento API o dati.

## Casa: Da completare compatto con conteggi — 19 ottobre 2026

Tre righe per documenti da compilare, proposte e verifiche; conteggi completi dal servizio e gruppi cliccabili. [Contratto, verifica e limiti](v5/casa-counts-20261019.md).

## Casa: scadenze in box autonomo — 19 ottobre 2026

Le tue scadenze ora ha un box autonomo sopra Da completare, che mantiene documenti, proposte e verifiche. Separazione strutturale valida per desktop, mobile e ordine di lettura. Nessuna modifica ai dati.

## Casa: scadenze prima dei documenti — 19 ottobre 2026

Le scadenze aprono il blocco Da completare su desktop e mobile, con maggiore evidenza del titolo e sfondo leggero. Seguono documenti e verifiche. Dati e logica dei promemoria invariati.

## Casa: layout approvato e scadenze — 19 ottobre 2026

Implementati riepilogo operativo, fonti pendenti reali, scadenze personali, accessi alla casa e spese sintetiche su desktop/mobile. [Verifica e limiti](v5/casa-layout-20261019.md).

## Ricerca visibile e viste mobile Documenti — 18 ottobre 2026

Implementata la fase approvata: ricerca globale con ambito esplicito, filtri separati, alternanza Compila/Originale senza smontare i pannelli e intestazioni Fattura/Ricevuta corrette. [Comportamento, verifica e limiti](v5/document-search-mobile-20261018.md).

## Etichette della spesa da documento — 18 ottobre 2026

«Nessun oggetto» sostituito da «costo non attribuito a un oggetto», con spiegazione che gli oggetti collegati al documento non ricevono automaticamente il costo. Riepilogo ora «Data della spesa», coerente con il campo inserito. Solo testi, nessuna variazione ai collegamenti o ai dati.

## Collaudo browser Fattura/Ricevuta — 18 ottobre 2026

Verificati upload, spesa sola, nuovo oggetto facoltativo, collegamento esistente, Completati e costi unici. Corretto azzeramento dei campi spesa dopo aggiunta articolo. [Evidenze e osservazioni UX](v5/manual-purchase-flow-20261018.md#collaudo-browser-e-correzione-successiva).

## Fattura e Ricevuta: spesa diretta, oggetti facoltativi — 18 ottobre 2026

Implementato il percorso approvato: importo/data/fornitore/categoria senza oggetto obbligatorio; aggiunta o collegamento facoltativi, costo unico e solo documento conservati. [Comportamento, motivazione e verifiche](v5/manual-purchase-flow-20261018.md).

## Ultimo aggiornamento — Bolletta manuale senza oggetti

Corretta la scelta Bolletta nella scheda unica: converte la bozza manuale vuota, apre direttamente importo/data/fornitore/categoria e salva solo la spesa casa. Rimane «Conserva solo il documento». Input già salvati, decisioni e conferme pendenti sono protetti. [Verifica e limiti](v5/manual-bill-flow-20261018.md).

## Ultimo aggiornamento — Spazio di lavoro Documenti combinato

Implementata la proposta approvata: coda personale, scheda unica manuale/AI, sezioni Documento/Spese/Oggetti/Contatti e originale affiancato richiudibile con PDF locale. Il caricamento apre la prima fonte; salvataggio confermato e passaggio al documento successivo, filtri e recuperi preservati. 131 test frontend mirati, build/lint e prova browser sintetica riusciti. Nessun nuovo invio AI, API o schema. [Report e limiti](v5/document-editor-workspace-20261018.md).

## Ultimo aggiornamento — Correzioni UX Documenti 1–4

Implementati i quattro punti approvati dopo l’audit: scelta «Conserva solo il documento», chiusura della bozza dopo salvataggio metadati senza smontare la revisione, indicazioni cliccabili sui campi mancanti, ritorno ai dettagli con vista/filtri conservati. Nessuna nuova chiamata AI, migrazione o modifica legacy. Verifica e limiti: [report correzioni](v5/document-ux-fixes-20261018.md). Prossima fase: ricerca e mobile, da proporre prima di implementare.

## Ultimo aggiornamento — Documenti, proposta 3 implementata

Pagina iniziale Da fare, vista Completati e stati visibili per documento; proposta pronta distinta da dati salvati. Etichetta server workflowState account/casa/versione/SHA coerente con filtro prima del paging. Elimina sotto Altre azioni, selezione AI attivabile; recupero elaborazioni persistenti conservato anche con selezione chiusa. Nessuna nuova analisi a pagamento, schema/migrazione o modifica delle tre differenze legacy locali. Vedi docs/v5/document-workflow-20261018.md per verifica e limiti.

# Stato corrente — Dimora V5

Consolidamento 18 ottobre 2026. Baseline funzionale `4742bd4`, branch `dev/dimora-v5-local-20261013`, repository `Vincenzobrutto/Home_OS`. Chat sorgente «Configura ambiente Dimora V5», terminata. Questa consegna non cambia il software.

## Fonti e limiti

Ricostruzione dal checkout, schema/moduli, report versionati e ultimi turni disponibili della chat sorgente. Non è una rilettura integrale di ogni messaggio storico né una ricertificazione completa. Codice/test determinano l'implementazione; ADR recenti determinano le decisioni. Stati M1/M3/H3a nei vecchi handoff sono fotografie storiche. `docs/HANDOFF.md` resta per il legacy; `frontend-v5/HANDOFF.md` conserva una precedente consegna frontend.

## Implementato nel checkout

| Area | Stato ed evidenze da aprire se pertinenti |
|---|---|
| Account/casa | API reale, sessione, ruoli, permessi, CSRF e isolamento; [identity](v5/api-contract.md), moduli auth/homes |
| Originali | Upload, archivio, ricerca, anteprima, export e privacy; [contratto](v5/documents-api-contract.md) |
| Pagina Documenti | Aggiunta e revisione inline, filtri server Tutti/Da completare/Completati prima del paging, recupero upload parziali, eliminazione privata propria solo se inutilizzata; [report](v5/document-workspace-20261018.md) |
| Onboarding | Bozze manuali/AI con evidenze, conferme canoniche e protezione doppioni; [revisione unica](v5/unified-review-autonomous-final-20261018.md), `backend-v5/src/object-onboarding/` |
| Selezione AI | Fino a 20 fonti per gruppo, consenso sul gruppo esatto, coda persistente `proposalOnly`, nessuna creazione canonica alla sola analisi; [report](v5/document-classification-bulk-ai-20261018.md) |
| Ultima correzione | `4742bd4`: «Rivedi proposta» apre la bozza pronta anche dopo AI multipla. Se nessuna bozza è prodotta resta «Compila tramite AI». Chat sorgente: 17 test e prova browser riusciti, senza nuovo invio AI |
| Oggetti/ambienti/attività/spese | Moduli `home-objects`, `activities`, `expenses`; HomeObject/HomeRoom/HomeActivity/HomeExpense/EconomicWork nello schema. Non equivale a interventi tecnici estratti automaticamente |
| Rubrica | HomeContact personale account/casa, collegamenti, archivio e deduplica; [mini rubrica](v5/mini-rubrica-20261018.md), [estrazione V19](v5/contact-extraction-v19-20261018.md) |
| Automatico autorizzato | Orchestrazione persistente distinta da solo proposte; conferme via servizi canonici e opt-in separato contatti; `automatic.service.ts`, ADR del 18 ottobre |

## Parziale, aperto e problemi conosciuti

- Estrazione AI operativa ma qualità non universale: layout/quantità, ambiguità fra totali e richiamo sul corpus reale ancora da misurare. Fixture non dimostrano affidabilità generale. Vecchie bozze non arricchite retroattivamente.
- Cestino/ripristino per originali già analizzati/collegati assente: rimozione definitiva bloccata per conservare fonte e storico. Nessuna cascata economica.
- Link e ingressi precedenti ai lotti compatibili, convergenza completa sulla pagina Documenti da valutare.
- Modifiche non salvate nella revisione non hanno persistenza garantita su refresh/cambio pannello: usare «Salva e organizza» o «Decidi più avanti».
- OCR per pagina/PDF misti, fatti tecnici canonici editabili e attività/interventi da estrazione non completati dalla sola pipeline. Conformità è prima di tutto documento casa, senza obbligo di creare oggetti.
- Matching tra fonti non prova identità dell'esemplare. Costi mai divisi/sommati/attribuiti arbitrariamente.
- BL-10b e rubrica condivisa non completati; HomeContact non implica condivisione tra account/case.
- Hardening/antimalware e disponibilità pubblica non certificati dal collaudo locale. Problemi OAuth legacy non vanno attribuiti automaticamente alla V5.
- Consensi e budget nei report sono storici: leggere ledger e autorizzazione correnti prima di nuovi invii.

## Decisioni prodotto/UX

Documenti è il punto unico per aggiungere, consultare originale, compilare e rivedere: nessun secondo archivio. Classificazione non significa creazione di oggetti/spese. Dati mancanti completabili nella stessa revisione, sostituzioni esplicite. Proposta pronta riaperta senza nuova spesa AI. Conformità può completarsi come solo documento casa. Quantità multiple, fonti incomplete e conflitti richiedono revisione. Preservare collegamenti e originali consultabili.

## Ambiente e controlli mirati

- Node frontend >=22.12, lockfile autonomi. API `127.0.0.1:3001/api/v5`, frontend `127.0.0.1:5174` con proxy. DB/storage V5 separati; `.env`, DB e storage esclusi dal push.
- Avvio backend-v5: `npm run build`, poi `npm start`; frontend-v5: `npm run dev`. Prima di migrazioni verificare DB destinatario. [Modalità telefono](v5/phone-local-access-20261017.md): launcher esterno al repo; IP/PID storici.
- Frontend: `npm run typecheck`, `npm run lint`, `npm run build`; suite mirata `npx vitest run --project mock <file.test.tsx>`. `npm test` copre mock+fixtures, non prova da solo API reali.
- Backend: `npm run typecheck`, `npm run lint`, `npm run build`, offline `npm test` e `npm run test:object-onboarding`. Non tutti i nuovi test sono inclusi nello script generale: cercare in `test/` per modulo.
- Documenti: frontend `src/object-onboarding/DocumentCompilationActions.test.tsx`; DB dedicato `test/document-workspace.integration.test.cjs` e `test/automatic-intake.integration.test.cjs`, quando necessario e con provider finto. Per questa consegna niente scritture DB personale o invii live.
- Risultati storici nei report collegati; verifiche ripetute durante questa consegna nel resoconto finale.

## Git e dati esterni

Prima della consegna: HEAD `4742bd4`, 326 commit oltre origin/main e nessuno mancante rispetto a main; branch omonimo remoto assente, nessun upstream. Pubblicazione sul branch di sviluppo, senza merge su main.

Le modifiche documentali preesistenti in api/backlog/changelog/decisions/domain-model/roadmap e report fattura sono consolidate nel commit di consegna. Restano locali ed esclusi: `backend/src/main.ts` (bind HOST), `frontend/package.json` (lint su src), `frontend/public/dimora-v5-design.html` non tracciato. L'HTML è un ingresso locale al prototipo, non una nuova funzione V5.

Backup nel workspace della chat di consegna, cartella outputs: bundle Git pre-consegna verificato, patch binaria di tutte le differenze preesistenti, copia HTML. Non applicare integralmente la patch dopo il commit di consegna: contiene anche documentazione già consolidata. Il bundle include i branch/worktree committati, non le modifiche non committate degli altri worktree. DB, storage, segreti e file ignorati restano sul PC: trasferirli altrove richiede procedura separata protetta, senza versionarli.

## Verifica della consegna

Controlli ripetuti: git diff --check, link locali dei documenti di ingresso e ricerca firme di segreti sul diff documentale; nessun errore rilevato. Suite frontend DocumentCompilationActions: 10/10 test passati. Nessuna nuova build generale o prova DB/live, essendo il cambiamento esclusivamente documentale. Il riepilogo finale riporta hash e verifica effettiva del remote dopo push.
