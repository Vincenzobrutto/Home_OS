# HomeOS — schema del database

Due file equivalenti, stessa struttura:

- **`prisma/schema.prisma`** — da usare se il backend è in NestJS/TypeScript (stack consigliato nell'architettura). Genera automaticamente le migration con `npx prisma migrate dev`.
- **`sql/schema.sql`** — DDL PostgreSQL puro, indipendente da qualsiasi ORM. Utile come riferimento o se in futuro si cambia stack backend.

Entrambi sono stati **validati eseguendoli davvero** su un'istanza PostgreSQL, incluso un test di inserimento end-to-end (casa → ambiente → asset → campo libero → documento → evento in cronologia) — non solo controllati a occhio.

## Corrispondenza con il modello del documento di architettura

| Tabella | Corrisponde a |
|---|---|
| `houses`, `rooms`, `assets` | Casa → Ambienti → Asset, esattamente come nel prototipo React |
| `asset_custom_fields` | I "Dati aggiuntivi" a campo libero della scheda Asset |
| `documents` | L'Inbox — `status` segue lo stesso ciclo `pending → analyzing → analyzed → confirmed` già nel prototipo |
| `asset_timeline_events` | La Cronologia di ogni Asset |
| `house_memberships` | Non ancora usata dal prototipo, ma predisposta per la condivisione futura (§3 dell'architettura) |

## Per iniziare con Prisma

```bash
npm install prisma @prisma/client
npx prisma migrate dev --name init
```

Richiede una variabile `DATABASE_URL` in un file `.env`, es.:
```
DATABASE_URL="postgresql://utente:password@localhost:5432/homeos"
```

## Prossimo passo naturale

Uno script di seed che ricrea i dati demo del prototipo (`initialAssets`, `initialRooms` in `homeos_prototype.jsx`) direttamente nel database, per avere da subito uno stato coerente da cui far partire le prime API.
