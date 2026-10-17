import { object, text, uuid, version, invalid } from '../review/domain';
import { objectTypes, roomIds } from '../home-objects/domain';
import { manualSelection } from '../home-objects/manuals';
import { profileDecisions, type ProfileDecisions } from './profile';
import { amountCents, spentOn } from '../expenses/domain';

export type OnboardingExpense = { action: 'skip' } | { action: 'link'; id: string; expectedVersion: number } | { action: 'create'; title: string; amountCents: number; spentOn: string; supplier: string | null };
export type OnboardingChoice = { itemId: string } & (
  { action: 'skip' } | { action: 'defer' } |
  { action: 'create'; name: string; type: string; unitNames: string[]; roomIds: string[]; fields: ProfileDecisions; manual: ReturnType<typeof manualSelection> | null; confirmHouseholdObject: boolean; acknowledgeExistingSource: boolean; expense: OnboardingExpense } |
  { action: 'link'; targets: Array<{ id: string; expectedVersion: number }>; fields: ProfileDecisions; manual: ReturnType<typeof manualSelection> | null; expense: OnboardingExpense }
);
export function requestKey(input: string | undefined) { if (!input || !/^[A-Za-z0-9_-]{16,100}$/u.test(input)) throw invalid('Chiave della richiesta non valida.'); return input; }
export function startOnboarding(input: unknown) {
  const row = object(input, ['documentId', 'provider', 'consentToProviderTransfer']);
  if (row.provider !== 'anthropic' || typeof row.consentToProviderTransfer !== 'boolean' || row.provider === 'anthropic' && !row.consentToProviderTransfer) throw invalid('Conferma l’invio del documento per l’analisi assistita.');
  return { documentId: uuid(row.documentId), provider: row.provider as 'anthropic', consentToProviderTransfer: row.consentToProviderTransfer };
}
function expense(input: unknown, today: string): OnboardingExpense {
  const r = object(input ?? { action: 'skip' }, ['action', 'id', 'expectedVersion', 'title', 'amountCents', 'spentOn', 'supplier']);
  if (r.action === 'skip') { object(r, ['action']); return { action: 'skip' }; }
  if (r.action === 'link') { object(r, ['action', 'id', 'expectedVersion']); return { action: 'link', id: uuid(r.id), expectedVersion: version(r.expectedVersion) }; }
  if (r.action !== 'create') throw invalid();
  object(r, ['action', 'title', 'amountCents', 'spentOn', 'supplier']);
  return { action: 'create', title: text(r.title, 120), amountCents: amountCents(r.amountCents), spentOn: spentOn(r.spentOn, today), supplier: r.supplier === undefined || r.supplier === null ? null : text(r.supplier, 120) };
}
export function onboardingConfirmation(input: unknown, today: string) {
  const r = object(input, ['expectedVersion', 'source', 'choices']);
  const source = object(r.source, ['documentId', 'documentVersion', 'sha256']);
  if (typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(source.sha256) || !Array.isArray(r.choices) || !r.choices.length || r.choices.length > 20) throw invalid();
  const choices: OnboardingChoice[] = r.choices.map(raw => {
    const c = object(raw, ['itemId', 'action', 'name', 'type', 'unitNames', 'roomIds', 'fields', 'manual', 'confirmHouseholdObject', 'acknowledgeExistingSource', 'targets', 'expense']);
    const itemId = text(c.itemId, 80);
    if (!/^[A-Za-z0-9_-]{1,80}$/u.test(itemId)) throw invalid();
    if (c.action === 'skip' || c.action === 'defer') { object(c, ['itemId', 'action']); return { itemId, action: c.action }; }
    const fields = profileDecisions(c.fields), manual = c.manual === undefined || c.manual === null ? null : manualSelection(c.manual), cost = expense(c.expense, today);
    if (manual?.mode === 'remove') throw invalid();
    if (c.action === 'link') {
      object(c, ['itemId', 'action', 'targets', 'fields', 'manual', 'expense']);
      if (!Array.isArray(c.targets) || !c.targets.length || c.targets.length > 20) throw invalid();
      const targets = c.targets.map(raw => { const t = object(raw, ['id', 'expectedVersion']); return { id: uuid(t.id), expectedVersion: version(t.expectedVersion) }; });
      if (new Set(targets.map(t => t.id)).size !== targets.length) throw invalid();
      return { itemId, action: 'link', targets, fields, manual, expense: cost };
    }
    if (c.action !== 'create' || typeof c.type !== 'string' || !objectTypes.includes(c.type as typeof objectTypes[number]) || c.confirmHouseholdObject !== undefined && typeof c.confirmHouseholdObject !== 'boolean' || c.acknowledgeExistingSource !== undefined && typeof c.acknowledgeExistingSource !== 'boolean') throw invalid();
    object(c, ['itemId', 'action', 'name', 'type', 'unitNames', 'roomIds', 'fields', 'manual', 'confirmHouseholdObject', 'acknowledgeExistingSource', 'expense']);
    if (c.unitNames !== undefined && (!Array.isArray(c.unitNames) || c.unitNames.length > 20)) throw invalid();
    const unitNames = c.unitNames === undefined ? [] : (c.unitNames as unknown[]).map(n => text(n, 120));
    if (new Set(unitNames.map(n => n.normalize('NFC').toLocaleLowerCase('it'))).size !== unitNames.length) throw invalid('Dai un nome distinto a ciascun esemplare.');
    return { itemId, action: 'create', name: text(c.name, 120), type: c.type, unitNames, roomIds: roomIds(c.roomIds ?? []), fields, manual, confirmHouseholdObject: c.confirmHouseholdObject === true, acknowledgeExistingSource: c.acknowledgeExistingSource === true, expense: cost };
  });
  if (new Set(choices.map(c => c.itemId)).size !== choices.length) throw invalid();
  return { expectedVersion: version(r.expectedVersion), source: { documentId: uuid(source.documentId), documentVersion: version(source.documentVersion), sha256: source.sha256 }, choices };
}
