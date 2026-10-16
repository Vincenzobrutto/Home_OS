# Fase 0 — UX del recupero account e copione della prova personale · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Fase0-UX-20261016.md`. Consegna solo documentale.

- **Proposte.** Il recupero dell'accesso e la verifica email **non esistono nel prodotto**: tutto ciò che li riguarda qui è una proposta.
- **Contratto.** Il contratto di riferimento è la proposta Codex `docs/v5/fase0-recovery-design-20261016.md`, letta dal master `6719e25`. Non è un'API disponibile.
- **Nessuna implementazione.** Nessuna modifica al prodotto. Lo sviluppo frontend parte solo con un nuovo incarico Codex.

Legenda delle basi:
- **B-reale:** osservato nel browser sul prodotto reale `127.0.0.1:5174`, 16/10 alle 09:55–09:58, con un account e file sintetici;
- **C:** verificato nel codice della baseline `cbc5fb8`;
- **S:** simulato nel mockup;
- **I:** opinione UX.

## Sintesi

1. **Recupero accesso.** Il percorso proposto ha sette schermate (R1–R7), dieci stati d'errore (E1–E10) e cinque schermate di verifica email (V1–V5). Tutto è navigabile in `mockup.html` a desktop, 390 e 320 px. Tre principi:
   - **una sola risposta neutra** a ogni richiesta: non dice mai «email inviata», non rivela se l'account esiste;
   - **un solo stato** «Link non più valido» per scaduto, usato o inesistente;
   - **nessun accesso automatico** dopo il reset: si torna al login normale, e l'utente è avvisato prima che tutte le sessioni verranno chiuse.
2. **Prova personale.** Il copione è stato percorso per intero sul prodotto reale con file sintetici: caricamento, «Solo io», download con impronta identica, collegamento all'oggetto, spesa, PNG archiviato, HEIC e file da 21 MiB rifiutati. Funziona. Prima di usare documenti veri mancano però alcune **aspettative dette al punto d'uso**, soprattutto una: **oggi un documento caricato non si può eliminare** [C].

## Consegna 1 — Recupero dell'accesso

### Percorso principale (S)

| # | Schermata | Contenuto essenziale |
|---|---|---|
| R1 | Accedi | Pagina esistente più il collegamento «Hai dimenticato la password?» sotto la password. Oggi manca [B-reale, `screenshots/01-login-attuale-1280.png`] |
| R2 | Recupera l'accesso | «Scrivi l'email con cui hai creato l'account. Se è associata a un account Dimora, ti invieremo un link per scegliere una nuova password.» Pulsante «Invia il link», poi «Torna all'accesso» |
| R3 | Controlla la tua email | Risposta identica per qualunque indirizzo, con l'indirizzo **scritto dall'utente** in grassetto. «Il link vale 30 minuti e si usa una volta sola. Se richiedi più link, usa quello arrivato per ultimo.» Riquadro «Non arriva?» (spam, indirizzo, attesa); «Invia di nuovo» disponibile dopo 60 s; «Usa un altro indirizzo» (`screenshots/03-mockup-r3-1280.png`) |
| R4 | Email dimostrativa | Oggetto «Scegli una nuova password per Dimora». Nessun nome di casa, documento o dato personale. «Se non hai chiesto tu il recupero, ignora questa email: la tua password attuale resta valida.» «Aprirlo non cambia nulla.» |
| R5 | Scegli una nuova password | Un campo, regole identiche alla registrazione (12–128 caratteri, spazi conservati), pulsante «Mostra». Avviso **prima** del salvataggio: «Per sicurezza chiudiamo l'accesso a Dimora su tutti i dispositivi, compreso questo.» |
| R6 | Password aggiornata | «La nuova password è attiva. Abbiamo chiuso l'accesso su tutti i dispositivi.» Pulsante «Vai all'accesso». Nessun accesso automatico |
| R7 | Accedi | Login normale con il banner «Password cambiata». Il campo email non è precompilato: il client conosce solo il token |

### Matrice degli stati

| Codice | Situazione | Risposta del server (dalla proposta Codex) | Cosa vede l'utente |
|---|---|---|---|
| E1 | Credenziali errate al login | 401 attuale, «Email o password non validi.» | Stesso messaggio più il collegamento «Hai dimenticato la password? Recupera l'accesso»; l'email scritta passa a R2 |
| — | Richiesta con un'email registrata o no | 202 neutro | R3, identica nei due casi |
| E5 | Email scritta male | Validazione nel client o 422 | Errore sul campo: «Scrivi un indirizzo email completo, per esempio nome@esempio.it.» Nessuna richiesta parte |
| — | Email corretta nella forma ma sbagliata (refuso) | 202 neutro | R3 con l'indirizzo in evidenza e «Verifica di aver scritto l'indirizzo giusto · Usa un altro indirizzo» |
| E4 | Invio ripetuto | 202 neutro; il limite per indirizzo resta silenzioso | «Richiesta registrata. Se l'indirizzo è associato a un account, riceverai un nuovo link. Usa quello arrivato per ultimo.» |
| E5 | Troppe richieste dalla stessa connessione | 429 | «Abbiamo ricevuto troppe richieste da questa connessione. Attendi qualche minuto e riprova.» |
| E3 | Canale email guasto | 503 uniforme | «In questo momento non riusciamo a inviare le istruzioni. Riprova tra qualche minuto.» L'email resta nel campo |
| R5 | Link aperto | Nessuna chiamata che consumi il token | Modulo della nuova password |
| E8 | Link aperto mentre si è connessi con un altro account | Nessuna chiamata | «Sei già connesso come … Per scegliere una nuova password con questo link, esci prima da questo account.» «Esci e continua» oppure «Resta connesso». Il link non viene consumato e non si dice a quale account appartiene |
| E6 | Password non valida | 422 sul campo | «Usa almeno 12 caratteri.» Focus sul campo; il link resta valido |
| E2 | Link scaduto, usato, revocato o inesistente | `recovery_invalid` | «Link non più valido. Il link è scaduto, è già stato usato oppure non è completo.» Poi «Se hai già scelto una nuova password, prova ad accedere con quella.» «Chiedi un nuovo link», poi «Torna all'accesso» |
| E7 | Rete persa durante il salvataggio | Esito sconosciuto | «Esito non confermato: la password potrebbe essere già cambiata. Riprova con lo stesso pulsante; se il link risulta non più valido, prova ad accedere con la nuova password.» |
| R6 | Reset riuscito | 204, sessioni revocate | R6 e poi R7 |
| E9 | Altro dispositivo dopo il reset | 401 alla prossima chiamata | Login con «La sessione su questo dispositivo è terminata, per esempio dopo un cambio password. Accedi di nuovo per continuare.» Le bozze non salvate si perdono, come oggi alla scadenza della sessione [C: `LoginPage` mostra già «Accesso richiesto» con `?next`] |
| E10 | Registrazione con email già usata | 409 attuale, «Registrazione non completabile con questi dati.» [C: `auth.service.ts:39`] | Stesso messaggio più «Se hai già un account, accedi oppure recupera l'accesso», senza confermare che l'account esiste |
| — | Casella email persa | Nessuna operazione | In R2 e R3, dettaglio richiudibile: «In questa versione il recupero avviene solo tramite la casella email dell'account. Dimora non può riattivarlo con un nome, un altro indirizzo o documenti della casa.» Nessun reset amministrativo |

### Verifica dell'email per i nuovi account del pilota (S)

| # | Schermata | Contenuto |
|---|---|---|
| V1 | Dopo la registrazione | Banner su `/case`: «Conferma la tua email. Ti abbiamo chiesto di confermare *indirizzo*: apri il link che riceverai. Serve per recuperare l'accesso e per caricare documenti.» Casa, Attività e Spese restano usabili. Mostrare il proprio indirizzo all'utente autenticato è corretto |
| V2 | Documenti prima della conferma | «Carica documento» resta visibile e porta a una spiegazione con «Invia di nuovo il link», non a un 403 generico |
| V3 | Invio ripetuto | Risposta neutra; «Il link vale 24 ore». «L'indirizzo è sbagliato?» → oggi non modificabile: crea un nuovo account (scelta aperta 2) |
| V4 | Email e conferma | Il link conferma l'indirizzo, non cambia la password e non crea una sessione nuova. Link scaduto: «Link non più valido. Accedi e chiedi un nuovo link di conferma.» |
| V5 | Account esistente non verificato | Nessun badge «verificato» inventato e nessun blocco retroattivo. Prima di caricare: «Email non ancora confermata. Se dimentichi la password, il recupero funziona solo se l'indirizzo dell'account è corretto e lo ricevi. Conferma ora.» |

## Consegna 2 — Copione della prova personale

**Quando usarlo.** La prova con documenti veri **non è ancora pronta**: secondo `fase0-prerequisiti-20261016.md` mancano il recupero dell'accesso e una seconda destinazione per il backup. Il copione serve per quel momento. Oggi l'ho percorso con dati sintetici.

| # | Passo | Cosa dire o mostrare prima | Cosa controllare | Base |
|---|---|---|---|---|
| 1 | Nuovo account separato, non quello di sviluppo | «Usa un account solo per questa prova.» In futuro: conferma dell'email (V1) | Si arriva su «Inizia con Dimora» | B-reale; verifica S |
| 2 | Crea la casa | «Nome e indirizzo descrivono la casa: non sono una prova di proprietà.» (testo esistente) | Si arriva in Casa | B-reale |
| 3 | Carica un **PDF testuale non delicato**, per esempio un manuale o una garanzia | Avviso P1: documenti non delicati, **non si possono eliminare**, conserva l'originale | «Documento caricato» con il link «Apri il documento» | B-reale (avviso S) |
| 4 | Verifica «Solo io» | — | Il dettaglio mostra «Solo io» e «Solo tu puoi vedere e scaricare…»; «Solo io» è già la scelta predefinita | B-reale |
| 5 | Scarica l'originale e controlla a vista | «Il file scaricato resta sul tuo dispositivo.» | Il file si apre ed è lo stesso. Nella prova: impronta SHA-256 mostrata = file locale = file scaricato (`c0c31e2a…`) | B-reale |
| 6 | Crea l'oggetto e collega il documento | — | «Collegato da te a questo oggetto»; collegarlo non cambia la visibilità | B-reale |
| 7 | Registra una piccola spesa dall'oggetto | «È un costo registrato, non un pagamento.» (testo esistente) | Oggetto preselezionato; ritorno alla scheda con «Costo registrato: 12,00 €» | B-reale |
| 8 | Carica una **foto JPEG o PNG** | «Le foto vengono conservate, ma Dimora non ne legge il contenuto.» (S) | Archiviata con «Solo io»; il dettaglio **non offre** «Analizza questo documento» (osservato su PNG) | B-reale |
| 9 | Aspettative sui file non adatti | Vedi tabella seguente | — | misto |
| 10 | Esportazione | «Lo ZIP contiene solo gli originali che selezioni.» (P2) | Solo documenti; attività, spese e oggetti esclusi | B-reale (testo S) |
| 11 | Fine | «Esci» quando hai finito; i dati restano | Dopo il rientro tutto è dove l'avevi lasciato | B-reale (sessioni precedenti) |

**Cosa non fare nella prova:**
- non avviare analisi («Analizza documenti» o «Analizza questo documento»): nessun provider;
- non caricare documenti d'identità, sanitari o bancari;
- nessuna condivisione esterna;
- non chiedere credenziali o documenti al committente.

**Aspettative sui file:**

| File | Comportamento | Base | Testo proposto |
|---|---|---|---|
| HEIC (foto iPhone) | Rifiutato prima dell'invio con «Formato non supportato: puoi caricare PDF, JPEG o PNG.» | B-reale | Aggiungere: «Le foto di iPhone in formato HEIC vanno prima salvate come JPEG.» |
| Oltre 20 MiB | Rifiutato prima dell'invio con «Il file pesa 21 MiB: il limite per file è 20 MiB.» | B-reale | Va già bene |
| PDF scansionato (solo immagine) | Accettato e conservato. «Analizza questo documento» è offerto per ogni PDF, ma l'estrattore legge solo il testo PDF (`fase0-prerequisiti`) | C; analisi non provata | Prima di analizzare: «Se il PDF è una scansione, Dimora potrebbe non leggerne il contenuto.» |
| PDF protetto da password | Comportamento all'analisi non verificato; il caricamento dipende dal riconoscimento dei byte | C/I | Aspettativa: «conservato, non leggibile». Da confermare nei test Codex |
| JPEG/PNG | Archiviati, nessuna analisi offerta | B-reale (PNG) | Nota sotto il campo file (P1) |

**Export.**
- **ZIP selettivo (esiste):** fino a 50 originali e 100 MiB [B-reale, C].
- **Esportazione completa dei dati (non esiste):** attività, spese, oggetti, collegamenti, provenienza. Non va promessa, e così la cancellazione automatica o la conservazione per un periodo definito [`fase0-prerequisiti`].

## Raccomandazioni nuove (8)

### FASE0-UX-01 · P1 · Ingresso al recupero da login, errore e registrazione duplicata
- **Problema.** Oggi chi dimentica la password non ha nessuna uscita [B-reale]: la pagina «Accedi» offre solo «Crea un account locale di sviluppo».
- **Natura.** Capacità assente; proposta.
- **Soluzione.**
  - Collegamento sotto la password (R1).
  - Collegamento dentro il banner d'errore 401 (E1), con l'email già scritta che passa a R2 in memoria, mai in URL.
  - Uscita da E10.
- **Accettazione.** Da R1, E1 ed E10 si arriva a R2 in un clic o un tasto. Nessun testo conferma che l'account esiste.

### FASE0-UX-02 · P1 · Una sola risposta neutra, mai «email inviata»
- **Problema.** Senza una regola di testo è facile scrivere «Ti abbiamo inviato un'email», che rivela l'esistenza dell'account e promette un invio non certo.
- **Natura.** Scelta UX richiesta dal contratto.
- **Soluzione.**
  - R3 identica per ogni indirizzo, con l'indirizzo scritto dall'utente in evidenza per accorgersi dei refusi.
  - Indicazioni «Non arriva?».
  - «Invia di nuovo» dopo 60 s e «Usa quello arrivato per ultimo».
  - La stessa R3 dopo un limite per indirizzo; 429 solo per la connessione; 503 uniforme.
- **Accettazione.** Test HTTP e browser: testo e stato identici fra email registrata e non registrata. Nessuna stringa «inviata/inviato» nelle schermate di recupero.

### FASE0-UX-03 · P1 · Avviso prima della chiusura di tutte le sessioni, niente accesso automatico
- **Problema.** La revoca delle sessioni è corretta ma, se arriva di sorpresa, l'utente perde il contesto su altri dispositivi senza capire perché.
- **Natura.** Scelta UX.
- **Soluzione.**
  - Avviso in R5 prima del salvataggio.
  - R6 esplicita, poi R7 con «Password cambiata».
  - Sugli altri dispositivi E9 con un testo neutro.
  - E7 per l'esito non confermato.
- **Accettazione.**
  - Dopo il reset nessuna sessione resta valida, compresa quella del browser in uso.
  - La pagina successiva è il login.
  - Il retry dopo un esito sconosciuto non mostra mai un errore senza la via d'uscita «prova ad accedere con la nuova password».

### FASE0-UX-04 · P1 · Link non più valido unico; link aperto con un altro account connesso
- **Problema.** Distinguere fra link scaduto e link usato rivelerebbe informazioni. Completare un reset mentre si è dentro un altro account crea confusione su quale account cambia.
- **Natura.** Scelta UX richiesta dal contratto (stesso `recovery_invalid`).
- **Soluzione.** E2 unico con «Chiedi un nuovo link». E8: se una sessione è attiva, chiedere «Esci e continua» senza consumare il token né nominare l'account del link.
- **Accettazione.**
  - L'apertura GET della pagina non consuma il token.
  - Scaduto, usato e inesistente producono lo stesso testo.
  - Con una sessione attiva il salvataggio non è possibile finché l'utente non esce.

### FASE0-UX-05 · P2 · Verifica email del pilota spiegata al punto d'uso, senza blocchi retroattivi
- **Problema.** La proposta Codex vincola i caricamenti personali alla verifica. Un blocco senza spiegazione sembrerebbe un errore. Gli account esistenti non devono ricevere badge o blocchi inventati.
- **Natura.** Scelta UX per una capacità proposta.
- **Soluzione.**
  - V1: banner dopo la registrazione.
  - V2: «Carica documento» spiega il motivo invece di un 403.
  - V3, V4: risposte neutre e conferma senza nuova sessione.
  - V5: limite detto agli account preesistenti.
  - Il banner attuale «Solo sviluppo locale… La verifica dell'email non è ancora attiva» [B-reale] va sostituito quando la verifica sarà attiva.
- **Accettazione.**
  - Un account nuovo non verificato usa Casa, Attività e Spese, ma non arriva al modulo di caricamento.
  - Un account preesistente non perde nessuna funzione.
  - Nessuna UI mostra «verificato» senza `emailVerifiedAt`.

### FASE0-UX-06 · P1 · Prima di un documento vero: «non delicato, non eliminabile, conserva l'originale»
- **Problema.** Nella UI non c'è nessuna funzione per eliminare un documento [C: `DocumentDetailPage.tsx` offre scarica, condividi e, per i PDF, analizza; nessuna eliminazione]. Chi prova con un documento vero non lo sa. Il backup è solo locale (`fase0-prerequisiti`): l'utente deve conservare il proprio originale.
- **Natura.** Aspettativa mancante: rischio di fiducia, non un difetto del codice.
- **Soluzione.** Avviso compatto nel modulo di caricamento per gli account del pilota (P1): documenti non delicati, esempi da evitare, non eliminabile, conserva l'originale.
- **Accettazione.**
  - L'avviso è visibile prima di scegliere il file, a 320 px senza scorrimento orizzontale, e non ripetuto altrove.
  - Il testo cambia quando esisteranno eliminazione o archiviazione dei documenti.

### FASE0-UX-07 · P2 · Foto, HEIC e scansioni: dire cosa Dimora non legge
- **Problema.** Il messaggio HEIC è corretto ma non dice come rimediare [B-reale]. Foto e scansioni sono conservate ma non lette, e oggi non è detto da nessuna parte. «Analizza questo documento» compare su ogni PDF, anche scansionato [C].
- **Natura.** Testo mancante. Il comportamento è corretto: il PNG non offre l'analisi [B-reale].
- **Soluzione.**
  - Frase HEIC aggiuntiva.
  - Nota sotto il campo file.
  - Prima dell'analisi di un PDF: «Se il PDF è una scansione, Dimora potrebbe non leggerne il contenuto.»
  - Coordinare con BL-04: la foto è acquisizione, non OCR (`home-release-piano`).
- **Accettazione.**
  - Un HEIC mostra la frase di rimedio.
  - Nessun testo promette la lettura di foto o scansioni.
  - Un PDF scansionato analizzato produce un esito «nessun dato letto», non dati inventati (test Codex con il campione negativo).

### FASE0-UX-08 · P2 · Export: dire cosa contiene lo ZIP e cosa non esiste ancora
- **Problema.** «Esporta ZIP» non dice che esclude attività, spese, oggetti e collegamenti [B-reale]. Durante una prova personale l'utente potrebbe crederlo un backup completo.
- **Natura.** Testo mancante.
- **Soluzione.** Riga sotto «Esporta ZIP» (P2): «Lo ZIP contiene solo gli originali che selezioni… L'esportazione di tutti i tuoi dati non è ancora disponibile.» Da aggiornare quando arriverà il pacchetto JSON.
- **Accettazione.** Il testo è visibile vicino al pulsante e non promette conservazione né cancellazione.

## Limiti

- Recupero e verifica sono simulati nel mockup: nessun invio email, nessuna API. Durate di 30 minuti e 24 ore e attesa di 60 s sono **proposte** da allineare al contratto definitivo.
- Prova personale: solo file sintetici (PDF testuale da 688 B, PNG 1×1, HEIC finto, PDF da 21 MiB di zeri). Nessuna analisi. Non provati: PDF scansionato, PDF protetto, telefono fisico.
- Nessuna dichiarazione WCAG, nessuna prova con screen reader. Focus nel mockup sul contenitore della schermata.
