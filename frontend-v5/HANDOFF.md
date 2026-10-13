# HANDOFF — V5-DEV-003 (frontend identity-v1)

Autore: Claude Code. Data: 13/10/2026. Destinatario: Codex (review, integrazione, test end-to-end).

## Checkout

- Percorso effettivo: `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude` (checkout principale del repository dedicato, nessun worktree aggiuntivo).
- Branch: `claude/dimora-v5-identity`.
- Base concordata verificata: `101f053e0a9465ddca80563edacfd5370e125139` (HEAD all'avvio, albero pulito).
- Commit di consegna (solo `frontend-v5/**`, sopra la base):
  1. `b00f602edb678473b2f0a938973d768861d64e6e` — scaffold e prima verticale.
  2. commit successivo — decisioni del committente (ingresso diretto con una sola casa, font). Lo SHA non può stare nel file che lo genera: `git log -2 -- frontend-v5`.
- Remoto raggiungibile: eseguito solo `git fetch origin`. `origin/main` (cdbb318) non contiene la base V5; nessun pull/rebase/merge/push, come da ticket.

## Cosa è stato fatto

- Scaffold nuovo React 19 + TypeScript 5.9 + Vite 7, React Router 7 (library mode), TanStack Query 5, CSS Modules; CSS globale solo token (`src/styles/tokens.css`) e reset (`src/styles/global.css`). Nessun import da `frontend/`, `app.js`, `App.tsx`, `theme.ts`, `api.ts` (regola ESLint `no-restricted-imports`).
- Vite: host `127.0.0.1`, porta `5174`, `strictPort`, proxy `/api/v5` → `http://127.0.0.1:3001` (`changeOrigin: false`, il server vede Origin/Host del frontend). Stesso per `vite preview`.
- Client API tipizzato (`src/api/client.ts`) sui tipi del contratto (`src/api/types.ts`):
  - URL relativi, `credentials: 'include'`, `cache: 'no-store'`; nessun token in storage.
  - CSRF solo in memoria da `GET /session`; `X-CSRF-Token` su ogni POST (login/register/logout inclusi); se manca il token lo chiede prima della mutazione.
  - Dopo login/register: pulizia cache privata e nuova `GET /session` (sessione/CSRF ruotati).
  - Errori: busta del contratto → `ApiError{kind:'http', status, code, fieldErrors, requestId}`; rete rifiutata, risposta non-JSON, 2xx fuori forma, 502/503/504 → `kind:'service'`. Mai dati vuoti o demo.
- Sessione e cache (`src/session/`):
  - Chiavi `['account', accountId, 'homes']` e `['account', accountId, 'home', homeId, 'detail']`.
  - 401 su richiesta protetta: annulla richieste pendenti, rimuove cache privata, sessione anonima, nuovo CSRF, ritorno al login con `next`; nessun retry automatico (nessun loop).
  - Logout: 204 (o 401 = già scaduta) → login **senza** `next`, cache privata rimossa, nuova sessione/CSRF. Se il server non conferma, banner d'errore e sessione considerata ancora attiva.
  - Cambio account rilevato anche da altra scheda (sessione riletta al focus della finestra) → cache privata rimossa.
  - Stato locale (form, bozze) azzerato al cambio di account e di casa (`key` per account/casa); nessuna bozza persistente.
  - Nessun retry automatico delle query; ogni errore di servizio ha «Riprova».
- Rotte: `/` = ingresso (anonimo → `/accedi` senza `next`; con account legge le case: **una sola casa → `/home/:id/casa` direttamente**, zero o più → `/case`); dopo il login senza `next` si passa da `/`; `/accedi`, `/registrati` (solo anonimi); `/case` (elenco esplicito anche con una sola casa, raggiungibile da «Cambia casa»: 0 case = onboarding con form, ≥1 = scelta); `/case/nuova`; `/home/:homeId` → `/home/:homeId/casa`; `/home/:homeId/{casa,attivita,documenti,spese}`; 404. Il contesto casa viene solo dall'URL ed è sempre verificato con `GET /homes/:homeId`.
- Casa: nome, indirizzo, ruolo, permessi in italiano. 403 → «Accesso non consentito» senza alcun dato della casa; mai trasformato in elenco vuoto.
- Attività, Documenti, Spese: pagine «Non ancora disponibile» (lucchetto in nav laterale e inferiore, testo per lettori di schermo), nessun dato mostrato o salvato. Agenzie/Amministratori: voci non navigabili con lucchetto, nessuna rotta.
- Registrazione: banner «Solo sviluppo locale», hint password 12–128 con spazi conservati, pulsante Mostra/Nascondi.
- Creazione casa con `Idempotency-Key` (UUID in memoria): stessa chiave finché la richiesta non riesce, quindi «Riprova» dopo esito ignoto non duplica; se i dati cambiano e il server risponde 409, banner «Richiesta in conflitto» con «Controlla le mie case» o «Invia come nuova richiesta» (nuova chiave).
- Accessibilità di base: skip link, label/hint/errori collegati (`aria-describedby`, `aria-invalid`), focus sul primo campo errato, focus sul titolo della pagina dopo ogni navigazione (attende il titolo definitivo, non quello provvisorio di caricamento), target ≥ 44 px, `prefers-reduced-motion`. Nessuna dichiarazione di conformità WCAG.
- Layout: desktop con barra laterale; ≤ 800 px barra inferiore Casa/Attività/Documenti/Spese; verificato senza scroll orizzontale a 320 e 390 px.

## File principali

- Config: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html`.
- App: `src/main.tsx`, `src/api/*`, `src/session/*`, `src/routes/*`, `src/components/*`, `src/lib/validation.ts`, `src/styles/*`.
- Test/harness: `src/**/*.test.ts(x)`, `src/test/{fakeBackend.ts,harness.tsx,setup.ts}`, `scripts/mock-api.ts`, `tests/integration/identity.int.test.ts`.
- Documentazione: `README.md`, `HANDOFF.md`, `docs/screenshots/*`.

## Dipendenze (versioni esatte, lockfile, registry npmjs.org)

react/react-dom 19.3.0, react-router 7.18.4, @tanstack/react-query 5.104.2; dev: vite 7.3.7, @vitejs/plugin-react 5.2.0, typescript 5.9.3, typescript-eslint 8.71.2, eslint 10.12.0, @eslint/js 10.0.1, eslint-plugin-react-hooks 7.1.1, globals 17.13.0, vitest 4.1.11, jsdom 27.4.0, @testing-library/{react 16.3.3, dom 10.4.2, user-event 14.6.8, jest-dom 6.9.1}, @types/*. `npm audit`: 0 vulnerabilità.

Scelta (da registrare in `docs/decisions.md`): non sono state prese le major più recenti (react-router 8, vite 8, TypeScript 7, vitest 5) perché typescript-eslint richiede TypeScript < 6.1 e @vitejs/plugin-react 6 richiede Vite 8; si sono preferite major con API note e peer dependency coerenti. jest-dom 6.10.0 è deprecato (rilascio errato) → 6.9.1. L'aggiornamento è un'attività separata.

npm segnala lo script `postinstall` di esbuild non approvato (allowScripts): non è stato approvato né serve; build, dev server e test funzionano con il binario della piattaforma.

## Comandi eseguiti ed esiti (in `frontend-v5/`, Node 24.20.0, npm 11.19.0)

| Comando | Esito |
|---|---|
| `npx tsc -b` | OK, nessun errore |
| `npx eslint .` | OK, nessun errore/warning |
| `npx vitest run` (`npm test` = progetto `mock`) | 6 file, **46 test superati**; progetto `integration` saltato (2 test) senza `V5_API_URL` |
| `npx vite build` | OK (JS 384 kB, gzip 121 kB); il bundle non contiene il backend simulato (verificato con ricerca nel `dist`) |
| `npm audit` | 0 vulnerabilità |
| `V5_API_URL=http://127.0.0.1:3001/api/v5 npx vitest run --project integration` contro **backend simulato** | 2 superati — verifica solo che la suite di integrazione e il suo cookie jar funzionino; **non è integrazione reale** |

### Prove mock (backend simulato, contratto e rendering)

- `src/api/client.test.ts` — URL/credentials/no-store; CSRF prima della prima mutazione e su login; CSRF vecchio rifiutato dopo rotazione; Idempotency-Key; busta errori, fieldErrors, requestId; rete rifiutata, non-JSON, 2xx fuori forma, 503 → servizio; logout senza body; nessun uso di localStorage/sessionStorage.
- `src/lib/validation.test.ts` — limiti di lunghezza, trim, password non toccata, redirect `next` solo interno.
- `src/routes/auth.test.tsx` — errori campo e focus; 401 generico con password svuotata; sequenza login → GET session → GET homes; mostra/nascondi password; 422/409 registrazione; onboarding dopo registrazione; backend spento → errore + Riprova, nessun form.
- `src/routes/routing.test.tsx` — URL privato da anonimo → login con `next` → ritorno; scelta esplicita con più case e focus sul titolo; una sola casa → ingresso diretto dopo login e all'apertura con sessione attiva, «Cambia casa» mostra comunque l'elenco; radice anonima → login senza `next`; URL diretto e sezioni con casa nell'URL; redirect `/home/:id`; 403 senza contenuti; Agenzie/Admin non navigabili; 404; `/homes` in errore → errore e non onboarding.
- `src/session/cacheIsolation.test.tsx` — logout A → login B senza dati/chiavi di A; chiavi `[account, casa, risorsa]`; 401 → cache pulita, login, nessun retry; ricarica con cookie su URL diretto; bozza nuova casa non passa da A a B.
- `src/routes/createHome.test.tsx` — onboarding e creazione; errori locali; risposta persa + Riprova = stessa chiave, una sola casa; dati cambiati → 409 esplicito, poi nuova chiave; 422 server sul campo.

### Integrazione reale

**Non eseguita**: il backend V5 non esiste ancora. Pronta in `tests/integration/identity.int.test.ts` (scenari 1–4 del contratto, via lo stesso `ApiClient`, Origin `http://127.0.0.1:5174`, account con email casuale `@example.test` a ogni esecuzione: solo DB di sviluppo V5):

```bash
V5_API_URL=http://127.0.0.1:3001/api/v5 npm run test:integration
```

Lo scenario 5 (backend spento) è verificato nel browser in modalità reale (screenshot 01) e nei test mock; lo scenario 3 lato UI (cache dopo logout/login) solo con mock.

## Screenshot (`docs/screenshots/`)

| File | Modalità |
|---|---|
| `01-reale-backend-spento.jpg` | **reale**: `npm run dev`, nessun backend su 3001 → «Dimora non è raggiungibile» + Riprova |
| `02-mock-login-errori-campo-390.jpg` | mock (`npm run mock-api -- --seed`), 390 px, errori di campo |
| `03-mock-elenco-case-390.jpg` | mock, 390 px, scelta tra due case, Agenzie/Amministratori bloccati |
| `04-mock-casa-390.jpg` | mock, 390 px, Casa con barra inferiore |
| `05-mock-casa-320-nav-bloccata.jpg` | mock, 320 px, lucchetti su Attività/Documenti/Spese, nessuno scroll orizzontale |

Verificati nel browser ma senza screenshot utilizzabile (lo strumento di cattura ha restituito immagini duplicate/ritagliate): pagina 403 dopo ricarica a 320 px, form «Aggiungi una casa» a desktop con focus sul primo campo errato, focus sul titolo dopo navigazione Casa ↔ Documenti. Il dev server è stato avviato da terminale (non tramite `.claude/launch.json`, che è fuori da `frontend-v5/`) e fermato a fine prova.

## Richieste per Codex (contratto/backend) — nessun contratto alternativo implementato

1. **Codice errore CSRF**: quale `code` (e stato, 403?) per token CSRF assente/scaduto? Oggi il client lo mostra come errore generico, senza rinnovo automatico. Proposta: codice stabile (es. `csrf_invalid`) per consentire una sola nuova `GET /session` + un solo nuovo invio.
2. **Codice errore 409 su `POST /homes`**: distinguere «chiave riusata con body diverso» da altri 409 futuri (es. `idempotency_key_reused`). Oggi ogni 409 su quella rotta è trattato come conflitto di idempotenza.
3. **Idempotency-Key**: formato accettato (il client invia UUID v4), ambito (per account o per sessione?), durata di conservazione, comportamento se la richiesta originale è ancora in corso.
4. **Unità di misura delle lunghezze** (1–80, 1–200, 12–128, 254): il client conta i code point Unicode. Confermare (code point / UTF-16 / grafemi) e se l'email viene normalizzata (minuscole) lato server.
5. **`GET /homes/:homeId` per id inesistente**: 403 come per casa altrui (consigliato, evita enumerazione) o 404? La UI gestisce entrambi senza mostrare dati.
6. **Login tra schede**: le risposte di `/homes` non indicano l'account. Il client rilegge la sessione al focus della finestra, ma resta una piccola finestra in cui una scheda con cache di A può ricevere dati di B sotto la chiave di A se un'altra scheda ha cambiato account. Valutare un indicatore lato server (es. `accountId` nella risposta o header) — solo se Codex lo ritiene utile; il frontend non lo assume.
7. **429**: presenza di `Retry-After` o di un messaggio con tempo d'attesa? Oggi si mostra il messaggio del server.
8. **Origin/cookie per l'integrazione**: il proxy Vite lascia `Origin: http://127.0.0.1:5174` e `Host` del frontend; il server deve accettare quell'origine. Il cookie di sessione deve avere `Path` che copra `/api/v5` e niente `Domain` (host 127.0.0.1).
9. **Logout con sessione già scaduta**: il client tratta il 401 di `POST /auth/logout` come uscita riuscita. Confermare che `GET /session` successivo crei una sessione anonima con nuovo CSRF.

## Limiti e note

- Nessuna integrazione reale eseguita; l'app V5 reale non è funzionante finché il backend di Codex non è attivo.
- Font: **decisione del committente (13/10/2026): font di sistema**, nessun caricamento esterno. DM Sans/Manrope restano primi nello stack solo se già installati sul dispositivo.
- `scripts/mock-api.ts` usa lo stripping dei tipi di Node (Node ≥ 22.18 / 23.6; verificato con Node 24). Il backend simulato usa la porta 3001: non avviarlo con il backend reale (si ferma se la porta è occupata).
- **Decisione del committente (13/10/2026): con una sola casa si entra direttamente.** Vale solo all'ingresso (`/`): `/case` resta l'elenco, altrimenti «Cambia casa» e «Aggiungi una casa» sarebbero irraggiungibili. Verificato anche nel browser con backend simulato (account con una casa → Casa; «Cambia casa» → elenco).
- Le prove con screenshot desktop sono limitate dalla larghezza del pannello del browser integrato.
- Il controllo di conformità WCAG non è stato fatto; sono state applicate solo pratiche di base (tastiera, focus, etichette).

## Note per i documenti condivisi (li aggiorna Codex)

- **changelog**: nuovo `frontend-v5` con identity-v1 (accesso/uscita, registrazione di sviluppo, case, shell Home) contro contratto congelato; solo prove mock.
- **decisions**: ingresso diretto con una sola casa (solo da `/`) e font di sistema, entrambe decise dal committente il 13/10/2026; versioni dipendenze (sopra); CSRF solo in memoria; nessun retry automatico; logout senza `next`; ciclo di vita Idempotency-Key; font di sistema; backend simulato condiviso tra test e `mock-api`, escluso dal bundle via ESLint.
- **backlog**: richieste 1–9; aggiornamento futuro alle major React Router 8/Vite 8/TS 7 quando l'ecosistema lint è compatibile; font locali; integrazione reale + e2e browser.
- **roadmap**: V5-DEV-003 frontend pronto per integrazione; restano backend identity-v1 e collaudo.

## Prossimi passi consigliati

1. Codex: review del commit, risposte alle richieste 1–9, avvio backend su 3001, `npm run test:integration`, poi prova manuale con `npm run dev`.
2. Eventuale adeguamento del client ai codici errore definitivi (CSRF, idempotenza).
3. Test e2e nel browser (Playwright o simile) quando esiste il backend reale.
