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

PR verso il consolidamento dopo i controlli; merge e successiva attivazione frontend al committente. Nessuna attivazione implicita, AI/email, accesso al DB/API/storage reale, migrazione o salvataggio automatico durante questo lotto. Dopo il rilascio basterà aggiornare la pagina Documenti; non occorre ricaricare file o riconfermare spese e oggetti. Documenti multiparte e titoli personalizzati restano distinti dai fallback automatici.

Build finale7,90s. Log prima regressione `work/progressive-title-focus.log` e `-focus-initial.json` (235/237), ripetizione verde `-focus-final.log` e `-focus.json` (237/237); mirata78/78 in `-new.log/json`, statici in `-checks.log`. Nessun timeout aumentato o risultato rosso nascosto.
