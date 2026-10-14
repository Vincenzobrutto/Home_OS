# H3a — spese essenziali integrate e verificate in locale

14 ottobre 2026. Base contratto/frontend Claude 076d5a9, master dev/dimora-v5-local-20261013. Frontend del checkout separato raccolto, integrato e verificato da Codex con backend/schema/test e browser reali. H3a chiusa per lo sviluppo locale; i paragrafi backend descrivono la fase precedente al consolidamento frontend finale.

## Completato backend
- Migrazione additiva 202610140001_expenses nel solo dimora_v5_product_dev 127.0.0.1:55432, con controllo assertDevelopmentDatabase. Nessun reset o DB legacy/reale. Ferma soltanto API registrata, Prisma 6.19.3 genera e deploya; API riavviata direttamente, senza interventi del committente.
- Nove endpoint expenses-v1: capabilities, lista/dettaglio/creazione/aggiornamenti/archiviazione/ripristino/storia/riepilogo.
- EUR in centesimi interi, data sostenuta non futura dal giorno Roma; proprietà personale e totali annuali manual/document separati. Nessuna AI, pagamento, categoria o stima finta.
- Advisory lock account/Home e membership condivisa riletta, idempotenza persistente e CAS per versioni. No-op senza nuova storia; archive/restore conserva le note e i documenti originali.
- Riferimenti documentali/caldera autorizzati in scrittura e redatti nelle letture, storia e replay. Replay ricostruisce la proiezione dello snapshot originario con i diritti attuali, senza esporre vecchi nomi/ID divenuti vietati. Origine document resta dichiarata anche se fonte unavailable.
- Paging keyset sul DB (data, creazione, ID), limite+1, cursor vincolato account/Home/risorsa/filtri, indipendente dal limite. Somme aggregate nel DB prima della proiezione; solo account corrente. Nessuna nuova dipendenza.

## Prove realmente eseguite
- Build TypeScript e lint verdi; 77 test offline e 89 backend integrazione verdi. Conteggi Node includono i contenitori. H3: quattro test dominio, otto scenari DB più contenitore e quattro HTTP più contenitore.
- Suite HTTP usa controller Nest/sessioni/CSRF/AccountContext/PostgreSQL/upload/file reali su harness effimero senza worker/provider. Dopo Restart, ripetuta con V5_EXPENSES_API=1 contro processo 3001: cinque test verdi.
- Private altrui e conteggi, viewer, revoca/scadenza, input/query stretti, doppia creazione concorrente/replay, versioni concorrenti, archivia/ripristina/no-op, redazione riferimenti/storia/replay, 25 record/timestamp identici e cambio limite, cursor filtri/account diversi.
- Somma 10+20 centesimi =30; totale grande oltre Int32 verificato in suite DB. Originale scaricato byte-identico prima/dopo; versione/conferme caldaia e ledger AI invariati. Cleanup soltanto delle proprie fixture sintetiche, con rimozione file HTTP dopo verificata eliminazione dei riferimenti.
- Due problemi del primo run di test corretti: validazione cursor restituiva errore sincrono anziché Promise respinta, interfaccia uniformata async; il test iniziale di revoca avviava più Promise senza attaccare subito handler, corretto con Promise.all. Paging reale non aveva duplicati. Non conteggiare i run falliti come verdi.

Log outputs/Dimora-V5-H3-backend-offline.log, Dimora-V5-H3-backend-integrazione.log, Dimora-V5-H3-API-reale.log. Nessuna chiamata Anthropic effettuata; suite AI live disabilitate.

## Ancora aperto
H3a chiusa come incremento locale. H3b stime/ricorrenti, export delle spese nel ciclo di vita, rate Admin e produzione restano fuori H3a. Non dichiarare conformità WCAG o readiness pubblica.

## Integrazione frontend finale — 14 ottobre, notte
Consegna Claude760804f raccolta autonomamente dal checkout distinto: sette commit integrati (1574440,d411b1e,a383353,bc04e2b,8c89fb3,8b939e9,edaa0b4), sync cacc8fc escluso. Nessun main/push o file estraneo modificato. Il handoff Claude descrive solo la fase mock precedente; questo report è lo stato consolidato.

Build/lint e213 test mock/fixture della consegna passano. Codex corregge il testo503 (non si può garantire che un POST ambiguo non sia stato salvato) e rende selezionabili anni anteriori alle dieci opzioni, con validazione/focus. Un nuovo test copre anno2010 e0000 rifiutato; dopo le ultime modifiche build/lint e31 test H3 mirati passano. Non presentare214 come una suite completa rieseguita:213 baseline e31 mirati, con una nuova regressione.

Client/API su3001: quattro gruppi (pausa61s, protezione auth15/min intatta),19 non-live passano (9 identity/documenti/review,6 M4/H1,2 H2,2 H3); quattro Anthropic live saltati. Nessuna nuova chiamata a pagamento.

Browser reale su account sintetico ProvaM4/CasaM4: ingresso da Casa a390, creazione0,10 con caldaia; data13ottobre tramite tastiera nativa; modifica nota; dialogo archive a320 con Escape, restituzione focus e Tab contenuto; nota archivio/storia, restore e focus a Modifica. Dal PDF originale, secondo costo0,20 con documento e caldaia; due righe nella caldaia, totale server0,30 nella Home/Spese. Anno2010 da UI produce riepilogo vuoto corretto, refresh mantiene filtro e anno2026 ripristina totale; focus al campo e al selettore dopo scelta. Logout/login mantiene entrambi i costi. Nessun overflow a320/390/desktop, override viewport ripristinato.

Fixture lasciate navigabili: f71cbb2d-5870-4a45-a959-5a075f7eedf8 (10cent,active,version4) e bf9516fe-06b8-4cf0-b1e7-4bb3b4676f8f (20cent,active,version1). Doc6a1ca2db-9047-47f3-8fe1-65f1f9cc98d5 rimane versione1/hash5e15f495d13eb76b6d27d23071f659a622c55a5156f6bc55d1704f40e07472f3; caldaia83f841c6-6f43-4296-bae3-2e58cf219df5 versione4. Ledger8 tentativi, somma41714microUSD invariati (0,041714USD M4). Screenshot outputs/Dimora-V5-H3-spese-reali-desktop.png e -390.png. Risposta persa/revoche/viewer e paging non tutti forzati manualmente nel browser: coperti da suite mock/DB/HTTP/client dichiarate.

## Decisioni sulla consegna Claude
1. Anni storici: risolto nel frontend con scelta esplicita, senza nuova API/catalogo anni.
2. Tutti gli anni mostra lista pluriennale, riepilogo etichettato anno corrente: coerente col contratto, non totale pluriennale implicito.
3. POST503 resta ambiguo e conserva chiave/body, anche se alcuni503 precedono il commit: riprova idempotente sicura. Testo corretto.
4. Documento home leggibile di altro membro collegabile: contratto esplicito; spesa rimane personale, non condivisa con l'uploader.
5. Filtro di riferimento non più leggibile403: nessun risultato o nome dedotto; fonti già registrate unavailable redatte. Privacy DB/HTTP verificata.
6. Viewer/ruoli/revoca verificati DB/HTTP e mock, senza inventare API inviti.
7. Possibile perdita focus H1 dopo azioni: osservazione sul codice, non riprodotta in questo giro; backlog prima del pilota, nessuna regressione H1 dichiarata senza verifica.
8. Chunk finale545,03kB: code splitting tracciato prima del pilota; soglia non aumentata per nascondere l'avviso.
