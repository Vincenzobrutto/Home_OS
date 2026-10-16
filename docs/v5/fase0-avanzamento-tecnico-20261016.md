# Fase 0 avanzamento tecnico durante il lavoro UX

16 ottobre 2026. Il committente conferma Claude avviato sull'incarico Fase0-UX e autorizza Codex a proseguire in parallelo. Nessun file di proprietà Claude modificato. La guida resta rinviata; il pilota personale non è ancora dichiarato pronto.

## Email recupero e verifica

Proposto Brevo dopo richiesta del committente di suggerire il servizio. Non equivale ad approvazione di un piano, creazione account o invio. La documentazione ufficiale riporta 300 invii/giorno nel piano gratuito e supporto transazionale API/SMTP: [piano gratuito](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [API transazionale](https://developers.brevo.com/reference/send-transac-email). Informazioni verificate il 16 ottobre, da ricontrollare alla configurazione.

Implementato BrevoRecoveryMail in backend-v5/src/auth/recovery-mail.ts, **non registrato in AuthModule e senza lettura di variabili ambiente**. Non esistono ancora endpoint di recupero o challenge persistenti. È un componente preparatorio collaudato soltanto con trasporto iniettato finto: nessuna email reale o contatto con Brevo. Nessun SDK o dipendenza nuova.

Il componente prepara testo e HTML per reset/verifica, un solo destinatario e nessun documento allegato. Link da origine configurata, token nel frammento, nessun returnUrl arbitrario; rifiuta input non validi prima dell'invio. HTTPS obbligatorio normalmente; solo esplicita opzione di collaudo permette HTTP loopback sulla porta frontend5174, utilizzabile dal PC locale e non come link pubblico. Nessuna modifica alle impostazioni Windows, Origin/CSRF o autenticazione esistente.

Gestisce 201/messageId, errore definitivo, rate limit e consegna incerta separatamente. Non ripete automaticamente richieste dopo timeout/5xx o risposta anomala: il completamento dell'outbox dovrà riconciliare gli esiti senza duplicare challenge. Errori al chiamante privi di body provider, token o chiave. MessaggiId e testi non vengono stampati nei log dal componente.

Prima dell'attivazione: scegliere/confermare servizio, account del committente e mittente verificato; impostare dominio e percorso effettivi, disabilitare tracking di apertura/click per messaggi di sicurezza e verificare comportamento dei link; completare contratto UX, challenge monouso/TTL/rate limit durevole, migrazione, API, interfaccia e test end-to-end. Nessun campo emailVerified inventato sugli account attuali. Chiavi solo nella configurazione locale, mai in chat.

## Verifica locale ripetibile

Nuovo tools/pilot-preflight.cjs in backend-v5. Legge soltanto backup indicato e metadati filesystem, interroga sessione API loopback senza credenziali e non legge .env. Output aggregato, senza nomi documenti, chiavi storage o token. Exit0 significa controlli tecnici passati; pilotReady resta false finché i gate sono aperti. Il tool non avvia servizi, non scansiona/elimina file e non crea nuovi backup.

Esecuzione reale su backup073731Z: digest del dump e SHA/dimensioni di tutti i 255 originali ancora corrispondenti, manifesto del restore precedente con 41 tabelle e cluster fermato. Non è stato eseguito un secondo restore, né confrontato lo snapshot storico con un nuovo snapshot DB attivo. API200 con no-store/nosniff; spazio disponibile245595746304byte, circa229GiB, nessun file .part. 257 file fisici presenti nello storage attivo non sono un conteggio dei documenti referenziati DB: non dedurre due documenti nuovi o mancanti dal solo confronto col backup. La soglia di riserva1GiB è solo un avviso operativo, non una quota né una protezione automatica dalle scritture concorrenti.

Stato Windows antimalware letto senza modifiche: servizio, antivirus e protezione in tempo reale attivi, firme aggiornate il15ottobre16:46. Non prova la scansione applicativa degli upload; nessuna scansione, quarantena o impostazione è stata attivata. La policy applicativa resta da implementare/confermare prima dei file personali. Serve fail-closed su stato scanner ignoto e gestione documento bloccato, senza promesse di file innocuo.

## Corpus sintetico e valutazione

24 casi in test/pilot-corpus.cjs: 6bollette, 6fatture, 4tecnici, 4negativi e 4ambigui. Byte PDF deterministici per gli esempi nuovi; riuso delle fixture gas/invoice e scansione/protetto già presenti, oltre al JPEG di test. Per ogni caso SHA, formato, aspettativa, campi e citazioni esatte/pagina, campi da non inventare. Nessun contenuto personale, provider o database.

Validati tutti i24 input con il parser reale: gli esempi testuali contengono le evidenze annotate; scansione e protetto producono gli errori previsti, JPEG non passa per PDF. Numeri/data sono verificati anche dai controlli locali di evidenza. Nota credito negativa e valutaUSD non diventano costoEURpositivo; due potenze distinte non diventano un singolo valore risolto; il fornitore di un negozio non diventa automaticamente professionista. Queste ultime sono aspettative del corpus, non risultati ottenuti da un modello.

Scorer separato con precisione, recall, omissioni, falsi positivi, evidenze errate, campi vietati ed esito; osservazione mancante segnalata e non accettata come astensione. Confronto valori e citazioni attualmente esatto: formulazioni equivalenti richiedono normalizzazione esplicita prima della valutazione, non sono automaticamente errori del modello. Gli esempi di scoring sono test del misuratore, **non accuratezza AI**. Annotazioni di un solo autore: revisione indipendente ancora richiesta. Nessuna soglia o qualità generale dichiarata raggiunta.

tools/pilot-corpus-report.cjs genera il manifesto e può confrontare osservazioni locali già salvate; non chiama il provider. Senza osservazioni providerAccuracy è null. Prima di nuove chiamate: revisione annotazioni, normalizzazione output provider distinta per economia/tecnica, soglie per campi critici e autorizzazione file/budget. I casi negativi del parser non devono consumare Messages.

## Export e conservazione

Proposta di contratto in fase0-export-design-20261016.md: pacchetto personale per Home, allowlist, provenienza, diritti correnti e risorse archiviate; nessun dato privato altrui o campo di sicurezza. Nessun endpoint nuovo. Export M2 e regole dopo cessazione diritti invariati. Politica di chiusura/cancellazione/retention e seconda destinazione del backup ancora da concordare; nessuna cancellazione automatica introdotta.

## Verifiche e stato finale

- Build backend verde dopo l'aggiunta del componente email.
- 6/6 test email offline verdi; casi disabilitato/configurazione, input, link per scopo, errori sanitizzati, incertezza e loopback esplicito.
- 2/2 test corpus verdi: il primo percorre tutti i24 documenti con parser reale, il secondo verifica i conteggi dello scorer, non il provider.
- Lint src/test e lint separato tools verdi. Nuovi test inclusi nel comando npm test; suite completa non rieseguita. I18test storage/multipart già verdi nella sessione precedente non ripetuti senza cambi a quel codice.
- Output locali: outputs/Dimora-V5-Fase0-{preflight,corpus-manifest}-20261016.json e log build/lint/mail-test/corpus-test. Nessuna migrazione, riavvio API, credenziale modificata, chiamata Anthropic, email, push o modifica legacy.

Prossimo lavoro: raccogliere la consegna UX quando completa, congelare recovery e realizzarne schema/API senza attivare il canale finché account/mittente non sono pronti; in parallelo chiudere policy file ed export. Non avviare BL-04 né dichiarare possibile la prova personale completa come conseguenza dei soli test offline. Nessun processo Codex continua dopo la chiusura del turno.
