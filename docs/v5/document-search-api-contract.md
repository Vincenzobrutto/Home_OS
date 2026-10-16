# H2 — document-search-v1: ricerca dei documenti della casa

14 ottobre 2026. **Backend H2 implementato e verificato su PostgreSQL e harness HTTP reali. Caricamento nel processo API registrato e integrazione frontend ancora aperti.** Baseline H1 consolidata 26e45c9. Codex mantiene contratto/backend/test reali; Claude frontend-v5. La ricerca estende documents-v1, senza cambiare il significato degli originali o dei permessi. Esito corrente in h2-integration-review.md.

## Perimetro
Ricerca dei soli documenti autorizzati della Home corrente, per titolo scelto dall'utente (name) oppure nome originale sicuro (originalFilename); filtri per formato e visibilità. Risultati aprono il dettaglio M2 e l'originale tramite il flusso autenticato esistente. Upload, download, ZIP, analisi M3/M4 e attività H1 restano operativi.

Nessuna ricerca nel contenuto PDF/immagini, OCR, AI, classificazione per categorie tecniche, ricerca fra tutte le case, ricerca delle attività o caldaie, suggerimenti di documenti vietati, notifiche o nuovo motore esterno. «Formato» significa PDF/JPEG/PNG, non APE/libretto/fattura: queste categorie non sono metadati implementati. Tutte le fonti attuali sono manual_upload: nessun filtro «agenzia/amministratore» finto. Nessuna nuova dipendenza, migrazione o installazione di sistema prevista.

## Identità e privacy
Cookie/sessione, Origin per il trasporto esistente, X-Account-Context catturato, no-store come identity-v1.1/documents-v1. GET senza scritture o consumo di AI. UUID Home invalido 422; membership assente/revocata/scaduta 403 generico. Viewer ricerca i documenti leggibili ma non guadagna edit/export.

La selezione autorizzata è applicata **nel database prima di ricerca, filtri, ordinamento e paginazione**: homeId richiesto e (uploaderId=account oppure visibility=home), oltre al diritto Home valido. Un owner non cerca i private altrui. Nessun totale/facet/autocomplete rivela nomi o esistenza di documenti esclusi. Filtro private significa «Solo io» tra i propri upload private, non tutti i private della Home. Home significa «Condivisi nella casa», leggibili da membri autorizzati.

Rileggere validità/ruolo della membership per ogni richiesta; transazione e lock condiviso della membership come nelle letture V5 più recenti, anche prima della proiezione. Nessun riuso di permessi presi dal client. Non introdurre dipendenze circolari DocumentsModule → ReviewModule (ReviewModule già dipende da DocumentsModule). La ricerca non legge byte originali né response AI e non scrive documenti/storia/ledger. Dettaglio/file/ZIP rilegge i permessi anche se l'ID viene da un risultato precedente.

## Endpoint
Base /api/v5, sotto /homes/:homeId. Due superfici, nessun nuovo POST:

| Metodo/percorso | Query | Risposta |
|---|---|---|
| GET /document-search-capabilities | Nessuna | 200 SearchCapabilities dopo autorizzazione Home |
| GET /documents | q,format,visibility,limit,cursor | 200 DocumentsPage invariata (items,nextCursor) |

```ts
type DocumentSearchFilters = {
  q?: string;
  format?: 'all' | 'pdf' | 'jpeg' | 'png';
  visibility?: 'all' | 'private' | 'home';
};
type SearchCapabilities = {
  apiVersion: 'document-search-v1'; enabled: true; isSimulation: false;
  searchableFields: ['name', 'originalFilename'];
  formats: ['pdf', 'jpeg', 'png'];
  visibilities: ['private', 'home'];
  limits: { queryMaxCodePoints: 120; maxPageSize: 50 };
};
```

DocumentSummary/DocumentDetail/DocumentsPage, download e ZIP restano quelli di documents-api-contract.md. Il nuovo DTO/query si applica **solo alla lista documenti**; ListDocumentsDto è riusato anche dalle rotte M3/M4 e non deve allargare lì i parametri accettati. Nessun totalCount o campo inventato per il frontend. capabilities assente/404/503: ricerca non disponibile, lista M2 senza filtri ancora consultabile se autorizzata; niente ricerca solo nella pagina caricata come ripiego nascosto.

### Semantica di ricerca
- q facoltativa, trim + NFC, da zero a 120 code point dopo normalizzazione; stringa vuota/spazi equivale ad assente. Nessun limite minlength 2/3: anche un carattere è ammesso.
- Match letterale della **frase intera** come sottostringa in name OR originalFilename. Maiuscole/minuscole ignorate; accenti distinti (caldaia ≠ caldàia). Forme Unicode canonicamente equivalenti corrispondono (é ed e + accento combinante), anche su titoli M2 già salvati: normalizzare il confronto, non riscrivere metadati/file/hash preesistenti.
- Non è fuzzy search, stemming o ricerca per parole separate. q non è una regex, un'espressione SQL o una query di motore.
- %, _, backslash, apostrofi e parentesi sono caratteri **letterali**, non wildcard/operatori. Query SQL parametrizzate; escape dei caratteri LIKE se il confronto usa LIKE/ILIKE. Nessuna interpolazione raw del testo.
- Rifiutare caratteri di controllo U+0000–U+001F e U+007F, query non stringa/array, oltre limite, format/visibility non enum e parametri sconosciuti con 422 validation_error. Ripetizioni della stessa chiave di query non sono liste valide.
- format default all: pdf→application/pdf, jpeg→image/jpeg (include nomi .jpg/.jpeg), png→image/png. Filtrare MIME verificato M2, non estensione del filename.
- visibility default all, oppure private/home. Combinazione: accesso AND formato AND visibilità AND (titolo OR filename contiene q).

### Ordinamento, cursori e compatibilità
Ordine invariato createdAt desc + id desc. Filtrare nel DB prima di take limit+1, non dopo la prima pagina. limit 1–50 default 20 come M2; nessun nuovo limite commerciale. Keyset pagination, niente caricamento di tutti i documenti in memoria per poi cercare.

Nuovi cursor vincolati ad account/Home/risorsa, filtri canonici q/format/visibility e ordinamento, **non al limit**. Non incorporare q in chiaro: usare impronta dei filtri, per mantenere il cursor entro il limite M2 di 512 caratteri. Cursor di altra Home/account/risorsa o filtri diversi →422, non pagina vuota o dati altrui. Nessun duplicato/salto con dataset invariato; mutazioni fra pagine non garantiscono snapshot immutabile.

Compatibilità: chiamate M2 senza i nuovi parametri restituiscono la lista autorizzata identica a prima. I vecchi cursor M2 {t,id,h,a}, già restituiti, sono accettabili **solo con filtri effettivamente vuoti/all/all**; con filtri attivi →422. Nuovi cursor devono sempre legarsi ai filtri, compresi quelli default. Non cambiare input di upload/export o le query list M3/M4. I consumatori di useDocuments nella selezione dell'analisi continuano a leggere la lista non filtrata.

Errori già V5: 401 UNAUTHENTICATED/account_context_changed, 403 FORBIDDEN, 422 validation_error (fieldErrors q/format/visibility quando disponibili), 503 SERVICE_UNAVAILABLE. UI non interpreta 503 come zero risultati. Non mostrare query SQL, path storage, termini di ricerca nei log applicativi o dettagli sui documenti vietati. Nessun endpoint che scarichi originali senza Account-Context.

## UX da consegnare
Documenti della Home: campo «Cerca nei documenti» (placeholder «Titolo o nome del file»), Formato (Tutti/PDF/JPEG/PNG), Visibilità (Tutti/Solo io/Condivisi nella casa), pulsante «Cerca» e «Azzera filtri». Invio da tastiera applica **insieme** query e filtri. Bozza distinta dai filtri applicati: nessuna richiesta a ogni tasto. Azzera ripristina lista iniziale e prima pagina.

Mostrare la Home di destinazione e la nota breve «La ricerca riguarda titoli e nomi dei file, non il contenuto». Preservare upload, righe con fonte/versione/visibilità, dettaglio, originale e ZIP senza modificarne il significato. Nessun badge «Verificato» derivato dal match.

Stati distinti: caricamento, casa senza documenti, zero risultati per questi filtri, servizio non disponibile/errore. Zero risultati propone azzeramento/modifica filtri; errore propone riprova, mai «nessun documento». Non cercare soltanto sui primi venti record già caricati.

Filtri applicati nell'URL del percorso /home/:homeId/documenti (q/format/visibility soltanto, niente cursor persistito); ritorno dal dettaglio e refresh li mantengono nello stesso account/Home. Link «Cerca documenti» da Casa apre la pagina con ?ricerca=1 e porta il focus al campo; questo parametro UI non viene mandato all'API. All'apertura normale non sottrarre il focus a titolo/navigazione. Non salvare bozze/query/risultati in localStorage; nessun token in URL. Cambio account/Home pulisce bozza, filtri precedenti e selezione; le risposte tardive non possono popolare un altro contesto.

Chiavi cache almeno accountId/Home/q canonica/format/visibility/cursor. Quando cambiano i filtri applicati: annullare query precedente, ripartire dalla prima pagina e svuotare la selezione ZIP. Il solo «Mostra altri» con gli stessi filtri mantiene la selezione autorizzata. Upload invalida tutte le varianti di lista della stessa Home/account (incluse quelle di analisi M3); ricerca non altera attività H1 o selezioni per analisi. Non esportare invisibili selezionati sotto un filtro precedente.

Viewer cerca/apre originali leggibili, senza export/upload; revoca/403 blocca e non lascia visualizzati risultati privati in cache. Rete assente mostra errore con riprova: niente risultati demo o successo inventato. Rendering di q/titoli/filename come testo React. Etichette, focus visibile, 320/390/desktop/tastiera; nessuna dichiarazione WCAG.

## Criteri di uscita (Codex integra e verifica, Claude prova sul mock)
1. Casa vuota distinta da filtro senza risultati; errore distinto da entrambi.
2. Titolo e filename diversi: entrambi cercabili, match case-insensitive.
3. Trim, query vuota, Unicode NFC equivalente su vecchi titoli, accenti distinti; 120/121 code point, controlli e chiavi ripetute.
4. %, _, backslash, apostrofo e testo SQL-like letterali; zero ampliamenti o esecuzione di input.
5. PDF/JPEG/PNG secondo MIME verificato, estensione fuorviante non decide il formato.
6. Private A esclusi a B anche owner; home A leggibili solo con membership valida. Combinazioni filtri e ricerca non danno indizi sui vietati.
7. Viewer ricerca/legge ma non carica/esporta; revoca/scadenza e cambio account bloccano anche risultati già ottenuti.
8. Risultato oltre la prima pagina base trovato dal server; pagina filtrata limite+1 senza duplicati; stesso timestamp con ID diversi ordinato stabilmente.
9. Cursor con altri filtri/account/Home rifiutato; limit variabile ammesso; vecchio cursor M2 accettato solo senza filtri.
10. UI Cerca/Invio/Azzera, formato/visibilità combinati, focus da Casa e ritorno dal dettaglio con stessi filtri.
11. Filtri cambiati durante rete lenta/cambio account: niente risultati vecchi o cache altrui; selezione ZIP azzerata, paginazione invariata la mantiene.
12. Upload poi ricerca trova nuovo originale; download byte/hash e ZIP selettivo conservano il comportamento M2. Nessun cambiamento documenti, caldaie, attività o ledger dalla ricerca.
13. H2 capabilities 404/503: ricerca non operativa esplicitamente, M2/M3/M4/H1 restano funzionanti; nessun fallback locale silenzioso.
14. Build/lint/test regressioni verdi, client/API/DB reali e browser 320/390/desktop/tastiera prima di dichiarare H2 finita. Tutti i test live AI disabilitati.

Il contratto non richiede produzione/cloud, motori esterni o pagamenti. Aggiornare ADR/docs nella stessa sessione di implementazione e documentare eventuali limiti reali; non dichiarare attivi endpoint solo perché esistono nel mock.

## Estensione B2 archivio assistito16ott2026
Raccolte personali confermate, filtro collection e title personale, cache/cursor/export coerenti. Firme e regole vincolanti: document-intake-api-contract.md sezione B2. Nessuna classificazione automatica dei documenti pregressi; gli originali senza metadati personali correnti sono in Da organizzare. UI e schema additivi, visibilità invariata.
