# Audit UX/UI della Home proprietario — 14 ottobre 2026

Revisione indipendente del mockup completo del proprietario. Autore: Claude Code, nel ruolo di lead UX. È una revisione: nessuna correzione implementata, il prototipo non è stato toccato.

Materiale esaminato:
- **Mockup:** `http://127.0.0.1:5174/mockup-proprietario-v5.html?qa=1`.
- **Sorgente:** letto in sola lettura nel master, `Home_OS/frontend-v5/public/mockup-proprietario-v5.html`. Baseline `f95d420835974ad5c35a1b63d03f0c5c4ca8f779`, SHA256 `aecd08be5bd6a7044a2fc5dde95204ba93702187a422eda4542c1f868351c0ef`. Hash verificato all'inizio e identico: 87 557 byte, 14 ottobre 14:54.
- **Documenti master letti:**
  - `docs/v5/owner-mockup-navigation.md`
  - `docs/v5/s1-economic-history-spec.md`
  - `docs/v5/home-economy-module.md`
  - `docs/v5/home-objects-api-contract.md`
  - `docs/v5/s1-design-review.md`
  - `frontend-v5/docs/S1-UX-REVIEW-20261014.md`
- **Evidenze:** `frontend-v5/docs/screenshots/home-ux-audit-20261014/`, 20 immagini JPEG.

Sono un revisore esperto, non un campione di utenti. Nessun dato di questo report è un tempo, una percentuale o un esito di interviste.

---

## A. Diagnosi

1. La Home non risponde a «cosa devo fare adesso». La stessa informazione compare in quattro forme:
   - contatori;
   - «Da sapere oggi»;
   - «Le prossime attività»;
   - le card Spese ed Economia.

   Lo slogan dell'hero occupa la prima vista. A 320 px non si vede nulla di azionabile sopra la piega.
2. Le spese hanno due ingressi, Spese ed Economia. Mostrano la stessa lista e lo stesso totale con nomi, pulsanti e percorsi diversi. Sembrano due contabilità.
3. I ritorni non sono prevedibili. «Indietro» porta spesso a una pagina mai visitata (catalogo, Economia) invece che al punto di partenza. La barra in basso evidenzia la sezione della pagina invece del compito in corso.
4. La catena documento → analisi → bozza → spesa si interrompe in tre punti:
   - l'esito dell'importazione apre documenti diversi da quelli importati;
   - «Accantona bozza» fa sparire la bozza con un testo non vero;
   - il consenso all'invio ad Anthropic è solo un paragrafo, senza scelta esplicita.
5. Il prototipo comunica più certezza di quanta ne abbia:
   - importi mostrati prima dell'analisi;
   - «confermato dalla fonte» per una conferma dell'utente;
   - un totale pluriennale senza periodo.

   Nello stesso tempo espone linguaggio interno: «S1», «C1», «open/completed», «… demo».
6. Le singole parti, prese da sole, funzionano bene: scheda oggetto, revisione card per card, spesa manuale in tre dati, lavoro come semplice raggruppamento. Il problema è la cucitura tra le parti, non le parti.

---

## B. Copertura

### Metodo

- **Browser:** il pannello browser integrato di Claude Code (Chromium) sul mockup servito da 5174, che era già attivo. Nessun servizio avviato o fermato.
- **Dati di prova:** URL sempre con `?qa=1`. «Ripristina prova» usato all'inizio e alla fine; azzera soltanto la chiave `dimora-owner-ux-mock-v1-qa`. Nessun'altra chiave localStorage letta o cancellata.
- **Dimensioni effettive:**
  - 390×844, emulazione mobile: tutti gli scenari;
  - 320×720: Home e scheda Caldaia;
  - 1280×800: Home. Lo screenshot restituito è scalato a 800×500.
- **Azioni:** click e digitazione da utente. Due eccezioni dichiarate:
  - `form_input` per i `<select>` (tipo, ambiente, visibilità, filtri Economia) e per i campi data;
  - `navigate` per tornare all'inizio di uno scenario (`#/casa`, `#/catalogo`, `#/scheda/Caldaia` a 320 px) e una volta per tornare a Terrazzo dopo un errore di percorso.

  Nessuna scrittura di localStorage, nessuna chiamata diretta a funzioni, nessun click via JavaScript. JavaScript è servito solo a leggere misure: larghezza e altezza della pagina, posizione dello scroll.
- **Codice:** letto dopo la navigazione, solo per spiegare cause. Dove la base è il codice lo dico.

### Scenari

| # | Scenario | Stato | Note |
|---|---|---|---|
| 1 | Primo ingresso | Eseguito | 390, 320, 1280 |
| 2 | Manuale caldaia da Casa e da Documenti | Eseguito | Da Casa: Cucina → Caldaia → Documenti·2 → manuale, cioè 4 azioni di navigazione. Da Documenti: 1 azione di navigazione, digitazione, Invio, scroll fino ai risultati, apertura |
| 3 | Cosa devo fare | Eseguito | Confronto tra Home, Attività, Da rivedere e condominio |
| 4 | Casa → Cucina → Caldaia, tutte le sezioni | Eseguito | Ritorni verificati con «Indietro» del mockup |
| 5 | Oggetto senza documento e senza ambiente | Eseguito | Ritrovato solo da «Tutti gli oggetti e impianti» |
| 6 | Ambiente e oggetto collocato | Eseguito | Terrazzo + Tenda da sole |
| 7 | Importazione del pacchetto | Parziale | Conservazione ed esito eseguiti. L'analisi tecnica dei nuovi documenti non è simulata: **percorso non valutabile** |
| 8 | Conferma 24/28 kW e modello | Eseguito | Card sparite una alla volta; dati presenti in scheda e storia |
| 9 | Attività: creazione, collegamento, completamento, riapertura | Eseguito | Frigorifero |
| 10 | Ricerca, documento riservato, cambio visibilità | Eseguito | Contratto mutuo da Riservato a non riservato, salvato |
| 11 | Documento dalla scheda e ritorno; documento → oggetto | Eseguito | Lavatrice e Caldaia |
| 12 | Riparazione lavatrice da 85 € dalla scheda | Eseguito | Una sola registrazione, in Spese e nella scheda |
| 13 | Spesa generale | Eseguito | |
| 14 | Spese ed Economia | Eseguito | |
| 15 | Bolletta 80 + 20 arretrati | Eseguito | Scelta dell'importo, candidato, collegamento all'esistente |
| 16 | Fattura 100 + IVA 22; scansione non analizzabile | Eseguito | |
| 17 | Filtri, dettaglio, ritorno | Eseguito | Filtro categoria e oggetto in Economia. Non esiste un filtro Ambiente |
| 18 | Lavoro Rifacimento bagno | Eseguito | Solo consultazione: non ho creato un nuovo lavoro con oggetti misti |
| 19 | Condominio e segnalazione | Eseguito | Invio simulato |
| 20 | Condivisione, manifesto, revoca | Eseguito | Avviata da Condivisioni, non dal pulsante del documento |
| 21 | Storia, impostazioni, vendita e ripristino | Parziale | Non ho cliccato «Scarica riepilogo sintetico demo»: è un download, non necessario |

### Limiti

- Nessun lettore di schermo, nessuna prova da tastiera completa e nessuna misura di contrasto. **Non dichiaro conformità WCAG.**
- Un'ipotesi è stata scartata. L'albero di accessibilità dello strumento mostrava come nome dei campi il placeholder (per esempio «Es. Frigorifero») e per le caselle della condivisione gli id «d1», «d2». Il codice mostra invece `<label>` che avvolgono i campi, quindi l'associazione esiste. Non è un rilievo; va verificato con un lettore di schermo vero.
- Desktop e 320 px sono controlli a campione, non una ripetizione dei 21 scenari.
- Le prove si basano sulle mie sole azioni: non ci sono altre persone, né i tempi o la soddisfazione di qualcuno.

---

## C. Rilievi

Ogni riga riporta la base del rilievo:
- **B** = osservato nel browser;
- **C** = dedotto dal codice;
- **O** = opinione progettuale.

Ho raggruppato i problemi con la stessa causa.

| ID | Pr. | Base | Schermata | Problema | Proposta |
|---|---|---|---|---|---|
| UXH-001 | P1 | B | Spese, Economia | Due pagine con la stessa lista e lo stesso totale (2177,90 €). Nomi diversi, ingressi diversi («Registra una spesa» va al modulo, «Aggiungi spesa» alla pagina di scelta) | Un solo ingresso Spese con viste progressive. Economia smette di essere una pagina separata |
| UXH-002 | P1 | B | Esito importazione → Documenti spesa | «Dati economici» apre un insieme dimostrativo diverso dai 3 documenti appena importati: la catena si rompe | L'esito apre le bozze dei documenti appena importati, oppure dice chiaramente che non ce ne sono |
| UXH-003 | P1 | B + C | Bozza, «Accantona bozza» | La bozza sparisce da «Da confermare». Il testo «Le proposte originali restano in Spese» è falso: «Da confermare» esiste solo in Economia | La bozza accantonata resta recuperabile in un elenco con nome stabile; il testo dice dove |
| UXH-004 | P1 | B + C | Analisi documento | Prima di «Simula estrazione» c'è solo un paragrafo sul consenso, nessuna casella. Contraddice l'arbitrato S1-06 | Casella non preselezionata; pulsante disattivato finché non è spuntata; «Inserisci manualmente» sempre disponibile |
| UXH-005 | P1 | B | Scheda, nuovo oggetto, manuale, bozza | «Indietro» porta a pagine non visitate: catalogo dalla scheda e dal nuovo oggetto, Economia dal manuale e dalla bozza. Dopo una registrazione dalla scheda si arriva al dettaglio del costo, non all'oggetto | «Indietro» = origine reale (parametro `ritorno`, già usato per i documenti). Dopo il salvataggio si torna all'origine con una conferma |
| UXH-006 | P2 | B | Barra in basso | L'evidenziazione cambia con la rotta: documento aperto dalla scheda → «Documenti»; esito importazione da Casa → «Attività». L'utente crede di aver cambiato sezione | La sezione attiva resta quella da cui parte il compito |
| UXH-007 | P2 | B | Home | Ridondanza: contatori, «Da sapere oggi», «Le prossime attività», card Spese, card Economia. L'hero con lo slogan occupa la prima vista; a 320 px nulla di azionabile sopra la piega | Un solo blocco «Da fare ora» unificato; hero ridotto a intestazione; una riga per le spese |
| UXH-008 | P2 | B | Testata mobile | Il banner del mockup e il «Menu della casa» aperto (`<details>`) occupano circa 240 px su ogni pagina. Su mobile si chiama «Menu della casa», su desktop «Altro della casa» | Menu secondario in un'icona di testata, chiuso per default, con un solo nome |
| UXH-009 | P2 | B | Scheda oggetto | Le schede vanno su due righe a 390 e a 320. Occhiello e sottotitolo cambiano tra le schede. La Sintesi contiene spiegazioni sul prototipo. Ogni scheda aggiunge un passo alla cronologia | Pagina unica a sezioni con anteprima e «Vedi tutti (n)»; cambio di sezione con `replace`; testi di servizio fuori dalla scheda |
| UXH-010 | P2 | B | Documento, Documenti | Quattro azioni in concorrenza nel documento. Il titolo di Documenti è uno slogan («Tutto quello che conta.»). La colonna stato mescola stato e visibilità. «APE … Casa · Casa» | Una sola azione primaria contestuale; titolo «Documenti»; stato e visibilità separati |
| UXH-011 | P2 | B | Ricerca documenti | Dopo la ricerca il focus va al titolo e i risultati restano sotto la piega. La ricerca resta attiva tra una visita e l'altra senza indicatore né «Azzera» | Risultati subito sotto il campo; indicatore «Filtrato per …» con «Azzera» |
| UXH-012 | P2 | B | Importazione, Storia | Fiducia non giustificata: importi visibili prima di qualsiasi analisi («costo 95,00 €», «80 + arretrati 20»); «Modello TD28 confermato dalla fonte» quando ha confermato l'utente | Prima dell'analisi solo nome, tipo e dimensione; «Confermato da te · fonte: Libretto impianto» |
| UXH-013 | P2 | B | Scheda → Costi | «Totale registrato 154,00 €» somma 2025 e 2026 senza periodo; bollette gas attribuite alla caldaia; «Apri vista economica» e «Economia della casa» per la stessa cosa | Totale con periodo esplicito; un solo nome per la destinazione |
| UXH-014 | P2 | B | Bozza bolletta e fattura | Pagina alta circa 3339 px con dettagli aperti e 13 campi. Per la fattura i candidati dicono «Nessuna spesa coincidente» anche se esiste «Riparazione rubinetto 85 €» | Scelta dell'importo e candidati in cima, dettagli chiusi; candidati «simili» con il motivo della differenza |
| UXH-015 | P2 | B | Filtri Economia | Manca il filtro Ambiente (previsto dalla specifica S1). Il pannello resta aperto dopo «Applica» e spinge i risultati sotto di circa tre schermi. Al ritorno dal dettaglio lo scroll riparte da 0 | Filtri in un foglio che si chiude con «Applica»; filtri attivi come chip; scroll conservato |
| UXH-016 | P2 | B | Documento, lista, condivisione | Il mockup usa «Personale · non riservato / Riservato», il runtime M2 «Solo io / Persone della casa». Dopo il salvataggio la lista mostra «Disponibile». Un documento riservato offre «Condividi selettivamente» | Un solo vocabolario, uguale al runtime; lista con l'icona della visibilità |
| UXH-017 | P2 | B | Condivisioni, Impostazioni | Revoca e «Simula casa venduta» agiscono con un clic, mentre «Ripristina prova» chiede conferma. Il manifesto non segnala che il Contratto mutuo è un documento finanziario. La riga della condivisione non dice quali documenti contiene | Conferma per vendita e revoca; avviso per categoria nel manifesto; dettaglio della condivisione apribile |
| UXH-018 | P3 | B | Più schermate | Linguaggio interno e di prova: «in S1», «prova S1», «Anteprima C1», «Percorsi da provare…», pulsanti «… demo», «open/completed» in Storia. Inoltre «1 spesa registrate», importi senza separatore delle migliaia («2177,90 €»), Storia senza date | Glossario utente; stati tradotti; date in Storia; formato `2.177,90 €` |
| UXH-019 | P3 | B | Attività | Icona di spunta + badge «Da fare» ridondanti sotto il titolo «Da fare». Nessuna data di completamento | Un solo indicatore; «Completata il …» |
| UXH-020 | P3 | B | Nuovo oggetto, Casa | Il tipo è preselezionato su «Elettrodomestico» (rischio di tipo sbagliato senza accorgersene). Gli oggetti «Da collocare» non hanno un ingresso da Casa | Tipo senza preselezione oppure «Altro»; voce «Da collocare (n)» accanto agli ambienti quando n > 0 |
| UXH-021 | P3 | B | Condominio, Lavoro | La pagina condominio contiene «Vai al condominio», un link a sé stessa. Le righe del lavoro ripetono «Rifacimento bagno» | Nascondere il link sulla propria pagina; righe del lavoro con data, voce e importo |

### Dettaglio dei rilievi importanti

**UXH-001: Spese ed Economia sono due prodotti** (evidenze 10, 11, 12)

- **Passaggi:**
  1. Barra in basso → Spese.
  2. Casa → «Esplora Economia della casa».
  3. Confronto delle due pagine.
- **Osservato:**
  - la stessa lista e lo stesso totale 2177,90 €;
  - Economia aggiunge la ripartizione (Gestione 187,90 / Lavori e acquisti 1540 / Finanziamento 450 / Non classificata 0) e le schede Sostenute / Costi per oggetto / Lavori;
  - Spese «Registra una spesa» apre il modulo, Economia «Aggiungi spesa» apre la scelta tra manuale e documento;
  - «Da confermare» esiste solo in Economia;
  - Economia non ha «Indietro» e chiude con testo di collaudo.
- **Impatto:** la persona deve capire quale delle due pagine sia quella vera, e una bozza da confermare non si trova partendo da Spese. Su due pagine non si capisce se una spesa conta una volta o due.
- **Atteso:** un solo ingresso. Le analisi sono un livello di profondità della stessa pagina, non un posto diverso.
- **Criterio di accettazione:**
  - da Spese, senza cambiare sezione, si raggiungono lista, totale del periodo, ripartizione, costi per oggetto, lavori e bozze da confermare;
  - nessun'altra pagina mostra la stessa lista;
  - «Registra» offre sempre la stessa scelta.

**UXH-002: l'esito dell'importazione apre documenti diversi** (evidenze 07, 08)

- **Passaggi:**
  1. Casa → Importa documenti.
  2. Importo il pacchetto sintetico.
  3. Nell'esito scelgo «Dati economici».
- **Osservato:** si apre `#/documenti-spesa` con «Bolletta gas · settembre / Fattura idraulico / Scansione» invece dei tre documenti appena importati. Inoltre la barra evidenzia «Attività».
- **Impatto:** chi ha appena importato non trova i propri documenti e deduce che l'importazione non ha funzionato, oppure lavora sul documento sbagliato.
- **Atteso:** l'esito elenca i documenti importati, ciascuno con il suo stato: conservato, dati tecnici proposti, dati economici proponibili, nessun dato. Da ogni riga parte la sua bozza.
- **Criterio di accettazione:** ogni documento aperto dall'esito ha lo stesso nome e lo stesso id di un documento importato in quella sessione.

**UXH-003: «Accantona bozza» fa perdere la bozza**

- **Passaggi:**
  1. Bozza bolletta.
  2. «Torna più tardi» → «Accantona bozza».
- **Osservato:**
  - la bozza non compare più in «Da confermare» di Economia;
  - il codice filtra `!d.expenseId && !d.abandoned`;
  - il testo dice che le proposte «restano in Spese», ma Spese non ha nessuna sezione bozze.
- **Impatto:** un lavoro iniziato si perde e il testo indirizza a un posto dove non c'è.
- **Atteso:** «Accantona» significa «tienila da parte». Resta visibile in «Bozze accantonate (n)» sotto Spese → Da confermare, con «Riprendi» e «Elimina».
- **Criterio di accettazione:** dopo «Accantona», la bozza si riapre in non più di 2 azioni di navigazione da Spese, e il testo nomina esattamente quella posizione.

**UXH-004: consenso implicito all'invio ad Anthropic**

- **Osservato:** la card «Compilazione assistita» dice «con il tuo consenso il testo del documento sarà inviato ad Anthropic», ma l'unico controllo è il pulsante primario «Simula estrazione».
- **Impatto:** il prototipo insegna, e normalizza, un consenso dato premendo un pulsante. L'arbitrato S1-06 chiede una casella esplicita non preselezionata.
- **Criterio di accettazione:**
  - casella non selezionata all'apertura;
  - pulsante di analisi non attivo finché non è spuntata;
  - «Inserisci manualmente» attivo in ogni caso;
  - la scelta non viene ricordata senza un'impostazione esplicita.

**UXH-005: ritorni imprevedibili**

- **Passaggi e osservato:**
  - Casa → Cucina → Caldaia → «Indietro» porta a `#/catalogo`;
  - Cucina → «Aggiungi oggetto» → «Indietro» porta a `#/catalogo`;
  - Lavatrice → Costi → registra → «Indietro» dal modulo porta a `#/storico`;
  - Bozza → «Indietro» porta a `#/storico`;
  - dopo il salvataggio dalla scheda si arriva al dettaglio del costo;
  - ogni scheda dell'oggetto aggiunge una voce alla cronologia del browser.
- **Buon esempio già presente:** documento aperto dalla scheda Lavatrice → «Indietro» torna a `#/scheda/Lavatrice?sezione=documenti` grazie a `ritorno`.
- **Impatto:** dopo ogni operazione la persona deve ricostruire dove si trovava. Il tasto Indietro del telefono ripercorre le schede invece di uscire dall'oggetto.
- **Criterio di accettazione:**
  - in ogni flusso avviato da una scheda o da un ambiente, «Indietro» e «Salva» riportano all'origine (stessa sezione, scroll entro la stessa card);
  - cambiare sezione dentro la scheda non aggiunge voci alla cronologia.

**UXH-007 e UXH-008: la prima vista della Home** (evidenze 01, 02, 18, 20)

- **Osservato a 390:**
  - banner del mockup, testata, «Menu della casa» aperto con tre pulsanti, hero con slogan e due pulsanti;
  - i contatori iniziano oltre la prima schermata;
  - «Da sapere oggi: 2 verifiche aperte» ripete il contatore «Da rivedere 2»;
  - «Le prossime attività» ripete «Da fare 2».
- **Osservato a 320:** la prima schermata contiene solo banner, menu ed hero.
- **Impatto:** chi apre Dimora vede uno slogan, non la propria casa né cosa richiede attenzione.
- **Criterio di accettazione:**
  - a 390×844 la prima vista mostra: indirizzo della casa, il blocco «Da fare ora» con almeno la prima voce, e gli ambienti o un ingresso agli oggetti;
  - nessun dato è ripetuto in due blocchi della Home.

**UXH-009: scheda oggetto** (evidenze 03, 06, 19)

- **Osservato:**
  - a 390 «Storia» va su una seconda riga; a 320 vanno a capo «Costi·2» e «Storia»;
  - l'occhiello passa da «Scheda oggetto» a «Oggetto» e il sottotitolo cambia a seconda della scheda;
  - la Sintesi spiega il prototipo («Valori dimostrativi…», «Documenti, attività e costi hanno sezioni proprie…»).
- **Impatto:** la scheda sembra cambiare pagina a ogni scheda; su telefono le schede su due righe non si leggono come un controllo unico.
- **Criterio di accettazione:**
  - intestazione stabile;
  - sezioni raggiungibili a 320 senza andare a capo;
  - cambio sezione senza nuove voci nella cronologia.

**UXH-014: la bozza della bolletta è troppo lunga** (evidenza 09)

- **Osservato:** circa 3339 px di altezza. Dall'alto verso il basso:
  1. fonte;
  2. candidato «Gas · settembre 80,00 € … Collega alla spesa esistente»;
  3. scelta dell'importo (nessuna preselezione, bene) con l'avviso sugli arretrati;
  4. 13 campi con i dettagli aperti;
  5. «Torna più tardi».
- **Impatto:** la decisione principale (nuova spesa o collegamento a una esistente, e quale importo) si confonde con i dettagli opzionali.
- **Criterio di accettazione:**
  - a 390 la prima vista mostra la fonte in sintesi, la domanda «È una spesa già registrata?» con i candidati, e la scelta dell'importo;
  - i dettagli sono chiusi;
  - i campi visibili prima di «Salva» sono al massimo 4 (importo, data, descrizione, collegamento).

---

## D. Architettura informativa proposta

Restano le quattro sezioni. Il menu secondario diventa un'icona «Casa ▾» in testata; su desktop è la stessa voce nella barra laterale.

```
CASA (home)
├─ Intestazione: indirizzo · selettore casa · menu ⋯ (Condivisioni, Storia, Impostazioni, Piano)
├─ Da fare ora          ← un solo blocco: verifiche aperte, attività entro 14 gg, comunicazioni nuove del condominio
├─ Ambienti             ← chip; + «Da collocare (n)» se n>0; + «Tutti gli oggetti»
├─ Spese, una riga      ← «Quest'anno 2.177,90 € · 1 da confermare →» (apre Spese)
├─ Condominio, una riga ← ultima comunicazione + «Segnala un problema»
└─ Azione + (globale)   ← Importa documenti · Aggiungi oggetto · Aggiungi ambiente · Registra spesa · Nuova attività
   Ambiente → Oggetti dell'ambiente → Scheda oggetto

SCHEDA OGGETTO (unica pagina a sezioni)
├─ Intestazione stabile: nome, tipo · ambiente, azioni ⋯
├─ Dati essenziali (con «proposto»/«confermato da te»)
├─ Da verificare (solo se esistono proposte aperte)
├─ Documenti (2 + «Vedi tutti»)
├─ Attività (prossima + «Vedi tutte»)
├─ Costi (anno corrente + «Vedi tutti» → Spese filtrate per oggetto)
└─ Storia (ultimi 3 eventi + «Vedi tutta»)

ATTIVITÀ
├─ Segmenti: Da fare · Da rivedere (n) · Completate
└─ Dettaglio attività / Nuova attività

DOCUMENTI
├─ Ricerca in testa, chip: Tipo · Oggetto · Visibilità
├─ Lista: nome, tipo · oggetto, eventuale «Proposte da rivedere», icona visibilità
├─ Documento: anteprima, informazioni, una azione primaria contestuale, menu ⋯
└─ Importa → Esito con i documenti importati

SPESE (sostituisce Spese + Economia)
├─ Totale del periodo (selettore anno/periodo) + «Registra»
├─ Da confermare (n) → bozze, incluse «accantonate»
├─ Segmenti: Elenco · Per oggetto · Lavori · Riepilogo
├─ Filtri in un foglio: periodo, categoria, oggetto, ambiente, lavoro
├─ Dettaglio spesa · Lavoro
└─ Registra → foglio: «Inserisci a mano» / «Da un documento»
```

**Eliminazioni proposte, esplicite:**
1. La pagina «Economia della casa» (`#/storico`) come destinazione separata, e la card «Esplora Economia» in Home. Le sue funzioni passano a Spese senza perdite:
   - ripartizione per gruppo → Riepilogo;
   - costi per oggetto → Per oggetto;
   - lavori → Lavori;
   - bozze → Da confermare;
   - filtri e confronto → foglio filtri / Riepilogo.
2. I contatori in Home: sono sostituiti da «Da fare ora» e dalla riga Spese.
3. Lo slogan come titolo di Documenti e della Home.
4. Il pulsante «Vai al condominio» sulla pagina del condominio stesso.

Nessuna funzione definita viene rimossa.

**Fuori dalla prima vista:**
- Condivisioni, Storia, Impostazioni, Piano: menu ⋯;
- Riepilogo per gruppo e confronto: segmento in Spese;
- filtri: foglio;
- dettagli opzionali della spesa: sezione chiusa.

**Contestuale e globale:**
- **Globale:** Importa, Registra spesa, Nuova attività (azione +), ricerca documenti.
- **Contestuale:** collegamenti, conferme, condivisione di un documento, filtri preimpostati (per esempio «Costi della caldaia»).

---

## E. Due alternative

### Alternativa 1: contenuta, «ricucire»

Struttura e pagine restano quelle attuali. Si correggono i ritorni (UXH-005/006), la catena importazione → bozza (UXH-002/003), il consenso (UXH-004) e i testi (UXH-012/018). Spese ed Economia restano due pagine, ma con lo stesso «Registra», «Da confermare» presente in entrambe e un nome più chiaro per la seconda, per esempio «Spese · analisi». La Home perde i contatori ridondanti.

- **Vantaggi:** costo basso; nessuna modifica di modello di navigazione; risolve tutti i P1.
- **Compromessi:**
  - resta la domanda «dove sono le mie spese?»;
  - resta la scheda a schede su due righe;
  - la Home resta una somma di card;
  - la percezione generale di «tanti archivi da imparare», che è la sensazione del committente, cambia poco.

### Alternativa 2: incisiva, «una casa, quattro porte»

È l'architettura della sezione D:
- Home come «Da fare ora» più gli ambienti;
- azione + unica;
- scheda oggetto come pagina unica a sezioni;
- Spese come unico ingresso economico a livelli;
- Da rivedere come segmento di Attività;
- menu secondario in testata.

Comprende tutte le correzioni dell'Alternativa 1.

- **Vantaggi:**
  - elimina la causa dei duplicati invece di nasconderli;
  - un solo punto per registrare;
  - un solo posto per le spese;
  - la scheda si legge dall'alto verso il basso come la memoria di un oggetto.
- **Compromessi:**
  - più lavoro sul mockup;
  - l'URL `#/storico` va reindirizzato;
  - la scheda a pagina unica diventa lunga per oggetti con molti dati e richiede «Vedi tutti» disciplinati;
  - spostare Da rivedere in Attività va verificato con il committente (questione I-2).

### Raccomandazione

Raccomando l'**Alternativa 2**, realizzata nell'ordine del piano H: prima gli interventi in comune con la 1, poi la riorganizzazione. Il problema segnalato dal committente è strutturale. Con la 1 si tolgono gli errori, ma la persona continua a vedere due pagine di spese, quattro blocchi che ripetono le stesse cose e una scheda che cambia volto. La 2 rispetta tutti i vincoli: quattro sezioni, AI propone, Da rivedere solo per le verifiche aperte, modulo economico aggiuntivo, nessuna copia dei documenti.

---

## F. Wireframe testuali (Alternativa 2)

Legenda:
- `[ ]` pulsante;
- `( )` scelta;
- `▸` riga apribile;
- `⋯` menu.

### Home a 390 px

```
┌──────────────────────────────────────┐
│ dimora   Via Roma 12 · A12 ▾      ⋯  │  ← ⋯ = Condivisioni, Storia, Impostazioni
├──────────────────────────────────────┤
│ Da fare ora                          │
│ ● 2 dati della caldaia da verificare▸│  → Attività › Da rivedere
│ ○ Pulire il filtro · Lavatrice       │
│   25 ott                           ▸ │
│ ○ Ascensore: intervento 20 ott 9–11 ▸│  → Condominio
│ [Vedi tutto in Attività]             │
├──────────────────────────────────────┤
│ La casa                              │
│ (Cucina) (Bagno) (Soggiorno)         │
│ (Ripostiglio) (Da collocare 1)       │
│ Tutti gli oggetti ▸                  │
├──────────────────────────────────────┤
│ Spese 2026     2.177,90 €          ▸ │
│ 1 da confermare                      │
├──────────────────────────────────────┤
│ Condominio · Studio Rossi          ▸ │
│ Ultima: Luce ingresso risolta        │
│ [Segnala un problema]                │
└──────────────────────────────────────┘
          [ + ]  ← Importa · Oggetto · Ambiente · Spesa · Attività
[Casa] [Attività] [Documenti] [Spese]
```

- **320 px:** i chip degli ambienti vanno su 3 righe. «Da fare ora» mostra 2 voci più «Vedi tutto». Il banner del mockup, solo nel mockup, si riduce a una riga richiudibile.
- **Desktop 1280:** barra laterale con le quattro sezioni e la voce «Casa ⋯». Contenuto su due colonne:
  - sinistra: «Da fare ora» e «La casa»;
  - destra: Spese e Condominio.

### Scheda oggetto a 390 px

```
← Cucina                                ⋯
Caldaia
Impianto di riscaldamento · Cucina
[Documenti 2] [Attività 1] [Costi 2] [Storia]  ← ancore che scorrono, su una riga
──────────────────────────────────────────
Dati essenziali
Marca      Termica Demo
Modello    TD28 · proposto
Potenza    24 kW utile · 28 kW nominale
──────────────────────────────────────────
Da verificare (2)                [Rivedi]   ← solo se aperte
──────────────────────────────────────────
Documenti
▸ Libretto impianto.pdf    Libretto
▸ Manuale caldaia.pdf      Manuale
[Vedi tutti (2)]  [Collega o importa]
──────────────────────────────────────────
Attività
○ Prenotare manutenzione annuale · 10 nov
[Nuova attività]
──────────────────────────────────────────
Costi · 2026            xx,xx €
▸ <costo 2026>          xx,xx €
Anni precedenti: xx,xx € (2025)  ← importi segnaposto
[Vedi in Spese]  [Registra costo]
──────────────────────────────────────────
Storia
· 14 ott — Potenza confermata da te (fonte: Libretto)
[Vedi tutta]
```

- I pulsanti di ancora scorrono la pagina e usano `replace` sull'URL `?sezione=`.
- **320 px:** le ancore scorrono in orizzontale su una riga, senza andare a capo.
- **Desktop:** le ancore diventano un indice laterale fisso a sinistra del contenuto.

### Documenti a 390 px

```
Documenti                       [Importa]
[🔍 Cerca per nome, tipo, oggetto      ]
(Tipo ▾) (Oggetto ▾) (Visibilità ▾)
Filtrato per «caldaia» · 2 risultati [Azzera]
──────────────────────────────────────────
▸ Libretto impianto.pdf
  Libretto · Caldaia        🔒 Solo io
  Proposte da rivedere
▸ Manuale caldaia.pdf
  Manuale · Caldaia         Persone della casa
```

Il documento aperto:
- **Azione primaria:** se esistono proposte aperte, «Rivedi proposte»; altrimenti «Apri Caldaia».
- **Menu ⋯:** Registra spesa da questo documento, Condividi, Cambia visibilità.

Adattamenti:
- **320:** i chip dei filtri scorrono.
- **Desktop:** filtri come colonna laterale; anteprima del documento a destra della lista.

### Attività e Da rivedere a 390 px

```
Attività                          [Nuova]
[Da fare 2] [Da rivedere 2] [Completate]
──────────────────────────────────────────
Da rivedere · Caldaia
Potenza: 24 kW utile o 28 kW nominale?
Fonte: Libretto impianto.pdf p.2  [Apri]
( ) 24 kW utile   ( ) 28 kW nominale
( ) Entrambi, sono grandezze diverse
[Conferma]   [Non ora]
```

Dopo la conferma la card sparisce e un messaggio in linea, non sovrapposto, dice «Salvato nella scheda Caldaia · [Apri]». Le attività completate mostrano «Completata il 14 ott».

### Spese a 390 px

```
Spese                           [Registra]
Periodo: 2026 ▾          2.177,90 €
Finanziamento incluso: 450,00 € ⓘ
──────────────────────────────────────────
Da confermare (1)                       ▸
──────────────────────────────────────────
[Elenco] [Per oggetto] [Lavori] [Riepilogo]
[Filtri · 0]
──────────────────────────────────────────
▸ Riparazione lavatrice      85,00 €
  12 ott · Lavatrice
▸ Gas · settembre            80,00 €
  30 set · Casa · documento collegato
```

- **«Registra»** apre un foglio con «Inserisci a mano», che chiede tre dati, oppure «Da un documento».
- **«Filtri»** apre un foglio con periodo, categoria, oggetto, ambiente e lavoro. «Applica» chiude il foglio, i filtri compaiono come chip e il totale diventa «Totale filtrato».
- **Riepilogo** contiene Gestione / Lavori e acquisti / Finanziamento / Non classificata.
- **Desktop:** filtri in colonna fissa; dettaglio della spesa in un pannello laterale, così la lista non perde lo scroll.

### Bozza da documento a 390 px

```
← Spese · Da confermare
Bolletta gas.pdf                  [Fonte]
──────────────────────────────────────────
È già registrata?
( ) Sì: Gas · settembre · 80,00 € · 30 set
( ) No, è una nuova spesa
──────────────────────────────────────────
Quale importo registri?
( ) 80,00 € consumo del periodo
( ) 100,00 € totale da pagare (include 20,00 € di arretrati)
ⓘ Gli arretrati possono essere già registrati altrove.
──────────────────────────────────────────
Data   [30/09/2026]
Descrizione [Gas · settembre]
▸ Altri dettagli (categoria, oggetto, lavoro, note)
──────────────────────────────────────────
[Salva spesa]        [Tienila da parte]
```

- Se si sceglie «Sì», i campi spariscono e il pulsante diventa «Collega il documento».
- **320 px:** le scelte sono radio a tutta larghezza; la fonte apre un foglio.
- **Desktop:** fonte affiancata a sinistra, decisioni a destra.

Prima della bozza c'è la pagina di analisi:

```
Compilazione assistita
Il testo del documento sarà inviato ad Anthropic per proporti i dati.
Li controlli e li confermi tu.
[ ] Acconsento all'invio di questo documento
[Analizza] (attivo solo con la casella)   [Inserisci a mano]
```

---

## G. Prima e dopo

Nella colonna «Prima», N = azione di navigazione, D = digitazione o scelta, S = salvataggio. Le sequenze sono quelle che ho eseguito. Il «Dopo» è il disegno proposto: non è stato misurato.

| # | Percorso | Prima (osservato) | Dopo (proposto) | Cosa si elimina |
|---|---|---|---|---|
| 1 | Manuale caldaia da Casa | Casa → Cucina (N) → Caldaia (N) → Documenti·2 (N) → manuale (N) → Indietro (N) → Indietro arriva al catalogo | Casa → Cucina (N) → Caldaia (N) → manuale nella sezione Documenti (N) → ← Caldaia → ← Cucina | Scheda Documenti separata; ritorno al catalogo |
| 2 | Riparazione 85 € dalla lavatrice | Lavatrice (N) → Costi (N) → Registra (N) → importo e descrizione (D) → Salva (S) → dettaglio del costo; «Indietro» dal modulo porta a Economia | Lavatrice (N) → «Registra costo» nella sezione Costi (N) → 2 dati (D) → Salva (S) → ritorno alla scheda con «Registrato · Riparazione 85,00 €» | Atterraggio sul dettaglio; uscita verso Economia |
| 3 | Bolletta importata → spesa | Importa (N) → importa (S) → esito → «Dati economici» (N) → documenti diversi → bolletta dimostrativa (N) → analizza → bozza di circa 3339 px → scelta importo (D) → Collega (S) | Importa (N) → importa (S) → esito con riga «Bolletta gas: dati economici proponibili» (N) → casella di consenso (D) → Analizza (S) → «È già registrata?» (D) → Collega (S) | Insieme dimostrativo estraneo; dettagli aperti; consenso implicito |
| 4 | Vedere i costi della caldaia del 2025 | Casa → «Esplora Economia» (N) → Filtri (N) → oggetto e periodo (D) → Applica (S) → pannello aperto, scroll di circa tre schermi | Spese (N) → Filtri (N) → oggetto e anno (D) → Applica: il foglio si chiude e compaiono i chip | Seconda pagina economica; pannello che resta aperto |
| 5 | Riprendere una bozza lasciata a metà | Bozza → «Accantona» (S) → la bozza non è più raggiungibile da Spese né da «Da confermare» | Spese → «Da confermare (1)» (N) → «Accantonate» → Riprendi (N) | Perdita della bozza; testo falso |
| 6 | Confermare la potenza e verificarla | Home: «Rivedi le proposte» (N) → conferma (S) con messaggio sovrapposto → «Apri la caldaia» (N) → Storia (N): «confermato dalla fonte», senza data | Home: «Da fare ora» (N) → conferma (S) con messaggio in linea «Salvato nella scheda · Apri» (N) → Storia nella stessa pagina: «14 ott · confermato da te» | Attribuzione sbagliata; messaggio sovrapposto |
| 7 | Condividere e revocare | Condivisioni (N) → Prepara (N) → destinatario e documenti (D) → manifesto (N) → Conferma (S) → Revoca (S, senza conferma) | Identico, più: avviso «documento finanziario» nel manifesto e conferma prima della revoca. La riga della condivisione si apre sui contenuti | Revoca accidentale; contenuto della condivisione invisibile |

---

## H. Piano delle modifiche

Tipi:
- **Pres.** = presentazione;
- **Nav.** = navigazione;
- **Comp.** = comportamento;
- **API** = contratto o API.

### Indispensabili prima del frontend S1

| # | Intervento | Tipo | Rilievi |
|---|---|---|---|
| 1 | Ritorni all'origine. Usare `ritorno` per tutte le aperture da scheda o ambiente; dopo il salvataggio tornare all'origine; cambio di sezione con `replace`; la barra in basso segue il compito | Nav. | 005, 006, 009 |
| 2 | Catena importazione → bozza sugli stessi documenti; esito per documento | Comp. | 002 |
| 3 | Casella di consenso esplicita prima dell'analisi | Comp. | 004 |
| 4 | Bozze accantonate recuperabili da Spese, con testo corretto | Comp. + API (lo stato «accantonata» deve essere elencabile) | 003 |
| 5 | Spese come unico ingresso: assorbe Economia (Riepilogo, Per oggetto, Lavori, Da confermare); `#/storico` reindirizzato; filtri in un foglio con chip e il filtro Ambiente | Nav. + API (il filtro per ambiente nella lista e nei totali va congelato nel contratto S1) | 001, 015 |
| 6 | Bozza riordinata: decisione esistente o nuova, importo, al massimo 4 campi, dettagli chiusi; candidati simili con il motivo | Pres. + API (motivo della somiglianza nei candidati) | 014 |

### Successive

| # | Intervento | Tipo | Rilievi |
|---|---|---|---|
| 7 | Home: «Da fare ora» unificato, chip ambienti con «Da collocare», righe Spese e Condominio, azione +; menu secondario in testata | Pres. + Nav. | 007, 008, 020 |
| 8 | Scheda oggetto a pagina unica a sezioni, con ancore | Pres. | 009, 013 |
| 9 | Pulizia del linguaggio: un solo vocabolario di visibilità allineato a M2; via i nomi in codice; stati tradotti; date in Storia; formato degli importi; attribuzione «confermato da te»; niente importi prima dell'analisi; conferma per revoca e vendita | Pres. + Comp. | 010, 011, 012, 016, 017, 018, 019, 021 |

### Da non fare

| # | Cosa | Perché |
|---|---|---|
| 10 | Non aggiungere una quinta voce nella barra (per esempio «Economia» o «Condominio») né una dashboard di riepilogo in Home con grafici | Moltiplica gli ingressi, cioè la causa principale dei problemi. Le analisi restano un livello di Spese. Nessuna previsione o promessa di risparmio (vincolo S1) |

---

## I. Questioni di prodotto

1. **Economia smette di essere una pagina separata?** Raccomando di sì: Spese con quattro viste. Il nome «Economia» può restare come titolo della vista Riepilogo, se il committente ci tiene.
2. **Da rivedere diventa un segmento di Attività?** Raccomando di sì. Oggi esiste già come rotta raggiungibile da Attività, e per l'utente «verificare un dato» è una cosa da fare. Il vincolo resta rispettato: contiene solo verifiche aperte, e la conferma vive nella scheda e nella storia.
3. **Scheda oggetto a schede o a sezioni?** Raccomando sezioni a pagina unica con ancore. Le schede su telefono vanno a capo, cambiano volto e moltiplicano la cronologia. Le sezioni con «Vedi tutti» rendono la scheda la «memoria» dell'oggetto.
4. **Vocabolario della visibilità.** Raccomando di adottare quello del runtime («Solo io» / «Persone della casa»), con la nota «nessuno al di fuori della casa vede il documento senza una condivisione». Va deciso prima di C1, altrimenti l'utente impara due modelli.
5. **Importo predefinito delle bollette con arretrati.** Raccomando di non preselezionare nulla, come fa oggi il mockup, e di mostrare sempre la scomposizione. Va confermato dal committente perché incide sul contratto dei candidati e della fonte dell'importo.

---

## Evidenze

Cartella `frontend-v5/docs/screenshots/home-ux-audit-20261014/`:

| File | Dimensione | Contenuto |
|---|---|---|
| `01-casa-390-prima-vista.jpg` | 390 | Prima vista della Home |
| `02-menu-della-casa-390.jpg` | 390 | Menu della casa aperto |
| `03-scheda-caldaia-390.jpg` | 390 | Scheda Caldaia |
| `04-documento-da-scheda-nav-documenti-390.jpg` | 390 | Documento aperto dalla scheda, barra su «Documenti» |
| `05-attivita-390.jpg` | 390 | Attività |
| `06-caldaia-costi-totale-pluriennale-390.jpg` | 390 | Costi della caldaia, totale senza periodo |
| `07-import-esito-nav-attivita-390.jpg` | 390 | Esito importazione, barra su «Attività» |
| `08-documenti-spesa-diversi-da-importati-390.jpg` | 390 | Documenti diversi da quelli importati |
| `09-bozza-bolletta-candidato-importi-390.jpg` | 390 | Bozza bolletta: candidato e importi |
| `10-spese-essenziali-390.jpg` | 390 | Spese |
| `11-economia-stessa-lista-390.jpg` | 390 | Economia con la stessa lista |
| `12-economia-filtri-aperti-dopo-applica-390.jpg` | 390 | Filtri ancora aperti dopo «Applica» |
| `13-lavoro-rifacimento-bagno-390.jpg` | 390 | Lavoro Rifacimento bagno |
| `14-condominio-390.jpg` | 390 | Condominio |
| `15-manifesto-condivisione-390.jpg` | 390 | Manifesto della condivisione |
| `16-storia-casa-stati-tecnici-390.jpg` | 390 | Storia con stati tecnici |
| `17-vendita-simulata-nav-attiva-390.jpg` | 390 | Vendita simulata, navigazione ancora attiva |
| `18-casa-320-prima-vista.jpg` | 320 | Prima vista della Home |
| `19-scheda-caldaia-320-schede-su-due-righe.jpg` | 320 | Schede della scheda su due righe |
| `20-casa-desktop-1280.jpg` | 1280 (immagine scalata a 800×500) | Home desktop |
