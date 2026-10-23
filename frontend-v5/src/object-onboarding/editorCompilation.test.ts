import { expect, it } from 'vitest';
import { compilationSnapshot, formsWithEditing, restoredItemForm } from './editorCompilation';
import type { Draft, Form, HouseForm } from './model';

function draft(): Draft {
  return {
    id: 'draft', version: 7, state: 'open', mode: 'manual', documentKind: 'order_confirmation',
    snapshot: { documentId: 'doc', documentVersion: 1, sha256: 'a'.repeat(64) }, document: null,
    items: [{
      id: 'item', fields: { name: { value: 'Oggetto sintetico', source: { documentId: 'doc', page: 1, excerpt: 'Oggetto sintetico' } } },
      quantity: null, nameTruncated: false, disposition: 'household_object',
      profile: { brand: { value: 'Marca sintetica', origin: 'user_declared', sources: [] }, model: { value: 'M-1', origin: 'user_declared', sources: [] } },
      enrichment: null, decision: null,
    }], needsReview: false, purchaseTotal: null, review: null, permissions: ['read', 'edit'],
  };
}
function houseForm(): HouseForm {
  return { candidateId: '', amount: '', manual: true, title: 'Spesa sintetica', supplier: '', date: '', category: '', mode: 'defer', expenseId: '', ack: false, periodFrom: '', periodTo: '', dueOn: '' };
}
function inputs(): Parameters<typeof compilationSnapshot>[0] {
  return {
    metadata: { documentTitle: '', documentKind: 'purchase_order', replaceOrganization: false, reuseCopy: false },
    documentOnly: false, directReference: false, documentTarget: null, manualTotal: '0',
    contactInputs: {}, savedHouseForms: undefined, houseReviews: {},
  };
}

it('restores saved empty/false decisions and merges field choices without changing defaults or inputs', () => {
  const d = draft(), item = d.items[0]!, saved: Form = {
    ...restoredItemForm(item, d, {}), name: '', expense: 'skip', amount: '', manual: false,
    fields: { model: { action: 'keep' } },
  };
  const forms = { item: saved }, before = structuredClone({ d, forms });
  const result = restoredItemForm(item, d, forms);
  expect(result).toMatchObject({ name: '', expense: 'skip', amount: '', manual: false, expenseAutoState: 'manual', fields: { brand: { action: 'accept' }, model: { action: 'keep' } } });
  expect({ d, forms }).toEqual(before);
});

it('keeps an existing expense review state and never rearms automatic cost handling on old saved forms', () => {
  const d = draft(), item = d.items[0]!, saved = restoredItemForm(item, d, {});
  expect(restoredItemForm(item, d, { item: { ...saved, expenseAutoState: 'review' } }).expenseAutoState).toBe('review');
  expect(restoredItemForm(item, d, { item: { ...saved, expenseAutoState: undefined } }).expenseAutoState).toBe('manual');
});

it('keeps untampered forms and applies only the open editor as an override', () => {
  const d = draft(), form = restoredItemForm(d.items[0]!, d, {}), forms = { first: form, second: { ...form, amount: '25' } };
  expect(formsWithEditing(forms, null)).toBe(forms);
  const editing = { id: 'second', form: { ...form, amount: '', expense: 'skip' as const } };
  const result = formsWithEditing(forms, editing);
  expect(result.first).toBe(forms.first);
  expect(result.second).toBe(editing.form);
  expect(forms.second.amount).toBe('25');
});

it('preserves explicit metadata values, ordering and target version only for direct references', () => {
  const value = inputs(); value.documentTarget = { kind: 'object', id: 'synthetic-object', expectedVersion: 9, name: 'Oggetto sintetico' };
  const without = compilationSnapshot(value);
  expect(without).toMatchObject({ saved: true, documentTitle: '', replaceOrganization: false, reuseCopy: false, documentOnly: false, manualTotal: '0' });
  expect(without).not.toHaveProperty('documentTarget');
  value.directReference = true;
  expect(compilationSnapshot(value).documentTarget).toEqual(value.documentTarget);
  value.documentTarget = null;
  expect(compilationSnapshot(value)).toHaveProperty('documentTarget', null);
});

it('retains deferred house forms and replaces only a reviewed form without filling explicit empty values', () => {
  const value = inputs(), saved = { ...houseForm(), amount: '50', purchaseMode: 'same_purchase', purchaseTotal: '100' };
  value.savedHouseForms = { deferred: saved, active: { ...saved, category: 'repairs_works' } };
  value.houseReviews = { active: { form: houseForm() } };
  const before = structuredClone(value);
  const result = compilationSnapshot(value);
  expect(result.houseForms.deferred).toEqual(saved);
  expect(result.houseForms.active).toEqual(houseForm());
  expect(value).toEqual(before);
});

it('serializes a metadata-free explicit save without serializing requests, versions or idempotency keys', () => {
  const value = { ...inputs(), metadata: undefined, pending: { key: 'existing-key', body: { expectedVersion: 8 } }, expectedVersion: 7 };
  const snapshot = compilationSnapshot(value);
  expect(snapshot).toEqual({ saved: true, documentOnly: false, manualTotal: '0', contacts: [], houseForms: {} });
  expect(snapshot).not.toHaveProperty('pending');
  expect(snapshot).not.toHaveProperty('expectedVersion');
  expect(value.pending.key).toBe('existing-key');
});
