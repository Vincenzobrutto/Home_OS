# Agenzie — workspace della pratica e form di computo

## Implementato nel branch, non nel servizio in uso

`AgencyPracticePlanWorkspace` collega il client autenticato già presente a pratica/documenti visibili, selezione piano, PNG allineato, editor dei vani/perimetro e salvataggi HTTP. Il contenitore deve ricevere api e scopeKey corretti; **nessuna route/router generale o AppModule modificati**. Non è un deploy o una funzione già attiva per Alessio.

Form: selezione degli estremi della barra sull'originale o coordinate manuali, lunghezza reale esplicita, quota di controllo, tolleranza, versione criterio e base vani+muri/perimetro lordo. Categorie e intervalli del profilo concordato; scelta percentuale e motivo quando richiesti, altezza e qualificazione senza deduzioni. Conferme inizialmente false, totale incompleto distinguibile da risultato da rivedere.

Creazione iniziale del perimetro e fasce dei muri tramite disegno punto per punto in dialog nativo; alternativa numerica, annulla ultimo punto e conferma esplicita. Nessun rettangolo o inviluppo costruito dai vani. Per i muri: classificazione, spessore, uniformità e base del limite25cm espliciti. Dettaglio vani e perimetro restano distinti. Il disegno dei vuoti nuovi e l'aggiunta/eliminazione di vani assenti dalla bozza non sono ancora comandi del workspace; i vuoti già presenti sono modificabili nell'editor esistente.

Le verifiche della bozza hanno esito manuale incluso/escluso/non pertinente e motivo; non diventano certificazioni. Il lessico tecnico dei codici viene sostituito da istruzioni leggibili. Nessun caricamento o avvio AI da questa schermata: documenti e analisi devono già essere presenti tramite API/worker.

La configurazione di misura ora viene conservata nel piano, oltre al report: ricaricare non deve ricostruire le scelte da un totale. Modifica geometrica/risoluzione invalida report e configurazione; la schermata richiede di riconfermare i parametri, senza ereditare conferme obsolete.

## Errori e privacy

Salvataggio soltanto su azione esplicita con motivo, revisione pratica e versione piano. Un contorno per volta evita perdite silenziose tra vani. Esito503 incerto: payload e Idempotency-Key conservati per il pulsante di retry esplicito, nessun reinvio automatico.409 congela modifiche fino alla ricarica;422 conserva il draft e riabilita la correzione, senza intrappolare una richiesta invalida. Revoca/sessione errata nascondono dati e Blob URL; cambiare scope smonta tutto e annulla letture pendenti. Nessun localStorage o fallback mock nella modalità reale.

Ricarica con modifiche locali è nominata esplicitamente come scarto. Immagine assente/stale non viene sostituita da una fixture e impedisce modifiche senza originale. I piani privati restano filtrati dal backend; readOnly è un'indicazione UI aggiuntiva del contenitore, non sostituisce i permessi server.

## Collaudo e limiti

Harness separato `tests/agency-workspace-preview.html`, API in memoria e documento disegnato sinteticamente; banner esplicito, computo volutamente sempre incompleto. **Non** è prova browser contro DB/API reale. I test HTTP/DB verificano separatamente server e persistenza; quelli componente usano porte simulate. Nessun file personale o AI reale.

Browser desktop e viewport375: nessun overflow orizzontale osservato; scelta estremi, parametri, salvataggio parziale e perimetro indipendente verificati. Il primo picker appariva sopra la porzione visibile del modulo mobile: trasformato in dialog nativo visibile/focalizzato, poi riprovato. Selezione sul documento conserva coordinate del raster, non metri inventati. Screenshot in outputs della chat. Non è collaudo su telefono fisico o test assistivo completo; presa dei vertici densi e lunghi fascicoli richiedono prove con agenti reali.

Rimangono navigazione prodotto, integrazione upload/estrazione dell'atto/bozza incarico, provisioning consensi e avvio job nel prodotto, nuovi vani/vuoti e verifica end-to-end browser contro API reale. Coerenza persistente e mapping incarico rimangono task separati. La demo Alessio resta invariata.
