// INTEGRAZIONE REALE analysis-v2 (M4) — contro il backend V5 di Codex, nessun mock nel client.
// Due livelli, entrambi saltati per default e MAI eseguiti da npm test / build:
//   V5_API_URL=http://127.0.0.1:3001/api/v5 V5_ANALYSIS_V2=1 npm run test:integration
//     → contratto analysis-v2 senza chiamate Anthropic (capabilities, rifiuti prima del job, provider di test).
//   ... V5_ANALYSIS_V2=1 V5_ANTHROPIC_LIVE=1
//     → UNA analisi Anthropic reale (consuma budget del collaudo, massimo 10 USD complessivi):
//       solo PDF sintetici di public/m3-examples. Da lanciare soltanto da Codex, volutamente.
// Claude Code non esegue questa suite contro Anthropic e non accede alla chiave del backend.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../../src/api/client';
import type { AnalysisJob } from '../../src/api/types';

const BASE = process.env.V5_API_URL;
const ENABLED = !!BASE && process.env.V5_ANALYSIS_V2 === '1';
const LIVE = ENABLED && process.env.V5_ANTHROPIC_LIVE === '1';
const ORIGIN = process.env.V5_ORIGIN ?? 'http://127.0.0.1:5174';
const EXAMPLES = join(import.meta.dirname, '..', '..', 'public', 'm3-examples');
const M4_EXAMPLES = join(import.meta.dirname, '..', '..', '..', 'docs', 'v5', 'fixtures', 'm4');

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

async function setup() {
  const api = clientWithJar();
  await api.getSession();
  const { account } = await api.register({ name: 'Prova M4', email: `m4-${unique()}@example.test`, password: 'password-prova-m4-123' });
  await api.getSession();
  const home = await api.createHome({ name: 'Casa M4', address: 'Via Prova 4' }, crypto.randomUUID(), account.id);
  // Upload fallito = test fallito: nessun return anticipato che nasconda il caso.
  const upload = (file: string, directory = EXAMPLES) =>
    api.uploadDocument(
      home.id,
      { file: new File([readFileSync(join(directory, file))], file, { type: 'application/pdf' }), name: file, visibility: 'private' },
      crypto.randomUUID(),
      account.id,
    );
  return { api, account, home, upload };
}

async function waitJob(api: ApiClient, homeId: string, jobId: string, accountId: string): Promise<AnalysisJob> {
  for (let i = 0; i < 150; i++) {
    const job = await api.getAnalysisJob(homeId, jobId, undefined, accountId);
    if (job.state === 'succeeded' || job.state === 'failed') return job;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('job non concluso entro 150 s');
}

describe.skipIf(!ENABLED)('[integrazione reale] analysis-v2 senza chiamate Anthropic', () => {
  it('capabilities v2: provider elencati, limiti e budget del collaudo', async () => {
    const { api, account, home } = await setup();
    const caps = await api.getAnalysisCapabilities(home.id, undefined, account.id);
    expect(caps.apiVersion).toBe('analysis-v2');
    expect(caps.providers?.map((p) => p.id).sort()).toEqual(['anthropic', 'test_fixture_v1']);
    expect(caps.limits).toMatchObject({ maxTotalPages: 20, maxInputTokens: 50_000 });
    expect(caps.budget?.currency).toBe('USD');
    expect(Number(caps.budget?.limitUsd)).toBe(10);
    expect(JSON.stringify(caps)).not.toMatch(/sk-ant|api[_-]?key/i);
  });

  it('Anthropic senza consenso: rifiuto prima di creare il job, nessuna riserva', async () => {
    const { api, account, home, upload } = await setup();
    const doc = await upload('libretto-caldaia-demo.pdf');
    const before = await api.getAnalysisCapabilities(home.id, undefined, account.id);
    const error = await api
      .createAnalysisJob(home.id, { documentIds: [doc.id], provider: 'anthropic' }, crypto.randomUUID(), account.id)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: expect.any(String) });
    expect((error as { status: number }).status).toBeGreaterThanOrEqual(400);
    expect((await api.listAnalysisJobs(home.id, {}, undefined, account.id)).items).toEqual([]);
    const after = await api.getAnalysisCapabilities(home.id, undefined, account.id);
    expect(after.budget?.remainingUsd).toBe(before.budget?.remainingUsd);
  });

  it('provider di test esplicito: nessun trasferimento, nessun costo, provider persistito', async () => {
    const { api, account, home, upload } = await setup();
    const doc = await upload('libretto-caldaia-demo.pdf');
    const started = await api.createAnalysisJob(home.id, { documentIds: [doc.id], provider: 'test_fixture_v1' }, crypto.randomUUID(), account.id);
    const job = await waitJob(api, home.id, started.id, account.id);
    expect(job).toMatchObject({ state: 'succeeded', provider: 'test_fixture_v1', isSimulation: true, model: null, billing: null });
    const asset = await api.getAsset(home.id, job.assetId!, undefined, account.id);
    expect(asset.analysisProviders).toEqual(['test_fixture_v1']);
  });
});

describe.skipIf(!LIVE)('[integrazione reale LIVE] Anthropic — consuma budget del collaudo', () => {
  it('libretto sintetico A: proposte con fonti verificate, costo registrato e mai zero inventato', async () => {
    const { api, account, home, upload } = await setup();
    const doc = await upload('libretto-caldaia-demo.pdf');
    const started = await api.createAnalysisJob(
      home.id,
      { documentIds: [doc.id], provider: 'anthropic', consentToProviderTransfer: true },
      crypto.randomUUID(),
      account.id,
    );
    expect(started.billing?.state).toBe('reserved');
    const job = await waitJob(api, home.id, started.id, account.id);
    expect(job.provider).toBe('anthropic');
    expect(job.isSimulation).toBe(false);
    expect(job.billing).not.toBeNull();
    if (job.billing!.state === 'settled') expect(job.billing!.actualUsd).not.toBeNull();
    expect(job.state).toBe('succeeded');
    expect(job.assetId).not.toBeNull();
    if (job.assetId) {
      const asset = await api.getAsset(home.id, job.assetId, undefined, account.id);
      expect(asset.proposals.length).toBeGreaterThan(0);
      const original = await api.getDocument(home.id, doc.id, undefined, account.id);
      for (const p of asset.proposals) {
        expect(p.provider).toBe('anthropic');
        for (const c of p.candidates) for (const s of c.sources) expect(s).toMatchObject({ documentId: doc.id, documentSha256: original.sha256 });
      }
    }
  }, 180_000);
  it('PDF multipagina reale: pagina 2/3, nessuna conferma automatica, conferme esplicite chiudono inbox', async () => {
    const { api, account, home, upload } = await setup();
    const doc = await upload('caldaia-multipagina.pdf', M4_EXAMPLES);
    const started = await api.createAnalysisJob(home.id, { documentIds: [doc.id], provider: 'anthropic', consentToProviderTransfer: true }, crypto.randomUUID(), account.id);
    const job = await waitJob(api, home.id, started.id, account.id);
    expect(job.state).toBe('succeeded'); expect(job.outcome).toBe('proposals_created');
    let asset = await api.getAsset(home.id, job.assetId!, undefined, account.id);
    expect(asset.confirmedFields).toEqual([]); expect(asset.proposals).toHaveLength(3);
    for (const field of ['brand', 'model'] as const) {
      const proposal = asset.proposals.find(p => p.fieldKey === field && p.state === 'open')!;
      expect(proposal.candidates[0]!.sources[0]!.page).toBe(2);
      asset = (await api.confirm(home.id, asset.id, { expectedVersion: asset.version, decisions: [{ proposalId: proposal.id, action: 'accept', candidateId: proposal.candidates[0]!.id }] }, crypto.randomUUID(), account.id)).asset;
    }
    const power = asset.proposals.find(p => p.fieldKey === 'power' && p.state === 'open')!;
    expect(power.candidates.map(c => c.value).sort()).toEqual(['30', '34']);
    expect(power.candidates.every(c => c.sources[0]!.page === 3)).toBe(true);
    asset = (await api.confirm(home.id, asset.id, { expectedVersion: asset.version, decisions: [{ proposalId: power.id, action: 'resolve_power', mode: 'keep_distinct', note: 'Grandezza e fonti confrontate nel collaudo sintetico', measurements: power.candidates.map(c => ({ ...c.measurement!, candidateId: c.id })) }] }, crypto.randomUUID(), account.id)).asset;
    expect(asset.state).toBe('confirmed'); expect((await api.listReview(home.id, {}, undefined, account.id)).openCount).toBe(0);
    expect((await api.getAsset(home.id, asset.id, undefined, account.id)).confirmedFields).toHaveLength(3);
    expect(Number(job.billing?.actualUsd)).toBeGreaterThan(0);
  }, 180_000);
  it('Documento estraneo: esito vuoto dichiarato senza scheda inventata', async () => {
    const { api, account, home, upload } = await setup();
    const doc = await upload('documento-senza-dati-caldera.pdf', M4_EXAMPLES);
    const started = await api.createAnalysisJob(home.id, { documentIds: [doc.id], provider: 'anthropic', consentToProviderTransfer: true }, crypto.randomUUID(), account.id);
    const job = await waitJob(api, home.id, started.id, account.id);
    expect(job).toMatchObject({ state: 'succeeded', outcome: 'no_supported_data', assetId: null });
    expect((await api.listAssets(home.id, {}, undefined, account.id)).items).toEqual([]);
    expect(job.billing?.state).toBe('settled'); expect(Number(job.billing?.actualUsd)).toBeGreaterThan(0);
  }, 180_000);
  it('Scansione e PDF protetto: fallimenti espliciti prima di chiamare Anthropic, costo zero', async () => {
    const { api, account, home, upload } = await setup();
    for (const [filename, code] of [['caldaia-solo-immagine.pdf', 'pdf_text_unavailable'], ['caldaia-protetta.pdf', 'pdf_encrypted']]) {
      const doc = await upload(filename!, M4_EXAMPLES);
      const started = await api.createAnalysisJob(home.id, { documentIds: [doc.id], provider: 'anthropic', consentToProviderTransfer: true }, crypto.randomUUID(), account.id);
      const job = await waitJob(api, home.id, started.id, account.id);
      expect(job).toMatchObject({ state: 'failed', assetId: null, error: { code }, billing: { state: 'settled' } });
      expect(Number(job.billing?.actualUsd)).toBe(0);
    }
  }, 180_000);
});
