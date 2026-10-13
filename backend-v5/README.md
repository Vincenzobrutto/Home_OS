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
