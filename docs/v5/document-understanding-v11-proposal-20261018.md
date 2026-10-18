# Comprensione documentale V11 — proposta di revisione

Stato aggiornato: prima tranche implementata per conformità impianto, fattura, bolletta ed etichetta; verificata con dati sintetici e trasporto AI simulato. Nessun collaudo V11 con il provider reale. Il resto della proposta rimane evolutivo. Vedi document-understanding-v11-report-20261018.md. Supera l’idea di un estrattore centrato soltanto sui prodotti commerciali; conserva la revisione unica V4, fonti, privacy, consenso e budget. Nessuna nuova chiamata AI durante questa analisi.

## Evidenza del caso osservato

Il job della bozza be75ca2b-98af-48a0-8bbb-8f29a75eed83 risulta succeeded, errorCode null, documentKind unsupported, items e houseExpenses vuoti, needsReview true. NON si tratta di errore HTTP o di mancato invio. L’avviso generico non distingue mancanza di dati dal tipo non supportato.

L’originale è una dichiarazione di conformità di impianto elettrico, con descrizione di nuovo quadro elettrico, impresa installatrice, data della dichiarazione e potenza impegnabile. La potenza impegnabile non prova la potenza assorbita di un apparecchio; la data della dichiarazione non prova l’acquisto o l’inizio della garanzia. Nessun prezzo osservato. Nessun dato personale della fonte viene ricopiato in questo documento.

## Limiti strutturali attuali

- documentKind descrive acquisto/consegna/etichetta/bolletta, ma non identifica la maggior parte delle tipologie della casa già presenti nell’archivio.
- Il prompt domanda principalmente prodotti; impianti, conformità, interventi ed emittenti non hanno una rappresentazione adeguata. Le parti documentali locali e la bozza AI si classificano separatamente.
- Il profilo oggetto contiene un insieme ristretto di campi: altri dati utili sono omessi invece di restare nelle informazioni del documento con il proprio significato.
- Il parsing testuale dei PDF è tutto-o-niente: una pagina senza testo manda tutto al percorso visuale. Non c’è una valutazione per pagina del testo parziale o corrotto.
- needsReview non distingue testo illeggibile, nome troncato, campo assente, ambiguità e documento estraneo. La UI suggerisce quindi azioni generiche sbagliate.
- Alcune verifiche opzionali falliscono l’intera estrazione: bisogna distinguere errori dell’identità da campi isolati non verificati, senza far apparire come corretti dati scartati.

## Soluzione scelta da proporre

Separare tre responsabilità logiche, mantenendo UNA sola richiesta AI ordinaria per originale. Non obbligare l’utente a scegliere prima quale estrattore usare.

1. Comprendere il documento: tipologia archivio, titolo descrittivo, eventuali sezioni/pagine distinte, soggetti e fatti espliciti. Il tipo non è una barriera che impedisce di leggere altri dati.
2. Validare e mappare localmente: collegare i fatti alla scheda appropriata (casa, oggetto, impianto, spesa, intervento). Le regole applicative stabiliscono quali campi e relazioni sono proposti, NON il modello. Il modello non sceglie gli ID delle entità esistenti e non salva dati reali.
3. Mostrare UNA revisione: documento e proposte correlate, dati già compilati, solo dubbi specifici da risolvere; Salva e organizza resta l’unica conferma dell’utente. Il prodotto non deve presentare queste tre responsabilità come tre schermate.

Una seconda richiesta specializzata è eventuale, solo per problema identificato e con ulteriore consenso/budget: non un fallback automatico o un costo doppio sistematico. Cambiare provider o aggiungere OCR non corregge da solo la tassonomia e le regole sbagliate.

## Contratto compatto e semantico

Conservare pool sources V9 e riferimenti per indice, originali/hash/pagine e schema versionato. Non reintrodurre schemi annidati enormi. Proposta di output:

- documento: classificazione coerente con la tassonomia archivio (inclusi conformità impianto, APE, planimetria, pratiche edilizie, regolamento), titolo proposto e parti con pagine;
- soggetti: chiavi locali e natura casa / apparecchio / impianto / intervento, descrizioni e identità lette; più soggetti possono coesistere;
- fatti: subjectKey, fieldKey del registro applicativo, valore, unità esplicita, sourceIndex; ruoli distinti per data acquisto, emissione, installazione, scadenza, consegna, seriale, riferimento, potenza assorbita e potenza impegnabile;
- importi: valuta, centesimi, soggetto/riga e ruolo (totale documento, totale riga, imponibile, IVA, scaduto, prezzo barrato, rata); nessuna ripartizione inventata;
- qualità: ragioni leggibili per documento/campo (assente, illeggibile, troncato, ambiguo, non applicabile). Non un singolo avviso generico per tutto.

Il testo/valore osservato e l’eventuale normalizzazione sono separati: es. unità originali conservate, conversioni deterministiche solo quando semanticamente corrette e marcate come derivate. I fatti non rappresentabili oggi nella scheda restano visibili nei dati del documento, non vengono forzati in campi con significato diverso. Nessuna inferenza di pagamento, garanzia, certificazione valida o sicurezza dell’impianto.

## Proposta attesa per il documento segnalato

- Titolo: Dichiarazione di conformità — impianto elettrico.
- Tipo: Dichiarazione di conformità impianto; raccolta Impianti e documenti tecnici.
- Ambito: casa; proposta opzionale di collegare l’impianto/quadro elettrico esistente o crearne una scheda, mai creazione automatica di un elettrodomestico generico.
- Dati documento: data di dichiarazione, impresa installatrice, descrizione del lavoro, potenza impegnabile con unità e ruolo corretti.
- Oggetto/impianto: identità e descrizione proponibili; niente marca/modello/seriale inventati.
- Spesa: nessuna, perché un prezzo non è presente. Possibile costo dichiarato dall’utente, con le regole già definite.

## Stati UI

Distinguere chiaramente: invio fallito; lettura in corso; documento riconosciuto con proposte pronte; documento riconosciuto senza oggetti/spese pertinenti; dati parziali con campi evidenziati; documento illeggibile; tipo ancora da chiarire. Un APE o una planimetria senza articoli è un risultato valido; una conformità impianto non deve essere presentata come file indecifrabile. Se la classificazione locale è assente ma quella AI è disponibile, usare la proposta AI nella stessa revisione senza richiedere una seconda scelta.

## Corpus sintetico obbligatorio prima del rilascio

| Caso | Risultato atteso |
|---|---|
| Fattura singola | Identità, prezzo e acquisto; oggetto + spesa proposti |
| Ordine ritagliato con prezzo barrato | Prezzo attuale distinto, data assente, niente data inventata |
| Ordine senza prezzi | Oggetti, nessuna spesa automatica |
| Più articoli, uno estraneo | Esclusione indipendente e costo escluso |
| Bolletta con arretrati/canone | Spesa casa, componenti distinti, nessun oggetto |
| Etichetta apparecchio | Identità/seriale/caratteristiche, niente acquisto presunto |
| Conformità impianto elettrico | Tipo tecnico, casa/impianto, date e potenze nei ruoli giusti |
| Rapporto manutenzione | Oggetto esistente/intervento, data attività distinta da acquisto |
| APE / planimetria / SCIA | Tipo e dati casa; nessun apparecchio inventato |
| Regolamento condominio | Archivio condominio; nessuna spesa/oggetto richiesto |
| PDF misto testo e scansioni | Controllo pagina per pagina, nessuna pagina ignorata |
| Dati ambigui o illeggibili | Proposte parziali e motivi specifici; nessuna fabbricazione |

Questa è una matrice di accettazione da implementare, NON una suite già eseguita. Valutare separatamente classificazione, completezza dei campi leggibili, esattezza/attribuzione, dati inventati, quantità di correzioni utente, costo e latenza. Le prove offline del codice non misurano l’accuratezza reale del modello. Il confronto provider richiederà futuro consenso specifico per i test a pagamento.

## Ordine di sviluppo proposto

1. Registro unico tipi documento e semantica dei fatti, mapping sui campi esistenti, adattatore retrocompatibile per vecchie bozze.
2. Estrattore generalista compatto e validazione per campo, con errori essenziali bloccanti e dati opzionali scartati esplicitamente.
3. Raccordo classificazione AI → archivio → revisione oggetto/impianto/spesa; UI senza passaggi extra e stati chiari.
4. Corpus sintetico, controlli offline/DB/browser; poi un piccolo collaudo reale autorizzato con misure, prima della diffusione.

Non modificare vecchie conferme, oggetti o spese per migrare una proposta; recuperi e chiavi restano stabili. Budget residuo e consenso UI invariati.

## Riferimenti tecnici primari

Anthropic PDF support: https://platform.claude.com/docs/en/build-with-claude/pdf-support — lettura visuale e testuale delle pagine. Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs — forma dell’output e limiti di complessità; JSON valido non garantisce completezza o correttezza semantica.
