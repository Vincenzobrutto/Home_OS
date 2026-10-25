# Cestino documenti — chiusura integrata, 25 ottobre 2026

## Incarico e candidato

Il committente chiede di completare il cestino per collaudarlo insieme all'ultimo rilascio. Branch proprio `codex/cestino-chiusura-20261025`, worktree nuovo dal consolidamento `390b1cb`; registrazione `57d3709` prima dell'integrazione e del codice. Nessuna scrittura nei branch o checkout Claude, nessun merge del cestino nel consolidamento durante la preparazione.

Il candidato include con merge, senza rebase, il backend Claude `73288e5` e il frontend `7586806`, più le correzioni indipendenti già consegnate nelle PR #31 (`a2b5c89`) e #32 (`942b705`). Conserva quindi anche l'ultimo rilascio delle PR #39/#40. I quattro contributi e il consolidamento sono antenati della punta del lotto: nessun cherry-pick parziale o ricostruzione del solo codice finale.

## Comportamento e rilievi chiusi nel candidato

- Solo il caricatore può spostare o eliminare il proprio documento; ogni membro vede il proprio cestino. Essere proprietario della casa non concede accesso agli originali privati altrui.
- Permanenza di 30 giorni, ripristino esplicito, eliminazione immediata e svuotamento con conferma. Il ripristino non riattiva condivisioni revocate. Analisi in corso impediscono lo spostamento.
- Un documento nel cestino è escluso da letture, ricerca, export e proposte. I valori già confermati nelle schede restano quando autorizzati; le citazioni di una fonte non disponibile vengono oscurate. Proposte e confronti richiedono sempre fonti attive e versione/SHA correnti.
- D1: ordine dei lock delle condivisioni e anteprime, scadenza persistita post-commit e replay legato allo stesso ciclo di vita; nessun retry per nascondere deadlock.
- D2: pagine backend da massimo 500 elementi, cursore vincolato a account/casa; il frontend pubblica un elenco completo oppure un errore, senza presentare conteggi parziali allo svuotamento.
- D3/D4: profilo confermato distinto dalle citazioni attive, provenienza canonica conservata durante edit non correlati, ricontrollo fresco delle prove prima dell'export. Restano i rifiuti su fonti private altrui.
- E1: l'avviso Annulla viene scartato quando si cambia pagina e non ricompare tornando indietro. Le mutazioni conservano chiavi/versioni; il menu resta utilizzabile anche se il cestino non risponde.

Riferimenti dettagliati: [correzioni backend](cestino-correzioni-backend-20261025.md), [correzioni UI](cestino-correzioni-ui-20261025.md), [lotto backend](cestino-lotto1-report-20261023.md), [lotto frontend](cestino-lotto2-report-20261023.md). Il ciclo dei backup, eliminazione di schede/case/account, file orfani e qualità AI restano fuori da questo lotto.

## Integrazione e nuove prove

Conflitti nei documenti condivisi e nel test duplicato degli orologi. Nel test rimane la guardia aggiuntiva che accetta soltanto il DB offline. Una prima risoluzione locale si è interrotta perché confrontava anche una riga di roadmap legittimamente aggiornata dal merge automatico; il comando successivo ha registrato segnaposto di conflitto nel commit intermedio locale `4a6fcbb`. I documenti sono stati ricostruiti dai genitori originali e verificati prima del merge finale `8d21c7a` e di qualsiasi test o push. Nessun segnaposto rimane nel candidato verificato; nessun prodotto intermedio è stato avviato nell'app.

I sette file backend di test/guardia del cestino hanno lo stesso blob Git della PR #31; i tre file UI di test hanno lo stesso blob della #32. Nessuna asserzione, gold o timeout di tali riproduzioni modificati. Le fixture di pagamento e membership corrette nell'ultimo rilascio restano invariate rispetto a `390b1cb`.

Nuovo profilo protetto `test:cestino-completo-db`: riunisce tutte le riproduzioni indipendenti e le prove del cestino su un cluster nuovo; resta separato dall'aggregato storico. Nuovo caso nel contratto della bolletta: conferma → cestino → replay dello spostamento → ripristino → replay del ripristino. Verifica invisibilità nel cestino, ritorno fra i completati con tipo Bolletta, una sola spesa identica e nessun oggetto, fonte non accessibile all'altro account, nessun consumo AI o accesso fisico allo storage. Le altre asserzioni del test preesistente non cambiano. Candidato finale `79b6ec3`: il nuovo caso è stato aggiunto prima dell'avvio dell'aggregato DB; non è selezionato dai profili unitari o dalle 42 prove specifiche già avviate. Dopo questa punta cambiano soltanto documenti e istruzioni di test.

## Risultati offline

- Ordinari backend **299/299**, onboarding **313/313**, guardie **12/12**, lint e build superati.
- Profilo completo cestino **42/42**, zero fallimenti o test saltati, cluster nuovo `t25c/dimora-offline-nBVtDg` poi arrestato.
- Aggregato DB **564/564**: 54 HTTP, 508 diretti, 2 dopo riavvio PostgreSQL; zero fallimenti, cancellazioni o test saltati. Cluster nuovo `t25c/dimora-offline-Ef4Xbz`, arresto verificato e porte offline3119/55439 libere. Il nuovo ciclo bolletta/cestino/ripristino è incluso e verde. Nessuna ripetizione dell'aggregato necessaria: prima esecuzione completa verde.
- Suite mock frontend completa **1127/1127 in 127 file**, zero fallimenti o test saltati, un worker e retry0; durata 866.45 secondi. Include i 18 casi UI del cestino (9 originali, 5 riproduzioni indipendenti, 4 sulla continuazione), tutti invariati, e tutti i percorsi dell’ultimo rilascio. Prima esecuzione completa verde.

Typecheck, lint e build frontend superati; fixture PDF/OCR **5/5**. Dipendenze installate dalla sola cache locale con script/audit/fund disabilitati; nessuna dipendenza aggiunta o aggiornata.

Runner ufficiale, PostgreSQL esplicito, scratch corta `C:/Users/07704017/Documents/Codex/t25c`; cluster nuovi in sequenza. La migrazione del cestino viene applicata soltanto ai DB temporanei vuoti. Il frontend completo viene verificato dopo l'arresto dei cluster, con ambiente depurato, envDir vuota, dipendenze dalla sola cache, retry 0 e un worker. Nessun browser alternativo o origine alternativa per aggirare il blocco già riscontrato.

## Peso della build

Confronto con il frontend integrato `390b1cb`: entry JS da 486791 a **490981 byte** (+4190; gzip livello9 da148391 a149771, +1380). DocumentsPages +419 byte; nuovo chunk TrashPage3898 byte (1661 gzip). IntakePage, OnboardingPage e PDF invariati in byte; 17 asset OCR invariati per31899517 byte. Le mappe dell'entry non contengono i moduli pesanti PDF/OCR/onboarding ricercati. Sono misure di file, non tempi di caricamento, traffico o RAM osservati nel browser. Nessun refactoring speculativo per ridurre i controlli. Evidenza locale `work/cestino-close-bundle.json`.

## Attivazione e collaudo nell'app

La migrazione additiva `20261023200000_document_trash` aggiunge lo stato di ciclo di vita, TrashRequest e DeletionRecord con relativi vincoli. Non basta aggiornare il solo frontend: l'API oggi avviata è ancora `112ad051` e non espone queste API. Nessuna migrazione, lettura o scrittura del DB reale è stata eseguita da questo lotto; il frontend dell'ultimo rilascio e i suoi processi restano invariati.

Per il collaudo sulla casa Roma occorrono, dopo la revisione del candidato concreto: approvazione dell'integrazione, autorizzazione specifica a backup verificato e migrazione del DB applicativo, build/avvio dell'API integrata e frontend allineato. La preparazione del nuovo avvio deve aggiornare la prova degli hash e la guardia dei worker, includendo TrashService: non avviare il vecchio launcher su codice diverso, né attivare implicitamente provider o code pregresse. Nessun `.env` da modificare. L'eventuale sospensione della scadenza automatica durante il collaudo va dichiarata esplicitamente; non promettere eliminazioni a server spento o un ciclo di backup già implementato.

Checklist del collaudo successivo, su un documento scelto consapevolmente: controllare anteprima e dati confermati; spostare nel cestino; verificare assenza dall'archivio e presenza nel proprio cestino; ripristinare e controllare collegamenti/spesa invariati. Eliminazione definitiva e svuotamento sono prove separate e irreversibili, da eseguire solo su materiale predisposto per la prova. Nessun documento viene scelto, caricato o eliminato automaticamente da questo incarico.

Evidenze nel task: `work/cestino-close-*.log`, JSON Vitest e `work/cestino-invariants.cjs`; log DB nelle cartelle del runner. Nessun originale o contenuto personale nel repository.
