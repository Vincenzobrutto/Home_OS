# Home — consolidamento UX prima delle estensioni · audit 15/10/2026

Incarico: `Dimora-V5-incarico-Claude-Home-uso-reale-e-guida.md`. È una **simulazione cognitiva condotta da un esperto AI**, non ricerca con utenti reali: non ci sono interviste, percentuali di successo o tempi di persone reali.

Ho osservato il **prodotto reale locale**: frontend `127.0.0.1:5174`, API V5 `3001`, master `5528bb7` con C1a integrato. Ho usato due account sintetici creati con la normale registrazione e una casa sintetica nuova, «Casa Audit Sintetica». In più ho creato una seconda casa sintetica per provare il cambio casa. Non ho toccato dati di altre sessioni, «Prova M4» o «Collaudo C1».

Non ho fatto chiamate Anthropic. Le proposte da documento usano solo `test_fixture_v1` con i PDF sintetici del progetto (`libretto-caldaia-demo.pdf`, `docs/v5/fixtures/s1/gas.pdf`).

**Basi della verifica**, indicate per ogni rilievo:
- **[B] osservato nel browser reale:** Chrome headless con profilo separato, clic e tasti reali via CDP;
- **[C] verificato sul codice:** `frontend-v5/src` del master, identico al mio checkout salvo i fine riga;
- **[S] verificato su specifica;**
- **[I] ipotesi UX da validare.**

## 1. Sintesi decisionale

Home funziona ed è onesta nei testi. Nei percorsi provati non ho trovato **nessun difetto bloccante (P0)**:
- spese manuali, correzione e storia;
- famiglie e filtri conservati al ritorno;
- documento → bozza → collegamento al costo esistente senza duplicato;
- proposte AI non preselezionate e confermate dall'utente;
- condivisione C1a completa con revoca;
- deep link e login con `next`;
- 403/404 su indirizzi non validi.

I contatori restano coerenti fra scheda, Casa e Attività dopo ogni conferma.

I problemi veri sono di **orientamento**, non di funzioni mancanti:

1. **Casa non dice cosa fare.** In cima mette due schede statiche, «Dati della casa» e «Permessi del tuo ruolo»; la seconda è anche contraddittoria. Non c'è un primo passo per la casa vuota, né un «da fare ora» per chi ritorna.
2. **Il destinatario esterno viene spinto a creare una casa.** Dopo la registrazione e a ogni rientro atterra su «Crea la tua prima casa». Le consegne sono raggiungibili solo da un link in testata, e un invito in attesa non viene segnalato.
3. **Restano tracce del collaudo:** codici tecnici (`ai_provider_disabled`), un testo interno sul budget della campagna, blocchi «Documenti di esempio per l’analisi di test».
4. **Le attività create da un oggetto parlano di caldaia:** «Caldaia: Nessuna caldaia collegata» per un promemoria della lavatrice.

Questi punti si correggono **nell'interfaccia**, con interventi piccoli. La guida al primo accesso proposta a parte aiuta a iniziare, ma non va usata per coprire questi problemi: il rilievo 1 si risolve in Casa, non con un tour.

## 2. Copertura degli scenari

Passaggio 1 (esplorazione) e passaggio 2 (verifica) sono distinti. Il limite dichiarato: conosco il prodotto, perché ne ho scritto parte del frontend. Nell'esplorazione ho seguito solo ciò che era visibile, senza URL nascosti, e annotato gli indizi disponibili a un principiante. I deep link li ho usati solo nello scenario 11, per verificare pagine già trovate.

| # | Scenario | Stato iniziale | Risultato | Base | Giudizio |
|---|---|---|---|---|---|
| 1 | Primo ingresso senza dati | anonimo, nessun account | `/accedi` («Entra per vedere le tue case») → registrazione locale → «Crea la tua prima casa» → Casa con 9 schede statiche. Nessuna spiegazione di cosa offra Dimora, nessun primo passo | B | Ostacolo di orientamento (001, 006) |
| 2 | Conservare e ritrovare un documento | casa vuota | Caricamento chiaro: «Solo io» predefinito, conferma con link, titolo modificabile. Ritrovato con la ricerca; il dettaglio mostra versione, visibilità e azioni. Dal documento non si vede l'oggetto collegato | B, C | Buono; rumore tecnico (SHA-256) e tracce di collaudo (003, 012) |
| 3 | Oggetti e impianti | nessun oggetto | Oggetto creato in 2 campi; la scheda separa documenti, costi e attività con azioni proprie: non è caotica. Doppio modello caldaia (oggetto «Riscaldamento» o scheda da analisi); tipo preselezionato «Elettrodomestico» | B, C | Buono; chiarire la caldaia (008) |
| 4 | Promemoria | 0 attività | Creato dalla scheda, compare in scheda, Casa («1 in programma») e Attività; completamento con pannello di conferma, contatori aggiornati. Il dettaglio dice «Caldaia: Nessuna caldaia collegata» e non nomina l'oggetto; dopo la conferma il focus va sul `body` | B, C | Difetto (002); a11y e feedback (004) |
| 5 | Proposta estratta e conferma | libretto sintetico | Modalità non preselezionata, avvio disattivato fino alla scelta, solo la prova di test. 3 proposte con fonte; accettata la marca, corretto il modello con nota obbligatoria. Dati confermati con origine; verifiche 3 → 2 → 1 coerenti in scheda, Casa e Attività | B | Buono e coerente; refuso «Modello corretta», focus perso (004, 005) |
| 6 | Spesa manuale | nessuna spesa | Registrata con 3 campi obbligatori e famiglia prevista; si apre il dettaglio. Correzione 45 → 48 € in storia; il costo compare nella scheda oggetto | B | Buono |
| 7 | Panoramica e famiglie | 3 costi, incluse rata mutuo e polizza casa | Totale 678,00 €, «senza mutuo» 228,00 €; anello con legenda; famiglie Mutuo e Tasse corrette; Riepilogo coerente. Famiglia → costo → «← Spese» conserva `vista` e `famiglia`. Testi: nota «Altro/Non classificata» in ogni famiglia, «Vedi tutte le 1 registrazioni» | B, C | Buono; refusi (005) |
| 8 | Da documento a bozza, senza duplicato | costo manuale «Bolletta gas settembre» 80 € | Prova sintetica esplicita; il possibile costo esistente è in cima, nessun importo preselezionato, fonte per ogni campo. «Collega al costo esistente» con dialogo chiaro: totale 758,00 € con 4 registrazioni, nessun secondo costo, bozza uscita da «Da confermare». Il provider reale appare come «Anthropic: non disponibile — ai_provider_disabled» | B | Buono; codice tecnico (003) |
| 9 | Preparare una condivisione | 2 documenti propri | Nessuna selezione, «Mai inclusi» scritto, differenza fra persona della casa ed esterna spiegata, manifesto del server, conferma del singolo file, codice mostrato una volta (non riportato qui) | B | Buono; durata del codice stretta per un esterno senza account (010) |
| 10 | Destinatario esterno senza casa | account nuovo | Dopo la registrazione: «Crea la tua prima casa». Consegne solo dalla testata; codice e consenso, poi solo il confronto. Il mittente al rientro non è avvisato del confronto in attesa. Il destinatario al rientro torna su «Crea la tua prima casa» con un invito da accettare. Accettazione → download 200. Revoca → «Non più disponibile» senza titoli | B | Funziona, ma l'orientamento è a rischio (001, 007) |
| 11 | Ritorno, cambio casa, ricarica, deep link | 2 case | Con 2 case si entra su «Le mie case», senza memoria dell'ultima; cambio casa chiaro, Spese della seconda casa a 0. Deep link Spese con filtri conservati; deep link da anonimo → `/accedi?next=` → destinazione; condivisione inesistente → «non disponibile»; casa altrui → «Accesso non consentito» con uscita | B | Buono; ultima casa (011) |

**Errori campionati.**
- **Nel prodotto reale:** indirizzi non validi (403/404) e inviti revocati.
- **Non provocati nel prodotto reale,** per non alterare sistemi: rete assente, permessi negati in corsa e selezione persa sono coperti dalle prove con harness simulato dei report S1c/C1 (`S1C-FRONTEND-CONSEGNA-20261015.md`, `C1-FRONTEND-CONSEGNA-20261015.md`). Restano evidenze del simulato, non del reale.

**Larghezze.** Casa vuota a 390 px, Spese/Riepilogo a 320 px e destinatario a 390 px: nessuno scorrimento orizzontale [B]. Console: nessun errore in tutti i percorsi [B].

## 3. Rilievi

Ordinati per valore e rischio. La frequenza è sempre un'ipotesi [I]. P0 bloccante · P1 alto · P2 medio · P3 basso.

### 3.1 Difetti funzionali

**HOME-CONS-002 · P2 · attività create da un oggetto con testi e dati della caldaia**
- **Evidenza [B, C]:**
  - Lavatrice → «Crea promemoria per questo oggetto»: il modulo dice «non cambia i dati della caldaia».
  - Il dettaglio dell'attività mostra «Caldaia: Nessuna caldaia collegata», «Separata dalla storia tecnica della caldaia», e non nomina la lavatrice. Anche la riga in Attività non indica l'oggetto.
  - Codice: testi statici in `activities/components.tsx:332` e `routes/ActivityDetailPage.tsx:128-153,328`; `lib/activities.ts:105`. Il dettaglio legge solo `assetLink` (M3), non i collegamenti G1.
- **Atteso:** l'attività dice a cosa si riferisce, oppure non dice nulla di sbagliato.
- **Impatto:** l'utente teme di aver collegato la cosa sbagliata. Frequenza: alta per chi usa oggetti diversi dalla caldaia [I].
- **Intervento minimo:**
  1. Testi generici («non cambia i dati dell’oggetto o della scheda»).
  2. Riga «Caldaia» mostrata solo se esiste un `assetLink`.
  3. Mostrare l'oggetto G1 collegato quando il dato è disponibile.
- **Alternativa scartata:** dedurre l'oggetto lato client cercando nei collegamenti di tutti gli oggetti. È costoso, e privato oltre il necessario.
- **API/decisione:** per mostrare l'oggetto dal lato attività serve una lettura inversa dei collegamenti G1 (attività → oggetti), da valutare per Codex. I testi si correggono subito.
- **Criterio:** promemoria creato dalla lavatrice → né il modulo né il dettaglio citano la caldaia. Se l'API c'è, il dettaglio mostra «Oggetto: Lavatrice».
- **Natura:** interfaccia.

**HOME-CONS-004 · P2 · focus perso e nessun esito dopo azioni in linea**
- **Evidenza [B]:** dopo «Conferma completamento» (attività) e «Salva decisione» (proposta), `document.activeElement` diventa il `body`. Lo stato cambia («Completata da te», «Verifiche aperte (2)») ma non compare nessun messaggio di esito.
- **Impatto:** chi usa tastiera o screen reader perde la posizione e non sente l'esito; a mobile la pagina può saltare. Frequenza: a ogni conferma [I].
- **Intervento minimo:** dopo il successo il focus va sul nuovo stato (etichetta o titolo della sezione aggiornata), con una regione `role="status"` («Attività completata», «Marca confermata»).
- **Alternativa scartata:** un toast per tutto. Non riporta il focus e scompare.
- **Criterio:** dopo ciascuna conferma il focus è su un elemento visibile della sezione aggiornata e il messaggio viene annunciato.
- **Natura:** interfaccia.

**HOME-CONS-005 · P3 · refusi e incoerenze di testo**
- **Evidenza [B, C]:**
  - «Modello corretta» (`review/components.tsx:427`, `{FIELD_LABEL} corretta` con etichetta maschile);
  - «Vedi tutte le 1 registrazioni» (`routes/SpesePage.tsx:626`);
  - la nota «“Altro” e “Non classificata” sono categorie diverse della stessa famiglia» compare anche in Mutuo e in Tasse (`economy/components.tsx:264`);
  - «Oggi è 2026-10-15» (ISO) in Spese, mentre altrove le date sono estese;
  - filtro Documenti «Condivisi nella casa» contro «Persone della casa» nel caricamento;
  - «Non disponibile: … fase successiva..» (doppio punto, vedi 003).
- **Intervento:** correzioni puntuali. La nota «Altro/Non classificata» va solo nella famiglia che le contiene.
- **Criterio:** stringhe corrette; un solo nome per la visibilità «Persone della casa».
- **Natura:** interfaccia.

### 3.2 Problemi di comprensione e navigazione

**HOME-CONS-006 · P1 · Casa non orienta, né al primo accesso né al ritorno**
- **Evidenza [B, C]:**
  - Casa vuota e Casa con dati hanno lo stesso ordine: Dati della casa → Permessi del tuo ruolo → Scadenze → Spese → Ambienti e oggetti → Impianti e verifiche → Documenti → Condivisioni (`routes/HomePages.tsx:122-170`).
  - La prima sezione utile parte a 673 px su desktop e a circa 1000 px su 390 px (`reale-1`, `reale-2`).
  - «Permessi» elenca «Modificare i dati della casa, Gestire le persone, Avviare una vendita» e subito dopo dice che arriveranno nei prossimi incrementi: contraddittorio.
  - Le verifiche aperte (1 da rivedere) stanno in basso; bozze e condivisioni in attesa non sono segnalate.
- **[S]** Il mockup consolidato da Codex (`owner-ux-consolidation-20261014.md`) prevede già una Home compatta, con azioni contestuali e verifiche aperte in alto e senza hero e contatori ripetuti. Il runtime non la segue ancora.
- **Impatto:** il nuovo utente non sa da dove iniziare; chi ritorna deve scorrere per capire cosa resta da fare. Frequenza: a ogni ingresso [I].
- **Intervento minimo:**
  - **In cima:**
    - con dati, un blocco «Da fare ora» che aggrega ciò che è già leggibile: scadenze vicine e scadute, verifiche aperte, bozze da confermare, condivisioni da confermare (007);
    - a casa vuota, tre ingressi: «Carica un documento», «Registra una spesa», «Aggiungi un oggetto».
  - **In fondo:** «Dati della casa» e «Permessi» spostati in un «Dettagli della casa» chiuso, con l'elenco ridotto a ciò che è attivo oggi.
- **Alternativa scartata:** una visita guidata che spieghi le schede. Spiegherebbe l'ordine attuale invece di correggerlo.
- **Criterio:**
  - a 390 px un'azione utile è visibile nella prima schermata senza scorrere;
  - con un'attività scaduta o una verifica aperta, l'elemento compare nel blocco in alto;
  - nessun permesso elencato come disponibile se non lo è.
- **Natura:** interfaccia. La guida è complementare.

**HOME-CONS-001 · P1 · il destinatario esterno senza casa viene spinto a creare una casa**
- **Evidenza [B]:**
  - Account appena registrato → `/case` «Crea la tua prima casa» (`reale-3`). L'unica via alle consegne è il link «Consegne ricevute» in testata, che sotto 360 px è solo un'icona con nome accessibile (`AppShell.module.css`, breakpoint 359 px) [C].
  - Al rientro, con un invito da accettare, il destinatario atterra di nuovo su «Crea la tua prima casa», senza alcun segnale.
- **Impatto:** il tecnico a cui è stato detto «inserisci il codice in Dimora» crea una casa inutile o abbandona; il codice dura 15 minuti (010). Frequenza: alta per ogni esterno [I].
- **Intervento minimo:** sulla pagina senza case, prima del modulo, una scheda «Hai ricevuto un codice da qualcuno?» con «Inserisci il codice». Il modulo casa resta sotto. Se l'elenco consegne ha inviti in attesa, una riga «1 invito da accettare» con link: lista già esistente, nessun totale inventato.
- **Alternativa scartata:** reindirizzare automaticamente a `/consegne` chi ha consegne e zero case. Sorprende chi vuole anche creare una casa e nasconde l'onboarding.
- **Criterio:**
  - account nuovo → in prima schermata, a 320, 390 e desktop, c'è «Inserisci il codice» senza aprire la testata;
  - con un invito in attesa il rientro lo segnala.
- **Natura:** interfaccia. In più c'è un aiuto contestuale «Come funziona una consegna» (vedi la guida).

**HOME-CONS-003 · P2 · codici tecnici e testi di collaudo visibili all'utente**
- **Evidenza [B, C]:**
  - «Anthropic: non disponibile — ai_provider_disabled» in Spese → Da documento (`routes/DocumentDraftPages.tsx:322` mostra `disabledReason` così com'è; il servizio vi mette un codice). La mia consegna S1c non mappava il caso: difetto mio.
  - In Attività → Nuova analisi: «Non disponibile: Le sei chiamate del collaudo iniziale sono state utilizzate. Il budget monetario residuo resta disponibile per una fase successiva..» (testo del servizio). È un'informazione interna e commerciale, con un doppio punto.
  - Blocchi «Documenti di esempio per l’analisi di test» in Documenti e in Attività, anche a un proprietario qualsiasi.
  - Termini «analisi di test», «prova tecnica… collaudo», «limite tecnico di questa versione».
- **Impatto:** sfiducia («è un prodotto finito?») e rumore; il testo sul budget rivela dettagli interni. Frequenza: a ogni apertura di Documenti, Attività e Da documento [I].
- **Intervento minimo:**
  - mappare `disabledReason` su messaggi utente, come già fa `ActivityPage.tsx:360` con `M4_ERROR_LABEL` («Analisi con AI non disponibile al momento»);
  - mostrare i blocchi di esempio solo quando il servizio dichiara un ambiente di prova (capability `isSimulation`/fixture attiva), non in base al ruolo;
  - un glossario utente per «analisi di test» → «prova con esempi».
- **API/decisione:** Codex decide se `disabledReason` resta un codice (preferibile) o diventa testo; in ogni caso il testo sul budget non va mostrato all'utente.
- **Criterio:** nessuna stringa `snake_case` o riferimento a campagne o budget visibile; blocchi di esempio assenti senza provider di prova.
- **Natura:** interfaccia.

**HOME-CONS-007 · P2 · confronto in attesa non segnalato al mittente**
- **Evidenza [B]:** il destinatario inserisce il codice (finestra di confronto 15 minuti). Il mittente rientra in Casa: la scheda «Condivisioni» resta statica e nessun elemento dice «1 condivisione da confermare». Il dettaglio fa polling solo se è aperto [C].
- **Impatto:** il confronto scade e serve rigenerare il codice. Frequenza: alta per gli esterni [I].
- **Intervento minimo:** la scheda Condivisioni in Casa (o il blocco «Da fare ora», 006) legge la prima pagina dell'elenco e segnala «Da confermare: N» se almeno una è in `awaiting_confirmation`. Niente totali inventati: «almeno una» se la pagina non basta.
- **API/decisione:** un filtro `state` sull'elenco ridurrebbe le letture; non indispensabile.
- **Criterio:** con un claim in attesa, Casa lo mostra entro il caricamento della pagina.
- **Natura:** interfaccia.

**HOME-CONS-008 · P2 · due modelli per la caldaia**
- **Evidenza [B, C]:**
  - «Nuovo oggetto» offre il tipo «Riscaldamento»; la «Caldaia» esiste solo come filtro, per le schede create dalle analisi in Attività.
  - La stessa scheda caldaia si apre da Oggetti (`/oggetti/boiler/…`, menu Casa) e da Attività (`/impianti/…`, menu Attività).
  - «Le tue schede caldaia» vive in Attività.
- **Impatto:** chi crea una «caldaia» come oggetto non trova poi le proposte e i dati tecnici, o ne crea due. Frequenza: media [I].
- **Intervento minimo:** nel modulo «Nuovo oggetto», scegliendo «Riscaldamento», una nota: «Per una caldaia con dati tecnici letti dai documenti usa “Crea una scheda caldaia”», con link. Nella scheda caldaia, un «Indietro» coerente con l'ingresso (già vero) e un'etichetta unica «Scheda caldaia».
- **Alternativa scartata:** fondere oggetti e schede caldaia. Decisione di modello, non di interfaccia.
- **Decisione:** di prodotto (Codex/committente), se in futuro si unificheranno.
- **Criterio:** dal modulo oggetto, con tipo Riscaldamento, c'è l'indicazione verso la scheda caldaia.

**HOME-CONS-009 · P2 · pagine vuote con strumenti per dati che non ci sono**
- **Evidenza [B]:**
  - Documenti vuoto mostra già ricerca, filtri di formato e visibilità e «Azzera filtri».
  - Spese vuoto mostra la dashboard completa a 0,00 €, con distribuzione e confronto vuoti.
  - Casa vuota mostra contatori a zero.
- **Impatto:** rumore e sensazione di prodotto complicato. Frequenza: prima settimana d'uso [I].
- **Intervento minimo:** stato vuoto con una sola azione («Carica il primo documento», «Registra la prima spesa»); filtri, confronto e contatori a zero nascosti finché non ci sono dati.
- **Criterio:** casa nuova → Documenti e Spese mostrano un messaggio e un'azione, nessun filtro.
- **Natura:** interfaccia.

**HOME-CONS-010 · P2 · codice di abbinamento di 15 minuti per un esterno spesso senza account**
- **Evidenza [B, S]:** il wizard dice «codice valido 15 minuti». Il destinatario deve registrarsi, trovare «Consegne ricevute» e inserire il codice; poi il mittente deve confrontare entro altri 15 minuti. TTL fissato dal contratto `sharing-v1`.
- **Impatto:** codici scaduti e rotazioni frequenti [I].
- **Intervento minimo, senza toccare il contratto:** nel passo «Persona esterna», «Se la persona non ha ancora un account Dimora, chiedile di crearlo prima: il codice dura 15 minuti». Nel dettaglio, «Genera un nuovo codice» già presente.
- **Decisione:** il TTL è di Codex e del committente (sicurezza contro usabilità).
- **Criterio:** il testo c'è prima della creazione dell'invito.

### 3.3 Miglioramenti visivi

**HOME-CONS-012 · P3 · dati tecnici in primo piano.** La SHA-256 completa nel dettaglio documento e «impronta 824b6de3…» in ogni proposta [B]. Per un proprietario sono rumore. Intervento: «Dettagli tecnici» chiuso per impronta e fonte. La citazione «pagina 1, versione 1» resta visibile. Criterio: impronta non visibile senza un'azione.

**HOME-CONS-013 · P3 · tipo dell'oggetto preselezionato su «Elettrodomestico».** Già UXH-020 del 14/10: persiste [B]. Ho creato un oggetto senza scegliere il tipo, che è stato salvato come Elettrodomestico. Intervento: nessuna preselezione oppure «Altro». Criterio: senza scelta il modulo chiede il tipo o salva «Altro».

### 3.4 Idee successive (non urgenti)

- **HOME-CONS-011 · P3:** ricordare l'ultima casa aperta per account (oggi con 2 case si entra su «Le mie case») [B, I].
- **HOME-CONS-014:** dal dettaglio documento, mostrare gli oggetti collegati (oggi il legame si vede solo dall'oggetto) [B]. Richiede la stessa lettura inversa di 002.
- **HOME-CONS-015:** etichetta privata facoltativa per le consegne esterne: oggi più consegne si chiamano tutte «Persona esterna» [B]. Cambio di contratto.
- **HOME-CONS-016:** la bozza da documento resta lunga (UXH-014 del 14/10), ma l'ordine è giusto, con duplicato e importi in cima [B]. Valutare i dettagli del documento chiusi per default.

## 4. Interventi raccomandati (massimo 10)

**Prima di estendere Home** (Agenzie o altro):
1. **HOME-CONS-006:** Casa con «Da fare ora», tre ingressi a casa vuota, Dettagli della casa in fondo.
2. **HOME-CONS-001:** pagina senza case con «Hai ricevuto un codice?» e segnale degli inviti in attesa.
3. **HOME-CONS-003:** niente codici tecnici, testi di budget o blocchi di collaudo per l'utente.
4. **HOME-CONS-002:** testi delle attività non legati alla caldaia (e oggetto collegato, se l'API c'è).
5. **HOME-CONS-004:** focus ed esito dopo completamento e decisione.

**Miglioramento utile:**

6. **HOME-CONS-007:** condivisioni da confermare segnalate in Casa.
7. **HOME-CONS-009:** stati vuoti con un'azione, filtri nascosti senza dati.
8. **HOME-CONS-008:** indicazione «scheda caldaia» nel nuovo oggetto Riscaldamento.
9. **HOME-CONS-005:** refusi e vocabolario della visibilità.

**Rinviabile:**

10. **HOME-CONS-010, 012, 013, 011:** nota prima del codice esterno, dettagli tecnici chiusi, tipo senza preselezione, ultima casa.

Nessuna riscrittura generale né nuova navigazione: le quattro sezioni reggono.

## 5. Confronto mirato con l'audit del 14 ottobre

L'audit precedente valutava il **mockup standalone**, non l'app React. Il confronto è per tema.

| Rilievo 14/10 | Oggi nel prodotto reale |
|---|---|
| UXH-001 Spese ed Economia duplicate | **Risolto:** una sola Spese con viste e famiglie [B] |
| UXH-003 bozza accantonata introvabile | **Risolto:** «Bozze da documento» con schede Da confermare / Accantonate / Confermate [B] |
| UXH-004 nessuna casella prima dell'analisi | **Risolto:** presa d'atto per la prova sintetica; modalità M3 senza preselezione e avvio disattivato [B] |
| UXH-005 «Indietro» verso pagine non visitate | **Migliorato:** ritorni da costo e famiglia corretti, caldaia con «Indietro» coerente all'ingresso [B]. Il ritorno dopo «Registra un costo per questo oggetto» non l'ho riprovato |
| UXH-007 Home ridondante e senza azioni in prima vista | **Cambiato ma non risolto:** niente hero, però schede statiche in cima e nessun «da fare ora» → HOME-CONS-006 |
| UXH-012 fiducia non giustificata | **Risolto:** «Origine: proposta accettata / correzione tua», «Dichiarato da te» [B] |
| UXH-014 bozza lunga | **Parzialmente:** ordine migliore, pagina ancora lunga → 016 |
| UXH-016 vocabolario della visibilità | **Quasi risolto:** «Solo io / Persone della casa»; resta «Condivisi nella casa» nel filtro → 005 |
| UXH-018 linguaggio interno | **Persiste in altra forma:** «analisi di test», codici, testo di budget → 003 |
| UXH-020 tipo preselezionato | **Persiste** → 013 |

## 6. Limiti

- Simulazione esperta, non ricerca con utenti. Frequenze e impatti sono ipotesi.
- **Browser:** headless via CDP. Ho impostato i select nativi e i campi data con il setter nativo più evento, perché `insertText` non vale su `<input type=date>`; non cambia il prodotto né salta controlli. Mobile verificato solo per larghezza (320/390), non su dispositivi reali.
- Non ho provato tecnologie assistive reali e non faccio nessuna dichiarazione WCAG. Il focus l'ho misurato con `document.activeElement`.
- **Errori non provocati nel reale** (rete, permessi in corsa): rimando alle prove con harness simulato nei report precedenti.
- Una mia sonda ha stampato nel log di lavoro la password dell'account sintetico mittente (campo reso visibile per errore dal pulsante «Mostra»). L'account è locale, sintetico e usa e getta; la password non compare in report, screenshot o commit. Nessun codice di abbinamento è riportato; ho eliminato lo screenshot che conteneva il codice di confronto.
- **Dati sintetici lasciati nel database locale**, per eventuale riesame:
  - account `audit-home-…@example.test` e `audit-dest-…@example.test`;
  - «Casa Audit Sintetica» e «Seconda casa sintetica»;
  - due PDF sintetici, un oggetto, un promemoria completato, una scheda caldaia;
  - quattro costi e una condivisione revocata.

  Nessun record di altre sessioni modificato.

## Screenshot

Cartella `screenshots/home-consolidamento-20261015/`. I file `reale-*` vengono dal browser reale con dati sintetici; i `demo-*` sono della demo della guida, simulata.

| File | Viewport | Contenuto |
|---|---|---|
| `reale-1-casa-vuota-390.png` | 390, pagina intera | Casa vuota: schede statiche in cima (006). La barra inferiore fissa compare a metà per via della cattura oltre il viewport |
| `reale-2-casa-con-dati-1280.png` | 1280, pagina intera | Casa con dati: stesso ordine, verifiche in basso (006) |
| `reale-3-destinatario-senza-casa-390.png` | 390 | Destinatario: «Crea la tua prima casa» (001) |
| `reale-4-attivita-da-oggetto-1280.png` | 1280 | Promemoria della lavatrice con «Nessuna caldaia collegata» (002) |
| `reale-5-da-documento-codice-tecnico-1280.png` | 1280, pagina intera | `ai_provider_disabled` visibile (003) |
| `demo-1/2/3` | 1280 / 390 | Demo della guida (vedi `HOME-GUIDA-PRIMO-ACCESSO-20261015.md`) |
