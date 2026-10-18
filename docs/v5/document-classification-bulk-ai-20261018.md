# Revisione inline e AI sui selezionati

Corretto il salvataggio di Schema di impianto: estrazione corretta ma mapping dell’archiviazione incompleto. Catalogo tipi completo nella revisione unica, titolo e consenso esplicito per modificare metadati salvati. Il nuovo ingresso Documenti non manda a un secondo dialogo quando manca il tipo.

Selezione individuale e tutti i documenti mostrati (massimo20 per gruppo), consenso e riepilogo budget prima dell’invio. Avvio persistente con chiavi stabili e recupero di esiti ambigui. Il worker proposalOnly usa le bozze disponibili e avvia i job necessari tramite le guardie budget esistenti; non organizza documenti e non crea oggetti/spese/contatti. Analisi fallite/incerte richiedono intervento esplicito dal documento; correzioni manuali salvate conservate.

Verifiche offline: 68 test frontend distinti interessati (revisione unica, vecchio intake, UI selezione/consenso, mapping, recupero rete), 19 test DB automatic-intake con provider finto e case nuovi solo proposte, nessuna scrittura canonica, replay e budget esaurito. Build frontend/backend e lint dei file modificati. Primo test di tipo non riconosciuto corretto nella fixture perché una bozza completamente vuota non abilita Salva; ora rappresenta il caso con documento e classificazione non supportata.

Browser reale: Documenti desktop e390px, selezione4 fonti e annullamento, consenso rimasto non spuntato e nessun invio. Screenshot outputs/document-bulk-ai-20261018/desktop.png e mobile.png. Nessuna modifica alle entità reali, nessun costo AI, nessun cambiamento a env/modello/limiti/firewall. I contenuti della schermata del committente non sono stati confermati dall’agente.
