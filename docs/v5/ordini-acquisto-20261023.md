# Ordini confermati: costo e data di acquisto — 23 ottobre 2026

Lotto Codex, branch `codex/ordini-acquisto-20261023`, worktree dedicato `Dimora-V5-ordini-acquisto-20261023`, base remota del consolidamento `d373700`. Registrazione preventiva nel commit `86095c3`, pubblicato prima del codice. Nessun commit su main/Fase 0 o sul consolidamento. Il lotto Cestino di Claude resta separato: nessuna modifica a schema, migrazioni, documenti, accesso o letture DB.

## Decisione del committente

Un ordine confermato vale come acquisto effettuato ai fini delle proposte di Dimora. Per un solo prodotto identificato, con quantità assente oppure uno, il costo proposto è il totale dell’ordine, comprensivo della spedizione già inclusa. Non si somma nuovamente la spedizione. Prezzo della riga e spedizione restano evidenze distinte; se manca un totale verificato resta disponibile il prezzo esplicito della riga. Più prodotti, quantità multiple, articolo incerto o una spesa documentale separata non ricevono il totale come prezzo unitario. Nessuna ripartizione, moltiplicazione o sottrazione.

La data completa dell’ordine confermato propone la data di acquisto. Il fatto estratto rimane `orderDate`: il server non accetta una citazione d’ordine come prova esplicita di `fields.purchaseDate`. La proposta locale ha provenienza `derived_from_order` e conserva fonte/pagina/versione/SHA. Una data di acquisto esplicitamente valida rimane prioritaria. Pagamento, consegna e garanzia non sono dedotti. Gli ordini continuano a richiedere revisione finanziaria; nessun cambiamento alla conferma automatica.

Preventivi, carrelli, resi e ordini annullati sono esclusi; oltre alla classificazione, le intestazioni esplicitamente incompatibili bloccano la nuova proposta. Non è una certificazione universale del contenuto o dello stato commerciale dell’ordine.

## Implementazione

- `order-purchase.ts`, chiamato dopo il decoder e i validatori: aggiunge soltanto la proposta `purchaseDateFromOrder` ad articoli di un `order_confirmation` classificato `purchase_order`. Non altera fatti estratti, importi, warning, fingerprint, quantità, gold o soglie. Non è un campo ammesso nell’input provider.
- `profile.ts`: proietta la data con origine distinta; questa derivazione non avvia l’inizio garanzia e non presume scadenze.
- Editor: precompila il costo complessivo del singolo prodotto, spiegando la spedizione inclusa; mantiene inizialmente «Non creare una spesa». Una nuova spesa richiede scelta esplicita e conferma finale. Nessuna chiamata AI o salvataggio all’apertura.
- Bozze precedenti: ripresa frontend dalla data ordine già verificata, appartenente al documento corrente, senza AI o backfill. L’accettazione della data segue il percorso di dichiarazione esplicita dell’utente (`manual`/`user_declared`), con `orderDate` e relativa fonte conservati separatamente; l’interfaccia lo esplicita. Le nuove bozze conservano invece `derived_from_order`. Compilazioni già salvate non vengono sovrascritte.
- Congelamento campagne future: include anche il nuovo helper e `profile.ts`; manifest/autorizzazioni e ledger storici non aggiornati né riutilizzati. Prompt v29 e schema provider invariati.

## Caso macchina da caffè

Osservazioni manuali già deidentificate: De’Longhi Rivelia, EXAM440.35.B, ordine 14/06/2026, totale 499 EUR, spedizione zero. Il replay offline propone 499 EUR e 14/06/2026 come acquisto. Il nome, marca e modello erano stati confermati dal committente nella verifica UI. Non si inventano prezzo di riga estratto, quantità, pagamento, consegna, stanza, colore o garanzia. Le trascrizioni/test non sono una nuova estrazione del PDF né una misura live della qualità AI.

Il collaudo dell’utente su 55433/3109/5179, la bozza aperta e i suoi dati non vengono modificati o riavviati da questo lotto. La versione nel browser resta quella precedente finché il committente non decide l’integrazione/avvio della PR. Il replay mock verifica anche la forma della bozza precedente, senza accedere al suo DB o originale.

## Verifiche

Backend: build e lint; 306/306 onboarding, 224/224 ordinari, 18/18 guardie delle autorizzazioni. Test DB mirati: 88/88 anche nella ripetizione sul codice finale; privacy, conferma esplicita, replay concorrente e con un altro client, ricaricamento dello stesso SHA senza duplicare oggetti/spese, Q48 e acconto/saldo. Frontend: typecheck/lint e 67/67 test mirati (editor più route review/sharing); build superata; mock completa finale in corso. Le prove DB usano esclusivamente un cluster nuovo del runner offline (55439, ruolo quality_test), distinto dal prodotto e dal collaudo persistito. Le prove di conferma creano soltanto dati sintetici nel cluster posseduto.

### Configurazione locale dei test frontend

Il primo lancio completo è stato interrotto dopo errori `Denied ID` sul worker PDF: le dipendenze riutilizzate con junction nel nuovo worktree risiedono fuori dalla root Vite. Non era un errore della regola di acquisto. Risolto con un override temporaneo esterno al repository che ammette soltanto la root frontend e la directory `pdfjs-dist/build` della dipendenza, con cache/envDir nel work del task. Configurazione di prodotto, asserzioni e timeout non modificati. Le route prima fallite sono incluse nei 67 test mirati superati. Suite completa ripartita con due worker e retry massimo 1, come nel collaudo precedente; esito finale ancora da registrare.

La prima suite onboarding ha evidenziato una fixture legacy costruita copiando il nuovo marcatore: rimossa dalla sola fixture la proprietà che le bozze storiche non possiedono. La riclassificazione della data storica e le asserzioni di privacy/idempotenza restano intatte; suite finale 306/306.

## Vincoli e residui

Zero nuove chiamate AI, zero email; nessun `.env`, DB/API/storage reale, originale privato, migrazione di prodotto o dato del collaudo persistito modificato. Nessun reset/clean, force push o rimozione di worktree. Dirty legacy del checkout Home_OS preservato. Nessun merge automatico. Il gate qualità AI generale resta non promosso; prova su documenti diversi e revisione del committente restano distinte dai test offline.