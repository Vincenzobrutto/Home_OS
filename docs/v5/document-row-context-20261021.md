# Documenti: riferimenti e fatture riconoscibili — 21 ottobre 2026

Solo elenco Documenti: sotto titolo/tipo appaiono i nomi degli oggetti o impianti già collegati, apribili nella scheda esistente. Riferimenti diretti, tramite spesa attiva e fonti correnti delle analisi caldaia sono deduplicati; più riferimenti restano tutti visibili. Il catalogo Oggetti non cambia.

Per un documento confermato come Fattura, la riga mostra le spese personali attive già salvate: descrizione, fornitore, numero, emissione e importo disponibili. Acconto/saldo provengono dalla descrizione salvata, senza inferenze. Non si usa la data della spesa come emissione. Più spese restano distinte, senza sommarle o sceglierne una arbitrariamente. Titolo confermato e nome originale non vengono modificati; se mancano informazioni, non vengono inventate.

GET elenco aggiunge `linkedObjects` e `savedExpenses`, opzionali per compatibilità frontend. Due letture aggregate per pagina, nella stessa transazione di autorizzazione: scope personale account/casa, spese attive e policy fonte del catalogo per nomi oggetto, inclusi versione/SHA. Le righe di altri account non sono esposte, nemmeno all’owner. Nessuno schema nuovo, scrittura canonica, lettura originale o invio AI.

Verifiche: 15 test backend ricerca/viste con fixture isolate (deduplica diretto/spesa, esclusione spese altrui, fonte del nome inaccessibile, revoca, keyset); 35 test frontend mirati complessivamente passati tra ricerca e presentazione. Aggiornata un’aspettativa precedente alla terminologia già in uso «Pratiche edilizie e catastali». Build, typecheck e lint frontend/backend. Browser reale a 1440, 390 e 320 px: fatture acconto/saldo distinguibili, tutti i riferimenti visibili, apertura impianto e ritorno alla vista, nessun overflow orizzontale. Confronto digest prima/dopo: casa reale invariata; conteggi code AI invariati.

Limiti: la ricerca continua a riguardare titolo e nome file, non i nuovi metadati. Questo intervento non crea collegamenti mancanti, non corregge classificazioni e non introduce un modello rate. Resta separato il lavoro sugli altri rilievi dell’audit.
