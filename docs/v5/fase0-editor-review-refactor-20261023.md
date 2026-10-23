# R03 — revisione delle spese separata da stato e richieste

23 ottobre 2026, Codex. Secondo lotto del [piano di audit](fase0-code-audit-refactor-20261023.md), base 37a0a86e8e825c36c19b5f94e2974209118031b4 sul branch codex/fase0-ai-quality-v3. Fetch iniziale e confronto HEAD/upstream 0/0, nessuna modifica a main. Applicate le procedure simple-refactor e refactor-roadmap già esaminate nella libreria indicata dal committente; nessuna nuova installazione o dipendenza.

## Problema e modifica

HouseExpenseProposal gestiva contemporaneamente stato del form, query, validità, costruzione della conferma e checklist con focus. Il lotto separa responsabilità con confini piccoli:

- **houseExpenseReview.ts**: proiezione pura degli input modificabili e degli esiti già letti. Produce blocchi di conferma, elenco ordinato dei dati mancanti, riepilogo e payload per le quattro azioni. Riceve la data corrente dal chiamante; nessun accesso a orologio, browser, rete, storage o DB. La costruzione di un payload non autorizza una scrittura.
- **HouseExpenseIssues.tsx**: presentazione della checklist e focus del campo selezionato, con apertura dei dettagli come prima. Non gestisce dati economici, richieste o conferme.
- **HouseExpenseProposal.tsx**: conserva tutti gli hook di stato/query, inizializzazioni e ripresa del form, consenso sulle scelte di collegamento, controllo delle risorse disponibili, invio della conferma e gestione dell’esito. Il tipo HouseReview viene riesportato dal percorso precedente per mantenere compatibili i consumatori.

Nessuna modifica a endpoint, payload, chiavi, regole monetarie o date, ruoli delle evidenze, limiti o stato salvato. Assenza dei dati query e risposta malformata restano distinte: una risposta priva della lista obbligatoria non viene trasformata silenziosamente in “nessun doppione”. Nessuna asserzione o timeout dei test esistenti modificata.

## Equivalenza verificata offline

1. **Baseline mirata: 96/96 test**, quattro file, prima dell’estrazione. Gli stessi 96 passano anche dopo la prima estrazione.
2. **Confronto differenziale temporaneo su 30.000 stati UI distinti**, generati deterministicamente (seed 0x20261023, LCG 1664525/1013904223, selezione con i bit alti). La vecchia proiezione è estratta dal sorgente Git della base; la nuova è compilata in memoria con TypeScript. Confrontati duplicati, validità, riepilogo/form, ordine e testo dei problemi, e payload per create/link_existing/skip/defer: **120.000 selezioni equivalenti**, confronto strutturale e serializzato, nessuna mutazione degli input. Sono combinazioni di stato del software, non nuovi documenti o campagne AI; non dimostrano nuove capacità di estrazione.
3. **37 espressioni di hook/query/chiamata API identiche e nello stesso ordine** rispetto alla base, verificate tramite AST. La gestione delle richieste non è stata spostata nella funzione pura.
4. **Otto regressioni permanenti** in houseExpenseReview.test.ts: periodo/emissione/scadenza distinti, costo complessivo esplicito per acconti/saldi senza calcoli, collegamento con versione senza nuova spesa, skip/defer senza dati economici nascosti, blocchi per oggetti/suggerimenti/controlli non disponibili, riconoscimento dei doppioni e preservazione input, date/periodi da correggere, totale ambiguo e titolo oltre limite senza correzione implicita.
5. **Mirati finali: 104/104**, cinque file, inclusi test UI esistenti su checklist/focus, ripresa dei metadati, riferimenti non disponibili, acconto/saldo, revisione unificata e conferme parziali. Nessun retry configurato nella suite mirata. Typecheck e lint finali superati; build Vite produzione superata.
6. **Mock completa finale: 852/852 test, 103 file, 480,80 secondi**, due worker e retry massimo 1 configurato. Nessuna asserzione o timeout modificato.

La verifica differenziale controlla equivalenza della proiezione, non la sicurezza del server o l’intero spazio degli input. L’autorità per accessi, importi e scritture resta il backend. Le suite backend/HTTP/DB non sono state ripetute: codice backend invariato e nessun DB contattato in questo lotto. I risultati storici restano separati nel report di audit e nello stato corrente.

## Misure e limiti

| Misura | Base | Dopo |
| --- | ---: | ---: |
| Caratteri AST nella funzione HouseExpenseProposal | 25.648 | 20.480 |
| Diramazioni euristiche nella stessa funzione, callback incluse | 88 | 48 |
| Entry JS minificata | 479.496 byte | 479.496 byte |
| Chunk differito OnboardingPage | 113.127 byte | 113.938 byte |
| Chunk differito OnboardingPage gzip | 32.444 byte | 32.777 byte |

Le diramazioni sono state spostate in responsabilità verificabili, non eliminate o rese permissive. Il costo della separazione nel chunk differito è +811 byte (+333 gzip); questo lotto migliora manutenzione e testabilità, non dichiara una riduzione del codice totale o una maggiore velocità. L’entry conserva la riduzione ottenuta nel primo lotto. Non sono state misurate latenza utente o nuove accuratezze AI/OCR.

R03 rimane **parzialmente affrontato**: altri editor e porzioni di inizializzazione/query restano estesi. Prossimo passo suggerito: ripristino/serializzazione della compilazione in DraftEditor, mantenendo stessa versione, recupero di conferme pendenti e scelta esplicita di pausa. R04/R05/R07 e gli altri rilievi dell’audit restano aperti, senza anticipare modifiche a transazioni, lock o filtri di privacy.

## Vincoli e consegna

Nessuna nuova AI/email, modifica a .env, accesso a DB/API/storage reale o al DB temporaneo dell’utente, migrazione, deploy, main, gold, scorer, ledger/campagne o 104 StoredFile. Bozza caffè e dati di collaudo non usati o modificati. File sporchi legacy e untracked estranei preservati. Nessuna verifica con browser in questo lotto; test UI eseguiti con backend simulato.

Stato corrente, backlog, roadmap e changelog aggiornati senza ricreare una sequenza di checkpoint nello stato corrente. Consegna limitata ai file di questo lotto sul branch Fase 0, con confronto dell’hash remoto; lavoro estraneo escluso.
