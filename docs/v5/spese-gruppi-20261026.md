# Spese — gruppi e categorie, 26 ottobre 2026

Il committente ha approvato la distinzione: «Gruppi di spesa» indica i raggruppamenti ampi; «Categorie» indica il dettaglio. Il lotto cambia soltanto il testo visibile e le etichette accessibili del grafico, dei riepiloghi, dei dettagli e dei moduli spesa/documento/lavoro. Esempio: «Famiglia prevista» diventa «Gruppo di spesa previsto».

Base remota d5bf35f33b8f8aa406b0183b9b5f421853b8da00, worktree dedicato, branch codex/spese-gruppi-20261026. Registrazione prima del codice: 60dfac0. Il lotto precedente Spese ha liberato l’area; nessun file dei lotti Claude modificato.

Le chiavi family, i codici categoria, il parametro URL famiglia, i payload, i filtri e i calcoli restano invariati. Le famiglie dell’archivio documenti mantengono la loro terminologia. Le aspettative test dei testi sono aggiornate senza modificare controlli di privacy, idempotenza, importi o collegamenti.

## Verifiche offline

- Gruppo mirato Spese/economy/expenses/casaTasks/billPeriod: 72/72 in 7 file, un worker, retry0.
- Percorsi documento/lavori s1c e consenso: 43/43 in 2 file, un worker, retry0.
- Typecheck, lint e build: superati.

Esecuzione con dipendenze preesistenti e lock identico, ambiente ripulito dal runner offline ed envDir vuota esterna al repository. Nessuna nuova dipendenza o test artificiale per la sola sostituzione di etichette. La suite mock completa non è ripetuta per questo cambiamento testuale; sulla base precedente è documentata 1548/1548 nel report spese-leggibilita-20261026.md.

## Consegna e limiti

Candidato verificato soltanto offline; nessun collaudo visivo di questo lotto e nessuna attivazione. Nessuna AI/email, lettura o scrittura su DB/API/storage reale, migrazione, modifica .env o salvataggio automatico. Main, branch Claude e ambiente applicativo preservati. PR verso il consolidamento; merge e successiva attivazione al committente.

Attività del committente: approvare la PR e, dopo il rilascio, verificare le nuove diciture nella pagina Spese.

## Rilascio autorizzato

Integrato e attivato nel frontend il 26 ottobre 2026: [esito e limiti del rilascio](spese-etichette-rilascio-20261026.md). Nessuna riclassificazione delle spese salvate.
