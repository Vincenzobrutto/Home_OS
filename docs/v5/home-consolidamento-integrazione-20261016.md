# Home — integrazione finale del blocco UX, 16 ottobre 2026

## Risultato

Guida al primo accesso rinviata dal committente: demo conservata, nessun tour integrato. Casa ora presenta ingressi rapidi a documenti/spesa/oggetti, scadenze e verifiche prima dei riepiloghi della casa. Dati anagrafici e permessi restano in fondo, in dettagli richiudibili nativi. Nessuna nuova API, migrazione o dipendenza.

Le verifiche usano openCount del server, separate dal caricamento delle caldaie: un errore sulle caldaie non nasconde il conteggio review. Le condivisioni mostrano un avviso quando una pagina caricata contiene il permesso confirm_pairing. Non vengono esposti nomi o codici nell'avviso. Con altre pagine disponibili, senza conferme rilevate, invito ad aprire l'elenco completo: nessun totale o assenza globale inventati, nessuna scansione automatica di tutto l'archivio. Errori restano errori, anche con cache precedente.

Limite deliberato: l'avviso non è una notifica push né una ricerca esaustiva delle conferme oltre le pagine disponibili. Il riepilogo rilegge secondo il comportamento query esistente, senza nuovo polling. La conferma avviene sempre nel percorso protetto con confronto e successiva accettazione.

## Raccolta Claude

Worktree `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-Home-consolidamento`, pulito alla raccolta; baseline1711428 e consegna esplicita presenti. Esaminati diff, test e rapporto, integrati solo:

| Claude | Master | Contenuto |
|---|---|---|
| ac42065 | 817fbad | Ingresso con codice prima del modulo quando non ci sono case |
| 56e498c | 7c1a2d3 | Istruzioni prima di generare/rigenerare codice esterno, durata da capabilities |
| e3ddc8b | 66449fa | Consegna e cinque screenshot del suo harness |

Nessun commit di sincronizzazione. La creazione casa conserva validazione/idempotenza; errore o attesa non diventano casa vuota. TTL e protocollo C1 invariati. Le prove Claude (44 test distinti e 27 controlli browser sul simulatore) sono evidenze sue. Codice scaduto e backend reale non riprodotti da Claude, limiti correttamente dichiarati nella consegna originale.

Codex: 784aabc implementazione Casa; 4392896 correzione contesto del riepilogo differito. Il primo tentativo di usare lazyPage con props era errato: il wrapper è progettato per pagine senza props. Build lo ha segnalato e browser ha mostrato collegamento undefined. Corretto risolvendo il contesto Home nel wrapper; aggiunta asserzione sull'URL effettivo della casa. Nessun cambiamento del wrapper condiviso. Riepilogo condivisioni differito per preservare il caricamento iniziale.

## Verifiche Codex

- Prima del differimento: build/lint e 17 test mirati verdi.
- Integrazione: 46/46 test in sei file (Casa, creazione casa, routing, sharing, lazy loading); dopo correzione del contesto, caso Casa finale 1/1 verde. Non contare quest'ultimo come test distinto. Nessuna suite completa rieseguita o dichiarata verde.
- Build finale e lint finali verdi. Entry 490,22 kB, gzip149,24 contro487,79/148,72 della baseline; incremento circa2,43/0,52 kB. Nessun superamento soglia500kB. Il tentativo precedente senza differimento era499,94kB prima della raccolta Claude.
- Log workspace: outputs/Dimora-V5-Home-integrata-{build,lint,test}-20261016.log; outputs/Dimora-V5-Casa-contesto-finale-20261016.log.
- Browser sul backend V5 reale, sessione sintetica già autenticata `Verifica Home sintetica`, casa8f7fff10-910f-4593-bc23-6f89607f35ec: ordine contenuti, dati vuoti reali, condivisioni senza errore, collegamento con homeId corretto, apertura dettagli con ruolo e permessi.
- Mobile320px: larghezza documento320 e viewport320, nessun overflow orizzontale; dettagli chiusi all'ingresso. Collegamento Registra una spesa apre il modulo reale, poi Annulla e ritorno Casa senza salvare. Viewport ripristinata. Non è una prova su telefono fisico.
- Evidenze workspace: outputs/Dimora-V5-Casa-integrata-desktop-20261016.png e Dimora-V5-Casa-integrata-mobile-20261016.png.
- Avviso positivo di conferma e paging/errori verificati nei test con backend simulato; non creata nuova consegna reale per riprodurlo. Nessuna nuova analisi AI.

## Stato sicuro e prossimi passi

Fetch origin riuscito: prima della raccolta173avanti/0indietro rispetto a origin/main. Dirty estraneo/rootdocs e vecchi checkout preservati, nessun push/main/DB legacy, .env o sicurezza modificati. Nessun servizio riavviato, nessuna chiamata a pagamento. Note nei documenti root lasciate non staged per preservare il dirty cumulativo.

Heartbeat ricevuto alle05:20UTC, cioè07:20Europe/Rome, successivamente all'orario richiesto05:00. Lavoro ripreso alla consegna effettiva dell'evento; non dichiarare attività continua durante l'intervallo. Automazione monouso posta PAUSED, chat non archiviata.

Il committente deve valutare soltanto chiarezza e priorità visiva della nuova Casa. Se soddisfacente, prossimo blocco: definire e simulare i percorsi Agenzie prima dell'implementazione, riutilizzando le decisioni già consolidate. Prima di estendere C1 a schede tecniche servono contratto e perimetro separati. Guida, forecast e rubrica restano rinviati; niente nuove lavorazioni automatiche in coda.
