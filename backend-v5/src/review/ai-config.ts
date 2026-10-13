import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
export const RESERVE_MICRO_USD = 250000;
export const usd = (micro: number) => (micro / 1000000).toFixed(6);
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
};
export const aiUnavailable = (code: string) => new ServiceUnavailableException({ code, message: code === 'ai_provider_unconfigured' ? 'Configura Anthropic sul server locale.' : 'Analisi Anthropic non disponibile in questo momento.' });
export const budgetExhausted = () => new HttpException({ code: 'ai_budget_exhausted', message: 'Limite del collaudo AI raggiunto. Nessuna nuova chiamata inviata.' }, 429);
export const evaluationLimitReached = () => new HttpException({ code: 'ai_evaluation_limit_reached', message: 'Le sei chiamate del collaudo iniziale sono state utilizzate. Il budget monetario residuo resta disponibile per una fase successiva.' }, 429);
@Injectable()
export class AiConfig {
  get model() { return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'; }
  get campaign() { return process.env.M4_CAMPAIGN_ID || 'm4-20261013'; }
  get enabled() { return process.env.M4_AI_ENABLED === 'true'; }
  get configured() { return !!process.env.ANTHROPIC_API_KEY?.trim(); }
  get limitMicroUsd() { const value = Number(process.env.M4_BUDGET_USD ?? 10); if (!Number.isFinite(value) || value <= 0) throw aiUnavailable('ai_provider_unconfigured'); return Math.min(10000000, Math.floor(value * 1000000)); }
  get maxCalls() { return 6; }
  require(model = this.model) {
    if (!this.configured) throw aiUnavailable('ai_provider_unconfigured');
    if (!this.enabled) throw aiUnavailable('ai_provider_disabled');
    if (!MODEL_PRICES[model]) throw aiUnavailable('ai_model_unavailable');
    return MODEL_PRICES[model];
  }
  headers() {
    if (!this.configured) throw aiUnavailable('ai_provider_unconfigured');
    return { 'x-api-key': process.env.ANTHROPIC_API_KEY!.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(process.env.ANTHROPIC_WORKSPACE_ID?.trim() ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID.trim() } : {}) };
  }
}
