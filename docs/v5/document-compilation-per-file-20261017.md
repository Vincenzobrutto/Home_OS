# Compilazione per documento — 17 ottobre 2026

## Flusso approvato

Caricamento singolo/multiplo → ogni documento offre «Compila manualmente» e «Compila tramite AI». Eliminata dalla pagina reale la lista preliminare di selezione dei documenti per l’AI, inclusa la barra di selezione dell’organizzazione del lotto. I tipi, le copie e le sostituzioni del documento restano modificabili individualmente.

La compilazione manuale apre il modulo esistente, creando o recuperando soltanto la bozza manuale. L’AI richiede il consenso per quel documento, utilizza la stessa campagna autorizzata e apre lo stesso modulo precompilato. Una precedente estrazione aperta viene riutilizzata senza nuova chiamata; una bozza manuale non viene presentata come risultato AI. Nessun dato assente viene inventato. Una sola scheda articolo apre direttamente il pannello; più articoli mantengono le scelte indipendenti. Le bollette restano spese della casa senza oggetto.

La conferma finale crea/collega gli oggetti e le spese tramite le API esistenti e invalida le letture della casa, inclusi catalogo e documenti. Stato esplicito «Scheda da confermare · Non ancora in Oggetti» prima della conferma; dopo, collegamenti agli oggetti reali. Le scelte concluse hanno accesso all’esito e non avviano nuove bozze implicitamente. Nessun nuovo endpoint o schema.

## Conferme interrotte

Un tentativo da recuperare non apre automaticamente un pannello bloccato che nasconde i comandi di recupero. Si verifica l’esito e, quando non registrato, si può ripetere la stessa scelta e chiave. Il messaggio precedente viene sostituito dopo il successo. Nessun nuovo invio AI per recuperare una conferma.

## Dreame: verifica reale

Documento cc39e342-ff55-483b-8939-bf77604b50ca, bozza manuale 5f868d77-4e76-48f0-b8ae-e92fd3dffbb2. L’oggetto non era presente nel catalogo: il tentativo di conferma salvato risultava non registrato, verificato tramite GET di recupero. Ripetuta la stessa conferma già richiesta dal committente, con la stessa chiave e gli stessi dati, senza creare una scelta nuova. Creato un solo oggetto cc2ea41f-d1db-4bac-a325-eb6292fed10c, nome «Robot aspirapolvere», marca Dreame, modello X50, PDF collegato. Verificati scheda e catalogo reale; nessuna spesa aggiunta e nessuna nuova analisi AI. Nome e dati manuali conservati.

## Verifiche

- 71 test frontend mirati: compilazione per file, consenso, recupero idempotente, conferma, multiarticolo, copie, organizzazione e collegamento inline. Un’asserzione nuova inizialmente cercava il vecchio menu «Scelta per Marca»: corretta per il campo attuale «Marca», nessun comportamento modificato per farla passare.
- Build e lint frontend verdi. Controlli browser con API reali: archivio, bozza Dreame, recupero, oggetto e catalogo; nessun nuovo invio al provider.
- Browser mobile 390 e 320: nessun overflow orizzontale della pagina, azioni con stile e disposizione responsive. Viewport ripristinato. Non è un test su telefono fisico.
- Screenshot: outputs/compilazione-documento-mobile-20261017.png, outputs/compilazione-per-documento-lotto-20261017.png, outputs/dreame-recuperato-20261017.png.

## Limiti

Restano i limiti di estrazione e budget già implementati. Questo intervento cambia ingresso e revisione; non promette un’identificazione completa di ogni documento. Non è stata invocata una nuova analisi a pagamento per collaudare la diversa disposizione della UI. Il documento conserva il proprio titolo confermato, distinto dal nome dell’oggetto. Le ricerche del catalogo per nome non sono state estese ai campi marca/modello: l’oggetto Dreame si trova sotto il nome manuale «Robot aspirapolvere».

## Correzione Samsung: copia già presente

Il blocco segnalato per la scheda Samsung non riguardava i dati prodotto: il lotto 3b4e7e90 rimandava al documento già presente fd9bef9f. L’archiviazione della copia richiedeva una scelta che era rimasta nel dialogo separato del documento.

Ora l’editor articolo espone «Usa il documento già presente senza modificarlo», inizialmente non selezionato. La conferma finale esegue il riuso versionato/idempotente già previsto dal backend, poi conferma l’articolo. Senza scelta esplicita non vengono scritti né documento né oggetto. Originale, titolo e tipo restano invariati; modifiche e sostituzioni richiedono ancora il percorso di revisione. Se il riuso fallisce o è incerto, nessun articolo viene confermato prima del recupero. Gli articoli successivi riusano lo stato del documento già confermato anche quando non esiste un overlay di classificazione.

40 test frontend mirati verdi, inclusi due nuovi casi copia e riuso con risposta persa, stessa chiave e nessuna conferma prematura. Build/lint verdi. Browser reale: verificata la scelta inline, riportato il nome visibile nello screenshot dell’utente «Samsung Asciugatrice» nel modulo aperto; marca Samsung e modello DV80T5220TT/S3 presenti. Checkbox lasciato non selezionato e conferma finale al committente: nessuna creazione o nuova analisi personale eseguita in questa correzione. Screenshot outputs/samsung-copia-scelta-inline-20261017.png.

## Originale sempre accessibile nella revisione articolo

Link «Vedi documento originale» nella testata fissa del pannello di ogni articolo, in modalità manuale e AI, anche per nomi parziali/accessori. Apre la pagina autorizzata del medesimo documento in una nuova scheda, posizionata sull’anteprima dopo il caricamento dei byte; non naviga via dal modulo e non salva/conferma né invia dati al provider. Focus trap include il link; chiusura e campi invariati. Fonte non disponibile continua a essere protetta dai guard esistenti.

Test mirato: link corretto/target/rel e modifica del nome conservata, zero analisi o conferme. ESLint mirato e build verdi. Verificata UI reale sul «Coperchio della lavatrice» e apertura della fonte Samsung; nessuna nuova scrittura personale. Screenshot outputs/articolo-link-originale-20261017.png.

## Planimetrie e documenti dell’immobile

Aggiunto tipo JSON floor_plan → building («Planimetria», Pratiche edilizie) ai cataloghi frontend/backend e al classificatore locale con citazione della pagina quando il testo è leggibile. Nessuna migrazione e nessun nuovo endpoint.

Planimetrie, APE, titoli edilizi e documenti condominiali identificati aprono la revisione del documento della casa, non il modulo di creazione oggetto. Il nome del file può suggerire il percorso e una selezione manuale da confermare, mai una fonte estratta né una scrittura automatica. I PDF misti con acquisti/bollette non vengono trattati come esclusivamente immobiliari. La revisione casa mostra «Solo alla casa» e nessun candidato oggetto quando le parti scelte sono tutte immobiliari. Restano conservati originale, privacy e bozze precedenti; nessuna scheda oggetto è creata o eliminata dall’apertura della revisione.

Caso reale: planimetria.pdf, documento 22171224-0b4c-4dfe-bf0a-964a88a8c4c6, lotto ab8aeb41. Testo non leggibile: indicazione manuale precompilata Planimetria, destinazione Pratiche edilizie e target casa. Finestra corretta aperta al committente; nessuna conferma personale eseguita, nessuna nuova AI o spesa. La bozza articolo precedente è conservata, ma non è più esposta come creazione oggetto in questo percorso.

Verifiche:56 test frontend mirati verdi,12 backend offline verdi (parser PDF reale e classificatore), build frontend/backend e lint mirati. Servizi locali aggiornati con launcher registrato, senza .env, reset, nuove analisi o modifiche alle quote. Screenshot outputs/planimetria-documento-casa-20261017.png.
