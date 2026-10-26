# Rilascio etichette Spese — 26 ottobre 2026

Il committente ha approvato integrazione e attivazione delle PR [#61](https://github.com/Vincenzobrutto/Home_OS/pull/61) e [#62](https://github.com/Vincenzobrutto/Home_OS/pull/62). Sono attive «Gruppi di spesa»/«Categorie» e la categoria visuale «Acquisti», con indicazione di usare «Riparazioni e lavori» per i componenti sostituiti durante un intervento. Nessuna riclassificazione retroattiva delle spese.

## Integrazione verificata

- PR #61: merge 562f3878886448e73917d586a8fd8590cdcd964a.
- PR #62 allineata con merge 8246c797b0c14682dd8dc0edc0ab19637f3104e1: conflitti solo in stato, roadmap e changelog, risolti mantenendo entrambi i lotti. Frontend unito automaticamente. Caso condiviso del modulo verificato offline 1/1 selezionato, altri 22 esclusi dal solo filtro di esecuzione.
- PR #62: merge 3ceb73c412907945a7e74df9798a9dded6558a6b, punta remota del consolidamento verificata con git ls-remote.
- Main invariato a cdbb318ddb56e764ad4b111a71560e3e71c7a033. Nessun branch Claude modificato.

Verifiche precedenti e limiti nei report [gruppi](spese-gruppi-20261026.md) e [acquisti](spese-acquisti-20261026.md). Nessuna nuova esecuzione della suite mock completa durante il rilascio; nessuna asserzione o timeout indeboliti.

## Attivazione

Runtime frontend dedicato e pulito dalla punta 3ceb73c, albero frontend identico alla fonte unita 8246c79. Backend identico alla fonte API a8de901. Lock dipendenze identico e nessuna installazione; build del runtime superata con ambiente ripulito ed envDir vuota.

Solo il precedente frontend PID16596 è stato fermato dopo verifica di comando, data di avvio e listener. Nuovo frontend PID33552 su 127.0.0.1:5174, proxy loopback verso 3011; guardia di rete frontend mantenuta. API PID15744 e PostgreSQL PID22924 conservano identità e porte 3011/55432. Nessuna modifica .env, migrazione o accesso autenticato.

Primo controllo immediato prima della disponibilità di Vite: ECONNREFUSED. Dopo il messaggio di readiness, 33/33 verifiche HTTP statiche e anonime superate: moduli delle nuove etichette, moduli precedenti bollette/titoli/rilettura, worker PDF/OCR, pagina iniziale e API anonima 401 con X-Dimora-Collaudo roma-consolidata-a8de901-no-ai. Nessuna richiesta a originali o dati personali; nessuna AI/email o scrittura automatica. Le prove di runtime rimangono negli artefatti locali del task, senza contenuti personali nel repository.

## Verifica del committente

Ricaricare la pagina Spese già aperta. Controllare «Gruppi di spesa»/«Categorie» nel grafico e «Acquisti» tra le categorie; nei moduli la spiegazione distingue nuovo oggetto e componente. Nessun collaudo visivo autenticato eseguito dall’agente in questo rilascio. Non occorre modificare o risalvare spese esistenti.

La presente consegna è una PR documentale separata dal codice già approvato e attivato; il suo merge resta al committente.
