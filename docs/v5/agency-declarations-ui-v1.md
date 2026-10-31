# Unità e dati dichiarati — ingresso manuale nel fascicolo

30 ottobre2026, incremento frontend durante la prenotazione DB/API dell'altro incarico. Nessun test DB o provider necessario: riusa comandi HTTP unit/declare già presenti. DeclarationWorkspace e client nuovi, collegati nel contenitore della pratica. Nessun file renderer/trial altrui o demo Alessio modificato.

## Implementato

Unità e dichiarazioni è un pannello aggiuntivo della revisione fascicolo. L'agente registra un nome unità: ID generato dal server, nessuna unità dedotta da un documento, nessuna fusione per nome. Il risultato aggiorna le unità nel contesto del contenitore e delle osservazioni; gli altri snapshot mantengono reload esplicito e CAS, senza perdere invii incerti.

Per una dichiarazione: unità esistente, riferimento soggetto/immobile esplicito, campo e valore, visibilità inizialmente privata. Prima selezione sempre vuota. Riconosciuti nome/ruolo/diritto/quota dichiarati, identificativi catastali, data atto ISO, superficie interna/catastale numerica positiva in m². Quote/diritti sono testo non normalizzato giuridicamente; subalterno0012rimane stringa, non12. Cambiare campo cancella il valore precedente. Nessuna durata/provvigione contrattuale inventata o superficie commerciale calcolata da un campo generico.

POST review con operation unit o declare, revisione attesa e key. Il browser non aggiunge ID, origine extracted, prova o stato confirmed. Backend deriva declared e prove vuote e registra il nuovo fatto come proposto. La dichiarazione non modifica altri fatti o cancella dati estratti, non viene chiamata lettura documentale; conferma/correzione/rifiuto avvengono separatamente in Dati e fonti dopo reload. Nessun documento fittizio a sostegno.

Readonly blocca entrambi i form e retry;409congela fino a ricarica,422consente correzione, diniego nasconde dati. Esito incerto blocca campi e conserva body/key per retry soltanto manuale. Scope/porta mutati non ripristinano risposte tardive. Il contenitore applica il diniego globale già implementato anche a questa porta.

## Verifiche

14nuovi casi:11workspace,2client,1contenitore. Gruppo finale116/116in13file (precedenti102inclusi), typecheck app/lint mirato verdi, cache private, nessuna installazione. Prima115/115prima del caso aggiuntivo di unità nel contesto; ultimo116/116. Test unità IDserver, nessuna autoselezione, dichiarazione proposta senza prove/override, subalterni testuali, superficie numerica, cambio campo/privacy, readonly,503retryidentico,409reload,422/403,cambioporta, clientsessione/CSRF/key e unità disponibile per note dopo risposta server.

Trasporto sintetico nei test, nessun collaudo browser/API/DB reale di questo incremento. Prova montata desktop375resta nel protocollo agency-review-browser-protocol-v1.md, da eseguire soltanto dopo liberazione delle porte prenotate altrui. Backend/schema/route invariati, non ripetuti i relativi test. Fixture manuali non dimostrano estrazione AI o conformità.

Restano: creazione confronti, selettore prove da tutti i documenti, anagrafica soggetti verificabile, stage/provider atti con consenso/budget dedicati. Modello incarico assente, canGenerateDraftfalse. Nessuna AI/spesa, file personale, servizio esistente, merge o deploy.
