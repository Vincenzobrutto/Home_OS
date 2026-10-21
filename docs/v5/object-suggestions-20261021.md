# Fatture successive sullo stesso oggetto — 21 ottobre 2026

## Comportamento

Dopo la lettura di una fattura/ricevuta, il modulo cerca riferimenti già esistenti nella casa dell’account. Non avvia un’altra analisi AI e non interpreta il solo caricamento come autorizzazione a creare risorse.

Gli indizi ammessi sono il nome completo citato nel documento, marca e modello presenti nel nome della scheda, oppure lo stesso fornitore con almeno due termini distintivi della descrizione di una spesa precedente già attribuita a un oggetto. Parole generiche come acconto, saldo, fattura, lavori e impianto non bastano. Importo e data non identificano l’oggetto. I riferimenti economici già confermati precedono i componenti soltanto citati nel testo.

La regola non contiene nomi o ID del caso elettrico: vale anche per altri oggetti. I riferimenti alle caldaie sono proponibili attraverso una spesa precedente, con la policy delle relative fonti. Non è una ricerca semantica universale: nomi completamente diversi o dati insufficienti possono non produrre una proposta. Restano il selettore manuale e «Conserva solo il documento».

Quando ci sono corrispondenze, vengono mostrate con il motivo. «Collega a …, senza nuove schede» sceglie l’oggetto esistente e imposta gli articoli ancora aperti su `document_only`, preservando i valori locali per eventuali scelte diverse. Nulla viene creato prima del salvataggio finale. Se ci sono più candidati non viene scelto automaticamente il primo. «È un altro oggetto o intervento: scelgo io» rifiuta il riferimento e lascia la scelta manuale. La decisione resta nella bozza; il riepilogo espone cosa verrà salvato.

Acconto e saldo mantengono gli importi distinti e lo stesso riferimento. Il totale non viene replicato sui componenti. I controlli fonte/SHA, spese simili, versione e idempotenza restano attivi. I candidati spesa ora includono quelli già collegati a un oggetto: il riuso conserva ID e riferimento e non crea un costo. I costi appartenenti a un lavoro restano esclusi da questo percorso; nessuno spostamento implicito tra oggetti o documenti incompatibili.

## Sicurezza e modalità automatica

Endpoint di sola lettura, protetto da guard, membership e snapshot del documento. Query limitate e scoped account/casa; nome e fonti correnti ricontrollati con `EconomyPolicy` prima della restituzione. Schede archiviate o inaccessibili escluse. Il catalogo generale resta paginato; le proposte mostrano al massimo cinque riferimenti senza dichiarare esaustività o conteggi totali. Nessuna migrazione, memoria separata per fornitore o ampliamento del consenso AI.

Anche la conferma automatica ricontrolla gli indizi sotto il lock canonico: una possibile scheda esistente richiede revisione. Un titolo fattura che indica acconto o saldo ferma il piano automatico prima di creare oggetti/costi. Accettare una proposta in UI non autorizza il server a saltare le normali verifiche alla conferma.

## Verifiche

- 73 test frontend mirati, inclusa conferma dell’intera fattura con due articoli esclusi dalla creazione, un unico costo sul riferimento esistente e recupero di una risposta persa senza secondo POST; accettazione/rifiuto e annullamento della precedente scelta.
- 38 test backend offline: indizi generici insufficienti, fornitore/descrizione, altro oggetto, identità abbreviata, fonte inaccessibile, archivio, caldaia, riuso della spesa e blocco della modalità automatica. Build frontend/backend, lint frontend e mirato backend.
- Browser desktop e mobile: modulo reale con dati fittizi in memoria, proposta motivata, scelta esplicita e acconto/saldo sullo stesso riferimento; nessun overflow a 375 px. Evidenze locali della chat: `outputs/object-suggestions-20261021/`.
- Backend reale verificato in sola lettura sulla bozza già analizzata: riconosce il riferimento economico all’Impianto elettrico e il monitor citato dalla fattura. Nessun nuovo documento, oggetto, costo, analisi o cambiamento dei dati personali durante questo task.

La fattura reale dell’acconto non è ancora caricata: il suo riconoscimento specifico andrà verificato quando sarà disponibile. Le regole funzionano sui dati estratti disponibili; non garantiscono un’associazione in assenza di riferimenti sufficienti.
