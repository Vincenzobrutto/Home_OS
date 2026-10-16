import { ForbiddenException, Injectable } from '@nestjs/common';
import { type Prisma, type ReceiptDraft, type ReceiptComparison } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ReviewService } from '../review/review.service';
import { canReadDocument } from '../documents/access';
import { digest } from '../security';
import { conflict, invalid, object, uuid, version } from '../review/domain';
import { ActivityClock, temporal } from '../activities/domain';

type Tx = Prisma.TransactionClient;
const deny = () => new ForbiddenException('Accesso non consentito.');

@Injectable()
export class ReceiptAssistanceService {
  constructor(private readonly db: PrismaService, private readonly access: ReviewService, private readonly clock: ActivityClock) {}

  private async transaction<T>(a: string, h: string, write: boolean, action: (tx: Tx, edit: boolean) => Promise<T>) {
    uuid(h);
    return this.db.$transaction(async tx => {
      await this.access.lock(tx, a, h);
      const member = await this.access.require(tx, a, h, write);
      const result = await action(tx, member.role !== 'viewer');
      await this.access.require(tx, a, h, write);
      return result;
    }, { maxWait: 15000, timeout: 15000 });
  }

  private async source(tx: Tx, a: string, h: string, id: string, snapshot?: Pick<ReceiptDraft, 'documentVersion' | 'documentSha256'>) {
    await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${id} FOR SHARE`;
    const doc = await tx.document.findUnique({ where: { id }, include: { original: true } });
    if (!doc || doc.homeId !== h || !canReadDocument(doc, a) || !doc.original) return null;
    if (snapshot && (doc.original.version !== snapshot.documentVersion || doc.original.sha256 !== snapshot.documentSha256)) return null;
    return doc;
  }

  private async record(tx: Tx, a: string, h: string, id: string) {
    const row = await tx.receiptDraft.findFirst({ where: { id: uuid(id), accountId: a, homeId: h } });
    if (!row) throw deny();
    return row;
  }

  private async project(tx: Tx, a: string, h: string, row: ReceiptDraft, edit: boolean) {
    const doc = await this.source(tx, a, h, row.documentId, row);
    return {
      id: row.id, homeId: row.homeId, version: row.version, mode: row.mode, state: row.state,
      documentLink: { state: doc ? 'linked' : 'unavailable', document: doc ? { id: doc.id, name: doc.name } : null },
      snapshot: doc ? { documentId: doc.id, documentVersion: row.documentVersion, sha256: row.documentSha256 } : null,
      fields: doc ? row.fields : {}, total: doc ? row.total : null,
      permissions: edit && doc ? ['read', 'edit'] : ['read'],
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    };
  }

  capabilities(a: string, h: string, query: unknown) {
    object(query, []);
    return this.transaction(a, h, false, async () => ({
      apiVersion: 'receipt-assistance-v1', enabled: false, manualEnabled: false, providers: [],
      disabledReason: 'receipt_assistance_in_development', ...temporal(this.clock.now()),
    }));
  }

  private async request(a: string, h: string, operation: string, target: string, body: unknown, key: string | undefined, action: (tx: Tx) => Promise<ReceiptDraft>) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    return this.transaction(a, h, true, async tx => {
      const lookup = { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation, target, key } };
      const hash = digest(JSON.stringify(body)), prior = await tx.receiptRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata con dati diversi.');
        const row = await this.record(tx, a, h, prior.draftId);
        if (!await this.source(tx, a, h, row.documentId, row)) throw deny();
        return { draft: await this.project(tx, a, h, row, true) };
      }
      const row = await action(tx);
      await tx.receiptRequest.create({ data: { ...lookup.accountId_homeId_operation_target_key, digest: hash, draftId: row.id } });
      return { draft: await this.project(tx, a, h, row, true) };
    });
  }

  manual(a: string, h: string, input: unknown, key?: string) {
    const body = { documentId: uuid(object(input, ['documentId']).documentId) };
    return this.request(a, h, 'manual', '', body, key, async tx => {
      const doc = await this.source(tx, a, h, body.documentId);
      if (!doc) throw deny();
      const source = { documentId: doc.id, documentVersion: doc.original!.version, documentSha256: doc.original!.sha256 };
      const existing = await tx.receiptDraft.findFirst({ where: { accountId: a, homeId: h, ...source, mode: 'manual', state: { in: ['open', 'parked'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (existing) return existing;
      const now = this.clock.now();
      return tx.receiptDraft.create({ data: { accountId: a, homeId: h, ...source, mode: 'manual', createdAt: now, updatedAt: now } });
    });
  }

  get(a: string, h: string, id: string, query: unknown) {
    object(query, []);
    return this.transaction(a, h, false, async (tx, edit) => ({ draft: await this.project(tx, a, h, await this.record(tx, a, h, id), edit) }));
  }

  action(a: string, h: string, id: string, op: 'park' | 'reopen', input: unknown, key?: string) {
    uuid(id);
    const body = { expectedVersion: version(object(input, ['expectedVersion']).expectedVersion) };
    return this.request(a, h, op, id, body, key, async tx => {
      const old = await this.record(tx, a, h, id);
      if (!await this.source(tx, a, h, old.documentId, old)) throw deny();
      if (old.version !== body.expectedVersion) throw conflict('receipt_draft_version_conflict', 'La bozza è cambiata. Rileggila prima di continuare.');
      if (old.state !== (op === 'park' ? 'open' : 'parked')) throw conflict('receipt_draft_state_conflict', 'Azione non consentita nello stato attuale.');
      return tx.receiptDraft.update({ where: { id }, data: { state: op === 'park' ? 'parked' : 'open', version: { increment: 1 }, updatedAt: this.clock.now() } });
    });
  }

  private async target(tx: Tx, a: string, h: string, id: string) {
    const row = await tx.homeObject.findFirst({ where: { id: uuid(id), accountId: a, homeId: h } });
    if (!row) throw deny();
    return row;
  }

  private async fields(tx: Tx, a: string, h: string, id: string) {
    const rows = await tx.receiptObjectField.findMany({ where: { accountId: a, homeId: h, objectId: id } });
    const result: Record<string, unknown> = { name: null, brand: null, model: null };
    for (const row of rows) {
      const available = row.origin === 'user_declared' || row.documentId && row.documentVersion && row.documentSha256 && await this.source(tx, a, h, row.documentId, { documentVersion: row.documentVersion, documentSha256: row.documentSha256 });
      result[row.fieldKey] = available ? { state: 'confirmed', value: row.value, origin: row.origin, version: row.version, sources: row.sources } : { state: 'unavailable', value: null, origin: row.origin, version: row.version, sources: [] };
    }
    return result;
  }

  objectFields(a: string, h: string, id: string, query: unknown) {
    object(query, []);
    return this.transaction(a, h, false, async tx => {
      const target = await this.target(tx, a, h, id);
      const fields = await this.fields(tx, a, h, id);
      const name = fields.name as { state: string } | null;
      return { object: { id: target.id, name: name?.state === 'unavailable' ? null : target.name, version: target.version, state: target.state }, fields };
    });
  }

  private async comparisonRecord(tx: Tx, a: string, h: string, id: string) {
    const row = await tx.receiptComparison.findFirst({ where: { id: uuid(id), accountId: a, homeId: h } });
    if (!row) throw deny();
    return row;
  }

  private async comparisonView(tx: Tx, a: string, h: string, row: ReceiptComparison, edit: boolean) {
    const draft = await this.record(tx, a, h, row.draftId), target = await this.target(tx, a, h, row.objectId);
    const fields = await this.fields(tx, a, h, row.objectId);
    const nameField = fields.name as { state: string } | null;
    const current = fields[row.fieldKey] as { state: string; value: string } | null;
    const available = nameField?.state !== 'unavailable' && target.state === 'active' && current?.state === 'confirmed' && await this.source(tx, a, h, draft.documentId, draft);
    return {
      id: row.id, version: row.version, state: available ? row.state : 'unavailable',
      object: available ? { id: target.id, name: target.name, version: target.version } : null,
      fieldKey: available ? row.fieldKey : null, existing: available ? current!.value : null,
      proposed: available ? row.proposed : null,
      permissions: available && edit ? ['read', 'edit'] : ['read'],
    };
  }

  getComparison(a: string, h: string, id: string, query: unknown) {
    object(query, []);
    return this.transaction(a, h, false, async (tx, edit) => ({ comparison: await this.comparisonView(tx, a, h, await this.comparisonRecord(tx, a, h, id), edit) }));
  }

  comparisons(a: string, h: string, query: unknown) {
    const q = object(query, ['state', 'objectId', 'draftId', 'limit', 'cursor']);
    const state = q.state ?? 'open';
    if (typeof state !== 'string' || !['open', 'resolved', 'all'].includes(state)) throw invalid();
    const objectId = q.objectId === undefined ? undefined : uuid(q.objectId), draftId = q.draftId === undefined ? undefined : uuid(q.draftId);
    if (q.limit !== undefined && (typeof q.limit !== 'string' || !/^(?:[1-9]|[1-4][0-9]|50)$/.test(q.limit))) throw invalid();
    const limit = Number(q.limit ?? 20), binding = digest(JSON.stringify([a, h, state, objectId ?? null, draftId ?? null]));
    let after: string | undefined;
    if (q.cursor !== undefined) {
      if (typeof q.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(q.cursor)) throw invalid();
      try {
        const anchor = object(JSON.parse(Buffer.from(q.cursor, 'base64url').toString('utf8')), ['b', 'id']);
        if (anchor.b !== binding) throw invalid();
        after = uuid(anchor.id);
      } catch { throw invalid('Pagina non valida.'); }
    }
    return this.transaction(a, h, false, async (tx, edit) => {
      if (objectId) await this.target(tx, a, h, objectId);
      if (draftId) await this.record(tx, a, h, draftId);
      const rows = await tx.receiptComparison.findMany({ where: { accountId: a, homeId: h, ...(state === 'all' ? {} : { state }), ...(objectId ? { objectId } : {}), ...(draftId ? { draftId } : {}), ...(after ? { id: { gt: after } } : {}) }, orderBy: { id: 'asc' }, take: limit + 1 });
      const page = rows.slice(0, limit);
      return { items: await Promise.all(page.map(row => this.comparisonView(tx, a, h, row, edit))), nextCursor: rows.length > limit ? Buffer.from(JSON.stringify({ b: binding, id: page.at(-1)!.id })).toString('base64url') : null };
    });
  }

  resolveComparison(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id);
    const row = object(input, ['expectedVersion', 'action']);
    const body = { expectedVersion: version(row.expectedVersion), action: row.action };
    if (body.action !== 'keep_existing' && body.action !== 'defer') throw invalid();
    return this.request(a, h, 'comparison:' + body.action, id, body, key, async tx => {
      const old = await this.comparisonRecord(tx, a, h, id), draft = await this.record(tx, a, h, old.draftId);
      const view = await this.comparisonView(tx, a, h, old, true);
      if (view.state === 'unavailable') throw deny();
      if (old.version !== body.expectedVersion) throw conflict('receipt_comparison_version_conflict', 'Il confronto è cambiato. Rileggilo.');
      if (view.object!.version !== old.targetVersion) throw conflict('receipt_target_version_conflict', 'La scheda è cambiata. Rivedi il confronto.');
      const state = body.action === 'keep_existing' ? 'resolved' : 'open';
      if (state === old.state) return draft;
      await tx.receiptComparison.update({ where: { id }, data: { state, version: { increment: 1 }, updatedAt: this.clock.now() } });
      const remaining = await tx.receiptComparison.count({ where: { accountId: a, homeId: h, draftId: draft.id, state: 'open' } });
      const nextState = draft.state === 'partially_resolved' && !remaining ? 'confirmed' : draft.state === 'confirmed' && remaining ? 'partially_resolved' : draft.state;
      return tx.receiptDraft.update({ where: { id: draft.id }, data: { state: nextState, version: { increment: 1 }, updatedAt: this.clock.now() } });
    });
  }
}
