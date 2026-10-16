# Fase 0 file ed export — consegna Claude · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Fase0-file-export-20261016.md`, versione modificata alle 11:02 con la nuova baseline `9aafd79` e l'«Aggiornamento operativo».

**Le consegne A e B sono entrambe complete.** Solo documenti: nessuna modifica a sorgenti, test, corpus, contratti, schema, documenti condivisi o configurazioni. Nessun push.

## Worktree, baseline e differenza

| Voce | Valore |
|---|---|
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-Fase0-file-export` |
| Branch | `claude/fase0-file-export-20261016` |
| Baseline del worktree | `1e13e43`, dalla prima versione dell'incarico |
| Baseline indicata ora | `9aafd79` |
| Fetch | `git fetch origin`: 195 avanti e 0 indietro rispetto a `origin/main` alla creazione. Nessun pull o merge |

**Commit:**
- `9a65fec` — prima consegna completa, alla baseline `1e13e43`;
- il commit di questa revisione, con hash in `git log` — allineamento a `9aafd79`.

**Differenza di baseline.** L'incarico aggiornato chiede di non ricreare né riallineare un worktree già avviato. Il worktree resta su `1e13e43`. Ho letto dal master, **in sola lettura**:
- `fase0-file-control-esito-20261016.md`;
- `personal-export-api-contract.md`;
- le modifiche a `documents-api-contract.md` e `fase0-export-design-20261016.md`;
- `backend-v5/src/documents/file-control.ts`;
- `frontend-v5/src/api/client.ts`.

Effetti sulle consegne:
- **Consegna A rivista:**
  - controllo file: un solo esito di rifiuto certo `file_check_unavailable`, più `storage_capacity_low`. Niente «file segnalato», niente stato pubblico per documento, retry con la stessa chiave;
  - export allineato a `personal-export-v1`: download diretto, nome del file del server, busy e unavailable, sola lettura, nessun conteggio delle esclusioni;
  - nuovo difetto FE-UX-02 verificato nel codice a `9aafd79`.
- **Consegna B invariata nel merito.** I file del corpus, del report, dei test e i contratti `src/economy` e `src/review` non cambiano fra `1e13e43` e `9aafd79` (`git diff` vuoto). Ho aggiunto solo la nota di baseline.

## File consegnati

In `frontend-v5/docs/fase0-file-export-20261016/`:
- `REPORT.md`
- `mockup.html` (20 schermate)
- `CORPUS-REVIEW.md`
- `CONSEGNA.md`
- `screenshots/01-mockup-d4-1280.png`, che sostituisce `01-mockup-d5-1280.png` della prima versione
- `screenshots/02-mockup-x3-320.png`, aggiornato

## Controlli eseguiti

**Mockup** (Chrome headless, profilo separato, porta 9445):
- 20 schermate a 1280, 390 e 320 px: nessuno scorrimento orizzontale, nessun elemento oltre il riquadro;
- testo minimo 12 px;
- focus sul contenitore a ogni schermata;
- tab su D4: file → titolo → Riprova → Annulla, con indicatore di focus da 3 px;
- nessun errore in console.

Nessuna dichiarazione WCAG.

**Corpus:**
- solo `score()` offline, nello scratchpad con stub vuoti per i moduli di generazione dei byte, su osservazioni scritte a mano;
- test e tool del corpus non eseguiti: richiedono `dist`, assente nel worktree, e non ho lanciato build;
- nessun provider, nessun caricamento.

**Git:** `git diff --check` sui file consegnati prima di ogni commit.

Nessuna build, lint o suite.

## Basi

- **Codice (C) a `9aafd79`:**
  - FE-UX-02: `client.ts` trasforma ogni 503 in errore di servizio generico; `DocumentsPages.tsx` mostra «Esito non confermato»;
  - mappatura dei rifiuti 413/415, messaggi `pdf_*`, assenza dell'eliminazione;
  - validatori e scorer.
- **Contratto non attivo (K):** export personale.
- **Prodotto reale (B-reale):** solo le osservazioni sintetiche della sessione Fase0-UX (runtime `cbc5fb8`). Qui non ho fatto nuove prove sul prodotto, non ho usato la sessione del committente e non ho caricato nulla.
- **Non letti:** backup, chiavi, configurazione email, documenti del committente.

## Processi

Ho avviato solo Chrome headless, ora **chiuso**. 5174, 3001 e 55432 non sono stati toccati.

## Da arbitrare

1. **FE-UX-02 — difetto attuale (Codex).** Il frontend presenta `file_check_unavailable` e `storage_capacity_low` come esito incerto e «servizio non raggiungibile», anche se il server garantisce che nessun documento è stato creato. Serve una mappatura specifica dei 503 con codice noto, che varrà anche per `personal_export_busy` e `_unavailable`.
2. **Testo su Defender e Microsoft nell'avviso pilota (committente, FE-UX-04).** La formulazione proposta è: «secondo le impostazioni di Windows, Microsoft può ricevere informazioni o campioni dei file». Il rapporto Codex chiede di chiarire questo limite prima della prova con documenti personali.
3. **Errata del corpus E1–E8 e formato dello scorer (Codex).** Vanno fatti prima di qualunque campagna con il provider: oggi lo scorer dà precisione 0,36 all'output corretto del provider di prova.
