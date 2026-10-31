# Preparazione dati incarico — modello ancora assente

30 ottobre2026. Steering esplicito di Vincenzo: scegliere il percorso documento→analisi→verifica→bozza. Alla domanda sul modello incarico ha risposto Non ancora. Questo incremento rende concreta la preparazione dei dati, non completa l'analisi AI atti o la produzione di un documento contrattuale.

## Implementato e collegato

Pannello Prepara dati incarico nel contenitore della pratica. Legge GET review e findings esistenti, richiede revisioni coincidenti; nessuna nuova route o mutazione backend. L'agente sceglie unità e riferimento soggetto esatti, poi massimo30fatti confermati con valore corrente non nullo. Proposti/rifiutati/stale esclusi; false rimane valore booleano valido. Un solo valore per campo per quella destinazione, nessun matching o conferente attuale dedotto dal nome storico.

Mostra valore corrente, origine dichiarata/estratta/correzione, versione del dato, prove/versione/pagina e callback fonte autorizzata del contenitore. Note leggibili dell'unità e confronti del soggetto/periodo restano visibili come questioni, con stato distinto. Nessuna lista vuota indica fascicolo completo o conformità. Selezione locale esplicitamente non salvata/esportata; non è il pacchetto interno export del backend né mapping su un modello approvato.

Modello dell'agenzia da ricevere e Genera bozza · manca il modello disabilitato anche dopo selezione. Nessuna clausola, ruolo attuale, quota giuridica o obbligatorietà dei campi inventati. Prima della vera generazione servono modello versionato, mapping/regole approvati dall'agenzia e validazione server di autorizzazioni/prove/versioni/export. La selezione stessa non conferisce permesso export e non crea incarichi.

## Verificato

13nuovi casi:10workspace,2client,1contenitore. Gruppo finale150/150in18file, typecheck app/lint mirato verdi, nessuna regola disabilitata. Prima149prima del caso montato, poi150; rifiniti singolare/plurale e dipendenze memo, ultimo150/staticiverdi. Coperti filtro stati/null, duplicato campo, dichiarati/false, identità/periodo non dedotti, questioni aperte, selezione invalidata da reload/target/porta, diniego, fonte callback, GET scope e revisione mista409. Caso montato conferma tramite route review già esistente e prepara dati senza ulteriori POST; bozza resta bloccata.

Browser desktop/375su nuovo harness esplicitamente sintetico, non runtime fallback: scelta unità/soggetto e dato, fonte/questione aperta visibili, bozza non abilitata.375/client360/scroll360,0errori console. Tentativo di usare Tab su un bottone disabilitato non è stato eseguito dal browser: usato il paragrafo visibile per portare il blocco a schermo, senza forzare il controllo. Screenshot negli outputs Dimora-preparazione-incarico-desktop.png e375.png. Tab propria chiusa, viewport ripristinato, server34879fermato con assenza listener verificata.

Nuovo pannello non provato con API/DB reali in questo incremento; il collaudo reale precedente del fascicolo rimane distinto. Backend invariato/nonritestato. Nessuna AI/spesa, file personale, servizio esistente, modifica demo Alessio, merge o deploy.

## Lavoro residuo del percorso completo

1. Orchestrare analisi atti/OCR con consenso per fonte, job/ledger durevoli e provider dedicato; nessuna nuova chiamata a pagamento autorizzata da questo incremento.
2. Ricevere modello effettivo dell'agenzia e definirne placeholder/campi obbligatori, righe parti/unità, mapping e regole di provenienza.
3. Validazione server ed esportazione solo autorizzata di dati confermati attuali; bozza versionata e revisione dell'agente, firma separata.

Non dichiarare il punto3del percorso completo concluso: modello assente e nessun contratto generato. canGenerateDraft resta false.
