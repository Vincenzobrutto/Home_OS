# Documenti: collegamento diretto, titoli e coda — 21 ottobre 2026

## Comportamento implementato

- Nei documenti senza proposta di spesa, il selettore «A cosa si riferisce?» permette di conservare il documento nella casa oppure collegarlo direttamente a un oggetto/impianto esistente. Non serve compilare un nuovo articolo. Selezione e bozza non creano collegamenti: la conferma riusa l’organizzazione documenti, con controlli di fonte, versione e accesso. La scelta torna nella bozza; un riferimento cambiato o non più disponibile richiede una nuova scelta. I percorsi di riuso delle copie mantengono il consenso esistente.
- Per nuove fatture con titolo generico, proposta iniziale con numero, fornitore e dicitura esplicita acconto/saldo. Sigle brevi degli schemi diventano un titolo leggibile. Titoli descrittivi, organizzazioni già salvate e modifiche dell’utente non vengono sovrascritti; nessuna rinomina retroattiva.
- Categoria suggerita soltanto se manca e c’è un unico riferimento proposto, con precedenti spese leggibili dello stesso intervento (fornitore esatto normalizzato e almeno due parole distintive comuni). Tutti i precedenti pertinenti devono concordare su una categoria ammessa; conflitti, dati mancanti o ricerca troncata non producono categoria. La scelta resta modificabile e cancellabile; nessuna nuova analisi AI.
- I nuovi gruppi conservano l’ordine dei file scelti nella coda, con numerazione coerente desktop/mobile e indicazione «Documento N di M». La ricerca dell’archivio non nasconde i file del gruppo appena caricato, mentre il ritorno conserva i filtri originali. Gli ingressi dall’archivio mantengono il suo ordinamento; la coda usa le pagine caricate, con «Altri documenti» disponibile.
- Anteprima PDF ruotabile a passi di 90°, rispettando la rotazione incorporata nel file. Solo visualizzazione: nessuna modifica all’originale, al suo hash o al download. Compila/Originale mobile conserva i dati.

## Verifiche

Frontend: 127 casi in 11 suite mirate, build TypeScript/Vite e lint. Backend: 15 casi su bozza, privacy del riferimento e categorie/suggerimenti, build e lint. Le suite simulano anche riferimento obsoleto, cancellazione deliberata della categoria, originali già ruotati e coda indipendente dalla ricerca.

Browser desktop 1440×1000 e mobile 390×844 su casa dedicata con soli dati fittizi: due PDF tecnici e una fattura sintetica, un impianto e un costo precedente. Il caricamento della proposta di fattura è una fixture controllata, non un’estrazione AI.

1. Schema: scelta dell’impianto, rotazione dell’anteprima, salvataggio del solo documento; avanzamento al secondo file.
2. Relazione non classificata: titolo/tipo e impianto scelti su mobile, bozza salvata e ripresa. Controllo DB prima della conferma: nessun collegamento o costo prematuro. Conferma e avanzamento al terzo file.
3. Fattura: titolo proposto con numero/fornitore, impianto esistente e categoria proposta dal precedente. Titolo modificato conservato passando Compila/Originale; conferma dell’acconto.
4. Risultato: un solo impianto, tre originali con hash invariati, due collegamenti tecnici espliciti, una sola nuova spesa da 250 € oltre al precedente sintetico di 500 €. Tutti i documenti completati, consultabili dalla scheda, fattura raggiungibile anche dal costo. Apertura della relazione verificata su mobile.

Nessun nuovo job AI o costo provider. Account/casa/storage di prova separati; nessuna scrittura sui dati personali. Confronto canonico in sola lettura della casa personale prima/dopo: invariato. Evidenze e report cronologico locali nella conversazione, fuori da Git.

## Limiti e seguito

Il fallimento AI `analysis_invalid_output` osservato nel precedente collaudo sui cinque originali resta da analizzare offline: questa modifica semplifica il fallback, non migliora il modello né allenta i validatori. Non implementata la priorità separata delle proposte di collegamento all’interno dello stesso lotto. Acconto/saldo restano spese distinte, senza contabilità di rate o attestazione di pagamento. L’ordine della coda è conservato per i nuovi gruppi tramite il loro URL; non cambia l’ordinamento globale dell’archivio.
