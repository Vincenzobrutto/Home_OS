import { Injectable } from '@nestjs/common';
import type { AnalysisJob, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { AiBudget } from './ai-budget';
import { AiConfig } from './ai-config';
import { AnthropicTransport, responseData, responseUsage, ProviderResponse } from './anthropic';
import { InputDocument, PdfTextExtractor } from './pdf-text';
import { ProviderFailure } from './provider';
import { validateEvidence } from './ai-evidence';
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class AiAnalysis {
  constructor(private readonly db: PrismaService, private readonly extractor: PdfTextExtractor, private readonly transport: AnthropicTransport, private readonly budget: AiBudget, private readonly config: AiConfig) {}
  async analyze(job: AnalysisJob, inputs: InputDocument[], signal: AbortSignal, authorize: (tx?: Prisma.TransactionClient) => Promise<void>, leaseToken: string) {
    const attempt = await this.db.aiAttempt.findUnique({ where: { jobId: job.id } });
    if (!attempt) throw new ProviderFailure('analysis_invalid_output');
    if (attempt.state === 'sending' || attempt.state === 'uncertain') throw new ProviderFailure('analysis_outcome_unknown');
    if (attempt.state === 'released') throw new ProviderFailure('analysis_invalid_output');
    const documents = await this.extractor.extract(inputs);
    if (signal.aborted) throw new ProviderFailure('analysis_timeout');
    if (attempt.response) return validateEvidence(responseData(attempt.response as unknown as ProviderResponse), documents);
    this.config.require(attempt.model);
    await authorize();
    const prepared = await this.transport.prepare(attempt.model, documents, signal);
    if (signal.aborted) throw new ProviderFailure('analysis_timeout');
    await authorize();
    const dispatch = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "AnalysisJob" WHERE id=${job.id} FOR UPDATE`;
      const current = await tx.analysisJob.findUniqueOrThrow({ where: { id: job.id } });
      if (current.state !== 'running' || current.leaseToken !== leaseToken || signal.aborted) return false;
      await authorize(tx);
      const claim = await tx.aiAttempt.updateMany({ where: { id: attempt.id, state: 'reserved' }, data: { state: 'sending', sentAt: new Date() } });
      return claim.count === 1;
    });
    if (!dispatch) throw new ProviderFailure('analysis_outcome_unknown');
    try {
      if (signal.aborted) throw new ProviderFailure('analysis_timeout');
      const response = await this.transport.send(prepared, signal);
      const usage = responseUsage(response, attempt.model);
      const cost = usage.input * attempt.inputMicroUsdPerToken + usage.output * attempt.outputMicroUsdPerToken;
      if (!Number.isSafeInteger(cost) || cost > 2147483647) throw new ProviderFailure('analysis_invalid_output');
      // Response and usage survive a crash between receipt and publication; no second Messages call is needed.
      const persisted = await this.db.aiAttempt.updateMany({ where: { id: attempt.id, state: { in: ['sending', 'uncertain'] } }, data: { response: json(response), responseAt: new Date(), inputTokens: usage.input, outputTokens: usage.output, actualMicroUsd: cost, providerRequestId: response.id, state: 'settled' } });
      if (!persisted.count) throw new ProviderFailure('analysis_outcome_unknown');
      return validateEvidence(responseData(response), documents);
    } catch (error) { await this.budget.fail(job.id); throw error; }
  }
}
