# Nomi progressivi delle bollette completate

## Problema e ambito

Il titolo visuale richiedeva insieme fornitore e mese fattura. Nei documenti completati precedenti con dati parziali conservava il filename; se il titolo era un hash, il renderer mostrava «Documento senza titolo». Stato completato e presenza di tutti i metadati sono condizioni distinte. Il committente ha approvato nomi progressivi, sempre solo a video.

Lotto `codex/bollette-nomi-progressivi-20261026`, base del consolidamento `37e7687`, registrazione `c0e401e` prima del codice, fonte prodotto verificata `f0cf664`. Solo frontend e documentazione; niente backend/API/schema, parser, OCR, dati reali o file Claude modificati. La funzione resta pura e usa il contesto personale già disponibile, senza nuovi fetch o query.

## Regola approvata

Per un documento completato con una sola parte Bolletta e titolo ancora uguale al filename o al suo stem:

| Dati disponibili nell'unica spesa personale attiva | Nome visualizzato |
| --- | --- |
| Fornitore e mese fattura valido | Bolletta Fornitore · settembre 2026 |
| Solo fornitore | Bolletta Fornitore |
| Solo mese fattura valido | Bolletta · settembre 2026 |
| Nessun dato utilizzabile, nessuna spesa o più spese | Bolletta · nome originale.pdf |

Il nome originale viene mostrato anche se è un hash: non si ricade su «Documento senza titolo» soltanto perché mancano metadati. Con più spese non viene scelta una fonte, nemmeno se i valori coincidono; non si fondono fatture o importi. Non si deduce il mese da filename, data documento, scadenza o periodo dei servizi. Un mese formalmente non valido viene omesso, senza perdere il fornitore disponibile. La validazione del mese resta YYYY-MM con anno non zero.

Titoli personalizzati preservati, anche se generici: il sistema non può distinguere un titolo «Documento senza titolo» salvato intenzionalmente da uno scelto dall'utente. Documenti non completati, compositi o risposte vecchie senza filename originale mantengono la regola precedente. Un documento multiparte non diventa una bolletta singola per rinominarlo. Originali, titoli salvati, spese, oggetti, ricerca/ordinamento/export e ID non cambiano.

## Verifiche

Gruppo mirato **78/78 in7file**, inclusi **16 nuovi casi**:15 regole pure e un percorso archivio con quattro documenti. Il percorso distingue fornitore senza mese, mese senza fornitore, hash senza dati e più spese discordanti; verifica link con ID identico, originali nei dettagli, zero scritture oltre al login e zero letture per documento. Le regole pure verificano anche dati multipli concordanti, mesi invalidi, titoli personalizzati e assenza di mutazioni degli input.

Le attese precedenti che codificavano l'obbligo di entrambi i dati sono state aggiornate alla nuova regola esplicitamente richiesta: ora verificano il titolo parziale esatto o il fallback esatto, mantenendo tutti gli assert su privacy, assenza di deduzioni, sorgente e non mutazione. Una precedente attesa del titolo generico nei test degli altri documenti è stata sostituita dal fornitore noto, senza introdurre un mese. Nessuna asserzione di privacy/idempotenza, gold, soglia o timeout ridotti.

Prima regressione di area235/237: nel cambio tipo il titolo originale risultava correttamente nei dettagli chiusi e il vecchio assert ne pretendeva la visibilità immediata; mantenuto quell'assert aprendo i dettagli, aggiungendo nome visuale esatto e titolo invariato nel payload di conferma, lasciando invariati permanenza nell'URL e due sole scritture. L'altro rosso era un'attesa scaduta nel percorso UI precedente, già verde nella mirata78/78; causa temporale non dimostrata. Reso esplicito il caricamento del modulo lazy nel setup, senza cambiare aspettative o timeout. Prima esecuzione e JSON conservati separatamente dalla ripetizione finale.

Regressioni di area **237/237 in 25 file**, un worker/retry0, zero fallimenti o saltati, inclusi ricerca e privacy account/casa, revoche, collegamenti alle spese e gestione asincrona. Typecheck/lint/build verdi sulla stessa fonte prodotto. Suite mock completa non ripetuta: eseguito il gruppo interessato dal cambiamento; i risultati completi precedenti non vengono presentati come nuovi. Nessuna suite DB necessaria: nessun cambiamento backend. Nessuna nuova prova browser o lettura dei documenti reali rivendicata. Evidenze locali nel task `work/progressive-title-new.log/json`, `-focus.log/json`, `-checks.log`; nessun contenuto personale nel repository.

## Consegna e attività del committente

Consegna nella [PR #58](https://github.com/Vincenzobrutto/Home_OS/pull/58), pronta per revisione verso il consolidamento. Push verificato con `git ls-remote`; ultime modifiche solo documentali e prodotto identico a f0cf664.

PR verso il consolidamento dopo i controlli; merge e successiva attivazione frontend al committente. Nessuna attivazione implicita, AI/email, accesso al DB/API/storage reale, migrazione o salvataggio automatico durante questo lotto. Dopo il rilascio basterà aggiornare la pagina Documenti; non occorre ricaricare file o riconfermare spese e oggetti. Documenti multiparte e titoli personalizzati restano distinti dai fallback automatici.

Build finale7,90s. Log prima regressione `work/progressive-title-focus.log` e `-focus-initial.json` (235/237), ripetizione verde `-focus-final.log` e `-focus.json` (237/237); mirata78/78 in `-new.log/json`, statici in `-checks.log`. Nessun timeout aumentato o risultato rosso nascosto.

## Rilascio autorizzato

PR #58 integrata su approvazione a b1f3953d87a1289a98cfae4b4dbac82edc93f6a5, hash remoto verificato. Solo frontend ricompilato e attivato;21/21 controlli HTTP statici/anonimi verdi, API15744 e PostgreSQL22924 preservati. Nessuna AI/email, migrazione, richiesta autenticata, lettura di originali o salvataggio automatico durante il rilascio. Main remoto invariato a cdbb318.

Runtime detached `Dimora-V5-runtime-nomi-progressivi-20261026`, frontend identico alla punta approvata577722d e alla fonte prodotto f0cf664; backend identico alla API attiva a8de901. Lock verificato e build frontend verde6,10s prima del cambio. Fermato soltanto il vecchio frontend35876 dopo verifica di PID, creazione, comando e listener; nuovo frontend16808 su loopback5174. API15744 su3011 e PostgreSQL22924 su55432 mantenuti con identità/creazione/listener invariati; header `roma-consolidata-a8de901-no-ai` verificato. Nessun cambio alle guardie o alla policy interattiva. Nessun nuovo backup o audit SQL necessario per il solo frontend.

21/21 controlli: fallback progressivo e presentazione degli altri documenti, dettagli del file, rilettura locale/mese/traccia/classificatore, asset PDF/OCR e API anonima401 con header esatto. Nessuna prova browser autenticata o verifica dei nomi di documenti reali rivendicata. I237/237 offline restano l’evidenza funzionale, non ripetuta perché gli alberi prodotto sono identici. Evidenze locali `work/progressive-title-release-build.log`, `-runtime-proof.json`, `-runtime-http-proof.json`, log frontend e metadata canonici `roma-runtime.json`/`schede-app-frontend-runtime.json`.

La [PR #57](https://github.com/Vincenzobrutto/Home_OS/pull/57) viene aggiornata con la consegna documentale di entrambi i rilasci #56 e #58, senza nuovo codice prodotto. Il consolidamento è stato riportato nel branch documentale con merge, senza rebase; conflitti soltanto in stato/roadmap/changelog, risolti preservando sia l’evolutiva sia la consegna precedente. Diff finale rispetto al consolidamento soltanto documentale.

### Attività del committente dopo il rilascio

Aggiornare la pagina Documenti e verificare le bollette completate con dati parziali. Non ricaricare file né riconfermare spese/oggetti. I titoli personalizzati e i documenti compositi restano invariati; il nome originale è ancora nei dettagli. Rimane solo l’approvazione documentale della PR #57, che non condiziona l’attivazione già avvenuta.
