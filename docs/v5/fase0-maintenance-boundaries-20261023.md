# R06/R09 — percorsi mantenuti e documentazione corrente

23 ottobre 2026, base ac192062b8553599ebb59667394cbe8680aea0ef, branch Fase 0. Ricognizione strutturale, nessuna modifica al comportamento.

## R06: ricognizione conclusa, ritiro non eseguito

Confermata l'assenza di import produttivi verso BatchProposals, PendingUploads, ObjectsSummary e DocumentCollectionFilters. Gli import trovati sono test e barrel document-intake; i quattro moduli erano già assenti dalle source map di produzione dell'audit. Il progetto frontend è private, senza ingresso di libreria dichiarato: nessun consumer esterno individuato nel repository. Questo non dimostra l'inesistenza di ogni uso esterno.

| Componente conservato | Ingresso corrente da mantenere |
| --- | --- |
| BatchProposals | IntakeContent e DocumentEditorWorkspace, con DocumentObjectProposals/OnboardingPage |
| PendingUploads | Percorso Documenti e ripresa nel workspace/intake corrente |
| ObjectsSummary | HomePages: Esplora la casa, ScadenzeSummary e SpeseSummary |
| DocumentCollectionFilters | SearchForm e viste/famiglie dell'archivio corrente |

La cronologia e gli handoff conservano intenzioni di integrazione: DocumentCollectionFilters era indicato per B2 e poi integrato; BatchProposals include controlli sul nuovo consenso dopo esiti incerti e copertura del consolidamento del pilota. Ultimi commit dei moduli: BatchProposals e4aa5ee/d92f555/ac04101; PendingUploads 05b1d28; ObjectsSummary 2510655/5d19574; filtri 89e4849/ca18861/28bec15. Non c'è un atto univoco di dismissione UX per tutti e quattro.

Decisione tecnica per questo incarico: conservarli come componenti storici di compatibilità/test, senza ricollegarli all'ingresso reale e senza cancellare le loro asserzioni. La rimozione non ridurrebbe il bundle attuale. Il loro ritiro resta una possibile decisione successiva, non un prerequisito per verificare il refactoring. Nessuna schermata o funzione ritirata di nascosto.

## R09: ingressi correnti e archivi fedeli

Architettura ora descrive la V5, i confini di conferma/provider e l'ingresso protetto dei test. Roadmap ora distingue manutenzione, gate qualità, verifica del committente e attività di prodotto ancora aperte; dettagli e checkpoint rimangono nei documenti di origine. Nessun esito storico promosso a stato corrente.

Archivi nella stessa cartella, senza alterare il contenuto, così i link relativi conservano la risoluzione:

- architecture-history-20261023.md = blob Git precedente `8418cc351a222dd9c57b253b050062637ce369c7`;
- roadmap-history-20261023.md = blob Git precedente `db8d11772bf5ec84e355ace62d5bcde8670b96d9`.

Nessun collegamento Markdown interno con frammento verso i due documenti individuato da correggere. Link senza frammento continuano all'indice corrente; eventuali URL esterni profondi non sono stati censiti. project-status-history-20261023.md rimane invariato, identico al suo archivio iniziale.

## Verifiche e vincoli

Confronto dei blob esatto, diff/link documentali esaminati. Non sono nuovi test di prodotto. Nessuna AI, DB, .env, gold, legacy, main o worktree modificati. R06 è una ricognizione con conservazione deliberata, R09 è implementato per i tre ingressi stato/roadmap/architettura; gli altri report tecnici restano evidenze datate, non vengono cancellati o riscritti in massa.
