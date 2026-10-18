# Revisione unica del documento — V4, 18 ottobre 2026

Flusso approvato nel mockup navigabile: caricamento → scelta sulla singola scheda fra compilazione manuale e AI → stessa revisione → «Salva e organizza» → collegamenti al documento, agli oggetti e alle spese. Nessuna selezione preliminare dei documenti per l'AI. Consenso e campagna già autorizzata restano invariati.

- Fattura: tutte le righe nello stesso modulo. Ogni riga può creare un oggetto, collegarne uno esistente oppure essere esclusa con «Non riguarda questa casa». Un'unica conferma invia tutte le scelte aperte; quantità, conflitti e controlli doppioni restano espliciti.
- Gli importi delle righe sono proposti soltanto se presenti nella fonte e attribuibili alla specifica riga. Il totale documento non viene ripartito né registrato come ulteriore spesa. Se manca il prezzo di una riga, lo si indica manualmente oppure non si registra il costo.
- Escludere una riga impedisce ogni creazione/collegamento e ogni spesa relativa a quella riga. Il riepilogo distingue spese scelte, importi esclusi noti e totale della fattura. Gli importi non noti restano indicati come tali.
- Bolletta: dati della spesa della casa nella revisione, senza campi oggetto. Una conferma finale. Data documento distinta da prova di pagamento.
- Planimetria, APE e documenti dell'immobile: revisione del documento associato alla casa; nessun oggetto o costo.
- Originale sempre accessibile durante la compilazione, conservando i campi. Riaperture e recupero riusano ricevute/chiavi; nessun nuovo invio AI per recuperare una conferma.

## Contratto e recupero

La conferma esistente dell'onboarding accetta più `choices` e salva insieme oggetti, collegamenti e spese in una transazione. La classificazione del documento nel lotto precede questa transazione e ha una ricevuta propria: non si promette atomicità tra i due servizi. Se la classificazione riesce e la conferma fallisce, il documento resta archiviato e la revisione recuperabile, senza ripetere l'AI. Non si nascondono errori o risultati parziali.

Estensione additiva del JSON di estrazione: `items[].purchaseAmount`, nullable, `{amountCents,evidence}` sul wire e `{amountCents,source}` dopo validazione. Solo fatture/ricevute, prezzo EUR esplicito della riga con nome articolo nella citazione; non viene dedotto dal totale. Nessuna migrazione. Le bozze precedenti senza questo campo continuano a funzionare.

## Accettazione

Fattura sintetica con macchina del ghiaccio 99,99 € e cuffie 49,90 €: entrambi inclusi → due oggetti e due spese, 149,89 €. Cuffie escluse → un oggetto e una spesa da 99,99 €, 49,90 € esclusi; un solo originale. Stesse scelte recuperabili in caso di risposta persa. Bolletta → spesa senza oggetto; planimetria → solo casa. Controlli desktop/mobile, senza nuove chiamate a pagamento per il collaudo.

### Compilazione manuale

manual-drafts accetta documentKind facoltativo purchase_document o utility_bill, proposto dal tipo disponibile nel lotto e da confermare nella revisione. Una classificazione già confermata può indirizzare la bozza; i dati non diventano estrazione. Una bolletta manuale inizia con una proposta di spesa vuota e nessun articolo. Le quote manuali multiple richiedono manualPurchaseTotalCents esplicito nella conferma: positivo, ammesso soltanto in modalità manuale e in assenza di totale estratto, conservato nella revisione/pending per recupero. Il backend applica lo stesso limite cumulativo e non crea una spesa per il totale.

## Correzioni18ottobre2026
Costo dichiarato manualmente disponibile anche per documento non riconosciuto; tipo documento selezionabile inline e data acquisto principale. I totali multiarticolo restano espliciti e vincolati. Nessun prezzo automatico inventato da consegne/etichette. Schema Anthropic V8 usa array0/1 sul solo wire, normalizzato al dominio nullable; evidenze e cardinalità validate localmente. Riepilogo ordine con data e totale espliciti può essere purchase_document.
