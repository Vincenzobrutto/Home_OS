import { ForbiddenException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type ReceiptAnalysisJob } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest } from '../security';
import { conflict, invalid, object, uuid } from '../review/domain';
import { ANALYSIS_LIMITS } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { LocalFileStorage } from '../documents/storage';
import { ActivityClock, temporal } from '../activities/domain';
import { ReceiptAssistanceService } from './receipt.service';
import { ReceiptFixtureProvider, receiptFixtureKind } from './fixture-provider';
import { ReceiptAiAnalysis } from './ai-analysis';
import { receiptBilling } from './ai-budget';

export const RECEIPT_JOB_LIMITS = { globalActive: 8, accountActive: 2, workerConcurrency: 2, leaseMs: 30000, maxRunMs: 30000, paidLeaseMs: 150000, maxPaidRunMs: 120000 } as const;
const deny = () => new ForbiddenException('Accesso non consentito.');
const busy = () => new ServiceUnavailableException({ code: 'receipt_analysis_busy', message: 'Sono già in corso altre analisi. Riprova più tardi.' });
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
type Tx = Prisma.TransactionClient;

@Injectable()
export class ReceiptJobService {
  constructor(private readonly db: PrismaService, private readonly receipts: ReceiptAssistanceService, private readonly storage: LocalFileStorage, private readonly provider: ReceiptFixtureProvider, private readonly clock: ActivityClock, private readonly ai: ReceiptAiAnalysis) {}

  private async view(tx: Tx, a: string, h: string, row: ReceiptAnalysisJob) {
    const source = await this.receipts.authorizedSource(tx, a, h, row.documentId, row);
    const attempt = row.provider === 'anthropic' ? await tx.receiptAiAttempt.findUnique({ where: { jobId: row.id } }) : null;
    return {
      id: row.id, version: row.version, provider: row.provider, isSimulation: row.provider === 'receipt_fixture_v1',
      model: source ? attempt?.model ?? null : null, billing: source ? receiptBilling(attempt) : null,
      state: source ? row.state : 'unavailable', draftId: source && row.state === 'succeeded' ? row.draftId : null,
      errorCode: source ? row.errorCode : null,
      documentLink: { state: source ? 'linked' : 'unavailable', document: source ? { id: source.id, name: source.name } : null },
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    };
  }
  start(a: string, h: string, input: unknown, key?: string) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    const row = object(input, ['documentId', 'provider', 'consentToProviderTransfer']);
    const body = { documentId: uuid(row.documentId), provider: row.provider, consentToProviderTransfer: row.consentToProviderTransfer };
    if (typeof body.provider !== 'string' || typeof body.consentToProviderTransfer !== 'boolean') throw invalid();
    return this.receipts.authorized(a, h, true, async tx => {
      const source = await this.receipts.authorizedSource(tx, a, h, body.documentId);
      if (!source) throw deny();
      const lookup = { accountId_homeId_key: { accountId: a, homeId: h, key } }, hash = digest(JSON.stringify(body));
      const prior = await tx.receiptAnalysisJob.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata con dati diversi.');
        if (!await this.receipts.authorizedSource(tx, a, h, prior.documentId, prior)) throw deny();
        return { job: await this.view(tx, a, h, prior) };
      }
      if (body.provider !== 'receipt_fixture_v1' && body.provider !== 'anthropic') throw new ServiceUnavailableException({ code: 'ai_provider_disabled', message: 'Questo servizio di analisi non è abilitato.' });
      if (body.provider === 'receipt_fixture_v1' && body.consentToProviderTransfer) throw invalid('La simulazione locale non invia il documento a un servizio esterno.');
      if (body.provider === 'anthropic') {
        if (!this.ai) throw new ServiceUnavailableException({ code: 'ai_provider_disabled', message: 'Analisi ricevuta non abilitata.' });
        this.ai.budget.requireSource(source.original!.sha256);
        if (!body.consentToProviderTransfer) throw invalid('Autorizza esplicitamente l’invio del testo di questo documento ad Anthropic.');
      }
      if (source.original!.mimeType !== 'application/pdf') throw invalid('Per questa analisi serve un PDF con testo.', 'receipt_pdf_required');
      if (source.original!.byteSize > ANALYSIS_LIMITS.maxFileBytes) throw invalid('Il PDF supera il limite di analisi.', 'analysis_limits_exceeded');
      if (body.provider === 'receipt_fixture_v1' && !receiptFixtureKind(source.original!.sha256)) throw new ServiceUnavailableException({ code: 'provider_fixture_unsupported', message: 'La simulazione accetta soltanto i PDF sintetici di collaudo. Puoi compilare i dati manualmente.' });
      const snapshot = { documentId: source.id, documentVersion: source.original!.version, documentSha256: source.original!.sha256 };
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('receipt:queue',0))::text AS locked`;
      if (body.provider === 'anthropic' && await tx.receiptAnalysisJob.findFirst({ where: { accountId: a, homeId: h, ...snapshot, provider: 'anthropic', state: 'uncertain' } })) throw conflict('analysis_outcome_unknown', 'L’esito di una precedente analisi è incerto. Non avviare un altro invio a pagamento. Puoi compilare a mano.');
      if (await tx.receiptAnalysisJob.findFirst({ where: { accountId: a, homeId: h, ...snapshot, state: { in: ['queued', 'running'] } } })) throw conflict('receipt_analysis_already_running', 'È già in corso un’analisi di questo documento.');
      const active = { state: { in: ['queued', 'running'] } };
      if (await tx.receiptAnalysisJob.count({ where: active }) >= RECEIPT_JOB_LIMITS.globalActive || await tx.receiptAnalysisJob.count({ where: { ...active, accountId: a } }) >= RECEIPT_JOB_LIMITS.accountActive) throw busy();
      const job = await tx.receiptAnalysisJob.create({ data: { accountId: a, homeId: h, ...snapshot, provider: body.provider as string, consentToProviderTransfer: body.provider === 'anthropic', key, digest: hash } });
      if (body.provider === 'anthropic') await this.ai.budget.reserve(tx, job.id, snapshot.documentSha256);
      return { job: await this.view(tx, a, h, job) };
    });
  }
  get(a: string, h: string, id: string, query: unknown) {
    uuid(id); object(query, []);
    return this.receipts.authorized(a, h, false, async tx => {
      const row = await tx.receiptAnalysisJob.findFirst({ where: { id, accountId: a, homeId: h } });
      if (!row) throw deny();
      return { job: await this.view(tx, a, h, row) };
    });
  }

  /** Optional ID is used by isolated synthetic tests; the runtime drains the queue. */
  async claim(id?: string) {
    if (id) uuid(id);
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('receipt:queue',0))::text AS locked`;
      const now = new Date();
      const expired = await tx.receiptAnalysisJob.findFirst({ where: { ...(id ? { id } : {}), state: 'running', leaseUntil: { lte: now } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      if (expired) {
        const attempt = expired.provider === 'anthropic' ? await tx.receiptAiAttempt.findUnique({ where: { jobId: expired.id } }) : null;
        const unknown = attempt?.state === 'sending' || attempt?.state === 'uncertain';
        if (attempt?.state === 'reserved') await tx.receiptAiAttempt.update({ where: { id: attempt.id }, data: { state: 'released', actualMicroUsd: 0 } });
        if (attempt?.state === 'sending') await tx.receiptAiAttempt.update({ where: { id: attempt.id }, data: { state: 'uncertain' } });
        await tx.receiptAnalysisJob.updateMany({ where: { id: expired.id, state: 'running', leaseToken: expired.leaseToken, leaseUntil: { lte: now } }, data: { state: unknown ? 'uncertain' : 'failed', errorCode: unknown ? 'analysis_outcome_unknown' : 'analysis_timeout', leaseToken: null, leaseUntil: null, version: { increment: 1 }, updatedAt: now } });
      }
      if (await tx.receiptAnalysisJob.count({ where: { state: 'running', leaseUntil: { gt: now } } }) >= RECEIPT_JOB_LIMITS.workerConcurrency) return null;
      const queued = await tx.receiptAnalysisJob.findFirst({ where: { ...(id ? { id } : {}), state: 'queued' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      if (!queued) return null;
      return tx.receiptAnalysisJob.update({ where: { id: queued.id }, data: { state: 'running', leaseToken: randomUUID(), leaseUntil: new Date(now.getTime() + (queued.provider === 'anthropic' ? RECEIPT_JOB_LIMITS.paidLeaseMs : RECEIPT_JOB_LIMITS.leaseMs)), firstStartedAt: now, version: { increment: 1 }, updatedAt: now } });
    }, { timeout: 15000, maxWait: 15000 });
  }
  private async input(job: ReceiptAnalysisJob) {
    if (job.provider === 'receipt_fixture_v1' && !receiptFixtureKind(job.documentSha256)) throw new ProviderFailure('provider_fixture_unsupported');
    if (job.provider === 'anthropic') this.ai.budget.requireSource(job.documentSha256);
    const key = await this.receipts.authorized(job.accountId, job.homeId, true, async tx => {
      const source = await this.receipts.authorizedSource(tx, job.accountId, job.homeId, job.documentId, job);
      if (!source) throw deny();
      if (source.original!.mimeType !== 'application/pdf' || source.original!.byteSize > ANALYSIS_LIMITS.maxFileBytes) throw new ProviderFailure('analysis_limits_exceeded');
      const file = await tx.storedFile.findUnique({ where: { id: source.original!.fileId } });
      if (!file) throw new ProviderFailure('storage_unavailable');
      return file.storageKey;
    });
    return { snapshot: { documentId: job.documentId, documentVersion: job.documentVersion as 1, documentSha256: job.documentSha256 }, bytes: await this.storage.read(key) };
  }
  async run(job: ReceiptAnalysisJob) {
    let timer: NodeJS.Timeout | undefined;
    const abort = new AbortController();
    try {
      const owned = await this.db.receiptAnalysisJob.findFirst({ where: { id: job.id, accountId: job.accountId, homeId: job.homeId, state: 'running', leaseToken: job.leaseToken, leaseUntil: { gt: new Date() } } });
      if (!owned) return;
      const stopAt = Math.min((job.firstStartedAt?.getTime() ?? 0) + (job.provider === 'anthropic' ? RECEIPT_JOB_LIMITS.maxPaidRunMs : RECEIPT_JOB_LIMITS.maxRunMs), job.leaseUntil?.getTime() ?? 0);
      const deadline = stopAt - Date.now();
      if (deadline <= 0 || job.state !== 'running' || !job.leaseToken) throw new ProviderFailure('analysis_timeout');
      const analyze = async () => {
        const input = await this.input(job);
        if (Date.now() >= stopAt) throw new ProviderFailure('analysis_timeout');
        if (job.provider === 'anthropic') return this.ai.analyze(job, input, temporal(this.clock.now()).today, abort.signal, action => this.receipts.authorized(job.accountId, job.homeId, true, async tx => {
          if (!await this.receipts.authorizedSource(tx, job.accountId, job.homeId, job.documentId, job)) throw deny();
          return action(tx);
        }));
        return this.provider.analyze(input, temporal(this.clock.now()).today);
      };
      const output = await Promise.race([
        analyze(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new ProviderFailure('analysis_timeout')); }, deadline); timer.unref(); }),
      ]);
      await this.receipts.authorized(job.accountId, job.homeId, true, async tx => {
        await tx.$queryRaw`SELECT id FROM "ReceiptAnalysisJob" WHERE id=${job.id} FOR UPDATE`;
        const current = await tx.receiptAnalysisJob.findUnique({ where: { id: job.id } });
        if (!current || current.state !== 'running' || current.leaseToken !== job.leaseToken) return;
        if (!current.leaseUntil || current.leaseUntil.getTime() <= Date.now()) throw new ProviderFailure('analysis_timeout');
        if (!await this.receipts.authorizedSource(tx, job.accountId, job.homeId, job.documentId, job)) throw deny();
        const draft = await tx.receiptDraft.create({ data: { accountId: job.accountId, homeId: job.homeId, documentId: job.documentId, documentVersion: job.documentVersion, documentSha256: job.documentSha256, mode: 'extraction', fields: json(output.fields), total: output.total ? json(output.total) : Prisma.DbNull } });
        await tx.receiptAnalysisJob.update({ where: { id: job.id }, data: { state: 'succeeded', draftId: draft.id, errorCode: null, leaseToken: null, leaseUntil: null, version: { increment: 1 }, updatedAt: new Date() } });
      });
    } catch (error) {
      const response = error instanceof HttpException ? error.getResponse() : null;
      const configuredCode = response && typeof response === 'object' && 'code' in response && ['ai_provider_disabled', 'ai_provider_unconfigured', 'ai_model_unavailable', 'receipt_document_not_authorized'].includes(String(response.code)) ? String(response.code) : null;
      const code = error instanceof ForbiddenException ? 'access_revoked' : error instanceof ProviderFailure ? error.code : configuredCode ?? (error instanceof ServiceUnavailableException ? 'storage_unavailable' : 'analysis_unavailable');
      if (job.provider === 'anthropic') await this.ai.budget.fail(job.id);
      const attempt = job.provider === 'anthropic' ? await this.db.receiptAiAttempt.findUnique({ where: { jobId: job.id } }) : null;
      const unknown = attempt?.state === 'uncertain';
      await this.db.receiptAnalysisJob.updateMany({ where: { id: job.id, state: 'running', leaseToken: job.leaseToken }, data: { state: unknown ? 'uncertain' : 'failed', errorCode: unknown ? 'analysis_outcome_unknown' : code, leaseToken: null, leaseUntil: null, version: { increment: 1 }, updatedAt: new Date() } });
    } finally { abort.abort(); if (timer) clearTimeout(timer); }
  }
}
