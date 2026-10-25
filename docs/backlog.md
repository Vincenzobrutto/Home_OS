## 24 ottobre 2026 — Cestino frontend, stato dell’avviso dopo la navigazione

[revisione indipendente su 7586806](v5/cestino-frontend-review-7586806-20261024.md): E1 P2, scartare lo stato dell’avviso al cambio pagina. Sequenza: sposta, ripristina, cambia pagina, torna a Documenti; non deve tornare il vecchio messaggio di spostamento né l’Annulla della versione precedente. Conservare la riproduzione indipendente senza indebolirla. La riga AI resta conforme alla scelta del piano: un eventuale indicatore completo di trasmissione è un seguito distinto, non una modifica imposta da questo riesame.

**Tranche autonoma verificata:** [editor/presentazione R03](v5/fase0-editor-write-presentation-refactor-20261023.md), mock finale 860/860 e backend 496/496 HTTP/DB sintetici. [Chiusura, misure e opportunità residue](v5/fase0-refactor-closure-20261023.md): nessuna promozione del gate AI o nuovo branch impliciti.

**R05 verificato sui candidati:** [317 → 170 statement per 50 candidati](v5/fase0-candidate-query-batching-20261023.md), stessi filtri e lock; 496/496 HTTP/DB sintetici. Altri percorsi restano opportunità distinte da misurare, nessuna cache fra account.

**R10 completato:** [domini API separati, un solo trasporto](v5/fase0-api-client-domains-refactor-20261023.md), 860/860 mock e 581 confronti offline; entry +7.214 byte, nessun beneficio di velocità dichiarato.

## 24 ottobre 2026 — Collaudo: 403 intermittente su appartenenze appena create

- Due esecuzioni dell'aggregato `test:offline-db` (lotto Cestino, punta successiva a `66c2915`) sono fallite con 403 da `ReviewService.require` subito dopo la creazione di una casa di prova in `installment-linking` e `generalized-evidence`: prima 14 casi, poi 2. I file da soli passano e la terza esecuzione è verde. Ipotesi da verificare: `HomeMembership.validFrom` usa `now()` di PostgreSQL mentre `validMembership` confronta con l'ora di Node, e su Windows le due letture possono differire di qualche millisecondo. Possibili correzioni: data esplicita nei test, oppure tolleranza nel controllo, da decidere. Nessun test modificato. [Report](v5/cestino-lotto1-report-20261023.md#verifiche-dopo-il-riesame-finale).

## 23 ottobre 2026 — Cestino lotto 1: residui fuori perimetro

- Pagina Cestino, avviso «Annulla» e passaggio del pulsante attuale al cestino (lotto 2, frontend); dichiarare in UI che i documenti già inviati al fornitore AI seguono la sua conservazione. Documenti fonte di una scheda caldaia (AnalysisJob) oggi non spostabili: decidere il trattamento. Verificare che `DocumentIntakeRequest.results` non conservi il nome del file dopo l'eliminazione definitiva. Riapplicazione di `DeletionRecord` dopo un restore e ciclo delle copie di backup: lotto separato. [Report](v5/cestino-lotto1-report-20261023.md).

## 23 ottobre 2026 — R06/R09, confini di manutenzione

[Quattro componenti storici conservati deliberatamente; ingressi correnti e archivi documentali fedeli](v5/fase0-maintenance-boundaries-20261023.md). Nessuna rimozione UX/test o riduzione del bundle dichiarata. Ritiro eventuale distinto dalla chiusura del refactoring.

**Seguito R08:** [protocollo provider separato](v5/fase0-provider-protocol-refactor-20261023.md), prompt/schema e richieste equivalenti; 300 onboarding, 24 qualità, 16 guardie offline. Nessuna nuova chiamata AI.

**Seguito R04:** [conferma transazionale separata per fasi](v5/fase0-confirmation-orchestration-refactor-20261023.md), stessa transazione/ordine/errori; 495/495 HTTP/DB sintetici.

## 23 ottobre 2026 — Portafoglio debito tecnico V5 dopo audit

[Dieci rilievi con evidenze, priorità, rischio e lotti verificabili](v5/fase0-code-audit-refactor-20261023.md). R01 ciclo workspace/intake e R02 import anticipato dei form dalla Casa corretti nel primo lotto; R09 stato corrente separato dallo storico integrale, restante documentazione ancora aperta. R03 parzialmente affrontato: [proiezione delle spese/checklist](v5/fase0-editor-review-refactor-20261023.md) e [ripristino/serializzazione della compilazione](v5/fase0-editor-compilation-refactor-20261023.md) separati; restano gestione asincrona e altri editor. R04 parzialmente affrontato: [validazione del singolo campo](v5/fase0-backend-field-validation-refactor-20261023.md) e [quantità/prezzi/totale](v5/fase0-backend-purchase-validation-refactor-20261023.md) separati e verificati offline; restano altre validazioni e conferma transazionale. R07 [implementato e verificato](v5/fase0-offline-test-harness-20261023.md): tutti gli alias test backend protetti, 495/495 HTTP/DB sul cluster nuovo e prova di cleanup su errore; il DB permanente di test resta fuori scope; R05 query richiede misurazioni su sintetici prima di ottimizzare. R06 componenti non raggiungibili assenti dal bundle: nessuna rimozione automatica; R08 prompt, R09 riepilogo/storico documentazione e R10 client API da trattare separatamente. Ripetizioni di privacy/SHA/idempotenza ai confini non sono codice morto; nessuna rinuncia alle garanzie per ridurre righe.

## 23 ottobre 2026 — Caffè: prima proposta reale accettata, copertura da affinare

Terzo invio autorizzato riuscito con nome breve, marca/modello/data ordine coerenti. Restano prezzo articolo non proposto pur visibile nel PDF, descrizione estesa incompleta e colore non esplicito; quantità non verificata. Analizzare offline criteri generali di copertura dei campi e varianti, senza ricavare prezzi dal totale né regole sul campione. Nessuna modifica automatica alla bozza o ai dati confermati. Controllo umano ancora aperto; nessun gate AI promosso o ulteriore invio autorizzato. [Esito e confronto](v5/fase0-coffee-third-attempt-20261023.md). Le voci sottostanti descrivono i checkpoint storici precedenti.

## 23 ottobre 2026 — Nome breve implementato offline; misura reale ancora aperta

Nome breve letterale con descrizione estesa e fonti preservate, revisione obbligatoria e fingerprint sul testo completo. Il precedente rifiuto caffè non è retroattivamente attribuibile alla lunghezza; eventuale nuova misura AI resta separata e richiede consenso. Nessuna promessa di estrazione automatica delle varianti in attributi strutturati: quelle non esplicitamente validate restano nella descrizione da controllare. [Prove e limiti](v5/fase0-short-product-name-offline-20261023.md).

## 23 ottobre 2026 — Secondo tentativo caffè: nome da diagnosticare offline

Seconda singola chiamata autorizzata: rifiuto localizzato in item_field/name, nessuna proposta accettata e nessun oggetto/spesa salvato. Non ancora distinta la causa lunghezza/struttura/citazione. Verificare offline diagnostica più granulare e politica generale di nome breve documentato con modello separato, senza tagli che nascondano varianti o aumenti del limite. Nessun ulteriore invio autorizzato da questo esito. [Dettagli](v5/fase0-coffee-second-attempt-20261023.md).

## 23 ottobre 2026 — PDF caffè: diagnostica corretta, esito reale ancora da misurare

La prima risposta reale autorizzata è stata respinta alla fase evidence; la risposta grezza non è conservata e la causa specifica non è ricostruibile. Aggiunta diagnostica sicura di sezione/campo, verificata offline senza ridurre le validazioni. Resta aperta la verifica della precompilazione su questo PDF: nessun retry o aumento di budget in questo incarico, nessuna accuratezza reale dichiarata. Eventuale nuova misura richiede consenso e limiti espliciti. [Report](v5/fase0-coffee-rejection-offline-20261023.md).

## 23 ottobre 2026 — Chiuso offline: tre anomalie della revisione UI

Sincronizzazione prima dell’archiviazione manuale contro il conflitto del lotto avanzato dalla lettura locale; eventi input/change dei campi data; persistenza dei moduli irrisolti dopo conferma parziale, senza vecchie richieste pendenti o costi impliciti. Percorso UI ripetuto da casa vuota con saldo→acconto e ricaricamenti. [Correzioni e verifiche](v5/fase0-ui-fixes-offline-20261023.md). Nessun miglioramento AI/OCR dichiarato, né deploy sul DB reale.

## 23 ottobre 2026 — Formati generali: copertura dichiarata, nessuna eccezione per cliente

Nuovi ruoli e colonne riordinate verificati offline negli acquisti. Restano da valutare formati con celle unite/non separabili, altre lingue o valute e convenzioni estere di data: revisione esplicita finché non esiste evidenza sufficiente, senza inventare conversioni. Non estendere per automatismo le regole dei totali d’acquisto a saldi/bollette/fatture segmentate. I dati già confermati non vengono riscritti; nessun OCR/AI reale misurato. [Audit, regressioni e principio per nuove varianti](v5/fase0-general-rules-offline-20261023.md).

## 23 ottobre 2026 — Residui della verifica ordini reali

- Scansioni Samsung/caffè: testo locale indisponibile; revisione manuale disponibile, nessun OCR/AI misurato. Righe senza evidenza di ruolo sufficiente restano manuali; non rilassare validatori per adattarli ai campioni.
- Chiarire modello oscurato e voce aggiuntiva Samsung, anno della consegna caffè e date effettive di pagamento: non inferire dai metodi di pagamento.
- Nessun backfill delle vecchie date già confermate; eventuale revisione dei dati e contabilità distinta della spedizione/pagamenti richiedono un intervento specifico. Prompt v28 candidato non eseguito; gold e ledger immutati. [Report](v5/fase0-orders-offline-20261023.md).

## 22 ottobre 2026 — Da sistemare emersi in BL-02/BL-03

- **Test sensibili ai tempi**: `documentSearch.test.tsx` e `objects.test.tsx` possono fallire solo con la suite in parallelo (verdi da soli e nelle ripetizioni).
- **Test di integrazione sul DB dell'app**: le suite HTTP/DB creano account `@example.test` in `dimora_v5_product_dev`; valutare un DB di test dedicato (porta/nome) invece del vincolo unico in `assertDevelopmentDatabase`.

- **Originali mancanti nel DB V5**: 104 `StoredFile` senza file in `storage-private` (63 di case di account `@example.test` create dai test di integrazione sul DB `dimora_v5_product_dev`, 41 orfani senza documento). Nessuno delle case del committente. Decidere pulizia sicura e separare i test di integrazione dal DB usato dall'app; lo script di backup originale si ferma su questi record (copia tollerante in `outputs/Dimora-V5-backup-verify-tolerant.mjs`).
- **Foto HEIC trasparenti (rinviato dal committente il 22/10)**: conversione automatica HEIC→JPEG sul dispositivo prima del caricamento (Safari con decodifica nativa; Chrome/Edge/Android con libreria libheif-js LGPL-3 caricata solo quando serve, previa approvazione della licenza). Si archivia la copia JPEG, metadati/GPS non copiati, foto oltre ~16 MP ridotte. Oggi HEIC è rifiutato con istruzioni.
- **Storia della casa, release successiva**: filtro per oggetto/tipo; raggruppare o filtrare «Aggiunto a Dimora» se domina l'elenco.

## 21 ottobre 2026 — Frizioni residue del collaudo fatture

Collegamento diretto, titoli/categoria, ordine della coda e rotazione anteprima risolti nel [seguito del collaudo](v5/document-flow-simplification-20261021.md). Restano proposte coordinate all’interno dello stesso lotto e analisi offline di `analysis_invalid_output` su un originale tecnico, preservando i validatori. Nessun nuovo invio a pagamento implicito.

## 18 ottobre 2026 — Chiuso: schema impianto e selezione AI

Risolto il salvataggio che richiedeva classificazione non disponibile nel pannello: system_diagram e catalogo completo sono supportati, con tipo/titolo inline e consenso esplicito alle sostituzioni. Implementata la richiesta di AI sui documenti selezionati a checkbox, in modalità solo proposte con stato persistente. Il limite tecnico del singolo gruppo è20; gruppi ulteriori restano avviabili esplicitamente entro budget/quote. Restano le attività sul cestino e sugli ingressi legacy già annotate, senza estendere qui lo scope.

## 18 ottobre 2026 — Seguito pagina unica Documenti

- Cestino/ripristino per originali già analizzati o collegati: la rimozione definitiva attuale è disponibile prima dell’uso; successivamente spiega il vincolo e conserva proposte, collegamenti e storico economico/AI. Progettare una rimozione reversibile senza perdita della fonte né azzeramento di riserve/costi.
- Consolidare anche gli ingressi legacy dal dettaglio e i vecchi link dei lotti sulla pagina unica; ora rimangono compatibili, mentre l’ingresso principale Documenti è unificato.
- Valutare salvataggio automatico della bozza della revisione al cambio pannello: oggi restano espliciti «Salva e organizza» e «Decidi più avanti»; non promettere persistenza di modifiche non salvate.

## 18 ottobre 2026 — Accesso alla revisione risolto

RISOLTO il rilievo «Controlla e organizza» nascosto: Da completare ora visibile in Documenti, lista aperti non vuoti e ripresa diretta del lotto. Include stati caricamento/errore/vuoto e paginazione. Sostituisce la precedente nota UX riportata qui sotto.

## UX rilevata dal committente — accesso alla revisione

«Controlla e organizza» è raggiungibile da Carica documenti→Caricamenti precedenti, dalle azioni di compilazione e da Organizza documento nel dettaglio. Accesso troppo indiretto dalla lista Documenti: da valutare un ingresso esplicito ai caricamenti da completare, senza duplicare revisioni o creare una nuova area separata. Non implementato in questo incremento.

## 18 ottobre 2026 — Scarto file in ingresso

RISOLTO: scelta file immersa nel testo e assenza di scarto prima dell’analisi. Rimozione da lista locale o lotto scartabile, con protezione originali esistenti e contenuti elaborati.

Da valutare separatamente: cestino generale per documenti già organizzati/collegati e gestione delle dipendenze; in questo incremento tali contenuti non si eliminano dal caricamento.

## Aggiornamento 18 ottobre 2026 — Rubrica dai documenti

RISOLTO: proposta automatica installatore con recapiti/IVA nella stessa analisi, conferma unica o processo delegato con consenso aggiornato.

DA VALUTARE: più professionisti nello stesso documento e recapiti su pagine differenti richiedono revisione; il primo incremento ammette un emittente documentale, non rubrica indiscriminata dei fornitori. Il CF e la partita IVA possono essere entrambi estratti ma il modello contatto conserva un solo identificativo (preferenza IVA). Nessun recupero contatti dal web o messaggio ai professionisti. Le vecchie analisi non vengono riscritte retroattivamente; usare un nuovo invio consentito quando necessario.

## 18 ottobre 2026 — BL-10 prima versione mini rubrica operativa

Completati CRUD privato, archivio, ricerca/paging, collegamenti canonici da schede salvate e creazione inline atomica, proposta installatore da issuer esistente, export personale. Residui espliciti: picker/creazione in bozze di nuove spese/lavori, conferma AI combinata BL-10b, riuso fra case e contatti condivisi da specificare. Nessuna importazione telefono/recapiti online. Fuori scope osservato: dettaglio conformità conserva ancora alcuni testi generici Oggetti e spese pur avendo archiviazione document-only; semplificare in successivo intervento UX. [Prove e limiti](v5/mini-rubrica-20261018.md).

## 18 ottobre 2026 — Consolidamento autonomo estrazione

Chiusi offline conformità document-only, importi ausiliari, passaggio dei dati alla revisione e salvataggio con costo. Resta da misurare la completezza V16 su nuovi originali; non consumata l’ultima chiamata per ripetizioni. Futuro: collegamento emittente/installatore alla mini rubrica, senza digitalizzare dettagli della conformità. [Report](v5/unified-review-autonomous-final-20261018.md).

## 18 ottobre 2026 — Importi ausiliari: secondo blocco chiuso offline

Risolti casi riproducibili di zero ausiliario e ruoli totali delle bollette; preservati replay finanziari della bolletta67.97/76.97 e fattura1537.20. Rimangono in revisione citazioni con valuta non attribuibile, etichette non riconoscibili, saldo differente/arretrati positivi. Non usare l’ultima analisi per ripetizioni senza ipotesi. Prossimo blocco3: dati estratti/manuali nella revisione unica/scheda, esclusioni e doppioni. [V16](v5/house-amount-evidence-v16-20261018.md).

## 18 ottobre 2026 — Conformità semplificata: obiettivo tecnico ritirato

Completato percorso classificazione/originale/casa senza oggetto o campi tecnici. Non proseguire il recupero di potenze, tipo impianto o altre specifiche della conformità come requisito onboarding. FUTURO: proporre il collegamento dell’installatore esplicito alla mini rubrica, valutando dati esistenti e controllo doppioni; nessun nuovo contatto creato ora. Proseguire blocchi importi ausiliari e dati nella revisione unica. [Report V15](v5/conformity-document-only-20261018.md).

## 18 ottobre 2026 — Primo blocco autonomo estrazione

Chiusi offline i casi riproducibili di data dichiarazione citata senza etichetta adiacente e alias italiano del tipo impianto. Rimane non dimostrata la causalità esatta delle omissioni nella precedente risposta personale, non conservata. Prossimo blocco: importi ausiliari fatture/bollette e distinzione dei ruoli. Nessun nuovo live test; resta una sola analisi. [V14](v5/conformity-evidence-v14-20261018.md).

## 18 ottobre 2026 — Estrazione V13

Completati: righe Amazon con descrizione multilinea, quantità parziali, classificazione di planimetria visiva senza titolo e diagnostica sicura. Verificati sette originali con otto analisi; caffè con i cinque dati richiesti. Da affinare: data e tipo impianto della conformità, candidati economici ausiliari senza perdere costo corrente/importo da pagare. Usare fixture/replay: resta una sola chiamata delle 40 autorizzate. [Report](v5/document-extraction-v13-20261018.md).

## V5 — residui del caricamento automatico (2026-10-18)

- Misurare completamento senza interventi su corpus reale, prima di chiamare affidabile l’esperienza automatica. La nuova orchestrazione non corregge da sola quantity/evidence_unverified o output AI incompleti.
- Migliorare recupero locale/OCR e riuso verificato tra sorgenti identiche; ora il worker riusa soltanto bozze estratte della stessa sorgente/versione/SHA.
- Abbinamento oggetti fra fonti diverse resta assistito: stesso modello non prova stesso esemplare. Quantità multiple, consumabili, nomi troncati e candidati esistenti restano eccezioni.
- Bollette con canone/arretrati o più totali: richiesta mirata, senza omettere o distribuire importi automaticamente.
- Estendere recupero trasparente all’intera saga classificazione/conferma e mostrare avanzamento anche nell’archivio, oltre alla pagina del caricamento. Annullamento coordinato di tutte le creazioni del lotto non implementato; le modifiche/archiviazioni esistenti restano disponibili.

## V12 — riscontri ripopolamento reale 18 ottobre 2026

- Quantità ricevuta Amazon: evidence_unverified sul layout Descrizione/Quant./Prezzo/Totale con nome prima della quantità. Coprire con fixture sintetica e prova quantità rigorosa; robot completato manualmente dall’originale senza ulteriore invio.
- Caffè: un nuovo tentativo analysis_invalid_output sullo stesso file che aveva estrazione V12 valida. Serve diagnosi e test sintetico della completezza/validità, senza attribuire automaticamente il problema al documento. Riusata estrazione validata solo dopo identità SHA.
- Riepilogo elenco documenti: fattura lavori simple_invoice appare come Bolletta nel testo sintetico della proposta accettata. Distinguere per documentKind; la classificazione canonica e la categoria spesa sono corrette.

## V12 — riscontri live

Prime due letture reali riuscite. Da affinare: candidato oggetto esistente quando nome/modello manuale differisce dal prodotto estratto (mai associare automaticamente solo per documento comune); avvisi opzionali su importi secondari/consegna senza oscurare i dati validi. Citofono classificato elettrico e titolo fattura lavori specifico risolti localmente.

## V12 — aggiornamento 18 ottobre 2026

Chiusi: spesa lavori senza oggetto, visualizzazione congiunta soggetti/spesa, omissioni isolate dei costi errati e data intestazione fattura. Restano collaudo V12 con consenso UI e misura richiamo del modello reale, OCR/PDF misti, persistenza delle modifiche non ancora inviate ai campi spesa su refresh, campi tecnici canonici e attività/interventi. Le vecchie bozze non vengono arricchite retroattivamente.

## V11 — formato totale fattura corretto

Risolto formato valuta EUR/€ tra parentesi sul totale finale. La risposta AI rifiutata non è conservata: nessun recupero retroattivo; prossimo collaudo solo con nuovo consenso UI nel budget esistente.

## V11 — aggiornamento 18 ottobre 2026

Chiusa prima tranche conformità/fattura/bolletta/etichetta con test sintetici. Restano: misurare qualità live V11 con consenso; fatti tecnici canonici editabili e interventi; OCR per pagina/PDF misti; allineare indicatore classificazione locale della riga ai metadati AI in revisione prima del salvataggio preservando conflitti. Vedi report V11.

# Backlog

## Validazione nuovo prototipo Blu architettura — 2026-10-13

- **P0 UX:** testare con il committente i tre journey completi, incluse varianti offline/403/quota/scadenza, tastiera e stati persistenti; raccogliere modifiche prima dello sviluppo reale. Mappa e copione in outputs/dimora-v5/README.md della chat locale.
- **P0 architettura:** definire stack frontend nuovo, senza importazioni da frontend legacy; audit selettivo solo backend. Registrata scelta utente Blu architettura in ADR 79.
- **P0 sicurezza:** i controlli browser del prototipo illustrano i permessi ma non sono sicurezza di produzione. Implementare e testare matrice ruolo/risorsa/operazione, accessi file, ricerca/retrieval, inviti neutri, revoca e retention prima della V1.

## Audit Windows / V5 — 2026-10-13

- **P0 prima beta:** audit npm sui lockfile di `5fb0415`: frontend 2 high (`nanoid`, `source-map-js`); backend 13 (3 moderate, 8 high, 2 critical, incluse `handlebars` e `proxy-addr`). Valutare raggiungibilità e aggiornamenti compatibili; nessun `audit fix --force` applicato.
- **P1 demo:** preview V5 funzionante in sviluppo, ma build Vite standard solo legacy; definire target demo separato o build multi-entry prima di distribuire la preview.
- **P1 qualità:** warning hooks exhaustive-deps in Inbox, Gmail e Drive, da analizzare prima di correggere.
- **P1 comandi:** output backend `dist/src/main.js`, mentre `start:prod` indica `dist/main`; riallineare prima di deploy. Il launcher locale usa il percorso effettivo.
- **P0 Partner:** organizzazioni/edifici/scale/unità, permessi per operazione, manifesti/versioni e report privati separati da `Issue` Genesis: restano R00–R06 dei documenti V5, non completati dalla configurazione locale.

Attività aperte. Le voci storiche usano **Alta/Media/Bassa** per urgenza tecnica; la roadmap v6 usa **P0/P1/P2/P3** per sequenza di prodotto. Un vincolo di sicurezza “Alta prima di produzione” resta bloccante anche se non genera valore utente immediato.

**Aggiornamento B25 (2026-08-04): completata.** La riga dettagliata più sotto conserva lo scope concordato come specifica storica; non è più un'attività aperta. Implementati `UtilityBill`, estrazione/conferma, confronto YoY e installazioni mensili; vedi `decisions.md` #30.

| # | Attività | Priorità | Dipendenze / note |
|---|---|---|---|
| B1 | Ampliare i test automatici backend (unit + e2e) — 18 test coprono stato/garanzia Asset, pipeline documentale e calendario manutenzioni | Alta | proseguire con error handling di `analyze`, transazione service manutenzioni, rami creazione multipla/house-level e test e2e API |
| B1b | Test automatici frontend — nessun framework installato, `package.json` non ha nemmeno uno script `test` | Alta | scegliere e installare un framework (es. Vitest, già compatibile con Vite) prima di aggiungere test |
| B2 | ~~Autenticazione/sessione reale sulle API~~ — risolto 2026-08-24: sessione via cookie httpOnly + `Session`, `AuthGuard` globale, autorizzazione per-casa via `HouseMembership` su ogni rotta | — | chiuso, vedi `decisions.md` #32. Resta da valutare: rate limiting sul login (nessuna protezione anti brute-force oggi), reset password via email (nessuna infrastruttura di invio email esiste) |
| B3 | ~~`git init` del repository~~ — risolto 2026-08-02, repo pubblicato su https://github.com/Vincenzobrutto/Home_OS | — | chiuso. Nota: durante l'operazione trovato e rimosso un secondo prima del commit (password DB in chiaro in `.claude/settings.local.json`, mai coperta da nessun `.gitignore` esistente) — vedi `decisions.md` #17 |
| B4 | OAuth Gmail/Drive non funziona se avviato da un cellulare in LAN (redirect URI pensato per `localhost`) | Media | richiede decidere come gestire il redirect URI quando l'host non è fisso (vedi `decisions.md` #12 sullo stesso problema già risolto per le chiamate API dirette) |
| B5 | ~~`FRONTEND_ORIGIN` manca da `backend/.env.example`~~ — risolto 2026-08-02, ora documentata anche `VITE_API_URL` in `frontend/.env.example` (nuovo file) | — | chiuso |
| B14 | ~~12 errori lint in `claude-extraction.service.ts`~~ — risolto 2026-08-03: tipata la risposta `/v1/messages`, `npm run lint` ora 0 errori/0 warning (inclusi i 2 warning correlati in `documents.service.ts` e 1 in `main.ts`) | — | chiuso |
| B15 | `backend/package.json#prisma` è deprecato (Prisma avvisa in vista della v7) | Bassa | migrare a `prisma.config.ts` quando si valuterà l'aggiornamento oltre 6.19.3 (vedi `decisions.md` #14) — non urgente da pinnati |
| B16 | Bundle frontend: `dist/assets/index-*.js` ~773 kB (222 kB gzip), oltre la soglia di warning di Vite | Bassa | valutare code-splitting (`import()` dinamico) se il tempo di caricamento diventa un problema reale, non anticipare |
| B6 | Righe Ambienti sospette/corrotte (AMB-005–AMB-011) da verificare | Media | segnalato come task separato (chip `task_fb8af2a5`) in una sessione precedente, non ancora verificato né chiuso |
| B7 | Evento cronologia "Daikin Perfera" su un asset AC dall'aspetto stale — chiarire con l'utente se è dato reale o di test | Bassa | richiede input utente, non risolvibile solo leggendo il codice |
| B8 | Contatto "Idrotermica Bianchi" potenzialmente collegato a eventi storici non pertinenti | Bassa | richiede verifica manuale dei dati, non un bug di codice |
| B9 | Rubrica: nessun auto-suggerimento di contatto esistente quando il campo "Fornitore" estratto da un documento coincide con un contatto già in rubrica | Bassa | oggi il collegamento contatto↔intervento è sempre manuale, deliberatamente (vedi `domain-model.md` su Contact) — da rivalutare se il re-inserimento manuale diventa fastidioso in uso reale |
| B10 | Token OAuth Gmail/Drive salvati in chiaro in DB | Alta (prima di produzione) | accettabile per l'MVP locale, non per un deploy esposto — indipendente da B2 (login/sessione), riguarda solo lo storage dei token Google, vedi `architecture.md` §2 |
| B11 | Navigazione senza URL reali (niente back/forward browser, niente link condivisibile a una vista) | Media | richiederebbe introdurre un router (oggi deliberatamente assente, vedi `architecture.md` §3) |
| B12 | Multi-utente per casa (UI di invito/permessi) | Media | modello dati (`HouseMembership`) pronto e **già il criterio di autorizzazione effettivo** (B2, `decisions.md` #32) — manca solo la UI e l'endpoint per invitare un secondo utente a una casa esistente |
| B13 | `MOBILE_CSS` ha un solo breakpoint (860px), nessun trattamento dedicato per tablet | Bassa | da rivalutare solo se emerge un caso d'uso tablet reale |
| B17 | ~~Matching documento→asset: singola parola condivisa poteva essere solo la marca~~ — risolto 2026-08-03: richiede >1 parola condivisa, o 1 parola se è "di prodotto" (`PRODUCT_WORDS`) | — | chiuso, vedi `decisions.md` #23. Test di regressione in `documents.service.spec.ts` |
| B18 | Notifiche manutenzione fuori app (email/push/calendario) — **IN STANDBY** | — | sospesa dall'utente il 2026-08-03 prima della requisitazione definitiva. Nessun provider/canale/frequenza approvato e nessun codice da sviluppare finché non viene riattivata. Il dominio e i promemoria Dashboard restano pronti come base futura. |
| B19 | ~~Suggerimenti di manutenzione ignorati ricompaiono ad ogni apertura~~ — risolto 2026-08-03: nuova tabella `DismissedMaintenanceSuggestion`, endpoint `POST .../dismiss`, verificato persistere dopo reload | — | chiuso, vedi `decisions.md` #22 |
| B20 | Linee guida di manutenzione coprono solo CLIMA/CALDAIA/FOTOVOLTAICO/ELETTRICO | Bassa | estendere `backend/src/common/maintenance-guidelines.ts` se emergono cadenze generiche affidabili per altri tipi (oggi TETTO/FINESTRE/ELETTRODOMESTICO ne sono privi deliberatamente) |
| B21 | ~~Form piano di manutenzione: campi "ogni N mesi/anni" e "giorni di preavviso" senza etichetta~~ — risolto 2026-08-03: aggiunte le label "Ricorrenza", "Ogni quanti", "Preavviso (giorni)" | — | chiuso |
| B22 | ~~Proporre il completamento di piani di manutenzione da un documento caricato, anche su più Asset~~ | — | chiuso 2026-08-03: estrazione interventi eseguiti, matching live sui piani, selezione Inbox e conferma transazionale; vedi `decisions.md` #24. Iterazione futura possibile: creare un piano quando non esiste alcun candidato. |

| B23 | Export "libretto casa" in PDF | Media | riepilogo stampabile per casa: elenco Asset con garanzie, cronologia interventi, documenti collegati (raggruppati per ambiente). Caso d'uso concreto e puntuale: vendita dell'immobile o pratica assicurativa, il tipo di bisogno per cui un utente paga volentieri anche senza abbonamento (es. acquisto una tantum). Tecnicamente il dato è già tutto in DB (Asset/Room/Document/AssetTimelineEvent) — il lavoro è soprattutto un template di rendering PDF lato backend o frontend, non un nuovo modello dati. Buon primo esperimento di monetizzazione perché non richiede prima un sistema di piani/abbonamenti (a differenza di B26) |
| B24 | Limite mensile di documenti analizzati dall'AI nel piano gratuito (freemium) | Bassa | leva di monetizzazione onesta perché rispecchia un costo reale: ogni `POST /documents/:id/analyze` è una chiamata a pagamento a Claude (vedi `architecture.md` §2). Autenticazione reale ora c'è (B2 chiuso), ma serve ancora un sistema di account/piani a pagamento che oggi non esiste — da affrontare dopo, non prima |

| B25 | Monitoraggio consumi elettrici (bollette + correlazione visiva con Asset installati) — **design affinato con l'utente il 2026-08-03** | Media | **Scope v1**: solo elettricità (gas/acqua non ora — il collegamento a un Asset specifico ha senso soprattutto per l'elettrico; possono diventare v2 riusando la stessa entità con un campo `type`). **Modello dati**: nuova entità dedicata `UtilityBill` (houseId, periodo inizio/fine, kWh, importo, fornitore, `documentId` opzionale verso la bolletta caricata per tracciabilità) — non campi liberi su `Document`, serve poter interrogare/aggregare per il grafico, stesso motivo per cui `MaintenancePlan` è un'entità propria e non testo su un documento. **Pipeline**: riusa l'estrazione documentale esistente — nuovo `docType` "Bolletta elettrica" riconosciuto da Claude (fornitore, periodo, kWh, importo), poi conferma esplicita dell'utente crea lo `UtilityBill` (stesso principio "AI propone, utente conferma" di `decisions.md` #2/#19/#22). **Visualizzazione** (mockup validato con l'utente): istogramma mensile con due barre per mese — anno corrente (blu solido) e stesso mese anno precedente (grigio chiaro) per rispettare la stagionalità invece di un confronto mese-su-mese fuorviante; badge di variazione % sopra ogni coppia di barre, colorato per severità (calo=teal, stabile=grigio, aumento moderato=ambra, aumento forte=rosso); sotto ogni mese, badge circolare colorato per categoria (stesso linguaggio visivo del placeholder Dashboard, B31) per ogni Asset con `installedAt` in quel mese, cliccabile verso l'asset. Nessuna libreria di charting: barre disegnate a mano (div/SVG), coerente con lo stack minimale già scelto. **Cosa NON fare in v1** (scartato deliberatamente durante la discussione): non attribuire un consumo/risparmio stimato in € a un singolo Asset in base a classe energetica — richiederebbe una tabella di stime da verificare con fonti reali (stessa lezione della caldaia, `decisions.md` #20/#21) ed è meno onesto della semplice giustapposizione temporale "ecco cosa hai installato in questo periodo": l'utente trae la conclusione, l'app non finge di misurare quello che non misura. Resta un'estensione futura separata, non v1. **Edge case da gestire**: primo anno d'uso, niente confronto anno-su-anno finché non c'è almeno un anno di bollette — mostrare solo la barra corrente, nessun badge di variazione, nessun errore. Possibile suggerimento (non bloccante) di recuperare bollette storiche via scan Gmail/Drive (infrastruttura già esistente) alla prima attivazione della funzione. |
| B26 | Rilevatori di sicurezza (fumo, CO, allagamento) trattati come Asset con piano di manutenzione per la sostituzione batteria/dispositivo | Bassa | nessun lavoro nuovo di piattaforma: si appoggia 1:1 su Asset + MaintenancePlan già costruiti — serve solo eventualmente un `AssetType` dedicato (oggi andrebbero forzati in ELETTRODOMESTICO) e una linea guida in `maintenance-guidelines.ts` (da verificare con fonte reale prima di aggiungerla, vedi `decisions.md` #20/#21 sul perché non si inventano cadenze). Alto valore percepito (sicurezza) per sforzo quasi nullo |
| B27 | Generalizzare il concetto di "scadenza" oltre l'Asset (polizza casa, APE, tasse legate all'immobile come IMU/TARI) | Media | oggi solo `Asset.warrantyUntil` ha una scadenza tracciata con promemoria automatico; polizze, APE (validità decennale) e scadenze fiscali della casa sono oggi solo `Document` senza data di scadenza propria. Riuserebbe lo stesso motore di calcolo/promemoria già costruito per garanzie e manutenzioni (`asset-status.ts`, `maintenance.ts`), applicato a `Document`/`House` invece che ad `Asset` — probabile nuovo campo `expiresAt` su `Document` più la logica di stato che va con esso |
| B28 | Valore stimato del contenuto casa, calcolato dai prezzi già estratti dai documenti | Bassa | quasi a costo zero: molti `AssetCustomField` già contengono prezzi (es. "Prezzo netto articolo", "Totale pagato") estratti dalle fatture — basterebbe sommare i campi con un'etichetta riconoscibile come prezzo per Asset non dismesso. Utile per un'assicurazione "a valore intero" e per il libretto PDF (B23), con cui si completa bene. Attenzione: i campi liberi non hanno un'unità/valuta strutturata, servirebbe normalizzare prima di sommare |
| B29 | ~~"Punteggio salute casa" aggregato in Dashboard~~ — implementato e superato dall'Home Score di Genesis (2026-08-04): 5 dimensioni pesate, motivato riga per riga, non solo un numero aggregato | — | chiuso, vedi `genesis-architecture.md` §4 e `decisions.md` #25 |
| B30 | Integrazione con dispositivi smart-home reali (IoT) per stato effettivo invece di calendario fisso | Bassa | idea a lungo termine, sforzo nettamente maggiore delle altre voci di questa sezione: alcuni Asset hanno già un campo libero "Connettività: Wi-Fi/SmartThings" nei dati estratti, ma leggere lo stato reale (es. "filtro da pulire" segnalato dal dispositivo stesso) richiederebbe integrazioni separate per piattaforma/marca (SmartThings, cloud Daikin, ecc.), ciascuna con la propria autenticazione OAuth e API — non un'estensione incrementale della pipeline documentale come le altre idee. Da valutare solo se le voci più semplici (B18, B25-B29) si rivelano insufficienti |

| B31 | Nuovo look&feel (palette blu/verde acqua + badge colorati per categoria) è solo su Dashboard, come placeholder — decidere se propagarlo al resto dell'app | Media | avviato 2026-08-03 su richiesta esplicita dell'utente (colori più accattivanti, icone più belle). La nuova palette vive per ora SOLO in `Dashboard.tsx` (oggetto locale `PT`, non in `theme.ts`) apposta per restare isolata finché non viene confermata — il resto dell'app (Sidebar, Assets, Inbox, ecc.) è ancora sullo stile "carta/inchiostro" originale, quindi oggi c'è un'incoerenza visiva voluta e temporanea, non un bug. L'utente vuole pensarci ancora prima di procedere. Quando si riprende: (1) rifinire ulteriormente la Dashboard se serve, (2) decidere se promuovere la palette `PT` e la mappa `CATEGORY_COLORS` a `theme.ts` (sostituendo T.pine/T.ochre/T.rust), (3) propagare a Sidebar/Assets/Inbox/RoomsHub/FloorPlan/Contacts/HouseDocuments/Maintenance, (4) aggiornare `ASSET_TYPES`/`ROOM_TYPES` in `theme.ts` con i nuovi colori per categoria invece dei 4 toni riusati oggi |

| B32 | `MaintenanceFromDocument` (Inbox, B22): il messaggio di successo "N manutenzioni completate e collegate al documento" è colorato di rosso (`T.rust`), stile errore, anche quando l'operazione è riuscita | Bassa | trovato durante la verifica live di B22 (2026-08-03) — condizionare il colore all'esito (verde/neutro per successo, rosso solo per errori reali) invece di riusare sempre lo stesso stile per il div dei messaggi |

| B33 | ~~Genesis: la conferma di una Observation non verifica se esiste già un Asset/Room simile in casa~~ — risolto 2026-08-04: `genesis-duplicate.ts` segnala i possibili duplicati (stesso tipo + nome simile) nello step di revisione, che parte scartato per default (annullabile) | — | chiuso, vedi `decisions.md` #26 e `genesis-architecture.md` §6bis. Verificato live: 10/10 elementi di una scansione demo su dati reali correttamente segnalati, nessun duplicato creato dopo lo scarto |
| B34 | ~~Genesis: ripresa precisa del wizard~~ — risolto 2026-08-04: `House.genesisStep` conserva tutti i 6 step; riaprendo Review vengono ricaricate ultima `ScanSession` e relative `Observation` | — | chiuso, vedi `decisions.md` #28 e `genesis-architecture.md` §7 |
| B35 | ~~Trend storico Home Score~~ — risolto 2026-08-04: Dashboard con andamento a 6 metriche, ricalcolo manuale e storico degli ultimi 12 mesi | — | chiuso; nessuno snapshot duplicato se score/versione non cambiano, vedi `decisions.md` #29 |

| B36 | ~~Property Profile strutturato per Dimora~~ — risolto 2026-08-25: profilo fisico/catastale/energetico/agibilità, completezza, provenienza e conferma delle proposte documentali | — | chiuso in v1, vedi `decisions.md` #36. Non include accesso diretto ai registri pubblici, conformità urbanistica dichiarata automaticamente, storico multi-versione o verifica terza `ATTESTED` |
| B37 | Decisione sul dominio `System` — discovery fatta 2026-08-25 su un solo caso reale (non i ~10 auspicati): nessun bisogno confermato, nessuna migrazione fatta | Bassa (in attesa di altri casi) | Vedi `decisions.md` #35. Riaprire con priorità più alta se emergono altri utenti reali o installazioni multi-componente (impianti condominiali, riscaldamento multi-zona) — non richiede codice, solo nuove conversazioni di discovery. |
| B38 | ~~Provenienza campo-per-campo e Trust Model~~ — risolto 2026-08-25 per gli **Asset** (v1): `FieldSource` (DECLARED/EXTRACTED/ATTESTED) + `AssetFieldProvenance`/`AssetCustomField` con documento sorgente, chi e quando ha confermato; badge visibile in `Assets.tsx` | — | chiuso per Asset, vedi `decisions.md` B38. Room/House e uno storico multi-versione restano fuori scope, non riaperti come nuova voce finché non emerge un caso reale |
| B39 | Trasferimento del Property Record tra proprietari | Bassa oggi / Alta prima del lancio della promessa | Non implementare prima di B2/B12/B38. Richiede matrice dati immobile/persona, consenso, revoca, audit, handover e verifica legale/GDPR. Prima deliverable: specifica e threat model, non endpoint di trasferimento. |
| B40 | `npm install` backend segnala 4 vulnerabilità ad alta severità | Alta prima di produzione | Eseguire assessment con `npm audit`, identificare dipendenze dirette/transitive e correggere senza `npm audit fix --force` automatico: un upgrade breaking richiede verifica separata. Non emerso come errore di build/test di B36. |
| B41 | Fondazioni dominio v6 — completare API e orchestrazione compliance | P0 | Fondazioni schema e motori puri introdotti il 2026-09-03. Mancano repository regole, riconciliazione idempotente dei piani House/ThermalSystem e CRUD utente per impianto/libretto/rapporti. È una fondazione tecnica, non la prossima esperienza da spingere agli utenti. Non esporre i codici libretto finché non esiste cifratura configurata. |
| B42 | Pilota Stato adempimenti Lombardia/Piemonte | P1 | Attivare prima il quadro nazionale, poi riverificare fonti primarie regionali alla data del seed, registrare revisore e testare soglie/date/territorio. Veneto, Emilia-Romagna e Lazio restano DRAFT/BLOCKED. Nessuna regola diventa ACTIVE senza gate di governance e revisione professionale. **Ricognizione 2026-09-04** (partita da una richiesta su una regola Lazio caldaia, poi accantonata): `RegulatoryRule`/`RegulatoryTerritory` esistono ma sono scollegati dal motore reale — `ComplianceService` per `EFFICIENCY_CONTROL` verifica solo "esiste una regola ACTIVE di questa famiglia", mai territorio/condizioni; `jurisdiction-resolver.ts` (`resolveMostSpecificRule`) non è mai chiamato da codice di produzione; `House` non ha alcun campo regione (solo `municipalityIstatCode`, mai popolato da nessun form); nessuna `RegulatoryRule`/`RegulatoryTerritory` è mai stata seedata. Normativa Lazio verificata nel frattempo (fonte primaria): Regolamento regionale Lazio 23/12/2020 n. 30, art. 12 c.3 — caldaie a gas 10-100kW ogni 4 anni, ≥100kW ogni 2 anni (recepisce Allegato A DPR 74/2013). Riprendere da qui, non da zero. |
| B43 | Genesis 2.0 — tre ingressi e modalità demo separata | P1 | Tre ingressi: controllo impianto, organizzazione documenti, ricostruzione storia casa. Primo risultato entro 3 minuti. Prototipo/test con utenti prima dei claim; foto targhetta reale con fallback manuale. Conservare macchina a stati/ripresa e spostare `GUIDED_MOCK` fuori dal percorso reale. |
| B44 | ~~Home Score v2 + Stato adempimenti separato~~ — risolto 2026-09-03: card adempimenti separata (badge neutro, mai a soglia colorata), Efficienza sostituita da Affidabilità del record (riusa `computeMemoryReliability`, B48), `ASSET_WITHOUT_ROOM` spenta | — | chiuso, vedi `decisions.md` #50. |
| B45 | Cifratura dati tutelati del libretto | Alta prima di scrivere codici reali | Progettare AES-GCM/gestione chiavi, rotazione, backup e redazione log per `registryCodeEncrypted`, `registryKeyEncrypted`, `plateCodeEncrypted`. Dipende dalla chiusura coordinata di B10 prima di un deploy esterno; nessuna chiave hardcoded o valore inventato. |
| B46 | Validazione continua del posizionamento “memoria digitale della casa” | P0 / subito | Raggiungere 15–20 questionari completi su tipologie diverse; misurare interesse, disponibilità a caricare documenti/fotografare targhette e intenzione d'uso. Deliverable: Executive Summary, personas, top 10 bisogni e obiezioni. Non richiede codice. |
| B47 | ~~Memory Core — rafforzare Contact, Timeline, Warranty e costi intervento~~ | — | **Chiuso 2026-09-03**: `Intervention` canonico multi-Asset/multi-documento, costo tipizzato, EvidenceStatus, collegamento alle Occurrence, timeline composta, Rubrica coerente e fondazione `Warranty`; migrazione conservativa senza inferenze ambigue. UI completa Warranty/cartella clinica resta B50. Vedi `memory-core.md` e decisione #46. |
| B48 | ~~Affidabilità della memoria e copertura informativa~~ — risolto 2026-09-03: endpoint `memory-reliability` con tre coperture (documenti, campi confermati, fatti con evidenza) pesate escludendo le dimensioni senza dati, nuova card Dashboard distinta da Home Score | — | chiuso, vedi `decisions.md` #48. Non include storico/trend nel tempo (nessuno snapshot persistito, calcolo sempre dal vivo) né una card "Rubrica"/garanzie collegate ai contatti. |
| B49 | ~~Ricerca unificata, azioni rapide e nuove regole Home Detective~~ — risolto 2026-09-03: ricerca globale client-side (Asset/Contatti/Documenti/Garanzie/Interventi, `Ctrl/Cmd+K`), azioni rapide in AssetDetail, 4 nuove regole Home Detective, fix di un bug reale di collisione nell'idempotenza delle Issue | — | chiuso, vedi `decisions.md` #49. `contactDetailOrigin` (il tasto "indietro" da un Contact aperto dalla ricerca) resta fuori scope, comportamento invariato rispetto a prima. |
| B50 | ~~Garanzie strutturate e “cartella clinica” dell'Asset~~ — risolto 2026-09-03: CRUD `Warranty` per Asset, cutover dei 3 punti che scrivevano `Asset.warrantyUntil` direttamente (ora unico writer è il riepilogo derivato), sezione Garanzie nella scheda Asset, colore per tipo di intervento in Cronologia | — | chiuso, vedi `decisions.md` #47. Fuori scope: garanzie collegate nella Rubrica (Contact ha già `warrantiesProvided` in schema ma non esposta), ripartizione costi tra Asset. |
| B51 | Export, privacy visibile e portabilità | **P0** (era P1 — anticipato da `mvp-v1.md` come prerequisito alpha, non più rimandabile) | Export di documenti, Asset, interventi, contatti, garanzie e scadenze; mostrare chi vede cosa, cosa va all'AI, come esportare ed eliminare. Non equivale ancora al trasferimento di proprietà B39, che richiede requisiti legali separati. Scope minimo per l'alpha decomposto in B54 (export)/B55 (consenso AI)/B53 (eliminazione) sotto, **tutti chiusi 2026-09-04** — resta aperto solo se si vuole qualcosa di più della somma di quei tre (es. una vista "chi vede cosa" persistente in UI, non solo lo schermo di consenso una tantum). |
| B52 | ~~Flag di navigazione per la private alpha~~ — risolto 2026-09-04: `frontend/src/config.ts` (`ALPHA_MODE`) nasconde Planimetria, Profilo casa, Energia, Rubrica, Home Score/trend, Affidabilità della memoria, Stato adempimenti, tab Gmail/Drive; Genesis completato in automatico e mai in nav; "Da tenere d'occhio" filtrata a 3 regole semplici | — | chiuso, vedi `decisions.md` #52. Nessuna cancellazione di codice. Non verificata la creazione di una casa nuova end-to-end (manca ancora B53 per pulire un'eventuale casa di test). |
| B53 | ~~Cancellazione account e casa~~ — risolto 2026-09-04: `DELETE /houses/:id` (solo OWNER, cascata già esistente) e `DELETE /auth/me` (case possedute → membership residue → utente, in transazione ordinata), link "Elimina account" in Sidebar | — | chiuso, vedi `decisions.md` #53. Fuori scope: UI dedicata per "elimina solo la casa" senza l'account, revoca remota dei token OAuth Gmail/Drive (debito B10), export dati contestuale (B54). |
| B54 | ~~Export minimo dei dati di una casa~~ — risolto 2026-09-04: `GET /houses/:id/export` (JSON con anagrafica, ambienti, Asset, documenti-metadati, interventi, garanzie, contatti), link "Esporta i miei dati" in Sidebar | — | chiuso, vedi `decisions.md` #54. |
| B55 | ~~Schermata di consenso privacy e informativa AI~~ — risolto 2026-09-04: `User.consentedAt` (nullable, retroattivo), `POST /auth/consent`, schermo bloccante `ConsentScreen.tsx` | — | chiuso, vedi `decisions.md` #55. |
| B56 | ~~Limiti dimensione e formato upload documenti~~ — risolto 2026-09-04: max 20MB, solo PDF/PNG/JPG/WEBP su entrambe le rotte di upload | — | chiuso, vedi `decisions.md` #56. Verifica su Content-Type dichiarato, non sui byte magici (debito accettato, vedi ADR). |
| B57 | ~~Messaggi di errore AI comprensibili~~ — risolto 2026-09-04: messaggio comprensibile su fallimento analisi, nuovo pulsante "Classifica manualmente" sempre disponibile in Inbox | — | chiuso, vedi `decisions.md` #57. |
| B58 | ~~Ingresso per creare un contatto senza la voce Rubrica in nav~~ — risolto 2026-09-04: "+ Nuovo contatto" inline nei 3 select di contatto in AssetDetail, riusa `AddContactModal` | — | chiuso, vedi `decisions.md` #58. |
| B59 | ~~Suite di test e2e del percorso principale~~ — risolto 2026-09-04: `main-flow.e2e-spec.ts` (login → crea casa → carica documento → conferma → ritrovamento → isolamento tra case), rimosso il boilerplate NestJS rotto | — | chiuso, vedi `decisions.md` #59. |
| B60 | Decidere se rimuovere "Ambienti" dal menu ora che Asset ha un filtro per ambiente (#65) | Bassa (in attesa) | L'utente ha sollevato la domanda 2026-09-04 dopo l'introduzione della barra filtri in `AssetsView`. La barra filtri copre solo "vedi gli asset di questa stanza" — "Ambienti" resta oggi l'unico punto per rinominare/eliminare una stanza (`RoomDetail`, vedi `Rooms.tsx`) e per vederne i codici (AMB-XXX). Rimuoverla dal menu senza spostare quelle azioni altrove sarebbe una regressione funzionale, non solo una semplificazione — da riprendere quando l'utente ha deciso, non un'azione automatica. |

**Backlog minimo dall'audit MVP vs questionario utenti (2026-09-04, n=5 rispondenti)**: B61-B64 sono stati chiusi nella stessa giornata; B65 resta l'esperimento da eseguire durante l'alpha. Vedi protocollo in `alpha-ai-label-measurement.md`.

| B61 | ~~Cancellazione fisica dei file alla rimozione di documento/casa/account~~ — risolto 2026-09-04: staging con rollback DB, `DELETE /documents/:id`, eliminazione completa su casa/account | — | chiuso, vedi `decisions.md` #67. |
| B62 | ~~Export con file originali~~ — risolto 2026-09-04: ZIP con `dimora-data.json` e originali in `documents/`, senza esporre `fileUrl` interni | — | chiuso, vedi `decisions.md` #67. |
| B63 | ~~Tecnico raggiungibile da ogni riga di cronologia~~ — risolto 2026-09-04: link esplicito alla scheda contatto, select di riassegnazione preservato | — | chiuso. |
| B64 | ~~Unificare le due CTA "primo documento"~~ — risolto 2026-09-04: in alpha l'Issue `HOUSE_WITHOUT_DOCUMENTS` è nascosta finché è già presente la CTA primaria | — | chiuso. |
| B65 | Misurare il tasso di successo reale dell'estrazione AI su foto di targhette prima di un prompt dedicato | P1 (durante l'alpha) | Protocollo, scheda di raccolta e soglie decisionali pronti in `docs/alpha-ai-label-measurement.md`. Misurazione ancora da eseguire: almeno 30 foto/10 partecipanti; nessun prompt dedicato prima dell'esito. |
| B66 | Le spiegazioni sulle funzioni disabilitate ("Rubrica" in `Sidebar.tsx`, tab "Gmail"/"Google Drive" in `Inbox.tsx`) usano l'attributo `title`: invisibile su mobile, dove il touch non ha hover | Bassa | Trovato 2026-09-11 durante la revisione di usabilità/fruibilità (Fase 0), viewport mobile 375px. Su desktop funziona correttamente ovunque. Non urgente: l'utente su mobile vede comunque l'elemento disattivato, semplicemente non ne legge il motivo. Stesso fix per tutti e tre i punti se mai affrontato (es. un componente tooltip tap-friendly) — da valutare insieme a B60 per la voce Rubrica, non un'azione automatica. |
| B67 | Non esiste un endpoint per eliminare una garanzia (`WarrantiesController` ha solo `list`/`create`/`update`, nessun `DELETE`) | Bassa | Trovato 2026-09-11 correggendo un dato demo (garanzia da seed con data sbagliata su Frigorifero Samsung): l'unico modo per rimuoverla è stato intervenire direttamente sul DB. Da aggiungere quando capiterà di nuovo la necessità reale — nel frattempo un inserimento sbagliato si può quantomeno correggere con "Modifica" (`PATCH /warranties/:id`, già esistente). |

**Backlog dall'analisi di mercato (2026-09-16, `docs/market-landscape.md` §5 "Domande aperte")**: numerazione M# nel documento originale, riportata qui tra parentesi per tracciabilità incrociata.

| B68 | ~~Approfondire modello e clienti di Hint e Smart Bricks~~ (M1) — fatto 2026-09-16 | — | chiuso, vedi ADR #76. Hint: confermato $10M seed (Slow Ventures), AI assistant homeowner, live sull'App Store dal 29/07/2026. Smart Bricks: raccolta reale (5M$, a16z) ma categoria sbagliata — è underwriting immobiliare istituzionale, non appartiene a questo confronto. |
| B69 | Ricognizione periodica di operatori consumer italiani nella categoria "memoria della casa" (M2) | Bassa | Non risulta un operatore italiano rilevante ad oggi, ma il rischio è scoprirne uno non mappato durante una presentazione — vedi `market-landscape.md` §1.3. Da ripetere periodicamente, non una verifica una tantum. |
| B70 | Monitoraggio mensile del recepimento EPBD IV in Italia e dell'architettura del registro digitale degli edifici (M4) | Media | Variabile esterna più impattante sul posizionamento di Dimora: se il recepimento produce un registro pubblico alimentato da certificatori accreditati, una parte del valore costruito da Dimora diventa un servizio pubblico gratuito — vedi `market-landscape.md` §3 e ADR #72. Trasposizione italiana avviata solo a febbraio 2026, procedura d'infrazione aperta il 12/03/2026. |
| B71 | Valutare il canale "impresa di ristrutturazione" come consegna della memoria: quali documenti produce già, in che formato, chi li consegna oggi (M6) | Media | Corrispettivo italiano del canale "costruttore" (assente in scala) individuato in `market-landscape.md` §2/§4 e ADR #73. |
| B72 | Test di disponibilità a pagare di un proprietario italiano nella categoria, mai verificata da nessuno (M7) | Media | Da abbinare ai colloqui della Fase 0 già previsti in roadmap — vedi `market-landscape.md` §5. |

**Backlog dalla seconda ricerca di mercato (2026-09-16, `docs/market-research-funding-2026.md`, riconciliata in `market-strategy.md` e ADR #74).**

| B73 | ~~Analisi approfondita di DomiKeep~~ — fatta 2026-09-16: **non è un concorrente operativo verificabile**, è una landing page pre-lancio (waitlist/early access), zero presenza web indipendente (nessuna stampa, Crunchbase, LinkedIn, app store), e cita un Business ID (FI25488174) che non corrisponde a quello reale della società che dichiara come parent ("Positive Productions Oy", Y-tunnus reale 2355279-9 / IVA FI23552799) | — | chiuso come "monitorare, non trattare come concorrente reale" — non richiede altro lavoro ora. Da riaprire solo se emergono segnali concreti di lancio (app pubblicata, utenti reali, copertura stampa). Correzione della caratterizzazione data da `market-research-funding-2026.md` §6, che lo presentava come "sovrapposizione molto alta" senza verifica diretta. |
| B74 | Validare il wedge B2B2C **Renovation + Financing** (scelto 2026-09-16, ADR #77 — non più tutti e 4 i wedge) prima di qualunque sviluppo | Media | Colloqui con i buyer indicati (banca/lender, operatore di ristrutturazione, rete installatori) — protocollo in `market-research-funding-2026.md` §26 (Value of Data, framing "cambieresti questa decisione?"), da eseguire durante/dopo i colloqui di Fase 0. Insurance/Energy/Transaction restano scartati per ora, vedi ADR #77. Non un lavoro di sviluppo. |

Le decisioni di design già prese (comprese quelle che generano debito accettato consapevolmente, es. niente test, CORS aperto) sono in `decisions.md` — questo file è per il lavoro non ancora fatto, non per rispiegare perché.

### V5-CV — Dal ciclo demo al ciclo reale
P1: permessi server-side e scadenze effettive; export ZIP di originali; identificazione casa per account con più immobili; recupero controllato per vendita errata/annullata; passaggio esplicito fra studi. Prima del rilascio: definire conservazione/cancellazione fisica e proroghe agenzia. ADR 80: chiusura accesso distinta da eliminazione dei dati. La demo non implementa queste garanzie di produzione.


### V5-R2 — revisione prototipo chiusa
R2-001…007 risolti nella baseline v9 finale (ADR 81). Identità e selezione di più Home rappresentate nella demo; resta il modello e controllo di accesso server-side in produzione. Restano le attività V5-CV già elencate, audit completo accessibilità e presentazione dei ruoli demo dopo il cambio titolare (P3). Questi punti non sono ulteriori difetti aperti dei sette rilievi concordati.


- [x] V5 validazione guidata: targhetta libretto incoerente dopo conferme, risolta in v9.1.

- [x] V5 validazione guidata: accesso alla segnalazione dalla Casa indipendente dalle comunicazioni, v9.2.

- [x] V5 validazione guidata: Segnala comunque fuorviante per problemi nuovi, risolto in v9.3.

- [x] V5 validazione guidata: contenuto comunicazioni pubblicate visibile direttamente in Home, v9.4.

- [x] V5: icone esplicative e stato comunicato scelto dallo studio, v9.5.

- [x] V5 identity-v1: contratto e checkout frontend separato preparati (101f053).
- [ ] V5: avviare sessione Claude Desktop sul checkout dedicato; costruire backend identity-v1 e integrare frontend dopo handoff.

- [x] V5: backend account/casa, CSRF, membership e idempotenza implementati; build/lint/typecheck e 14 test dominio.
- [ ] V5: eseguire launcher e 9 scenari API/database reali, poi integrare frontend Claude.
- [ ] V5 prima del pilota: verifica email/reset account, limitatore condiviso e cleanup pre-sessioni; niente endpoint legacy set-password.

- [x] V5: review frontend Claude e risposte alle 9 richieste contrattuali.
- [x] V5: correzioni contesto account tra schede, codici errore, logout scaduto e Unicode; 17/47 test locali.
- [ ] V5: collaudo API/client v1.1 e UI dopo riavvio esterno con -Restart -Test -Frontend.

- [x] Collaudo v1.1: 11 API/PostgreSQL, 3 frontend/API e browser eseguiti.
- [ ] M1-UI-001 P1: correzione temporalita creazione implementata, 18 test dominio passano; riverificare 10 creazioni sul runtime riavviato prima di chiudere M1.
- [x] Chiarire i permessi futuri in Casa reale, senza presentarli come operazioni disponibili.

- [x] M1-UI-001 riverificata: 12 API/PostgreSQL scenari passano, creazione aggiuntiva da browser senza errore.
- [ ] Launcher frontend ripetibile: riuso sicuro implementato e parser validato; rieseguire -Frontend per 3 test client/API sull'ultimo backend.

- [x] M1: ultimo launcher e 3 test client/API reali superati alle 17:41. Identita/casa consolidate.
- [ ] V5-DEV-004 Codex: implementare documents-v1, DB/storage privato, upload idempotente, download ed export autorizzati.
- [ ] V5-DEV-005 Claude: frontend Documenti sul contratto M2, sync correzioni M1, test e handoff.

- [ ] M2: applicare migration V5 e collaudare API/PostgreSQL/file reali, poi integrare frontend Claude.
- [ ] Prima del pilota M2: antimalware/validazione strutturale documenti, limiti rate/concorrenza upload e storage remoto, backup atomico DB+file, cleanup periodico oltre avvio.

- [x] Frontend Documenti Claude integrato, review e prove mock completate; risposta HTML binaria bloccata e limiti MiB coerenti.
- [ ] M2: launcher esterno -Resume -Documents -Test -Frontend, attivare V5_DOCUMENTS_API=1 nei test client, quindi browser reale.

- [ ] M2-UPLOAD-001 P1: parser multipart corretto e regressione reale locale aggiunta; riverificare API esterna dopo -Restart -Test -Frontend.

- [x] M2-UPLOAD-001 riverificata su backend reale; Documenti M2 completata in locale (23 API/file/DB, 6 client/API, browser).
- [ ] V5 M3: contratto proposte/conferme campo, provider test esplicito, storico e nuova review Claude.

- [x] M3: contratto job/proposte/conferme per campo, fixture sintetiche verificate e incarico Claude preparati.
- [ ] M3 Codex: implementare schema/API/worker persistente e prove permessi/fonti/concorrenza/recupero.
- [ ] M3 Claude: frontend Caldaia/Attivita/Da rivedere su contratto, prove mock e handoff.
- [ ] M3: integrazione e collaudo reale prima della chiusura; nessuna AI reale o effetto normativo.


- [x] M3 Codex: schema, API/worker, conferme, provider fixture e 52 test locali passanti.
- [ ] M3: launcher -Review -Test per migrazione e 19 scenari nuovi API/PostgreSQL; correggere esiti prima di integrazione frontend.
- [ ] Prima pilota M3: provider reale e sue condizioni, rate/quote job e retention audit; nessuna AI a pagamento attiva ora.


- [x] M3: frontend Claude integrato, review e collaudo API/PostgreSQL/client/UI reale completati in locale.
- [x] M3 UX: Attivita attiva nelle sottopagine, nomi fonti, storico italiano e conteggi job chiari.
- [ ] Prossimo sync Claude: trasferire gli oggetti Git con bundle e ripristinare le copie docs delle fixture da byte verificati; non riusare i PDF convertiti della vecchia patch.


- [x] M4: provider Anthropic e tetto 10 USD scelti, contratto e incarichi preparati.
- [ ] M4: parser paginato, adapter, consenso, ledger persistente e dispatch senza duplicati, collaudo offline e reale.
- [ ] M4: frontend Anthropic/provider misti/pagine/errori/costi incerti, integrazione e collaudo.
- [ ] Incremento futuro: OCR/vision per scansioni e documenti privi di testo; non promesso in M4 iniziale.


- [ ] M4 runtime: mantenere PostgreSQL V5 attivo, verificare migration 004 e API prima di abilitare M4_AI_ENABLED.
- [ ] M4 collaudo: test concorrenti ledger su DB reale, PDF multipagina, esiti vuoti/errati, integrazione frontend e massimo sei chiamate iniziali sintetiche. 64 test backend offline passano; non equivalgono a collaudo live.

## Chiusura M4 locale — 13 ottobre 2026
- [x] Parser testuale paginato, adapter Anthropic, consenso e ledger/recovery.
- [x] Frontend provider/costi/errori/fonti integrato con API/DB reali.
- [x] Collaudo offline, ledger concorrente, live sintetico e browser 320/390/desktop/tastiera.
- [x] Sei chiamate iniziali registrate: 0.041714 USD; nessun costo incerto, saldo conservato.
- [ ] Prossimo incremento da scegliere: OCR/vision oppure estensione del verticale.
- [ ] Ulteriori prove AI: definire prima la nuova fase senza azzerare il ledger o cambiare automaticamente campagna/budget.
Il limite delle sei chiamate protegge il collaudo e non è una quota commerciale. Hardening prima del pilota e funzioni fuori M4 restano aperti. Resoconto docs/v5/m4-integration-review.md.

## H1 Attività — pronto da sviluppare
- [x] Contratto activities-v1, ADR e proprietà file fissati.
- [x] Incarichi Codex/Claude e base comune da sincronizzare preparati.
- [ ] Backend/schema/migrazione V5 e dieci endpoint.
- [ ] Frontend attività/summary Casa/dettaglio/storia, preservando M3/M4.
- [ ] Test dominio/API/DB/client, privacy, date, idempotenza e browser reale.
- [ ] Successivi sottoincrementi: ricorrenze, allegati completamento, calendario alternativo, condivisione personale e fuso configurabile. Nessuna funzionalità normativa promessa.
Riferimento docs/v5/activities-api-contract.md; H1 non consuma Anthropic e non riapre il collaudo M4.

### H1 — stato dopo backend
- [x] Dieci endpoint, schema e migrazione additiva locale.
- [x] Dominio, PostgreSQL, HTTP/sessioni reali, concorrenza/idempotenza/privacy/date.
- [ ] Frontend Claude: integrare solo commit H1 dopo consegna finale, escludere sincronizzazione.
- [ ] Client/API reali e browser 320/390/desktop/tastiera, reload/login.
- [ ] Prima del pilota: ottimizzare lista/summary/storia con query aggregate e paginazione keyset per dataset ampi, preservando policy e filtri. Oggi lettura personale e ordinamento in memoria nel runtime locale.
Report docs/v5/h1-integration-review.md; H1 non ancora completa.

### H1 — chiusura integrazione
- [x] Sette commit frontend integrati, esclusa sincronizzazione.
- [x] Client/API reale e browser 320/390/desktop/tastiera/reload/logout/login.
- [x] Focus trap nel dialogo e protezione idempotenza in caso ambiguo.
- [x] Otto domande Claude risolte nel report, date/permessi/redazione confermati.
- [ ] Elenco promemoria direttamente nella caldaia, ricorrenze, allegati e condivisione: incrementi successivi.
- [ ] Prima del pilota: aggregazioni/paginazione per dataset ampi e lazy route per bundle oltre 500 kB (501.70 kB, build riuscita).
H1 completata in locale; nessuna nuova chiamata Anthropic, nessuna dichiarazione di prodotto pronto per pubblico. Report docs/v5/h1-integration-review.md.

### H2 — pronto da sviluppare
- [x] Contratto document-search-v1, ADR-V5-13 e proprietà file.
- [x] Incarichi separati e baseline H1 da sincronizzare.
- [ ] Backend capabilities e lista documenti filtrata con privacy/paging/compatibilità.
- [ ] Frontend ricerca/filtri/URL/ritorno originale, cache e selezione ZIP.
- [ ] Test regressioni/API/DB/client e browser reale sui 14 criteri.
Schema invariato; nessuna chiamata Anthropic. Non segnare H2 completa sui soli mock.

### H2 — avanzamento backend
- [x] Capabilities, ricerca autorizzata, filtri e compatibilità cursor.
- [x] Build/lint e suite backend offline/DB/HTTP sul harness reale.
- [ ] Attivazione e test H2 del processo API 3001.
- [ ] Consegna Claude, revisione frontend, client/API e browser reale.
H2 resta aperta; nessun consumo provider.

### H2 revisione / H3a avvio
- [x] R1–R3 Claude: confini sessione/history e revoca paging corretti, tre regressioni.
- [ ] H2 R4/R5: Cerca invariato dopo errore e annuncio iniziale di query URL invalida (UX minore).
- [ ] Code splitting frontend prima del pilota (chunk 509.82 kB).
- [x] H3a contratto e validazioni iniziali.
- [ ] H3a schema, backend DB/HTTP, frontend e collaudo completo.
- [ ] H3b stime/ricorrenze; export delle spese nel ciclo di vita Home.

### H3a — backend completato, integrazione aperta
- [x] Schema/migrazione additiva e nove rotte backend.
- [x] 77 offline, 89 integrazione, cinque HTTP sul servizio reale, build/lint.
- [ ] Consegna frontend Claude (sync cacc8fc da escludere), review e integrazione.
- [ ] Suite client/API non-live e browser reale320/390/desktop/tastiera.
H3 non ancora chiusa. Stime/ricorrenti e export Home spese restano futuri.

### H3a — chiusura e limiti finali
- [x] Consegna frontend integrata, anno storico da UI e messaggio503 corretto.
- [x] Build/lint,213 baseline frontend/31 H3 mirati,19 client/API non-live, browser reale320/390/desktop/tastiera/reload/login.
- [ ] Prima del pilota: code splitting chunk545,03kB, senza nascondere avviso con soglia.
- [ ] Riprodurre osservazione Claude focus H1 dopo completa/annulla/riapri; non ancora dimostrata in questo giro.
- [ ] H2R4/R5 rifiniture UX; H3b stime/ricorrenti e export Home spese restano futuri.


## Economia V5 — definizione consolidata del 14 ottobre 2026

EC-G1: congelare contratto ambienti/oggetti e conservare caldaia esistente, documenti/costi/attività senza copie. EC-S1: categorie/confronti e costi per oggetto/intervento. EC-C1: condivisione selettiva con economie escluse di default. EC-S2: regole/versioni/eccezioni/calendario e riconciliazione/pagamento singolo. EC-S3: proposte economiche con conferma per categoria. EC-S4: stime spiegate e rettifiche senza doppi conteggi. Tutte aperte; criteri EC-01..12 nel modulo. Nessuna nuova campagna AI autorizzata.


## G1 — contratto e revisione UX raccolta (14 ottobre 2026)

G1a/G1b aperti: implementare schema/API, autorizzazioni prima di paging e fonti boiler, CAS/versioni/replay redatto, collegamenti canonici e recupero seconda fase. EC-K7 focus H1 da riprodurre, non difetto browser confermato. G1 deve evitare rimontaggio che perde focus. Nessuna condivisione oggetti implicita o totale per ambiente.


## G1 — backend attivo e verificato (14 ottobre 2026)

G1 backend/schema verificati; restano integrazione frontend Claude dopo consegna finale (escludi sync26525c0), client/API e browser320/390/desktop/tastiera/reload/login, due fasi costo->link con recupero e privacy. Nessuna dichiarazione G1 completa solo con test backend.


## G1 — integrazione finale reale (14 ottobre 2026)

G1 backend/frontend/client/browser chiusa. Restano C1, S1-S4, vendita/cessazione accesso, hardening pilota. Chunk600,88kB: code splitting per rotta prima del pilota senza aumentare soglia. Picker H1 attività senza riferimento nativo: eventuale filtro server futuro, paging/messaggio ora espliciti. Focus H1 dopo altre mutazioni K7 distinto dalla correzione G1 forObject. Nessun forecast o condivisione implicita aggiunti.

## S1 — pianificazione approvata dopo G1 (14 ottobre 2026)
S1 precede C1 e include manuale breve più proposta economica da bollette/fatture semplici, con conferma e costo unico. Specifica docs/v5/s1-economic-history-spec.md; revisione UX documentale preparata per Claude. Implementazione e contratto REST congelato ancora da completare; nessuna migrazione, chiamata paid o modifica runtime in questa sessione.

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


### 14 ottobre 2026 — Consolidamento mockup proprietario S1

Approvata dal committente la navigazione Spese per macro famiglie con Visualizza secondario. Applicata al mockup ufficiale completo, preservando sezioni oggetto/documenti/attività e percorsi condivisione/storia/esportazione. Report e limiti: docs/v5/owner-ux-consolidation-20261014.md. Si rimuove la duplicazione di ingresso Spese/Economia senza rimuovere funzioni. Contratto e implementazione S1 operativa restano separati dalla prova UX. Nessun nuovo incarico Claude o consumo API.


### 14 ottobre 2026 — Rifinitura UI Claude integrata

Raccolta variante Claude 2a5fd69/f37768d e applicata al mockup ufficiale preservando stato e funzionalità. Tipografia, densità, gerarchia azioni e righe Spese migliorate. Verifiche e limiti in docs/v5/owner-ui-refinement-integration-20261014.md; contratto S1 ancora da congelare, runtime invariato.


### 14 ottobre 2026 — Contratto S1 e proposta dashboard

Definizione S1 e wire economy-v1 congelati con tipi, esempi e hash in docs/v5/s1-contract-freeze-20261014.md. Bozze accantonate recuperabili, confronto nullable e compatibilità H3a/G1 definiti. Incarico Claude dashboard alternativa separata pronto; non cambia specifica, ingressi o API e non blocca implementazione. Nessun runtime o DB modificato.


### 14 ottobre 2026 — Backend S1a/b e dashboard separata

API economy-v1 implementate per costi/metadati/famiglie/filtri/confronti e lavori personali; mutazioni condivise con H3a e riferimenti G1 atomici. Migrazione additiva solo DB V5 dedicato. DocumentDrafts false: S1c e frontend operativo restano aperti. Build/lint,86 offline e119 integrazione passati;5 test ulteriori contro API registrata. Report docs/v5/s1ab-backend-review-20261014.md. Dashboard Claude raccolta e servita separatamente, non integrata nel mockup ufficiale.


### 15 ottobre 2026 — Backend S1c fixture e ripresa verifiche

Job economici persistenti, bozze recuperabili, candidati e conferma atomica sul costo canonico implementati; fonte/versione/hash e redazione replay/storia. Provider fixture solo due PDF sintetici, Anthropic economico disabilitato senza invii o spesa. Build/lint e12test S1c mirati verdi nella ripresa;89offline e130integrazione precedenti documentati. API locale ripristinata autonomamente. Frontend Claude non raccolto, S1 nel complesso non completato. Report docs/v5/s1c-backend-review-20261015.md.


### 15 ottobre 2026 — Integrazione frontend Spese S1a/b
Claude c7f145b/1e2ae0e raccolti senza sync, dashboard/manuale/lavori operativi. Build/lint e267test frontend verdi,17test mirati sulla correzione ritorno dal nuovo costo. Percorso browser/API/DB reale verificato: costo sintetico240EUR, totale240,60EUR, archivio/ripristino e storia. Report docs/v5/s1ab-frontend-integration-20261015.md. S1c UI resta aperta; Anthropic economico disabilitato, nessuna chiamata paid. Warning bundle677kB e riepiloghi H3a da evolvere tracciati nel report. Nessun push/main/legacyDB.



### 15 ottobre 2026 — S1c frontend integrato con fixture
Claude1e76d7f/afb9897 raccolti come da0135d/d3a27dd, sync escluso. Build/lint/typecheck e37test mirati verdi. Browser/API/DB reale: upload gas sintetico, fonti/importi, park/reopen dopo reload, conferma80EUR e link_existing senza duplicato. Dashboard320,60EUR/cinque record; AiAttempt8 invariato. Report docs/v5/s1c-frontend-integration-20261015.md. Adapter Anthropic economico non implementato/disabilitato; bundle715kB aperto. Nessun push/main/DBlegacy/paid.



### 15 ottobre 2026 — Adapter economico Anthropic offline
Prepare/decode con parser reale e schema/citazioni verificate, trasporto strutturato condiviso con regressioni caldaia verdi. Evidenza date italiane/importi raggruppati. Build/lint,95offline e12S1cDB/HTTP verdi. Report docs/v5/economic-anthropic-offline-20261015.md. Nessun invio paid/.env/migrazione/restart. Provider resta disabled: ledger economico dedicato, worker protetto e consenso UI reale ancora da implementare prima di autorizzare campagna live.



### 15 ottobre 2026 — Ledger e worker Anthropic economico, ancora disabilitato
Registro separato EconomicAiCampaign/EconomicAiAttempt, riserva atomica, quota/costi, consenso start/retry, recupero senza reinvio e permessi prima di count/Messages/pubblicazione. Migrazione20261015090000 solo DBV5 dedicato. Build/lint96offline/21DBHTTP verdi con AnthropicHTTP stub. API riavviata; providerdisabled, ledger economico vuoto, M4rimasto8. Report docs/v5/economic-ai-ledger-worker-20261015.md. Consenso frontend affidabile a Claude; nessun paid, budgetlive ancora da autorizzare dopo integrazione.



### 15 ottobre 2026 — Consenso Anthropic economico integrato
Claude0c3db1b/55aec7f raccolti d8c5e0b/a6b7497; allineamento escluso. Consenso locale, reset, nuovo retry e billing separato; Codex esclude retry quando billinguncertain anche con timeout. Build/lint48mirati e1test client/API reale a providerdisabled verdi. Economyledger0/M4Attempt8. Report docs/v5/economic-consent-integration-20261015.md. 311completi/browser solo evidenza Claude; nessun paid o budget attivato. Proposta collaudo1USD/treMessages sintetiche ancora da approvare.



### 15 ottobre 2026 — Primo collaudo Anthropic economico reale
Autorizzati1USD/treanalisi solo sintetici. Aggiunta allowlistSHA256 obbligatoria server (ECONOMY_AI_ALLOWED_SHA256), rifiuto prima riserva e trasferimento. Build/lint16mirati verdi; dueMessages reali Sonnet4.6, gas80/20/100 e fattura100+22/lordo122 corretti, conferma canonica totale202EUR. SpesaAPI0,021834USD settled; M4invariato8. Providerdisabilitato in finally/APIriavviata. Report docs/v5/economic-anthropic-live-20261015.md. Nessun terzoinvio o quota resettata; nessuna bolletta personale. Claude possibileottimizzazione bundle incaricopreparato; frontendnonmodificato.


- 2026-10-15: chiuso il caricamento differito frontend V5 (entry 485144 byte, nessun warning >500 kB). Nessun nuovo problema fuori scope emerso; misure di latenza reale non incluse in questo incarico.

- 2026-10-15: verifica mirata del percorso Spese conclusa senza nuovi difetti riprodotti; nessun nuovo elemento da aprire. Vedi v5/spese-verifica-percorso-20261015.md.

### C1 — gate identita destinatari e consegna (2026-10-15)
Email account non verificata: non basta per sbloccare documenti esterni. Proposta prima verticale fra account gia membri, da arbitrare con mockup Claude; esterni richiedono protocollo identita/consegna. Aperte persistenza, locking, ledger/replay, download autorizzato, cache frontend e prove DB/HTTP/browser. Policy offline nove test verdi non equivale a funzione attiva. Vedi v5/c1-foundation-review-20261015.md.

- C1 2026-10-15: chiusi nella simulazione difetti di sola scheda, rifiuto e accesso immediato dopo pairing. Resta da congelare protocollo esterno (challenge, claim/versione, rate limit, scadenze/recovery), poi persistenza/API/client. Vecchia anteprima C1 del mockup proprietario superata dal riferimento docs/proposta-c1. Vedi v5/c1-ux-arbitrato-20261015.md.

- C1a 2026-10-15: chiuso contratto/protocollo/persistenza/API e test backend locali. Restano integrazione frontend e browser reale, prova con due account/zero case, perdita diritti/replay, codice effimero. Incarico frontend in outputs/Dimora-V5-incarico-Claude-C1-frontend.md; nessun paid AI.


## 15 ottobre — chiusura integrazione C1a

Risolti: UI documentale C1 reale, race download dopo logout/cambio account e dettaglio residuo dopo revoca/403. Verifiche: v5/c1-frontend-integration-20261015.md. Rinviati: dati tecnici condivisi, origine documentale oltre la pagina corrente migliorabile con filtro dedicato, cronologia eventi leggibile senza ricevute di lettura. Prove mobile contro API reale e assistive non eseguite in questo giro; non dichiarare copertura esaustiva. Analisi Agenzie separata, nessuna sovrapposizione con C1.


## 16 ottobre — arbitrato Home prima di Agenzie

HOME-CONS-002/003/004/005 corretti nel frontend; 006 corretto per l'elenco dei permessi futuri. Ordine Casa/Da fare ora (006), ingresso codice senza casa (001), segnale dei confronti in attesa (007) e guida3passi da valutare insieme prima dell'integrazione UX. Stati vuoti (009): distinguere assenza di dati da zero risultati con filtri; non nascondere l'uscita dai filtri. Collegamenti inversi G1 (014/parte002), etichetta consegna (015), ultima casa (011), dettagli tecnici (012), tipo oggetto (013) e bozza più compatta (016) restano separati. Nessun allungamento TTL implicito (010). Fonte: v5/home-consolidamento-arbitrato-20261016.md.

## 2026-10-16 — Chiusure Home

HOME-CONS-001/006 riordino/010 istruzioni applicati. HOME-CONS-007 applicato come segnale di presenza sulle pagine disponibili: eventuale ricerca completa delle conferme richiede contratto dedicato, non scansione client. Guida rinviata dal committente, non un difetto aperto. Nessun ampliamento C1 a schede tecniche. Rapporto v5/home-consolidamento-integrazione-20261016.md.

## 2026-10-16 — Esito collaudo Home

Nessun nuovo difetto runtime dimostrato nei percorsi provati. Test review e login/errore resi coerenti/deterministici senza allargare timeout. Restano i rinvii gia tracciati (guida, inverse G1, eventuale riepilogo conferme completo). Attendere consegna UX Claude prima di aprire altri interventi.

## 2026-10-16 — Rilievi finali Home

HOME-FIN-002/003 risolti con prove mirate. Rinviati FIN001 (ritorno destinatario senza casa),004 (azioni rapide),005 (priorita avviso condizionale). CONS009: zero aperti/anno non significa assenza totale di dati, non usare testo Nessun promemoria se esistono completati. Nessuno dei rinvii blocca la prova personale. Prima dati reali verificare backup/restauro DB e originali. Vedi v5/home-rifinitura-arbitrato-20261016.md.

## 2026-10-16 — Release Home da proposition, piano prima del codice

Fonte approvata frontend-v5/docs/home-backlog-proposition-20261016/BACKLOG.md, versione7ac52f7 raccolta34b863d. Corrente Fase0/04/01/02manuale/03essenziale/10/10b; le stime Claude S/M non sostituiscono contratti. Blocchi: recovery sicuro/email verificata, export oltre ZIP, foto senza OCR attuale, legame precedente/successiva atomico, garanzia per campo, timeline con precisione data/privacy/paging, scope rubrica e conferma multipla atomica con dedup. Nessuna implementazione autorizzata da questa pianificazione. Backup verificato, non sola copia: v5/backup-verifica-20261016.md. BL-12..16 nessuna stima.

## Fase 0 pilota 16 ottobre 2026

Tracciati: email verification/recovery con canale da scegliere, export strutturato distinto dal ZIP originali, verifica locale file/quarantena richiesta dal contratto documenti, gestione spazio e backup su destinazione distinta. Non dichiarare pronto il caricamento personale. Corpus AI sintetico 24 casi da preparare, nessuna nuova campagna live autorizzata. Dettagli docs/v5/fase0-prerequisiti-20261016.md.


## Fase 0 completamenti ancora necessari dopo strumenti offline

Congelare recovery dopo UX, implementare challenge/TTL/rate limit/transazione/revoca sessioni e API/frontend; confermare account/mittente Brevo e tracking disattivo prima dellinvio. Corpus24 pronto per revisione indipendente, normalizzazione output e soglie prima di eventuale nuova autorizzazione live. Export personale solo proposto, policy antimalware e destinazione backup aperte. Nessun doppio conteggio dei test parser come accuratezza AI.


## Fase 0 residui dopo recupero locale

Chiudere col committente prova casella reale/verifica/reset e aggiornare backup dopo migrazione13 e nuovo account. Invio inprocess puo essere perso al crash: monitorare queued non consegnati e valutare outbox cifrata/reconciliation in estensione, nessun token plaintext persistente. UX06..08 accolti da arbitrare nel pilota documentale: mancanza eliminazione da spiegare, foto/HEIC/scansioni, confiniZIP. Nessuna eliminazione implicita o guida. Restano antimalware, export, destinazionebackup e campagneAI su nuova autorizzazione.


## 16 ottobre 2026 Collaudo live recupero concluso

Brevo/API mittente verificati dopo autorizzazione IP eseguita dal committente, due email reali richieste da lui (verifica e reset), challenge accepted/consumed confermate DB. Committente conferma login con nuova password; Codex osserva /case autenticato senza case. Nessuna password letta. Runtime660e50d, report docs/v5/account-recovery-esito-20261016.md. Backup aggiornato083531Z verificato con restore43tabelle/262originali, clusterspento. Recupero gatechiuso locale; altri gate Fase0 aperti. Nessun paidAI/main/legacy/push. Preflight ora distingue il GETsession che puo creare metadato anonimo da una lettura file pura.


## V5 Fase0 — residui dopo controllo file (16 ottobre 2026)
Seconda copia cifrata su Drive privata con verifica recupero; export personale e retention ancora da congelare; chiarire politica cloud Defender prima di documenti personali; scanner portabile per futura infrastruttura pubblica fuori da questo incremento. Nessuna cancellazione automatica introdotta.

## 2026-10-16 — Dopo personal-export-v1
Export personale per Home disponibile con limiti espliciti; retention/cancellazione/reimport ancora assenti. Alla consegna Claude arbitrare UX e corpus, poi collaudo visivo browser/mobile senza usare impropriamente l'account personale. Dataset oltre10000righe/10MiB respinti interamente, nessun job asincrono incluso. Custodia chiave backup fuori PC non ancora confermata. Dettagli docs/v5/personal-export-esito-20261016.md.

## 2026-10-16 — Residui chiusura Fase0 dopo raccolta Claude
FE-UX-02 corretto e testato; avviso pilota/rimedi/distinzione JSONZIP recepiti. Corpus gold/scorer errati: E1…E8 e formato2 da realizzare prima di qualsiasi campagna. Poi qualitàAI con budget nuovo autorizzato, QA visivo reale desktop/mobile e regola/procedura conservazione-cancellazione. Backup seconda copia e chiave fuoriPC chiusi con verifica roundtrip. Fonte v5/fase0-chiusura-arbitrato-20261016.md.

## 2026-10-16 — Rimozione dati e copie della prova personale
Regole consolidate in v5/prova-personale-conservazione-20261016.md, senza eliminazione automatica. Implementare e provare su fixture impatto delle dipendenze JSON/FK, retry idempotenti, download/export concorrenti, job e condivisioni, rimozione fisica verificata; per rimozione completa gestire copie backup/cestini e riapplicazione delle rimozioni prima di riaprire un restore. Rotazione/tempi delle copie non ancora definiti: nessun termine massimo promesso. Non eseguire cancellazioni di dati personali come verifica. Nessuna stima aggiunta o nuova funzione avviata.

## 2026-10-16 — QA visiva archivio chiusa
Risolto scorrimento orizzontale a320px con scrollbar classiche; collaudo reale upload PDF/PNG, anteprima, download, ZIP e JSON completato su QA separata. Nessun test smartphone fisico/OCR/AI né nuova campagna di guasti. Restano corpus/scorer e qualitàAI, eliminazione tecnica e gestione copie. Prima archiviazione personale limitata possibile con condizioni in v5/fase0-browser-collaudo-20261016.md.

## 2026-10-16 — Residui dopo corpus v2
E1…E8 chiusi offline; consegna integrata e parser/fixture reali verdi. Restano campagna qualità con budget/consenso nuovi e riesame dei gold stretti, gap multipagina/prompt injection/altre notazioni/multicaldaia registrati nella consegna, senza estendere i24casi ora. Nessuna chiamata prodotto o funzione personale nuova. Rapporto v5/fase0-corpus-v2-integrazione-20261016.md.

## 2026-10-16 — Prova personale: oggetti proposti dai documenti
Consolidare estensione BL-10b per ricevute/acquisti: oggetto nuovo o suggerimento di esistente con evidenza, dati assenti non inventati, associazione ambigua esplicita. Un oggetto/costo già creati manualmente non si duplicano alla successiva analisi: proporre riuso/integrazioni e mantenere conferma singola per elemento. Contratto/transazione e percorso sintetico ancora da definire, nessuna funzione generale già attiva. Guardia submit per preset asincroni corretta e testata; causa esatta dell'episodio utente non dimostrata. Backup aggiornato rinviato su scelta utente. Vedi v5/expense-object-preset-20261016.md.

## 2026-10-16 — Ricevuta assistita, valutare mockup prima implementazione
Percorso sintetico pronto: originali, dati oggetto e spese distinti. Residui prima sviluppo: contratto generici brand/modello/provenienza, transazione/idempotenza/versioni, confronto valori già confermati diversi, più importi/articoli, bozze/revoche/errori di invio e campagna AI autorizzata. Mockup non risolve questi contratti. Fonte v5/receipt-assisted-flow-mockup-20261016.md.


## 2026-10-16 — Canali aggiuntivi di acquisizione documenti

Spunti del committente da progettare successivamente; nessuno sviluppo o collegamento esterno avviato, nessuna variazione all'ordine di release.

- **Trascinamento:** area «Trascina qui i tuoi documenti», anche per più file, affiancata alla selezione file esistente; esito e gestione degli errori per singolo documento.
- **Cartella cloud collegata:** acquisire documenti da una cartella scelta dall'utente. Da definire importazione una tantum oppure monitoraggio dei nuovi file, permessi sulla sola cartella, casa di destinazione e comportamento su modifiche/rimozioni.
- **Ricevute via email:** indirizzo dedicato a cui inoltrare ricevute e documenti; il sistema raccoglie gli allegati, interpreta i contenuti e li porta nello stesso percorso di un documento caricato. Da definire indirizzo personale/per casa, mittenti ammessi, allegati rispetto al corpo email e gestione degli scarti.

Principio comune proposto: conservare l'originale e la provenienza, rilevare reinvii/doppioni tra canali e presentare proposte da confermare per classificazione, associazione o creazione di oggetti e spese. L'acquisizione non autorizza di per sé l'invio a un provider AI: modalità e consenso dell'analisi automatica da progettare. Nessuna creazione o sovrascrittura silenziosa di oggetti/costi.

## 2026-10-16 — Mockup ricevuta: verifiche indipendenti e conflitti
Verifiche browser 2–4 concluse (solo oggetto/costo, ritorno con correzioni e dati invalidi). Conflitti aggiunti al mockup, da valutare con il committente. Definire persistenza e ripresa dei confronti rinviati e modifica esplicita con provenienza/versioni, prima del contratto generale. Nessuna implementazione reale avviata.

## 2026-10-16 — Ricevuta assistita, specifica e primo nucleo backend
Specifica consolidata e10test policy offline verdi; restano schema/provenienza/confronti, orchestrazione transazionale e ledger, manuale/job/provider e capabilities, API/frontend/DB/HTTP/browser e controlli export. Non attiva nel prodotto. Tre incarichi frontend Claude in directory isolate, raccolta progressiva autorizzata fino alle20.

## 2026-10-16 — Ricevuta R2: bozze persistenti in modulo isolato
R2 chiusa su fixture per bozze/ledger/park/reopen, non conclusa la funzione ricevuta. Restano migrazione campi/provenienza e confronti, transazione oggetto-costo, API candidate/analisi, export/privacy storia, integrazione UI e collaudo browser. Nessun invio provider.

## 2026-10-16 — Ricevuta R3 e integrazione sorgenti Claude
Raccolte tutte3fasi Claude,38test frontend verdi dopo4regressioni Codex; chiuso focus loop previsto nel suo handoff. R3 campi/confronti persistenti read/resolve verificati con9test HTTP/DB. Residui: creazione/conferma atomica, collegamenti/deduplica/versioni, proiezioni globali e JSON export dei nuovi dati, job/provider offline, container/rotte/client e browser reale. Differenze importo/data di costo esistente esposte e costo mantenuto, senza nuova contabilità.

## 2026-10-16 — Ricevuta R4 conferma transazionale
R4 core transazionale verificato con15test HTTP/DB e12offline; restano proiezioni privacy G1/S1/storia/export, deduplica tra documenti distinti con stesso originale leggibile, candidati/job/offlineprovider, adapter e browser. Modulo disattivato fino ai gate.

Ricevuta R6b backend isolato concluso; residuo R7 adapter/client/route lazy, form park persistente/onesto, linkedCount, fonte originale, confronti riapribili e browser sintetico desktop/mobile. Gate manual/fixture solo dopo tali verifiche; nessuna analisi personale/paid autorizzata.


### 2026-10-16 — Ricevuta R7b
Ricevuta R7b: risolto disallineamento validatore JSON personale con le nuove sezioni receiptFields/receiptComparisons. R7c aperto: Chrome non collegato, gate browser e attivazione controllata; non dichiarare supportata analisi AI personale.


### 2026-10-16 — Ricevuta R7c browser
RicevutaR7c: RISOLTO ritorno dal documento alla bozza rimandata, con resume server scoped. PRIMA PERSONALI allineare CasaTasksSummary: countM3 non deve produrre un messaggio globale Nessuna verifica aperta mentre pendono confronti ricevuta; review e scheda già mostrano confronti. OSSERVAZIONE QA non conclusiva: click tool sul link upload Apri documento talvolta senza navigazione, Enter funziona; non diagnosticato bug applicativo, nessun fix speculativo.

### Ricevuta R8b — limiti residui16ott2026
Prima del pilota personale: allineare il segnale Casa/Da rivedere (conteggioM3 attuale) ai confronti ricevuta; riconciliazione operatore dei job paid uncertain da definire, nessun reinvio automatico disponibile. Live smoke sintetico richiede nuova autorizzazione con limite. Bulk organizzazione documenti: spunti in docs/v5/bulk-document-intake-notes.md, da mockup prima di sviluppo.

### Archivio assistito — consegne aperte16ott2026
B1b: uploader perfile con conteggio byte effettivo/scanner/idempotenza e dedup autorizzata prima storage; sostituire negazione prudente della projection stored con redazione fonte verificata prima di attivare. B2: organizzazione personale versionata, filtri lista/dettaglio/export e conferma parziale recuperabile. B3: worker/classificatore PDF/budget e consenso lotto separati; niente OCR/fallback. B4: raccogliere UI Claude document-intake/**, integrare container/router e prove browser sintetiche/mobile.

###ArchivioB1b chiuso16ott2026
Chiusa fondazione upload/lease/retry/dedup e sourceprojection per B1b. Restano B2decisioni/organizzazione/filtri/export, B3classificatore/budget e B4UI. Limite intenzionale: dedup serializza richieste intake; caricamenti manuali singoli e copie storiche non vengono globalmente fusi o ripuliti. Stage con outcomeDB ignoto conservati per cleanup successivo verificato.

## V5 intake B2 / handoff Claude16ott2026
Risolti BE R1 duplicate-resolution, R3 organization, R4 selectionStale, R6 GET ricevuta review. Restano B3/R7; B4 mapping R2 permessi/limiti/null fonte, R5 link canonici autorizzati; consenso esplicito replaceOrganization (mai forzato dall'adapter); mantenimento parti manuali multiple al ritorno in revisione; duplicate unavailable redatto, annullamento upload senza falsi esiti. Filtri raccolte integrati, cache separata corretta. Nessuna modifica del focus ricevuta fuori scope: rilievi tastiera/handoff conservati nel documento Claude. Regressione H2 HTTP aggiornata solo fixture sintetica email verificata, niente invio email.

## V5 archivio app16ott2026
Chiusi collegamento container/API/lazy/ingresso, ripresa lotti, R2/R5mapping+link, consenso sostituzione, multiparti manuali, duplicate unavailable, callbackincerto copia, focus editor e cancelupload reale. Motore local_text_v1 non sostituisce futuro AI esterno/OCR: servono campagna/ledger/consenso proprio. Da valutare: analisi automatica anche delle copie mai organizzate (ora si possono organizzare manualmente o riusare), copia sorgente con titolo personale nel riepilogo, CTA0file a classificazione conclusa; nessun contatore globale da pagine parziali. Verifica codice di cancellazione/retention futura includendo le nuove tabelle intake e job prima di abilitarla. Non affermare mobilefisico/screenreader dal harness.

16ott2026: chiuso affinamento Documenti per sezioni grafiche coerenti con Spese e cambio immediato. File precedenti senza organizzazione confermata restano Da organizzare; nessuna inferenza dai nomi.


16ott2026: chiusa incoerenza visibilità exportZIP nelle raccolte vuote; icona di pagina accanto a Documenti, originale eJSON coerenti. Export per singole sezioni ulteriori da valutare solo con contratto e ambito definiti, senza riciclareJSONcasa come exportspese.


16ott2026: chiusi doppio ingresso caricamento Documenti, selezioneZIP sempre visibile, ricerca troppo ingombrante e bloccoJSON duplicato nella vista normale. Confermati ingresso unico e filtri aggiuntivi richiudibili. Nessuna modifica a categorie/visibilità/ledger/provider. Directory ricorsive e cartellecloud restano fuori scope.


16ott2026: chiuso ingresso separato Analizza documenti nella testata. Il percorso canonico è Carica documenti; le analisi specialistiche restano nelle loro viste. Nessuna autorizzazione implicita a provider esterni/paid o riclassificazioni automatiche.


16ott2026: chiusa impossibilità di aggiungere file dopo la prima selezione. Nuovo append allo stesso lotto, ripresa idempotente e quote globali con test concorrenza. Nessun caricamento ricorsivo cartelle o cloud introdotto.


16ott2026: chiuso rilievo collocazione pulsante aggiunta file: ora sotto quelli già caricati.


16ott2026: chiusi titolo generico quando intestazione leggibile, selezione dazero dei contenuti multiparte, esclusione UI delle copie dalla classificazione locale e ingombro delle pagine manuali. Resta limite motorelocale su scansioni/OCR e semantica di documenti complessi; noninferirevaliditàcertificativa.


16ott2026: chiusa ambiguità reuse presentato come Organizzato e proposta più specifica nascosta da vecchio other. Disponibile nuova revisione degli originali senza upload; nessuna modifica implicita dei dati personali. OCR/semantica avanzata restano necessari per scansioni unreadable.


### Rifiniture non bloccanti osservate nel collaudo V2 — 16 ottobre notte
- Correzione di scansione già classificata: preferire Rivedi/Modifica a Indica il tipo quando esiste già una classificazione confermata; i campi attuali sono conservati correttamente.
- Link legacy nel dettaglio: rendere contestuali Analizza questo documento e Oggetto/spesa da questa ricevuta; oggi compaiono anche su documenti tecnici. Nessun provider chiamato dal collaudo e nessuna modifica fuori scope eseguita.
- Telefono fisico e lettore di schermo non ancora collaudati; viewport 320/390 e tastiera/harness documentati nel report V2.

### Onboarding assistito oggetti da documenti —17ott2026, autorizzato/in corso
O1 offline pronto (estrazione multiarticolo/evidenze/matching/piano scelte/adattatore senza dispatch). Da completare O2 persistenza/job/budget separati e policy, O3 conferma atomica/anti-duplicati, O4 UI/container/mobile, O5 prova provider autorizzata. Riferimenti docs/v5/object-onboarding-spec-v1.md e object-onboarding-development-20261017.md. Screenshot personali non inviati. Non indicare la funzione come già disponibile. Valutare decodifica/limiti dimensioni immagini prima del rilascio; file-type riconosce il formato ma non garantisce completa leggibilità.

### Manuali online — 17 ottobre
Chiuso primo incremento scheda oggetto/manuale, ricerca Moulinex esatta, conferma/rimozione/replay e UI mobile. Da estendere ricerca pagine/adattatori altri produttori, lingua documentale quando nota, integrazione del candidato manuale nella conferma unica futura da etichetta. Test fisico Safari ancora da fare; modello modificato segnala needsReview conservativo. Onboarding O2–O5 ancora aperto, nessuna visione personale/garanzia/creazione multiarticolo attiva. Contratto e limiti docs/v5/object-manuals-20261017.md.


### 17 ottobre 2026 — onboarding documenti e oggetti O2–O5

Onboarding oggetti: collaudo reale v3 ancora aperto (unico precedente invio incerto, riserva0.25USD). Diagnostica HTTP sanitizzata implementata e testata, senza contenuti personali; verificare Safari fisico e ulteriori marche/manuali con scope distinto. Nessun reinvio automatico o reset del contatore.


### 17 ottobre 2026 — collaudo reale onboarding r2

Chiuso collaudo reale v3 screenshot Echo Dot Max (campagna r2), costo0.013558USD e proposta valida. Restano Safari fisico e altri esempi personali multiarticolo/etichetta/PDF con autorizzazioni separate; costo r1 ancora incerto.


### 17 ottobre 2026 — identità dal nome del prodotto

Da approfondire con committente: riferimento prodotto. Negli ordini spesso assente; recuperarlo da marca/modello con verifica fonte ufficiale e disambiguazione varianti. Migliorare nome/descrizione/help del campo, distinguendolo da modello/ordine/seriale e rendendo chiaro che è facoltativo. Rinviato, non sviluppare lookup universale ora.


### 17 ottobre 2026 — unificare proposte documento/oggetti/spesa

Richiesta committente: analisi dal caricamento, unica schermata con proposta organizzazione documento + nuovo oggetto o scelta esistente + eventuale spesa. Eliminare ingresso separato obbligatorio, consenso provider raccolto prima del trasferimento, nessuna creazione automatica. Gestire copie, conflitti, più articoli e corrispondenze incomplete. Direzione in object-onboarding-spec-v1.md, da implementare dopo prova fattura attiva.


### 17 ottobre 2026 — validazione fattura acquisto reale

Primo collaudo ricevuta macchina ghiaccio: Messages riuscito/costo0.023952USD, ma output rifiutato evidence_unverified, nessuna proposta. Riprodurre con fixture sintetiche le tabelle Qtà/Articolo e l’etichetta data «Ricevuta d’acquisto», aggiungere diagnosi di campo senza contenuti personali e valutare proposte parziali solo per campi provati. Non è dimostrata la causa esatta sul reply non conservato; evitare altri collaudi pagati prima di queste verifiche.


### 17 ottobre 2026 — validazione fattura e caricamento integrato

Chiusi riproduzione locale ricevuta tabellare/data d’acquisto, diagnostica sanitizzata e integrazione proposte nel caricamento. Restano collaudo reale autorizzato, Safari fisico e valutazione proposte parziali per campi verificati; nessuna rianalisi implicita.

- 17ott2026: riconoscimento contesto date acquisto corretto e testato offline; validazione live fattura ancora da verificare con consenso separato, non dichiarare risolto end-to-end.

- 17ott2026: risolta selezione manuale obbligatoria della nuova spesa nel caso singolo chiaro. Restano ripartizione multiarticolo e gestione assistita costi archiviati.

- 17ott2026: esclusione individuale nel gruppo Crea/Collega completata; costo escluso dalla conferma, nessuna ripartizione automatica del totale di fatture miste.

- 17ott2026: per mail ordine/consegna riconosciute AI, integrare tipo documentale coerente e proposta classificazione dalla bozza già disponibile. Oggi vocabolario documenti privo di questi tipi, selezione manuale Altro; non riattivare provider implicitamente. Corretto feedback conferma bloccata da tipo mancante con alertinline+Rivedi documento.


## 2026-10-17 — proposta onboarding semplificato

Validare il mockup onboarding semplificato nei casi ordine tre articoli, duplicati, conflitti e mobile. Le proposte di architettura UI restano da arbitrare prima dello sviluppo reale.


### 2026-10-17 — verifica autonoma onboarding

Mockup onboarding: verificati gli 11 scenari e corrette le incoerenze emerse. Prima dell’integrazione consolidare la specifica del collegamento accessorio/scheda e della conferma unica con i contratti esistenti; non assumere una nuova transazione atomica globale.


## 2026-10-17 — integrazione UX onboarding V3

Onboarding V3: chiusa prima tranche UI (lista/pannello, editing protetto, conferma, selezione e aiuti). Pianificare estensioni server per sostituzione esplicita dati confermati e quote multiarticolo con evidenze e centesimi; raccordare documentKind AI e vocabolario documenti senza nuove analisi implicite. Report onboarding-v3-implementation-20261017.md.


### 17 ottobre 2026 — consolidamento onboarding pilota

Sostituzione esplicita versionata, quote manuali multiarticolo con limite cumulativo e tipi ordine/consegna/etichetta implementati; conferma unica e recupero conservati. Dettagli, prove e limiti: `v5/onboarding-pilot-consolidation-20261017.md`. Nessuna migrazione o attivazione provider; priorità ora uso reale e feedback.


### 17 ottobre 2026 — attivazione AI casa con tetto autorizzato

Modalità pilota account/casa, consenso per invio e campagna persistente5 USD/40 analisi. Contatori e blocchi visibili; collaudi esclusivamente simulati, attivazione verificata senza Messages. Appartamento Roma svuotato dopo conferma definitiva, mantenendo account/anagrafica e nuovo budget. Vedi `v5/ai-home-pilot-20261017.md`.


### 17 ottobre 2026 — coda AI pilota corretta

Allineati claim del worker e lettura input allo scope account/casa, mantenendo consenso e filtro campagna/modello. Corretto il blocco queued del primo uso;19 test DB mirati verdi con nuovo percorso completo simulato. Nessun secondo incarico o reset budget. Dettagli in `v5/ai-home-pilot-20261017.md`.


### Caricamento unico — 17 ottobre 2026

Parzialmente chiuse priorità caricamento unico/bollette; restano prezzo oggetto, posizione ambienti, revisione visuale e documenti misti acquisti+utenze. Vedi docs/v5/unified-document-proposals-v1.md.


### HTTP400 bollette — 17 ottobre 2026

Aperta verifica reale provider dopo rifiuto HTTP400. Riserve conservate0,50USD, residuo4,476130USD e3/40; nessuna ripetizione dell’agente. Report: docs/v5/unified-document-proposals-verification-20261017.md.


### Bollette — prove autonome 17 ottobre2026

Chiuso collaudo reale singola bolletta e validazione parziale; resta seconda bolletta reale e riordino completo consenso nel caricamento. Report: docs/v5/unified-document-proposals-verification-20261017.md.

- 2026-10-17: Chiusi appunti Casa/ambienti e riepilogo prezzo acquisto dell’audit17ottobre. Da verificare nell’uso quotidiano il comportamento con molti ambienti e acquisti multipli; nessuna estensione cloud/email inclusa.


- 2026-10-17, audit fruibilità successivo alla Casa compatta: allineare stati e azioni di documento/lotto/archivio (fattura già gestita ancora Analizza/Organizza; lotto concluso con pannello di avvio disabilitato), proporre titoli identificativi senza sovrascrivere i confermati, ritorno contestuale documento→oggetto→stanza, link postconferma alla spesa/periodo giusto, microtesti upload adatti a mobile. Report nel workspace outputs/Dimora-V5-feedback-uso-reale-20261017.md, sezione Secondo audit. Solo osservazione; non implementato in questa sessione. Primo clic di recupero lotto senza effetto da riprodurre, non bug confermato.

- 2026-10-17: Risolti i rilievi stato/azioni di fattura e lotto concluso del secondo audit; identificazione da risultati senza rinominare titoli confermati, ritorno contestuale e collegamenti diretti alle spese. Resta futura valutazione della dashboard Spese e delle proposte di nuovi titoli persistibili; nessun cambio silenzioso ai titoli utente.


### 17 ottobre 2026 — Compilazione per documento

Risolto: ingresso AI collettivo e scarsa distinzione tra archiviazione e scheda oggetto confermata. Recupero manuale Dreame completato. Da valutare: ricerca catalogo anche per marca/modello, perché un oggetto con nome generico conserva correttamente quei dati ma è cercabile per nome. Report v5/document-compilation-per-file-20261017.md.


### 17 ottobre 2026 — Copia Samsung nella conferma articolo

Risolto blocco conferma Samsung per copia già presente: scelta di riuso inline e recupero sicuro. Restano espliciti i conflitti che richiedono sostituzione dei metadati.


### 17 ottobre 2026 — Originale nella revisione articolo

Risolto: originale non accessibile direttamente nel pannello articolo.


### 17 ottobre 2026 — Planimetria a livello immobile

Risolto: planimetria.pdf proposta come oggetto. Rimane necessaria la scelta manuale per scansioni generiche senza testo né nome identificativo; nessuna promessa di riconoscimento dei locali dal disegno.


## 18 ottobre 2026 — Residui revisione unica V4

- Tabelle di fattura con prezzo unitario, sconti/IVA/spedizione: ampliare lettura prezzi solo con attribuzione verificabile; nessuna ripartizione arbitraria. Il primo riconoscimento di riga richiede etichetta esplicita e nome nella citazione.
- Classificazione documento e conferma oggetti/costi hanno ricevute separate: valutare coordinamento transazionale cross-modulo dopo feedback; recupero esistente resta esplicito.
- Risolto: fattura manuale multiarticolo con totale dichiarato esplicito e tetto cumulativo backend; il totale manuale non può sovrascrivere quello estratto. Resta da rendere selezionabile il tipo di un documento manuale completamente sconosciuto nella stessa revisione, anziché ricorrere alla revisione di classificazione esistente.

- File con più bollette distinte: valutare una sola conferma aggregata delle proposte casa; oggi conferme distinte per proposta.
- Collegamento a un oggetto che verrà creato da un’altra riga nella stessa conferma: richiede dipendenze esplicite; il collegamento attuale seleziona oggetti già esistenti.

### 18 ottobre 2026 — Verifica residua estrazione visuale
Due HTTP400 Messages sul PDF macchina caffe, corpo errore intenzionalmente non conservato. Schema V8 semplificato: causa precisa del400 non dimostrata; prossimo collaudo singolo con consenso UI entro budget esistente. Verificare identità completa,499EUR e14/06/2026, senza alterare scheda già confermata. Nessun retry automatico/rilascio delle vecchie riserve.

### Aggiornamento18ottobre —400Messages risolto nel collaudo sintetico
Causa ora dimostrata: grammatica troppo grande. V9 fonti condivise accettata con successo dal provider, supersede ipotesi precedente. Prossimo: una rianalisi personale con consenso UI e collegamento a oggetto esistente; nessun nuovo oggetto/spesa creato dal test tecnico.

### 18 ottobre 2026 — Prezzo screenshotordine
Risolto campo manuale nascosto in bozzeAI order_confirmation. Nuovo prompt V10 e validazione accettano TOTALE COSTI su ordini; la vecchia bozza non viene rielaborata o alterata retroattivamente. Valutare futuro prezzo noto senza data come attributo separato solo se richiesto: ora spesa canonica richiede data, non usarne una inventata.

### 18 ottobre 2026 — Revisione estrazione generalista V11
Caso conformità elettrica classificato unsupported con job succeeded, non erroreAPI. Serve contratto per documenti/casa/impianti/interventi oltre acquisti, ragioni per campo, classificazione unica e corpus di accettazione. Proposta non implementata: docs/v5/document-understanding-v11-proposal-20261018.md. Nessuna nuova chiamataAI.


- Completato il 18 ottobre 2026 — UX revisione spese da documento: chiarire «nessun oggetto» come assenza di attribuzione economica, distinta dagli oggetti collegati al documento; usare «Data della spesa» nel riepilogo dei valori inseriti. Osservato nel collaudo Fattura/Ricevuta del 18 ottobre 2026; vedere `v5/manual-purchase-flow-20261018.md`.
## Fase 0 qualità AI — residui dopo nuova campagna v24 del 23 ottobre 2026

- **Campagna v24 completata e verificata**: 148/150 Messages, 3,562652/12 USD, zero incerti/retry, ledger separato. Gold/soglie invariati; baseline 101/104 output validi, etichette 16/16, importi 64/70. **Gate non superato**, questi risultati prevalgono sui checkpoint di prontezza e sulle sole fixture offline. [Report e confronto](v5/fase0-quality-v24-campaign-20261023.md).
- **Q15 split payment corretto offline il 23/10**: controllo server sul testo completo, indipendente dal saldo proposto, bloccato anche nella conferma automatica transazionale; bozze finanziarie precedenti senza verifica richiedono conferma esplicita. Onboarding 181/181, DB Q15/Q48 20/20 con privacy/idempotenza. I due critici live restano nei risultati congelati: nessun cambio retroattivo del gold, gate ancora non superato. [Report e limiti lessicali](v5/fase0-q15-payment-offline-20261023.md).
- **Q22 corretto offline il 23/10**: lettura della tabella Importo e data acquisto esplicita sulla stessa pagina: 300/500 EUR e 18/09/2026 per entrambe, senza ripartizione del totale. Provenienza/deduplica per riga, guard transazionale prezzo/data e privacy/idempotenza verificati; [report e limiti](v5/fase0-q22-lines-offline-20261023.md). I due run v24 restano congelati e non soddisfano il gold; fixture offline non certifica nuove risposte AI. Q20/run 2 resta aperto sulla data spesa; date associate a proposte assenti non provano lettura OCR errata.
- **Q48 copertura corretta e verificata offline il 23/10**: schema v26 con slot per ogni pagina, copertura server e metadati bounded nel ledger; pagina omessa/illeggibile rimane pendente e non chiude la bozza. 2/2 importi/date/fornitori con fixture per pagina, privacy/idempotenza e replay persistente verdi; [report](v5/fase0-q48-coverage-offline-20261023.md). Il live v24 resta congelato a 1/2 per campo e non è stato rimisurato. Restano UI del pendente e trattamento di continuazioni/pagine non fattura prima dell’attivazione; nessun reinvio diagnostico implicito.
- **Rifiuti titolo**: Q29/run 1 e Q30/entrambi, enum `document_title`; riprodurre offline intestazione letterale/classificazione, senza indebolire le citazioni. Stabilità 45/52 sotto soglia; 45/50 condizionata agli output validi non sostituisce il denominatore congelato.
- **Costi**: progressivo Q43/Q44 esaurisce sei/otto prefissi per run, circa 5,60×/6,93× la completa; locale meno caro su Q44/Q46. Nessuna modalità promossa dal costo o dal confronto parziale. Correzioni versionate e nuova autorizzazione necessarie prima di ulteriori misure. Nessun reale autorizzato; pilota bloccato.

### Checkpoint precedenti, risultati v22 e correzioni offline del 22 ottobre

- Checkpoint offline conservati: runner collegato al ledger durevole, ripresa da nuovo processo e dopo riavvio PostgreSQL senza doppie chiamate, tetti/concorrenza/incerti/rollback; adattatore e prefissi cumulativi con revalidazione della fonte. **24/24 offline, 23/23 DB isolato più 2/2 dopo riavvio, 148/148 onboarding**, build/lint verdi. [Ledger](v5/fase0-quality-v3-ledger-20261022.md), [adattatore/ciclo](v5/fase0-quality-v3-model-20261022.md). Le prove simulate restano distinte dalle misure live successive.
- Campagna esplicitamente autorizzata e completata: 146/150 Messages, 3,545746/12 USD, zero incerti/retry. **Gate non superato**; questi risultati live prevalgono sui precedenti residui di prontezza. [Report](v5/fase0-quality-v3-campaign-20261022.md).
- Correzioni offline concluse: titoli stampati delle targhette e totale `documento corrente`, prompt v23 e diagnostica titolo senza contenuti, onboarding 166/166 e altre regressioni verdi. [Report](v5/fase0-evidence-amounts-offline-20261022.md). Sono cause riproducibili, non replay delle risposte del modello: restano da diagnosticare Q03/Q45 wire, Q29/Q30 testo e ulteriori rifiuti visivi/assenze. Conservare privacy, evidenza e idempotenza; gold e score live non modificati.
- Q48 chiuso offline nel contratto di fatture complete su singole pagine distinte: due importi, segmenti SHA/pagina, conferme/provenienza separate e idempotenza/copie/privacy verificate su DB sintetico (11/11), onboarding 174/174. [Report](v5/fase0-q48-invoices-offline-20261022.md). Restano da progettare fatture multipagina, più fatture sulla stessa pagina, ancoraggi mancanti e attribuzione di soggetti/contatti. Non fondere importi o ridurre il gold; nessun risultato AI nuovo misurato.
- Spese nella campagna congelata: 13/70 con un unico totale corrente corretto; assenti, ambigue e invalide contano come fallimento, senza implicare altrettanti numeri letti male. Tipologia oggetto 21/40 e classificazione 79/104 sotto soglia. Nuova qualità AI del decoder v23 non misurata offline; nessun ritocco dei risultati storici.
- Rivedere il progressivo: Q43/Q44 percorrono tutti i prefissi senza arresto anticipato e costano più della completa; Q48 si arresta per invalidità, non per successo. Selezione locale meno costosa su Q44/Q46, ma nessuna modalità promossa dal solo costo. Ogni correzione richiede versione nuova e nuova campagna autorizzata; nessun ulteriore invio coperto automaticamente da budget residuo.
- Pilota bloccato dal gate sintetico; eventuali 10–15 reali richiedono prima selezione/gold confermati e consenso/tetto separati. Nessun trasferimento reale autorizzato.

## Fase 0 — seguito del piano autonomo offline, 23 ottobre 2026

[Cinque blocchi attuati offline](v5/fase0-night-plan-offline-20261023.md): UI Q48, regressioni Q20/Q29/Q30, matrice proposta dei 147 tipi, catalogo di 91 apparati con suggerimenti espliciti di tipo/ambiente e consolidamento. Nessuna riclassificazione automatica, nuova famiglia, inventario dedotto o nuova chiamata AI.

Residuo distinto dall’implementazione offline: rivedere le ambiguità della [matrice](v5/fase0-document-family-matrix-v4-20261023.json) prima di nuove regole; valutare la [prossima misura sintetica](v5/fase0-next-measure-proposal-20261023.md) soltanto con nuova autorizzazione e codice congelato. Le vecchie risposte grezze Q20/Q29/Q30 non sono disponibili: nessuna diagnosi certa o metrica ricostruita. Fatture che proseguono su più pagine e pagine non fattura restano pendenti da verificare. Test su telefono fisico, HEIC, eliminazione dei dati e DB di test permanente restano fuori incarico. I 104 StoredFile orfani restano conservati senza cancellazioni.

## Fase 0 — acconto/saldo stessi apparati (23 ottobre 2026, diagnosi storica)

Riconciliazione acquisto/intervento con più documenti/rate non implementata: collegamento manuale agli stessi oggetti funziona, ma una nuova fonte con SHA diverso può creare oggetti duplicati se si sceglie crea; il secondo totale può diventare seconda spesa senza riconciliazione. Collegare due SHA alla stessa spesa è bloccato. Non rimuovere la protezione fonti per aggirare il limite. Definire costo complessivo vs rate e relazione con più apparati; rivedere il costo effettivo col committente. [Diagnostica e test](v5/fase0-installments-offline-20261023.md). Nessuna chiamata AI autorizzata.

### Acconto/saldo — correzione successiva verificata offline

Il caso manuale è corretto: stessi oggetti selezionati, costo unico con totale esplicitamente confermato, ricaricamenti e privacy protetti. [Correzione e limiti](v5/fase0-installments-fix-offline-20261023.md). Restano distinti: costo reale da confermare, OCR dei PDF raster, registro rate/pagamenti, riconciliazione generica di interventi successivi/legacy e riconoscimento universale di identità senza matricola. Nessuna nuova campagna AI autorizzata.
