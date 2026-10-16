# Recupero account concluso nel pilota locale

16 ottobre 2026. Consegna UX Claude c870cad raccolta come aa4f55d, arbitrata e applicata per il recupero/verifica. Codex ha realizzato schema, API, interfaccia e verifiche. Il committente ha configurato il proprio account Brevo gratuito e inserito la chiave soltanto nel file locale escluso da Git. Nessuna password del committente è stata letta o inserita dall'agente.

## Percorso reale concluso

1. Brevo inizialmente rifiutava le richieste API per un IP non autorizzato. Il committente ha autorizzato il singolo IP tramite le impostazioni Brevo, mantenendo attivo il blocco degli altri. Nessuna regola di sicurezza è stata disabilitata dall'agente.
2. GET senders ha restituito200 e mittente attivo; attivata la configurazione locale. L'indirizzo personale e la chiave non sono inclusi in questo rapporto o nei commit.
3. Il committente ha creato da sé un account separato del pilota, richiesto il link e confermato l'email sullo stesso PC. I metadati DB mostrano una challenge verifica accepted/consumed e un account pilota verificato.
4. Il committente ha richiesto recupero, ricevuto il link, scelto da sé una nuova password e dichiarato riuscito l'accesso con quella nuova. I metadati DB mostrano una challenge reset accepted/consumed. Le due consegne live sono state richieste dall'utente tramite UI, non avviate dai test.
5. Codex ha osservato nel browser il rientro autenticato in /case, pagina Inizia con Dimora senza case ancora create e senza banner email da verificare. Screenshot locale outputs/Dimora-V5-recovery-accesso-riuscito-20261016.png. Nessun documento personale caricato in questo percorso.

La conferma di ricezione/uso delle email e la digitazione delle password sono osservazioni del committente; lo stato finale della pagina e le scritture canoniche sono stati verificati da Codex. Il rifiuto della vecchia password e la revoca concorrente sono coperti nei test sintetici DB, non da un secondo tentativo live con la password reale precedente.

## Implementazione e prove

Contratto account-recovery-api-contract.md: token32byte, hash monouso, TTL30min reset/24ore verifica, neutralità, throttle persistente, reset transazionale e revoca sessioni. Nessun login automatico, nessun reset basato su email dichiarata soltanto. Reinviare non invalida i link precedenti; il primo reset riuscito li consuma tutti. Login e reset serializzati per evitare una sessione creata con password precedente dopo la modifica.

Migrazione20261016110000_auth_recovery applicata soltanto a dimora_v5_product_dev: due tabelle nuove, colonne Account additive. I precedenti account non sono bloccati retroattivamente. Il nuovo account richiede verifica prima degli upload; Casa, Attività e Spese restano disponibili. Link del pilota loopback: aprire sullo stesso PC. Nessuna esposizione Internet o modifica a Origin/CSRF.

- Backend40test offline domain/documents/mail verdi.
- Recovery11verifiche DB con mail intercettata, verdi, incluso limiter dopo nuova istanza, reset concorrente e gara login controllata.
- Identity/documents25regressioni HTTP reali verdi prima dell'attivazione live del canale.
- Frontend40test mirati auth/recovery/documents verdi; build/lint frontend e backend verdi. Prima build fallita per accesso opzionale nel test, corretto; nessuna nuova suite completa dichiarata.
- Entry finale492,38kB/gzip149,87; nuova sezione RecoveryPages caricata in chunk differito. Nessuna libreria mail aggiunta.

## Backup dopo la migrazione e il collaudo

Nuova copia backups/dimora-v5-20261016T083531Z: database V5 e262originali, snapshot coerente durante copia; ripristino isolato verificato,43tabelle con conteggi uguali,262riferimenti originali con SHA/dimensione identici. Cluster55439 fermato al termine, API non collegata al restore. Log outputs/Dimora-V5-backup-post-recovery-20261016.log. Le copie precedenti sono preservate.

Questo backup aggiorna lo snapshot precedente alla migrazione e include i nuovi metadati/account; non copia recovery-mail.local.json o .env. Conservazione ancora sullo stesso PC: resta da scegliere la seconda destinazione. Nessuna dichiarazione di protezione da perdita fisica del PC.

## Limiti e prossimi passi

Recupero e verifica conclusi per il pilota locale. Nessuna nuova chiamata Anthropic o modifica a suoi flag/budget, main, legacy o push. API V5 registrata riavviata da Codex, PostgreSQL e frontend preservati. Configurazione email ricaricata a ogni richiesta, nessun riavvio necessario per chiave/mittente/enabled.

Il dispatch email è inprocess: crash prima dell'invio può richiedere nuova richiesta esplicita; nessuna outbox con token in chiaro né retry automatico su consegna incerta. Per un servizio pubblico serviranno URL HTTPS pubblico, configurazione mittente/dominio coerente e revisione operativa: la prova locale non certifica un deploy.

Fase0 ancora aperta per controllo applicativo dei file/antimalware, export strutturato e retention, seconda destinazione backup e qualità AI rappresentativa. UX06…08 di Claude conservati per le rifiniture documentali; eliminazione non introdotta. Guida rinviata e BL-04 non avviata. Non interpretare il completamento del recupero come via libera al caricamento di molti documenti personali.
