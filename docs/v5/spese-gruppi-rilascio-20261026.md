# Rilascio gruppi Spese distinti — 26 ottobre 2026

Il committente ha approvato integrazione e attivazione della [PR #64](https://github.com/Vincenzobrutto/Home_OS/pull/64). Merge nel consolidamento: **ccc8469dc260b8289b65a273663ae4fbb0285881**, verificato con git ls-remote. Main invariato a cdbb318ddb56e764ad4b111a71560e3e71c7a033; nessun branch o checkout Claude modificato.

Sono attivi i gruppi Acquisti e Manutenzione, riparazioni e lavori. Cambiano i subtotali calcolati per gruppo, anche sulle registrazioni esistenti; categorie, importi e collegamenti salvati restano invariati. Non serve risalvare le spese. Regola e test offline nel [report del lotto](spese-gruppi-distinti-20261026.md).

## Preparazione verificata

Runtime dedicato Dimora-V5-runtime-spese-gruppi-20261026 dalla punta integrata, checkout pulito. Alberi backend e frontend identici alla fonte testata 4e35f8d. Lock delle dipendenze identici, dipendenze locali riutilizzate senza installazione; schema e intera cartella Prisma identici alla precedente API a8de901. API ricompilata e frontend build superata con ambiente ripulito ed envDir vuota. Hash SHA256 dei moduli API registrati nella prova locale e controllati dal preload prima dell’avvio. Nessuna migrazione, backfill o modifica .env.

## Ripristino e attivazione

I tre PID precedenti non esistevano e le porte 5174/3011/55432 erano libere. Verificata assenza di PostgreSQL sul data directory conosciuto, PG_VERSION 17, configurazione 127.0.0.1:55432 e pg_ctl status senza server in esecuzione. Ripristinato il cluster esistente, senza inizializzarlo, migrare o modificare configurazioni. PostgreSQL ha completato il proprio normale recupero del precedente arresto.

L’helper locale PowerShell rimaneva in attesa dei discendenti nonostante pg_ctl avesse già avviato il server. Fermato soltanto quell’helper dopo verifica di PID, comando e data; PostgreSQL non fermato. Il launcher ora attende soltanto pg_ctl. Corretto anche il confronto delle date di identità deserializzate da JSON. Questi interventi riguardano solo gli strumenti locali del task, non il prodotto. Il primo tentativo di verifica API era precedente alla readiness; nessun ulteriore processo API creato per questo motivo.

Servizi finali, con identità e listener loopback verificati:

| Servizio | PID | Porta | Fonte |
| --- | --- | --- | --- |
| PostgreSQL, cluster esistente ripristinato | 35320 | 55432 | Data directory precedente |
| API protetta | 2672 | 3011 | ccc8469 |
| Frontend | 21444 | 5174 | ccc8469 |

Mantenute le guardie del precedente runtime: sette inizializzatori dei worker controllati, AI disabilitata e credenziali provider/email rimosse dal processo, rete API limitata al DB locale, rete frontend al solo proxy API, coda locale interattiva nello stesso ambito concordato, cestino con i 30 giorni già autorizzati. Header X-Dimora-Collaudo roma-consolidata-ccc8469-no-ai; modalità interactive-manual-no-ai. Nessuna richiesta AI/email, migrazione o richiesta applicativa autenticata di scrittura eseguita dall’agente.

## Esito e limiti

**34/34 controlli HTTP statici/anonimi superati**: nuovi nomi e moduli frontend, funzionalità precedenti di bollette/titoli/rilettura, worker PDF/OCR, pagina iniziale e API 401 con header di protezione atteso. Fonte runtime e processi verificati; metadata locali aggiornati. Nessun audit SQL dei contenuti reali, lettura di originali o collaudo visivo autenticato eseguito; non si dichiarano impronte dei dati reali confrontate. Le verifiche finanziarie con somme, paging, privacy e idempotenza sono quelle offline del lotto; nessuna suite completa aggiuntiva durante il rilascio.

## Verifica del committente

Ricaricare la pagina Spese, eventualmente con Ctrl+F5. Verificare Acquisti separato da Manutenzione, riparazioni e lavori. Il totale generale resta lo stesso; riparazioni e lavori condominiali straordinari confluiscono negli interventi anche se collegati a un lavoro. Non occorre correggere o salvare di nuovo le registrazioni. Vecchi cursori di paginazione richiedono di ripartire dalla prima pagina.

Questa consegna documentale è su branch separato codex/rilascio-spese-gruppi-20261026, registrato prima della modifica del report a fa3a53a. Il codice è già approvato e attivo; merge della sola documentazione al committente.
