# Dimora V5 API — backend locale Home

Stato consolidato14ottobre: H3a integrata anche con frontend e browser reali,19 client/API non-live verdi. Il report docs/v5/h3-integration-review.md prevale sulle consegne storiche sotto; H3b, export del ciclo di vita e Admin restano successivi. Nessuna nuova chiamata Anthropic.

API nuova NestJS/Prisma/PostgreSQL, senza import dell'AppModule o automatismi legacy. Implementati identity, documenti, analisi/conferme caldaia, attività, ricerca documenti e backend spese H3a. Agenzie e Amministratori seguono separatamente. Le sezioni iniziali riportano consegne storiche: lo stato corrente delle verticali è nei report docs/v5/*-integration-review.md.

Contratto: `../docs/v5/api-contract.md`. Host 127.0.0.1:3001, prefisso /api/v5; Origin atteso 127.0.0.1:5174 via proxy Vite. Database accettato dal codice: soltanto ruolo dimora_v5_app e dimora_v5_product_dev su 127.0.0.1/localhost:55432. Nessuna migrazione automatica al bootstrap.

```powershell
npm ci --ignore-scripts
npm run db:generate
npm run db:deploy
npm run build
npm run lint
npm test
npm start
npm run test:integration
```

Configurare .env dalla .env.example con password locale dedicata; non committarla. Il launcher esterno outputs/Dimora-V5-Dev.ps1 prepara ruolo/database, migrazioni e avvio su questo workspace Windows. Le credenziali superuser del vecchio launcher servono soltanto per creare il database/ruolo dedicati; il servizio usa poi il ruolo non privilegiato V5.

Test dominio: repository/session store simulati, crypto e validatori reali; non prove di DB/API. Test integrazione: HTTP + Prisma + DB V5 reali, due account sintetici e revoche; richiede server avviato e lascia i dati sintetici identificabili nel database di sviluppo. Non usare su altri database. Il guard del database blocca nomi/host/ruoli diversi.

Limiti: account locali di sviluppo, nessuna verifica email/reset password ancora; rate limit in memoria e cleanup delle pre-sessioni da completare prima del pilota. I cookie conservano solo token opachi, il DB conserva hash dei token. Non esportare endpoint legacy di impostazione password o backfill owner. Il servizio non è pronto per esposizione pubblica.

## Backend M2 documenti — codice consegnato, runtime da attivare
Cinque endpoint documents-v1 implementati nel solo backend-v5; schema/migration autonomi e storage privato. Build/typecheck/lint e 31 test locali passano (DB/policy simulati, filesystem/ZIP reali). Pronti 11 scenari API documentali reali piu 12 identity; non ancora eseguiti. Launcher outputs/Dimora-V5-Dev.ps1 -Documents -Test applica soltanto migrazioni V5 dedicate e riavvia il PID registrato. Report outputs/Dimora-V5-backend-M2-documenti.md. Frontend Claude in sviluppo; nessuna dichiarazione M2 completa prima dell'integrazione reale.

## Backend M3 — codice pronto, collaudo reale aperto
Implementati i 12 endpoint review-v1, cinque nuove tabelle con migration additiva e worker con lease/token persistenti, timeout e pubblicazione atomica. Schede private del creatore; fonte/hash M2 verificati. Conferme per campo, potenze semanticamente distinte, sostituzione esplicita, versioni/idempotenza, compilazione manuale e storico. Provider solo test_fixture_v1, nessuna AI reale. Build/lint e 52 test locali superati (33 precedenti, 19 M3); 19 scenari M3 API/PostgreSQL preparati ma NON eseguiti. migrate status nella sandbox restituisce Schema engine error: nessuna applicazione della migration dichiarata. Client generato temporaneamente fuori dalla DLL in uso; launcher lo rigenera correttamente prima dell'attivazione.
Il committente puo eseguire outputs/Dimora-V5-Dev.ps1 -Review -Test in PowerShell normale. Migra soltanto dimora_v5_product_dev su 55432 e riavvia solo il PID API registrato, senza reset. Claude frontend ancora in sviluppo; M3 non chiusa.

## M4 consolidata in locale — 13 ottobre 2026
Questo stato supera le fotografie M2/M3 iniziali sopra: API, DB e frontend sono integrati. Anthropic Sonnet 5.5, PDF testuali con estratti verificati sulla pagina, consenso esplicito e ledger persistente. Build/lint passano; 67 test offline, 45 API/DB, 4 ledger concorrente. Scansioni/OCR non supportati. Sei chiamate live: 0.041714 USD, saldo 9.958286, zero incerti. Il limite delle sei chiamate iniziali ora blocca nuovi invii senza azzerare il saldo; i risultati restano consultabili e confermabili. Non eseguire automaticamente test live. Dettagli e comandi in docs/v5/anthropic-api-contract.md e docs/v5/m4-integration-review.md.

## H1 — backend attività personali verificato, frontend in integrazione
Dieci endpoint activities-v1 e migrazione 202610130005_activities applicati al DB locale dedicato. Promemoria privati, data calendario scelta dall'utente, completa/annulla/riapri e storia; caldaia facoltativa, nessun campo tecnico o costo AI modificato. Build/lint, 71 test offline e 61 test integrazione (regressioni comprese) passano. La suite HTTP H1 avvia un harness Nest reale su porta effimera senza worker AI; con V5_ACTIVITIES_API=1 verifica invece il processo API registrato su 3001 (cinque prove passate dopo riavvio). `npm run test:activities-db` verifica le sole nuove regole con database dedicato. Questi test rimuovono soltanto i propri nuovi record sintetici. Contratto docs/v5/activities-api-contract.md; frontend/browser ancora aperti.

Aggiornamento 14 ottobre: frontend H1 integrato, 152 test mock/fixture, 15 client/API reali e browser 320/390/desktop/tastiera/reload/login superati. H1 chiusa per sviluppo locale. Resoconto docs/v5/h1-integration-review.md; nessuna nuova chiamata Anthropic.

## H2 e H3a — stato 14 ottobre
H2 document-search-v1 integrata e verificata; ulteriori fix privacy della sessione/cache passano con 41 test mirati. H3a expenses-v1: nove endpoint attivi su 3001 e migrazione additiva applicata al solo DB dedicato, 77 offline/89 integrazione e cinque HTTP sul processo reale verdi. `npm run test:expenses-db` esegue le nuove prove DB/HTTP senza provider AI; V5_EXPENSES_API=1 fa usare alla suite HTTP il processo 3001 invece del harness. Personali al creatore, centesimi EUR, totali annui, archive/restore e storia, riferimenti redatti e chiavi idempotenti persistenti. Frontend H3 Claude in lavorazione: H3 non ancora chiusa. Nessun consumo Anthropic aggiuntivo.
