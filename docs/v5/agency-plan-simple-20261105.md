# Planimetria agenzia: disegno essenziale — 5 novembre 2026

Seguito esplicito al riscontro del committente: il percorso del lottoPR81 era collegato ma la pagina planimetria rimaneva più articolata del mockup. Branch `codex/agency-plan-simple-20261105`, basec85eb80 della PR81, checkout separato; nessuna modifica al checkout che alimenta l’API locale.

## Cambiamento

La vista di disegno embedded parte senza un vano selezionato e senza vertici o controlli geometrici. Barra principale: Seleziona, Aggiungi vano, Elimina vano selezionato e Salva modifiche. Il salvataggio è visibile ma disabilitato finché non c’è una modifica locale; usa lo stesso comando geometrico, revisione/versione e chiave idempotente precedenti. Eliminazione sempre confermata. Un contorno non salvato blocca cambio vano e passaggio a calcolo/annuncio.

Clic o tastiera su un vano espongono il suo nome e i comandi contestuali per aggiungere/eliminare punti e annullare. Zoom −/+/Adatta separato. Geometria a tendina, mostra-contorni e controlli estesi non sono esposti nella vista semplice. Gli editor non embedded conservano i controlli precedenti.

Selettore documento, confronto proposte, note e verifiche sono richiusi. I conflitti, la perdita di accesso e i retry di invii incerti restano espliciti e non vengono nascosti. Scala, coefficienti e perimetro rimangono nel percorso Calcola superfici; la pianta per annuncio porta all’area Annuncio già esistente. La timeline commerciale e il ricaricamento duplicato sono rimossi soltanto dalla pagina Planimetria.

Il nuovo vano conserva nome e tipo, ricalco grafico, chiusura sul primo punto e Salva nuovo vano. Le coordinate numeriche sono facoltative e richiuse; l’anteprima di controllo non mostra più i prospetti commerciali o altri controlli non pertinenti. Il salvataggio diretto e il controllo server dei confini restano invariati.

## Limiti e perimetro

Solo frontend: nessun nuovo endpoint, modifica alle regole geometriche, schema/migrazione, riconoscimento AI, costo o salvataggio automatico. La rinomina/cambio destinazione dei vani già esistenti non è introdotta in questo lotto; sono conservati nome e tipo alla creazione. La semplificazione riguarda la pagina di disegno: il computo conserva i suoi controlli specifici dopo l’azione esplicita. Originale e contorni salvati non vengono modificati durante la verifica visuale.

## Verifiche

65/65 in PlanMeasurementView, PracticeWorkspace, ManualRoomCreator e AgencyNavigation. Nuovi casi: controlli contestuali assenti prima della selezione; zoom semplice; salvataggio visibile con payload geometrico esatto e blocco del cambio attività finché non salvato. Conservati i casi di permessi, conflitti, retry identico, eliminazione confermata, coefficienti/calibrazione e confronto delle proposte.

Il primo giro ha evidenziato cinque test ManualRoomCreator già disallineati rispetto al prodotto precedente: cercavano il vecchio motivo obbligatorio e un pulsante Salva non ancora presente senza anteprima, mentre il lotto precedente aveva nota facoltativa e salvataggio diretto. Aggiornate le attese alla UI esistente mantenendo controlli su payload/chiave/revoca e nessun invio automatico; aggiunta verifica che una modifica dopo l’anteprima salva solo il nuovo payload su esplicito Salva. Un nuovo test zoom cercava anche l’output nascosto dei controlli estesi: ricerca ristretta al gruppo Zoom visibile. Nessuna asserzione di sicurezza ridotta.

Typecheck app, lint mirato e build verdi. Backend e DB non rieseguiti: codice invariato. Attivazione frontend e verifica browser sono registrate nel seguito.
