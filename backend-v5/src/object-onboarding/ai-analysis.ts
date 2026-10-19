import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type ObjectOnboardingJob } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { AnthropicTransport, responseUsage } from '../review/anthropic';
import type { InputDocument } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { ProductEvidenceFailure, type ProductExtraction } from './domain';
import { OnboardingAiBudget, OnboardingAiConfig } from './ai-budget';
import { ObjectOnboardingAnthropicProvider } from './anthropic-provider';

type Authorized = <T>(action: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
@Injectable()
export class ObjectOnboardingAnthropicTransport extends AnthropicTransport {
  private readonly logger = new Logger(ObjectOnboardingAnthropicTransport.name);
  constructor(config: OnboardingAiConfig) { super(config); }
  protected override onHttpFailure(diagnostic: { status: number; endpoint: string; requestId: string | null }) {
    this.logger.warn(JSON.stringify({ event: 'onboarding_provider_http_failure', ...diagnostic }));
    if(diagnostic.status===400)throw new ProviderFailure('provider_request_rejected');
  }
}
@Injectable()
export class OnboardingAiAnalysis {
  private readonly logger = new Logger(OnboardingAiAnalysis.name);
  constructor(private readonly db: PrismaService, private readonly provider: ObjectOnboardingAnthropicProvider, private readonly transport: ObjectOnboardingAnthropicTransport, readonly budget: OnboardingAiBudget) {}
  async analyze(job: ObjectOnboardingJob, input: InputDocument & { mimeType: string }, signal: AbortSignal, authorize: Authorized): Promise<ProductExtraction> {
    const attempt = await this.db.objectOnboardingAttempt.findUnique({ where: { jobId: job.id } });
    if (!attempt || job.provider !== 'anthropic' || !job.consentToProviderTransfer) throw new ProviderFailure('ai_provider_disabled');
    const configured = () => {
      const settings = this.budget.requireSource(job.documentSha256,job.accountId,job.homeId);
      if (settings.campaign !== attempt.campaignId || settings.model !== attempt.model) throw new ProviderFailure('ai_provider_disabled');
    };
    configured();
    const check = () => authorize(async tx => {
      configured();
      await tx.$queryRaw`SELECT id FROM "ObjectOnboardingJob" WHERE id=${job.id} FOR UPDATE`;
      const current = await tx.objectOnboardingJob.findUniqueOrThrow({ where: { id: job.id } });
      if (signal.aborted || current.state !== 'running' || current.leaseToken !== job.leaseToken || !current.leaseUntil || current.leaseUntil.getTime() <= Date.now()) throw new ProviderFailure('analysis_timeout');
    });
    await check();
    if (attempt.output) return attempt.output as unknown as ProductExtraction;
    if (attempt.state !== 'reserved') throw new ProviderFailure('analysis_outcome_unknown');
    const prepared = await this.provider.prepare(input, attempt.model, signal, check, job.purpose);
    const dispatch = await authorize(async tx => {
      configured();
      await tx.$queryRaw`SELECT id FROM "ObjectOnboardingJob" WHERE id=${job.id} FOR UPDATE`;
      const current = await tx.objectOnboardingJob.findUniqueOrThrow({ where: { id: job.id } });
      if (signal.aborted || current.state !== 'running' || current.leaseToken !== job.leaseToken || !current.leaseUntil || current.leaseUntil.getTime() <= Date.now()) throw new ProviderFailure('analysis_timeout');
      return (await tx.objectOnboardingAttempt.updateMany({ where: { id: attempt.id, state: 'reserved' }, data: { state: 'sending', sentAt: new Date() } })).count === 1;
    });
    if (!dispatch) throw new ProviderFailure('analysis_outcome_unknown');
    try {
      if (signal.aborted) throw new ProviderFailure('analysis_timeout');
      const response = await this.transport.send(prepared.request, signal), usage = responseUsage(response, attempt.model);
      const cost = usage.input * attempt.inputMicroUsdPerToken + usage.output * attempt.outputMicroUsdPerToken;
      if (usage.input + prepared.request.max_tokens > 50000 || !Number.isSafeInteger(cost) || cost > attempt.reservedMicroUsd) throw new ProviderFailure('analysis_invalid_output');
      // Persist only billing before validation: no raw prompt or provider reply is stored.
      const settled = await this.db.objectOnboardingAttempt.updateMany({ where: { id: attempt.id, state: { in: ['sending', 'uncertain'] } }, data: { state: 'settled', responseAt: new Date(), providerRequestId: response.id, inputTokens: usage.input, outputTokens: usage.output, actualMicroUsd: cost } });
      if (!settled.count) throw new ProviderFailure('analysis_outcome_unknown');
      const output = this.provider.decode(response, prepared).output;
      await check();
      await this.db.objectOnboardingAttempt.updateMany({ where: { id: attempt.id, state: 'settled' }, data: { output: JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue } });
      return output;
    } catch (error) { if(error instanceof ProductEvidenceFailure)this.logger.warn(JSON.stringify({event:'onboarding_evidence_rejected',field:error.field,reason:error.reason})); await this.budget.fail(job.id); throw error; }
  }
}
