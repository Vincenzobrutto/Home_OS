# Storia della casa — contratto API (BL-03), 22 ottobre 2026

Tutte le rotte sono sotto `/api/v5/homes/:homeId`, protette dalla sessione e dalla membership come Documenti/Attività. Dati personali dell'account autenticato; nessuna voce di altri membri, nemmeno nei conteggi. Le scritture richiedono un ruolo non `viewer` e l'header `Idempotency-Key` (16–100 caratteri `[A-Za-z0-9_-]`): stessa chiave e stesso corpo → stessa risposta; stessa chiave e corpo diverso → 409 `idempotency_conflict`.

## Lettura

`GET history?year=YYYY&cursor=&limit=1..50` (default 20)

```ts
{ today: 'YYYY-MM-DD'; total: number; years: Array<{ year: number; count: number }>;
  items: HistoryEntry[]; nextCursor: string | null; permissions: ('read'|'edit')[];
  limits: { titleMaxCodePoints: 120; descriptionMaxCodePoints: 1000; maxDocuments: 5; pageSize: 20; maxPageSize: 50; minYear: 1800 } }

type HistoryEntry = {
  id: string;                       // `${kind}:${sourceId}`
  kind: 'manual' | 'work' | 'activity_completed' | 'object_added';
  sourceId: string; title: string; description: string | null;
  date: { year: number; month: number | null; day: number | null; precision: 'year' | 'month' | 'day' };
  sortKey: string;                  // YYYY-MM-DD, '00' per le parti assenti
  source: 'declared' | 'dimora'; sourceLabel: string;
  link: { type: 'activity' | 'work' | 'object' | 'event'; id: string } | null;
  documents: Array<{ id: string; name: string }>;   // solo documenti leggibili da chi guarda
  unavailableDocuments: number;                       // collegati ma non più leggibili: solo conteggio
  version: number | null;                             // solo per `manual`
  period?: { from: string; to: string } | null;       // solo per `work`
}
```

Sorgenti: `manual` = eventi attivi inseriti a mano; `work` = lavori con almeno una spesa attiva dell'account, datati con la prima spesa (periodo prima–ultima); `activity_completed` = promemoria completati, data di completamento in Europe/Rome; `object_added` = oggetti personali, data di inserimento in Dimora (non acquisto). Ordine: `sortKey` decrescente, poi `manual`, `work`, `activity_completed`, `object_added`, poi `id`. `years` riguarda l'intera storia; `total` e `items` il filtro corrente. Il cursore è legato a account, casa e anno; un cursore di un altro filtro → 422 «Pagina non valida».

`GET history/events/:id` → `{ entry: HistoryEntry, permissions }` (solo eventi attivi propri; altrimenti 403).

## Scritture (POST)

- `history/events` — `{ title: string(1..120); description?: string|null (≤1000); date: { year: int ≥1800; month?: 1..12; day?: 1..31 valido per il mese, richiede month }; documentIds?: uuid[] (≤5, unici) }` → 201 `{ entry }`. Data mai futura rispetto a oggi (Europe/Rome). Ogni documento deve essere leggibile dall'autore nella stessa casa, altrimenti 403.
- `history/events/:id/updates` — `{ expectedVersion; title?; description?; date?; documentIds? }` (almeno un campo) → 200 `{ entry }`; versione diversa → 409 `history_version_conflict`.
- `history/events/:id/removal` — `{ expectedVersion }` → 200 `{ removed: { id } }`. Rimozione logica (`state: removed`); i documenti collegati restano invariati nell'archivio.

Errori di validazione: 422 `validation_error` con messaggio leggibile. Nessuna AI, nessun servizio esterno, nessuna modifica ad attività, lavori, oggetti o documenti.
