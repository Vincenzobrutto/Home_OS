# Dimora V5 API — identity-v1

API nuova NestJS/Prisma/PostgreSQL, senza import dell'AppModule o automatismi legacy. Prima verticale: sessione/CSRF, register/login/logout, elenco/creazione/dettaglio Home, membership temporali e idempotenza. Nessun endpoint documenti, agenzia o amministratore ancora implementato.

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

