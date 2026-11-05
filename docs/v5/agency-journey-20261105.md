# Agenzie: dal nuovo incarico alla consegna — 5 novembre 2026

## Perimetro

Implementazione del percorso approvato nei mockup del 5 novembre. Branch `codex/agency-journey-20261105`, seguito del lotto locale7128375, senza merge nel comune o main. Le interfacce del proprietario e dell’amministratore, il motore geometrico e il flusso Gift esistenti sono preservati.

## Comportamento

- Elenco di tutte le pratiche accessibili, ricerca locale sulle pagine caricate, fase dichiarata e apertura della singola pratica; nessuna priorità «oggi» inventata.
- Nuova pratica in due passi: incarico firmato PDF oppure compilazione manuale; proposte da testo nativo, campi modificabili e conferma esplicita. Originale locale consultabile alla pagina indicata. Creazione, allegato e dati usano chiavi distinte e stabili; una risposta persa si riprende dallo stesso passo. Se la pratica esiste ma il completamento fallisce, è apribile nel fascicolo senza crearne una seconda.
- Il documento usato nell’apertura è condiviso soltanto con chi ha accesso alla pratica. La checklist lo associa all’incarico; tale associazione non lo rende un atto da analizzare e non cambia il tipo tecnico in modo improprio.
- Navigazione: Panoramica, Fascicolo, Analisi documenti, Planimetria, Annuncio, Trattativa, Stipula. Panoramica combina fase dichiarata e stato della mappa per la prossima azione.
- Checklist persistita: associazioni alle fonti visibili, voci aggiuntive, domande su condominio/mutuo/locazione/successione e documenti richiesti. Indizi dal tipo o nome del file, non diagnosi del contenuto. La richiesta al venditore è separata dalla checklist; il testo è modificabile e copiabile, nessun invio email automatico.
- Planimetria e visura: richiesta di acquisto simulata persistibile, senza addebito o recupero del file. Non aumenta i documenti ricevuti e non crea una fonte fittizia.
- Analisi documenti riordinata in Documenti, Dati e fonti, Coerenza, Usa i dati. I pannelli restano montati per conservare bozze e invii; evidenze, binding, decisioni, confronto e blocco del modello incarico restano quelli esistenti.
- Mappa: preservati grafica, modifica/aggunta/eliminazione vani, zoom, scala, invalidazione del computo e export pulito. Annuncio ha anche una pagina dedicata con titolo/descrizione salvati e copia; l’export geometrico disponibile non contiene il foglio personale originale.
- Trattativa e stipula: dati e note manuali salvati, fase dichiarata. Nessun automatismo di agenda, gestione offerte vincolante o pubblicazione su portali. Nella Stipula conclusa compare l’accesso alla consegna Gift esistente.

## Contratto e sicurezza

`GET /agencies/:agencyId/practices/:practiceId/journey` restituisce `{revision,state,profileStale}`. `POST` sullo stesso percorso accetta `{expectedRevision,command}` e Idempotency-Key; operazioni profile/checklist/stage/listing/transaction. La risposta aggiunge replay. Nessun account/agenzia del corpo viene considerato affidabile: identità da sessione, membership/grant e Origin/CSRF esistenti, allowlist stretta e limiti sui campi. Rilettura dei permessi prima dei replay e prima della risposta.

Dati in estensione opzionale del JSON snapshot1, nessuna migrazione o modifica a tabelle esistenti. Le vecchie pratiche leggono valori vuoti. CAS unico con la revisione della pratica; in UI una modifica indipendente ai documenti consente di aggiornare la revisione, una modifica concorrente alla stessa sezione richiede ricarica. Richieste incerte hanno retry esatto, non reinvii automatici. Ricevute actor-bound, limitate a2000, senza potatura silenziosa.

Il profilo da incarico può riferirsi solo a una fonte condivisa nella pratica, accessibile e alla versione corrente. Cambio/revoca della fonte maschera il profilo nelle nuove letture e richiede reinserimento manuale; non espone un originale privato ad altri agenti. Le associazioni di checklist a fonti non leggibili sono filtrate nelle risposte e preservate nelle scritture di altri agenti.

La fase è una dichiarazione operativa dell’agente, non una prova giuridica della stipula. Le informazioni confermate non certificano conformità, titolarità o superficie. `canGenerateDraft` resta false senza modello approvato.

## Verifiche

Risultati e attivazione locale sono completati nel seguito di questo report. Nessuna AI reale/spesa, nessun invio email eseguito per il collaudo; PDF e persone delle prove sintetici. Primo tentativo di test interfaccia bloccato dall’import anticipato del worker PDF nella junction: lettore caricato soltanto all’azione di analisi; nessun controllo indebolito. Un nuovo test di conflitto inizialmente condivideva la stessa struttura mutabile fra client/server fixture: corretto l’isolamento della fixture, senza modificare il prodotto per nascondere il problema.

## Limiti espliciti

La lettura locale dell’incarico riconosce etichette esplicite su PDF con testo nativo, con limiti20MB/20pagine/100000caratteri/15secondi. Ambiguità rimangono vuote. Non è un modello AI generalista, OCR o estrattore robusto di qualunque modulo. I profili manualmente confermati non sono promossi automaticamente a fatti documentali del registro.

Nell’ambiente locale restano i blocchi all’AI a pagamento; non sono stati rimpiazzati con risultati finti. L’analisi documentale esistente ha lo schema iniziale limitato ai campi supportati. Riuso esteso dei fatti verso altri modelli, pubblicazione ai portali e recupero documenti da fornitori restano ulteriori lavori. Il motore planimetrie mantiene i limiti già documentati sul riconoscimento e sulla verifica delle superfici. La nuova prova verifica il percorso e i salvataggi, non ripete l’accuratezza AI o l’intero Gift via email reale.
