# Fase 0 UX — consegna Claude · 16/10/2026

Incarico: `Dimora-V5-incarico-Claude-Fase0-UX-20261016.md`. Consegna solo documentale. Non ho modificato prodotto, contratti, test, configurazioni o dipendenze. Nessun push.

## Worktree e baseline

| Voce | Valore |
|---|---|
| Worktree | `C:\Users\07704017\Documents\Codex\Dimora-V5-Claude-Fase0-UX`, creato con `git worktree add` dal master |
| Branch | `claude/fase0-ux-20261016` |
| Baseline | `cbc5fb8` |
| Fetch | `git fetch origin`: 190 avanti e 0 indietro rispetto a `origin/main`. Nessun pull o merge |
| Letti dal master `6719e25`, in sola lettura | `docs/v5/fase0-recovery-design-20261016.md`, `docs/v5/fase0-prerequisiti-20261016.md`. Non copiati in questo branch |
| Letti nella baseline | `docs/v5/home-release-piano-20261016.md` (Fase 0, BL-04); `routes/AuthPages.tsx`, `routes/DocumentsPages.tsx`, `routes/DocumentDetailPage.tsx`, `lib/files.ts`, `lib/validation.ts`, `api/errors.ts`, `backend-v5/src/auth/auth.service.ts` (solo i messaggi) |

Il master è avanzato a `6719e25` durante l'incarico. Quel commit aggiunge solo un test backend e due documenti, quindi il runtime servito da 5174 è quello di `cbc5fb8`.

## File consegnati

Tutti in `frontend-v5/docs/fase0-ux-20261016/`:

| File | Contenuto |
|---|---|
| `REPORT.md` | Percorso, testi, matrice degli stati, verifica email, copione della prova personale, 8 raccomandazioni FASE0-UX-01…08 |
| `mockup.html` | Mockup autonomo navigabile: 25 schermate (R1–R7, E1–E10, V1–V5, P1–P2, matrice), selettore desktop / 390 / 320 px, dati sintetici, nessuna risorsa esterna |
| `screenshots/01-login-attuale-1280.png` | Prodotto reale: login senza recupero |
| `screenshots/02-upload-attuale-1280.png` | Prodotto reale: modulo di caricamento attuale |
| `screenshots/03-mockup-r3-1280.png` | Mockup: risposta neutra R3 |
| `screenshots/04-mockup-e2-390.png` | Mockup: link non più valido a 390 px |

## Simulato e osservato

**Osservato nel prodotto reale (B-reale)** su `127.0.0.1:5174` con il backend V5 reale, 16/10 dalle 09:55 alle 09:58:
- Account nuovo sintetico `fase0-prova-…@example.test` creato con la registrazione ordinaria. Credenziale solo nello scratchpad della sessione, non qui.
- Dati creati: casa «Casa prova Fase0» `2a67b3c7-2981-4a79-a9a3-2eb5ac16a15d`, PDF testuale sintetico di 688 B, PNG 1×1, oggetto «Lavatrice» `bc5a088a-be74-4007-8064-cd34903753f7` con il PDF collegato, spesa di 12,00 €.
- Verificato:
  - login senza recupero;
  - modulo di caricamento con «Solo io» predefinito;
  - rifiuto lato client di HEIC e di un file da 21 MiB, prima dell'invio;
  - download dell'originale con impronta SHA-256 identica fra UI, file locale e file scaricato;
  - PNG senza «Analizza questo documento»;
  - collegamento all'oggetto;
  - spesa dall'oggetto con ritorno alla scheda;
  - testo dell'export ZIP.
- Console senza errori. Nessuna analisi avviata, nessun dato del committente o di sessioni precedenti toccato. I dati sintetici restano nel DB locale: nessuna cancellazione.

**Verificato nel codice (C):** messaggi di login, registrazione e upload; nessuna eliminazione dei documenti nella UI; «Analizza» offerto per ogni PDF.

**Simulato (S):** tutto il recupero dell'accesso, la verifica email, le email dimostrative e i testi nuovi P1 e P2.

**Controlli sul mockup:** Chrome headless, tutte le 25 schermate a 1280, 390 e 320 px. Nessuno scorrimento orizzontale, nessun errore console. Percorso cliccato R1 → R2 → R3 → R4 → R5 → R6.

**Controlli git:** `git diff --check` sui file consegnati prima del commit.

Non ho eseguito build, lint o suite: incarico documentale, codice invariato.

## Processi

Ho avviato solo Chrome headless con profilo separato e porta di debug 9445. È **chiuso** a fine lavoro. I servizi 5174, 3001 e 55432 del master sono stati solo usati: nessun riavvio, nessuna modifica a `.env`, sicurezza o CSRF/Origin.

## Limiti

- Recupero e verifica non esistono: il mockup non prova il comportamento del server.
- Le durate (30 minuti, 24 ore, attesa di 60 s) sono proposte.
- Non provati: PDF scansionato, PDF protetto, telefono fisico, screen reader. Nessuna dichiarazione WCAG.

## Scelte aperte (al massimo tre)

1. **Fornitore email transazionale e costo.** Necessari prima di attivare recupero e verifica. È un canale distinto dal riepilogo settimanale BL-08.
2. **Email sbagliata o casella persa.** Oggi la proposta non permette di cambiare l'indirizzo né prevede una procedura assistita: i testi V3 ed «Non hai più accesso a questa email?» lo dicono apertamente. Per il pilota si può accettare questo limite oppure progettare una procedura assistita fuori da questo incremento.
3. **Eliminazione dei documenti nel pilota.** Oggi un documento caricato non si può eliminare. La raccomandazione FASE0-UX-06 propone di dirlo prima del caricamento. In alternativa il committente decide di aggiungere archiviazione o eliminazione prima della prova con documenti veri.
