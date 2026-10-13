# HANDOFF — V5-DEV-005 Documenti M2 (frontend)

Autore: Claude Code. Data: 13/10/2026. Destinatario: Codex (review, integrazione, test end-to-end).
Stato: **frontend Documenti pronto per l'integrazione, verificato solo con backend simulato. M2 non è completata**: gli endpoint documents-v1 reali non erano disponibili e nessuna prova reale è stata eseguita.

## Checkout e commit

- Percorso effettivo: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude` (nessun worktree aggiuntivo).
- Branch: `claude/dimora-v5-identity`. Base verificata: `8dfc9673baa9501e7a2357e39286942000931ddb`, albero pulito salvo `docs/v5/backend-status.md` non tracciato (nota di Codex, non toccata né inclusa).
- Commit, in ordine, tutti locali e non pushati:

| Commit | Contenuto | Azione per Codex |
|---|---|---|
| `577d56c` chore(v5): sync Codex M1 review and M2 contract | Patch `Dimora-V5-sync-Claude-M1-M2.patch` applicata così com'è (`git apply --check` pulito), solo i 12 file della patch | **Non riapplicare**: riproduce correzioni già tue |
| `8bf099e` feat(frontend-v5): client documents-v1 con multipart e risposte binarie | Tipi, client, errori, chiavi cache, regole file, backend simulato, test client | Integrare |
| `d034c3a` feat(frontend-v5): sezione Documenti M2 | Pagine, rotte, navigazione, hook, test UI | Integrare |
| `a9e7685` chore(frontend-v5): backend simulato su 3101 | `mock-api` mai su 3001; `DIMORA_API_TARGET` solo per l'harness | Integrare |
| `8e7ad78` fix(frontend-v5): Documenti su schermi stretti | CSS emerso nella verifica a 320/390 px | Integrare |
| `bd49ea5` test(frontend-v5): integrazione reale documents-v1 | Suite reale (saltata di default), PDF sintetico valido | Integrare |
| commit successivo docs(frontend-v5) | Questo HANDOFF, README, screenshot | Integrare. Lo SHA non può stare nel file: `git log -1 -- frontend-v5/HANDOFF.md` |

Dopo il sync ho scritto solo in `frontend-v5/**`. Nessun push, nessun merge, nessuna modifica a backend, contratti, schema, legacy o main.

## Cosa è stato fatto

- **Navigazione**: Documenti attiva (nav laterale e inferiore, link dalla pagina Casa). Attività e Spese restano «Non ancora disponibile». Testi della pagina Casa aggiornati di conseguenza.
- **Rotte**: `/home/:homeId/documenti` e `/home/:homeId/documenti/:documentId`, dentro il contesto casa già verificato con `GET /homes/:homeId`.
- **Archivio**: elenco paginato (`limit=20`, cursore opaco, «Mostra altri documenti»). Ogni voce mostra titolo, nome file, formato, dimensione, data, «Originale caricato», visibilità («Solo io» / «Persone della casa») e fonte «Caricamento manuale». Stati di caricamento, vuoto e errore con «Riprova».
  - Un 404 (backend senza endpoint documentali) diventa «L’archivio documenti non è ancora attivo su questo servizio», un 503 `storage_unavailable` un messaggio dedicato. Mai un archivio vuoto o finto.
- **Caricamento** (solo con permesso Home `edit`):
  - Pannello con file (PDF/JPEG/PNG, un file, 20 MiB), titolo proposto dal nome file con l'estensione (1–160 code point), visibilità «Solo io» predefinita e «Persone della casa» come scelta esplicita col testo del contratto. Mostra la casa di destinazione.
  - Controlli locali: file mancante, vuoto, troppo grande, formato non ammesso. Il server resta l'autorità sui byte.
  - Invio multipart con CSRF, `X-Account-Context` e `Idempotency-Key` (UUID); il boundary lo imposta il browser. Doppio invio impedito.
  - **Esito ambiguo** (rete/servizio): campi bloccati, «Riprova invio» con stessa chiave e stesso file. «Modifica e invia come nuovo» avvia una nuova operazione esplicita.
  - 409 `idempotency_conflict`: banner esplicito, nuova richiesta con nuova chiave. 413/415/422: errori sul campo; il prossimo invio usa una nuova chiave.
  - Successo solo dopo il 201: aggiorna dettaglio in cache, invalida l'elenco, mostra un banner con il link al documento.
  - File e bozza solo in memoria: azzerati alla chiusura, al cambio casa/account e al logout. Nessuna condivisione automatica.
- **Dettaglio**: titolo, tag, nome file, formato, dimensione, data, versione 1, fonte, visibilità con spiegazione, stato «Originale caricato», SHA-256. Nota esplicita: caricare o scaricare non conferma né certifica nulla.
  - Anteprima dai soli byte autorizzati (fetch autenticato con contesto → Blob → URL locale): `<img>` per JPEG/PNG, `<object>` per PDF con testo di ripiego.
  - «Scarica originale» sempre visibile; riusa i byte dell'anteprima se già presenti. Nome sicuro da `Content-Disposition`, con ripiego su `originalFilename` ripulito.
  - 403 → «Documento non disponibile» senza metadati; 422 → «Indirizzo non valido».
- **Export ZIP** (solo con permesso Home `export`; la casella è disattivata se `doc.permissions` non include `export`):
  - Selezione con contatore e peso. Limiti 1–50 documenti e 100 MiB dichiarati come «limite tecnico di questa versione»; pulsante disattivato con motivo se superati.
  - Export solo al clic, mai al montaggio. Errori JSON gestiti prima del Blob. 403 → «Nessun file è stato esportato», nessun salvataggio parziale.
- **Viewer**: consulta e scarica, nessun caricamento né ZIP. Le azioni seguono `Home.permissions` e `DocumentSummary.permissions`, mai il solo ruolo.
- **Client**: JSON, multipart e binari passano dallo stesso metodo `send`: header, contesto, errori e 401 sono comuni. Nessun fetch parallelo.
  - I byte dei file sono query TanStack (`gcTime 0`): un 401 annulla le richieste e pulisce anche loro.
  - Chiavi: `[account, accountId, home, homeId, documents, list]`, `[…, documents, documentId, detail]`, `[…, documents, documentId, file]`.
- **URL Blob**: creati e revocati dentro un effetto, quindi revocati allo smontaggio, al cambio documento, casa o account e al logout. Verificato nei test e nel browser.
- **Conservato da M1/sync**: `X-Account-Context` catturato, sessione riletta sempre al focus, controllo account prima di scrivere in cache dopo una mutazione, logout, idempotenza case.

## API utilizzate (documents-v1, nessun campo o endpoint inventato)

`GET /homes/:homeId/documents?limit&cursor` · `POST /homes/:homeId/documents` (multipart `file`, `name`, `visibility` + `Idempotency-Key`) · `GET /homes/:homeId/documents/:documentId` · `GET /homes/:homeId/documents/:documentId/file` · `POST /homes/:homeId/documents/export` (`{documentIds}`). Codici gestiti: `file_too_large`, `unsupported_file_type`, `validation_error`, `export_too_large`, `storage_unavailable`, `idempotency_conflict`, `csrf_invalid`, `account_context_changed`.

## Prove realmente eseguite (in `frontend-v5/`, Node 24.20.0)

| Comando | Esito |
|---|---|
| `npx tsc -b` | OK |
| `npx eslint .` | OK |
| `npx vitest run` | **80 superati** (8 file), 6 saltati (integrazione). Ripetuto 3 volte, stabile |
| `npx vite build` | OK (JS 408 kB, gzip 128 kB); backend simulato assente dal bundle (ricerca nel `dist`) |
| `npm audit` | 0 vulnerabilità |
| Suite di integrazione contro **backend simulato** su 3101 | 6/6: verifica solo il codice dei test, **non è integrazione reale** |

### Test con backend simulato (mock)

- **Regressione M1**: 47 test (accesso, routing, isolamento cache, creazione casa, client identity, contesto account). Ho aggiornato un'asserzione: Documenti ora è attiva, e il test verifica Attività/Spese non disponibili.
- **`src/api/documentsClient.test.ts`** (11): multipart senza Content-Type del client e con tutti gli header; lista con `limit`/`cursor`; Blob con byte identici e nome da Content-Disposition; errore JSON prima del Blob; JSON 200 su endpoint binario = errore; ZIP con firma `PK`; export con un documento vietato → 403; `storage_unavailable`; idempotenza (stesso id, poi 409); nomi file con traversal; limiti export.
- **`src/routes/documents.test.tsx`** (22):
  - nav attiva; archivio vuoto; campi di elenco; paginazione;
  - backend senza endpoint e storage giù senza fallback; privato altrui assente anche per l'owner;
  - default «Solo io» e casa di destinazione; scelta esplicita «Persone della casa»; file mancante/vuoto/troppo grande/formato; 415 dal server; doppio clic = un invio; esito ambiguo con stessa chiave e stesso file; conflitto 409 con nuova chiave; member senza ZIP; viewer senza caricamento né ZIP;
  - dettaglio con metadati e SHA-256 e senza «Validato/Confermato/Certificato»; anteprima PDF e immagine; download riusando i byte; revoca URL Blob; 403/422 senza metadati; viewer scarica; ZIP esplicito con id corretti; 403 export senza file;
  - 401 → login e cache documenti rimossa; logout dal dettaglio con URL revocati e bozza non trasferita; cambio casa senza bozza.

### Verifica nel browser (backend simulato, non reale)

Backend simulato `npm run mock-api -- --seed` su **3101**, Vite su **5175** con `DIMORA_API_TARGET`. Nel browser integrato ho provato:
- a 320 e 390 px, senza scroll orizzontale: elenco, pannello di caricamento, caricamento multipart reale dal browser via proxy, banner di esito, dettaglio con anteprima immagine;
- a desktop: anteprima PDF e selezione con export ZIP (file `documenti.zip`).

Il focus va sul titolo del pannello all'apertura e sull'h1 dopo ogni navigazione. Nessuna dichiarazione di conformità WCAG.

**Nota sui processi trovati attivi**: durante la verifica erano in ascolto `127.0.0.1:3001` (PID 8268, `node --env-file=.env dist/main.js`, presumibilmente backend V5 di Codex) e `127.0.0.1:5174` (PID 25924, Vite non avviato da me). Non li ho toccati né fermati. Il mio Vite su 5174 si è fermato per `strictPort`. Prima di accorgermene ho fatto **una sola `GET /api/v5/session` anonima** attraverso quel Vite verso il backend reale: nessun login, nessuna scrittura. Non ho eseguito prove sul backend reale.

## Screenshot (`docs/screenshots/`)

01–05 da M1 (01 modalità reale con backend spento, gli altri mock). Nuovi, **tutti con backend simulato**: `06-mock-documenti-elenco-390`, `07-mock-documenti-caricamento-320`, `08-mock-documenti-caricato-320`, `09-mock-documento-immagine-320`, `10-mock-documento-pdf-desktop` (la cattura non include il contenuto del visore PDF del browser), `11-mock-documenti-zip-desktop`.

## Richieste e lacune per Codex (nessun campo/endpoint inventato)

1. **Fonte «Caricato da te»**: il contratto la ammette «solo se il backend lo identifica», ma `DocumentSummary` non ha un campo per farlo. La UI mostra sempre «Caricamento manuale». Se serve, aggiungere un campo (es. booleano «caricato dall'account richiedente»).
2. **Permesso di caricamento**: dedotto da `Home.permissions` che include `edit`, perché `DocumentSummary.permissions` contiene solo `read`/`export`. Confermare.
3. **404 su rotte documentali assenti**: con un backend solo M1 la UI si aspetta un 404 con busta d'errore JSON. Se arrivasse non-JSON mostrerebbe l'errore di servizio generico (corretto ma meno preciso).
4. **Nome dello ZIP**: la UI usa il nome da `Content-Disposition`, con ripiego su «Documenti <nome casa>.zip». Indicare se il server ne fornisce sempre uno.
5. **Unità mostrate**: «20 MB» e «100 MB» sono MiB (1024²); i testi lo esplicitano nei messaggi di errore. Confermare la dicitura per il committente.
6. **Memoria browser**: anteprima, download e ZIP (fino a 100 MiB) vivono come Blob in memoria, come chiede il contratto. Su dispositivi modesti uno ZIP grande può pesare; va valutato prima del pilota.
7. **PDF su mobile**: molti browser mobili non mostrano PDF in `<object>` e non sempre attivano il testo di ripiego. «Scarica originale» resta sempre visibile sotto l'anteprima.
8. **`account_context_changed` durante un upload**: porta al login come ogni 401. File e bozza vanno persi, per scelta: niente bozze private persistenti.
9. **Integrazione reale**: quando gli endpoint esistono, eseguire `V5_API_URL=http://127.0.0.1:3001/api/v5 V5_DOCUMENTS_API=1 npm run test:integration`. Copre upload, idempotenza, elenco, dettaglio, byte e SHA-256 identici, ZIP, 415/422/413 e isolamento tra account. Restano da provare con dati reali: visibilità private/home tra membri e revoca, perché nessuna API consente di invitare membri in identity-v1.1.

## Note per i documenti condivisi (le aggiorna Codex)

- **changelog**: frontend Documenti M2 (archivio paginato, caricamento con visibilità e idempotenza, dettaglio con anteprima/download autenticati, ZIP guidato dai permessi); solo prove mock, integrazione reale pendente.
- **decisions**:
  - un unico percorso client per JSON/multipart/binari;
  - byte dei file come query con `gcTime 0`, così il 401 li pulisce;
  - URL Blob gestiti da effetto;
  - chiave idempotente per operazione, campi bloccati dopo un esito ambiguo, nuova chiave dopo un rifiuto definitivo;
  - icona decorativa nascosta sotto 480 px;
  - backend simulato su 3101 con `DIMORA_API_TARGET` solo per l'harness.
- **backlog**: richieste 1–9; e2e browser sul backend reale; valutazione memoria ZIP e PDF su mobile.
- **roadmap**: V5-DEV-005 frontend pronto per integrazione; M2 si chiude solo dopo API, PostgreSQL e storage reali e il collaudo UI reale.

## Limiti

- Nessuna prova sul backend reale: M2 **non** è completata.
- Le prove nel browser usano il backend simulato. Il visore PDF del browser integrato non compare negli screenshot.
- Nessuna funzione AI, «Da rivedere», conferma, sostituzione, cestino o condivisione: fuori ambito M2, nessuna appare operativa.

## Prossimi passi consigliati

1. Codex: review e integrazione dei commit da `8bf099e` in poi (non `577d56c`), risposte alle richieste 1–9.
2. Con gli endpoint documents-v1 attivi: suite di integrazione reale, poi collaudo UI reale a 320/390 px e desktop, incluse le interruzioni.
3. Eventuali adeguamenti del client richiesti dalla review in nuovi commit `frontend-v5/**`.
