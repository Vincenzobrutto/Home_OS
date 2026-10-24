// Browser harness only. Fixed synthetic proposals, no extraction, database or external provider.
import type { Draft } from '../object-onboarding/model.ts';
import type { FakeBackend, FakeRequest, FakeResponse } from './fakeBackend.ts';

export async function seedCompilation(backend: FakeBackend, homeId: string, uploaderId: string) {
  const doc = await backend.seedDocument({ homeId, uploaderId, name: 'COLLAUDO SCHEDE · tre articoli sintetici' });
  const draft: Draft = {
    id: 'mock-compilation', version: 1, state: 'open', mode: 'extraction', documentKind: 'delivery_notice',
    document: { id: doc.id, name: doc.name, mimeType: 'application/pdf' },
    snapshot: { documentId: doc.id, documentVersion: 1, sha256: doc.sha256 },
    items: ['Macchina caffè demo', 'Monitor demo', 'Accessorio demo'].map((name, i) => ({
      id: 'mock-item-' + i, nameTruncated: false, disposition: 'household_object',
      fields: { name: { value: name, source: { documentId: doc.id, page: 1, excerpt: name } } },
      quantity: null, profile: {}, enrichment: null, decision: null,
    })), needsReview: false, purchaseTotal: null, review: null, permissions: ['read', 'edit'],
  };
  const receipts = new Map<string, { body: string; response: FakeResponse }>();
  const reviewReceipts = new Map<string, { body: string; response: FakeResponse }>();
  const base = '/homes/' + homeId + '/object-onboarding';
  const fail = (status: number, code: string): FakeResponse => ({ status, body: { error: { code, message: 'Harness simulato: ' + code } } });
  async function handle(req: FakeRequest): Promise<FakeResponse | null> {
    if (!req.path.startsWith(base + '/')) return null;
    const session = req.cookie ? backend.sessions.get(req.cookie) : null;
    if (session?.accountId !== uploaderId) return fail(403, 'forbidden');
    if (req.method !== 'GET' && req.headers['x-csrf-token'] !== session.csrf) return fail(403, 'csrf_invalid');
    const path = req.path.slice(base.length).split('?')[0]!;
    const input = req.body as { expectedVersion?: number; source?: unknown; review?: Draft['review']; choices?: Array<{ itemId: string; action: string; name?: string }> } | undefined;
    if (req.method === 'GET' && path === '/capabilities') return { status: 200, body: { manualAvailable: false, aiAvailable: false, requiresConsent: true, drafts: [{ id: draft.id, state: draft.state }], job: null } };
    if (req.method === 'GET' && path === '/drafts/' + draft.id) return { status: 200, body: { draft } };
    if (req.method === 'GET' && /\/(?:candidates|expense-candidates)$/.test(path)) return { status: 200, body: { items: [], nextCursor: null } };
    if (req.method === 'GET' && path.startsWith('/drafts/' + draft.id + '/confirmations/')) return { status: 200, body: { status: receipts.has(decodeURIComponent(path.split('/').at(-1)!)) ? 'confirmed' : 'not_found' } };
    if (req.method === 'POST' && path === '/drafts/' + draft.id + '/review') {
      const key = req.headers['idempotency-key'];
      if (!key) return fail(422, 'idempotency_key_required');
      const body = JSON.stringify(req.body), previous = reviewReceipts.get(key);
      if (previous) return previous.body === body ? previous.response : fail(409, 'idempotency_conflict');
      if (input?.expectedVersion !== draft.version) return fail(409, 'version_conflict');
      draft.review = structuredClone(input.review ?? null); draft.version++;
      const response: FakeResponse = { status: 200, body: { draft: structuredClone(draft) } };
      reviewReceipts.set(key, { body, response }); return response;
    }
    if (req.method === 'POST' && path === '/drafts/' + draft.id + '/confirmations') {
      const key = req.headers['idempotency-key'];
      if (!key) return fail(422, 'idempotency_key_required');
      const previous = receipts.get(key), body = JSON.stringify(req.body);
      if (previous) return previous.body === body ? previous.response : fail(409, 'idempotency_conflict');
      if (input?.expectedVersion !== draft.version || JSON.stringify(input.source) !== JSON.stringify(draft.snapshot)) return fail(409, 'source_or_version_conflict');
      if (!Array.isArray(input.choices) || input.choices.some(choice => !draft.items.some(item => item.id === choice.itemId) || !['create', 'skip', 'document_only'].includes(choice.action))) return fail(422, 'unsupported_mock_choice');
      for (const choice of input.choices) {
        const item = draft.items.find(item => item.id === choice.itemId)!;
        item.decision = { state: choice.action === 'skip' ? 'skipped' : 'confirmed', newObjects: choice.action === 'create' ? 1 : 0, newExpenses: 0, objects: [] };
      }
      draft.version++; draft.state = 'confirmed'; draft.review = null;
      const response: FakeResponse = { status: 200, body: { draft: structuredClone(draft), result: { newObjects: input.choices.filter(choice => choice.action === 'create').length, newExpenses: 0 } } };
      receipts.set(key, { body, response }); return response;
    }
    return fail(422, 'operation_not_supported_no_provider');
  }
  return { handle, draft, path: '/home/' + homeId + '/documenti/' + doc.id + '/oggetti?compila=manuale&bozza=' + draft.id + '&vista-compilazione=schede' };
}
