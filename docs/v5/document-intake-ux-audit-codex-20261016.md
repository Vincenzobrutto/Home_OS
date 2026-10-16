# Documenti — audit UX indipendente Codex

16 ottobre 2026. Baseline 7ea670020ae906e29955c716ce986f93d0c3c58c. Proposte da confrontare con Claude e validare con il committente: NON sono decisioni implementative approvate.

## Metodo e limiti

Revisione mirata del codice corrente, specifica con ultimi emendamenti e osservazioni della navigazione assistita del committente. Nessuna nuova prova browser o test automatico in questo audit; nessuna modifica a documenti, codice o classificazioni. I test funzionali precedenti provano singoli comportamenti, non la comprensione di un utente senza assistenza. Nessun documento personale incluso nel rapporto. Gravità: Alta compromette il raggiungimento/comprensione dell'obiettivo, Media aumenta attrito o errori recuperabili. Nessuna valutazione quantitativa su utenti reali inventata.

## Rilievi prioritari

| ID | Priorità / evidenza | Problema e conseguenza | Proposta da validare |
|---|---|---|---|
| UX-01 | Alta, osservato e codice | Una copia può essere riusata senza applicare la categoria proposta. Il committente si aspettava Pratiche edilizie ma aveva mantenuto l'organizzazione precedente. Le nuove etichette chiariscono il caso, però l'esito generale conta ancora il riuso come «decisione applicata» e promette «Più ordine». | Distinguere sempre documenti organizzati, già presenti invariati e ancora da rivedere. La deduplica deve conservare un originale, mentre la scelta esplicita riguarda l'organizzazione desiderata. Non confondere conferma del riuso e applicazione della proposta. |
| UX-02 | Alta, percorso da codice; comprensione osservata | «Usa questa organizzazione» salva una scelta, poi servono riepilogo, casella e conferma finale. L'utente può credere che la prima azione abbia già spostato il documento. Passaggi locali e globali mescolano salvataggio bozza ed effetto finale. | Etichetta locale «Salva la scelta» con stato «Da applicare». Una sola azione finale esplicita «Organizza N documenti», mostrando prima il risultato. Valutare la rimozione della casella generale ridondante; conservare consensi puntuali di sostituzione e analisi. |
| UX-03 | Alta, codice e limiti del parser | «Rivedi le proposte» è disponibile anche senza proposte. Scansioni e immagini sono caricabili ma non classificabili dal motore attuale. Si rischia di presentare come errore dell'utente una capacità assente. | Tre esiti operativi: proposta pronta, scelta necessaria, compilazione manuale necessaria. Spiegare brevemente il motivo e permettere di vedere l'originale accanto ai campi. Non promettere riconoscimento automatico delle scansioni. |
| UX-04 | Media, codice | Lotto, analisi, proposte e revisione sono luoghi separati. Anche quando non ci sono file analizzabili resta il pannello «Analisi del lotto» con avvio disabilitato. L'aggiunta torna a una schermata di ingresso. | Valutare una sola area di lavoro dopo il caricamento, con lista e stato per file, aggiunta subito sotto e azioni pertinenti. Nascondere pannelli senza azioni possibili; mostrare progresso e prossima azione senza imporre termini tecnici. |
| UX-05 | Media, codice; verifica utente da fare | La raccolta finale è derivata dal tipo, ma in revisione non è sempre evidente dove il documento comparirà. Un PDF multiparte può appartenere a più raccolte pur avendo un solo originale. | Anticipare «Lo troverai in: …» vicino al tipo e nel riepilogo. Dopo conferma link ai documenti effettivamente organizzati con categoria visibile, senza conteggiare quelli rimasti invariati. |
| UX-06 | Media, codice | Per correggere un confermato si prepara un altro lotto. È recuperabile e non ricarica i byte, ma l'utente deve capire un nuovo contenitore di lavoro. | Esporre il compito «Modifica organizzazione» mantenendo contesto e ritorno al documento; il nuovo lotto può restare una scelta tecnica interna. Verificare ripresa senza perdere il documento di partenza. |
| UX-07 | Media, codice; errore percettivo da provare | Titolo proposto, tipo, destinazione casa/scheda e pagine sono nello stesso dialogo, anche nei casi semplici. Le pagine sono già facoltative, ma i casi multiparte restano cognitivamente diversi dal singolo APE. | Caso semplice: titolo, tipo e destinazione risultante in primo piano; campi avanzati richiudibili. Caso multiparte: una scheda per contenuto con fonte/pagine modificabili, originale unico evidente. Nessuna associazione ambigua preselezionata. |

Riferimenti alla baseline: `frontend-v5/src/document-intake/DocumentIntakeAssistant.tsx` righe 261–280 (esito), 350–365 (lotto/analisi), 375–415 (riepilogo e conferme), 464 e seguenti (pannello analisi); `ReviewDialog.tsx` righe 191 e 300 (riuso/azione di salvataggio), 94 (pagine); `model.ts` validazione duplicateMode. I riferimenti sono evidenza del comportamento, non istruzioni di modifica.

## Copertura per combinazioni

Questa è una matrice di valutazione, non una dichiarazione di collaudo completo. O = osservazione della navigazione precedente; C = dedotto dal codice/specifica; V = verifica di usabilità ancora necessaria. Si usano coppie rilevanti e percorsi ad alto rischio, evitando un prodotto cartesiano ingestibile.

| Scenario e combinazione | Risultato atteso comprensibile | Evidenza / prova da completare |
|---|---|---|
| 1 PDF testuale nuovo, APE, solo casa | Titolo/tipo proposti, Energia mostrata prima e dopo conferma | C/V: completamento senza istruzioni |
| Più file misti, aggiunta successiva con picker o drag&drop | Stesso lavoro, vecchie scelte conservate, nuovo file visibile | O/C; V tastiera e telefono |
| Copia identica, organizzazione assente o Altro, proposta edilizia | Una sola fonte, scelta esplicita di applicare proposta, comparsa in Pratiche edilizie | O/C: punto di fallimento osservato; V nuovo percorso |
| Copia già classificata uguale | Nessuna seconda copia, esito «Già organizzato» senza vantare nuove modifiche | C/V |
| Copia già classificata diversa | Confronto attuale/proposto e consenso puntuale; rifiuto mantiene attuale | C/V |
| Nome uguale ma byte diversi / nuova versione | Non dichiarare copia identica; nessuna sostituzione implicita | C/V: distinguere versione e duplicato |
| SCIA scansita / JPEG / PDF oltre limiti analisi ma caricabile | File salvo, motivo dell'assenza di proposta, compilazione manuale con originale | O/C; V mobile |
| PDF testuale ignoto o proposta sbagliata | Modifica del tipo senza falsa fonte o obbligo di associare un oggetto | C/V |
| Visura che menziona certificato senza esserlo | Nessuna falsa qualifica di certificazione; testo originale consultabile | C; V comprensione della distinzione |
| PDF CILA + agibilità / tipi di raccolte diverse | Un originale, più contenuti, raccolte derivate, pagine facoltative modificabili | C/V |
| Impianto con nessuna/una/più schede candidate | Solo casa sempre possibile, associazione ambigua scelta dall'utente | C/V |
| Regolamento condominiale | Categoria Condominio con privacy invariata e comprensibile | C/V |
| Ricevuta con oggetto/costo già esistenti o assenti | Classificare non crea oggetto/costo; passaggio dedicato distinguibile | C/V: continuità tra due processi |
| Alcuni pronti, altri rimandati/manuali/errori | Conferma parziale, conteggi distinti e ripresa dei rimanenti | C/V |
| Annulla dialogo dopo modifica / chiude pagina dopo salvataggio bozza | Chiara distinzione tra scartato, salvato e applicato | C/V |
| Confermato da correggere senza nuovo upload | Documento riconoscibile, nuova organizzazione applicata solo alla conferma | C/V |
| Reload, upload interrotto, analisi pendente | Originali acquisiti e scelte salvate recuperabili; riselezione esplicita se byte non acquisiti | C/V |
| Risposta persa durante salvataggio/conferma | Stato incerto onesto, recupero stessa richiesta, nessun doppio effetto | C/V: evitare messaggi tecnici |
| Conflitto versione o fonte/target non più disponibile | Blocco della sola scelta coinvolta, nessun dato non autorizzato esposto | C/V |
| Ruolo sola lettura / archivio vuoto / tutti confermati | Azioni coerenti con situazione, nessun invito impossibile o analisi di zero file | C/V |
| Percorsi precedenti a 320/390px e tastiera | Originale raggiungibile, azione primaria leggibile, focus ripristinato e nessuna perdita dati cambiando vista | V: niente nuova prova browser in questo audit |

## Alternative da confrontare con Claude

**A — semplificazione conservativa.** Conservare schermate e API, correggere terminologia bozza/applicazione, esiti distinti, anteprima raccolta, stati vuoti e pannelli pertinenti. Intervento contenuto, mantiene buona parte della frammentazione. Può essere una tappa se emergono vincoli di integrazione.

**B — area di lavoro unica dopo upload (preferenza provvisoria).** Documenti → Carica → lista di lavoro con proposte/stati → revisione dei singoli file necessari → riepilogo incorporato → «Organizza N documenti» → esito con destinazione. File già presenti riconosciuti senza trasformare la deduplica in un compito principale; qualsiasi cambio a organizzazioni confermate resta esplicito. Riduce cambi di schermata e rende visibili scelte e risultato nello stesso contesto. Da validare su mobile e lotti misti prima di scegliere.

Non raccomando in questa fase un'organizzazione silenziosa subito dopo upload: nasconderebbe errori di classificazione e conflitti. La preferenza B non autorizza modifiche e non richiede di abbandonare le garanzie del backend.

### Dipendenze di contratto

Etichette, stato vuoto, layout, raccolte anticipate e conteggi distinti sono principalmente UI, previa verifica dei DTO. L'applicazione finale deve mantenere idempotenza, versioni, recupero, conferma parziale e consenso sostituzione. Un eventuale riepilogo unificato deve distinguere riuso già completato da organizzazioni ancora da applicare: controllare il contratto prima di promettere atomicità. Il riuso oggi ha un percorso operativo distinto; non basta cambiare il testo del bottone per renderlo equivalente alla conferma finale. OCR o classificazione semantica sono capacità ulteriori, fuori da questo audit. Nessuna modifica API proposta come già approvata.

## Criteri per scegliere e validare

- Un utente distingue caricamento riuscito, scelta salvata e organizzazione applicata senza assistenza.
- Ogni tipo scelto mostra prima della conferma la raccolta risultante; dopo conferma il documento è ritrovabile lì.
- Una copia non produce un secondo originale e non impedisce di correggere la sua organizzazione; nessun esito celebra come applicata una modifica non effettuata.
- Dati confermati non sostituiti senza consenso puntuale; nessuna condivisione, scheda o spesa implicita.
- Un documento non leggibile resta archiviabile e correggibile consultando l'originale.
- Il lotto misto può essere completato in parte e ripreso dopo reload; esito incerto non richiede un nuovo upload.
- Percorso accessibile con tastiera e a 320/390px; una sola azione primaria pertinente per fase.
- Confrontare A/B sullo stesso corpus sintetico e sugli stessi compiti. Contare azioni intenzionali dall'upload concluso al risultato applicato, separando digitazione/selezione file/attese. Il codice corrente richiede nel caso semplice almeno revisione, salvataggio, accesso al riepilogo, casella e conferma finale; il conteggio completo varia con punto d'ingresso e analisi. Non inventare una riduzione percentuale prima di provare i prototipi.

## Prossimo passo

Ricevere l'audit indipendente Claude, tabella di convergenze/divergenze e arbitrare col committente. Solo dopo: specifica emendata, eventuale mockup del percorso scelto, sviluppo e verifiche mirate. Nessun cambio di comportamento eseguito in questa consegna.
