// INTEGRAZIONE REALE review-v1 (M3) — contro il backend V5 di Codex, nessun mock.
// Saltata finché gli endpoint M3 non esistono. Per eseguirla:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 V5_REVIEW_API=1 npm run test:integration
// Carica via M2 i tre PDF sintetici di public/m3-examples (byte del manifest) su account e
// case nuove a ogni esecuzione: solo database/storage di sviluppo V5. Nessuna AI reale.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';
import type { AnalysisJob } from '../../src/api/types';

const BASE = process.env.V5_API_URL;
const ENABLED = !!BASE && process.env.V5_REVIEW_API === '1';
const ORIGIN = process.env.V5_ORIGIN ?? 'http://127.0.0.1:5174';
const EXAMPLES = join(import.meta.dirname, '..', '..', 'public', 'm3-examples');

function clientWithJar() {
  const jar = new Map<string, string>();
  const fetchWithJar: FetchLike = async (input, init) => {
    const headers = new Headers(init.headers);
    headers.set('Origin', ORIGIN);
    if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
    const res = await fetch(input, { ...init, headers });
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(';');
      const eq = pair!.indexOf('=');
      const name = pair!.slice(0, eq).trim();
      const value = pair!.slice(eq + 1).trim();
      if (attrs.some((a) => /max-age=0/i.test(a)) || value === '') jar.delete(name);
      else jar.set(name, value);
    }
    return res;
  };
  return new ApiClient({ fetch: fetchWithJar, base: BASE });
}

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function setup(tag: string) {
  const api = clientWithJar();
  await api.getSession();
  const { account } = await api.register({ name: 'Prova M3', email: `m3-${tag}@example.test`, password: 'password-prova-m3-123' });
  await api.getSession();
  const home = await api.createHome({ name: 'Casa M3', address: 'Via Prova 3' }, crypto.randomUUID(), account.id);
  const upload = (file: string) =>
    api.uploadDocument(
      home.id,
      { file: new File([readFileSync(join(EXAMPLES, file))], file, { type: 'application/pdf' }), name: file, visibility: 'private' },
      crypto.randomUUID(),
      account.id,
    );
  return { api, account, home, upload };
}

async function waitJob(api: ApiClient, homeId: string, jobId: string, accountId: string): Promise<AnalysisJob> {
  for (let i = 0; i < 60; i++) {
    const job = await api.getAnalysisJob(homeId, jobId, undefined, accountId);
    if (job.state === 'succeeded' || job.state === 'failed') return job;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('job non concluso entro 60 s');
}

describe.skipIf(!ENABLED)('[integrazione reale] review-v1', () => {
  it('A+B: proposte con fonti, conferma della sola marca, keep_distinct con nota, storia', async () => {
    const { api, account, home, upload } = await setup(unique());
    const caps = await api.getAnalysisCapabilities(home.id, undefined, account.id);
    expect(caps).toMatchObject({ provider: 'test_fixture_v1', isSimulation: true });
    const a = await upload('libretto-caldaia-demo.pdf');
    const b = await upload('scheda-tecnica-caldaia-demo.pdf');
    const started = await api.createAnalysisJob(home.id, { documentIds: [a.id, b.id] }, crypto.randomUUID(), account.id);
    const job = await waitJob(api, home.id, started.id, account.id);
    expect(job.state).toBe('succeeded');
    const asset = await api.getAsset(home.id, job.assetId!, undefined, account.id);
    expect(asset.state).toBe('provisional');
    const brand = asset.proposals.find((p) => p.fieldKey === 'brand')!;
    const power = asset.proposals.find((p) => p.fieldKey === 'power')!;
    expect(power.kind).toBe('quantity_interpretation');
    expect(brand.candidates[0]!.sources.map((s) => s.documentId).sort()).toEqual([a.id, b.id].sort());

    const r1 = await api.confirm(home.id, asset.id, { expectedVersion: asset.version, decisions: [{ proposalId: brand.id, action: 'accept', candidateId: brand.candidates[0]!.id }] }, crypto.randomUUID(), account.id);
    expect(r1.resolvedProposalIds).toEqual([brand.id]);
    expect(r1.remainingOpenCount).toBe(2);

    const r2 = await api.confirm(
      home.id,
      asset.id,
      {
        expectedVersion: r1.asset.version,
        decisions: [{ proposalId: power.id, action: 'resolve_power', mode: 'keep_distinct', note: 'Grandezze diverse', measurements: power.candidates.map((c) => ({ ...c.measurement!, candidateId: c.id })) }],
      },
      crypto.randomUUID(),
      account.id,
    );
    const confirmedPower = r2.asset.confirmedFields.find((f) => f.fieldKey === 'power')!;
    expect(confirmedPower.value.kind === 'power' && confirmedPower.value.measurements.map((m) => `${m.value} ${m.quantityCode}`).sort()).toEqual(['24 useful_heating', '28 reported_nominal']);
    const history = await api.listHistory(home.id, asset.id, {}, undefined, account.id);
    expect(history.items.length).toBeGreaterThanOrEqual(3);
    const review = await api.listReview(home.id, {}, undefined, account.id);
    expect(review.openCount).toBe(1);
  });

  it('PDF non riconosciuto: job failed provider_fixture_unsupported, nessuna scheda; retry crea un nuovo job', async () => {
    const { api, account, home } = await setup(unique());
    const sourcePdf = readFileSync(join(EXAMPLES, 'libretto-caldaia-demo.pdf'));
    const eof = sourcePdf.lastIndexOf('%%EOF');
    const unknownPdf = Buffer.concat([sourcePdf.subarray(0, eof), Buffer.from('% Documento sintetico di test non presente nel manifest\n'), sourcePdf.subarray(eof)]);
    const other = await api.uploadDocument(
      home.id,
      { file: new File([unknownPdf], 'altro.pdf', { type: 'application/pdf' }), name: 'Altro', visibility: 'private' },
      crypto.randomUUID(),
      account.id,
    );
    const started = await api.createAnalysisJob(home.id, { documentIds: [other.id] }, crypto.randomUUID(), account.id);
    const job = await waitJob(api, home.id, started.id, account.id);
    expect(job.state).toBe('failed');
    expect(job.error?.code).toBe('provider_fixture_unsupported');
    expect((await api.listAssets(home.id, {}, undefined, account.id)).items).toEqual([]);
    const retried = await api.retryAnalysisJob(home.id, job.id, crypto.randomUUID(), account.id);
    expect(retried.parentJobId).toBe(job.id);
  });

  it('A+C: conflitto sulla stessa grandezza; keep_distinct rifiutato, choose_one con nota accettato', async () => {
    const { api, account, home, upload } = await setup(unique());
    const a = await upload('libretto-caldaia-demo.pdf');
    const c = await upload('rapporto-caldaia-demo-conflitto.pdf');
    const started = await api.createAnalysisJob(home.id, { documentIds: [a.id, c.id] }, crypto.randomUUID(), account.id);
    const job = await waitJob(api, home.id, started.id, account.id);
    const asset = await api.getAsset(home.id, job.assetId!, undefined, account.id);
    const power = asset.proposals.find((p) => p.fieldKey === 'power')!;
    expect(power.kind).toBe('value_conflict');
    await expect(
      api.confirm(home.id, asset.id, { expectedVersion: asset.version, decisions: [{ proposalId: power.id, action: 'resolve_power', mode: 'keep_distinct', note: 'x', measurements: power.candidates.map((x) => ({ ...x.measurement!, candidateId: x.id })) }] }, crypto.randomUUID(), account.id),
    ).rejects.toMatchObject({ status: 422 });
    const chosen = power.candidates.find((x) => x.value === '28')!;
    const res = await api.confirm(home.id, asset.id, { expectedVersion: asset.version, decisions: [{ proposalId: power.id, action: 'resolve_power', mode: 'choose_one', note: 'Rapporto più recente', measurements: [{ ...chosen.measurement!, candidateId: chosen.id }] }] }, crypto.randomUUID(), account.id);
    expect(res.resolvedProposalIds).toEqual([power.id]);
  });
});
