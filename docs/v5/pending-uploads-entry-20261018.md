# Da completare in Documenti — 18 ottobre 2026

Accesso visibile accanto a Carica documenti. La lista si apre inline prima della ricerca; contiene i caricamenti personali aperti e non vuoti, con data/ora/numero file. Ogni link apre il lotto esistente in documenti/organizza?lotto=..., senza crearne un altro né avviare analisi. La revisione e gli eventuali esiti automatici conservano il proprio comportamento. Stati caricamento, errore riprovabile e nessun caricamento espliciti; query separata per account/casa e paginazione.

Filtro state=open|completed aggiunto alla lista esistente, applicato prima della paginazione. Compatibilità lista senza filtro e cursori precedenti; nuovi cursori legati al filtro. Nessuna migrazione, dipendenza, consenso aggiuntivo o modifica budget.

Verifiche:16 HTTP/DB upload compreso filtro aperti/completati/vuoti/altro account e input invalido;5 test frontend (3 nuovi navigazione/lazy read/paginazione/ripresa senza POST/vuoto/errore e2 client esistenti). Build/typecheck e lint dei file modificati. Browser reale: presenza dell’accesso, lista caricamenti e mobile390/320 senza overflow. Nessun documento personale o AI modificato dalle prove.

API locale riavviata, frontend HMR. Dirty estraneo conservato; nessun push, reset demo, modifica env/modello/limiti/firewall.
