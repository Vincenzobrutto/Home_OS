# Revisione dati e fonti — componente indipendente

30 ottobre2026, ciclo diurno autorizzato fino18:00Europe/Rome. Prodotto ancora da validare con un’agenzia reale; nessuna modifica della demo Alessio.

## Implementato

Nuova cartella `frontend-v5/src/agency-review`, indipendente da router, navigazione, AppModule, API e workspace planimetrie del lotto concorrente.

`ReviewWorkspace` legge fatti/unità attraverso una porta esplicita. Mostra valore/stato, origine estratta o dichiarata, unità e soggetto indicati dal chiamante, prova con versione/pagina/citazione. Soggetto non etichettato resta “da identificare”, senza dedurre venditore attuale dal proprietario storico. Per una correzione salvata conserva a video anche il valore proposto originariamente.

Decisione sempre esplicita: conferma, correzione motivata o rifiuto. Tipi numero/booleano conservati, false distinto da assente, nessuna conferma all’apertura. Valori superati non decidibili; modalità sola lettura supportata. Il dato a video cambia solo con la risposta del server, non in anticipo.

Client `agencyReviewApi` sui GET/POST review esistenti, con ApiTransport condiviso: sessione, CSRF, contesto account e chiave idempotenza. Scope catturato al momento della costruzione, nessun fallback locale o token persistito dal componente.

## Errori, privacy e concorrenza

- 403/401/404: valori, prove e controlli rimossi dalla vista.
- 409 o source_changed: decisioni congelate fino a ricarica esplicita.
- 422/errore validazione: dati non promossi, form correggibile.
- Servizio/esito incerto: nessun retry automatico; conserva esatto payload e chiave per “Riprova lo stesso invio”, oppure permette ricarica per conoscere lo stato.
- Cambio scope o porta API: vecchi risultati non riappaiono; owner della vista e generazione delle operazioni impediscono risposte tardive di un contesto precedente. Read abortable e nessun raddoppio mentre una mutazione è in corso.

Citazioni renderizzate come testo React, senza HTML eseguibile o URL provenienti dal contenuto. Eventuale “Apri fonte” invoca soltanto il callback del contenitore con la prova esatta; qui non viene scaricato o aperto un originale. Il contenitore dovrà autorizzarlo nuovamente.

## Verifiche

18/18 nuovi test (15componente,3client), typecheck app e lint mirato verdi. Prove: decisione esplicita e revisioni, nessuna conferma ottimistica, ragione correzione, numeri/false, retry identico, conflitto/ricarica, validazione/form, revoca, stale/readonly, scope e porta API cambiati durante una mutazione, quote non eseguibili e descrittore fonte. Client con test del trasporto effettivo su fetch finto esplicito, incluse sessione/CSRF/idempotenza/denial.

Primo avvio test non partito per cartella log mancante; creata cache privata e junction alle dipendenze frontend già presenti, senza installare librerie o scrivere nella junction. Primo parsing JSX ha rilevato parentesi mancante nella validazione, corretta prima dei15test verdi. Lint rilevava reset sincroni in effect: riorganizzato caricamento con owner della vista e reset in callback/eventi, senza disabilitare regole. Aggiunti tre casi mirati per numero/readonly/cambio porta;18/18 finali.

Browser desktop e375px su harness sintetico separato: citazione, scelta correzione, motivazione obbligatoria, evento fonte, salvataggio simulato e ricarica. Viewport375,client360,scroll360: nessun overflow orizzontale osservato. Zero errori console osservati. Screenshot negli output della chat `Dimora-revisione-dati-desktop.png`, `Dimora-revisione-dati-375.png`, `Dimora-revisione-dati-375-salvata.png`. Fullpage capture non disponibile nel browser: acquisita viewport; selettore label inizialmente non risolto, usato il ruolo accessibile effettivamente presente. Viewport ripristinato e tab propria chiusa, server proprio34879 fermato.

Harness `agency-review-preview.html`/`__preview__/main.tsx`: API solo in memoria dichiarata nel banner, entry distinta non importata da router/client reali. Il salvataggio browser non è una prova backend o una persistenza durevole. Test API non sono un collaudo browser contro API reale o un telefono fisico.

## Rimasto fuori

Componente/client implementati, **non collegati alla navigazione prodotto**. Nessun caricamento atto o risultato AI introdotto dalla UI; non persiste le proposte non associate del nuovo decoder. Contenitore per originale, nomi autorizzati dei soggetti e permessi devono essere forniti dalla pratica. Storico di autori/motivazioni non ancora esposto nella scheda: il backend lo conserva, non è rimosso.

Prossimo: registro finding con risoluzioni motivate e fonti, poi persistenza/binding umano delle proposte. Modello incarico reale assente e nessuna generazione contratto. Nessuna AI reale, file personale, DB/servizio esistente, merge o deploy. Backend non modificato in questo incremento: non è stata ripetuta la sua regressione già conclusa.
