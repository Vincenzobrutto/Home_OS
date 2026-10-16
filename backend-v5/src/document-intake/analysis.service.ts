import { ForbiddenException, HttpException, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { LocalFileStorage } from '../documents/storage';
import { PdfTextExtractor, ANALYSIS_LIMITS } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { digest } from '../security';
import { conflict, invalid, object, uuid, version } from '../review/domain';
import { IntakeBatchesService } from './batches.service';
import { classifyText, LOCAL_CLASSIFIER } from './classifier';
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class IntakeAnalysisService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>; private busy = false; private stopped = false;
  constructor(private readonly db: PrismaService, private readonly batches: IntakeBatchesService, private readonly storage: LocalFileStorage, private readonly parser: PdfTextExtractor, @Optional() private readonly queueScope: string = 'product') {}
  private get queuePrefix() { return digest(this.queueScope) + ':'; }
  onModuleInit() { this.timer = setInterval(() => { void this.workOne().catch(() => undefined); }, 1500); this.timer.unref(); }
  onModuleDestroy() { this.stopped = true; if (this.timer) clearInterval(this.timer); }
  async start(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id); if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid();
    key = this.queuePrefix + key;
    const row = object(input, ['items', 'provider']); if (row.provider !== LOCAL_CLASSIFIER.provider || !Array.isArray(row.items) || !row.items.length || row.items.length > 20) throw invalid();
    const items = row.items.map(raw => { const r = object(raw, ['id', 'expectedVersion']); return { id: uuid(r.id), expectedVersion: version(r.expectedVersion) }; });
    if (new Set(items.map(i => i.id)).size !== items.length) throw invalid();
    await this.batches.authorized(a, h, true, async tx => {
      const batch = await this.batches.locked(tx, a, h, id);
      let changed = false;
      for (const selected of items) {
        const item = batch.items.find(i => i.id === selected.id); if (!item) throw new ForbiddenException();
        const hash = digest(JSON.stringify(selected)), prior = await tx.documentIntakeAnalysis.findUnique({ where: { itemId_key: { itemId: item.id, key: key! } } });
        if (prior) { if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Richiesta già usata.'); continue; }
        if (item.version !== selected.expectedVersion || ['saved', 'confirmed'].includes(item.reviewState)) throw conflict('item_version_conflict', 'Rileggi il file e conserva le scelte già salvate.');
        await this.batches.source(tx, a, h, item);
        if (await tx.documentIntakeAnalysis.findFirst({ where: { itemId: item.id, state: { in: ['queued', 'running'] } } })) throw conflict('intake_analysis_running', 'Classificazione già in corso.');
        await tx.documentIntakeAnalysis.create({ data: { itemId: item.id, key: key!, digest: hash } });
        changed = true;
        await tx.documentIntakeItem.update({ where: { id: item.id }, data: { analysisState: 'queued', proposal: Prisma.DbNull, version: { increment: 1 }, updatedAt: new Date() } });
      }
      if (changed) await tx.documentIntakeBatch.update({ where: { id }, data: { version: { increment: 1 }, updatedAt: new Date() } });
    });
    return this.batches.get(a, h, id, {});
  }
  /** Local-only retry after a lease expiry is safe: no outbound or paid request exists. */
  async workOne() {
    if (this.busy || this.stopped) return; this.busy = true;
    let jobId: string | undefined, token: string | undefined, observedToken: string | null = null;
    try {
      const candidate = await this.db.documentIntakeAnalysis.findFirst({ where: { key: { startsWith: this.queuePrefix }, OR: [{ state: 'queued' }, { state: 'running', leaseUntil: { lte: new Date() } }] }, include: { item: { include: { batch: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      if (!candidate) return;
      const { accountId: a, homeId: h, id: batchId } = candidate.item.batch; token = randomUUID(); jobId = candidate.id; observedToken = candidate.leaseToken;
      const claimed = await this.batches.authorized(a, h, true, async tx => {
        const batch = await this.batches.locked(tx, a, h, batchId), item = batch.items.find(i => i.id === candidate.itemId)!;
        const current = await tx.documentIntakeAnalysis.findUniqueOrThrow({ where: { id: candidate.id } });
        if (!['queued', 'running'].includes(current.state) || (current.state === 'running' && current.leaseUntil! > new Date())) return null;
        if (['saved', 'confirmed'].includes(item.reviewState)) throw conflict('intake_review_saved', 'Decisione già salvata.');
        const doc = await this.batches.source(tx, a, h, item);
        const file = await tx.storedFile.findUniqueOrThrow({ where: { id: doc.original!.fileId } });
        await tx.documentIntakeAnalysis.update({ where: { id: current.id }, data: { state: 'running', leaseToken: token, leaseUntil: new Date(Date.now() + 120000), updatedAt: new Date() } });
        await tx.documentIntakeItem.update({ where: { id: item.id }, data: { analysisState: 'running', version: { increment: 1 }, updatedAt: new Date() } });
        return { item, key: file.storageKey };
      });
      if (!claimed) return;
      let proposal: ReturnType<typeof classifyText> = null, pageCount: number | null = null, state = 'unsupported', error: string | null = null;
      try {
        if (claimed.item.mimeType !== 'application/pdf' || claimed.item.byteSize > ANALYSIS_LIMITS.maxFileBytes) throw new ProviderFailure('analysis_limits_exceeded');
        const bytes = await this.storage.read(claimed.key);
        if (bytes.length !== claimed.item.byteSize || digest(bytes) !== claimed.item.documentSha256) throw new ProviderFailure('storage_unavailable');
        const [text] = await this.parser.extract([{ snapshot: { documentId: claimed.item.documentId!, documentVersion: claimed.item.documentVersion as 1, documentSha256: claimed.item.documentSha256! }, bytes }]);
        pageCount = text.pages.length; proposal = classifyText(text.pages); state = proposal?.collections.includes('technical') ? 'needs_choice' : 'ready';
      } catch (e) { error = e instanceof ProviderFailure ? e.code : 'intake_analysis_failed'; state = error === 'pdf_text_unavailable' ? 'unreadable' : error === 'analysis_limits_exceeded' ? 'unsupported' : 'failed'; }
      await this.batches.authorized(a, h, true, async tx => {
        const batch = await this.batches.locked(tx, a, h, batchId), item = batch.items.find(i => i.id === candidate.itemId)!;
        const current = await tx.documentIntakeAnalysis.findUniqueOrThrow({ where: { id: candidate.id } });
        if (current.state !== 'running' || current.leaseToken !== token || current.leaseUntil! <= new Date()) return;
        await this.batches.source(tx, a, h, item);
        if (['saved', 'confirmed'].includes(item.reviewState)) throw conflict('intake_review_saved', 'Decisione già salvata.');
        await tx.documentIntakeItem.update({ where: { id: item.id }, data: { proposal: proposal ? json(proposal) : Prisma.DbNull, pageCount, analysisState: state, version: { increment: 1 }, updatedAt: new Date() } });
        await tx.documentIntakeAnalysis.update({ where: { id: candidate.id }, data: { state: 'succeeded', leaseToken: null, leaseUntil: null, error, updatedAt: new Date() } });
        await tx.documentIntakeBatch.update({ where: { id: batchId }, data: { version: { increment: 1 }, updatedAt: new Date() } });
      });
    } catch (e) {
      if (jobId && e instanceof HttpException && [403, 409].includes(e.getStatus())) await this.db.$transaction(async tx => {
        const where = { id: jobId, OR: [{ leaseToken: token }, { state: 'queued' }, ...(observedToken ? [{ leaseToken: observedToken, leaseUntil: { lte: new Date() } }] : [])] };
        const changed = await tx.documentIntakeAnalysis.updateMany({ where, data: { state: 'failed', leaseToken: null, leaseUntil: null, error: 'intake_source_unavailable', updatedAt: new Date() } });
        if (changed.count) { const job = await tx.documentIntakeAnalysis.findUniqueOrThrow({ where: { id: jobId } }); await tx.documentIntakeItem.updateMany({ where: { id: job.itemId, analysisState: { in: ['queued', 'running'] }, reviewState: { notIn: ['saved', 'confirmed'] } }, data: { analysisState: 'failed', version: { increment: 1 }, updatedAt: new Date() } }); }
      }).catch(() => undefined);
      else throw e;
    } finally { this.busy = false; }
  }
}
