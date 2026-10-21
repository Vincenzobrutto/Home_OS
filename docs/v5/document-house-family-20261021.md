# Cambia famiglia dall’elenco — 21 ottobre 2026

Nella vista Documenti della casa, ogni riga organizzata modificabile offre **Cambia famiglia**: menu nativo, Annulla e Salva famiglia. Cinque famiglie esistenti, più Automatico dal tipo per rimuovere l’override. Dopo conferma si apre il gruppo risultante mantenendo gli altri filtri; messaggio di conferma raggiungibile da tastiera. Durante selezioni ZIP/AI il comando non compare. Non apre la compilazione.

Famiglia e tipo sono indipendenti. Fattura resta Fattura anche in Contratti; titolo, parti, raccolte, originali, oggetti, spese e riferimenti condivisi non cambiano. Una sola copia in Tutti. Scelta personale sulla fonte corrente, senza riclassificare altri account o documenti. L’appartenenza alla casa resta esplicita anche annullando l’override.

## Protezioni

Endpoint e fonte descritti nel contratto API. CAS della versione organizzazione, versione/SHA originali, autorizzazioni rivalidate e transazione sotto lock G1. Idempotenza con corpo congelato nei retry incerti; errori certi consentono aggiornamento elenco. Nessuna chiamata AI o lettura dell’originale per cambiare famiglia. Fonti non organizzate richiedono la normale compilazione; nessuna categoria inventata.

## Verifiche

- Backend: 35 test passati su famiglia, viste, HTTP oggetti e organizzazione; cinque destinazioni, ritorno automatico, concorrenti/CAS, replay, input e permessi. Confronto dei record prima/dopo: tipo, metadati file, spese e collegamenti invariati.
- Frontend: 2 test del menu e 3 regressioni dello spostamento nella casa passati separatamente. Nel primo run combinato una regressione aveva superato il tempo di attesa; rieseguita isolata senza modifiche e passata. Build e lint frontend/backend riusciti; warning bundle frontend preesistente.
- Browser reale con account/casa solo di collaudo, AI disabilitata: desktop 1366×900, fattura da Altri a Contratti; mobile 390×844, menu e ritorno ad Automatico. Destinazione aperta, conteggi aggiornati, tipo Fattura/costo 120 €/videocitofono conservati. Larghezza contenuto 375/375, nessun overflow orizzontale.
- Verifica in sola lettura: originali sintetici byte-identici, due fatture e costi invariati, videocitofono attivo e due collegamenti mantenuti; viste casa/oggetti/Tutti senza copie. Digest casa reale prima/dopo invariato. La sessione utente aperta in compilazione non è stata navigata o ricaricata.

Screenshot e helper di collaudo locali sono in outputs della conversazione, fuori Git; nessun originale o dato personale incluso nel repository.
