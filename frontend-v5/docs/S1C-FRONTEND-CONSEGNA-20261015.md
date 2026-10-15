# S1c — frontend «Da documento», bozze e conferma: consegna

Claude Code, 15 ottobre 2026. Incarico `Dimora-V5-incarico-Claude-frontend-S1c.md`.

**Stato.** S1c UI è collaudata solo con la fixture dichiarata, su un backend simulato. **L'estrazione con Anthropic non è disponibile ed è esclusa:** nessuna chiamata, nessun consenso finto, nessun pulsante che la prometta. Il collaudo su backend, API e DB reali spetta a Codex e non viene dichiarato qui.

## Commit

| Commit | Contenuto | Note per Codex |
|---|---|---|
| `d6bfb28b3b8ec0104ae55e145c7a896b63113839` | Allineamento: il solo delta frontend di `8413c4d` (`SpesePage.tsx`, `spese.test.tsx`: ritorno dal costo creato) | Già presente nel master: **non riapplicarlo** |
| `1e76d7f30de0ea8ca4a87ca56109d426aafd29c2` | Implementazione S1c frontend: 15 file | Da integrare |
| commit successivo | Questo report e gli screenshot | Solo documentazione |

Stato iniziale: HEAD `1e2ae0e`; stato pulito, salvo `docs/v5/backend-status.md`, non tracciato e mai toccato. Nessun push, merge o sync verso il master. Backend, schema, DB, contratti, mockup standalone e documenti root non sono stati modificati.

## Comportamento

**Ingresso.** In Spese, con `documentDrafts=true`, «Da documento» porta a `/spese/da-documento` e il link «Bozze da documento» a `/spese/bozze`. Con `documentDrafts=false` resta il comportamento S1a/b: manuale con avviso. Lo stato di ritorno contiene solo vista, famiglia, periodo e filtri; descrizione, ricerca e note non vanno nell'URL.

**1. Scelta dell'originale.**
- Elenco dei documenti autorizzati, paginato. Le immagini sono indicate come non analizzabili.
- Caricamento con lo stesso `UploadForm` di Documenti, ora esportato senza cambiarne il comportamento: nessun secondo archivio. Il caricamento non avvia nessuna analisi.

**2. Avvio esplicito.**
- Provider rappresentati distintamente dalle capabilities. Con la sola fixture compare «Prova su PDF sintetici · nessun modello AI», con la spiegazione che non legge bollette reali e non invia testo a servizi esterni.
- L'avvio richiede documento e una casella di scelta esplicita della prova. Anthropic compare «non disponibile», con il motivo del server.
- Body `{documentId, provider:'test_fixture_v1'}` con `Idempotency-Key`; mai `consentToProviderTransfer` per la fixture.
- «Inserisci il costo a mano (con il documento scelto)» è sempre presente.

**3. Job** (`/spese/analisi/:jobId`).
- Polling ogni 1,5 s sul job reale. Si ferma su stato terminale, smontaggio, logout o cambio account (query rimossa) e 403.
- Un errore di lettura mostra «Ultimo aggiornamento non riuscito… non significa che l'analisi sia fallita» e rallenta il polling a 4 s.
- Riaprendo la rotta si legge lo stato senza un nuovo POST.
- Fallito: messaggio del server, manuale e scelta di un altro documento. «Riprova l'analisi» (POST `retries` con `expectedVersion`) solo per errori transitori (`analysis_timeout`, `storage_unavailable`), mai per un documento non supportato né per un polling fallito.
- Nessuna lista dei job, perché il backend non la espone.

**4. Bozza** (`/spese/bozze/:draftId`).
- «Proposta da confermare» e tag della prova sintetica. Documento originale collegato.
- Ogni proposta mostra «Fonte: pagina N · «estratto» · versione V dell'originale». Hash e dettagli interni non sono mostrati.
- Campi modificabili precompilati dalle proposte: descrizione, categoria, fornitore, numero, data del documento, competenza, scadenza. Oggetto e lavoro facoltativi, scelti dall'utente. Nota.
- La data di riferimento è un campo esplicito, vuoto, distinto da scadenza, data documento e pagamento. Un pulsante facoltativo «Usa la data del documento» la compila.

**5. Importi.**
- Ogni candidato mostra ruolo, etichetta, fonte e una spiegazione breve: per esempio, «Importo da pagare» può includere arretrati.
- Con `amountSelectionRequired` nessuna preselezione. È il caso della bolletta: 80 € totale corrente, 20 € arretrati, 100 € dovuto, mai sommati. Si sceglie un candidato o «Inserisco un importo diverso».
- La fattura (122 € lordo, 100 € imponibile, 22 € imposta) ha il lordo preselezionato solo perché il server non chiede la scelta; gli altri importi restano distinti e non diventano costi.
- Modificare l'importo di un candidato passa a `manual`: niente provenienza estratta su un altro valore.

**6. Possibile costo già registrato.**
- Candidati paginati con i motivi in parole, presentati come «possibili corrispondenze».
- «Collega al costo esistente» passa da un dialogo che spiega che importo, categoria e data non cambiano. Invia `link_existing` con `expectedExpenseVersion`.
- `expense_document_conflict` viene spiegato, senza sostituire il documento.

**7. Conferma unica.**
- Invio di `ConfirmDraft` `create` con valori espliciti e `amountSelection` candidato o manuale. Il documento non è nei valori: arriva dalla bozza.
- Invii concorrenti disabilitati. Con esito ignoto, «Esito non confermato» e «Riprova invio» con la stessa chiave e lo stesso body.
- Successo: si apre il costo canonico. Le invalidazioni economy, H3a e G1 aggiornano dashboard, liste, lavoro, oggetto e documento.
- Mai `createExpense` separato.

**8. Bozze recuperabili** (`/spese/bozze`).
- Da confermare, accantonate e confermate, con paginazione.
- «Accantona» passa da un dialogo che avvisa che le modifiche non confermate non vengono salvate. È persistito via API con CAS.
- «Riprendi la bozza» riapre. «Esci senza confermare» non conferma e non cancella. Nessun autosalvataggio promesso.
- Una bozza confermata non compare fra le aperte e porta al costo collegato.

**9. Fonti e privacy.**
- Chiavi sotto `['account', id, 'home', id, 'economy', …]`: logout e cambio account le rimuovono, un 403 svuota i dati economici della casa.
- Con originale revocato: banner, nessuna citazione (il server redige proposte e candidati), conferma disabilitata.
- Messaggi distinti per conflitti di versione e stato, documento non supportato (422), provider disabilitato (503 `ai_provider_disabled`, trattato come rifiuto definito e non come esito ignoto) e perdita di rete.

## Correzioni emerse durante il lavoro

1. **Navigazione persa dopo la conferma** (difetto reale, trovato dai test). Dopo la conferma la vista della bozza, che ha la versione come chiave, si rimontava; TanStack non esegue i callback per chiamata di un componente smontato, quindi la navigazione al costo si perdeva. `useEconomyOperation` ora usa `mutateAsync`. La correzione vale anche per S1a/b: stesso hook, comportamento invariato.
2. **Esito duplicato:** compariva sia nel modulo sia nel dialogo. Ora si mostra solo nel dialogo aperto.

## Comandi e risultati (15 ottobre 2026, dopo l'ultima modifica al codice)

Cartella `frontend-v5`:

| Comando | Esito |
|---|---|
| `npx tsc -b --noEmit` | exit 0 |
| `npx eslint .` | exit 0, nessun avviso |
| `npm test` (`mock` + `fixtures`) | exit 0 — **25 file, 283 test passati** |
| `npm run build` | exit 0. Avviso Vite: bundle di 714,81 kB, sopra la soglia di 500 kB: avviso, non errore |

**Test nuovi o estesi** (backend simulato, dichiarato):
- `src/routes/s1c.test.tsx` (14):
  - provider distinti e avvio solo esplicito, senza POST all'apertura;
  - polling fermo a stato terminale e ripresa senza POST;
  - fallito non fixture, senza «Riprova»;
  - retry solo transitorio con `expectedVersion`;
  - gas senza preselezione, con fonti, senza somma, importo modificato manuale e senza `createExpense`;
  - fattura con lordo preselezionato e dashboard aggiornata;
  - `link_existing` con versione, importo invariato e nessun costo nuovo;
  - documento diverso in conflitto 409;
  - risposta persa con stessa chiave e body;
  - CAS con rilettura;
  - accantona con avviso, riprendi, confermata fuori dalle aperte;
  - fonte revocata;
  - logout con cache pulita;
  - bozza altrui con 403.
- `src/api/economyClient.test.ts` (+2): `ai_provider_disabled` non ambiguo e nessun job creato; bozza fuori contratto rifiutata.
- `src/routes/spese.test.tsx`: test S1a/b aggiornato al nuovo ingresso «Da documento».

Regressioni S1a/b, G1, H3a, analisi caldaia e attività: suite complete verdi.

Nota di metodo: la suite S1c usa `asyncUtilTimeout` di 5 s, perché le pagine leggono capabilities, bozza, candidati, oggetti e lavori. Due test navigavano via e indietro senza attendere la pagina intermedia (nessuna rilettura) e sono stati corretti nel test, non nell'app.

## Prova nel browser

- **Harness mio:** backend SIMULATO `scripts/mock-api.ts --seed --s1 --s1c` su 127.0.0.1:3101 e Vite su 127.0.0.1:5175. Il nuovo flag `--s1c` attiva `documentDrafts` e semina `gas.pdf` e `invoice.pdf` sintetici come fixture.
- **Servizi del master:** porte 3001, 5174 e 55432 non toccate.
- **Configurazione di avvio:** `.claude/launch.json` modificato solo per avviare l'harness e ripristinato subito dopo; server fermati, porte 3101, 5175 e 9333 libere al termine.
- **Metodo:** il pannello browser integrato non disegna le pagine, quindi ho usato Chrome headless via DevTools Protocol, con clic e digitazione reali e viewport emulati. Login con l'account di prova del seed mock. Nessuno stato applicativo iniettato.
- **Percorso:**
  1. Spese, con famiglia Bollette e anno 2026, poi «Da documento».
  2. Scelta di `gas.pdf`: «Avvia la prova sintetica» resta disattivato finché non si spunta la scelta esplicita.
  3. Avvio e polling fino a «Rivedi la proposta».
  4. Nella bozza: 0 importi preselezionati, 11 citazioni, nessun costo simile.
  5. Scelta di 80,00 € e «Usa la data del documento».
  6. Responsive: a 390 e a 320 px `scrollWidth` uguale alla larghezza.
  7. «Accantona»: l'avviso dice che le modifiche non sono salvate. La bozza compare fra le accantonate; «Riprendi la bozza», nuova scelta, conferma.
  8. Il costo mostra: 80,00 €, «Proposto da un documento e confermato da te», categoria Gas, famiglia Bollette, documento `gas.pdf`, fornitore e numero.
  9. «← Spese» torna a `?vista=panoramica&anno=2026&famiglia=utilities`, con Bollette passate da 107,90 a 187,90 €.
  10. Errori in console: nessuno.
- **Screenshot** in `frontend-v5/docs/screenshots/s1c-frontend-20261015/` (dati sintetici):
  - `01-da-documento-scelta-prova-1280.png`
  - `02-revisione-fonti-importi-1280.png`
  - `03-revisione-mobile-390.png`
  - `04-bozze-accantonate-1280.png`
  - `05-costo-confermato-1280.png`
- **Nota sugli screenshot:** il link «Vai al contenuto» visibile in alcune catture è il link di salto esistente dell'app, che appare quando riceve il focus. Non è un elemento nuovo.

## Limiti

- **Backend reale non provato:** tutto è verificato su un simulatore che ricalca servizio e contratto letti dal master (`document.service.ts`, `document-domain.ts`, `document-fixture.ts`). Forme e codici d'errore reali vanno confermati da Codex.
- **Nessuna lista dei job:** un job si ritrova solo dalla sua rotta, mentre le bozze si ritrovano dall'elenco.
- **Nessun salvataggio intermedio** delle modifiche al modulo della bozza: il contratto non ha un PATCH. L'interfaccia lo dichiara.
- **Proposte fuori dai campi previsti:** se il server ne invia, non vengono usate; un avviso lo indica.
- **Bundle:** avviso sulle dimensioni (sopra).
- **Accessibilità:** non provata con lettore di schermo; nessuna dichiarazione WCAG.

## Punti di contratto

Nessun punto bloccante trovato. Due osservazioni per Codex:
1. Il rifiuto del provider disabilitato arriva come **503** `ai_provider_disabled`. Il client lo tratta come esito definito per codice. Se in futuro altri codici 503 fossero definitivi, vanno aggiunti all'elenco in `isAmbiguousError`, oppure il server dovrebbe usare un 4xx.
2. Il campo `job.error.message` è mostrato così com'è. È in italiano nel servizio attuale; il client ha messaggi di riserva solo se manca.

## File (commit `1e76d7f`)

Tutti i percorsi sono relativi a `frontend-v5/`.

**Nuovi:**
- `src/lib/economicDrafts.ts`
- `src/routes/DocumentDraftPages.tsx`
- `src/routes/s1c.test.tsx`

**Modificati:**
- `src/api/client.ts`: metodi S1c e validatore della bozza.
- `src/api/queryKeys.ts`: chiavi di job, bozze e candidati.
- `src/economy/hooks.ts`: job con polling, bozze, candidati, mutazioni S1c, `mutateAsync`.
- `src/lib/economy.ts`: `ai_provider_disabled` non ambiguo.
- `src/routes/DocumentsPages.tsx`: `UploadForm` esportato.
- `src/routes/SpesePage.tsx`: ingresso «Da documento» e link alle bozze.
- `src/routes/WorksPages.tsx`: tipo del callback.
- `src/routes/routes.tsx`: 4 rotte.
- `src/api/economyClient.test.ts`
- `src/routes/spese.test.tsx`
- `src/test/fakeEconomy.ts`: simulatore S1c.
- `scripts/mock-api.ts`: flag `--s1c`.
