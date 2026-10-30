## Cestino, correzioni indipendenti — 25 ottobre 2026

Incarico diretto del committente: correzioni su branch Codex propri verso quelli Claude, mantenendo le riproduzioni della revisione. [Report](cestino-correzioni-backend-20261025.md). La fonte diventa indisponibile atomicamente allo spostamento; la scadenza persistita delle anteprime, come la revoca delle condivisioni, è completata dopo il commit e dal ripristino se interrotta. Ordine ShareRecord → SharePreview → Document nei percorsi che bloccano il documento; il completamento post-commit legge il lifecycle senza lock Document e modifica solo gli insiemi già bloccati, mai righe emerse dopo il ripristino. Empty acquisisce tutti gli insiemi prima del primo documento. Niente retry dei deadlock. Valori canonici e citazioni hanno autorizzazioni distinte anche nel profilo e nell'export; le prove dei valori esportati sono ricontrollate prima del rilascio. Listing del cestino con continuazione e totale, nessun troncamento silenzioso.

## Cestino dei documenti — 23 ottobre 2026

Decisioni del committente del 22–23/10 applicate al lotto 1: solo chi ha caricato un documento può metterlo nel cestino, ripristinarlo o eliminarlo, anche se è condiviso con la casa; ogni membro vede solo il proprio cestino; 30 giorni poi eliminazione definitiva automatica. Scelte tecniche: (1) il documento resta la stessa riga con trashedAt e canReadDocument lo rende illeggibile ovunque, con un test di guardia statico che fallisce se una nuova lettura ignora il cestino; (2) l'eliminazione definitiva lascia un segnaposto senza contenuto invece di cancellare la riga, per non toccare le chiavi esterne delle schede confermate, che mostrano la fonte come eliminata; (3) output di analisi, risposte AI, proposte, titoli, nomi nei manifesti e risposte idempotenti collegate vengono svuotati, mentre i dati già confermati nelle schede restano (§4.1 del progetto); (4) analisi in coda o in corso bloccano lo spostamento, e i documenti fonte di una scheda caldaia (AnalysisJob) restano esclusi in questo lotto; (5) le condivisioni revocate non tornano con il ripristino. Dopo la revisione di Codex: (6) disponibilità della fonte e dati confermati sono separati (`canReadDocument` per aprire o proporre, `canSeeConfirmedSource`/`confirmedSourceVisible` per i dati confermati, con versione/SHA verificate solo su fonti attive); (7) ordine dei lock: righe `ShareRecord` sempre prima del `Document`, quindi la revoca allo spostamento avviene dopo il commit; (8) le risposte idempotenti ripulite portano `{sourceDeleted:true}` e il replay risponde 410. Dopo il riesame: (9) le prove hanno due ambiti, `confirmed` per i valori confermati e `proposal` (fonte attiva e corrente) per confronti e contenuti non confermati; (10) la revoca dopo il commit è legata al ciclo di vita (`lifecycleVersion`) della richiesta originaria; (11) i registri intake si ripuliscono per coppia lotto/elemento. Ciclo dei backup rimandato a un lotto separato (script fuori dal repository). [Report](cestino-lotto1-report-20261023.md).

## Letture batch dei candidati — 23 ottobre 2026

Preletture soltanto nella singola richiesta dopo verifica di ogni target: profili e posizioni insieme, prove per campo ancora tutte obbligatorie. Facciata singola usa lo stesso criterio; nessuna cache fra account/richieste o rimozione di lock. Conteggio SQL distinto dalla latenza. [R05](fase0-candidate-query-batching-20261023.md).

## Client API per dominio — 23 ottobre 2026

Facciata pubblica compatibile e moduli con lo stesso ApiTransport iniettato: unico stato CSRF/sessione/fetch e stessi controlli HTTP/binari. Nessuna gerarchia tra domini, nuovo framework o dipendenza; aumento della entry documentato come costo di manutenzione, non ottimizzazione runtime. [Decisione e verifiche R10](fase0-api-client-domains-refactor-20261023.md).

## Test offline unificati — 23 ottobre 2026

Un solo runner con profili espliciti, ambiente dei figli ridotto, guardie Node/Prisma e cluster nuovo posseduto dal test. Porte 55439/3119 riservate al runner per preservare il collaudo dell’utente 55433/3109; nessun riuso automatico o modifica del guard di prodotto. Gli indirizzi cambiano soltanto nella copia temporanea. API avviata solo per i file HTTP esterni e arrestata prima dei test che reclamano job: il primo collaudo aggregato ha mostrato che i worker dell’API potevano sottrarre i job alle prove dirette. Log e cluster fermo conservati anche sugli errori. [Uso e confini](../../backend-v5/test/OFFLINE.md); [report del lotto R07](fase0-offline-test-harness-20261023.md).

## Dettaglio oggetto — 19 ottobre 2026

Approvata e implementata la struttura compatta: sintesi in alto, griglia desktop, ordine unico mobile, funzioni secondarie richiudibili. La garanzia mantiene origine e due date distinte; prezzo d’acquisto e costi rimandano a registrazioni canoniche senza duplicarle. [Scelte e verifica](object-detail-layout-20261019.md).

## Catalogo oggetti compatto — 19 ottobre 2026

Scelta approvata: struttura a schede compatte della proposta 3 e filtri ambiente della 1; due colonne desktop, una mobile, vista elenco alternativa. Ricerca e conteggi sul server per non limitare i risultati alla pagina caricata. Icone in assenza di foto reali, avvisi solo da dati esistenti, contesto di ritorno privato per account/casa. [Implementazione e limiti](object-catalog-layout-20261019.md).

## ADR — Ambienti proposti da planimetria, 19 ottobre 2026

Riutilizzare coda, autorizzazione per fonte e budget onboarding con purpose distinto, senza una seconda pipeline di pagamento. Conservare punti numerati in una bozza privata; creare stanze condivise solo dopo conferma esplicita. Numero stabile indipendente dal nome, nessuna fusione automatica: nomi uguali richiedono collegamento o distinzione. Coordinate normalizzate sull’intera pagina, ritaglio solo visivo. Motivo: coerenza mappa/elenco, ripresa della revisione e protezione da doppio invio senza pubblicare originali privati. [Contratto e limiti](floor-plan-rooms-20261019.md).

# V5 — contratto di implementazione iniziale

## ADR-V5-17 — G1 backend e compatibilità del costo canonico

14 ottobre2026. HomeRoom shared richiede advisory lock Home oltre account/Home, altrimenti due membri possono vincere sulla stessa versione. Oggetti/posizioni personali finoC1; BoilerAsset originale letto nel catalogo discriminato, senza wrapper/copiedconfirmed. Reference links non scrivono costo/attività; unique parziale tutela un oggetto principale. H1/H3a rifiutano assetId nativo incompatibile con link G1 attivo, evitando doppia attribuzione. Scartati riuso UUID assetId per oggetto generico e pubblicazione implicita delle note personali.

Ledger G1 snapshot interno proiettato con diritti correnti; SQL autorizza fonti boiler prima di paging e proiezione le ricontrolla. Nessun dataset integrale in memoria, ricerca letterale ICU come H2; roomIds JSON validato e nessun harddelete room. FK dei link a risorse, vincolo esattamente una risorsa del tipo corretto rafforzato in migrazione separata dopo prima applicazione. Nessuna dipendenza o paid AI. Build/lint81offline/102integrazione/5HTTP runtime verdi; frontend/client/browser G1 da completare. Dettagli g1-integration-review.md.

13 ottobre 2026. Decisioni per la nuova V5, autorizzata dal committente; non modificano il frontend legacy.

## ADR-V5-01 — due progetti nuovi

`frontend-v5/` e `backend-v5/` sono progetti autonomi nello stesso repository. Nessun import di componenti, tema, navigazione o stato legacy. Portare soltanto backend selezionato dopo revisione. API su 3001, frontend su 5174, entrambe su loopback; database e storage nuovi e dedicati. Il prototipo di riferimento resta `frontend/public/v5/`, servito su 5173. Non applicare migrazioni legacy o backfill al nuovo database.

## ADR-V5-02 — frontend moderno

React, TypeScript, Vite; React Router per navigazione; token nuovi Blu architettura e CSS Modules, CSS globale solo reset/token. Client API tipizzato, TanStack Query per cache server, chiavi per account/casa e pulizia al logout/cambio account. Le regole legacy «solo inline» e «nessun router» non si applicano a `frontend-v5/`, come già autorizzato dalla richiesta di frontend nuovo del committente; `frontend/` continua a rispettarle.

Versioni: compatibilità da verificare e dipendenze bloccate in lockfile da Claude durante lo scaffold. Nessun aggiornamento delle dipendenze legacy. Il contratto non dipende da una specifica versione del router.

Alternative scartate: copiare App.tsx/theme.ts/app.js; stato globale in localStorage; introdurre SSR/microservizi senza esigenza. Test e fixture esplicitamente separati dalla modalità reale.

## ADR-V5-03 — responsabilità

Codex gestisce backend, schema, contratti, integrazione e collaudo. Claude Code implementa `frontend-v5/**` nel checkout dedicato. Non modificare `backend/**`, `frontend/**`, schema, contratti o main. Handoff nel file `frontend-v5/HANDOFF.md`. Se il contratto non basta, segnalare la lacuna; non inventare un'API alternativa.

## ADR-V5-04 — baseline UX

Home mobile-first: Casa, Attività, Documenti, Spese; Home/Agenzie/Amministratori come esperienze distinte. AI propone, utente conferma; verifica completata scompare dalle aperte, originale conservato, conferma dati diversa da certificazione documento. Comunicazioni pubbliche leggibili in Home, stato esplicito dello studio con icona e testo. Account, casa, pratica agenzia e condominio sono identità differenti.

Vendita revoca accesso alla casa alla data, non chiude account. Agenzia ha 60 giorni per download/Gift, poi metadati; Gift accettato indipendente. Cessazione studio revoca mandato e mantiene soltanto pubblicazioni autorizzate. Home non è contabilità, Agenzie non è CRM, Admin non è ticketing/SLA.

## Stato

M1/M2 completate in locale il 13 ottobre 2026: account/casa e documenti reali, API/DB/storage dedicati e collaudo frontend integrato. Non presentare sezioni future come operative. M3 review-v1 ha contratto e fixture fissati, implementazione da iniziare.

## ADR-V5-05 — originali e riservatezza M2

Originali immutabili PDF/JPEG/PNG; un file per richiesta, storage privato dedicato, upload idempotente, ZIP selettivo autorizzato. Visibilità default private (solo uploader con diritto Home valido), home soltanto con scelta esplicita. Il ruolo owner non supera la riservatezza di altri uploader. Niente AI, conferme tecniche, sostituzioni o cestino in M2: seguono contratti separati.

Alternativa scartata: rendere ogni upload automaticamente leggibile a tutta la Home, incompatibile con documenti personali/finanziari riservati. Limiti 20 MiB/file e 100 MiB/ZIP sono limiti tecnici locali, non prezzi o quote commerciali. Dettagli in documents-api-contract.md. Antimalware e hardening prima del pilota, senza prometterli nel locale.

## ADR-V5-07 — provider M3 e fonti verificabili

Provider test_fixture_v1 riconosce solo hash dei tre PDF sintetici versionati in fixtures/m3. Etichetta simulazione obbligatoria; nessuna estrazione arbitraria da documenti sconosciuti né quote fittizie attribuite all'originale. Scartato un provider che genera dati standard su ogni upload, perché confonde simulazione con fonte reale. Pagina/estratto coerenti col PDF; zero chiamate AI a pagamento. Job/lease persistenti e pubblicazione atomica, worker separato dalle conferme.

## ADR-V5-08 — conferme e riservatezza M3

Derivati personali al creatore in M3, oltre alla membership Home e autorizzazione fonti. Scartata condivisione automatica della scheda ottenuta da private. Conferme per campo e potenza puntuale con denominazione; originale invariato, mai certificazione. Campi pieni richiedono sostituzione esplicita e nota; versioni/idempotenza proteggono concorrenza e retry. Identiche evidenze già risolte non riaprono la stessa verifica; nuova divergenza non sovrascrive un dato corretto dall'utente. A+B conserva due grandezze, A+C è conflitto della stessa grandezza. Dettagli operativi in review-api-contract.md.

## ADR-V5-06 — Storage e dipendenze M2
Storage locale privato backend-v5/storage-private, nomi UUID, staging e rename prima della transazione DB; rollback rimuove file soltanto dopo verifica DB riuscita di assenza del riferimento. Commit incerto conserva il file; cleanup dopo 24 ore con lookup DB e nessuna cancellazione senza verifica. Nessun reset o pulizia di directory legacy. Originali verificati con hash anche prima del download/ZIP, membership e sessione ricontrollate prima della risposta binaria.
Archiver 7.0.1 e file-type 21.3.4, gia installati/verificati nel workspace, dichiarati come dipendenze dirette V5 con lock autonomo. Alternativa scartata: scrivere a mano ZIP/detection generici o importare FileStorageService legacy con dipendenze incidentali. file-type rileva firma, non certifica validita completa o assenza di malware; hardening prima del pilota. Export in memoria con limite 100 MiB e massimo due concorrenti, coerente con ambiente locale; adapter streaming remoto per ambiente ospitato da rivalutare. Fonti primarie: https://www.archiverjs.com/docs/archiver/ e https://github.com/sindresorhus/file-type.

## ADR-V5-09 — M3, esecuzione persistente
Worker locale ogni 500 ms, claim CAS e lease 30 s/token; limite 120 s dal primo avvio anche dopo recupero. Transazione per risultato/job/storia, lock account/Home e diritti/fonti riletti in pubblicazione. DTO e validazione discriminata stretta, nessun sources/origin fidato dal client. Nessuna nuova dipendenza o provider a pagamento. Test reali ancora aperti.

## ADR-V5-10 — M4 Anthropic e collaudo massimo 10 USD
Scelta esplicita del committente: API Anthropic, plafon cumulativo 10 USD per il collaudo locale. Modello iniziale Sonnet 5.5 configurabile e da verificare nell'account; nessuna escalation o retry automatico. Primo incremento PDF testuali con JSON strutturato e riscontro locale pagina/citazione, non citazioni native incompatibili con structured outputs. Ledger persistente conserva costi incerti e impedisce ridispatch dopo crash. Scartati riuso integrale della pipeline legacy, fonte suggerita senza verifica e limite di spesa solo in memoria. Contratto analysis-v2 in docs/v5/anthropic-api-contract.md; implementazione/live test ancora da fare. Fonte primaria: https://platform.claude.com/docs/en/build-with-claude/citations e https://platform.claude.com/docs/en/models/overview .

## ADR-V5-11 — integrazione M4 e limiti distinti
M4 verificata con provider reale; JSON finale può essere preceduto da thinking/redacted_thinking, ignorati come evidenze. Un solo blocco text JSON, nessun tool/refusal/troncamento accettato. Prompt v2 richiede solo numero per power.value; numero, denominazione e kW verificati insieme sull'estratto. PDF.js 6.4.299 in processo separato senza chiave; fetch senza SDK/retry. Ledger serializzato anche alla prima creazione campagna. Riserva 0.25 USD, cap monetario 10 USD e sei chiamate iniziali distinti: ai_evaluation_limit_reached conserva il saldo. Scartati refund di esiti incerti, rilancio automatico e finta assenza di costi sui fallimenti post-dispatch. La rivalidazione della risposta salvata non ricontatta Anthropic. Resoconto m4-integration-review.md; nessuna dichiarazione di sandbox OS o certificazione tecnica.

## ADR-V5-12 — H1 promemoria personali e date calendario
Primo sottoincremento di Home utile dopo M4 Anthropic: attività manuali private al creatore con diritto Home, eventuale propria caldaia, date utente, completamento/annullamento/riapertura e storia. Nessun obbligo o ricorrenza inferito dai dati della caldaia; documenti, notifiche, normative e costi seguono separatamente. Scartati Issue Genesis/report condominiale come attività personali e generazione automatica da conferma AI. Il nome H1 evita di chiamare M5 Agenzie un sottoincremento della Home o di dichiarare costruita la vecchia M4 Home utile.
Date YYYY-MM-DD, fuso Europe/Rome esplicito per H1; il server determina today/dueState, timestamp storia UTC. Scartato timestamp UTC per una data senza ora, che cambierebbe giorno nel client. App personali protette per account/Home; link asset illeggibile redatto senza cancellare appunti manuali. Annullamento reversibile, niente hard delete. Versione/evento/richiesta atomici e replay autorizzato prima dello stato/versione; nessun completamento offline finto. Contratto activities-api-contract.md; schema/API H1 implementati e verificati localmente. Condivisione familiare, ricorrenze e fuso configurabile successivi, senza promessa di normativa o attestazione.
Implementazione riusa soltanto le policy V5 di membership/asset/fonti tramite ReviewService esportato, senza duplicare l'autorizzazione M3; nessuna dipendenza nuova. Clock iniettabile per prove Roma/mezzanotte/ora legale. Snapshot storici conservano il riferimento interno e lo redigono alla lettura; replay controlla anche i riferimenti dello snapshot salvato. Il collaudo HTTP isolato usa i veri controller/sessioni/DB su porta effimera, senza worker AI; V5_ACTIVITIES_API=1 ripete le stesse prove sul runtime 3001.

### H1 — integrazione finale, 14 ottobre 2026
Date client costruite/formattate in UTC per conservare il giorno di calendario, stati temporali dal server e rilettura al focus/navigazione; nessun timer di mezzanotte in H1. asOf resta metadata, today visibile nel dettaglio. Caldaia senza diritti viene redatta senza creare un evento artificiale; viewer mai edit. Elenco promemoria dentro la caldaia resta futuro: il client supporta già assetId, il link di creazione è attivo.
Dialogo annullamento con focus contenuto e restituito; chiusura/Escape bloccati durante invio o esito ambiguo per conservare chiave/payload della riprova, anche nei moduli in pagina. Scartati chiusura che perde l'idempotenza, retry automatico e completamento ottimistico. Test con risposta simulata persa dimostra una sola storia.
Collaudo frontend/API in due gruppi con pausa iniziale e intermedia di 61 s: l'ampliamento H1 supera altrimenti i 15 tentativi auth/minuto. Il rate limit applicativo resta intatto; il runner normale imposta V5_ANTHROPIC_LIVE=0, nessuna chiamata a pagamento implicita. Per un futuro collaudo live esplicitamente autorizzato occorre usare direttamente Vitest e mantenere i limiti del ledger, non questo runner ordinario. Nessuna nuova dipendenza.

## ADR-V5-13 — H2 ricerca metadata della casa
Ricerca server-side dei soli originali autorizzati in una Home, titolo/nome file, formato MIME e visibilità. Estensione della GET documents e capabilities separata per impedire falso successo su backend senza H2; tipi pagina M2 e query list M3/M4 invariati. Scartati filtro sul primo elenco locale, categorie non presenti nel modello, provenienza finta, OCR/AI e motore esterno. Query letterale case-insensitive con confronto NFC, accenti distinti; wildcard/iniezioni mai operatori. Keyset cursor legato al digest dei filtri/account/Home, compatibilità vecchio cursor solo senza filtri. Niente nuovi campi/schema necessari: normalizzare il confronto senza riscrivere originali/metadati storici. Cambio filtri azzera la selezione ZIP; paging dello stesso filtro la mantiene. Contratto document-search-api-contract.md; backend implementato/verificato, frontend e attivazione runtime ancora aperti.
Implementazione usa Prisma.sql parametrizzato, normalizzazione NFC PostgreSQL UTF8 e collation deterministica und-x-icu già installata: il default C locale non ignora le maiuscole accentate (verificato su CAFÉ/café). Keyset confronta il valore timestamp senza fuso identico a quello conservato nel DB; i parametri raw Date diventano timestamptz e, con sessione Europe/Berlin, ripetevano le pagine. Conversione esplicita da ISO del cursor a parametro testo ::timestamp risolve, senza cambiare timezone/schema/dati. Test su 25 record/timestamp uguali e controllo di progresso del cursor evita un loop di test infinito. Scartati modifica della collation globale, nuove dipendenze e ricerca su dataset completo in memoria. DocumentPolicy ora permette lock/rilettura nella transazione senza dipendere da ReviewModule.

### H2 — revisione indipendente e isolamento sessione
Claude cfdd0b3 raccolto come 7b39f05: R1–R3 verificati sul codice e coperti da tre regressioni. RequireAccount conserva solo pathname nel next dopo sessione assente, evitando trasferimento query a un altro account. Stato del ritorno dal dettaglio legato all'account. Dopo Home 403, figli già smontati, cache non osservata della Home rimossa; il guard mantiene il proprio errore per evitare loop. Scartati mantenimento indiscriminato dei filtri fra sessioni e sola rimozione delle query già inattive prima del guard. R4/R5 sono miglioramenti UX non richiesti per autorizzazione; nessun indebolimento backend.

## ADR-V5-14 — H3a spese essenziali personali
Consolidamento finale: frontend integrato e H3a chiusa in locale. Importo stringa nel form, parsing BigInt e formattazione intera; somma soltanto server. Anni storici accessibili da UI senza endpoint nuovo; ritorno focus dopo applicazione. Messaggio503 non promette assenza di salvataggio: POST conserva payload/chiave e riprova idempotente. Filtri Tutti gli anni non alterano il riepilogo esplicitamente annuo. Dati condivisi M2 possono essere fonti leggibili per una spesa personale, senza condividerla. Esito in h3-integration-review.md.
Aggiornamento implementazione: backend/schema H3a verificati, frontend ancora in lavorazione. Il servizio riusa autorizzazioni/lock del backend V5, senza import legacy: advisory account/Home serializza idempotenza; CAS versione protegge update; membership e fonti con lock condivisi e rilettura. Le risposte del ledger sono snapshot interni proiettati di nuovo con i diritti correnti: replay può redigere una fonte prima visibile, invece di restituire JSON pubblico obsoleto. Somme aggregate SQL e paging DB, nessuna scansione totale in memoria; 25 record e totale oltre Int32 verificati. Migrazione additiva solo nel DB locale, confermata da assertDevelopmentDatabase. Nessuna dipendenza o chiamata AI. Stato in h3-integration-review.md.
Contratto expenses-v1 congelato da Codex dopo proposta Claude e autorizzazione del committente allo sviluppo autonomo H3. Costi sostenuti manuali/documentali, EUR in centesimi interi, data non futura Europe/Rome, proprietà personale al creatore, source derivata dal documento. Totali annuali manual/document separati; un solo record referenziato da caldaia/documento. Archive/restore e storia, idempotenza/CAS, link redatti secondo diritti attuali. H3b per stime/ricorrenze/proiezioni, nessuna categoria inventata, contabilità bancaria o pagamento condominiale senza Admin. Scartate condivisione finanziaria implicita fra membri, float monetari, cancellazione fisica e copie del costo nelle schede. Limite tecnico 999999999 centesimi, non quota commerciale. Contratto in expenses-api-contract.md; validazioni iniziali implementate, schema/endpoints/frontend ancora da completare.

## ADR-V5-19 — S1 prima C1, contratto e arbitrato UX
14 ottobre 2026. S1 include manuale breve e compilazione assistita bollette/fatture. Bozza economy-v1 separata da expenses-v1 e da analisi caldaia, stesso HomeExpense canonico. Proposta create atomico con lavoro/oggetto e riepiloghi server con somme stringhe centesimi. Scartati copie del costo, pagamento dedotto e esclusione finanziamento dal totale generale. Revisione Claude d54a533 raccolta come db45d1b e arbitrata in s1-design-review.md: collegamento documento incrementa CAS/storia se cambia costo; bozze originali persistite, edit non salvati espliciti; consenso per ogni trasferimento. Nessuna dipendenza/migrazione/runtime o chiamata paid in questa fase. Contratto ancora bozza fino esempi DTO/congelamento.

## S1 — mockup prima dello sviluppo e modulo aggiuntivo
14 ottobre 2026. Steering esplicito: prima navigazione UX mockup, poi implementazione; Economia aggiunge capacità senza alterare funzionalità già definite. Creato frontend-v5/public/mockup-economia-s1.html standalone, dati sintetici in chiave localStorage isolata dimora-s1-ux-mock-v1 (QA separata suffisso -qa), nessuna API/AI o DB. Provati da browser: manuale85 EUR Lavatrice totale505; link gas esistente totale invariato; scelta80su80+20 e nuova registrazione esplicita; fatturaIVA122; scansione manuale; filtroGas e confronto;320px senza overflow. Backend invariato, nessuna build/test backend necessari. Confronti e archivio nel mockup sono simulazioni, non funzioni già aggiunte all'app.

## S1 — schede oggetto preservate nel mockup
14 ottobre 2026. Su richiesta committente, catalogo Oggetti distinto da Costi per oggetto. Scheda completa con sintesi essenziale e sezioni documenti/attività/costi/storia, link verso vista economica e ritorno. Verificato browser accesso fonte sintetica e ritorno,320px senza overflow e console senza errori. Solo mockup isolato: app/backend/DB e funzionalità già definite invariati. Specifica aggiornata docs/v5/s1-economic-history-spec.md; guida outputs/Dimora-V5-S1-mockup-navigazione.md. Sviluppo operativo ancora sospeso per revisione esperienza.

## Mockup Home proprietario completo prima S1
14 ottobre 2026. Quattro sezioni Casa/Attività/Documenti/Spese; ambienti/oggetti/condominio da Casa; spese essenziali distinte da approfondimento Economia. Archivio generale, review card aperte, attività, originali, costi collegati, ritorni contestuali, C1/ciclo di vita come anteprime simulate. Verifica browser reale delle sole simulazioni e viewport320, zero consoleerrori; nessuna API/DB/AI o modifica runtime. Source frontend-v5/public/mockup-proprietario-v5.html e report docs/v5/owner-mockup-navigation.md. Multi-casa/onboarding account e funzioni future non rappresentati. Backend S1 ancora sospeso finché committente valuta navigazione.

## Audit UX Home e famiglie approvate —14ottobre
Contributi Claude da02584/9357f2b raccolti selettivamente (audit20screenshot, proposta autonoma, famiglie). Audit attendibile con correzioni alle affermazioni assolute; alternativa2 raccomandata con schede ad anteprime limitate, unico ingresso Spese e ritorni contestuali; ufficiale non modificato. Report docs/v5/home-ux-audit-arbitration-20261014.md. Famiglie approvate recepite in spec/modulo/bozzaREST: settecodici serverfamily, categorie invarianti, repairs_works derivata da lavoro, polizza mutuo financing esplicita, totale generale e withoutFinancing stessa base. Non importare fonte Claude integralmente: vecchi gruppi, confronti annuali non omogenei, secondarie segnaposto, liste complete e viewportmeta assente. Nessuna API/DB/AIpaid; contratto non congelato.

## Famiglie approvate ora visibili nei mockup —14ottobre
Aggiornati mockup proprietario e copia navigabile proposta-Claude: tutte7famiglie, repairs_works con lavoro derivata in works_purchases, polizza casa180EUR insurance e polizza mutuo120EUR financing espliciti sintetici, rata450 già presente. Totale fixture2477,90EUR, famigliafinancing570EUR, senza1907,90EUR. Dati esistenti non riclassificati; esempi inseriti soltanto se ID mancante. Confronto proposta corrente allineato fino14ott in entrambi anni, viewportmeta/lang aggiunti. Originale consegna Claude in frontend-v5/docs/proposta-ux preservato; copia public ora adattata Codex e marcata. Browser verificato riepilogo proposta e proprietario, sintassi valida e console senza errori. Nessuna API/DB/AI. Non applicata ancora intera riorganizzazione UX al mockup ufficiale.

## Spese — macro famiglie come navigazione principale
14 ottobre2026. Richiesta esplicita committente: sostituire menu Elenco/Peroggetto/Lavori/Riepilogo con famiglie. Proposta navigabile aggiornata: Tutte+7famiglie; modalità secondarie nel select Visualizza, family applicata a elenco/totali/riepilogo/oggetti/lavori; mantenuto scroll orizzontale mobile. Verificati Mutuo570 e Assicurazioni180 con registrazioni giuste, Riepilogo stessa famiglia,320px senza overflow/scrollWidth305; console nessun errore. SintassiJS controllata. Solo copia proposta public e spec, mockup ufficiale/backend invariati da questa modifica. Scelta documentata per successiva integrazione UX ufficiale.


## 25 ottobre 2026 — Evidenze native e OCR nelle bollette ibride

La selezione OCR considera anche campi esplicitamente etichettati ma assenti dal testo nativo. Intestazioni legali e colonne Periodo richiedono ruolo e geometria univoci. Un calendario può unire glifi nativi e parole OCR nella stessa pagina/scala, senza fabbricare confidenze né prendere l’anno dall’orologio. Contraddizioni restano ambigue; soglie e limiti invariati. [Report e prove](bollette-lettura-affidabile-20261025.md). Nessuna inferenza del pagamento o modifica della conferma canonica.

## ADR — Agenzie: dominio separato e sviluppo locale, 30 ottobre2026
Pratica e fonte di agenzia non riutilizzano autorizzazioni Home. Ogni azione richiede appartenenza e assegnazione; admin non apre originali privati altrui. Versioni fonte append-only; conferme e bozze dipendono da fonte/versione/SHA. Primo incremento puro, non collegato al runtime: permette di collaudare le regole senza cambiare DB o servizi esistenti. Scartato ampliamento implicito di Document.visibility/HomeMembership. Persistenza/schema e adapter restano lotto successivo. [Specifica](agency-practices-v1.md).

## ADR — Persistenza iniziale del fascicolo,30ottobre2026
Aggregato JSONB versionato per fonti/revisioni/dipendenze/ledger/eventi dentro AgencyPractice, con appartenenze e assegnazioni normalizzate e bloccate lato DB. La transazione conserva le invarianti del nucleo puro; nessun riuso di HomeMembership. Creazione idempotente in tabella dedicata. Scartata persistenza volatile/in-memory e distribuzione prematura di decine di tabelle prima del contratto dei fatti. Snapshot non contiene bytes; upload autenticato e storage restano distinti. Normalizzazione futura richiede migrazione e conservazione dello storico. [Specifica](agency-practices-v1.md).

## ADR — Proposta, decisione e conferma correnti separate,30ottobre2026
Nel dominio Agenzie conservare valore proposto, origine, prove e decisioni come fatti distinti. La correzione umana aggiunge una decisione motivata, non riscrive il dato estratto. Fonte cambiata/ritirata revoca l’utilizzabilità corrente senza cancellare lo storico; derivati ereditano la riservatezza della fonte. Campi dichiarati richiedono conferma e non possono portare prove inventate. Scartati flag unico confermato sul documento e sovrascrittura automatica dei campi. [Specifica](agency-practices-v1.md).

## Agenzie — confronto esplicito, nessuna equivalenza implicita
Il primo motore confronta solo gruppi scelti con unità, soggetto, campo e contesto temporale dichiarato. Quest'ultimo è un'etichetta umana, non data automaticamente verificata. Identità storiche, diritti e regolarità tecnica non sono deducibili da uguaglianza di stringhe o superfici. Le risoluzioni future dovranno riferirsi al fingerprint corrente, non soltanto all'id del confronto. [Limiti](agency-coherence-v1.md).

## ADR — Planimetrie: interpretazione AI e geometria raster, due basi di computo

L'AI individua spazi/semi/simboli; il codice ricava contorni dai pixel e misura dopo calibrazione. Due fasi, budget e autorizzazioni correnti; risultato sempre proposto. Non usare coordinate di poligoni inventate dall'AI come fonte principale. La revisione non deve degradare senza avviso un simbolo precedentemente valido. Singoli vani e perimetro lordo sono viste indipendenti: il secondo comprende già muri interni e non somma i primi; pertinenze separate. Coefficienti del committente come profilo commerciale versionato, non algoritmo catastale DPR138/98. Intervalli e base del limite25cm espliciti; incognite bloccano il totale. [Implementazione e residui](agency-plan-integration-v1.md). Nessuna attivazione runtime.

## Agenzie — bytes prima del riferimento DB
Vault dedicato content-addressed, pubblicazione con link esclusivo e verifica SHA, mai sovrascrittura. Upload autorizzato salva bytes prima del commit metadati; in rollback è ammesso un oggetto orfano, non un riferimento a bytes incompleti. Riconciliazione/retention ancora da implementare, nessuna cancellazione in-request. Solo file buffer limitato e firma media, non validazione strutturale. [Dettagli](agency-files-v1.md).

## Agenzie — raster autorevole, parser separato
Il raster deriva dai bytes correnti letti con permessi AgencyPractice, non da un'immagine/hash del browser. Rendering in figlio usa-e-getta senza credenziali e con limiti applicativi, accessi ricontrollati prima del ritorno. Nessuna equivalenza tra DPI e scala metrica. Isolamento OS e memoria nativa ancora da collaudare prima del pilota. [Report](agency-renderer-v1.md).

## Agenzie — contabilizzare anche dopo revoca, senza riaprire documenti
Le fasi nuove richiedono accesso edit e fonte corrente; settlement usa una capability worker limitata e può contabilizzare l'uso già inviato dopo revoca. Ritorna solo costo/replay, nessun aggregate. MicroUSD interi e prezzi immutabili; nessun retry di prenotazione duplicata/incerta. Lease scaduta non viene ceduta senza fencing. Registro autorizzazioni/budget globale ancora necessario prima del trasporto reale. [Report](agency-plan-jobs-v1.md).

## Agenzie — impegno globale prima del job
Enqueue richiede un'autorizzazione server già provisionata e riserva il cap del run sul budget condiviso nella stessa transazione. Lock pratica→budget→autorizzazione; il replay non raddoppia l'impegno. Accounting revocato rimane possibile, usa BIGINT e conserva gli sforamenti; il completamento noto rilascia solo la quota inutilizzata. Nessun provisioning prodotto né consenso dedotto dall'automazione. [Report](agency-ai-budget-v1.md).

## Agenzie — risultato e chiusura indivisibili
Nessun finish dello store senza geometria validata: completePlanJob confronta prova/fingerprint e ricevute con il ledger, poi salva risultato, completa job e chiude budget atomicamente. Worker HMAC scoped alla pratica/run permette ricostruzione della capability con una chiave server iniettata; nessun segreto nel payload coda/browser. Nessuna ripresa automatica di fasi inviate. [Report](agency-plan-worker-v1.md).

## Agenzie — trasporto separato e consenso dedicato
Porta HTTP provider con flag/credential/authorize/fetch iniettati, nessun riuso della configurazione M4. Riautorizzazione per conteggio e dispatch, destinazione HTTPS fissa, nessun retry o redirect, output streaming limitato ed errori senza body grezzi. Non registrata in runtime; solo fetch simulata nei test. [Report](agency-plan-transport-v1.md).

## Agenzie — modulo HTTP separato e attribuzione dal cookie
Identità da SessionsService, CSRF/Origin esistenti e preflight AgencyPractice prima di buffer multipart; nuova verifica transazionale dopo upload. Nessuna eredità HomeMembership. Browser può dichiarare dati e decidere, mai autoattestare origine extracted/citazioni o pagamenti. Modulo richiede root esplicita e non è registrato in AppModule. [Report](agency-http-v1.md).

## Agenzie — DTO commerciale non conferma implicita
Parser HTTP ricostruisce tutte le strutture consentite con ordine canonico; coefficienti mancanti rimangono mancanti e conferme richiedono booleani. Snapshot del server per file/versioni, geometrie manuali senza raster/AI dal browser. Perimetro lordo indipendente, mai generato dalla somma dei vani. [Report](agency-plan-edit-http-v1.md).
