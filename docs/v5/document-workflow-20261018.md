# Documenti: Da fare e Completati — 18 ottobre 2026

Implementata proposta 3 scelta dal committente sul checkout V5 esistente. Due viste, lista unica, stato server personale/versione/SHA, azione principale coerente, originale sempre accessibile, eliminazione nel menu e selezione AI attivabile. Completato solo secondo la condizione canonica già esistente. Bozza estratta non confermata resta Da rivedere. In analisi si aggiorna tramite letture della lista, senza invio al provider; nessun retry implicito su esiti incerti.

Riusa componenti/token, filtri server, protezioni e conferme. Nessun dato economico, consenso, schema o ledger modificato dal cambiamento. Apertura di una proposta sintetica verificata nella revisione inline; nessuna conferma di risorse. Nessun documento personale inviato/eliminato/modificato. API locale riavviata su 3001, frontend esistente su 5174. File .env invariati.

Verifiche: build backend e frontend, typecheck e lint mirati; suite frontend del percorso/stati/azioni e regressioni ricerca; test PostgreSQL document-workspace (completamento prima del paging, riapertura bozza, stato personale per versione, job/errore, rimozione protetta e replay). Risultati finali nel resoconto della sessione. Browser reale: vista vuota Da fare e quattro completati nella casa personale; casa di collaudo con proposta pronta e due da compilare, selezione aperta/chiusa e revisione esistente; mobile390/320 senza overflow orizzontale.

Differenze intenzionali dal mock: conserva ricerca/raccolte esistenti sotto Cerca e filtra (ricerca solo titoli/filename), niente contatori globali finché il backend non espone totali autorizzati, menu testuale Altre azioni e icone/token già in uso. Non viene costruita una seconda app o un archivio duplicato. Dati e quantità del mock sono illustrativi. Screenshot e confronto visivo nel workspace della chat, outputs e work, non versionati perché contengono schermate locali.

Restano fuori scope: cestino fonti già usate, autosalvataggio modifiche non inviate, OCR avanzato e qualità universale estrazione. Le tre differenze legacy preesistenti sono preservate ed escluse dal commit.

Esito finale: 39 test frontend distinti passati (26 ricerca, 12 azioni, 1 percorso stati; le tre aspettative di testo vuoto aggiornate sono state rieseguite separatamente dopo la suite), 6 test PostgreSQL document-workspace passati. Build backend/frontend e lint mirati passati; QA visiva passed. Nessun invio AI.
