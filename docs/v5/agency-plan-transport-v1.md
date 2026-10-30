# Agenzie — porta HTTP provider, verificata senza rete

`createPlanHttpTransport` implementa la porta richiesta dal provider planimetrie. Tutto iniettato: flag dedicato, lettore credenziale, callback autorizzativa fresca e funzione fetch. Nessuna lettura env o riuso del consenso/configurazione M4/Home. Costruirla non chiama la rete; nessuna istanza registrata in AppModule o nel worker prodotto.

Solo POST verso due endpoint HTTPS fissi Anthropic: conteggio token e messaggio. Nessun URL del client, redirect, retry, cookie o endpoint alternativo. Body JSON limitato24MiB. Riautorizza **ogni** richiesta, compreso il passaggio dal conteggio all'invio; ricontrolla il flag dopo l'attesa autorizzativa. Il callback futuro deve verificare il contesto worker/pratica/fonte/budget corrente. Una revoca dopo il controllo può comunque arrivare mentre la richiesta è in volo: il ledger e il controllo post-risposta gestiscono questo caso.

Timeout fino20secondi per conteggio e90per messaggio, signal anche durante lettura response. Output JSON letto a stream con cap2MiB effettivi, indipendente da Content-Length; UTF8/JSON invalidi rifiutati, stream cancellato sui limiti. Error body provider non letto né riportato: potrebbe contenere documento o credenziale. Errori di rete/configurazione non mantengono diagnostica grezza. Esito incerto del messaggio è distinto dall'assenza di un dispatch di messaggio per il conteggio; il coordinatore resta conservativo e non ritenta.

Credenziale recuperata soltanto con flag acceso e autorizzazione superata; errori del secret store sono sanitizzati. Il test usa una stringa dichiaratamente sintetica e fetch finta. Nessun invio al dominio reale durante l'incremento, nessuna chiave/file personale letto, nessun budget reale attivato.

Verifiche dedicate: disabilitazione, scope endpoint, autorizzazione per entrambe le chiamate, flag cambiato durante verifica, un solo tentativo su rete/timeout, mapping errori senza leggere body, stream/content-length/UTF8/JSON e payload invalidi. Il primo fixture positivo aveva Content-Type testuale predefinito di Response: corretto a application/json, mantenendo la policy di rifiuto dei contenuti non JSON.

Rimane da collegare questa porta alla factory del coordinatore con segreti/configurazione e approvazioni reali: **non attivo**. Nessun collaudo contro API esterna, contratto provider live o prezzi live. Prossimo task API AgencyPractice con sessione/CSRF, DTO stretti e prove HTTP offline; poi UI pratica. Non abilitare chiamate automatiche con il budget sperimentale già impegnato.
