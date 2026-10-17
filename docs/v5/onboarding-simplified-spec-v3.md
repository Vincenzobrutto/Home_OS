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

## Contratto operativo consolidato — 17 ottobre 2026

- Sostituzione dei dati: `fields.<campo>={action:"replace",expectedValue:"valore attuale",consent:true}`. Richiede proposta server esistente, valore attuale corrispondente, fonte autorizzata e versione della scheda corrente. Nessun valore o fonte sostitutiva fornito dal client. Keep/defer restano disponibili. Marca/modello aggiornati anche nei campi base; evento prima/dopo conservato.
- Fattura multiarticolo: nessun prezzo di riga derivato dal totale. Quote manuali con `expense.manualItemAmount:true`, centesimi interi e totale documento validato disponibile. Somma delle quote dello stesso originale <= totale, anche in conferma multipla e fra bozze; originale/hash, oggetto e ricevuta di conferma impediscono doppioni. Un costo precedente non ripartito richiede riuso. Articoli esclusi non producono costo; il resto del totale resta non attribuito. Un esemplare per quota: quantità maggiori si completano separatamente in Spese. Più quote dello stesso originale sullo stesso oggetto richiedono gestione esplicita in Spese.
- Vocabolario: ordine di acquisto, conferma consegna/spedizione, etichetta prodotto e documento di acquisto generico appartengono ad Acquisti e garanzie. Nessuna consegna viene chiamata fattura. Classificatore locale con testo riconoscibile; immagini/scansioni non acquistano OCR locale.
- Quando manca la proposta locale, un tipo riconosciuto nella bozza oggetti già disponibile può essere proposto nella stessa conferma: acquisto, consegna, etichetta. Organizzazione dichiarata/confermata dall'utente, senza citazioni inventate. Solo originale leggibile non duplicato, non rinviato, non già organizzato, senza decisioni salvate o lavoro incerto. Copie/conflitti restano revisioni individuali. La proposta locale valida ha precedenza.
- Il tema Luce indaco rimane una proposta visiva; il prodotto usa i token V5.

## Verifiche richieste per l'integrazione

Componenti: elenco/revisione e campi precompilati, conferma singola/multipla, esclusione, nuova scheda visibile ai candidati dopo conferma, duplicati/errori di lettura, rinvio, consenso/versioni, perdita della risposta e stessa chiave, privacy/cambio contesto. Build/lint e regressioni intake/onboarding. Browser reale con proposte sintetiche già presenti, nessun nuovo invio AI. Prove del mockup non equivalgono a prove provider, API o DB.
