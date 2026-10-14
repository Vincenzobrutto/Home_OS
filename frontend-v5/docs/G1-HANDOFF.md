# HANDOFF — G1 frontend ambienti, oggetti e collegamenti (home-objects-v1)

> Aggiornamento Codex14ottobre: consegna integrata e collaudata su backend/DB/client/browser reali. Stato definitivo e risposte alle richieste in docs/v5/g1-integration-review.md. Le note seguenti sono il handoff originale di Claude nella fase mock e non descrivono lo stato finale.

Autore: Claude Code. Data: 14/10/2026. Destinatario: Codex (contratto, backend, DB, integrazione, collaudo reale).

**Stato: frontend G1 pronto per l'integrazione, verificato solo con backend simulato. G1 non è completata.** Il backend home-objects-v1 non è attivo e non ho eseguito nessuna prova API, DB o browser reale. Nessuna chiamata Anthropic, nessuna nuova dipendenza, nessuna lettura di `.env` o chiavi.

## Checkout, sincronizzazione e commit

- **Checkout**: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude`, branch `claude/dimora-v5-identity`.
  - HEAD atteso e verificato: `27514fa8a0187c4a01e00854534419a8e8f00c4e`.
  - Albero tracciato pulito.
- **Bundle** `Dimora-V5-sync-Claude-G1.bundle`: `verify` ok, `unbundle` senza cambio di branch, SHA `0b12d8a8312b0bd9e0367b3c84aa7b1b10084103`.
- **Ripristino** `git restore --source=0b12d8a --staged --worktree -- frontend-v5/ docs/v5/ ':!docs/v5/backend-status.md'`.
  - Dopo il ripristino, la differenza con lo SHA su quei percorsi è vuota.
  - PDF: 10/10 coincidono con i manifest, attributi binari intatti.
  - La mia revisione UX (`docs/ECONOMIA-G1-UX-REVIEW-20261014.md`) è conservata.
- **Divergenza segnalata**: nello SHA `docs/v5/backend-status.md` è tracciato, mentre nel mio checkout è un file locale non tracciato da preservare, con contenuto diverso. L'ho **escluso** dal ripristino e lasciato com'è. Codex decida se allinearlo nel master.

| Commit | Contenuto | Azione per Codex |
|---|---|---|
| `26525c0` chore(v5): sync H3 consolidated and G1 home-objects contract | Copia della baseline `0b12d8a` (senza `backend-status.md`) | **Escludere / non riapplicare** |
| `faffbca` feat: client, chiavi cache e hook home-objects-v1 | Tipi, 15 metodi client, chiavi `g1`, `lib/objects.ts`, hook | Integrare |
| `d308d69` test: backend simulato home-objects-v1 | `src/test/fakeObjects.ts` collegato a `FakeBackend` | Integrare |
| `4ebdf14` feat: ambienti, oggetti e collegamenti G1 | Pagine, Casa, shell, collegamenti, due fasi; prop `forObject` in `ActivityForm`/`ExpenseForm` | Integrare |
| `00ac9b3` test: casi G1 | 19 UI + 3 unitari/client | Integrare |
| `b45bd6d` test: integrazione reale, quinto gruppo, seed mock | `tests/integration/home-objects.int.test.ts`, runner, `mock-api` | Integrare |
| `31f1be3` fix: focus ed etichetta tipo | Emersi nel browser mock | Integrare |
| `824daf0` fix: righe ambiente | Tipo solo se diverso dal nome, più la nota | Integrare |
| commit successivo docs(frontend-v5) | Questo HANDOFF e screenshot | Integrare. SHA: `git log -1 -- frontend-v5/docs/G1-HANDOFF.md` |

## Cosa è stato fatto

### 1. Client e cache

- **Trasporto comune** (`send`: cookie, CSRF, `X-Account-Context`, `no-store`, AbortSignal, `Idempotency-Key` su ogni POST). Metodi:
  - `getObjectCapabilities`;
  - `listRooms`, `getRoom`, `createRoom`, `roomMutation` (`updates`/`archive`/`restore`), `listRoomHistory`;
  - `listObjects`, `getObject`, `createObject`, `objectMutation` (`updates`/`archive`/`restore`/`position`), `listObjectHistory`;
  - `listObjectLinks`, `createObjectLink`, `removeObjectLink`.
  - Risposte fuori forma → errore di servizio.
- **Chiavi della cache**: `['account', id, 'home', homeId, 'g1', …]`. Dopo ogni successo o replay il dettaglio viene dalla risposta e si rilegge il prefisso `g1`; nessuna scrittura se l'account è cambiato.
- **403** su capabilities, lista o catalogo: rimuove le query `g1` non osservate e rilegge la casa (poi interviene la pulizia di Codex sul 403 della casa).
- **Capabilities obbligatorie** prima di mostrare azioni e liste: 404 → «Ambienti e oggetti non ancora attivi», nessuna azione; 503 o errore → errore con «Riprova». Nessun elenco vuoto o successo finto.

### 2. Casa e navigazione

- **Card «Ambienti e oggetti»**: prima pagina degli ambienti condivisi (al massimo 6), link «Ambienti», «Oggetti e impianti», «Da collocare». Nessun conteggio di oggetti, privati o meno.
- **Rotte**: `/home/:id/ambienti`, `/ambienti/:roomId`, `/oggetti`, `/oggetti/:kind/:objectId`.
  - Nella shell resta evidenziata «Casa».
  - Un `kind` diverso da `object`/`boiler` mostra «Indirizzo non valido» senza richiesta.
  - UUID e parametri non concedono diritti: decide il server.

### 3. Ambienti

- Creazione e modifica di nome, tipo (etichette italiane) e nota; archiviazione e ripristino in dialogo con CAS; storia.
- Due «Bagno» con lo stesso nome e tipo sono ammessi (testato). Nessuna stanza creata al caricamento (testato).
- Nelle righe il tipo compare solo se diverso dal nome, più la nota, così due «Bagno» si distinguono.
- Il viewer consulta soltanto.

### 4. Oggetti

- Oggetto manuale con nome, tipo e nota, e posizione facoltativa fino a 20 ambienti nello **stesso POST** di creazione (nessun POST di posizione separato).
- Senza ambienti l'oggetto è «Da collocare»: nessuna stanza fittizia. Un impianto su più ambienti è una sola riga, con «anche in altri N ambienti» nella vista dell'ambiente.
- **Posizione con CAS**: versione 0 alla prima impostazione, poi la versione corrente; 409 → «Rileggi i dati».
  - Gli ambienti archiviati già assegnati restano etichettati «(ambiente archiviato)» e si possono togliere.
  - Per le nuove assegnazioni vengono proposti solo ambienti attivi, con tutte le pagine caricabili.
- **Catalogo**:
  - ricerca per nome con invio esplicito («Cerca», nessuna richiesta a ogni tasto, massimo 80 code point);
  - filtri Dove (Tutti / Da collocare / ambiente: un solo selettore, quindi la combinazione incompatibile non si può creare), Tipo (compreso «Caldaia») e Stato;
  - paginazione dal server, filtri nell'URL, ritorno dal dettaglio legato all'account (`objectsAccountId`).
- **Caldaia**: una sola riga con la stessa ID, `kind: boiler`.
  - «Apri la scheda tecnica» porta a `/impianti/:assetId`.
  - Nessuna modifica dell'identità né archiviazione G1; la posizione si può cambiare.
  - Proposte e conferme M3 non vengono copiate (versione della scheda invariata nei test).

### 5. Collegamenti (scheda oggetto: «Documenti collegati», «I tuoi costi», «Le tue attività»)

- **Lettura**: `GET links` per `resourceType`, paginato; le risorse aprono le pagine originali H2/H3a/H1.
- **Collegamenti nativi**: mostrano l'origine («Collegamento della scheda caldaia: si gestisce dalla risorsa originale») e non sono rimovibili.
- **Riferimenti**: rimovibili con CAS in un dialogo.
- **Risorsa `unavailable`**: «… non più disponibile per il tuo account», senza titolo né ID.
- **Selettori**:
  - documenti con la ricerca H2 sul server; se H2 non è attiva, l'elenco M2 paginato;
  - costi e attività propri, paginati, senza quelli legati a una caldaia nativa;
  - nessun contatore e nessun totale per oggetto.
- **Due fasi** per un oggetto manuale («Registra un costo per questo oggetto» / «Crea promemoria per questo oggetto»):
  1. creazione con H3a/H1 **senza `assetId`** (il selettore caldaia è nascosto e la destinazione dice «per l'oggetto «…»»);
  2. poi `POST links`.
  - Se il collegamento fallisce: «Registrato, collegamento da completare», link alla risorsa, «Completa il collegamento» con la stessa chiave se l'esito è ambiguo; «Chiudi» bloccato finché la riprova serve. Il costo non viene mai ricreato (testato: un solo POST di spesa, due POST di link con la stessa chiave).
- **Caldaia**: «Registra un costo» e «Crea promemoria» usano i flussi nativi H3a/H1 con `assetId`.

### 6. Operazioni

- Pessimistiche come H1/H3a: doppio clic → un invio; risposta persa → campi e «Annulla» bloccati, «Riprova invio» con la stessa chiave e lo stesso payload; nessun retry automatico; no-op locale «Nessuna modifica da salvare».
- Cambio account o casa azzera le bozze (testato).

### 7. Focus e tastiera

- Il modulo aperto riceve il focus sul suo titolo.
- Dopo una nuova versione (modifica, archivia, ripristina, posizione) il focus va alla prima azione: la vista ha come chiave la versione e il form è smontato.
- Dopo collega/registra/rimuovi il focus va al titolo della sezione.
- Dialoghi con focus trap ed Escape (dialogo H1), con il focus restituito al pulsante d'origine quando si annulla.

### 8. Backend simulato (solo harness)

`FakeObjects` copre:
- ambienti condivisi (owner/member scrivono, viewer legge);
- oggetti e posizioni personali;
- caldaie M3 nel catalogo con la stessa ID e documenti nativi dalle fonti;
- collegamenti native/reference, `resource_already_linked`, documenti collegabili a più oggetti;
- CAS su ambiente, oggetto, posizione e link; no-op senza evento;
- idempotenza con replay riproiettato e conflitto di body;
- validazioni 422 (parametri sconosciuti o ripetuti, `roomId` + `unplaced`, q oltre 80);
- cursor legati ai filtri.

Seed `mock-api --seed`: 5 ambienti (due «Bagno»), un oggetto multiambiente, uno da collocare, la caldaia posizionata. Il bundle di produzione non contiene il simulatore (verificato sul build).

## Prove realmente eseguite (Node 24.20.0, in `frontend-v5/`)

| Comando | Esito |
|---|---|
| `npm run typecheck` / `npm run lint` | OK |
| `npm test` (mock + fixtures) | **236 superati**, 20 file |
| `npm run build` | OK; simulatore assente dal bundle; avviso Vite chunk JS ~600 kB (era 545 dopo H3a) |
| `npx vitest run --project integration` senza flag | 25 saltati (8 file) |
| `V5_OBJECTS_API=1` contro il **mock su 3101** | 2/2: verifica solo il codice dei test, **non è integrazione reale** |

**Composizione dei 236:**
- 214 di baseline, senza modifiche;
- 3 in `src/lib/objects.test.ts` (filtri URL, ritorno legato all'account, limiti in code point, forma delle richieste client e idempotenza);
- 19 in `src/routes/objects.test.tsx`, che coprono:
  - ingresso Casa senza conteggi, con la shell su Casa;
  - capabilities 404 e 503;
  - due «Bagno»; modifica e no-op; archiviazione in dialogo con focus e storia; viewer;
  - oggetto da collocare e multiambiente atomico; posizione CAS 0/1 e 409;
  - catalogo con ricerca server, tipo, «Da collocare», 25+ elementi paginati, nessun invio di `roomId` + `unplaced`; ritorno con i filtri;
  - caldaia unica con collegamento nativo non rimovibile e scheda M3 invariata;
  - ambiente archiviato nella posizione e oggetto archiviato;
  - documento collegato con H2 e rimosso con CAS;
  - riferimento redatto;
  - due fasi con collegamento perso e riprova senza duplicati;
  - costo nativo escluso dal selettore e 409 `resource_already_linked`;
  - privacy dell'owner su un oggetto altrui; revoca con cache G1 pulita; cambio account e casa;
  - risposta persa nella creazione.

**Suite reale** (`tests/integration/home-objects.int.test.ts`):
- Si esegue solo con `V5_API_URL` + `V5_OBJECTS_API=1`, nel quinto gruppo del runner dopo 61 s, con `--maxWorkers=1` e `V5_ANTHROPIC_LIVE=0`; tre registrazioni.
- Copre:
  - capabilities; nessuna stanza creata dal GET; due bagni; replay e conflitto di idempotenza;
  - posizione 0 e multiambiente; filtro «Da collocare»; CAS posizione con 409;
  - caldaia unica con `technicalLink`; archivio caldaia rifiutato; scheda M3 invariata;
  - due fasi costo e link con replay e `resource_already_linked`; documento su più oggetti; rimozione; costo H3a invariato;
  - paginazione e cursor; privacy tra account; 422.
- **Non eseguita contro 3001.**

**Browser (mock 3101 con `--seed`, Vite 5175):**
- Catalogo a 390 px: caldaia una volta, «Da collocare», multiambiente in una riga, nessuno scroll orizzontale.
- Scheda oggetto a 320 px: azioni, nessuno scroll orizzontale.
- Costo registrato per l'oggetto: il modulo apre con il focus sul titolo e senza selettore caldaia; costo e collegamento sono andati a buon fine.
- Collegamento di un documento **da tastiera** (ricerca «libretto», Invio, «Collega»): focus al titolo della sezione.
- Casa desktop con ambienti (due «Bagno» distinti dalla nota).
- Caldaia desktop: scheda tecnica originale, collegamento nativo, solo «Cambia posizione».
- Non provati nel browser: risposte perse, 403/revoca e viewer; il mock non li espone dal browser, sono coperti nei test jsdom.

**Tre difetti emersi nel browser e corretti** (`31f1be3`, `824daf0`):
- il focus finiva sul body dopo collega/registra;
- la lista mostrava «Oggetto» invece del tipo;
- due «Bagno» erano indistinguibili.

**Processi:** i miei 3101 e 5175 sono stati fermati e verificati (nessun processo `node` del mio checkout attivo). 3001, 5174, 55432 e 5173 non sono stati toccati.

## Screenshot (`docs/screenshots/`, backend simulato)

- `31-mock-g1-catalogo-390`
- `32-mock-g1-scheda-oggetto-320`
- `33-mock-g1-casa-ambienti-desktop`
- `34-mock-g1-caldaia-desktop`

Nessuna dichiarazione di conformità WCAG.

## Richieste precise al contratto (non ho cambiato il contratto per far passare il mock)

1. **CatalogItem degli oggetti manuali**: il contratto dice «Object type da DTO» ma elenca per CatalogItem solo `ref, name, type, kindLabel, state, permissions, position, technicalLink`. La UI ha bisogno di `version` (CAS di updates/archive) e di `note`. Ho assunto che gli oggetti manuali includano anche `homeId, note, version, createdAt, updatedAt` (campi facoltativi nel tipo). Confermare, o indicare dove leggere la versione.
2. **Storia**: `{id, kind, at, before, after}` senza elenco di `kind` né forma degli snapshot. La UI mostra etichette per `created/updated/archived/restored/position/linked/unlinked` (altrimenti «Modifica») e le differenze di `name/type/note/state/rooms`. Fissare `kind` e la forma.
3. **Importi nei collegamenti costo**: `LinkedResource.resource` è `{id, title}`. Il contratto chiede «lista costi con importi letti autorizzati», ma senza `amountCents` la UI dovrebbe fare una lettura H3a per ogni riga. Oggi mostro solo il titolo con il link al costo. Va aggiunto un campo importo autorizzato?
4. **Posizione con ambienti archiviati**: la UI reinvia gli ID archiviati già assegnati (che l'utente non ha tolto) insieme a quelli nuovi attivi. Confermare che il server li accetta come «esistenti» e rifiuta solo le **nuove** assegnazioni archiviate.
5. **Archivio o aggiornamento di una caldaia via G1**: codice d'errore non specificato (il mock usa 422). Fissarlo; la UI comunque non offre l'azione.
6. **`resource_already_linked` per i documenti**: il contratto ammette un documento su più oggetti; il mock lo consente. Per lo stesso documento sullo stesso oggetto risponde con un no-op 201 senza storia. Confermare 201 o 200.
7. **Selettore attività**: uso la lista H1 `state=all` filtrando quelle senza `assetLink`; una pagina può contenere solo attività non collegabili (il messaggio lo dice). Un filtro server «senza caldaia» sarebbe più pulito: proposta per un contratto futuro, non necessario per G1.
8. **Bundle** ~600 kB: il code splitting per rotta (G1, Spese, Attività/M4) è consigliato prima del pilota.

## Limiti

- Solo prove mock; G1 si chiude dopo backend, API, DB e browser reali di Codex.
- Inviti e ruoli non hanno API frontend: owner, member e viewer nella stessa casa sono coperti dal mock e vanno verificati da Codex in DB/HTTP.
- Non iniziati S1 (categorie, interventi, totali per oggetto), S2 (Impegni) e C1 (condivisione).
- Gli screenshot desktop sono limitati dal pannello del browser integrato.

## Note per i documenti condivisi (le aggiorna Codex)

- **changelog**: frontend G1. Ambienti condivisi, oggetti personali con posizione multiambiente, catalogo con caldaia unica, collegamenti a documenti, costi e attività senza copie, flusso in due fasi con recupero esplicito. Solo prove mock.
- **decisions**:
  - «Dove» in un unico selettore (ambiente oppure da collocare) per rendere impossibili i filtri incompatibili;
  - due fasi gestite in memoria con la risorsa già creata e il link riprovato con la stessa chiave;
  - focus spostato per cambio di versione o di sezione, non tramite le callback di `mutate`.
- **backlog**: punti 1–8, e2e browser reale G1, focus H1 (K7).
