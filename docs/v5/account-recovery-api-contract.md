# Recupero account e verifica email

Contratto Fase 0 congelato il 16 ottobre 2026 dopo arbitrato della consegna Claude c870cad. Implementazione locale e invio Brevo attivati e collaudati con il committente; esito in account-recovery-esito-20261016.md. Non cambia i permessi delle Home, C1 o la gestione dei documenti dopo la vendita.

## API e stato della sessione

Prefisso /api/v5, JSON; Origin e X-CSRF-Token sempre richiesti sui POST, anche dalla sessione anonima creata da GET /session. Per richiesta verifica autenticata, X-Account-Context deve corrispondere all'account corrente. Nessun token autenticante o email nell'URL API.

| Operazione | Input | Successo |
|---|---|---|
| POST auth/password-recovery | email normalizzata come registrazione | 202 identico per account noto, ignoto o limite email: «Se il recapito è associato a un account, riceverai le istruzioni.» |
| POST auth/password-recovery/complete | token, password 12–128 code point, spazi conservati | 204, nessun login automatico, cookie rimosso e sessioni dell'account revocate |
| POST auth/email-verification | Oggetto vuoto, sessione autenticata | 202, nessuna email arbitraria accettata nel body |
| POST auth/email-verification/complete | token | 204, recapito confermato senza nuova sessione |

GET /session aggiunge authRecovery.enabled; account aggiunge emailVerifiedAt nullable e requiresEmailVerification boolean. Nessun flag retroattivo: colonne nuove nullable/defaultfalse. Un account creato quando il canale è abilitato richiede verifica prima degli upload; Casa, Attività e Spese restano accessibili. I precedenti account mantengono le funzioni attuali e possono richiedere verifica volontaria. Nessun badge verificato senza timestamp server.

Quando configurazione assente/disabilitata/non valida: 503 recovery_unavailable uniforme, nessuna challenge e nessun invio. Significa indisponibilità del recupero, non dell'intera app. Configurazione valida non è prova che una mail sia consegnata: 202 rimane neutro anche per guasto di consegna puntuale.

## Challenge e protezioni

Token casuale32byte base64url, nel DB soltanto SHA256. Scopi distinti, reset30minuti e verifica24ore. La challenge è vincolata all'account e all'impronta del suo indirizzo attuale. Il link frontend usa il frammento, rimosso dall'URL prima dell'interazione; token solo nella memoria del componente, mai in localStorage, query cache o analytics. Ricaricare dopo la rimozione richiede riaprire il link dall'email.

GET della pagina non consuma il token. Al POST: controllo scopo, scadenza, impronta e consumedAt sotto lock dell'account; consumo condizionale e modifica in una transazione. Reset riuscito conferma anche accesso alla casella attuale, cambia hash password, revoca tutte le sessioni e consuma tutti gli altri reset inutilizzati. Verifica non cambia password. Ripetizione/concorrenza: un solo successo. Login serializzato sul medesimo lock, con confronto dell'hash verificato prima di creare la sessione: password precedente non può creare una sessione dopo il reset.

Il reinvio non invalida i link precedenti. Correzione a UX-02: l'ordine di arrivo delle email non prova l'ordine delle richieste; non dire «usa quello arrivato per ultimo». Primo reset riuscito invalida tutti i reset, non il semplice invio. Nessuna sessione corrente può eseguire reset password senza logout esplicito. Verifica da sessione di account diverso negata; il frontend propone uscita esplicita per tutti i link aperti mentre si è connessi, senza nominare l'account della challenge.

Rate limit persistente:20 richieste per IP/scopo/operazione su finestre fisse15minuti, poi429 recovery_rate_limited;3 richieste per email/scopo/15minuti, poi202 neutro e nessuna nuova challenge. Chiavi HMAC con segreto locale dedicato, nessun indirizzo/IP in chiaro nel limitatore. Errori token non valido/scaduto/usato/scopo errato:422 recovery_invalid uniforme; password o altri DTO invalidi:422 con fieldErrors;409 recovery_logout_required;403 per CSRF;401 per richiesta di verifica non autenticata. Account non verificato che carica documenti:403 email_verification_required prima dell'IO.

Metadati challenge scaduti da7giorni e finestre throttle scadute da1giorno vengono rimossi durante nuove richieste; non è una cancellazione di dati personali del prodotto. Nessun indirizzo modificabile, recupero assistito, reset amministrativo o prova di proprietà in questo incremento.

## Invio e configurazione

backend-v5/recovery-mail.local.json, escluso da Git e separato da .env e chiavi AI. Esempio tracciato recovery-mail.example.json e helper outputs/Dimora-V5-configura-Brevo.ps1: non sovrascrive un file esistente, inizializza disabled e segreto throttle casuale. Lettura a ogni richiesta: non serve riavviare per modificare il mittente o abilitare/disabilitare il canale. Non incollare il file in chat o report.

Brevo POST /v3/smtp/email; testo e HTML locali, un solo destinatario, nessun documento allegato, nessun body errore del provider nei log. Base URL configurata, nessun Host/returnUrl dal client. HTTPS normalmente; collaudo esplicito soltanto http://127.0.0.1:5174 o localhost5174: il link locale va aperto sul medesimo PC. Non espone il PC su Internet. Verificare mittente, account, impostazioni tracking e autorizzazione IP Brevo prima dell'attivazione; nessun controllo di sicurezza viene disabilitato dal codice.

Scelta di consegna minima: challenge e stato queued persistono, token solo in memoria; dispatch differito nel processo, stato accepted/rejected/uncertain aggiornato senza contenuto email o token. Non esiste outbox cifrata né worker di retry. Se il processo termina prima dell'invio, il link non arriva: l'utente può richiedere esplicitamente un altro link. Dopo timeout/5xx nessun retry automatico o promessa di invio. Questo sostituisce l'outbox ipotizzata nel design iniziale, evitando token persistenti in chiaro; consegna garantita e riconciliazione avanzata restano fuori incremento. Accepted non prova consegna o lettura.

## Arbitrato delle otto raccomandazioni Claude

UX-01…05 recepite per recupero/verifica: ingressi, neutralità, revoca esplicita, link unico invalido, assenza di lockout retroattivo. Precisazioni: nuova richiesta non invalida il vecchio link; registrazione non promette invio automatico, l'account richiede il link dal banner; guasto puntuale non produce risposta diversa per email nota. UX-06…08 valide ma conservate come rifiniture del pilota documentale: eliminazione assente dichiarata, limiti foto/HEIC/scansioni ed export selettivo. Nessuna eliminazione introdotta. Guida sovrapposta rinviata.

## Prove e limiti

Consegna UX raccolta aa4f55d, mockup fonte di proposta e osservazioni di Claude, non prova delle nuove API. Backend40test offline verdi (domain/documents/mail),11verifiche su DB dedicato con trasporto mail intercettato,25regressioni HTTP reali identity/documents. Frontend40test mirati mock (auth/recovery/documents), build/lint verdi dopo correzione di un accesso opzionale nel test. Nessuna nuova suite completa dichiarata.

Test DB coprono neutralità, CSRF, limitatore dopo nuova istanza servizio, upload prima verifica, scadenza/scopo, one-use, reset concorrente e revoca; gara login/password riprodotta con interleaving controllato su DB reale. La consegna email è finta in questi test. Browser reale: pagina nuova, blocco con sessione attiva ed errore a canale non configurato. Nel collaudo live il committente ha eseguito registrazione, verifica email, richiesta reset e cambio password, poi confermato il login con la nuova. L'agente non ha inserito o letto le password, osserva il rientro in /case; metadati DB confermano challenge verifica/reset accepted e consumate. Nessun invio live dai test automatici.
