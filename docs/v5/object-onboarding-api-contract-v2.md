## Aggiornamento 23 ottobre 2026 — varianti di formato con rigore dei ruoli

Forma di API e campi invariati. Date ordine/acquisto, totale d’acquisto e spedizione usano ruoli condivisi con varianti italiane/inglesi; data fattura non prova acquisto. Per le tabelle prodotto, colonne esplicite riordinate con pipe/tab/punto e virgola e EUR nella cella o nella propria intestazione totale sono ammesse se univoche. Prezzo unitario, riga mancante, più intestazioni o attribuzioni ambigue non producono importi calcolati. Prezzo libero etichettato deve legare nome, ruolo e cifra alla stessa riga. Vecchie date d’acquisto senza ruolo valido richiedono revisione prima della conferma automatica. Quantità e prezzo restano indipendenti: prezzo assente/errato nella riga riconoscibile impone revisione economica senza ripiego automatico sul totale. Citazioni originali e snapshot invariati; dati optional non validi omessi con avviso, mantenendo l’identità leggibile. [Casi supportati e limiti](fase0-general-rules-offline-20261023.md).

## Aggiornamento 23 ottobre 2026 — ruoli degli ordini

`fields`/profilo aggiungono `orderDate` (ISO completo, origine/fonti come le altre date). Non alimenta `purchaseDate`, data della spesa o inizio garanzia. Intestazioni d’ordine non verificano più acquisto; vecchie proposte vengono riclassificate in lettura, nessun backfill. `documentInfo.facts` ammette `shippingCost`, subjectIndex=-1 e kind=purchase_order, con ruolo completo e valuta stampata; è dato documentale, non costo aggiuntivo. `PREZZO TOTALE` è un totale valido con gli stessi vincoli di evidenza. Gli ordini richiedono revisione finanziaria anche se il provider non la richiede; importo/data dichiarati restano ammessi nella conferma manuale. Prodotto ripetuto tra pagine dello stesso ordine respinto per revisione. Nessuna nuova rotta o migrazione. [Verifiche e limiti](fase0-orders-offline-20261023.md).

# Onboarding documenti e oggetti — contratto implementato O2–O5, 17 ottobre 2026

Implementazione autorizzata, additiva a Documenti V2/ricevuta/manuali. Questo file estende object-onboarding-spec-v1.md per la consegna completa richiesta. Modulo registrato nell’app, migrazione26 applicata al solo DB V5 dedicato; provider esterno disabilitato dopo il collaudo con esito incerto.

Base `/api/v5/homes/:homeId/object-onboarding`, sessione/contesto/CSRF, no-store, POST con chiave stabile salvo ricerca di sola lettura.

- GET `capabilities?documentId`: `{manualAvailable,aiAvailable,provider,requiresConsent,drafts,job}` con sole fonti correnti, nessun avvio/invio.
- POST `jobs`: `{documentId,provider,consentToProviderTransfer}`. Provider anthropic solo con campagna onboarding separata/hashautorizzato/budget e consenso file; nessun provider fixture nel runtime. Risposta202job. GET `jobs/:id`, GET `job-requests/:key` per recuperare un avvio senza reinvio cieco.
- POST `manual-drafts`: `{documentId}` per una proposta vuota modificabile. Non simula estrazione. GET `drafts/:id` restituisce snapshot fonte, proposte/articoli/esiti, revisione salvata e diritti attuali. Fonte persa redige contenuti.
- GET `drafts/:id/candidates?itemId&q&cursor&limit`: solo schede personali autorizzate della casa, nomi e dati con provenienze correnti, paginazione esplicita, motivazioni per articolo senza preselezione.
- POST `drafts/:id/review`: `{expectedVersion,review}` salva esclusivamente una revisione/rinvio, nessuna scrittura sulle schede; non introduce un passaggio obbligatorio prima della conferma.
- POST `drafts/:id/confirmations`: `{expectedVersion,source,choices}`. Ogni scelta contiene itemId, action create/link/skip/defer e, per create/link, valori controllati/ambiente/unità/decisioni sui conflitti e manuale facoltativo. Conferma diretta per uno o più articoli scelti; gli altri restano pendenti. GET `drafts/:id/confirmations/:key` recupera ricevuta con diritti attuali. Stessa key/body una sola transazione, body diverso409. Fonte e versioni target ricontrollate.

Oggetti e costi restano indipendenti. Solo purchase_document con importo/data attribuibili può proporre un costo; mail consegna/etichetta non lo fanno. Il riuso di un costo esistente è esplicito, non duplica il costo canonico. Un totale multiarticolo non si distribuisce automaticamente: chiedere scelta/importi oppure procedere senza spesa.

Dati tecnici tipizzati: marca, modello, riferimento, seriale, potenzaW, tensioneV, frequenzaHz, capacitàL; date acquisto/consegna effettiva e garanzia. Per campo: valore, origine, fonti del documento oppure pagina produttore. Foto senza nome→identificatore proposto e nome da confermare/arricchire; mai nome catalogo mascherato da citazione della foto. Default garanzia24mesi da consegna effettiva o acquisto stimato, etichetta e conferma obbligatorie, nessuna sovrascrittura di campi già confermati. Manuale da sorgente verificata oppure dichiarato dall'utente, mai URL del provider fidato automaticamente.

Persistenza dedicata: draft/output/review/decisions, job+lease, request ledger, campagne/attempts separati e binding articolo/unità/oggetto per prevenire duplicati dopo rianalisi/copie. I JSON ReceiptDraft V1 restano invariati. Un oggetto può avere più originali; un originale più oggetti. Dati personali e fonti revocate non diventano candidati né dati esportabili. Le proposte incerte restano proposte.

Lettura locale e lettura esterna distinte: l'upload continua ad archiviare/classificare localmente senza costi. L'analisi multimodale richiede consenso dedicato e non parte come fallback nascosto. Nessuna campagna precedente riattivata. Consenso ricevuto per il solo screenshot Amazon Echo Dot Max, una analisi entro0.25USD: esito incerto, nessuna proposta pubblicata e nessun reinvio. Vedere rapporto di sviluppo.

Ordine operativo: O2 dominio/schema/autorizzazioni → O3 conferme/versioni/replay/conflitti → O4 job/provider/budget e arricchimento → O5 UI/integrazione upload/schede → O6 regressioni/browser sintetico. Aggiornare il rapporto a ogni checkpoint; non dichiarare completamento dell'intero flusso dal solo nucleo o manuale.


## Collaudo reale v3 e nuova autorizzazione separata (17 ottobre)

`capabilities` include `canStartAnalysis`: un esito incerto blocca ulteriori avvii nella stessa campagna. Una diversa campagna configurata dall’operatore, con hash/limite propri e consenso separato esplicito, può consentire il nuovo avvio autorizzato senza modificare né liberare la riserva precedente. La UI conserva il vecchio esito, non lo ripete automaticamente e richiede di nuovo il consenso. Job attivi sul medesimo originale restano bloccanti anche fra campagne.

Campagna r2 autorizzata dal committente max0.25USD: primo preflight scaduto prima di Messages, riserva rilasciata; successivo avvio nella medesima campagna ha eseguito l’unico Messages pagato e pubblicato una proposta valida. Costo0.013558USD. Provider disabilitato al termine. R1 resta incerta e riservata; nessuna alterazione delle quote.


## Marca e modello ricavati dal nome (17 ottobre 2026)

`profile.brand/model` possono avere origine `derived_from_product_name`: proposta locale ottenuta dal titolo già estratto, con le stesse fonti autorizzate. Nessun reinvio al provider, modifica dell’output grezzo/fingerprint, scrittura sulla scheda o inferenza di codice prodotto/seriale/date/prezzo. Stessa derivazione in proiezione e conferma; candidati possono usare la coppia proposta senza preselezione. Valori espliciti e valori già confermati hanno precedenza; se dati espliciti contraddicono il titolo non si mescolano identità diverse.

Prima versione: prefissi di marche riconosciute, titoli con identità distinguibile; sconosciuti/accessori/marche multiple o modello tagliato restano incompleti. Un qualificatore marketing troncato tra parentesi non impedisce la proposta del nome commerciale completo che lo precede (Amazon Echo Dot Max). Non è lookup di catalogo o identificazione di variante. Etichetta UI «Ricavato dal nome del prodotto · Da confermare»; dopo conferma origine preservata.

Riferimento prodotto resta facoltativo e distinto dal modello commerciale, ordine e seriale. Recupero online da marca/modello con disambiguazione e miglioramento della descrizione campo rinviati su richiesta del committente; mai trasformare automaticamente il nome o un numero d’ordine in riferimento.


## Validazione ricevuta tabellare e integrazione caricamento — 17 ottobre

Data `purchaseDate`: oltre alle etichette già ammesse, una riga «Ricevuta d’acquisto» con una sola data completa attribuibile al documento acquisto è accettata. Le citazioni con più date non determinano una data certa. Quantità tabellare: intestazione Qtà/Qty/Quantità + Articolo/Descrizione, righe fisiche conservate, prodotto presente in una sola riga; numero della relativa riga, pagina e citazione verificati. Niente quantità ricavata dal primo numero o da un altro articolo. Totale/capacità/citazioni e vincoli precedenti restano attivi. `ProductEvidenceFailure` mantiene evidence_unverified ed espone ai soli log una coppia campo/motivo da enum, mai testo/documento.

Frontend: la pagina `/documenti/organizza?lotto=...` incorpora il componente reale di oggetti/spesa. Prime proposte pertinenti aperte automaticamente, altri documenti selezionabili nello stesso elenco; nessuna analisi esterna implicita. Parametri `oggetti-documento`, `oggetti-analisi`, `oggetti-bozza` indipendenti da lotto/filtri, ripresa senza cambio route. Versioni, chiavi, ricerca esistenti, consenso, costi e conferma sono quelli del servizio onboarding esistente.

Conferma coordinata: per documento nuovo con proposta chiara, «Conferma documento e articolo» applica prima l’organizzazione Documenti V2, poi la conferma articolo/spesa. Sono due operazioni recuperabili, NON una transazione unica. Se l’archiviazione è incerta non viene inviato alcun comando di creazione oggetto/costo. Se è già riuscita e la successiva scelta richiede correzioni, l’originale resta archiviato e la bozza conserva il percorso; nuova pressione non riarchivia il documento già confermato. Copie/conflitti/tipo incerto non passano automaticamente: devono essere rivisti prima della creazione, senza perdere le proposte. L’oggetto e il suo costo mantengono la conferma atomica backend esistente.

Non ripubblicare retroattivamente la vecchia risposta AI respinta: non è stata conservata. La correzione è verificata offline/sintetici e su un candidato costruito localmente dai valori stampati nel PDF personale, senza salvarlo come estrazione AI. Nessun nuovo invio reale autorizzato assunto.

### 17 ottobre 2026 — proposta automatica spesa con conferma unica

Ricevuta estratta non ambigua,unico articolo/esemplare,totale positivo e acquisto esplicito: controllo candidati e proposta create già visibile, mai scrittura prima della conferma articolo. Nessun costo automatico da consegna/etichetta/multiarticolo o dati insufficienti. Scelte precedenti salvate restano prioritarie, inclusa esclusione costo. Ricerca incerta/errore blocca proposta automatica: riprova oppure scelta esplicita. Stessa ricevuta o stessa cifra/data producono avviso senza scelta automatica. Importo/data non provano identità del costo: scelta link/skip oppure acquisto distinto dichiarato. Conferma resta una e usa transazione/idempotenza esistenti.

GET expense-candidates: rank2 stessa fonteSHA,rank1 stesso importo/data acquisto,rank0 selezione manuale. Ordinamento su tutto lo scope autorizzato prima della paginazione. Conferma expense.create ammette acknowledgePossibleDuplicate boolean opzionale; senza true un altro costo attivo leggibile con stesso importo/data genera409 onboarding_possible_expense_duplicate. True non supera il divieto di secondo costo per stessa ricevuta, né controlli fonte/target/versione. Nessuna migrazione o nuovo endpoint. Controllo ripetuto nella transazione con lock Home condiviso dalle mutazioni.

Verifiche: backend build/lint;17 test DB/HTTP distinti verdi includendo contenitori (12 DB+5HTTP), provider finto. FE build/lint;25 test distinti (16Onboarding,5model,4Intake). Primi fallimenti esclusivamente nei test: harnessIntake non gestiva nuova GET expense-candidates e test duplicato tentava di ricreare prima l'oggetto già censito; corretti harness e scenario per raggiungere il controllo costo via linkoggetto. Browser reale con fixture sintetica e parser fisico: documento cf26ce53-9bbd-427c-8771-c7a903b779e9,bozza47daf2da-f01a-4b28-884b-cc0b1f85a9b1,Home604f1dea. Costo179.90EUR/2026-09-15 preselezionato senza scegliCreate; un clic ha creato1oggetto c16e070c-4708-47e0-b53b-9a373180934d e1spesa canonica. Nuova bozzab169b93b sullo stesso originale segnala stessa ricevuta e blocca conferma senza scelta. Screenshot13 mostra proposta automatica sintetica. Non nuova estrazione AI: fixture valida caricata nel DB dedicato per provaUI; zero chiamate esterne. Nessun dato personale modificato, macchina ghiaccio già confermata dal committente preservata. API aggiornata/provider disabilitato.

Limiti: automazione per singolo acquisto, nessuna ripartizione multiarticolo; collegamento spesa mantiene i controlli preesistenti sui documenti incompatibili. Costo archiviato con stessa ricevuta resta protetto dal controllo sorgente già esistente; non ripristinato automaticamente. Nessuna nuova prova Safari fisico.

### 17 ottobre 2026 — esclusione individuale dalla casa

Scelta «Non riguarda questa casa» nel gruppo Crea/Collega di ogni articolo, anche ricevute con costo proposto. Nasconde campi/profilo/costi, azzera selezione costo/link/manuale e payload finale contiene solo itemId+action skip: nessun prezzo residuo può creare spese. Pulsante «Conferma esclusione», eliminato doppio comando Non creare un oggetto. Prima di confermare si può tornare a Crea/Collega; per una ricevuta chiara la proposta spesa viene ricontrollata. Conferme multiple mescolano scelte indipendenti; preparazione archiviazione documento solo se almeno una scelta crea/collega. Esclusione sola non resta bloccata dal tipo documento da indicare. Originale e altre proposte conservati. Nessuna cancellazione di costi precedenti o ripartizione automatica di totali multiarticolo: il divieto esistente di attribuire tutto il totale resta attivo.

Nessun endpoint/schema/backendruntime modificato: uso del comando skip già esistente, server rifiuta skip+expense.29FE/3file verdi,13DB inclusi contenitori verdi, build/lint frontend verdi. Test aggiunti: ricevuta con costo già proposto esclusa senza payload economico, articolo multiplo escluso lascia gli altri, ripristino scelta prima conferma, payload con costi residui e serverzerooggetti/zerospese/zerobinding/originalepresente. Prima nuovaasserzioneDB corregge assert.rejects per un errore sincrono, non controllo runtime. Browser app reale ordine70a1532f/bozza150a815d mostra3nuoveopzioni, nessuna scelta o conferma personale effettuata. Screenshot16-scelta-non-riguarda-casa.png. Zero AI/email/paid/env/modifiche dati personali. Provider disabilitato. Prossimo committente sceglie articoli estranei e conferma esclusione, poi classificazione documento e revisione router.

### 17 ottobre 2026 — valori riconosciuti visibili nei menu, marca Strong

MarcaStrong derivata localmente dal titolo router, con origine derived_from_product_name e fonte originale; descrizioni router/modem/ripetitore non diventano modelli precisi anche se non troncate. Identità esplicite e scelte utente protette. Nessuna nuova estrazione/provider: stessa bozza reale150a815d, nuove proposte proiettate dal nome già acquisito. Menu accettazione mostra direttamente il valore proposto (Strong, modello noto, date ecc.), preselezione accept già prevista per i nuovi campi; valori non identificati facoltativi restano vuoti. Fonti/origini restano visibili, selezioni salvate intenzionali non sovrascritte automaticamente.

12 testBEprofilo+19FErouter verdi, buildBE/FE e lint mirati verdi. TestaggiuntoStrong titolotroncato/generico/accessori/contraddizione, menu con dato e accept iniziale verificato. Sistemato mock old-job della prova consenso: prima rispondeva succeeded con altra id e smontava il pulsante; ora restituisce il vero stato uncertain dello scenario, nessun comportamento runtime modificato. Browser personale: salvataggio bozza conserva nome/checkboxutente e due esclusioni; selezionata proposta Strong come richiesto e salvata SOLO bozza. Nessun oggetto/costo confermato. Screenshot17-strong-precompilato.png, menuvalueaccept/labelStrong verificati. API aggiornata via launcherTelefono senza campagna; zeroAI/paid/env. Prossimo classificare documento ancora tipo da indicare, poi conferma router dautente.


## Consolidamento pilota — 17 ottobre 2026

Estensioni additive, senza migrazione. Fonte/versioni/idempotenza e autorizzazioni esistenti restano obbligatorie.

`fields.<key>` accetta `{action:"replace",expectedValue:string,consent:true}` esclusivamente con proposta server e valore corrente corrispondente. Nessun `value` client in replace. Controllati expectedVersion dell'oggetto, origine e vincoli di data/garanzia; marca/modello sincronizzati con campi base.

`expense.action=create` ammette `manualItemAmount:boolean`. Per documenti purchase_document multiarticolo richiede true, totale validato e quantità unitaria. Quote registrate come manual_item nelle decisioni JSON; contatore cumulativo per account/Home/hash in centesimi, lock transazionale Home condiviso con Spese. La somma non supera il totale, anche per più scelte della stessa richiesta. Costi già esistenti non riconosciuti come quote e quota già collegata allo stesso oggetto bloccano la nuova registrazione. Esclusioni non inviano dati economici. Single item conserva proposta e protezione del costo già presente. Nessuna distribuzione automatica o estrazione nuovi prezzi di riga.

UI: una conferma oggetto/costo, con eventuale preparazione documento precedente. Questo non rende atomici i due endpoint: documento archiviato e articolo ancora da completare restano esiti distinti. Recupero del corpo/chiave originali invariato.


## Pilota account/casa con budget persistente — 17 ottobre 2026

OnboardingAiConfig supporta ONBOARDING_AI_SCOPE=home con ACCOUNT_ID e HOME_ID entrambi UUID; senza scope resta obbligatoria l'allowlist SHA. Scope invalido/incompleto non si attiva. Contesto account/home verificato in capabilities, prima della riserva e prima di ogni fase di trasmissione, oltre ad accesso originale e consenso esplicito già esistenti.

Capabilities include budget opzionale/null: currency, limitUsd, committedUsd, remainingUsd (stringhe decimali), callsUsed, maxCalls, available, disabledReason. Visibile solo nel contesto autorizzato; nessun consumo esposto ad altri account/case. Budget esaurito blocca un nuovo invio anche quando restano chiamate; contatori persistenti non si rinnovano ai riavvii. Dettagli e collaudo in ai-home-pilot-20261017.md.


## Revisione unica V4 — 18 ottobre 2026

Estensioni additive, endpoint invariati: manual-drafts accetta documentKind facoltativo purchase_document/utility_bill; confirmations accetta manualPurchaseTotalCents positivo soltanto per bozze manuali prive di totale estratto. review conserva il totale manuale e la richiesta pending per recupero. items[].purchaseAmount contiene amountCents e fonte di riga validata; assente nelle bozze precedenti. expense-candidates?itemId accetta anche articoli prodotto e usa importo/data di quella riga. Limite cumulativo e skip senza costo invariati. Specifica: document-review-unified-v4.md.

## Provider wire V9 (18 ottobre 2026)
Solo interfaccia interna Anthropic: sources=[{page,excerpt,region}] (max256); evidence nei field/quantity/purchaseAmount/purchaseTotal/houseExpenses è indice intero0-based della propria fonte. Array0/1 per valori nullable. Normalizzatore respinge indici mancanti/negativi/frazionari/fuori range e cardinalità>1, ricostruisce prove prima del dominio; snapshot e tutte le verifiche immutati. DTO pubblici e bozze persistenti restano uguali. Non si disabilitano controlli di fonte per ridurre lo schema.

## Totali ordine e costi dichiarati (V10)
ProductExtraction.purchaseTotal ammesso per purchase_document e order_confirmation con totaleEUR esplicito; label Totale costi aggiunta. Le date ordine richiedono evidenza semantica completa, date assenti restano assenti. Confirmation expense.create/link ammessa su articolo anche per altri documentKind, solo con valori esplicitamente scelti e stessa validazione canonica. Nessun prezzo automatico da consegne/etichette; nessuna ripartizione implicita dei totali multiarticolo.


## 21 ottobre 2026 — Riuso dell’analisi riuscita

`GET capabilities` aggiunge `analysisSucceeded: boolean` e `successfulDraftId: string | null`, scoped ad account/casa/documento/versione/SHA, scopo prodotti. Un successo storico o una bozza extraction impediscono nuovi avvii (`canStartAnalysis=false`, `canStartWithUncertainAcknowledgement=false`), senza impedire lettura/modifica manuale. Il recupero non dipende dalla campagna AI corrente.

`POST jobs`: una chiave già registrata conserva il replay precedente; con chiave nuova, dopo autorizzazione fonte e lock di coda, un job riuscito dello stesso snapshot/scopo viene restituito senza nuova riserva/job/invio. Una extraction priva del job storico produce 409 `onboarding_analysis_already_succeeded`. Documenti/versioni/account/case/scopi differenti non condividono automaticamente il risultato. Nessuna modifica a schema, consensi o contratti di conferma. [Report](ai-success-reuse-20261021.md).


## 21 ottobre 2026 — Riferimento del documento e categoria proposta

La revisione `compilation` ammette facoltativamente `documentTarget: null | {kind: "object" | "boiler", id: UUID, expectedVersion: intero >= 1, name: stringa <= 120}`. Salva solo input, nessun collegamento. In lettura il nome è ricavato dal riferimento ancora leggibile/attivo nella casa/account; se indisponibile viene svuotato e il frontend richiede una nuova scelta. Gli errori infrastrutturali non vengono trasformati in perdita della bozza. La conferma usa il `target` già previsto dall’organizzazione del documento nel lotto, con fonte/versione/privacy e deduplica esistenti: nessun nuovo endpoint o schema.

Le voci dei suggerimenti di riferimenti esistenti possono includere `category?: string`: solo categoria ammessa, condivisa da tutte le spese leggibili pertinenti (stesso riferimento, fornitore normalizzato esatto, almeno due parole distintive comuni). Nessuna categoria su conflitto/valori mancanti o scansione arrivata al limite di 50. Il frontend la propone solo con un unico suggerimento e campo mancante mai modificato dall’utente; non è una nuova estrazione AI né una scrittura canonica. [Verifiche e limiti](document-flow-simplification-20261021.md).

## Estensione Q48 — fatture separate per pagina, 22 ottobre 2026

Per un file con più fatture non utility complete su pagine singole distinte, la bozza espone una `houseExpenses` per fattura con `invoiceSegment:{key,page}` derivato dal server e identità `itemId` separata. Fornitore, numero e data espliciti e unico totale corrente devono avere fonti sulla stessa pagina; niente soggetti/fatti/totale globali. Regioni e fonti restano obbligatorie. Non sono ammessi segmenti sovrapposti o identità ripetute. Tutto il gruppo richiede revisione, anche nel percorso automatico interno.

Conferma tramite `houseExpenses` già esistente: candidato di totale corrente e ancoraggi della fattura selezionata, senza importo manuale aggregato; una scelta per `itemId`, rinvio e conferma parziali conservati. `invoiceSegment` non è accettato come input. Stessa chiave/body → ricevuta corrente autorizzata; body diverso →409; errore di una fattura → rollback dell’intera richiesta. Il riuso di una spesa è ammesso soltanto per lo stesso segmento e fonte leggibile. Permessi e versione/SHA ricontrollati anche nel replay. Nessun endpoint o migrazione nuovi. [Contratto dettagliato e prove](fase0-q48-invoices-offline-20261022.md).

## Split payment e bozze precedenti — 23 ottobre 2026

Nessun endpoint o body aggiunto. Il server marca needsReview sullo split payment trovato nel testo completo verificato, anche se il modello omette il saldo alternativo. automaticPlan e la conferma interna automatic=true non possono creare risorse: codice onboarding_payment_review, controllo transazionale di policy e snapshot. Anche le vecchie bozze finanziarie prive dell’attestazione richiedono conferma esplicita; nessuna nuova analisi necessaria. La conferma pubblica resta manuale con scelte/importi/fonti validati, membership/visibilità e replay durevole. paymentReview è un metadato interno non accettato dal provider e non esposto dalla proiezione. [Regole, verifiche e limiti Q15](fase0-q15-payment-offline-20261023.md).

## Righe con importi verificati e data d’acquisto comune — 23 ottobre 2026

Nessun endpoint o body nuovo. Per la tabella testuale esplicita Importo, proposte mancanti di quantità/prezzo/data possono essere completate dalla stessa pagina autorizzata con fonti verificate; date solo da Data acquisto/Purchase date autonoma e univoca. Importi mai ripartiti dal totale. Le proposte errate mantengono avvisi e revisione. Gli items autorizzati possono includere invoiceLine:{key,page,row}, identità server non accettata dal provider; la perdita della fonte continua a redigere tutti gli items.

Conferma automatica: prezzo/data scelti devono coincidere con quelli dell’articolo, altrimenti onboarding_item_cost_review; controllo nella transazione prima della creazione. Deduplica per riga fra copie/rianalisi; collegare una spesa di riga diversa restituisce onboarding_invoice_line_conflict. Conferma manuale, flag multiarticolo manualItemAmount e replay con chiave/body restano nel contratto precedente; nessun calcolo delle quote. Fonti e identità conservate su costi/storico/ricevute, con visibilità attuale obbligatoria. [Regole e prove Q22](fase0-q22-lines-offline-20261023.md).

## Copertura per pagina delle fatture visive — 23 ottobre 2026

Nessun endpoint o body pubblico nuovo. GET draft può restituire invoiceCoverage (oppure null) con version/totalPages/sentPages/coveredPages/pendingPages, solo con fonte corrente autorizzata; la redazione della fonte non espone il metadato. Il wire provider v26 richiede invoicePages.pN per ogni pagina fisica inviata: invoice con una sola expenses, other/unreadable/continuation senza spesa. Globali vuoti per il percorso di fatture per pagina, fonti/ancoraggi tutti sulla pagina dello slot; marker di copertura soltanto server.

Conferma manuale di una proposta valida consentita anche con altra pagina pendente, ma state resta open. documentOnly con pendenti restituisce onboarding_invoice_coverage_review. Nessuna promozione automatica delle osservazioni visive, somma di fatture o completamento inventato; conferma completa possibile con copertura e scelte complete. Fonte/versione/SHA, privacy, transazione e replay restano obbligatori. Vecchie bozze non retrocompilate; UI del pendente e pagine non fattura/continuazione sono sviluppo successivo. [Report](fase0-q48-coverage-offline-20261023.md).

## UI della copertura e riferimento locale apparati — 23 ottobre 2026

La UI consuma il metadato server facoltativo invoiceCoverage e invoiceSegment.page già definiti: mostra pagine coperte/pendenti anche dopo conferma parziale, impedisce la chiusura solo-documento con pendenti e mantiene separati gli importi di ogni fattura nel riepilogo. Una fonte indisponibile non espone la copertura; una vecchia bozza senza metadato non viene retrocompilata. Nessun endpoint o campo di conferma nuovo.

Il vocabolario generico v4 nel frontend propone tipo e ambiente tipico dal nome esplicito, senza diventare una citazione, certezza del modello o dati di inventario. Il clic sul tipo riempie solo un campo vuoto; le posizioni effettive si confermano dalla scheda con il contratto G1 esistente. Il catalogo non cambia automaticPlan, fingerprint, identità, campi verificati o consensi. Prompt candidato v27 per titoli letterali; nessun invio autorizzato da questo aggiornamento. [Report](fase0-night-plan-offline-20261023.md).

## Revisione acconto/saldo — 23 ottobre 2026

Ogni scelta `houseExpenses` di una singola `simple_invoice` non segmentata può includere `purchaseReview`: su `create`, `{mode:"confirmed_total",confirmedTotalCents:<intero positivo>}` deve coincidere con `values.amountCents`; su `link_existing`, `{mode:"same_purchase",confirmedTotalCents:<intero positivo>}` dichiara lo stesso acquisto e il suo costo complessivo. Non è ammesso sulle bollette, nelle azioni skip/defer o sulle fatture segmentate. Il totale è dichiarato dall'utente, mai sommato o dedotto.

`same_purchase` richiede versione corrente e stato attivo della spesa, fonti leggibili con versione/SHA verificabili e identico insieme non vuoto di schede attive collegate ai due documenti. Aggiorna una sola spesa con CAS e storico atomici; nessun nuovo oggetto/costo. Replay ricontrolla tutte le fonti. `onboarding_purchase_objects_review`, `onboarding_purchase_source_review`, `onboarding_purchase_review`, `onboarding_purchase_amount_review`, `onboarding_invoice_object_review` e i conflitti versione/fonte chiedono revisione. L'automatico non può usare questa conferma. Il link ordinario continua a richiedere la stessa fonte.

Con precedenti fatture/costi sulle stesse schede, una nuova spesa è bloccata e resta da riconciliare. Il salvataggio di `houseForms.purchaseMode/purchaseTotal` è solo compilazione; nessun valore salvato autorizza una scrittura economica. [Report, prove e limiti](fase0-installments-fix-offline-20261023.md).
