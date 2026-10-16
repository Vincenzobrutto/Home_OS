# Home — verifica finale dell'esperienza · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Home-rifinitura-finale-20261016.md`. Questa è una simulazione cognitiva esperta, non una ricerca con persone reali. Non contiene percentuali di abbandono, tempi umani o frequenze.

## Sintesi

**Home è pronta per chiudere il ciclo.** Nei tre scenari non ho trovato P0 né P1. I rilievi nuovi sono cinque: due P2 e tre P3, tutti piccoli e verificabili.

Gli interventi già applicati funzionano nel prodotto reale:
- ingresso con codice senza creare una casa;
- azioni e scadenze prima dei riepiloghi;
- dettagli richiudibili in fondo, chiusi all'ingresso;
- istruzioni prima di generare il codice;
- testi neutri.

Il percorso oggetto → costo → ritorno alla scheda è il punto più solido.

Restano due attriti che contano:
1. **Destinatario che rientra (FIN-001).** Una persona senza casa che ha già una consegna in corso rientra su una pagina identica a quella del primo accesso. Lì l'azione principale è ancora «Inserisci il codice».
2. **Focus dopo le azioni (FIN-002).** In quattro azioni asincrone il focus finisce sul `body`: caricamento di un documento, conferma della persona, accettazione e codice rifiutato. È lo stesso schema già corretto altrove con HOME-CONS-004.

Gli altri rilievi sono di lessico e di ordine: un termine incoerente nell'avviso di Casa, le azioni rapide non omogenee e la posizione dell'avviso di conferma su mobile.

## Ambiente e basi delle osservazioni

| Voce | Valore |
|---|---|
| Prodotto osservato | `http://127.0.0.1:5174/` con backend V5 reale, servito dal checkout master |
| Baseline runtime | `42a4b47`. Alle 08:15 il master è passato a `92112e1`, che cambia solo due test e un documento (`createHome.test.tsx`, `review.test.tsx`, `docs/v5/home-collaudo-funzionale-20261016.md`). Il runtime è identico prima e dopo, quindi nessuna osservazione dipende dal commit |
| Finestra delle prove | 08:08–08:19 (Europe/Rome) |
| Account | Due account sintetici nuovi, registrati con il modulo ordinario `/registrati`: proprietario «Verifica Rifinitura A» (`home-fin-a-…@example.test`) e destinatario «Verifica Rifinitura C» (`home-fin-c-…@example.test`). Credenziali non riportate |
| Dati creati via UI | Casa `0d3ecbea-7cbe-406f-87a3-90faa7c30db4` «Casa Rifinitura», con: attività, oggetto, documento, costo e condivisione (ID completi in `CONSEGNA.md`) |
| Browser | Chrome headless con profilo separato, guidato via CDP con clic e tasti reali |

Il documento caricato è un PDF sintetico vuoto di 193 byte, generato per la prova. La condivisione esterna è stata accettata dal destinatario sintetico.

Il driver ha impostato due cose via script, senza toccare localStorage né i dati: la viewport, e data e categoria con il setter nativo seguito dall'evento `change`.

Legenda delle basi: **B-reale** = browser sul servizio reale · **B-harness** = backend simulato (non usato in questo giro) · **C** = verificato nel codice della baseline · **I** = opinione o ipotesi UX.

## Esito dei tre scenari

### A — Primo accesso, proprietario senza dati

| Domanda | Esito | Base |
|---|---|---|
| Distingue creazione casa e ricezione codice? | Sì. «Inizia con Dimora» presenta le due intenzioni nel sottotitolo; prima viene la scheda «Hai ricevuto un codice?», poi «Crea la tua prima casa». A 320 px il modulo casa è sotto la prima schermata (titolo a y≈710 su 640 px di viewport), ma il sottotitolo lo annuncia | B-reale |
| Tastiera | Tab dal titolo: «Inserisci il codice» → «Consegne ricevute» → nome → indirizzo; Invio crea la casa e porta il focus sul titolo di Casa | B-reale |
| Dopo la creazione sa da dove iniziare? | In gran parte sì: «Da dove vuoi iniziare?» è la prima scheda. Le tre azioni però mescolano nomi e verbi e non includono il promemoria (FIN-004) | B-reale |
| Stati vuoti | Casa vuota mostra ancora quattro contatori a 0 e tre totali a 0,00 €: è il residuo di HOME-CONS-009 in Casa, non un rilievo nuovo | B-reale |
| Originale, oggetto, attività, spesa | Ogni destinazione è chiara e porta il focus al punto giusto: Documenti → «Carica documento»; Oggetti → «Aggiungi oggetto»; «Nuova attività» apre il modulo; «Registra una spesa» apre il modulo con il focus sul titolo. Il promemoria creato compare in Casa come «1 in programma» con la data | B-reale |
| Ritorno a Casa | Sempre disponibile dalla navigazione laterale o in basso (voce Casa) e da «Cambia casa»; Oggetti ha anche «← Casa». Il dettaglio attività torna ad Attività, non a Casa, ma è un ritorno coerente | B-reale |

### B — Utente che ritorna, casa popolata

| Domanda | Esito | Base |
|---|---|---|
| Ordine e densità | `/` porta direttamente in Casa, focus sul titolo. Ordine: azioni → «Da fare ora» (scadenze, Da rivedere, Condivisioni) → «La tua casa» → dettagli chiusi. Le informazioni statiche non precedono più le azioni | B-reale |
| Scadenze e verifiche | «Promemoria personali con la data scelta da te. Non sono obblighi di legge.» Corretto, nessuna promessa normativa | B-reale |
| Contesto oggetto → costo → ritorno | «Registra un costo per questo oggetto» preseleziona l'oggetto e mostra la famiglia prevista; dopo il salvataggio si torna alla scheda dell'oggetto, che elenca il costo. Ottimo | B-reale |
| Ritrovare un documento | Il collegamento «Cerca documenti» porta il focus nel campo; la ricerca «garanzia» trova il file; il dettaglio mostra visibilità, versione e spese collegate. Dal documento non si vede l'oggetto collegato: è HOME-CONS-014, rinviato | B-reale |
| Spese: famiglie, viste, periodo vuoto | Nelle sei famiglie più Non classificata, un periodo o una famiglia senza costi mostra «Nessun costo registrato nel periodo con questi filtri», con il periodo nel titolo e «Azzera filtri». Si distingue dalla casa senza dati | B-reale |
| Esiti e salvataggi | Attività, oggetto e costo portano a una pagina con il nuovo stato e il focus sul titolo. Il caricamento del documento mostra «Documento caricato» con il link, ma il focus va perso (FIN-002) | B-reale, C |
| Condivisione da confermare | L'avviso compare in Casa senza nomi né codici e sparisce dopo la conferma. Usa però «codice di verifica» invece di «codice di confronto» (FIN-003) ed è terzo in «Da fare ora» (FIN-005) | B-reale, C |
| Barra fissa a 390 e 320 px | Non copre l'ultima scheda né i dettagli aperti (fondo dei dettagli a 698 contro barra a 782 a 390 px; 494 contro 578 a 320 px). Nessuno scorrimento orizzontale | B-reale |

### C — Destinatario senza casa

Catena reale completa: invito esterno del proprietario → nuovo account senza casa → codice → confronto → conferma del mittente → accettazione → consultazione. Non risulta già eseguita oggi su browser reale: il collaudo Codex del 16/10 la dichiara non ripetuta.

| Domanda | Esito | Base |
|---|---|---|
| Trova «Inserisci il codice» senza il modulo casa? | Sì, è la prima azione della pagina, anche a 390 px | B-reale |
| Abbinamento, confronto, attesa, accettazione | Chiari. La pagina codice dice «prima il mittente conferma che sei tu, poi accetti l'invito». Poi «In attesa del mittente» mostra il codice di confronto: «Non vedi ancora nessun documento». L'invito da accettare dice: «Prima di accettare non vedi titoli né contenuti» | B-reale |
| Cosa consulta, per quanto, cosa non riceve | Già nell'invito: «fino a ven 23 ottobre… Non entri nella casa e non vedi altro». Nella consegna: «Puoi scaricare i file; non puoi inoltrare la consegna dentro Dimora» | B-reale |
| Codice non valido, scaduto, revocato | Un codice non valido produce un messaggio generico che non rivela nulla e suggerisce di chiedere un nuovo codice. Il codice scaduto non l'ho riprodotto: secondo il contratto riceve lo stesso messaggio. La revoca l'avevo vista sull'harness il 16/10 | B-reale / C |
| Ritrovare la consegna dopo uscita e rientro | Possibile tramite «Consegne ricevute», in testata o come link secondario. La pagina d'ingresso però non segnala la consegna in corso (FIN-001) | B-reale |

## Matrice di copertura

| Area | Desktop 1280 | 390 px | 320 px | Tastiera | Base |
|---|---|---|---|---|---|
| Pagina senza case | ✓ | ✓ | ✓ | ✓ (Tab e Invio) | B-reale |
| Casa vuota | ✓ | ✓ | ✓ | — | B-reale |
| Casa popolata | ✓ | ✓ (avviso, barra) | ✓ (barra, dettagli) | ✓ (Tab dal titolo, 18 fermate fino ai dettagli) | B-reale |
| Attività, Oggetti, Documenti, Spese | ✓ | — | — | parziale (focus dopo l'apertura) | B-reale |
| Condivisione e consegna | ✓ | ✓ (rientro) | ✓ (accettazione, nessun overflow) | focus dopo le azioni | B-reale, C |

Limiti:
- Nessuna dichiarazione WCAG.
- Nessuna prova con screen reader, telefono fisico o utenti reali.
- Nessuna analisi AI e nessun download.
- Non riprodotti: codice scaduto, revoca e scadenza reali della consegna, utente con molte pagine di condivisioni.
- Il focus l'ho misurato con `document.activeElement`.

## Rilievi nuovi

### HOME-FIN-001 · P2 · Il destinatario che rientra non vede la consegna in corso

- **Problema e impatto.** Il destinatario senza casa, dopo aver inserito il codice o accettato la consegna, esce e rientra. Il prodotto lo porta su `/case`, che mostra la stessa pagina del primo accesso. L'azione principale resta «Inserisci il codice»; «Consegne ricevute» è un link secondario nella scheda e in testata. Chi ritorna per consultare i file non riceve alcun segnale che qualcosa lo aspetta [B-reale]. Può provare a reinserire un codice già usato e ricevere «Codice non accettato» [I: non riprodotto].
- **Scenario e viewport.** C, desktop e 390 px.
- **Passaggi.** Account senza case → codice → mittente conferma → «Accetta» → Esci → Accedi.
- **Osservato.** h1 «Inizia con Dimora», h2 «Hai ricevuto un codice?» e «Crea la tua prima casa»; nessun riferimento alla consegna accettata, consultabile fino al 23/10 (`screenshots/03-destinatario-rientro-390.png`).
- **Atteso.** Se esistono consegne ricevute, la pagina lo dice e porta a «Consegne ricevute» come azione principale. L'ingresso codice e la creazione casa restano disponibili.
- **Natura.** Scelta UX residua dell'arbitrato (proposta 2), non un difetto rispetto al contratto.
- **Soluzione minima.**
  - In `Onboarding` (`HomesPages.tsx`) usare l'hook esistente `useReceivedShares` (`sharing/hooks.ts:83`) già usato da `ReceivedListPage`.
  - Se la prima pagina contiene almeno una consegna non terminata (`awaiting_confirmation`, `pending`, `accepted`), mostrare in cima «Hai consegne ricevute» con il pulsante principale «Apri le consegne ricevute». «Inserisci il codice» diventa secondario.
  - Solo la presenza nelle pagine caricate: nessun numero globale, nessun nome del mittente nella pagina case, nessun reindirizzamento automatico (alternativa già scartata in HOME-CONS-001).
  - Caricamento o errore della lettura: la pagina resta com'è oggi, senza dedurre che non ci siano consegne.
- **Criterio di accettazione.**
  - Con una consegna accettata o in attesa, `/case` mostra l'avviso e il pulsante principale porta a `/consegne`.
  - Senza consegne, o con errore della lettura, la pagina è identica a oggi.
  - Nessuna richiesta di creazione casa.
- **Collegamenti.** HOME-CONS-001 (applicato per il primo accesso); arbitrato, «Tre proposte», punto 2.

### HOME-FIN-002 · P2 · Il focus finisce sul body dopo caricamento, conferma, accettazione e codice rifiutato

- **Problema e impatto.** Dopo quattro azioni asincrone il controllo premuto viene disattivato o smontato e il focus cade sul `body`. Chi usa la tastiera ricomincia dalla cima della pagina («Vai al contenuto»). Il contenuto dell'esito resta visibile e, dove c'è `role=status` o `role=alert`, annunciabile.
- **Scenario e viewport.** A, B e C, desktop.
- **Osservato** (`document.activeElement` dopo l'azione) [B-reale]:

  | Azione | Pagina | Causa nel codice [C] |
  |---|---|---|
  | «Carica documento» | Documenti; il banner «Documento caricato» compare | `DocumentsPages.tsx` 133–136: `setUploadOpen(false)` smonta il modulo |
  | «Conferma la persona» | Condivisione del mittente; lo stato diventa «Invito da accettare» | — |
  | «Accetta» | Consegna del destinatario | `ReceivedPages.tsx:249` disattiva il pulsante e poi lo stato cambia |
  | «Invia il codice» con codice non valido | Pagina codice; l'alert compare | `ReceivedPages.tsx:173`: pulsante disattivato durante l'invio |

- **Atteso.** Dopo l'esito il focus va su un elemento visibile e pertinente; non resta sul `body`.
- **Natura.** Difetto di interazione. Stesso schema di HOME-CONS-004, che `useUpdateFocus` ha corretto solo in attività, review e scheda caldaia.
- **Soluzione minima.**
  - Upload: focus sul banner di esito (`tabIndex={-1}`) o sul titolo della pagina.
  - Conferma e accettazione: riusare `useUpdateFocus` sulla versione della condivisione o consegna, puntando al titolo o allo stato aggiornato.
  - Codice rifiutato: riportare il focus al campo codice, che ha già il messaggio associato, oppure all'alert.
  - Non spostare il focus se l'utente è già su un altro controllo.
- **Criterio di accettazione.** Nei quattro percorsi, subito dopo l'esito `document.activeElement` non è `body` ed è dentro la sezione aggiornata. Test jsdom per ciascun percorso.
- **Collegamenti.** HOME-CONS-004, ancora aperto per queste superfici.

### HOME-FIN-003 · P3 · «Codice di verifica» nell'avviso di Casa, «codice di confronto» ovunque altrove

- **Problema e impatto.** L'avviso dice «confronta il codice di verifica con lei». Tutte le altre pagine del protocollo, cioè dettaglio mittente, pagina del destinatario e aiuto prima del codice, parlano di «codice di confronto». Nel passaggio più delicato, quello in cui si riconosce la persona al telefono, due nomi diversi fanno pensare a due codici [I].
- **Scenario e viewport.** B, tutte le larghezze (`screenshots/02-casa-avviso-condivisione-390.png`).
- **Base.** B-reale; C in `CasaSharingSummary.tsx:34` (unica occorrenza di «codice di verifica» in `src`).
- **Natura.** Difetto di testo.
- **Soluzione minima.** «…confronta il codice di confronto con lei tramite un recapito che conosci già.» Così si allinea anche «contatto» a «recapito», usato nel dettaglio.
- **Criterio di accettazione.** `grep "codice di verifica" src` non trova nulla; il test dell'avviso aggiornato verifica il nuovo testo.

### HOME-FIN-004 · P3 · Le azioni rapide non sono omogenee e non includono il promemoria

- **Problema e impatto.** «Da dove vuoi iniziare?» offre «Documenti», «Registra una spesa» e «Oggetti e impianti»:
  - due voci sono nomi di pagina, una è un'azione;
  - «Documenti» apre l'elenco, non il caricamento;
  - manca l'azione per «ricordare una manutenzione», che è nella scheda scadenze («Nuova attività»). A 390 px quella scheda è sotto la prima schermata: titolo a y≈569, pulsanti dopo quattro contatori.

  Inoltre la stessa Casa ripete «Oggetti e impianti» due volte e Documenti tre volte: azione rapida, scheda «Documenti» in fondo, navigazione [B-reale]. Nessuna di queste è bloccante: ogni destinazione è a un clic dall'azione vera [B-reale].
- **Scenario e viewport.** A, desktop e 390 px (`screenshots/01-casa-vuota-1280.png`).
- **Natura.** Scelta UX, rifinitura.
- **Soluzione minima.**
  - Quattro verbi coerenti con le sezioni: «Carica un documento», «Nuova attività», «Registra una spesa», «Aggiungi un oggetto».
  - Destinazioni: `attivita?nuova-attivita=1` e `oggetti?nuovo=1` esistono già.
  - Per il documento servirebbe un nuovo parametro che apra il pannello di caricamento: decisione di Codex. In alternativa l'etichetta resta «Documenti» e cambiano solo le altre.
  - Facoltativo: togliere la scheda «Documenti» in fondo, che duplica l'azione e la navigazione.
- **Criterio di accettazione.** Le azioni rapide sono tutte verbi; ognuna apre il modulo corrispondente con il focus sul suo titolo. Con il permesso solo lettura, le azioni di creazione non compaiono, come oggi per la spesa.

### HOME-FIN-005 · P3 · L'avviso di conferma è terzo in «Da fare ora», lontano su mobile

- **Problema e impatto.** Quando una persona ha inserito il codice, il confronto ha una validità breve indicata in pagina. Nella prova il dettaglio mostrava la scadenza alle 08:30, con il codice generato alle 08:15. L'avviso in Casa però è nella terza scheda di «Da fare ora», dopo scadenze e Da rivedere. A 390 px il titolo «Condivisioni» è a y≈1185 già con Casa vuota, cioè oltre la prima schermata (844), e scende con scadenze popolate [B-reale]. Chi rientra può non arrivarci prima della scadenza; il recupero esiste («Non è la persona giusta: nuovo codice»), ma costa un altro giro [I].
- **Scenario e viewport.** B, 390 px (`screenshots/02-casa-avviso-condivisione-390.png`, dopo lo scorrimento).
- **Natura.** Scelta UX; l'avviso è corretto nei contenuti e nella privacy.
- **Soluzione minima.**
  - Solo quando l'avviso è rilevato, mostrarlo prima delle altre schede di «Da fare ora», come riga compatta con «Apri le condivisioni».
  - Nessun nuovo polling, conteggio o notifica.
  - Il riepilogo è caricato in differita: Codex sceglie se riordinare o rendere una riga separata in cima.
- **Criterio di accettazione.** Con una conferma rilevata, a 390 px l'avviso è il primo elemento di «Da fare ora». Senza conferme l'ordine è invariato.

## Rilievi precedenti ancora aperti (non nuovi)

- **HOME-CONS-009**, residuo in Casa. Casa vuota mostra quattro contatori a 0 e tre totali a 0,00 €. L'arbitrato raccomanda di semplificare solo il primo uso senza dati: in Casa non è ancora applicato. Vedi l'intervento 5.
- **HOME-CONS-013.** Il tipo di un nuovo oggetto parte preselezionato su «Elettrodomestico» [B-reale].
- **HOME-CONS-014.** Il dettaglio documento non mostra gli oggetti collegati [B-reale]. Resta proposta successiva.
- **HOME-CONS-012.** L'impronta SHA-256 è sempre visibile nel dettaglio documento [B-reale]. P3 facoltativo.

## Interventi raccomandati, per valore ed effort

1. **HOME-FIN-003.** Una parola in un file: allinea il termine del passaggio più delicato.
2. **HOME-FIN-002.** Focus dopo le quattro azioni: pattern già esistente, una modifica per superficie più i test.
3. **HOME-FIN-001.** Segnale «Hai consegne ricevute» nella pagina senza case: hook esistente, solo presenza.
4. **HOME-FIN-004.** Verbi omogenei nelle azioni rapide, con «Nuova attività»; parametri già presenti tranne quello del documento.
5. **HOME-CONS-009 in Casa.** Con casa vuota, contatori a zero sostituiti da una riga.
   - Scadenze: «Nessun promemoria. Crea il primo con Nuova attività.»
   - Spese: «Nessuna spesa registrata nel 2026.»
   - Solo quando tutti i conteggi del riepilogo server sono zero; con un errore, l'errore resta.

HOME-FIN-005 è facoltativo: va valutato insieme al 2 se Codex tocca il riepilogo condivisioni.

## Da lasciare com'è

- Pagina senza case: ordine codice → casa, testi, nessun reindirizzamento.
- Ordine di Casa: azioni → Da fare ora → La tua casa → dettagli chiusi in fondo.
- Testo delle scadenze («Non sono obblighi di legge») e di Da rivedere («I dati proposti diventano confermati solo quando li approvi tu»).
- Percorso oggetto → «Registra un costo per questo oggetto» → ritorno alla scheda, con famiglia prevista mostrata prima del salvataggio.
- Spese: messaggio del periodo vuoto con i filtri, distinto dalla casa senza dati; famiglie e viste.
- Ricerca documenti da Casa, con il focus nel campo.
- Protocollo C1a lato destinatario: i tre passaggi sono spiegati nelle parole dell'utente; il messaggio generico per codice non valido; «Prima di accettare non vedi titoli né contenuti».
- Avviso condivisioni in Casa senza nomi, codici o conteggi globali.
- Barra fissa mobile: non copre contenuti; nessun overflow a 390 e 320 px.
