# Prova dal telefono sulla stessa Wi-Fi — 17 ottobre 2026

Richiesta esplicita del committente di provare l'app sul cellulare, collegato alla stessa Wi-Fi. Indirizzo rilevato PC: 192.168.1.66, interfaccia Wi-Fi. Ingresso `http://192.168.1.66:5175/case`, avviato e registrato da `outputs/Dimora-V5-Telefono.ps1` nel workspace. Login normale, cookie/sessione distinti dal browser del PC per hostname diverso. Usare Appartamento Roma per la prova personale, non la casa COLLAUDO V2.

Il frontend del PC sulla 5174 è riusato senza terminare il processo (il vecchio registro PID era obsoleto). Il nuovo Vite è vincolato al solo IP Wi-Fi e alla porta 5175, con proxy API sul backend loopback 3001. Backend e PostgreSQL rimangono esclusivamente su 127.0.0.1; nessuna apertura Internet, modifica firewall/profilo rete o .env. Le regole Node già presenti consentivano l'ingresso sul profilo attuale.

Il launcher riavvia soltanto l'API registrata con `DIMORA_LAN_ORIGIN` impostata nell'ambiente di quel processo: consente come origine di sessione soltanto l'esatto origin RFC1918 configurato, http/5175, ignorato in produzione. Non modifica la protezione CSRF: token e origine restano obbligatori; default loopback conservato. Configurazioni con dominio esterno, IP pubblico, pathname/query o altra porta rifiutate. Non rinomina FRONTEND_ORIGIN o i link email: recupero/verifica email continuano a usare la configurazione locale precedente.

Gli UUID/idempotency key usano crypto.getRandomValues come alternativa crittografica quando crypto.randomUUID non è disponibile su HTTP Wi-Fi; niente Math.random. Anche i manifest di upload passano da questo helper.

Prove: 19 test backend (dominio+origine LAN) e 10 frontend (UUID+intake integration) verdi, build TypeScript backend e controlli tipi/lint frontend/backend mirati. Connessione dall'interfaccia Wi-Fi: sessione anonima 200; login sintetico inesistente 401, non csrf_invalid. Nessuna credenziale personale inviata dal collaudo. Listener verificati 192.168.1.66:5175, 127.0.0.1:5174/3001/55432. Verifica dal telefono fisico ancora a cura del committente.

La disponibilità richiede PC acceso e processi attivi. Il normale riavvio API senza la variabile LAN torna al solo origin locale: rilanciare il launcher Telefono per riattivare questa modalità. Se l'IP Wi-Fi cambia, il launcher rifiuta di riusare processi registrati con indirizzo diverso; non termina processi estranei. Automazioni notturne restano PAUSED.
