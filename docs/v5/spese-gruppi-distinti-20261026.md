# Gruppi Spese distinti — 26 ottobre 2026

Il committente approva la separazione di Acquisti da Manutenzione, riparazioni e lavori, dopo la chiarificazione delle categorie nelle PR #61/#62. Lotto registrato prima del codice a85826cb, branch codex/spese-gruppi-distinti-20261026 dal consolidamento remoto3ceb73c, worktree dedicato. Nessun file di lotti Claude aperti modificato.

## Comportamento

Il codice storico works_purchases resta nell’API ma contiene soltanto purchase_replacement, con etichetta Acquisti. maintenance_repairs contiene maintenance, repairs_works e condominium_extraordinary, con etichetta Manutenzione, riparazioni e lavori. Le spese condominiali straordinarie escono quindi dal precedente gruppo misto insieme agli altri interventi; il condominio ordinario resta in Condominio.

Collegare un costo a un lavoro o scollegarlo non cambia più il gruppo. Restano disponibili lavori, filtri e riepiloghi per lavoro, compresi gli acquisti collegati a un intervento. Non cambia nessuna categoria salvata, importo, fonte, proprietario o collegamento; nessuna migrazione o backfill. I gruppi sono proiezioni calcolate anche nelle letture dello storico e dei replay, quindi i subtotali per gruppo possono cambiare anche sui dati già registrati. Il totale generale e i totali per categoria non cambiano.

Backend: mapping, etichette e capabilities con un solo possibleFamilies per categoria; filtri SQL coerenti con la stessa funzione, senza distinguere workId. La combinazione repairs_works + works_purchases è ora incompatibile (422). Cursori lista reference-v3: i cursori precedenti sono rifiutati e richiedono di ripartire dalla prima pagina. Privacy, autorizzazioni, CAS e idempotenza restano obbligatori.

Frontend: nomi e anteprima allineati; tolto il precedente avviso che assegnava il lavoro al gruppo misto. Simulatore in memoria aggiornato allo stesso contratto. Nessuna nuova categoria, ripartizione degli importi o classificazione automatica nuovo oggetto/componente.

## Verifiche offline

Backend build e suite ordinaria 301/301; profilo test:economy-db finale 19/19 su cluster nuovo dimora-offline-8wKInA (17,61 s per i test). Il primo profilo su dimora-offline-Q7G5tN era 17/19: la fixture HTTP cercava ancora la riparazione nel filtro works_purchases. Allineata alla decisione con due assert: zero negli acquisti e 12345 negli interventi; invariati importo, replay e privacy. Lint iniziale ha segnalato il parametro workId non più usato; firma mantenuta per compatibilità con uso esplicito void. Frontend mirato: primo gruppo 90/91 in 8 file, con timeout del caso preesistente documentDrafts false; il log riporta 4556,11s complessivi e 4384,25s per quel caso, causa non dimostrata. File rieseguito invariato:24/24 in 48,28 s, un worker/retry0, nessun salto. Gli altri 67 casi erano verdi; tutti i 91 casi selezionati sono quindi verificati in esecuzioni distinte, senza dichiarare un unico aggregato finale o la suite mock completa. Nuovo caso gruppi, somme e filtro passato. Lint backend, typecheck/lint/build frontend finali superati. Lotto chiuso e area liberata; merge al committente. Test esistenti riallineati alla nuova decisione di raggruppamento, conservando asserzioni su importi, privacy, replay, CAS, storia e collegamenti. Aggiunti casi misti con/senza lavoro: acquisto, riparazione, condominio straordinario e manutenzione; verifiche dei subtotali, somma gruppi, paging senza duplicati, capabilities, filtro incompatibile, isolamento personale e righe DB identiche prima/dopo le letture. Test mock del grafico e del filtro mostra separatamente acquisti/interventi e verifica assenza di POST durante la consultazione.

Runner backend offline con dipendenze preesistenti e schema/lock identici. Suite DB soltanto su cluster nuovo posseduto dal runner, pg-bin esplicito e scratch corta; nessun DB/API/storage reale. Frontend con ambiente ripulito, envDir vuota, un worker/retry0. Nessuna AI/email, .env, migrazione reale, salvataggio automatico o aggiornamento app.

## Consegna

Contratto, specifica, decisione, stato, roadmap e changelog aggiornati. PR verso il consolidamento; merge e successiva attivazione coordinata di API/frontend al committente. Non è sufficiente aggiornare il solo frontend perché il gruppo è calcolato dal server. Nessun test visivo autenticato o collaudo con dati personali eseguito.

Attività del committente: approvare la PR; dopo il rilascio controllare i due gruppi nella pagina Spese. Non serve risalvare le registrazioni.

## Rilascio autorizzato

PR #64 integrata e API/frontend attivi a ccc8469, hash remoto verificato; cluster esistente ripristinato, nessuna migrazione. Build e34/34 HTTP statici/anonimi verdi. [Consegna, ripristino e limiti](spese-gruppi-rilascio-20261026.md).
