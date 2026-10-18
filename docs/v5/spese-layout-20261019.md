# Spese desktop/mobile — 19 ottobre 2026

## Organizzazione confermata

Implementata la proposta approvata con la correzione esplicita del committente: il grafico Distribuzione rimane visibile anche in Registrazioni. Su desktop è affiancato all’elenco; su mobile segue le righe, con lo stesso ordine nel DOM e nella navigazione da tastiera. Legenda azionabile, cambio Famiglie/Categorie e calcoli dal riepilogo server conservati. Riepilogo mantiene confronto e viste di dettaglio. Nessun calcolo sul solo insieme di righe caricate.

Totale/periodo anticipati, ricerca sempre visibile con invio esplicito, famiglie in selettore compatto Tipo di spesa. Due viste principali Registrazioni e Riepilogo; raggruppamenti per oggetto/lavoro ancora accessibili. La vista predefinita per una nuova sessione senza preferenza è Registrazioni; URL e preferenza account/casa precedenti continuano a prevalere. Filtri avanzati mantenuti con conteggio; ricerca privata nello stato di navigazione, mai nella query URL. Totale senza finanziamenti mostrato soltanto quando differisce, senza cambiare i calcoli.

Registra una spesa apre il manuale; Altre modalità rende disponibile il percorso da documento esistente. Collegamenti e note sono facoltativi e richiudibili nel modulo; si aprono con un costo esistente, preset o errori pertinenti. Data della spesa chiarisce la data che determina il periodo, senza trasformarla in data di pagamento. Nel dettaglio: Costo non attribuito a un oggetto quando manca un’attribuzione.

## Ritorno al contesto

Filtro e ricerca restano associati all’account. L’apertura di una riga salva ID, posizione e pagine già caricate nello stato della cronologia. Link di ritorno e Indietro ripristinano ricerca, filtri, focus e posizione. Se la cache è scaduta, si ricostruiscono soltanto le pagine già viste, attendendo il riepilogo prima di ripristinare il layout. Se la riga non esiste più, focus al titolo della lista e scroll limitato dal browser. Nessun nuovo storage persistente per la ricerca.

## Verifica e limiti

63 test mock Spese/S1c/consensi passati, più regressione mirata di ricerca e ritorno paginato ripetuta dopo l’allineamento finale. Backend simulato: nessuna chiamata AI reale. Test di navigazione con 22 spese e rimozione della cache verificano filtro, testo privato, due pagine ricostruite e focus/scroll. Typecheck, lint e build frontend eseguiti.

Browser con API reali: desktop 1440×1024 e mobile 390×844, ricerca fattura, ritorno dal dettaglio con link e Indietro, filtro Manutenzione e riparazioni conservato, ritorno a 656 px con focus sul risultato. Verificati grafico per famiglie/categorie, Riepilogo e confronto, apertura/annullamento del manuale senza scritture. Misura finale mobile: nessun overflow orizzontale. Nessun originale personale aperto o analisi avviata.

Non collaudati telefono fisico, screen reader o rete degradata; nessuna attestazione WCAG. Grafico e lista rispecchiano le regole economy-v1 già esistenti (riepilogo delle spese attive), non pagamenti o budget. API, schema, quote AI e dati invariati. Modifiche legacy locali escluse.
