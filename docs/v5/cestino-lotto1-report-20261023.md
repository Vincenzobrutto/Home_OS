# Cestino — lotto 1, modello e backend dei documenti: report, 23 ottobre 2026

Lotto Claude sul branch `claude/cestino-backend-20261023`, dal consolidamento `d373700`. [Piano approvato](cestino-lotto1-piano-20261023.md) il 23/10, con due decisioni: solo chi ha caricato un documento può eliminarlo; il ciclo dei backup va in un lotto separato. [Progetto](fase0-deletion-design-20261022.md), [API](documents-api-contract.md#cestino-dei-documenti--23-ottobre-2026-lotto-1), [modello](domain-model.md#cestino-dei-documenti--23-ottobre-2026).

## Cosa fa

- **Nel cestino:** un documento si sposta con anteprima d'impatto, versione e chiave di idempotenza. Il server rifiuta se un'analisi è in coda o in corso. Le condivisioni del documento vengono revocate subito e le anteprime di condivisione scadono.
- **Invisibile ovunque:** `canReadDocument` esclude i documenti nel cestino. Tutte le query SQL che verificano la leggibilità (23 punti in 10 file) aggiungono `"trashedAt" IS NULL`, e le letture Prisma aggiungono `trashedAt: null`. Il documento sparisce da elenco, ricerca, riepilogo, dettaglio, download, export ZIP, export personale, storia della casa, candidati e suggerimenti, proposte economiche e confronti delle ricevute. Le conferme tardive di un'analisi falliscono perché ricontrollano la fonte nella stessa transazione.
- **Ripristino:** entro i 30 giorni, con versione. I collegamenti tornano da soli; le condivisioni restano revocate.
- **Eliminazione definitiva:** allo scadere dei 30 giorni (attività del server ogni 60 secondi, anche alla riaccensione), con «Elimina subito» o con «Svuota cestino». Rimuove originale, file registrato, nome, titolo e organizzazione, output e risposte delle analisi, proposte, nomi nei manifesti di condivisione, collegamenti ai contatti e risposte idempotenti collegate. Resta un segnaposto senza contenuto, così spese, oggetti e campi confermati mantengono la fonte come «documento eliminato». `DeletionRecord` registra l'eliminazione senza contenuto; se la rimozione fisica del file fallisce, viene ripetuta al giro successivo.
- **Privacy tra membri:** ogni account vede e gestisce solo il proprio cestino; un altro proprietario della casa riceve 403.

## Verifiche eseguite

| Ambito | Esito |
| --- | --- |
| Backend build e lint | Superati |
| `npm test` | 227/227 (224 precedenti + 3 nuovi di guardia) |
| Onboarding, qualità offline, guardie qualità, guardie runner | 303/303, 24/24, 17/17, 10/10 |
| Nuova suite `test:trash-db` (DB temporaneo) | 9/9 casi |
| Profilo DB completo `test:offline-db` | 506/506: 54 esterni, 450 diretti, 2 dopo riavvio PostgreSQL (496 precedenti + 10 del cestino), nessuna asserzione o timeout allentato |

La suite del cestino copre: anteprima e conteggi, rifiuto per il non caricatore, blocco con analisi in corso, versione e idempotenza, condivisione revocata con evento, invisibilità per entrambi i membri (elenco, dettaglio, file, export, rimozione), ripristino, due spostamenti concorrenti (uno solo riesce), scadenza simulata a 29 e 31 giorni, ripristino rifiutato dopo la scadenza, rimozione fisica fallita e ripetuta. L'ultimo caso cerca un testo sintetico in tutte le colonne testo e JSON del DB dopo «Svuota cestino»: zero risultati. La prima esecuzione aveva trovato il nome nella risposta salvata dello spostamento nel cestino; corretto prima del verde.

Nessuna AI o email a pagamento, nessun DB/API/storage reale, nessun `.env`. Cluster temporanei dentro `tmp/cestino`, conservati con i log.

## Correzioni dopo la revisione indipendente di Codex

[Revisione](cestino-review-20261023.md) sulla punta `86b2b74`: due rilievi P1 e due P2, riprodotti da cinque test in `test/document-trash-review.integration.test.cjs`. I test sono entrati invariati nel branch e ora fanno parte di `test:trash-db` e dell'aggregato `test:offline-db`.

1. **P1 — schede confermate inaccessibili.** Il filtro del cestino era stato applicato anche alle prove dei dati già confermati: nome, marca, modello, campi della ricevuta, caldaia, abbinamento delle spese. Ora i concetti sono due. `canReadDocument` e i predicati con `"trashedAt" IS NULL` valgono per aprire un documento, elencarlo o usarlo per nuove proposte. `canSeeConfirmedSource` e `confirmedSourceVisible` valgono per i dati confermati: conta solo la visibilità fissata al momento del cestino, e la verifica di versione e SHA si applica solo finché la fonte è attiva. La privacy verso gli altri membri resta invariata; la scheda mostra la fonte come non disponibile.
2. **P1 — contenuti non confermati nei registri.** All'eliminazione definitiva, oltre a `ObjectOnboardingRequest`, `EconomicRequest` e `TrashRequest`, vengono ripuliti anche `ObjectRequest.response` (piani non confermati) e `DocumentIntakeRequest.body`. Del secondo cambiano solo le voci del documento: nome del file sostituito e corpi `review:`/`duplicate:` dell'elemento. Gli altri file del lotto e i digest restano.
3. **P2 — deadlock con il download condiviso.** Lo spostamento nel cestino non aggiorna più le condivisioni dopo aver bloccato il documento. Le condivisioni smettono di funzionare nella stessa transazione, perché un documento nel cestino non è un originale disponibile, e vengono marcate revocate in una transazione separata subito dopo il commit. Ripristino ed eliminazione definitiva bloccano prima le righe `ShareRecord` e poi il documento, nello stesso ordine di `SharingService`; «Svuota cestino» blocca tutte le condivisioni coinvolte prima del primo documento. Il ripristino revoca anche eventuali condivisioni rimaste aperte per una revoca interrotta.
4. **P2 — replay economico dopo l'eliminazione.** Le risposte ripulite contengono ora la marca `{sourceDeleted:true}`. I replay di economia, onboarding, planimetria, famiglia della casa e cestino rispondono 410 `source_deleted`, invece di dereferenziare una risposta vuota. Digest e chiavi restano, quindi nessun nuovo job parte con la stessa chiave.

Un mio test sulla scadenza contava le rimozioni fisiche di tutto il DB. La scadenza del server agisce su tutte le case e, ora che la suite gira insieme a quella di Codex, raccoglieva anche le sue chiavi: l'asserzione ora conta solo le proprie.

### Verifiche dopo le correzioni

Branch aggiornato con merge del consolidamento (PR #8 e #10 di Codex, ordini) e della revisione (`codex/cestino-review-20261023`). Build/lint superati; `npm test` 227/227; onboarding 306/306; qualità 24/24; guardie qualità 18/18; guardie runner 10/10; `test:trash-db` 16/16 (cestino e revisione, conteggio Node). Aggregato `test:offline-db` **513/513**: 54 esterni, 457 diretti, 2 dopo riavvio PostgreSQL. Nessuna asserzione dei test di revisione modificata.

## Limiti e lavoro residuo

- **Frontend non toccato:** la pagina Cestino, l'avviso «Annulla» e il passaggio del pulsante attuale al cestino sono il lotto 2. `POST documents/:id/removal` resta com'è.
- **Dati confermati:** valori, provenienze (`ReceiptObjectField.sources`, `economicProvenance`) e storie delle schede restano, come previsto da §4.1. La casella «elimina anche le schede create solo da questo documento» è nel lotto 3.
- **Scheda caldaia:** i documenti fonte di un `AnalysisJob` non possono andare nel cestino (409 con messaggio). Va deciso in un lotto successivo.
- **`DocumentIntakeRequest.results`** non è coperto dalla ricerca sintetica: il test non lo popola. Da verificare nel lotto 2, con il flusso di caricamento reale.
- **Backup:** riapplicazione del registro dopo restore e ciclo delle copie non implementati (lotto separato). `DeletionRecord` è già pronto per questo uso.
- **Fornitore AI:** i documenti già inviati ad Anthropic seguono la sua politica di conservazione; Dimora non può richiamarli. Da dichiarare nella UI del lotto 2.
