# App locale aggiornata al comune PR79 — 3 novembre 2026

> Ricevuta storica del rilascio del 3 novembre e della configurazione del 4 novembre. Il [registro del 5 novembre](agency-journey-20261105.md) documenta un aggiornamento locale successivo. Questa ricevuta attesta le verifiche svolte nelle date indicate.

## Mandato e versione attiva

Dopo il merge della PR79 il committente ha richiesto «Ed integriamo anche app». Aggiornati API e frontend locali alla fonte congelata `cfff25277039d39ee47c063b8bee1f4e2160c190`, lasciando PostgreSQL, origine, storage e autenticazione canonici. Il rilascio usa un nuovo checkout detached e asset verificati; nessuna modifica a main o alla demo pubblica Alessio.

L'app rimane disponibile su `http://127.0.0.1:5174`; API locale su3011. I vecchi pacchetti API d42459c e frontend cc682d4 sono conservati per il ripristino del codice. Identità dei processi, backup, manifesti e screenshot della casa reale restano privati, fuori Git.

## Preparazione e protezioni

Nessuna nuova dipendenza o installazione nella junction condivisa. Client Prisma privato corrispondente al nuovo schema; compilazione backend, TypeScript app e build Vite del rilascio verdi. Il warning sul chunk principale524,10kB è preesistente. Manifesti immutabili verificano225 file compilati,27 file generati e386 asset frontend.

Il nuovo runner documentale viene riconosciuto esplicitamente e sospeso insieme agli otto initializer precedenti. Gli hook sconosciuti continuano a essere rifiutati. Rete esterna, provider AI, email, coda locale e pulizie restano disabilitati; Gift e tutte le route Agenzie mantengono il blocco operativo del runtime precedente. Login/logout normali e operazioni manuali Home restano soggetti a sessione, Origin/CSRF e membership.

Una domanda di configurazione è stata proposta al committente: rendere operativi Agenzie/Gift oppure mantenere le restrizioni. Al momento del rilascio non era arrivata una risposta: nessuna attivazione è stata dedotta dall'attesa. **Il codice delle due interfacce è installato; Agenzie e Gift non sono ancora operative in questo runtime.** La loro attivazione è distinta dal rilascio, dall'AI reale e dall'invio email; nessun provisioning di agenzia/utente o trasferimento reale è stato eseguito.

## Backup e migrazione

Fermati soltanto i due processi applicativi precedenti, verificandone PID, data di creazione, comando, eseguibile e listener; PostgreSQL preservato. Prima di qualsiasi migrazione è stato creato un nuovo backup coerente con le modifiche recenti dell'utente: dump custom da1040905byte, catalogo e lettura completa verificati, copia di330 originali con impronte e inventario. Il backup precedente all'importazione della planimetria non è stato riutilizzato.

Baseline di tutte le81 tabelle e colonne preesistenti, comprese le sessioni. Applicata esclusivamente `20261103130000_agency_document_analysis`: quattro nuove tabelle e relativi vincoli, nessun backfill o modifica delle righe precedenti. Migrazioni storiche fornite con byte/checksum esatti, senza riscrivere lo storico Prisma. Dopo la migrazione: **81 tabelle precedenti invariate, quattro nuove tabelle vuote, zero righe applicative precedenti modificate**.

Il primo tentativo di backup è stato rifiutato prima della connessione DB o della creazione del backup: un controllo confrontava letteralmente lo schema sorgente e quello formattato da Prisma. Verificata l'equivalenza con la CLI Prisma fidata su due copie private, senza modificare sorgente o metadati generati. Il nuovo proof vincola commit e impronte dei due originali alle due copie canoniche identiche; modifiche di modello, proof incompleto o copie cambiate sono rifiutate. Rafforzato anche il confronto dei pin generated/proof fra backup e migrazione. Il tentativo rifiutato non viene dichiarato riuscito e nessuna migrazione è stata riprovata alla cieca.

## Verifica dopo l'avvio

- Manifesti, processi e listener loopback verificati; stessa fonte cfff252 per API e frontend, nove initializer sospesi e queue disabilitata.
- HTML, asset di ingresso, route SPA, proxy e risposte di blocco AI/email/Agenzie/Gift verificate. Nessun invio AI o email.
- Prima e dopo la lettura autenticata: tutte le81 impronte precedenti, vecchie sessioni e330 originali invariati; quattro nuovi ledger ancora vuoti. Eventuali nuove sessioni ospite normali sono distinte dalle righe precedenti.
- UI desktop autenticata verificata su una nuova scheda, usando il cookie normale già esistente: Ambienti/Planimetria, originale, contorni e oggetti visibili, comandi di rotazione/sfondo e riquadro Da collocare presenti. Nessun errore console. Non letta o impostata alcuna password, nessuna sessione di bypass, nuovo account, drag o scrittura business dell'operatore.
- Scheda originale dell'utente preservata; chiusa soltanto la scheda creata per il controllo. Nessun nuovo test mobile reale eseguito. Screenshot privato fuori Git.

I test del prodotto già verdi restano quelli della fonte equivalente:935/935 backend,77/77 DB/API sintetici e2163/2163 frontend. Non sono stati ripetuti sul DB reale o a codice invariato. Per il nuovo tooling operativo:11/11 guardie pure principali,11/11 rollback,10/10 migrazione e7/7 equivalenza schema; sintassi CJS/PowerShell verdi. Questi controlli puri non avviano servizi o leggono il DB.

## Ripristino e residui

Pacchetto di ripristino del solo codice pronto e verificato, con asset precedenti e nuovi futuri record di processo; non usato. Le quattro tabelle additive possono restare con il codice precedente: nessuna downmigration, cancellazione o ripristino automatico dei dati. Backup e originali precedenti conservati.

Provider reale, OCR, campi estesi e modello d'incarico approvato restano fuori da questo aggiornamento. `canGenerateDraft=false` senza modello. Nessun budget precedente riusato o contratto inventato. Prima di usare Agenzie/Gift nell'app reale occorre completare la scelta di configurazione, verificare storage/servizi e mantenere il normale accesso del destinatario; nessuna deroga alla verifica dell'email è stata introdotta.

## 4 novembre — Agenzie e Gift attive nel runtime locale

Il committente ha scelto di attivare Agenzie e Gift con AI a pagamento e invio email spenti. È cambiata soltanto la configurazione API della fonte `cfff2527`. Frontend, PostgreSQL, origine, sessioni e archivio Home hanno mantenuto la stessa configurazione. Nessuna migrazione. La procedura è reversibile con la guardia precedente della stessa fonte.

Il runtime usa un vault Agenzie privato separato dall'archivio Home e avvia soltanto il worker Gift. Il controllo prima dell'avvio ha trovato zero lavori riprendibili preesistenti. Il cutoff fissato nel proof permette al worker di riprendere in futuro i lavori creati dopo l'attivazione. Gli altri nove initializer, la coda locale, le pulizie, la rete esterna, l'AI e le operazioni di autenticazione che richiedono email restano sospesi o bloccati. Sessione, Origin/CSRF e membership sono quelli del prodotto.

Verifiche effettive: 7/7 test delle guardie e sintassi, apertura della directory Agenzie con la sessione reale esistente, capability Gift attiva con verifica email richiesta, route anonime protette e chiamate AI/email bloccate, listener loopback con stessi processi frontend e PostgreSQL. Windows Defender ha scansionato un file sintetico con il codice canonico. La verifica non ha creato agenzie, pratiche o inviti e non ha trasferito file reali. Il collaudo precedente con fixture resta nel [report Gift](gift-simple-delivery-20261103.md).

Nell'[area Agenzie](http://127.0.0.1:5174/agenzie) il primo passo è **Crea spazio agenzia**. Dopo la stipula, **Consegna al proprietario** permette di selezionare documenti finali e una mappa digitale adottata, scegliere l'anno opzionale e copiare il link. In questo ambiente il link funziona sullo stesso computer e il destinatario deve già avere un account con email verificata. La registrazione e la verifica di un nuovo destinatario via email richiedono una configurazione dedicata.
