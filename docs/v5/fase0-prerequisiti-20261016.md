# Fase 0 prerequisiti del pilota Home

Avvio approvato dal committente il 16 ottobre 2026. Questa matrice distingue capacità esistenti, verifiche e lavoro residuo; la Fase 0 non è ancora chiusa. Nessun documento personale è stato caricato in questa sessione.

| Area | Stato attuale | Criterio residuo |
|---|---|---|
| Recupero account | Chiuso locale: verifica email, recupero e nuovo login reali confermati | Nessun nuovo invio necessario |
| Backup | Snapshot085607Z verificato43tabelle267originali, restore isolato spento, copia cifrata Drive riscaricata conSHA identico; chiave fuori PC confermata dall'utente | Gate chiuso per il pilota locale; copia a un punto nel tempo, non DB continuamente aggiornato |
| Upload/privacy/integrità | Controllo nuovo file bloccante Defender, riserva disco, formati/limiti, idempotenza, hash/ZIP e isolamento verificati | Verifica visiva reale comune all'export; limite politica cloud Windows dichiarato, nessuna sicurezza generale certificata |
| Export personale | JSON Home/account attivo, ZIP originali separato; test API/DB reali sintetici e UI harness | Collaudo visivo reale desktop/mobile con account QA separato |
| UX file ed export | Claude raccolto/arbitrato, rifiuti certi503 e messaggi corretti;32test frontend mirati/build/lint verdi | Nessuna riprogettazione generale; dettagli in fase0-chiusura-arbitrato-20261016.md |
| Qualità AI | Revisione indipendente conclusa, difetti gold/scorer riprodotti offline | Correggere E1…E8 e versione2; poi campagna rappresentativa con nuovo budget/consenso, senza chiamate implicite |
| Conservazione/cancellazione | Export disponibile, eliminazione e retention automatica assenti | Regola operativa/procedura del pilota ancora da definire; nessuna promessa legale o cancellazione silenziosa |
## Perimetro della prova personale

Proposta: account separato, pochi file iniziali non delicati, originali conservati dall'utente, visibilità Solo io, nessuna analisi esterna automatica. Non chiamare questo percorso «pronto» finché recupero accesso e destinazione backup non sono risolti. Foto JPEG/PNG archiviabili; l'estrattore attuale legge testo PDF, non equivale a OCR di immagini/scansioni. HEIC non ammesso. PDF con firma riconoscibile non sono per questo validati come leggibili, innocui o testuali.

## Lavoro Codex e Claude

Codex possiede contratti, implementazione e verifiche di integrazione. Le consegne Claude UX/corpus sono raccolte e arbitrate in fase0-chiusura-arbitrato-20261016.md. Il prossimo incarico separato può coprire solo corpus/scorer offline; nessuna sovrapposizione ai sorgenti del prodotto. Guida in sovraimpressione rinviata. BL-04 e successive restano nell'ordine approvato, senza avvio implicito.

## Export completo da specificare

Separare pacchetto utente JSON versionato (dati propri, provenienza e collegamenti ancora leggibili) da selezione originali ZIP. Escludere hash password, sessioni, token, dati privati altrui e dati ricevuti non più autorizzati. Per risorse Home comuni, esplicitare proprietà/autorizzazione e comportamento dopo uscita; non equiparare accesso corrente a diritto di esportazione indiscriminata. Archivio di risorse, chiusura casa e cancellazione account non sono la stessa operazione. Il pilota non promette ancora un export completo self-service né retention definita.

## Campione AI da preparare senza provider

24 casi sintetici annotati: 6 bollette (energia/gas/acqua, conguaglio, periodo ambiguo, totale diverso dal dovuto), 6 fatture (manutenzione, lavoro, acquisto, acconto, nota credito, più oggetti), 4 documenti tecnici (marca/modello, due potenze distinte, valore assente, conflitto), 4 negativi (scansione senza testo, immagine, PDF protetto, documento non pertinente), 4 ambigui (date, valuta, numeri locali, fornitore non professionista). Riutilizzare fixture presenti dove adeguate, evitare dataset duplicato.

Per ogni caso: SHA, formato, testo estraibile sì/no, valori attesi/assenti, pagina/evidenza, proposta ammessa e astensione richiesta. Misurare precisione per campo, omissioni, falsi positivi e provenienza, non solo «JSON valido». Nessuna conferma automatica, nessuna creazione da documento non pertinente; casi limite con errore esplicito. Congelare soglie prima della campagna; il passaggio dei test con risposte simulate non misura accuratezza del provider reale.

## Verifiche eseguite in questo avvio

Aggiornamento dopo avvio Claude: componente email preparatorio, corpus e controllo locale ripetibile in fase0-avanzamento-tecnico-20261016.md. Pacchetto personale proposto in fase0-export-design-20261016.md; nessun endpoint nuovo. Claude confermato al lavoro sulla sola UX. Controllo backup ha riletto hash del dump/255copie, non ha rifatto il restore né aggiornato lo snapshot. Le condizioni ancora aperte restano tali.

- 18/18 test documenti e multipart verdi, inclusi tre nuovi casi: corruzione a dimensione invariata, ZIP oltre 100 MiB senza letture e due export concorrenti falliti che liberano gli slot per il retry. La prima esecuzione aveva 17/18: il nuovo doppio di storage generava un Error grezzo anziché il 503 previsto dal suo contratto; corretta la fixture, nessuna modifica runtime. Log outputs/Dimora-V5-Fase0-storage-test-20261016.log.
- Lint backend verde. Nessun codice applicativo modificato, nessuna nuova build o suite completa necessaria per questi soli test/documenti.
- HTTP reale: GET /api/v5/session 200 e percorso non esistente /api/v5/storage-private/probe.bin 404, entrambi Cache-Control no-store e X-Content-Type-Options nosniff. Il 404 di un percorso fittizio non prova da solo l'inaccessibilità di ogni file; assenza di servizio statico verificata nel bootstrap, isolamento completo già descritto nei collaudi precedenti.
- Spazio libero C al controllo: 245650272256 byte, circa 229 GiB. È una misura puntuale, non un limite cumulativo o un monitor di spazio. Non è stato saturato il disco per simulare ENOSPC; il guasto di scrittura è coperto con filesystem temporaneo non scrivibile come directory e il comportamento servizio con doppio controllato.
- Nuovi test offline senza DB e provider; nessun originale attivo alterato. Nessuna email inviata, account/password o impostazione di sicurezza cambiati. Prossimo: arbitrato UX Claude, congelamento recupero e implementazione; parallelamente definire export e controllo locale dei file. La prova personale non è ancora dichiarata pronta.

## Aggiornamento controllo file e seconda destinazione

Controllo bloccante nuovi upload attivo e verificato su API/DB/storage reali sintetici: fase0-file-control-esito-20261016.md. Restano limiti della politica cloud Microsoft esistente, export personale/retention, revisione corpus e seconda copia. Google Drive scelto, cartella privata backup SW DIMORA individuata; nessun trasferimento eseguito. Il pilota non è ancora dichiarato pronto.

Seconda copia: snapshot 085607Z aggiornato (43 tabelle,267 originali), cifrato e caricato su Drive privata. Metadati remoti verificati, decifratura locale verificata; manca custodia della chiave fuori PC e non è stato collaudato un restore da file riscaricato. Vedi fase0-file-control-esito-20261016.md.

## Export personale implementato
JSON personal-export-v1 per Home/account ora attivo, pannello Documenti. Privacy/storia/fonti e revoca collaudate con DB/HTTP reali sintetici; UI con harness, browser personale preservato. Vedi personal-export-esito-20261016.md. Non equivale a export totale account o politica di conservazione; Fase0 complessiva ancora aperta. Claude confermato avviato su UX/corpus.
