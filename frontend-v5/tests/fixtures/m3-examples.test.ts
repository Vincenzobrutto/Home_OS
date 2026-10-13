// Integrità dei PDF di esempio M3 (public/m3-examples) e riconoscimento sui byte reali.
// Nessuna rete e nessun backend reale: verifica i file pubblicati e il backend simulato.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FakeBackend } from '../../src/test/fakeBackend';
import { FIXTURES } from '../../src/test/fakeReview';

const DIR = join(import.meta.dirname, '..', '..', 'public', 'm3-examples');
const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as {
  provider: string;
  isSimulation: boolean;
  fixtures: Array<{ filename: string; sha256: string; brand: { value: string }; model: { value: string }; power: { value: string; quantityCode: string; quantityLabel: string } }>;
};
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('PDF di esempio M3 (byte reali)', () => {
  it('i tre PDF pubblicati hanno esattamente gli hash del manifest', () => {
    expect(manifest.provider).toBe('test_fixture_v1');
    expect(manifest.isSimulation).toBe(true);
    for (const f of manifest.fixtures) {
      const bytes = readFileSync(join(DIR, f.filename));
      expect(sha(bytes), f.filename).toBe(f.sha256);
      expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    }
  });

  it('i dati del backend simulato coincidono con il manifest', () => {
    for (const f of manifest.fixtures) {
      const fx = FIXTURES[f.sha256];
      expect(fx, f.filename).toBeDefined();
      expect([fx!.filename, fx!.brand, fx!.model, fx!.power.value, fx!.power.quantityCode, fx!.power.quantityLabel]).toEqual([
        f.filename,
        f.brand.value,
        f.model.value,
        f.power.value,
        f.power.quantityCode,
        f.power.quantityLabel,
      ]);
    }
    expect(Object.keys(FIXTURES).sort()).toEqual(manifest.fixtures.map((f) => f.sha256).sort());
  });

  it('il backend simulato riconosce i byte reali del libretto e rifiuta un PDF qualsiasi', async () => {
    const backend = new FakeBackend();
    const account = backend.seedAccount('A', 'a@example.test', 'password-lunga-1');
    const home = backend.seedHome(account.id, 'Casa', 'Via 1');
    const real = await backend.seedDocument({
      homeId: home.id,
      uploaderId: account.id,
      name: 'Libretto',
      bytes: new Uint8Array(readFileSync(join(DIR, 'libretto-caldaia-demo.pdf'))),
    });
    const other = await backend.seedDocument({ homeId: home.id, uploaderId: account.id, name: 'Altro PDF' });
    const run = async (docId: string) => {
      const review = backend.review;
      const res = await review.handle(
        { method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body: { documentIds: [docId] } },
        account.id,
        home.id,
        'analysis-jobs',
      );
      const jobId = (res.body as { job: { id: string } }).job.id;
      for (let i = 0; i < 3; i++) await review.handle({ method: 'GET', path: '', headers: {}, body: undefined }, account.id, home.id, `analysis-jobs/${jobId}`);
      return review.jobs.get(jobId)!.job;
    };
    const ok = await run(real.id);
    expect(ok.state).toBe('succeeded');
    expect(ok.openReviewCount).toBe(3);
    const ko = await run(other.id);
    expect(ko.state).toBe('failed');
    expect(ko.error?.code).toBe('provider_fixture_unsupported');
    expect(ko.assetId).toBeNull();
  });
});
