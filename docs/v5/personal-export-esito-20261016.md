# Esito personal-export-v1 — 16 ottobre 2026

## Risultato

Attivo POST /api/v5/homes/:homeId/personal-export nel servizio V5 locale, con body {} e contesto account esplicito. Nessuna migrazione o dipendenza nuova. Frontend: Documenti → «Esporta i miei dati di questa casa» → «Scarica i miei dati (JSON)», pannello richiudibile sotto l'archivio, solo con permesso export. Nessun nuovo menu o modifica al download ZIP esistente.

Pacchetto JSON versione1: contesto personale/Home, metadati dei propri documenti, oggetti, schede tecniche autorizzate e confermate, posizioni/stanze referenziate, attività, spese, lavori e storia tipizzata; inclusi elementi archiviati. Date e importi canonici, EUR fisso come contratto corrente. Nessuna copia degli originali: un metadato non certifica disponibilità fisica del file, innocuità o validità del suo contenuto.

## Privacy e coerenza

Mapper per campi consentiti: niente serializzazione diretta di record o JSON di storia/provenienza. Proprietà nuove non diventano esportabili implicitamente. Storici di tipo non riconosciuto mantengono solo il metadato autorizzato, con indicazione del limite. Verificati i payload correnti di ActivityHistory, ExpenseHistory, EconomicWorkHistory, ObjectEvent e AssetHistory; citazioni economiche sha256 normalizzate in documentSha256.

Il ruolo owner non permette l'export del privato altrui. Esclusi destinatari/token C1, sessioni/hash password/challenge, prompt e risposte AI, bozze/job/ledger e path storage. Documenti altrui e loro citazioni non entrano nel pacchetto personale. Le schede caldaia applicano la stessa regola delle fonti dei job succeeded di ReviewService.assetSources, con verifica documento/Home/visibilità/versione/SHA in batch limitati. Se una scheda non è più leggibile viene esclusa, compresi i riferimenti negli altri dati e nella storia; il costo proprio rimane con riferimento azzerato.

Letture RepeatableRead, poi nuovo controllo delle fonti con letture fresche fuori snapshot, sessione/context/CSRF e membership/export prima di inviare. Budget 10000 righe candidate, inclusi gli eventi e le prove delle fonti; 10MiB JSON. Anche i dati interni letti hanno budget conservativo10MiB, quindi un insieme con molto storico interno può essere respinto prima che l'allegato pubblico raggiunga10MiB. Query a blocchi massimo100 righe; due costruzioni concorrenti per processo; errore intero e slot sempre rilasciati.

Client: POST esplicito, nessun retry automatico; verifica envelope/formato/Home/account prima di creare il Blob. Ricontrolla sessione e permesso Home prima del salvataggio. Dopo cambio pagina/Home/account ignora la risposta tardiva. Il Blob non resta nelle cache delle query o nel risultato della mutazione. Messaggi distinti per limite, concorrenza,403 e servizio non ancora attivo.

## Prove

- Backend build/lint verdi. 7 test specifici offline: allowlist/tipi, riferimenti e storia, potenze/citazioni, link/stanza, budget righe/byte, concorrenza/slot e controllo client prima della consegna.
- 8 scenari con API/DB reali sintetici, più contenitore Node (9 test): Home vuota senza scritture canoniche; allegato JSON e risorse archiviate; isolamento A/B/altroHome/viewer/scadenza/context/CSRF/body; fonte revocata; membership e visibilità revocate dopo snapshot; logout reale durante preparazione; modifica concorrente mantenuta coerente dallo snapshot. Alcune gare sono innescate in modo deterministico avvolgendo il servizio contro PostgreSQL reale, non attraverso un browser. L'allegato e gli errori ordinari sono verificati via HTTP sul servizio registrato.
- Regressioni documenti: 22 unitari storage/documenti/file-control e 11 scenari HTTP più contenitore (12 test) verdi, inclusi upload Defender, idempotenza, originali, ZIP e revoca. Dopo l'ultima restrizione dei mapper rieseguiti soltanto i7 nuovi unitari e i9 test export DB/HTTP, tutti verdi.
- Frontend build/lint verdi. 3 prove client e2 UI [mock] verdi; 23 prove esistenti Documenti [mock] verdi. Nessuna affermazione di esecuzione UI su backend reale o di conformità WCAG. Il test di risposta tardiva è stato corretto per attendere il vero smontaggio della pagina prima di liberare la risposta: la sola promessa router.navigate non attestava il commit React.
- Prima fixture DB interrotta da vincolo su link state='archived': corretto in state='removed', coerente con il dominio G1; nessun difetto del prodotto e nessun vincolo modificato. Fixture sintetiche residue conservate nel solo DB V5.
- Log workspace outputs/Dimora-V5-personal-export-unit-20261016.log, Dimora-V5-personal-export-http-db-20261016.log e Dimora-V5-personal-export-http-db-final-20261016.log. I primi log conservano il contesto delle regressioni; ultime prove di mapper/frontend nei risultati del turno.

## Condizioni e limiti

API riavviata autonomamente con launcher -Restart dopo build: prima del riavvio zero job tecnici/economici queued/running. PostgreSQL/frontend preservati; nessuna .env, flag AI, quota, chiave Brevo, sicurezza, database legacy o main modificati. Nessuna email, chiamata provider o push. Nessun documento reale del committente esportato o caricato.

Nel browser la sessione personale di Vincenzo è su /case senza case: non è stata cambiata per testare l'interfaccia, né è stata creata una Home nel suo account. Scheda di verifica temporanea chiusa. UI collaudata con harness; rimane da verificare visivamente nel browser reale desktop/mobile con un contesto di prova appropriato. Non è stato alterato un login per aggirare questo limite.

Export per Home/account, non backup completo ripristinabile, esportazione totale account o trasferimento di proprietà. Nessuna reimportazione/cancellazione/retention automatica. I limiti possono bloccare insiemi molto grandi senza pacchetti parziali; un percorso asincrono per tali casi non è incluso.

Claude è confermato al lavoro nel worktree Fase0-file-export: nessuna sua area modificata o consegna presunta. Alla raccolta si arbitrano UX/corpus rispetto a questa baseline funzionante. Restano gate distinti: custodia chiave backup fuori PC, politica cloud Defender, conservazione dei dati e qualità AI. Nessun processo Codex di raccolta automatico attivo dopo il turno.
