// BACKEND SIMULATO review-v1 (M3) — SOLO TEST E HARNESS LOCALE, NON È IL BACKEND REALE.
// Riconosce soltanto gli hash dei tre PDF sintetici (manifest M3); qualsiasi altro
// documento produce un job failed provider_fixture_unsupported, senza valori inventati.
// Sintassi "erasable": eseguito anche da Node in scripts/mock-api.ts.

import type {
  AnalysisJob,
  BoilerDetail,
  Candidate,
  ConfirmedField,
  Decision,
  FieldKey,
  FieldValue,
  HistoryEvent,
  HomePermission,
  ManualField,
  Measurement,
  ProposedField,
  ProviderId,
  QuantityCode,
  SourceRef,
} from '../api/types';

type Req = {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: unknown;
};
type Res = { status: number; body?: unknown };

/** Dati effettivi dei tre PDF di esempio (docs/v5/fixtures/m3/manifest.json). */
export const FIXTURES: Record<
  string,
  { id: string; filename: string; brand: string; model: string; power: Measurement; powerExcerpt: string }
> = {
  '824b6de359f70aa8c635c8cf91010e1352938031d3a6276867b78e63c23046fe': {
    id: 'boiler_booklet_v1',
    filename: 'libretto-caldaia-demo.pdf',
    brand: 'Termica Demo',
    model: 'TD-24',
    power: { value: '24', unit: 'kW', quantityCode: 'useful_heating', quantityLabel: 'Potenza utile al riscaldamento' },
    powerExcerpt: 'Potenza utile al riscaldamento: 24 kW',
  },
  da6b734094d37b6a07d7b58f381dde1d0259f7899c307183d163b40cb48bee90: {
    id: 'boiler_datasheet_v1',
    filename: 'scheda-tecnica-caldaia-demo.pdf',
    brand: 'Termica Demo',
    model: 'TD-24',
    power: { value: '28', unit: 'kW', quantityCode: 'reported_nominal', quantityLabel: 'Potenza nominale riportata' },
    powerExcerpt: 'Potenza nominale riportata: 28 kW',
  },
  e313f78f7b02d6802f0a795c2a395867a2873f48963bb053a9b54d525ecdcf92: {
    id: 'boiler_conflict_v1',
    filename: 'rapporto-caldaia-demo-conflitto.pdf',
    brand: 'Termica Demo',
    model: 'TD-24',
    power: { value: '28', unit: 'kW', quantityCode: 'useful_heating', quantityLabel: 'Potenza utile al riscaldamento' },
    powerExcerpt: 'Potenza utile al riscaldamento: 28 kW',
  },
};

/** Vista minima dei documenti M2 che il backend simulato principale espone. */
export type DocAccess = {
  find(homeId: string, accountId: string, documentId: string): { id: string; sha256: string; mimeType: string } | null;
  perms(accountId: string, homeId: string): HomePermission[] | null;
};

type StoredJob = { job: AnalysisJob; accountId: string; targetAssetId: string | null };

/** Dato proposto con fonte: dalle fixture (pagina 1) o da una risposta Anthropic simulata. */
type Claim = {
  field: FieldKey;
  value: string;
  documentIndex: number;
  page: number;
  excerpt: string;
  measurement?: Measurement;
  doc: { id: string; sha256: string };
};

/** Esito scriptato dal test per il prossimo job Anthropic: nessuna chiamata reale. */
export type AiOutcome =
  | { kind: 'claims'; claims: Array<Omit<Claim, 'doc'>>; costUsd?: string }
  | { kind: 'no_data'; costUsd?: string }
  | { kind: 'fail'; code: string; message?: string; costUsd: string }
  | { kind: 'uncertain' };

const RESERVE_MICRO = 250_000;
const microToUsd = (micro: number) => (micro / 1_000_000).toFixed(micro % 10_000 === 0 ? 2 : 6).replace(/(\.\d{2}\d*?)0+$/, '$1');
const usdToMicro = (usd: string) => Math.round(Number(usd) * 1_000_000);
type StoredAsset = {
  id: string;
  homeId: string;
  accountId: string;
  name: string;
  version: number;
  createdAt: string;
  proposals: Array<ProposedField & { fingerprint: string; createdAt: string }>;
  confirmed: Partial<Record<FieldKey, ConfirmedField>>;
  history: HistoryEvent[];
  resolved: Set<string>;
  providers: Set<ProviderId>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
const POWER_RE = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/;
const cp = (s: string) => [...s].length;
const uuid = () => globalThis.crypto.randomUUID();

function err(status: number, code: string, message: string, fieldErrors?: Record<string, string>): Res {
  return { status, body: { error: { code, message, fieldErrors, requestId: uuid() } } };
}

function normPower(v: string) {
  return String(Number(v));
}

function valueText(v: FieldValue | null | undefined) {
  if (!v) return '';
  if (v.kind === 'text') return v.text;
  return v.measurements
    .map((m) => `${m.value}|${m.quantityCode}|${m.quantityLabel}`)
    .sort()
    .join(';');
}

export class FakeReview {
  jobs = new Map<string, StoredJob>();
  assets = new Map<string, StoredAsset>();
  idem = new Map<string, { fingerprint: string; res: Res }>();
  /** 'auto': ogni GET fa avanzare il job; 'hold': resta in corso (prova del limite di polling). */
  jobMode: 'auto' | 'hold' = 'auto';
  /** Il prossimo job fallisce con questo codice (guasto iniettato nel harness, non dal client). */
  failNextJob: string | null = null;
  capabilitiesEnabled = true;
  /** Risposta capabilities nella forma M3 (senza providers/limits/budget). */
  legacyCapabilities = false;
  /** Anthropic simulato: nessuna chiave, nessuna rete. */
  anthropic = { configured: false, enabled: true, model: 'claude-sonnet-5-5' };
  /** Esiti dei prossimi job Anthropic, in ordine. */
  anthropicScript: AiOutcome[] = [];
  budgetRemainingMicro = 10_000_000;
  budgetUncertainMicro = 0;
  /** Numero di GET su ciascun job (per verificare lo stop del polling). */
  jobReads = new Map<string, number>();
  private clock = Date.parse('2026-10-13T12:00:00Z');
  private readonly docs: DocAccess;

  constructor(docs: DocAccess) {
    this.docs = docs;
  }

  private now() {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  async handle(req: Req, accountId: string, homeId: string, rest: string): Promise<Res> {
    const perms = this.docs.perms(accountId, homeId);
    if (!perms || !perms.includes('read')) return err(403, 'forbidden', 'Accesso non consentito.');
    const [path, query = ''] = rest.split('?');
    const parts = path!.split('/').filter(Boolean).map(decodeURIComponent);
    const isPost = req.method === 'POST';
    if (isPost && !perms.includes('edit')) return err(403, 'forbidden', 'Il tuo ruolo non consente questa operazione.');
    const params = new URLSearchParams(query);

    switch (parts[0]) {
      case 'analysis-capabilities':
        return this.capabilities();
      case 'analysis-jobs':
        if (parts.length === 1) return isPost ? this.createJob(req, accountId, homeId) : this.listJobs(params, accountId, homeId);
        if (!UUID_RE.test(parts[1]!)) return err(422, 'validation_error', 'Identificativo non valido.');
        if (parts.length === 2 && !isPost) return this.getJob(parts[1]!, accountId, homeId);
        if (parts[2] === 'retry' && isPost) return this.retryJob(req, parts[1]!, accountId, homeId);
        break;
      case 'assets':
        if (parts.length === 1) return isPost ? this.createAsset(req, accountId, homeId) : this.listAssets(params, accountId, homeId);
        if (!UUID_RE.test(parts[1]!)) return err(422, 'validation_error', 'Identificativo non valido.');
        if (parts.length === 2 && !isPost) {
          const a = this.ownAsset(parts[1]!, accountId, homeId);
          return a ? { status: 200, body: { asset: this.detail(a) } } : err(403, 'forbidden', 'Accesso non consentito.');
        }
        if (parts[2] === 'history' && !isPost) {
          const a = this.ownAsset(parts[1]!, accountId, homeId);
          return a ? this.paginate([...a.history].reverse(), params) : err(403, 'forbidden', 'Accesso non consentito.');
        }
        if (parts[2] === 'confirmations' && isPost) return this.confirm(req, parts[1]!, accountId, homeId, false);
        if (parts[2] === 'manual-confirmations' && isPost) return this.confirm(req, parts[1]!, accountId, homeId, true);
        break;
      case 'review':
        if (!isPost) return this.listReview(params, accountId, homeId);
        break;
    }
    return err(404, 'not_found', 'Risorsa non trovata.');
  }

  // ---- utilità ----

  private paginate<T>(items: T[], params: URLSearchParams, extra: Record<string, unknown> = {}): Res {
    const limit = params.has('limit') ? Number(params.get('limit')) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return err(422, 'validation_error', 'Limite non valido.');
    const cursor = params.get('cursor');
    const offset = cursor ? Number(cursor.replace(/^r/, '')) : 0;
    if (!Number.isInteger(offset) || offset < 0) return err(422, 'validation_error', 'Cursore non valido.');
    const page = items.slice(offset, offset + limit);
    return { status: 200, body: { items: page, nextCursor: offset + limit < items.length ? `r${offset + limit}` : null, ...extra } };
  }

  /** Idempotenza per account+casa+operazione+target: stessa chiave/body → stesso risultato. */
  private withIdem(req: Req, scope: string, run: () => Res): Res {
    const key = req.headers['idempotency-key'];
    if (!key || !KEY_RE.test(key)) return err(422, 'validation_error', 'Idempotency-Key non valida.');
    const scoped = `${scope}:${key}`;
    const fingerprint = JSON.stringify(req.body ?? {});
    const prev = this.idem.get(scoped);
    if (prev) {
      return prev.fingerprint === fingerprint
        ? prev.res
        : err(409, 'idempotency_conflict', 'Chiave di idempotenza già usata con dati diversi.');
    }
    const res = run();
    if (res.status < 400) this.idem.set(scoped, { fingerprint, res });
    return res;
  }

  private ownAsset(assetId: string, accountId: string, homeId: string) {
    const a = this.assets.get(assetId);
    return a && a.accountId === accountId && a.homeId === homeId ? a : null;
  }

  private openOf(a: StoredAsset) {
    return a.proposals.filter((p) => p.state === 'open');
  }

  private detail(a: StoredAsset): BoilerDetail {
    const confirmedFields = (['brand', 'model', 'power'] as FieldKey[])
      .map((k) => a.confirmed[k])
      .filter((f): f is ConfirmedField => !!f);
    const open = this.openOf(a).length;
    const state =
      confirmedFields.length === 0 ? 'provisional' : confirmedFields.length === 3 && open === 0 ? 'confirmed' : 'partially_confirmed';
    return {
      id: a.id,
      homeId: a.homeId,
      name: a.name,
      type: 'boiler',
      visibility: 'private',
      state,
      version: a.version,
      openReviewCount: open,
      confirmedFields,
      permissions: (this.docs.perms(a.accountId, a.homeId) ?? []).includes('edit') ? ['read', 'edit'] : ['read'],
      analysisProviders: [...a.providers],
      isSimulation: a.providers.size > 0 && [...a.providers].every((p) => p === 'test_fixture_v1'),
      proposals: a.proposals.map((p) => this.proposalView(a, p)),
    };
  }

  private proposalView(a: StoredAsset, p: StoredAsset['proposals'][number]): ProposedField {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fingerprint, createdAt, ...rest } = p;
    return { ...rest, currentConfirmed: a.confirmed[p.fieldKey] ?? null };
  }

  /** Solo test: scheda caldaia personale vuota (provvisoria). */
  seedBoiler(accountId: string, homeId: string, name: string) {
    return this.newAsset(accountId, homeId, name);
  }

  private newAsset(accountId: string, homeId: string, name: string): StoredAsset {
    const a: StoredAsset = {
      id: uuid(),
      homeId,
      accountId,
      name,
      version: 1,
      createdAt: this.now(),
      proposals: [],
      confirmed: {},
      history: [],
      resolved: new Set(),
      providers: new Set(),
    };
    this.assets.set(a.id, a);
    return a;
  }

  // ---- job ----

  private capabilities(): Res {
    const m3 = {
      provider: 'test_fixture_v1',
      isSimulation: true,
      enabled: this.capabilitiesEnabled,
      maxDocuments: 2,
      formats: ['application/pdf'],
    };
    if (this.legacyCapabilities) return { status: 200, body: m3 };
    const ai = this.anthropic;
    return {
      status: 200,
      body: {
        ...m3,
        apiVersion: 'analysis-v2',
        providers: [
          { id: 'test_fixture_v1', label: 'Analisi di test', isSimulation: true, enabled: this.capabilitiesEnabled, disabledReason: null, model: null },
          {
            id: 'anthropic',
            label: 'Anthropic',
            isSimulation: false,
            enabled: ai.configured && ai.enabled,
            disabledReason: !ai.configured ? 'chiave API non configurata sul server' : ai.enabled ? null : 'disattivato sul server',
            model: ai.configured ? ai.model : null,
          },
        ],
        limits: { maxFileBytes: 10 * 1024 * 1024, maxTotalPages: 20, maxExtractedCodePoints: 100_000, maxInputTokens: 50_000 },
        budget: { currency: 'USD', limitUsd: '10.00', remainingUsd: microToUsd(this.budgetRemainingMicro), uncertainUsd: microToUsd(this.budgetUncertainMicro) },
      },
    };
  }

  private createJob(req: Req, accountId: string, homeId: string): Res {
    const body = (req.body ?? {}) as { documentIds?: unknown; targetAssetId?: unknown; provider?: unknown; consentToProviderTransfer?: unknown };
    const ids = body.documentIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2 || new Set(ids).size !== ids.length || !ids.every((x) => typeof x === 'string' && UUID_RE.test(x))) {
      return err(422, 'validation_error', 'Scegli da 1 a 2 documenti distinti.', { documentIds: 'Da 1 a 2 documenti.' });
    }
    // Provider assente = comportamento M3 (fixture): non avvia mai Anthropic.
    const provider: ProviderId = body.provider === undefined ? 'test_fixture_v1' : (body.provider as ProviderId);
    if (provider !== 'test_fixture_v1' && provider !== 'anthropic') return err(422, 'validation_error', 'Provider non valido.');
    const target = typeof body.targetAssetId === 'string' ? body.targetAssetId : null;
    if (target && !this.ownAsset(target, accountId, homeId)) return err(403, 'forbidden', 'Accesso non consentito.');
    for (const id of ids as string[]) {
      if (!this.docs.find(homeId, accountId, id)) return err(403, 'forbidden', 'Accesso non consentito.');
    }
    if (provider === 'anthropic') {
      const blocked = this.anthropicGate(body.consentToProviderTransfer);
      if (blocked) return blocked;
    }
    return this.withIdem(req, `${accountId}:${homeId}:job:${target ?? '-'}`, () => {
      const job = this.makeJob(homeId, ids as string[], null, provider);
      this.jobs.set(job.id, { job, accountId, targetAssetId: target });
      return { status: 202, body: { job } };
    });
  }

  /** Controlli prima di creare un job Anthropic: configurazione, consenso, budget (riserva persistita). */
  private anthropicGate(consent: unknown): Res | null {
    if (!this.anthropic.configured) return err(503, 'ai_provider_unconfigured', 'Anthropic non è configurato sul server.');
    if (!this.anthropic.enabled) return err(503, 'ai_provider_disabled', 'Anthropic è disattivato sul server.');
    if (consent !== true) {
      return err(422, 'validation_error', 'Serve il consenso esplicito.', {
        consentToProviderTransfer: 'Per usare Anthropic devi autorizzare l’invio del testo dei documenti selezionati.',
      });
    }
    if (this.budgetRemainingMicro < RESERVE_MICRO) return err(429, 'ai_budget_exhausted', 'Budget del collaudo esaurito.');
    return null;
  }

  private makeJob(homeId: string, documentIds: string[], parentJobId: string | null, provider: ProviderId): AnalysisJob {
    const ai = provider === 'anthropic';
    if (ai) this.budgetRemainingMicro -= RESERVE_MICRO;
    return {
      id: uuid(),
      homeId,
      assetId: null,
      parentJobId,
      state: 'queued',
      provider,
      isSimulation: !ai,
      model: ai ? this.anthropic.model : null,
      documentIds,
      createdAt: this.now(),
      finishedAt: null,
      outcome: null,
      openReviewCount: null,
      error: null,
      billing: ai ? { currency: 'USD', maxReservedUsd: microToUsd(RESERVE_MICRO), actualUsd: null, state: 'reserved' } : null,
    };
  }

  private advance(stored: StoredJob) {
    const job = stored.job;
    if (job.state === 'queued') {
      job.state = 'running';
      return;
    }
    if (job.state === 'running' && this.jobMode === 'auto') this.finish(stored);
  }

  private fail(job: AnalysisJob, code: string, message: string) {
    job.state = 'failed';
    job.error = { code, message };
    job.finishedAt = this.now();
  }

  /** Chiude la contabilità del tentativo: costo noto (anche zero se il servizio lo sa) o incerto. */
  private settle(job: AnalysisJob, actualMicro: number | null) {
    if (!job.billing) return;
    if (actualMicro === null) {
      job.billing = { ...job.billing, state: 'uncertain', actualUsd: null };
      this.budgetUncertainMicro += RESERVE_MICRO;
      return;
    }
    this.budgetRemainingMicro += RESERVE_MICRO - actualMicro;
    job.billing = { ...job.billing, state: 'settled', actualUsd: microToUsd(actualMicro) };
  }

  /** Pubblicazione atomica: scheda, proposte, verifiche e successo del job insieme. */
  private finish(stored: StoredJob) {
    const { job, accountId } = stored;
    if (this.failNextJob) {
      const code = this.failNextJob;
      this.failNextJob = null;
      this.fail(job, code, code === 'analysis_unavailable' ? 'Servizio di analisi di test non disponibile.' : 'Analisi interrotta.');
      this.settle(job, 0);
      return;
    }
    const perms = this.docs.perms(accountId, job.homeId);
    const docs = job.documentIds.map((id) => this.docs.find(job.homeId, accountId, id));
    if (!perms?.includes('edit') || docs.some((d) => !d)) {
      this.fail(job, 'access_revoked', 'L’accesso alla casa o ai documenti non è più valido.');
      this.settle(job, 0);
      return;
    }
    const found = docs.map((d) => d!);
    let claims: Claim[];
    if (job.provider === 'anthropic') {
      const outcome = this.anthropicScript.shift() ?? { kind: 'fail', code: 'provider_unavailable', costUsd: '0.00' };
      if (outcome.kind === 'uncertain') {
        this.fail(job, 'analysis_outcome_unknown', 'Esito della richiesta ad Anthropic sconosciuto: nessun dato pubblicato.');
        this.settle(job, null);
        return;
      }
      if (outcome.kind === 'fail') {
        this.fail(job, outcome.code, outcome.message ?? '');
        this.settle(job, usdToMicro(outcome.costUsd));
        return;
      }
      this.settle(job, usdToMicro(outcome.costUsd ?? '0.0123'));
      if (outcome.kind === 'no_data') {
        this.noSupportedData(stored);
        return;
      }
      claims = outcome.claims.map((c) => ({ ...c, doc: found[c.documentIndex]! }));
      if (claims.some((c) => !c.doc)) {
        this.fail(job, 'evidence_unverified', 'Citazione non verificabile.');
        return;
      }
      if (claims.length === 0) {
        this.noSupportedData(stored);
        return;
      }
    } else {
      const fx = found.map((doc) => ({ doc, fixture: FIXTURES[doc.sha256] }));
      if (fx.some((x) => !x.fixture)) {
        this.fail(
          job,
          'provider_fixture_unsupported',
          'Il provider di test riconosce solo i tre PDF di esempio: nessun dato è stato estratto da questo documento.',
        );
        return;
      }
      claims = fx.flatMap(({ doc, fixture }) => [
        { field: 'brand' as const, value: fixture!.brand, page: 1, excerpt: `Marca: ${fixture!.brand}`, doc, documentIndex: 0 },
        { field: 'model' as const, value: fixture!.model, page: 1, excerpt: `Modello: ${fixture!.model}`, doc, documentIndex: 0 },
        { field: 'power' as const, value: fixture!.power.value, page: 1, excerpt: fixture!.powerExcerpt, measurement: fixture!.power, doc, documentIndex: 0 },
      ]);
    }
    this.publish(stored, claims);
  }

  private noSupportedData(stored: StoredJob) {
    const { job } = stored;
    job.state = 'succeeded';
    job.outcome = 'no_supported_data';
    job.openReviewCount = 0;
    job.finishedAt = this.now();
    // Nessuna scheda vuota: con destinazione la scheda resta invariata.
    job.assetId = stored.targetAssetId;
  }

  private publish(stored: StoredJob, claims: Claim[]) {
    const { job, accountId } = stored;
    const asset = stored.targetAssetId ? this.assets.get(stored.targetAssetId)! : this.newAsset(accountId, job.homeId, 'Caldaia');
    asset.providers.add(job.provider);
    const src = (c: Claim): SourceRef => ({
      documentId: c.doc.id,
      documentVersion: 1,
      documentSha256: c.doc.sha256,
      page: c.page,
      excerpt: c.excerpt,
    });
    const created: StoredAsset['proposals'] = [];
    const at = this.now();

    for (const key of ['brand', 'model'] as const) {
      const byValue = new Map<string, SourceRef[]>();
      for (const c of claims.filter((x) => x.field === key)) {
        const list = byValue.get(c.value) ?? [];
        list.push(src(c));
        byValue.set(c.value, list);
      }
      if (byValue.size === 0) continue; // dato assente: resta assente, nessun valore di ripiego
      const candidates: Candidate[] = [...byValue.entries()].map(([value, sources]) => ({ id: uuid(), value, sources }));
      const fingerprint = `${key}:` + [...byValue.entries()].map(([v, s]) => `${v}@${s.map((x) => x.documentSha256).sort().join(',')}`).sort().join('|');
      const current = asset.confirmed[key];
      if (current && candidates.length === 1 && valueText(current.value) === candidates[0]!.value) continue;
      if (asset.resolved.has(`${fingerprint}#${current?.revision ?? 0}`)) continue;
      created.push(this.proposal(asset, job, key, candidates.length === 1 ? 'single_value' : 'value_conflict', candidates, fingerprint, at));
    }

    const powerMap = new Map<string, { m: Measurement; sources: SourceRef[] }>();
    for (const c of claims.filter((x) => x.field === 'power' && x.measurement)) {
      const m = c.measurement!;
      const k = `${m.value}|${m.quantityCode}|${m.quantityLabel}`;
      const entry = powerMap.get(k) ?? { m, sources: [] };
      entry.sources.push(src(c));
      powerMap.set(k, entry);
    }
    if (powerMap.size > 0) {
      const powerCandidates: Candidate[] = [...powerMap.values()].map((e) => ({ id: uuid(), value: e.m.value, sources: e.sources, measurement: e.m }));
      const codes = powerCandidates.map((c) => c.measurement!.quantityCode);
      const powerKind =
        powerCandidates.length === 1
          ? 'single_value'
          : new Set(codes).size === codes.length
            ? 'quantity_interpretation'
            : 'value_conflict';
      const powerFp = 'power:' + [...powerMap.keys()].sort().join('|');
      const currentPower = asset.confirmed.power;
      const sameAsConfirmed =
        !!currentPower &&
        currentPower.value.kind === 'power' &&
        currentPower.value.measurements.map((m) => `${m.value}|${m.quantityCode}|${m.quantityLabel}`).sort().join(';') ===
          [...powerMap.keys()].sort().join(';');
      if (!sameAsConfirmed && !asset.resolved.has(`${powerFp}#${currentPower?.revision ?? 0}`)) {
        created.push(this.proposal(asset, job, 'power', powerKind, powerCandidates, powerFp, at));
      }
    }

    const origin = job.provider === 'anthropic' ? 'ai_provider' : 'test_provider';
    job.assetId = asset.id;
    job.finishedAt = at;
    job.state = 'succeeded';
    if (created.length === 0) {
      job.outcome = 'no_changes';
      job.openReviewCount = 0;
      asset.history.push({ id: uuid(), assetId: asset.id, at, kind: 'analysis_no_changes', origin, confirmationId: null, note: null, changes: [] });
      return;
    }
    asset.proposals.push(...created);
    asset.version += 1;
    job.outcome = 'proposals_created';
    job.openReviewCount = this.openOf(asset).length;
    asset.history.push({
      id: uuid(),
      assetId: asset.id,
      at,
      kind: 'analysis_published',
      origin,
      confirmationId: null,
      note: null,
      changes: created.map((p) => ({
        fieldKey: p.fieldKey,
        before: null,
        after: null,
        proposalId: p.id,
        action: 'proposed',
        sources: p.candidates.flatMap((c) => c.sources),
      })),
    });
  }

  private proposal(
    asset: StoredAsset,
    job: AnalysisJob,
    fieldKey: FieldKey,
    kind: ProposedField['kind'],
    candidates: Candidate[],
    fingerprint: string,
    createdAt: string,
  ): StoredAsset['proposals'][number] {
    return {
      id: uuid(),
      assetId: asset.id,
      jobId: job.id,
      fieldKey,
      kind,
      state: 'open',
      candidates,
      currentConfirmed: null,
      provider: job.provider,
      isSimulation: job.provider !== 'anthropic',
      model: job.model ?? null,
      fingerprint,
      createdAt,
    };
  }

  private getJob(jobId: string, accountId: string, homeId: string): Res {
    const stored = this.jobs.get(jobId);
    if (!stored || stored.accountId !== accountId || stored.job.homeId !== homeId) return err(403, 'forbidden', 'Accesso non consentito.');
    this.jobReads.set(jobId, (this.jobReads.get(jobId) ?? 0) + 1);
    this.advance(stored);
    return { status: 200, body: { job: { ...stored.job } } };
  }

  private listJobs(params: URLSearchParams, accountId: string, homeId: string): Res {
    const mine = [...this.jobs.values()].filter((j) => j.accountId === accountId && j.job.homeId === homeId).reverse();
    return this.paginate(mine.map((j) => ({ ...j.job })), params);
  }

  private retryJob(req: Req, jobId: string, accountId: string, homeId: string): Res {
    const stored = this.jobs.get(jobId);
    if (!stored || stored.accountId !== accountId || stored.job.homeId !== homeId) return err(403, 'forbidden', 'Accesso non consentito.');
    const body = (req.body ?? {}) as { consentToProviderTransfer?: unknown };
    if (stored.job.provider === 'anthropic' && stored.job.state === 'failed') {
      const blocked = this.anthropicGate(body.consentToProviderTransfer);
      if (blocked) return blocked;
    }
    return this.withIdem(req, `${accountId}:${homeId}:retry:${jobId}`, () => {
      if (stored.job.state !== 'failed') return err(409, 'invalid_job_state', 'Solo un’analisi non riuscita può essere ripetuta.');
      const job = this.makeJob(homeId, stored.job.documentIds, stored.job.id, stored.job.provider);
      this.jobs.set(job.id, { job, accountId, targetAssetId: stored.targetAssetId });
      return { status: 202, body: { job } };
    });
  }

  // ---- schede ----

  private listAssets(params: URLSearchParams, accountId: string, homeId: string): Res {
    const mine = [...this.assets.values()].filter((a) => a.accountId === accountId && a.homeId === homeId).reverse();
    return this.paginate(
      mine.map((a) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { proposals, ...summary } = this.detail(a);
        return summary;
      }),
      params,
    );
  }

  private createAsset(req: Req, accountId: string, homeId: string): Res {
    const body = (req.body ?? {}) as { type?: unknown; name?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (body.type !== 'boiler' || cp(name) < 1 || cp(name) > 80) {
      return err(422, 'validation_error', 'Dati non validi.', { name: 'Nome da 1 a 80 caratteri.' });
    }
    return this.withIdem(req, `${accountId}:${homeId}:asset:-`, () => {
      const a = this.newAsset(accountId, homeId, name);
      return { status: 201, body: { asset: this.detail(a) } };
    });
  }

  private listReview(params: URLSearchParams, accountId: string, homeId: string): Res {
    const items = [...this.assets.values()]
      .filter((a) => a.accountId === accountId && a.homeId === homeId)
      .flatMap((a) =>
        this.openOf(a).map((p) => ({
          id: `rv-${p.id}`,
          assetId: a.id,
          assetName: a.name,
          assetVersion: a.version,
          proposal: this.proposalView(a, p),
          createdAt: p.createdAt,
        })),
      )
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ createdAt, ...item }) => item);
    return this.paginate(items, params, { openCount: items.length });
  }

  // ---- conferme ----

  private confirm(req: Req, assetId: string, accountId: string, homeId: string, manual: boolean): Res {
    const asset = this.ownAsset(assetId, accountId, homeId);
    if (!asset) return err(403, 'forbidden', 'Accesso non consentito.');
    return this.withIdem(req, `${accountId}:${homeId}:${manual ? 'manual' : 'confirm'}:${assetId}`, () => {
      const body = (req.body ?? {}) as { expectedVersion?: unknown };
      if (typeof body.expectedVersion !== 'number') return err(422, 'validation_error', 'Versione mancante.');
      if (body.expectedVersion !== asset.version) {
        return err(409, 'asset_version_conflict', 'La scheda è cambiata: rileggi i dati prima di decidere.');
      }
      return manual ? this.applyManual(asset, req.body as { fields?: unknown }) : this.applyDecisions(asset, req.body as { decisions?: unknown });
    });
  }

  private replaceCheck(asset: StoredAsset, key: FieldKey, next: FieldValue, replace: unknown, note: string | undefined): Res | null {
    const current = asset.confirmed[key];
    if (!current || valueText(current.value) === valueText(next)) return null;
    if (replace === true && note && cp(note.trim()) > 0) return null;
    return err(409, 'confirmed_value_exists', 'Il campo ha già un valore confermato: serve una sostituzione esplicita con nota.');
  }

  private applyDecisions(asset: StoredAsset, body: { decisions?: unknown }): Res {
    const decisions = body.decisions as Decision[] | undefined;
    if (!Array.isArray(decisions) || decisions.length < 1 || decisions.length > 50) {
      return err(422, 'validation_error', 'Da 1 a 50 decisioni.');
    }
    if (new Set(decisions.map((d) => d.proposalId)).size !== decisions.length) {
      return err(422, 'validation_error', 'Decisioni duplicate.');
    }
    type Planned = { proposal: StoredAsset['proposals'][number]; decision: Decision; next: ConfirmedField | null; state: ProposedField['state'] };
    const planned: Planned[] = [];
    const hasPower = decisions.some((d) => asset.proposals.find((p) => p.id === d.proposalId)?.fieldKey === 'power' && d.action !== 'discard');
    if (hasPower && decisions.length > 1) {
      return err(422, 'invalid_resolution', 'La potenza si decide da sola, con una nota.');
    }
    const confirmationId = uuid();
    const at = this.now();
    for (const d of decisions) {
      const p = asset.proposals.find((x) => x.id === d.proposalId);
      if (!p) return err(422, 'validation_error', 'Proposta non valida.');
      if (p.state !== 'open') return err(409, 'proposal_already_resolved', 'Questa verifica è già stata risolta.');
      const note = 'note' in d && typeof d.note === 'string' ? d.note.trim() : undefined;
      const rev = (asset.confirmed[p.fieldKey]?.revision ?? 0) + 1;
      const make = (value: FieldValue, origin: ConfirmedField['origin'], sources: SourceRef[]): ConfirmedField => ({
        fieldKey: p.fieldKey,
        value,
        revision: rev,
        origin,
        sources,
        note: note || null,
        confirmationId,
        confirmedAt: at,
      });
      if (d.action === 'discard') {
        if (!note) return err(422, 'invalid_resolution', 'Serve una nota per non applicare la proposta.');
        planned.push({ proposal: p, decision: d, next: null, state: 'discarded' });
        continue;
      }
      if (d.action === 'accept' || d.action === 'correct') {
        if (p.fieldKey === 'power') return err(422, 'invalid_resolution', 'La potenza richiede resolve_power.');
        let next: ConfirmedField;
        if (d.action === 'accept') {
          const c = p.candidates.find((x) => x.id === d.candidateId);
          if (!c) return err(422, 'invalid_resolution', 'Candidato non valido.');
          next = make({ kind: 'text', text: c.value }, 'proposal_accepted', c.sources);
        } else {
          const max = p.fieldKey === 'brand' ? 80 : 120;
          const v = typeof d.value === 'string' ? d.value.trim() : '';
          if (cp(v) < 1 || cp(v) > max || !note) return err(422, 'invalid_resolution', 'Correzione non valida o nota mancante.');
          next = make({ kind: 'text', text: v }, 'user_correction', []);
        }
        const blocked = this.replaceCheck(asset, p.fieldKey, next.value, d.replaceConfirmed, note);
        if (blocked) return blocked;
        planned.push({ proposal: p, decision: d, next, state: d.action === 'accept' ? 'accepted' : 'corrected' });
        continue;
      }
      if (d.action === 'resolve_power') {
        if (p.fieldKey !== 'power' || !note) return err(422, 'invalid_resolution', 'Serve una decisione sulla potenza con nota.');
        const ms = d.measurements;
        if (!Array.isArray(ms) || ms.length < 1 || ms.length > 2) return err(422, 'invalid_resolution', 'Da 1 a 2 misure.');
        for (const m of ms) {
          if (!POWER_RE.test(m.value) || Number(m.value) <= 0 || m.unit !== 'kW' || cp((m.quantityLabel ?? '').trim()) < 1) {
            return err(422, 'invalid_resolution', 'Misura non valida.');
          }
        }
        let measurements: Array<Measurement & { sources: SourceRef[]; origin: ConfirmedField['origin'] }>;
        if (d.mode === 'keep_distinct') {
          if (p.kind !== 'quantity_interpretation' || ms.length !== p.candidates.length) {
            return err(422, 'invalid_resolution', 'Conserva le due grandezze vale solo per grandezze diverse.');
          }
          measurements = [];
          for (const m of ms) {
            const c = p.candidates.find((x) => x.id === m.candidateId);
            if (!c || c.measurement!.value !== normPower(m.value) || c.measurement!.quantityCode !== m.quantityCode) {
              return err(422, 'invalid_resolution', 'Misura non associata al candidato.');
            }
            measurements.push({ ...c.measurement!, sources: c.sources, origin: 'proposal_accepted' });
          }
          if (new Set(measurements.map((m) => m.quantityCode)).size !== measurements.length) {
            return err(422, 'invalid_resolution', 'Le grandezze devono essere distinte.');
          }
        } else if (d.mode === 'choose_one') {
          const c = ms.length === 1 ? p.candidates.find((x) => x.id === ms[0]!.candidateId) : undefined;
          if (!c || c.measurement!.value !== normPower(ms[0]!.value)) return err(422, 'invalid_resolution', 'Scegli un candidato della proposta.');
          measurements = [{ ...c.measurement!, sources: c.sources, origin: 'proposal_accepted' }];
        } else {
          if (new Set(ms.map((m) => m.quantityLabel.trim().toLowerCase())).size !== ms.length) {
            return err(422, 'invalid_resolution', 'Le misure corrette devono avere denominazioni distinte.');
          }
          measurements = ms.map((m) => ({
            value: normPower(m.value),
            unit: 'kW' as const,
            quantityCode: m.quantityCode as QuantityCode,
            quantityLabel: m.quantityLabel.trim(),
            sources: [],
            origin: 'user_correction' as const,
          }));
        }
        const origin: ConfirmedField['origin'] = d.mode === 'correct' ? 'user_correction' : 'proposal_accepted';
        const next = make({ kind: 'power', measurements }, origin, measurements.flatMap((m) => m.sources));
        const blocked = this.replaceCheck(asset, 'power', next.value, d.replaceConfirmed, note);
        if (blocked) return blocked;
        planned.push({ proposal: p, decision: d, next, state: d.mode === 'correct' ? 'corrected' : 'accepted' });
        continue;
      }
      return err(422, 'invalid_resolution', 'Azione non valida.');
    }
    // Tutte le decisioni valide: applicazione atomica.
    const changes: HistoryEvent['changes'] = [];
    for (const { proposal, decision, next, state } of planned) {
      const before = asset.confirmed[proposal.fieldKey]?.value ?? null;
      asset.resolved.add(`${proposal.fingerprint}#${asset.confirmed[proposal.fieldKey]?.revision ?? 0}`);
      if (next) asset.confirmed[proposal.fieldKey] = next;
      proposal.state = state;
      changes.push({
        fieldKey: proposal.fieldKey,
        before,
        after: next ? next.value : before,
        proposalId: proposal.id,
        action: decision.action === 'resolve_power' ? `resolve_power:${decision.mode}` : decision.action,
        sources: proposal.candidates.flatMap((c) => c.sources),
      });
      // La chiave registrata dopo la decisione evita di ricreare la stessa verifica.
      asset.resolved.add(`${proposal.fingerprint}#${asset.confirmed[proposal.fieldKey]?.revision ?? 0}`);
    }
    asset.version += 1;
    const firstNote = decisions.map((d) => ('note' in d ? d.note : undefined)).find((n) => typeof n === 'string' && n.trim());
    asset.history.push({ id: uuid(), assetId: asset.id, at, kind: 'confirmation', origin: 'explicit_user', confirmationId, note: firstNote?.trim() ?? null, changes });
    return {
      status: 201,
      body: {
        confirmationId,
        asset: this.detail(asset),
        resolvedProposalIds: planned.map((x) => x.proposal.id),
        remainingOpenCount: this.openOf(asset).length,
      },
    };
  }

  private applyManual(asset: StoredAsset, body: { fields?: unknown }): Res {
    const fields = body.fields as ManualField[] | undefined;
    if (!Array.isArray(fields) || fields.length < 1 || fields.length > 3) return err(422, 'validation_error', 'Da 1 a 3 campi.');
    const keys = fields.map((f) => f.fieldKey);
    if (new Set(keys).size !== keys.length) return err(422, 'validation_error', 'Campi duplicati.');
    if (keys.includes('power') && keys.length > 1) return err(422, 'invalid_resolution', 'La potenza si inserisce da sola.');
    const confirmationId = uuid();
    const at = this.now();
    const planned: Array<{ field: ManualField; next: ConfirmedField; close: StoredAsset['proposals'] }> = [];
    for (const f of fields) {
      const note = typeof f.note === 'string' ? f.note.trim() : '';
      if (cp(note) < 1 || cp(note) > 500) return err(422, 'validation_error', 'Nota obbligatoria.', { note: 'Nota da 1 a 500 caratteri.' });
      let value: FieldValue;
      if (f.fieldKey === 'power') {
        if (f.value?.kind !== 'power' || !Array.isArray(f.value.measurements) || f.value.measurements.length < 1 || f.value.measurements.length > 2) {
          return err(422, 'validation_error', 'Potenza non valida.');
        }
        for (const m of f.value.measurements) {
          if (!POWER_RE.test(m.value) || Number(m.value) <= 0 || cp((m.quantityLabel ?? '').trim()) < 1) return err(422, 'validation_error', 'Misura non valida.');
        }
        value = {
          kind: 'power',
          measurements: f.value.measurements.map((m) => ({ ...m, value: normPower(m.value), quantityLabel: m.quantityLabel.trim(), sources: [], origin: 'manual' as const })),
        };
      } else {
        const max = f.fieldKey === 'brand' ? 80 : 120;
        const text = f.value?.kind === 'text' ? f.value.text.trim() : '';
        if (cp(text) < 1 || cp(text) > max) return err(422, 'validation_error', 'Valore non valido.');
        value = { kind: 'text', text };
      }
      const blocked = this.replaceCheck(asset, f.fieldKey, value, f.replaceConfirmed, note);
      if (blocked) return blocked;
      const close = [];
      for (const pid of f.proposalIdsToClose ?? []) {
        const p = asset.proposals.find((x) => x.id === pid);
        if (!p || p.fieldKey !== f.fieldKey) return err(422, 'invalid_resolution', 'Verifica non associata a questo campo.');
        if (p.state !== 'open') return err(409, 'proposal_already_resolved', 'Verifica già risolta.');
        close.push(p);
      }
      const rev = (asset.confirmed[f.fieldKey]?.revision ?? 0) + 1;
      planned.push({ field: f, next: { fieldKey: f.fieldKey, value, revision: rev, origin: 'manual', sources: [], note, confirmationId, confirmedAt: at }, close });
    }
    const changes: HistoryEvent['changes'] = [];
    const resolvedIds: string[] = [];
    for (const { field, next, close } of planned) {
      const before = asset.confirmed[field.fieldKey]?.value ?? null;
      asset.confirmed[field.fieldKey] = next;
      for (const p of close) {
        p.state = 'corrected';
        resolvedIds.push(p.id);
        asset.resolved.add(`${p.fingerprint}#${next.revision}`);
      }
      changes.push({ fieldKey: field.fieldKey, before, after: next.value, proposalId: null, action: 'manual', sources: [] });
    }
    asset.version += 1;
    asset.history.push({ id: uuid(), assetId: asset.id, at, kind: 'manual_confirmation', origin: 'explicit_user', confirmationId, note: planned[0]!.next.note, changes });
    return { status: 201, body: { confirmationId, asset: this.detail(asset), resolvedProposalIds: resolvedIds, remainingOpenCount: this.openOf(asset).length } };
  }
}
