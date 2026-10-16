# Esportazione personale prima del pilota Home

Documento di progettazione Fase 0; implementazione corrente e limiti in personal-export-api-contract.md e personal-export-esito-20261016.md. Il download ZIP M2 rimane invariato: selezione di originali leggibili, manifesto SHA, massimo 50 documenti e 100 MiB. Quel download non esporta spese, attività o collegamenti.

## Pacchetto personale proposto

Pacchetto per una Home e account autenticato, JSON versionato, con eventuali originali selezionati separatamente. Evitare il nome «tutti i dati dell'account»: una stessa persona può avere più Home, dati ricevuti e diritti cessati. Nome UI proposto «Esporta i miei dati di questa casa». Il pacchetto non trasferisce proprietà e non concede permessi al destinatario di una condivisione.

Contenuto minimo proposto: anagrafica pubblica dell'account (id/nome/email), contesto Home ancora autorizzato, oggetti propri, relative posizioni e collegamenti ancora leggibili, attività/spese/lavori propri, conferme tecniche proprie e riferimenti a documenti caricati da sé. Per ogni campo servono allowlist esplicite: vietato serializzare direttamente record Prisma interi. Importi in centesimi, valuta e date conservate senza ricalcolare o inventare valori. Provenienza distinguibile da valore confermato, con riferimento a versione/SHA.

## Regole di inclusione

| Risorsa | Inclusione proposta | Esclusioni |
|---|---|---|
| Home | Dati di contesto se membership attuale valida | Elenco persone, email di altri membri e dettagli di case non autorizzate |
| Oggetti e schede tecniche | Creati dall'account, anche archiviati se ancora leggibili | Schede altrui o riferimenti vietati |
| Attività, spese e lavori | Privati dell'account, inclusa storia significativa | Record di altri account, richieste idempotenti e log di infrastruttura |
| Documenti | Metadati dei propri documenti nella Home ancora accessibile | Privati altrui; nessuna chiave/path storage |
| Collegamenti | Solo se entrambi gli estremi inclusi e leggibili | Nomi o note di risorse revocate; riferimenti esterni possono diventare «riferimento escluso» senza identità |
| Condivisioni | Solo stato delle proprie operazioni e risorse attualmente autorizzate, da definire prima di includere | Codici C1, comparisonCode, claim e dati del destinatario; originali ricevuti revocati |
| Analisi | Dati confermati con provenienza minima | Prompt, risposte grezze, bozze non confermate, identificativi del provider e costi interni |
| Sicurezza | Nessun contenuto | Password hash, sessioni, CSRF, challenge, throttle, token o .env |

Le scelte «proprio» e «ancora autorizzato» seguono i contratti di ciascuna risorsa, non il ruolo owner soltanto. Dati Home comuni e originali caricati da altri restano fuori da questo pacchetto personale; restano consultabili/esportabili attraverso i percorsi già autorizzati M2, senza estensione implicita dei diritti.

## Contratto e limiti da congelare

Proposto POST /homes/:homeId/personal-export con Origin/CSRF, X-Account-Context, nessun accountId arbitrario e permesso export. Capability separata, disabilitata fino all'implementazione. Creazione entro snapshot transazionale coerente; controllo sessione/membership alla fine prima di consegnare il risultato. Limite esplicito di dimensione/tempo, nessun troncamento silenzioso o pacchetto parzialmente autorizzato. Concorrenza e memoria limitate come M2, nessun filesystem pubblico. Content-Disposition attachment, no-store, nosniff. Nessuna email automatica con dati personali.

Se si includono originali, non riusare ciecamente gli id del JSON: ricontrollare separatamente ogni permesso e integrità, fallire l'intero pacchetto se un originale selezionato non è disponibile. Nessun job lungo persistente prima di aver definito cancellazione, scadenza e revoca del download. Export non equivale a cancellazione o disconnessione dalla Home.

## Accettazione prima del frontend

Due persone nella stessa casa non si esportano dati privati a vicenda; altro account/contesto errato e membership revocata negati; risorse archiviate conservate quando autorizzate; risorsa collegata vietata senza nome; date/importi identici al canonico; nessun campo di sicurezza nel JSON; errore storage senza ZIP parziale; export concorrenti e oversize gestiti; ritorno da logout senza dati residui. Verifica con fixture sintetiche, non con dati personali. Il pacchetto non è una dichiarazione di adempimento legale né una politica di retention.

## Contratto per implementazione
Il dettaglio tecnico è ora in personal-export-api-contract.md: formato1 personale per Home, JSON separato da originali ZIP, mapper allowlist, fonti e storia filtrate, budget righe/byte, lettura fresca autorizzazioni dopo snapshot. L'endpoint resta non attivo. Nessuna API o politica di cancellazione introdotta da questo documento.

## Stato implementato
personal-export-v1 attivo in locale con pannello Documenti. Le parti storiche indicate come proposta sono superate dal contratto e dall'esito sopra. Non implementate cancellazione, retention o reimport; ZIP originali invariato. Nessun endpoint capability aggiuntivo: permesso Home export e verifica esplicita del formato/contesto del pacchetto.
