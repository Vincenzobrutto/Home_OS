# G1 — ambienti, oggetti e collegamenti integrati e verificati

## Stato finale del 14 ottobre 2026 (prevale sul registro backend sotto)

G1 chiusa per sviluppo locale: frontend Claude bf10356 raccolto via bundle,8 commit integrati come1098f0a/9c35614/5d19574/e1b45e6/065e384/10c3203/2510655/614434e; sync26525c0 escluso, backend-status.md nontracked di Claude preservato. Main/push/legacy/DB reali non toccati. Codex ha completato review, client/API e browser reali sullo stesso backend già verificato.

Build/lint finali verdi. Frontend237 mock/fixture della baseline integrata (include prima regressione storia); dopo importi nei link e focus attività24G1+23H1=47 mirati verdi. Non dichiarare238 come suite completa rieseguita. Backend81offline/102integrazione baseline; dopo precisazioni storia/importi13G1 DB/HTTP mirati verdi e5HTTP sul processo3001 finale verdi, log G1-cost-links-final e G1-API-costi-final.

Client/API reale: gruppi ordinari9identity/document/review+3H1+2H2+2H3+2G1=18verdi. Nel primo run mancava V5_ANALYSIS_V2 e7M4 erano saltati: recuperata la sola suite M4 non-live con flag esplicito,3verdi e4live saltati. Totale21non-live veri, zero calls Anthropic prodotto. Launcher ora cattura/ripristina quel flag, runner normale mantiene V5_ANTHROPIC_LIVE=0 e pause61s/auth15min invariati. Non presentare il primo run come21verde.

### Decisioni sulle otto richieste Claude

1. CatalogItem include homeId/note/version/createdAt/updatedAt (per boiler metadata personale senza confirmed). Versione posizione separata.
2. History snapshot diretto Room/CatalogItem/LinkedResource; kind created/updated/archived/restored/position_updated/linked/unlinked. UI corretta per position.rooms, test aggiunto.
3. Expense reference/native autorizzata espone amountCents/currency EUR/spentOn dal record corrente, senza nuovo sommatorio o richiesta HTTP per ogni riga. Documento/attività non includono importi. Link unavailable redatto interamente anche storia/replay.
4. Ambienti archiviati già assegnati conservabili; nuova assegnazione archiviata409. Test DB/HTTP/mock coprono regola.
5. Updates/archive/restore boiler G1 non hanno route e rispondono404; UI non le offre. Modifiche tecniche rimangono M3.
6. Documento su più oggetti ammesso; stesso target/body già collegato no-op201 e nessun evento nuovo.
7. Picker attività H1 paginato/filter locale dei non-nativi per singola pagina ammesso con messaggio e carica altri; filtro server opzionale futuro, non blocco G1.
8. Chunk600,88kB: code splitting prima del pilota resta backlog, soglia non alzata per occultare avviso.

### Browser reale e fixture lasciate navigabili

Account sintetico ProvaM4, CasaM4 78e24a27-036e-40fc-8b69-b5e4690254af: creati Cucina b2dc6c02-7806-457f-a0bf-27fc0176e10b e Ripostiglio7cda9f67-62ff-4a7f-8e89-79dc8b53cf0c, oggetto Termosifoni c3c087f7-492b-428a-85a3-ff6890064e54 in entrambi e Lavatrice7b40c62f-0d4f-4917-95c0-8964d1ed3789 senza posizione.

Dal primo oggetto registrato costo7facd49a-8874-45d3-b252-f2861db75a7f da30cent in due fasi vere, originale PDF esistente collegato dopo ricerca H2, attività bdb8b802-5b02-4971-a27c-9657437f382c con data16ottobre. Focus dopo link al titolo sezione, archivio/Escape/focus restituito, archive/restore mantiene risorse, reload persiste, cambio posizione mostra differenza leggibile nello storico e non cambia costo. Filtro Da collocare restituisce Lavatrice e boiler ancora non posizionato; boiler poi collocato Cucina, stessa ID, fonti e dati confermati30/34kW intatti. Logout/login conserva casa/ambienti/oggetti/costi/attività.

Durante browser reale riprodotto focus perso aprendo ActivityForm da oggetto; corretto autofocus titolo solo per forObject, nuova regressione UI e riverifica nel browser (Nuova attività poi Le tue attività dopo successo). H1 focus dopo altre mutazioni K7 resta distinto e non dichiarato risolto. Dicitura destinazione spesa ora documento/oggetto per G1, non caldaia generica.

320/390/1280desktop e viewport nativo senza overflow orizzontale; override ripristinato. Screenshot outputs/Dimora-V5-G1-catalogo-reale.png e -oggetto-reale-desktop.png, mobile320 prova tecnica fullpage con elementi fixed (desktop preferito per presentazione). Nessuna conformità WCAG dichiarata. Rete cellulare rimandata, non modificata.

Audit finale DB readonly outputs/Dimora-V5-G1-audit-finale.json: boiler v4, PDFv1/hash5e15f495d13eb76b6d27d23071f659a622c55a5156f6bc55d1704f40e07472f3 invariati;3 costi attivi10+20+30=60cent, nuovo costo una sola volta; ledger8tentativi/41714microUSD invariato. Solo dati sintetici. Revoche/risposte perse/viewer/paging non tutti forzati nel browser: coperti dalle suite dichiarate.

Successivi secondo priorità del committente: C1 condivisione selettiva; evoluzione Spese S1-S4 definita ma ancora non attiva. Vendita/cessazione rapporti e rifinitura globale dopo. Non avviare altri incrementi automaticamente in questo collaudo.

## Registro della fase backend precedente

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

### Precisazione storia per integrazione frontend

La lettura preliminare del frontend Claude ha evidenziato l'utilità di snapshot diretti negli eventi: history ora proietta before/after come Room/CatalogItem/LinkedResource, senza wrapper di risposta endpoint. Note/nome/posizione diventano leggibili senza dipendere da JSON interno. Aggiunte asserzioni before/after room e position; build/lint mirato e13test G1 DB/HTTP verdi dopo la precisazione. Il frontend va ancora verificato sulla posizione annidata CatalogItem.position.rooms. Suite completa102 resta baseline precedente, non dichiarare ripetizione dopo questa correzione mirata.

## Da completare

Consegna finale Claude, escludere sync26525c0, revisione frontend e build/lint/mock/fixture. Client/API reale con flagV5_OBJECTS_API e pause auth invariato; browser320/390/desktop/tastiera/refresh/logout. Due fasi costo->link: se seconda fallisce niente doppia registrazione o successo implicito. Nessun G1 frontend/client/browser reale ancora completato. S1/C1/S2 non avviati.
