# S1 — contratto tecnico economy-v1, baseline di implementazione

> 14 ottobre 2026: il committente autorizza la definizione finale S1 dopo consolidamento e rifinitura UX. La dashboard grafica richiesta a Claude è una variante separata da valutare: non modifica questo contratto. Modulo additivo, HomeExpense canonico e vecchie API invariati. Tipi normativi: economic-history-v1-wire-types.ts; esempi completi: economic-history-v1-examples.json. Non autorizza nuove chiamate paid.

## Compatibilità e trasporto

Base `/api/v5/homes/:homeId/economy`. Vecchie rotte expenses-v1 rimangono intatte, stessi JSON/query/status e stesso HomeExpense canonico. Nessun secondo registro economico. Nuovo controller/service per capacità e proiezioni S1; motore transazionale condiviso delle mutazioni deve preservare lock/eventi/replay H3a e G1, non duplicare logica incongruente.

Cookie sessione, Origin/CSRF e X-Account-Context; no-store. POST richiede Idempotency-Key 16..100 caratteri `[A-Za-z0-9_-]`. UUID validi ma illeggibili/inesistenti: 403 generico; anonimo401; campi/query sconosciuti o ripetuti, data/importo/cursor invalidi422 validation_error; servizio503 non equivale al vuoto. Non passare accountId, currency, state, provider/model libero o autorizzazioni nel body.

Membership corrente + creatore per costi/lavori/bozze; owner non legge private altrui, viewer legge proprie preesistenti e non muta. Fonte/oggetto/lavoro autorizzati prima di selezione, aggregazione o paging. Rilettura membership/fonti in transazione e prima risposta. Lock ordine Home -> account/Home -> record/riferimenti ordinati, compatibile G1. CAS e richiesta/evento/mutazione atomici. Snapshot interno dei replay redatto con diritti correnti.

## Codici, date e importi

Category `electricity|gas|water|internet_services|condominium_ordinary|condominium_extraordinary|insurance|taxes|maintenance|repairs_works|purchase_replacement|financing|other`, oppure null per Non classificata. Family `utilities|condominium|taxes_insurance|maintenance_repairs|works_purchases|financing|unclassified`, derivata server, mai accettata in scrittura. Decisione famiglie approvata dal committente.

Mapping aggiornato su approvazione del 26 ottobre 2026: electricity/gas/water/internet_services -> utilities (Bollette); condominium_ordinary -> condominium; taxes/insurance -> taxes_insurance; maintenance/repairs_works/condominium_extraordinary -> maintenance_repairs (Manutenzione, riparazioni e lavori); purchase_replacement -> works_purchases (Acquisti); financing -> financing; other/null -> unclassified. Il collegamento a un lavoro, attivo o archiviato, non determina più il gruppo. Collegare/scollegare resta una mutazione esplicita con CAS e storia; importi e categorie salvate non vengono modificati. Nessun backfill o migrazione: il gruppo è una proiezione derivata, aggiornata anche per le spese esistenti e le letture dello storico. Codici tecnici mantenuti per compatibilità; works_purchases indica ora i soli acquisti. Documento/fornitore non determinano il gruppo.

Etichette/ordine gruppi: Bollette, Condominio, Tasse e assicurazioni, Manutenzione, riparazioni e lavori, Acquisti, Mutuo e finanziamenti, Altro / Non classificata. Categoria other e null restano distinte; ogni costo compare in un solo gruppo e una sola volta nel totale. Capabilities possibleFamilies contiene un solo gruppo per categoria; repairs_works + works_purchases è ora una combinazione incompatibile (422). I cursori lista precedenti sono invalidati dalla versione reference-v3; ripartire dalla prima pagina.

EUR unico, amountCents intero1..999999999. Date calendar YYYY-MM-DD, anni0001..9999, oggi server Europe/Rome. spentOn obbligatoria/non futura, titolo1..120codepoint/note<=500 come H3a. Campi nuovi nullable: supplier<=120, documentNumber<=80, documentDate, competenceFrom, competenceTo, dueOn. NFC trim, testo vuoto nullable diventa null. Competenza: entrambi gli estremi o entrambi null, from<=to; nessuna equivalenza a scadenza/pagamento. S1 non interpreta una scadenza come impegno.

Somme S1 sono stringhe decimali di centesimi non negativi (`"123456"`), calcolate SQL bigint e proiettate senza float; delta può essere stringa firmata. Singoli costi mantengono amountCents number H3a. counts integer safe. Percentuale `deltaPercentHundredths` stringa firmata in centesimi di punto percentuale o null, arrotondamento metà lontano da zero con interi; base zero null. Non riusare questi JSON come summary-v1, che resta numerico invariato.

## DTO di lettura

EconomyExpense estende HomeExpense H3a senza accountId/storage: aggiunge category, family, supplier, documentNumber, documentDate, competenceFrom/To, dueOn, amountOrigin e collegamenti objectLink/workLink/analysisLink. `amountOrigin:'user_declared'|'extraction_confirmed'` è origine del valore corrente, non prova del pagamento; il vecchio origin manual/document resta un attributo di collegamento al documento. Modifica esplicita dell'importo porta amountOrigin a user_declared; titolo/categoria non ne cambiano l'origine.

Nuovi link S1: unione discriminata `{state:"none"|"unavailable",value:null}` / `{state:"linked",value:summary}`. I link legacy documentLink/assetLink mantengono rispettivamente document/asset. Summary autorizzata: object `{ref:{kind:'object'|'boiler',id},name,state}`, work `{id,name,state}`, analysis `{draftId,documentId,documentVersion}`. Redazione unavailable elimina ID/nome/estratti. Storia conserva fonte importo e provenienza del valore confermato, senza rendere nuovamente visibile una fonte revocata. L'importo esplicitamente confermato rimane memoria personale autorizzata.

EconomyWork `{id,homeId,name,note,state:'active'|'archived',version,activityLink,createdAt,updatedAt,archivedAt,permissions}`. name1..120/note<=500. activityLink stesso schema redatto, summary `{id,title}`. Non crea/completa attività. Costi possono mantenere workId archiviato; nuove assegnazioni richiedono work active. Nome non unico.

Pagine `{items,nextCursor}`; limit1..50 default20; cursorbase64url<=512, binding account/Home/risorsa/filtri normalizzati e non limit. Costi ordine spentOn desc/createdAt desc/id desc; lavori createdAt desc/id desc; storia at desc/id desc. DB limit+1; niente scaricamento totale per filtri o picker.

## Rotte S1a/b

| Metodo/risorsa | Input / output |
|---|---|
| GET capabilities | query vuota; capability sotto |
| GET expenses | filtri sotto; pagina EconomyExpense |
| GET expenses/:id | query vuota; `{expense}` |
| POST expenses | campi costo e nuovi nullable, documentId?,objectRef?,workId?;201 `{expense}` |
| POST expenses/:id/updates | expectedVersion + almeno campo;200 `{expense}` |
| POST expenses/:id/archive oppure restore | expectedVersion,note?;200 `{expense}` |
| GET expenses/:id/history | limit/cursor; pagina eventi S1 con snapshot redatti; vecchi eventi senza nuovi campi proiettati null/user_declared |
| GET summary | stessi filtri economici, senza state/limit/cursor; DTO sotto |
| GET works | state active(default)/archived/all,q?,limit,cursor; pagina EconomyWork |
| POST works | name,note?,activityId?;201 `{work}` |
| GET works/:id | query vuota; `{work}` |
| POST works/:id/updates | expectedVersion + almeno name/note/activityId;200 `{work}` |
| POST works/:id/archive oppure restore | expectedVersion;200 `{work}` |
| GET works/:id/history | limit/cursor; pagina snapshot work |

Capability `{apiVersion:'economy-v1',enabled:true,isSimulation:false,currency:'EUR',today,asOf,timeZone:'Europe/Rome',features:{history:boolean,works:boolean,documentDrafts:boolean},limits:{titleMaxCodePoints:120,noteMaxCodePoints:500,amountMaxCents:999999999,maxPageSize:50},categories:[{code,label,possibleFamilies:Family[]}],families:[{code:Family,label}],analysis:{enabled:boolean,disabledReason:string|null,providers:[...]}}`. Toggle solo server; pagine fanno capability check e non propongono funzione mancante o fallback mock. Vecchie capabilities H3a/G1 preservate.

Filtri: year YYYY oppure coppia from/to inclusiva, mai entrambi. Default anno server per S1; from/to possono includere futuro ma solo costi esistenti non futuri. state active(default)/archived/all solo lista; q NFC trim<=120 ricerca letterale case-insensitive su titolo/fornitore con wildcard escape/accenti distinti; category codice/unclassified; family derivata; source all/manual/document compatibile H3a; objectKind+objectId insieme; roomId; workId; documentId. Un solo valore per parametro; selettori combinati in AND; category/family incompatibili422 solo se la famiglia non è fra possibleFamilies della categoria; repairs_works ammette maintenance_repairs e works_purchases e la condizione workId decide le righe. category=unclassified filtra solo null; family=unclassified include null e other. Riferimenti autorizzati anche se filtro non dà righe. Oggetto stanza usa posizione corrente G1, fonti boiler autorizzate prima conteggio. JOIN via EXISTS/ID distinti, nessun totale duplicato. Periodo user selezionato esplicito; riepilogo solo active.

Summary `{period:{from,to,basis:'reference_date'},count,totalCents,totalWithoutFinancingCents,byCategory:[{category,count,totalCents}],byFamily:[{family,count,totalCents}],comparison:Comparison come unione discriminata nei tipi normativi,asOf,today,timeZone}`. Include tutte le categorie e le sette famiglie con count0 ma UI non presenta zero come costo reale. totalWithoutFinancingCents = totalCents - totale della famiglia financing, stesso periodo e filtri; stringa centesimi esatta. Il generale include finanziamento, nessuna categoria o rata contata due volte. Filtri uguali nel confronto tranne periodo; per anno corrente intervallo corrente fino oggi e stesso anno precedente, anno storico intero; range personalizzato stessa date anno precedente,29feb->28feb, campo `calendarAdjustment:'none'|'leap_day_clamped'`. Anno0001 comparison unavailable, valori comparison null ove non calcolabili. Nessuna disponibilità/incompletezza storica monetaria dedotta dai record. Per unavailable: period/count/totalCents/deltaCents/deltaPercentHundredths null e calendarAdjustment none. Per no_previous_records: count0,totalCents "0",deltaCents totale corrente,percentuale null; UI mostra assenza registrazioni, non interpreta la differenza come risparmio. Per comparable: tutte le misure presenti, base positiva. calendarAdjustment è dentro comparison. byCategory contiene i 13 codici in ordine capabilities e null in fondo; byFamily tutte le sette famiglie in ordine capabilities.

### Collegamenti atomici e compatibilità mutazioni

S1 create inserisce costo+metadati+work+eventuali link G1 nella stessa transazione. objectRef è discriminato, mai UUID generico in assetId. Boiler può conservare assetId nativo coerente e deduplicare G1; oggetto manuale usa reference link. Fonte boiler M3 e oggetto/lavoro active/edit riletti. Per update objectRef omesso invariato/null scollega, objectRef diverso **non sposta silenziosamente**:409 resource_already_linked finché non rimosso esplicitamente. Rimozione via S1 passa expectedVersion costo e aggiorna anche evento/versione G1 in transazione. Vie H3a/G1 restano valide; lettura S1 proietta collegamenti correnti e non replica in un secondo objectId economico.

Vecchie mutazioni H3a preservano metadati S1; cambio amount via H3a invalida origine estratta corrente senza cancellare storia. Vecchie rotte G1 cambiano objectLink riletto e filtro S1 subito, senza cache alternativa. workId nuova mutazione aggiorna versione costo; archive work non modifica costi. No-op non incrementa versione/evento. Replay stored snapshot proiettato con autorizzazioni correnti, digest canonico incluse null/omissioni e riferimenti.

## S1c — documenti: protocollo

Analisi distinta da job caldaia: uno originale M2 per job economico, nessuna route M3/M4 riusata con semantica diversa. Entità additive EconomicAnalysisJob, EconomicDraft, EconomicRequest e origine/provenienza costo; provider infrastructure/billing comune ma dispatch paid disabilitata finché autorizzata una nuova campagna. Nessun reset ledger M4. Fonte originale/hash/versione immutabili, output non fidato/schema/citazioni validati prima pubblicazione.

| Metodo/risorsa | Input / output |
|---|---|
| POST document-analysis-jobs | documentId,provider:'test_fixture_v1'|'anthropic',consentToProviderTransfer?;202 `{job}` |
| GET document-analysis-jobs/:id | query vuota; `{job}` |
| POST document-analysis-jobs/:id/retries | expectedVersion,consentToProviderTransfer?;202 `{job}`; tentativo nuovo esplicito, nessun retry automatico |
| GET drafts | state open(default)/parked/confirmed/all,limit,cursor; pagina summary bozza privata |
| GET drafts/:id | query vuota; `{draft}` |
| GET drafts/:id/candidates | limit/cursor; pagina `{expense,reasons:('same_document'|'same_number_supplier'|'same_amount_date')[]}` |
| POST drafts/:id/confirm | discriminante create/link_existing sotto;200 `{draft,expense}` atomici |
| POST drafts/:id/park | expectedVersion;200 `{draft}`; open -> parked, originale e proposte conservati |
| POST drafts/:id/reopen | expectedVersion;200 `{draft}`; parked -> open, senza nuova analisi o consumo |

Job `{id,homeId,version,state:'queued'|'running'|'succeeded'|'failed',provider,isSimulation,model,documentLink,draftId:null|UUID,error:null|{code,message},billing:null|BillingM4,createdAt,updatedAt,permissions}`. draftId soltanto quando bozza ancora autorizzata. Body paid consenso true esplicito e specifico «Invia ad Anthropic il testo del documento per proporre i dati della spesa». Fixture nessun trasferimento/costo e riconoscibile. Anonimo/fonte illeggibile generico403; documento non supportato o nessun dato esito distinto, non bozza economica vuota.

Draft `{id,homeId,version,state:'open'|'parked'|'confirmed',documentLink,provider,isSimulation,model,documentKind:'utility_bill'|'simple_invoice',proposedFields,amountCandidates,amountSelectionRequired,expenseLink,createdAt,updatedAt,permissions}`. proposedFields mappa campi consentiti a `{value,sources:[{documentId,documentVersion,sha256,page,excerpt}]}`; campi mancanti omessi. source pagina positiva, excerpt<=2000codepoint verificato. Oggetto/lavoro solo selezione utente nel primo verticale, **nessun mapping UUID generato dal modello**. Categoria validata da claim/codice noto e fonte, titolo può essere composizione dichiarata UI dal tipo/fornitore sostenuti.

amountCandidates massimo10, ciascuno `{id,amountCents,role:'current_document_total'|'amount_due'|'arrears_balance'|'taxable'|'tax'|'line_total'|'other',label,sources}`. Nessuna somma AI implicita, candidati non diventano costi. current_document_total sostenuto può essere preselezionato solo senza arretrati/saldi presenti; arretrati/saldi, più totali discordanti o mancanza totale corrente richiedono scelta/manuale. Tax/arrears non preselezionati. Totali negativi/credito non costi supportati. Originale illeggibile => fonte unavailable e campi/candidati/estratti redatti, conferma403; non basta estratto già visto.

Confirm create `{expectedVersion,mode:'create',values:{title,amountCents,spentOn,category?,supplier?,documentNumber?,documentDate?,competenceFrom?,competenceTo?,dueOn?,note?,objectRef?,workId?},amountSelection:{mode:'candidate',candidateId}|{mode:'manual'}}`. Fonte documentId arriva dalla bozza autorizzata, non dal client. Valori effettivi sempre espliciti; se candidata selezionata amount deve uguagliare candidato, altrimenti422. Campi differenti dalle proposte annotati user_declared. Nessun automatismo quando il client omette un valore. Documentato nella history quali dati da fonte e quali modificati; importo manuale => amountOrigin user_declared.

Confirm existing `{expectedVersion,mode:'link_existing',expenseId,expectedExpenseVersion}`. Non accetta valori: non modifica importo/categoria/date. Expense active personale/Home, versione attuale, documentLink assente o stesso documento; diverso documento409 expense_document_conflict, UI offre modifica separata, non sovrascrive. Collega documento+provenienza bozza senza attestare importo estratto, quindi amountOrigin resta corrente. Se già stesso documento no mutazione costo necessaria ma bozza confermata/evento proprio. Tutto atomico con costo/eventi/ledger, e un draft ha una sola conferma/expenseId. Analisi nuova dello stesso originale può produrre altro draft ma mostra costi esistenti prima della scelta, non costi nuovi automatici.

Idempotenza prima CAS del replay; stesso key/body ritorna risultato autorizzato, nuova key su bozza confirmed409 draft_state_conflict (GET mostra costo già collegato), key diversa body409 idempotency_conflict. 409expense_version_conflict richiede rilettura costo, non nuovo record. Timeout rete mantiene key/body; UI non chiude né annuncia mancato salvataggio senza sapere. Provider non disponibile/manuale sempre raggiungibile, nessun fallback testfixture.

## Errori ulteriori e confini

409 work_version_conflict/work_state_conflict/draft_version_conflict/draft_state_conflict/expense_document_conflict; errori costi/G1 preservati. Errori analisi codici M4 se semantica identica + economic_document_unsupported/economic_multi_document_unsupported/economic_currency_unsupported/economic_credit_unsupported/no_supported_economic_data. Esito senza dati non descrive errore provider. Nessun response grezzo/APIkey/fileURL in log o DTO.

Storia legacy assenza metadata normalizzata in proiezione, migrazioni additive senza riscrivere valori/file/hash. HomeExpense con nullable category/supplier/date/work/provenienza; ledger e snapshot interni estesi senza perdere campi di replay vecchi. EconomicWork personale con FK Restrict/version/history/request. Privilegi e query esatti provati sul DB dedicato locale soltanto.

## Matrice tecnica prima congelamento/consegna

S1a: create/update legacy+nuovo, categorie null/mapping e sette famiglie, repairs_works con/senza lavoro e lavoro archiviato, rimozione lavoro senza cambio gruppo né totale, insurance standard/financing esplicita, other/null distinti, somma famiglie=totale e totaleWithoutFinancingCents esatto anche su filtro finanziamento, importi integer e sums bigint, periodi/bisestile/Roma/0001, filtri SQL e paging50+tie, riepiloghi stessi filtri, confronto basezero e delta percentuale esatto, privacy e cursorscope.

S1b: lavori active/archive con costi conservati, no duplicati work/object/room multiambiente, rimozione/cambio objectRef CAS/link G1, concurrent vie G1/H3/S1, boiler fonte revocata, activity fonte redatta, versioni native/calderia/file unchanged.

S1c: fixture sintetiche80+20,100+22, ambiguità/multiinvoice/credito/valuta/scansione, citazioni/hash mismatch/injection, costo preesistente/stesso doc diverso costo, conferma concurrent/idempotenza/doppiachiave/source revoke, fake provider errore nofallback, consenso/paiddisabled e ledger M4 invariato. Poi client/HTTP/browser reali senza live provider.

Decisioni finali: uno solo documento principale per costo, come H3a; costi di lavoro senza allocazioni; manuale breve con dettagli opzionali; confronto secondario, non KPI di risparmio; bozze open/parked recuperabili. Il client mostra insieme open e parked con state=all e selezione dei soli stati pendenti, oppure due pagine filtrate: mai considerare una prima pagina come elenco completo. La lista drafts usa DraftListItem senza estratti/candidati; GET dettaglio li espone solo con fonte autorizzata. Park/reopen richiedono CAS e idempotenza; stato di partenza diverso409 draft_state_conflict. Confirm richiede open, non parked. Fonte revocata redige proposte a {}, amountCandidates a [], amountSelectionRequired true, expenseLink con diritti correnti; dettaglio leggibile come non disponibile, confirm403. Nessuna cancellazione o scarto permanente in S1. Provider elenco descrittori tipizzato; billing conserva formato M4 USD a sei decimali senza alterare ledger. Analisi.enabled significa almeno un provider disponibile, ogni provider ha enabled distinto: fixture mai fallback a un errore Anthropic.

Gli esempi wire e i tipi sono normativi insieme al testo. Validazione e test di contratto nel backend fanno parte dell’implementazione, non vengono dichiarati già superati dalla sola definizione.

## Estensione opzionale invoiceMonth — 25 ottobre 2026

Il mese di riferimento della fattura è distinto da competenceFrom/competenceTo dei servizi. ExpenseValues economy-v1 e conferme onboarding accettano invoiceMonth opzionale string|null: formato esatto YYYY-MM, mesi01–12, anno diverso da0000. Omettere conserva la compatibilità; in modifica null cancella solo il mese. Emissione, scadenza e servizi non lo determinano implicitamente.

Snapshot economici, storico ed export personale conservano il dato quando presente. Per utenze con mese esplicito, filtri/riepiloghi contano il costo intero in quel mese; altrimenti restano i criteri precedenti, senza backfill. Intervalli dei servizi inseriti richiedono ancora entrambi gli estremi validi in ordine. Rotte legacy expenses-v1 invariate: nessun nuovo campo in scrittura.

Richiede migrazione additiva 20261025220000_expense_invoice_month prima dell'aggiornamento backend; nel lotto applicata solo a cluster offline. Nessun rilascio reale implicito. [Report](bollette-mese-fattura-20261025.md).
