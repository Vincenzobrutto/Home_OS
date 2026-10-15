// REAL localhost API, paid provider must remain DISABLED. No Anthropic traffic.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';
import { isAmbiguousError } from '../../src/lib/economy';

const base = process.env.V5_API_URL;
const enabled = base === 'http://127.0.0.1:3001/api/v5' && process.env.V5_ECONOMY_CONSENT_API === '1';

describe.skipIf(!enabled)('[REAL API, paid disabled] economic consent contract', () => {
  it('same client transport: capabilities, missing consent 422, provider disabled 503, no ambiguous retry', async () => {
    const jar = new Map<string, string>();
    const withJar: FetchLike = async (url, init) => {
      const headers = new Headers(init.headers);
      headers.set('Origin', 'http://127.0.0.1:5174');
      if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
      const response = await fetch(url, { ...init, headers });
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(';');
        const at = pair!.indexOf('=');
        jar.set(pair!.slice(0, at), pair!.slice(at + 1));
      }
      return response;
    };
    const api = new ApiClient({ base, fetch: withJar });
    await api.getSession();
    const { account } = await api.register({ name: 'Economic consent synthetic', email: `economic-consent-${crypto.randomUUID()}@example.test`, password: 'synthetic-test-password-123' });
    await api.getSession();
    const home = await api.createHome({ name: 'Economic consent API test', address: 'Synthetic' }, crypto.randomUUID(), account.id);
    const capabilities = await api.getEconomyCapabilities(home.id, undefined, account.id);
    // Fail before any analysis POST if the environment unexpectedly enables a paid provider.
    expect(capabilities.analysis.providers.find(p => p.id === 'anthropic')).toMatchObject({ enabled: false, disabledReason: 'ai_provider_disabled' });
    const bytes = await readFile(new URL('../../../docs/v5/fixtures/s1/gas.pdf', import.meta.url));
    const document = await api.uploadDocument(home.id, { file: new File([bytes], 'gas.pdf', { type: 'application/pdf' }), name: 'Synthetic gas consent test', visibility: 'private' }, crypto.randomUUID(), account.id);
    await expect(api.startEconomicAnalysis(home.id, { documentId: document.id, provider: 'anthropic' }, crypto.randomUUID(), account.id)).rejects.toMatchObject({ status: 422, code: 'validation_error' });
    const error = await api.startEconomicAnalysis(home.id, { documentId: document.id, provider: 'anthropic', consentToProviderTransfer: true }, crypto.randomUUID(), account.id).then(() => null, (e: unknown) => e);
    expect(error).toMatchObject({ status: 503, code: 'ai_provider_disabled' });
    expect(isAmbiguousError(error)).toBe(false);
    const drafts = await api.listEconomicDrafts(home.id, 'all', {}, undefined, account.id);
    expect(drafts.items).toHaveLength(0);
  });
});
