# Home — verifica finale, consegna Claude · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Home-rifinitura-finale-20261016.md`. Consegna solo documentale: **nessuna modifica** a prodotto, CSS, test, backend, contratti, schema, configurazione o dipendenze. Guida non implementata. Nessun push.

## Worktree, branch, baseline

| Voce | Valore |
|---|---|
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-Home-rifinitura`, nuovo, creato con `git worktree add` dal master |
| Branch | `claude/home-rifinitura-finale-20261016` |
| Baseline | `42a4b47038c815e4b41faac2dd0e4961a4ff90fc` |
| Fetch | `git fetch origin` eseguito: 179 avanti e 0 indietro rispetto a `origin/main`. Nessun pull o merge |
| File scritti | Solo `frontend-v5/docs/home-rifinitura-finale-20261016/`: `REPORT.md`, `CONSEGNA.md`, `screenshots/` |
| Master e vecchi checkout | Non modificati. Nel vecchio `Dimora-V5-Claude` i dirty `docs/v5/backend-status.md` e `video-promo/` sono preservati |

**Cambiamento del master durante le prove.** Alle 08:15 il master è passato da `42a4b47` a `92112e1` («test(v5): consolidate Home functional verification»). Il commit cambia solo:
- `createHome.test.tsx`;
- `review.test.tsx`;
- `docs/v5/home-collaudo-funzionale-20261016.md`.

Il runtime servito da 5174 è identico prima e dopo. Le prove 08:08–08:15 (scenario A e la prima parte di B) e quelle successive (resto di B e scenario C) valgono quindi per la stessa baseline runtime.

## Scenari eseguiti e basi

| Scenario | Ambiente | Cosa |
|---|---|---|
| A | **B-reale** (5174 + backend V5 reale) | Registrazione ordinaria; pagina senza case a 1280, 390 e 320 px; creazione casa da tastiera; Casa vuota a 1280, 390 e 320 px; destinazioni delle azioni rapide; promemoria con data e ritorno a Casa |
| B | **B-reale** | Oggetto, documento sintetico caricato e collegato, costo dall'oggetto con ritorno; rientro da `/`; ricerca documento; Spese con periodo e famiglia vuoti; avviso di conferma in Casa a 1280 e 390 px; Tab da Casa; barra fissa e dettagli a 390 e 320 px |
| C | **B-reale** | Invito esterno; nuovo account destinatario senza casa; codice; attesa; conferma del mittente; accettazione; consultazione; uscita e rientro; codice non valido |
| — | **C** | Cause dei rilievi nel codice della baseline (file e righe nel REPORT) |
| — | **B-harness** | Non usato: il backend reale accetta l'origine 5174 e la registrazione ordinaria funziona |

**Non eseguito:**
- codice scaduto: dedotto dal contratto, stesso messaggio del codice non valido;
- revoca e scadenza reali della consegna;
- molte pagine di condivisioni;
- download;
- analisi AI;
- screen reader, dispositivi fisici, utenti reali.

Nessuna dichiarazione WCAG.

## Dati sintetici lasciati nel DB V5 locale

Nessun dato del committente, di Prova M4, di Collaudo C1 o delle sessioni precedenti è stato letto o modificato. Le credenziali sintetiche restano solo nello scratchpad della sessione; non sono in questi file.

| Risorsa | ID |
|---|---|
| Account proprietario | «Verifica Rifinitura A», `home-fin-a-…@example.test` |
| Account destinatario | «Verifica Rifinitura C», `home-fin-c-…@example.test` |
| Casa «Casa Rifinitura» | `0d3ecbea-7cbe-406f-87a3-90faa7c30db4` |
| Attività «Controllo annuale caldaia» (21/10) | `e7b6c9a3-0cb6-4f1d-8d5f-bac5fa7bea5d` |
| Oggetto «Lavatrice cucina» | `195de14f-d8d0-4b93-81ac-0c1a836fd390` |
| Documento `garanzia-lavatrice-sintetica.pdf` | `8cb3d7ff-1e92-4080-9a3e-6bcd57f2d503` |
| Costo 85,50 €, collegato all'oggetto | ID non annotato |
| Condivisione accettata, consultabile fino al 23/10 | `fc9492c4-cc82-4dbb-adbd-09cf0f1f14d6` |

Il documento è un PDF vuoto di 193 byte, generato per la prova. Ho lasciato la condivisione attiva per l'eventuale riscontro di Codex: si può revocare dal dettaglio. Nessuna cancellazione eseguita.

## Evidenze

Gli screenshot sono in `screenshots/`. Sono tre, tutti B-reale, con dati sintetici e senza codici né email:

| File | Sostiene |
|---|---|
| `01-casa-vuota-1280.png` | FIN-004 e il residuo di HOME-CONS-009 |
| `02-casa-avviso-condivisione-390.png` | FIN-003 e FIN-005 |
| `03-destinatario-rientro-390.png` | FIN-001 |

FIN-002 non ha screenshot: la prova è `document.activeElement` registrato dal driver. I log del driver sono nello scratchpad della sessione e non sono versionati. Per non salvarli, il testo è stato letto escludendo gli elementi `aria-label` «Codice…»: i codici di abbinamento e di confronto non compaiono nei log né nelle immagini.

## Processi

- Avviato un solo processo: Chrome headless con profilo separato e porta di debug 9445. **Chiuso** a fine prove (`Browser.close`; la porta non risponde più).
- Nessun server avviato: 5174, 3001 e 55432 del master sono stati solo usati, non riavviati né fermati.
- Nessun `.env`, quota, CSRF/Origin o DB toccato.
- Nessuna chiamata AI.
- Nessuna build, lint o suite: incarico documentale.

## Comandi

| Comando | Esito |
|---|---|
| `git diff --check` sulla cartella, prima del commit | OK |
| Commit della sola cartella autorizzata | Vedi `git log` del branch |

## Note per Codex

- **Ordine consigliato:** FIN-003 → FIN-002 → FIN-001 → FIN-004 → HOME-CONS-009 in Casa. Lo trovi in REPORT, «Interventi raccomandati».
- **Voci proposte per i documenti condivisi** (le aggiorna Codex):
  - backlog: HOME-FIN-001…005;
  - HOME-CONS-004 resta aperto per upload, conferma, accettazione e invio codice;
  - HOME-CONS-009 resta aperto per Casa.
- **Nuova evidenza.** La catena C1a reale (invito esterno → account nuovo senza casa → confronto → conferma → accettazione → consultazione) è stata eseguita oggi nel browser sul servizio reale. Il collaudo funzionale Codex del 16/10 la dichiarava non ripetuta.

## Decisioni per il committente

Nessuna indispensabile. Gli interventi sono rifiniture che Codex può arbitrare. Il committente decide solo, se vuole, sul nuovo parametro di URL che aprirebbe il caricamento dalla Casa (FIN-004): in alternativa basta cambiare le altre etichette.
