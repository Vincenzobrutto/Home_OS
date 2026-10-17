import { expect, it, vi } from 'vitest';
import { newIdempotencyKey } from './queryKeys';
it('uses cryptographic UUID v4 on Wi-Fi HTTP where randomUUID is unavailable', () => {
  const crypto = globalThis.crypto;
  vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
  try {
    const values = Array.from({ length: 32 }, () => newIdempotencyKey());
    for (const id of values) expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    expect(new Set(values).size).toBe(values.length);
  } finally { vi.unstubAllGlobals(); }
});
