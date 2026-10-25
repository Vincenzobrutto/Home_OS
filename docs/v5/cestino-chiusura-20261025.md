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

## Pubblicazione

[PR #41](https://github.com/Vincenzobrutto/Home_OS/pull/41) unica verso il consolidamento, con push verificato mediante uguaglianza HEAD/git ls-remote. Al fetch di consegna il consolidamento resta390b1cb. Esito aggiunto come commento alle PR #9 e #16, distinguendo le loro punte invariate dalle correzioni presenti nel nuovo candidato. Non occorre approvare separatamente tutti gli antecedenti per valutare questo candidato completo. Nessun merge, migrazione o attivazione reale eseguito dal lotto; il passo operativo richiede ancora una decisione sul candidato concreto e sul perimetro DB.

## Attivazione autorizzata — 25 ottobre, verifica finale 15:11 UTC

Questa sezione aggiorna la consegna offline precedente. Il committente ha autorizzato espressamente integrazione, backup locale verificato di database e originali, migrazione additiva e aggiornamento API/frontend nella casa applicativa esistente. PR #41 integrata con merge **dc58adae2d5586ba6d659c113e1c4d2ac1db4fb2**, verificato con git ls-remote; main resta cdbb318ddb56e764ad4b111a71560e3e71c7a033 e i due branch Claude restano alle punte sopra riportate. Nessun force push, modifica di .env o rimozione di worktree.

Runtime dedicato Dimora-V5-runtime-cestino-20261025, sul merge dc58ada; build backend e frontend rifatte. Sottoalberi identici al candidato collaudato: backend c820d20f7d41320fae8558dfcee7298e3e395256, frontend 2b89dd0ec5254d7ced72a02fae01545a7dc5271d. La prova locale vincola 157 file JS compilati; nessuna modifica al dist. Configurazioni e manifesti operativi restano fuori da Git e non contengono credenziali nel report.

Backup locale backups/dimora-v5-cestino-20261025T150411Z: archivio PostgreSQL custom da 968487 byte, catalogo verificato e decodifica integrale con pg_restore verso NUL; 329 originali, 25733171 byte, copiati con SHA256 verificato per ciascuno. Non è stato eseguito un ripristino in un altro DB. API sospesa durante backup e migrazione, PostgreSQL mai fermato. I 104 StoredFile già privi di originale restano tali; nessuna pulizia o cancellazione. Manifesto privato e hash fuori repository.

Il controllo iniziale aveva fermato la procedura su due checksum storici: receipt_ai_budget e home_contacts. Le copie originali nel checkout storico corrispondono esattamente ai checksum registrati nel DB; confrontate con il runtime, differiscono soltanto per terminatori LF/CRLF misti, con testo SQL integralmente identico dopo la sola normalizzazione dei terminatori. Nessun checksum o record di migrazione modificato. Dopo questa verifica è risultata pendente soltanto 20261023200000_document_trash, applicata con migrate deploy; controllo finale: zero migrazioni pendenti.

Confrontate impronte e conteggi delle **66 tabelle preesistenti**, proiettando le colonne precedenti per escludere le sole aggiunte attese: invariati dopo backup, migrazione e avvio. Originali identici. I 436 documenti hanno lifecycleVersion1 e nessuno stato di cestino/purge; TrashRequest e DeletionRecord vuoti subito dopo la migrazione. Nessun oggetto, spesa, contatto, stanza, bozza o documento confermato, riclassificato o eliminato automaticamente durante l'attivazione.

Il primo tentativo di avvio ha ascoltato su loopback3001: l'override di app.listen non era applicato dal proxy Nest. Processo identificato e fermato prima del cambio frontend; verifica READ ONLY immediata: tutte le impronte e gli originali invariati. Guardia rafforzata con controllo diretto di net.Server.listen: non permette l'ascolto se non sono installate tutte le sette guardie worker e la protezione HTTP, e vincola la sola porta3011 su127.0.0.1. Nessuna modifica al prodotto o ai controlli di business. Un tentativo intermedio è stato respinto dal controllo restrittivo della porta; avvio finale verificato senza errori.

API finale PID7036 su loopback3011, frontend PID3884 su loopback5174, PostgreSQL preesistente PID22924 e identità di creazione invariati. Provider AI/email bloccati, chiavi provider rimosse dall'ambiente del processo, sette inizializzazioni dei worker e cleanup pregresse disattivate; classificatore locale limitato a una nuova coda interattiva, senza recuperare le code precedenti. TrashService attivo con scadenza30giorni; il timer opera solo mentre l'API è in esecuzione. Il ciclo dei backup resta un lotto separato.

Verifiche HTTP senza autenticazione né scritture: root/frontend e moduli TrashPage, client cestino e DocumentEditorWorkspace200; homes e nuovo endpoint trash401 con intestazione sorgente dc58ada; richieste AI e recupero password respinte403 dalla guardia; proxy frontend con medesima intestazione. Tutti i listener propri sono loopback. Non è stata eseguita una nuova prova browser autenticata né una cancellazione/ripristino su documenti reali: la copertura funzionale è quella delle suite offline sopra riportate, invariata.

Riscontro READ ONLY sul documento segnalato come completato ma da classificare: una spesa collegata, nessuna DocumentOrganization. Completamento economico e classificazione canonica mancanti di allineamento nei dati preesistenti; nessun backfill automatico. Il committente può usare Correggi tipo → Bolletta, preservando la spesa. Il documento con proposta preesistente e senza spese non è stato eliminato: il nuovo comando Elimina lo sposta nel cestino, con anteprima, ripristino e conservazione30giorni. Dopo aggiornamento pagina il committente può collaudare questi comandi; eliminazione definitiva e svuotamento restano scelte esplicite dell'utente.

Durante la successiva navigazione del committente verso la modifica tipo, il controllo ulteriore ha rilevato un nuovo lotto, un elemento e una lettura locale (DocumentIntakeBatch/Item/Analysis +1 ciascuno); per questo non dichiara più invariato l'intero DB rispetto al backup. Tutte le altre tabelle preesistenti, compresi documenti, bozze AI, oggetti, spese e ledger, e tutti gli originali restano invariati; zero migrazioni pendenti. La verifica di invarianza sopra è quella conclusa subito dopo l'avvio, prima di questa navigazione. Richiesta successiva: rendere Correggi tipo un menu diretto nell'archivio, in un nuovo lotto frontend; nessuna riclassificazione automatica dei dati esistenti.

Ripartenza operativa: nel task originale, work/roma-runtime.json e work/schede-app-frontend-runtime.json indicano i processi e la sorgente attuali. Launcher di questa versione: work/cestino-activation-process.ps1 (avvio API protetta), work/cestino-runtime-guard-v2.cjs e work/cestino-frontend-start.cjs con work/cestino-activation.vite.config.mts. I vecchi launcher roma-interactive-start.ps1 e schede-app-frontend-start.cjs rimangono artefatti del rilascio precedente: non riusarli per ripristinare questo codice. Verificare sempre identità PostgreSQL/porte e manifesti prima di un riavvio; non riapplicare backup o migrazione per una semplice ripartenza. Prova della build in work/cestino-activation-build-proof.json, backup in work/cestino-activation-backup-private.json; questi file privati restano fuori dal repository.
