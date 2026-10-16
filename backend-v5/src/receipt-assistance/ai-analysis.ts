import { Injectable } from '@nestjs/common';
import { Prisma, type ReceiptAnalysisJob } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { AnthropicTransport, responseUsage } from '../review/anthropic';
import type { InputDocument } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import type { ReceiptExtraction } from './domain';
import { ReceiptAiBudget, ReceiptAiConfig } from './ai-budget';
import { ReceiptAnthropicProvider } from './anthropic-provider';

type Authorized = <T>(action: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
@Injectable()
export class ReceiptAnthropicTransport extends AnthropicTransport {
  constructor(config: ReceiptAiConfig) { super(config); }
}
@Injectable()
export class ReceiptAiAnalysis {
  constructor(private readonly db: PrismaService, private readonly provider: ReceiptAnthropicProvider, private readonly transport: ReceiptAnthropicTransport, readonly budget: ReceiptAiBudget) {}
  async analyze(job: ReceiptAnalysisJob, input: InputDocument, today: string, signal: AbortSignal, authorize: Authorized): Promise<ReceiptExtraction> {
    const attempt = await this.db.receiptAiAttempt.findUnique({ where: { jobId: job.id } });
    if (!attempt || job.provider !== 'anthropic' || !job.consentToProviderTransfer) throw new ProviderFailure('ai_provider_disabled');
    const configured = () => {
      const settings = this.budget.requireSource(job.documentSha256);
      if (settings.campaign !== attempt.campaignId || settings.model !== attempt.model) throw new ProviderFailure('ai_provider_disabled');
    };
    configured();
    const check = () => authorize(async tx => {
      configured();
      await tx.$queryRaw`SELECT id FROM "ReceiptAnalysisJob" WHERE id=${job.id} FOR UPDATE`;
      const current = await tx.receiptAnalysisJob.findUniqueOrThrow({ where: { id: job.id } });
      if (signal.aborted || current.state !== 'running' || current.leaseToken !== job.leaseToken || !current.leaseUntil || current.leaseUntil.getTime() <= Date.now()) throw new ProviderFailure('analysis_timeout');
    });
    await check();
    if (attempt.output) return attempt.output as unknown as ReceiptExtraction;
    if (attempt.state !== 'reserved') throw new ProviderFailure('analysis_outcome_unknown');
    const prepared = await this.provider.prepare(input, attempt.model, signal, check);
    const dispatch = await authorize(async tx => {
      configured();
      await tx.$queryRaw`SELECT id FROM "ReceiptAnalysisJob" WHERE id=${job.id} FOR UPDATE`;
      const current = await tx.receiptAnalysisJob.findUniqueOrThrow({ where: { id: job.id } });
      if (signal.aborted || current.state !== 'running' || current.leaseToken !== job.leaseToken || !current.leaseUntil || current.leaseUntil.getTime() <= Date.now()) throw new ProviderFailure('analysis_timeout');
      return (await tx.receiptAiAttempt.updateMany({ where: { id: attempt.id, state: 'reserved' }, data: { state: 'sending', sentAt: new Date() } })).count === 1;
    });
    if (!dispatch) throw new ProviderFailure('analysis_outcome_unknown');
    try {
      if (signal.aborted) throw new ProviderFailure('analysis_timeout');
      const response = await this.transport.send(prepared.request, signal), usage = responseUsage(response, attempt.model);
      const cost = usage.input * attempt.inputMicroUsdPerToken + usage.output * attempt.outputMicroUsdPerToken;
      if (usage.input + prepared.request.max_tokens > 50000 || !Number.isSafeInteger(cost) || cost > attempt.reservedMicroUsd) throw new ProviderFailure('analysis_invalid_output');
      // Persist only billing before validation: no raw prompt or provider reply is stored.
      const settled = await this.db.receiptAiAttempt.updateMany({ where: { id: attempt.id, state: { in: ['sending', 'uncertain'] } }, data: { state: 'settled', responseAt: new Date(), providerRequestId: response.id, inputTokens: usage.input, outputTokens: usage.output, actualMicroUsd: cost } });
      if (!settled.count) throw new ProviderFailure('analysis_outcome_unknown');
      const output = this.provider.decode(response, prepared, today).output;
      await check();
      await this.db.receiptAiAttempt.updateMany({ where: { id: attempt.id, state: 'settled' }, data: { output: JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue } });
      return output;
    } catch (error) { await this.budget.fail(job.id); throw error; }
  }
}
