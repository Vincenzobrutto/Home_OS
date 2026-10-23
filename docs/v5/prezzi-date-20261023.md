# Prezzi e date: collaudo offline — 23 ottobre 2026

Lotto Codex `codex/prezzi-date-20261023`, worktree dedicato dalla punta remota del consolidamento `976d62c`. Registrazione preventiva `78f9ab1`. Esclusi schema, documenti/cestino, accessi DB, worker e file del lotto Claude. Nessun merge autorizzato da questo incarico.

## Difetto riprodotto e correzione

Il validatore delle date di acquisto/ordine accettava una data completa ovunque dopo un'etichetta riconosciuta. Per esempio `Data acquisto: non disponibile; riferimento 07/03/2024` poteva diventare un fatto estratto e poi una proposta nel profilo. Anche qualifiche condizionali e ripetizioni della stessa data potevano passare: il parser delle date restituisce valori distinti e non conta le occorrenze.

`invoice-evidence.ts` richiede ora che la porzione subito dopo l'etichetta sia una data completa. Restano ammesse note neutre dopo il punto e virgola, come i riferimenti cliente; qualifiche incerte e altre occorrenze di date nella nota sono rifiutate. Mantiene formati numerici/ISO e mese italiano, NFC, spazi non separabili, etichetta sulla riga precedente immediatamente contigua e controllo del calendario. Non aggiunge marchi, importi o date dei documenti del committente. Citazioni narrative non attribuibili con certezza richiedono revisione; l'utente può confermare manualmente il dato.

L'errore segue il percorso già esistente: campo opzionale omesso, warning specifico e revisione; identità e prezzo verificati restano. Nessun cambiamento a errori pubblici, fonti/versione/SHA, privacy, idempotenza, prompt o gold.

## Matrice

- Date: acquisto e ordine; sconosciuta/non disponibile/da confermare/estimated; riferimento o stampa con stessa data; duplicati; anni bisestili e date impossibili; anno incompleto; stessa data in contesti diversi sulla pagina.
- Importi: raggruppamenti italiani/internazionali e spazi Unicode; valuta esplicita; totale, sconto, acconto, saldo e spedizione separati; valuta estera, gruppi malformati, più importi, prezzo unitario senza totale riga.
- Risultato completo: nessuna mutazione dell'input; ripetizioni deterministiche; campo dubbio assente con warning, identità/prezzo conservati e revisione finanziaria obbligatoria.
- Suite esistenti: mantengono i casi caffè/Samsung, quantità e più prodotti, righe fattura, pagamento/consegna/garanzia distinti, Q15/Q22/Q48 e guardie delle fonti. Sono replay/fixture offline, non nuove estrazioni dei PDF o nuove misure di qualità AI.

La politica approvata resta invariata: ordine confermato come acquisto proposto; totale dell'ordine come costo complessivo di un solo prodotto con spedizione inclusa, senza sommarla di nuovo. Nessuna ripartizione tra prodotti, deduzione di pagamento/consegna o creazione automatica di una spesa.

## Verifiche e limiti

Implementato e verificato sul branch del lotto: build nei runner, **311/311 onboarding** (306 preesistenti e cinque nuovi gruppi), **233/233 ordinari**, **18/18 guardie**, lint completo superato. Comandi dalla cartella backend-v5: `npm run test:object-onboarding`, `npm test`, `npm run test:quality-v3-live-guards`, `npm run lint`, eseguiti in serie sul codice finale. I test usano il runner offline con rete e DB vietati; nessun cluster o API avviato. Frontend e suite mock non modificati né rieseguiti; nessuna verifica browser o HTTP/DB dichiarata.

Prima della correzione tre nuove prove fallivano per asserzioni sulle date accettate impropriamente. Nello stesso lancio quattro prove PDF esistenti fallivano con `pdf_invalid` durante la preparazione locale; nella verifica finale in serie passano con gli stessi timeout e asserzioni. Un lancio duplicato del solo runner unitario è stato fermato, senza toccare processi altrui. Una prima correzione troppo restrittiva sulle note neutre è stata respinta da un test esistente e corretta; quel test resta identico e passa. Nessuna asserzione preesistente, gold o limite di tempo allentato.

Log locali nel `work/` del task: `prices-dates-baseline.log` (riproduzione), `prices-dates-final-onboarding.log` (compatibilità intermedia), `prices-dates-verified-onboarding.log`, `prices-dates-verified-unit.log`, `prices-dates-verified-guards.log`, `prices-dates-verified-lint.log` (esiti finali). I profili hanno sovrapposizioni: non sommare i conteggi come casi indipendenti.

Nessun file personale letto o caricato in questo lotto; fixture sintetiche e prove già tracciate. Nessuna AI/email, DB reale o del collaudo persistito, `.env`, migrazione, salvataggio canonico, reset/clean, force push o rimozione worktree. Checkout legacy e ambiente caffè lasciati invariati. Il gate generale qualità AI resta non promosso; non è un collaudo browser né della qualità di nuove risposte del modello.
