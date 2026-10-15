# C1 condivisione selettiva — revisione UX e mockup (15/10/2026)

Incarico: `Dimora-V5-incarico-Claude-C1-UX.md`. Specifica letta dal master in sola lettura: `docs/v5/c1-sharing-spec.md` v0.1 (baseline `6f4dc2f`) e `home-economy-module.md` §9 e §11.

Ho prodotto solo artefatti di revisione: niente frontend di produzione, router, `src`, `public`, API, DB, servizi o email. Nessun push. Non dichiaro conformità WCAG.

**Mockup:** [`proposta-c1/dimora-condivisione-claude.html`](proposta-c1/dimora-condivisione-claude.html). È un file standalone di circa 51 kB, senza dipendenze, senza rete e senza storage, con soli dati sintetici. Una barra gialla «SIMULAZIONE» resta sempre visibile.

Il selettore «Vedi come» cambia punto di vista:
- Giulia, proprietaria e mittente;
- Marco, persona della casa;
- Luca, tecnico esterno;
- Paolo, account estraneo.

## 1. Proposta raccomandata, in breve

Lo scenario: Giulia vuole dare manuale e libretto della caldaia a una persona, senza mostrarle mutuo, bollette, costi, note, attività o il resto della casa.

1. **Una consegna, non un archivio.** La condivisione è un *manifesto* chiuso:
   - **una persona**, **file scelti uno per uno** ed **eventuali dati tecnici confermati**;
   - **una scadenza**;
   - permessi: consultare e scaricare.

   Il destinatario vede «Consegna da Giulia Leone», non la casa. Il suo punto d'ingresso è «Consegne ricevute», a livello di account.
2. **Quattro passaggi brevi, poi un controllo.** Contenuto → Destinatario → Durata → Controllo:
   - ogni passaggio è raggiungibile solo se il precedente è completo;
   - si torna indietro liberamente;
   - **qualunque** modifica dopo la conferma la azzera e lo dice.
3. **Nessuna selezione implicita.** Partire da un documento o da un oggetto mette quei contenuti *in cima* con un bordo di evidenza, mai spuntati.
4. **Esclusioni scritte, non solo assenti.** Il riquadro «Mai inclusi, in nessun caso» elenca: Spese, riepiloghi, bozze, pagamenti e mutuo come dati, attività, note, accesso alla casa, documenti di altri. Queste voci non sono selezionabili da nessuna parte: non basta nascondere un'icona.
5. **Avviso sui file completi senza promesse.** La conferma dice: «… vedrà i file completi, anche eventuali importi e dati personali al loro interno». Sotto: «Dimora non oscura né rileva automaticamente importi, IBAN o dati personali».

   I file con categoria economica *indicata dall'utente* (Fattura, Bolletta, Contratto) portano un'etichetta e una frase: il costo registrato in Spese non viene condiviso. È un'etichetta della categoria scelta dall'utente, non un rilevamento.
6. **Destinatario come account, mai come email digitata.** Persona della casa scelta dall'elenco autorizzato, con nome e recapito noti al servizio (evita gli omonimi). Persona esterna con **abbinamento tramite codice e conferma del mittente** (§2.3), marcato «Proposta, non attiva nella prima versione».
7. **Stati onesti.**
   - «Invito preparato · da accettare» è diverso da «Accettata · consultabile».
   - «Accettato non significa letto»: nessuna conferma di lettura.
   - Esito di rete ignoto: niente nuovo «Crea», solo «Riprova invio» con la stessa richiesta (nel mockup, una sola condivisione creata).

## 2. Critica della specifica C1 v0.1

Per ogni punto distinguo **problema reale**, **scelta** di Codex e **mia preferenza**.

### 2.1 Sequenza C1a (persone della stessa casa) → C1b (esterni e oggetti)

- **Problema reale, e Codex ha ragione.** L'email di registrazione non è verificata, quindi non può sbloccare file sensibili. Un link pubblico è un permesso al portatore: chi lo intercetta legge. Su questo non c'è discussione.
- **Scelta.** Rilasciare per prima la verticale con destinatari già membri. È prudente e mette alla prova manifesto, policy e revoca senza nuovi problemi d'identità.
- **Limite della scelta, secondo me.** Il valore per l'utente di C1a è debole, e rischia di confondere:
  - *Valore debole:* tra membri esiste già la visibilità M2 «Persone della casa». C1a aggiunge persona singola, scadenza e revoca: un caso reale, ma di nicchia (per esempio un file personale per un solo familiare).
  - *Caso principale scoperto:* il tecnico, il familiare fuori casa, il futuro acquirente restano senza soluzione.
  - *Confusione:* per le stesse persone esisterebbero **due meccanismi** che rendono leggibile un file (visibilità M2 e condivisione C1). È il rischio che la specifica stessa mette in C1-07, «nessuna confusione con visibilità M2».
- **Mia preferenza.**
  1. Il nucleo backend (manifesto, policy, scadenza, revoca, replay) va costruito una volta, **indipendente dal tipo di destinatario**: alla fine c'è sempre un account ID. Fin qui coincide con la proposta di Codex.
  2. Come **primo rilascio per l'utente** proporrei l'esterno con abbinamento a codice (§2.3), oppure entrambi i tipi insieme, perché il percorso dopo la scelta del destinatario è identico.
  3. Se il committente preferisce rimandare gli esterni, C1a va trattata come **tappa tecnica**, non come funzione presentata. Va comunque spiegata in modo da distinguerla da «Persone della casa»; nel mockup c'è la frase: «Non cambia "Solo io / Persone della casa" e non dà altri diritti».

### 2.2 Cosa *non* basta per gli esterni

| Mezzo | Perché no |
|---|---|
| Email digitata | Oggi non è verificata e non prova l'identità. |
| Link pubblico o token nell'URL | Permesso al portatore; finisce in inoltri, anteprime e cronologie. |
| Pagina anonima con codice | Il codice diventa a sua volta un permesso al portatore. |
| OTP «finto» via email/SMS | Non esiste un servizio di invio; dichiararlo operativo sarebbe falso. |

### 2.3 Verifica minima proposta: abbinamento con codice e conferma del mittente

Non serve un servizio email o SMS, né un nuovo sistema di autenticazione. Serve solo backend interno.

1. Alla conferma il servizio crea l'invito, in stato *in attesa di abbinamento*, e un **codice monouso**: per esempio 6 caratteri da un alfabeto senza ambigui, circa 30 bit. Il codice vale 24 ore ed è legato a quell'invito.
2. Il mittente lo comunica **lui**, a voce o di persona. Dimora non lo invia.
3. Il destinatario accede con **il proprio account** (login esistente) e inserisce il codice. **Non vede nulla**: né titoli, né indirizzo, né mittente oltre al nome.
4. Il mittente vede *quale account* ha inserito il codice: nome e indirizzo dichiarati, esplicitamente «non verificati», e l'ora. Poi **conferma** («Sì, è la persona giusta») oppure annulla.
5. Dopo la conferma il permesso è legato all'**account ID**. Il codice è consumato. Tentativi limitati per invito e per account, con un rate limit globale.

Le difese di questo schema:
- Un codice intercettato non basta: serve anche la conferma del mittente, che vede un nome inatteso. Il mockup lo prova: Paolo inserisce il codice giusto e Giulia vede «Paolo Neri» e annulla.
- Nessun file è mai raggiungibile senza account e conferma.

Rischio residuo: un nome dichiarato può imitare quello atteso. Mitigazione consigliata, nel testo: confermare mentre si è al telefono con la persona, controllando l'ora mostrata. Un'email verificata in futuro alzerebbe la garanzia, ma **non è un prerequisito**.

Questo schema va **progettato e implementato da Codex**. Nel mockup è marcato «Proposta, non attiva», con l'unico codice sintetico `K7P-4QX`.

### 2.4 Altri rilievi alla specifica

1. **Regola 3, azzeramento della conferma.** La specifica parla di «cambiamento di selezione». Propongo «**qualunque** modifica della consegna»: contenuto, destinatario o durata. Il mockup fa così.
2. **Solo dati tecnici, senza file.** Rappresentati dal mockup: nessuna conferma «file completi», perché i campi sono tecnici, confermati e mostrati per esteso nel manifesto. Da decidere (§5).
3. **Rifiuto dell'invito.** Manca lo stato. Nel mockup il rifiuto finisce in «Revocata»; propongo uno stato distinto «Rifiutata», più chiaro per il mittente.
4. **Messaggi al destinatario.** Revoca e perdita dei diritti del mittente producono lo **stesso** messaggio generico, per non rivelare una vendita. La scadenza può mostrare la data. È coerente con la regola 8 e la rende esplicita.
5. **Documenti caricati da altri.** Nel mockup sono visibili ma disattivati, con il motivo («Caricato da Marco: non puoi condividerlo tu. Può farlo lui.»). Nasconderli farebbe sembrare che il file manchi.
6. **Versione nel manifesto.** All'utente mostro «versione del …» e la dimensione, non hash o ID. Restano nel record del server come da regola 6.
7. **Nessuna bozza di condivisione.** Uscire dal percorso scarta la selezione e lo **dichiara** alla pagina successiva. Tornando con «Avanti» compare «Nessuna preparazione in corso», senza ripristino silenzioso. È più semplice e più sicuro di una bozza persistente.
8. **Una consegna per una persona.** Per due persone servono due consegne: niente liste di destinatari, così l'anteprima resta esatta.
9. **Il mockup ufficiale oggi contraddice la specifica.** In `frontend-v5/public/mockup-proprietario-v5.html`, nel master:
   - `shareForm()` **preseleziona** il documento passato con `?doc=` (`d.id===pre ... 'checked'`), contro la regola 1;
   - il destinatario è un'**email digitata** libera;
   - il manifesto non ha la conferma «file completi».

   Non l'ho modificato. Va riallineato quando Codex aggiornerà il mockup ufficiale.

## 3. Stati rappresentati

**Mittente:**

| Stato | Etichetta | Azioni |
|---|---|---|
| preparazione (solo client) | passaggi 1–4 | Annulla con dialogo; uscita = selezione scartata e dichiarata |
| esito ignoto | «Esito non confermato» | solo «Riprova invio», stessa richiesta |
| invito membro | «Invito preparato · da accettare» | Revoca |
| esterno, in attesa | «In attesa del codice» + codice mostrato una volta | Revoca |
| esterno, codice inserito | «Da confermare: chi ha inserito il codice?» | «Sì, è la persona giusta» oppure «No, non è lei: annulla» |
| attiva | «Accettata · consultabile» | Revoca (dialogo: le copie scaricate non si ritirano) |
| scaduta / revocata / non più disponibile | etichette distinte per il mittente | nessuna |

**Destinatario:**

| Stato | Cosa vede |
|---|---|
| invito da accettare | solo «Giulia Leone vuole darti dei documenti»; nessun titolo né indirizzo; Accetta / Rifiuta |
| codice inserito | «In attesa di conferma»; nulla della consegna |
| consultabile | elenco dei soli file (nome, dimensione, versione), Apri/Scarica simulati, eventuali dati tecnici; nessuna sezione della casa |
| scaduta | «Non più disponibile», con la data di fine |
| revocata / diritti del mittente cessati | stesso messaggio generico, nessun nome di file |
| altro account | «Non disponibile», senza distinguere tra inesistente e non tuo |

## 4. Prove eseguite e limiti

Ho servito il file da `127.0.0.1:5176` con un server statico mio, mai sulle porte 3001/5174/55432. La configurazione temporanea in `.claude/launch.json` l'ho ripristinata con `git checkout`.

Ho guidato Chrome headless via CDP con clic e tasti reali (`Input.dispatch*`). Ultimo giro: **40 controlli OK, 0 falliti, nessun errore in console**.

Due giri precedenti erano falliti per corse nel **mio script**: leggeva la pagina prima del nuovo rendering. Li ho corretti aspettando il titolo della pagina. Un altro errore era nel mockup: una mia sostituzione aveva trasformato `$$` in `$` e scollegato le caselle. L'ho trovato con la prova e corretto.

**Eseguito nel browser:**
- **Da documento:** documento di partenza in cima e non spuntato; nessuna spunta all'apertura; «Continua» disattivato; il file di Marco non è selezionabile.
- **Selezione:** seleziona e deseleziona la Fattura; il contatore si aggiorna e il focus resta sulla casella.
- **Tastiera:** Tab salta il documento disattivato, Spazio seleziona e deseleziona.
- **Destinatario e durata:** nessun destinatario preselezionato, con 2 persone in elenco; durata proposta 7 giorni.
- **Manifesto:** contiene esattamente i file scelti. Conferma non spuntata e «Crea» disattivato; dopo la conferma «Crea» si attiva.
- **Modifica dopo la conferma:** «Modifica contenuto» seguito da un'aggiunta azzera la conferma, con avviso.
- **Rete assente:** «Esito non confermato», solo «Riprova invio», **una** condivisione creata.
- **Invito ad accettazione:**
  - invito preparato distinto da accettato;
  - per Marco nessun titolo né indirizzo prima di accettare;
  - dopo l'accettazione la vista è stretta, senza Spese, Attività, indirizzo, bolletta o mutuo.
- **Accessi negati:** Paolo con l'URL della consegna non vede titoli. Dopo la perdita dei diritti di Giulia il destinatario non vede nomi di file residui.
- **Da oggetto:**
  - né documenti né scheda tecnica sono spuntati;
  - il manifesto ha solo i campi confermati, senza anno proposto, ambiente o costi;
  - il codice resta mostrato solo alla mittente;
  - codice errato: errore generico;
  - codice giusto inserito da Paolo: lui non vede nulla, Giulia vede «Paolo Neri» e annulla.
- **Annulla:** il dialogo mette il focus sul pulsante prudente. Esc chiude, rimette il focus su «Annulla» e conserva la selezione. La conferma non crea nessun invito.
- **Indietro e avanti:**
  - «Indietro» riporta al contenuto con la selezione e il focus sul titolo;
  - uscendo dal percorso: «Preparazione interrotta»;
  - «Avanti»: nessun ripristino silenzioso.
- **Revoca:** il dialogo avvisa che le copie scaricate non si ritirano; lo stato diventa «Revocata».
- **Larghezze:** a 320 e 390 px nessuno scorrimento orizzontale (`scrollWidth = innerWidth`) su contenuto, controllo e consegna. A 390 px i passaggi completati hanno nome accessibile: «Contenuto ; Destinatario ; Durata ; Controllo».

**Impostato via script, e dichiarato:** il selettore «Vedi come», la casella «rete assente», e «indietro/avanti» tramite `history.back()/forward()`.

**Non eseguito:**
- il pulsante «Passa la scadenza», presente ma non cliccato nel giro;
- l'abbinamento confermato con Luca, simmetrico al caso Paolo provato;
- il rifiuto dell'invito da parte di Marco.

**Dedotto, non verificato:** l'annuncio del contatore (`aria-live`, aggiornato sul posto) e la lettura del percorso con uno screen reader reale. Nessuna prova con tecnologie assistive: **nessuna dichiarazione WCAG**.

**Correzione dopo la prima prova:** a mobile le etichette dei passaggi completati erano `display:none` e perdevano il nome accessibile. Ora sono visivamente nascoste ma leggibili; verificato nell'ultimo giro.

Screenshot in `docs/screenshots/c1-ux-20261015/`:
1. `01-manifesto-conferma-1280.png`: manifesto con conferma dei file completi;
2. `02-destinatario-consegna-390.png`: vista stretta del destinatario dopo l'accettazione;
3. `03-conferma-abbinamento-1280.png`: la mittente vede l'account sbagliato che ha inserito il codice;
4. `04-controllo-mobile-320.png`: controllo a 320 px con la sola scheda tecnica.

## 5. Da chiudere PRIMA del contratto API

1. **Sequenza di rilascio.** Solo membri (C1a come tappa tecnica) o primo rilascio con esterni via abbinamento. È una decisione del committente; la mia preferenza è in §2.1.
2. **Abbinamento esterno**, se approvato:
   - lunghezza e alfabeto del codice, validità, tentativi per invito, account e IP;
   - cosa vede il mittente dell'account (nome e indirizzo dichiarati);
   - il destinatario deve avere un account, o può crearlo al momento? Nel secondo caso non deve vedere nulla finché il mittente non conferma.
3. **Stato «Rifiutata»** distinto da «Revocata»; messaggi del destinatario per revoca o vendita identici (§2.4.4).
4. **Conferma** azzerata da qualunque modifica: contenuto, destinatario, durata.
5. **Consegna di soli dati tecnici:** serve una conferma esplicita come per i file?
6. **Dove arriva l'invito:** «Consegne ricevute» a livello di account, fuori dalle quattro sezioni della casa. Serve una voce di navigazione e un conteggio.
7. **Conferma di lettura:** escluderla per contratto («accettato ≠ letto»), oppure registrare solo «aperto il …» per il mittente? La mia preferenza è escluderla.
8. **Istante di scadenza:** il server lo restituisce già nell'anteprima, prima della conferma, o solo alla creazione? La specifica dice «mostrato prima della conferma», quindi serve un'anteprima lato server o una regola di calcolo condivisa.
9. **Categorie economiche indicate dall'utente:** si può usarle per l'etichetta «categoria economica» senza violare il «nessun rilevamento automatico»? Io dico di sì, perché non è un rilevamento: va confermato.
10. **Correzione del mockup ufficiale** (§2.4.9) prima di usarlo come riferimento C1.
