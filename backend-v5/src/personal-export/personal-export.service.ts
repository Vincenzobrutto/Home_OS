import { ForbiddenException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { DocumentPolicy, canReadDocument } from '../documents/access';
import { EXPORT_LIMITS, ExportBudget, Projection, collect, list, record, scalars, tooLarge } from './projection';
import { readableReceiptObjectIds, readableReceiptProofs, readableReceiptProofKeys, receiptProofKey } from '../receipt-assistance/access';
import { organizationView } from '../document-intake/organization';

type Tx = Prisma.TransactionClient;
const unavailable = () => new ServiceUnavailableException({ code: 'personal_export_unavailable', message: 'Esportazione temporaneamente non disponibile.' });
const orderBy = { id: 'asc' } as const;
const pageWhere = (after?: string) => after ? { id: { gt: after } } : {};
const keys = (rows: { id: string }[]) => new Set(rows.map(row => row.id));

@Injectable()
export class PersonalExportService {
  private running = 0;
  constructor(private readonly db: PrismaService, private readonly policy: DocumentPolicy) {}

  // Uses the same succeeded-job source/version/hash rule as ReviewService.assetSources,
  // but batches and accounts for all rows rather than doing unbounded per-asset reads.
  private async readableAssets(tx: Tx, a: string, h: string, assetIds: string[], budget: ExportBudget) {
    const jobs = assetIds.length ? await collect((take, after) => tx.analysisJob.findMany({ where: { assetId: { in: assetIds }, state: 'succeeded', ...pageWhere(after) }, select: { id: true, assetId: true, documents: true }, take, orderBy }), budget) : [];
    const sourceIds = [...new Set(jobs.flatMap(job => list(job.documents).map(value => record(value).documentId).filter((id): id is string => typeof id === 'string')))];
    const docs = sourceIds.length ? await collect((take, after) => tx.document.findMany({ where: { id: { in: sourceIds, ...(after ? { gt: after } : {}) } }, select: { id: true, homeId: true, uploaderId: true, visibility: true, original: { select: { version: true, sha256: true } } }, take, orderBy }), budget) : [];
    const sources = new Map(docs.map(doc => [doc.id, doc]));
    const excluded = new Set<string>();
    for (const job of jobs) {
      if (!Array.isArray(job.documents)) { if (job.assetId) excluded.add(job.assetId); continue; }
      for (const raw of job.documents) {
        const source = record(raw), doc = typeof source.documentId === 'string' ? sources.get(source.documentId) : undefined;
        if (!doc || doc.homeId !== h || !canReadDocument(doc, a) || !doc.original || doc.original.version !== source.documentVersion || doc.original.sha256 !== source.documentSha256) { if (job.assetId) excluded.add(job.assetId); }
      }
    }
    return new Set(assetIds.filter(id => !excluded.has(id)));
  }
  private async snapshot(tx: Tx, a: string, h: string) {
    await this.policy.require(a, h, 'export', tx);
    const account = await tx.account.findUnique({ where: { id: a }, select: { id: true, name: true, email: true } });
    const home = await tx.home.findUnique({ where: { id: h }, select: { id: true, name: true, address: true } });
    if (!account || !home) throw new ForbiddenException('Accesso non consentito.');
    const budget = new ExportBudget(), own = { accountId: a, homeId: h };
    const documents = await collect((take, after) => tx.document.findMany({ where: { homeId: h, uploaderId: a, ...pageWhere(after) }, select: { id: true, name: true, visibility: true, createdAt: true, original: { select: { version: true, originalFilename: true, mimeType: true, byteSize: true, sha256: true } } }, take, orderBy }), budget);
    if (documents.some(doc => !doc.original)) throw unavailable();
    const organizationCandidates = await collect((take, after) => tx.documentOrganization.findMany({ where: { ...own, documentId: { in: documents.map(doc => doc.id) }, ...pageWhere(after) }, take, orderBy }), budget);
    const organizations = new Map(organizationCandidates.filter(org => documents.some(doc => doc.id === org.documentId && doc.original?.version === org.documentVersion && doc.original?.sha256 === org.documentSha256)).map(org => [org.documentId, organizationView(org)]));
    const organizationProofs = organizationCandidates.filter(org => organizations.has(org.documentId)).map(org => ({ documentId: org.documentId, documentVersion: org.documentVersion, documentSha256: org.documentSha256 }));
    const objectCandidates = await collect((take, after) => tx.homeObject.findMany({ where: { ...own, ...pageWhere(after) }, take, orderBy }), budget);
    const objectIds = await readableReceiptObjectIds(tx, a, h, objectCandidates.map(row => row.id));
    const objects = objectCandidates.filter(row => objectIds.has(row.id));
    const receiptFieldCandidates = await collect((take, after) => tx.receiptObjectField.findMany({ where: { ...own, objectId: { in: [...objectIds] }, ...pageWhere(after) }, take, orderBy }), budget);
    const comparisonCandidates = await collect((take, after) => tx.receiptComparison.findMany({ where: { ...own, objectId: { in: [...objectIds] }, draft: own, ...pageWhere(after) }, include: { draft: { select: { documentId: true, documentVersion: true, documentSha256: true } } }, take, orderBy }), budget);
    const fieldProofs = receiptFieldCandidates.filter(row => row.origin === 'extraction_confirmed');
    const proofKeys = await readableReceiptProofKeys(tx, a, h, [...fieldProofs, ...comparisonCandidates.map(row => row.draft)], rows => budget.add(rows));
    const receiptFields = receiptFieldCandidates.filter(row => row.origin === 'user_declared' || proofKeys.has(receiptProofKey(row)));
    const receiptComparisons = comparisonCandidates.filter(row => proofKeys.has(receiptProofKey(row.draft)));
    const receiptNames = receiptFields.filter(row => row.fieldKey === 'name');
    const receiptNameIds = new Set(receiptNames.map(row => row.objectId));
    const currentNames = new Map(objects.filter(row => receiptNameIds.has(row.id)).map(row => [row.id, row.name]));
    const receiptProofs = [...receiptFields.filter(row => row.origin === 'extraction_confirmed'), ...receiptComparisons.map(row => row.draft)].map(row => ({ documentId: row.documentId, documentVersion: row.documentVersion, documentSha256: row.documentSha256 }));
    const assetCandidates = await collect((take, after) => tx.boilerAsset.findMany({ where: { ...own, ...pageWhere(after) }, take, orderBy }), budget);
    const assetIds = await this.readableAssets(tx, a, h, assetCandidates.map(row => row.id), budget), assets = assetCandidates.filter(row => assetIds.has(row.id));
    const activities = await collect((take, after) => tx.homeActivity.findMany({ where: { ...own, ...pageWhere(after) }, take, orderBy }), budget);
    const expenses = await collect((take, after) => tx.homeExpense.findMany({ where: { ...own, ...pageWhere(after) }, take, orderBy }), budget);
    const works = await collect((take, after) => tx.economicWork.findMany({ where: { ...own, ...pageWhere(after) }, take, orderBy }), budget);
    const subjects = [{ objectId: { in: objects.map(row => row.id) } }, { boilerId: { in: [...assetIds] } }];
    const positions = await collect((take, after) => tx.objectPosition.findMany({ where: { ...own, OR: subjects, ...pageWhere(after) }, take, orderBy }), budget);
    const roomIds = [...new Set(positions.flatMap(row => list(row.roomIds)).filter((id): id is string => typeof id === 'string'))];
    const rooms = await collect((take, after) => tx.homeRoom.findMany({ where: { homeId: h, id: { in: roomIds, ...(after ? { gt: after } : {}) } }, select: { id: true, name: true, type: true, state: true }, take, orderBy }), budget);
    const links = await collect((take, after) => tx.objectResourceLink.findMany({ where: { ...own, OR: subjects, ...pageWhere(after) }, take, orderBy }), budget);
    const projection = new Projection(new Map(documents.map(doc => [doc.id, { version: doc.original!.version, sha256: doc.original!.sha256 }])), keys(objects), assetIds, keys(activities), keys(expenses), keys(works), keys(rooms));
    const activityHistory = await collect((take, after) => tx.activityHistory.findMany({ where: { accountId: a, activityId: { in: activities.map(row => row.id) }, ...pageWhere(after) }, take, orderBy }), budget);
    const expenseHistory = await collect((take, after) => tx.expenseHistory.findMany({ where: { accountId: a, expenseId: { in: expenses.map(row => row.id) }, ...pageWhere(after) }, take, orderBy }), budget);
    const workHistory = await collect((take, after) => tx.economicWorkHistory.findMany({ where: { accountId: a, workId: { in: works.map(row => row.id) }, ...pageWhere(after) }, take, orderBy }), budget);
    const objectHistory = await collect((take, after) => tx.objectEvent.findMany({ where: { ...own, OR: [{ targetKind: 'object', targetId: { in: objects.map(row => row.id) } }, { targetKind: 'boiler', targetId: { in: [...assetIds] } }, { targetKind: 'room', targetId: { in: roomIds } }], ...pageWhere(after) }, take, orderBy }), budget);
    const assetHistory = await collect((take, after) => tx.assetHistory.findMany({ where: { assetId: { in: [...assetIds] }, ...pageWhere(after) }, take, orderBy }), budget);
    const history = [
      ...activityHistory.map(row => ({ ...scalars(row, ['id', 'kind', 'at', 'note']), resource: { kind: 'activity', id: row.activityId }, before: projection.history('activity', row.kind, row.before), after: projection.history('activity', row.kind, row.after) })),
      ...expenseHistory.map(row => ({ ...scalars(row, ['id', 'kind', 'at', 'note']), resource: { kind: 'expense', id: row.expenseId }, before: projection.history('expense', row.kind, row.before), after: projection.history('expense', row.kind, row.after) })),
      ...workHistory.map(row => ({ ...scalars(row, ['id', 'kind', 'at']), resource: { kind: 'work', id: row.workId }, before: projection.history('work', row.kind, row.before), after: projection.history('work', row.kind, row.after) })),
      ...objectHistory.map(row => {
        const safe = (input: unknown) => { const saved = record(input), snapshot = record(saved.row), name = currentNames.get(String(snapshot.id)); return name !== undefined && saved.kind === 'object' ? { ...saved, row: { ...snapshot, name } } : input; };
        return { ...scalars(row, ['id', 'kind', 'at']), resource: { kind: row.targetKind, id: row.targetId }, before: projection.history(row.targetKind, row.kind, safe(row.before), true), after: projection.history(row.targetKind, row.kind, safe(row.after), true) };
      }),
      ...assetHistory.map(row => ({ ...scalars(row, ['id', 'kind', 'note']), at: row.createdAt.toISOString(), resource: { kind: 'boiler', id: row.assetId }, changes: projection.technicalChanges(row.changes) })),
    ].sort((left, right) => String(record(left).at).localeCompare(String(record(right).at)) || String(record(left).id).localeCompare(String(record(right).id)));
    const data = {
      documents: documents.map(row => ({ ...scalars(row, ['id', 'name', 'visibility', 'createdAt']), ...(organizations.has(row.id) ? { organization: organizations.get(row.id) } : {}), original: scalars(row.original, ['version', 'originalFilename', 'mimeType', 'byteSize', 'sha256']) })),
      objects: objects.map(row => projection.snapshot('object', row)),
      technicalAssets: assets.map(row => projection.snapshot('boiler', row)),
      rooms: rooms.map(row => scalars(row, ['id', 'name', 'type', 'state'])),
      positions: positions.map(row => ({ subject: projection.subject(row), version: row.version, roomIds: list(row.roomIds).flatMap(id => projection.ref(id, projection.rooms) ? [id] : []) })),
      activities: activities.map(row => projection.snapshot('activity', row)),
      expenses: expenses.map(row => projection.snapshot('expense', row)),
      works: works.map(row => projection.snapshot('work', row)),
      links: links.flatMap(row => { const link = projection.link(row); return link ? [link] : []; }), history,
      receiptFields: receiptFields.flatMap(row => { const field = projection.receiptField(row); return field ? [field] : []; }),
      receiptComparisons: receiptComparisons.flatMap(row => { const comparison = projection.receiptComparison(row); return comparison ? [comparison] : []; }),
    };
    const limitations = ['originals_not_included', 'sharing_and_ai_drafts_not_included', 'document_physical_availability_not_checked', ...(projection.refsExcluded || assets.length !== assetCandidates.length || objects.length !== objectCandidates.length || receiptFields.length !== receiptFieldCandidates.length || receiptComparisons.length !== comparisonCandidates.length ? ['some_references_excluded'] : []), ...(projection.historyLimited ? ['some_history_snapshots_unavailable'] : [])];
    if (receiptNames.length) limitations.push('receipt_object_history_uses_current_name');
    return { envelope: { format: 'dimora-personal-home-export', formatVersion: 1, generatedAt: new Date().toISOString(), scope: { homeId: h, accountId: a }, account, home, data, limitations }, assetIds: [...assetIds], objectIds: [...objectIds], receiptProofs: [...receiptProofs, ...organizationProofs] };
  }
  async export(a: string, h: string, authorize: () => Promise<unknown>) {
    if (this.running >= EXPORT_LIMITS.concurrent) throw new ServiceUnavailableException({ code: 'personal_export_busy', message: 'Un’esportazione è già in corso. Riprova più tardi.' });
    this.running++;
    try {
      const built = await this.db.$transaction(tx => this.snapshot(tx, a, h), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000, maxWait: 15000 });
      const bytes = Buffer.from(JSON.stringify(built.envelope));
      if (bytes.length > EXPORT_LIMITS.bytes) throw tooLarge();
      // A fresh transaction must see privacy changes committed after the snapshot.
      await this.db.$transaction(async tx => {
        await this.policy.require(a, h, 'export', tx);
        const readable = await this.readableAssets(tx, a, h, built.assetIds, new ExportBudget());
        if (built.assetIds.some(id => !readable.has(id))) throw new ForbiddenException('Accesso non consentito.');
        const readableObjects = await readableReceiptObjectIds(tx, a, h, built.objectIds);
        if (built.objectIds.some(id => !readableObjects.has(id))) throw new ForbiddenException('Accesso non consentito.');
        if (!await readableReceiptProofs(tx, a, h, built.receiptProofs)) throw new ForbiddenException('Accesso non consentito.');
      }, { timeout: 15000, maxWait: 15000 });
      await authorize();
      await this.policy.require(a, h, 'export');
      return bytes;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw unavailable();
    } finally { this.running--; }
  }
}
