import { type ApiClient } from './client';
import { serviceError } from './errors';
import type { BinaryPayload } from './types';

const sections = ['documents', 'objects', 'technicalAssets', 'rooms', 'positions', 'activities', 'expenses', 'works', 'links', 'history'];
const receiptSections = ['receiptFields', 'receiptComparisons'];
const row = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function exportPersonalHome(api: ApiClient, homeId: string, accountId: string): Promise<BinaryPayload> {
  const data = await api.callJson<unknown>(`/homes/${encodeURIComponent(homeId)}/personal-export`, { method: 'POST', body: {}, accountId });
  const root = row(data), scope = row(root.scope), content = row(root.data);
  if (root.format !== 'dimora-personal-home-export' || root.formatVersion !== 1 || scope.homeId !== homeId || scope.accountId !== accountId || row(root.account).id !== accountId || row(root.home).id !== homeId || typeof root.generatedAt !== 'string' || !Number.isFinite(Date.parse(root.generatedAt)) || !Array.isArray(root.limitations) || !root.limitations.every(value => typeof value === 'string') || sections.some(key => !Array.isArray(content[key])) || receiptSections.some(key => key in content && !Array.isArray(content[key])) || Object.keys(content).some(key => !sections.includes(key) && !receiptSections.includes(key))) throw serviceError(200);
  const text = JSON.stringify(data);
  if (new TextEncoder().encode(text).length > 10 * 1024 * 1024) throw serviceError(200);
  return { blob: new Blob([text], { type: 'application/json;charset=utf-8' }), filename: `dimora-casa-${homeId}-dati.json`, contentType: 'application/json' };
}
