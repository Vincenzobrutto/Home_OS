# Bozza di compilazione esplicita — 21 ottobre 2026

## Comportamento approvato e implementato

Nel modulo unico Documenti, **Salva bozza ed esci** conserva anche input incompleti e torna all’elenco soltanto dopo la risposta del server. Il documento resta Da fare; **Riprendi compilazione** riapre la stessa bozza, senza creare altri percorsi o avviare AI.

Conservati titolo/tipo (anche vuoti), scelta solo documento, modifiche a oggetti e relativi costi, contatti incompleti, importi grezzi, fornitore/categoria, emissione/scadenza, periodo bolletta e alternative mese/intervallo. Le scelte relative al documento già presente sono conservate; il consenso a inviare ad Anthropic resta distinto e non viene ripristinato.

Nessun autosalvataggio. Menu, cambio documento, Indietro e chiusura mantengono l’avviso sulle modifiche non salvate. Il salvataggio esplicito riuscito disattiva l’avviso solo per il ritorno all’elenco, senza avanzare al documento successivo.

## Persistenza e vincoli

Riutilizzato POST `/homes/:homeId/object-onboarding/drafts/:id/review`, con versione attesa e chiave idempotente. `review.forms` resta filtrato per gli oggetti leggibili; `review.compilation` contiene input del modulo, senza decisioni canoniche. Parser strutturale e limite preesistente di 100.000 caratteri del review; validazione economica completa solo alla conferma. Nessuna migrazione.

Capabilities espone soltanto `drafts[].hasSavedCompilation`, senza riversare i valori privati del review nell’elenco. Ricerca vincolata ad account/casa/documento/versione/SHA. La priorità della bozza salvata non riabilita analisi AI già riuscite.

Il percorso non richiama confirmations, organizzazione definitiva, creazione di spese/oggetti/contatti o jobs AI. Il server verifica fonte, accesso, stato aperto e versione. Con errore il modulo mantiene i valori. Con esito incerto i campi sono bloccati e il recupero usa payload e chiave originali; solo il recupero riuscito torna all’elenco. Corretto il vecchio ripristino URL che altrimenti riapriva il modulo dopo il recupero.

## Verifiche

Test frontend con API simulate: salvataggio/riapertura dei campi incompleti, costi, oggetti e contatti; documento solo; titolo/tipo vuoti; mese/intervallo; errore prima del salvataggio e risposta persa; nessuna conferma o analisi; ritorno e avvisi esistenti. Test backend offline: review reale del servizio con transazione simulata, replay idempotente, versione/fonte non valide, parser, protezione delle analisi riuscite.

Browser con componenti di produzione e API isolate: desktop 1440×1000 e mobile 390×844; bozza incompleta, Riprendi compilazione, refresh, Compila/Originale, errore e recupero con ritorno all’elenco. Il solo harness usa sessionStorage per simulare un server persistente; l’app salva sul backend, senza copie private in localStorage/sessionStorage. Nessuna scrittura ai dati reali o chiamata AI. Screenshot nel workspace `outputs/compilation-draft-20261021/`.

75 test frontend mirati e 9 test backend offline superati. Build frontend/backend e lint verificati. Avviso Vite preesistente sul bundle principale oltre 500 kB. API locale V5 riavviata con il backend compilato.

## Limiti

Il salvataggio richiede connessione e rimane manuale. La nuova funzione riguarda il modulo unico Documenti: non modifica gli altri flussi di bozze (planimetrie, ricevute e moduli storici). Le modifiche non salvate prima di una nuova precompilazione AI continuano a essere separate dalla nuova proposta. Nessun collaudo DB reale eseguito per evitare scritture ai dati personali.

Il successivo [intervento su errore e recupero](ux-recovery-fixes-20261021.md) rende avviso e azione sempre visibili e gestisce il focus dopo un fallimento.
