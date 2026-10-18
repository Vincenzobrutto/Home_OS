## Ricerca visibile e viste mobile Documenti — 18 ottobre 2026

Implementata la fase approvata: ricerca globale con ambito esplicito, filtri separati, alternanza Compila/Originale senza smontare i pannelli e intestazioni Fattura/Ricevuta corrette. [Comportamento, verifica e limiti](v5/document-search-mobile-20261018.md).

## Etichette della spesa da documento — 18 ottobre 2026

«Nessun oggetto» sostituito da «costo non attribuito a un oggetto», con spiegazione che gli oggetti collegati al documento non ricevono automaticamente il costo. Riepilogo ora «Data della spesa», coerente con il campo inserito. Solo testi, nessuna variazione ai collegamenti o ai dati.

## Collaudo browser Fattura/Ricevuta — 18 ottobre 2026

Verificati upload, spesa sola, nuovo oggetto facoltativo, collegamento esistente, Completati e costi unici. Corretto azzeramento dei campi spesa dopo aggiunta articolo. [Evidenze e osservazioni UX](v5/manual-purchase-flow-20261018.md#collaudo-browser-e-correzione-successiva).

## Fattura e Ricevuta: spesa diretta, oggetti facoltativi — 18 ottobre 2026

Implementato il percorso approvato: importo/data/fornitore/categoria senza oggetto obbligatorio; aggiunta o collegamento facoltativi, costo unico e solo documento conservati. [Comportamento, motivazione e verifiche](v5/manual-purchase-flow-20261018.md).

## Ultimo aggiornamento — Bolletta manuale senza oggetti

Corretta la scelta Bolletta nella scheda unica: converte la bozza manuale vuota, apre direttamente importo/data/fornitore/categoria e salva solo la spesa casa. Rimane «Conserva solo il documento». Input già salvati, decisioni e conferme pendenti sono protetti. [Verifica e limiti](v5/manual-bill-flow-20261018.md).

## Ultimo aggiornamento — Spazio di lavoro Documenti combinato

Implementata la proposta approvata: coda personale, scheda unica manuale/AI, sezioni Documento/Spese/Oggetti/Contatti e originale affiancato richiudibile con PDF locale. Il caricamento apre la prima fonte; salvataggio confermato e passaggio al documento successivo, filtri e recuperi preservati. 131 test frontend mirati, build/lint e prova browser sintetica riusciti. Nessun nuovo invio AI, API o schema. [Report e limiti](v5/document-editor-workspace-20261018.md).

## Ultimo aggiornamento — Correzioni UX Documenti 1–4

Implementati i quattro punti approvati dopo l’audit: scelta «Conserva solo il documento», chiusura della bozza dopo salvataggio metadati senza smontare la revisione, indicazioni cliccabili sui campi mancanti, ritorno ai dettagli con vista/filtri conservati. Nessuna nuova chiamata AI, migrazione o modifica legacy. Verifica e limiti: [report correzioni](v5/document-ux-fixes-20261018.md). Prossima fase: ricerca e mobile, da proporre prima di implementare.

## Ultimo aggiornamento — Documenti, proposta 3 implementata

Pagina iniziale Da fare, vista Completati e stati visibili per documento; proposta pronta distinta da dati salvati. Etichetta server workflowState account/casa/versione/SHA coerente con filtro prima del paging. Elimina sotto Altre azioni, selezione AI attivabile; recupero elaborazioni persistenti conservato anche con selezione chiusa. Nessuna nuova analisi a pagamento, schema/migrazione o modifica delle tre differenze legacy locali. Vedi docs/v5/document-workflow-20261018.md per verifica e limiti.

# Stato corrente — Dimora V5

Consolidamento 18 ottobre 2026. Baseline funzionale `4742bd4`, branch `dev/dimora-v5-local-20261013`, repository `Vincenzobrutto/Home_OS`. Chat sorgente «Configura ambiente Dimora V5», terminata. Questa consegna non cambia il software.

## Fonti e limiti

Ricostruzione dal checkout, schema/moduli, report versionati e ultimi turni disponibili della chat sorgente. Non è una rilettura integrale di ogni messaggio storico né una ricertificazione completa. Codice/test determinano l'implementazione; ADR recenti determinano le decisioni. Stati M1/M3/H3a nei vecchi handoff sono fotografie storiche. `docs/HANDOFF.md` resta per il legacy; `frontend-v5/HANDOFF.md` conserva una precedente consegna frontend.

## Implementato nel checkout

| Area | Stato ed evidenze da aprire se pertinenti |
|---|---|
| Account/casa | API reale, sessione, ruoli, permessi, CSRF e isolamento; [identity](v5/api-contract.md), moduli auth/homes |
| Originali | Upload, archivio, ricerca, anteprima, export e privacy; [contratto](v5/documents-api-contract.md) |
| Pagina Documenti | Aggiunta e revisione inline, filtri server Tutti/Da completare/Completati prima del paging, recupero upload parziali, eliminazione privata propria solo se inutilizzata; [report](v5/document-workspace-20261018.md) |
| Onboarding | Bozze manuali/AI con evidenze, conferme canoniche e protezione doppioni; [revisione unica](v5/unified-review-autonomous-final-20261018.md), `backend-v5/src/object-onboarding/` |
| Selezione AI | Fino a 20 fonti per gruppo, consenso sul gruppo esatto, coda persistente `proposalOnly`, nessuna creazione canonica alla sola analisi; [report](v5/document-classification-bulk-ai-20261018.md) |
| Ultima correzione | `4742bd4`: «Rivedi proposta» apre la bozza pronta anche dopo AI multipla. Se nessuna bozza è prodotta resta «Compila tramite AI». Chat sorgente: 17 test e prova browser riusciti, senza nuovo invio AI |
| Oggetti/ambienti/attività/spese | Moduli `home-objects`, `activities`, `expenses`; HomeObject/HomeRoom/HomeActivity/HomeExpense/EconomicWork nello schema. Non equivale a interventi tecnici estratti automaticamente |
| Rubrica | HomeContact personale account/casa, collegamenti, archivio e deduplica; [mini rubrica](v5/mini-rubrica-20261018.md), [estrazione V19](v5/contact-extraction-v19-20261018.md) |
| Automatico autorizzato | Orchestrazione persistente distinta da solo proposte; conferme via servizi canonici e opt-in separato contatti; `automatic.service.ts`, ADR del 18 ottobre |

## Parziale, aperto e problemi conosciuti

- Estrazione AI operativa ma qualità non universale: layout/quantità, ambiguità fra totali e richiamo sul corpus reale ancora da misurare. Fixture non dimostrano affidabilità generale. Vecchie bozze non arricchite retroattivamente.
- Cestino/ripristino per originali già analizzati/collegati assente: rimozione definitiva bloccata per conservare fonte e storico. Nessuna cascata economica.
- Link e ingressi precedenti ai lotti compatibili, convergenza completa sulla pagina Documenti da valutare.
- Modifiche non salvate nella revisione non hanno persistenza garantita su refresh/cambio pannello: usare «Salva e organizza» o «Decidi più avanti».
- OCR per pagina/PDF misti, fatti tecnici canonici editabili e attività/interventi da estrazione non completati dalla sola pipeline. Conformità è prima di tutto documento casa, senza obbligo di creare oggetti.
- Matching tra fonti non prova identità dell'esemplare. Costi mai divisi/sommati/attribuiti arbitrariamente.
- BL-10b e rubrica condivisa non completati; HomeContact non implica condivisione tra account/case.
- Hardening/antimalware e disponibilità pubblica non certificati dal collaudo locale. Problemi OAuth legacy non vanno attribuiti automaticamente alla V5.
- Consensi e budget nei report sono storici: leggere ledger e autorizzazione correnti prima di nuovi invii.

## Decisioni prodotto/UX

Documenti è il punto unico per aggiungere, consultare originale, compilare e rivedere: nessun secondo archivio. Classificazione non significa creazione di oggetti/spese. Dati mancanti completabili nella stessa revisione, sostituzioni esplicite. Proposta pronta riaperta senza nuova spesa AI. Conformità può completarsi come solo documento casa. Quantità multiple, fonti incomplete e conflitti richiedono revisione. Preservare collegamenti e originali consultabili.

## Ambiente e controlli mirati

- Node frontend >=22.12, lockfile autonomi. API `127.0.0.1:3001/api/v5`, frontend `127.0.0.1:5174` con proxy. DB/storage V5 separati; `.env`, DB e storage esclusi dal push.
- Avvio backend-v5: `npm run build`, poi `npm start`; frontend-v5: `npm run dev`. Prima di migrazioni verificare DB destinatario. [Modalità telefono](v5/phone-local-access-20261017.md): launcher esterno al repo; IP/PID storici.
- Frontend: `npm run typecheck`, `npm run lint`, `npm run build`; suite mirata `npx vitest run --project mock <file.test.tsx>`. `npm test` copre mock+fixtures, non prova da solo API reali.
- Backend: `npm run typecheck`, `npm run lint`, `npm run build`, offline `npm test` e `npm run test:object-onboarding`. Non tutti i nuovi test sono inclusi nello script generale: cercare in `test/` per modulo.
- Documenti: frontend `src/object-onboarding/DocumentCompilationActions.test.tsx`; DB dedicato `test/document-workspace.integration.test.cjs` e `test/automatic-intake.integration.test.cjs`, quando necessario e con provider finto. Per questa consegna niente scritture DB personale o invii live.
- Risultati storici nei report collegati; verifiche ripetute durante questa consegna nel resoconto finale.

## Git e dati esterni

Prima della consegna: HEAD `4742bd4`, 326 commit oltre origin/main e nessuno mancante rispetto a main; branch omonimo remoto assente, nessun upstream. Pubblicazione sul branch di sviluppo, senza merge su main.

Le modifiche documentali preesistenti in api/backlog/changelog/decisions/domain-model/roadmap e report fattura sono consolidate nel commit di consegna. Restano locali ed esclusi: `backend/src/main.ts` (bind HOST), `frontend/package.json` (lint su src), `frontend/public/dimora-v5-design.html` non tracciato. L'HTML è un ingresso locale al prototipo, non una nuova funzione V5.

Backup nel workspace della chat di consegna, cartella outputs: bundle Git pre-consegna verificato, patch binaria di tutte le differenze preesistenti, copia HTML. Non applicare integralmente la patch dopo il commit di consegna: contiene anche documentazione già consolidata. Il bundle include i branch/worktree committati, non le modifiche non committate degli altri worktree. DB, storage, segreti e file ignorati restano sul PC: trasferirli altrove richiede procedura separata protetta, senza versionarli.

## Verifica della consegna

Controlli ripetuti: git diff --check, link locali dei documenti di ingresso e ricerca firme di segreti sul diff documentale; nessun errore rilevato. Suite frontend DocumentCompilationActions: 10/10 test passati. Nessuna nuova build generale o prova DB/live, essendo il cambiamento esclusivamente documentale. Il riepilogo finale riporta hash e verifica effettiva del remote dopo push.
