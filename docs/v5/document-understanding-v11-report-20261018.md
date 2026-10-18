# Comprensione documentale V11 — prima tranche implementata

18 ottobre 2026. Revisione unica precompilata per conformità impianto, fattura, bolletta ed etichetta. Nessuna nuova chiamata Anthropic e nessun consumo del budget AI durante lo sviluppo.

## Comportamento

- Conformità: tipo archivio e titolo, impresa, data del documento, impianto, intervento descritto e potenza impegnabile quando comprovati. Crea o collega una scheda impianto oppure conserva il documento soltanto nella casa, senza oggetto e senza spesa.
- Fattura: oggetto, dati identificativi, data di acquisto e importo comprovati nella stessa revisione; una conferma finale e controlli di doppioni/replay esistenti.
- Bolletta: fornitura, fornitore, importo e data nella spesa della casa, senza creare oggetti.
- Etichetta: marca, riferimento, seriale e dati tecnici comprovati; nome da completare se non identificabile. Nessuna data acquisto o prezzo inventati.

Il provider classifica e raccoglie fatti in una richiesta. L’adattatore locale verifica significato e fonti prima della proiezione. Le citazioni restano in un unico pool nello schema compatto. Campi opzionali non verificati sono omessi e segnalati senza perdere gli altri dati validi; identità, quantità, prezzi e totali mantengono le validazioni rigorose.

Le azioni Manuale/AI da archivio aprono il caricamento di revisione anche per documenti esistenti non ancora confermati; gli esiti già confermati restano consultabili senza creare nuovi lotti.

## Contratto e persistenza

Estensione additiva della bozza: documentInfo {kind,title:{value,source},facts:[{subjectIndex,field,value,source}]}, reviewWarnings [{field,reason}], item subjectKind e proposedType. I fatti usano subjectIndex=-1 per il documento o l’indice originale del soggetto. Tipi di fatto iniziali: issuer, documentDate, installationDate, interventionDescription, availablePowerKw, systemType.

Conferma: choice action=document_only per un soggetto di conformità (solo itemId/action; nessun payload finanziario nascosto). documentOnly=true al livello superiore ammesso solo con classificazione riconosciuta e nessun soggetto/spesa. Validazioni anche lato server; ricevute idempotenti invariate. Nessuna migrazione Prisma: metadati e fatti restano nell’output JSON della bozza, sotto gli stessi controlli di privacy e snapshot.

## Verifica

- 75 test backend offline passati: contratto, fonti, omissioni isolate, errori d’identità, date, unità, quantità, importi, schema compatto; quattro PDF sintetici con parser reale e trasporto simulato.
- 26 test integrazione DB passati, inclusi i quattro casi, create/link/document-only, spese canoniche, privacy e replay; 5 test HTTP passati.
- 54 test frontend mirati passati dopo le ultime modifiche; ulteriori 5 test IntakePage mirati passati.
- Build backend/frontend, typecheck e lint mirati passati.
- Browser applicazione reale: quattro PDF sintetici in casa QA temporanea, revisione precompilata e una sola azione Salva e organizza per caso. Fattura 99,99 EUR / 13-06-2025; bolletta 84,50 EUR senza oggetto; conformità elettrica con scelta solo casa; etichetta senza acquisto inventato. Viewport390 e320 senza overflow orizzontale. Nessuna conferma o modifica di contenuti personali. Casa QA, documenti, bozze e file fisici rimossi dopo verifica; nessun job AI creato.
- Screenshot: outputs/v11-conformita-mobile-20261018.png e outputs/v11-etichetta-mobile-20261018.png nel workspace contenitore.
- Servizi locali e ingresso LAN aggiornati tramite launcher registrato.

## Limiti e seguito

La qualità del nuovo prompt/schema con Anthropic reale non è ancora misurata: i test simulati dimostrano parsing, mapping e salvataggio, non la capacità del modello di riconoscere ogni documento. Una futura analisi richiede consenso nell’app e usa il budget residuo esistente. Le vecchie bozze non vengono riscritte né arricchite retroattivamente.

I nuovi fatti tecnici sono osservazioni del documento, visibili anche nell’esito confermato: non costituiscono nuovi campi canonici editabili di impianto né creano automaticamente attività/interventi. Restano da sviluppare le ulteriori casistiche della proposta, qualità OCR per pagina e gestione avanzata dei PDF misti. La classificazione locale della riga può ancora mostrare tipo da indicare mentre i metadati AI riconosciuti sono già nella revisione: la nuova classificazione archivio si applica al salvataggio, senza sovrascrivere copie/conflitti o scelte confermate.
