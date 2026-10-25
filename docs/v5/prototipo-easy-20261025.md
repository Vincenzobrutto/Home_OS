# Demo easy a tre azioni — 25 ottobre 2026

## Esito

La demo libera ora presenta tre azioni principali per profilo. Home: Conosci la tua casa, Prenditene cura, Condividi ciò che serve. Agenzia: Raccogli la memoria, Presenta la casa, Consegna la Home Gift. Amministratore: Conosci l’edificio, Aggiorna i proprietari, Segui le richieste.

Ogni azione apre pochi esempi e accessi alle funzioni complete. Le pagine iniziali spiegano la promessa del profilo e i benefici di tutti e tre. Le 31 viste complete restano disponibili in Tutte le funzioni; la casa popolata con 15 impianti e un elettrodomestico rimane invariata. La Gift continua a predisporre una casa vuota nascosta e, dopo accettazione, ad aggiungerla a Le mie case con soli documenti e schede scelti. Nessun dato reale o chiamata AI/API/DB. Corretto il contesto Partner quando si cambia profilo dal selettore dopo aver aperto una casa Gift.

## Verifiche

21/21 test con easy.js incluso nelle regressioni Partner; rendering 31 viste e invarianti della Gift conservati. Browser locale: tre azioni Home, tre Agenzia e tre Amministratore; Gift preparata dalla nuova azione e accettata, nuova casa nel selettore; screenshot desktop e smartphone 390×844, clientWidth=scrollWidth=375. Nessun telefono fisico o collaudo esaustivo delle combinazioni. Pagina Casa verificata online: tre azioni e benefici dei tre profili presenti. Pubblicazione privata riuscita a f2e4c4eb04c0571fb0f036ac38396847a03c2a85, versione appgprj_6adcf5762fd88191935659f0cb2d6e2a~appgver_6645c580eed881918c67fedc3ae98f73, deployment appgdep_6adda92c86e08191896a2079fa33d42a. Primo tentativo fallito Unauthorized; dopo verifica owner-only, ripubblicata la stessa versione con successo, senza cambiare audience.

Branch aggiornato con merge del consolidamento remoto; conflitti documentali riconciliati conservando le voci prototipo e lo stato OCR/bollette più recente. Nessun cambiamento autonomo al runtime V5.

## Link e continuità

- Demo libera: https://dimora-esperienza-demo.vincenzo-b.chatgpt.site/#home/Casa
- Demo guidata invariata: https://dimora-percorso-guidato.vincenzo-b.chatgpt.site

Preferenza del committente: restituire sempre entrambi i link. PR #25 verso consolidamento, merge al committente. Prossimo passo: revisione del livello di semplicità e dei benefici da parte del committente.
