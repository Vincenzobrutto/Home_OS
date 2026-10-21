# Documenti — archivio unico e dieci famiglie

## Comportamento approvato

Unico ingresso Documenti, dieci famiglie richiudibili: Proprietà e affitto; Catasto e pratiche edilizie; Energia e impianti; Condominio; Utenze e servizi; Lavori, ristrutturazioni e bonus; Tasse e tributi; Assicurazioni; Acquisti, garanzie e manuali; Sicurezza e vincoli. Da classificare compare solo se contiene documenti, oppure se selezionato esplicitamente. Ogni Info è un pulsante separato dall’apertura del gruppo, con dialogo, Escape, focus confinato e ritorno al comando. Chiusura mobile senza spezzare il testo.

Ricerca globale per titolo/filename; risultati immediati in elenco con famiglia della riga, senza obbligo di aprire più gruppi. Famiglia e Collegamento sono filtri espliciti insieme a stato, formato e visibilità. Eliminata la seconda categoria concorrente dal nuovo dialogo. Apertura/chiusura gruppo e ritorni dal dettaglio mantengono URL, filtri, pagine/posizione e file aperti; nuova ricerca conserva il contesto precedente per il ritorno alla cancellazione. Selezioni ZIP/AI continuano nell’elenco dei documenti effettivamente mostrati; esclusioni AI precedenti immutate.

Conteggi e filtro famiglia sul server prima della paginazione. Panoramica con tutte le famiglie, gruppo selezionato con le sue pagine. Un solo originale anche con riferimenti diretti e tramite spese. Oggetti, spese, attività, originali e loro collegamenti non vengono riscritti dal raggruppamento. Link vecchi e azioni Casa/oggetti restano raggiungibili; le macroviste diventano filtro Collegamento.

La famiglia Acquisti, garanzie e manuali include fatture e scontrini di acquisto degli elettrodomestici. Nome e descrizione aggiornati mantenendo la chiave interna `warranty`: nessuna riclassificazione, migrazione o modifica dei dati e collegamenti esistenti.

## Conservazione e classificazione

Famiglia principale distinta dal tipo: fattura resta fattura. Nuove scelte nell’archivio preservano anche houseDocument. Il contratto storico house-family resta compatibile. Cambio esplicito richiede organizzazione personale corrente e prova versione/SHA; i documenti non organizzati passano dalla normale compilazione.

Migrazione solo sul vincolo, senza backfill, riscrittura degli originali o UPDATE delle scelte. Traduzione in lettura delle vecchie famiglie e soli tipi univoci; niente riclassificazione da titolo e niente AI. Contratto/fattura generici e documenti misti restano Da classificare: una ricevuta non viene arbitrariamente attribuita a lavori o tasse. Le nuove famiglie sono una proiezione personale autorizzata, non certificazione dell’immobile. Le 126 voci Excel non sono state importate né trasformate in documenti mancanti.

## Verifiche

Backend: 29 test mirati passati (archivio, famiglia, viste e ricerca HTTP/DB); successive 11 regressioni di archivio/viste passate dopo la compatibilità dei raggruppamenti storici. Famiglie complete, somma conteggi, fonte obsoleta, revoca, account privati, retry, CAS, cursor filtrati e pagine senza copie. Confronti prima/dopo degli originali/metadati, spese e riferimenti.

Frontend: 85 test mirati della pagina, Documenti/ricerca, filtri, famiglie, cambio famiglia e FieldInfo passati; il nuovo test pagina ha richiesto correzione del percorso capability nel mock e attesa esplicita del caricamento lazy. Gli altri 84 erano già passati nel run combinato. Build e lint verificati; warning dimensione bundle preesistente.

Browser sull’app con account/casa di collaudo (AI disabilitata), desktop 1440×1024 e mobile 390×844: assenza delle macroviste, dieci Info, cambio fattura di esempio da Da classificare a Lavori e ritorno ad Automatico, tipo/costo/videocitofono conservati, ricerca globale, filtro oggetti e ritorno dalla scheda oggetto. Entrambe le fatture condivise ancora presenti. Gruppo 26 documenti: prima 20, poi 26 righe con 26 ID distinti. Larghezza contenuto mobile 375/375, nessun overflow. Screenshot/helper in outputs della conversazione, fuori Git; nessun originale personale nel repository.

Controllo SHA di snapshot delle due case reali prima/dopo: Document, DocumentVersion, DocumentOrganization, HomeExpense, HomeObject, ObjectResourceLink, HomeRoom, HomeActivity e HomeContact invariati. Collaudo modificante limitato a fixture. Verifica degli originali sintetici byte-identici e delle due spese senza duplicazioni.

## Limiti

Nessuna checklist, scadenza normativa o importazione Excel. Tipi generici richiedono scelta manuale; nessun invio AI aggiuntivo. Famiglia non sostituisce collegamenti e non modifica visibilità. Il frontend usa la capability per continuare a funzionare con API precedenti.
