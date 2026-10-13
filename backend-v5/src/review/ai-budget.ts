import { Injectable } from '@nestjs/common';
import type { AiAttempt, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { AiConfig, RESERVE_MICRO_USD, budgetExhausted, evaluationLimitReached, usd } from './ai-config';
export function committedMicroUsd(attempt: AiAttempt) { return attempt.state === 'released' ? 0 : attempt.actualMicroUsd ?? attempt.reservedMicroUsd; }
export function billing(attempt?: AiAttempt | null) {
  if (!attempt) return null;
  return { currency: 'USD', maxReservedUsd: usd(attempt.reservedMicroUsd), actualUsd: attempt.actualMicroUsd === null ? null : usd(attempt.actualMicroUsd), state: attempt.state === 'uncertain' ? 'uncertain' : attempt.actualMicroUsd !== null || attempt.state === 'released' ? 'settled' : 'reserved' };
}
@Injectable()
export class AiBudget {
  constructor(private readonly db: PrismaService, private readonly config: AiConfig) {}
  async reserve(tx: Prisma.TransactionClient, jobId: string, model: string) {
    const price = this.config.require(model);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'ai-budget:' + this.config.campaign}, 0))::text AS locked`;
    await tx.aiCampaign.upsert({ where: { id: this.config.campaign }, create: { id: this.config.campaign, limitMicroUsd: this.config.limitMicroUsd, maxCalls: this.config.maxCalls }, update: {} });
    await tx.$queryRaw`SELECT id FROM "AiCampaign" WHERE id=${this.config.campaign} FOR UPDATE`;
    const campaign = await tx.aiCampaign.findUniqueOrThrow({ where: { id: this.config.campaign } });
    const attempts = await tx.aiAttempt.findMany({ where: { campaignId: campaign.id } });
    const used = attempts.reduce((sum, attempt) => sum + committedMicroUsd(attempt), 0);
    if (used + RESERVE_MICRO_USD > Math.min(campaign.limitMicroUsd, this.config.limitMicroUsd)) throw budgetExhausted();
    if (attempts.filter(a => a.state !== 'released').length >= Math.min(campaign.maxCalls, this.config.maxCalls)) throw evaluationLimitReached();
    return tx.aiAttempt.create({ data: { jobId, campaignId: campaign.id, model, promptVersion: 'boiler-text-v2', inputMicroUsdPerToken: price.input, outputMicroUsdPerToken: price.output, reservedMicroUsd: RESERVE_MICRO_USD } });
  }
  async snapshot() {
    const campaign = await this.db.aiCampaign.findUnique({ where: { id: this.config.campaign } });
    const limit = Math.min(campaign?.limitMicroUsd ?? this.config.limitMicroUsd, this.config.limitMicroUsd);
    const attempts = campaign ? await this.db.aiAttempt.findMany({ where: { campaignId: campaign.id } }) : [];
    const used = attempts.reduce((total, a) => total + committedMicroUsd(a), 0);
    const uncertain = attempts.filter(a => a.state === 'uncertain').reduce((total, a) => total + committedMicroUsd(a), 0);
    const callsRemaining = Math.max(0, Math.min(campaign?.maxCalls ?? this.config.maxCalls, this.config.maxCalls) - attempts.filter(a => a.state !== 'released').length);
    const disabledReason = limit - used < RESERVE_MICRO_USD ? 'ai_budget_exhausted' : callsRemaining === 0 ? 'ai_evaluation_limit_reached' : null;
    return { currency: 'USD', limitUsd: usd(limit), remainingUsd: usd(Math.max(0, limit - used)), uncertainUsd: usd(uncertain), available: disabledReason === null, disabledReason };
  }
  async fail(jobId: string) {
    // Any attempt already dispatched is conservatively retained, never refunded by retry/restart.
    await this.db.aiAttempt.updateMany({ where: { jobId, state: 'reserved' }, data: { state: 'released', actualMicroUsd: 0 } });
    await this.db.aiAttempt.updateMany({ where: { jobId, state: 'sending' }, data: { state: 'uncertain' } });
  }
}
