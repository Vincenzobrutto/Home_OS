# Fase 0 — Q15 split payment, correzione offline del 23 ottobre 2026

Implementato e verificato su `codex/fase0-ai-quality-v3`. Nessuna chiamata AI, nemmeno di metadata/conteggio; nessun originale reale, accesso a DB/API dell’app, modifica `.env` o migrazione del prodotto. Gold, corpus, score, ricevute e ledger delle campagne precedenti preservati. Verificati i 52 originali e i 52 gold contro gli hash di entrambe le ricevute congelate; i sei JSON autorizzazione/risultati/verifica risultano invariati rispetto a HEAD.

## Problema e riproduzione

La campagna v24 ha due esiti `complete` su Q15 dove il gold impone `review`, pur con importo/data/fornitore corretti. Il PDF sintetico distingue imponibile **200,00 EUR**, IVA **44,00 EUR**, totale corrente **244,00 EUR** e saldo al fornitore **200,00 EUR**, con scissione dei pagamenti esplicita. Il vecchio controllo degli importi concorrenti dipendeva dalle proposte restituite: omettendo `amount_due` e dichiarando `requiresHumanReview=false`, il solo totale corretto poteva passare.

Le risposte grezze live non sono conservate: non si afferma di aver riprodotto quei payload. La regressione costruisce una risposta locale coerente con i campi misurati, intenzionalmente priva del saldo, e usa il parser di produzione sul PDF Q15 congelato. Conserva 24400 centesimi, data, emittente e P.IVA, ma ora richiede revisione. Il test dell’adattatore usa preparazione/schema/decoder/policy reali con trasporto interamente in memoria, nelle modalità completa, locale e progressiva; zero socket esterni.

## Comportamento

- `payment-review-v1` legge **tutte le pagine del testo verificato localmente**, incluse quelle escluse da selezione o prefisso inviato al modello. Riconosce `split payment`, `scissione dei pagamenti`, `IVA versata dal committente`, ignorando maiuscole, spazi/a capo e trattini fra split/payment; rimuove il soft hyphen. Nessuna deduzione di importi, fiscalità o pagamento.
- Il server persiste in `ProductExtraction.paymentReview` soltanto policy, snapshot documento/versione/SHA e motivo `split_payment|null`. Il modello non può fornire questo campo; citazioni e validazioni monetarie restano obbligatorie. Nessun testo aggiuntivo o risposta grezza nei metadati. La proiezione pubblica conserva il normale `needsReview`, senza esporre la nuova attestazione interna.
- `automaticPlan` richiede revisione indipendentemente da `needsReview` del modello o dai candidati saldo. Anche la conferma interna con `automatic=true` ripete il controllo sotto lock/transazione e confronta lo snapshot, prima di costi, oggetti o contatti; neppure una conferma di soli contatti aggira il blocco. Errore interno `onboarding_payment_review`.
- Le **vecchie bozze finanziarie prive del controllo**, con versione policy ignota o snapshot non coincidente, non possono autorizzare l’automatico. Restano confermabili esplicitamente senza nuova analisi AI. Immagini e PDF visivi restano soggetti alle precedenti regole di revisione; la nuova attestazione testuale non viene fabbricata per loro.
- La conferma manuale del totale verificato **244,00 EUR** resta possibile con opt-in distinto per il professionista. Il netto di 200,00 EUR non può usare il candidato totale da 244,00 EUR. Nessun totale ricalcolato, fusione, allentamento del gold o delle validazioni.

Prompt invariato `document-understanding-v24-invoice-pages`: cambia la policy deterministica locale, non una nuova istruzione al modello. Il congelamento delle autorizzazioni future include anche `payment-review.ts` e il servizio di conferma; la ricevuta v24 viene rifiutata dal codice cambiato. Nessun residuo di budget riutilizzato e nessuna campagna avviata.

## Verifiche eseguite

| Verifica | Esito |
|---|---|
| Build TypeScript e lint backend V5 | verdi |
| `npm run test:object-onboarding` | **181/181**, inclusi 7 nuovi test Q15 |
| `npm run test:quality-v3` | **24/24** |
| `npm run test:quality-v3-live-guards` | **11/11**, esclusivamente offline |
| `npm test` backend V5 | **213/213** |
| Q15 + regressioni Q48 su DB sintetico isolato | **20/20**: Q15 8 scenari + contenitore, Q48 10 + contenitore |

DB: `npm run test:q15-db -- -PgBin <bin PostgreSQL locale> -ScratchRoot <directory work>`. Il wrapper crea un cluster nuovo sulla **55433**, ruolo `quality_test`, DB `dimora_v5_quality_v3_test`, applica lo schema soltanto lì e lo spegne nel `finally`, conservando i file. Il guard verifica host/porta/nome/ruolo prima della connessione. Prisma riceve un URL esplicito; nessun caricamento `.env`. `fetch` globale vietato nei test. Directory verificata `payment-9b46773fe8cb481abb464cbf0dae274d`; arresto PostgreSQL confermato dal log.

Q15 verifica altri owner/estranei, candidati privati, nessuna scrittura né ricevuta riuscita dopo rifiuto automatico, vecchie bozze e binding della policy, rollback incluso il contatto, due conferme manuali concorrenti con una sola spesa/contatto, replay da altro client, chiave con body diverso e nuova chiave, revoca della fonte con redazione, cambio SHA/versione, ruolo viewer e perdita membership. Q48 ripete tutte le prove precedenti di segmentazione, privacy, atomicità e idempotenza senza modificare le asserzioni.

Il primo passaggio della suite onboarding segnalava la lista esatta delle chiavi del vecchio test, ora estesa esplicitamente con `paymentReview`; nessuna asserzione di privacy/idempotenza rimossa. Il primo `initdb` nell’ambiente ristretto si è fermato durante inizializzazione, prima dell’avvio DB: terminati soltanto i suoi processi identificati, file conservati; la verifica completa è stata poi eseguita con i permessi necessari su un cluster nuovo.

## Limiti e prossimo passo

Correzione deterministica verificata offline, **non nuova accuratezza AI**: risultati e gate v24 restano congelati e **non superati**, con i due errori Q15 storici nel denominatore. La ricerca lessicale è conservativa e non certifica il regime fiscale né copre ogni parafrasi o OCR; i visivi restano da revisionare. Nessun frontend/browser o suite HTTP ripetuti, API dell’app non riavviata. Q22, copertura live Q48, date, titoli e stabilità restano aperti nel backlog. Ogni nuova campagna e ogni documento reale richiedono autorizzazione distinta.
