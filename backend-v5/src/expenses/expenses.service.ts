import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type HomeExpense } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest } from '../security';
import { canReadDocument } from '../documents/access';
import { ReviewService } from '../review/review.service';
import { conflict, invalid, object, uuid } from '../review/domain';
import { ActivityClock, temporal } from '../activities/domain';
import { createExpense, expenseAction, expenseLimits, expenseQuery, updateExpense } from './domain';

import { EconomyPolicy } from '../economy/policy';
import { expenseValues } from '../economy/domain';
type Tx = Prisma.TransactionClient;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const order = [{ spentOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] as const;
type Anchor = { b: string; i: string; t: string; d?: string };
const revive = (value: unknown): HomeExpense => {
  const row = value as HomeExpense;
  return { ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt), archivedAt: row.archivedAt ? new Date(row.archivedAt) : null };
};

@Injectable()
export class ExpensesService {
  constructor(private readonly db: PrismaService, private readonly access: ReviewService, private readonly clock: ActivityClock) {}
  async record(tx: Tx, a: string, h: string, id: string) {
    const row = await tx.homeExpense.findFirst({ where: { id: uuid(id), accountId: a, homeId: h } });
    if (!row) throw new ForbiddenException('Accesso non consentito.'); return row;
  }
  async documentLink(tx: Tx, a: string, h: string, id: string | null, strict = false) {
    if (!id) return { state: 'none' as const, document: null };
    await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR SHARE`;
    const row = await tx.document.findUnique({ where: { id }, include: { original: true } });
    if (row && row.homeId === h && canReadDocument(row, a) && row.original) return { state: 'linked' as const, document: { id: row.id, name: row.name } };
    if (strict) throw new ForbiddenException('Accesso non consentito.');
    return { state: 'unavailable' as const, document: null };
  }
  async assetLink(tx: Tx, a: string, h: string, id: string | null, strict = false) {
    if (!id) return { state: 'none' as const, asset: null };
    try {
      await tx.$queryRaw`SELECT id FROM "BoilerAsset" WHERE id=${id} FOR SHARE`;
      const row = await this.access.asset(tx, a, h, id); await this.access.assetSources(tx, a, h, id);
      return { state: 'linked' as const, asset: { id: row.id, name: row.name } };
    } catch (error) {
      if (!(error instanceof ForbiddenException) || strict) throw error;
      return { state: 'unavailable' as const, asset: null };
    }
  }
  private async snapshot(tx: Tx, a: string, h: string, row: HomeExpense, economic = false, history = false) {
    return { title: row.title, amountCents: row.amountCents, currency: 'EUR' as const, spentOn: row.spentOn, note: row.note,
      origin: row.documentId ? 'document' as const : 'manual' as const, state: row.state,
      documentLink: await this.documentLink(tx, a, h, row.documentId), assetLink: await this.assetLink(tx, a, h, row.assetId), ...(economic ? await new EconomyPolicy(this.access).snapshot(tx, a, h, row, history) : {}) };
  }
  async project(tx: Tx, row: HomeExpense, edit: boolean, economic = false) {
    return { id: row.id, homeId: row.homeId, ...await this.snapshot(tx, row.accountId, row.homeId, row, economic), version: row.version,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null, permissions: edit ? ['read', 'edit'] : ['read'] };
  }
  async read<T>(a: string, h: string, action: (tx: Tx, edit: boolean, context: ReturnType<typeof temporal>) => Promise<T>) {
    uuid(h);
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:' + h},0))::text AS locked`;
      await this.access.lock(tx, a, h); const member = await this.access.require(tx, a, h);
      const result = await action(tx, member.role !== 'viewer', temporal(this.clock.now()));
      await this.access.require(tx, a, h); return result;
    }, { timeout: 15000, maxWait: 15000 });
  }
  async capabilities(a: string, h: string, query: unknown) {
    object(query, []); return this.read(a, h, async (_tx, _edit, context) => ({ ...context, apiVersion: 'expenses-v1', enabled: true, isSimulation: false, currency: 'EUR', limits: expenseLimits }));
  }
  async get(a: string, h: string, id: string, query: unknown) {
    object(query, []); uuid(id); return this.read(a, h, async (tx, edit) => ({ expense: await this.project(tx, await this.record(tx, a, h, id), edit) }));
  }
  private anchor(cursor: string | undefined, binding: string, history = false): Anchor | null {
    if (!cursor) return null;
    try {
      const row = object(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')), history ? ['b', 'i', 't'] : ['b', 'i', 't', 'd']);
      uuid(row.i);
      if (row.b !== binding || typeof row.t !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.t) || new Date(row.t).toISOString() !== row.t || (!history && (typeof row.d !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(row.d)))) throw invalid();
      return row as Anchor;
    } catch { throw invalid('Pagina non valida.'); }
  }
  private encode(binding: string, row: { id: string; createdAt?: Date; at?: Date; spentOn?: string }) {
    return Buffer.from(JSON.stringify({ b: binding, i: row.id, t: (row.createdAt ?? row.at)!.toISOString(), ...(row.spentOn ? { d: row.spentOn } : {}) })).toString('base64url');
  }
  private where(a: string, h: string, q: ReturnType<typeof expenseQuery>): Prisma.HomeExpenseWhereInput {
    return { accountId: a, homeId: h, ...(q.state === 'all' ? {} : { state: q.state }),
      ...(q.year ? { spentOn: { gte: q.year + '-01-01', lte: q.year + '-12-31' } } : {}),
      ...(q.source === 'manual' ? { documentId: null } : q.source === 'document' ? { documentId: { not: null } } : {}),
      ...(q.documentId ? { documentId: q.documentId } : {}), ...(q.assetId ? { assetId: q.assetId } : {}) };
  }
  async list(a: string, h: string, input: unknown) {
    const q = expenseQuery(input), binding = digest(JSON.stringify([a, h, 'expenses', q.state, q.source, q.year, q.documentId, q.assetId])), anchor = this.anchor(q.cursor, binding);
    return this.read(a, h, async (tx, edit) => {
      if (q.documentId) await this.documentLink(tx, a, h, q.documentId, true);
      if (q.assetId) await this.assetLink(tx, a, h, q.assetId, true);
      const rows = await tx.homeExpense.findMany({ where: { ...this.where(a, h, q), ...(anchor ? { OR: [
        { spentOn: { lt: anchor.d! } }, { spentOn: anchor.d!, createdAt: { lt: new Date(anchor.t) } }, { spentOn: anchor.d!, createdAt: new Date(anchor.t), id: { lt: anchor.i } },
      ] } : {}) }, orderBy: [...order], take: q.limit + 1 });
      const page = rows.slice(0, q.limit);
      return { items: await Promise.all(page.map(r => this.project(tx, r, edit))), nextCursor: rows.length > q.limit ? this.encode(binding, page.at(-1)!) : null };
    });
  }
  async summary(a: string, h: string, input: unknown) {
    const query = expenseQuery(input, true);
    return this.read(a, h, async (tx, edit, context) => {
      const year = query.year ?? context.today.slice(0, 4), base = this.where(a, h, { ...query, year }), totalsCents = { manual: 0, document: 0 }, counts = { manual: 0, document: 0 };
      for (const source of ['manual', 'document'] as const) {
        const result = await tx.homeExpense.aggregate({ where: { ...base, documentId: source === 'manual' ? null : { not: null } }, _sum: { amountCents: true }, _count: true });
        totalsCents[source] = result._sum.amountCents ?? 0; counts[source] = result._count;
      }
      const totalCents = totalsCents.manual + totalsCents.document;
      if (!Number.isSafeInteger(totalCents)) throw new Error('Somma fuori limite numerico.');
      const rows = await tx.homeExpense.findMany({ where: base, orderBy: [...order], take: 3 });
      return { ...context, year, counts, totalsCents, totalCents, lastItems: await Promise.all(rows.map(r => this.project(tx, r, edit))) };
    });
  }
  async mutate(a: string, h: string, operation: 'create' | 'update' | 'archive' | 'restore', target: string, input: unknown, key?: string, economic = false) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    if (target) uuid(target);
    return this.db.$transaction(tx => this.mutateInTransaction(tx,a,h,operation,target,input,key,economic), {timeout:15000,maxWait:15000});
  }
  async mutateInTransaction(tx:Tx,a:string,h:string,operation:'create'|'update'|'archive'|'restore',target:string,input:unknown,key?:string,economic=false){
    if(!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid();if(target)uuid(target);
      await this.access.lock(tx, a, h); await this.access.require(tx, a, h, true);
      const now = this.clock.now(), today = temporal(now).today;
      const body: Record<string, unknown> = economic && (operation === 'create' || operation === 'update') ? expenseValues(input, today, operation === 'update') : operation === 'create' ? createExpense(input, today) : operation === 'update' ? updateExpense(input, today) : expenseAction(input);
      const lookup = { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation: economic ? 'economy:' + operation : operation, target, key } }, hash = digest(JSON.stringify(body));
      const old = target ? await this.record(tx, a, h, target) : null, prior = await tx.expenseRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata per una richiesta diversa.');
        const saved = revive(prior.response); await this.record(tx, a, h, saved.id);
        const response = { expense: await this.project(tx, saved, true, economic) }; await this.access.require(tx, a, h, true); return response;
      }
      if ('documentId' in body && body.documentId) await this.documentLink(tx, a, h, String(body.documentId), true);
      if ('assetId' in body && body.assetId) {
        await this.assetLink(tx, a, h, String(body.assetId), true);
        if (target) {
          const primary = await tx.objectResourceLink.findFirst({ where: { expenseId: target, accountId: a, homeId: h, state: 'active' } });
          if (primary && primary.boilerId !== body.assetId) throw conflict('resource_already_linked', 'Rimuovi prima il collegamento all’oggetto attuale.');
        }
      }
      const policy = new EconomyPolicy(this.access), before = old ? await policy.saved(tx, old) : null;
      const values = economic ? await policy.prepare(tx,a,h,body,old) : Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'expectedVersion'));
      if (!economic && old && body.amountCents !== undefined && body.amountCents !== old.amountCents) values.amountOrigin = 'user_declared';
      let row: HomeExpense, kind = operation === 'create' ? 'created' : operation === 'update' ? 'updated' : operation === 'archive' ? 'archived' : 'restored';
      if (!old) row = await tx.homeExpense.create({ data: { accountId: a, homeId: h, ...values as ReturnType<typeof createExpense>, createdAt: now, updatedAt: now } });
      else {
        if (!('expectedVersion' in body) || old.version !== body.expectedVersion) throw conflict('expense_version_conflict', 'La spesa è cambiata. Rileggi prima di continuare.');
        if ((operation === 'restore' && old.state !== 'archived') || (operation !== 'restore' && old.state !== 'active')) throw conflict('expense_state_conflict', 'Azione non consentita nello stato attuale.');
        const changes = operation === 'update' ? values : { state: operation === 'archive' ? 'archived' : 'active', archivedAt: operation === 'archive' ? now : null };
        if (operation === 'update' && Object.entries(changes).every(([k, v]) => old[k as keyof HomeExpense] === v)) { row = old; kind = ''; }
        else {
          const updated = await tx.homeExpense.updateMany({ where: { id: old.id, version: old.version }, data: { ...changes as Prisma.HomeExpenseUncheckedUpdateManyInput, version: { increment: 1 }, updatedAt: now } });
          if (updated.count !== 1) throw conflict('expense_version_conflict', 'La spesa è cambiata. Rileggi prima di continuare.');
          row = await this.record(tx, a, h, old.id);
        }
      }
      if (economic && await policy.objectChange(tx,a,h,row,body) && old && row.version === old.version) { row = await tx.homeExpense.update({where:{id:row.id},data:{version:{increment:1},updatedAt:now}});kind='updated'; }
      const saved = await policy.saved(tx,row);
      if (kind) await tx.expenseHistory.create({ data: { expenseId: row.id, accountId: a, at: now, kind, note: operation === 'archive' || operation === 'restore' ? (body as ReturnType<typeof expenseAction>).note : null, before: before ? json(before) : Prisma.JsonNull, after: json(saved) } });
      await tx.expenseRequest.create({ data: { accountId: a, homeId: h, operation: economic ? 'economy:' + operation : operation, target, key, digest: hash, response: json(saved), createdAt: now } });
      const response = { expense: await this.project(tx, row, true, economic) }; await this.access.require(tx, a, h, true); return response;

  }
  create(a: string, h: string, body: unknown, key?: string) { return this.mutate(a, h, 'create', '', body, key); }
  update(a: string, h: string, id: string, body: unknown, key?: string) { return this.mutate(a, h, 'update', id, body, key); }
  action(a: string, h: string, id: string, operation: 'archive' | 'restore', body: unknown, key?: string) { return this.mutate(a, h, operation, id, body, key); }
  async history(a: string, h: string, id: string, input: unknown, economic = false) {
    uuid(id); const q = expenseQuery(input, false, true), binding = digest(JSON.stringify([a, h, economic ? 'economy-expense-history' : 'expense-history', id])), anchor = this.anchor(q.cursor, binding, true);
    return this.read(a, h, async tx => {
      await this.record(tx, a, h, id);
      const rows = await tx.expenseHistory.findMany({ where: { expenseId: id, ...(anchor ? { OR: [{ at: { lt: new Date(anchor.t) } }, { at: new Date(anchor.t), id: { lt: anchor.i } }] } : {}) }, orderBy: [{ at: 'desc' }, { id: 'desc' }], take: q.limit + 1 });
      const page = rows.slice(0, q.limit);
      return { items: await Promise.all(page.map(async r => ({ id: r.id, kind: r.kind, at: r.at.toISOString(), note: r.note, before: r.before ? await this.snapshot(tx, a, h, revive(r.before), economic, true) : null, after: await this.snapshot(tx, a, h, revive(r.after), economic, true) }))), nextCursor: rows.length > q.limit ? this.encode(binding, page.at(-1)!) : null };
    });
  }
}
