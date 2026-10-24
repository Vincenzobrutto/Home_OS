# Schede di compilazione — presentazione come il prototipo: report, 24 ottobre 2026

Lotto Claude sul branch `claude/schede-presentazione-20261024`, dal consolidamento `2ab7570`. [Piano](schede-presentazione-piano-20261024.md), approvato dal committente il 24/10 con tre decisioni: fase A ora; scheda articolo compatta (fase B) in un lotto separato; per l'originale, il salto alla pagina giusta senza evidenziare la riga. Revisione affidata a Codex.

## Cosa cambia

Solo presentazione, sopra il flusso di Codex ([PR #23](https://github.com/Vincenzobrutto/Home_OS/pull/23)). Restano invariati passaggi, salti, convalide, salvataggio unico, recuperi, ritorno alla pagina unica e costruzione del payload.

| Differenza del piano | Realizzato |
| --- | --- |
| D1 scheda unica | Ogni passaggio sta in una scheda: titolo del passaggio (`h2`, riceve il focus), domanda grande, spiegazione, contenuto, piede |
| D2 barra dei passaggi | Pastiglie con badge: numero, spunta per i passaggi visitati, corrente evidenziato con `aria-current="step"`, futuri tratteggiati e disabilitati. Nome accessibile invariato («2. Contenuto») |
| D3 titoli a domanda | `compilationFlow.ts` aggiunge `question` e `hint` a ogni passaggio («Che documento è?», «Cosa contiene il documento?», «Crea la scheda dell'oggetto» / «A quale oggetto si riferisce?», «Quali spese registrare?», «Quali contatti conservare in rubrica?», «Controlla e conferma»). Tolte la frase «Nessun dato viene registrato…» in cima e la riga «Passo N di M · Titolo» |
| D4 ritorno alla pagina unica | Link secondario al posto del pulsante (stesso `button`, stesso nome) |
| D5 originale affiancato | Rotta autonoma: due colonne sopra 1100 px, con l'originale aperto e fisso durante lo scorrimento; sotto i 1100 px resta in fondo, chiuso. Nello spazio di lavoro documenti nulla cambia |
| D6 piede | «Indietro» a sinistra; «Passaggio N di M» (stato vivo) e pulsante principale a destra. «Salva bozza ed esci» sopra la barra dei passaggi; «Vedi documento originale» nella testata della scheda |
| D7 Contenuto | Radio native presentate come pastiglie: frecce da tastiera e nomi invariati |
| D8 Riepilogo | `SaveSummary` con la prop opzionale `edit`: un blocco per area (Documento, Oggetti, Spese, Esclusi, Contatti), ognuno con «Modifica», che rimanda al passaggio esistente. Testi delle singole voci invariati; la pagina unica non usa `edit` e resta identica |
| D9 telefono | Sotto gli 800 px: barra a segmenti, pastiglie su una riga scorrevole, piede fisso sopra la barra di navigazione inferiore, «Avanti · Articolo 2» (il suffisso è solo visivo, nome accessibile «Avanti») |

Anteprima PDF e salto di pagina: la rotta autonoma usa già `PdfPreview` con cambio pagina; non è stato aggiunto un salto automatico per articolo, perché le proposte della demo non portano la pagina. Resta come attività futura dove l'evidenza la indichi.

## File toccati

`frontend-v5/src/object-onboarding/`: `CompilationSteps.tsx`, `CompilationStepper.tsx`, `CompilationContent.tsx`, `compilationFlow.ts`, `compilationSteps.module.css`, `SaveSummary.tsx` (prop opzionale `edit`; senza la prop l'output è lo stesso di prima), `onboarding.module.css` (stili dei blocchi), `OnboardingPage.tsx` (contenitore a due colonne e stile del link alla pagina unica), nuovo `CompilationPresentation.test.tsx`. Nessuna modifica a backend, API, `DraftEditor`, `UnifiedReview`, `ItemEditor`, `model.ts`.

## Test

- **Nessuna asserzione esistente modificata.** Per rispettare i contratti dei test di Codex, il titolo `h2` resta quello del passaggio («Documento», «Articolo 1»…) e la domanda è un paragrafo; il link all'originale segue subito il titolo, perché un test verifica che sia il primo elemento raggiungibile con Tab dal titolo; le scelte del Contenuto restano radio.
- **Nuovi test (7)**, in `CompilationPresentation.test.tsx`:
  - domande per tipo di passaggio e titoli invariati;
  - spiegazione per «solo documento»;
  - pagina unica senza blocchi;
  - «Modifica» di ogni blocco verso il passaggio giusto;
  - rimando al Documento senza scheda Contenuto;
  - stati della barra, focus, «Passaggio N di M» e suffisso di «Avanti»;
  - radio del Contenuto.
- Esiti:
  - typecheck, lint e build superati;
  - test mirati `object-onboarding`, `intake-integration` e `documents`: 341/341 prima dei test nuovi, poi `object-onboarding` 256/256.
  - Suite mock completa (113 file, 957 test, due worker):
    - primo giro: 955/957, senza elenco dei falliti (registrata solo la coda dell'output);
    - secondo giro: 956/957, unico fallito `src/routes/sharing.test.tsx` › «picker: nessuna selezione implicita…» (`Unable to find role="link" and name "Condividi…"`).
  - In quel momento il test falliva anche da solo e **anche sul consolidamento `2ab7570` senza modifiche di questo lotto**. Più tardi è passato sia sul lotto sia sul consolidamento: è intermittente e preesistente, fuori perimetro, segnalato nel backlog.
  - In un giro mirato è fallito una volta `PendingUploads.test.tsx` («Da completare filters…»), rieseguito verde: test sensibile ai tempi, già noto nel backlog.
  - Esito finale della suite completa sul codice definitivo: vedi la sezione Verifica finale.
- **Giro visivo** su `mock-api --compilation` (porta propria, demo sintetica a tre articoli):
  - desktop: Documento, Contenuto e Riepilogo a blocchi con l'originale affiancato;
  - 375 px: nessuno scorrimento orizzontale dopo la correzione di `min-width` della barra; piede fisso sopra la navigazione inferiore.
  - Screenshot nella conversazione Claude, non nel repository.

## Verifica finale

Sul codice definitivo:

- build superata;
- suite mock completa **956/957** (113 file, due worker, 755 s). Unico fallito `src/objects/KeepHouseDocuments.test.tsx` › «menu oggetto: riepilogo prima di scrivere…» (`Unable to find role="button" and name "Altre azioni"`).

Verifica dei due test intermittenti, eseguiti insieme da soli:

- sul lotto: `KeepHouseDocuments` e `sharing` passano, **19/19**;
- sul consolidamento `2ab7570` senza modifiche, nello stesso momento: `KeepHouseDocuments` fallisce e `sharing` passa.

Entrambi sono intermittenti e preesistenti, in aree non toccate dal lotto. Nessuna asserzione o timeout modificato.

## Limiti e lavoro residuo

- **Fase B** (lotto separato): la scheda articolo mostra ancora l'editor completo e ripete la scelta «Cosa vuoi fare?» già fatta nel Contenuto. Va fatta la variante compatta di `ItemEditor`, che tolga anche la ripetizione.
- **Pagina dell'evidenza nell'originale**: non implementato; serve la pagina nella proposta.
- **Prove reali** su telefono fisico, tastiera virtuale e lettore di schermo: non eseguite.
- **`routes/sharing.test.tsx` e `objects/KeepHouseDocuments.test.tsx`** falliscono a intermittenza anche sul consolidamento: preesistenti, da assegnare.

Nessuna AI o email a pagamento, nessun DB/API/storage reale, nessun `.env`. Il backend simulato avviato da Codex sulla porta 3101 non è stato toccato.
