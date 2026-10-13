# Backend identity-v1 — stato per integrazione frontend

Codex ha implementato backend-v5 con il contratto identity-v1 congelato al checkpoint 101f053. Nessun cambiamento ai tipi o endpoint richiesti al frontend.

Codice: GET session; POST register/login/logout; GET/POST homes; GET homes/:homeId. Cookie opaco httpOnly, token sessione hashato in DB, CSRF+Origin, account/casa distinti, membership temporali, creazione idempotente e transazioni. API configurata 127.0.0.1:3001; frontend/proxy 127.0.0.1:5174.

Verificato: dipendenze autonome installate da cache con lockfile, Prisma client V5 generato, build, typecheck, ESLint e 14 test dominio superati. Sono test con repository DB simulati, crypto/validatori reali; non equivalgono al test API/PostgreSQL.

Runtime reale ancora da inizializzare: l'ambiente Codex nega TCP verso PostgreSQL locale (Permission denied 10013). Database/ruolo V5 e .env non sono ancora creati. Launcher esterno `outputs/Dimora-V5-Dev.ps1 -Initialize -Test` pronto per PowerShell normale: crea soltanto ruolo/database dedicati, applica migrazioni V5, avvia API e lancia 9 scenari di integrazione reali. Non usare API legacy come fallback.

Il launcher vive nel workspace del committente, non nel checkout frontend. Percorso:
`C:\Users\07704017\Documents\Codex\2026-10-13\referenced-chatgpt-conversation-this-is-an\outputs\Dimora-V5-Dev.ps1`

Aggiornamento dopo il lancio del committente: API v1 avviata e 9 scenari reali superati (10 test inclusa la suite contenitore). Il frontend Claude è stato integrato in Codex. Review v1.1: contesto account, codici errore stabili, logout scaduto e lunghezze Unicode. Build/lint passano; 17 test backend e 47 test frontend mock passano. Le nuove 11 prove API e 3 prove client/API richiedono riavvio con launcher `-Restart -Test -Frontend`. Il collaudo v1 non prova automaticamente la v1.1. Nessun main o database legacy modificato.
