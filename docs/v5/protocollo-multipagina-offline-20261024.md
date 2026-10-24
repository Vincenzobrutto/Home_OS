# Protocollo multi-pagina — verifica offline del 24 ottobre 2026

## Incarico e perimetro

Lotto autonomo successivo al collaudo Roma: diagnosi del rifiuto HTTP 400 e riduzione delle duplicazioni del protocollo, senza nuove chiamate AI o retry dell'esito incerto. Base remota consolidata `703cac42b36a3abb3f10a29339a201f0de46ad45`, nuovo worktree `Dimora-V5-protocollo-multipagina-20261024`, branch `codex/protocollo-multipagina-20261024`; registrazione prima del codice nel commit `47f7376`.

Area limitata a `provider-schema.ts`, identificatore del protocollo in `provider-prompt.ts` e test Q48. Nessun intervento su dominio, decoder, copertura delle pagine, conferme, accessi, worker, budget/ledger, schema Prisma, frontend o file modificati da Claude. Nessun deploy nell'ambiente applicativo reale.

## Diagnosi e correzione

Nel protocollo precedente la stessa struttura completa di spesa era serializzata una volta in `houseExpenses` e una volta per ogni pagina dentro `invoicePages.pN.expenses`. Il percorso multi-pagina moltiplicava campi e livelli anche quando non aggiungeva regole diverse. Questa duplicazione è verificabile offline; **non prova da sola la causa specifica del 400 Samsung**, il cui corpo non è stato letto per evitare l'eco di contenuti personali.

Ora il solo schema visuale con pagine esplicite definisce `definitions.invoiceExpense` una volta e usa riferimenti locali `#/definitions/invoiceExpense` nelle stesse posizioni. Non cambia il JSON richiesto al modello: stessi nomi, ordine dei campi, enumerazioni, campi obbligatori, `additionalProperties:false`, importi, prove e slot fisici. La rappresentazione delle risposte, il decoder e le validazioni di dominio sono invariati. Gli schemi testuali, immagini e PDF a pagina singola senza slot espliciti restano identici.

I riferimenti locali sono supportati dalla [documentazione Anthropic Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), che descrive anche limiti interni della grammatica. La riduzione dei byte non è una misura di latenza né una certificazione della compilazione remota. Nessuna soglia arbitraria basata sui soli esempi o su limiti di altri fornitori.

Il protocollo è identificato come **document-understanding-v30-shared-expense-grammar**: l'identificatore distingue le nuove preparazioni da quelle precedenti. Il testo base di estrazione rimane identico; il corpo dello schema multi-pagina incorporato cambia. Le guardie delle future autorizzazioni continuano a congelare prompt, schema e decoder; nessuna autorizzazione storica rigenerata o ampliata.

## Riscontro locale sui documenti forniti

Preparazione ricostruita con il parser reale e un trasporto fittizio, con `fetch` vietato. Nessun documento caricato, nessun token count o invio al provider, nessuna connessione al DB reale. Nel repository non entrano originali, testo, payload o risposte; sono conservate soltanto misure aggregate.

| Preparazione | Prima | Dopo |
| --- | --- | --- |
| Caffè: schema, una pagina visuale | 4.625 byte, 53 proprietà | identico |
| Samsung: schema, due pagine visuali | 6.838 byte, 80 proprietà, profondità JSON 12 | 5.321 byte, 60 proprietà, profondità JSON 8 |
| Samsung: prompt sistema preparato | 26.169 byte | 24.652 byte |
| Samsung: messaggi con documento | 327.455 byte | identico |

Si tratta di dimensioni di serializzazione, non di una stima della grammatica compilata da Anthropic. Con 20 pagine lo schema passa da 25.832 a 10.005 byte, senza perdere gli slot richiesti. Il risultato reale Samsung resta HTTP 400/uncertain e non viene ritentato. La nuova accettazione remota è **non verificata**; l'esito caffè precedente e la sua bozza non sono modificati.

## Verifiche

- Prima della modifica: due nuovi gruppi unitari falliscono perché manca la definizione condivisa; gli altri sette test Q48 passano.
- Dopo la modifica: onboarding offline **313/313**. I nuovi controlli espandono tutti i riferimenti e confrontano l'intero schema con quello precedente per ciascuna selezione da 1 a 20 pagine; verificano anche isolamento fra preparazioni, struttura stretta e assenza di nuovi rami nullable. Il test preesistente degli slot non contigui mantiene le sue asserzioni sullo schema espanso.
- Gold Q48 e sue asserzioni invariati: due fatture, due importi distinti, copertura esplicita per pagina, nessuna fusione o somma arbitraria. Restano rifiutati slot mancanti/extra, prove incrociate, spese duplicate, totali globali indebiti e promozione automatica.
- Aggiunta una prova HTTP/DB sintetica con i servizi reali e trasporto fittizio: metadata e conteggio passano, Messages risponde 400; contenuto dell'errore mai letto, attempt/job incerti, prenotazione conservata, nessuna bozza/oggetto/spesa/contatto. Replay idempotente, nuova chiave e nuovo client non causano altri invii; altro owner non legge la fonte privata.
- Profilo DB mirato `test:q48-coverage-db`: **39/39**, incluso il nuovo caso di rifiuto. Cluster `tm/dimora-offline-TLZt0I`, poi arrestato; nessuna rimozione di file.
- Ordinari: **233/233** nella ripetizione con permessi per i listener propri; qualità offline **24/24**, guardie di autorizzazione **18/18**, build/lint superati. Aggregato `test:offline-db`: **498/498**, 54 HTTP + 442 diretti + 2 dopo riavvio PostgreSQL; cluster nuovo `tm/dimora-offline-GeIoZm`, arrestato dal runner. Nessun altro cluster di test simultaneo.

Un primo lancio ordinario nel sandbox ha prodotto 232/233: fallisce il test che deve aprire un listener HTTP loopback proprio. Nessuna asserzione o guardia è stata modificata; la ripetizione con i permessi appropriati va rendicontata separatamente. I DB vengono collaudati solo con runner offline, cluster nuovi e scratch corta, uno alla volta.

## Chiusura e residui

Report/stato/roadmap/changelog e push del solo branch del lotto; PR verso il consolidamento, senza merge. Ambiente reale e file locali sporchi preservati; nessuna `.env`, AI/email, migrazione reale, quota, gold o ledger storico modificati. Nessun reset/clean, force push o rimozione worktree.

Resta aperta la causa esatta del 400: non viene dichiarata risolta attraverso un test con risposta fittizia. Un eventuale invio futuro del protocollo v30 richiede un incarico specifico con documento, budget e limiti; non è un retry automatico e non può consumare la prenotazione incerta precedente. Il merge resta al committente.

Log locali nel work del task: multipage-red.log (7 verdi e 2 nuovi rossi prima della modifica), multipage-onboarding.log, multipage-unit.log (primo sandbox), multipage-unit-final.log, multipage-quality.log, multipage-guards.log, multipage-lint.log, multipage-q48-db.log e multipage-offline-db.log. Misure aggregate in multipage-schema-measures.json e multipage-real-preparation.json; nessun payload o dato reale aggiunto al repository.
