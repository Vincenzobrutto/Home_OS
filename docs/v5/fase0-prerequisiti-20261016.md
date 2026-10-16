# Fase 0 prerequisiti del pilota Home

Avvio approvato dal committente il 16 ottobre 2026. Questa matrice distingue capacità esistenti, verifiche e lavoro residuo; la Fase 0 non è ancora chiusa. Nessun documento personale è stato caricato in questa sessione.

| Area | Stato e base | Criterio per chiudere |
|---|---|---|
| Backup DB e originali | Verificato: backup-verifica-20261016.md, 41 tabelle e 255 originali, restore isolato spento | Copia valida conservata; prima di nuovi dati personali concordare seconda destinazione distinta dal PC. Il backup locale non protegge dalla perdita del PC |
| Recupero account | Assente nel runtime; proposta fase0-recovery-design-20261016.md; adapter Brevo non collegato, 6 test offline verdi | UX, contratto, servizio/mittente da confermare, challenge/API/frontend e prova completa senza accesso basato su email dichiarata |
| Upload e integrità | Codice: PDF/JPEG/PNG rilevati dai byte, 20 MiB/file, idempotenza; hash e dimensione al download/ZIP; errore storage senza falso successo | Prove mirate e procedura spazio disponibile; limiti cumulativi non presenti, non pubblicizzare quota utente |
| Privacy documenti | Default private; owner non legge automaticamente il privato altrui; guard e revoca; no-store/nosniff e allegato, listener API loopback | Prove di isolamento/sessione già documentate, nuovi controlli mirati; nessuna attestazione di sicurezza generale |
| Export e conservazione | ZIP selettivo originali e manifesto, fino a 100 MiB; non include tutti i dati strutturati | Definire export completo e confini account/Home/condivisioni. Nessuna cancellazione automatica, nessun termine legale inventato |
| Qualità AI | Due esempi live economici insufficienti; corpus24 casi materializzato e controllato dal parser, scorer offline disponibile | Revisione indipendente annotazioni e campagna rappresentativa, metriche ed errori; ulteriori chiamate live solo con file e budget autorizzati |
| File potenzialmente dannosi | documents-api-contract.md richiede hardening antimalware prima del pilota; rilevare il formato non è una scansione | Definire controllo locale/quarantena ed esiti prima dei file personali. Nessuno scanner installato o impostazione Windows modificata |

## Perimetro della prova personale

Proposta: account separato, pochi file iniziali non delicati, originali conservati dall'utente, visibilità Solo io, nessuna analisi esterna automatica. Non chiamare questo percorso «pronto» finché recupero accesso e destinazione backup non sono risolti. Foto JPEG/PNG archiviabili; l'estrattore attuale legge testo PDF, non equivale a OCR di immagini/scansioni. HEIC non ammesso. PDF con firma riconoscibile non sono per questo validati come leggibili, innocui o testuali.

## Lavoro Codex e Claude

Codex possiede contratti, backend, test e verifica storage/export. Claude prepara solo UX recupero e copione prova personale nel nuovo frontend-v5/docs/fase0-ux-20261016, senza sovrapposizioni o implementazioni. Guida in sovraimpressione rinviata. BL-04 e successive restano nell'ordine approvato, senza avvio implicito.

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
