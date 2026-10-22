# BL-01 — Prossimo promemoria dopo il completamento, 22 ottobre 2026

Implementazione Claude su richiesta diretta del committente, branch `claude/bl02-garanzia` (dopo BL-02 e BL-03). Perimetro del piano `home-release-piano-20261016.md`: nessuna ricorrenza, scheduler, costo o adempimento automatico (non è BL-09/S2).

## Decisione del committente (22/10)

- **Base della proposta: giorno del completamento** (calendario Europe/Rome), non la scadenza precedente.

## Comportamento

- Dopo «Conferma completamento» compare il riquadro **Prossimo promemoria**: «Tra 6 mesi», «Tra 12 mesi», «Tra 24 mesi» oppure una data libera (mai prima del completamento). Nessuna opzione preselezionata. Mesi di calendario: se il giorno manca nel mese di arrivo si usa l'ultimo (31 agosto + 6 mesi → 28/29 febbraio), non multipli di 30 giorni.
- Titolo e descrizione copiati e modificabili; «Mantieni i collegamenti a oggetti e caldaia ancora disponibili» (attivo di default). Collegamenti revocati, oggetti archiviati o caldaie non più leggibili non vengono copiati né nominati.
- «Non ora» chiude senza creare nulla; su un'attività completata senza successivo resta «Proponi il prossimo promemoria».
- Il focus resta sullo stato aggiornato dopo il completamento (comportamento H1 esistente); il riquadro prende il focus solo se aperto dall'utente. «Riapri attività» resta disponibile.
- Legame leggibile in entrambe: sulla fonte «Prossimo promemoria: titolo · data · stato» e nella storia «Prossimo promemoria creato»; sul successivo «Promemoria precedente: titolo · completato il …».
- **Un solo successivo per attività**, anche dopo riapertura e nuovo completamento (vincolo unico nel DB): in quel caso si vede il collegamento, nessuna nuova proposta.

## Contratto e dati

- Migrazione additiva `20261022180000_activity_follow_up`: colonna `HomeActivity.previousActivityId` (unica, FK su `HomeActivity`, vincolo non auto-riferito). Nessun dato esistente modificato.
- `POST /homes/:homeId/activities/:id/follow-up` con `Idempotency-Key`, corpo `{ expectedVersion, title, description?, dueDate, copyLinks? }` → 201 `{ asOf, today, timeZone, activity }`. Errori: 409 `activity_version_conflict`, `invalid_activity_state` (fonte non completata), `follow_up_exists`, `idempotency_conflict`; 422 per data assente/non valida o precedente al completamento; 403 fuori account/casa o viewer.
- Il dettaglio attività e le risposte di scrittura includono `completedOn` e `followUp: { previous, next }`; gli elenchi includono solo `completedOn`. Storia: nuovo tipo `follow_up_created` sulla fonte (senza modifiche ai campi). Export personale: `previousActivityId` (solo riferimenti propri) e nuovo tipo di storia riconosciuto.
- Creazione, collegamenti copiati (`ObjectResourceLink` + `ObjectEvent linked`) e voci di storia nella stessa transazione.

## Backup prima della migrazione

`backups/dimora-v5-20261022T154341Z/`: 67 tabelle ripristinate in cluster isolato con conteggi uguali, 325 originali verificati, 104 mancanti dichiarati (stessi record sintetici/orfani già annotati nel backlog). Un tentativo precedente (`…154320Z`) era fallito perché il database non era avviato: cartelle vuote rimosse.

## Verifiche

- Backend: typecheck, lint; `test/activity-follow-up.test.cjs` (mesi di calendario/bisestili, corpo, legame, collegamenti leggibili copiati e revocati esclusi, storia su entrambe, data prima del completamento nel fuso di Roma, versione, retry stessa chiave, chiave riusata con dati diversi, nessun secondo successivo, fonte aperta, altro account) incluso in `npm test`. `npm test`: 208/211, i 3 falliti sono i preesistenti di `documents.test.cjs`.
- Frontend: typecheck, lint; `src/routes/activityFollowUp.test.tsx` 4/4 (proposta dopo completamento, 6/12/24 mesi, invio idempotente, legami, «Non ora», data non valida, collegamenti disattivati, riapertura senza duplicati); `activities.test.tsx` invariato e verde. Suite completa 804/818: i 14 falliti sono in 5 file non toccati (filtri documenti, bollette manuali, upload pendenti, `casaTasks`, routing), già annotati.
- Browser su «COLLAUDO V2»: creazione promemoria sintetico, completamento, proposta, «Tra 6 mesi» → 22/04/2027, doppio clic (due richieste con la stessa chiave, **una sola attività creata**), legami e storia, dettaglio del successivo a 390 px senza overflow. Il successivo di prova è stato annullato (le attività non si eliminano).

**Non verificato**: suite HTTP/DB (userebbero il database con dati personali); cambio account/casa nel browser (coperto dal controllo di accesso del servizio e dal test con altro account).
