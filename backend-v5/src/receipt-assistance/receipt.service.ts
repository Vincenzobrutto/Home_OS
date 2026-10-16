import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type ReceiptDraft, type ReceiptComparison } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ReviewService } from '../review/review.service';
import { canReadDocument } from '../documents/access';
import { digest } from '../security';
import { conflict, invalid, object, uuid, version } from '../review/domain';
import { ActivityClock, temporal } from '../activities/domain';
import { ExpensesService } from '../expenses/expenses.service';
import { EconomyPolicy } from '../economy/policy';
import { receiptConfirmation, type ReceiptOrigin, type FieldPlan } from './confirmation';
import { resolveReceiptField, type ReceiptExtraction, type ReceiptProposal } from './domain';
import { candidateQuery, candidatePagination, equivalentReceiptDocuments, objectCandidatesSql, expenseCandidatesSql, type CandidateKind, type CandidateAnchor } from './candidates';
import { reviewedForm, type SavedReceiptSelection } from './review';
import { readableReceiptObjectIds } from './access';
import { ReceiptReleasePolicy } from './release-policy';
import { ReceiptAiBudget, receiptBilling } from './ai-budget';

type Tx = Prisma.TransactionClient;
const deny = () => new ForbiddenException('Accesso non consentito.');
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

@Injectable()
export class ReceiptAssistanceService {
  constructor(private readonly db: PrismaService, private readonly access: ReviewService, private readonly clock: ActivityClock, private readonly release: ReceiptReleasePolicy, private readonly ai: ReceiptAiBudget) {}

  authorized<T>(a: string, h: string, write: boolean, action: (tx: Tx, edit: boolean) => Promise<T>) {
    return this.transaction(a, h, write, action);
  }
  authorizedSource(tx: Tx, a: string, h: string, id: string, snapshot?: Pick<ReceiptDraft, 'documentVersion' | 'documentSha256'>) {
    return this.source(tx, a, h, id, snapshot);
  }

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
    const job = doc ? await tx.receiptAnalysisJob.findFirst({ where: { draftId: row.id, accountId: a, homeId: h }, include: { aiAttempt: true } }) : null;
    return {
      id: row.id, homeId: row.homeId, version: row.version, mode: row.mode, state: row.state,
      documentLink: { state: doc ? 'linked' : 'unavailable', document: doc ? { id: doc.id, name: doc.name } : null },
      snapshot: doc ? { documentId: doc.id, documentVersion: row.documentVersion, sha256: row.documentSha256 } : null,
      fields: doc ? row.fields : {}, total: doc ? row.total : null,
      review: doc ? await this.reviewView(tx, a, h, row) : null,
      confirmation: doc ? await this.confirmedResult(tx, a, h, row.confirmation) : null,
      analysis: job ? { provider: job.provider, isSimulation: job.provider === 'receipt_fixture_v1', model: job.aiAttempt?.model ?? null, billing: receiptBilling(job.aiAttempt) } : null,
      permissions: edit && doc ? ['read', 'edit'] : ['read'],
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    };
  }

  capabilities(a: string, h: string, query: unknown) {
    const q = object(query, ['documentId']);
    const documentId = q.documentId === undefined ? null : uuid(q.documentId);
    return this.transaction(a, h, false, async (tx, edit) => {
      const source = documentId ? await this.source(tx, a, h, documentId) : null;
      if (documentId && !source) throw deny();
      const manualEnabled = edit && !!this.release?.allows(source);
      const paid = manualEnabled && source && this.ai ? await this.ai.available(tx, source.original!.sha256) : false;
      const providers = manualEnabled ? this.release.providers(source, paid) : [];
      const enabled = providers.length > 0;
      const scope = source ? { accountId: a, homeId: h, documentId: source.id, documentVersion: source.original!.version, documentSha256: source.original!.sha256 } : null;
      const draft = manualEnabled && scope ? await tx.receiptDraft.findFirst({ where: { ...scope, state: { in: ['open', 'parked'] } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], select: { id: true } }) : null;
      let job = manualEnabled && scope ? await tx.receiptAnalysisJob.findFirst({ where: { ...scope, state: { in: ['queued', 'running'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } }) : null;
      if (!job && !draft && manualEnabled && scope) job = await tx.receiptAnalysisJob.findFirst({ where: { ...scope, provider: 'anthropic', state: { in: ['failed', 'uncertain'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
      return {
      apiVersion: 'receipt-assistance-v1', enabled, manualEnabled, providers,
      resume: { draftId: job ? null : draft?.id ?? null, jobId: job?.id ?? null },
      disabledReason: enabled ? null : 'receipt_assistance_in_development', ...temporal(this.clock.now()),
      };
    });
  }

  private async request(a: string, h: string, operation: string, target: string, body: unknown, key: string | undefined, action: (tx: Tx) => Promise<ReceiptDraft>) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    return this.transaction(a, h, true, async tx => {
      const lookup = { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation, target, key } };
      const hash = digest(JSON.stringify(body)), prior = await tx.receiptRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata con dati diversi.');
        const row = await this.record(tx, a, h, prior.draftId);
        const source = await this.source(tx, a, h, row.documentId, row);
        if (!source) throw deny();
        this.release?.require(source);
        return { draft: await this.project(tx, a, h, row, true) };
      }
      const row = await action(tx);
      const source = await this.source(tx, a, h, row.documentId, row);
      if (!source) throw deny();
      this.release?.require(source);
      await tx.receiptRequest.create({ data: { ...lookup.accountId_homeId_operation_target_key, digest: hash, draftId: row.id } });
      return { draft: await this.project(tx, a, h, row, true) };
    });
  }

  manual(a: string, h: string, input: unknown, key?: string) {
    const body = { documentId: uuid(object(input, ['documentId']).documentId) };
    return this.request(a, h, 'manual', '', body, key, async tx => {
      const doc = await this.source(tx, a, h, body.documentId);
      if (!doc) throw deny();
      this.release?.require(doc);
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

  candidates(a: string, h: string, id: string, kind: CandidateKind, query: unknown) {
    uuid(id); const q = candidateQuery(query);
    return this.transaction(a, h, false, async tx => {
      const draft = await this.record(tx, a, h, id);
      const source = await this.source(tx, a, h, draft.documentId, draft);
      if (!source) throw deny();
      const { anchor, encode } = candidatePagination(a, h, kind, draft, q.cursor);
      const rows = await tx.$queryRaw<CandidateAnchor[]>(kind === 'object' ? objectCandidatesSql(a, h, draft, q.limit, anchor) : expenseCandidatesSql(a, h, draft, q.limit, anchor));
      const page = rows.slice(0, q.limit);
      const items = await Promise.all(page.map(async row => {
        const reasons = row.rank === 3 ? ['same_document'] : row.rank === 2 ? ['same_original'] : [];
        if (kind === 'expense') {
          const expense = await tx.homeExpense.findFirst({ where: { id: row.id, accountId: a, homeId: h, state: 'active' } });
          if (!expense) throw conflict('receipt_candidates_changed', 'Le spese sono cambiate. Ricarica i candidati.');
          return { id: expense.id, version: expense.version, title: expense.title, amountCents: expense.amountCents, spentOn: expense.spentOn, linkedToDocument: row.rank >= 2, reasons };
        }
        const target = await this.target(tx, a, h, row.id), fields = await this.fields(tx, a, h, row.id);
        if ((fields.name as { state: string } | null)?.state === 'unavailable') throw deny();
        const value = (field: string) => { const stored = fields[field] as { state: string; value: string; origin: string } | null; return stored?.state === 'confirmed' ? { value: stored.value, origin: stored.origin } : null; };
        const brand = value('brand'), model = value('model'), proposals = draft.fields as ReceiptExtraction['fields'];
        const norm = (input: string | undefined) => input?.normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('it');
        if (brand && model && norm(brand.value) === norm(proposals.brand?.value) && norm(model.value) === norm(proposals.model?.value)) reasons.push('same_brand_model');
        const position = await tx.objectPosition.findFirst({ where: { accountId: a, homeId: h, objectId: row.id } });
        const roomIds = position?.roomIds as string[] | undefined;
        const rooms = roomIds?.length ? await tx.homeRoom.findMany({ where: { id: { in: roomIds }, homeId: h }, select: { name: true }, orderBy: { id: 'asc' } }) : [];
        return { id: target.id, version: target.version, name: target.name, roomName: rooms.length ? rooms.map(room => room.name).join(', ') : null, brand, model, linkedToDocument: row.rank >= 2, reasons };
      }));
      const counts = await tx.$queryRaw<Array<{ linkedCount: string }>>(kind === 'object' ? objectCandidatesSql(a, h, draft, q.limit, null, true) : expenseCandidatesSql(a, h, draft, q.limit, null, true));
      const linkedCount = Number(counts[0].linkedCount);
      if (!Number.isSafeInteger(linkedCount)) throw invalid('Conteggio fuori limite.');
      return { items, linkedCount, nextCursor: rows.length > q.limit ? encode(page.at(-1)!) : null };
    });
  }

  action(a: string, h: string, id: string, op: 'park' | 'reopen', input: unknown, key?: string) {
    uuid(id);
    const row = object(input, op === 'park' ? ['expectedVersion', 'selection'] : ['expectedVersion']);
    const expectedVersion = version(row.expectedVersion);
    const selection = row.selection === undefined ? undefined : receiptConfirmation({ ...object(row.selection, ['object', 'expense']), expectedVersion }, temporal(this.clock.now()).today);
    const body = { expectedVersion, ...(selection ? { selection: { object: selection.object, expense: selection.expense } } : {}) };
    return this.request(a, h, op, id, body, key, async tx => {
      const old = await this.record(tx, a, h, id);
      if (!await this.source(tx, a, h, old.documentId, old)) throw deny();
      if (old.version !== body.expectedVersion) throw conflict('receipt_draft_version_conflict', 'La bozza è cambiata. Rileggila prima di continuare.');
      if (old.state !== (op === 'park' ? 'open' : 'parked')) throw conflict('receipt_draft_state_conflict', 'Azione non consentita nello stato attuale.');
      if (body.selection) await this.validateReview(tx, a, h, old, body.selection);
      return tx.receiptDraft.update({ where: { id }, data: { state: op === 'park' ? 'parked' : 'open', ...(body.selection ? { review: json(body.selection) } : {}), version: { increment: 1 }, updatedAt: this.clock.now() } });
    });
  }

  private async reviewView(tx: Tx, a: string, h: string, draft: ReceiptDraft) {
    if (!draft.review) return null;
    let selection: SavedReceiptSelection;
    try { selection = receiptConfirmation({ ...object(draft.review, ['object', 'expense']), expectedVersion: draft.version }, temporal(this.clock.now()).today); }
    catch { return null; }
    const target = selection.object.action === 'reuse' ? await tx.homeObject.findFirst({ where: { id: selection.object.targetId, accountId: a, homeId: h, state: 'active' }, select: { id: true, version: true } }) : null;
    const readableObject = target && (await readableReceiptObjectIds(tx, a, h, [target.id])).has(target.id) ? target : null;
    const expense = selection.expense.action === 'reuse' ? await tx.homeExpense.findFirst({ where: { id: selection.expense.targetId, accountId: a, homeId: h, state: 'active' }, select: { id: true, version: true } }) : null;
    return reviewedForm(selection, { fields: draft.fields as ReceiptExtraction['fields'], total: draft.total as ReceiptExtraction['total'] }, { object: readableObject, expense });
  }
  private async validateReview(tx: Tx, a: string, h: string, draft: ReceiptDraft, selection: SavedReceiptSelection) {
    if (selection.object.action === 'create') for (const field of ['name', 'brand', 'model'] as const) this.proposalOrigin(draft, field, selection.object.values[field], selection.object.origins[field]);
    if (selection.object.action === 'reuse') {
      const target = await this.target(tx, a, h, selection.object.targetId);
      if (!(await readableReceiptObjectIds(tx, a, h, [target.id])).has(target.id)) throw deny();
      if (target.state !== 'active' || target.version !== selection.object.targetVersion) throw conflict('receipt_target_version_conflict', 'La scheda è cambiata. Rivedi le scelte prima di rimandare.');
      const proposals = draft.fields as ReceiptExtraction['fields'];
      for (const plan of selection.object.fields) {
        const old = await tx.receiptObjectField.findUnique({ where: { objectId_fieldKey: { objectId: target.id, fieldKey: plan.field } } });
        if (old && (old.accountId !== a || old.homeId !== h || old.documentId && !await this.source(tx, a, h, old.documentId, { documentVersion: old.documentVersion!, documentSha256: old.documentSha256! }))) throw deny();
        resolveReceiptField(plan.field, old ? { value: old.value, origin: old.origin, sources: old.sources as unknown as ReceiptProposal['sources'] } : null, proposals[plan.field] ?? null, { action: plan.action, ...(plan.value !== undefined ? { value: plan.value } : {}) });
      }
    }
    if (selection.expense.action === 'create') {
      const plan = selection.expense;
      for (const [field, wire] of [['title', 'title'], ['amount', 'amountCents'], ['date', 'spentOn'], ['supplier', 'supplier']] as const) this.proposalOrigin(draft, field === 'date' ? 'documentDate' : field, plan.values[wire], plan.origins[field]);
    }
    if (selection.expense.action === 'reuse') {
      const expense = await tx.homeExpense.findFirst({ where: { id: selection.expense.targetId, accountId: a, homeId: h } });
      if (!expense) throw deny();
      if (expense.state !== 'active' || expense.version !== selection.expense.targetVersion) throw conflict('expense_version_conflict', 'La spesa è cambiata. Rivedi le scelte prima di rimandare.');
    }
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
    const source = await this.source(tx, a, h, draft.documentId, draft);
    const available = nameField?.state !== 'unavailable' && target.state === 'active' && current?.state === 'confirmed' && source;
    return {
      id: row.id, version: row.version, state: available ? row.state : 'unavailable',
      draftId: available ? draft.id : null,
      documentLink: { state: available ? 'linked' : 'unavailable', document: available ? { id: source!.id, name: source!.name } : null },
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
      await tx.receiptDraft.update({ where: { id: draft.id }, data: { state: nextState, version: { increment: 1 }, updatedAt: this.clock.now() } });
      await this.closeResolvedDrafts(tx, a, h, old.objectId);
      return this.record(tx, a, h, draft.id);
    });
  }

  private async confirmedResult(tx: Tx, a: string, h: string, input: unknown) {
    if (!input) return null;
    const saved = input as { newObjects: 0 | 1; newExpenses: 0 | 1; objectId: string | null; expenseId: string | null };
    let subject: { id: string; name: string } | null = null;
    if (saved.objectId) {
      const row = await tx.homeObject.findFirst({ where: { id: saved.objectId, accountId: a, homeId: h, state: 'active' } });
      if (row) {
        const fields = await this.fields(tx, a, h, row.id), name = fields.name as { state: string } | null;
        if (name?.state !== 'unavailable') subject = { id: row.id, name: row.name };
      }
    }
    const expense = saved.expenseId ? await tx.homeExpense.findFirst({ where: { id: saved.expenseId, accountId: a, homeId: h, state: 'active' } }) : null;
    const openComparisons = saved.objectId ? await tx.receiptComparison.count({ where: { accountId: a, homeId: h, objectId: saved.objectId, state: 'open' } }) : 0;
    return { newObjects: saved.newObjects, newExpenses: saved.newExpenses, object: subject, expense: expense ? { id: expense.id, title: expense.title, amountCents: expense.amountCents } : null, openComparisons };
  }

  private async closeResolvedDrafts(tx: Tx, a: string, h: string, objectId: string) {
    if (!await tx.receiptComparison.count({ where: { accountId: a, homeId: h, objectId, state: 'open' } })) {
      await tx.receiptDraft.updateMany({ where: { accountId: a, homeId: h, state: 'partially_resolved', confirmation: { path: ['objectId'], equals: objectId } }, data: { state: 'confirmed', version: { increment: 1 }, updatedAt: this.clock.now() } });
    }
  }

  private proposalOrigin(draft: ReceiptDraft, field: string, value: string | number | null, origin: ReceiptOrigin) {
    if (value === null || origin !== 'extraction') return { origin: 'user_declared', sources: [] };
    const fields = draft.fields as ReceiptExtraction['fields'];
    const proposed = field === 'amount' ? draft.total as ReceiptExtraction['total'] : fields[field as keyof typeof fields];
    const sourceValue = field === 'amount' ? (proposed as ReceiptExtraction['total'])?.amountCents : (proposed as ReceiptProposal)?.value;
    if (draft.mode !== 'extraction' || sourceValue !== value || !proposed?.sources?.length) throw invalid('Il dato non corrisponde alla proposta verificata.');
    return { origin: 'extraction_confirmed', sources: proposed.sources };
  }

  private async storeField(tx: Tx, a: string, h: string, objectId: string, fieldKey: string, value: string, provenance: { origin: string; sources: unknown[] }, draft: ReceiptDraft) {
    return tx.receiptObjectField.create({ data: {
      accountId: a, homeId: h, objectId, fieldKey, value, origin: provenance.origin, sources: json(provenance.sources),
      ...(provenance.origin === 'extraction_confirmed' ? { documentId: draft.documentId, documentVersion: draft.documentVersion, documentSha256: draft.documentSha256 } : {}),
      createdAt: this.clock.now(), updatedAt: this.clock.now(),
    } });
  }

  private async documentObjectLink(tx: Tx, a: string, h: string, objectId: string, documentId: string) {
    if (await tx.objectResourceLink.findFirst({ where: { accountId: a, homeId: h, objectId, documentId, resourceType: 'document', state: 'active' } })) return;
    const link = await tx.objectResourceLink.create({ data: { accountId: a, homeId: h, objectId, documentId, resourceType: 'document', resourceId: documentId } });
    await tx.objectEvent.create({ data: { accountId: a, homeId: h, targetKind: 'object', targetId: objectId, kind: 'linked', before: Prisma.JsonNull, after: json({ kind: 'link', row: link, subjectKind: 'object', subjectId: objectId }) } });
  }

  private async decideFields(tx: Tx, a: string, h: string, draft: ReceiptDraft, objectId: string, plans: FieldPlan[]) {
    const proposals = draft.fields as ReceiptExtraction['fields'];
    let filled = false;
    for (const plan of plans) {
      const old = await tx.receiptObjectField.findUnique({ where: { objectId_fieldKey: { objectId, fieldKey: plan.field } } });
      if (old && (old.accountId !== a || old.homeId !== h)) throw deny();
      if (old?.documentId && !await this.source(tx, a, h, old.documentId, { documentVersion: old.documentVersion!, documentSha256: old.documentSha256! })) throw deny();
      const existing = old ? { value: old.value, origin: old.origin, sources: old.sources as unknown as ReceiptProposal['sources'] } : null;
      const result = resolveReceiptField(plan.field, existing, proposals[plan.field] ?? null, { action: plan.action, ...(plan.value !== undefined ? { value: plan.value } : {}) });
      if (result.state === 'filled') { await this.storeField(tx, a, h, objectId, plan.field, result.value!.value, result.value!, draft); filled = true; }
    }
    const target = filled ? await tx.homeObject.update({ where: { id: objectId }, data: { version: { increment: 1 }, updatedAt: this.clock.now() } }) : await this.target(tx, a, h, objectId);
    for (const plan of plans.filter(p => p.action === 'keep_existing' || p.action === 'defer')) {
      const proposed = proposals[plan.field];
      if (!proposed) continue;
      const fingerprint = digest(JSON.stringify(['receipt_evidence_v2', draft.documentSha256, plan.field, proposed.value.normalize('NFC').replace(/\s+/gu, ' ').trim()]));
      const lookup = { accountId_homeId_objectId_fieldKey_fingerprint: { accountId: a, homeId: h, objectId, fieldKey: plan.field, fingerprint } };
      const prior = await tx.receiptComparison.findUnique({ where: lookup });
      // Resolved evidence is never reopened just because the same receipt was analyzed again.
      if (prior?.state === 'resolved') continue;
      const state = plan.action === 'defer' ? 'open' : 'resolved';
      if (prior) await tx.receiptComparison.update({ where: { id: prior.id }, data: { state, targetVersion: target.version, version: { increment: 1 }, updatedAt: this.clock.now() } });
      else await tx.receiptComparison.create({ data: { ...lookup.accountId_homeId_objectId_fieldKey_fingerprint, draftId: draft.id, targetVersion: target.version, proposed: json(proposed), state } });
    }
    return target;
  }

  confirm(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id);
    const body = receiptConfirmation(input, temporal(this.clock.now()).today);
    return this.request(a, h, 'confirm', id, body, key, async tx => {
      const draft = await this.record(tx, a, h, id);
      const source = await this.source(tx, a, h, draft.documentId, draft);
      if (!source) throw deny();
      this.release?.require(source);
      if (draft.version !== body.expectedVersion) throw conflict('receipt_draft_version_conflict', 'La bozza è cambiata. Rileggila.');
      if (draft.state !== 'open' || draft.confirmation) throw conflict('receipt_draft_state_conflict', 'La bozza non è confermabile.');
      const now = this.clock.now();
      let target: Awaited<ReturnType<ReceiptAssistanceService['target']>> | null = null;
      const newObject = body.object.action === 'create', newExpense = body.expense.action === 'create';
      if (body.object.action === 'create') {
        const linked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT l.id FROM "ObjectResourceLink" l
          LEFT JOIN "HomeExpense" e ON e.id=l."expenseId" AND e."accountId"=${a} AND e."homeId"=${h}
          WHERE l."accountId"=${a} AND l."homeId"=${h} AND l.state='active'
            AND (l."documentId" IN (${equivalentReceiptDocuments(a, h, draft)}) OR e."documentId" IN (${equivalentReceiptDocuments(a, h, draft)})) LIMIT 1`);
        const nativeLink = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT e.id FROM "HomeExpense" e WHERE e."accountId"=${a} AND e."homeId"=${h} AND e."assetId" IS NOT NULL AND e."documentId" IN (${equivalentReceiptDocuments(a, h, draft)}) LIMIT 1`);
        if (linked.length || nativeLink.length) throw conflict('receipt_object_already_linked', 'La ricevuta è già collegata: scegli la scheda esistente.');
        target = await tx.homeObject.create({ data: { accountId: a, homeId: h, name: body.object.values.name, type: 'other', createdAt: now, updatedAt: now } });
        for (const field of ['name', 'brand', 'model'] as const) {
          const value = body.object.values[field];
          if (value !== null) await this.storeField(tx, a, h, target.id, field, value, this.proposalOrigin(draft, field, value, body.object.origins[field]), draft);
        }
        await tx.objectEvent.create({ data: { accountId: a, homeId: h, targetKind: 'object', targetId: target.id, kind: 'created', before: Prisma.JsonNull, after: json({ kind: 'object', row: target, position: null }) } });
      } else if (body.object.action === 'reuse') {
        target = await this.target(tx, a, h, body.object.targetId);
        if (target.state !== 'active') throw conflict('resource_state_conflict', 'Ripristina prima la scheda.');
        if (target.version !== body.object.targetVersion) throw conflict('receipt_target_version_conflict', 'La scheda è cambiata. Rileggila.');
        const fields = await this.fields(tx, a, h, target.id), name = fields.name as { state: string } | null;
        if (name?.state === 'unavailable') throw deny();
        const before = target;
        target = await this.decideFields(tx, a, h, draft, target.id, body.object.fields);
        if (target.version !== before.version) await tx.objectEvent.create({ data: { accountId: a, homeId: h, targetKind: 'object', targetId: target.id, kind: 'receipt_fields_confirmed', before: json({ kind: 'object', row: before, position: null }), after: json({ kind: 'object', row: target, position: null }) } });
      }
      if (target) await this.documentObjectLink(tx, a, h, target.id, draft.documentId);
      const expenses = new ExpensesService(this.db, this.access, this.clock), policy = new EconomyPolicy(this.access);
      let expenseId: string | null = null;
      if (body.expense.action === 'create') {
        const linkedCost = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT e.id FROM "HomeExpense" e WHERE e."accountId"=${a} AND e."homeId"=${h} AND e."documentId" IN (${equivalentReceiptDocuments(a, h, draft)}) LIMIT 1`);
        if (linkedCost.length) throw conflict('receipt_expense_already_linked', 'La ricevuta ha già un costo: scegli la registrazione esistente.');
        const value = body.expense.values, provenance: Record<string, unknown> = {};
        for (const [field, wire] of [['title', 'title'], ['amount', 'amountCents'], ['date', 'spentOn'], ['supplier', 'supplier']] as const) {
          provenance[wire] = this.proposalOrigin(draft, field === 'date' ? 'documentDate' : field, value[wire], body.expense.origins[field]);
        }
        const innerKey = 'receipt_' + digest(JSON.stringify([id, key]));
        const result = await expenses.mutateInTransaction(tx, a, h, 'create', '', { ...value, category: 'purchase_replacement', documentId: draft.documentId, objectRef: target ? { kind: 'object', id: target.id } : null }, innerKey, true);
        expenseId = result.expense.id;
        const updated = await tx.homeExpense.update({ where: { id: expenseId }, data: { amountOrigin: body.expense.origins.amount === 'extraction' ? 'extraction_confirmed' : 'user_declared', economicProvenance: json(provenance) } });
        const saved = await policy.saved(tx, updated);
        await tx.expenseHistory.updateMany({ where: { expenseId, kind: 'created' }, data: { after: json(saved) } });
        await tx.expenseRequest.updateMany({ where: { accountId: a, homeId: h, operation: 'economy:create', key: innerKey }, data: { response: json(saved) } });
      } else if (body.expense.action === 'reuse') {
        const row = await expenses.record(tx, a, h, body.expense.targetId);
        if (row.version !== body.expense.targetVersion) throw conflict('expense_version_conflict', 'La spesa è cambiata. Rileggila.');
        if (row.state !== 'active') throw conflict('expense_state_conflict', 'Ripristina prima la spesa.');
        if (row.documentId && row.documentId !== draft.documentId) {
          const priorDocument = await this.source(tx, a, h, row.documentId);
          if (!priorDocument || priorDocument.original!.sha256 !== draft.documentSha256) throw conflict('expense_document_conflict', 'La spesa ha un altro documento.');
        }
        const ref = await policy.currentRef(tx, row);
        if (target && ref && (ref.kind !== 'object' || ref.id !== target.id)) throw conflict('expense_object_conflict', 'La spesa appartiene a un altro oggetto.');
        if (!row.documentId || target && !ref) await expenses.mutateInTransaction(tx, a, h, 'update', row.id, { expectedVersion: row.version, ...(!row.documentId ? { documentId: draft.documentId } : {}), ...(target && !ref ? { objectRef: { kind: 'object', id: target.id } } : {}) }, 'receipt_' + digest(JSON.stringify([id, key])), true);
        expenseId = row.id;
      }
      const result = { newObjects: Number(newObject), newExpenses: Number(newExpense), objectId: target?.id ?? null, expenseId };
      const open = target ? await tx.receiptComparison.count({ where: { accountId: a, homeId: h, objectId: target.id, state: 'open' } }) : 0;
      if (target) await this.closeResolvedDrafts(tx, a, h, target.id);
      return tx.receiptDraft.update({ where: { id }, data: { confirmation: json(result), state: open ? 'partially_resolved' : 'confirmed', version: { increment: 1 }, updatedAt: now } });
    });
  }

  recoverConfirmation(a: string, h: string, id: string, query: unknown, key?: string) {
    object(query, []); uuid(id);
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid();
    return this.transaction(a, h, false, async (tx, edit) => {
      const draft = await this.record(tx, a, h, id);
      if (!await this.source(tx, a, h, draft.documentId, draft)) throw deny();
      const request = await tx.receiptRequest.findUnique({ where: { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation: 'confirm', target: id, key } } });
      return request ? { status: 'confirmed', draft: await this.project(tx, a, h, draft, edit) } : { status: 'not_found' };
    });
  }
}
