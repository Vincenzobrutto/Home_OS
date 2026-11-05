# Gift al primo accesso — 4 novembre 2026

Chi ha già un account può accedere normalmente dal link Gift. Chi entra per la prima volta chiede la conferma all'indirizzo indicato dall'agenzia, apre il link ricevuto e sceglie la password nel modulo con l'email precompilata. Il nome iniziale dell'account è «Proprietario». La casa si crea dopo l'accettazione esplicita della Gift.

Il server controlla prima l'invito e usa il recapito del pacchetto, poi verifica il possesso della casella prima di creare le credenziali. Il link consegnato dall'agenzia da solo non espone il recapito completo e non permette di registrare un account per il destinatario. Chi dispone soltanto del link originale può richiedere la conferma, soggetta ai limiti di invio. Il link di conferma resta legato all'invito corrente e scade. I frammenti con credenziali vengono rimossi dall'indirizzo dell'app e tenuti solo in memoria.

I tre POST sotto `/api/v5/gift-invitations/:id` sono `registration-email` per la richiesta neutra, `registration-context` per il recapito con prova della casella e `register` per la creazione dell'account. Richiedono la sessione ospite con Origin e CSRF. Il server ricontrolla l'invito sotto lock prima di creare account e sessione. L'indirizzo proviene dal pacchetto Gift. La scelta della password non modifica un account già esistente.

## Planimetria nel passaggio da Agenzia a Home

La selezione del PDF di planimetria trasferisce il documento originale. Se esiste anche una mappa digitale revisionata e corrispondente alla versione del file, l'agente può includerla esplicitamente. L'anteprima del destinatario indica quando è inclusa. All'accettazione, Dimora pubblica i vani e la mappa della copia nella casa del destinatario. Quando si consegna il solo PDF, il proprietario lo trova in Documenti. Il caricamento del PDF nel fascicolo non genera la mappa.

## Collaudo e stato

Backend mirato 35/35, frontend mirato 22/22 e suite Gift DB/HTTP 132/132 sul nuovo cluster isolato, arrestato a fine prova. TypeScript, lint mirato e build frontend riusciti. L'email di prima registrazione è stata verificata con un trasporto simulato. Nessuna migrazione richiesta.

Candidato locale. Al controllo del 4 novembre il frontend, l'API e PostgreSQL del runtime personale erano fermi. Per installare il candidato serve un nuovo avvio con le identità dei processi e degli artefatti aggiornate e il trasporto limitato anche al messaggio di prima registrazione Gift. Il profilo precedente copre solo l'email di verifica ordinaria. Nessun invio reale eseguito per questo collaudo.
