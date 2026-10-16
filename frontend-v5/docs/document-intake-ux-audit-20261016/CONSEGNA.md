# Audit UX del flusso Documenti — consegna Claude · PRONTO

| Voce | Valore |
|---|---|
| Incarico | `outputs/Dimora-V5-incarico-Claude-UX-flusso-documenti-20261016.md` |
| Tipo | Solo documenti: nessun codice, mockup, DB, `.env`, AI, email o servizio a pagamento; nessun push, merge o sync |
| Checkout di consegna | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-archivio-assistito`, branch `claude/archivio-assistito-20261016`, pulito prima della consegna (HEAD `0baa7de`) |
| Cartella | `frontend-v5/docs/document-intake-ux-audit-20261016/` |
| Commit | quello che aggiunge questa cartella (messaggio «audit UX indipendente del flusso Documenti»; hash comunicato al committente) |

## Baseline

**Master consultato in sola lettura:** `…\2026-10-13\referenced-chatgpt-conversation-this-is-an\Home_OS`, branch `dev/dimora-v5-local-20261013`.

| | Commit |
|---|---|
| Baseline richiesta | `7ea670020ae906e29955c716ce986f93d0c3c58c` |
| HEAD trovato | `2a493c27c8a75f05a4aa9a12ac88c14d0b3d0490` |

**Delta HEAD − baseline:**
- un solo commit, `2a493c2` «docs: audit document intake usability and scenario coverage»;
- tocca solo `docs/v5/document-intake-ux-audit-codex-20261016.md`, l'audit di Codex. **Non l'ho letto**, per indipendenza: ho guardato solo il nome del file nello `--stat`;
- nessuna modifica in `frontend-v5/src`.

**Dirty del master, preesistente e non mio:** modifiche locali in `backend/src/main.ts`, `docs/{api,backlog,changelog,decisions,domain-model,roadmap}.md`, `frontend/package.json` e il file non tracciato `frontend/public/dimora-v5-design.html`. Non sono state toccate: `git status` è identico prima e dopo l'audit.

## Fonti lette

- `AGENTS.md` alla root e `frontend-v5/AGENTS.md`.
- `docs/v5/document-intake-spec-v1.md`, emendamenti compresi.
- `docs/v5/document-intake-app-report-20261016.md`.
- Contratto `document-intake-api-contract.md` solo per un dubbio preciso: semantica di `collection=unclassified`, riga 76.
- Codice:
  - `frontend-v5/src/document-intake/{DocumentIntakeAssistant.tsx, ReviewDialog.tsx, model.ts, DocumentCollectionFilters.tsx}`;
  - `src/intake-integration/IntakePage.tsx`;
  - `src/routes/DocumentsPages.tsx` (ingresso ed elenco);
  - `src/routes/DocumentDetailPage.tsx` (righe 160–162);
  - `src/documents/SearchForm.tsx` (raccolte e filtri).
- Il mio checkout archivio, con codice precedente, **non** è stato usato come rappresentazione dell'app.

## File consegnati

| File | Contenuto |
|---|---|
| `REPORT.md` | 8 rilievi prioritari con gravità, evidenze e distinzione fra fatti e ipotesi, più cosa conservare |
| `MATRICE.md` | Conteggi delle azioni con inizio e fine dichiarati, 58 scenari pairwise e ad alto rischio con stato e lacune |
| `PROPOSTA.md` | Alternative A e B, raccomandazione, percorso felice, casi difficili, cosa conservare ed eliminare, dipendenze UI/contratto/committente, 11 criteri di accettazione |
| `screenshots/ux-proposte-390.png` | Proposte a 390 px (harness) |
| `screenshots/ux-dialogo-cila-390.png` | Dialogo CILA a 390 px: la decisione è sotto l'anteprima |
| `screenshots/ux-esito-1280.png` | Esito dopo il percorso completo contato (harness) |

## Verifiche svolte

**Lettura del codice** del master, con riferimenti a file e riga nei documenti.

**Misure sull'harness sintetico già esistente** (`src/document-intake/demo/IntakeDemo.tsx` del master, uguale a quello del mio checkout):
- compilato in un bundle statico su `file://` con l'esbuild già installato nel master, in una cartella temporanea fuori dai repository;
- pilotato con Chrome headless via CDP;
- **nessun servizio avviato, nessun codice modificato**, solo dati sintetici;
- misurato:
  - posizione delle azioni principali a 1280, 390 e 320 px;
  - metriche del dialogo;
  - overflow;
  - conteggio dei clic del lotto misto;
  - Tab nel dialogo;
  - errori in console: nessuno.

## Limiti reali

- **App reale su http://127.0.0.1:5174 non aperta:** la richiesta di aprirla nel browser integrato è stata **negata dal sistema di permessi** dell'ambiente. Non ho aggirato il blocco: nessun login, nessun altro browser verso 5174. Quindi:
  - nessuna osservazione del container reale (`IntakePage`), dei tempi dell'analisi, dei messaggi del server o dei filtri Documenti popolati;
  - nessun documento personale aperto, caricato, confermato o riclassificato.
- **Che cosa è il componente reale:** l'harness esegue i componenti reali `DocumentIntakeAssistant` e `ReviewDialog`, ma con un container finto e senza analisi, rete e DB. Il comportamento del container (`IntakePage`) è **dedotto dal codice**.
- **Ipotesi:** gli effetti sul comportamento degli utenti sono ipotesi, da verificare con test su persone (criterio 11 di `PROPOSTA.md`).
- **Metodo CRO:** la griglia CRO (skill «cro») è nata per pagine di marketing. L'ho adattata a un flusso interno con obiettivo «documento archiviato».
- **Nessuna dichiarazione WCAG.**

## Note

- La specifica approvata **non** è stata modificata. Le proposte che la toccano sono marcate «decisione del committente» in `PROPOSTA.md`.
- Nessun messaggio inviato ad altri agenti o app. Codex raccoglie i file da questo percorso.
