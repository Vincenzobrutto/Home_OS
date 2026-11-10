# Agenzie — autorizzazioni e budget condiviso

## Implementato, nessuna spesa attivata

Schema additivo AgencyAiBudget e AgencyPlanAuthorization. Solo cluster temporanei di test migrati. Nessuna riga budget/autorizzazione creata nel prodotto, nessun endpoint di provisioning, nessuna AI o nuova autorizzazione di spesa reale. La prova privata sul PDF rimane separata e il relativo budget non viene riutilizzato.

Budget legato all'agenzia, con tetto, impegno, spesa, scadenza e revoca. Valori finanziari DB in BIGINT microUSD: i costi superiori alla riserva vengono registrati anche oltre il tetto, senza perdere il dato per una piccola colonna Int. Il tetto configurabile per nuova riga è al massimo1000USD; non è un credito preconcesso. Non si aumenta o resetta un budget esistente: eventuali nuovi stanziamenti richiedono nuove autorizzazioni esplicite e future procedure.

Autorizzazione vincolata a pratica, account, prova fonte/versione/SHA/pagina, modello e prezzi immutabili, cap per-run e scadenza. approvalReceipt e runId unici globalmente: la stessa approvazione non può finanziare due pratiche e la stessa autorizzazione non viene spostata. Nel DB FK verso budget/pratica/account; il controllo di appartenenza dell'agenzia è applicato dall'adapter, anche a righe provisionate in modo incoerente.

Enqueue ora richiede una riga server già emessa. In una sola transazione: permessi/fonte correnti, lock pratica → budget → autorizzazione, verifica scope/prezzi, cap globale disponibile, bind run e incremento dell'impegno globale, creazione job. Il replay esatto non impegna una seconda volta. Due pratiche concorrenti con lo stesso budget non possono oltrepassare il tetto in enqueue.

Claim e prenotazioni verificano anche scadenze/revoche di budget e autorizzazione, binding al run e assenza di sforamento globale. Accounting con capability rimane possibile dopo revoca, registra spesa una sola volta e conserva il tetto impegnato finché l'esito non è concluso. Se la spesa supera il tetto del run, l'impegno cresce fino alla cifra effettiva e blocca nuovi impegni quando il budget globale è superato. Nessun reset o rilascio automatico per errori/rete incerta.

Il completamento attuale del job, dopo entrambe le fasi contabilizzate, chiude l'autorizzazione e riduce soltanto la quota nota inutilizzata; spesa e residuo restano sul budget condiviso. Questa chiusura deve ancora essere collegata atomicamente al risultato validato della pipeline: non è una prova che la geometria sia salvata.

CHECK e trigger DB impediscono valori negativi, diminuzione della spesa, modifica di scope/cap/prezzi/prova o riapertura di revoche e autorizzazioni chiuse. Nessuna garanzia sostituisce i permessi del database: un amministratore DB resta una figura fidata. La migrazione è presente nel branch, non applicata a database esistenti.

## Limiti prima di collegare il provider

Le righe issued vengono provisionate soltanto dalle fixture sintetiche: mancano operazioni applicative di approvazione e audit dell'operatore, selezione del budget/consenso nel prodotto e lifecycle dei residui. Non costruire un controller che accetti cap, prezzi o approvalReceipt liberi dal browser. Il registro ora fa rispettare un'approvazione provisionata; non può provare che una stringa di fixture corrisponda a una volontà reale.

Restano capability recuperabile nel worker, coordinatore che colleghi raster/pipeline/ledger, risultati intermedi e finali persistiti, trasporto provider testato offline, completamento atomico risultato/job e API sessione/CSRF. Nessuna coda o scheduler avviati. Nessun retry automatico degli incerti e nessun handover di lease senza fencing.

## Casi di prova

Gara fra pratiche per un budget insufficiente a entrambe, rollback completo del perdente, replay senza doppio impegno, vincolo pratica/agenzia/prezzi, receipt unico globale, settlement duplicato, rilascio dopo completamento noto, blocco dopo revoca/scadenza con accounting tardivo ancora possibile, sforamento effettivo registrato e blocco dei nuovi run. Profilo DB combinato include anche le verifiche del job precedente con autorizzazioni provisionate esplicitamente.

## Aggiornamento coordinatore
La chiusura del budget nello store ora avviene con completePlanJob e registrazione del risultato nella stessa transazione. Il percorso finish senza risultato è rimosso. Budget e consensi applicativi non sono provisionati, nessuna AI attiva. [Report](agency-plan-worker-v1.md).
