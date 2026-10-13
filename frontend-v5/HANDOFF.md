# HANDOFF — M3 Caldaia, proposte e conferme (frontend)

Autore: Claude Code. Data: 13/10/2026. Destinatario: Codex (review, integrazione, collaudo reale).
Stato: **frontend M3 pronto per l'integrazione, verificato solo con backend simulato. M3 non è completata**: gli endpoint review-v1 non erano disponibili e nessuna prova su job/API/DB reali è stata eseguita.

## Checkout e commit

- Percorso: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude`, branch `claude/dimora-v5-identity`.
- Base verificata: `514a39d5f2356d2eb4d99e4e7393b34176fdc8af`, albero pulito salvo `docs/v5/backend-status.md` non tracciato (non toccato, non incluso).
- Commit locali, non pushati, in ordine:

| Commit | Contenuto | Azione per Codex |
|---|---|---|
| `29bb4c7` chore(v5): sync M2 review and M3 contract | Patch `Dimora-V5-sync-Claude-M2-M3.patch` applicata così com'è (`git apply --check` pulito), solo i 14 file della patch | **Non riapplicare** |
| `5ed1334` chore(frontend-v5): PDF di esempio M3 con byte verificati | `public/m3-examples` (3 PDF + manifest, `.gitattributes` binary), test Node di integrità, progetto vitest `fixtures` | Integrare |
| `18cb131` feat(frontend-v5): client review-v1 e cache M3 | Tipi, client, chiavi cache, etichette/regole, hook (polling, conferme) | Integrare |
| `6a08d64` test(frontend-v5): backend simulato review-v1 | `src/test/fakeReview.ts` collegato al backend simulato; `npm test` include `fixtures` | Integrare |
| `f1c2265` feat(frontend-v5): Attività, Da rivedere e scheda caldaia M3 | Pagine, rotte, navigazione, Casa, punti di avvio da Documenti, 21 test UI | Integrare |
| `17ded53` fix(frontend-v5): fonti distinguibili e rifiniture M3 | Correzioni emerse nel browser; seed mock con i PDF reali | Integrare |
| `b640b30` test(frontend-v5): integrazione reale review-v1 pronta | Suite reale, saltata di default | Integrare |
| commit successivo docs(frontend-v5) | Questo HANDOFF, README, screenshot | Integrare. SHA: `git log -1 -- frontend-v5/HANDOFF.md` |

Nota: il test di integrità in `5ed1334` importa `fakeReview`, che arriva in `6a08d64`. I test passano da `6a08d64` in poi; integrare la serie intera.

Dopo il sync ho scritto solo in `frontend-v5/**`.

## ⚠ Problema nella patch: PDF di fixture corrotti

I tre PDF arrivati con la patch in `docs/v5/fixtures/m3/` **non hanno gli hash del manifest**. Sono gli originali con le fine riga LF convertite in CRLF: 92 per file, +92 byte. L'ho verificato ricostruendo la conversione su copie nello scratchpad, con hash identico.

| File | Hash nel manifest | Hash in `docs/v5/fixtures/m3` (patch) |
|---|---|---|
| libretto-caldaia-demo.pdf | `824b6de3…` | `eb5f7d9e…` |
| scheda-tecnica-caldaia-demo.pdf | `da6b7340…` | `8ec5c3fd…` |
| rapporto-caldaia-demo-conflitto.pdf | `e313f78f…` | `ea82ee87…` |

Non li ho modificati: sono file di Codex in `docs/v5`. Per `public/m3-examples` ho copiato i PDF da `outputs/Dimora-V5-M3-esempi/`, i cui hash coincidono col manifest; `tests/fixtures` lo verifica a ogni `npm test`.

**Azione richiesta a Codex:**
- controllare le copie nel tuo repository e rigenerare la patch in modalità binaria (`.gitattributes *.pdf binary` era nella patch, ma la conversione è avvenuta prima);
- verificare che il provider reale legga i PDF con i byte del manifest. Un PDF corrotto caricato in M2 produrrebbe `provider_fixture_unsupported`.

## Cosa è stato fatto

- **Navigazione e rotte**: Attività attiva; Spese resta «Non ancora disponibile»; Agenzie/Amministratori invariati. Rotte nuove: `/home/:homeId/attivita`, `/home/:homeId/review`, `/home/:homeId/impianti/:assetId`. Parametri di Attività: `?analizza=<docId|1>`, `&scheda=<assetId>` (rianalisi con destinazione già scelta), `?job=<id>` (avanzamento).
- **Casa**: riquadro «Impianti e verifiche» con il conteggio reale (`openCount` di GET review), le schede personali e il loro stato. Errore esplicito se gli endpoint mancano; nessun valore preinserito.
- **Avvio esplicito**:
  - da Documenti («Analizza documenti (test)») e dal dettaglio di un PDF («Analizza questo documento (test)»);
  - capabilities lette dal server (enabled, maxDocuments, formats); scelta di 1–2 PDF leggibili; destinazione visibile («nuova scheda» o «scheda esistente», «Scheda personale in questa casa»); etichetta «Analisi di test — nessuna AI reale» prima dell'avvio e accanto ai risultati;
  - richiede `edit`, separato da `export`;
  - mai avvio al caricamento, al montaggio o all'apertura del PDF (verificato nei test).
- **Job**:
  - POST 202, poi polling GET del job ogni 1 s per al massimo 30 s a visita. Si ferma allo smontaggio, quindi anche al cambio pagina o casa e al logout.
  - Allo scadere compare «Analisi in corso: puoi tornare più tardi» con «Aggiorna» manuale; nessun successo simulato.
  - Attività elenca i job persistenti. «Nuovo tentativo» sui falliti usa una nuova chiave e crea un nuovo job; il vecchio errore resta visibile, con il suo codice.
  - Su `provider_fixture_unsupported` resta l'originale e l'inserimento manuale.
- **Da rivedere**: solo verifiche aperte, raggruppate per scheda, con `openCount`. «Conferma insieme» vale solo per marca e modello con un unico valore proposto e senza valore già confermato: un invio atomico per scheda e versione, potenza esclusa con spiegazione. A zero verifiche: stato vuoto, nessuna scheda disattivata.
- **Scheda caldaia**:
  - stato dei dati («Dati provvisori / parzialmente confermati / confermati», con la precisazione che non riguarda la regolarità tecnica);
  - dati confermati con origine, nota e fonti per ogni misura; verifiche aperte; inserimento manuale; rianalisi con destinazione; storia.
  - Fonti: estratto, pagina, versione, impronta abbreviata del documento e «Apri l’originale», che porta al dettaglio M2 autenticato.
- **Decisioni** (componente `ProposalCard`):
  - **Marca e modello**: si sceglie un candidato oppure si corregge (correzione con nota obbligatoria).
  - **Potenza**: decisione sempre puntuale e con nota.
    - **A+B** (grandezze distinte, `quantity_interpretation`): «Conserva le due grandezze» → `keep_distinct`, con le denominazioni esatte «24 kW — Potenza utile al riscaldamento» e «28 kW — Potenza nominale riportata».
    - **A+C** (`value_conflict`): l'opzione «Conserva le due grandezze» non c'è; si sceglie un valore (`choose_one`) o si corregge con 1–2 misure con denominazione.
  - **«Rimanda»**: nessuna richiesta, la verifica resta aperta.
  - **«Non applicare»**: nota obbligatoria → `discard`.
  - **Valore già confermato e diverso**: prima/dopo, casella esplicita «Sostituisci il valore confermato» e nota, poi `replaceConfirmed: true`.
  - **Esiti di errore**:
    - 409 (`asset_version_conflict`, `proposal_already_resolved`, `confirmed_value_exists`, `idempotency_conflict`): messaggio, rilettura, scelta azzerata, nuova chiave; mai reinvio automatico.
    - Errore di rete o servizio: campi bloccati e «Riprova invio» con la stessa chiave.
  - **Dopo il successo**: dalla cache delle verifiche spariscono solo i `resolvedProposalIds`, poi si rileggono verifiche, scheda, elenco e storia. Nessuna scrittura in cache se nel frattempo è cambiato l'account.
- **Manuale**: «Crea una scheda caldaia a mano» (POST assets) e, sulla scheda, due moduli: marca/modello in un'unica richiesta, potenza da sola.
  - Nota obbligatoria; sostituzione esplicita se il campo è già pieno.
  - `proposalIdsToClose` vuoto di default: si chiudono solo le verifiche spuntate esplicitamente.
  - Il client non invia mai `sources` o `origin`.
- **Controlli M1/M2 riusati**: tutte le richieste via `send` comune (`X-Account-Context` catturato, CSRF, `no-store`); cache `[account, accountId, home, homeId, m3, …]`; pulizia al 401 e al logout; bozze solo in memoria, azzerate al cambio di account o casa; le risposte tardive non scrivono dati dopo un cambio di contesto.

## API utilizzate (review-v1, nessun campo o endpoint inventato)

GET `analysis-capabilities` · POST/GET `analysis-jobs` · GET `analysis-jobs/:jobId` · POST `analysis-jobs/:jobId/retry` · GET/POST `assets` · GET `assets/:assetId` · GET `review` · POST `assets/:assetId/confirmations` · POST `assets/:assetId/manual-confirmations` · GET `assets/:assetId/history` (tutti sotto `/homes/:homeId`). M2 per i documenti e l'apertura delle fonti.

## Prove realmente eseguite (Node 24.20.0, in `frontend-v5/`)

| Comando | Esito |
|---|---|
| `npx tsc -b` | OK |
| `npx eslint .` | OK |
| `npx vitest run` | **105 superati** (10 file), 6 saltati (integrazione). Ripetuto 3 volte, stabile |
| `npx vite build` | OK (JS 463 kB, gzip 142 kB); backend simulato assente dal bundle; `dist/m3-examples` presente |
| Suite di integrazione contro **backend simulato** su 3101 (`V5_DOCUMENTS_API=1 V5_REVIEW_API=1`) | 9/9: verifica solo il codice dei test, **non è integrazione reale** |

Composizione dei 105: 81 regressioni M1/M2 (un'asserzione aggiornata: ora è Spese l'unica sezione bloccata), 21 test UI M3 con backend simulato, 3 test Node di integrità dei PDF.

### Test M3 (`src/routes/review.test.tsx`, backend simulato)

- **Endpoint e avvio**: backend senza M3 senza dati inventati; nessuna analisi al montaggio di Documenti, dettaglio o Attività; avvio esplicito con etichetta, destinazione, body/header, polling fino all'esito e scheda provvisoria; member può avviare (senza export), viewer no.
- **Job**: documento sconosciuto fallito senza schede, retry con nuova chiave e vecchio errore conservato, manuale disponibile; limite del polling con «puoi tornare più tardi», letture ferme e «Aggiorna»; polling fermo lasciando la pagina e rientro da Attività.
- **Decisioni**: conferma della sola marca (modello e potenza restano, conteggio riletto, storia); «Rimanda» senza richiesta; «Non applicare» con nota obbligatoria; conferma insieme senza potenza; A+B `keep_distinct` con fonti per ogni misura; A+C senza «Conserva le due grandezze», con `choose_one` e fonti conservate nella storia; sostituzione esplicita con prima/dopo; 409 di versione senza reinvio; esito ambiguo con stessa chiave e una sola conferma.
- **Manuale, conteggi, riservatezza, contesto**: manuale senza fonti né chiusure implicite, potenza da sola con normalizzazione `24,0` → `24.0`; conteggi in Casa, stato vuoto e «Dati confermati»; schede personali (owner non vede né apre quella del member; 422 su id non valido); 401 → login e cache M3 rimossa; bozza di decisione non trasferita a un'altra casa; fonte aperta via M2; PDF di esempio etichettati come sintetici.

Per velocità, nei test il polling usa 20 ms / 400 ms al posto di 1 s / 30 s; la logica è la stessa.

### Verifica nel browser (backend simulato su 3101, Vite su 5175)

`mock-api --seed` carica i **byte reali** dei tre PDF di esempio, riconosciuti per hash dal provider simulato. Ho provato nel browser integrato:
- Attività vuota, senza dati preinseriti;
- avvio A+B con etichetta e destinazione, job completato con 3 verifiche;
- scheda con la scelta A+B a 390 px, `keep_distinct` con nota e dati confermati con fonti a 320 px senza scroll orizzontale;
- Da rivedere a desktop, con conferma insieme di marca e modello **solo da tastiera** (Spazio, Tab, Invio), fino allo stato vuoto.

Ho corretto due cose emerse qui: fonti indistinguibili (ora c'è l'impronta) e un bordo grafico.

Durante la sessione erano attivi `127.0.0.1:3001` (PID 3952) e `127.0.0.1:5174` (PID 5692), presumibilmente di Codex. **Non li ho toccati e non ho inviato loro richieste**: le mie prove sono andate solo su 3101/5175, processi fermati a fine prova.

## Screenshot (`docs/screenshots/`, tutti con backend simulato)

- `12-mock-m3-potenza-AB-390` — decisione A+B con le due denominazioni
- `13-mock-m3-scheda-confermati-320` — potenze confermate con fonti per misura
- `14-mock-m3-da-rivedere-desktop` — gruppo per scheda e conferma insieme
- `15-mock-m3-da-rivedere-vuoto-390` — stato vuoto

Nessuna dichiarazione di conformità WCAG.

## Richieste e lacune per Codex (nessun campo/endpoint inventato)

1. **PDF di fixture corrotti nella patch**: vedi sezione dedicata sopra.
2. **Nome del documento nelle fonti**: `SourceRef` ha solo `documentId` e hash. Due fonti con lo stesso estratto (A e B) si distinguono solo per l'impronta abbreviata. Valutare un campo descrittivo facoltativo (titolo M2) o confermare che basta il link.
3. **`HistoryEvent.changes[].action`** è una stringa libera: la UI la mostra così com'è. Servono i valori ammessi (es. `accept`, `correct`, `resolve_power:keep_distinct`, `discard`, `manual`, `proposed`) per tradurli in italiano.
4. **Nome della scheda creata da un job senza destinazione**: il contratto non dice come viene nominata (il mock usa «Caldaia»). Non esiste un endpoint per rinominarla.
5. **Versione nella conferma insieme**: la UI usa `assetVersion` degli elementi di Da rivedere (il massimo nel gruppo). Confermare che gli elementi della stessa scheda riportano sempre la stessa versione.
6. **Stato delle verifiche chiuse con `proposalIdsToClose`**: non è specificato (corrected?). La UI si limita a farle sparire.
7. **Nota del modulo manuale marca/modello**: una sola nota applicata a entrambi i campi della richiesta. Confermare che va bene, oppure servono note per campo.
8. **Navigazione**: su `/review` e `/impianti/:id` nessuna voce della barra risulta attiva (Attività non è evidenziata). Scelta di UX da confermare col committente.
9. **Integrazione reale**: con gli endpoint attivi, eseguire `V5_API_URL=http://127.0.0.1:3001/api/v5 V5_REVIEW_API=1 npm run test:integration` (A+B, sconosciuto+retry, A+C), poi il collaudo UI reale a 320/390 px, desktop e tastiera.
   - Il test sul PDF sconosciuto usa un PDF troncato. Se M2 lo rifiuta in upload, il caso viene saltato: va sostituito con un PDF valido non presente nel manifest.

## Note per i documenti condivisi (le aggiorna Codex)

- **changelog**: frontend M3 Caldaia (avvio esplicito di analisi di test, job con polling limitato e retry, Da rivedere con sole aperte, decisioni per campo incluse A+B/A+C, sostituzione esplicita, manuale, storia, conteggi in Casa); solo prove mock; integrazione reale pendente.
- **decisions**:
  - PDF di esempio presi dalla cartella di Codex perché quelli della patch erano corrotti, con test di integrità;
  - polling per visita con timer di stato e stop allo smontaggio;
  - conferma insieme limitata a marca/modello con un solo candidato e senza valore confermato;
  - «Rimanda» solo in UI;
  - dopo una conferma: rimozione mirata dei `resolvedProposalIds` e rilettura;
  - impronta abbreviata nelle fonti;
  - `?analizza`/`&scheda` come punti d'ingresso da Documenti e dalla scheda.
- **backlog**: richieste 1–9; e2e browser sul backend reale; evidenziare la sezione attiva anche su `/review` e `/impianti`.
- **roadmap**: frontend M3 pronto per integrazione; M3 si chiude solo dopo API, PostgreSQL e job reali e la navigazione browser reale.

## Prossimi passi consigliati

1. Codex: correggere o rigenerare i PDF di fixture (richiesta 1), review e integrazione dei commit da `5ed1334` in poi (non `29bb4c7`), risposte alle richieste 2–8.
2. Endpoint review-v1 attivi: suite reale, poi collaudo UI reale.
3. Eventuali adeguamenti del client dalla review, in nuovi commit `frontend-v5/**`.
