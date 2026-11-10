# Prova web visibile: fixture e PDF reale, 30 ottobre 2026

Su richiesta esplicita di Vincenzo: prima prova sintetica, poi documento personale gia autorizzato per invio AI nel tetto aggregato di 4 EUR. Demo Alessio invariata, nessun merge o deploy. Originale, raster, contorni, risposte provider, credenziale e journal privati non sono inclusi nel repository.

## Risultato concreto

Nel browser visibile completati creazione pratica, upload, classificazione e analisi sintetica, apertura contorni e aggiunta/salvataggio di un punto. Poi percorso separato con PDF reale e provider effettivo, senza punti interni o poligoni del riferimento manuale. Come istruzione aggiuntiva soltanto censimento completo, esclusione altre unita/scala e interpretazione del caminetto gia fornita dall'utente.

La seconda prova reale completa due generazioni e salva 10 geometrie: otto vani/accessori principali proposti, un disimpegno e una fascia di balcone connessa. Inventario AI: 15 voci, comprese tre escluse; non confondere le voci semantiche con il numero di geometrie finali. Il caminetto e mantenuto nella geometria secondo la regola dell'utente. Nessuna correzione manuale dei contorni reali effettuata per migliorare artificialmente l'esito.

Controllo visivo sul documento: buona aderenza di molti bordi, balcone perimetrale visibile. Il disimpegno ovest resta accorpato al soggiorno. Quattro segnalazioni geometriche/simboliche aperte: tre simboli da interpretare e un seed nord non risolto. La fascia del balcone ottenuta da un altro seed sembra coprire anche parti nord: il seed irrisolto non dimostra da solo una superficie mancante, ma non viene chiuso automaticamente. Il risultato richiede ancora revisione e non soddisfa un obiettivo generale di zero interventi manuali.

Salvata calibrazione sulla barra grafica 10 metri del medesimo originale, usando la verifica locale precedente e controllando l'anteprima. Nessuna scala ricavata dal DPI o metratura proposta dal modello. Coordinate e file di verifica rimangono privati. Profilo dimostrativo: vani netti al 100%, balcone al 25% come ipotesi da validare, senza fasce muro e senza perimetro lordo. Copertura, muri e criterio NON confermati. Esito **134,53 m2 parziali, totale definitivo assente, sette verifiche aperte**. Ricarica browser conferma geometrie, scala 10 e computo salvati. Non e la superficie commerciale definitiva dell'appartamento.

Entrambe le viste rimangono disponibili. Il perimetro lordo di questo PDF non e stato inventato dalla somma dei vani e resta da definire/confermare. Per questa prova non sono stati testati i nuovi pannelli di associazione atti/dichiarazioni del lotto parallelo.

## Difetto scoperto e correzione

Primo invio reale: nessuna bozza utilizzabile, una generazione con ricevuta e costo 0,012116 USD. Job e ricevuta preservati, nessun retry del suo ID. Lo stato applicativo e `uncertain`, ma la fase inventory ha usage contabilizzato: il nome UI non distingue ancora errore semantico da consegna finanziaria ignota.

Diagnosi locale del raster effettivamente inviato: solo cornice/testi/scala, immagine principale assente. Il PDF contiene un'immagine CCITTFaxDecode. PDF.js richiedeva il percorso dei codec locali; senza questo parametro ometteva il bitmap, mentre la renderizzazione della cornice riusciva. Non attribuire il primo risultato alla capacita del modello di leggere la planimetria completa.

Corretto `render-worker.cjs`: directory wasm del pacchetto gia installato, suffisso '/' anche su Windows, rete ancora vietata nel decoder. Supporto dei codec CCITT/JBIG2/JPEG2000 gia bundled, nessuna nuova libreria o installazione condivisa. Warning di mancata decodifica immagine intercettato e tradotto in errore: niente pagina parziale inviata all'AI. File/dimensioni/hash e controlli autorizzativi esistenti conservati. Un'anteprima precedente con raster diverso continua a essere rifiutata dal confronto SHA.

Il controllo locale dopo fix mostra il disegno completo. Seconda analisi esplicitamente distinta, in nuova pratica/agenzia di prova e con nuovo cap, mantenendo la prima riserva: non un reinvio automatico dell'esito incerto. I contorni ottenuti derivano dalla pipeline TypeScript e dai seed AI nuovi, non dal vecchio prototipo corretto manualmente.

## Verifiche

Tre nuovi test sintetici: JPEG2000 con centro nero, JPEG2000 corrotto rifiutato, CCITT Group4 con immagine preservata. I primi due riproducono la regressione sul codice precedente e passano dopo il fix (17/17 nel profilo di quel momento). Aggiunto poi il caso CCITT, formato del PDF reale. Primo generatore test aveva una parentesi errata, corretta prima del red effettivo; prima fixture CCITT aveva polarita TIFF/PDF invertita, corretto il parametro Decode della fixture, non le asserzioni o il decoder.

Finale **571/571 backend**, build e lint mirato verdi. Log `agency-visible-backend-complete-final.log`, `agency-visible-renderer-lint-final.log`; prima regressione 570/570 precedente al caso CCITT. I fallimenti intermedi sono conservati, non chiamati verdi. Nessuna nuova regressione frontend: non modificato codice frontend in questa tranche. Il browser serve lo snapshot isolato f3ffd40 con il fix del decoder; le successive UI del branch parallelo restano distinte e non vengono dichiarate collaudate da questa prova.

## Costi e autorizzazione

Nuove generazioni reali: una nella prova fallita e due nella prova corretta, oltre ai tre count_tokens. Costi calcolati dalle ricevute: **0,012116 + 0,061504 = 0,073620 USD**. Pregresse prove registrate 0,439352 USD; totale dei registri consultati 0,512972 USD. Non fattura o conversione in EUR.

Riconciliazione supplementare separata dal ledger iniziale, rimasto byte-identico: sette tentativi conclusi verificati tramite ricevute/usage e trattenuti perfino al loro massimo USD originario; riserva 0,50 EUR del vecchio uncertain invariata. Fattore prudenziale 2,5 gia usato negli script precedenti, non cambio valutario quotato. Anche mantenendo entrambi i nuovi cap interi di 0,25 USD, bound aggregato **3,411 EUR entro 4 EUR**. Nessun aumento del tetto, reset ledger, rimborso di prenotazioni incerte o riciclo del job fallito.

Indice privato corrente: `work/planimetria-prova/budget-index-20261030.json`; journal separati sotto `work/agency-live-pilot` e `work/agency-live-pilot-corrected`. Consultare tutti prima di qualsiasi nuova autorizzazione di spesa. Le sessioni rifiutano il riavvio dopo una generazione e limitano i messaggi a due per il run corrente. Credenziale iniettata solo nel pilot; gli altri flag AI rimangono disabilitati.

## Ambiente e disponibilita

Cluster nuovo posseduto `dimora-offline-7p7Aid`, porte 55439/3119/34873 della prova sintetica. Il pilot effettivo e un processo separato esplicitamente live: non e il runner offline e non modifica/bypassa le sue guardie. Usa lo stesso cluster appena creato e posseduto da questa sessione, API privata 3120 e frontend su loopback separato **http://127.0.0.2:34874/agenzie**, cosi i cookie non sostituiscono quelli di 127.0.0.1 o localhost. Sessione/CSRF, accesso per fonte e budget server sono quelli di prodotto.

Trasporto del pilot consente solo endpoint Anthropic predefiniti, un solo run della propria agenzia, SHA del PDF esplicitamente autorizzato, pagina 1 e limite 0,25 USD per run. Nessun originale nella directory pubblica del frontend. Script/configurazione/accessi/risposte solo nella cartella privata della chat, non nel branch.

Arresto automatico oggi alle **16:15 Europe/Rome (15:15 UTC)**, niente disponibilita permanente o pubblica. Non arrestare/riutilizzare il cluster da altri incarichi durante la prenotazione. La prova reale corretta e nell'agenzia etichettata come successiva alla correzione del decoder; il primo esito e conservato nell'altra agenzia. Nel browser rimangono le due schede per il confronto.

Screenshot privati negli outputs della chat: prova sintetica, PDF reale e balcone reale. Una chiamata del controllo browser durante il secondo upload e rimasta in attesa per circa 821 secondi; il file e poi risultato caricato. Non usare questo dato come misura isolata della latenza applicativa.

## Seguito prioritario

Separazione semantica soggiorno/disimpegno in presenza di aperture, verifica copertura del balcone e gestione dei simboli. Distinguere nell'interfaccia fallimento geometrico con costo noto da esito di trasporto incerto, senza introdurre retry automatici. Benchmark su altri documenti autorizzati prima di promettere una bozza con pochi o nessun intervento.

Limite dell'editor osservato dal contratto corrente: corregge i vertici di regioni esistenti e il perimetro, ma non offre Dividi vano o Aggiungi ambiente. La separazione completa del disimpegno accorpato richiede anche questo recupero manuale o una nuova segmentazione; non dichiararla risolvibile con la sola aggiunta di un punto.
