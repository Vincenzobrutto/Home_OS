# Dimora — prototipo promozionale

Demo statica separata dalle applicazioni reali, basata sul consolidamento `2ab7570` del 24 ottobre 2026 e sul catalogo `prototypes/dimora-v4/MASTER_FUNCTIONAL_CATALOG_v0.3_20261013.md`.

Aprire `dist/index.html` oppure servire la cartella `dist/` con un server statico. Nessuna installazione, API, database, login o variabile d'ambiente necessaria. Il font Google è opzionale; il fallback è locale.

## Esperienza

- Ingresso promozionale con illustrazione SVG originale, benefici e tre profili.
- Home: documenti con ricerca e filtri, acquisizione dimostrativa (fattura, bolletta, foto, planimetria), revisione, oggetti e stanze, garanzia manuale, contatti, attività, spese/scenari, storico, condominio, condivisione, Free/Pro, preferenze ed export JSON dimostrativo.
- Agenzia: portafoglio, fascicoli, checklist, ricezione simulata, richiesta documenti in anteprima, dossier, manifesto Home Gift, team, import e co-branding.
- Amministratore: portafoglio, edifici, impianti/fonti, scadenze, scenario budget, pubblicazione selettiva, segnalazioni, unità/inviti/cambio proprietario, team e import.
- Percorso guidato per profilo e navigazione libera; 27 viste, URL con hash, ritorno alla presentazione e azzeramento demo.

## Confini

Solo dati fittizi. Stato in memoria, perso al refresh. Le azioni illustrano il comportamento: nessun documento personale caricato, AI live, invio, pagamento, certificazione, trasferimento o controllo accessi reale. I dettagli di team, branding, preferenze e integrazioni sono anteprime, non servizi implementati; prezzi e quote non inventati. Non è una replica completa delle regole applicative V5 né un impegno di disponibilità commerciale. Le pratiche e gli edifici usano esempi condivisi, non dataset separati per immobile.

## Pubblicazione e continuità

Demo privata: https://dimora-esperienza-demo.vincenzo-b.chatgpt.site

Il checkout Sites gestito si trova nella cartella `sites/dimora-promo` del task del 24 ottobre; è distinto dal worktree Home_OS. Il manifest con identità Sites rimane in quel checkout. Il codice qui tracciato coincide con `dist/` pubblicato. Per modifiche future sincronizzare i tre file in entrambi, verificare e pubblicare con il workflow Sites, senza ricreare il sito.

Verifiche e limiti nel report `docs/v5/prototipo-promozionale-20261024.md`.

## Revisione di allineamento alla V5

Le sette schermate Home e i percorsi di compilazione sono stati riallineati ai sorgenti del consolidamento 2ab7570. UI applicativa Blu architettura e navigazione mobile compatta; 27 viste. Agenzia/Amministratore e scenari sono anteprime esplicite. [Confronto per schermata e limiti](../../docs/v5/prototipo-allineamento-v5-20261024.md). Verifica: node --test prototypes/dimora-promo/tests/fidelity.test.cjs. I file fidelity.js/fidelity.css applicano l'esperienza Home sul guscio promozionale condiviso.
