# Bollette fase 1 — generalizzazione del riepilogo

## Ambito deciso

Il committente sceglie di lavorare per step: nella fase 1 **un solo importo per bolletta**, senza dettaglio delle voci; prima priorità alla generalizzazione. Il riepilogo propone tipo Bolletta, servizio, fornitore, importo, periodo, emissione e scadenza quando leggibili. Rimangono prima pagina, conferma finale, controllo SHA e protezione delle correzioni.

Rinviati in roadmap: dettaglio economico, consumi, quote fisse/variabili, tasse, modelli tariffari/contratti, crediti come modello dedicato e avvisi avanzati. Non sono prerequisiti per questo riconoscimento. Un solo importo non autorizza somme, ripartizioni o scelte arbitrarie fra totali incompatibili, né inferenze di pagamento. Il lotto non cambia il significato del campo importo attuale.

## Branch e modifiche

Base remota911b0fba29d56db6d4da1da54e241ab44e99af37, branch dedicato `codex/bollette-generalizzazione-fase1-20261025`; registrazione `b089659` prima del codice. Combinata la PR #44 solo sul branch candidato, con merge `aed0774`, senza rebase o modifiche ai suoi branch. Il conflitto era solo nello stato: conservati entrambi i lotti e la riga più aggiornata del rilascio #43, senza doppioni.

Fonte prodotto `e73e0282875e4d7c746dbee44f12339b589eddee`. Rispetto alla #44, solo due file prodotto e un nuovo file test:

- `localBillSignals.ts`: formulazioni del servizio indipendenti dal fornitore, come fornitura di elettricità, distribuzione gas, fornitura/servizi idrici, servizio/servizi telefonici, accesso a internet e connettività internet. I nuovi sinonimi richiedono una riga dichiarativa o intestazione, anche con etichette Tipo di servizio/Servizio/Oggetto della fornitura e prefissi Fattura/Bolletta. Una menzione nella descrizione di un prodotto non basta.
- Dal solo testo usato per i segnali di servizio si escludono righe con etichette del fornitore e ragioni sociali con forma legale: «Fornitore: Energia Elettrica Srl» non trasforma la fattura di una scrivania in bolletta. Il testo originale resta disponibile per estrarre il nome e gli altri campi. Nessun catalogo di marchi o regola sul nome file.
- `localBill.ts` combina tali segnali con quelli esistenti; rimangono documento di fatturazione obbligatorio, negazioni e guardie su preventivi, più fatture e servizi misti. Importi/date, OCR, dipendenze, backend, API/schema e conferma invariati. Nessun file Claude modificato.

## Test e limiti delle evidenze

Nuovo `localBillGeneralization.test.ts`: matrice di18 formulazioni di4 famiglie (luce/gas/acqua/telefonia),3 fornitori inventati e2 ordinamenti dei campi:108 casi con dati attesi completi del riepilogo. Altri casi per prodotti/menzioni commerciali, fornitore ingannevole, contratto, preventivi/fac-simile, parole corrotte, servizi misti, nomi discordanti e totali incompatibili. Nessuna categoria o somma arbitraria; nessun pagamento atteso.

Il corpus iniziale, prima delle modifiche, aveva **67/124 superati e57 falliti**: sinonimi non riconosciuti e proposte conseguenti assenti. Quelle asserzioni restano invariate. Aggiunti11 casi di intestazione/nome fornitore/grammatica: corpus definitivo135 casi.

**Verifica finale: 291/291 in9 file**,135 nuovi e156 preesistenti invariati;35,92 secondi, un worker/retry0, zero saltati. Include localBill, localBillSignals, localBillMoney, localBillReliable, localBillFirstPage, localBillHybrid, LocalReadingIsolation e StandaloneBillCompletion. Le prove UI coprono correzioni conservate, isolamento documento/casa/account, risultati tardivi, classificazione/completamento e assenza di POST durante la lettura. Typecheck, lint e build verdi sulla stessa fonte; build8,92 secondi. Nessuna asserzione, gold o timeout preesistente modificato.

Suite mock completa **non ripetuta su questa fonte**: la #44 incorporata aveva1226/1226 sulla propria fonte, dato storico distinto. Per questo incremento sono stati eseguiti i test del modulo cambiato e del percorso di compilazione, oltre ai controlli statici. Nessun test DB o browser reale.

Harness mock con ambiente ripulito da `backend-v5/test/offline-policy.cjs` e guardia di rete, configurazione/cache fuori Git, stesse dipendenze e lockfile. Log del task locale: `work/bill-generalization-before.log`, `work/bill-generalization-after.log`, `work/bill-generalization-focus.log/json`, `work/bill-generalization-checks.log`. Nessun originale o dato personale in fixture Git; nessun nuovo PDF reale letto da questo lotto.

Non è dimostrata copertura universale o accuratezza su fornitori reali: il corpus varia testo/ordinamento, non rappresenta tutti i layout PDF/OCR. Le righe devono essere sufficientemente preservate dal lettore. I pattern storici non sono stati riscritti interamente; menzioni incidentali complesse e altre intestazioni richiedono holdout indipendente. Non abbassare le soglie OCR per aumentare la copertura.

## Consegna e seguito

Implementato il **primo incremento**, non l'intera fase1. Dopo la generalizzazione proseguire per lotti limitati con spiegazione dei campi assenti, tracciabilità e robustezza; validare con altri documenti autorizzati indipendenti senza AI o copie di originali in Git. Il dettaglio resta rinviato.

Il candidato include la #44: non richiede di integrare due volte le medesime modifiche di prodotto. Audit e scelta di ambito nella [PR #45](https://github.com/Vincenzobrutto/Home_OS/pull/45), separata. Nessuna AI/email, DB/API/storage reale, migrazione, salvataggio o aggiornamento app. Main, consolidamento, Claude e checkout legacy preservati. Merge e rilascio al committente.
