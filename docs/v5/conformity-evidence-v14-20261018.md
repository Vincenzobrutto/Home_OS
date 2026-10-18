# Conformità: semantica delle evidenze V14

Primo incremento autonomo del 18 ottobre 2026. Nessuna chiamata AI, nessun nuovo consenso richiesto, nessuna modifica ai contenuti canonici.

## Riproduzione e correzioni

Dieci casi sintetici fallivano prima della modifica: sei date citate brevemente con etichetta già presente nella stessa pagina e quattro tipi d'impianto espressi in italiano. Il validatore richiedeva l'etichetta nella citazione breve e accettava soltanto i codici inglesi per systemType.

- Una data di dichiarazione recupera esclusivamente la propria etichetta contigua nella pagina testuale già verificata: stessa riga o riga immediatamente precedente. Date ripetute con ruoli discordanti, altre pagine o contenuti intermedi non valgono come prova.
- Le date di acquisto, installazione, produzione, consegna, scadenza, nascita e pagamento non vengono reinterpretate come data della dichiarazione. Una data completa rimane data documento, senza generare acquisto o garanzia.
- Per input visuali non si presume l'esistenza di OCR: una data isolata resta non verificabile. Una citazione osservata completa di etichetta e data mantiene basis=provider_observed_image.
- Alias italiani circoscritti vengono normalizzati alla tassonomia esistente (ad esempio elettrico→electrical e impianto idrico→plumbing) soltanto se il testo dell'alias è presente nella propria fonte e la semantica coincide. Non si ricava un tipo dall'intestazione di un'altra pagina o da parole arbitrarie.
- Prompt document-understanding-v14: chiarisce la citazione completa della data e la differenza tra valore tassonomico systemType e testo originale. Le altre informazioni testuali rimangono letterali.

Non è provato che queste siano le esatte cause delle due omissioni del precedente documento personale: la risposta grezza non era stata conservata. Il miglioramento è riprodotto e verificato offline; le vecchie bozze non vengono riscritte e non si dichiara un nuovo successo del provider reale.

## Verifiche

16 nuovi test, compreso PDF sintetico attraverso parser reale e normalizzazione wire; 34 regressioni understanding, 28 test di integrazione DB/provider simulato; build e lint verdi. Il nuovo file è incluso nello script test:object-onboarding.

Invarianti verificati in lettura dopo i test: 9 documenti, 5 oggetti, 5 spese per 3.012,17 €, un ambiente, nove SHA originali invariati. Budget invariato: 2,416046 USD, 39/40 analisi. Ricevuta privata outputs/conformity-v14-offline-invariants-20261018.json.

Nessun frontend, schema, endpoint, tariffa, limite, segreto o configurazione di sicurezza modificato. Segue il secondo blocco del piano autonomo: importi ausiliari e ruoli economici. Nessuna domanda per il committente in questo incremento.
