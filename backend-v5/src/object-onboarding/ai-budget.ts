import { HttpException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { ObjectOnboardingAttempt, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { MODEL_PRICES, RESERVE_MICRO_USD, usd, AiConfig } from '../review/ai-config';
import { OBJECT_ONBOARDING_PROMPT_VERSION } from './anthropic-provider';

export const onboardingAiUnavailable = (code: string) => new ServiceUnavailableException({ code, message: 'Analisi articoli non disponibile. Nessun nuovo invio avviato.' });
const limit = (code: string) => new HttpException({ code, message: code === 'ai_budget_exhausted' ? 'Budget delle analisi articoli raggiunto.' : 'Numero di analisi articoli autorizzate raggiunto.' }, 429);
export const onboardingCommitted = (attempt: Pick<ObjectOnboardingAttempt, 'state' | 'actualMicroUsd' | 'reservedMicroUsd'>) => attempt.state === 'released' ? 0 : attempt.actualMicroUsd ?? attempt.reservedMicroUsd;
export const onboardingBilling = (attempt: Pick<ObjectOnboardingAttempt, 'state' | 'actualMicroUsd' | 'reservedMicroUsd'> | null) => attempt ? { currency: 'USD', maxReservedUsd: usd(attempt.reservedMicroUsd), actualUsd: attempt.actualMicroUsd === null ? null : usd(attempt.actualMicroUsd), state: attempt.state === 'uncertain' ? 'uncertain' : attempt.actualMicroUsd !== null || attempt.state === 'released' ? 'settled' : 'reserved' } : null;

@Injectable()
export class OnboardingAiConfig extends AiConfig {
  get environment(): NodeJS.ProcessEnv { return process.env; }
  override get model() { return this.environment.ONBOARDING_AI_MODEL?.trim() ?? ''; }
  override get campaign() { return this.environment.ONBOARDING_AI_CAMPAIGN_ID?.trim() ?? ''; }
  override get enabled() { return this.environment.ONBOARDING_AI_ENABLED === 'true'; }
  override get configured() { return !!this.environment.ANTHROPIC_API_KEY?.trim(); }
  override get limitMicroUsd() { return this.settings().limitMicroUsd; }
  override get maxCalls() { return this.settings().maxCalls; }
  override require() { return this.settings().price; }
  authorizedHashes() {
    const values = (this.environment.ONBOARDING_AI_ALLOWED_SHA256 ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    return values.length > 0 && values.length <= 10 && values.every(value => /^[a-f0-9]{64}$/.test(value)) ? [...new Set(values)] : [];
  }
  authorizedScope() {
    if(this.environment.ONBOARDING_AI_SCOPE!=='home')return null;
    const accountId=this.environment.ONBOARDING_AI_ACCOUNT_ID??'',homeId=this.environment.ONBOARDING_AI_HOME_ID??'';
    const id=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    return id.test(accountId)&&id.test(homeId)?{accountId,homeId}:null;
  }
  authorizedHomeIds() {
    const scope=this.authorizedScope();if(!scope)return [];
    const extra=(this.environment.ONBOARDING_AI_ADDITIONAL_HOME_IDS??'').trim();
    const values=extra?extra.split(',').map(value=>value.trim()):[];
    if(values.length>9||values.some(value=>!(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i).test(value)))return [];
    return [...new Set([scope.homeId,...values])];
  }
  sourceAuthorized(hash: string, accountId?: string, homeId?: string) {
    if(this.environment.ONBOARDING_AI_SCOPE==='home'){const scope=this.authorizedScope();return !!scope&&scope.accountId===accountId&&!!homeId&&this.authorizedHomeIds().includes(homeId)&&/^[a-f0-9]{64}$/.test(hash);}
    if(this.environment.ONBOARDING_AI_ADDITIONAL_HOME_IDS?.trim())return false;
    return !this.environment.ONBOARDING_AI_SCOPE&&this.authorizedHashes().includes(hash);
  }
  settings() {
    if (!this.enabled) throw onboardingAiUnavailable('ai_provider_disabled');
    if (!this.configured) throw onboardingAiUnavailable('ai_provider_unconfigured');
    const price = MODEL_PRICES[this.model];
    if (!price || price.input * (50000 - 4096) + price.output * 4096 > RESERVE_MICRO_USD) throw onboardingAiUnavailable('ai_model_unavailable');
    const amount = this.environment.ONBOARDING_AI_BUDGET_USD ?? '', calls = this.environment.ONBOARDING_AI_MAX_CALLS ?? '';
    const scope=this.authorizedScope(),homeIds=this.authorizedHomeIds();
    if (!/^onboarding-[A-Za-z0-9_-]{1,80}$/.test(this.campaign) || !/^\d+(?:\.\d{1,6})?$/.test(amount) || !/^\d+$/.test(calls) || (this.environment.ONBOARDING_AI_SCOPE ? !scope||!homeIds.length : !this.authorizedHashes().length||!!this.environment.ONBOARDING_AI_ADDITIONAL_HOME_IDS?.trim())) throw onboardingAiUnavailable('ai_provider_unconfigured');
    const [whole, fraction = ''] = amount.split('.'), micro = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
    if (micro <= 0n || micro > 10000000n || Number(calls) < 1 || Number(calls) > 50) throw onboardingAiUnavailable('ai_provider_unconfigured');
    return { model: this.model, campaign: this.campaign, price, limitMicroUsd: Number(micro), maxCalls: Number(calls), scope, homeIds, allowedDocumentHashes: this.authorizedHashes() };
  }
  override headers() {
    this.settings();
    return { 'x-api-key': this.environment.ANTHROPIC_API_KEY!.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(this.environment.ANTHROPIC_WORKSPACE_ID?.trim() ? { 'anthropic-workspace-id': this.environment.ANTHROPIC_WORKSPACE_ID.trim() } : {}) };
  }
}
@Injectable()
export class OnboardingAiBudget {
  constructor(private readonly db: PrismaService, readonly config: OnboardingAiConfig) {}
  requireSource(hash: string, accountId?: string, homeId?: string) {
    const settings = this.config.settings();
    if (!this.config.sourceAuthorized(hash,accountId,homeId)) throw new UnprocessableEntityException({ code: 'onboarding_document_not_authorized', message: 'Questo documento non è autorizzato per le analisi articoli. Nessun documento inviato.' });
    return settings;
  }
  async reserve(tx: Prisma.TransactionClient, jobId: string, hash: string, accountId?: string, homeId?: string) {
    const settings = this.requireSource(hash,accountId,homeId);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'onboarding-ai-budget:' + settings.campaign},0))::text AS locked`;
    const campaign = await tx.objectOnboardingCampaign.upsert({ where: { id: settings.campaign }, create: { id: settings.campaign, limitMicroUsd: settings.limitMicroUsd, maxCalls: settings.maxCalls }, update: {} });
    const attempts = await tx.objectOnboardingAttempt.findMany({ where: { campaignId: campaign.id } });
    if (attempts.reduce((sum, attempt) => sum + onboardingCommitted(attempt), 0) + RESERVE_MICRO_USD > Math.min(campaign.limitMicroUsd, settings.limitMicroUsd)) throw limit('ai_budget_exhausted');
    if (attempts.filter(attempt => attempt.state !== 'released').length >= Math.min(campaign.maxCalls, settings.maxCalls)) throw limit('ai_evaluation_limit_reached');
    return tx.objectOnboardingAttempt.create({ data: { jobId, campaignId: campaign.id, model: settings.model, promptVersion: OBJECT_ONBOARDING_PROMPT_VERSION, inputMicroUsdPerToken: settings.price.input, outputMicroUsdPerToken: settings.price.output, reservedMicroUsd: RESERVE_MICRO_USD } });
  }
  async available(tx: Prisma.TransactionClient, hash: string, accountId?: string, homeId?: string): Promise<boolean> {
    return (await this.snapshot(tx,hash,accountId,homeId))?.available??false;
  }
  async snapshot(tx: Prisma.TransactionClient, hash: string, accountId?: string, homeId?: string) {
    try {
      const settings = this.requireSource(hash,accountId,homeId), campaign = await tx.objectOnboardingCampaign.findUnique({ where: { id: settings.campaign } });
      const attempts = await tx.objectOnboardingAttempt.findMany({ where: { campaignId: settings.campaign } });
      const limitMicroUsd=Math.min(campaign?.limitMicroUsd??settings.limitMicroUsd,settings.limitMicroUsd),maxCalls=Math.min(campaign?.maxCalls??settings.maxCalls,settings.maxCalls);
      const used=attempts.reduce((sum,attempt)=>sum+onboardingCommitted(attempt),0),callsUsed=attempts.filter(attempt=>attempt.state!=='released').length;
      const disabledReason=used+RESERVE_MICRO_USD>limitMicroUsd?'ai_budget_exhausted':callsUsed>=maxCalls?'ai_evaluation_limit_reached':null;
      return {currency:'USD',limitUsd:usd(limitMicroUsd),committedUsd:usd(used),remainingUsd:usd(Math.max(0,limitMicroUsd-used)),callsUsed,maxCalls,available:disabledReason===null,disabledReason};
    } catch (error) { if (error instanceof ServiceUnavailableException || error instanceof UnprocessableEntityException) return null; throw error; }
  }
  async fail(jobId: string) {
    await this.db.objectOnboardingAttempt.updateMany({ where: { jobId, state: 'reserved' }, data: { state: 'released', actualMicroUsd: 0 } });
    await this.db.objectOnboardingAttempt.updateMany({ where: { jobId, state: 'sending' }, data: { state: 'uncertain' } });
  }
}
