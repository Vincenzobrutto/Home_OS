# HANDOFF — H1 frontend Attività e scadenze personali (activities-v1)

Autore: Claude Code. Data: 13/10/2026. Destinatario: Codex (contratto, backend, DB, integrazione, collaudo reale).
Stato: **frontend H1 pronto per l'integrazione, verificato solo con backend simulato e orologio controllato. H1 non è completata**: endpoint e schema activities-v1 non sono ancora implementati e nessuna prova API/DB/browser reale è stata eseguita.

- Nessuna chiamata Anthropic.
- Nessuna lettura o scrittura di chiavi, `.env`, ledger o configurazioni.
- `V5_ANTHROPIC_LIVE` non abilitato.

## Checkout, sincronizzazione e commit

- Percorso: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude`, branch `claude/dimora-v5-identity`.
- HEAD atteso e verificato: `34c31be62af85b6111bc4d37fe5d2c39f5aadee7`; albero tracciato pulito; `docs/v5/backend-status.md` non tracciato preservato e non incluso.
- Bundle `Dimora-V5-sync-Claude-attivita.bundle`:
  - `git bundle verify`: okay;
  - `git bundle unbundle`: oggetti importati senza cambiare branch;
  - SHA di riferimento: `9f34ca21d3e23cbfe84bf3b8f20105f094a2e9cb`.
- `git restore --source=9f34ca2 --staged --worktree`: prima i `.gitattributes` di fixture e esempi, poi **solo** questi percorsi:
  - `frontend-v5/`;
  - `docs/v5/{api,documents-api,review-api,anthropic-api,activities-api}-contract.md`, `domain-model.md`, `implementation-decisions.md`, `m4-integration-review.md`;
  - `docs/v5/fixtures/m3/`, `docs/v5/fixtures/m4/`.
  - Dopo il sync, la differenza da `9f34ca2` su quei percorsi è vuota.
- **Byte dei PDF verificati**: zero difformità.
  - M3: 3/3 in `docs/v5/fixtures/m3` e 3/3 in `public/m3-examples`, contro entrambi i manifest.
  - M4: 4/4 in `docs/v5/fixtures/m4` (`.gitattributes` `*.pdf -text -diff`).

Commit, in ordine (locali, nessun push):

| Commit | Contenuto | Azione per Codex |
|---|---|---|
| `c29fcaa` chore(v5): sync M4 consolidated and H1 activities contract | Copia della baseline `9f34ca2` sui percorsi autorizzati | **Escludere / non riapplicare** |
| `9370037` feat(frontend-v5): client activities-v1 e cache H1 | Tipi, 10 metodi client, chiavi cache, regole su date e testi, hook | Integrare |
| `b3ddd65` test(frontend-v5): backend simulato activities-v1 | `src/test/fakeActivities.ts` collegato a `FakeBackend` | Integrare |
| `912503e` feat(frontend-v5): attività personali e scadenze H1 | Casa, sezione «Da fare», dettaglio, modulo, dialogo, promemoria da caldaia, rotta | Integrare |
| `590d46c` test(frontend-v5): casi H1 con backend simulato e orologio controllato | 25 test; correzione del ritorno del focus; `seedBoiler` nel mock | Integrare |
| `c426783` test(frontend-v5): integrazione reale activities-v1 con flag | Suite reale saltata di default; seed mock con 3 attività | Integrare |
| `8afb52c` fix(frontend-v5): «Nessuna data scelta» | Dicitura doppia emersa a 390 px | Integrare |
| commit successivo docs(frontend-v5) | Questo HANDOFF, README, screenshot | Integrare. SHA: `git log -1 -- frontend-v5/HANDOFF.md` |

Correzioni M4 di Codex conservate (capabilities client, storia AI, zero USD, motivi in italiano, consenso). Nessun file M3/M4 modificato, salvo l'aggiunta del link al promemoria nella scheda caldaia e del riquadro nella Casa.

## Cosa è stato fatto

1. **Client** (`src/api/client.ts`): i dieci endpoint H1 passano dal percorso comune `send`: cookie, CSRF, `X-Account-Context` catturato, Idempotency-Key, `no-store`, errori comuni.
   - Solo GET e POST (`updates`/`complete`/`cancel`/`reopen`); nessun PATCH o DELETE.
   - Risposte fuori forma → errore di servizio.
2. **Cache**:
   - chiavi `['account', id, 'home', id, 'h1', …]` per capabilities, liste per filtri (`state`/`due`/`assetId`), dettaglio, storia e riepilogo, separate da M3/M4;
   - letture temporali con `staleTime 0` e rilettura **sempre** al ritorno sulla finestra;
   - dopo ogni successo o replay: dettaglio dalla risposta, poi invalidazione di tutto il prefisso H1 (liste, riepilogo, storia);
   - 401, logout e cambio account rimuovono la cache H1 (verificato); risposte tardive non scrivono se l'account è cambiato.
3. **Casa — «Le tue scadenze»**: conteggi (scadute, oggi, in programma, senza data) e fino a 3 `nextItems` **dal server**.
   - Vuoto: «Nessuna scadenza nei prossimi 7 giorni», più «N attività senza data» con link.
   - Errore e endpoint assente distinti dal vuoto, mai mostrati come zero.
   - Link «Tutte le attività» e «Nuova attività» (solo con `edit`).
   - Il riquadro M3 «Impianti e verifiche» resta funzionante anche con H1 in errore (testato).
4. **Attività — «Da fare»**: in testa alla pagina; «Nuova attività» distinta da «Nuova analisi».
   - Filtro Stato (Aperte, Completate, Annullate, Tutte) e Scadenza (solo per le aperte, come da contratto).
   - «Nessuna attività aperta» è diverso da «Nessuna attività corrisponde a questo filtro».
   - Paginazione «Mostra altre attività»; riquadri M3/M4 invariati.
5. **Creazione e modifica**:
   - campi: titolo, descrizione facoltativa, data facoltativa («Data scelta da te», campo data con «Togli la data»), caldaia facoltativa;
   - destinazione sempre visibile («promemoria personale in <Casa>, collegato a «…»»);
   - testo esplicito: non è un obbligo né una scadenza di legge e non cambia i dati della caldaia; nessuna categoria, ricorrenza o notifica.
   - **Creazione**: body con i soli campi valorizzati.
   - **Modifica**: si inviano solo i campi cambiati. `assetId` **omesso** se il collegamento non è toccato, `null` solo con «Rimuovi il collegamento», ID per una nuova scelta. Un collegamento `unavailable` resta tale («Mantieni il collegamento attuale») senza rivelare nome o ID.
   - Nessun campo cambiato → «Nessuna modifica da salvare», nessuna richiesta.
6. **Date**: valori `YYYY-MM-DD` dal campo data, inviati così come sono. Formattazione con data costruita e letta in UTC: nessuno spostamento di giorno (29/02, 31/12, cambio ora legale). Lo stato temporale (`dueState`) e la data di oggi (`today`, Europe/Rome) vengono sempre dal server, mai dall'orologio del dispositivo.
7. **Dettaglio** `/home/:homeId/attivita/:activityId`:
   - mostra stato, badge temporale, data scelta da te, oggi, descrizione, collegamento alla caldaia (link se `linked`, testo italiano se `unavailable`), date di creazione, completamento o annullamento;
   - le azioni seguono permessi e stato: «Completa» (pannello rapido con nota facoltativa), «Modifica», «Annulla attività» (dialogo con nota, **Escape** e ritorno del focus al pulsante d'origine, testo «non viene eliminata»), «Riapri attività»;
   - storia separata dalla storia tecnica della caldaia, con prima/dopo per campo e note;
   - 403 e 422 senza contenuti;
   - tutto il testo dell'utente è reso come testo React (testato con HTML in titolo e descrizione).
8. **Dalla scheda caldaia**: riquadro «Promemoria personale» con «Crea promemoria per questa caldaia» → `attivita?nuova-attivita=1&assetId=…`, anche per schede provvisorie. Parametri `analizza` e `scheda` M4 invariati.
   - Un `assetId` dall'URL che non è tra le proprie schede non viene collegato e lo si dice.
9. **Mutazioni pessimistiche** (`useActivityOperation`):
   - doppio invio impedito;
   - esito ambiguo: campi bloccati, «Riprova invio» con **stessa chiave e stesso payload**;
   - esito definitivo: nuova chiave;
   - 409 (versione, stato, idempotenza): messaggio e «Rileggi i dati», poi i dati del server sostituiscono la bozza;
   - nessun retry automatico e nessun completamento locale in caso di rete assente o 503.
10. **Bozze e ruoli**: bozze solo in memoria, azzerate al cambio casa o account. Viewer in sola consultazione (nessuna creazione né azione). H1 assente (404) o in errore (503) riguarda solo le sezioni H1.

## API usate (activities-v1, nessun campo o endpoint inventato)

GET `activity-capabilities` · GET `activities?state&due[&assetId]&limit&cursor` · POST `activities` · GET `activities/:id` · POST `activities/:id/updates|complete|cancel|reopen` · GET `activities/:id/history` · GET `activity-summary` (tutti sotto `/homes/:homeId`). Il filtro `assetId` è supportato dal client ma non ancora usato dall'interfaccia.

## Prove realmente eseguite (Node 24.20.0, in `frontend-v5/`)

| Comando | Esito |
|---|---|
| `npx tsc -b` / `npx eslint .` | OK |
| `npx vitest run` | **151 superati**, 19 saltati (integrazioni reali con flag). Ripetuto più volte, stabile |
| `npx vite build` | OK; il bundle non contiene il backend simulato |
| `V5_ACTIVITIES_API=1` contro **mock su 3101** | 3/3: verifica solo il codice dei test, **non è integrazione reale** |

- **Composizione dei 151**: 126 regressioni M1–M4 (baseline) + 3 unitari H1 + 22 UI H1. Nessun test M1–M4 è stato modificato.
- **Unitari** (`src/lib/activities.test.ts`): date bisestili e invalide, limiti 0001/9999, formattazione senza spostamento, titolo con code point/NFC, descrizione vuota → `null`, nota da 500.
- **UI** (`src/routes/activities.test.tsx`, orologio controllato dal mock e mai `Date.now` del test):
  - Casa vuota; errore ed endpoint assente non mostrati come zero, con M3 funzionante;
  - creazione senza data con body minimo e storia; data 2028-02-29; promemoria da caldaia provvisoria senza effetti sulla scheda; caldaia non propria nell'URL;
  - doppio clic e replay con stessa chiave e payload, un solo evento; 409 con rilettura; 503 senza completamento apparente;
  - ieri/oggi/+7/+8/senza data con confine +7 incluso e ordine; filtri e vuoti distinti; completa e riapri con data passata di nuovo scaduta e storia;
  - dialogo con Escape e ritorno del focus; rilettura al focus (nuovo giorno);
  - modifica con `assetId` omesso o `null`; collegamento non leggibile senza nome né ID; escaping;
  - attività di altro account (403) e owner che non vede il member; viewer; cursore su 25 senza duplicati; cambio casa e account; nessuna mutazione AI o caldaia.
- **Integrazione reale** (`tests/integration/activities.int.test.ts`, solo `V5_API_URL` + `V5_ACTIVITIES_API=1`, da eseguire dopo l'attivazione di H1): capabilities e riepilogo vuoto; replay e conflitto di idempotenza; modifica, completa e riapri con versioni e storia; 409 di versione; 2028-02-29 valida e 2026-02-29 rifiutata; privacy tra account; 422. Nessun return anticipato.

**Browser (mock su 3101 con `--seed`, Vite su 5175)**:
- Casa a 390 px con conteggi e anteprima;
- dettaglio a 320 px senza scroll orizzontale;
- dialogo di annullamento **da tastiera** (Invio apre con focus sulla nota, Escape chiude e riporta il focus su «Annulla attività»);
- completamento da tastiera con nota e storia aggiornata;
- «Da fare» a 390 px.

I processi di Codex su 3001, 5174 e 55432 (e 5173) non sono stati interrogati né fermati; i miei su 3101 e 5175 sono stati fermati.

## Screenshot (`docs/screenshots/`, backend simulato)

- `18-mock-h1-casa-scadenze-390`: Le tue scadenze.
- `19-mock-h1-dialogo-annulla-320`: dialogo «Annulla attività».
- `20-mock-h1-da-fare-390`: sezione «Da fare» con filtri, prima della correzione «Nessuna data scelta».

Nessuna dichiarazione di conformità WCAG.

## Domande contrattuali e lacune per Codex (nessun campo/endpoint inventato)

1. **Passaggio della mezzanotte senza focus**: la UI rilegge lo stato temporale al focus e a ogni navigazione, ma non con un timer. Una pagina lasciata aperta oltre la mezzanotte senza interazioni mostra il `dueState` del giorno prima finché non torna il focus. Va bene così, o serve una rilettura periodica?
2. **Codice e forma del 404/503 H1**: la UI si aspetta una busta d'errore JSON per le rotte H1 assenti (404) e `activity_unavailable` per il 503; un 503 senza busta diventa l'errore di servizio generico.
3. **Descrizione svuotata in modifica**: la UI invia `description:null` quando il testo viene cancellato (coerente con «vuota → null»). Confermare che `''` e `null` sono equivalenti lato server.
4. **Storia con collegamento redatto**: la UI mostra «Caldaia collegata non più disponibile» sia nel prima sia nel dopo; un evento di sola redazione non dovrebbe esistere. Confermare.
5. **`asOf`**: ricevuto ma non mostrato; la UI usa `today`. Indicare se va esposto.
6. **Viewer**: la UI richiede `edit` sia su `Home.permissions` sia su `activity.permissions`. Confermare che `activity.permissions` non concederà mai `edit` a un viewer.
7. **Filtro per caldaia**: il client supporta `assetId`, ma la scheda caldaia non elenca ancora i propri promemoria. È un incremento futuro?
8. **Errore di formato data dal server**: la UI usa i `fieldErrors.dueDate` del server se presenti. Con `<input type="date">` i browser non inviano date impossibili, ma il controllo resta anche lato client.

## Limiti

- Solo prove mock; H1 si chiude dopo backend, API, DB e browser reali di Codex.
- Il dialogo gestisce Escape e ritorno del focus ma non intrappola il Tab al suo interno (l'overlay copre la pagina). Completa e riapri sono pannelli in pagina, non dialoghi.
- Gli screenshot desktop restano limitati dal pannello del browser integrato.

## Note per i documenti condivisi (le aggiorna Codex)

- **changelog**: frontend H1 (Le tue scadenze in Casa, Da fare in Attività, dettaglio con completa/annulla/riapri e storia, promemoria dalla caldaia); solo prove mock.
- **decisions**:
  - date formattate in UTC per non spostare il giorno;
  - `dueState` e `today` solo dal server, con rilettura al focus;
  - modifica che invia solo i campi cambiati e `assetId` omesso se non toccato;
  - operazione idempotente con riprova esplicita;
  - annullamento in dialogo, completamento rapido in pagina;
  - «Da fare» in testa ad Attività.
- **backlog**: domande 1–8; trap del focus nel dialogo; elenco dei promemoria nella scheda caldaia; e2e browser reale H1.
- **roadmap**: frontend H1 pronto per integrazione; H1 si chiude dopo integrazione e verifica reale di Codex.

## Prossimi passi consigliati

1. Codex: backend H1, poi integrazione dei commit da `9370037` in poi (escludere `c29fcaa`); risposte alle domande 1–8.
2. `V5_API_URL=http://127.0.0.1:3001/api/v5 V5_ACTIVITIES_API=1 npm run test:integration`, poi collaudo browser reale (crea → modifica → completa → storia → riapri) a 320/390 px, desktop e tastiera.
3. Adeguamenti dalla review in nuovi commit `frontend-v5/**`.

## Integrazione Codex conclusa — 14 ottobre 2026
I sette commit H1 sono integrati nel branch dev/dimora-v5-local-20261013, escluso il sync c29fcaa. Backend e migrazione sono attivi su 3001/DB dedicato; le prove qui dichiarate mock sono state integrate con 15 client/API reali e navigazione reale 320/390/desktop, tastiera, reload/logout/login. Focus trap aggiunto, chiusura di dialogo/moduli bloccata se invio pendente o esito ambiguo; nuova regressione conserva chiave/payload e una sola storia. 152 test mock/fixture, build/lint passano.
Le domande 1–8 sono risolte in docs/v5/h1-integration-review.md. Il runner ordinario test:integration ora divide le suite con pause auth di 61 secondi e disabilita V5_ANTHROPIC_LIVE; per nuove prove a pagamento servono un incarico esplicito e invocazione diretta di Vitest, mantenendo il ledger/cap. H1 chiusa in locale; ricorrenze, allegati, notifiche, condivisione e lista promemoria nella caldaia restano successivi.
