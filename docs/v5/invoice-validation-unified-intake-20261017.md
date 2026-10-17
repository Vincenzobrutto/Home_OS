# Ricevuta tabellare e caricamento integrato — 17 ottobre 2026

## Modifiche realizzate

Validazione locale estesa per riga «Ricevuta d’acquisto» con data completa univoca e tabelle con quantità nella prima colonna/articolo nella seconda. Richieste citazioni reali, pagina corretta, un solo prodotto corrispondente nella tabella. Date multiple/produzione/consegna prevista, quantità dell’altra riga, testo inventato, unità sbagliate e totale diverso restano rifiutati. Nessuna cifra ricavata dalla semplice prima occorrenza di un numero. Log del validatore: solo campo/motivo da enum, non il testo citato. Il rifiuto complessivo evidence_unverified resta attivo: non vengono pubblicati campi non verificati come ripiego.

Sulla ricevuta personale è stato costruito IN LOCALE un candidato con valori esplicitamente stampati: parser reale e validatore ora accettano data/quantità/totale. Non è la risposta Anthropic precedente né una nuova estrazione AI; non è stato pubblicato o salvato nella bozza dell’utente. La causa esatta del vecchio rifiuto non è dimostrabile dal reply non conservato.

Caricamento: il riquadro reale oggetti/spesa si apre nella stessa pagina sotto ricevute/fatture/documenti prodotto e foto, dopo acquisizione e classificazione pertinenti. Documenti solo casa restano documentali. Proposte salvate e job in corso si riprendono senza avviare un’altra analisi; parametri oggetti-documento/oggetti-bozza/oggetti-analisi separati da lotto/filtri. Un documento non disponibile non mostra contenuti o proposte in cache. Nessun fetch verso Anthropic è avviato dal rendering: resta necessario consenso esplicito e campagna abilitata prima dell’invio.

Conferma coordinata per documento nuovo/proposta chiara: «Conferma documento e articolo» prima organizza il documento, poi conferma oggetto/costo con i controlli e la transazione onboarding esistenti. Le due fasi NON sono una transazione unica. Documento incerto → zero comandi oggetto/spesa. Documento già applicato → viene riusato; se oggetto/costo richiedono correzioni il documento resta archiviato e la bozza da riprendere. Copie/conflitti/tipo sconosciuto richiedono revisione esplicita, non vengono autorizzati automaticamente dalla conferma dell’oggetto. Ricerca candidati e avviso di possibili corrispondenze, nessuna preselezione della scheda esistente. Conferma parziale, rinvio e chiavi stabili restano disponibili.

## Verifiche e prove

38 test offline distinti sul dominio/provider/profilo/ricevuta (5nuovi),16 DB/HTTP e37 FE distinti sui componenti/container interessati (3nuovi), inclusi contenitori. Non sommare le esecuzioni sovrapposte. Il primo test PDF sintetico ha evidenziato una differenza tipografica dell’apostrofo nel parser: corretto il test per citare il testo realmente estratto, senza rilassare la verifica delle citazioni. Fallimenti iniziali dei test recupero sono stati risolti mantenendo la conferma incerta e mostrando errori di preparazione come errori applicativi controllati.

Nuovi casi: PDF sintetico fisico con parser reale, tabella più articoli/corrispondenza unica/quantità sbagliata, data acquisto/ambiguità, testo contraffatto e diagnosi priva di contenuto; proposte inline senza POST esterno prima del consenso, conservazione lotto/filtri nel passaggio job→bozza, archiviazione con risposta503 seguita da recupero con STESSA chiave e singola creazione oggetto, fonte non accessibile, ripresa automatica di una bozza senza altro job. Build backend/frontend, TypeScript e lint mirati verdi.

Browser IAB reale: casa sintetica604f1dea, lotto71719998-40b1-4a3c-a3d4-a9a2139ec7ea, riquadro ricevuta aperto nella pagina caricamento, ripresa bozza2a9e8aab senza cambio route né nuove risorse. OggettoA già confermato e articoloB da riprendere visibili, nessuna nuova conferma eseguita. Mobile390 client375/scroll375,320 client305/scroll305; select a320 da177px dopo riduzione riquadri annidati. Viewport ripristinato. Screenshot outputs/onboarding-oggetti-20261017/10-caricamento-integrato.png ispezionato. Cattura09 mobile non usata: immagine del browser ridimensionata incoerentemente; layout verificato sulle dimensioni DOM, non presentare quella cattura come prova grafica affidabile. Safari fisico non collaudato.

## Stato e limiti

Nessuna nuova chiamata AI/email/paid, modifica.env/quote/segreti, reset DB, push o messaggio a Claude. Vecchia analisi reale della fattura rimane fallita, costo0.023952USD, non reinviata né trasformata in successo. Provider disabilitato. Nessuna nuova spesa/oggetto/documento personale creato. API aggiornata solo dal launcher registrato, ingresso telefono mantenuto.

Prossimo: prova del caricamento integrato con il committente. Una nuova lettura reale della fattura richiede autorizzazione separata; i test locali non dimostrano quale output restituirà il provider. Non attribuire alla correzione la capacità di ricostruire una risposta perduta. Recupero riferimento prodotto/help rimangono rinviati come richiesto.
