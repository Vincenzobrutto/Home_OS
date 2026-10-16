# Ricevuta assistita — indice delle consegne Claude

**Tutti e tre i compiti sono conclusi.**

| Voce | Valore |
|---|---|
| Incarico | `outputs/Dimora-V5-incarico-Claude-ricevuta-tre-compiti-20261016.md` |
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-ricevuta-assistita` |
| Branch | `claude/ricevuta-assistita-20261016`, da `b654fae` |
| Aree scritte | Solo `frontend-v5/src/receipt-assistance/**` e `frontend-v5/docs/receipt-assistance-20261016/**` |
| Stato del worktree | Pulito dopo il commit di questo indice. `node_modules` e `dist` sono ignorati da git |
| Push | Nessuno. Nessun merge, sync o cherry-pick nel master |

| Fase | Stato | Commit | Consegna |
|---|---|---|---|
| 1 — Modello UI e componenti a props | **Conclusa** | `636b96a` | `CONSEGNA-1.md` |
| 2 — Esperienza completa | **Conclusa** | `65602ff` | `CONSEGNA-2.md` |
| 3 — Collaudo e rifinitura | **Conclusa** | `22baab1` | `CONSEGNA-3.md` |
| Indice finale | — | commit successivo (hash in `git log`) | questo file |

## Prove (riassunto)

- **Test:** 34/34 vitest, progetto `mock`, su `src/receipt-assistance`.
- **Build e lint:** `npm run build` e `npm run lint` verdi, sul progetto intero. Entry invariata a 492,67 kB, perché i componenti non sono ancora agganciati.
- **Typecheck:** `tsc -b --noEmit` verde.
- **Browser:** harness demo **statico e sintetico**, aperto come file locale senza server, a 1280, 390 e 320 px. Verificati overflow, ritorno dal riepilogo, tastiera, dialogo della fonte e contenuti lunghi. Il dialogo aveva un difetto, corretto con un test di regressione.
- **Dipendenze:** `npm ci` dal lockfile, senza modifiche a `package.json` o lock. Lo script di postinstall di esbuild non è stato approvato e non serve.

## Limiti

- **Integrazione:** nessuna prova con client, API, DB o provider reali. Nessuna rotta o pagina agganciata: la UI **non è integrata**.
- **Harness:** è solo una demo, non una prova reale.
- **Dialogo:** manca un focus trap completo.
- **Accessibilità:** nessuna dichiarazione WCAG e nessuna prova con screen reader o dispositivo fisico.

## Punti di integrazione per Codex

1. Una pagina container lazy, fuori dalla mia directory, che usi `ReceiptAssistant` da `src/receipt-assistance` con i dati del contratto R1:
   - capabilities, con `today`;
   - bozza;
   - candidati paginati;
   - job e polling.
2. `onConfirm` e `onRecoverOutcome` con una Idempotency-Key stabile per lo stesso payload. `canonicalPayload()` serve a riconoscere il payload uguale. Una promessa rifiutata viene trattata come esito non noto.
3. Mappatura degli errori:
   - 401: sessione;
   - 403: `load: unavailable`, oppure `rejected/forbidden` alla conferma;
   - 409: `rejected/conflict`;
   - 422: `rejected/validation`;
   - 503: `rejected/unavailable`, oppure job `failed/service`.
4. `renderOutcomeLinks` con il router dell'app, verso la scheda oggetto e Spese; `renderOriginalPreview` e `openOriginal` con il download autenticato esistente.
5. Invalidazione della cache dopo la conferma: oggetti, spese, documento, Da rivedere.

## Raccomandazioni per i documenti condivisi (le aggiorna Codex)

- **Changelog:** «Componenti isolati della ricevuta assistita (modello, scelte indipendenti oggetto/spesa, confronti keep/defer, conferma con esito incerto recuperabile), non ancora agganciati».
- **Backlog:**
  - focus trap completo nel dialogo, o passaggio a `<dialog>` nativo dopo la verifica nel browser reale;
  - decidere se le differenze della **spesa** riusata (importo/data) richiedano keep/defer come marca/modello. Oggi sono solo esposte, coerenti con «differenza esposta» della specifica.
- **Contratto o API:**
  - nel payload UI le azioni per campo seguono `resolveReceiptField` (accept/manual/keep_existing/defer/skip);
  - le origini dei valori creati sono `extraction` / `manual` / `null`;
  - nel body R1 servono `targetVersion` per oggetto e spesa riusati;
  - `ConfirmationResult` deve restituire conteggi e collegamenti autorizzati più il numero di confronti aperti.
