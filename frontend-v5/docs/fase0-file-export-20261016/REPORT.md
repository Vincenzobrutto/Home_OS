# Fase 0 — UX di documenti, controllo file ed esportazione · 16/10/2026

Consegna A dell'incarico `Dimora-V5-incarico-Claude-Fase0-file-export-20261016.md`. Solo documenti e un mockup: nessuna modifica al prodotto. La consegna B è in `CORPUS-REVIEW.md`.

**Cosa è proposta e cosa esiste:**
- **Proposte, non API esistenti:**
  - il controllo dei file prima del salvataggio, per cui non c'è ancora un contratto;
  - «Esporta i miei dati di questa casa», proposto in `docs/v5/fase0-export-design-20261016.md` e ancora da congelare.
- **Esistenti** (contratto `documents-v1`): caricamento, limiti, idempotenza, ZIP selettivo.

**Basi delle osservazioni:**
- **B-reale:** osservato oggi su 5174 nella sessione Fase0-UX, con il runtime di `cbc5fb8` e dati sintetici. Non ripetuto in questo incarico.
- **C:** verificato nel codice della baseline `1e13e43`.
- **P:** proposta, mostrata solo nel mockup.

## Mockup

`mockup.html` è autonomo, senza risorse esterne, con dati sintetici. Ha 19 schermate in quattro gruppi:

| Gruppo | Schermate | Cosa mostrano |
|---|---|---|
| Caricamento e controllo | D1–D7 | Modulo, invio con controllo in corso, esito positivo, file non accettato, controllo non disponibile, esito non confermato, rifiuti con rimedio |
| Lettura del contenuto e dettaglio | D8–D9 | Archiviare non è leggere; dettaglio del documento |
| Esportazione | X1–X9 | ZIP esistente, posizione dell'export dei dati, conferma, preparazione, riepilogo, troppo grande, esito non noto, originale mancante nello ZIP, accesso revocato |
| Riferimento | MX | Matrice degli stati |

**Verifica in Chrome headless a 1280, 390 e 320 px, su tutte le schermate:**
- nessuno scorrimento orizzontale e nessun elemento che esce dal riquadro;
- font minimo 12 px (corretto dopo il primo controllo, che aveva trovato un'etichetta a 11 px);
- a ogni cambio schermata il focus va sul contenitore della schermata;
- ordine dei tab su D5: file → titolo → «Riprova» → «Annulla», con indicatore di focus da 3 px;
- nessun errore in console.

Non è una dichiarazione WCAG. Screenshot: `screenshots/01-mockup-d5-1280.png`, `screenshots/02-mockup-x3-320.png`.

## Testi principali

| Stato | Testo |
|---|---|
| Avviso pilota (una volta, nel modulo) | «**Prova personale:** usa documenti non delicati. Un documento caricato **non si può eliminare** in questa versione: conserva anche il tuo originale.» |
| Aiuto del campo file | «PDF, JPEG o PNG, massimo 20 MiB. Foto e PDF scansionati vengono conservati, ma Dimora non ne legge il contenuto.» |
| Invio in corso | «Caricamento e controllo del file in corso…» e poi «Dimora verifica il formato e controlla il file prima di salvarlo.» |
| Caricato | «Documento caricato … Controllo automatico superato. Non è una garanzia che il file sia privo di rischi.» |
| File segnalato | «File non accettato. Il controllo automatico ha segnalato questo file e non lo ha salvato.» Con rimedio: antivirus del dispositivo o un'altra copia |
| Controllo non disponibile | «Documento non salvato. Il controllo dei file non è disponibile in questo momento, quindi il documento non è stato salvato. Riprova tra qualche minuto.» |
| Esito incerto | «Non sappiamo se il documento è stato salvato: la connessione con l'archivio si è interrotta. "Riprova invio" ripete la stessa richiesta senza creare doppioni.» |
| HEIC | Messaggio esistente più: «Le foto di iPhone in formato HEIC vanno prima salvate come JPEG (Impostazioni › Fotocamera › Formati › Più compatibile).» |
| Oltre 20 MiB | Messaggio esistente più: «Puoi dividerlo o ridurlo prima di caricarlo.» |
| PDF scansionato (prima dell'analisi) | «Se il PDF è una scansione, Dimora potrebbe non leggerne il contenuto.» |
| PDF protetto | «Conservato così com'è. Dimora non può aprirlo né leggerlo.» |
| ZIP | «Lo ZIP contiene solo questi originali e un elenco con le loro impronte. Non contiene attività, spese, oggetti né collegamenti.» |
| Export dei dati: limiti | «È una copia dei tuoi dati di oggi. Non cancella nulla, non trasferisce la casa e non sostituisce un backup. Se perderai l'accesso a questa casa, non potrai più esportarli.» |
| Riferimenti esclusi | «1 collegamento a una risorsa che non puoi più leggere», senza nome. Nel file: «riferimento escluso» |

## Raccomandazioni (8)

### FE-UX-01 · P1 · Controllo sincrono, a prova di guasto, senza stati intermedi in archivio
- **Base.** P. I documenti Fase 0 chiedono il fail-closed sullo stato ignoto dello scanner.
- **Natura.** Scelta UX per un contratto da definire.
- **Proposta.**
  - Il controllo avviene **durante l'invio** e il documento entra in archivio solo dopo l'esito positivo.
  - Niente stato «in quarantena» visibile, niente documenti in attesa da spiegare.
  - Esiti distinti: superato, segnalato (D4), non disponibile (D5), incerto (D6).
  - Nessun testo «sicuro», «innocuo» o «verificato», e nessun nome della minaccia o dettaglio tecnico.
- **Alternativa.** Se Codex sceglie un controllo asincrono, servono uno stato «In controllo» non scaricabile e non analizzabile e una regola su cosa vede l'archivio. Va progettato prima del frontend.
- **Accettazione.**
  - Un file segnalato o un controllo non eseguibile non producono un documento leggibile.
  - L'interfaccia non mostra mai «Documento caricato» in quei casi.
  - Nessuna stringa promette l'innocuità.

### FE-UX-02 · P1 · Messaggio contraddittorio sull'esito incerto; codice distinto per il «controllo non disponibile»
- **Base.** C.
  - `api/errors.ts:39-40`: per `storage_unavailable` il messaggio è «… Nessun file è stato modificato: riprova tra poco.»
  - Nel modulo di caricamento ogni errore di tipo `service` diventa il banner «Esito non confermato», che aggiunge «Il documento potrebbe essere già stato salvato» (`DocumentsPages.tsx`, ramo `isService`).
  - Con `storage_unavailable` le due frasi compaiono insieme.
- **Natura.** **Difetto di testo** esistente, più un rischio per il nuovo controllo: un 503 «controllo non disponibile» verrebbe mostrato come esito incerto anche quando il server sa che nulla è stato salvato.
- **Proposta.**
  - Nel caricamento, per gli errori di servizio usare solo il testo dell'incertezza (D6).
  - Per il controllo non disponibile prevedere un codice che il client tratti come **rifiuto definitivo** (D5), con una nuova chiave al tentativo successivo.
- **Accettazione.**
  - Un test con `storage_unavailable` in upload mostra solo il testo dell'incertezza.
  - Un test con il codice del controllo non disponibile mostra «Documento non salvato», non blocca il modulo e non lo tratta come incerto.
  - Lo ZIP continua a usare il proprio messaggio.

### FE-UX-03 · P2 · Ogni rifiuto dice la causa e il rimedio
- **Base.**
  - B-reale: HEIC e 21 MiB rifiutati nel browser con messaggi corretti ma senza rimedio.
  - C: 415 e 413 vanno sul campo file (`DocumentsPages.tsx`); file vuoto rifiutato da `lib/files.ts`.
- **Natura.** Testo mancante.
- **Proposta.** I rimedi di D7. Per il 415: «Il contenuto del file non è un PDF, JPEG o PNG valido, anche se il nome lo indica.»
- **Accettazione.** Ogni rifiuto è sul campo file, con focus sul campo e una frase di rimedio. Nessun rifiuto lascia il modulo bloccato.

### FE-UX-04 · P1 · Avviso pilota compatto, una sola volta, nel punto in cui si sceglie il file
- **Base.** C: nella UI non esiste l'eliminazione dei documenti. Riprende FASE0-UX-06.
- **Natura.** Aspettativa mancante.
- **Proposta.** Una riga nel modulo (D1), sopra il campo file. Una riga nel dettaglio (D9). Nessun popup e nessuna guida.
- **Accettazione.**
  - L'avviso è visibile a 320 px senza scorrere oltre il campo file e non è ripetuto nella lista.
  - Il testo cambia quando esisterà l'eliminazione o l'archiviazione.

### FE-UX-05 · P2 · Archiviare non è leggere: dirlo prima, non solo dopo l'errore
- **Base.**
  - B-reale: il PNG non offre l'analisi.
  - C: i messaggi d'esito `pdf_text_unavailable` e `pdf_encrypted` esistono già (`lib/review.ts:205-206`) ma arrivano solo dopo aver avviato l'analisi.
- **Natura.** Testo mancante.
- **Proposta.**
  - Frase nell'aiuto del campo file.
  - Avviso prima di avviare l'analisi di un PDF.
  - Nessuna promessa di OCR, coerente con BL-04 «acquisizione, non lettura».
- **Accettazione.**
  - Nessun testo promette la lettura di foto o scansioni.
  - Avviare l'analisi di un PDF scansionato produce il messaggio esistente e nessun dato.

### FE-UX-06 · P1 · «Esporta i miei dati di questa casa» in Casa › Dettagli, con «contiene / non contiene» prima del file
- **Base.** P, dalla proposta `fase0-export-design`.
- **Natura.** Scelta UX.
- **Proposta.**
  - Nessuna nuova voce di menu e nessun secondo archivio: l'azione sta nei dettagli richiudibili già esistenti in Casa (X2).
  - La conferma (X3) mostra:
    - la casa in evidenza («Per un'altra casa, apri quella casa»);
    - l'ambito personale;
    - le risorse archiviate incluse se ancora leggibili;
    - le esclusioni: originali (vanno nello ZIP), dati altrui, elenco delle persone, risorse non più leggibili;
    - i limiti: non cancella, non trasferisce, non è un backup, nessun diritto dopo la perdita dell'accesso.
- **Accettazione.**
  - L'azione è raggiungibile solo dentro una casa autorizzata.
  - Il testo non usa «tutti i dati dell'account».
  - Nessun file parte senza un clic esplicito.

### FE-UX-07 · P2 · Stati dell'export senza file parziali, con riepilogo prima del download
- **Base.**
  - P per l'export dei dati.
  - C per lo ZIP: regola «tutto o niente» di `documents-v1`, con codici 413, 422, 403 e 503.
- **Natura.** Scelta UX.
- **Proposta.**
  - X4: preparazione senza barra finta.
  - X5: riepilogo con conteggi, riferimenti esclusi contati senza nome, nome del file con casa e data, formato JSON dichiarato.
  - X6: troppo grande, «nessun file creato».
  - X7: esito non noto con «Riprova» (è una lettura).
  - X8: ZIP con originale mancante o vietato rifiutato per intero, senza nominare il documento non più leggibile.
  - X9: accesso revocato.
- **Accettazione.**
  - In nessun errore si scarica un file.
  - I conteggi del riepilogo coincidono con il file.
  - Nessun nome di risorsa esclusa compare né nell'interfaccia né nel file.

### FE-UX-08 · P2 · Lo ZIP dice cosa contiene e rimanda all'export dei dati
- **Base.** B-reale: oggi il testo dice solo i limiti tecnici («ZIP con al massimo 50 documenti e 100 MiB…»).
- **Natura.** Testo mancante; riprende FASE0-UX-08.
- **Proposta.** X1: «Lo ZIP contiene solo questi originali e un elenco con le loro impronte…», più il rimando «I tuoi dati di questa casa si esportano da Casa › Dettagli della casa», solo quando l'export dei dati esisterà.
- **Accettazione.**
  - Il testo è accanto al pulsante.
  - Nessuna promessa di backup, conservazione o cancellazione.
  - Il rimando non compare finché la funzione è disabilitata.

## Lasciare com'è

- «Solo io» predefinito e la sua spiegazione.
- Idempotenza con «Riprova invio» e «Modifica e invia come nuovo».
- Rifiuti di HEIC e 20 MiB già nel browser.
- ZIP «tutto o niente».
- Assenza dell'analisi sulle immagini.

## Limiti

- Il controllo dei file e l'export dei dati non esistono: il mockup non prova il comportamento del server.
- Conteggi, nomi e impronte nel mockup sono sintetici.
- Non ho ripetuto prove sul prodotto reale in questo incarico, come richiesto: nessun uso della sessione del committente, nessun caricamento.
