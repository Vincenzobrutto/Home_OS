# Home — tre compiti, consegna Claude · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Home-tre-compiti-20261016.md`.

**Non ho implementato Casa né la guida al primo accesso.** Casa (`HomePages.tsx`), i riepiloghi, `AppShell.tsx` e il segnale delle condivisioni da confermare restano di Codex e non sono stati toccati. La guida è rinviata dal committente. Nessun push.

## Baseline, branch, percorso

| Voce | Valore |
|---|---|
| Baseline | `1711428a4296352cb332dc092c4a964bdf234a4a` |
| Worktree nuovo | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-Home-consolidamento`, creato con `git worktree add` dal repository master |
| Branch | `claude/home-consolidamento-20261016` |
| Checkout master e vecchio checkout `Dimora-V5-Claude` | Non modificati |

Nel vecchio checkout, i dirty `docs/v5/backend-status.md` e `video-promo/` sono preservati. Ho modificato temporaneamente il suo `.claude/launch.json` per avviare il server e l'ho ripristinato con `git checkout`.

**Fetch e confronto.** `git fetch origin` eseguito: HEAD è 173 commit avanti e 0 indietro rispetto a `origin/main`, e non esiste un `origin/dev/...`. Nessun aggiornamento remoto da integrare, nessun merge, `main` non toccato.

**Dipendenze.** `npm ci` dal lockfile, senza modifiche a manifest o lockfile. npm ha bloccato lo script di `postinstall` di esbuild (approvazione degli script); non l'ho approvato. esbuild funziona già con il pacchetto binario `@esbuild/win32-x64`: verificato con una trasformazione e con il typecheck.

## Commit (soli file autorizzati)

| SHA | Compito | File |
|---|---|---|
| `ac42065` | 1 — ingresso codice senza case (HOME-CONS-001) | `src/routes/HomesPages.tsx`, `src/routes/createHome.test.tsx` |
| `56e498c` | 2 — istruzioni prima del codice di abbinamento (HOME-CONS-010) | `src/routes/SharingPages.tsx`, `src/routes/sharing.test.tsx` |
| (commit documentale) | 3 — verifica e consegna | `docs/home-consolidamento-20261016/CONSEGNA.md` e `screenshots/` |

Nessun commit di allineamento o merge di Codex.

## Comportamento

**Compito 1.** In `HomesPage`, nello stato di successo con zero case:
- h1 «Inizia con Dimora», con un sottotitolo che distingue le due intenzioni;
- **prima** del modulo, la scheda «Hai ricevuto un codice?»:
  - spiega che non serve creare una casa e che la consegna mostra solo i file scelti, per un periodo limitato, senza accesso alla casa di chi li invia;
  - azioni «Inserisci il codice» verso `/consegne/codice` (la rotta esistente in `routes.tsx`, la pagina `ClaimCodePage`) e «Consegne ricevute» verso `/consegne`;
- sotto, la sezione con h2 «Crea la tua prima casa» e il modulo invariato: validazione, Idempotency-Key, retry e 409.

Cosa resta invariato o escluso:
- nessun reindirizzamento, nessuna richiesta prima della scelta e nessun codice in URL o storage;
- caricamento ed errore dell'elenco case restano invariati: mostrano `Loading` o `ErrorState`, senza scheda né modulo;
- `HomeEntry` (una casa → Casa) e il selettore con più case sono invariati.

**Compito 2.** In `SharingPages`, l'aiuto «Prima di generare il codice» compare **solo per la persona esterna** in due punti, prima che la validità parta:
- nel passo di controllo, subito sopra «Crea l’invito»;
- nel dialogo «Generare un nuovo codice?».

Testo: il codice di abbinamento vale 15 minuti da quando si preme il pulsante; prima la persona prepara il suo account Dimora (lo crea o accede) e apre «Consegne ricevute» → «Ho ricevuto un codice», senza creare una casa; si genera il codice quando è pronta; poi si confronta il codice di confronto tramite un recapito già noto.

- **Durata.** Nel controllo viene da `caps.limits.codeMinutes`. Nel dettaglio leggo le capabilities con l'hook esistente `useSharingCapabilities`: è una lettura in cache, senza API nuove. Se il dato non è disponibile il testo dice «pochi minuti», senza inventare un numero.
- **Protocollo invariato:** scelta del destinatario, manifesto, confronto, approvazione, accettazione, scadenza, revoca, TTL, lunghezza del codice, polling, permessi e download. Nessuna promessa di email, push o verifica automatica.

## Comandi ed esiti

Eseguiti in `frontend-v5` del worktree.

| Comando | Esito |
|---|---|
| `npm ci` | OK, script di postinstall bloccati (vedi sopra) |
| `npm run typecheck` | OK |
| `vitest --project mock` su `createHome`, `auth`, `routing`, 1ª esecuzione | 26/28 |
| idem, 2ª esecuzione | **28/28** |
| `vitest --project mock` su `sharing`, 1ª esecuzione | 15/16 |
| idem, 2ª esecuzione | **16/16** |
| `eslint` sui file modificati, prima di ogni commit | OK |
| `git diff --check`, prima di ogni commit | OK |
| `npm run build`, una volta sul risultato finale | OK, `✓ built in 6.94s`, entry 488,89 kB (gzip 149,02); era 487,79 kB a `1711428`; nessun avviso oltre i 500 kB |
| `npm run lint`, una volta sul risultato finale | OK, exit 0 |

**Test effettivamente eseguiti: 44 casi distinti** (28 + 16), 5 nuovi:

| File | Casi nuovi |
|---|---|
| `createHome.test.tsx` | 4: zero case e navigazione senza POST; errore dell'elenco senza scheda né modulo; caricamento senza scheda fino alla risposta; selettore con più case senza scheda |
| `sharing.test.tsx` | 1: aiuto prima di «Crea l’invito» e nel dialogo, nessun POST finché non si conferma, assente per la persona della casa |

Non ho lanciato la suite completa: i cambiamenti sono limitati a due pagine e ai loro test.

I fallimenti intermedi erano tutti nei **test nuovi**, non regressioni:
- il link «Consegne ricevute» esiste anche in testata, quindi la ricerca va fatta dentro la scheda;
- lo svuotamento della cache era troppo fragile: il test ora blocca la prima lettura delle case;
- il test di condivisione apriva una seconda preparazione con la prima aperta, e il dialogo «Lasciare la preparazione?» scattava correttamente.

Nessun timeout aumentato, nessun controllo disattivato. Le asserzioni esistenti non sono cambiate: «Crea la tua prima casa» resta come heading (h2), quindi `auth.test` e `routing.test` passano senza modifiche.

## Compito 3 — verifica

**Ambiente.** Il backend reale (API 3001) rifiuta le richieste dall'origine del mio server (`csrf_invalid` su POST da `127.0.0.1:5178`): accetta solo il frontend master. Non ho falsificato l'header `Origin` né modificato configurazioni.

Ho quindi usato un **harness simulato**:
- `scripts/mock-api.ts --seed --c1` del worktree sulla porta **3101**;
- Vite del worktree sulla **5178**;
- account di prova del seed del progetto: Luca senza case, Giulia mittente.

Il browser è Chrome headless con profilo separato, guidato via CDP con clic e tasti reali. Due strumenti li ho impostati via script, cioè la viewport e il ritorno con `history.back()`; i click e i tasti sono reali.

**Processi.** Il server l'ho avviato e fermato con lo strumento di anteprima: le porte 3101 e 5178 risultano rilasciate. 5174, 3001 e 55432 del master non sono stati toccati. Il Chrome headless di prova (porta 9444, profilo nello scratchpad) l'ho chiuso a fine verifica.

Esito: **27 controlli OK, 0 falliti, console senza errori.**

| Scenario | Ambiente | Esito | Evidenza |
|---|---|---|---|
| Zero case: h1 «Inizia con Dimora», scheda codice prima del modulo | harness, browser | OK | `01-zero-case-1280.png` |
| 390 px e 320 px: nessun overflow, «Inserisci il codice» nella prima schermata | harness, browser | OK | `02-zero-case-390.png`; misura `scrollWidth = innerWidth` |
| Tastiera: Tab dal titolo → «Inserisci il codice» → «Consegne ricevute» → nome → indirizzo → «Crea casa»; Invio sul link → `/consegne/codice` | harness, browser | OK | log CDP |
| Ritorno alla pagina case con l'indietro del browser e con il marchio «Dimora, le mie case» | harness, browser | OK | log CDP |
| Codice non valido (`ABCDE-FGHJK`): messaggio generico, nessun dettaglio | harness, browser | OK | log CDP |
| Aiuto prima del codice nel controllo esterno: testo, 15 minuti, posizione prima di «Crea l’invito»; 390/320 senza overflow | harness, browser | OK | `03-aiuto-codice-1280.png`, `04-aiuto-codice-390.png` |
| Abbinamento ancora da approvare: destinatario in «In attesa del mittente», nessun documento; `/case` resta la pagina senza case | harness, browser | OK | log CDP (nessuno screenshot: c'è il codice di confronto) |
| Dialogo «Generare un nuovo codice?» con aiuto, 390 px senza overflow, Esc chiude senza generare | harness, browser | OK | `05-dialogo-nuovo-codice-390.png` |
| Risorsa non più disponibile: revoca del mittente, il destinatario vede «Consegna non disponibile» senza nomi | harness, browser | OK | log CDP |
| Caricamento ed errore dell'elenco case non diventano «zero case» | test jsdom con backend simulato | OK | `createHome.test.tsx` |
| Nessun POST di creazione casa passando dalla scheda codice | test jsdom; nel browser dedotto dal fatto che il destinatario resta senza case | OK | `createHome.test.tsx`; log CDP |
| Codice scaduto | — | **non eseguita** | Il TTL di 15 minuti non è controllabile dalla UI dell'harness; non ho alterato l'orologio. Per il contratto `sharing-v1`, `/sharing/code-claims` risponde con lo stesso 403 generico `share_unavailable` dei codici non validi, quindi la UI mostra lo stesso messaggio. È una deduzione, non una prova |
| Backend reale con DB V5 dedicato | — | **non eseguita** | L'origine della mia porta viene rifiutata dal CSRF/Origin del backend; aggirarlo non è ammesso |

Screenshot in `screenshots/`, tutti dall'harness simulato con dati del seed. Nessun codice di abbinamento o di confronto visibile.

Nessuna dichiarazione WCAG, nessuna prova con screen reader, dispositivi reali o utenti reali.

## Evidenze proprie e deduzioni

- **Proprie:** test jsdom con backend simulato, build e lint, browser sull'harness simulato.
- **Dedotte:** comportamento con codice scaduto; comportamento con il backend reale, perché UI e client sono gli stessi del master e il backend reale è quello già verificato da Codex per C1.

## Problemi aperti e note per Codex

1. **Server di verifica del worktree.** Il backend reale accetta solo l'origine del master. Per future verifiche dal worktree serve una configurazione di origini consentite per lo sviluppo, decisa da Codex. Non l'ho modificata.
2. **Testo del dialogo di rigenerazione.** Nel dettaglio è ora visibile anche nello stato `awaiting_confirmation`, raggiunto con «Non è la persona giusta: nuovo codice». È coerente: anche lì parte un nuovo codice di 15 minuti.
3. **Entry +1,10 kB** per la scheda in `HomesPages`, che sta nell'entry. Se interessa, la pagina senza case si potrebbe caricare in differita: richiede di toccare il router, quindi la decisione è di Codex.
4. **Documenti condivisi.** Proposte di voci:
   - backlog: HOME-CONS-001 e 010 chiusi lato frontend;
   - changelog: «pagina senza case con ingresso codice; istruzioni prima del codice di abbinamento».

   Nessuna decisione di prodotto nuova.
