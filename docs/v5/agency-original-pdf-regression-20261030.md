# PDF originale — regressione e confronto scala A4/barra, 30 ottobre 2026

## Documento e metodo
Il PDF nuovamente fornito è identico byte per byte al primo originale già autorizzato. Una pagina A4 (595,911×842,745 punti), scala stampata1:200 e barra grafica10metri. Non è un campione indipendente. Nessuna nuova generazione AI, chiave caricata o spesa: riutilizzate le due risposte effettive conservate del pilot precedente, senza cambiare semi, poligoni o suggerire conteggi.

Rasterizzato nuovamente con il decoder prodotto a180dpi:1490×2107, pixel/hash identici al raster delle risposte cached. La pipeline attuale v8 usa il profilo prodotto agency-raster-v1-180dpi, senza adattamenti privati di soglia/minimo/closing. Due letture cached nel contesto offline sintetico, nessun salvataggio in DB/API o riavvio trial.

## Risultato geometrico reale
Dieci contorni, nessuna sovrapposizione e nessuna surfaceProposal aggiuntiva. Sono presenti i due bagni e il balcone continuo sui lati dell'appartamento. Il corridoio ovest resta omesso: manca già nel censimento delle risposte storiche. L'issue seed_region_unresolved associata aS10 riguarda invece un candidato Balcone nord (componente piccola/altro seed sull'inchiostro), non quel corridoio; non confondere le due diagnosi. Restano tre verifiche symbol_unresolved su elementi interni. Nessuna correzione manuale o fusione col riferimento precedente per rendere completo il risultato.

Le risposte erano state prodotte con il prompt di quel pilot: questa regressione non misura gli effetti dell'ultimo prompt di censimento e non prova una nuova lettura AI autonoma. La precedente aggiunta manuale del corridoio nella pratica non è stata importata nel risultato automatico.

## Calibrazione
Confrontati gli stessi dieci poligoni con due fattori: A4 presunto e scala200, oppure barra10m con gli estremi già registrati nella precedente verifica di scala. Gli estremi della barra non sono stati riconosciuti automaticamente in questo turno. La superficie da A4 è inferiore di0,24334% rispetto a quella dalla barra, sul medesimo disegno e sui medesimi contorni. È coerenza interna del documento, non errore rispetto a un rilievo reale e non un tasso generale di accuratezza.

Nel PDF è dunque preferibile usare la barra disponibile; il formato A4 costituisce un buon controllo incrociato in questo caso noto. Nessun totale commerciale completo: corridoio omesso, simboli ancora aperti e muri/sagoma commerciale non verificati. Tabella privata con superfici nette per regione e immagine tecnica sovrapposta all'originale negli output della chat Dimora-PDF-regressione; originali, geometrie e risposte restano fuori Git.

## Verifiche e seguito
Verificati SHA originale, identità raster, geometrie finali senza overlap e formula areale quadratica con le funzioni prodotto. Codice invariato: nessuna nuova suite ordinaria, DB o browser necessaria/ripetuta, nessuna nuova prova del provider. È una prova locale di regressione e calibrazione, non un nuovo flusso web persistente. Demo Alessio/main/merge/deploy invariati. Prossimo: campione davvero indipendente con barra/quota nota e verifica del censimento dei corridoi, distinguendo coordinate sbagliate da ambienti mai proposti.
