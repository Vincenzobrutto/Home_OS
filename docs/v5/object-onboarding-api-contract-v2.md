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

