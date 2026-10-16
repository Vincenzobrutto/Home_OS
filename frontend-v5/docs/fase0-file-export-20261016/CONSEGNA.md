# Fase 0 file ed export — consegna Claude · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Fase0-file-export-20261016.md`. **Le consegne A e B sono entrambe complete** in un unico commit. Solo documenti: nessuna modifica a sorgenti, test, corpus, contratti, schema, documenti condivisi o configurazioni. Nessun push.

## Worktree e baseline

| Voce | Valore |
|---|---|
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-Fase0-file-export`, nuovo, creato con `git worktree add` dal master |
| Branch | `claude/fase0-file-export-20261016` |
| Baseline | `1e13e43` |
| Fetch | `git fetch origin`: 195 avanti e 0 indietro rispetto a `origin/main`. Nessun pull o merge |
| Letti | `AGENTS.md`, `frontend-v5/AGENTS.md`, `docs/v5/fase0-export-design-20261016.md`, `documents-api-contract.md`, `fase0-avanzamento-tecnico-20261016.md`, `fase0-prerequisiti-20261016.md`, `frontend-v5/docs/fase0-ux-20261016/REPORT.md`, i file del corpus e i contratti economici e tecnici citati in CORPUS-REVIEW |

## File consegnati

Tutti in `frontend-v5/docs/fase0-file-export-20261016/`:

| File | Consegna | Contenuto |
|---|---|---|
| `REPORT.md` | A | Testi, 8 raccomandazioni FE-UX-01…08, cosa lasciare com'è |
| `mockup.html` | A | 19 schermate (D1–D9, X1–X9, matrice), selettore desktop / 390 / 320 px, autonomo, dati sintetici |
| `screenshots/01-mockup-d5-1280.png` | A | Controllo non disponibile, documento non salvato |
| `screenshots/02-mockup-x3-320.png` | A | Conferma dell'export dei dati a 320 px |
| `CORPUS-REVIEW.md` | B | Verdetti P01–P24, errata E1–E8, valutazione dello scorer, gap, soglie |
| `CONSEGNA.md` | — | Questo file |

## Controlli eseguiti

**Mockup** (Chrome headless, profilo separato, porta 9445):
- 19 schermate a 1280, 390 e 320 px: nessuno scorrimento orizzontale, nessun elemento fuori dal riquadro;
- font minimo 12 px, dopo aver corretto un'etichetta da 11 px;
- focus sul contenitore a ogni cambio di schermata e ordine dei tab verificato su D5;
- indicatore di focus da 3 px;
- nessun errore in console.

Nessuna dichiarazione WCAG.

**Corpus:** ho eseguito offline solo `score()`, copiato nello scratchpad con stub vuoti per i moduli che servono a generare i byte, su osservazioni scritte a mano. Non ho eseguito i test del corpus né il tool di report, perché richiedono `dist`, che manca nel worktree, e non ho lanciato build. Nessun provider, nessun caricamento.

**Git:** `git diff --check` sui file consegnati prima del commit.

Nessuna build, lint o suite.

## Basi

**Codice (C), baseline `1e13e43`:**
- il messaggio contraddittorio di FE-UX-02 (`api/errors.ts:39-40` più il banner `isService` in `DocumentsPages.tsx`);
- la mappatura dei rifiuti 413/415;
- i messaggi `pdf_*`;
- l'assenza dell'eliminazione dei documenti;
- validatori economici e tecnici e lo scorer.

**Osservato nel prodotto reale (B-reale):** solo le osservazioni della sessione Fase0-UX di oggi, con il runtime di `cbc5fb8` e dati sintetici. In questo incarico non ho ripetuto prove sul prodotto e non ho usato la sessione del committente.

**Proposte (P):** il controllo dei file, «Esporta i miei dati di questa casa» e tutti i testi nuovi.

## Processi

Ho avviato soltanto Chrome headless, ora **chiuso**. 5174, 3001 e 55432 non sono stati toccati.

## Da arbitrare (Codex)

1. **Controllo dei file sincrono o asincrono** (FE-UX-01). Raccomando il sincrono e a prova di guasto: senza stati intermedi in archivio. Va scelto anche un codice per «controllo non disponibile» che il client tratti come rifiuto definitivo (FE-UX-02).
2. **Correzione del testo contraddittorio** su `storage_unavailable` nel caricamento (FE-UX-02): è un difetto esistente, indipendente dal controllo dei file.
3. **Errata del corpus E1–E8 e nuovo formato dello scorer** (`required` / `allowed` / `absent`, chiavi ripetibili, citazioni con la regola del validatore, esiti per equivalenza, pipeline). Vanno fatti prima di qualunque campagna con il provider: oggi lo scorer dà precisione 0,36 all'output corretto del provider di prova.
