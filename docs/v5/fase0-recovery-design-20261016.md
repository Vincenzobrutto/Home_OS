# Recupero account per il pilota Home

Proposta tecnica del 16 ottobre 2026. Stato: da congelare dopo confronto UX e scelta del canale di consegna. Non aggiunge endpoint, schema o capacità al runtime. Il prodotto attuale offre sessione, registrazione, login e logout; non verifica la disponibilità dell'email e non permette recupero password.

## Comportamento proposto

Recupero tramite prova di accesso alla casella email registrata, separato dal consenso al riepilogo BL-08. Preferito ai codici di recupero come unico meccanismo perché l'utente medio rischia di perderli insieme alla password. Il servizio email, i costi e il trattamento dei dati richiedono scelta prima dell'attivazione: nessun fornitore scelto né invio autorizzato da questo documento.

Per il nuovo pilota, verificare il recapito prima di consentire caricamenti personali. L'account può essere creato senza accesso ai documenti; richiesta e conferma di verifica devono poter ripartire senza creare account doppi. Account sintetici esistenti restano tali, senza backfill di emailVerifiedAt inventato. L'estensione di questo requisito a tutti gli account esistenti richiede transizione esplicita e capability, evitando lockout silenziosi.

Recuperare l'account non prova la titolarità dell'immobile, non ripristina membership revocate e non trasferisce risorse fra account. Non si recupera cambiando email tramite una richiesta anonima. Se si perde anche l'accesso alla casella, nessun reset amministrativo basato sul solo nome/email; procedura assistita fuori da questo incremento.

## Contratto REST proposto

Prefisso /api/v5. Nomi e codici provvisori, nessun client deve usarli prima del congelamento.

| Operazione | Input | Esito |
|---|---|---|
| POST auth/password-recovery | email | 202 neutro: «Se il recapito è associato a un account, riceverai le istruzioni» |
| POST auth/password-recovery/complete | token, password | 204; poi accesso normale |
| POST auth/email-verification | nessun recapito arbitrario; sessione autenticata | 202 neutro |
| POST auth/email-verification/complete | token | 204 senza nuova sessione autenticata |

Sessione anonima e controllo CSRF/Origin esistenti necessari per recovery; sessione autenticata e contesto account per richiesta di verifica. DTO validati, password conforme alle regole di registrazione esistenti. Token scaduto, usato, revocato o inesistente: stesso errore recovery_invalid, nessun account/email nella risposta. Per abuso: 429 con attesa generica. Un guasto globale al canale produce indisponibilità uniforme, senza distinguere email registrate. Errori di consegna puntuali non devono rivelare esistenza o stato dell'account.

## Persistenza e concorrenza

Challenge con scopo distinto verify_email/reset_password, accountId, digest del token casuale da almeno 32 byte, expiresAt, consumedAt e generazione. Token originale solo nella consegna, mai in DB, log, URL di analytics, report o localStorage. Proposta TTL reset 30 minuti e verifica 24 ore, da allineare alla UX. Non riusare codici C1.

Completamento: transazione con consumo condizionale one-use, controllo scopo/scadenza/generazione, aggiornamento hash password e revoca di tutte le sessioni dell'account e delle altre challenge reset. Due conferme concorrenti: un solo successo. Il token di verifica non cambia password. Il reset può attestare accesso al recapito corrente solo se la challenge è vincolata allo stesso recapito/versione; un cambio futuro di email invalida tutte le challenge precedenti.

Limitazione durevole e atomica per IP e recapito normalizzato con digest protetto; proposta iniziale 3 richieste/15 minuti per recapito e 20/IP, risposta neutra sul limite del recapito, 429 solo sul limite IP. Richiesta soppressa non invalida il link già inviato. Conservazione e pulizia limitatori/challenge scadute esplicite; non affidarsi soltanto alla Map in memoria del login attuale. Non introdurre nuova normalizzazione email incompatibile con gli account presenti.

Link da base URL configurata e allowlist, mai dall'Host della richiesta o da returnUrl arbitrario. Token nel frammento della pagina, rimosso dalla barra prima di richieste secondarie; nessuna risorsa di terzi nella pagina di reset. Apertura GET non consuma il token: scanner email non devono invalidarlo. Consumo soltanto al POST esplicito. In produzione serve HTTPS; loopback resta un ambiente locale, senza modifiche a firewall o sicurezza Windows.

Consegna transazionale: outbox/idempotenza per retry e invio una volta per challenge; eventuale payload con token deve essere protetto e rimosso dopo invio/scadenza, non conservato in chiaro come log permanente. Adapter di test locale intercettato e spento nel runtime normale. Nessun endpoint che restituisca token all'utente anonimo e nessuna email reale nei test.

## Gate prima dell'attivazione

Test offline con orologio controllato e canale finto; DB dedicato per one-use concorrente, rollback, revoca sessioni e rate limit dopo riavvio; HTTP per CSRF, neutralità, assenza dati nei messaggi; browser per link scaduto, password errata e doppio invio. Verifica recapito e reset completo con canale reale soltanto dopo scelta e autorizzazione del servizio. Migrazione additiva, vecchi login compatibili finché la transizione non è approvata. Nessuna modifica alle credenziali attuali come effetto collaterale della progettazione.
