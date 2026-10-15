# C1a frontend — condivisione selettiva documentale (sharing-v1) · consegna 15/10/2026

Incarico: `Dimora-V5-incarico-Claude-C1-frontend.md`. Ho letto in sola lettura dal master `docs/v5/sharing-api-contract.md` (sharing-v1, congelato) e `docs/v5/c1-ux-arbitrato-20261015.md`.

Lavoro fatto solo in `frontend-v5`, checkout `Dimora-V5-Claude`, branch `claude/dimora-v5-identity`. Nessun push. Non ho toccato backend, schema, contratti, documenti root, `.env` o `docs/v5/backend-status.md`, che resta non tracciato.

**Il backend sharing-v1 reale non esiste ancora nel master.** Tutte le prove usano un backend **simulato** in memoria (`src/test/fakeSharing.ts`). Il runtime non contiene nessun fake né fallback. Nessuna dichiarazione WCAG.

## Commit

| Commit | Contenuto |
|---|---|
| — (nessun allineamento) | Ho confrontato i file di `frontend-v5/src`, `scripts`, `tests`, `package.json` e `vite.config.ts` con il master `1649a3b`: nessun delta. I cambi del master successivi alla mia consegna sono documenti o HTML standalone, quindi non serve un commit di sync. |
| `e80c132` | Implementazione C1a, fake, test, flag `--c1` dell'harness |
| (questo report) | Report e quattro screenshot |

File di `e80c132`:

**Nuovi:**
- `src/api/sharingTypes.ts`: tipi esatti del contratto;
- `src/api/sharingClient.ts`: chiamate, validazioni e query key, fuori dall'entry;
- `src/lib/sharing.ts`: etichette, messaggi, normalizzazione del codice, `withoutSecret`;
- `src/sharing/hooks.ts`: letture, polling, scritture idempotenti, azzeramento su 403;
- `src/sharing/components.tsx`;
- `src/routes/SharingPages.tsx`: mittente;
- `src/routes/ReceivedPages.tsx`: destinatario;
- `src/routes/sharing.test.tsx`: 13 test;
- `src/test/fakeSharing.ts`.

**Modificati:**
- `src/api/client.ts`: solo tre metodi di trasporto pubblici, `callJson`, `callPage` e `callBinary`, con stessi header, CSRF, errori e controlli binari;
- `src/routes/routes.tsx`: sei rotte differite;
- `src/components/AppShell.tsx`: link «Consegne ricevute»;
- `src/routes/HomePages.tsx`: scheda «Condivisioni» in Casa;
- `src/routes/DocumentDetailPage.tsx`: scorciatoia «Condividi…»;
- `src/test/fakeBackend.ts`: aggancio del fake;
- `scripts/mock-api.ts`: flag `--c1`.

## Percorsi e stati implementati

**Rotte.** Gli URL esistenti sono invariati; le nuove pagine sono tutte differite.
- Sotto `HomeLayout`: `/home/:homeId/condivisioni`, `/condivisioni/nuova` (con `?documento=` facoltativo) e `/condivisioni/:shareId`.
- A livello account, dentro `RequireAccount` ma fuori da `HomeLayout`: `/consegne`, `/consegne/codice` e `/consegne/:shareId`. Funzionano con zero case: nessun logout e nessuna casa obbligatoria per ricevere.

**Ingressi.**
- Scheda «Condivisioni» in Casa.
- «Condividi…» nel dettaglio documento, se la persona ha il permesso di modifica sulla casa. Se il file sia suo lo decide il server nel picker.
- Link «Consegne ricevute» nell'area account dell'intestazione, visibile anche senza case. A mobile mostra solo l'icona, con nome accessibile.
- Le quattro sezioni Casa/Attività/Documenti/Spese sono invariate; non c'è una quinta tab.

**Mittente.**
1. **Contenuti.** `sharing-documents` con paging reale «Carica altri» e nessun totale.
   - Idoneità e motivo vengono dal server (`not_uploader`): i file altrui sono disattivati con la spiegazione, i privati altrui non arrivano mai.
   - Nessuna selezione implicita. Il documento di partenza è evidenziato e mai spuntato; se è in una pagina non ancora caricata, la pagina lo dice («usa Carica altri») invece di cercarlo in silenzio.
   - Contatore `aria-live`, limiti `maxDocuments` e `maxBytes` dalle capabilities, riquadro «Mai inclusi».
   - Nessuna etichetta di «categoria economica»: M2 non fornisce il dato. L'avviso sul file completo vale sempre.
2. **Destinatario.**
   - *Persona della casa:* elenco `sharing-recipients` con nome ed email. Il 422 per più di 100 persone produce un messaggio, mai una lista troncata.
   - *Persona esterna:* spiegazione del percorso con codice, confronto e accettazione.
   - Se un file è già «Persone della casa» e il destinatario è un membro, un avviso dice che la revoca non toglie quella visibilità.
3. **Durata** da `limits.durationDays`, con 7 proposto.
4. **Controllo.** `POST share-previews` mostra il manifesto del server:
   - destinatario, istante esatto `expiresAt`, «Controllo valido fino alle …» (`validUntil`), permessi;
   - avviso «file completi, anche importi, IBAN e dati personali; Dimora non li oscura e non li riconosce»;
   - **una casella per ogni file**, nessuna preselezionata; `acknowledgedDocumentIds` = tutti gli ID del manifesto;
   - nessun hash, ID o impronta in pagina.

   Ogni modifica a contenuto, destinatario o durata azzera anteprima e conferme. Un controllo scaduto, rilevato sul client da `validUntil` o con 409 `share_preview_expired` dal server, disattiva «Crea» e propone «Prepara un nuovo controllo», con conferme da rifare.
5. **Uscita.** Lasciare la preparazione con una selezione apre una conferma (`useBlocker`), che vale anche per l'indietro del browser.

**Dopo la creazione.**
- *Membro:* si va al dettaglio, in stato «Invito da accettare».
- *Esterno:* nella stessa pagina compare «Invito creato», con il **codice** a gruppi, la scadenza e la spiegazione che lasciando la pagina non si recupera.
- Il codice vive **solo nello stato del componente**: mai URL, router state, storage, log, cache delle query o delle mutazioni (`withoutSecret` prima di ogni `setQueryData`; scritture fuori da TanStack `useMutation`).
- Su un retry la risposta ha `code:null`, e la pagina mostra «Codice non recuperabile».

**Dettaglio mittente, per stato.**
- `awaiting_pairing`: «Genera un nuovo codice» con dialogo e `expectedVersion`, mai automatico.
- `awaiting_confirmation`:
  - profilo dichiarato «non verificato, può imitare quello atteso» e codice di confronto con istruzioni (recapito già noto);
  - casella **non preselezionata**, componente con chiave `claimId:version`, quindi azzerata se il claim cambia;
  - conferma con body `{expectedVersion, claimId, comparisonCode, confirmRecipient:true}`;
  - «Non è la persona giusta: nuovo codice».
- `pending`: «In attesa che … accetti; accettare non significa aver letto».
- `accepted`, `declined` (Rifiutata), `revoked`, `expired` e `unavailable` hanno testi distinti.
- **Revoca:** dialogo che avvisa che le copie scaricate non si ritirano e che chi è membro continua a vedere in Documenti i file «Persone della casa».

**Destinatario.**
- **Elenco** paginato.
- **Codice:**
  - normalizzazione con spazi o trattini e maiuscole; validazione a 10 caratteri prima di qualsiasi POST;
  - consenso `discloseAccount` esplicito, non preselezionato: l'invio è disattivato senza;
  - messaggi generici per codice invalido, usato o scaduto (403) e per troppi tentativi (429);
  - il codice va solo nel body.
- **Dettaglio:**
  - `awaiting_confirmation`: solo il codice di confronto, nessun documento né casa;
  - `pending`: Accetta / Rifiuta, con dialogo per il rifiuto;
  - `accepted`: elenco file e «Scarica», con download binario dal trasporto comune e `saveBlob`;
  - terminali: «Non più disponibile», senza nomi residui.

**Regole trasversali.**
- **Scritture:** idempotenti con `Idempotency-Key`. Esito ignoto (rete o 5xx): «Riprova invio» con stessa chiave e stesso body, modulo bloccato e nessun nuovo invio con dati diversi. 409 propone «Rileggi lo stato». Le risposte arrivate dopo logout o cambio account vengono ignorate.
- **403 su un dettaglio:** la query viene azzerata (`resetQueries`), così i dati letti prima non restano in cache. Non diventa mai elenco vuoto o consegna riuscita.
- **Logout o cambio account:** tutta la cache `['account', id, …]` si svuota come per gli altri moduli.
- **Polling di sole letture** ogni 10 s, a pagina visibile (`refetchIntervalInBackground:false`). Si ferma su stato finale, 403 e logout. Il mittente rilegge solo negli stati di attesa (`awaiting_pairing`, `awaiting_confirmation`, `pending`); il destinatario solo in `awaiting_confirmation`.
- **Servizio senza sharing-v1** (404 su capabilities o liste): la pagina dice «non ancora attiva su questo servizio». È il caso del backend attuale.

## Comandi ed esiti

Eseguiti in `frontend-v5`.

| Comando | Esito |
|---|---|
| `npm run typecheck` | OK |
| `npm run lint` | OK, exit 0 |
| `npx vite build` | OK, entry **487,68 kB** (gzip 148,70); nessun avviso > 500 kB |
| `vitest --project mock src/routes/sharing.test.tsx` | **13/13** |
| `npm test`, suite completa, una volta | **28 file, 329/329** (110,5 s) |

Dopo la suite completa ho cambiato solo `display:block` sull'occhiello delle pagine di condivisione, una correzione visiva emersa dagli screenshot. Su quella modifica ho rieseguito typecheck, eslint del file e build; la suite non l'ho ripetuta.

Durante lo sviluppo:
- un test passava nel file intero e falliva da solo: il primo caricamento del modulo differito, trasformato da Vite in test, superava i 5 s. Attesa portata a 15 s solo per quel primo ingresso;
- due test avevano navigazioni consecutive senza attendere la pagina intermedia: corretti.

Il resto dei fallimenti iniziali ha portato a modifiche reali del codice: l'etichetta «Codice» con l'aiuto dentro la label, e il documento di partenza in una pagina successiva.

I 13 test (`sharing.test.tsx`):

**Preparazione e manifesto**
1. Picker: nessuna selezione, origine evidenziata e non spuntata (in seconda pagina, con avviso), file altrui disattivati con motivo, privati altrui e altra casa assenti, paging con cursore.
2. Manifesto del server con conferma di ogni file: una modifica invalida controllo e conferme. Body esatti di preview e create; nessun ID o impronta in pagina.
3. Controllo scaduto: 409 dal server, «Crea» disattivato, nuovo controllo con conferme da rifare, nessun invito.
4. Lasciare la preparazione: dialogo «Resta» oppure «Esci senza salvare», nessun POST.

**Persona esterna, codice e abbinamento**

5. **Risposta persa** alla creazione: stessa chiave e body, un solo invito, `code:null` → «Codice non recuperabile», nessuna rotazione automatica. Rotazione esplicita con `{expectedVersion:1}`. Codice assente da URL, storage e cache delle query; non si rivede lasciando la pagina.
6. **Esterno senza case** (completo):
   - consenso obbligatorio, body `{code, discloseAccount:true}`;
   - il claim non mostra documenti, e la chiamata diretta all'API del file risponde 403;
   - il mittente vede il profilo «non verificato» e lo stesso codice di confronto, con casella non preselezionata;
   - body della conferma esatto; stato `pending`;
   - accettazione e download riuscito, senza casa, spese o attività in pagina.
7. Un **nuovo claim** dopo un nuovo codice azzera la casella del confronto; l'account del claim precedente non vede più nulla.
8. Codice errato, che si ferma sul client prima del POST; codice invalido generico; 429 all'undicesimo tentativo. Ogni invio è un clic esplicito.

**Stati finali, privacy e contesti**

9. Membro: Rifiutata distinta da Revocata. Revoca con i testi su copie e M2; il destinatario non vede dati residui.
10. Scadenza calcolata alla lettura; fonte cancellata → «Non più disponibile», senza nomi, per mittente e destinatario.
11. Due case: condivisioni e picker restano separati. Nessun campo economico, di attività o di bozza nei body delle chiamate di condivisione.
12. **Risposta tardiva dopo logout:** nessun «Invito creato» né codice per l'account successivo, e nessuna query di condivisione in cache.
13. Errori reali: elenco consegne in 503 → avviso, non elenco vuoto. Servizio senza C1 → «non ancora attiva».

## Browser (harness mio, API simulata)

Ho servito la build di produzione con `vite preview` sulla **5175**, con il mock `scripts/mock-api.ts --seed --s1 --s1c --c1` sulla **3101**. Mai 3001/5174/55432 né il DB del master. La configurazione temporanea in `.claude/launch.json` l'ho ripristinata con `git checkout`.

Ho guidato Chrome headless via CDP con clic e tasti reali. Questa è una prova del **browser reale con API simulata**, non dell'API reale.

Ultimo giro, su un mock appena avviato: **25 controlli OK, 0 falliti, nessun errore in console**.

Nei giri precedenti:
- un controllo è fallito per una corsa nello script: leggeva l'elenco prima che arrivasse;
- un altro perché il mock in memoria conteneva già la condivisione del giro prima.

Nessuno dei due era un difetto del codice.

1. **Giulia, mittente.**
   - Da Casa ad «Apri le condivisioni»: elenco vuoto dichiarato.
   - Picker senza selezioni; file di Marco disattivato; Spazio da tastiera seleziona.
   - L'indietro del browser apre il dialogo, «Resta» conserva la selezione.
   - Esterna, controllo con «Crea» disattivato fino alla conferma; a 390 e 320 px nessuno scorrimento orizzontale.
   - Creato l'invito: codice di 10 caratteri, assente da URL e storage. Lasciata la pagina non si rivede.
2. **Luca, esterno senza case.**
   - L'ingresso porta a `/case`; il link «Consegne ricevute» è nell'intestazione.
   - Codice con trattino e minuscole; invio disattivato senza consenso.
   - Dopo il claim compare solo il codice di confronto di 8 caratteri, senza documenti; il codice iniziale non è nell'URL.
3. **Giulia, confronto.**
   - Con accesso diretto al dettaglio vede lo stesso codice di confronto e il profilo «non verificati».
   - Casella non preselezionata e conferma disattivata; dopo la conferma l'invito è ancora da accettare.
   - La ricarica del dettaglio funziona.
4. **Luca, accettazione.**
   - Con accesso diretto all'invito non vede titoli, indirizzo o casa. Dopo «Accetta», il download risponde **200** dal percorso del file della consegna.
   - Nessuna casa, spesa o attività in pagina; la ricarica funziona; a 320 px nessun overflow.
5. **Revoca.** Il dialogo avvisa delle copie scaricate ed Esc lo chiude; dopo la conferma il destinatario vede «Non più disponibile», senza nomi.

Risposte API osservate: capabilities, shares, sharing-documents, sharing-recipients, share-previews 201, shares 201, code-claims 201, received-shares, confirm-pairing, accept, file 200, revoke.

Screenshot in `docs/screenshots/c1-frontend-20261015/`:
- `01-controllo-manifesto-390.png`: controllo e manifesto del server a 390 px;
- `02-esterno-codice-confronto-390.png`: esterno dopo il claim, solo codice di confronto;
- `03-mittente-confronto-1280.png`: il mittente confronta, casella non spuntata;
- `04-consegna-accettata-320.png`: consegna accettata con download, 320 px.

Lo screenshot 01 è a pagina intera: la barra inferiore fissa compare a metà immagine per via della cattura oltre il viewport.

## Bundle

| | Entry JS | Note |
|---|---|---|
| Prima di C1 (`3c250c3`) | 485,12 kB (gzip 148,14) | |
| Dopo C1 | **487,68 kB** (gzip 148,70) | +2,56 kB |

I +2,56 kB vengono da:
- sei definizioni di rotta differita;
- link nella shell;
- scheda in Casa;
- tre metodi di trasporto del client.

Una prima versione con i metodi sharing dentro `ApiClient` portava l'entry a 491,58 kB: li ho spostati in `sharingClient.ts`, che viaggia con le pagine.

Chunk nuovi:
- `SharingPages` 26,89 kB;
- `ReceivedPages` 9,82 kB;
- un chunk comune `hooks` da 10,89 kB.

Nessun fake nel bundle: ho cercato `FakeBackend|FakeSharing|issuedCodes` in `dist/assets/*.js` senza trovarne.

## Divergenze e punti del contratto da chiarire (per Codex)

Non ho cambiato endpoint o tipi. Le ipotesi che ho dovuto fare:

1. **`recipient` del mittente dopo la conferma esterna.** Ho supposto che diventi il `Person` dell'account abbinato (prima: `null`, con il claim in `pairing.claim`). Va confermato.
2. **`comparison` nel GET del destinatario** in `awaiting_confirmation`. Ho supposto che ci sia, così dopo una ricarica il codice di confronto resta visibile. Se arriva solo nella risposta del claim, la pagina mostra un testo di riserva senza codice.
3. **Scadenza del claim prima della conferma.** Il contratto non dice in che stato si torna. Il client gestisce il 409 con «Rileggi» e il mittente può generare un nuovo codice.
4. **Il documento di partenza può stare in pagine successive** di `sharing-documents`. Proposta: un parametro di filtro o messa in evidenza per `documentId` (solo idoneità e metadati già leggibili). Oggi la pagina lo dichiara e propone «Carica altri».
5. **Mancano gli istanti degli eventi** (`acceptedAt`, `declinedAt`, `revokedAt`): la UI non può dire «accettata il …». Proposta additiva, se utile; nessun «letto».
6. **`visibility` non è in `Item`** di Share e Preview. L'avviso «già visibile a Persone della casa» si basa sul picker, e nel dettaglio non è ricostruibile.
7. **503 `storage_unavailable` su POST** è trattato come esito ignoto (riprova con la stessa chiave): sicuro con l'idempotenza, ma va confermato.
8. **404 di capabilities o liste** = funzione non attiva sul servizio, come economy-v1.

## Limiti

- Nessuna prova contro l'API o il DB reali: il backend sharing-v1 non c'è ancora. Il fake implementa le regole principali del contratto: stati calcolati alla lettura, codice solo nella risposta che lo genera, replay a `code:null`, claim atomico, confronto, rate limit per account e codice, proiezione `unavailable` vuota. Non ne prova sicurezza, hash, lock o concorrenza.
- Il rate limit per IP e quello globale non sono simulati.
- Dal destinatario l'«altra Home» non si vede per costruzione. L'isolamento tra due case l'ho provato lato mittente.
- I polling a 10 s sono verificati solo nella configurazione delle query, non osservati nel browser.
- Lo stato «Ultimo aggiornamento non riuscito», che segnala un dato forse vecchio, non è coperto da test.
- La suite non è stata ripetuta dopo la correzione visiva finale dell'occhiello.
- Nessuna prova con screen reader o tecnologie assistive: nessuna dichiarazione WCAG.
