# Nome breve automatico con identità e descrizione preservate

23 ottobre 2026. Implementazione offline sul branch Fase 0.

## Comportamento

Un nome letto dalla fonte può essere una descrizione commerciale lunga. La descrizione viene verificata integralmente, entro lo stesso limite di 2000 caratteri delle citazioni: struttura, pagina ammessa, SHA/versione, coordinate quando necessarie e corrispondenza con l’estratto restano obbligatori. Solo dopo la validazione viene prodotta una proposta di nome visualizzato entro **120 caratteri**, limite invariato anche nella conferma canonica.

Se il nome supera 120 caratteri, si preferisce la prima clausola iniziale completa di almeno otto caratteri delimitata da trattino separato, pipe, virgola o punto e virgola che rientri nel limite. Altrimenti si usa il prefisso che termina all’ultima parola completa entro il limite, contando i caratteri Unicode. Non vengono inseriti ellissi o parole non stampate nella fonte. Un identificatore senza confini utili non viene tagliato: rimane un errore da correggere manualmente.

La proposta contiene `fullName`, con tutto il nome esteso verificato e normalizzato, e conserva la fonte completa di `fields.name`. Il nome breve è soltanto un prefisso letterale; non ricompone marca, modello o varianti. L’editor mostra il nome esteso aperto accanto all’avviso di verificare modello e varianti. I campi modello e marca già validati non vengono modificati; l’eventuale derivazione locale già esistente legge il nome esteso, senza nuove regole commerciali o di catalogo.

Ogni abbreviazione imposta `nameTruncated=true`, `needsReview=true` e un avviso per il nome. La conferma automatica rimane bloccata. La conferma manuale mantiene i controlli e il limite canonico di 120 caratteri; se si accetta il nome breve proposto, la sua provenienza conserva l’estratto integrale, inclusi modello e varianti finali. Nessun salvataggio implicito e nessun aggiornamento delle schede preesistenti.

## Identità, prezzi e privacy

Validazione di prezzo e quantità, controllo di righe ripetute e fingerprint avvengono **prima** dell’abbreviazione sul nome completo. Due articoli con lo stesso nome breve ma varianti finali diverse conservano identità distinte. Non viene riabilitata la corrispondenza per solo nome dei nomi parziali. Marca/modello restano possibili suggerimenti da controllare, mai associazioni o creazioni automatiche autorizzate dall’abbreviazione.

Il campo `fullName` è generato internamente dopo la validazione: il provider e le richieste di conferma non possono dichiararlo per aggirare i controlli. È contenuto nel JSON della bozza, senza migrazione. La normale verifica della fonte governa anche questo campo: fonte privata altrui, snapshot superato o revocato non devono mostrarlo. Nessun testo aggiunto ai log diagnostici.

Le future autorizzazioni del runner qualità includono anche gli hash dei moduli short-name e product-name: cambiare abbreviazione o interpretazione del nome completo invalida una ricevuta precedente. Nessuna autorizzazione storica, gold o ledger viene riscritto e non viene eseguita alcuna campagna.

Il bound di 2000 riguarda la descrizione sorgente, non il nome canonico. Non è una tolleranza sui dati errati: una citazione che contiene soltanto il prefisso non può convalidare una descrizione più lunga inventata. Coordinate, pagine e limiti degli altri campi restano invariati. Il nome esteso non è un nuovo attributo commerciale certificato: i dettagli sono conservati nella bozza e nella provenienza documentale, da controllare dall’utente.

## Verifiche

- Backend build/lint e suite onboarding finale **285/285**, inclusi 7 nuovi test di nomi brevi, con più controesempi.
- Backend ordinari **214/214**, runner/adattatore/autorizzazioni offline **17/17**.
- DB temporaneo nuovo: **85/85**, inclusa persistenza del nome esteso nella bozza e nella provenienza canonica, modello separato, privacy tra owner, versione/SHA, replay durevole da altro client senza duplicati. Cluster fermato e directory conservata.
- Frontend typecheck/lint, test mirati onboarding **52/52** e suite mock completa finale **844/844 (102 file)**. Due worker e retry massimo 1 configurato, nessuna asserzione o timeout modificati.
- Prima esecuzione completa con carico concorrente: **843/844**, un’attesa del link Prima spesa scaduta nel test Spese sul ritorno al documento. File Spese isolato **23/23**, poi mock completa ripetuta senza build/test DB concorrenti. Nessun fix a Spese né asserzione ridotta.
- Nessuna chiamata AI o accesso al DB reale. Ambiente UI precedente ripristinato con AI disabilitata e richieste esterne bloccate, preservando i due tentativi storici. Nessun nuovo collaudo UI con estrazione reale dichiarato.

Regressioni nuove: nomi lunghi in testo e PDF visuale; modello e varianti dopo il carattere 120; nome breve letterale, descrizione estesa e obbligo di revisione; identità stabili e distinte per varianti con prefisso uguale; prezzo validato sul nome completo; nome di 120 caratteri invariato; token unico di 121 caratteri respinto; Unicode; descrizione oltre 2000, citazione del solo prefisso, pagina/regione errata e iniezione fullName respinte. UI: descrizione estesa e modello visibili, nessun invio o conferma impliciti; snapshot estraneo non esposto.

## Limiti e precedente prova reale

Il secondo rifiuto reale è stato localizzato in item_field/name, ma la sua risposta grezza non è conservata: la lunghezza resta un’ipotesi. Le nuove prove costruite offline verificano il comportamento richiesto, non ricostruiscono quella risposta. Nessuna nuova accuratezza AI/OCR o successo sul PDF reale dichiarati; nessun nuovo invio ad Anthropic autorizzato o eseguito in questa sessione.

Nessuna modifica a prompt/schema wire, .env, DB/API/storage reale, main, gold/scorer/soglie, ledger delle campagne o file estranei. Nessuna pulizia dei 104 StoredFile, reset, clean, force push o rimozione di worktree. Nessun deploy reale né backfill di bozze/oggetti già presenti.
