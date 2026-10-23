import { expect, it, vi } from 'vitest';
import type { BatchWire, CapabilityWire, IntakeClient } from './client';
import { sameManualOrganizationContext, localAnalysisCandidates, organizationFromObjectKind, organizeDocuments, type OrganizationPayload } from './organization';

const capability = { enabled: true, analysis: { enabled: true, provider: 'local_text_v1', externalTransmission: false } } as CapabilityWire;
const wire = (): BatchWire => ({ id: 'batch', homeId: 'home', version: 1, state: 'open', permissions: ['read', 'edit'], limits: { maxFiles: 20, maxFileBytes: 20971520, maxTotalBytes: 209715200, acceptedMimeTypes: ['application/pdf'] }, items: [
  { id: 'a', clientItemId: 'client-a', version: 1, filename: 'Synthetic.pdf', mimeType: 'application/pdf', byteSize: 20, pageCount: null, uploadState: 'stored', analysisState: 'not_started', reviewState: 'unreviewed', proposal: null, selection: null, organization: null, organizationVersion: 0, documentLink: { state: 'linked', document: { id: 'doc-a', name: 'Synthetic' } }, duplicate: null, error: null, permissions: ['read', 'edit'] },
] });
const payload: OrganizationPayload = { batchId: 'batch', expectedVersion: 1, mode: 'single', items: [{ itemId: 'a', expectedVersion: 1, expectedOrganizationVersion: 0, replaceOrganization: false, selection: { action: 'organize', title: 'APE sintetico', parts: [{ kind: 'ape', pageFrom: null, pageTo: null }], target: { kind: 'home' } } }] };

it('recovers partial receipt with exactly the same body/key and preserves per-item rejected outcomes', async () => {
  const p: OrganizationPayload = { ...payload, mode: 'multiple', items: [...payload.items, { ...payload.items[0]!, itemId: 'b' }] };
  const batch = wire(), recovery = vi.fn().mockResolvedValue({ wire: batch, raw: { results: { a: { state: 'confirmed' } } } });
  const post = vi.fn().mockResolvedValue({ wire: batch, raw: { results: { a: { state: 'confirmed' }, b: { state: 'rejected', code: 'item_version_conflict' } } } });
  const client = { recovery, post } as unknown as IntakeClient;
  const response = await organizeDocuments(client, p, 'stable-key', true);
  expect(recovery).toHaveBeenCalledWith('batch', '/organizations/stable-key');
  expect(post).toHaveBeenCalledExactlyOnceWith('batch', '/organizations', { expectedVersion: 1, mode: 'multiple', items: p.items }, 'stable-key');
  expect(response.outcome).toMatchObject({ status: 'done', results: [{ itemId: 'a', status: 'confirmed' }, { itemId: 'b', status: 'rejected' }] });
});

it('complete receipt never repeats a write; missing and invalid outcomes never become success', async () => {
  const batch = wire(), post = vi.fn(), recovery = vi.fn().mockResolvedValue({ wire: batch, raw: { results: { a: { state: 'confirmed' } } } });
  const client = { post, recovery } as unknown as IntakeClient;
  expect((await organizeDocuments(client, payload, 'key', true)).outcome.status).toBe('done'); expect(post).not.toHaveBeenCalled();
  post.mockResolvedValue({ wire: batch, raw: { results: {} } });
  expect((await organizeDocuments(client, payload, 'key')).outcome.status).toBe('uncertain');
  post.mockResolvedValue({ wire: batch, raw: { results: { a: { state: 'invented' } } } });
  await expect(organizeDocuments(client, payload, 'key')).rejects.toThrow('Esito');
});

it('unknown or not-found receipt propagates without blind POST or generating a different key', async () => {
  const post = vi.fn(), failure = Error('receipt unavailable'), recovery = vi.fn().mockRejectedValue(failure);
  await expect(organizeDocuments({ post, recovery } as unknown as IntakeClient, payload, 'original-key', true)).rejects.toBe(failure);
  expect(post).not.toHaveBeenCalled();
});

it('automatic local candidates exclude lost sources, saved/deferred decisions, pending/running work and previous attempts', () => {
  const batch = wire(), base = batch.items[0]!;
  batch.items.push(
    { ...base, id: 'deferred', reviewState: 'deferred' }, { ...base, id: 'saved', reviewState: 'saved' },
    { ...base, id: 'confirmed', reviewState: 'confirmed' }, { ...base, id: 'queued', analysisState: 'queued' },
    { ...base, id: 'pending', uploadState: 'pending' }, { ...base, id: 'unavailable', documentLink: { state: 'unavailable', document: null } },
    { ...base, id: 'attempted' }, { ...base, id: 'no-edit', permissions: ['read'] },
  );
  expect(localAnalysisCandidates(capability, batch, new Set(['batch:attempted']))).toEqual([{ id: 'a', expectedVersion: 1 }]);
  expect(localAnalysisCandidates({ ...capability, enabled: false }, batch, new Set())).toEqual([]);
  expect(localAnalysisCandidates({ ...capability, analysis: { ...capability.analysis, externalTransmission: true } } as unknown as CapabilityWire, batch, new Set())).toEqual([]);
  batch.permissions = ['read']; expect(localAnalysisCandidates(capability, batch, new Set())).toEqual([]);
});

import type { IntakeItem } from '../document-intake/model';
it('object type can propose a home-only purchase classification, never overwrite copies or confirmed data',()=>{
 const base={...wire().items[0],permissions:{review:true},confirmedOrganization:null,organizationVersion:0} as unknown as IntakeItem;
 expect(organizationFromObjectKind(base,'delivery_notice')).toMatchObject({replaceOrganization:false,selection:{parts:[{kind:'delivery_notice',pageFrom:null,pageTo:null}],target:{kind:'home'}}});
 expect(organizationFromObjectKind(base,'appliance_label')?.selection.parts[0]?.kind).toBe('product_label');
 expect(organizationFromObjectKind(base,'device_label')?.selection.parts[0]?.kind).toBe('product_label');
 expect(organizationFromObjectKind(base,'order_confirmation')?.selection.parts[0]?.kind).toBe('purchase_order');
 expect(organizationFromObjectKind(base,'conformity_declaration')?.selection.parts[0]?.kind).toBe('conformity_declaration');
 for(const kind of ['system_diagram','system_booklet','energy_certificate','warranty','manual'])expect(organizationFromObjectKind(base,kind)?.selection.parts[0]?.kind).toBe(kind);
 expect(organizationFromObjectKind(base,'invoice')?.selection.parts[0]?.kind).toBe('invoice');
 expect(organizationFromObjectKind(base,'purchase_document')?.selection.parts[0]?.kind).toBe('purchase_document');
 for(const patch of [{uploadState:'duplicate'},{reviewState:'deferred'},{reviewState:'saved'},{analysisState:'uncertain'},{organizationVersion:1},{permissions:{review:false}},{documentLink:{state:'unavailable',document:null}}])expect(organizationFromObjectKind({...base,...patch} as IntakeItem,'delivery_notice')).toBeNull();
 expect(organizationFromObjectKind(base,'other')).toBeNull();
});

it('manual organization tolerates local analysis progress but rejects changed source, rights and saved choices',()=>{
 const before=wire(),after=structuredClone(before);after.version=3;after.items[0]!.version=4;after.items[0]!.analysisState='unreadable';after.items[0]!.pageCount=1;
 expect(sameManualOrganizationContext(before,after,'a')).toBe(true);
 const changed:Array<(b:BatchWire)=>void>=[b=>{b.items=[];},b=>{b.homeId='other';},b=>{b.items[0]!.documentLink={state:'unavailable',document:null};},b=>{b.items[0]!.documentLink.document!.id='other';},b=>{b.items[0]!.organizationVersion=1;},b=>{b.items[0]!.selection={action:'defer'};},b=>{b.items[0]!.reviewState='confirmed';},b=>{b.items[0]!.permissions=['read'];},b=>{b.permissions=['read'];},b=>{b.items[0]!.uploadState='duplicate';},b=>{b.items[0]!.version=0;},b=>{b.version=0;}];
 for(const mutate of changed){const value=structuredClone(after);mutate(value);expect(sameManualOrganizationContext(before,value,'a')).toBe(false);}
});
