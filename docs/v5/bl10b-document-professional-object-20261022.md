# BL-10b — Dal documento a spesa, professionista e oggetto, 22 ottobre 2026

Lavoro Claude su richiesta del committente, branch `claude/bl02-garanzia`. Prima un'analisi dello stato rispetto ai criteri di `frontend-v5/docs/home-backlog-proposition-20261016/BACKLOG.md` (BL-10b), poi l'unico intervento mancante.

## Stato trovato (già implementato da Codex, 18 ottobre)

| Criterio BL-10b | Dove |
|---|---|
| Professionista letto dal documento (nome, P.IVA/CF, telefono, email espliciti) con fonte | `contacts/extraction.ts`, `contact-extraction-v19-20261018.md` |
| Conferma unica di spesa, oggetti e professionista in una transazione, con idempotenza e versioni | `object-onboarding/onboarding.service.ts` (`confirm`), `contacts/proposals.ts` |
| Professionista scartabile: si salva solo la spesa | scelta `skip` del contatto |
| Stessa P.IVA/email/telefono: proposta del contatto esistente, mai doppione; solo nome → revisione | `resolveContact` |
| Bollette e fatture di negozio non creano professionisti | regole di estrazione v19 |
| Oggetto dell'intervento proposto solo con indizio dal documento (nome citato, identità prodotto, stesso fornitore e descrizione), altrimenti nessun collegamento | `object-onboarding/object-suggestions.ts`, `HouseExpenseProposal.tsx` (scelta oggetto della spesa) |

L'analisi iniziale di Claude aveva indicato come mancante anche la proposta dell'oggetto per le spese d'intervento: era un errore, è già presente e si basa sul testo letto dall'AI. Non serve modificare l'estrattore né una nuova campagna a pagamento.

## Intervento: professionista collegato anche a spesa e oggetti

Decisione del committente (22/10): collegamento automatico.

- Nella stessa transazione della conferma, ogni professionista confermato viene collegato, oltre che al documento, alle **spese** e agli **oggetti** confermati dalla stessa bozza (anche in conferme precedenti della stessa bozza) e agli oggetti/caldaie già collegati a quelle spese. Così sulla scheda dell'oggetto compaiono spesa e professionista.
- Solo risorse ancora leggibili e attive; oggetti archiviati, caldaie non leggibili, voci scartate e risorse di altri account esclusi; contatti archiviati non collegati. Collegamenti già attivi non duplicati; una sola nuova versione del contatto per conferma. Vale anche per il caricamento automatico con consenso ai contatti.
- I collegamenti si tolgono come gli altri dalla Rubrica o dalle schede. Riepilogo della revisione: «Ognuno viene collegato al documento, alla spesa e agli oggetti salvati con questa conferma.»
- Nessuna migrazione, nessun nuovo endpoint, nessuna chiamata AI.

## Verifiche

- Backend: typecheck/build, lint; `test/contact-confirmation-links.test.cjs` (collegamenti a spesa, oggetto della spesa e oggetti confermati; esclusione di archiviati/illeggibili/scartati/altro account; replay senza duplicati né nuove versioni) incluso in `npm test` → 210/213, i 3 falliti sono i preesistenti di `documents.test.cjs`.
- **Integrazione su database temporaneo vuoto** (cluster creato nella cartella di lavoro sulla porta 55432 con il DB vero fermo, migrazioni applicate, poi spento e cancellato; DB vero riavviato e controllato): `object-onboarding.integration` + `automatic-intake.integration` 54/57. Passano conferma unica, contatti accettati/scartati, replay e rollback atomico, opt-in contatti del caricamento automatico. I 3 falliti riguardano la regola del periodo delle bollette («Indica il periodo di riferimento della bolletta»), test non aggiornati dopo bb5b83d, non legati a questo intervento.
- Frontend: typecheck, lint; suite onboarding/intake/contatti 188/198, i 10 falliti sono i preesistenti `ManualBillFlow` e `PendingUploads`.

**Non verificato**: prova nel browser con una bozza reale (nella casa di collaudo non ci sono bozze con professionista e una nuova analisi avrebbe un costo); qualità di estrazione su documenti reali (gate Fase 0 «qualità AI»).
