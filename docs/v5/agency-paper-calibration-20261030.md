# Calibrazione da formato foglio — 30 ottobre 2026

## Comportamento
Nel workspace planimetrie, quando manca una calibrazione salvata, il formato foglio è preimpostato su A4 e la scala proposta è 1:100, da controllare e modificare dall'agente. L'orientamento iniziale segue il raster; A3 è selezionabile come alternativa. Il metodo precedente barra metrica/misura nota resta disponibile e conserva le calibrazioni già salvate.

Il metodo assume che l'intera immagine rappresenti il foglio. Non riconosce automaticamente i bordi, non corregge prospettiva e non legge automaticamente la scala. Verifica le proporzioni entro il 3% del formato/orientamento scelto, altrimenti richiede verifica del file o misura nota. Il superamento del controllo non dimostra assenza di ritagli o deformazioni. I metri per pixel derivano dalla larghezza fisica del foglio moltiplicata per il denominatore della scala. Le aree usano il quadrato del fattore.

## Contratto e distinzione della stima
Il comando measure accetta calibration.paper opzionale: format A4/A3, orientation portrait/landscape, denominator 1–10000, widthUnits e heightUnits interi positivi entro 5000. Il server ricostruisce e verifica gli estremi e le lunghezze derivati; le dimensioni devono coincidere con il raster salvato. Il metodo produce confirmed:false: non inventa una conferma della scala. La provenienza è salvata nella configurazione JSON già esistente, senza migrazione.

Entrambe le basi commerciali aggiungono paper_scale_estimated alle verifiche: le superfici nette e il parziale si possono leggere, totalM2 resta null. Le due viste esplicitano la stima. Cambiare alla misura nota azzera i riferimenti derivati e richiede nuovi estremi/conferma; il nuovo salvataggio non contiene paper. Non è una certificazione né un algoritmo capace di ricavare la scala assoluta da un ritaglio privo di riferimenti.

## Verifiche
58/58 UI Agenzie, inclusi default A4, metadati non confermati, rifiuto proporzioni errate, ritorno a misura nota e avviso nelle due viste. Build frontend TypeScript/Vite e lint mirati backend/frontend verdi. Sei nuovi test dominio: scala/area quadratica, orientamenti e A3, riferimenti contraffatti, computo lordo ancora stimato, DTO rigoroso e dimensioni vincolate al raster. Il primo test del record usava un canvas oltre il limite di 4 milioni di pixel: fixture ridotta senza cambiare la guardia.

La prima regressione completa nella sandbox ha passato le prove di calibrazione ma fallito sei prove preesistenti su hard link/listener per permessi; ripetuta con lo stesso runner fuori sandbox, senza alterare assert o guardie. Esito finale: 649/649 backend, tutti verdi, registrato anche nel worklog e nello stato corrente. Nessun nuovo collaudo DB/HTTP/browser per questa variante; la persistenza è verificata sul dominio, non dichiarata collaudata end-to-end. Backend/API richiedono aggiornamento del processo locale prima di usare il nuovo campo; il trial precedente è scaduto e non è stato riavviato.

## Replay privato dell'ultima foto
Applicata la calibrazione A4 presunto/1:100 ai nove contorni già proposti, senza nuovi invii AI o correzioni di geometria. Il file di dettaglio è soltanto negli output privati della chat. I risultati restano stime su contorni proposti, ingresso e vano adiacente ancora uniti e microvuoti del testo conservati; non è il computo commerciale, mancano sagoma lorda e trattamento dei muri. Nessun originale, identificativo o geometria reale in Git.

Nessuna nuova AI/spesa, modifica demo Alessio, servizio/DB esistente, main, merge o deploy. Prossimo: confronto con un riferimento metrico attendibile e collaudo completo di salvataggio/ricarica sul nuovo DB di test, senza usare la sola coerenza delle proporzioni come prova della scala.
