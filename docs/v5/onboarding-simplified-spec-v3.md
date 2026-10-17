# Onboarding documenti e oggetti — revisione UX V3

Approvata il 17 ottobre 2026 dopo navigazione del mockup `mockup-onboarding-semplificato.html` e verifica degli undici scenari. Integra V2 dell'intake e il contratto object-onboarding esistente; non li sostituisce sul piano delle autorizzazioni o delle scritture.

## Flusso consolidato

Un ingresso per uno o più documenti. Classificazione locale automatica disponibile, originale conservato, nessun invio a un provider implicito. Riutilizzare analisi e proposte già autorizzate; una nuova analisi esterna resta soggetta a consenso, disponibilità e budget.

Mostrare un elenco compatto degli articoli: nome, identità rilevata, costo proposto solo se documentato e stato. Azione Rivedi apre una sola revisione, a schermo intero su mobile. Nessuna cascata di schede annidate. Separare documento archiviato da articoli ancora da confermare, rinviati ed esclusi. Dati facoltativi, fonti ed evidenze accessibili su richiesta.

Scelte per articolo: nuova scheda, collegamento a una scheda esistente, Non riguarda questa casa. L'esclusione non crea oggetti, legami o spese e non elimina l'originale. Se il primo articolo crea una scheda, gli articoli successivi devono poterla trovare tramite i candidati autorizzati correnti, mai attraverso nomi o opzioni statiche del mockup.

Marca e modello noti sono precompilati come proposte modificabili. Campo vuoto ammesso quando non identificabile. Correzioni manuali distinte dalle evidenze. Riferimento prodotto, garanzia e dettagli tecnici richiamabili da Altri dati. Informazioni contestuali tramite pulsante i. Per dati già confermati conservare i controlli di conflitto/versione server; nessuna sovrascrittura silenziosa.

Una sola conferma visibile applica l'articolo e l'eventuale spesa e, quando necessario e consentito, prepara prima l'organizzazione del documento. La preparazione del documento e la conferma oggetto/costo non costituiscono una nuova transazione globale: un fallimento successivo può lasciare il documento archiviato, con articolo ancora da riprendere. Mostrare questo esito senza dichiarare l'intero percorso completato. Conservare idempotency key, corpo immutabile e recupero della ricevuta per risposte perse.

Selezione multipla inizialmente vuota, disponibile solo per proposte correnti e pronte. Niente selezione persistente dopo cambio account/casa/versione e nessuna selezione di un rinviato. Le proposte con ambiguità o controllo duplicati incompleto richiedono revisione. Nessun passaggio Salva scelta → riepilogo → applica. Chiudi non applica né salva silenziosamente modifiche: chiedere se scartare. Decidi più avanti persiste attraverso il percorso server esistente.

## Matrice di comportamento

APE e documenti di casa: organizzazione per tipo/destinazione, nessun oggetto o costo necessario. Scansioni: originale apribile e compilazione manuale, nessuna evidenza inventata. Copie: mantenere o aggiornare con consenso/versione, unico originale. Ordine di consegna senza prezzo: soltanto oggetti. Fattura con singolo acquisto e prezzo/data validati: spesa proposta, conferma unica. Costo già presente: riuso esplicito, nessun nuovo costo. Foto etichetta: dati leggibili e riferimento, nessuna data d'acquisto o spesa inventata. Rinvio: ripresa dopo reload. Multiplo: selezione parziale, esiti distinti.

## Differenze fra mockup e contratto operativo

- Il backend protegge i valori già confermati permettendo attualmente mantieni/deferisci; il mockup esplora anche sostituzioni esplicite. Non inviare un'azione di sostituzione non supportata: la modifica della scheda deve passare dal proprio contratto versionato o da un'estensione separata, con test.
- Prezzi delle singole righe, ripartizione manuale del totale e costo di accessori collegati non sono deducibili dal totale d'ordine. Oggi la conferma spesa onboarding è supportata per un solo articolo/esemplare. Mantenere l'accesso a Spese per i casi multiarticolo; non moltiplicare il totale né attribuire agli inclusi la quota degli esclusi. L'eventuale estensione deve modellare quote in centesimi e fonti e verificare le somme anche sul server.
- Le nuove categorie ordine/consegna/etichetta del mockup non sono tipi documentali API già disponibili. Non simulare il salvataggio di quei tipi né chiamare fattura una consegna. Classificazione AI e organizzazione locale restano distinguibili finché non viene esteso il vocabolario del contratto.
- Il tema Luce indaco appartiene alla proposta visiva; la prima integrazione usa i token del prodotto esistente.

## Verifiche richieste per l'integrazione

Componenti: elenco/revisione e campi precompilati, conferma singola/multipla, esclusione, nuova scheda visibile ai candidati dopo conferma, duplicati/errori di lettura, rinvio, consenso/versioni, perdita della risposta e stessa chiave, privacy/cambio contesto. Build/lint e regressioni intake/onboarding. Browser reale con proposte sintetiche già presenti, nessun nuovo invio AI. Prove del mockup non equivalgono a prove provider, API o DB.
