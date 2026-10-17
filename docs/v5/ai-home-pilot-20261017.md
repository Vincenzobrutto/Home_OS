# Analisi AI per uso pilota — 17 ottobre 2026

Autorizzazione del committente: 5 USD complessivi, massimo40 analisi Anthropic dei documenti della propria casa; consenso nell'app prima dell'invio. Nessun rinnovo automatico. Implementata modalità home limitata alla coppia account/casa configurata sul server; consenso e accesso all'originale restano necessari. Modalità collaudo SHA esistente conservata; scope incompleto/non riconosciuto rifiutato, nessun fallback permissivo.

## Limiti e verifica

Campagna persistente `onboarding-home-pilot-20261017`, limite5000000 microUSD, massimo40. Prenotazione0,25 USD prima dell'invio, importo effettivo sostituisce la riserva quando verificato; invii incerti mantengono riserva e consumo della chiamata, nessun secondo invio automatico. Lock di campagna e limiti persistiti impediscono sforamento concorrente o azzeramento al riavvio. L'app mostra residuo e numero analisi, blocco distinto per budget e numero massimo. 40 è un massimo, non una promessa di40 analisi entro5 USD.

Configurazione locale aggiornata senza stampare chiavi; un solo ingresso paid attivo, gli altri disabilitati. Era ancora presente il flag M4 del collaudo storico: spento senza riavviare quelle analisi. Modello Sonnet5.5 verificato con GET dei metadati, zero Messages e zero documenti inviati. Tariffa2/10 USD per milione token input/output verificata su https://platform.claude.com/docs/en/about-claude/pricing . Il tetto si riferisce a questa campagna Dimora e non ad altri usi dell'account Anthropic.

23 test offline e23 DB/HTTP verdi con provider simulato. Nuove prove: account/casa diversi negati, scope parziale/non valido negato, consenso assente zero riserve, persistenza nuova istanza, esito incerto blocca nuovo avvio, limite5 USD e40 chiamate, due riserve concorrenti per l'ultimo posto con una sola accettata. 34 FE verdi per onboarding/intake e5 per il raccordo dei tipi; budget visibile, consenso inizialmente vuoto, esaurimento non offre invio. Build backend/frontend e lint frontend verdi. Corrette anche le mappature canoniche order_confirmation→purchase_order e device_label→product_label nel raccordo con l'archivio, senza nuova estrazione.

API riavviata con launcher registrato, frontend PC e Wi-Fi disponibili. Prima dello svuotamento osservato nel browser reale budget5.00 USD e0/40; nessun click di analisi dell'agente. Una nuova analisi effettiva resta all'azione/consenso del committente.

## Svuotamento richiesto e confermato

Il committente ha confermato la cancellazione definitiva di10 documenti,3 oggetti,2 spese e analisi/bozze collegate di Appartamento Roma. Eseguita transazione serializable limitata a quella casa con controllo proprietario, conteggi autorizzati, assenza analisi attive, dipendenze FK, isolamento dalle altre case e preservazione anagrafica/membership. Rimossi10 originali dal solo storage privato V5, dopo verifica percorsi e assenza riferimenti esterni. File originali personali fuori dall'app non toccati.

I ledger dei vecchi collaudi collegati ai documenti sono rimossi con le analisi; conservato riepilogo contabile senza contenuti dei documenti nel rapporto locale di esecuzione e chiuse a limite0 le sole vecchie campagne coinvolte (nessun credito reso nuovamente spendibile). Nuova campagna5USD/40 integra, zero invii. Questo è uno svuotamento operativo una tantum autorizzato, non una funzione generale di cancellazione rilasciata nell'app. Altre case e account preservati. Script e ricevuta locale: outputs/Dimora-V5-Svuota-Roma-20261017.cjs e outputs/Dimora-V5-Roma-svuotamento-20261017.json, fuori dal repository.

Nessun push/deploy, nuove dipendenze o migrazioni. La conferma oggetti/costi resta sempre distinta dal consenso al provider.
