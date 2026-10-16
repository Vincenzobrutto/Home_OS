# Documenti — mockup del flusso semplificato V1

16 ottobre 2026. Richiesto dal committente dopo audit Codex e Claude. URL locale: `http://127.0.0.1:5174/mockup-documenti-semplificato.html?caso=singolo#/carica`.

## Confine

Prototipo HTML standalone separato dal runtime React e dalle API. Dati sintetici; non legge file dell'utente e non avvia AI, email o richieste al backend. I PDF di esempio sono statici sintetici, collegati esplicitamente dalla revisione. Lo stato del mockup usa una chiave sessionStorage dedicata: `dimora.mockup.documenti-semplificato.v1`. Nessun token, documento reale o stato dell'app usato. «Ricomincia questo caso» ripristina soltanto lo scenario sintetico selezionato.

Non è l'implementazione definitiva, non prova API/DB/idempotenza o classificazione e non modifica la specifica applicativa approvata. Grafica e colori riprendono Dimora esistente; il target della revisione è il percorso.

## Comportamenti da validare insieme

- Un'area di lavoro dopo il caricamento, con stato per documento. Aggiunta sotto l'elenco, conserva scelte e risultati precedenti.
- Lettura locale automatica SIMULATA, senza un avvio separato. L'automatismo nel prodotto richiede ancora approvazione esplicita della nuova specifica; mai esteso per implicazione a provider esterni.
- «Conferma e organizza» applica immediatamente nel mockup. Nessuna casella di conferma generica ulteriore.
- «Salva scelta per dopo» conserva una scelta non applicata; il contatore e il comando fisso compaiono soltanto per queste scelte già riviste.
- «Controlla e organizza N documenti» apre un riepilogo compatto nello stesso contesto. «Organizza N» applica solo quei documenti, gli altri restano in attesa.
- Tipo e destinazione risultante prima dell'originale; fonte accanto su desktop, sezione apribile dopo i campi su telefono. Collegamento al PDF sintetico disponibile.
- Copie: nessuna scelta preselezionata; Mantieni lascia un solo documento e dati invariati. Aggiorna chiede consenso se cambia dati confermati.
- Conflitti: confronto attuale/proposto, mantenimento o proposta; consenso specifico alla sostituzione non preselezionato e invalidato se si cambiano i valori.
- Chiusura con modifiche non salvate chiede se scartarle; salvataggio è un'azione esplicita distinta.
- Modifica dal dettaglio/elenco del mockup, senza dover cercare un vecchio caricamento.

## Quattro casi navigabili

| Caso | Esempio | Cosa osservare |
|---|---|---|
| Singolo | Un APE | Carica esempio → Rivedi → Conferma e organizza → Documenti: subito in Energia |
| Più documenti | APE, CILA+agibilità, regolamento, ricevuta, scansione | Conferme singole oppure scelte salvate, aggiunta, applicazione parziale, ripresa |
| Copia già presente | Copia dell'APE archiviato | Mantieni non crea né riclassifica; Aggiorna separa la modifica dal riuso |
| Dati in conflitto | Visura prima classificata Altro | Attuale/proposto, consenso obbligatorio, destinazione Pratiche edilizie solo dopo conferma |

La scansione nel caso multiplo richiede tipo manuale; nessuna falsa estrazione. La ricevuta è soltanto classificata, nessun costo o oggetto implicito. I PDF multiparte restano originali unici. «Altro» nel mockup non viene presentato come un compito incompiuto per forza.

## Verifiche effettuate

Sintassi dello script controllata con Node. Prove nel browser integrato sui componenti del mockup, non sull'app reale:

- singolo: conferma effettiva e presenza in archivio;
- multiplo: due scelte salvate, aggiunta sesto esempio senza perdita, riepilogo di due e applicazione di due, quattro ancora da rivedere;
- copia: azione disabilitata prima della scelta, mantenimento invariato, esattamente una riga in archivio;
- conflitto: conferma senza consenso bloccata con messaggio; con consenso applicazione in Pratiche edilizie;
- scansione: nessun tipo → errore; scelta SCIA → conferma applicata;
- viewport 390×844 e 320×740: nessun overflow orizzontale osservato; pulsante principale dentro l'altezza visibile nel dialogo singolo;
- console del mockup senza errori osservati.

Screenshot nuovi in `outputs/mockup-documenti-semplificato-20261016/`. Cattura immediata dopo resize del conflitto scartata perché compressa; immagini singolo 390 e 320 ispezionate e accettate. Non si dichiara conformità accessibilità completa, prova con telefono fisico o comprensione da parte di persone non guidate. Nessuna suite del prodotto rieseguita: non ci sono modifiche al suo runtime.

## Prova con il committente

Partire da Singolo, un passo alla volta. Prima verificare che «Conferma» comunichi l'applicazione definitiva; poi multiplo con salvataggio non applicato; infine copia e conflitto. Annotare esitazioni e aspettative prima di dare spiegazioni. Al termine decidere flusso e testi, emendare la specifica e soltanto dopo assegnare l'implementazione.
