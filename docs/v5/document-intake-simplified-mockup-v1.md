# Documenti — mockup del flusso semplificato V2

16 ottobre 2026. Richiesto dal committente dopo audit Codex e Claude, semplificato ulteriormente dopo la prova guidata: eliminati «Salva scelta per dopo» e riepilogo aggiuntivo, introdotta selezione/conferma direttamente nell'elenco. Il nome del file conserva v1 per continuità dei riferimenti; questa revisione V2 prevale. URL locale: `http://127.0.0.1:5174/mockup-documenti-semplificato.html?caso=multiplo#/lavoro`.

## Confine

Prototipo HTML standalone separato dal runtime React e dalle API. Dati sintetici; non legge file dell'utente e non avvia AI, email o richieste al backend. I PDF di esempio sono statici sintetici, collegati esplicitamente dalla revisione. Lo stato del mockup usa una nuova chiave sessionStorage dedicata: `dimora.mockup.documenti-semplificato.v2`, separata dalle prove V1. Nessun token, documento reale o stato dell'app usato. «Ricomincia questo caso» ripristina soltanto lo scenario sintetico selezionato. Le caselle non sono persistite: reload e cambio filtro azzerano la selezione, conservando i documenti già confermati.

Non è l'implementazione definitiva, non prova API/DB/idempotenza o classificazione e non modifica la specifica applicativa approvata. Grafica e colori riprendono Dimora esistente; il target della revisione è il percorso.

## Comportamenti da validare insieme

- Un'area di lavoro dopo il caricamento, con stato per documento. Aggiunta sotto l'elenco, conserva scelte e risultati precedenti.
- Lettura locale automatica SIMULATA, senza un avvio separato. L'automatismo nel prodotto richiede ancora approvazione esplicita della nuova specifica; mai esteso per implicazione a provider esterni.
- «Conferma e organizza» applica immediatamente nel mockup. Nessuna casella di conferma generica ulteriore.
- Nessuno stato separato «Scelte salvate». Gli stati visibili sono Da rivedere, Più tardi e Completati (organizzati o mantenuti invariati).
- Nel multiplo le proposte disponibili mostrano caselle inizialmente vuote e titolo/tipo/destinazione leggibili nell'elenco. «Organizza N documenti selezionati» applica subito quelle proposte, senza dialogo o casella aggiuntiva; gli altri restano in attesa.
- «Seleziona le N proposte disponibili» è una scelta esplicita opzionale. Non seleziona copie, conflitti, tipi da indicare, rimandati o completati. Nei filtri privi di proposte selezionabili non compare.
- Copie, conflitti e documenti senza tipo richiedono il dialogo dedicato: nessuna organizzazione multipla aggira le decisioni o il consenso specifico.
- Tipo e destinazione risultante prima dell'originale; fonte accanto su desktop, sezione apribile dopo i campi su telefono. Collegamento al PDF sintetico disponibile.
- Copie: nessuna scelta preselezionata; Mantieni lascia un solo documento e dati invariati. Aggiorna chiede consenso se cambia dati confermati.
- Conflitti: confronto attuale/proposto, mantenimento o proposta; consenso specifico alla sostituzione non preselezionato e invalidato se si cambiano i valori.
- Chiusura con modifiche non salvate chiede se scartarle; salvataggio è un'azione esplicita distinta.
- Modifica dal dettaglio/elenco del mockup, senza dover cercare un vecchio caricamento.

## Quattro casi navigabili

| Caso | Esempio | Cosa osservare |
|---|---|---|
| Singolo | Un APE | Carica esempio → Rivedi → Conferma e organizza → Documenti: subito in Energia |
| Più documenti | APE, CILA+agibilità, regolamento, ricevuta, scansione | Selezione diretta delle proposte, conferma unica dei selezionati, aggiunta, applicazione parziale, ripresa |
| Copia già presente | Copia dell'APE archiviato | Mantieni non crea né riclassifica; Aggiorna separa la modifica dal riuso |
| Dati in conflitto | Visura prima classificata Altro | Attuale/proposto, consenso obbligatorio, destinazione Pratiche edilizie solo dopo conferma |

La scansione nel caso multiplo richiede tipo manuale; nessuna falsa estrazione. La ricevuta è soltanto classificata, nessun costo o oggetto implicito. I PDF multiparte restano originali unici. «Altro» nel mockup non viene presentato come un compito incompiuto per forza.

## Verifiche effettuate

Sintassi dello script controllata con Node. Prove nel browser integrato sui componenti del mockup, non sull'app reale:

- singolo: conferma effettiva e presenza in archivio;
- multiplo V2: due caselle selezionate, una sola azione Organizza, zero dialoghi prima/dopo la conferma, due applicati e tre ancora da rivedere;
- rinvio della scansione: compare in Più tardi, esclusa dalla selezione; seleziona disponibili comprende soltanto le due proposte residue;
- reload V2: risultati confermati e rinvio conservati, zero caselle selezionate; nessun bottone o stato Salva scelta presente;
- copia: azione disabilitata prima della scelta, mantenimento invariato, esattamente una riga in archivio;
- conflitto: conferma senza consenso bloccata con messaggio; con consenso applicazione in Pratiche edilizie;
- scansione: nessun tipo → errore; scelta SCIA → conferma applicata;
- viewport 390×844 e 320×740: nessun overflow orizzontale osservato; in V2 il comando fisso della selezione resta dentro lo schermo (bottom 832/844 e 728/740); controlli precedenti del dialogo singolo V1 documentati separatamente;
- console del mockup senza errori osservati.

Screenshot in `outputs/mockup-documenti-semplificato-20261016/`, V2 con suffisso v2. Catture immediatamente dopo resize inaffidabili scartate; immagine V2 selezione 390 ispezionata e accettata. Non si dichiara conformità accessibilità completa, prova con telefono fisico o comprensione da parte di persone non guidate. Nessuna suite del prodotto rieseguita: non ci sono modifiche al suo runtime. La semantica di selezione diretta dell'elenco dovrà essere recepita nella specifica prima dell'implementazione, distinta dalla vecchia regola di apertura esplicita per ciascun file.

## Prova con il committente

Ripartire da Più documenti. Controllare e selezionare APE e CILA direttamente nell'elenco, premere una sola volta Organizza 2 documenti selezionati, verificare due completati e tre da rivedere. Poi copia e conflitto, ancora individuali. Annotare esitazioni e aspettative prima di dare spiegazioni. Al termine decidere flusso e testi, emendare la specifica applicativa e soltanto dopo assegnare l'implementazione.
