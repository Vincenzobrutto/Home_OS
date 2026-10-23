# Revisione indipendente PR #9 — Cestino documenti, lotto 1

Revisore: Codex, 23 ottobre 2026. Base esaminata: `86b2b74e25dab8dcfa3aba73dbbaa7d73f51e268`, branch `claude/cestino-backend-20261023`. Worktree dedicato, branch della revisione `codex/cestino-review-20261023`.

La PR #10 è stata unita al consolidamento con commit `55f4d4fdc92c3e392af0902c4180674374015711`. La PR #9 resta separata e non viene unita. Nessuna modifica al codice prodotto di Claude: questo branch contiene documentazione e riproduzioni indipendenti.

## Criteri

Letti `AGENTS.md`, stato e lotti, piano e report Cestino 1, progetto di cancellazione §4.1, §4.4 e §5. Decisioni mantenute: gestione del documento solo dall'uploader, 30 giorni, dati delle schede già confermati conservati, backup in un lotto separato. La conservazione delle provenienze e delle storie confermate non è classificata come difetto.

## Rilievi

### R1 — P1: scheda confermata resa inaccessibile dalla cancellazione della fonte

`backend-v5/src/receipt-assistance/access.ts:12`, predicato `readableReceiptName`. Il nuovo controllo `trashedAt` scarta l'intero oggetto se il nome ha origine `extraction_confirmed`. Una conferma normale di onboarding crea proprio questa provenienza. Dopo lo spostamento nel cestino, `HomeObjectsService.getObject` nega l'accesso; il predicato è usato anche da elenco e export personale. Dopo il purge manca inoltre `DocumentVersion`, quindi l'esclusione persiste.

Il documento deve diventare indisponibile, mentre la scheda confermata e i suoi valori devono restare utilizzabili con fonte non disponibile (§4.1). Separare il diritto di leggere l'originale dalla conservazione dei dati confermati, senza rendere nuovamente leggibili documenti privati o revocati. Test: `confirmed extracted object remains readable after trash and purge`.

### R2 — P1: purge incompleto dei contenuti non confermati nei ledger

`backend-v5/src/documents/trash.ts:109-119`. La pulizia aggiorna item e alcune risposte, ma non comprende due archivi già presenti nel backend:

- `DocumentIntakeRequest.body`: un vero `IntakeBatchesService.append` memorizza il manifesto con il nome originale del file (`document-intake/batches.service.ts:300`). Anonimizzare `DocumentIntakeItem.filename` non elimina quella copia.
- `ObjectRequest.response`: `FloorPlanService.mutate(..., false)` salva i punti e i nomi degli ambienti ancora non confermati (`object-onboarding/floor-plan.service.ts:71`). Il purge svuota la bozza, ma la risposta idempotente conserva il piano completo anche quando non è stato creato alcun ambiente.

Entrambi devono essere puliti selettivamente per documento, preservando gli altri file di un lotto e il controllo del digest/idempotenza. Il limite dichiarato nel report Claude su `DocumentIntakeRequest.results` non copre questi due contenuti effettivamente prodotti. Due test separati riproducono i residui con sentinelle sintetiche; non sono valori di schede confermate.

### R3 — P2: inversione dei lock fra download condiviso e spostamento nel cestino

`backend-v5/src/documents/trash.ts:65` aggiorna `ShareRecord` mentre detiene già `Document FOR UPDATE`. `SharingService.file`, invece, blocca prima `ShareRecord FOR UPDATE` e poi `valid`/`originals` richiede `Document FOR SHARE` (`sharing/sharing.service.ts:44,152-153,29`).

Scenario: download accettato fermato dopo il lock ShareRecord; spostamento nel cestino fermato dopo il lock Document; il download riparte. Le transazioni aspettano ciascuna il lock dell'altra e PostgreSQL deve abortirne una. Il lock consultivo `g1` non protegge il percorso sharing. Uniformare l'ordine dei lock fra i due servizi senza rimuovere i controlli della fonte. Test con due transazioni e barriere dopo l'acquisizione effettiva dei lock.

### R4 — P2: risposta tombstone incompatibile con il replay economico

`backend-v5/src/documents/trash.ts:116` sostituisce `EconomicRequest.response` con `{purged:true}`. `EconomicDocumentsService.request` interpreta ogni risposta precedente come `Saved`, e `project` usa `saved.row.id` (`economy/document.service.ts:35-36`).

Scenario: job fixture fallito, retry con chiave idempotente, secondo job concluso, purge della fonte, replay dello stesso retry. Il replay deve restituire un errore controllato di fonte eliminata; il nuovo JSON non ha `row` e produce un'eccezione interna. Gestire esplicitamente il tombstone prima della proiezione, mantenendo il confronto del digest e impedendo un nuovo job. Non conservare il vecchio contenuto per evitare l'errore.

## Copertura e limiti

Esaminate le letture Prisma dirette di Document e DocumentVersion, gli include di originali e bozze/confronti, i predicati SQL di visibilità, `canReadDocument`, listing bozze/proposte, intake, contatti, storia, garanzie, export personale, sharing e rimozione legacy. Il test di guardia controlla la vicinanza testuale di una condizione: non dimostra la correttezza dei JSON persistenti né dell'ordine dei lock. I rilievi sopra descrivono scenari concreti, senza affermare assenza assoluta di altri problemi.

Migrazione additiva: colonne nullable e versione iniziale, tabelle/indici/FK aggiunti, nessuna riscrittura dei documenti esistenti. CHECK coerente con stato attivo, cestino, ripristino e purge immediato/scaduto. Ripristino e scadenza condividono `g1`, e il worker rilegge la scadenza dopo averlo acquisito. Le analisi onboarding/ricevute/economiche usano lock della fonte e controlli di disponibilità; il blocco conservativo delle fonti caldaia è un limite già dichiarato. Non è stata applicata alcuna migrazione al DB reale.

## Riproduzione offline

I test aggiunti usano esclusivamente dati sintetici, storage in memoria e provider fixture; `fetch` è vietato. Il runner crea e arresta il proprio cluster nuovo sulla porta di collaudo, con scratch corta. Il profilo esplicito di revisione è escluso dall'aggregato originale: contiene asserzioni sul comportamento corretto che devono fallire fino alla correzione del prodotto.

```powershell
npm run test:trash-db -- --pg-bin <PostgreSQL-bin> --scratch-root <scratch-corta>
npm run test:offline-db -- --pg-bin <PostgreSQL-bin> --scratch-root <scratch-corta>
npm run test:offline -- --suite test:cestino-review-db --pg-bin <PostgreSQL-bin> --scratch-root <scratch-corta>
```

## Verifiche eseguite

- Build TypeScript e lint completo: superati. Anche lint mirato dei file di test finali superato.
- `npm test`: **227/227** superati nell'esecuzione finale.
- `test:trash-db`: **10/10** nel conteggio Node (9 sottocasi più il contenitore), tutti superati.
- `test:offline-db`: **506/506**, ossia 54 HTTP + 450 diretti + 2 dopo riavvio del cluster, tutti superati sulla punta originale di Claude. Nessun test di regressione originale indebolito.
- Profilo esplicito `test:cestino-review-db`, esecuzione finale `dimora-offline-cwJOT1`: **5/5 sottocasi falliscono come previsto** (Node conta 6 fallimenti includendo il contenitore). Confermati `[403,403]` per la scheda dopo cestino/purge, entrambe le sentinelle ancora nei JSON, `TypeError: Cannot read properties of undefined (reading 'id')` sul replay, un deadlock PostgreSQL fra `SELECT Document FOR SHARE` e `UPDATE ShareRecord`. Anche il log PostgreSQL registra il ciclo dei due lock. Nessun errore di setup scambiato per difetto del prodotto nell'esecuzione finale.
- Il primo avvio unitario della revisione aveva segnalato lo script mancante per il nuovo profilo, aggiunto prima della ripetizione; inoltre il sandbox impediva il listener HTTP temporaneo. La ripetizione finale con i listener locali del runner consentiti è verde. Questi esiti non sono difetti del prodotto Claude.

Evidenze locali conservate senza pulizia: scratch `Documents/Codex/t9`, cluster baseline `dimora-offline-DDrEc0`, Cestino `dimora-offline-cLsTKN`. La riproduzione iniziale `dimora-offline-mYqTMh` conferma R1, le due copie di R2 e R4; il controllo di concorrenza iniziale non era conclusivo perché la membership iniziava dopo l'orologio simulato. La versione finale fissa `validFrom`, aggiunge un download di controllo e verifica ogni errore inatteso, senza allentare l'asserzione sul deadlock.

Nessuna AI, email, DB/API/storage reale, modifica `.env`, force push, modifica di main o del branch Claude. I file sporchi del checkout originale sono esclusi. Questo branch di revisione parte dalla PR richiesta, non aggiorna né sovrascrive il lotto di Claude e non propone il merge nel consolidamento.

## Esito e passaggio di consegne

**Richieste correzioni prima di integrare la PR #9.** Due rilievi P1 (schede confermate e pulizia dei ledger) e due P2 (lock e replay). Riproduzioni e report sono proposti separatamente verso `claude/cestino-backend-20261023`, in bozza: non contengono la correzione del codice prodotto e il profilo di revisione resta deliberatamente rosso. Dopo le correzioni, fare passare i cinque sottocasi e ripetere l'aggregato originale; non rimuovere le asserzioni di privacy, digest, versione o idempotenza. La successiva integrazione nel consolidamento richiede anche l'aggiornamento del branch Claude rispetto alla base corrente e la decisione del committente.

Hash remoti verificati dopo il merge #10: consolidamento `55f4d4fdc92c3e392af0902c4180674374015711`, Claude `86b2b74e25dab8dcfa3aba73dbbaa7d73f51e268`, main `cdbb318ddb56e764ad4b111a71560e3e71c7a033`.
