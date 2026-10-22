# BL-03 — Storia essenziale della casa, 22 ottobre 2026

Implementazione Claude su richiesta diretta del committente, branch `claude/bl02-garanzia` (dopo BL-02). Versione essenziale del piano `home-release-piano-20261016.md`: eventi esistenti + eventi inseriti a mano, filtro per anno.

## Decisioni del committente (22/10)

- **Date incomplete**: l'utente sceglie la precisione — solo anno, mese e anno, giorno. Nessun 1° gennaio inventato.
- **Contenuti della prima versione**: eventi inseriti a mano (con documenti), lavori e promemoria completati, oggetti aggiunti a Dimora, documenti marcati come rilevanti.
- **Backup verificato prima della migrazione**.

## Comportamento

- **Accesso**: Casa → «Esplora la casa» → «Storia della casa» (`/home/:homeId/storia`). Dal dettaglio documento, «Aggiungi alla storia» apre il modulo con il documento collegato e il nome suggerito come titolo; la data la sceglie l'utente (non quella di caricamento). Nell'indirizzo solo l'id del documento; il nome viaggia nello stato di navigazione.
- **Elenco**: gruppi per anno, data mostrata con la sua precisione («2020», «marzo 2020», «12 marzo 2020»), tipo e fonte: «Evento · Inserito da te», «Lavoro · Date delle spese registrate» (con periodo «dal … al …»), «Promemoria completato · Data di completamento», «Aggiunto a Dimora · Data di inserimento in Dimora, non di acquisto». Ogni voce apre la risorsa (attività, lavoro, oggetto); i documenti collegati aprono il dettaglio. Documenti non più leggibili: solo il conteggio, senza nome.
- **Filtro anno** con conteggi, nell'indirizzo (`?anno=2020`); «Mostra altri eventi» per le pagine successive.
- **Evento a mano**: «Cosa è successo», precisione e data (mai futura), descrizione facoltativa, fino a 5 documenti cercati per titolo/nome file. Modifica e rimozione con conferma («I documenti collegati restano nell'archivio»), versione attesa e richieste idempotenti; esito incerto → «Verifica con la stessa richiesta».
- **Privacy**: tutto è personale (account che guarda); eventi, lavori, promemoria e oggetti di altri membri non compaiono, neanche nei conteggi. Ruolo in sola lettura: consultazione senza comandi.
- **Esclusi** (piano): eventi condominiali, storia condivisa dell'immobile, passaggio di proprietà, registro tecnico delle modifiche. Lavori senza spese non compaiono (nessuna data affidabile).

## Contratto e dati

- Migrazione additiva `20261022150000_home_history`: tabelle `HomeHistoryEvent` (anno obbligatorio, mese/giorno facoltativi con vincoli, `sortKey` `YYYY-MM-DD` con `00` per le parti assenti, `documentIds`, stato `active|removed`, versione) e `HomeHistoryRequest` (idempotenza). Nessuna tabella esistente modificata.
- `GET /homes/:homeId/history?year=&cursor=&limit=` → `{ today, total, years[{year,count}], items[], nextCursor, permissions, limits }`. Ordine: data decrescente, poi evento manuale, lavoro, promemoria, oggetto, poi id; cursore per valore (stabile con eventi retrodatati e date uguali), legato all'anno filtrato.
- `POST /homes/:homeId/history/events` `{ title, description?, date:{year,month?,day?}, documentIds? }`; `GET …/events/:id`; `POST …/events/:id/updates` `{ expectedVersion, … }`; `POST …/events/:id/removal` `{ expectedVersion }`. Header `Idempotency-Key` obbligatorio sulle scritture. Documenti accettati solo se leggibili dall'autore. Dettagli in `home-history-api-contract.md`.

## Backup prima della migrazione

`backups/dimora-v5-20261022T133036Z/`: 65 tabelle ripristinate con conteggi uguali, 325 originali copiati e verificati per SHA256 dopo il ripristino isolato (porta 55439, poi spento). Lo script di Codex si fermava perché **104 `StoredFile` registrati non hanno il file sul disco**: tutti di account sintetici `@example.test` (case di collaudo dei test di integrazione) o orfani senza documento; nessuno delle case del committente. Usata una copia dichiarata dello script (`outputs/Dimora-V5-backup-verify-tolerant.mjs`) che registra i mancanti nel manifest. Tre cartelle `20261022T13…` precedenti sono tentativi falliti (`verified:false`), non copie valide.

## Verifiche

- Backend: typecheck, lint; `test/home-history.test.cjs` (date incomplete, futuro, corpi, privacy, documenti altrui redatti, lavori datati dalle spese, fuso Europe/Rome, filtro anno, cursore stabile con evento retrodatato) incluso in `npm test`. `npm test` completo: 205/208; i 3 falliti sono in `documents.test.cjs` (mock superati dalle modifiche documenti del 21/10), preesistenti e non toccati.
- Frontend: typecheck, lint; `src/history/History.test.tsx` 8/8 (formati, validazione, elenco/filtro, aggiunta con solo anno e documento cercato, apertura da documento, modifica/rimozione, sola lettura, vuoto); `casaLayout.test.tsx` aggiornato alla quarta destinazione. Suite completa: 796/814, i 18 falliti sono in file non toccati (contatti, filtri, bollette manuali, upload pendenti, Casa/verifiche, ricerca, routing, spese; `KeepHouseDocuments` instabile in parallelo).
- Browser su casa «COLLAUDO V2»: ingresso da Casa, elenco ed etichette, evento con solo anno creato, filtro 2019, «Aggiungi alla storia» da documento (annullato), rimozione con conferma, 390 px senza overflow. Nessun dato reale modificato; l'evento di prova è stato rimosso.

**Non verificato**: suite HTTP/DB (userebbero il database con dati personali).

## Osservazioni per il committente

- Gli oggetti «aggiunti a Dimora» possono dominare la storia (nella casa di collaudo 7 voci su 8). Se disturbano, si possono raggruppare o rendere filtrabili nella release successiva, insieme al filtro per oggetto già previsto.
