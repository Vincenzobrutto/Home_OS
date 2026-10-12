# Dimora Home — Importazione massiva, riconciliazione e revisione UX v0.1

**Data:** 13 ottobre 2026  
**Stato:** specifica UX approvata in conversazione; nessuna implementazione dichiarata.  
**Riferimento:** DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md e DIMORA_HOME_UX_CONSOLIDATED_v0.1_20261012.md. In conflitto prevalgono le decisioni più recenti esplicite.

## 1. Scopo e principi
Il proprietario può partire da documenti, ambienti o asset, senza dover compilare prima un inventario. I documenti originali rimangono conservati anche se estrazione e riconoscimento falliscono. Elaborazione AI secondo disponibilità del piano e quota, mai illimitata o implicita. Le proposte vengono separate dai dati confermati. Nessuna certificazione o verifica normativa automatica.

## 2. Percorso completo
1. **Carica:** selezione multipla PDF, scansioni o foto; feedback su formati, limiti, duplicati identici e caricamenti falliti. L'utente può abbandonare la schermata senza perdere il lavoro recuperabile.
2. **Elabora:** stati distinti ricevuto/archiviato/in coda/in analisi/completato/non elaborabile; la classificazione non implica correttezza. Mostrare quote AI e consenso quando necessario. Il documento non leggibile rimane consultabile.
3. **Riepiloga:** conteggi dei documenti elaborati, asset e collegamenti proposti, anomalie, conflitti e elementi ancora da verificare; un gruppo per asset/argomento con rinvio al documento di origine.
4. **Rivedi:** unica Inbox **«Da rivedere»**; mostra gruppi e priorità, non 35 righe indistinte. Distinguere conflitti critici, documenti illeggibili, dati a basso rischio, informazioni mancanti e proposte opzionali (queste ultime in «Suggerimenti», non nel lavoro obbligatorio).
5. **Conferma:** selezione multipla per informazioni a basso rischio; per valori normativi/finanziari/permessi richiedere conferma puntuale. Dato corretto dall'utente non sovrascritto da AI.
6. **Esito:** **riepilogo con prossima azione contestuale** (opzione C approvata): asset creati, documenti collegati, verifiche residue, azione suggerita e «Torna alla Casa» sempre disponibili. Suggerimento non obbligatorio e preferibilmente deterministico.

## 3. Creazione e visualizzazione degli asset provvisori
- **A approvata:** dopo riconoscimento, creare subito **scheda asset provvisoria** «Da confermare», anche prima dell'intervento dell'utente. Non presentarla come definitivamente acquisita.
- Mettere l'asset nel luogo suggerito o in «Da collocare»; conservare legami a documenti/fonte/versione e grado di certezza come proposta, non attestazione.
- **C adattiva approvata:** pochi asset provvisori mostrati assieme agli altri con stato riconoscibile; molti raggruppati in «Elementi da confermare», con conteggio e accesso all'unica «Da rivedere».
- Nessun obbligo normativo, scadenza automatica, avviso esterno o integrazione scattante finché le informazioni che lo richiedono non sono state confermate e la norma applicabile non sia verificata.

## 4. Duplicati e conflitti
- File tecnicamente identici: riconoscimento per hash, senza necessità AI; conservare collegamenti e non perdere la provenienza.
- Documenti diversi che probabilmente riferiscono allo stesso oggetto: proporre una scheda provvisoria e collegare le fonti. Distinguere esplicitamente "stesso modello" da "stesso esemplare".
- Asset simili o omonimi: chiedere unione, separazione o rinvio. **Mai unire automaticamente asset già confermati**, ad esempio due climatizzatori uguali in stanze diverse.
- **Conflitto C approvato:** confrontare semantica e unità dei parametri prima di dichiarare incongruenza. In caso di vera divergenza, mantenere valori e fonti, spiegare il dubbio e richiedere scelta umana. Dati che impattano obblighi normativi o sicurezza restano «Da verificare» finché non chiariti.
- L'utente può differire la decisione; no blocco del resto della Home.

## 5. Wireframe W — Caldaia provvisoria dopo importazione
**Header**: Caldaia [marca/modello se suggeriti], posizione suggerita, stato «Da confermare», icona foto/impianto, ricerca persistente.
**Card "Da controllare"**: numero di questioni aperte; ordine: conflitti potenzialmente normativi, associazioni documentali, dati descrittivi.
**Dati tecnici**: marca, modello, combustibile, potenza con **nome esatto della grandezza e unità**, ubicazione; valore di origine distinto da valore confermato, fonte apribile.
**Documenti**: libretto, scheda tecnica, eventuale RCEE e fatture; tag «associazione proposta» fino a conferma, storico provenienza e versioni.
**Scadenze**: se mancano dati sufficienti, «Periodicità da verificare», non inventare scadenza; distinguere promemoria privato, manutenzione consigliata e obbligo fonte/versione/applicabilità verificati.
**Storico**: importazione, proposta asset, collegamenti e conferme/variazioni con fonte.
**Caso esemplificativo fittizio**: il libretto indica 24 kW e la scheda tecnica 28 kW; può essere differenza fra parametri (utile al riscaldamento vs nominale, ecc.). Non chiedere di scegliere solo un numero: identificare la denominazione della grandezza originale o mantenere entrambe le grandezze in campi distinti, con conferma. Non usare uno dei numeri per calcolare obblighi finché il campo normativamente rilevante non è validato.
**Autorizzazioni**: confermare un collegamento documentale non certifica la correttezza dei valori contenuti; approvazione dati non certifica regolarità impianto.

## 6. Criteri di accettazione UX
- 20+ documenti: l'utente ottiene un riepilogo orientato agli oggetti senza 20+ passaggi obbligatori.
- Fallimento AI: fonte originale visibile; possibilità di classificazione/manuale e recupero import.
- Identità di modello non comporta fusione irreversibile; almeno un flusso di "mantieni separati".
- Il proprietario distingue visivamente «proposto» da «confermato» e può risalire alla fonte.
- Dopo conferma parziale, nessuna proposta rimanente sparisce o si auto-conferma.
- «Da rivedere» riunisce le azioni necessarie; suggerimenti opzionali restano distinti.
- Asset provvisorio non attiva alert normativo o invio esterno.
- Risultato dell'importazione mostra cambiamenti, residue e prossimo passo, con uscita facoltativa.
- Su smartphone accessibilità anche senza foto ambienti e senza riconoscimento AI.
- Le schermate prototipo rendono evidente cosa è mock e cosa funzionante.

## 7. Integrazione nell'ecosistema e prossimi lavori
Questa specifica è per Home e non altera i workflow approvati di Partner Agenzie / Amministratori. Il componente ingestion/provenance/review va progettato riusabile fra tre esperienze, rispettando identità documentali e permessi separati. Prossimi wireframe Partner Agenzie: incarico → checklist/raccolta → dossier → Gift. Seguirà Partner Amministratori: edificio → ingestione → piano tecnico → pubblicazione versionata.

**Fuori ambito di questa modifica:** codice sorgente, ADR, backlog tecnico, billing, certificazione normativa, regole e soglie economiche.
