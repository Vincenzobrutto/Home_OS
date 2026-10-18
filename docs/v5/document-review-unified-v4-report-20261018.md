# Revisione unica V4 — esito sviluppo, 18 ottobre 2026

## Comportamento

Il percorso per documento «Compila manualmente / tramite AI» e il caricamento inline mostrano la revisione unica: tutti gli articoli aperti nello stesso modulo e un solo «Salva e organizza». Ogni riga mantiene creazione, collegamento esistente o esclusione; non esiste una seconda spesa per il totale documento. La scelta esclusa invia soltanto `skip`, senza importi nascosti. Riepilogo con oggetti, spese scelte e importi esclusi noti; prezzi non disponibili indicati come tali. Originale accessibile senza uscire dalla compilazione. Le vie precedenti senza parametro di compilazione restano compatibili con le bozze storiche.

La fattura può proporre prezzi di riga con citazione e attribuzione al prodotto, mai dividere il totale. Il confronto doppioni usa importo/data dell'articolo. Prezzo assente → scelta manuale oppure nessuna spesa; quantità multiple restano soggette ai limiti preesistenti. La compilazione manuale di più righe accetta un totale dichiarato esplicito, controllato cumulativamente nel backend; non può sostituire un totale estratto.

La bolletta apre i dati di spesa della casa, senza oggetto; il percorso manuale può usare il tipo disponibile nel lotto o la classificazione confermata per preparare una spesa vuota. Planimetrie/APE e documenti immobiliari continuano nel modulo documento della casa, senza oggetti o spese. Budget reso espandibile; consenso prima dell'invio invariato.

## Prove

- Frontend: 61 test su sei file verdi (revisione, router, classificazione inline, copie, consenso, modulo bolletta, prezzi e garanzia). Aggiunto e superato un ulteriore caso di recupero con conferma unica create+skip e risposta persa, un solo POST. Dopo gli ultimi piccoli aggiustamenti, 15 test mirati verdi. Non dichiarata una nuova suite globale.
- Backend offline: 48 test su estrazione prodotti, prove fattura e profilo. Nuovi casi due prezzi EUR, citazione incrociata respinta, importo inventato respinto e nessuna suddivisione implicita del totale.
- Database/HTTP: 27 test finali verdi, solo DB locale V5 verificato (`127.0.0.1:55432/dimora_v5_product_dev`). PDF sintetici e trasporto provider simulato; conferma multipla, esclusione, replay, rollback, quote manuali col totale dichiarato, bolletta manuale senza articoli e controlli duplicati. Il nuovo test manuale inizialmente incontrava un costo sintetico identico di una prova precedente: aggiunto il consenso esplicito all'acquisto distinto nella fixture; guard runtime conservato.
- Build frontend/backend verdi; lint mirati verdi; nessuna migrazione o nuova dipendenza.
- Browser con API reale: accesso alla revisione di una bozza preesistente senza nuove analisi, compilazioni o conferme personali; nessun pannello articolo obbligatorio nel nuovo percorso. Vista bolletta solo spesa della casa. Mobile simulato 390 e 320 px, nessun overflow orizzontale. Non è collaudo su telefono fisico né prova del provider a pagamento.
- Screenshot nel workspace: `outputs/revisione-unica-mobile-20261018.png`, `outputs/revisione-unica-bolletta-320-20261018.png`. Log `outputs/revisione-unica-*`.

## Runtime e dati

API aggiornata tramite launcher V5 registrato; Wi-Fi locale conservato su 192.168.1.66:5175, PC su 127.0.0.1:5174. Verificata assenza di job in coda/esecuzione prima del riavvio. Configurazione autorizzata conservata: campagna onboarding-home-pilot-20261017, 5 USD/40 analisi; UI mostra ancora 4,17 USD e 11/40. Nessuna nuova chiamata Anthropic, modifica .env/segreti, reset quote, push/deploy o modifica ai documenti personali. I test creano/rimuovono esclusivamente risorse sintetiche proprie.

## Limiti espliciti

- Classificazione del documento e conferma oggetti/costi hanno ricevute distinte: se il secondo passo fallisce, il documento può essere già archiviato e la conferma va recuperata con la stessa richiesta. Nessuna promessa di atomicità cross-modulo.
- I prezzi estratti di riga richiedono etichetta univoca (Totale/Importo riga, Prezzo articolo o Line total), EUR e nome nella citazione. Tabelle ambigue, sconti, IVA e spedizione richiedono revisione; nessun dato inventato. Nuovo schema provider collaudato offline, non con un nuovo invio a pagamento.
- Per un documento manuale completamente sconosciuto o una copia con modifiche conflittuali resta disponibile la revisione di classificazione esistente. Un file con più bollette mantiene scelte distinte per proposta; non è stato aggiunto un nuovo coordinatore per confermarle tutte insieme.
- Una bolletta personale preesistente risultava con conferma pending; verificata la presentazione dei comandi di recupero senza ripetere la scrittura personale. La nuova UI non elimina ricevute o tentativi storici.
- Dirty legacy e documentazione condivisa preesistenti preservati. Le aggiunte ai documenti root misti restano nel working tree e non sono incluse integralmente nel commit della feature.
