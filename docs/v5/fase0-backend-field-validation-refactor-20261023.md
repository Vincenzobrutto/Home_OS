# R04 — validazione dei campi backend separata

Seguito: [quantità, prezzo articolo e totale documento separati nel lotto successivo](fase0-backend-purchase-validation-refactor-20261023.md). Le verifiche sottostanti descrivono il primo lotto del validatore dei campi.

23 ottobre 2026. Branch codex/fase0-ai-quality-v3, base 52de871dd643da84e8cbd42aeca788212016ce37; fetch iniziale, HEAD/upstream 0/0. Lotto circoscritto del piano di audit. Applicata la procedura simple-refactor già letta dalla libreria proflead/codex-skills-library; nessuna nuova installazione.

## Implementato e verificato

Estratto validateProductField in backend-v5/src/object-onboarding/field-validation.ts. Il modulo valida struttura, limiti, normalizzazione NFC, citazione, corrispondenza letterale, significato e calendario delle date, limite temporale Europe/Rome e unità di misura. Ordine dei controlli, esiti e codici conservati. Non aggiunte regole legate a documenti personali.

L’orchestratore mantiene ordine di visita, campi null ignorati, posizione diagnostica, politica di rifiuto del nome e degradazione dei campi facoltativi a revisione. La lettura dell’evidenza resta nel dominio e viene passata al validatore: snapshot, versione/SHA, pagine ammesse e regioni non si ricostruiscono nel nuovo modulo. ProductEvidenceFailure è una sola classe, riesportata dal percorso pubblico precedente; instanceof, field, reason e code rimangono disponibili anche alle altre verifiche di quantità/importi.

Il nuovo modulo importa dal dominio soltanto tipi, evitando un ciclo runtime. La classe di errore è spostata insieme al validatore e riutilizzata dal dominio, senza duplicati. Nessuna modifica a schema, endpoint, conferme, transazioni o controlli di autorizzazione. Il registro dei sorgenti per le **future** autorizzazioni qualità include il nuovo file; un hash alterato viene rifiutato prima del dispatch. Ricevute, ledger e campagne storiche non riscritti; questa modifica non autorizza alcuna campagna.

## Verifiche offline eseguite

| Verifica | Esito |
| --- | --- |
| Build TypeScript e lint backend-v5 | superati |
| npm run test:object-onboarding | **295/295**, 19 file, 19,14 s |
| npm test | **214/214** |
| authorization + runner + model + measures + score | **25/25** |
| Confronto differenziale del dominio prima/dopo | **8.316/8.316**, 4.345 accettati e 3.971 rifiutati |
| Corpi delle altre funzioni del dominio | 7 identici |
| Grafo import runtime V5 | nessun ciclo |

Il confronto usa il sorgente della base, trasposto in memoria con TypeScript e le stesse dipendenze, contro il dist ricostruito. Copre 14 campi, tre modalità di evidenza, nove famiglie documentali e 22 varianti: valori/limiti errati, fonti assenti o contraffatte, pagine e regioni errate, date ambigue/future, unità, spazi e Unicode; pagine ammesse alternate. Orologio fissato al 23 ottobre 2026, ore 12 UTC. Confrontati oggetti, JSON serializzato, classe/codice/field/reason e diagnostica degli errori, oltre agli effetti sull’input. Gli stack riflettono la nuova posizione del codice e non sono un contratto confrontato. Si tratta di risposte costruite offline, non di una nuova misura di accuratezza AI.

Il confronto ha intercettato una corruzione del trattino Unicode introdotta durante la formattazione: corretta prima della consegna, con regressione permanente per intervalli di tensione e unità. I quattro nuovi test verificano inoltre identità pubblica della classe, precedenza struttura/evidenza, conservazione della diagnostica della regione e ordine degli avvisi. Inclusi nel comando onboarding, senza modificare le asserzioni precedenti. Aggiunto un test di hash obsoleto nelle autorizzazioni.

Le suite sono eseguite con preload locale che blocca fetch e aperture socket TCP/TLS. Nessun AI, email o DB, neppure temporaneo; nessun originale personale letto. Invariati i corpi di region, evidence, productCandidates, productChoices, productConfirmation, billAmountEvidence e readHouseExpenses. Servizi e bozza UI esistenti non toccati.

## Limiti e seguito

R04 è **parzialmente affrontato**: conclusa la separazione della validazione del singolo campo. Quantità, prezzi, riepiloghi e conferma transazionale restano negli orchestratori attuali. Nessun beneficio di velocità o maggiore accuratezza dichiarato: il risultato è una responsabilità più facile da leggere e verificare.

Suite HTTP/DB non ripetute: percorsi persistenti e transazione non modificati; le precedenti prove di privacy/idempotenza restano storiche. Frontend invariato, mock non ripetuta: ultimo risultato storico 858/858 nel precedente report R03. Prima di separare la conferma occorrono regressioni su ripresa, revoca, parzialità e idempotenza in un DB temporaneo dedicato. R07 (ingresso offline uniforme) resta il prossimo lotto possibile; nessuna ottimizzazione batch senza misurazioni.

Conservati main, .env, migrazioni, gold, ledger storici, DB reale e 104 StoredFile orfani. Esclusi dal commit i dirty legacy preesistenti e tutti gli untracked estranei. Commit/push sul solo branch Fase 0 e confronto HEAD remoto fanno parte della consegna; l’hash definitivo è riportato nel messaggio di consegna.
