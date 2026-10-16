import { HttpException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { ReceiptAiAttempt, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { MODEL_PRICES, RESERVE_MICRO_USD, usd, AiConfig } from '../review/ai-config';
import { RECEIPT_PROMPT_VERSION } from './anthropic-provider';

export const receiptAiUnavailable = (code: string) => new ServiceUnavailableException({ code, message: 'Analisi ricevuta non disponibile. Nessun nuovo invio avviato.' });
const limit = (code: string) => new HttpException({ code, message: code === 'ai_budget_exhausted' ? 'Budget delle analisi ricevuta raggiunto.' : 'Numero di analisi ricevuta autorizzate raggiunto.' }, 429);
export const receiptCommitted = (attempt: Pick<ReceiptAiAttempt, 'state' | 'actualMicroUsd' | 'reservedMicroUsd'>) => attempt.state === 'released' ? 0 : attempt.actualMicroUsd ?? attempt.reservedMicroUsd;
export const receiptBilling = (attempt: Pick<ReceiptAiAttempt, 'state' | 'actualMicroUsd' | 'reservedMicroUsd'> | null) => attempt ? { currency: 'USD', maxReservedUsd: usd(attempt.reservedMicroUsd), actualUsd: attempt.actualMicroUsd === null ? null : usd(attempt.actualMicroUsd), state: attempt.state === 'uncertain' ? 'uncertain' : attempt.actualMicroUsd !== null || attempt.state === 'released' ? 'settled' : 'reserved' } : null;

@Injectable()
export class ReceiptAiConfig extends AiConfig {
  get environment(): NodeJS.ProcessEnv { return process.env; }
  override get model() { return this.environment.RECEIPT_AI_MODEL?.trim() ?? ''; }
  override get campaign() { return this.environment.RECEIPT_AI_CAMPAIGN_ID?.trim() ?? ''; }
  override get enabled() { return this.environment.RECEIPT_AI_ENABLED === 'true'; }
  override get configured() { return !!this.environment.ANTHROPIC_API_KEY?.trim(); }
  override get limitMicroUsd() { return this.settings().limitMicroUsd; }
  override get maxCalls() { return this.settings().maxCalls; }
  override require() { return this.settings().price; }
  authorizedHashes() {
    const values = (this.environment.RECEIPT_AI_ALLOWED_SHA256 ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    return values.length > 0 && values.length <= 10 && values.every(value => /^[a-f0-9]{64}$/.test(value)) ? [...new Set(values)] : [];
  }
  sourceAuthorized(hash: string) { return this.authorizedHashes().includes(hash); }
  settings() {
    if (!this.enabled) throw receiptAiUnavailable('ai_provider_disabled');
    if (!this.configured) throw receiptAiUnavailable('ai_provider_unconfigured');
    const price = MODEL_PRICES[this.model];
    if (!price || price.input * (50000 - 4096) + price.output * 4096 > RESERVE_MICRO_USD) throw receiptAiUnavailable('ai_model_unavailable');
    const amount = this.environment.RECEIPT_AI_BUDGET_USD ?? '', calls = this.environment.RECEIPT_AI_MAX_CALLS ?? '';
    if (!/^receipt-[A-Za-z0-9_-]{1,80}$/.test(this.campaign) || !/^\d+(?:\.\d{1,6})?$/.test(amount) || !/^\d+$/.test(calls) || !this.authorizedHashes().length) throw receiptAiUnavailable('ai_provider_unconfigured');
    const [whole, fraction = ''] = amount.split('.'), micro = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
    if (micro <= 0n || micro > 10000000n || Number(calls) < 1 || Number(calls) > 50) throw receiptAiUnavailable('ai_provider_unconfigured');
    return { model: this.model, campaign: this.campaign, price, limitMicroUsd: Number(micro), maxCalls: Number(calls), allowedDocumentHashes: this.authorizedHashes() };
  }
  override headers() {
    this.settings();
    return { 'x-api-key': this.environment.ANTHROPIC_API_KEY!.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(this.environment.ANTHROPIC_WORKSPACE_ID?.trim() ? { 'anthropic-workspace-id': this.environment.ANTHROPIC_WORKSPACE_ID.trim() } : {}) };
  }
}
@Injectable()
export class ReceiptAiBudget {
  constructor(private readonly db: PrismaService, readonly config: ReceiptAiConfig) {}
  requireSource(hash: string) {
    const settings = this.config.settings();
    if (!settings.allowedDocumentHashes.includes(hash)) throw new UnprocessableEntityException({ code: 'receipt_document_not_authorized', message: 'Questo documento non è autorizzato per il collaudo ricevute. Nessun testo inviato.' });
    return settings;
  }
  async reserve(tx: Prisma.TransactionClient, jobId: string, hash: string) {
    const settings = this.requireSource(hash);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'receipt-ai-budget:' + settings.campaign},0))::text AS locked`;
    const campaign = await tx.receiptAiCampaign.upsert({ where: { id: settings.campaign }, create: { id: settings.campaign, limitMicroUsd: settings.limitMicroUsd, maxCalls: settings.maxCalls }, update: {} });
    const attempts = await tx.receiptAiAttempt.findMany({ where: { campaignId: campaign.id } });
    if (attempts.reduce((sum, attempt) => sum + receiptCommitted(attempt), 0) + RESERVE_MICRO_USD > Math.min(campaign.limitMicroUsd, settings.limitMicroUsd)) throw limit('ai_budget_exhausted');
    if (attempts.filter(attempt => attempt.state !== 'released').length >= Math.min(campaign.maxCalls, settings.maxCalls)) throw limit('ai_evaluation_limit_reached');
    return tx.receiptAiAttempt.create({ data: { jobId, campaignId: campaign.id, model: settings.model, promptVersion: RECEIPT_PROMPT_VERSION, inputMicroUsdPerToken: settings.price.input, outputMicroUsdPerToken: settings.price.output, reservedMicroUsd: RESERVE_MICRO_USD } });
  }
  async available(tx: Prisma.TransactionClient, hash: string): Promise<boolean> {
    try {
      const settings = this.requireSource(hash), campaign = await tx.receiptAiCampaign.findUnique({ where: { id: settings.campaign } });
      const attempts = await tx.receiptAiAttempt.findMany({ where: { campaignId: settings.campaign } });
      return attempts.reduce((sum, attempt) => sum + receiptCommitted(attempt), 0) + RESERVE_MICRO_USD <= Math.min(campaign?.limitMicroUsd ?? settings.limitMicroUsd, settings.limitMicroUsd) && attempts.filter(attempt => attempt.state !== 'released').length < Math.min(campaign?.maxCalls ?? settings.maxCalls, settings.maxCalls);
    } catch (error) { if (error instanceof ServiceUnavailableException || error instanceof UnprocessableEntityException) return false; throw error; }
  }
  async fail(jobId: string) {
    await this.db.receiptAiAttempt.updateMany({ where: { jobId, state: 'reserved' }, data: { state: 'released', actualMicroUsd: 0 } });
    await this.db.receiptAiAttempt.updateMany({ where: { jobId, state: 'sending' }, data: { state: 'uncertain' } });
  }
}
