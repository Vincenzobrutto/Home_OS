# Conformità: archiviazione nella casa, V15

## Decisione del committente

Per il documento dell'impianto elettrico interessa classificare e conservare correttamente l'originale consultabile. I dettagli tecnici non sono un obiettivo di digitalizzazione. L'emittente/installatore esplicito è utile per un futuro collegamento alla mini rubrica; in questa modifica non si creano contatti.

Questa priorità sostituisce l'obiettivo di arricchimento tecnico del precedente incremento V14. I validatori compatibili rimangono per i dati già esistenti e per le fatture di lavori; nessuna vecchia scheda è modificata.

## Comportamento implementato

- Prompt document-understanding-v15: una dichiarazione di conformità propone zero prodotti e zero spese, con classificazione e soli eventuali emittente/data documento. L'assenza di dettagli o di dati opzionali non richiede compilazione.
- Il decoder applica localmente il perimetro documentale prima della validazione: ignorare i soggetti tecnici non serve ad accettare classificazioni o metadati falsi. I campi effettivamente conservati restano verificati. Costi inattesi e contenitori malformati non vengono nascosti da questo adattamento.
- Metadati opzionali non verificati sono omessi, con diagnostica conservata; non bloccano la sola archiviazione quando il provider non richiede revisione. Una classificazione dubbia o illeggibile continua a richiederla.
- La policy automatica archivia le nuove proposte senza articoli e, per le vecchie bozze in cache, usa decisioni document_only sui soggetti estratti. Non cerca doppioni di oggetti o spese quando non ne deve creare. I controlli sotto lock rimangono per qualsiasi scrittura di oggetti/costi; body document_only con campi nascosti resta vietato.
- La revisione frontend della conformità apre direttamente il percorso unico, anche da URL con sola bozza. La scelta iniziale delle vecchie proposte è «solo documento», senza campi tecnici o creazione articolo. Scelte già salvate non sono sovrascritte. Riepilogo ridotto al documento conservato nella casa; link all'originale e anteprima disponibili. Nessuna creazione o modifica di rubriche.
- Fatture di acquisto e lavori mantengono i loro soggetti e costi, le bollette mantengono il percorso spese senza oggetti. Non si tratta ogni documento contenente «elettrico» come una conformità.

## Verifiche

120 test del gruppo backend object-onboarding verdi, poi 21 mirati dopo l'ultima guardia contro costi nella conformità (14 policy e 7 casi document-only). 47 test DB/HTTP: 14 automatic intake, 33 onboarding/HTTP. 50 test frontend router/revisione verdi; gli ultimi due mirati sulla conformità riprovati dopo la riduzione del riepilogo. Build backend/frontend, typecheck e lint verdi.

I test DB coprono sia dichiarazione senza prodotti sia bozza precedente con soggetti corrispondenti a oggetti già presenti: conferma documento, zero nuove risorse e nessuna chiamata AI. Fatture, bollette, esclusioni e replay restano verdi.

Browser reale in sola lettura: desktop 1280, mobile390 e320 senza overflow orizzontale; zero input tecnici, azione finale disponibile. Espansa l'anteprima del PDF originale; nessun salvataggio o consenso AI eseguito. Screenshot privato outputs/conformity-document-only-mobile-20261018.png. Viewport ripristinato e tab QA chiusa.

Invarianti dopo i test: 9 documenti, 5 oggetti, 5 spese per 3.012,17 €, un ambiente, nove SHA originali invariati. Budget 2,416046 USD e 39/40 chiamate, invariato. Ricevuta privata outputs/conformity-document-only-invariants-20261018.json. API locale aggiornata; frontend HMR e LAN invariati. Nessuna migrazione, push/deploy, modifica env o sicurezza.

## Limiti e seguito

Prompt V15 non collaudato con una nuova chiamata reale: l'ultima analisi disponibile è conservata. Il perimetro document-only è provato con provider simulato, parser e DB reali. Emittente rimane metadato della proposta; collegamento/compilazione mini rubrica è una voce futura. Prossimo blocco autonomo: importi ausiliari delle bollette e fatture; poi trasferimento dei dati alla scheda nella revisione unica.
