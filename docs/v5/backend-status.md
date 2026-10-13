# Backend identity-v1 — stato per integrazione frontend

Codex ha implementato backend-v5 con il contratto identity-v1 congelato al checkpoint 101f053. Nessun cambiamento ai tipi o endpoint richiesti al frontend.

Codice: GET session; POST register/login/logout; GET/POST homes; GET homes/:homeId. Cookie opaco httpOnly, token sessione hashato in DB, CSRF+Origin, account/casa distinti, membership temporali, creazione idempotente e transazioni. API configurata 127.0.0.1:3001; frontend/proxy 127.0.0.1:5174.

Verificato: dipendenze autonome installate da cache con lockfile, Prisma client V5 generato, build, typecheck, ESLint e 14 test dominio superati. Sono test con repository DB simulati, crypto/validatori reali; non equivalgono al test API/PostgreSQL.

Runtime reale ancora da inizializzare: l'ambiente Codex nega TCP verso PostgreSQL locale (Permission denied 10013). Database/ruolo V5 e .env non sono ancora creati. Launcher esterno `outputs/Dimora-V5-Dev.ps1 -Initialize -Test` pronto per PowerShell normale: crea soltanto ruolo/database dedicati, applica migrazioni V5, avvia API e lancia 9 scenari di integrazione reali. Non usare API legacy come fallback.

Il launcher vive nel workspace del committente, non nel checkout frontend. Percorso:
`C:\Users\07704017\Documents\Codex\2026-10-13\referenced-chatgpt-conversation-this-is-an\outputs\Dimora-V5-Dev.ps1`

Aggiornamento dopo il lancio del committente: API v1 avviata e 9 scenari reali superati (10 test inclusa la suite contenitore). Il frontend Claude è stato integrato in Codex. Review v1.1: contesto account, codici errore stabili, logout scaduto e lunghezze Unicode. Build/lint passano; 17 test backend e 47 test frontend mock passano. Le nuove 11 prove API e 3 prove client/API richiedono riavvio con launcher `-Restart -Test -Frontend`. Il collaudo v1 non prova automaticamente la v1.1. Nessun main o database legacy modificato.

## Collaudo reale del 13 ottobre — aggiornamento finale
11 scenari API/PostgreSQL e 3 frontend/API superati nei log delle 16:22. Collaudo browser reale eseguito: due account, case persistenti, logout/login, URL altrui negato, mobile 320/390 e sezioni future esplicite. M1-UI-001: seconda casa salvata ma risposta 403 intermittente; assegnato validFrom con Date applicativo per evitare arrotondamento futuro del default DB. Regressione di dominio superata, 18 test backend e 47 frontend mock passano, build/lint passano. Nuovo scenario reale con dieci creazioni consecutive pronto, ancora da eseguire dopo riavvio API. M1 non chiusa. Evidenze: outputs/Dimora-V5-collaudo-prima-app-reale.md. Nessun main o database legacy alterato.

## Aggiornamento 17:38 e riverifica browser
Il riavvio del committente ha caricato la correzione: 12 scenari API/PostgreSQL superati (13 test includendo la suite), compreso dieci creazioni consecutive con accesso immediato. Codex ha poi ripetuto dal browser login A, Aggiungi una casa e conferma: ingresso immediato nella Casa regressione corretta, senza errore. M1-UI-001 chiusa. Evidenza: V5-reale-creazione-corretta.png; logout eseguito alla fine.
Il launcher si era fermato successivamente sulla porta 5174 gia occupata dal frontend registrato. Corretto per riusarlo se PID, percorso frontend registrato, proprietario della porta ed eseguibile Node corrispondono. Processi sconosciuti continuano a bloccare l'avvio, senza terminazioni. Sintassi PowerShell validata. Restano da rieseguire i 3 test frontend/API con il launcher corretto: il loro log attuale e ancora quello delle 16:22, precedente all'ultima correzione. Usare -Frontend senza un ulteriore -Restart. M1 resta aperta solo per questa ultima verifica di integrazione client e dell'avvio ripetibile.

## M1 chiusa — 13 ottobre 2026, 17:41
Launcher ripetuto con riuso del frontend: log frontend/API aggiornato alle 17:41:37, tutti i 3 test reali passano. Sono gia superati 12 scenari API/PostgreSQL (13 includendo la suite), 18 dominio, 47 mock frontend, build/lint e collaudo browser. La regressione della creazione casa e verificata nel DB e nell'interfaccia. M0/M1 chiuse per sviluppo locale; non equivale a prodotto pronto per utenti reali.
Prossimo incremento M2: Codex V5-DEV-004 API/storage/permessi; Claude V5-DEV-005 frontend Documenti. Contratto docs/v5/documents-api-contract.md fissato, endpoint ancora da implementare. Incarico operativo outputs/Dimora-V5-incarico-Claude-M2-documenti.md e patch sync M1/M2 pronta. Il checkout Claude non e stato modificato e Claude non e stato avviato da Codex.

## Backend M2 documenti — codice consegnato, runtime da attivare
Cinque endpoint documents-v1 implementati nel solo backend-v5; schema/migration autonomi e storage privato. Build/typecheck/lint e 31 test locali passano (DB/policy simulati, filesystem/ZIP reali). Pronti 11 scenari API documentali reali piu 12 identity; non ancora eseguiti. Launcher outputs/Dimora-V5-Dev.ps1 -Documents -Test applica soltanto migrazioni V5 dedicate e riavvia il PID registrato. Report outputs/Dimora-V5-backend-M2-documenti.md. Frontend Claude in sviluppo; nessuna dichiarazione M2 completa prima dell'integrazione reale.

## Ripresa dopo riavvio PC — integrazione frontend M2
Integrati sei commit Claude, da 8bf099e a 514a39d, senza riapplicare il sync 577d56c; corrispondenti commit Codex d3bc197, 696f5b4, 1144f55, 116e7fd, 1d0520c, ed48b0b. UI Documenti pronta, nessun file del checkout Claude modificato.
Review: fonte Caricamento manuale mantenuta; upload da Home edit confermato; 404 JSON di Nest gestito, non-JSON resta errore; ZIP fornisce sempre nome attachment documenti-dimora.zip; unità tecniche uniformate a MiB/KiB; Blob locale con gcTime 0 e URL revocati confermati, memoria da valutare prima del pilota; PDF mobile mantiene download visibile; account_context_changed pulisce bozze e cache. Privacy tra membri e revoca sono nella suite backend con fixture DB dedicate.
Correzione aggiuntiva: risposte HTML 200 non accettate come file/ZIP, Content-Type verificato. Build/lint passano; suite completa prima review 80/80, dopo modifiche 80/81 con sola asserzione MB→MiB da aggiornare; aggiornata e riverificate tutte le 34 prove documentali, 34/34. Nessuna nuova prova API/DB o browser reale dichiarata.
Accesso rete autorizzato nella sessione, Git fetch riuscito; restano limiti runtime/loopback e filesystem della sandbox Windows. PostgreSQL si è avviato e ha completato recovery, ma migrate deploy ha restituito Schema engine error senza conferma di applicazione. Servizi avviati per il tentativo Codex fermati; nessun processo sconosciuto terminato. Fonte autorevole dei test reali resta il log M1 delle 17:38 e client M1 delle 17:41, non prove M2.
Launcher ora supporta -Resume per il cluster dopo reboot. Il committente deve eseguire in PowerShell normale -Resume -Documents -Test -Frontend: poi Codex legge i nuovi log e corregge/riverifica. M2 resta aperta fino a API/PostgreSQL/file e browser reali. Nessun push/main o database legacy modificato.
