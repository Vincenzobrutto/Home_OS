# HANDOFF — M4 frontend Anthropic (analysis-v2)

Autore: Claude Code. Data: 13/10/2026. Destinatario: Codex (backend, provider, budget, integrazione, collaudo reale).
Stato: **frontend M4 pronto per l'integrazione, verificato solo con backend e Anthropic simulati. M4 non è completata.** Gli endpoint analysis-v2 non sono ancora implementati. Claude non ha fatto nessuna chiamata Anthropic e non ha avuto accesso alla chiave del backend.

## Checkout, sincronizzazione e commit

- Percorso: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude`, branch `claude/dimora-v5-identity`.
- Base verificata: `ea59724719dbbfde1d5ae2955551c7f89bc5b1e5`, albero pulito salvo `docs/v5/backend-status.md` non tracciato (preservato, non incluso).
- Bundle `Dimora-V5-sync-Claude-M4.bundle`:
  - `git bundle verify`: okay;
  - `git bundle unbundle`: oggetti importati senza spostare la branch;
  - il commit indicato dal file di riferimento è `5403f47af65fe3ce7a861ff67c364e411da18001`, ref `dev/dimora-v5-local-20261013`.
- Ripristinati con `git restore --source=5403f47` **solo** `frontend-v5/`, `docs/v5/{api,documents-api,review-api,anthropic-api}-contract.md`, `domain-model.md`, `implementation-decisions.md`, `docs/v5/fixture/m3/`.
  - Non ripristinati: `backend-status.md` e `backend-v5`. Nessun checkout della branch Codex.
  - Dopo il commit di sync, la differenza da `5403f47` su quei percorsi è vuota.
- **SHA-256 verificati contro il manifest**: tutti coincidono, in `docs` e in `public` (il trasferimento via oggetti Git ha risolto la corruzione della vecchia patch).

| PDF | docs/v5/fixtures/m3 | public/m3-examples | manifest |
|---|---|---|---|
| libretto-caldaia-demo | `824b6de3…` | `824b6de3…` | `824b6de3…` |
| scheda-tecnica-caldaia-demo | `da6b7340…` | `da6b7340…` | `da6b7340…` |
| rapporto-caldaia-demo-conflitto | `e313f78f…` | `e313f78f…` | `e313f78f…` |

Commit (locali, nessun push):

| Commit | Contenuto | Azione per Codex |
|---|---|---|
| `4d9205d` chore(v5): sync consolidated M3 and M4 contract | Copia della baseline `5403f47` sui percorsi autorizzati | **Escludere / non riapplicare** |
| `350a399` feat(frontend-v5): client analysis-v2 (provider, consenso, costi) | Tipi, client, hook, etichette | Integrare |
| `3d3019c` test(frontend-v5): backend simulato analysis-v2 | `fakeReview` con Anthropic simulato; timeout dei test | Integrare |
| `af82af4` feat(frontend-v5): scelta esplicita Analisi di test o Anthropic | UI di avvio, esiti, retry, badge, regola `other`; test M3 adeguati | Integrare |
| `4ff5537` test(frontend-v5): casi M4 con Anthropic simulato | 20 test M4; `jobErrorMessage` con etichette M4 | Integrare |
| `8cd7a07` test(frontend-v5): integrazione analysis-v2 con flag espliciti | Suite reale (saltata di default) e `mock-api --anthropic-mock` | Integrare |
| commit successivo docs(frontend-v5) | Questo HANDOFF, README, screenshot | Integrare. SHA: `git log -1 -- frontend-v5/HANDOFF.md` |

Rifiniture Codex del consolidato M3 conservate: fonti con il nome M2, Attività attiva anche su `/review` e `/impianti`, azioni della storia in italiano, testi «Analisi completata», test reale con PDF valido non nel manifest.

## Cosa è stato fatto

1. **Tipi e compatibilità**:
   - `ProviderId`; `SourceRef.page: number`; `provider`, `isSimulation` e `model` su job e proposte;
   - `analysisProviders`/`isSimulation` sulle schede; outcome `no_supported_data`; `billing` reserved/settled/uncertain; `HistoryEvent.origin` con `ai_provider`;
   - capabilities v2 con `apiVersion`, `providers`, `limits` e `budget`.
   - I campi v2 sono **facoltativi** nei tipi, così una risposta M3 continua a funzionare: senza `providers` la UI offre solo l'analisi di test, senza alcun Anthropic. I vecchi test M3 passano.
2. **Scelta esplicita del provider**:
   - radio «Analisi di test — nessuna AI reale» / «Analisi AI con Anthropic», **nessuna preselezione**;
   - provider disattivato o non configurato mostrato con il `disabledReason` del server e non selezionabile;
   - nessun campo o modulo per la chiave, nessun segreto nel bundle (verificato);
   - con Anthropic: limiti leggibili dalle capabilities e budget del collaudo («non è un prezzo di Dimora né il saldo dell’account Anthropic»).
3. **Consenso**:
   - casella non preselezionata con il testo esatto del contratto, obbligatoria lato client prima della POST;
   - body `{documentIds, targetAssetId?, provider:'anthropic', consentToProviderTransfer:true}`; per il test `{documentIds, provider:'test_fixture_v1'}`;
   - cambio provider: consenso azzerato, nuova chiave, nessun invio;
   - mai avvio al montaggio, al caricamento o al cambio provider; destinazione sempre visibile.
4. **Limiti ed esiti**:
   - con Anthropic, i documenti oltre `maxFileBytes` non sono selezionabili e restano consultabili;
   - messaggi distinti per tutti i codici M4 (non configurato o disattivato, modello assente, budget, rate limit, autenticazione, provider assente, output non valido, evidenze non verificate, testo assente, PDF cifrato o invalido, limiti, più caldaie, esito sconosciuto);
   - `no_supported_data`: «nessuna scheda è stata creata», oppure «la scheda resta invariata» se c'era una destinazione;
   - manuale sempre indicato.
5. **Risultati**:
   - badge del provider **effettivo** su job, proposte e scheda (`analysisProviders`); scheda mista con entrambi i badge, scheda solo manuale senza etichette;
   - fonti con nome M2, **pagina reale**, estratto, impronta, «Apri l’originale» (flusso M2 autenticato);
   - nota «Verificato sulla fonte: … Non è una certificazione né una conferma»;
   - nessun punteggio di confidenza; output sempre come testo React (nessun `dangerouslySetInnerHTML`; testato con HTML nell'estratto).
6. **Costi e retry**:
   - costo riservato, effettivo o incerto, mai uno zero non comunicato;
   - il retry di un job Anthropic fallito apre un pannello con nota sul costo precedente (anche incerto), avviso di nuovo costo e consenso da ridare; body `{consentToProviderTransfer:true}`; per il test `{}`;
   - esito ambiguo della POST di creazione o del retry: stessa chiave; nessun retry POST automatico.
7. **Conferme M3 invariate**: scelta puntuale della potenza, sostituzione esplicita, manuale, inbox solo aperte, storia (origine «analisi AI (Anthropic)»).
   - **Nuovo**: con una grandezza `other` non compare «Conserva le due grandezze»; il testo chiede interpretazione o correzione.
8. **Cache**:
   - capabilities con `staleTime 0`, rilette dopo avvio, retry, rifiuto ed esito del job (il budget si aggiorna);
   - chiavi per account, casa, job, scheda e provider;
   - bozze (provider, consenso, selezione) solo in memoria e azzerate al cambio di casa o account;
   - polling fermato allo smontaggio; nessuna scrittura in cache dopo un cambio di account.

## API usate

Endpoint M3 invariati, con i campi analysis-v2: GET `analysis-capabilities` (v2), POST `analysis-jobs` con `provider` e `consentToProviderTransfer`, POST `analysis-jobs/:id/retry` con `{consentToProviderTransfer:true}` per Anthropic, e i campi nuovi in letture e storia. Nessun endpoint o campo fuori contratto.

## Prove realmente eseguite (Node 24.20.0, in `frontend-v5/`)

| Comando | Esito |
|---|---|
| `npx tsc -b` / `npx eslint .` | OK |
| `npx vitest run` | **125 superati** (11 file), 9 saltati (integrazione). Ripetuto 2 volte, stabile. Nessuna chiamata di rete reale |
| `npx vite build` | OK; il bundle non contiene chiavi né l'endpoint Anthropic, e non contiene il backend simulato |
| Integrazione `V5_ANALYSIS_V2=1` contro **mock su 3101** | 3/3 non-live, live saltato: verifica solo il codice dei test, **non è integrazione reale** |

- **Composizione dei 125**: 105 regressioni M1/M2/M3 + 20 M4.
- **Test M3 adeguati alla scelta esplicita**: clic sul radio del provider, titolo «Nuova analisi», body con `provider`.
- **Nella baseline consolidata** un test M3 superava il limite predefinito di 5 s per test. Ho alzato il timeout del progetto mock a 20 s e quello di `findBy` a 3 s; nessuna logica cambiata.

**Test M4** (`src/routes/anthropic.test.tsx`, Anthropic simulato nell'harness):
- non configurato, senza campi per la chiave;
- nessuna preselezione; limiti e budget; consenso obbligatorio e body corretto;
- cambio provider senza invii; servizio M3 senza Anthropic; cambio casa;
- pagine 2/3 con nome della fonte e apertura dell'originale; `no_supported_data`;
- cinque errori distinti (testo assente, autenticazione, rate limit, citazioni rifiutate, più caldaie); escaping; grandezza `other`; scheda mista e scheda solo manuale;
- budget esaurito (429) con capabilities rilette; provider disattivato dopo l'apertura (503) senza ripiego sul test;
- costo incerto e retry con consenso; risposta persa con stessa chiave e una sola riserva; budget che scende del costo effettivo.

**Integrazione reale** (`tests/integration/anthropic.int.test.ts`):
- `V5_ANALYSIS_V2=1`: capabilities v2 senza segreti; rifiuto senza consenso prima del job e senza riserva; provider di test esplicito senza costi.
- `V5_ANTHROPIC_LIVE=1`: **solo Codex, consuma budget**; un'analisi del PDF sintetico A.
- Nessun `return` anticipato: un upload fallito fa fallire il test.

**Browser (mock su 3101 con `--seed --anthropic-mock`, Vite su 5175)**:
- modulo M4 completo;
- consenso e invio **da tastiera** (Spazio, Invio);
- esito AI con modello e costo `0.0123 USD`;
- scheda con badge AI, fonte nominata, pagina e nota di verifica a 320 px senza scroll orizzontale;
- secondo tentativo con esito incerto: «Costo incerto (fino a 0.25 USD)», pannello di retry con nota e «Conferma» disattivato finché il consenso non è dato.

I processi di Codex su 3001 (ora PID 21712), 5174, 55432 e 5173 non sono stati toccati né interrogati; i miei processi su 3101 e 5175 sono stati fermati.

## Screenshot (`docs/screenshots/`, backend e Anthropic simulati)

- `16-mock-m4-scelta-provider-consenso-390`: scelta del provider, limiti, budget, consenso non selezionato.
- `17-mock-m4-proposta-ai-320-cattura-duplicata`: proposta AI a 320 px. Lo strumento di cattura ha duplicato l'immagine 2×2; la pagina reale non è duplicata, e il contenuto è leggibile.

Altre catture sono andate in timeout (pannello del browser non in primo piano); gli stati relativi sono stati verificati leggendo il testo della pagina.

Nessuna dichiarazione di conformità WCAG.

## Richieste e lacune per Codex (nessun campo/endpoint inventato)

1. **Billing dei fallimenti prima della chiamata** (testo assente, PDF cifrato, limiti): il contratto non dice se `billing` è `null`, `settled` con `actualUsd:'0.00'` o se la riserva viene registrata. La UI mostra quello che arriva («Costo non comunicato dal servizio» se `null`). Il mock usa `settled` a `0.00`, quindi conosciuto e non inventato.
2. **Riserva per tentativo**: il contratto fissa 0,25 USD, ma le capabilities non lo espongono. La UI non lo scrive in anticipo: mostra `maxReservedUsd` dal job. Valutare un campo `limits.maxReservedUsdPerAttempt`, se utile prima dell'invio.
3. **`disabledReason`**: la UI lo mostra così com'è; serve testo italiano per l'utente.
4. **Errore di consenso assente**: codice e stato non sono specificati. La UI gestisce `fieldErrors.consentToProviderTransfer` e un 4xx generico; servirebbe un codice stabile.
5. **`multi_assets_unsupported` / `analysis_outcome_unknown`**: confermare che arrivano solo come job `failed`, non come HTTP.
6. **Nome della scheda creata da un'analisi AI**: come in M3, non specificato.
7. **Budget incerto in capabilities**: la UI lo mostra se diverso da `0`/`0.00`. Confermare il formato delle stringhe USD (decimali).
8. **Integrazione reale**: con gli endpoint attivi, eseguire `V5_ANALYSIS_V2=1` (gratuito), poi, solo se deciso, il live (`V5_ANTHROPIC_LIVE=1`) entro il cap.
   - Restano da verificare dal vero: pagine multiple su un PDF sintetico non riconosciuto per hash, collaudo browser reale a 320/390 px, desktop e tastiera.

## Note per i documenti condivisi (le aggiorna Codex)

- **changelog**: frontend M4 (scelta esplicita del provider, consenso, limiti e budget del collaudo, esiti e costi, retry con consenso, badge per provider, pagine reali, regola `other`); solo prove mock.
- **decisions**:
  - campi v2 facoltativi nei tipi, per compatibilità M3;
  - nessuna preselezione del provider;
  - consenso azzerato al cambio provider;
  - documenti oltre il limite AI non selezionabili;
  - capabilities senza cache;
  - retry Anthropic con pannello di consenso;
  - timeout dei test UI alzati.
- **backlog**: richieste 1–8; e2e browser reale M4.
- **roadmap**: frontend M4 pronto per integrazione; M4 si chiude dopo API/DB, collaudo con provider simulato, live limitato e browser reale.

## Prossimi passi consigliati

1. Codex: integrare i commit da `350a399` in poi (escludere `4d9205d`); rispondere alle richieste 1–7.
2. Endpoint analysis-v2 attivi: suite `V5_ANALYSIS_V2=1`, collaudo browser con provider simulato, poi live entro 10 USD.
3. Adeguamenti del client dalla review, in nuovi commit `frontend-v5/**`.
