# Percorso demo guidato parallelo — 24 ottobre 2026

## Esito

Creato prototypes/dimora-guided, un sito autonomo con introduzione e 12 passi, una sola azione principale e cambio automatico del profilo. Agenzia: revisione fascicolo, selezione Home Gift e manifesto; Home: accettazione e memoria ricevuta; Amministratore: collegamento unità e pubblicazione comune; Home: scelta del promemoria e segnalazione; Amministratore: risposta; Home: risultato e traccia dei trasferimenti. Il riepilogo permette di rileggere i momenti già completati senza duplicare gli effetti.

Le informazioni trasferite restano selezionate, con fonte e versione. Memoria privata e comune distinte. Le proposte diventano attività solo dopo conferma. Dati e persone fittizi, nessuna email o chiamata AI/API/DB reale. È una dimostrazione della visione di prodotto, non nuova funzionalità del runtime V5. Tutti i file della demo libera restano invariati, sito precedente a 1c1e488162ef1a1870cf1ef98dd77155051cccbb.

## Verificato

- Node: 12/12 test su selezioni, fonte asset, conferme, accettazione, idempotenza, collegamento, separazione comune/privato, proposta differita/confermata, richiesta/risposta e reset.
- Browser locale: intero percorso Agenzia → Home → Amministratore → Home; blocco senza conferma; risultato con 2 documenti, un aggiornamento comune, promemoria e risposta sulla stessa richiesta; reset con dialogo.
- Screenshot desktop del risultato e smartphone 390×844; nessun overflow orizzontale (clientWidth=scrollWidth=375), azione principale disponibile nella barra mobile. Viewport ripristinato.
- Pubblicazione privata Sites succeeded: https://dimora-percorso-guidato.vincenzo-b.chatgpt.site . Source SHA 49d730852ddafc233917035d8939417619ee5687, progetto appgprj_6add093868488191b0d0ec2ec2d7f51b, deployment appgdep_6add0a96950c819184c028d3a9d2ce5b.
- Verifica URL online: raggiunta la protezione di accesso ChatGPT; sessione browser non autenticata. Il contenuto distribuito non è stato verificato oltre il gate. Nessun cambio di audience effettuato.

## Continuità

PR #25 verso il consolidamento; merge al committente. La demo libera e il runtime V5 non sono stati modificati. Prossimo passo: revisione del percorso da parte del committente autenticato; eventuali condivisioni esterne richiedono scelta esplicita dell’audience. Nessuna funzionalità reale aggiunta.
