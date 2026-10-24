# Allineamento del prototipo alla V5 — 24 ottobre 2026

## Base verificata

`git fetch origin` eseguito prima del confronto. Ultima punta del ramo di integrazione autorizzato: `origin/codex/dimora-v5-consolidata-20261023`, **2ab757034e268498819fa8d530cf59f2aab00984**. Il prototipo resta su `codex/prototipo-promozionale-20261024`, PR #25. `main` è un ramo distinto, non la base V5 autorizzata. Non sono stati avviati o modificati API, database, AI live o dati reali.

Il confronto usa i sorgenti e le rotte del consolidamento, non una sessione autenticata con documenti personali. Il collaudo visuale è sul prototipo locale. Allineamento di architettura informativa e comportamento dei percorsi selezionati, non riproduzione pixel per pixel né parità tecnica completa.

## Confronto e correzioni

| Schermata | Riferimento reale in frontend-v5/src | Differenza trovata | Correzione dimostrativa |
| --- | --- | --- | --- |
| Menu e stile | components/AppShell.tsx; styles/tokens.css | Nomi inizialmente accorpati; interfaccia verde e mobile con tutte le voci sempre aperte | Sette sezioni nell'ordine V5; palette Blu architettura nell'area applicativa; mobile con Casa/Attività/Documenti/Spese e menu completo |
| Casa | routes/HomePages.tsx | Dashboard generica senza gli ingressi rapidi V5 | Nome casa, Aggiungi documento, Registra una spesa, scadenze, Esplora la casa, completamento documenti |
| Documenti | routes/DocumentsPages.tsx; documents/families.ts | Elenco senza lavorazione o famiglie reali | Tutti/Da fare/Completati, ricerca, undici famiglie, Compila/Apri, fonte e versione |
| Compilazione | documents/DocumentEditorWorkspace.tsx; object-onboarding/compilationFlow.ts; CompilationSteps.tsx | Modale unica generica, dati modificati non sempre coerenti con schede successive | Documento/Contenuto/Articolo 1/Spese/Contatti/Riepilogo; passaggi adattati a bolletta e sola archiviazione; pagina unica con valori conservati; originale affiancato su desktop e vista separata su mobile |
| Acquisizione | intake-integration/IntakeFileSelection.tsx; object-onboarding/OnboardingPage.tsx | Tutti i documenti trattati come lettura uniforme | Esempi PDF, foto e planimetria distinti; foto senza lettura locale automatica dichiarata; AI solo proposta simulata con scelta distinta |
| Oggetti e impianti | objects/Catalog.tsx; routes/ObjectsPages.tsx | Schede statiche con fonte/contatto generici | Ricerca nome/marca/modello, filtro stanza/stato, creazione/modifica, collocazione, archivio/ripristino; scheda con documenti, costi, attività, contatti e garanzia manuale |
| Ambienti | routes/RoomsPages.tsx | Elenco statico non aggiornato dagli oggetti | Ricerca, aggiunta e rinomina con collocazioni aggiornate, conteggio e dettaglio oggetti; esempio da planimetria |
| Attività | routes/ActivityPage.tsx; ActivitiesSection.tsx; activityFollowUp.test.tsx | Promemoria hardcoded; analisi e scadenze mescolate | Scadenze/Analisi e verifiche, Aperte/Completate/Tutte, nuove attività; completamento e follow-up con la data scelta, senza follow-up obbligatorio |
| Spese | routes/SpesePage.tsx | Previsioni come schermata principale; importi senza centesimi | Registrazioni/Riepilogo, ricerca, inserimento/modifica, oggetto e lavoro collegati; pagamento non dedotto; euro con centesimi. Previsioni spostate nelle anteprime |
| Rubrica | contacts/ContactsPages.tsx; ContactCatalog.tsx | Due righe statiche con lo stesso dettaglio | Ricerca, creazione/modifica, contatto selezionato, archiviazione/ripristino e collegamenti; opt-in distinto nella compilazione |
| Storia | history/HistoryPage.tsx | Cronologia soltanto illustrativa | Eventi e fonti della sessione, attività completate, anno, aggiunta manuale |
| Condivisioni | routes/SharingPages.tsx | Manifesto senza stato successivo | Selezione, destinatario, revisione diritti, riepilogo; consegna simulata in attesa di accettazione e revoca |
| Partner e offerte | routes/routes.tsx; catalogo concept v0.3 | Partner e Free/Pro non distinti abbastanza dalla Home implementata | Avviso persistente di anteprima: Agenzia e Amministratore non hanno rotte V5 operative. Condominio integrato, scenari e piani restano nella sezione anteprime |

## Coerenza delle conferme

Nessuna creazione di oggetti/spese prima della conferma. Una bolletta crea solo una spesa della casa, non un oggetto. Confermare nuovamente la stessa fonte aggiorna la registrazione dimostrativa senza duplicarla. Garanzia resta da verificare e pagamento non dichiarato; Rubrica modificata dalla compilazione solo con opt-in separato. La scelta di collegare un oggetto esistente mantiene dati e documenti precedenti. Documento collegato a oggetti, spese o storia non eliminabile dalla demo. È logica del prototipo, non una prova delle autorizzazioni backend.

## Verifiche

- Sintassi JavaScript dei due script verificata.
- **7/7 test** `node --test prototypes/dimora-promo/tests/fidelity.test.cjs`: 27 viste, ordine menu, assenza di undefined; acquisto solo dopo conferma e senza duplicati; bolletta senza oggetto; sola archiviazione/importo negativo; opt-in contatti e fonti sull'oggetto esistente; riapertura dei valori collegati; follow-up con data scelta o assente.
- Browser locale: acquisto modificato → pagina unica con valori conservati → salvataggio → oggetto; bolletta → importo modificato → costo registrato; spesa manuale con oggetto; attività completata → promemoria nella data scelta; nuovo contatto → Rubrica aggiornata. Navigazione Casa/Oggetti/Ambienti/Rubrica/Storia osservata.
- Controllo visuale mobile 390×844: menu chiuso/aperto, navigazione inferiore, compilazione e passaggio Compila/Originale, azioni visibili. Nessuna prova su dispositivo fisico. Console senza errori nei percorsi osservati.

## Limiti mantenuti espliciti

La demo usa un solo articolo per documento, dati fittizi condivisi fra gli immobili dimostrativi, stato in memoria perso al refresh e facsimili testuali al posto di PDF autentici. Non riproduce in modo esaustivo batch multi-articolo, tutti i tipi/campi tecnici, ricevute comparative, automazioni autorizzate, ricerca avanzata server, permessi, API, idempotenza persistente, import reali o condizioni di errore del servizio. Il percorso automatico autorizzato reale non è sostituito dalla regola generale «AI propone»: questo prototipo illustra il percorso manuale/conferma e la precompilazione a proposte. Nessuna promessa di disponibilità commerciale.

Prossimo passo: valutazione del committente sull'esperienza aggiornata; eventuali nuovi dettagli del prototipo nello stesso lotto. Merge della PR #25 al committente.

## Consegna
Pubblicazione privata riuscita: https://dimora-esperienza-demo.vincenzo-b.chatgpt.site . Commit fonte Sites 33df57066c5f4edcd3d250ae6d173d6bdf8142ed. Schermata Documenti verificata anche sul sito pubblicato, con le sette sezioni, stati e famiglie aggiornati. Fonte Home_OS del lotto 4f8ba4c; PR #25 aggiornata, nessun merge eseguito.

## Evoluzione successiva
Il completamento dei Partner e dei passaggi collegati è descritto in prototipo-partner-collegati-20261024.md. Stato corrente 31 viste, 17 test e memorie separate per immobile; i precedenti conteggi e il limite di fixture condivise sono storici.
