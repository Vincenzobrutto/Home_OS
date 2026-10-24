# Revisione indipendente PR #16 su 7586806 — 24 ottobre 2026

## Perimetro

Punta `758680636d6130386c382b5e939a1cc6b1ccb3bf`, base backend `73288e5`. Worktree nuovo `Dimora-V5-cestino-ui-review-20261024`, branch proprio `codex/cestino-ui-review-20261024`, lotto registrato nel commit `bf4af32` prima dei test. Letti AGENTS.md, lotti, report e piano del lotto 2. Nessuna modifica al prodotto Claude, API/schema/backend o ai suoi checkout; solo un nuovo file di prove indipendenti e questa documentazione. Nessun merge, AI/email, `.env` o DB/API/storage reale.

## Rilievo E1 — P2, avviso riproposto dopo il cambio pagina

`frontend-v5/src/documents/TrashNotice.tsx:23`: il provider mantiene `notice` nello stato e ne nasconde soltanto la vista quando cambia pathname. Tornando alla pagina precedente, la condizione ridiventa vera e viene ricreato `TrashNoticeBar` con lo stato iniziale e una nuova chiave.

La prima riproduzione mette un documento nel cestino, cambia pagina e ritorna: l’avviso ricompare, contro il piano approvato («resta finché lo chiudi o cambi pagina»). La prova finale aggiunge prima del cambio pagina un **ripristino riuscito**, controlla che l’originale sia tornato nell’elenco, poi torna a Documenti. In questo caso il vecchio avviso dice nuovamente «spostato nel cestino» e offrire Annulla per il vecchio lifecycle, nonostante il documento sia attivo. La nuova prova deve rimanere invariata: eliminare lo stato dell’avviso alla navigazione, non nasconderlo soltanto.

Non raccomando il merge della PR #16 prima della correzione di E1 e delle dipendenze backend già segnalate nel [riesame della #9](https://github.com/Vincenzobrutto/Home_OS/pull/9#issuecomment-6389319003), con [PR #28 di riproduzioni](https://github.com/Vincenzobrutto/Home_OS/pull/28). Entrambi i branch richiedono ancora il successivo merge dal consolidamento a cura di Claude.

## Controlli positivi

- URL API e account context corrispondono al contratto. Per lo spostamento si usa la versione dell’originale; ripristino/purge usano `entry.version`. Chiavi di idempotenza inviate e nessun retry automatico.
- Il ripristino con risposta persa viene ripetuto manualmente con **stesso body, versione e chiave**, e torna correttamente al documento attivo. Nessun secondo effetto canonico richiesto.
- Invalidazione del prefisso account/casa dopo le mutazioni: elenco, conteggio del cestino e dati della casa vengono ricaricati. I test originali verificano sparizione/ricomparsa delle righe e conteggio.
- `/trash` **503** e `/trash` **senza risposta**: AppShell e navigazione dei documenti restano usabili, senza link con conteggio inventato e senza bloccare il rendering.
- Finestra: focus iniziale su Annulla, Tab/Shift+Tab confinati, Escape chiude e nessuna POST di spostamento viene eseguita. L’avviso usa `role=status`/aria-live; nessuna prova con screen reader fisico dichiarata.
- Nessun file dei test originali modificato, incluse le asserzioni del caricamento e i 9 casi di cestino.

## Esiti

| Verifica | Esito |
| --- | --- |
| Typecheck, lint, build | Superati, build 7,87 s |
| Tre file originali: Trash, AppShell, PendingUploads | **19/19** (9+3+7) |
| Prove indipendenti definitive | **4/5**: E1 rosso, gli altri quattro controlli verdi. Totale mirato **23/24**, con tutti i 19 originali verdi |
| Suite mock originale completa | **873/873 in 106 file**, nessuno saltato e retry0; escluso soltanto il file nuovo, già verificato a parte con E1 rosso esplicito |

La separazione è esplicita: `vitest run --project mock --maxWorkers=1 --retry=0 --exclude '**/TrashIndependentReview.test.tsx'` verifica tutti i test dell’autore; il file nuovo è eseguito a parte insieme ai tre moduli originali. Non presentare il branch di revisione come tutto verde finché la regressione indipendente è rossa. Ambiente depurato, preload rete offline, envDir vuota, dipendenze installate dalla sola cache locale con script/audit/fund disabilitati. Nessun test DB o servizio applicativo avviato per il frontend.

## Nota sulla riga del fornitore AI

Il conteggio della punta esaminata è 873 test mock in 106 file, diverso dal totale 876 riferito dall'autore. Confronto tra i file `src/**/*.test.{ts,tsx}` versionati su `7586806` e quelli nel report JSON: 106 contro 106, nessuna differenza. Nessun file originale omesso per ottenere il verde.

Il piano approvato prevede espressamente `aiAnalysisSucceeded`: il prodotto segue quella scelta. Una prima prova esplorativa chiedeva una riga condizionale anche per un esito negativo/ignoto, coprendo un eventuale invio esterno fallito; era un requisito più ampio di quello autorizzato. È stata scartata come criterio di accettazione, senza modificare alcuna asserzione dell’autore. La traccia esplorativa resta negli artefatti locali, fuori dal Git. Non è E2 né un secondo difetto imposto a Claude.

Resta il limite già dichiarato: il successo dell’analisi non è un indicatore completo dell’avvenuta trasmissione. Un eventuale indicatore dedicato o una diversa scelta del messaggio richiedono una decisione/lottizzazione successiva; nessun invio AI eseguito per verificarlo.

## Limiti

Prova browser indipendente non eseguita: il browser integrato ha negato l’origine mock 5186 per un’impostazione salvata. Nessun aggiramento e nessuna prova nell’app reale. Tastiera e stati asincroni sono verificati nel harness, non equivalgono a un collaudo fisico mobile o con screen reader. Le prove browser riferite nel report dell’autore restano sue evidenze, non vengono attribuite a questo riesame.
