# S1a/b — backend economico, consegna del primo blocco

14 ottobre 2026. Implementazione della baseline congelata `3c6aa59`. Non dichiara completo S1: S1c (bozze da documento) e frontend operativo restano da sviluppare.

## Cosa funziona

- API economy-v1 per capacità, costi, dettaglio, modifica, archivio/ripristino, storia e riepilogo; lavori personali con creazione, modifica, archivio/ripristino, storia e paginazione.
- Categorie/metadati/workId sullo stesso HomeExpense canonico; famiglie derivate, nessun secondo registro. Migrazione additiva applicata soltanto a `dimora_v5_product_dev`, localhost:55432, dopo guard dedicata.
- SQL parametrico con filtri combinati, ricerca letterale titolo/fornitore, paginazione keyset e raggruppamenti prima della risposta. Totali SQL bigint esposti come stringhe di centesimi, confronto per data di riferimento e stesso periodo precedente.
- Famiglie riparazione con/senza lavoro, finanziamenti e polizze esplicite, other/null distinti. Lavoro archiviato mantiene costi e famiglia; rimozione esplicita del lavoro cambia famiglia con storia, senza cambiare importo.
- Mutazioni S1 usano il motore transazionale H3a: membership, CAS, idempotenza, costo/metadati/collegamento G1/eventi nella stessa transazione. Lock Home G1 prima del lock account/Home sulle operazioni spese, per coerenza con le mutazioni di oggetti.
- Snapshot economici conservati nella storia; riferimenti non più autorizzati redatti in lettura e replay. Correzione importo tramite vecchia API H3a resetta amountOrigin, preservando gli altri metadati e la storia. JSON H3a invariato.
- Capabilities dichiara `history:true`, `works:true`, `documentDrafts:false`. Analisi economica disabilitata esplicitamente, senza fallback o chiamata paid.

## Prove

- Build e lint backend superati.
- Suite offline completa: 86 test passati, compresi cinque nuovi test dominio S1.
- Suite integrazione completa: 119 test passati su PostgreSQL/HTTP reali, compresi 17 casi S1. Suite precedenti identity/M2/M3/H1/H2/H3/G1 verdi.
- Ulteriore collaudo HTTP contro il processo API registrato su 3001, dopo il riavvio: cinque test passati, con nuovi account/casa sintetici e cleanup delimitato.
- Importi grandi 3.999.999.996 centesimi, base confronto vuota/anno0001, famiglie, archivio lavori, CAS tra vecchia e nuova API, idempotenza concorrente, fonte oggetto revocata, paging oltre prima pagina e contesto account verificati.
- Un primo test della storia assumeva che il primo evento fosse quello più recente semanticamente, pur usando un clock fisso e timestamp identici. Corretto il test per selezionare l'evento pertinente; l'ordine pubblico at/id rimane quello del contratto. Successiva suite completa verde.
- Nessuna chiamata Anthropic del prodotto; i nuovi test verificano il numero di tentativi invariato. Nessun reset database, main o push.

API locale ripristinata dal launcher senza intervento umano; PostgreSQL e Vite esistenti conservati. Il frontend React e il mockup ufficiale non sono stati riscritti per questa consegna: le nuove funzioni del backend non sono ancora esposte nell'app proprietario operativa.

## Dashboard Claude separata

Consegna `30728a7`, raccolta come `8ea9a57`. File originale/report/script/screenshot conservati; copia servita su `/proposta-dashboard-spese.html`, storage distinto. Non sostituisce la Home ufficiale.

Codex ha riprodotto tramite clic browser: legenda Bollette -> tre righe e 187,90 EUR; ritorno alla panoramica con periodo e totale conservati; selettore Categorie -> legenda Assicurazione -> una riga 180 EUR -> ritorno. A 320 px documento 305 px, nessun overflow osservato; nessun errore console nei percorsi provati. Questa verifica supera il limite dichiarato da Claude delle sole interazioni attivate via script, ma non è un collaudo completo della variante.

Proposta da valutare: Panoramica come vista aggiuntiva con scelta persistente della vista, senza passaggio automatico in base al numero di costi. La raccomandazione di Claude di cambiare automaticamente ingresso non è adottata: una navigazione stabile è più prevedibile. La scelta finale di pagina iniziale resta al committente. Su mobile il grafico richiede scorrimento; legenda testuale resta essenziale e non si dichiara conformità WCAG.

## Lavoro ancora necessario

S1c job/draft/fonti e conferma atomica, prima con fixture offline; integrazione frontend/client, vista economica per oggetto e lavori e collaudo browser del runtime reale. Nessuna analisi di bollette reale o nuovo budget paid autorizzato da questa consegna. Congelamento wire invariato; implementazione parziale esposta correttamente tramite capabilities.
