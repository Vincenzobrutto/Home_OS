# Backend identity-v1 — stato per integrazione frontend

Codex ha implementato backend-v5 con il contratto identity-v1 congelato al checkpoint 101f053. Nessun cambiamento ai tipi o endpoint richiesti al frontend.

Codice: GET session; POST register/login/logout; GET/POST homes; GET homes/:homeId. Cookie opaco httpOnly, token sessione hashato in DB, CSRF+Origin, account/casa distinti, membership temporali, creazione idempotente e transazioni. API configurata 127.0.0.1:3001; frontend/proxy 127.0.0.1:5174.

Verificato: dipendenze autonome installate da cache con lockfile, Prisma client V5 generato, build, typecheck, ESLint e 14 test dominio superati. Sono test con repository DB simulati, crypto/validatori reali; non equivalgono al test API/PostgreSQL.

Runtime reale ancora da inizializzare: l'ambiente Codex nega TCP verso PostgreSQL locale (Permission denied 10013). Database/ruolo V5 e .env non sono ancora creati. Launcher esterno `outputs/Dimora-V5-Dev.ps1 -Initialize -Test` pronto per PowerShell normale: crea soltanto ruolo/database dedicati, applica migrazioni V5, avvia API e lancia 9 scenari di integrazione reali. Non usare API legacy come fallback.

Il launcher vive nel workspace del committente, non nel checkout frontend. Percorso:
`C:\Users\07704017\Documents\Codex\2026-10-13\referenced-chatgpt-conversation-this-is-an\outputs\Dimora-V5-Dev.ps1`

Claude può continuare shell/client/form/test mock; la verifica integrata resta aperta fino all'avvio API e all'esito della suite reale. Non dichiarare il frontend integrato contro un server non ancora avviato. Nessun main, backend legacy o database reale è stato modificato.
