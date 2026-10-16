# Ricevuta assistita — Fase 3: collaudo e rifinitura

Compito 3 dell'incarico. Test di comportamento, build e lint, verifica nel browser di un **harness dimostrativo statico**.

**Cosa non è:** una prova client/API reale né un'integrazione.

## File nuovi o modificati (solo `frontend-v5/src/receipt-assistance/`)

| File | Ruolo |
|---|---|
| `ReceiptAssistant.scenarios.test.tsx` | 15 test: cinque scenari, form e validazione, ruoli, errori e rete |
| `ReceiptAssistant.test.tsx` | Aggiunto il test di regressione del dialogo, trovato nel browser |
| `SourceDialog.tsx` | **Correzione** (vedi sotto) |
| `demo/ReceiptDemo.tsx` | **Harness demo**: dati sintetici, callback simulate in memoria, banner «HARNESS DEMO · dati sintetici, nessuna API». Non è importato dall'app |
| `docs/…/screenshots/` | 4 immagini dell'harness |

## Test (comportamenti, non markup)

`npx vitest run --project mock src/receipt-assistance`: **34/34 passati**.

| File | Test | Contenuto |
|---|---|---|
| `model.test.ts` | 13 | Funzioni pure |
| `ReceiptAssistant.test.tsx` | 6 | Primo acquisto e payload; esito incerto con doppio clic bloccato e recupero; 403 senza residui; cambio di contesto; originale dopo errore di lettura; regressione del dialogo |
| `ReceiptAssistant.scenarios.test.tsx` | 15 | Vedi elenco sotto |

Contenuto di `ReceiptAssistant.scenarios.test.tsx`:
- **Cinque scenari del mockup:**
  - già collegati: riuso e completamento dei soli vuoti;
  - primo acquisto: scelte indipendenti 0/1 e 1/0, campi esclusi non bloccanti;
  - due compatibili: nessuna preselezione ed errore comprensibile;
  - conflitto: keep e defer per campo, senza opzione di sovrascrittura, confronto aperto nell'esito;
  - manuale: nessuna fonte e origini manuali.
- **Validazione e form:**
  - ritorno dal riepilogo con correzione e origine «Modificato da te»;
  - campi assenti «Da completare»;
  - importo negativo e data futura;
  - `today` dalle props.
- **Ruoli ed errori:**
  - sola lettura;
  - nessuna chiamata all'apertura, consenso esplicito, analisi non attiva dichiarata;
  - job incerto senza seconda analisi;
  - conferma rifiutata con form conservato;
  - promessa rifiutata come esito non noto, poi «non trovata» e reinvio **esplicito** con payload identico;
  - rinvio con esito negativo e rete onesti;
  - confronti rinviati riapribili;
  - «Mostra altri oggetti».

Esecuzioni:
- i 15 test nuovi sono passati al primo tentativo;
- il test di regressione è fallito una volta per un selettore, sul nome accessibile con testo nascosto; corretto il selettore, non il componente;
- nessun ciclo di riesecuzioni su test verdi.

## Build e lint (progetto intero, una volta prima e una dopo la correzione)

- `npm run build`: OK. Entry `index-UCpJias7.js` **492,67 kB**, gzip 149,98, invariata: i componenti non sono importati dall'app e non entrano nel bundle finché Codex non li aggancia, idealmente in modo lazy.
- `npm run lint`: OK.
- `npx tsc -b --noEmit`: OK.

## Browser: harness demo statico, nessun server

La porta 5174 del master era occupata e l'incarico chiede di non avviare server in quel caso. Ho quindi impacchettato `demo/ReceiptDemo.tsx` con l'esbuild già presente in `node_modules`, usando uno script nello **scratchpad della sessione** (non versionato), e l'ho aperto come file locale in Chrome headless con profilo separato.

Per rigenerarlo: bundle IIFE di `demo/ReceiptDemo.tsx` con `loader { '.module.css': 'local-css' }`, più un `index.html` con `<div id="root">`.

| Verifica | Esito |
|---|---|
| 6 scenari (5 del mockup più «contenuti lunghi») a 1280, 390 e 320 px: proposte e riepilogo | **Nessuno scorrimento orizzontale**, nessun elemento oltre la viewport |
| Ritorno dal riepilogo a 320 px | Importo modificato «180,00» conservato; focus sul titolo |
| Tastiera, scenario conflitto a 1280 | Ordine dei tab: oggetto → «Rivedi le differenze» → fonte marca → scelta marca → fonte modello → scelta modello → spesa → indietro → riepilogo. Indicatore di focus di 3 px |
| Dialogo della fonte a 390 e 320 px | Si apre da tastiera, sta nella viewport, focus su «Chiudi», estratto e slot di anteprima visibili |
| **Difetto trovato** | Dopo «Apri l'originale» il pulsante veniva disattivato durante l'apertura, il focus cadeva sul `body` ed **Esc non chiudeva più** il dialogo |
| Dopo la correzione | Esc chiude e il focus torna a «Vedi fonte · Nome dell'oggetto», a 390 e 320 px |
| Console | Nessun errore |

**Correzione in `SourceDialog.tsx`:**
- Esc ascoltato sul documento, con ref alla callback corrente;
- pulsante «Apri l'originale» con `aria-disabled` e guardia, invece di `disabled`, così resta focalizzabile;
- test di regressione aggiunto.

**Screenshot dell'harness, sintetici:**

| File | Contenuto |
|---|---|
| `01-confronto-1280.png` | Confronto keep/defer |
| `02-contenuti-lunghi-390.png` | Nomi e venditore lunghi, candidati senza preselezione |
| `03-fonte-dialogo-390.png` | Dialogo della fonte |
| `04-riepilogo-320.png` | Riepilogo |

Ho chiuso Chrome. Nessun server avviato; 5174, 3001 e 55432 non toccati.

## Limiti

- **Nessuna prova con client, API, DB o provider reali.** Le rotte R1 non sono attive e l'integrazione è di Codex.
- **Dialogo:** non ha un focus trap completo (Tab può uscire); Esc e restituzione del focus sono verificati.
- **Accessibilità:** nessuna dichiarazione WCAG e nessuna prova con screen reader o dispositivo fisico.
- **Selettore di data:** è il nativo del browser; il formato mostrato dipende dalla lingua di sistema.
