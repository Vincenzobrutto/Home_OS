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


## Chiusura e attivazione

Codice finale72ade152b937f01ac795ac8b59ae57f07cfd3138, seguito del primocce756d. Dopo il primo controllo375px sono stati compattati la navigazione delle aree (scorrimento orizzontale), il titolo e i quattro comandi in due colonne. «Elimina» conserva nome accessibile completo. L’SVG iniziale contiene il foglio intero nel riquadro; lo zoom cresce dalla stessa base mediante CSS, mantenendo originale e contorni nello stesso sistema di coordinate. Nessun ritaglio dei byte o modifica ai punti.

65/65 nel gruppo modificato e32/32 dei due file interessati rieseguiti dopo il seguito responsive. Typecheck app, lint e build verdi; nessuna nuova suite backend/DB necessaria o dichiarata verde. Avviso usuale Vite sulla dimensione dei chunk preservato.

Frontend aggiornato tramite profilo privato `work/app-agency-plan-simple-final-20261105`, build privata `.agency-cache/final-dist`; API PID4380 e PostgreSQL PID35664 preservati, nessun riavvio o migrazione. Frontend nuovo PID31592. Il profilo intermedio app-agency-plan-simple-20261105 è superato e non va riavviato; fallback del launcher finale è il precedente profilo stabile app-agency-journey-20261105, con checkout immutato. Le prove/manifeste verificano file build e commit di prodotto, consentendo i soli successivi commit documentali.

Browser nella stessa pratica reale, senza salvataggi: default senza vertici, selezione cucina, aggiunta locale di un punto, Salva modifiche abilitato e calcolo/annuncio bloccati fino al salvataggio; ricarica per scartare il solo cambiamento di prova. Dopo il seguito responsive controllati desktop e375px, scrollWidth360 su viewport375, zero errori console, viewport ripristinato e scheda lasciata disponibile. Nessuna nuova analisi AI o acquisto, upload originale, salvataggio o eliminazione reale. Dati e contorno precedenti preservati.

Screenshot privati solo in `outputs/Dimora-Planimetria-semplice-20261105`: desktop e mobile finali. Contengono l’originale dell’utente: non inserirli in Git o nella PR. Nessun main, merge o deploy; lotto dipendente dalla PR81, integrazione comune resta separata.
