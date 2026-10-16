import { describe, expect, it } from 'vitest';
import { ApiClient, type FetchLike } from '../api/client';
import { ReceiptClient, decodeCandidates, decodeComparisons, decodeDraft, toReceiptDraft } from './client';
import { initialFormState, buildConfirmationPayload } from '../receipt-assistance/model';
import { kitchen, purchase, scenarios, TODAY } from '../receipt-assistance/testing/fixtures';

const h = 'home-demo', a = 'account-demo', d = 'draft-demo';
export function wireDraft() {
  const draft = scenarios.fresh().draft, { total, ...fields } = draft.proposals;
  return { id: d, homeId: h, version: 1, mode: 'extraction', state: 'open', fields, total, review: null, confirmation: null, permissions: ['read', 'edit'], documentLink: { state: 'linked', document: { id: 'doc-demo', name: 'Ricevuta.pdf' } } };
}
const emptyPage = { items: [], nextCursor: null, linkedCount: 0 };
function client(reply: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    if (url === '/api/v5/session') return Response.json({ csrfToken: 'csrf-test', account: { id: a } });
    return reply(url, init);
  };
  return { client: new ReceiptClient(new ApiClient({ fetch }), a, h), calls };
}

describe('[mock] receipt wire and transport', () => {
  it('validates receipt billing, paid uncertainty and redaction instead of displaying untrusted costs', async () => {
    const billing = { currency: 'USD', maxReservedUsd: '0.250000', actualUsd: null, state: 'uncertain' };
    const value = { id: 'job1', version: 1, provider: 'anthropic', isSimulation: false, state: 'uncertain', draftId: null, errorCode: 'analysis_outcome_unknown', model: 'claude-sonnet-5-5', billing, documentLink: wireDraft().documentLink };
    const w = client(() => Response.json({ job: value }));
    expect((await w.client.job('job1')).billing?.state).toBe('uncertain');
    for (const patch of [{ maxReservedUsd: '10.000000' }, { actualUsd: '0.100000' }, { currency: 'EUR' }]) {
      Object.assign(billing, patch); await expect(w.client.job('job1')).rejects.toMatchObject({ kind: 'service' });
      Object.assign(billing, { currency: 'USD', maxReservedUsd: '0.250000', actualUsd: null });
    }
    value.isSimulation = true; await expect(w.client.job('job1')).rejects.toMatchObject({ kind: 'service' });
    const hidden = { ...wireDraft(), fields: {}, total: null, review: null, documentLink: { state: 'unavailable', document: null }, analysis: { provider: 'anthropic', isSimulation: false, model: value.model, billing } };
    expect(() => decodeDraft({ draft: hidden }, h)).toThrow();
    expect(decodeDraft({ draft: { ...wireDraft(), analysis: hidden.analysis } }, h).analysis?.billing?.state).toBe('uncertain');
  });
  it('keeps verified text, EUR cents and citations but never passes raw draft fields to manual proposals', () => {
    const wire = decodeDraft({ draft: wireDraft() }, h, d);
    const extraction = toReceiptDraft(wire, emptyPage, emptyPage, []);
    expect(extraction.proposals.total?.amountCents).toBe(17990);
    expect(extraction.proposals.model?.sources).toEqual([{ page: 1, excerpt: 'Mini 90' }]);
    expect(toReceiptDraft({ ...wire, mode: 'manual' }, emptyPage, emptyPage, []).proposals).toEqual({});
    for (const value of [{ ...wireDraft(), homeId: 'other' }, { ...wireDraft(), id: 'wrong' }, { ...wireDraft(), total: { amountCents: 179.9, sources: [] } }, { ...wireDraft(), fields: { name: { value: 'Name', sources: [{ page: 0, excerpt: 'bad' }] } } }]) {
      expect(() => decodeDraft({ draft: value }, h, d)).toThrow();
    }
  });
  it('source redaction is enforced before any local form can be restored', () => {
    const wire = { ...wireDraft(), fields: {}, total: null, review: null, documentLink: { state: 'unavailable', document: null } };
    expect(decodeDraft({ draft: wire }, h).documentLink.state).toBe('unavailable');
    expect(() => decodeDraft({ draft: { ...wire, fields: wireDraft().fields } }, h)).toThrow();
    expect(() => decodeDraft({ draft: { ...wire, documentLink: { state: 'linked', document: null } } }, h)).toThrow();
  });
  it('does not turn a partial page into a unique existing target or conflate same_original with name similarity', () => {
    const object = kitchen({ linkedToDocument: true, reasons: ['same_original'] });
    const objects = decodeCandidates<ReturnType<typeof kitchen>>({ items: [object], linkedCount: 2, nextCursor: 'next-page' }, 'object');
    const wire = decodeDraft({ draft: wireDraft() }, h);
    const draft = toReceiptDraft(wire, objects, { ...emptyPage, items: [purchase()], linkedCount: 1 }, []);
    expect(initialFormState(draft).object.kind).toBe('unset');
    expect(initialFormState(draft).expense).toEqual({ kind: 'reuse', id: purchase().id });
    expect(draft.linkedObjects[0]!.reasons).toEqual(['same_original']);
    expect(() => decodeCandidates({ ...objects, items: [object, object] }, 'object')).toThrow();
  });
  it('filters unavailable and resolved comparisons out of the editable receipt model', () => {
    const open = { id: 'c1', version: 1, state: 'open', object: { id: 'o1', version: 2, name: 'Macchina' }, fieldKey: 'brand', existing: 'Aurora', proposed: { value: 'Lume', sources: [{ page: 1, excerpt: 'Lume' }] }, permissions: ['read', 'edit'] };
    const redacted = { ...open, id: 'c2', state: 'unavailable', object: null, fieldKey: null, existing: null, proposed: null, permissions: ['read'] };
    const page = decodeComparisons({ items: [open, redacted, { ...open, id: 'c3', state: 'resolved' }], nextCursor: null });
    expect(toReceiptDraft(decodeDraft({ draft: wireDraft() }, h), emptyPage, emptyPage, page.items).openComparisons.map(v => v.id)).toEqual(['c1']);
    expect(() => decodeComparisons({ items: [{ ...redacted, existing: 'leaked' }], nextCursor: null })).toThrow();
  });
  it('sends canonical confirmation once, with CSRF/account/key and without UI-only draftId', async () => {
    const w = client(() => Response.json({ draft: wireDraft() }));
    const draft = scenarios.fresh().draft, form = initialFormState(draft);
    const payload = buildConfirmationPayload(form, draft, [], [], TODAY)!;
    expect(payload).not.toBeNull();
    await w.client.confirm(payload, 'stable-confirmation-key');
    const call = w.calls.at(-1)!, headers = new Headers(call.init.headers);
    expect(call.url).toBe('/api/v5/homes/home-demo/receipt-assistance/drafts/draft-demo/confirmations');
    expect(call.init.method).toBe('POST'); expect(call.init.credentials).toBe('include'); expect(call.init.cache).toBe('no-store');
    expect(headers.get('Idempotency-Key')).toBe('stable-confirmation-key'); expect(headers.get('X-Account-Context')).toBe(a); expect(headers.get('X-CSRF-Token')).toBe('csrf-test');
    expect(JSON.parse(String(call.init.body))).toEqual({ expectedVersion: 1, object: payload.object, expense: payload.expense });
  });
  it('lost confirmation response has no automatic retry and recovery is GET with the original key', async () => {
    const w = client(url => { if (url.endsWith('/confirmations')) throw new TypeError('network'); return Response.json({ status: 'confirmed', draft: wireDraft() }); });
    const draft = scenarios.fresh().draft, payload = buildConfirmationPayload(initialFormState(draft), draft, [], [], TODAY)!;
    await expect(w.client.confirm(payload, 'same-request-key-123')).rejects.toMatchObject({ kind: 'service' });
    expect(w.calls.filter(c => c.url.endsWith('/confirmations'))).toHaveLength(1);
    await w.client.recover(d, 'same-request-key-123');
    const recovery = w.calls.at(-1)!; expect(recovery.init.method).toBe('GET'); expect(recovery.init.body).toBeUndefined();
    expect(new Headers(recovery.init.headers).get('Idempotency-Key')).toBe('same-request-key-123');
  });
  it('park sends only the reviewed selection and reopening remains explicit', async () => {
    const w = client(() => Response.json({ draft: wireDraft() }));
    const draft = scenarios.fresh().draft, payload = buildConfirmationPayload(initialFormState(draft), draft, [], [], TODAY)!;
    await w.client.park(payload, 'park-request-key-123');
    expect(JSON.parse(String(w.calls.at(-1)!.init.body))).toEqual({ expectedVersion: 1, selection: { object: payload.object, expense: payload.expense } });
    expect(w.calls.some(c => c.url.endsWith('/reopen'))).toBe(false);
    await w.client.reopen(d, 2, 'resume-request-key-123');
    expect(JSON.parse(String(w.calls.at(-1)!.init.body))).toEqual({ expectedVersion: 2 });
  });
  it('preserves cancellation, cursor and denied access instead of returning mock candidates', async () => {
    const controller = new AbortController();
    const w = client(() => Response.json({ error: { code: 'forbidden', message: 'Accesso non consentito' } }, { status: 403 }));
    await expect(w.client.objects(d, 'next/page', controller.signal)).rejects.toMatchObject({ status: 403 });
    expect(w.calls.at(-1)!.url).toContain('cursor=next%2Fpage'); expect(w.calls.at(-1)!.init.signal).toBe(controller.signal);
    const malformed = client(() => Response.json({ items: [], linkedCount: '1', nextCursor: null }));
    await expect(malformed.client.objects(d, null)).rejects.toMatchObject({ kind: 'service' });
  });
  it('confirmed fields keep their origin, unavailable fields cannot carry a value or excerpt', async () => {
    const response = { object: { id: 'object1', version: 2, name: 'Macchina', state: 'active' }, fields: { name: null, brand: { state: 'confirmed', value: 'Lume', origin: 'user_declared', version: 1, sources: [] }, model: { state: 'unavailable', value: null, origin: 'extraction_confirmed', version: 2, sources: [] } } };
    const w = client(() => Response.json(response));
    expect((await w.client.fields('object1')).fields.brand).toMatchObject({ value: 'Lume', origin: 'user_declared' });
    response.fields.model.sources = [{ page: 1, excerpt: 'private' }] as never[];
    await expect(w.client.fields('object1')).rejects.toMatchObject({ kind: 'service' });
    response.fields.model.sources = []; response.object.id = 'other';
    await expect(w.client.fields('object1')).rejects.toMatchObject({ kind: 'service' });
  });
  it('job success must identify the draft and revoked sources cannot expose job results', async () => {
    const value = { id: 'job1', version: 1, provider: 'receipt_fixture_v1', isSimulation: true, state: 'succeeded', draftId: null as string | null, errorCode: null, documentLink: wireDraft().documentLink };
    const w = client(() => Response.json({ job: value }));
    await expect(w.client.job('job1')).rejects.toMatchObject({ kind: 'service' });
    value.draftId = d;
    expect((await w.client.job('job1')).draftId).toBe(d);
    value.state = 'unavailable'; value.documentLink = { state: 'unavailable', document: null } as unknown as typeof value.documentLink;
    await expect(w.client.job('job1')).rejects.toMatchObject({ kind: 'service' });
    value.draftId = null; expect((await w.client.job('job1')).state).toBe('unavailable');
  });
});
