# HomeOS — punto di partenza per Claude Code

Questo file riassume tutto quello che è stato deciso in una lunga sessione di lavoro con Claude (in chat, non in Claude Code) prima di questo momento. Leggilo per intero prima di iniziare a scrivere codice: contiene decisioni di prodotto che non sono ovvie dal solo codice.

## Cos'è HomeOS

Piattaforma che crea il "Digital Twin" di una casa: raccoglie documenti (fatture, certificati, manuali) e li collega agli elementi fisici della casa (Asset), non li archivia genericamente. Centro del sistema = l'Asset, non il documento.

## Decisioni di prodotto già prese (non rimetterle in discussione senza motivo)

1. **Ambienti ≠ Asset.** Le stanze (cucina, soggiorno, camera, bagno) sono un'entità separata (`rooms`), senza documenti o garanzie proprie — sono solo un contenitore. Gli Asset (caldaia, impianto elettrico, elettrodomestici...) hanno un `room_id` opzionale: nullable = impianto "di casa", non legato a una stanza specifica.
2. **L'AI propone, l'utente conferma.** In nessun punto del sistema l'estrazione AI scrive direttamente su un Asset. Il documento viene analizzato, i dati estratti vengono mostrati, e solo un'azione esplicita dell'utente ("Conferma e applica dati" / "Solo collega documento") scrive davvero sui dati.
3. **Campi liberi per gli Asset.** Oltre a `installed_at`/`warranty_until` (strutturati), ogni Asset ha `asset_custom_fields` (etichetta/valore libero) — perché un impianto elettrico e una caldaia hanno dati rilevanti diversi, e non ha senso forzare uno schema rigido uguale per tutti.
4. **Creazione automatica di Asset mancanti.** Se un documento in Inbox suggerisce un tipo di asset non ancora presente in casa (es. certificato idraulico ma nessun asset "Impianto idraulico" esiste), il sistema propone di crearlo alla conferma dell'utente, invece di forzare un'associazione sbagliata.
5. **Stato dell'Asset calcolato, non manuale.** `status` (ok/attention/due) deve derivare da garanzie scadute e documenti mancanti, non essere un campo che l'utente imposta a mano.

## Stack scelto (vedi `architettura/homeos_architettura_tecnica.md` per il perché)

- Backend: Node.js + TypeScript, NestJS
- Database: PostgreSQL — schema già pronto e **validato eseguendolo per davvero** in `backend/prisma/schema.prisma` (Prisma) e `backend/sql/schema.sql` (DDL puro equivalente)
- Storage documenti: S3-compatible (da scegliere in fase di deploy, non urgente ora)
- AI per estrazione documenti: **Claude** (Sonnet come motore primario, Haiku per instradare i documenti più semplici) — scelta già chiusa dopo un confronto con GPT-4o e i servizi OCR dedicati (Textract/Document AI/Azure), vedi architettura §5

## Cosa è già stato validato concretamente (non da rifare)

- Il modello dati è stato testato con un inserimento reale end-to-end nel database (casa → ambiente → asset → campo libero → documento → evento cronologia) — funziona.
- L'estrazione AI è stata testata su 4 documenti reali (fattura, dichiarazione di conformità, relazione materiali, schema manoscritto) — vedi `architettura/homeos_architettura_tecnica.md` §5bis per i risultati e le implicazioni (soglia di confidenza, riconoscimento documenti correlati allo stesso intervento).
- Il prototipo React (`prototipo/homeos_prototype.jsx`) implementa l'intero flusso con dati finti — è la UI **già validata con test utenti reali**, da ricollegare alle API vere man mano che si costruiscono, non da riscrivere da zero.

## File in questa cartella

- `prototipo/` — il prototipo React cliccabile, dati mock. Riferimento per capire esattamente come deve comportarsi la UI.
- `architettura/` — documento di architettura completo, include schema dati dettagliato, endpoint API previsti, e le note del test AI.
- `backend/` — schema del database, sia Prisma che SQL puro, già validati.
- `ai-test/` — script Node.js standalone che chiama l'API Claude per estrarre dati da un documento. Prima bozza funzionante della pipeline AI, da integrare nel backend vero.

## Primo compito suggerito

Inizializzare un progetto NestJS in questa cartella, collegare Prisma allo schema già pronto in `backend/prisma/schema.prisma`, e implementare le prime API CRUD per `houses`, `rooms`, `assets` come descritte in `architettura/homeos_architettura_tecnica.md` §4 — partendo da lì, non da zero.
