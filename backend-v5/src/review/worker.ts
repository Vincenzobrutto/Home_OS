import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { FixtureProvider, ProviderFailure } from './provider';
import { ReviewService } from './review.service';
import { AiAnalysis } from './ai-analysis';
import { AiBudget } from './ai-budget';
import type { Prisma } from '../../generated/client';
import type { Snapshot } from './provider';
const messages: Record<string, string> = {
  provider_fixture_unsupported: 'Il provider di test riconosce soltanto i PDF sintetici di esempio. Puoi compilare la scheda manualmente.',
  storage_unavailable: 'Originale temporaneamente non disponibile.', access_revoked: 'Accesso alle fonti o alla casa non più consentito.',
  analysis_timeout: 'Analisi interrotta per tempo massimo.', analysis_unavailable: 'Analisi temporaneamente non disponibile.',
  ai_provider_unconfigured: 'Configura Anthropic sul server locale.', ai_provider_disabled: 'Provider Anthropic disabilitato.',
  ai_model_unavailable: 'Il modello configurato non è disponibile.', provider_auth_failed: 'Credenziali Anthropic non valide.',
  provider_rate_limited: 'Anthropic ha limitato la richiesta. Nessun nuovo tentativo automatico.', provider_unavailable: 'Anthropic temporaneamente non disponibile.',
  analysis_invalid_output: 'Risposta AI non utilizzabile. Nessun dato confermato.', evidence_unverified: 'Le citazioni AI non corrispondono alle pagine originali.',
  pdf_text_unavailable: 'Il PDF non contiene testo leggibile in tutte le pagine. OCR non disponibile in questa fase.',
  pdf_encrypted: 'PDF protetto non supportato.', pdf_invalid: 'PDF non leggibile.', analysis_limits_exceeded: 'Il documento supera i limiti di questa analisi.',
  multi_assets_unsupported: 'Il documento contiene più caldaie non attribuibili a una sola scheda.',
  analysis_outcome_unknown: 'Esito della chiamata AI incerto. Nessun reinvio automatico; il costo resta riservato.',
};
@Injectable()
export class AnalysisWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  constructor(private readonly db: PrismaService, private readonly review: ReviewService, private readonly provider: FixtureProvider, private readonly ai?: AiAnalysis, private readonly budget?: AiBudget) {}
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
    let deadline: NodeJS.Timeout | undefined, heartbeat: NodeJS.Timeout | undefined;
    const abort = new AbortController();
    let renewing = false;
    try {
      if (remaining <= 0) throw new ProviderFailure('analysis_timeout');
      if (job.provider === 'anthropic') {
        heartbeat = setInterval(() => {
          if (renewing || abort.signal.aborted) return;
          renewing = true;
          void this.db.analysisJob.updateMany({ where: { id: job.id, state: 'running', leaseToken: token }, data: { leaseUntil: new Date(Date.now() + 30000) } })
            .then(result => { if (!result.count) abort.abort(); }).catch(() => abort.abort()).finally(() => { renewing = false; });
        }, 10000);
        heartbeat.unref();
      }
      const authorize = async (tx?: Prisma.TransactionClient) => {
        const check = async (transaction: Prisma.TransactionClient) => {
          await this.review.require(transaction, job.accountId, job.homeId, true);
          await this.review.sources(transaction, job.accountId, job.homeId, job.documents as unknown as Snapshot[]);
          if (job.assetId) { await this.review.asset(transaction, job.accountId, job.homeId, job.assetId); await this.review.assetSources(transaction, job.accountId, job.homeId, job.assetId); }
        };
        if (tx) await check(tx); else await this.db.$transaction(check);
      };
      const proposed = await Promise.race([
        this.review.inputs(job).then(inputs => {
          if (job.provider !== 'anthropic') return this.provider.analyze(inputs);
          if (!this.ai || !job.consentToProviderTransfer) throw new ProviderFailure('ai_provider_unconfigured');
          return this.ai.analyze(job, inputs, abort.signal, authorize, token);
        }),
        new Promise<never>((_, reject) => { deadline = setTimeout(() => { abort.abort(); reject(new ProviderFailure('analysis_timeout')); }, remaining); deadline.unref(); }),
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
      abort.abort();
      if (job.provider === 'anthropic') await this.budget?.fail(job.id);
      const status = (error as { getStatus?: () => number }).getStatus?.();
      const configuredCode = (error as { getResponse?: () => { code?: string } }).getResponse?.().code;
      const code = error instanceof ProviderFailure ? error.code : configuredCode && messages[configuredCode] ? configuredCode : status === 403 ? 'access_revoked' : status === 503 ? 'storage_unavailable' : 'analysis_unavailable';
      await this.db.analysisJob.updateMany({ where: { id: job.id, state: 'running', leaseToken: token }, data: { state: 'failed', finishedAt: new Date(), leaseUntil: null, leaseToken: null, error: { code, message: messages[code] ?? messages.analysis_unavailable } } });
    } finally { if (deadline) clearTimeout(deadline); if (heartbeat) clearInterval(heartbeat); }
  }
}
