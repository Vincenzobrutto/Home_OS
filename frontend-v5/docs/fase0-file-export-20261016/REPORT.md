# Fase 0 — UX di documenti, controllo file ed esportazione · 16/10/2026

Consegna A dell'incarico `Dimora-V5-incarico-Claude-Fase0-file-export-20261016.md`, versione aggiornata alle 11:02. Contiene solo documenti e un mockup: nessuna modifica al prodotto. La consegna B è in `CORPUS-REVIEW.md`.

## Baseline

| Voce | Valore |
|---|---|
| Worktree | Creato da `1e13e43`, come richiesto dalla prima versione dell'incarico. Non l'ho ricreato né riallineato (vedi «Aggiornamento operativo» dell'incarico) |
| Prima versione di questo report | Commit `9a65fec`, alla baseline `1e13e43` |
| Riferimento attuale | Master `9aafd79`, letto **in sola lettura** |

Dal master ho letto:
- `docs/v5/fase0-file-control-esito-20261016.md`;
- `docs/v5/personal-export-api-contract.md`;
- le modifiche a `documents-api-contract.md` e `fase0-export-design-20261016.md`;
- `backend-v5/src/documents/file-control.ts`;
- `frontend-v5/src/api/client.ts`.

Cosa è cambiato fra `1e13e43` e `9aafd79`:
- **Controllo dei nuovi file: attivo nel backend** (`f4efb57`). Il controllo è fatto con Defender durante l'invio e il documento viene ammesso solo con un esito valido.
  - Codici: `503 file_check_unavailable` e `503 storage_capacity_low`. In entrambi i casi nessun documento viene creato e si riprova con la stessa chiave.
  - Il contratto pubblico non cambia: la ricevuta del controllo resta interna.
  - I documenti già caricati non sono stati controllati e non vanno presentati come tali.
- **Frontend invariato:** non gestisce ancora i nuovi codici (FE-UX-02).
- **Export personale:** contratto `personal-export-v1` scritto ma **non attivo**.
  - `POST /homes/:homeId/personal-export` restituisce direttamente il file JSON `dimora-casa-<UUID>-dati.json`.
  - Errori: `413 personal_export_too_large`, `503 personal_export_busy`, `503 personal_export_unavailable`.
  - Il viewer non può esportare.
  - Nessun nome, UUID o **conteggio** delle risorse escluse.
- **Corpus:** invariato fra le due baseline. La consegna B vale per entrambe.

Ho rivisto tre proposte della prima versione perché non compatibili con quanto implementato:
- lo stato «File non accettato» o «segnalato»: Defender non distingue in modo affidabile rilevamento ed errore;
- la riga «Controllo superato» sul documento: non è un campo pubblico;
- il riepilogo con il numero di riferimenti esclusi: il contratto vieta i conteggi dei dati altrui.

Legenda delle basi:
- **B-reale:** osservato oggi su 5174 nella sessione Fase0-UX, runtime `cbc5fb8`, dati sintetici. Non ripetuto qui.
- **C:** verificato nel codice di `9aafd79`.
- **K:** contratto documentale non attivo.
- **P:** proposta.

## Mockup

`mockup.html` è autonomo, senza risorse esterne, con dati sintetici. Ha 20 schermate:

| Gruppo | Schermate | Cosa mostrano |
|---|---|---|
| Caricamento e controllo | D1–D7 | Modulo; invio e controllo in corso; caricato; controllo non completato; spazio insufficiente; esito davvero ignoto; rifiuti con rimedio |
| Lettura e dettaglio | D8–D9 | Archiviare non è leggere; dettaglio documento |
| Esportazione | X1–X10 | ZIP esistente; posizione; cosa contiene; preparazione e download; scaricato; troppo grande; occupato, non disponibile, esito ignoto; ZIP con originale mancante; accesso revocato; sola lettura |
| Riferimento | MX | Matrice dei codici, attivi e da contratto |

**Verifica in Chrome headless a 1280, 390 e 320 px, su tutte le 20 schermate:**
- nessuno scorrimento orizzontale e nessun elemento oltre il riquadro;
- testo minimo 12 px;
- focus sul contenitore a ogni cambio schermata;
- ordine dei tab su D4: file → titolo → «Riprova» → «Annulla», con indicatore di focus da 3 px;
- nessun errore in console.

Non è una dichiarazione WCAG. Screenshot: `screenshots/01-mockup-d4-1280.png`, `screenshots/02-mockup-x3-320.png`.

## Testi principali

| Stato | Testo |
|---|---|
| Avviso pilota, una volta nel modulo | «**Prova personale:** usa documenti non delicati. Un documento caricato **non si può eliminare** in questa versione: conserva anche il tuo originale. I nuovi file vengono controllati con Microsoft Defender di questo computer: secondo le impostazioni di Windows, Microsoft può ricevere informazioni o campioni dei file.» |
| Aiuto del campo file | «PDF, JPEG o PNG, massimo 20 MiB. Foto e PDF scansionati vengono conservati, ma Dimora non ne legge il contenuto.» |
| Invio in corso | «Caricamento e controllo del file in corso… Dimora controlla il nuovo file prima di salvarlo. Può richiedere qualche secondo.» |
| Caricato | Testo esistente, «Documento caricato…», **senza** alcuna dichiarazione sul controllo |
| `file_check_unavailable` | «**Documento non salvato.** Non è stato possibile completare il controllo del file, quindi il documento non è stato salvato. Riprova tra qualche minuto. Se succede ancora con lo stesso file, prova con un'altra copia (per esempio salvata di nuovo in PDF).» |
| `storage_capacity_low` | «**Documento non salvato.** L'archivio non ha spazio sufficiente in questo momento, quindi il documento non è stato salvato. Riprova più tardi.» |
| Esito davvero ignoto (rete, 502/504) | «Non sappiamo se il documento è stato salvato: la connessione con l'archivio si è interrotta. "Riprova invio" ripete la stessa richiesta senza creare doppioni.» |
| HEIC | Messaggio esistente più: «Le foto di iPhone in formato HEIC vanno prima salvate come JPEG (Impostazioni › Fotocamera › Formati › Più compatibile).» |
| Oltre 20 MiB | Messaggio esistente più: «Puoi dividerlo o ridurlo prima di caricarlo.» |
| PDF scansionato, prima dell'analisi | «Se il PDF è una scansione, Dimora potrebbe non leggerne il contenuto.» |
| PDF protetto | «Conservato così com'è. Dimora non può aprirlo né leggerlo.» |
| ZIP | «Lo ZIP contiene solo questi originali e un elenco con le loro impronte. Non contiene attività, spese, oggetti né collegamenti.» |
| Export, prima del download | «È una copia dei tuoi dati di questa casa al momento del download. Non cancella nulla, non trasferisce la casa, non sostituisce un backup e non si può reimportare. Se perderai l'accesso a questa casa, non potrai più esportarli.» |
| Export, esclusioni | «Riferimenti a risorse che non puoi più leggere: sono esclusi, senza nome né numero.» |
| Export, sola lettura | «Con il ruolo "Sola lettura" non puoi esportare dati da questa casa.» |

## Raccomandazioni (8)

### FE-UX-01 · P1 · Il controllo non promette nulla sul singolo file
- **Base.**
  - C/K: controllo sincrono, a prova di guasto, senza stato pubblico per documento.
  - I documenti precedenti non hanno ricevuta (`fase0-file-control-esito`).
- **Natura.** Scelta UX conforme all'implementazione.
- **Proposta.**
  - Durante l'invio, «Caricamento e controllo del file in corso…» (D2).
  - Dopo il successo, solo «Documento caricato» (D3).
  - Nessuna etichetta «controllato», «sicuro» o «innocuo» in lista, dettaglio o esito.
  - Il fatto che i nuovi file vengano controllati si dice **una volta**, nell'avviso pilota.
- **Accettazione.**
  - Nessuna stringa dell'interfaccia attribuisce a un documento uno stato del controllo.
  - Nessun testo distingue i documenti vecchi dai nuovi, perché il dato non è pubblico.

### FE-UX-02 · P1 · Difetto: i rifiuti certi del controllo vengono mostrati come «esito non confermato»
- **Base.** C a `9aafd79`.
  - `api/client.ts`: ogni 502/503/504 diventa `serviceError(status, requestId, code)`, con il messaggio generico «Il servizio Dimora non è raggiungibile in questo momento». Il messaggio del server viene scartato.
  - `DocumentsPages.tsx`: ogni errore di tipo `service` blocca il modulo e mostra «Esito non confermato … Il documento potrebbe essere già stato salvato».
  - Quindi `file_check_unavailable` e `storage_capacity_low`, per cui il server **garantisce** che nessun documento è stato creato, diventano «servizio non raggiungibile» più «potrebbe essere già stato salvato».
  - Con `storage_unavailable` il testo è anche contraddittorio: «Nessun file è stato modificato» e «potrebbe essere già stato salvato».
- **Natura.** **Difetto** nel frontend attuale rispetto al contratto aggiornato.
- **Proposta.**
  - Riconoscere `file_check_unavailable` e `storage_capacity_low` come **rifiuto certo**: banner «Documento non salvato» (D4, D5), file e titolo conservati, modulo non bloccato, «Riprova» con **la stessa chiave** come richiede il contratto.
  - Riservare D6 all'esito davvero ignoto, con un testo senza contraddizioni.
- **Accettazione.** Tre test jsdom:
  - con 503 `file_check_unavailable` compare «Documento non salvato», il modulo non è bloccato e il retry invia la stessa Idempotency-Key;
  - lo stesso con `storage_capacity_low`;
  - una rete interrotta mostra solo il testo dell'esito ignoto.

  In nessun caso compare «Documento caricato».

### FE-UX-03 · P2 · Ogni rifiuto dice causa e rimedio
- **Base.**
  - B-reale: HEIC e 21 MiB vengono rifiutati nel browser senza indicare un rimedio.
  - C: 413/415 vanno sul campo file; il file vuoto è gestito in `lib/files.ts`.
- **Natura.** Testo mancante.
- **Proposta.** I rimedi di D7. Per il 415: «Il contenuto del file non è un PDF, JPEG o PNG valido, anche se il nome lo indica.»
- **Accettazione.** Ogni rifiuto compare sul campo file, con il focus sul campo e una frase di rimedio. Il modulo non resta bloccato.

### FE-UX-04 · P1 · Avviso pilota compatto, con il limite di Defender e Microsoft
- **Base.**
  - C: la UI non permette di eliminare i documenti.
  - `fase0-file-control-esito` dice che la politica Windows può inviare dati o campioni a Microsoft e che va chiarito prima della prova con documenti personali.
  - Riprende FASE0-UX-06.
- **Natura.** Aspettativa mancante, legata alla privacy.
- **Proposta.**
  - Una riga nel modulo, sopra il campo file (D1), con quattro informazioni: non delicati, non eliminabile, conserva l'originale, Defender e Microsoft.
  - Una riga nel dettaglio sulla mancata eliminazione (D9).
  - Nessun popup e nessuna guida.
- **Accettazione.**
  - Visibile a 320 px prima del campo file e non ripetuto in lista.
  - Il testo va aggiornato se cambiano l'eliminazione o la configurazione di Defender.
  - La formulazione su Microsoft va confermata dal committente (vedi CONSEGNA).

### FE-UX-05 · P2 · Archiviare non è leggere: dirlo prima, non solo dopo l'errore
- **Base.**
  - B-reale: il PNG non offre l'analisi.
  - C: i messaggi `pdf_text_unavailable` e `pdf_encrypted` esistono (`lib/review.ts`) ma arrivano solo dopo l'avvio dell'analisi.
  - Il controllo file non verifica la leggibilità (`fase0-file-control-esito`).
- **Natura.** Testo mancante.
- **Proposta.** Frase nell'aiuto del campo file e avviso prima di analizzare un PDF (D8). Nessuna promessa di OCR.
- **Accettazione.** Nessun testo promette di leggere foto o scansioni. L'analisi di un PDF scansionato produce il messaggio esistente e nessun dato.

### FE-UX-06 · P1 · «Esporta i miei dati di questa casa» in Casa › Dettagli, con «contiene / non contiene» allineati al contratto
- **Base.** K (`personal-export-v1`) e P (posizione e testi).
- **Natura.** Scelta UX.
- **Proposta.**
  - Nessuna nuova voce di menu e nessun secondo archivio: l'azione sta nei dettagli richiudibili di Casa (X2).
  - La conferma (X3) mostra:
    - la casa in evidenza;
    - cosa contiene: nome ed email, nome e indirizzo della casa, oggetti, attività, spese e lavori propri anche archiviati, dati tecnici confermati, metadati e impronta dei propri documenti, collegamenti e storia;
    - cosa non contiene: originali (vanno nello ZIP), dati e fonti altrui, condivisioni, dati ricevuti, proposte e bozze AI, riferimenti esclusi senza nome né numero;
    - i limiti: non cancella, non trasferisce, non è un backup, non si reimporta.
  - Per il ruolo sola lettura, una spiegazione al posto del pulsante (X10).
- **Accettazione.**
  - L'azione è visibile solo con il permesso export.
  - Nessun testo usa «tutti i dati dell'account».
  - Il download parte solo dopo un clic esplicito, mai al caricamento della pagina e senza retry automatico.

### FE-UX-07 · P2 · Stati dell'export: nessun file parziale, esiti certi distinti da quelli ignoti
- **Base.**
  - K: codici 413, 503 busy e 503 unavailable, ricontrollo finale delle autorizzazioni.
  - C: regole dello ZIP «tutto o niente».
- **Natura.** Scelta UX.
- **Proposta.**
  - X4: preparazione senza barra finta. Il download parte con la risposta, senza un passaggio «pronto».
  - X5: conferma con il nome del file generato dal server e una frase generica sui riferimenti esclusi.
  - X6: dati troppo grandi.
  - X7: tre esiti distinti — occupato (riprova a breve), non disponibile (nessun file creato), rete interrotta (esito ignoto, si può riprovare).
  - X8: ZIP con originale mancante, rifiutato per intero.
  - X9: accesso revocato o contesto cambiato.
  - Attenzione: il client oggi trasforma ogni 503 in errore generico di servizio. Va adattato come in FE-UX-02, altrimenti «occupato» e «non disponibile» diventano «servizio non raggiungibile».
- **Accettazione.**
  - In nessun errore si scarica un file.
  - I codici busy e unavailable hanno testi propri.
  - Nessun conteggio o nome di risorsa esclusa compare nell'interfaccia.

### FE-UX-08 · P2 · Lo ZIP dice cosa contiene e rimanda all'export dei dati solo quando sarà attivo
- **Base.** B-reale: il testo attuale indica solo i limiti tecnici.
- **Natura.** Testo mancante; riprende FASE0-UX-08.
- **Proposta.**
  - In X1: «Lo ZIP contiene solo questi originali e un elenco con le loro impronte…».
  - Il rimando «I tuoi dati di questa casa si esportano da Casa › Dettagli della casa» compare **solo** quando l'endpoint sarà dichiarato attivo.
- **Accettazione.**
  - Il testo è accanto al pulsante.
  - Nessuna promessa di backup, conservazione o cancellazione.
  - Il rimando è assente finché la funzione non è attiva.

## Lasciare com'è

- «Solo io» predefinito.
- Idempotenza con «Riprova invio» e «Modifica e invia come nuovo» per l'esito davvero ignoto.
- Rifiuti di HEIC e 20 MiB già nel browser.
- ZIP «tutto o niente».
- Nessuna analisi sulle immagini.
- Messaggi `pdf_*` esistenti.

## Limiti

- **Controllo file:** il comportamento del server l'ho dedotto dal codice e dal rapporto Codex. Non l'ho riprodotto nel browser: provocare un guasto di Defender non è ammesso e non ho usato la sessione del committente.
- **Export:** è solo contratto; il mockup non prova nulla sul server.
- Dati del mockup sintetici.
