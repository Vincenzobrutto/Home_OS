# R03 — ciclo di salvataggio editor e presentazione intake

23 ottobre 2026, branch Fase 0; segue i lotti di compilazione/proiezione già pubblicati e il client R10 verificato. Nessuna nuova capacità AI o modifica delle regole documentali.

## Responsabilità separate

useOnboardingWrites possiede gli stati della scrittura e del salvataggio compilazione, la richiesta pendente, il controllo del componente montato e dell'account corrente, l'esito incerto e la gestione degli errori. Il container conserva query, consensi, selezione di bozza/job, routing e avvio/ripresa. Stessa chiave/corpo di richiesta e nessun nuovo invio dopo un esito incerto; stessi controlli prima di pausa/completamento e stessi reset espliciti.

IntakeWorkRow e IntakeBadges contengono la presentazione della riga e degli esiti, conservando nel padre selezione per versione, rimozione, revisione, richieste e recupero. Export StatusBadge compatibile. IntakeFileSelection contiene solo il pannello dei file scelti: upload, limiti, chiavi, consensi e ripresa rimangono in IntakeContent. Permessi, pulsanti, testo, markup e callback non cambiano.

## Verifiche

- Typecheck/lint e build produzione superati. Suite mock finale sul sorgente stabile: **860/860, 105 file, 509.88 secondi**, due worker e retry massimo 1 configurato, nessuna asserzione/timeout esistente modificato.
- Tre corpi spostati identici (riconoscimento del salvataggio, fail, write), dieci altri corpi dell'editor identici, inclusi conferme/ripresa/arricchimento/DraftEditor.
- Corpo della riga identico; markup/handler del pannello file identici salvo il nome dei due valori di permesso/disponibilità passati come booleani; entrambi i badge identici. Altri 16 corpi di funzioni intake/assistant identici, comprese preparazione, consensi automatici, upload/creazione/pool, conferma e ripresa.
- Nessun ciclo runtime nel grafo V5, con import type-only distinti. R06: quattro moduli storici ancora esclusi dal bundle, conservati deliberatamente.

Caratteri sorgente dei corpi (misura di distribuzione, non di velocità o codice eliminato):

| Container | Prima | Dopo |
| --- | ---: | ---: |
| DocumentIntakeAssistant.Inner | 33623 | 25588 |
| IntakeContainer | 32537 | 30874 |
| OnboardingPage.Container | 22219 | 19742 |

I container restano ampi: la separazione rende espliciti i confini scelti, non promette funzioni tutte piccole o debito azzerato. Il comportamento delle famiglie, degli importi/date e delle associazioni non cambia. Nessuna nuova misurazione dell'accuratezza AI né prova browser con salvataggi reali.

Il backend resta quello verificato nel lotto R05 (303 onboarding, 224 ordinari, 24 qualità, 17 guardie e 496 HTTP/DB sintetici). Nessuna AI/email, DB/API/storage reale, .env, gold, quote, legacy o collaudo dell'utente modificati. I cluster posseduti sono fermati e i log conservati.

Build finale: entry 486727 byte, gzip 148627; 55 source map esaminate e quattro componenti storici ancora assenti. La entry è inferiore ai 507.951 byte dell’audit iniziale (−4,18%), senza dedurre latenza, memoria o peso dell’intera applicazione.
