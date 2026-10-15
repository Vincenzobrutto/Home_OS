# S1c — backend bozze economiche: stato e limiti

15 ottobre 2026. Sviluppo Codex separato dal frontend S1a/b di Claude. Il backend aggiunge job persistenti, bozze e conferme; non dichiara S1 completo né disponibile l'estrazione Anthropic da bollette arbitrarie.

## Implementazione

- EconomicAnalysisJob con stato, versione, lease e recupero dopo interruzione; EconomicDraft open/parked/confirmed, originale/versione/hash immutabili e proposte con citazioni di pagina.
- API per avvio e retry esplicito, lettura job, elenco/dettaglio bozze, candidati, park/reopen e conferma. Idempotenza e CAS dentro il contesto account/Home corrente.
- Conferma create usa il motore transazionale delle spese canoniche nella stessa transazione della bozza. Una conferma concorrente o una risposta persa non crea due costi.
- Link_existing conserva importo/categoria/date e relativa origine. Se il costo ha già lo stesso documento non ne incrementa la versione; un altro originale provoca conflitto, senza sostituzione implicita.
- Importi ambigui richiedono scelta esplicita; manuale diverso dalla proposta rimane user_declared. Fonti revocate redatte anche in storia e replay, senza cancellare la memoria economica personale confermata.
- Migrazione additiva sul solo database V5 dedicato. Nessuna modifica al frontend posseduto da Claude, schema legacy, main o push.

## Modalità realmente disponibile

Provider `test_fixture_v1`, esplicitamente simulato: riconosce soltanto i due originali sintetici in `docs/v5/fixtures/s1/gas.pdf` e `invoice.pdf`. Il parser PDF è reale e verifica testo, pagine e hash; i valori proposti sono fixture, non un modello AI. Un documento estraneo non riceve dati inventati.

Capabilities annuncia documentDrafts=true e il solo provider fixture abilitato. Anthropic compare disabilitato; avvio/retry a pagamento rifiutati senza trasferimento di testo. Nessuna modifica al ledger M4, nessuna nuova chiamata paid. L'estrattore Anthropic economico generale e relativo collaudo restano lavoro successivo; non basta abilitarne un flag.

## Evidenze precedenti alla ripresa

- Build/lint backend superati.
- Suite offline completa: 89 passati.
- Suite generale DB/HTTP dopo riavvio API: 130 passati, log `outputs/Dimora-V5-S1c-integration.log`.
- Dopo aggiunta di un caso su fattura lorda/manuale/conflitto documento: suite S1c mirata 12 passati. Ulteriore HTTP sul processo registrato: quattro passati.
- La nuova verifica HTTP sul MIME non supportato aveva un'asserzione errata: cercava `data.code`, mentre l'envelope pubblico è `data.error.code`. Corretto il test nella ripresa del 15 ottobre; risultati successivi registrati sotto.
- Una precedente esecuzione generale era partita con API ferma per rigenerare il client: non costituisce una prova di regressione funzionale. Ripetuta con servizio avviato, verde.

## Da completare

Ripresa del 15 ottobre: build/lint superati e tutti i 12 test S1c mirati verdi, compreso il MIME non supportato con envelope corretto. Launcher `-Resume -Restart` ha ripristinato i soli servizi locali V5; API nuovamente pronta su 3001. Non è stato necessario alcun comando del committente. I 130 test della suite generale rimangono evidenza dell'esecuzione precedente, non vengono presentati come una nuova esecuzione completa odierna.

Raccogliere e integrare il frontend quando Claude consegna; collegare il percorso S1c nel client e collaudare browser/permessi/focus e ritorni sull'app reale. La dashboard standalone e il backend non sostituiscono questa verifica. Nessuna dichiarazione WCAG.
