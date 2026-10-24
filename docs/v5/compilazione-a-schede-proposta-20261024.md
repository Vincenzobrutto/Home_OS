# Compilazione del documento a schede — proposta UX/UI, 24 ottobre 2026

Proposta Claude su richiesta del committente: rendere **sequenziali** le operazioni della compilazione dopo il caricamento, una decisione per scheda, invece della pagina unica attuale. **Solo proposta: nessun codice modificato.** Da implementare in un lotto frontend separato, dopo l'approvazione del committente. Prototipo cliccabile: artefatto Claude privato del committente «Compilazione documento a schede»; questo documento ne descrive tutto il contenuto, così si può lavorare senza aprirlo.

## Situazione attuale

Rotta dello spazio di lavoro documenti ([decisione del 18/10](document-editor-workspace-20261018.md)): la scheda centrale riusa `UnifiedReview` e `ItemEditor` (`frontend-v5/src/object-onboarding/`). In un'unica colonna stanno:

- dati del documento (`documentFields`) e «Conserva solo il documento»;
- in modalità editor, la sezione `<details>` «Spese» (`houseFields` e costi degli articoli);
- la sezione «Oggetti · N da creare, M da collegare», dove ogni articolo apre un `ItemEditor`: scelta dell'azione (`create`, `link`, `skip`, `document_only`), nome, tipo, campi della scheda, arricchimento e, fuori dalla modalità editor, anche il costo;
- i contatti, quando ci sono proposte;
- il riepilogo `SaveSummary` con «Prima di salvare» (`reviewIssues`) e la barra di salvataggio («Salva bozza ed esci», «Salva e organizza»).

Problemi rilevati: le decisioni sono annidate (prima la direzione di ogni riga, poi i suoi dettagli, poi il costo, poi i doppioni), l'utente non vede a che punto è, e su telefono la pagina diventa una colonna molto lunga (screenshot del 18/10, `unified-review-final-mobile-20261018.png` negli output locali della chat).

## Principio

**Una decisione per scheda, nell'ordine in cui la si prende.** Prima che documento è, poi cosa contiene, poi i dettagli di ciò che va creato o collegato, poi i costi, infine un riepilogo con una sola conferma. Le schede successive dipendono dalle scelte fatte, e quelle che non servono non compaiono.

Il salvataggio resta **unico e atomico alla fine**, come oggi: nessuna nuova API, nessun salvataggio parziale nascosto. Le schede sono una diversa presentazione dello stesso stato del modulo (`forms`, `houseForms`, contatti) e della stessa conferma.

## Struttura della pagina

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ← Documenti da completare · 3 di 7          [Mostra/Nascondi originale]       │
│ APPARTAMENTO ROMA                            [Salva bozza ed esci]            │
│ Fattura Elettrocasa — 14/06/2026                                              │
│                                                                               │
│ (1 Documento) (2 Contenuto) (3 Articolo 1 di 2) (4 Articolo 2 di 2) (5 Spese) (6 Riepilogo) │
│ ┌──────────────── scheda corrente ───────────────┐ ┌──── originale ────┐      │
│ │ Passaggio N                                     │ │ anteprima PDF      │      │
│ │ Titolo della domanda                            │ │ riga corrente      │      │
│ │ riga di spiegazione                             │ │ evidenziata        │      │
│ │ … campi della sola decisione corrente …         │ │                    │      │
│ │ ─────────────────────────────────────────────── │ └────────────────────┘      │
│ │ [Indietro]           Passaggio N di M  [Avanti] │                             │
│ └─────────────────────────────────────────────────┘                             │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Barra dei passaggi**: elenco ordinato (`<ol>`), ogni passaggio con numero o spunta. Stati: fatto (spunta, cliccabile per tornarci), corrente (`aria-current="step"`, evidenziato), da fare (tratteggiato, non cliccabile). Le etichette si aggiornano con le scelte («Articolo 1 di 2»).
- **Scheda corrente**: una sola, larghezza massima 760 px; titolo come domanda, una riga di spiegazione, i campi, poi il piede con «Indietro» e «Avanti» (sull'ultima «Conferma e salva»).
- **Originale affiancato** e richiudibile, come oggi. Nelle schede articolo la riga del documento corrispondente viene evidenziata (quando la proposta ha la pagina o la riga di provenienza; altrimenti nessuna evidenziazione).
- **«Salva bozza ed esci»** sempre visibile in testata, con lo stesso comportamento attuale. L'avviso prima di scartare modifiche resta.

## Le schede

### 1. Documento — «Che documento è?»

Titolo, tipo di documento, data, fornitore: gli stessi `documentFields`, precompilati dall'AI quando c'è una proposta. Sotto, la scelta dell'ambito:

- **Registrare cosa contiene** (predefinito quando la proposta contiene articoli o spese): oggetti, collegamenti e spese, una scheda alla volta.
- **Conservare solo il documento**: porta direttamente al Riepilogo; nessun oggetto, spesa o contatto (stessa semantica dell'attuale `documentOnly`).

L'avvio «Precompila con AI» e il consenso esistente restano prima di questa scheda, invariati; una proposta pronta viene riaperta senza nuovo invio.

### 2. Contenuto — «Cosa contiene la fattura?»

Un riquadro per riga proposta (o aggiunta a mano), con nome e importo, e quattro scelte a pulsante, una sola attiva (`aria-pressed`):

| Scelta | Azione esistente | Effetto sulle schede |
| --- | --- | --- |
| Nuovo oggetto | `create` | apre la scheda articolo «crea» |
| Collega a uno esistente | `link` | apre la scheda articolo «collega» |
| Solo spesa, nessun oggetto | spesa diretta senza oggetto, dove il tipo di documento la prevede (oggi «invoice/receipt direct expense with optional object none») | nessuna scheda articolo; il costo compare in Spese |
| Non riguarda la casa | `skip` | nessuna scheda; esclusa anche da Spese |

Sotto ogni riga, una frase che dice cosa succederà («Creiamo la scheda dell'oggetto nella prossima scheda», «Esclusa: nessun oggetto e nessuna spesa»). Le scelte non disponibili per quel tipo di documento non vengono mostrate. `document_only` resta un caso dei documenti tecnici, gestito come oggi. «Aggiungi un altro articolo» sta qui.

Per **bollette** e documenti senza articoli questa scheda non compare: si passa dal Documento alle Spese.

### 3. Una scheda per articolo — «Articolo i di n»

Solo per le righe con «Nuovo oggetto» o «Collega», nell'ordine del documento.

- **Crea**: nome (abbreviato e modificabile), tipo, stanza, marca e modello con l'indicazione «dalla fattura, pag. 1» quando c'è una fonte, data di acquisto. «Altri dati facoltativi: seriale, garanzia, manuale» in un riquadro richiudibile che non blocca l'avanzamento. Corrisponde a `ItemEditor` con `part='object'`.
- **Collega**: ricerca tra gli oggetti della casa e lista dei suggeriti (gli stessi candidati di oggi) con scelta singola; avviso che collegare non cambia i dati già confermati dell'oggetto; eventuali differenze da riprendere come oggi.

### 4. Spese — «Quali spese registrare?»

Totale del documento in testa. Un riquadro per ogni riga non esclusa: nome, destinazione («Collegata al nuovo oggetto», «Collegata a TV Samsung…», «Spesa della casa, senza oggetto»), importo e «Cosa fare con il costo» (registra come nuova spesa / collega una spesa già presente / non registrare). Gli avvisi di possibile doppione stanno qui, in testa alla scheda, con le stesse conferme esplicite di oggi («Ho verificato che è una spesa distinta…»). Corrisponde a `ItemEditor` con `part='expense'` e a `HouseExpenseProposal`.

Scheda saltata se tutte le righe sono escluse o se l'ambito è «solo il documento».

### 5. Contatti — solo se ci sono proposte

Contenuto attuale di `ContactProposals`, invariato, in una propria scheda tra Spese e Riepilogo.

### 6. Riepilogo — «Controlla e conferma»

Un blocco per area, ognuno con «Modifica» che riporta alla sua scheda: Documento, Oggetti (nuovi e collegamenti), Spese (nuove, collegate, importi), Esclusi, Contatti. Sotto, «Prima di salvare» con i problemi residui come link alla scheda che li risolve. Poi «Conferma e salva», con la frase «Niente è ancora salvato. Registriamo tutto insieme; se qualcosa non va, non salviamo nulla».

Dopo la conferma: messaggio di esito e «Apri il prossimo» (coda attuale «Salva e passa al successivo») oppure «Torna ai documenti».

## Regole di comportamento

- **Avanti** controlla solo la scheda corrente: se mancano dati obbligatori di quella scheda, i campi vengono segnalati lì e il passaggio non avanza. La bozza invece si salva sempre, anche incompleta, come oggi.
- **Indietro** e i passaggi fatti non perdono nulla: lo stato è unico per tutto il flusso.
- **Cambiare una scelta** in Contenuto aggiorna subito barra e schede successive. Se una riga passa da «Nuovo oggetto» a «Non riguarda la casa», i dati già inseriti nella sua scheda vengono conservati in memoria fino al salvataggio, e tornano se si ripristina la scelta.
- **I problemi di `reviewIssues`** si mappano alla scheda: Nome/Tipo alla scheda articolo, Prezzo/Data/Costo alle Spese, documento alla scheda Documento. Il riepilogo li elenca come link.
- **Nessuna decisione automatica nuova**: conferme, doppioni, consenso AI, versione/SHA della fonte e idempotenza restano quelli attuali.
- **Analisi in corso o proposta da verificare**: si resta sulla scheda Documento con lo stato attuale; le schede successive si sbloccano quando la proposta è pronta.
- **Percorso breve**: con un solo articolo e nessun problema, le schede restano tre o quattro (Documento → Articolo → Spese → Riepilogo). Nessuna scorciatoia che salti il riepilogo.

## Telefono

- Barra dei passaggi compatta: testo «Passaggio 3 di 6 · Articolo 1 di 2» più una barra a segmenti; l'elenco completo si apre toccandola.
- «Vedi originale» come link in alto che apre l'anteprima sopra la scheda.
- Piede fisso in basso con «Indietro» e «Avanti · Articolo 2» (etichetta della scheda successiva), area tattile di almeno 44 px, rispettando la barra di navigazione inferiore esistente.
- Nessuno scorrimento orizzontale a 390 px.

## Accessibilità

Elenco dei passaggi con `aria-current="step"`; titolo della scheda (`h2`) che riceve il focus a ogni cambio; scelte del Contenuto come pulsanti con `aria-pressed` raggruppati da un'etichetta; annuncio del cambio di passaggio (`aria-live="polite"`); tutto raggiungibile da tastiera; contrasti come i token attuali.

## Ambito tecnico suggerito per il lotto

- Solo `frontend-v5`, nessuna modifica a backend, API o schema.
- Nuovo componente contenitore del flusso (per esempio `CompilationSteps`) che riceve le stesse proprietà di `UnifiedReview` e ne riusa i pezzi: `documentFields`, `ItemEditor` con `part='object'` e `part='expense'`, `HouseExpenseProposal`, `ContactProposals`, `SaveSummary`, `reviewIssues`/`reviewProblem`/`reviewTotals`.
- La costruzione dell'elenco dei passaggi va in una funzione pura testabile: input bozza, form e ambito; output l'elenco ordinato con chiave, etichetta e stato.
- Il passaggio corrente può stare nell'URL (`?passo=…`), così il ricaricamento riparte dalla scheda giusta; i campi restano in memoria come oggi.
- `UnifiedReview` resta disponibile finché il nuovo flusso non è approvato nel collaudo, dietro una scelta di rendering, per non rompere i test esistenti; poi va deciso se ritirarlo.

## Criteri di accettazione

1. Fattura con tre righe (nuovo oggetto, collegamento, esclusa): sei passaggi, cioè Documento, Contenuto, due Articoli, Spese e Riepilogo; conferma unica; stesso payload di conferma della pagina attuale per le stesse scelte.
2. «Conservare solo il documento»: dal Documento direttamente al Riepilogo; nessun oggetto o spesa.
3. Bolletta: nessuna scheda Contenuto o Articolo.
4. Cambio di scelta in Contenuto: barra e schede si aggiornano, i dati inseriti non si perdono tornando indietro.
5. Un dato mancante blocca «Avanti» solo nella sua scheda; «Salva bozza ed esci» funziona da ogni scheda.
6. Doppione di spesa: avviso e conferma esplicita nella scheda Spese, come oggi.
7. Tastiera e lettore di schermo: focus sul titolo a ogni passaggio, `aria-current` corretto.
8. Telefono a 390 px: piede fisso, nessuno scorrimento orizzontale.
9. Suite mock frontend completa verde, senza indebolire le asserzioni esistenti; nuovi test per la funzione dei passaggi e per i criteri 1–7.

## Domande aperte per il committente

1. Contatti in una scheda propria (proposta) o dentro il Riepilogo?
2. La scelta «Solo spesa, nessun oggetto» va mostrata anche quando il tipo di documento oggi non la prevede, o solo dove esiste già?
3. Ritirare la pagina unica quando il nuovo flusso è approvato, o lasciarla come vista «tutto in una pagina» per utenti esperti?

## Vincoli

Nessuna AI o email a pagamento, nessun DB/API/storage reale, nessun `.env`. Prove nel harness mock del frontend; collaudo browser solo su backend simulato o collaudo isolato concordato. Prima di iniziare, verificare in «Lotti in corso» le sovrapposizioni sui file di `frontend-v5/src/object-onboarding/` (al 24/10 risultano lotti Codex su `apparatusSuggestions.ts`, `model.ts` e `ItemEditor`).
