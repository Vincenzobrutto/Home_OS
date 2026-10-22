import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type HomeHistoryEvent } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest } from '../security';
import { canReadDocument } from '../documents/access';
import { conflict, invalid, object } from '../review/domain';
import { ReviewService } from '../review/review.service';
import { ActivityClock, temporal } from '../activities/domain';
import {
  compareEntries, createEventBody, dayOf, eventIdParam, historyLimits, historyQuery, kindRank, precisionOf, removalBody, sortKeyOf, updateEventBody,
  type EventDate, type HistoryEntry, type HistoryKind,
} from './domain';

type Tx = Prisma.TransactionClient;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const romeDay = (at: Date) => temporal(at).today;
const withPrecision = (d: EventDate) => ({ ...d, precision: precisionOf(d) });

/**
 * BL-03 — storia della casa. Lettura aggregata lato server, solo per chi guarda (accountId): eventi inseriti a mano,
 * lavori (datati con le proprie spese), promemoria completati e oggetti aggiunti a Dimora. Nessun registro tecnico.
 * Privacy prima di paging e conteggi: ogni sorgente è già filtrata per account e casa.
 */
@Injectable()
export class HomeHistoryService {
  constructor(private readonly db: PrismaService, private readonly access: ReviewService, private readonly clock: ActivityClock) {}

  private async read<T>(accountId: string, homeId: string, action: (tx: Tx, edit: boolean, today: string) => Promise<T>) {
    return this.db.$transaction(async tx => {
      await this.access.lock(tx, accountId, homeId);
      const member = await this.access.require(tx, accountId, homeId);
      return action(tx, member.role !== 'viewer', temporal(this.clock.now()).today);
    }, { timeout: 15000, maxWait: 15000 });
  }

  /** Documenti leggibili da chi guarda; gli altri sono solo contati, senza nome. */
  private async documents(tx: Tx, accountId: string, homeId: string, idsList: string[]) {
    if (!idsList.length) return { documents: [] as Array<{ id: string; name: string }>, unavailable: 0 };
    const rows = await tx.document.findMany({ where: { id: { in: idsList }, homeId }, include: { original: true } });
    const readable = new Map(rows.filter(r => r.original && canReadDocument(r, accountId)).map(r => [r.id, r.name]));
    return { documents: idsList.filter(id => readable.has(id)).map(id => ({ id, name: readable.get(id)! })), unavailable: idsList.filter(id => !readable.has(id)).length };
  }
  private async requireReadableDocuments(tx: Tx, accountId: string, homeId: string, idsList: string[]) {
    const view = await this.documents(tx, accountId, homeId, idsList);
    if (view.unavailable) throw new ForbiddenException('Accesso non consentito.');
  }

  private async manualEntry(tx: Tx, row: HomeHistoryEvent): Promise<HistoryEntry> {
    const date: EventDate = { year: row.year, month: row.month, day: row.day };
    const docs = await this.documents(tx, row.accountId, row.homeId, row.documentIds as string[]);
    return { id: `manual:${row.id}`, kind: 'manual', sourceId: row.id, title: row.title, description: row.description, date: withPrecision(date), sortKey: row.sortKey,
      source: 'declared', sourceLabel: docs.documents.length ? 'Inserito da te · con documenti' : 'Inserito da te', link: { type: 'event', id: row.id },
      documents: docs.documents, unavailableDocuments: docs.unavailable, version: row.version };
  }

  private async entries(tx: Tx, accountId: string, homeId: string): Promise<HistoryEntry[]> {
    const scope = { accountId, homeId };
    const [events, works, activities, objects] = await Promise.all([
      tx.homeHistoryEvent.findMany({ where: { ...scope, state: 'active' } }),
      tx.economicWork.findMany({ where: scope, include: { expenses: { where: { accountId, homeId, state: 'active' }, select: { spentOn: true } } } }),
      tx.homeActivity.findMany({ where: { ...scope, state: 'completed', completedAt: { not: null } } }),
      tx.homeObject.findMany({ where: scope, select: { id: true, name: true, createdAt: true } }),
    ]);
    const result: HistoryEntry[] = [];
    for (const row of events) result.push(await this.manualEntry(tx, row));
    for (const work of works) {
      // Un lavoro si data con le sue spese, non con la registrazione in Dimora; senza spese non ha una data affidabile.
      const days = work.expenses.map(e => e.spentOn).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
      if (!days.length) continue;
      const from = days[0]!, to = days.at(-1)!, date = dayOf(from);
      result.push({ id: `work:${work.id}`, kind: 'work', sourceId: work.id, title: work.name, description: null, date: withPrecision(date), sortKey: sortKeyOf(date),
        source: 'dimora', sourceLabel: from === to ? 'Data della spesa registrata' : 'Date delle spese registrate', link: { type: 'work', id: work.id },
        documents: [], unavailableDocuments: 0, version: null, period: { from, to } });
    }
    for (const activity of activities) {
      const date = dayOf(romeDay(activity.completedAt!));
      result.push({ id: `activity_completed:${activity.id}`, kind: 'activity_completed', sourceId: activity.id, title: activity.title, description: null, date: withPrecision(date), sortKey: sortKeyOf(date),
        source: 'dimora', sourceLabel: 'Data di completamento', link: { type: 'activity', id: activity.id }, documents: [], unavailableDocuments: 0, version: null });
    }
    for (const item of objects) {
      // «Aggiunto a Dimora» non significa acquistato o installato: la data è quella di inserimento nell'app.
      const date = dayOf(romeDay(item.createdAt));
      result.push({ id: `object_added:${item.id}`, kind: 'object_added', sourceId: item.id, title: item.name, description: null, date: withPrecision(date), sortKey: sortKeyOf(date),
        source: 'dimora', sourceLabel: 'Data di inserimento in Dimora, non di acquisto', link: { type: 'object', id: item.id }, documents: [], unavailableDocuments: 0, version: null });
    }
    return result.sort(compareEntries);
  }

  list(accountId: string, homeId: string, input: unknown) {
    const query = historyQuery(input);
    return this.read(accountId, homeId, async (tx, edit, today) => {
      const all = await this.entries(tx, accountId, homeId);
      const years = [...all.reduce((map, e) => map.set(e.date.year, (map.get(e.date.year) ?? 0) + 1), new Map<number, number>())].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count }));
      const filtered = query.year === null ? all : all.filter(e => e.date.year === query.year);
      const binding = digest(JSON.stringify([accountId, homeId, 'history', query.year]));
      let start = 0;
      if (query.cursor) {
        let cursor: { binding: string; sortKey: string; kind: HistoryKind; id: string };
        try { cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')); } catch { throw invalid('Pagina non valida.'); }
        if (!cursor || cursor.binding !== binding || typeof cursor.sortKey !== 'string' || typeof cursor.id !== 'string' || !(cursor.kind in kindRank)) throw invalid('Pagina non valida.');
        // Posizione per valore, non per indice: un evento aggiunto o rimosso non sposta la pagina successiva.
        start = filtered.findIndex(e => compareEntries(e, cursor) > 0);
        if (start < 0) start = filtered.length;
      }
      const items = filtered.slice(start, start + query.limit), last = items.at(-1);
      const nextCursor = last && start + items.length < filtered.length ? Buffer.from(JSON.stringify({ binding, sortKey: last.sortKey, kind: last.kind, id: last.id })).toString('base64url') : null;
      return { today, total: filtered.length, years, items, nextCursor, permissions: edit ? ['read', 'edit'] : ['read'], limits: historyLimits };
    });
  }

  private async event(tx: Tx, accountId: string, homeId: string, id: string) {
    const row = await tx.homeHistoryEvent.findFirst({ where: { id: eventIdParam(id), accountId, homeId, state: 'active' } });
    if (!row) throw new ForbiddenException('Accesso non consentito.');
    return row;
  }
  get(accountId: string, homeId: string, id: string, input: unknown) {
    object(input ?? {}, []);
    return this.read(accountId, homeId, async (tx, edit) => ({ entry: await this.manualEntry(tx, await this.event(tx, accountId, homeId, id)), permissions: edit ? ['read', 'edit'] : ['read'] }));
  }

  private async mutate(accountId: string, homeId: string, operation: 'create' | 'update' | 'remove', target: string, input: unknown, key?: string) {
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    if (target) eventIdParam(target);
    const today = temporal(this.clock.now()).today;
    const body = operation === 'create' ? createEventBody(input, today) : operation === 'update' ? updateEventBody(input, today) : removalBody(input);
    return this.db.$transaction(async tx => {
      await this.access.lock(tx, accountId, homeId); await this.access.require(tx, accountId, homeId, true);
      const lookup = { accountId_homeId_operation_target_key: { accountId, homeId, operation, target, key } };
      const hash = digest(JSON.stringify(body)), prior = await tx.homeHistoryRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata per una richiesta diversa.');
        return prior.response;
      }
      const now = this.clock.now();
      let response: unknown;
      if (operation === 'create') {
        const data = body as ReturnType<typeof createEventBody>;
        await this.requireReadableDocuments(tx, accountId, homeId, data.documentIds);
        const row = await tx.homeHistoryEvent.create({ data: { accountId, homeId, ...data, documentIds: json(data.documentIds), createdAt: now, updatedAt: now } });
        response = { entry: await this.manualEntry(tx, row) };
      } else {
        const old = await this.event(tx, accountId, homeId, target);
        if (old.version !== (body as { expectedVersion: number }).expectedVersion) throw conflict('history_version_conflict', 'L’evento è cambiato. Rileggi prima di continuare.');
        if (operation === 'remove') {
          await tx.homeHistoryEvent.update({ where: { id: old.id }, data: { state: 'removed', version: { increment: 1 }, updatedAt: now } });
          response = { removed: { id: old.id } };
        } else {
          const { expectedVersion: _expected, documentIds, ...changes } = body as ReturnType<typeof updateEventBody>; void _expected;
          if (documentIds) await this.requireReadableDocuments(tx, accountId, homeId, documentIds);
          const row = await tx.homeHistoryEvent.update({ where: { id: old.id }, data: { ...changes, ...(documentIds ? { documentIds: json(documentIds) } : {}), version: { increment: 1 }, updatedAt: now } });
          response = { entry: await this.manualEntry(tx, row) };
        }
      }
      await tx.homeHistoryRequest.create({ data: { accountId, homeId, operation, target, key, digest: hash, response: json(response), createdAt: now } });
      return response;
    }, { timeout: 15000, maxWait: 15000 });
  }
  create(a: string, h: string, input: unknown, key?: string) { return this.mutate(a, h, 'create', '', input, key); }
  update(a: string, h: string, id: string, input: unknown, key?: string) { return this.mutate(a, h, 'update', id, input, key); }
  remove(a: string, h: string, id: string, input: unknown, key?: string) { return this.mutate(a, h, 'remove', id, input, key); }
}
