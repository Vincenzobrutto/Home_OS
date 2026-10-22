import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type HomeActivity } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest } from '../security';
import { conflict, invalid, object, uuid } from '../review/domain';
import { ReviewService } from '../review/review.service';
import { readableReceiptObjectIds } from '../receipt-assistance/access';
import { ActivityClock, Snapshot, actionBody, createBody, dueState, followUpBody, limits, listQuery, plusDays, temporal, updateBody } from './domain';
type Tx = Prisma.TransactionClient;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const snapshot = (row: HomeActivity): Snapshot => ({ title: row.title, description: row.description, dueDate: row.dueDate, state: row.state, assetId: row.assetId });
@Injectable()
export class ActivitiesService {
  constructor(private readonly db: PrismaService, private readonly access: ReviewService, private readonly clock: ActivityClock) {}
  private async activity(tx: Tx, accountId: string, homeId: string, id: string) {
    const row = await tx.homeActivity.findFirst({ where: { id: uuid(id), accountId, homeId } });
    if (!row) throw new ForbiddenException('Accesso non consentito.'); return row;
  }
  private async link(tx: Tx, accountId: string, homeId: string, id: string | null, strict = false) {
    if (!id) return { state: 'none' as const, asset: null };
    try {
      await tx.$queryRaw`SELECT id FROM "BoilerAsset" WHERE id=${id} FOR SHARE`;
      const row = await this.access.asset(tx, accountId, homeId, id);
      await this.access.assetSources(tx, accountId, homeId, id);
      return { state: 'linked' as const, asset: { id: row.id, name: row.name } };
    } catch (error) {
      if (!(error instanceof ForbiddenException) || strict) throw error;
      return { state: 'unavailable' as const, asset: null };
    }
  }
  /** BL-01: legame con il promemoria precedente/successivo, solo nel dettaglio e nelle risposte di scrittura (stesso account). */
  private async followUpLinks(tx: Tx, row: HomeActivity) {
    const [previous, next] = await Promise.all([
      row.previousActivityId ? tx.homeActivity.findFirst({ where: { id: row.previousActivityId, accountId: row.accountId, homeId: row.homeId }, select: { id: true, title: true, completedAt: true } }) : null,
      tx.homeActivity.findFirst({ where: { previousActivityId: row.id, accountId: row.accountId, homeId: row.homeId }, select: { id: true, title: true, dueDate: true, state: true } }),
    ]);
    return { previous: previous ? { id: previous.id, title: previous.title, completedOn: previous.completedAt ? temporal(previous.completedAt).today : null } : null, next };
  }
  private async project(tx: Tx, row: HomeActivity, edit: boolean, today: string, detail = false) {
    return { ...(detail ? { followUp: await this.followUpLinks(tx, row) } : {}), completedOn: row.completedAt ? temporal(row.completedAt).today : null, id: row.id, homeId: row.homeId, title: row.title, description: row.description, dueDate: row.dueDate, state: row.state,
      dueState: dueState(row, today), assetLink: await this.link(tx, row.accountId, row.homeId, row.assetId), version: row.version, origin: 'user_created',
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null, permissions: edit ? ['read', 'edit'] : ['read'] };
  }
  private async historical(tx: Tx, accountId: string, homeId: string, value: Prisma.JsonValue | null) {
    if (value === null) return null;
    const { assetId, ...fields } = value as unknown as Snapshot;
    return { ...fields, assetLink: await this.link(tx, accountId, homeId, assetId) };
  }
  private async read<T>(accountId: string, homeId: string, action: (tx: Tx, editing: boolean, context: ReturnType<typeof temporal>) => Promise<T>) {
    return this.db.$transaction(async tx => {
      await this.access.lock(tx, accountId, homeId);
      const member = await this.access.require(tx, accountId, homeId);
      return action(tx, member.role !== 'viewer', temporal(this.clock.now()));
    }, { timeout: 15000, maxWait: 15000 });
  }
  capabilities(accountId: string, homeId: string, query: unknown) {
    object(query, []);
    return this.read(accountId, homeId, async (_tx, _edit, context) => ({ ...context, apiVersion: 'activities-v1', enabled: true, isSimulation: false, limits }));
  }
  get(accountId: string, homeId: string, id: string, query: unknown) {
    object(query, []); uuid(id);
    return this.read(accountId, homeId, async (tx, edit, context) => ({ ...context, activity: await this.project(tx, await this.activity(tx, accountId, homeId, id), edit, context.today, true) }));
  }
  private async mutate(accountId: string, homeId: string, operation: string, target: string, body: ReturnType<typeof createBody> | ReturnType<typeof updateBody> | ReturnType<typeof actionBody>, key?: string) {
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    if (target) uuid(target);
    return this.db.$transaction(async tx => {
      await this.access.lock(tx, accountId, homeId); await this.access.require(tx, accountId, homeId, true);
      const old = target ? await this.activity(tx, accountId, homeId, target) : null;
      const lookup = { accountId_homeId_operation_target_key: { accountId, homeId, operation, target, key } };
      const hash = digest(JSON.stringify(body)), prior = await tx.activityRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata per una richiesta diversa.');
        const response = prior.response as unknown as { activity: { id: string; assetLink: { asset: { id: string } | null } } };
        await this.activity(tx, accountId, homeId, response.activity.id);
        if (response.activity.assetLink.asset) await this.link(tx, accountId, homeId, response.activity.assetLink.asset.id, true);
        return prior.response;
      }
      if ('assetId' in body && body.assetId) {
        await this.link(tx, accountId, homeId, body.assetId, true);
        if (target) {
          const primary = await tx.objectResourceLink.findFirst({ where: { activityId: target, accountId, homeId, state: 'active' } });
          if (primary && primary.boilerId !== body.assetId) throw conflict('resource_already_linked', 'Rimuovi prima il collegamento all’oggetto attuale.');
        }
      }
      const now = this.clock.now(), context = temporal(now);
      let row: HomeActivity, kind = operation === 'create' ? 'created' : operation === 'update' ? 'updated' : operation === 'complete' ? 'completed' : operation === 'cancel' ? 'cancelled' : 'reopened';
      if (!old) row = await tx.homeActivity.create({ data: { accountId, homeId, ...body as ReturnType<typeof createBody>, createdAt: now, updatedAt: now } });
      else {
        if (!('expectedVersion' in body) || old.version !== body.expectedVersion) throw conflict('activity_version_conflict', 'L’attività è cambiata. Rileggi prima di continuare.');
        if ((operation === 'reopen' && old.state === 'open') || (operation !== 'reopen' && old.state !== 'open')) throw conflict('invalid_activity_state', 'Azione non consentita nello stato attuale.');
        const changes: Prisma.HomeActivityUncheckedUpdateInput = operation === 'update' ? Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'expectedVersion')) : { state: operation === 'complete' ? 'completed' : operation === 'cancel' ? 'cancelled' : 'open', completedAt: operation === 'complete' ? now : null, cancelledAt: operation === 'cancel' ? now : null };
        if (operation === 'update' && Object.entries(changes).every(([k, v]) => old[k as keyof HomeActivity] === v)) { row = old; kind = ''; }
        else row = await tx.homeActivity.update({ where: { id: old.id }, data: { ...changes, version: { increment: 1 }, updatedAt: now } });
      }
      if (kind) await tx.activityHistory.create({ data: { activityId: row.id, accountId, at: now, kind, note: 'note' in body ? body.note : null, before: old ? json(snapshot(old)) : Prisma.JsonNull, after: json(snapshot(row)) } });
      const response = { ...context, activity: await this.project(tx, row, true, context.today, true) };
      await tx.activityRequest.create({ data: { accountId, homeId, operation, target, key, digest: hash, response: json(response), createdAt: now } });
      return response;
    }, { timeout: 15000, maxWait: 15000 });
  }
  create(a: string, h: string, input: unknown, key?: string) { return this.mutate(a, h, 'create', '', createBody(input), key); }
  update(a: string, h: string, id: string, input: unknown, key?: string) { return this.mutate(a, h, 'update', id, updateBody(input), key); }
  action(a: string, h: string, id: string, action: 'complete' | 'cancel' | 'reopen', input: unknown, key?: string) { return this.mutate(a, h, action, id, actionBody(input), key); }
  /** Copia i collegamenti a oggetti/caldaie ancora leggibili; quelli revocati o archiviati non vengono copiati né nominati. */
  private async copyObjectLinks(tx: Tx, a: string, h: string, sourceId: string, targetId: string, now: Date) {
    const links = await tx.objectResourceLink.findMany({ where: { accountId: a, homeId: h, activityId: sourceId, resourceType: 'activity', state: 'active' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    for (const link of links) {
      const subjectKind = link.objectId ? 'object' : 'boiler', subjectId = link.objectId ?? link.boilerId;
      if (!subjectId) continue;
      if (link.objectId) {
        const item = await tx.homeObject.findFirst({ where: { id: link.objectId, accountId: a, homeId: h, state: 'active' } });
        if (!item || !(await readableReceiptObjectIds(tx, a, h, [item.id])).has(item.id)) continue;
      } else if ((await this.link(tx, a, h, subjectId)).state !== 'linked') continue;
      const row = await tx.objectResourceLink.create({ data: { accountId: a, homeId: h, objectId: link.objectId, boilerId: link.boilerId, resourceType: 'activity', resourceId: targetId, activityId: targetId, createdAt: now } });
      await tx.objectEvent.create({ data: { accountId: a, homeId: h, targetKind: subjectKind, targetId: subjectId, kind: 'linked', at: now, before: Prisma.JsonNull, after: json({ kind: 'link', row, subjectKind, subjectId }) } });
    }
  }
  /**
   * BL-01: crea il prossimo promemoria dopo un completamento. Un solo successivo per attività (vincolo unico), anche dopo
   * riapertura e nuovo completamento; idempotente; versione attesa della fonte. Nessuna ricorrenza automatica.
   */
  followUp(a: string, h: string, id: string, input: unknown, key?: string) {
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    uuid(id); const body = followUpBody(input);
    return this.db.$transaction(async tx => {
      await this.access.lock(tx, a, h); await this.access.require(tx, a, h, true);
      const source = await this.activity(tx, a, h, id);
      const lookup = { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation: 'follow_up', target: id, key } };
      const hash = digest(JSON.stringify(body)), prior = await tx.activityRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata per una richiesta diversa.');
        await this.activity(tx, a, h, (prior.response as unknown as { activity: { id: string } }).activity.id);
        return prior.response;
      }
      if (source.version !== body.expectedVersion) throw conflict('activity_version_conflict', 'L’attività è cambiata. Rileggi prima di continuare.');
      if (source.state !== 'completed' || !source.completedAt) throw conflict('invalid_activity_state', 'Completa prima il promemoria.');
      if (await tx.homeActivity.findFirst({ where: { previousActivityId: source.id } })) throw conflict('follow_up_exists', 'Il prossimo promemoria è già stato creato.');
      if (body.dueDate < temporal(source.completedAt).today) throw invalid('La data non può precedere il completamento.');
      const now = this.clock.now(), context = temporal(now);
      const assetId = body.copyLinks && source.assetId && (await this.link(tx, a, h, source.assetId)).state === 'linked' ? source.assetId : null;
      const row = await tx.homeActivity.create({ data: { accountId: a, homeId: h, title: body.title, description: body.description, dueDate: body.dueDate, assetId, previousActivityId: source.id, createdAt: now, updatedAt: now } });
      if (body.copyLinks) await this.copyObjectLinks(tx, a, h, source.id, row.id, now);
      await tx.activityHistory.create({ data: { activityId: row.id, accountId: a, at: now, kind: 'created', note: null, before: Prisma.JsonNull, after: json(snapshot(row)) } });
      await tx.activityHistory.create({ data: { activityId: source.id, accountId: a, at: now, kind: 'follow_up_created', note: null, before: json(snapshot(source)), after: json(snapshot(source)) } });
      const response = { ...context, activity: await this.project(tx, row, true, context.today, true) };
      await tx.activityRequest.create({ data: { accountId: a, homeId: h, operation: 'follow_up', target: id, key, digest: hash, response: json(response), createdAt: now } });
      return response;
    }, { timeout: 15000, maxWait: 15000 });
  }
  private paginate<T extends { id: string }>(rows: T[], query: ReturnType<typeof listQuery>, scope: unknown) {
    const binding = digest(JSON.stringify(scope)); let start = 0;
    if (query.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')) as { binding: string; id: string };
        if (cursor.binding !== binding) throw invalid();
        const index = rows.findIndex(r => r.id === uuid(cursor.id)); if (index < 0) throw invalid(); start = index + 1;
      } catch { throw invalid('Pagina non valida.'); }
    }
    const items = rows.slice(start, start + query.limit), last = items.at(-1);
    return { items, nextCursor: last && start + items.length < rows.length ? Buffer.from(JSON.stringify({ binding, id: last.id })).toString('base64url') : null };
  }
  private order(rows: HomeActivity[]) {
    const rank = { open: 0, completed: 1, cancelled: 2 };
    return rows.sort((a, b) => rank[a.state] - rank[b.state] || (a.state === 'open' ? (a.dueDate ?? '99999').localeCompare(b.dueDate ?? '99999') || b.createdAt.getTime() - a.createdAt.getTime() : (b.completedAt ?? b.cancelledAt)!.getTime() - (a.completedAt ?? a.cancelledAt)!.getTime()) || a.id.localeCompare(b.id));
  }
  list(a: string, h: string, input: unknown) {
    const query = listQuery(input);
    return this.read(a, h, async (tx, edit, context) => {
      if (query.assetId) await this.link(tx, a, h, query.assetId, true);
      const rows = this.order(await tx.homeActivity.findMany({ where: { accountId: a, homeId: h, ...(query.q ? {title: {contains: query.q, mode: 'insensitive' as const}} : {}), ...(query.state !== 'all' ? { state: query.state } : {}), ...(query.assetId ? { assetId: query.assetId } : {}) } })).filter(r => query.due === 'all' || dueState(r, context.today) === query.due);
      const page = this.paginate(rows, query, [a, h, 'activities', query.state, query.due, query.assetId, query.q]);
      return { ...context, total: rows.length, items: await Promise.all(page.items.map(r => this.project(tx, r, edit, context.today))), nextCursor: page.nextCursor };
    });
  }
  summary(a: string, h: string, input: unknown) {
    object(input, []);
    return this.read(a, h, async (tx, edit, context) => {
      const rows = this.order(await tx.homeActivity.findMany({ where: { accountId: a, homeId: h, state: 'open' } }));
      const counts = { overdue: 0, today: 0, upcoming: 0, undated: 0 };
      for (const row of rows) counts[dueState(row, context.today) as keyof typeof counts]++;
      const preview = rows.filter(r => r.dueDate && r.dueDate <= plusDays(context.today, 7)).slice(0, 3);
      return { ...context, counts, nextItems: await Promise.all(preview.map(r => this.project(tx, r, edit, context.today))) };
    });
  }
  history(a: string, h: string, id: string, input: unknown) {
    uuid(id); const query = listQuery(input, true);
    return this.read(a, h, async (tx) => {
      await this.activity(tx, a, h, id);
      const rows = await tx.activityHistory.findMany({ where: { activityId: id }, orderBy: [{ at: 'desc' }, { id: 'desc' }] });
      const page = this.paginate(rows, query, [a, h, 'history', id]);
      return { nextCursor: page.nextCursor, items: await Promise.all(page.items.map(async row => ({ id: row.id, activityId: id, at: row.at.toISOString(), kind: row.kind, origin: 'explicit_user', note: row.note, before: await this.historical(tx, a, h, row.before), after: await this.historical(tx, a, h, row.after) }))) };
    });
  }
}
