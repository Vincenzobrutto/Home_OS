# Caricamento iniziale del frontend — consegna (15/10/2026)

Incarico: `Dimora-V5-incarico-Claude-caricamento-frontend.md`. Checkout `Dimora-V5-Claude`, branch `claude/dimora-v5-identity`. Nessun push e nessun sync verso il master. Non dichiaro conformità WCAG.

**Risultato in breve:** l'entry JS scende da **721,09 kB a 485,12 kB** non compressi, e da 205,28 a 148,14 kB gzip. L'avviso di Vite sui chunk oltre 500 kB non compare più. Non ho alzato `chunkSizeWarningLimit` e non ho toccato le sourcemap.

Ho misurato **solo i byte**. Non ho misurato i tempi di caricamento reali e non dichiaro un miglioramento dei tempi.

## Commit

| Commit | Tipo | Contenuto |
|---|---|---|
| `cffd8da` | **allineamento** (da non riapplicare) | Delta frontend del master `284fa1f`, acquisito senza modifiche dai file del commit: <br>• `jobRetryUseful` esclude `billing.state === 'uncertain'`; <br>• test dedicato in `s1c-consent.test.tsx`; <br>• `tests/integration/economy-consent.int.test.ts`. <br>Nessun file backend. Il test di integrazione non l'ho lanciato: richiede il master su 3001, dove Codex esegue la campagna. |
| `3c250c3` | implementazione | `src/routes/lazyPage.tsx` (nuovo); `src/routes/lazyPage.test.tsx` (nuovo); `src/routes/routes.tsx`; `src/routes/SpeseSummary.tsx`; `src/routes/ExpensesPage.tsx` |
| (questo report) | documentazione | Report e screenshot in `docs/screenshots/frontend-loading-20261015/` |

`docs/v5/backend-status.md` è preservato e non tracciato. Non ho toccato:
- backend, DB e servizi 3001/5174/55432;
- `.env`, contratti, mockup e documenti root;
- consenso, parser/DTO, conti economici e provider.

## Misura: cosa c'era nell'entry

Ho fatto la build di produzione con `vite build`, poi attribuito i byte ai sorgenti decodificando la sourcemap dell'entry. Mi è bastato questo, senza analizzare l'intero progetto.

**Prima:** un solo chunk, `index-BvOwgUbt.js`, da 721,09 kB (gzip 205,28 kB). Le voci principali:

| Sorgente | kB minificati |
|---|---|
| react-dom | 210,2 |
| react-router | 93,0 |
| @tanstack/query-core | 34,2 |
| `DocumentDraftPages.tsx` | 34,0 |
| `objects/components.tsx` | 21,6 |
| `SpesePage.tsx` | 19,9 |
| `api/client.ts` | 18,6 |
| `economy/components.tsx` | 18,5 |
| `ActivityPage.tsx` | 18,2 |
| `review/components.tsx` | 13,9 |
| `DocumentsPages.tsx` | 13,2 |
| `BoilerPage.tsx` | 12,7 |
| altre pagine di sezione | circa 80 |

Tutte le rotte erano importate staticamente da `routes.tsx`. Il solo framework (react-dom, react-router, TanStack, react, scheduler) occupa circa **352 kB**: è il pavimento dell'entry senza riscritture.

## Intervento

- **`lazyPage(load)`:** usa `React.lazy` e `Suspense`, senza nuove dipendenze. I componenti sono creati **una volta, a livello di modulo**, in `routes.tsx`, mai nel rendering. Le rotte, gli URL e l'albero di layout restano gli stessi. Cambia solo l'`element` delle sezioni, che diventa il componente differito.
- **Sezioni differite:**
  - Documenti e dettaglio documento;
  - Attività e dettaglio attività;
  - Review e scheda caldaia;
  - Spese e dettaglio costo;
  - lavori e dettaglio lavoro;
  - «Da documento», job, bozze e bozza;
  - ambienti e oggetti, con i rispettivi dettagli.
- **Restano nell'entry:**
  - `RootLayout` (focus sui cambi di rotta) e i guard di sessione;
  - accesso e registrazione;
  - elenco e creazione case, `HomeLayout`;
  - Casa con i riepiloghi (è la pagina d'ingresso);
  - i due NotFound.
- **Stato di caricamento:** «Caricamento della sezione…» con il componente `Loading` già in uso, dentro la shell, quindi nessuna schermata vuota. Il focus sul titolo continua a funzionare: `RootLayout` aspetta già il primo `h1` definitivo, fino a 5 s.
- **Download fallito:** un boundary dedicato intercetta solo `SectionLoadError`; ogni altro errore prosegue verso l'alto come prima. Mostra il titolo «Sezione non disponibile» e un messaggio che dice che nessun dato è stato modificato e che l'utente resta connesso. L'unica azione è «Ricarica la pagina», a richiesta, sullo stesso URL. Non ci sono tentativi automatici né logout.

  Avevo previsto anche un «Riprova» in pagina. Passava in jsdom, ma in Chrome non funziona: il browser ricorda l'`import()` fallito per lo stesso URL e un nuovo tentativo non scarica nulla, come ha mostrato la prova CDP. L'ho tolto per non offrire un pulsante inefficace. Non si perdono moduli: la sezione fallita non era mai stata montata.
- **`SummaryTotals`:** l'ho spostato da `ExpensesPage.tsx` a `SpeseSummary.tsx`. Era l'unico motivo per cui la pagina Spese H3a stava nell'entry, perché Casa lo usa. Il markup è identico, il risparmio è di circa 8 kB.
- **Nessun fake nel bundle:** ho cercato in `dist/assets/*.js` le stringhe `FakeBackend|FakeEconomy|realProvider|mock-api|modello-simulato` e non ce n'è nessuna.

## Dopo

`vite build`, 22 file JS:

| Chunk | kB | gzip kB |
|---|---|---|
| **index (entry)** | **485,12** | **148,14** |
| DocumentDraftPages | 40,07 | 11,81 |
| RoomsPages | 34,19 | 9,41 |
| ActivityPage | 21,93 | 6,79 |
| SpesePage | 20,39 | 6,43 |
| components (economy) | 19,94 | 7,18 |
| DocumentsPages | 17,30 | 6,18 |
| EconomyExpensePage | 17,23 | 4,72 |
| components (review) | 15,28 | 5,05 |
| BoilerPage | 13,21 | 4,61 |
| WorksPages | 11,22 | 3,78 |
| ObjectsPages | 11,12 | 3,97 |
| ActivityDetailPage | 7,99 | 2,88 |
| ExpensesPage | 7,74 | 2,97 |
| DocumentDetailPage | 5,66 | 2,23 |
| ReviewPage | 4,19 | 1,90 |
| LinkedExpenses | 1,77 | 0,94 |

Il CSS delle sezioni è separato allo stesso modo: l'entry CSS passa da 32,29 a 16,21 kB.

Margine sotto la soglia: circa 15 kB. Nuove dipendenze pesanti nella shell o in Casa lo consumerebbero. Per scendere di molto oltre servirebbero interventi non ragionevoli in questo incarico, come differire parti di Casa o della shell, oppure il router stesso.

## Percorsi provati nel browser

Ho usato la build di produzione servita da `vite preview` sulla porta **5175**, con il backend **simulato** `scripts/mock-api.ts --seed --s1 --s1c` sulla porta **3101**. La configurazione temporanea in `.claude/launch.json` l'ho ripristinata con `git checkout`.

Ho guidato Chrome headless via CDP con eventi Input reali e ho registrato le richieste di rete. Nella tabella i nomi dei chunk sono senza hash. Ogni rotta è stata aperta con navigazione diretta **e** poi ricaricata: per ciascuna, la colonna JS vale per entrambi i passaggi.

| Percorso | URL finale | h1 | JS scaricati |
|---|---|---|---|
| anonimo su `/case` | `/accedi?next=%2Fcase` → dopo l'accesso `/case` | Accedi | index |
| Casa | invariato | «Appartamento Roma» | index |
| Documenti | invariato | «Documenti» | index, DocumentsPages, ActivityPage, components |
| Dettaglio documento | invariato | «Libretto caldaia» | index, DocumentDetailPage, LinkedExpenses, DocumentsPages, ActivityPage, components |
| Scheda caldaia `/impianti/:id` | invariato | «Caldaia cucina» | index, BoilerPage, components, LinkedExpenses |
| Spese `?anno=2026&famiglia=utilities` | invariato, query conservata | «Spese» | index, SpesePage, components, ExpensesPage |
| Lavoro `/spese/lavori/:id` | invariato | «Rifacimento bagno» | index, WorksPages, components |
| Job `/spese/analisi/:id` | invariato | «Analisi del documento» | index, DocumentDraftPages, components, DocumentsPages, ActivityPage |
| Bozza `/spese/bozze/:id` | invariato | «Proposta da confermare» | come il job |
| NotFound globale `/pagina-inesistente` | invariato | «Pagina non trovata» | index |
| NotFound di sezione `/home/:id/sezione-inesistente` | invariato | «Pagina non trovata» | index |

Navigazione interna:
- Casa → Spese scarica SpesePage, components ed ExpensesPage.
- Spese → Documenti scarica DocumentsPages, ActivityPage e components.
- Il ritorno a Spese non scarica **nulla**: il chunk è già in memoria.

**Download fallito.** Ho bloccato `ObjectsPages-*.js` con `Network.setBlockedURLs` e poi cliccato il link Oggetti da Casa:
- risultato: titolo «Sezione non disponibile», URL `/home/…/oggetti`, sessione attiva («Esci» presente);
- dopo 1,5 s senza clic il chunk risulta richiesto **1** volta: nessun tentativo automatico;
- dopo lo sblocco, «Ricarica la pagina» riapre lo **stesso URL** con titolo «Oggetti e impianti» e la sessione ancora attiva.

Errori console: solo il `SectionLoadError` del caso bloccato, che React registra quando il boundary lo intercetta. Negli altri percorsi nessun errore.

Screenshot:
- `00-accedi-con-next-1280.png`: accesso con `next` dopo una rotta privata da anonimo;
- `01-notfound-sezione-1280.png`: NotFound di sezione aperto direttamente, dentro la shell;
- `02-sezione-non-caricata-1280.png`: messaggio di download fallito;
- `03-sezione-dopo-ricarica-1280.png`: la stessa sezione dopo «Ricarica la pagina».

## Comandi e risultati

Tutti eseguiti in `frontend-v5`.

| Comando | Esito |
|---|---|
| `npx vite build`, prima | 1 chunk JS: `index` 721,09 kB, gzip 205,28 kB, con avviso > 500 kB |
| `npx vite build`, dopo | entry 485,12 kB, gzip 148,14 kB, nessun avviso; `✓ built in 10.70s` |
| `npm run typecheck` | OK, exit 0 |
| `npm run lint` | OK, exit 0 |
| test mirati `lazyPage.test.tsx` + `routing.test.tsx` | **14/14** |
| `npm test`, 1ª esecuzione | 308 passati, **8 falliti** |
| `npm test`, 2ª esecuzione | **27 file, 316/316** (142,6 s) |
| `npm test`, 3ª esecuzione, dopo la semplificazione del boundary | **27 file, 316/316** (121,9 s) |

Sulla 1ª esecuzione:
- Durata 479,9 s, di cui setup 301,5 s, con i backend e il Vite del master attivi e CPU al 51%.
- Sei test sono falliti dopo circa 287 s e due in circa 5,5 s.
- I due fallimenti rapidi, «Casa: riepilogo…» e «accesso revocato: 403 sulla ricerca…», passano rilanciati da soli.
- Li ritengo dovuti al carico della macchina, ma non lo posso dimostrare.

La 3ª esecuzione è servita perché ho cambiato il caricatore dopo la prova browser.

`lazyPage.test.tsx` contiene 4 casi:
1. lo stato di caricamento è coerente, poi compare la pagina;
2. con il download fallito compaiono il messaggio e «Ricarica la pagina», con una sola chiamata al loader e nessuna ricarica automatica;
3. una sezione già scaricata non viene richiesta di nuovo;
4. un errore di rendering della pagina non viene trattato come caricamento fallito.

## Limiti

- Ho misurato solo i byte, e il gzip come lo riporta Vite. Non ho misurato tempi reali, cache HTTP o reti lente.
- Aprire una sezione per la prima volta costa ora una richiesta in più, piccola: da 1,8 a 40 kB. Non ho introdotto preload anticipati, per non riscaricare tutto all'avvio.
- Il caso «Dimora aggiornata nel frattempo» (chunk con hash vecchio) si risolve solo ricaricando; il messaggio lo dice. Senza il backend reale non ho provato un deploy concorrente vero.
- Margine di circa 15 kB sotto la soglia indicativa; il framework da solo vale circa 352 kB.
- Nessuna verifica con tecnologie assistive reali: nessuna dichiarazione WCAG.
