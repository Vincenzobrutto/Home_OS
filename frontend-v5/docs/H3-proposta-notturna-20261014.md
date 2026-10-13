# Revisione H2 e proposta H3 «Spese essenziali» — consegna notturna Claude Code

14 ottobre 2026. Autore: Claude Code, su incarico coordinato da Codex. Checkout `Dimora-V5-Claude`, branch `claude/dimora-v5-identity`, base `524d577`.
Nessuna modifica al codice in questa consegna. Nessuna suite reale, nessuna chiamata AI, nessun servizio 3001/5174/55432/5173 interrogato.

**Il contratto H3 qui proposto NON è approvato.** È una bozza da cui Codex può partire. Nessuna implementazione H3 prima del contratto congelato da Codex.

---

## Parte 1 — Revisione indipendente del frontend H2

Fonti rilette:
- il mio frontend H2 (`src/lib/documentSearch.ts`, `src/documents/{hooks.ts,SearchForm.tsx}`, `src/routes/{DocumentsPages,DocumentDetailPage}.tsx`, `src/routes/guards.tsx`, `src/session/{session.tsx,queryClient.ts}`);
- il contratto `docs/v5/document-search-api-contract.md`;
- nel master, in sola lettura, `docs/v5/h2-integration-review.md`, `frontend-v5/src/lib/documentSearch.ts` e `tests/integration/document-search.int.test.ts`.

Le due correzioni di Codex sono già nel master e non le ripeto:
- i caratteri di controllo ai margini vengono rifiutati invece di essere cancellati dal trim;
- la suite reale usa un PNG 1×1 completo.

Legenda:
- **Verificato**: il difetto è dimostrato dal percorso del codice, con passaggi deterministici indicati. Non l'ho eseguito, perché in questa fase non posso modificare codice né aggiungere test.
- **Opinione**: scelta di prodotto o UX da valutare, non un difetto.

### R1 — P1 privacy, verificato: i filtri di un account passano all'account successivo tramite `next`

**Percorso del codice:**
1. Con la sessione scaduta, `RequireAccount` costruisce `next = pathname + search` (`src/routes/guards.tsx:86-88`). Lo stesso accade con `401 account_context_changed`, perché un'altra scheda ha cambiato account: `handleUnauthorized` imposta `account: null` (`src/session/queryClient.ts:26-33`) e il guard rende `/accedi?next=…`.
2. `explicitLogout` è falso in entrambi i casi, quindi il `next` non viene scartato.
3. `AnonymousOnly` reindirizza a `safeNextPath(next)` (`guards.tsx:112`), che conserva la query string.
4. Il nuovo account arriva su `/home/:id/documenti?q=…&visibility=…` e `DocumentsPage` applica quei filtri.

**Riproduzione (browser, due account membri della stessa casa):**
1. L'account A cerca «busta paga» con «Solo io»; l'URL contiene `?q=busta+paga&visibility=private`.
2. In una seconda scheda A esce ed entra B.
3. Nella prima scheda qualunque richiesta riceve 401 `account_context_changed`.
4. Il browser passa da `/accedi?next=%2Fhome%2F…%3Fq%3Dbusta%2Bpaga…` e poi B vede la pagina con il campo «busta paga» e la ricerca eseguita sui propri documenti.

Anche la sola scadenza della sessione lascia il testo cercato in chiaro nell'URL di login e nella cronologia.

**Impatto:** nessun documento di A viene mostrato a B, perché il server filtra per account. Però il testo cercato da A e i suoi filtri compaiono a B e partono come richiesta di B. Il contratto chiede: «Cambio account/Home pulisce bozza, filtri precedenti e selezione».

**Test mancante:** il mio test «cambio account durante una ricerca lenta» naviga esplicitamente B su `?q=privato`, quindi non copre questo percorso.

**Correzione proposta (solo frontend, `frontend-v5/**`):** nel `next`, togliere da `/documenti` i parametri `q`, `format` e `visibility`, oppure conservare solo il pathname per tutte le rotte. In alternativa, con `account_context_changed`, non usare affatto `next`. Aggiungere un test con un 401 `account_context_changed` mentre i filtri sono attivi. È una scelta da concordare con Codex, perché il guard appartiene a identity-v1.

### R2 — P2 privacy della cache, verificato: un 403 su «Mostra altri» o su una rilettura lascia i risultati in memoria

**Percorso del codice:**
1. `useForgetHomeDocuments` rimuove solo le query senza osservatori (`predicate: getObserversCount() === 0`, `src/documents/hooks.ts`).
2. Se il 403 arriva su `fetchNextPage`, o sulla rilettura di una query che ha già pagine, la query attiva resta in cache con `data`. Lo schermo invece mostra «Accesso non consentito» (`DocumentsArchive`: `forbidden` viene controllato prima dell'elenco).
3. La rilettura della casa porta a `HomeUnavailable`, l'archivio si smonta e la query diventa inattiva, ma nessuno la rimuove. Resta fino al `gcTime` predefinito di TanStack, 5 minuti, perché `createQueryClient` non lo imposta.

**Riproduzione:**
1. Il member cerca un termine con più di 20 risultati.
2. Codex revoca la membership.
3. Il member clicca «Mostra altri documenti».
4. Ne risultano un 403 e la pagina «Accesso non consentito». `queryClient.getQueryCache()` contiene ancora la query `['account', member, 'home', id, 'documents', 'list', 'search', …]` con le prime 20 righe.

**Impatto:** nulla viene visualizzato, ma il contratto dice «non lascia visualizzati risultati privati in cache». Restano in memoria anche dettaglio casa, H1 e M3 di quella casa: questo è un comportamento generale preesistente, non specifico di H2.

**Test mancante:** il mio test di revoca applica una nuova ricerca, cioè una chiave nuova, e non copre la pagina successiva.

**Correzione proposta:** quando arriva un 403 su una lista o sulla casa, rimuovere l'intero prefisso `['account', id, 'home', homeId]` dopo lo smontaggio. Per esempio, una funzione nel `HomeLayout` quando `home.error` vale 403. Aggiungere un test per il 403 su `fetchNextPage`.

### R3 — P3, verificato: il link di ritorno può riportare i filtri di un altro account

`DocumentDetailPage` legge `location.state.documentsSearch`, e lo stato di history sopravvive al cambio di account sullo stesso tab.

Riproduzione: A apre un dettaglio dai risultati, poi esce ed entra B. Con «Indietro» del browser B torna su quella voce di cronologia; se B ha accesso alla stessa casa e al documento condiviso, il link «← Documenti di …» contiene la query di A.

È meno probabile di R1 e appartiene alla stessa classe. Correzione: legare lo stato all'account, per esempio `{ accountId, documentsSearch }`, e ignorarlo se l'account è diverso.

### R4 — P3 UX, verificato: «Cerca» con filtri invariati non ripete una ricerca fallita

`apply()` reimposta gli stessi parametri: chiave e archivio non cambiano, quindi non parte nessuna richiesta. Dopo «Ricerca non riuscita» funziona solo «Riprova». È coerente con «nessuna richiesta inutile», ma l'utente può aspettarsi che anche «Cerca» ripeta la ricerca.

Proposta: se i filtri sono uguali e la query è in errore, «Cerca» esegue `refetch`.

### R5 — P3 input, verificato: query non valida nell'URL senza errore sul campo

Con `?q=` oltre 120 code point, o con caratteri di controllo, l'archivio mostra il banner «Ricerca non valida». Il campo invece non è `aria-invalid` e non ha messaggio finché l'utente non preme «Cerca». Non c'è nessuna richiesta né perdita di dati, solo incoerenza dell'annuncio.

Proposta: inizializzare l'errore del campo da `validateQuery(applied.q)`.

### R6 — P3 test, verificato: lacune di copertura

| Lacuna | Collegata a |
|---|---|
| 401 `account_context_changed` con filtri attivi | R1 |
| 403 sulla pagina successiva | R2 |
| ZIP dopo un upload durante la ricerca, con selezione conservata e nuovo documento non selezionato | — |
| Viewer nel client reale, oggi coperto da Codex solo nei test DB/HTTP | — |

Nessuna di queste nasconde regressioni M1–M4 o H1.

### Opinioni (non difetti)

- **O1**: «Solo io» per un viewer dà quasi sempre zero risultati, perché un viewer non carica documenti. Si può tenere per coerenza con l'API, oppure dire nell'aiuto «documenti caricati da te».
- **O2**: il link di ritorno dice «← Documenti di <Casa>» anche quando riporta ai risultati; «← Risultati della ricerca» sarebbe più chiaro.
- **O3**: la riga `role="status"` «Risultati per … — ce ne sono altri» viene riannunciata a ogni pagina caricata. Si può valutare `aria-live` solo al cambio dei filtri.
- **O4**: la query in chiaro nell'URL è voluta dal contratto (refresh e ritorno). Resta nella cronologia del browser, quindi conviene citarlo nell'informativa sulla privacy del pilota.
- **O5**: l'avviso Vite sul chunk da 509.54 kB è già tracciato da Codex. Lo splitting per rotta (Attività/M4 e Documenti) è la via naturale.

**Nessun difetto trovato su:** escaping (tutto testo React); chiavi della cache per account, casa e filtri canonici; annullamento delle richieste al cambio filtri; rimontaggio con selezione ZIP vuota; export dei soli visibili selezionati; capabilities 404/503 senza ripiego locale; liste M3/M4 non filtrate; nessun uso di localStorage.

---

## Parte 2 — Proposta H3 «Spese essenziali della casa»

### 2.1 Fonti

| Rif. | Passaggio | Uso nella proposta |
|---|---|---|
| MASTER M-01 | «Home mobile-first, con Casa / Attività / Documenti / Spese» | Spese è la quarta sezione, oggi «non ancora attiva» |
| MASTER M-12 | «Home gestisce memoria e costi essenziali; il pagamento della rata è una dichiarazione personale… Planimetria interattiva ed economia avanzata restano concept» | Perimetro minimo, niente economia avanzata |
| MASTER M-05 | «Il costo di un intervento compare una sola volta» | Un solo record di spesa, citato da caldaia e documento |
| MASTER M-04, M-11 | Privacy per persona e casa; offline ed errori non completano modifiche | Stesse regole H1 (idempotenza, nessun successo locale) |
| MASTER V5-020 | «Liste da record, dichiarazione di pagamento distinta da incasso, totali separati, modifica della spesa esistente» | Lista e totali dal server, modifica vera |
| MASTER V5-021 | «Storico asset e costo unico tramite riferimento alla spesa; nota conservata» | Collegamento facoltativo alla caldaia, senza duplicare |
| Decisioni revisione A-03 | «Segna come pagata da me»… «Pagamento dichiarato dal proprietario», distinto da «Incasso confermato dall'amministratore». Niente riconciliazione né solleciti | **Rinviato**: presuppone rate comunicate da Amministratori, non ancora esistenti in V5 |
| Decisioni revisione D-01 | «Ogni profilo ha la propria casa: documenti, … attività, spese …» | Spesa personale del creatore, come H1 |
| Decisioni consolidate post AI review, «Economia V1, opzione B» | «costi documentati e manuali collegati a documenti/interventi/asset; costi ricorrenti, bollette, confronti per periodo e semplici proiezioni deterministiche con ipotesi visibili… Non promettere risparmi» | H3 prende la parte «manuale/documentato/collegato»; ricorrenti e proiezioni dopo |
| Home UX consolidata §5 | «costi documentati/manuali/stime distinti»; «Mutui/polizze… capitale residuo non spesa»; «Nessuna seconda contabilità» | Origine sempre visibile, niente mutui, niente contabilità |
| Ciclo di vita CV-01 | Alla vendita il proprietario «perde accesso all'entità casa…: documenti, oggetti, attività, spese…» | Revoca e scadenza bloccano le spese; una nuova casa non le recupera |
| Prototipo v9 `app.js` (`expenses()`, form `expense`) | Titolo, importo, data, origine «Documentata/Inserita da te», collegamento asset/fattura, «Modifica»; testo «Le rate comunicate dall'amministratore arrivano dal condominio e non si inseriscono qui» | Riferimento visivo e di flusso; non è un requisito di dati |

### 2.2 Perimetro minimo proposto (H3a)

**Obiettivo:** registrare i costi effettivamente sostenuti per la casa, con la loro origine, e vederli in lista e in un totale annuo, senza contabilità.

**Incluso:**
1. **Spesa manuale**: titolo, importo in euro, data della spesa, nota facoltativa. Origine «Inserita da te».
2. **Spesa documentata**: uguale, ma collegata a un documento M2 leggibile dal creatore (fattura o ricevuta). Origine «Collegata a un documento». L'importo lo scrive l'utente: niente estrazione AI/OCR in H3. Il documento resta l'originale, non viene certificato e non cambia.
3. **Collegamento facoltativo alla propria caldaia M3/M4**: la scheda caldaia mostra «Costi collegati» leggendo le spese per `assetId`. Il costo esiste una sola volta (M-05, V5-021). Non si tocca la storia tecnica della caldaia né `confirmed`.
4. **Lista Spese**: ordinata per data, con filtri per anno e per collegamento (tutte / con documento / con caldaia).
5. **Totale annuo** calcolato dal server, con la dicitura «Costi registrati da te nel <anno>» e la nota «Solo spese inserite o documentate da te. Non comprende importi comunicati da altri né stime».
6. **Modifica della spesa esistente** con versione e storia prima/dopo, come H1.
7. **Rimozione logica** «Elimina dalla lista» con nota facoltativa: la storia resta e il documento collegato non viene toccato. La spesa esce dal totale.
8. **Ingressi**:
   - Spese → «Aggiungi spesa»;
   - dettaglio documento → «Registra una spesa da questo documento»;
   - scheda caldaia → «Registra un costo»;
   - Casa: riquadro «Spese di quest'anno» con totale e ultime 3.

**Escluso:**
- pagamenti, incassi, riconciliazione bancaria, solleciti;
- rate e ripartizioni condominiali (servono Amministratori; A-03 rinviato);
- AI, OCR ed estrazione dell'importo;
- ricorrenti, bollette, proiezioni, confronti e grafici (H3b, vedi 2.8);
- mutui e polizze; valute diverse dall'euro; IVA e detrazioni fiscali;
- categorie normative o fiscali; condivisione della spesa con altri membri; export.

### 2.3 Flussi e stati

```
Spese (vuoto) ─ Aggiungi spesa ─▶ Modulo (destinazione: <Casa>, «spesa personale»)
     ▲                              │ Salva (Idempotency-Key)
     │                              ▼
     └──── Lista ◀── Dettaglio spesa ── Modifica (expectedVersion) ─▶ storia «modificata»
                         │
                         └─ Elimina dalla lista (dialogo, nota) ─▶ stato removed, storia «rimossa»
                                                                   └─ Ripristina? (decisione D7)
Documento M2 ─ «Registra una spesa da questo documento» ─▶ Modulo con documentId precompilato e visibile
Caldaia M3   ─ «Registra un costo» ─▶ Modulo con assetId precompilato; scheda mostra «Costi collegati»
```

**Stati:**
- `active`: conta nei totali.
- `removed`: fuori dalla lista predefinita e dai totali; resta visibile con il filtro «Rimosse» e nella storia.

Non esiste uno stato «pagata»: una spesa registrata è per definizione un costo sostenuto e dichiarato dall'utente (M-12).

**Collegamenti**, per documento e caldaia:
- `none`;
- `linked`;
- `unavailable`: il riferimento non è più leggibile, per esempio un documento rimosso dall'accesso. È mostrato senza nome né ID, come in H1.

**Errori:**
- rete o 503: «Esito non confermato» con «Riprova invio» (stessa chiave e stesso payload);
- 409: versione o idempotenza in conflitto, con «Rileggi i dati»;
- 403: nessun contenuto mostrato;
- 404 capabilities: «Spese non ancora attive su questo servizio», e il resto dell'app continua a funzionare.

### 2.4 Matrice ruoli e visibilità (proposta)

Basata su D-01 («ogni profilo ha … spese») e sul modello H1. Se il committente vuole spese condivise nella casa, vedi D1.

| Azione | Owner | Member | Viewer | Altro account / membership revocata o scaduta |
|---|---|---|---|---|
| Vedere le **proprie** spese | sì | sì | sì (solo quelle già esistenti) | 403 generico |
| Vedere le spese di altri membri | **no** | no | no | no |
| Creare, modificare, rimuovere | sì (`edit`) | sì (`edit`) | no | 403 |
| Collegare un documento | solo se il documento è leggibile dal creatore (privato proprio o «Persone della casa») | idem | — | — |
| Collegare la caldaia | solo la propria scheda (regola M3/M4) | idem | — | — |
| Totale annuo | solo le proprie spese `active` | idem | idem | 403 |
| Dopo la vendita (CV-01) | nessun accesso; una nuova casa non le recupera | idem | idem | — |

**Regole di privacy da replicare da H1/H2:**
- filtrare prima di contare o proiettare;
- nessun totale che riveli spese altrui;
- risposta salvata per l'idempotenza riletta con i diritti attuali;
- riferimenti a documento e caldaia riletti e redatti a ogni lettura e nella storia.

### 2.5 Contratto API proposto — **BOZZA NON APPROVATA** (`expenses-v1`)

Base `/api/v5/homes/:homeId`, trasporto comune (cookie, CSRF, `X-Account-Context`, `no-store`, `Idempotency-Key` su ogni POST). Solo GET e POST, come H1.

| Metodo e percorso | Uso |
|---|---|
| GET `expense-capabilities` | `{apiVersion:'expenses-v1', enabled, isSimulation:false, currency:'EUR', limits:{titleMax:120, noteMax:500, amountMaxCents}, timeZone:'Europe/Rome'}`; 404 = non attive |
| GET `expenses?state=active\|removed\|all&year=YYYY&link=all\|document\|asset&assetId&documentId&limit&cursor` | Pagina `{items, nextCursor}`; ordine `spentOn desc, createdAt desc, id desc`; cursor legato ad account/casa/filtri |
| POST `expenses` | Crea `{title, amountCents, spentOn, note?, documentId?, assetId?}` → `201 {expense}` |
| GET `expenses/:id` | Dettaglio |
| POST `expenses/:id/updates` | `{expectedVersion, …campi cambiati}`; `documentId`/`assetId` omessi = invariati, `null` = rimuovi il collegamento |
| POST `expenses/:id/remove` | `{expectedVersion, note?}` → `removed` |
| POST `expenses/:id/restore` | Solo se D7 la approva |
| GET `expenses/:id/history` | Eventi `created\|updated\|removed\|restored` con prima/dopo |
| GET `expense-summary?year=YYYY` | `{year, totalCents, count, lastItems:[≤3]}` sulle sole spese `active` del richiedente |

**Tipo proposto:**

```ts
type HomeExpense = {
  id: string; homeId: string;
  title: string;            // 1–120 code point, trim + NFC
  amountCents: number;      // intero > 0 (D3), max da capabilities; mai float
  currency: 'EUR';
  spentOn: string;          // YYYY-MM-DD, data di calendario scelta dall'utente
  note: string | null;      // ≤500
  origin: 'manual' | 'document';  // derivata: document se documentLink è linked/unavailable
  documentLink: { state: 'none' | 'linked' | 'unavailable'; document: { id: string; name: string } | null };
  assetLink:    { state: 'none' | 'linked' | 'unavailable'; asset: { id: string; name: string } | null };
  state: 'active' | 'removed';
  version: number; createdAt: string; updatedAt: string; removedAt: string | null;
  permissions: Array<'read' | 'edit'>;
};
```

**Validazioni:**
- 422 `validation_error` con `fieldErrors` per: importo non intero, zero o negativo (secondo D3), oltre il limite; data inesistente (2026-02-29); valuta diversa da EUR; parametri sconosciuti o ripetuti.
- 409 `expense_version_conflict`, `expense_state_conflict` e `idempotency_conflict`.
- `documentId` e `assetId` non leggibili dal richiedente: 422 generico, senza rivelarne l'esistenza.

**Importi:** il frontend accetta «1.234,56» e «1234,5», li converte in centesimi senza passare per float e li mostra con `Intl.NumberFormat('it-IT', {currency:'EUR'})`.

**Somme:** il totale annuo è una somma intera lato server; nessun arrotondamento né conversione.

**Schema (suggerimento per Codex):**
- tabelle `HomeExpense`, `ExpenseHistory` ed `ExpenseRequest` (idempotenza), con FK Restrict verso Home, Account, Document e BoilerAsset;
- migrazione additiva sul solo DB `dimora_v5_product_dev`.

### 2.6 Casi di accettazione proposti

1. Spese vuota distinta da errore e da «nessuna spesa nell'anno scelto»; nessun totale finto con il servizio assente.
2. Creazione manuale con replay idempotente: stessa chiave e stesso body danno un solo record; body diverso dà 409.
3. Importi:
   - «0,01», «1.234,56» e «1234,5» diventano i centesimi corretti;
   - «12,345», negativo e testo libero vengono rifiutati sul campo, con il 422 del server autorevole;
   - il totale di 0,10 + 0,20 è esattamente 0,30.
4. Date: 2028-02-29 valida, 2026-02-29 rifiutata, 31/12 e 1/1 nell'anno giusto, nessuno slittamento di fuso.
5. La spesa documentata da un PDF M2 mostra il link al documento; l'originale non cambia (hash e versione). Se il documento non è più leggibile, il collegamento resta `unavailable` senza nome.
6. Il costo della caldaia appare una volta in Spese e una volta come riferimento nella scheda. Il totale non lo conta due volte. La storia tecnica e `confirmed` della caldaia non cambiano.
7. La modifica invia solo i campi cambiati e incrementa la versione; un `expectedVersion` vecchio dà 409 e «Rileggi i dati».
8. «Elimina dalla lista» porta a `removed`: esce dalla lista predefinita e dal totale e resta nella storia. L'esito ambiguo non mostra una rimozione locale.
9. Privacy:
   - owner e member non vedono le spese altrui, nemmeno nei totali;
   - un viewer legge solo le proprie e non scrive;
   - con la membership revocata, anche le spese già caricate spariscono, come in R2;
   - cambio casa o account: niente bozze né risultati dell'altro contesto;
   - URL con un ID di un'altra casa: 403.
10. Cambio annuo: i totali sono separati per `spentOn`; nessuna proiezione o media.
11. Testi: «Inserita da te» / «Collegata a un documento»; mai «pagata», «incassata» o «verificata»; nessun importo comunicato o stimato.
12. M2, M3/M4, H1 e H2 senza regressioni; Spese 404 non blocca il resto dell'app; nessuna chiamata AI.
13. Browser reale a 320/390 px e desktop, tastiera, dialogo con focus trap ed Escape; nessuna dichiarazione WCAG.

### 2.7 Ordine di implementazione proposto

1. **Codex**: decisioni D1–D8, poi il contratto `expenses-v1` congelato, la matrice dei test e la proprietà dei file.
2. **Codex**: schema e migrazione additiva, servizio con policy (filtro prima del conteggio), endpoint e test DB/HTTP. Usa la base H1, che ha la stessa forma: versioni, storia, idempotenza.
3. **Claude**, in parallelo da subito dopo il punto 1, con un sync dedicato:
   1. tipi, client e chiavi `['account', id, 'home', id, 'h3', …]`;
   2. parsing e formattazione degli importi con test unitari;
   3. backend simulato nell'harness;
   4. Spese: lista, totale, modulo, dettaglio e storia;
   5. ingressi da Documento, Caldaia e Casa;
   6. test mock e suite reale con flag `V5_EXPENSES_API`, nel quarto gruppo del runner.
4. **Claude**, prima o insieme a H3, in commit separato: correzioni R1 e R2 di H2, che toccano guard e cache condivisi.
5. **Codex**: integrazione, suite reali, browser e aggiornamento di ADR, changelog e roadmap.

### 2.8 Decisioni da lasciare al committente

| ID | Domanda | Proposta di default (non decisa) |
|---|---|---|
| D1 | Spese **personali al creatore** (D-01, come H1) o condivisibili con la casa (come la visibilità M2)? | Personali in H3a; condivisione dopo, con regole esplicite per i totali |
| D2 | La casa ha un «totale casa» comune a più membri? | No in H3a: solo il «mio» totale; evita di sommare costi non confermati da altri |
| D3 | Importo zero ammesso (es. intervento in garanzia)? | No: zero → 422; l'intervento senza costo è memoria della caldaia, non una spesa |
| D4 | Data futura ammessa (spesa programmata)? | No: una spesa è sostenuta; il futuro è un'attività H1. Da confermare |
| D5 | Spese ricorrenti e bollette (Economia B) in H3b, con quale granularità (mensile o periodo libero)? | H3b, solo con ipotesi visibili e senza proiezioni nascoste |
| D6 | Rate condominiali e «Segna come pagata da me» (A-03) | Solo quando esisteranno importi comunicati da Amministratori; mai inseriti a mano come «rata» |
| D7 | Rimozione: logica con ripristino, logica senza ripristino o cancellazione fisica? | Logica con «Ripristina»; cancellazione fisica legata a export e retention, da decidere |
| D8 | Le spese vanno nell'export prima della vendita (CV-01)? | Sì, quando esisterà l'export della Home; H3 non lo implementa |
| D9 | Limite massimo dell'importo (tecnico, non commerciale) | Per esempio 9 999 999,99 €, solo come argine agli errori |
| D10 | Categorie (manutenzione, utenze, tasse)? | Nessuna in H3a: il catalogo non definisce categorie approvate e non vanno inventate |

**Incertezze dichiarate:**
- Le specifiche indicano direzione e perimetro (Economia V1 opzione B, M-12), non un modello dati né regole fiscali. Nessun requisito normativo o fiscale è stato aggiunto.
- Il prototipo v9 è riferimento di flusso, non di dati: per esempio il campo «ricorrente mensile» lì non ha regole di periodo. Non va trasformato in requisito senza D5.

---

## Limiti di questa consegna

- La revisione H2 si basa sulla lettura del codice. R1–R5 riportano passaggi deterministici ma non sono stati eseguiti in questa fase: niente modifiche al codice, niente servizi reali.
- Ho letto le specifiche dei file Markdown nel checkout, nel master e in `outputs`, e il prototipo v9 `app.js`. Non ho aperto gli archivi zip.
- Il contratto `expenses-v1` è una bozza di lavoro, non un contratto approvato. Nessun file H3 è stato implementato.
