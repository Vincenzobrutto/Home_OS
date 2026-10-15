# Consenso e stati del provider economico reale — consegna frontend (15/10/2026)

Incarico: `Dimora-V5-incarico-Claude-consenso-Anthropic-economia.md`. Ho lavorato solo sul frontend, nel checkout `Dimora-V5-Claude`, branch `claude/dimora-v5-identity`.

- Non ho fatto nessuna chiamata Anthropic reale e nessuna spesa. Il provider «reale» esiste solo nel fake (`src/test/fakeEconomy.ts`, `realProvider`) e nell'harness (`--s1c-real`).
- Nessun push. Non dichiaro test live né conformità WCAG.

## Commit

| Commit | Tipo | Contenuto |
|---|---|---|
| `4e7fdd9` | **allineamento** (da non riapplicare) | Delta di Codex da `f8a778a`, acquisiti senza modifiche: attesa dell'asserzione DOM in `spese.test.tsx`; «risposta di conferma dopo logout» in `s1c.test.tsx`. |
| `0c3db1b` | implementazione | UI di consenso, provider, nuovo tentativo e costo dell'analisi; libreria; fake; harness; test. |
| (questo report) | documentazione | Report e screenshot. |

File toccati da `0c3db1b`:
- `src/routes/DocumentDraftPages.tsx`
- `src/lib/economicDrafts.ts`
- `src/lib/economy.ts`
- `src/economy/hooks.ts`
- `src/api/client.ts`
- `src/test/fakeEconomy.ts`
- `scripts/mock-api.ts`
- `src/routes/s1c-consent.test.tsx` (nuovo)

Non ho toccato:
- backend, DB, `.env`;
- contratti congelati;
- mockup e documenti root;
- `docs/v5/backend-status.md`, che resta non tracciato e preservato.

## Comportamento

### 1. Disponibilità

`analysisAvailability` controlla, in ordine:
1. `features.documentDrafts`;
2. `analysis.enabled`;
3. provider reali abilitati e non simulati;
4. fixture abilitata.

Se nessun provider è disponibile, la pagina mostra il motivo e nessun pulsante di avvio. Nessun flag locale abilita Anthropic: la modalità reale dipende solo dalle capabilities. I provider disabilitati restano elencati con il loro `disabledReason`.

### 2. Scelta del provider

- Con fixture e reale entrambi disponibili, la pagina mostra due radio e nessuno è preselezionato. Senza una scelta non c'è pulsante di avvio.
- Con un solo provider la scelta è implicita, ma il consenso o la presa d'atto restano obbligatori.
- La prova sintetica resta etichettata «Prova su PDF sintetici · nessun modello AI».

### 3. Consenso prima dell'avvio reale

- È una casella non preselezionata, visibile solo con un PDF scelto. Testo: «Invia ad Anthropic il testo di «gas.pdf» per proporre i dati della spesa. Le proposte non vengono registrate da sole: dovrò controllarle e confermarle io.»
- Sopra la casella: provider e modello, e una nota che il costo dell'analisi è del servizio e non della casa.
- Non mostro hash, token o dettagli tecnici.
- Il pulsante «Invia ad Anthropic e proponi i dati» resta disattivato senza consenso. Aprire la pagina, scegliere un documento o dare il consenso non invia nulla.

### 4. Consenso locale al singolo avvio

Il consenso si azzera:
- a ogni cambio di documento o provider, anche tornando alla scelta precedente;
- dopo un upload che seleziona un nuovo documento;
- dopo un rifiuto definito.

Il componente ha una chiave per account e casa, quindi un cambio di account o di casa lo rimonta da zero.

Il consenso vive solo nello stato React: non va in URL, storage o log. Il test controlla URL, `localStorage` e `sessionStorage`. La spunta della prova sintetica è uno stato separato e non vale come consenso reale.

Con esito di trasporto ignoto:
- documento, provider e consenso restano bloccati sulla richiesta già spedita;
- «Riprova invio» rimanda la stessa chiave e lo stesso body, consenso incluso;
- nessuna ripetizione automatica.

### 5. Body di avvio

| Provider | Body |
|---|---|
| reale | `{documentId, provider:'anthropic', consentToProviderTransfer:true}` |
| fixture | `{documentId, provider:'test_fixture_v1'}` (campo omesso) |

### 6. Nuovo tentativo

- Viene proposto solo per gli errori recuperabili: `analysis_timeout`, `storage_unavailable`, `provider_rate_limited`.
- Non viene proposto per: budget o limite esauriti, autenticazione, modello, provider disabilitato o non configurato, fonte revocata, documento non supportato, `analysis_outcome_unknown`.
- **Provider reale:** si apre il dialogo «Nuova analisi del documento». Avvisa che è una nuova analisi, che il testo sarà inviato di nuovo e che può avere un nuovo costo, che non entra nelle spese. Il consenso nuovo è non preselezionato e il body è `{expectedVersion, consentToProviderTransfer:true}`.
- **Fixture:** clic diretto, come prima, con body `{expectedVersion}`.
- In entrambi i casi la pagina naviga al **nuovo** `jobId` della risposta, anche dopo «Riprova invio». La pagina del job ha una chiave per account, casa e job, quindi non conserva consenso o esiti del job precedente.
- Un polling fallito resta un errore di lettura («Ultimo aggiornamento non riuscito») e non crea job.

### 7. Codici del provider

Gli otto codici hanno messaggi dedicati in `PROVIDER_MESSAGES`, che distinguono:
- indisponibilità: nessun testo inviato;
- budget o limite;
- autenticazione: da risolvere lato servizio, non riprovando;
- limitazione temporanea;
- esito ignoto: costo non confermato, non riprovare subito.

Nel job fallito il testo verificato del client ha la precedenza sul messaggio del server.

I sette codici di rifiuto restano **definiti** anche se arrivano come 503: non producono «Esito non confermato» né «Riprova invio», e il consenso si azzera. `analysis_outcome_unknown` non è nella lista dei rifiuti definiti.

### 8. Costo dell'analisi

Il job mostra:
- provider e modello;
- il riquadro «Costo dell’analisi (servizio di lettura, non una spesa della casa: non entra in Spese, nei totali o nel grafico)», con stato, riserva massima e costo effettivo in USD così come arrivano, senza conversioni.

Per `uncertain`:
- lo stato dice «Costo non ancora confermato: non significa zero né rimborso»;
- il costo effettivo dice «non ancora confermato».

Il costo API non viene mai sommato. Il costo confermato dalla bozza resta l'importo del documento: il test controlla `amountCents = 12200`, il totale 122,00 € e l'assenza di USD in Spese.

### 9. Funzioni esistenti

Sono preservate:
- revisione, fonti e importi;
- inserimento manuale, park e reopen;
- idempotenza, filtri e ritorni;
- protezioni su logout e 403.

L'intera suite S1c precedente passa senza modifiche: 15 test.

Unica modifica di testo: nel job fallito «Nessun costo è stato registrato» è diventato «Nessuna spesa è stata registrata nella casa», per non confonderlo con il costo dell'analisi.

## Risultati

Eseguiti in `frontend-v5`:

| Verifica | Esito |
|---|---|
| `npm run typecheck` | OK, nessun errore |
| `npm run lint` | OK, exit 0, nessun avviso |
| `npm run build` | OK, `✓ built in 4.24s`; solo l'avviso preesistente sul chunk > 500 kB |
| `vitest` mirato su `s1c-consent.test.tsx` + `s1c.test.tsx` | **42/42** passati, 2 file |
| `npm test` completo, 1ª esecuzione | 310 passati, **1 fallito**: il mio nuovo test «logout e nuovo accesso», per un'attesa troppo corta sotto carico (lista documenti non arrivata in 5 s). |
| `npm test` completo, dopo la correzione | **26 file, 311/311 passati** (93,8 s) |

La correzione dell'attesa: aspettare la home e l'intestazione della pagina, con timeout di 10 s; la logica del test non cambia. Dopo la correzione ho rieseguito lint solo sui due file toccati: OK.

`s1c-consent.test.tsx` contiene 27 casi.

**Disponibilità e scelta**
- reale e fixture spenti: nessun avvio;
- `documentDrafts` spento;
- scelta esplicita senza preselezione, con consenso non preselezionato che indica documento, provider e modello;
- reset del consenso al cambio di documento e di provider, anche tornando indietro; la presa d'atto sintetica non vale come consenso; niente consenso in URL o storage;
- fixture senza consenso nel body.

**Avvio, rifiuti ed esito ignoto**
- avvio reale con body corretto, provider, modello, riserva e costo; il costo API non entra nei totali;
- costo effettivo confermato;
- sei rifiuti definiti: `ai_budget_exhausted`, `ai_evaluation_limit_reached`, `provider_rate_limited`, `ai_model_unavailable`, `provider_auth_failed`, `ai_provider_unconfigured`;
- `ai_provider_disabled` dopo il caricamento, senza fallback alla fixture;
- risposta persa all'avvio: stessa chiave, stesso body e consenso; un solo job.

**Job e nuovo tentativo**
- nuovo tentativo reale con dialogo e consenso nuovo, con navigazione al nuovo job;
- nuovo tentativo con risposta persa e «Riprova invio»: nuovo job e stessa chiave;
- `uncertain`;
- cinque codici non riprovabili;
- nuovo tentativo della fixture, che crea un nuovo job;
- polling fallito, che non crea job.

**Account e casa**
- cambio casa;
- logout e nuovo accesso.

## Browser

Ho usato il mio harness, mai i servizi del master su 3001/5174/55432:
- mock API simulata su 3101 (`--seed --s1 --s1c --s1c-real`);
- Vite su 5175.

L'ho avviato con una configurazione temporanea in `.claude/launch.json`, poi ripristinata con `git checkout`. Ho guidato Chrome headless via CDP con eventi Input reali, perché il pannello browser integrato non disegna. Solo dati sintetici e HTTP simulato.

Log del percorso (estratto):
- nessun provider preselezionato (0 radio selezionate); consenso non preselezionato e invio disattivato;
- dopo il cambio documento il consenso torna `false`, e resta `false` tornando a gas.pdf;
- job 1 fallito con `provider_rate_limited`: costo confermato, riserva 0.050000 USD, costo effettivo 0.000000 USD;
- dialogo del nuovo tentativo con avviso di costo; «Avvia la nuova analisi» disattivato senza consenso;
- job 2 diverso dal primo (`…/analisi/50d73dc5-…`): proposta pronta, costo effettivo 0.012345 USD;
- 390 px: `{"w":390,"sw":390}`; 320 px: `{"w":320,"sw":320}`, cioè nessuno scorrimento orizzontale;
- Spese senza USD: `true` (totale 2.287,20 € invariato rispetto ai dati sintetici);
- nessuna traccia di «consent» nello storage; errori console: nessuno.

Screenshot in `docs/screenshots/economy-anthropic-consent-20261015/`:

| File | Contenuto |
|---|---|
| `01-consenso-non-preselezionato-1280.png` | Provider reale scelto, casella vuota, invio disattivato |
| `02-consenso-dato-1280.png` | Scelta provider esplicita, consenso con documento/provider/modello, invio attivo |
| `04-job-fallito-limitato-1280.png` | Job reale fallito (`provider_rate_limited`) con provider/modello, costo e «Riprova l’analisi» |
| `05-nuovo-tentativo-consenso-1280.png` | Dialogo del nuovo tentativo: avviso di nuova analisi e costo, consenso nuovo vuoto |
| `06-job-riuscito-costo-confermato-1280.png` | Nuovo job riuscito, riserva e costo effettivo confermato |
| `07-job-riuscito-mobile-390.png` | Stato del job a 390 px |

Il numero 03 manca: lo scatto «job in corso» mostrava già lo stato finale, perché il fake chiude il job in due letture, e l'ho scartato. Lo stato `reserved` e lo stato `uncertain` sono coperti dai test, non da screenshot.

## Limiti

- Tutto è provato contro il fake. Nessuna verifica contro il backend reale, che oggi dichiara Anthropic disabilitato. Status HTTP e messaggi dei rifiuti nel fake sono scelte mie (409/429/503).
- La lista degli errori riprovabili (`analysis_timeout`, `storage_unavailable`, `provider_rate_limited`) è decisa dal client.
- L'etichetta del provider nella pagina del job viene da una mappa locale (`anthropic` → «Anthropic»), perché il job espone solo l'id.
- Gli importi USD sono mostrati come stringhe del servizio («0.050000 USD»), senza formattazione locale, per non alterare il formato M4.
- Nessuna verifica con screen reader o assistive technology reali: nessuna dichiarazione WCAG.

## Per Codex — punti di contratto da confermare

Nessun blocco. Il contratto è bastato senza nuovi endpoint. Da confermare:

1. **Status dei rifiuti del provider.** Il client tratta i sette codici di rifiuto come definiti con qualunque status, anche 502/503/504. Se il backend usasse `analysis_outcome_unknown` come risposta di **avvio** con 5xx, il client lo tratterebbe come esito ignoto: stessa chiave e «Riprova invio» manuale. Mi sembra corretto; serve conferma.
2. **Errori riprovabili.** Un campo `retryable` dal server, nel job o nell'errore, eviterebbe la lista lato client. Oggi è solo una proposta, non implementata.
3. **Job precedente dopo `/retries`.** Il client non rilegge il vecchio job e non si aspetta che cambi versione o stato. Se il backend lo marca (per esempio con `supersededBy`), non c'è impatto.
4. **Testo del consenso.** Il contratto cita «Invia ad Anthropic il testo del documento per proporre i dati della spesa». La UI usa la stessa frase con il nome del documento e la preposizione corretta («ad Anthropic»), più l'avviso che le proposte andranno confermate.
