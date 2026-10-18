# Bolletta manuale — correzione del percorso, 18 ottobre 2026

Problema riprodotto dalle schermate del committente: la scelta «Bolletta» aggiornava la classificazione locale, ma la bozza generica continuava a contenere Articolo 1. Togliere «Conserva solo il documento» esponeva quindi il modulo oggetto.

Ora la scelta converte la stessa bozza manuale vuota nel percorso utility_bill, con items vuoti e una proposta di spesa casa. Il cambio è versionato e idempotente, senza creare entità canoniche. Il frontend allinea anche una vecchia bozza generica quando esiste già organizzazione personale Bolletta. Non converte automaticamente dati estratti AI o input salvati: in questi casi preserva la bozza e mostra il conflitto. Le conferme pendenti restano intatte e recuperabili con la stessa richiesta.

La bolletta manuale apre direttamente importo editabile, data, fornitore e categoria della bolletta (elettricità, gas, acqua, internet/servizi); niente selezione di un totale estratto inesistente, niente scheda Oggetti. La spesa usa objectRef null e i controlli canonici dei doppioni. Default di questa bozza: revisione della spesa; «Conserva solo il documento» può ancora escluderla senza compilare importo/data/categoria. Conferma server e passaggio successivo invariati.

Verifica: build frontend/backend e lint mirato; 69 test frontend riusciti, con ulteriori 3 ripetuti dopo la correzione della concorrenza fra selezione e allineamento; suite frontend di onboarding/revisione/HouseExpenseProposal/classificazione e nuovo ManualBillFlow (scelta esplicita, tipo preesistente, documento soltanto). Suite DB object-onboarding + document-only: 37 test passati, parser reale e provider finto. Coperti costo/importo/fornitore, assenza oggetti, replay, versione, protezione input/pending e solo documento. Corretto il teardown della fixture per rimuovere la sua DocumentOrganization prima del documento. Nessun invio AI live e nessun salvataggio di dati finanziari personali nel browser; verifica visiva su nuova fixture sintetica in COLLAUDO V2.

Nessuna migrazione. Rimangono locali ed escluse le tre differenze legacy già documentate. Le schermate personali fornite dal committente non vengono copiate nel repository.

Screenshot della prova in outputs/bolletta-manuale/campi-spesa.png della chat: quattro campi visibili, nessun Articolo 1. Verificato anche che la checkbox solo documento nasconda i campi della spesa; nessun costo personale o sintetico confermato tramite browser.
