import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { FixtureProvider, ProviderFailure } from './provider';
import { ReviewService } from './review.service';
const messages: Record<string, string> = {
  provider_fixture_unsupported: 'Il provider di test riconosce soltanto i PDF sintetici di esempio. Puoi compilare la scheda manualmente.',
  storage_unavailable: 'Originale temporaneamente non disponibile.', access_revoked: 'Accesso alle fonti o alla casa non più consentito.',
  analysis_timeout: 'Analisi interrotta per tempo massimo.', analysis_unavailable: 'Analisi temporaneamente non disponibile.',
};
@Injectable()
export class AnalysisWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  constructor(private readonly db: PrismaService, private readonly review: ReviewService, private readonly provider: FixtureProvider) {}
  onModuleInit() {
    this.timer = setInterval(() => { if (!this.running) { this.running = this.tick().catch(() => console.warn('Worker M3 rinviato: verifica database locale.')).finally(() => { this.running = undefined; }); } }, 500);
    this.timer.unref();
  }
  async onModuleDestroy() { if (this.timer) clearInterval(this.timer); await this.running; }
  async tick() {
    const now = new Date();
    const candidate = await this.db.analysisJob.findFirst({ where: { OR: [{ state: 'queued' }, { state: 'running', leaseUntil: { lte: now } }] }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    if (!candidate) return;
    const token = randomUUID();
    const claim = await this.db.analysisJob.updateMany({ where: { id: candidate.id, state: candidate.state, leaseToken: candidate.leaseToken, ...(candidate.state === 'running' ? { leaseUntil: { lte: now } } : {}) }, data: { state: 'running', firstStartedAt: candidate.firstStartedAt ?? now, leaseUntil: new Date(now.getTime() + 30000), leaseToken: token } });
    if (!claim.count) return;
    const job = await this.db.analysisJob.findUniqueOrThrow({ where: { id: candidate.id } });
    const remaining = 120000 - (Date.now() - job.firstStartedAt!.getTime());
    let deadline: NodeJS.Timeout | undefined;
    try {
      if (remaining <= 0) throw new ProviderFailure('analysis_timeout');
      const proposed = await Promise.race([
        this.review.inputs(job).then(inputs => this.provider.analyze(inputs)),
        new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new ProviderFailure('analysis_timeout')), remaining); deadline.unref(); }),
      ]);
      await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "AnalysisJob" WHERE id=${job.id} FOR UPDATE`;
        const current = await tx.analysisJob.findUniqueOrThrow({ where: { id: job.id } });
        if (current.state !== 'running' || current.leaseToken !== token) return;
        if (Date.now() - current.firstStartedAt!.getTime() >= 120000) throw new ProviderFailure('analysis_timeout');
        const outcome = await this.review.publish(tx, current, proposed);
        await tx.analysisJob.update({ where: { id: job.id }, data: { ...outcome, state: 'succeeded', finishedAt: new Date(), leaseToken: null, leaseUntil: null } });
      }, { maxWait: 15000, timeout: 15000 });
    } catch (error) {
      const status = (error as { getStatus?: () => number }).getStatus?.();
      const code = error instanceof ProviderFailure ? error.code : status === 403 ? 'access_revoked' : status === 503 ? 'storage_unavailable' : 'analysis_unavailable';
      await this.db.analysisJob.updateMany({ where: { id: job.id, state: 'running', leaseToken: token }, data: { state: 'failed', finishedAt: new Date(), leaseUntil: null, leaseToken: null, error: { code, message: messages[code] ?? messages.analysis_unavailable } } });
    } finally { if (deadline) clearTimeout(deadline); }
  }
}
