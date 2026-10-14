# G1 — backend locale verificato, frontend in lavorazione

14 ottobre 2026. Contratto baseline0b12d8a, Claude nel checkout distinto dopo sync26525c0. Codex possiede backend/schema/test/documenti condivisi e non modifica frontend G1 finché Claude lavora. G1 NON chiusa: client/API e browser frontend reale da eseguire dopo integrazione.

## Backend attivo

Sei modelli aggiuntivi HomeRoom/HomeObject/ObjectPosition/ObjectResourceLink/ObjectEvent/ObjectRequest e migrazioni202610140002_home_objects/202610140003_object_link_constraints applicate al solo dimora_v5_product_dev su55432, con assertDevelopmentDatabase. Seconda migrazione rafforza esattamente una risorsa del tipo dichiarato: CHECK SQL con NULL non basta da solo. Prima migrazione già applicata non riscritta.

Ambienti Home condivisi, oggetti/posizioni personali. Catalogo object/boiler conserva ID e dati caldaia, senza copia di conferme. Posizione facoltativa/multiambiente e archive/restore con audit/CAS. Room archiviata visibile nelle posizioni esistenti, non assegnabile ex novo. Nessun harddelete; roomIds JSON validato sul server, conservato perché non esiste cancellazione fisica room G1.

Home advisory lock oltre account/Home protegge sharedroom fra membri. Membership/doc/asset locks e rilettura; ledger snapshot interno con replay proiettato secondo diritti correnti. Boiler confirmed non copiato neppure nel ledger. Storia tecnica/economica separata. Costi/attività originali immutati dai link.

Paging SQL/keyset limit+1 per catalogo/collegamenti; fonti boiler autorizzate prima di LIMIT e ricontrollate in proiezione. Ricerca nome NFC/ILIKE ICU letterale come H2. History/room paging Prisma keyset; cursor account/Home/risorsa/filtri, limite indipendente. Nessuna scansione dell'intero catalogo in memoria.

Reference links a documenti leggibili e proprie attività/spese; native boiler deduplicata e non removibile G1. Un oggetto principale per costo/attività con unique parziale e lock; documento multioggetto ammesso. Risorsa unavailable senza ID/titolo anche history/replay. Rimozione link non cancella risorsa. H1/H3a impediscono nuovo assetId nativo incoerente con link G1 attivo,409 resource_already_linked: evita aggiramento dell'unicità tramite API vecchia.

## Prove eseguite

- Prisma validate/generate/deploy riusciti, build/lint backend verdi. Primo build fallito per due confronti ridondanti dopo narrowing TS, corretti; primo lint nuovo test fallito per fixture unused, aggiunta verifica privacy della caldaia altrui. Run falliti non conteggiati come verdi.
- 81 offline e102 integrazione backend/DB/HTTP verdi, incluse regressioni identity/documenti/review/attività/ricerca/spese. Conteggi Node includono contenitori. Log outputs/Dimora-V5-G1-backend-offline.log e -backend-integrazione.log.
- G1:7 scenari DB+contenitore=8;4HTTP+contenitore=5. HTTP Nest/auth/CSRF/context/upload/storage reali su harness senza worker/provider. Ripetuta sul processo3001 finale con V5_OBJECTS_API=1:5verdi, log Dimora-V5-G1-API-reale.log.
- Dopo suite completa estesa stessa prova DB con26 link costi e storia multipagina:8targeted verdi, log Dimora-V5-G1-paging-final.log. Solo test ampliato, non dichiarare una seconda suite completa rieseguita.
- Concorrenza due membri room, doppio create stessa chiave/roomIds ordine diverso, posizioneCAS0 in gara, no-op, archive/restore/crossHome, owner privatoaltrui/viewer/revoca, fontiM3 revocate prima di paging, wildcard/accenti,25+timestamp uguali/limiti variabili, storia/replay redatti, originali/hash/conferme/totali invariati. Ledger AI count invariato, zero chiamate Anthropic prodotto.
- Cleanup soltanto ID fixture propri; file HTTP rimossi dopo verifica eliminazione dei relativi record. Nessun dato utente/legacy resettato.

API riavviata direttamente con launcher registrato, PID22512 alla verifica; Vite5174 PID5692 e PG55432 PID23544 preservati. Nessun PowerShell richiesto al committente, main/push o rete/firewall modificati.

## Da completare

Consegna finale Claude, escludere sync26525c0, revisione frontend e build/lint/mock/fixture. Client/API reale con flagV5_OBJECTS_API e pause auth invariato; browser320/390/desktop/tastiera/refresh/logout. Due fasi costo->link: se seconda fallisce niente doppia registrazione o successo implicito. Nessun G1 frontend/client/browser reale ancora completato. S1/C1/S2 non avviati.
