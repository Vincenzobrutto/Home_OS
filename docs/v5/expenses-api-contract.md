# H3a — expenses-v1: spese essenziali personali della casa

14 ottobre 2026. Contratto congelato da Codex per lo sviluppo locale autorizzato dal committente. La proposta indipendente Claude cfdd0b3 è un contributo valutato, non un ordine. **Endpoint e frontend non ancora implementati o attivi nel runtime.** Codex scrive backend/schema/test reali nel master; Claude implementa soltanto frontend-v5 nel checkout separato, su incarico H3 dedicato. Codex integra e verifica la consegna.

## Fonti e scelte
Specifiche outputs/dimora-v5-round2/03_specifiche/DIMORA_HOME_UX_CONSOLIDATED_v0.1_20261012.md §5: dashboard sintetica, costi documentati/manuali/stime distinti; capitale residuo non spesa, nessuna seconda contabilità. DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md: Home memoria della casa, economia V1 opzione B. Consolidamento master M-05/M-12 e V5-020/021 richiamati dalla revisione Claude: costo unico riferito da documento e asset, modifica della spesa esistente. Ciclo di vita CV-01: perdita membership impedisce accesso anche alle spese.

Scelte di incremento (non variazioni di modello di business):
- H3a realizza costi sostenuti dichiarati dall'utente, manuali o collegati a un originale. Stime/ricorrenze/proiezioni restano H3b e non vengono sommate ai costi H3a. La distinzione prevista dalle specifiche è conservata evitando di spacciare previsioni per spese sostenute.
- Spese personali al creatore, come attività H1 e derivati M3. Owner non legge private altrui; nessun totale condiviso implicito.
- EUR e centesimi interi da 1 a 999999999, soglia tecnica 9.999.999,99 euro. Niente zero, negativi o valuta arbitraria; un intervento gratuito resta memoria tecnica.
- Data di calendario obbligatoria, gregoriana 0001–9999, non futura rispetto al giorno server Europe/Rome. Costi programmati restano promemoria H1; nessuna data di pagamento o stato pagata/incassata.
- Archiviazione logica e ripristino con storia: nessuna cancellazione fisica. Nessun export spese autonomo in H3a; export Home prima vendita resta lavoro del ciclo di vita e va tracciato come requisito futuro.
- Nessun catalogo di categorie, rate condominiali, IVA/detrazioni, banche, mutui, AI/OCR, grafici o automatismi inventati.
- Collegamenti facoltativi a documento M2 leggibile e caldaia personale M3. Un costo è un solo record HomeExpense; scheda/documento ne mostrano il riferimento, non ne creano una copia. Nessun vincolo artificiale «un documento = una spesa»: un originale può contenere costi distinti; non creare duplicati automaticamente.

## Trasporto e permessi
Base /api/v5/homes/:homeId. Sessione cookie, Origin/CSRF su POST, X-Account-Context, no-store; Idempotency-Key 16–100 caratteri [A-Za-z0-9_-] su tutti i POST. UUID invalidi/input/query sconosciuti o ripetuti 422 validation_error. Anonimo 401; risorsa/casa/collegamento UUID valido non autorizzato o inesistente 403 generico. 503 non è un successo o una lista vuota.

Tutti i GET filtrano accountId creatore + homeId + membership read valida, prima di contare/ordinare/paginare. Viewer legge soltanto proprie voci preesistenti, non scrive. POST require edit e stesso creatore. Membership condivisa bloccata/riletta in transazione; niente accesso dopo revoca/scadenza o vendita, né riabilitazione creando una nuova Home.

Riferimenti vengono autorizzati prima di crearli/cambiarli, e riletti/redatti a ogni risposta e nella storia. Non leggibile = state unavailable, oggetto null, senza ID/nome/hash. Origine document resta tale quando la fonte diventa unavailable: non inventare origine manuale. Replay idempotente ricontrolla membership/risorsa e redige i riferimenti con i diritti attuali, non restituisce una vecchia risposta con dati ormai vietati.

## Rotte
| Metodo/risorsa | Input e risultato |
|---|---|
| GET expense-capabilities | query vuota; apiVersion expenses-v1, enabled true, isSimulation false, currency EUR, limits e timeZone Europe/Rome |
| GET expenses | state active (default)/archived/all; year YYYY facoltativo; source all/manual/document; assetId/documentId facoltativi; limit 1–50 default20, cursor <=512; items/nextCursor |
| POST expenses | title, amountCents, spentOn, note?, documentId?, assetId?; 201 expense |
| GET expenses/:id | query vuota; expense |
| POST expenses/:id/updates | expectedVersion + almeno un campo; 200 expense |
| POST expenses/:id/archive | expectedVersion, note?; 200 expense |
| POST expenses/:id/restore | expectedVersion, note?; 200 expense |
| GET expenses/:id/history | limit/cursor soltanto; items/nextCursor |
| GET expense-summary | year YYYY (default anno server); year, counts manual/document, totalsCents manual/document, totalCents, lastItems <=3, today/asOf/timeZone |

GET expenses ordinato spentOn desc, createdAt desc, id desc. Paging keyset DB limit+1, cursor legato account/Home/risorsa/filtri, limite non legato. Mai dataset intero in memoria. Somme SQL sulle sole active personali dell'anno, centesimi esatti, nessun originale/record invisibile influisce. Il totale è dei costi registrati, non estratto conto, incasso, debito o valore della casa.

## Dati e modifiche
HomeExpense: id, accountId interno, homeId, title 1–120 code point trim/NFC, amountCents integer, currency EUR derivata, spentOn YYYY-MM-DD, note nullable <=500 code point, documentId/assetId nullable interni, state active/archived, version integer >=1, createdAt/updatedAt, archivedAt nullable.

Proiezione espone id/homeId/title/amountCents/currency/spentOn/note/state/version/datetime/permissions; origin manual/document derivata da presenza del documentId interno; documentLink e assetLink = {state:none/linked/unavailable, document o asset:null oppure {id,name}}. Nessun accountId, storageKey o file URL diretto. Storia stessa redazione per before/after.

Update solo active, omesso invariato/null scollega riferimento o nota; title/amount/spentOn non nullable. expectedVersion controllata prima del cambiamento: 409 expense_version_conflict. No-op non crea evento/versione. Archive solo active, restore solo archived, altrimenti 409 expense_state_conflict. Modifica/rimozione collegamenti richiede gesto esplicito, mai cambio automatico dell'originale o di campi caldaia. History created/updated/archived/restored conserva snapshot e nota operativa; modifica non tocca storia tecnica caldaia.

Idempotenza scoped account/Home/operation/target/key e digest del body canonico: stessa chiave/body una sola mutazione/storia, body diverso 409 idempotency_conflict. Concorrenza protetta dal lock della membership condiviso, versione e unique ledger. Ambiguità rete preserva body/chiave; niente retry automatico, ottimismo o chiusura dialogo che perde la riprova.

Schema additivo HomeExpense/ExpenseHistory/ExpenseRequest con FK Restrict, indici per account/Home/state/spentOn/createdAt/id e riferimenti. Migrazione solo nel dimora_v5_product_dev 55432, dopo controlli e stop della sola API registrata per rigenerazione DLL. Mai reset, schema legacy o database reale.

## Frontend
Spese diventa operativa soltanto con capabilities reale. Vuoto globale, anno senza voci, caricamento, errore e servizio non disponibile distinti; no mock fallback. Titolo «Le tue spese della casa», nota personale e «Costi registrati da te». Totali manual/document separati e totale combinato esplicito, mai stimato. Stato origin «Inserita da te»/«Collegata a un documento», non verificata/pagata/incassata.

Lista per anno/stato, dettaglio/storia, aggiunta/modifica, dialogo archiviazione/ripristino. Parsing italiano decimale in centesimi senza float: 1.234,56 e 1234,5 validi, raggruppamenti errati/3 decimali/testo libero rifiutati. Importo rimane stringa nel form, il server è autorevole. Data UTC calendar e giornata Roma dal server, come H1.

Ingressi da Casa (riepilogo anno e ultime tre), documento (documentId precompilato) e caldaia (assetId; costi collegati dalla stessa lista server). Nuovo record non copia fattura o dati tecnici. Cambi account/Home e 403 ripuliscono stato/cache; selezioni di riferimenti limitate alle risorse autorizzate, incluse tutte le pagine. Una ricerca o stato history non può attraversare account. Tastiera/focus/dialoghi, 320/390/desktop; nessuna dichiarazione WCAG.

## Forme condivise per implementazione parallela
Capabilities: {apiVersion:'expenses-v1', enabled:true, isSimulation:false, currency:'EUR', limits:{titleMaxCodePoints:120,noteMaxCodePoints:500,amountMaxCents:999999999,maxPageSize:50}, asOf:ISO, today:YYYY-MM-DD, timeZone:'Europe/Rome'}. today è il riferimento per i moduli; con servizio assente non usare una capabilities mock nella modalità reale.

Lista: {items:HomeExpense[],nextCursor:string|null}. Dettaglio e tutti i POST: {expense:HomeExpense}. GET expense-summary: {year:YYYY,counts:{manual:number,document:number},totalsCents:{manual:number,document:number},totalCents:number,lastItems:HomeExpense[],asOf:ISO,today:YYYY-MM-DD,timeZone:'Europe/Rome'}. Query year opzionale, default anno server; riepilogo considera sempre active, non il filtro lista archived/all.

HomeExpense: {id,homeId,title,amountCents,currency:'EUR',spentOn,note:string|null,origin:'manual'|'document',documentLink:{state:'none'|'linked'|'unavailable',document:null|{id,name}},assetLink:{state:'none'|'linked'|'unavailable',asset:null|{id,name}},state:'active'|'archived',version:number,createdAt:ISO,updatedAt:ISO,archivedAt:ISO|null,permissions:Array<'read'|'edit'>}.

History: {items:Array<{id,kind:'created'|'updated'|'archived'|'restored',at:ISO,note:string|null,before:ExpenseSnapshot|null,after:ExpenseSnapshot}>,nextCursor:string|null}. Snapshot conserva soltanto title,amountCents,currency,spentOn,note,origin,documentLink,assetLink,state; no version/date tecniche/permissions. Fonte e asset redatti con diritti attuali anche negli snapshot. Nessun documentId/assetId interno fuori dal link autorizzato.

Input create/updates non accetta currency/origin/state/accountId/homeId né link oggetti: soltanto campi tabella sopra (documentId/assetId UUID o null), il resto è derivato. action note distinta dalla nota persistente della spesa. Stato archived non editabile fino a restore.

Rotte UI: /home/:homeId/spese, /spese/:expenseId. Creazione nella lista con ?nuova-spesa=1 e opzionali documentId/assetId; account deve poter leggere la risorsa e modificarla nella casa. I parametri sono una proposta di precompilazione, non autorizzazione: verificare via API prima di mostrare nomi/accettare salvataggio. Anno/stato lista facoltativamente URL; niente importi/note/body/chiavi idempotenti in URL o storage. Filtri e ritorni legati all'account come H2 corretta.

## Accettazione prima della chiusura
1. Importi 0,01 / 1.234,56 / 1234,5 precisi; zero/negativi/frazioni di centesimo/overflow rifiutati. 0,10+0,20 = 30 centesimi.
2. Date bisestili/0001/9999, giorno Roma e anno corretti; futura rifiutata; nessun timezone shift.
3. Create/replay/risposta persa stesso record/evento; chiave body diverso conflitto; update CAS/no-op.
4. Archive/restore storia e totale corretti, documento byte/hash e scheda confermata invariati.
5. Costi personali, totali non rivelano altrui; viewer read-only; revoca/scadenza, ID altra Home e cambi contesto bloccati.
6. Riferimenti privati altrui esclusi, unavailable redatto anche history/replay; un costo nei totali una sola volta anche dalla caldaia.
7. Lista filtrata e paging DB oltre prima pagina, stesso timestamp, limiti variabili, cursor scope/filtri diversi rifiutati.
8. Vuoto/anno vuoto/errore/capabilities assente distinti, nessun totale o successo locale inventato.
9. Upload/documenti/H1/H2/M3/M4 invariati; suite live AI disabilitate; builder/lint/offline/DB/HTTP/client/API e browser reali verdi.
10. Vendita/export spese segnalati come futuro non operativo; nessun «Ho pagato» condominiale finché mancano pubblicazioni Admin reali.
