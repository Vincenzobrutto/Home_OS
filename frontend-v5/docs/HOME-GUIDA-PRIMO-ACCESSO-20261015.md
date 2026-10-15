# Guida al primo accesso — proposta · 15/10/2026

È una proposta da arbitrare, **non implementata nell'app**.

La demo è separata: [`proposta-home-guida/dimora-home-guida.html`](proposta-home-guida/dimora-home-guida.html). È un singolo HTML con soli dati sintetici, senza API, librerie o analytics. Il contesto viene da `HOME-CONSOLIDAMENTO-AUDIT-20261015.md`.

## 1. Scelta raccomandata

**Pannello di benvenuto in pagina, non modale, di 3 passi, più aiuti contestuali richiamabili.** Niente tour con riflettore.

Perché:
- **Non blocca e non fa perdere lavoro.** Sta nella pagina sotto il titolo di Casa: si può scorrere, usare il resto o chiuderlo. Non serve una trappola del focus e non c'è rischio di coprire un modulo aperto.
- **Non punta frecce su elementi che possono mancare.** Le sezioni cambiano posizione fra desktop (menu laterale) e mobile (barra in basso). Il pannello le nomina e dice dove trovarle in quel layout, senza puntatori nel vuoto.
- **Porta a una prima azione utile**, invece di visitare ogni pulsante.
- **Non sostituisce le correzioni.** L'orientamento di Casa (HOME-CONS-006) e il percorso del destinatario (HOME-CONS-001) vanno risolti nell'interfaccia. La guida li accompagna, non li copre.

Ho scartato:
- **Tour a riflettore su 6–8 elementi:** blocca, è fragile su mobile, insegna l'ordine attuale invece di correggerlo.
- **Dialogo modale all'avvio:** interrompe chi vuole solo caricare un file e complica il caso di un modulo aperto.
- **Nessuna guida:** la casa vuota oggi non propone un primo passo (006). Un pannello di 3 passi costa poco ed è richiudibile.

## 2. Quando compare

| Situazione | Comportamento |
|---|---|
| Prima esperienza Home con casa vuota, preferenza «mai vista» | Pannello in Casa sotto il titolo, al passo 1. **Non ruba il focus**: chi naviga con la tastiera trova prima il titolo della pagina, poi il pannello |
| Casa con dati, preferenza «mai vista» (account che già usa Dimora quando la guida esce) | **Nessun pannello.** Un invito discreto: «Una guida di un minuto: le quattro sezioni e dove ritrovare le cose.» [Apri la guida] [Non ora] |
| Utente di ritorno (guida saltata o completata) | Niente si apre da solo. Resta «Guida» in testata e «Rivedi la guida» in fondo a Casa |
| Cambio casa, nuovo login, ricarica | Non ricompare: la preferenza è per account, non per casa né per sessione |
| Nuova versione sostanziale della guida | Ricompare solo se cambia la `version` della guida, ed eventualmente solo come invito discreto |
| Destinatario senza casa | **Nessun tour Home.** In `/case` la scheda «Hai ricevuto un codice da qualcuno?» (HOME-CONS-001); in Consegne l'aiuto «Come funziona una consegna» |
| Casi esclusi dalla comparsa automatica | Dialogo aperto, modulo con modifiche non salvate (caricamento, spesa, bozza), pagina «Invito creato» con il codice, account senza permessi di modifica su quella casa. La guida aperta a richiesta resta in pagina e non tocca il lavoro in corso |

La guida **non avvia nulla**: nessuna analisi, chiamata AI, caricamento, spesa o invito. Saltarla non preclude funzioni; completarla non vale come attività reale svolta.

## 3. Testi esatti

**Controlli sempre presenti:**
- progresso «Passo N di 3» con indicatore a punti;
- chiusura «×» («Chiudi la guida»);
- «Indietro» dal passo 2;
- «Salta la guida» nei passi 1–2, «Lo farò dopo» nel passo 3;
- sotto: «Puoi riaprirla quando vuoi da «Guida», in alto.»

**Passo 1 di 3 — «Benvenuto su Dimora»**
- **Testo:** Qui tieni in ordine la tua casa: documenti originali, promemoria e spese. Non serve compilare tutto adesso: puoi iniziare da una sola cosa.
- **Nota:** Dimora può proporti dati letti dai documenti, ma li salva solo dopo la tua conferma.
- **Azioni:** [Avanti] · Salta la guida.

**Passo 2 di 3 — «Quattro sezioni per orientarti»**
- **Casa:** il riepilogo, gli ambienti e gli oggetti come la caldaia o la lavatrice, con i loro documenti, promemoria e costi.
- **Attività:** i tuoi promemoria e le proposte lette dai documenti, da confermare o correggere.
- **Documenti:** gli originali: bollette, contratti, manuali. Restano visibili solo a te finché non scegli diversamente.
- **Spese:** i costi che registri, raggruppati in famiglie come Bollette o Mutuo. Non sono pagamenti.
- **Nota adattiva:** «Le trovi nel menu a sinistra.» su desktop, «… nella barra in basso.» su mobile.
- **Azioni:** Indietro · [Avanti] · Salta la guida.

Oggetti e impianti sono spiegati **dentro Casa**, senza una quinta sezione. La condivisione non è nel tour: la si presenta al bisogno, in Condivisioni e nel documento.

**Passo 3 di 3 — «Da dove vuoi iniziare?»**
- **Testo:** Scegli una cosa: il resto aspetta. La guida non crea nulla al posto tuo.
- **Scelte:**

  | Scelta | Sottotitolo | Dove porta |
  |---|---|---|
  | **Conserva un documento** | Carica un PDF o una foto: resta solo tuo. | Documenti con il modulo di caricamento aperto |
  | **Registra una spesa** | Bastano descrizione, importo e data. | Spese con il modulo aperto |
  | **Esplora la casa** | Chiudi la guida e guarda con calma. | Chiude la guida e resta in Casa |

- **Azioni:** Indietro · Lo farò dopo.

Esiti:
- dopo una scelta: «Guida conclusa: nessun dato è stato creato.»;
- dopo «Salta la guida»: «Guida saltata. Puoi riaprirla da «Guida».».

**Invito discreto (casa con dati):** «Una guida di un minuto: le quattro sezioni e dove ritrovare le cose.» [Apri la guida] [Non ora].

**Destinatario senza casa: scheda in `/case`, prima del modulo casa**
- **Titolo:** «Hai ricevuto un codice da qualcuno?»
- **Testo:** Se una persona ti ha dato un codice per ricevere dei documenti, non serve creare una casa.
- **Azione:** [Inserisci il codice].
- **Riga facoltativa,** se ci sono inviti in attesa: «In attesa: 1 invito da accettare. Apri le consegne».
- **Sotto:** «Vuoi tenere in ordine una tua casa?», con il modulo attuale.

**Aiuto contestuale «Come funziona una consegna»** (richiudibile, in Consegne e dal pulsante «Come funziona»):
1. Inserisci il codice che ti hanno dato: da solo non mostra nulla.
2. Chi te l'ha dato ti contatta e confronta con te un secondo codice, che vedi sullo schermo.
3. Accetti l'invito e scarichi i file, fino alla scadenza indicata.

Nota: Una consegna non ti dà accesso alla casa di chi la invia. Se viene revocata non puoi più aprirla; le copie scaricate restano tue.

Nessun testo promette funzioni future, AI automatica, Agenzie o Amministratori.

## 4. Comportamento tecnico proposto

**Stati della preferenza**, per account e per versione della guida:
- `mai vista`: nessun record;
- `skipped`: «Salta», chiusura prima dell'ultimo passo, «Non ora»;
- `completed`: scelta di una prima azione, «Lo farò dopo», chiusura all'ultimo passo.

Vista, saltata e completata restano distinti: utile per capire se la guida viene ignorata.

**Persistenza.**
- *Prima versione proposta:* `localStorage` con chiave `dimora:guida:v{versione}:{accountId}` e valore `{state, version, at}`.
  - Vale **solo per quel browser**: su un altro dispositivo la guida può ricomparire una volta.
  - Non contiene dati sensibili: nessun nome, nessun dato della casa.
  - Letture e scritture dentro `try/catch`. Se lo storage non è disponibile, la guida resta utilizzabile e non insiste (al massimo una volta per sessione).
- *Multi-dispositivo:* serve una preferenza lato server per account, da concordare con Codex. **Nessuna API inventata qui.**
- Mai cancellare preferenze o dati esistenti. Il logout non tocca la preferenza dell'account.

**Accessibilità e mobile:**
- `region` con `aria-labelledby` sul titolo; progresso in `aria-live="polite"`.
- **Focus:**
  - comparsa automatica: il focus resta al titolo della pagina;
  - apertura da «Guida»: il focus va al titolo della guida, anche partendo da un'altra sezione, dopo il ritorno in Casa;
  - Avanti/Indietro: il focus va al titolo del nuovo passo;
  - chiusura: il focus torna al pulsante d'origine, altrimenti al titolo della pagina.
- `Escape` chiude quando il focus è nella guida. Non è un dialogo modale, quindi nessuna trappola del focus; la tabulazione segue l'ordine del DOM.
- Pulsanti di almeno 44 px, testo da 16 px, nessun contenuto solo-colore.
- Animazione di 180 ms solo con `prefers-reduced-motion: no-preference`.
- Layout a colonna sotto 820 px, nessuno scorrimento orizzontale a 320/390.
- Nessuna freccia o riflettore, quindi nessun puntatore su elementi assenti o nascosti.

**Eventi di misura** (facoltativi, da decidere): solo conteggi locali o server di `shown/skipped/completed/firstAction`, senza contenuti. La demo non ne invia.

## 5. Criteri di accettazione

1. Account nuovo con casa vuota → in Casa compare il pannello al passo 1, senza spostare il focus dal titolo.
2. «Avanti» e «Indietro» cambiano passo e portano il focus al titolo del passo. Il progresso è corretto: 1/3, 2/3, 3/3.
3. «Salta la guida», «×» o `Escape` chiudono, salvano `skipped` (o `completed` all'ultimo passo) e restituiscono il focus. Ricaricando, la guida non ricompare.
4. Una scelta del passo 3 apre il modulo corrispondente **senza creare dati**, salva `completed` e mostra un esito.
5. «Guida» in testata e «Rivedi la guida» in Casa riaprono al passo 1 in qualsiasi stato, anche da un'altra sezione.
6. Casa con dati e `mai vista` → solo l'invito discreto. «Non ora» salva `skipped`.
7. Cambio casa, nuovo login sullo stesso browser o altre sezioni → nessuna nuova comparsa automatica.
8. Modulo con modifiche non salvate, dialogo aperto o pagina con il codice di abbinamento → nessuna comparsa automatica. Aprirla a richiesta non chiude né svuota il lavoro.
9. Destinatario senza casa → nessun tour Home; scheda «Hai ricevuto un codice?» in prima schermata a 320/390/desktop; aiuto consegne apribile.
10. 320, 390 e desktop: nessuno scorrimento orizzontale; testo leggibile con zoom al 200% (da verificare nell'app reale).

## 6. Prove della demo (browser, simulazione)

Chrome headless via CDP, file aperto da `file://`, clic e tasti reali. Lo stato della demo e la casella «modulo non salvato» li ho impostati via script: sono controlli dichiarati come demo. **23 controlli OK, 0 falliti, nessun errore in console.**

**Casa vuota**
- pannello alla prima esperienza, focus non spostato;
- progresso; Avanti con focus sul titolo; Indietro;
- passo 3 con scelte; 390 e 320 senza overflow;
- «Conserva un documento» → Documenti con caricamento e preferenza `completed`; ricarica senza guida.

**Salto, chiusura, riapertura**
- Salta → `skipped` con focus sul titolo della pagina;
- Guida → focus sulla guida; Esc → focus su «Guida»;
- Guida da Spese → Casa con focus sulla guida; chiusura con ×.

**Altri stati**
- **Con dati:** solo invito discreto; «Non ora» → `skipped`.
- **Ritorno:** nulla si apre da solo.
- **Modulo non salvato:** nessuna comparsa automatica; apertura a richiesta in pagina.
- **Destinatario:** scheda codice, nessun tour, 390 senza overflow; «Come funziona» apre l'aiuto con focus sul riepilogo.

**Non provato:** zoom al 200%, screen reader reale, dispositivi fisici e `prefers-reduced-motion` attivo. Nessuna dichiarazione WCAG.

Screenshot, tutti simulati: `screenshots/home-consolidamento-20261015/`
- `demo-1-passo1-1280.png`;
- `demo-2-passo3-390.png` (pagina intera);
- `demo-3-destinatario-390.png`.
