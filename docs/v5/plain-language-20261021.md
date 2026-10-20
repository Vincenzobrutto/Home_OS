# Testi tecnici più semplici — 21 ottobre 2026

## Testi applicati

Verificati contratto sharing-v1 e ShareItem: il percorso destinatario espone attualmente originali documentali scelti dal mittente, non oggetti o spese. Documenti ricevuti sostituisce Consegne ricevute nel menu account, nella pagina senza case, nel titolo dell’elenco, nei ritorni e nelle istruzioni del mittente. Elenco e dettagli usano Documenti da… e condivisione al posto del sostantivo consegna. Rimangono espliciti accesso temporaneo, mancato accesso alla casa, consenso e accettazione separati. Nessun cambio di endpoint /consegne, permessi o stato degli inviti.

Dimensioni mostrate in unità decimali: KB = 1.000 byte, MB = 1.000.000 byte. KB arrotondati all’intero, MB a una cifra decimale; file molto piccoli restano in B. Un unico formatter serve archivio, dettaglio, caricamento/organizzazione e limiti AI. Corretto l’esempio numerico discusso: 387,5 KiB = 396.800 byte ≈ 397 KB, non 388 KB. Non è una variazione del file.

Limiti leggibili: circa 21 MB per file, circa 105 MB per ZIP; gruppi di caricamento circa 210 MB e classificazione locale circa 10,5 MB. Per l’analisi i limiti dinamici continuano a provenire dalle capabilities e sono convertiti per la sola presentazione. Restano 20.971.520 byte per upload, 104.857.600 per ZIP e gli altri limiti originali in byte/pagine/token. Nessuna estensione delle quote e nessuna modifica ai payload o alla validazione server.

## Verifiche

94 test mirati superati complessivamente su conversione dimensioni e confini esatti, client documenti, revisione, analisi con provider simulato, creazione casa, documenti e condivisioni. I test di attesa dell’elenco case sono stati resi robusti a un render intermedio: interrogano il DOM corrente dentro waitFor anziché conservare un elemento già smontato. La suite relativa è stata ripetuta ed è passata (9/9); nessun comportamento applicativo modificato per adeguarlo al test. Build TypeScript/Vite e lint superati; warning Vite preesistente sul bundle principale.

Browser reale desktop e mobile 390×844: etichetta Documenti ricevuti, elenco vuoto, ingresso codice e ritorno senza inviare nulla; archivio con bolletta mostrata a 397 KB; apertura/chiusura caricamento con limite circa 21 MB. Nessun overflow orizzontale nelle viste provate. Non sono stati selezionati file, accettati inviti, esportati documenti o avviate analisi. Nessuna modifica ai dati reali. Evidenze locali nella chat, outputs/plain-language-20261021. Bozze rimandate; legacy locale preservato.
